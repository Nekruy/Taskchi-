import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { PartnerSchema, isUniqueError, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/academy/partners — все партнёры с количеством треков
export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { tracks: true } } },
    });
    return NextResponse.json({ partners });
  } catch (err) {
    console.error("[Admin academy partners GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/admin/academy/partners — создать партнёра
export async function POST(req: NextRequest) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const data = PartnerSchema.parse(await req.json());
    const partner = await prisma.partner.create({
      data: {
        slug: data.slug,
        name: data.name,
        logoUrl: data.logoUrl ?? null,
        websiteUrl: data.websiteUrl ?? null,
        descriptionRu: data.descriptionRu,
        isActive: data.isActive ?? true,
      },
      include: { _count: { select: { tracks: true } } },
    });
    return NextResponse.json({ partner }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    if (isUniqueError(err)) return NextResponse.json({ error: "Партнёр с таким slug уже есть" }, { status: 409 });
    console.error("[Admin academy partners POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
