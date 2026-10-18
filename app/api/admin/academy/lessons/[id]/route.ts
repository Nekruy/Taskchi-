import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { LessonPatchSchema, lessonTypeError, zodMessage } from "@/lib/academy-admin";

export const dynamic = "force-dynamic";

// PATCH /api/admin/academy/lessons/[id] — частичное обновление с проверкой по типу
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const data = LessonPatchSchema.parse(await req.json());
    const current = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { id: true, trackId: true, type: true, externalUrl: true, contentMd: true },
    });
    if (!current) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });

    // Проверка «по типу» на объединённом состоянии (текущее + изменения)
    const merged = {
      type: data.type ?? current.type,
      externalUrl: "externalUrl" in data ? data.externalUrl ?? null : current.externalUrl,
      contentMd: "contentMd" in data ? data.contentMd ?? null : current.contentMd,
    };
    const typeError = lessonTypeError(merged);
    if (typeError) return NextResponse.json({ error: typeError }, { status: 400 });

    if (merged.type === "TASK" && current.type !== "TASK") {
      const otherTask = await prisma.lesson.count({ where: { trackId: current.trackId, type: "TASK", id: { not: current.id } } });
      if (otherTask > 0) {
        return NextResponse.json({ error: "В курсе уже есть итоговое задание — может быть только одно" }, { status: 409 });
      }
    }

    const lesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        ...(data.order !== undefined && { order: data.order }),
        ...(data.titleRu !== undefined && { titleRu: data.titleRu }),
        ...(data.titleTj !== undefined && { titleTj: data.titleTj }),
        ...(data.type !== undefined && { type: data.type }),
        ...("externalUrl" in data && { externalUrl: data.externalUrl ?? null }),
        ...("contentMd" in data && { contentMd: data.contentMd ?? null }),
        ...("provider" in data && { provider: data.provider ?? null }),
        ...("durationMin" in data && { durationMin: data.durationMin ?? null }),
      },
    });
    return NextResponse.json({ lesson });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: zodMessage(err) }, { status: 400 });
    console.error("[Admin academy lesson PATCH]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE /api/admin/academy/lessons/[id] — 409 если есть прогресс учеников
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { id: true, _count: { select: { progress: true } } },
    });
    if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
    if (lesson._count.progress > 0) {
      return NextResponse.json(
        { error: `Урок уже прошли ${lesson._count.progress} чел. — удалить нельзя` },
        { status: 409 }
      );
    }
    await prisma.lesson.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admin academy lesson DELETE]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
