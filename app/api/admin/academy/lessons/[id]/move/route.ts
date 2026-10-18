import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { MoveSchema, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

// POST /api/admin/academy/lessons/[id]/move — поменять order местами с соседом
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const { direction } = MoveSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({ where: { id: params.id }, select: { id: true, trackId: true, order: true } });
      if (!lesson) return { status: 404 as const };

      const neighbor = await tx.lesson.findFirst({
        where: {
          trackId: lesson.trackId,
          id: { not: lesson.id },
          order: direction === "up" ? { lte: lesson.order } : { gte: lesson.order },
        },
        orderBy: direction === "up" ? [{ order: "desc" }, { id: "desc" }] : [{ order: "asc" }, { id: "asc" }],
        select: { id: true, order: true },
      });
      if (!neighbor) return { status: 409 as const };

      // Если order совпадают (данные из сида/ручного ввода) — разводим на ±1, иначе просто меняем местами
      const a = lesson.order, b = neighbor.order;
      const [newA, newB] = a === b ? (direction === "up" ? [b - 1, b] : [b + 1, b]) : [b, a];
      await tx.lesson.update({ where: { id: lesson.id }, data: { order: newA } });
      await tx.lesson.update({ where: { id: neighbor.id }, data: { order: newB } });

      const lessons = await tx.lesson.findMany({
        where: { trackId: lesson.trackId },
        orderBy: { order: "asc" },
        select: { id: true, order: true, titleRu: true, type: true, durationMin: true },
      });
      return { status: 200 as const, lessons };
    });

    if (result.status === 404) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
    if (result.status === 409) return NextResponse.json({ error: "Урок уже крайний" }, { status: 409 });
    return NextResponse.json({ lessons: result.lessons });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    console.error("[Admin academy lesson move POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
