import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { startOfToday } from "@/lib/academy-mentor";

export const dynamic = "force-dynamic";

// GET /api/admin/academy/mentor?trackId=&lessonId=&take=200 — лог диалогов + статистика + справочник для фильтров
export async function GET(req: NextRequest) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const sp = req.nextUrl.searchParams;
    const trackId = sp.get("trackId") || undefined;
    const lessonId = sp.get("lessonId") || undefined;
    const take = Math.min(500, Math.max(1, parseInt(sp.get("take") || "200", 10) || 200));

    const where = {
      ...(lessonId ? { lessonId } : trackId ? { lesson: { trackId } } : {}),
    };
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const [messages, today, week, weekUsers, tracks] = await Promise.all([
      prisma.mentorMessage.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          lesson: { select: { id: true, order: true, titleRu: true, track: { select: { id: true, titleRu: true } } } },
        },
      }),
      prisma.mentorMessage.count({ where: { role: "user", createdAt: { gte: startOfToday() } } }),
      prisma.mentorMessage.count({ where: { role: "user", createdAt: { gte: weekAgo } } }),
      prisma.mentorMessage.groupBy({ by: ["userId"], where: { role: "user", createdAt: { gte: weekAgo } } }),
      prisma.track.findMany({
        orderBy: { order: "asc" },
        select: { id: true, titleRu: true, lessons: { orderBy: { order: "asc" }, select: { id: true, order: true, titleRu: true } } },
      }),
    ]);

    return NextResponse.json({
      messages,
      stats: { today, week, weekUsers: weekUsers.length },
      tracks,
    });
  } catch (err) {
    console.error("[Admin academy mentor GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
