import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { zodMessage } from "@/lib/academy-admin";
import { BLOCK_TYPES, parseBlockData } from "@/lib/academy-blocks";

export const dynamic = "force-dynamic";

const BlockCreateSchema = z.object({
  type: z.enum(BLOCK_TYPES, { errorMap: () => ({ message: "Выберите тип блока" }) }),
  order: z.coerce.number().int().min(0).max(1000).optional(),
  data: z.unknown(),
});

// GET /api/admin/academy/lessons/[id]/blocks — блоки урока (полные данные) + число прогрессов
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
    const blocks = await prisma.lessonBlock.findMany({
      where: { lessonId: lesson.id },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      include: { _count: { select: { progress: true } } },
    });
    return NextResponse.json({ blocks });
  } catch (err) {
    console.error("[Admin blocks GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/admin/academy/lessons/[id]/blocks — добавить блок (data валидируется по типу)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const body = BlockCreateSchema.parse(await req.json());
    const data = parseBlockData(body.type, body.data);
    const lesson = await prisma.lesson.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
    const last = await prisma.lessonBlock.findFirst({ where: { lessonId: lesson.id }, orderBy: { order: "desc" }, select: { order: true } });
    const order = body.order ?? ((last?.order ?? 0) + 10);
    const block = await prisma.lessonBlock.create({
      data: { lessonId: lesson.id, type: body.type, order, data: data as object },
      include: { _count: { select: { progress: true } } },
    });
    return NextResponse.json({ block }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    console.error("[Admin blocks POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
