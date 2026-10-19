import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getEnrollment } from "@/lib/academy";
import { checkAnswer, type QuizData, type QuizInProgress, type QuizProgressData } from "@/lib/academy-blocks";

export const dynamic = "force-dynamic";

const AnswerSchema = z.object({
  questionIndex: z.number().int().min(0).max(19),
  answer: z.number().int().min(0).max(3),
});

// POST /api/academy/blocks/[id]/answer — ответ на ОДИН вопрос текущей попытки → { isRight, correct, explanation }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  const userId = session.user.id;
  try {
    const { questionIndex, answer } = AnswerSchema.parse(await req.json());
    const block = await prisma.lessonBlock.findUnique({
      where: { id: params.id },
      select: { id: true, type: true, data: true, lesson: { select: { track: { select: { id: true, isPublished: true } } } } },
    });
    if (!block || !block.lesson.track.isPublished) return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
    if (block.type !== "QUIZ") return NextResponse.json({ error: "Это не тест" }, { status: 400 });
    const enrollment = await getEnrollment(userId, block.lesson.track.id);
    if (!enrollment) return NextResponse.json({ error: "Вы не записаны на этот трек" }, { status: 403 });

    const quiz = block.data as unknown as QuizData;
    const total = quiz.questions.length;
    if (questionIndex >= total) return NextResponse.json({ error: "Нет такого вопроса" }, { status: 400 });

    const existing = await prisma.blockProgress.findUnique({ where: { userId_blockId: { userId, blockId: block.id } }, select: { id: true, data: true, attempts: true } });
    const prev = (existing?.data as Partial<QuizProgressData> | null) ?? null;
    let ip: QuizInProgress | null = prev?.inProgress ?? null;
    if (!ip || ip.answers.length !== total || ip.answers.every((a) => a !== null)) {
      ip = { answers: Array.from({ length: total }, () => null), startedAt: new Date().toISOString() }; // новая попытка
    }

    // Только текущий (первый неотвеченный) вопрос; повтор → 409
    if (ip.answers[questionIndex] !== null) {
      return NextResponse.json({ error: "Вы уже ответили на этот вопрос" }, { status: 409 });
    }
    const current = ip.answers.findIndex((a) => a === null);
    if (questionIndex !== current) {
      return NextResponse.json({ error: `Отвечайте по порядку — сейчас вопрос ${current + 1}`, current }, { status: 409 });
    }

    ip.answers[questionIndex] = answer;
    const data = { ...(prev ?? {}), inProgress: ip } as unknown as object;
    if (existing) {
      await prisma.blockProgress.update({ where: { id: existing.id }, data: { data } });
    } else {
      // attempts: 0 — попытка ещё не завершена; complete увеличит до 1
      await prisma.blockProgress.create({ data: { userId, blockId: block.id, data, attempts: 0 } });
    }

    const result = checkAnswer(quiz, questionIndex, answer);
    const answered = ip.answers.filter((a) => a !== null).length;
    return NextResponse.json({
      ...result,
      questionIndex,
      answered,
      total,
      nextIndex: answered < total ? answered : null,
      finished: answered === total,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error("[Academy block answer POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
