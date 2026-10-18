import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { CATEGORY_MAP } from "@/lib/categories";

export const dynamic = "force-dynamic";

const ReviewSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
    feedback: z.string().trim().max(2000, "Комментарий не длиннее 2000 символов").default(""),
  })
  .refine((d) => d.action !== "REJECT" || d.feedback.length >= 10, {
    message: "При отклонении укажите причину (минимум 10 символов)",
    path: ["feedback"],
  });

// POST /api/admin/academy/submissions/[id]/review — принять / отклонить задание
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const data = ReviewSchema.parse(await req.json());

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        enrollment: {
          select: {
            id: true,
            userId: true,
            track: {
              select: {
                id: true,
                slug: true,
                titleRu: true,
                taskCategory: true,
                lessons: { where: { type: "TASK" }, select: { id: true }, orderBy: { order: "asc" }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!submission) {
      return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
    }
    if (submission.status !== "PENDING") {
      return NextResponse.json({ error: "Работа уже проверена" }, { status: 409 });
    }

    const { enrollment } = submission;
    const { track } = enrollment;
    const taskLessonId = track.lessons[0]?.id;
    const link = taskLessonId ? `/academy/${track.slug}/${taskLessonId}` : `/academy/${track.slug}`;
    const now = new Date();
    const feedback = data.feedback || null;
    const reviewerId = session.user.id;

    if (data.action === "APPROVE") {
      const categoryLabel = CATEGORY_MAP[track.taskCategory]?.label ?? track.taskCategory;
      await prisma.$transaction(async (tx) => {
        await tx.submission.update({
          where: { id: submission.id },
          data: { status: "APPROVED", feedback, reviewerId, reviewedAt: now },
        });
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", completedAt: now },
        });
        await tx.executorCategory.upsert({
          where: { userId_category: { userId: enrollment.userId, category: track.taskCategory } },
          update: { source: "ACADEMY", trackId: track.id },
          create: { userId: enrollment.userId, category: track.taskCategory, source: "ACADEMY", trackId: track.id },
        });
        await tx.notification.create({
          data: {
            userId: enrollment.userId,
            type: "ACADEMY_APPROVED",
            title: "Задание принято! 🎓",
            body: `Курс «${track.titleRu}» пройден. Вам открыта категория «${categoryLabel}».${feedback ? ` Комментарий: ${feedback}` : ""}`,
            link,
          },
        });
      });
      return NextResponse.json({ ok: true, status: "APPROVED" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: submission.id },
        data: { status: "REJECTED", feedback, reviewerId, reviewedAt: now },
      });
      await tx.notification.create({
        data: {
          userId: enrollment.userId,
          type: "ACADEMY_REJECTED",
          title: "Задание отправлено на доработку",
          body: `Курс «${track.titleRu}»: ${feedback}. Исправьте работу и пересдайте.`,
          link,
        },
      });
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[Admin academy review POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
