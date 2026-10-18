import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/academy/tracks — опубликованные треки + прогресс текущего пользователя
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const tracks = await prisma.track.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: {
        partner: { select: { name: true, logoUrl: true, websiteUrl: true } },
        lessons: { select: { durationMin: true } },
        // Без сессии userId = null → where по несуществующему id даёт пустой массив
        enrollments: {
          where: { userId: userId ?? "__anonymous__" },
          select: { status: true, _count: { select: { progress: true } } },
        },
      },
    });

    const result = tracks.map((t) => {
      const { lessons, enrollments, ...track } = t;
      const myEnrollment = enrollments[0];
      return {
        ...track,
        lessonsCount: lessons.length,
        totalMinutes: lessons.reduce((sum, l) => sum + (l.durationMin ?? 0), 0),
        enrollment: myEnrollment
          ? { status: myEnrollment.status, completedLessons: myEnrollment._count.progress }
          : null,
      };
    });

    return NextResponse.json({ tracks: result });
  } catch (err) {
    console.error("[Academy tracks GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
