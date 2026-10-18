import { NextResponse } from "next/server";
import { requireUser } from "@/lib/learn-session";
import { getAchievements } from "@/lib/learn";

export const dynamic = "force-dynamic";

// GET /api/learn/achievements
export async function GET() {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const achievements = await getAchievements(userId);
    return NextResponse.json({ achievements, earned: achievements.filter((a) => a.earned).length, total: achievements.length });
  } catch (err) {
    console.error("[Learn achievements GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
