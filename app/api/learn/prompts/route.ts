import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/learn-session";
import { PROMPT_SOURCES } from "@/lib/learn";

export const dynamic = "force-dynamic";

const PromptSchema = z.object({
  title: z.string().trim().min(2, "Название минимум 2 символа").max(120),
  body: z.string().trim().min(5, "Текст промпта минимум 5 символов").max(10000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  source: z.enum(PROMPT_SOURCES).default("MANUAL"),
  lessonId: z.string().min(1).nullable().optional(),
});

const SELECT = {
  id: true, title: true, body: true, tags: true, source: true, createdAt: true,
  lesson: { select: { id: true, order: true, titleRu: true, track: { select: { slug: true, titleRu: true } } } },
};

// GET /api/learn/prompts?tag=&q=
export async function GET(req: NextRequest) {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const tag = req.nextUrl.searchParams.get("tag") || undefined;
    const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
    const prompts = await prisma.savedPrompt.findMany({
      where: {
        userId,
        ...(tag ? { tags: { has: tag } } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: SELECT,
    });
    const all = await prisma.savedPrompt.findMany({ where: { userId }, select: { tags: true } });
    const tags = Array.from(new Set(all.flatMap((p) => p.tags))).sort((a, b) => a.localeCompare(b, "ru"));
    return NextResponse.json({ prompts, tags });
  } catch (err) {
    console.error("[Learn prompts GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/learn/prompts
export async function POST(req: NextRequest) {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const data = PromptSchema.parse(await req.json());
    if (data.lessonId) {
      const lesson = await prisma.lesson.findUnique({ where: { id: data.lessonId }, select: { id: true } });
      if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 400 });
    }
    const prompt = await prisma.savedPrompt.create({
      data: { userId, title: data.title, body: data.body, tags: Array.from(new Set(data.tags)), source: data.source, lessonId: data.lessonId ?? null },
      select: SELECT,
    });
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error("[Learn prompts POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
