import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { TrackSchema, isUniqueError, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/academy/tracks — все треки (и черновики) со статистикой
export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const [tracks, completed, pending] = await Promise.all([
      prisma.track.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          partner: { select: { id: true, name: true, logoUrl: true, slug: true } },
          _count: { select: { lessons: true, enrollments: true } },
        },
      }),
      prisma.enrollment.groupBy({ by: ["trackId"], where: { status: "COMPLETED" }, _count: { _all: true } }),
      prisma.enrollment.groupBy({ by: ["trackId"], where: { submission: { status: "PENDING" } }, _count: { _all: true } }),
    ]);
    const completedMap = new Map(completed.map((c) => [c.trackId, c._count._all]));
    const pendingMap = new Map(pending.map((c) => [c.trackId, c._count._all]));

    return NextResponse.json({
      tracks: tracks.map((t) => ({
        ...t,
        stats: {
          enrollments: t._count.enrollments,
          graduates: completedMap.get(t.id) ?? 0,
          pending: pendingMap.get(t.id) ?? 0,
          lessons: t._count.lessons,
        },
      })),
    });
  } catch (err) {
    console.error("[Admin academy tracks GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/admin/academy/tracks — создать трек
export async function POST(req: NextRequest) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const data = TrackSchema.parse(await req.json());
    if (data.partnerId) {
      const partner = await prisma.partner.findUnique({ where: { id: data.partnerId }, select: { id: true } });
      if (!partner) return NextResponse.json({ error: "Партнёр не найден" }, { status: 400 });
    }
    const track = await prisma.track.create({
      data: {
        slug: data.slug,
        titleRu: data.titleRu,
        titleTj: data.titleTj,
        descriptionRu: data.descriptionRu,
        descriptionTj: data.descriptionTj,
        coverUrl: data.coverUrl ?? null,
        taskCategory: data.taskCategory,
        estimatedHours: data.estimatedHours,
        order: data.order,
        isPublished: data.isPublished,
        partnerId: data.partnerId ?? null,
      },
      include: { partner: { select: { id: true, name: true, logoUrl: true, slug: true } } },
    });
    return NextResponse.json({ track }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    if (isUniqueError(err)) return NextResponse.json({ error: "Курс с таким slug уже есть" }, { status: 409 });
    console.error("[Admin academy tracks POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
