import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/learn-session";

export const dynamic = "force-dynamic";

// GET /api/learn/status — { enrolledCount } для навигации (куда вести «Академия» в bottom nav)
export async function GET() {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const enrolledCount = await prisma.enrollment.count({ where: { userId } });
    return NextResponse.json({ enrolledCount });
  } catch (err) {
    console.error("[Learn status GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
