import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { zodMessage } from "@/lib/academy-admin";
import { BLOCK_TYPES, parseBlockData } from "@/lib/academy-blocks";

export const dynamic = "force-dynamic";

const BlockPatchSchema = z.object({
  type: z.enum(BLOCK_TYPES).optional(),
  order: z.coerce.number().int().min(0).max(1000).optional(),
  data: z.unknown().optional(),
});

// PATCH /api/admin/academy/blocks/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const body = BlockPatchSchema.parse(await req.json());
    const current = await prisma.lessonBlock.findUnique({ where: { id: params.id }, select: { id: true, type: true, data: true } });
    if (!current) return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
    const type = body.type ?? current.type;
    const data = body.data !== undefined ? parseBlockData(type, body.data) : body.type && body.type !== current.type ? parseBlockData(type, current.data) : undefined;
    const block = await prisma.lessonBlock.update({
      where: { id: params.id },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.order !== undefined && { order: body.order }),
        ...(data !== undefined && { data: data as object }),
      },
      include: { _count: { select: { progress: true } } },
    });
    return NextResponse.json({ block });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    console.error("[Admin block PATCH]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE /api/admin/academy/blocks/[id] — 409 если есть прогресс учеников
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const block = await prisma.lessonBlock.findUnique({ where: { id: params.id }, select: { id: true, _count: { select: { progress: true } } } });
    if (!block) return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
    if (block._count.progress > 0) {
      return NextResponse.json({ error: `Блок уже прошли ${block._count.progress} чел. — удалить нельзя` }, { status: 409 });
    }
    await prisma.lessonBlock.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admin block DELETE]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
