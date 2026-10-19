import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getEnrollment } from "@/lib/academy";
import { isRequiredBlock, scoreQuiz, type QuizData, type QuizProgressData } from "@/lib/academy-blocks";

export const dynamic = "force-dynamic";

const QuizAnswersSchema = z.object({ answers: z.array(z.number().int().min(0).max(3), { required_error: "Сначала ответьте на все вопросы" }).min(1).max(20) });

// POST /api/academy/blocks/[id]/complete — TEXT/VIDEO: отметить; QUIZ: { answers } → подсчёт, результаты
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  const userId = session.user.id;
  try {
    const block = await prisma.lessonBlock.findUnique({
      where: { id: params.id },
      select: { id: true, type: true, data: true, lesson: { select: { id: true, track: { select: { id: true, isPublished: true } } } } },
    });
    if (!block || !block.lesson.track.isPublished) return NextResponse.json({ error: "Блок не найден" }, { status: 404 });
    const enrollment = await getEnrollment(userId, block.lesson.track.id);
    if (!enrollment) return NextResponse.json({ error: "Вы не записаны на этот трек" }, { status: 403 });

    const existing = await prisma.blockProgress.findUnique({ where: { userId_blockId: { userId, blockId: block.id } }, select: { id: true, attempts: true, data: true } });

    if (block.type !== "QUIZ") {
      const p = existing
        ? await prisma.blockProgress.update({ where: { id: existing.id }, data: { completedAt: new Date() } })
        : await prisma.blockProgress.create({ data: { userId, blockId: block.id } });
      return NextResponse.json({ done: true, attempts: p.attempts });
    }

    const quiz = block.data as unknown as QuizData;
    // Если есть незавершённая попытка с ответами на все вопросы — берём её (ответы уже проверены по одному),
    // иначе — массив из тела (старый клиент / прямой вызов).
    const prev = (existing?.data as Partial<QuizProgressData> | null) ?? null;
    const ip = prev?.inProgress ?? null;
    let answers: number[];
    if (ip && ip.answers.length === quiz.questions.length && ip.answers.every((a) => a !== null)) {
      answers = ip.answers as number[];
    } else {
      const body = await req.json().catch(() => ({}));
      answers = QuizAnswersSchema.parse(body).answers;
      if (answers.length !== quiz.questions.length) {
        return NextResponse.json({ error: `Нужно ответить на все вопросы (${quiz.questions.length})` }, { status: 400 });
      }
    }
    const { score, total, passed, results } = scoreQuiz(quiz, answers);
    const data: QuizProgressData = { score, total, answers, passed, inProgress: null };
    const attempts = existing ? existing.attempts + 1 : 1;
    await prisma.blockProgress.upsert({
      where: { userId_blockId: { userId, blockId: block.id } },
      update: { data: data as unknown as object, attempts, completedAt: new Date() },
      create: { userId, blockId: block.id, data: data as unknown as object, attempts: 1 },
    });
    return NextResponse.json({ score, total, passed, passScore: quiz.passScore ?? null, required: isRequiredBlock(block), results, attempts });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error("[Academy block complete POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
