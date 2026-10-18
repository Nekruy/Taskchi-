import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/learn-session";

export const dynamic = "force-dynamic";

const NoteSchema = z.object({
  lessonId: z.string().min(1),
  content: z.string().max(20000, "Заметка не длиннее 20 000 символов"),
});

const SELECT = {
  id: true, content: true, updatedAt: true,
  lesson: { select: { id: true, order: true, titleRu: true, track: { select: { slug: true, titleRu: true } } } },
};

// GET /api/learn/notes?lessonId= — одна заметка; без lessonId — все заметки пользователя
export async function GET(req: NextRequest) {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const lessonId = req.nextUrl.searchParams.get("lessonId");
    if (lessonId) {
      const note = await prisma.lessonNote.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: SELECT });
      return NextResponse.json({ note });
    }
    const notes = await prisma.lessonNote.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, select: SELECT });
    return NextResponse.json({ notes });
  } catch (err) {
    console.error("[Learn notes GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// PUT /api/learn/notes — upsert; пустой текст удаляет заметку
export async function PUT(req: NextRequest) {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const { lessonId, content } = NoteSchema.parse(await req.json());
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, trackId: true } });
    if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
    const enrolled = await prisma.enrollment.findUnique({ where: { userId_trackId: { userId, trackId: lesson.trackId } }, select: { id: true } });
    if (!enrolled) return NextResponse.json({ error: "Вы не записаны на этот трек" }, { status: 403 });

    if (content.trim() === "") {
      await prisma.lessonNote.deleteMany({ where: { userId, lessonId } });
      return NextResponse.json({ note: null });
    }
    const note = await prisma.lessonNote.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { content },
      create: { userId, lessonId, content },
      select: SELECT,
    });
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error("[Learn notes PUT]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
