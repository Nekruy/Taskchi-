import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Для API: сессия или готовый 401. */
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { userId: null, unauthorized: NextResponse.json({ error: "Необходима авторизация" }, { status: 401 }) };
  }
  return { userId: session.user.id, session, unauthorized: null };
}

/** Для страниц /learn: редирект на логин с возвратом на нужную страницу. */
export async function requireLearnSession(path: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  return session;
}
