import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getEnrollment } from "@/lib/academy";

export const dynamic = "force-dynamic";

// GET /api/academy/lessons/[id] — полный урок (только для записанных на трек)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        track: {
          select: {
            id: true,
            slug: true,
            titleRu: true,
            isPublished: true,
            lessons: { select: { id: true }, orderBy: { order: "asc" } },
          },
        },
      },
    });
    if (!lesson || !lesson.track.isPublished) {
      return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
    }

    const enrollment = await getEnrollment(session.user.id, lesson.track.id);
    if (!enrollment) {
      return NextResponse.json({ error: "Вы не записаны на этот трек" }, { status: 403 });
    }

    const ids = lesson.track.lessons.map((l) => l.id);
    const idx = ids.indexOf(lesson.id);
    const { track, ...lessonData } = lesson;

    return NextResponse.json({
      lesson: lessonData,
      track: { id: track.id, slug: track.slug, titleRu: track.titleRu },
      prevLessonId: idx > 0 ? ids[idx - 1] : null,
      nextLessonId: idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null,
      completed: enrollment.completedLessonIds.includes(lesson.id),
    });
  } catch (err) {
    console.error("[Academy lesson GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
