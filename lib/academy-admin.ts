// ─── Academy, админка: zod-схемы и общие проверки для /api/admin/academy ─────

import { z } from "zod";
import { TaskCategory } from "@prisma/client";

const httpsUrl = (msg: string) =>
  z.string().trim().url(msg).refine((u) => u.startsWith("https://"), "Ссылка должна начинаться с https://");

/** Пустую строку из формы считаем «не задано». */
const optionalUrl = (msg: string) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), httpsUrl(msg).optional());

export const SLUG_RE = /^[a-z0-9-]{2,40}$/;

export const PartnerSchema = z.object({
  slug: z.string().trim().regex(SLUG_RE, "Slug: 2–40 символов, только a-z, 0-9 и дефис"),
  name: z.string().trim().min(2, "Название минимум 2 символа").max(80),
  logoUrl: optionalUrl("Некорректная ссылка на логотип"),
  websiteUrl: optionalUrl("Некорректная ссылка на сайт"),
  descriptionRu: z.string().trim().min(10, "Описание минимум 10 символов").max(2000),
  isActive: z.boolean().optional(),
});
export const PartnerPatchSchema = PartnerSchema.partial();

export const TrackSchema = z.object({
  slug: z.string().trim().regex(SLUG_RE, "Slug: 2–40 символов, только a-z, 0-9 и дефис"),
  titleRu: z.string().trim().min(3, "Название минимум 3 символа").max(120),
  titleTj: z.string().trim().min(3, "Название (TJ) минимум 3 символа").max(120),
  descriptionRu: z.string().trim().min(10, "Описание минимум 10 символов").max(4000),
  descriptionTj: z.string().trim().min(10, "Описание (TJ) минимум 10 символов").max(4000),
  coverUrl: optionalUrl("Некорректная ссылка на обложку").nullable(),
  taskCategory: z.nativeEnum(TaskCategory, { errorMap: () => ({ message: "Выберите категорию" }) }),
  estimatedHours: z.coerce.number().int().min(1, "Минимум 1 час").max(500),
  order: z.coerce.number().int().min(0).max(1000),
  isPublished: z.boolean(),
  partnerId: z.preprocess((v) => (v === "" ? null : v), z.string().min(1).nullable().optional()),
});
export const TrackPatchSchema = TrackSchema.partial();

export const LESSON_TYPES = ["VIDEO", "EXTERNAL", "TEXT", "TASK"] as const;

const LessonBase = z.object({
  order: z.coerce.number().int().min(1, "Порядок — от 1").max(1000),
  titleRu: z.string().trim().min(3, "Название минимум 3 символа").max(160),
  titleTj: z.string().trim().min(3, "Название (TJ) минимум 3 символа").max(160),
  type: z.enum(LESSON_TYPES, { errorMap: () => ({ message: "Выберите тип урока" }) }),
  externalUrl: optionalUrl("Некорректная ссылка на материал").nullable(),
  contentMd: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().max(50000).nullable().optional()),
  provider: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(40).nullable().optional()),
  durationMin: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(1).max(600).nullable().optional()
  ),
});

/** Требования по типу: EXTERNAL/VIDEO — https-ссылка, TEXT/TASK — непустой markdown. Возвращает текст ошибки или null. */
export function lessonTypeError(d: { type?: string; externalUrl?: string | null; contentMd?: string | null }): string | null {
  if (!d.type) return null;
  if ((d.type === "EXTERNAL" || d.type === "VIDEO") && !d.externalUrl) return "Для видео/внешнего урока нужна https-ссылка";
  if ((d.type === "TEXT" || d.type === "TASK") && !(d.contentMd && d.contentMd.trim())) return "Для текстового урока и задания нужен текст (markdown)";
  return null;
}

function checkLessonByType(d: { type?: string; externalUrl?: string | null; contentMd?: string | null }, ctx: z.RefinementCtx) {
  const msg = lessonTypeError(d);
  if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
}

export const LessonSchema = LessonBase.superRefine(checkLessonByType);
/** PATCH: частичный; проверка по типу выполняется в роуте после слияния с текущими значениями. */
export const LessonPatchSchema = LessonBase.partial();

export const MoveSchema = z.object({ direction: z.enum(["up", "down"]) });

/** Первое сообщение zod для ответа 400. */
export function zodMessage(err: z.ZodError): string {
  return err.errors[0]?.message ?? "Некорректные данные";
}

/** Prisma P2002 (unique) → true */
export function isUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
