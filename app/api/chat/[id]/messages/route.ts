import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyNewMessage } from "@/lib/telegram";

// GET /api/chat/[id]/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      task: { select: { title: true } },
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  }

  if (chat.customerId !== session.user.id && chat.executorId !== session.user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  // Mark messages as read
  await prisma.message.updateMany({
    where: { chatId: params.id, senderId: { not: session.user.id }, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ messages: chat.messages, taskTitle: chat.task.title });
}

// POST /api/chat/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const body = await req.json();
  const { content, imageUrl } = body;

  if (!content?.trim() && !imageUrl) {
    return NextResponse.json({ error: "Сообщение не может быть пустым" }, { status: 400 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      task: { select: { title: true } },
      customer: { select: { id: true, name: true, telegramId: true } },
      executor: { select: { id: true, name: true, telegramId: true } },
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  }

  if (chat.customerId !== session.user.id && chat.executorId !== session.user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      chatId: params.id,
      senderId: session.user.id,
      content: content?.trim() ?? "",
      ...(imageUrl ? { imageUrl } : {}),
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
    },
  });

  // Notify recipient via Telegram
  const sender = session.user;
  const recipient =
    chat.customerId === session.user.id ? chat.executor : chat.customer;

  const preview = imageUrl ? "📷 Фото" : content?.trim() ?? "";
  await notifyNewMessage({
    recipientTelegramId: recipient.telegramId || undefined,
    senderName: sender.name || "Пользователь",
    taskTitle: chat.task.title,
    chatId: params.id,
    preview,
  });

  return NextResponse.json({ message }, { status: 201 });
}
