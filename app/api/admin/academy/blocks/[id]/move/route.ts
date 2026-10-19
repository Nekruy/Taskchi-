import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { MoveSchema, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

// POST /api/admin/academy/blocks/[id]/move — { direction: up|down }, swap order с соседом в транзакции
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const { direction } = MoveSchema.parse(await req.json());
    const result = await prisma.$transaction(async (tx) => {
      const block = await tx.lessonBlock.findUnique({ where: { id: params.id }, select: { id: true, lessonId: true, order: true } });
      if (!block) return { status: 404 as const };
      const neighbor = await tx.lessonBlock.findFirst({
        where: { lessonId: block.lessonId, id: { not: block.id }, order: direction === "up" ? { lte: block.order } : { gte: block.order } },
        orderBy: direction === "up" ? [{ order: "desc" }, { id: "desc" }] : [{ order: "asc" }, { id: "asc" }],
        select: { id: true, order: true },
      });
      if (!neighbor) return { status: 409 as const };
      const a = block.order, b = neighbor.order;
      const [newA, newB] = a === b ? (direction === "up" ? [b - 1, b] : [b + 1, b]) : [b, a];
      await tx.lessonBlock.update({ where: { id: block.id }, data: { order: newA } });
      await tx.lessonBlock.update({ where: { id: neighbor.id }, data: { order: newB } });
      const blocks = await tx.lessonBlock.findMany({ where: { lessonId: block.lessonId }, orderBy: [{ order: "asc" }, { id: "asc" }], include: { _count: { select: { progress: true } } } });
      return { status: 200 as const, blocks };
    });
    if (result.status === 404) return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
    if (result.status === 409) return NextResponse.json({ error: "Блок уже крайний" }, { status: 409 });
    return NextResponse.json({ blocks: result.blocks });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    console.error("[Admin block move POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
