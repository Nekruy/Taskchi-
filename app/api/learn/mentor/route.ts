import { NextResponse } from "next/server";
import { requireUser } from "@/lib/learn-session";
import { getMentorDialogs } from "@/lib/learn";

export const dynamic = "force-dynamic";

// GET /api/learn/mentor — все диалоги с Устодом по урокам
export async function GET() {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json({ dialogs: await getMentorDialogs(userId) });
  } catch (err) {
    console.error("[Learn mentor GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
