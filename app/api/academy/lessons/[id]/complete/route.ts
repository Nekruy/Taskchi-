import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/academy/lessons/[id]/complete — отметить урок пройденным (идемпотентно)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        track: {
          select: {
            id: true,
            isPublished: true,
            lessons: { select: { id: true }, orderBy: { order: "asc" } },
          },
        },
      },
    });
    if (!lesson || !lesson.track.isPublished) {
      return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_trackId: { userId: session.user.id, trackId: lesson.track.id } },
      select: { id: true },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Вы не записаны на этот трек" }, { status: 403 });
    }

    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
      update: {},
      create: { enrollmentId: enrollment.id, lessonId: lesson.id },
    });

    const completedLessons = await prisma.lessonProgress.count({
      where: { enrollmentId: enrollment.id },
    });

    const ids = lesson.track.lessons.map((l) => l.id);
    const idx = ids.indexOf(lesson.id);
    const nextLessonId = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;

    return NextResponse.json({ completedLessons, total: ids.length, nextLessonId });
  } catch (err) {
    console.error("[Academy complete POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
