import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyNewOffer } from "@/lib/telegram";

const CreateOfferSchema = z.object({
  taskId: z.string(),
  price: z.number().positive(),
  message: z.string().min(10).max(500),
});

// POST /api/offers — создать отклик
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { taskId, price, message } = CreateOfferSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: { select: { id: true, name: true, telegramId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    if (task.creatorId === session.user.id) {
      return NextResponse.json(
        { error: "Нельзя откликнуться на собственную задачу" },
        { status: 400 }
      );
    }

    if (task.status !== "OPEN") {
      return NextResponse.json(
        { error: "Задача больше не принимает отклики" },
        { status: 400 }
      );
    }

    const existing = await prisma.offer.findUnique({
      where: { executorId_taskId: { executorId: session.user.id, taskId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Вы уже откликнулись на эту задачу" },
        { status: 409 }
      );
    }

    const executor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, telegramId: true },
    });

    const offer = await prisma.offer.create({
      data: { taskId, executorId: session.user.id, price, message },
      include: {
        executor: { select: { id: true, name: true, avatar: true, rating: true } },
      },
    });

    // Notify task creator via Telegram
    await notifyNewOffer({
      customerTelegramId: task.creator.telegramId || undefined,
      executorName: executor?.name || "Исполнитель",
      taskTitle: task.title,
      taskId: task.id,
      offerPrice: price,
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[Offers POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
