import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { LESSON_LIST_SELECT, getEnrollment } from "@/lib/academy";

export const dynamic = "force-dynamic";

// GET /api/academy/tracks/[slug] — трек, список уроков, запись и пройденные уроки
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const track = await prisma.track.findUnique({
      where: { slug: params.slug },
      include: {
        partner: { select: { name: true, logoUrl: true, websiteUrl: true } },
        lessons: { select: LESSON_LIST_SELECT, orderBy: { order: "asc" } },
      },
    });
    if (!track || !track.isPublished) {
      return NextResponse.json({ error: "Трек не найден" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const enrollment = session?.user?.id ? await getEnrollment(session.user.id, track.id) : null;

    const { lessons, ...trackData } = track;
    return NextResponse.json({
      track: trackData,
      lessons,
      enrollment: enrollment ? { id: enrollment.id, status: enrollment.status } : null,
      completedLessonIds: enrollment?.completedLessonIds ?? [],
    });
  } catch (err) {
    console.error("[Academy track GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
