import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Гейт админских роутов: возвращает сессию или готовый 403-ответ (как в app/api/admin/passport). */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return { session: null, forbidden: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, forbidden: null };
}
