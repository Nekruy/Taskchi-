import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// PATCH /api/executor/profile — update headline and/or about
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = token.id as string;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updateData: { headline?: string | null; about?: string | null } = {};

  if (body.headline !== undefined) {
    const h = String(body.headline || "").trim();
    updateData.headline = h.length > 0 ? h.slice(0, 120) : null;
  }
  if (body.about !== undefined) {
    const a = String(body.about || "").trim();
    updateData.about = a.length > 0 ? a.slice(0, 500) : null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, headline: true, about: true },
  });

  return NextResponse.json({ user });
}
