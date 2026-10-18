import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/learn-session";
import { PROMPT_SOURCES } from "@/lib/learn";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().trim().min(2, "Название минимум 2 символа").max(120).optional(),
  body: z.string().trim().min(5, "Текст промпта минимум 5 символов").max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  source: z.enum(PROMPT_SOURCES).optional(),
});

const SELECT = {
  id: true, title: true, body: true, tags: true, source: true, createdAt: true,
  lesson: { select: { id: true, order: true, titleRu: true, track: { select: { slug: true, titleRu: true } } } },
};

// PATCH /api/learn/prompts/[id] — только свой промпт
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const data = PatchSchema.parse(await req.json());
    const own = await prisma.savedPrompt.findFirst({ where: { id: params.id, userId }, select: { id: true } });
    if (!own) return NextResponse.json({ error: "Промпт не найден" }, { status: 404 });
    const prompt = await prisma.savedPrompt.update({
      where: { id: params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.tags !== undefined && { tags: Array.from(new Set(data.tags)) }),
        ...(data.source !== undefined && { source: data.source }),
      },
      select: SELECT,
    });
    return NextResponse.json({ prompt });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error("[Learn prompt PATCH]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE /api/learn/prompts/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const { count } = await prisma.savedPrompt.deleteMany({ where: { id: params.id, userId } });
    if (count === 0) return NextResponse.json({ error: "Промпт не найден" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Learn prompt DELETE]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
