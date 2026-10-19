// ─── Academy: общие хелперы для API и страниц ────────────────────────────────

import { prisma } from "@/lib/prisma";
export { extractYoutubeId } from "@/lib/youtube";

/** Имя ИИ-наставника Академии (Этап 4). Представляется как ИИ-помощник, не как человек. */
export const MENTOR_NAME = "Устод";

/** Поля урока, которые отдаём в списках (без externalUrl/contentMd). */
export const LESSON_LIST_SELECT = {
  id: true,
  order: true,
  titleRu: true,
  type: true,
  durationMin: true,
} as const;

export const LESSON_TYPE_ICON: Record<string, string> = {
  VIDEO: "▶",
  EXTERNAL: "▶",
  TEXT: "📄",
  TASK: "✅",
};

export const LESSON_TYPE_LABEL: Record<string, string> = {
  VIDEO: "Видео",
  EXTERNAL: "Видео",
  TEXT: "Текст",
  TASK: "Задание",
};

/** «8 уроков», «1 урок», «3 урока» */
export function pluralLessons(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} урок`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} урока`;
  return `${n} уроков`;
}

/** Минуты → «~6 ч», «45 мин», «1 ч 20 мин» */
export function formatMinutes(min: number): string {
  if (min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/** Активная запись пользователя на трек + id пройденных уроков. */
export async function getEnrollment(userId: string, trackId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_trackId: { userId, trackId } },
    select: {
      id: true,
      status: true,
      progress: { select: { lessonId: true } },
    },
  });
  if (!enrollment) return null;
  return {
    id: enrollment.id,
    status: enrollment.status,
    completedLessonIds: enrollment.progress.map((p) => p.lessonId),
  };
}

/* ─── Этап 2: сдача задания, допуск, бейджи ─────────────────────────────────── */

export type AcademyBadge = { category: string; trackTitleRu: string | null };

/**
 * Допуски, выданные Академией (ExecutorCategory.source = "ACADEMY").
 * У ExecutorCategory.trackId нет FK (решение отчёта 01), поэтому название трека
 * подтягивается вторым запросом.
 */
export async function getAcademyBadges(userId: string): Promise<AcademyBadge[]> {
  const rows = await prisma.executorCategory.findMany({
    where: { userId, source: "ACADEMY" },
    select: { category: true, trackId: true },
    orderBy: { grantedAt: "asc" },
  });
  if (rows.length === 0) return [];
  const trackIds = rows.map((r) => r.trackId).filter((id): id is string => !!id);
  const tracks = trackIds.length
    ? await prisma.track.findMany({ where: { id: { in: trackIds } }, select: { id: true, titleRu: true } })
    : [];
  return rows.map((r) => ({
    category: r.category,
    trackTitleRu: tracks.find((t) => t.id === r.trackId)?.titleRu ?? null,
  }));
}

/** Уроки, которые нужно пройти до сдачи задания — все, кроме TASK. */
export function requiredLessonIds(lessons: Array<{ id: string; type: string }>): string[] {
  return lessons.filter((l) => l.type !== "TASK").map((l) => l.id);
}

/** Сколько обязательных уроков ещё не пройдено. */
export function countMissingLessons(
  lessons: Array<{ id: string; type: string }>,
  completedLessonIds: string[]
): number {
  const done = new Set(completedLessonIds);
  return requiredLessonIds(lessons).filter((id) => !done.has(id)).length;
}

/** Поля Submission, которые видит ученик (без reviewerId). */
export const SUBMISSION_STUDENT_SELECT = {
  id: true,
  status: true,
  workUrl: true,
  comment: true,
  feedback: true,
  reviewedAt: true,
  createdAt: true,
} as const;

export type StudentSubmission = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  workUrl: string | null;
  comment: string | null;
  feedback: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

