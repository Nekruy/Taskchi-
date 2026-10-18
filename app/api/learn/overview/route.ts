import { NextResponse } from "next/server";
import { requireUser } from "@/lib/learn-session";
import { getOverview } from "@/lib/learn";

export const dynamic = "force-dynamic";

// GET /api/learn/overview — всё для главной кабинета одним запросом
export async function GET() {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await getOverview(userId));
  } catch (err) {
    console.error("[Learn overview GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
