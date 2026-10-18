import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/academy/tracks/[slug]/enroll — записаться на трек (идемпотентно)
export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const track = await prisma.track.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        isPublished: true,
        lessons: { select: { id: true }, orderBy: { order: "asc" }, take: 1 },
      },
    });
    if (!track || !track.isPublished) {
      return NextResponse.json({ error: "Трек не найден" }, { status: 404 });
    }

    const userId = session.user.id;
    const existing = await prisma.enrollment.findUnique({
      where: { userId_trackId: { userId, trackId: track.id } },
      select: { id: true },
    });

    const firstLessonId = track.lessons[0]?.id ?? null;
    if (existing) {
      return NextResponse.json({ enrollmentId: existing.id, firstLessonId }, { status: 200 });
    }

    const enrollment = await prisma.enrollment.create({
      data: { userId, trackId: track.id, status: "ACTIVE" },
      select: { id: true },
    });
    return NextResponse.json({ enrollmentId: enrollment.id, firstLessonId }, { status: 201 });
  } catch (err) {
    // P2002 — гонка двух одновременных записей: отдаём существующую
    if (typeof err === "object" && err && (err as { code?: string }).code === "P2002") {
      const existing = await prisma.enrollment.findFirst({
        where: { userId: session.user.id, track: { slug: params.slug } },
        select: { id: true, track: { select: { lessons: { select: { id: true }, orderBy: { order: "asc" }, take: 1 } } } },
      });
      if (existing) {
        return NextResponse.json(
          { enrollmentId: existing.id, firstLessonId: existing.track.lessons[0]?.id ?? null },
          { status: 200 }
        );
      }
    }
    console.error("[Academy enroll POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
