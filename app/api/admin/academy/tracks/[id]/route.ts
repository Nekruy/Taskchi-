import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { TrackPatchSchema, isUniqueError, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

const TRACK_INCLUDE = {
  partner: { select: { id: true, name: true, logoUrl: true, slug: true } },
  lessons: { orderBy: { order: "asc" as const } },
  _count: { select: { enrollments: true } },
};

// GET /api/admin/academy/tracks/[id] — трек + полные уроки + партнёр
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const track = await prisma.track.findUnique({ where: { id: params.id }, include: TRACK_INCLUDE });
    if (!track) return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
    return NextResponse.json({ track });
  } catch (err) {
    console.error("[Admin academy track GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// PATCH /api/admin/academy/tracks/[id] — частичное обновление
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const data = TrackPatchSchema.parse(await req.json());
    const exists = await prisma.track.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
    if (data.partnerId) {
      const partner = await prisma.partner.findUnique({ where: { id: data.partnerId }, select: { id: true } });
      if (!partner) return NextResponse.json({ error: "Партнёр не найден" }, { status: 400 });
    }
    const track = await prisma.track.update({
      where: { id: params.id },
      data: {
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.titleRu !== undefined && { titleRu: data.titleRu }),
        ...(data.titleTj !== undefined && { titleTj: data.titleTj }),
        ...(data.descriptionRu !== undefined && { descriptionRu: data.descriptionRu }),
        ...(data.descriptionTj !== undefined && { descriptionTj: data.descriptionTj }),
        ...("coverUrl" in data && { coverUrl: data.coverUrl ?? null }),
        ...(data.taskCategory !== undefined && { taskCategory: data.taskCategory }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...("partnerId" in data && { partnerId: data.partnerId ?? null }),
      },
      include: TRACK_INCLUDE,
    });
    return NextResponse.json({ track });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    if (isUniqueError(err)) return NextResponse.json({ error: "Курс с таким slug уже есть" }, { status: 409 });
    console.error("[Admin academy track PATCH]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE /api/admin/academy/tracks/[id] — 409 если есть записи учеников
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const track = await prisma.track.findUnique({
      where: { id: params.id },
      select: { id: true, _count: { select: { enrollments: true } } },
    });
    if (!track) return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
    if (track._count.enrollments > 0) {
      return NextResponse.json(
        { error: `На курс записаны ${track._count.enrollments} чел. — удалить нельзя. Снимите с публикации` },
        { status: 409 }
      );
    }
    await prisma.track.delete({ where: { id: params.id } }); // уроки удалятся каскадом
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admin academy track DELETE]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
