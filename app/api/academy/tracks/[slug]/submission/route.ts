import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SUBMISSION_STUDENT_SELECT, countMissingLessons } from "@/lib/academy";

export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  workUrl: z
    .string()
    .trim()
    .url("Введите корректную ссылку")
    .refine((u) => u.startsWith("https://"), "Ссылка должна начинаться с https://"),
  comment: z.string().trim().max(2000, "Комментарий не длиннее 2000 символов").optional(),
});

async function loadContext(slug: string, userId: string) {
  const track = await prisma.track.findUnique({
    where: { slug },
    select: {
      id: true,
      isPublished: true,
      lessons: { select: { id: true, type: true }, orderBy: { order: "asc" } },
    },
  });
  if (!track || !track.isPublished) return { error: 404 as const };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_trackId: { userId, trackId: track.id } },
    select: {
      id: true,
      progress: { select: { lessonId: true } },
      submission: { select: SUBMISSION_STUDENT_SELECT },
    },
  });
  if (!enrollment) return { error: 403 as const };

  const missingLessons = countMissingLessons(
    track.lessons,
    enrollment.progress.map((p) => p.lessonId)
  );
  return { track, enrollment, missingLessons };
}

// GET /api/academy/tracks/[slug]/submission — состояние сдачи для текущего ученика
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }
  try {
    const ctx = await loadContext(params.slug, session.user.id);
    if ("error" in ctx) {
      return NextResponse.json(
        { error: ctx.error === 404 ? "Трек не найден" : "Вы не записаны на этот трек" },
        { status: ctx.error }
      );
    }
    const submission = ctx.enrollment.submission;
    return NextResponse.json({
      submission,
      canSubmit: ctx.missingLessons === 0 && submission?.status !== "APPROVED",
      missingLessons: ctx.missingLessons,
    });
  } catch (err) {
    console.error("[Academy submission GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/academy/tracks/[slug]/submission — сдать / пересдать итоговое задание
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }
  try {
    const data = SubmitSchema.parse(await req.json());

    const ctx = await loadContext(params.slug, session.user.id);
    if ("error" in ctx) {
      return NextResponse.json(
        { error: ctx.error === 404 ? "Трек не найден" : "Вы не записаны на этот трек" },
        { status: ctx.error }
      );
    }
    if (ctx.missingLessons > 0) {
      return NextResponse.json({ error: "Сначала пройдите все уроки" }, { status: 409 });
    }
    const existing = ctx.enrollment.submission;
    if (existing?.status === "APPROVED") {
      return NextResponse.json({ error: "Задание уже принято — пересдача не нужна" }, { status: 409 });
    }

    const payload = { workUrl: data.workUrl, comment: data.comment || null, status: "PENDING" as const };
    const submission = await prisma.submission.upsert({
      where: { enrollmentId: ctx.enrollment.id },
      update: payload, // feedback прошлой проверки сохраняем
      create: { enrollmentId: ctx.enrollment.id, ...payload },
      select: SUBMISSION_STUDENT_SELECT,
    });

    return NextResponse.json({ submission }, { status: existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[Academy submission POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
