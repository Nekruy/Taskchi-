import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyTaskCompleted } from "@/lib/telegram";

// POST /api/escrow/release — заказчик подтверждает выполнение
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const { taskId } = await req.json();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        escrow: true,
        creator: { select: { id: true, telegramId: true } },
        executor: { select: { id: true, name: true, telegramId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    if (task.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    if (!task.escrow || task.escrow.status !== "HELD") {
      return NextResponse.json({ error: "Эскроу не активен" }, { status: 400 });
    }

    if (task.status !== "REVIEW" && task.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Задача не в нужном статусе" }, { status: 400 });
    }

    const executorPayout = task.escrow.amount - task.escrow.commission;

    await prisma.$transaction([
      prisma.escrow.update({
        where: { id: task.escrow.id },
        data: { status: "RELEASED", releasedAt: new Date() },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: { status: "DONE" },
      }),
    ]);

    // Notify both parties
    await notifyTaskCompleted({
      executorTelegramId: task.executor?.telegramId || undefined,
      customerTelegramId: task.creator.telegramId || undefined,
      taskTitle: task.title,
      amount: executorPayout,
    });

    return NextResponse.json({ success: true, releasedAmount: executorPayout });
  } catch (err) {
    console.error("[Escrow Release]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
