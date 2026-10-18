import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { PartnerPatchSchema, isUniqueError, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

// PATCH /api/admin/academy/partners/[id] — частичное обновление
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const data = PartnerPatchSchema.parse(await req.json());
    const exists = await prisma.partner.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Партнёр не найден" }, { status: 404 });

    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: {
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.name !== undefined && { name: data.name }),
        ...("logoUrl" in data && { logoUrl: data.logoUrl ?? null }),
        ...("websiteUrl" in data && { websiteUrl: data.websiteUrl ?? null }),
        ...(data.descriptionRu !== undefined && { descriptionRu: data.descriptionRu }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { _count: { select: { tracks: true } } },
    });
    return NextResponse.json({ partner });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    if (isUniqueError(err)) return NextResponse.json({ error: "Партнёр с таким slug уже есть" }, { status: 409 });
    console.error("[Admin academy partner PATCH]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE /api/admin/academy/partners/[id] — 409 если есть треки
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const partner = await prisma.partner.findUnique({
      where: { id: params.id },
      select: { id: true, _count: { select: { tracks: true } } },
    });
    if (!partner) return NextResponse.json({ error: "Партнёр не найден" }, { status: 404 });
    if (partner._count.tracks > 0) {
      return NextResponse.json(
        { error: `У партнёра ${partner._count.tracks} курс(ов) — сначала отвяжите их` },
        { status: 409 }
      );
    }
    await prisma.partner.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admin academy partner DELETE]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
