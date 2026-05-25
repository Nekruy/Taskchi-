import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

// PATCH /api/tasks/[id]/approve — customer accepts completed work (→ DONE)
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
      creator:  { select: { id: true, name: true, telegramId: true } },
      executor: { select: { id: true, name: true, telegramId: true } },
      escrow:   { select: { id: true, status: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  if (task.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Только заказчик может подтвердить выполнение" }, { status: 403 });
  }

  if (task.status !== "REVIEW") {
    return NextResponse.json({ error: "Задача не на проверке" }, { status: 400 });
  }

  const executorId = task.executorId!;

  await prisma.$transaction(async (tx) => {
    // Mark task DONE
    await tx.task.update({
      where: { id: params.id },
      data: { status: "DONE" },
    });

    // Release escrow if held
    if (task.escrow && task.escrow.status === "HELD") {
      await tx.escrow.update({
        where: { id: task.escrow.id },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
    }

    // Notify executor: work accepted
    await tx.notification.create({
      data: {
        userId: executorId,
        type: "TASK_COMPLETED",
        title: "Работа принята!",
        body: `Заказчик подтвердил выполнение задачи «${task.title}». Спасибо за работу!`,
        taskId: task.id,
        link: `/tasks/${task.id}`,
      },
    });

    // Review request for customer (review executor)
    await tx.notification.create({
      data: {
        userId: task.creator.id,
        type: "REVIEW_REQUESTED",
        title: "Оставьте отзыв об исполнителе",
        body: "Как прошла задача? Ваш отзыв поможет другим заказчикам.",
        taskId: task.id,
        link: `/tasks/${task.id}?review=executor`,
      },
    });

    // Review request for executor (review customer)
    await tx.notification.create({
      data: {
        userId: executorId,
        type: "REVIEW_REQUESTED",
        title: "Оставьте отзыв о заказчике",
        body: "Расскажите как прошло сотрудничество.",
        taskId: task.id,
        link: `/tasks/${task.id}?review=customer`,
      },
    });
  });

  // Telegram notifications
  if (task.executor?.telegramId) {
    await sendTelegramMessage(
      task.executor.telegramId,
      `🎉 <b>Заказчик принял вашу работу!</b>\n\n📋 Задача: <b>${task.title}</b>\n\nСпасибо за отличную работу!`
    );
  }

  return NextResponse.json({ success: true });
}
