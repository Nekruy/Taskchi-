import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      city: true,
      rating: true,
      reviewCount: true,
      isVerified: true,
      createdAt: true,
      tasksCreated: {
        where: { status: "DONE" },
        select: { id: true },
      },
      tasksExecuted: {
        where: { status: "DONE" },
        select: { id: true },
      },
      reviewsReceived: {
        include: {
          giver: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      tasksCreatedCount: user.tasksCreated.length,
      tasksExecutedCount: user.tasksExecuted.length,
      tasksCreated: undefined,
      tasksExecuted: undefined,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== params.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const body = await req.json();
  const allowedFields = ["name", "bio", "phone", "city", "avatar", "telegramHandle"];
  const data: Record<string, string> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      city: true,
      phone: true,
      telegramHandle: true,
    },
  });

  return NextResponse.json({ user });
}
