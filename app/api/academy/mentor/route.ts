import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getEnrollment } from "@/lib/academy";
import {
  MENTOR_DAILY_LIMIT,
  MENTOR_HISTORY_TURNS,
  MENTOR_MESSAGE_MAX,
  MentorUnavailableError,
  askMentor,
  getRemainingToday,
  type MentorTurn,
} from "@/lib/academy-mentor";

export const dynamic = "force-dynamic";

const AskSchema = z.object({
  lessonId: z.string().min(1),
  message: z.string().trim().min(1, "Напишите вопрос").max(MENTOR_MESSAGE_MAX, `Сообщение не длиннее ${MENTOR_MESSAGE_MAX} символов`),
});

/** Урок + трек + проверка записи. Возвращает готовый ответ-ошибку или контекст. */
async function loadLessonContext(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      titleRu: true,
      contentMd: true,
      track: {
        select: { id: true, titleRu: true, isPublished: true, lessons: { select: { id: true } } },
      },
    },
  });
  if (!lesson || !lesson.track.isPublished) {
    return { error: NextResponse.json({ error: "Урок не найден" }, { status: 404 }) };
  }
  const enrollment = await getEnrollment(userId, lesson.track.id);
  if (!enrollment) {
    return { error: NextResponse.json({ error: "Вы не записаны на этот трек" }, { status: 403 }) };
  }
  return { lesson, enrollment };
}

// GET /api/academy/mentor?lessonId= — история диалога + остаток лимита
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  const lessonId = req.nextUrl.searchParams.get("lessonId") || "";
  if (!lessonId) return NextResponse.json({ error: "lessonId обязателен" }, { status: 400 });
  try {
    const ctx = await loadLessonContext(lessonId, session.user.id);
    if ("error" in ctx) return ctx.error;

    const [rows, remainingToday] = await Promise.all([
      prisma.mentorMessage.findMany({
        where: { userId: session.user.id, lessonId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 30,
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      getRemainingToday(session.user.id, !!session.user.isAdmin),
    ]);
    return NextResponse.json({ messages: rows.reverse(), remainingToday, dailyLimit: MENTOR_DAILY_LIMIT });
  } catch (err) {
    console.error("[Academy mentor GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/academy/mentor — вопрос наставнику
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  const userId = session.user.id;
  const isAdmin = !!session.user.isAdmin;

  try {
    const { lessonId, message } = AskSchema.parse(await req.json());
    const ctx = await loadLessonContext(lessonId, userId);
    if ("error" in ctx) return ctx.error;
    const { lesson, enrollment } = ctx;

    const remainingBefore = await getRemainingToday(userId, isAdmin);
    if (!isAdmin && remainingBefore <= 0) {
      return NextResponse.json({ error: "Лимит на сегодня исчерпан, завтра продолжим", remainingToday: 0 }, { status: 429 });
    }

    const historyRows = await prisma.mentorMessage.findMany({
      where: { userId, lessonId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MENTOR_HISTORY_TURNS,
      select: { role: true, content: true },
    });
    const history: MentorTurn[] = historyRows.reverse().map((m) => ({ role: m.role as MentorTurn["role"], content: m.content }));

    const totalLessons = lesson.track.lessons.length;
    const done = lesson.track.lessons.filter((l) => enrollment.completedLessonIds.includes(l.id)).length;

    // Сначала модель, потом запись: при ошибке Groq ничего не сохраняем — лимит не сгорает
    const result = await askMentor(
      { lessonTitle: lesson.titleRu, trackTitle: lesson.track.titleRu, done, total: totalLessons, lessonContentMd: lesson.contentMd ?? "" },
      history,
      message
    );

    // Явные метки времени: ответ на 1 мс позже вопроса, чтобы сортировка по createdAt была однозначной
    const askedAt = new Date();
    const answeredAt = new Date(askedAt.getTime() + 1);
    await prisma.$transaction([
      prisma.mentorMessage.create({ data: { userId, lessonId, role: "user", content: message, createdAt: askedAt } }),
      prisma.mentorMessage.create({ data: { userId, lessonId, role: "assistant", content: result.reply, createdAt: answeredAt } }),
    ]);

    if (result.usage) {
      console.log("[Academy mentor] usage", { model: result.model, ...result.usage, lessonId });
    }

    const remainingToday = isAdmin ? MENTOR_DAILY_LIMIT : Math.max(0, remainingBefore - 1);
    return NextResponse.json({ reply: result.reply, remainingToday, dailyLimit: MENTOR_DAILY_LIMIT });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof MentorUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("[Academy mentor POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
