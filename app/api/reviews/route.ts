import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const ReviewSchema = z.object({
  taskId: z.string(),
  receiverId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { taskId, receiverId, rating, comment } = ReviewSchema.parse(body);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "DONE") {
      return NextResponse.json(
        { error: "Отзыв можно оставить только для завершённой задачи" },
        { status: 400 }
      );
    }

    if (task.creatorId !== session.user.id && task.executorId !== session.user.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const existing = await prisma.review.findUnique({
      where: { giverId_taskId: { giverId: session.user.id, taskId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Вы уже оставили отзыв" }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: { taskId, giverId: session.user.id, receiverId, rating, comment },
    });

    // Recalculate receiver rating
    const stats = await prisma.review.aggregate({
      where: { receiverId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.user.update({
      where: { id: receiverId },
      data: {
        rating: stats._avg.rating || 0,
        reviewCount: stats._count.rating,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[Reviews POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
