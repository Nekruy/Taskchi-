import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// POST /api/escrow/refund — возврат средств при отмене
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const { taskId, reason } = await req.json();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { escrow: true },
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

    if (task.status === "DONE") {
      return NextResponse.json(
        { error: "Нельзя вернуть средства за выполненную задачу" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.escrow.update({
        where: { id: task.escrow.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: { status: "CANCELLED" },
      }),
    ]);

    console.log(`[Escrow] Refund for task ${taskId}: ${reason}`);

    return NextResponse.json({
      success: true,
      refundedAmount: task.escrow.amount,
    });
  } catch (err) {
    console.error("[Escrow Refund]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
