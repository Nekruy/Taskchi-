import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { LessonSchema, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

// POST /api/admin/academy/tracks/[id]/lessons — добавить урок
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const data = LessonSchema.parse(await req.json());
    const track = await prisma.track.findUnique({
      where: { id: params.id },
      select: { id: true, _count: { select: { lessons: { where: { type: "TASK" } } } } },
    });
    if (!track) return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
    if (data.type === "TASK" && track._count.lessons > 0) {
      return NextResponse.json({ error: "В курсе уже есть итоговое задание — может быть только одно" }, { status: 409 });
    }

    const lesson = await prisma.lesson.create({
      data: {
        trackId: track.id,
        order: data.order,
        titleRu: data.titleRu,
        titleTj: data.titleTj,
        type: data.type,
        externalUrl: data.externalUrl ?? null,
        contentMd: data.contentMd ?? null,
        provider: data.provider ?? null,
        durationMin: data.durationMin ?? null,
      },
    });
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    console.error("[Admin academy lessons POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
