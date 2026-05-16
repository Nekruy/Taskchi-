import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyOfferAccepted } from "@/lib/telegram";
import { calculateCommission } from "@/lib/commission";

// POST /api/offers/[id]/accept
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: {
      task: { include: { creator: { select: { id: true, name: true } } } },
      executor: { select: { id: true, name: true, telegramId: true } },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Отклик не найден" }, { status: 404 });
  }

  if (offer.task.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  if (offer.task.status !== "OPEN") {
    return NextResponse.json({ error: "Задача уже не открыта" }, { status: 400 });
  }

  const commission = calculateCommission(offer.price);

  // Transaction: accept offer, reject others, start task, create escrow & chat
  await prisma.$transaction(async (tx) => {
    // Accept this offer
    await tx.offer.update({
      where: { id: params.id },
      data: { status: "ACCEPTED" },
    });

    // Reject other offers
    await tx.offer.updateMany({
      where: { taskId: offer.taskId, id: { not: params.id } },
      data: { status: "REJECTED" },
    });

    // Update task
    await tx.task.update({
      where: { id: offer.taskId },
      data: { status: "IN_PROGRESS", executorId: offer.executorId },
    });

    // Create escrow
    await tx.escrow.create({
      data: {
        taskId: offer.taskId,
        holderId: session.user.id,
        amount: offer.price,
        commission,
        status: "HELD",
      },
    });

    // Create chat
    await tx.chat.create({
      data: {
        taskId: offer.taskId,
        customerId: session.user.id,
        executorId: offer.executorId,
      },
    });
  });

  // Notify executor
  await notifyOfferAccepted({
    executorTelegramId: offer.executor.telegramId || undefined,
    taskTitle: offer.task.title,
    taskId: offer.taskId,
    customerName: offer.task.creator.name,
  });

  return NextResponse.json({ success: true });
}