/** Сериализация дат для передачи в клиентский компонент. */
export function toStudentSubmission(s: {
  id: string;
  status: string;
  workUrl: string | null;
  comment: string | null;
  feedback: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}): StudentSubmission {
  return {
    id: s.id,
    status: s.status as StudentSubmission["status"],
    workUrl: s.workUrl,
    comment: s.comment,
    feedback: s.feedback,
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  };
}

/* ─── Этап 6: блоки урока ─────────────────────────────────────────────────── */

import { isBlockDone, isRequiredBlock, stripQuizForClient, type QuizData, type QuizProgressData } from "@/lib/academy-blocks";

export interface ClientBlock {
  id: string;
  order: number;
  type: "TEXT" | "QUIZ" | "VIDEO";
  data: unknown; // TEXT { md } | VIDEO { url } | QUIZ — без correct/explanation
  required: boolean;
  progress: { attempts: number; completedAt: string; data: Partial<QuizProgressData> | null } | null;
  done: boolean;
}

/** Блоки урока для клиента + прогресс пользователя. QUIZ отдаётся без правильных ответов. */
export async function getLessonBlocksForUser(lessonId: string, userId: string): Promise<ClientBlock[]> {
  const blocks = await prisma.lessonBlock.findMany({
    where: { lessonId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: { progress: { where: { userId }, select: { attempts: true, completedAt: true, data: true } } },
  });
  return blocks.map((b) => {
    const p = b.progress[0] ?? null;
    const required = isRequiredBlock(b);
    return {
      id: b.id,
      order: b.order,
      type: b.type,
      data: b.type === "QUIZ" ? stripQuizForClient(b.data as unknown as QuizData) : b.data,
      required,
      progress: p ? { attempts: p.attempts, completedAt: p.completedAt.toISOString(), data: (p.data as Partial<QuizProgressData> | null) ?? null } : null,
      done: isBlockDone(b, p),
    };
  });
}

/** Гейт завершения урока: есть ли обязательные блоки и все ли закрыты. */
export async function lessonBlockGate(lessonId: string, userId: string): Promise<{ required: number; done: number; ok: boolean }> {
  const blocks = await prisma.lessonBlock.findMany({
    where: { lessonId },
    include: { progress: { where: { userId }, select: { data: true } } },
  });
  const req = blocks.filter((b) => isRequiredBlock(b));
  const done = req.filter((b) => isBlockDone(b, b.progress[0] ?? null)).length;
  return { required: req.length, done, ok: done === req.length };
}

/**
 * Для списка уроков: у каких есть обязательный тест и у каких он сдан пользователем.
 * Возвращает Map lessonId → { hasQuiz, quizPassed, attempted }.
 */
export async function quizStatusByLesson(lessonIds: string[], userId: string | null) {
  const blocks = await prisma.lessonBlock.findMany({
    where: { lessonId: { in: lessonIds }, type: "QUIZ" },
    include: userId ? { progress: { where: { userId }, select: { data: true } } } : undefined,
  });
  const map = new Map<string, { hasQuiz: boolean; quizPassed: boolean; attempted: boolean }>();
  for (const id of lessonIds) map.set(id, { hasQuiz: false, quizPassed: false, attempted: false });
  for (const b of blocks) {
    if (!isRequiredBlock(b)) continue;
    const cur = map.get(b.lessonId)!;
    const p = (b as { progress?: { data: unknown }[] }).progress?.[0] ?? null;
    cur.hasQuiz = true;
    if (p) cur.attempted = true;
    if (!isBlockDone(b, p)) cur.quizPassed = false;
    else if (cur.quizPassed || !cur.attempted) cur.quizPassed = true;
    // если в уроке несколько обязательных тестов — сдан, когда сданы все
    const allPassed = blocks.filter((x) => x.lessonId === b.lessonId && isRequiredBlock(x)).every((x) => isBlockDone(x, (x as { progress?: { data: unknown }[] }).progress?.[0] ?? null));
    cur.quizPassed = allPassed;
  }
  return map;
}
