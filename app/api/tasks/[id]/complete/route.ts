import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

// PATCH /api/tasks/[id]/complete — executor marks task as done (→ REVIEW)
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, name: true, telegramId: true } },
      executor: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  if (task.executorId !== session.user.id) {
    return NextResponse.json({ error: "Только исполнитель может отметить задачу выполненной" }, { status: 403 });
  }

  if (task.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Задача не в статусе 'В работе'" }, { status: 400 });
  }

  // Update status to REVIEW + create in-app notification for customer
  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: params.id },
      data: { status: "REVIEW" },
    });

    await tx.notification.create({
      data: {
        userId: task.creator.id,
        type: "TASK_REVIEW",
        title: "Задача выполнена!",
        body: `${task.executor?.name ?? "Исполнитель"} отметил задачу «${task.title}» выполненной. Проверьте и подтвердите.`,
        taskId: task.id,
        link: `/tasks/${task.id}`,
      },
    });
  });

  // Telegram notification to customer
  if (task.creator.telegramId) {
    await sendTelegramMessage(
      task.creator.telegramId,
      `🔔 <b>Исполнитель отметил задачу выполненной!</b>\n\n📋 Задача: <b>${task.title}</b>\n\nПодтвердите выполнение в личном кабинете.`
    );
  }

  return NextResponse.json({ success: true });
}
