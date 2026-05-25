import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

// POST /api/disputes — file a dispute on a REVIEW-status task
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const { taskId, reason } = await req.json();

  if (!taskId || !reason?.trim()) {
    return NextResponse.json({ error: "taskId и reason обязательны" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      creator:  { select: { id: true, name: true, telegramId: true } },
      executor: { select: { id: true, name: true, telegramId: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  if (task.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Только заказчик может открыть спор" }, { status: 403 });
  }

  if (task.status !== "REVIEW" && task.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Спор можно открыть только по задаче в работе или на проверке" }, { status: 400 });
  }

  // Check no existing open dispute
  const existing = await prisma.dispute.findUnique({ where: { taskId } });
  if (existing) {
    return NextResponse.json({ error: "Спор уже открыт" }, { status: 409 });
  }

  const dispute = await prisma.dispute.create({
    data: {
      taskId,
      filedById: session.user.id,
      reason: reason.trim(),
      status: "OPEN",
    },
  });

  // Notify admin
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    await sendTelegramMessage(
      adminChatId,
      `⚠️ <b>Открыт спор!</b>\n\nЗадача: <b>${task.title}</b>\nЗаказчик: ${task.creator.name}\nИсполнитель: ${task.executor?.name ?? "—"}\nПричина: ${reason}`
    );
  }

  return NextResponse.json({ dispute }, { status: 201 });
}
