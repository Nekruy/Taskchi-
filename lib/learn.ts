// ─── Academy, Этап 5: учебный кабинет /learn — серия, план, достижения, overview ─

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { quizStatusByLesson, requiredLessonIds } from "@/lib/academy";

export const PROMPT_TAGS = ["Посты", "Письма", "Описания", "Перевод", "Таблицы", "Картинки", "Другое"] as const;
export const PROMPT_SOURCES = ["PRACTICE", "MENTOR", "MANUAL"] as const;
export const WEEKDAYS_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
export const MONTHS_RU_GEN = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/* ── Даты ───────────────────────────────────────────────────────── */

/** YYYY-MM-DD по времени сервера. */
export function dayKey(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
/** «до пт, 24 окт» */
export function formatDue(d: Date): string {
  return `до ${WEEKDAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU_GEN[d.getMonth()]}`;
}
export function formatDateRu(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Серия дней ─────────────────────────────────────────────────── */

/** Дни активности: прогресс по урокам + сообщения Устоду + заметки. */
export async function getActivityDays(userId: string): Promise<Set<string>> {
  const since = addDays(startOfDay(new Date()), -400);
  const [progress, mentor, notes] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { enrollment: { userId }, completedAt: { gte: since } }, select: { completedAt: true } }),
    prisma.mentorMessage.findMany({ where: { userId, role: "user", createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.lessonNote.findMany({ where: { userId, updatedAt: { gte: since } }, select: { updatedAt: true } }),
  ]);
  const days = new Set<string>();
  for (const p of progress) days.add(dayKey(p.completedAt));
  for (const m of mentor) days.add(dayKey(m.createdAt));
  for (const n of notes) days.add(dayKey(n.updatedAt));
  return days;
}

/** Серия подряд: считается от сегодня, а если сегодня активности ещё не было — от вчера. */
export function computeStreak(days: Set<string>, today = new Date()): number {
  let cursor = startOfDay(today);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/* ── Курсы ученика ───────────────────────────────────────────────── */

export type SubmissionState = "NONE" | "READY" | "PENDING" | "APPROVED" | "REJECTED";

export interface CourseCard {
  enrollmentId: string;
  trackId: string;
  slug: string;
  titleRu: string;
  coverUrl: string | null;
  taskCategory: string;
  partner: { name: string; logoUrl: string | null; websiteUrl: string | null } | null;
  status: "ACTIVE" | "COMPLETED" | "DROPPED";
  total: number;
  done: number;
  percent: number;
  requiredTotal: number;
  requiredDone: number;
  nextLessonId: string | null;
  nextLessonOrder: number | null;
  nextLessonTitle: string | null;
  taskLessonId: string | null;
  submission: SubmissionState;
  submissionDate: string | null;
  feedback: string | null;
  completedAt: string | null;
  remainingLessons: { id: string; order: number; titleRu: string; type: string; durationMin: number | null }[];
}

export async function getCourseCards(userId: string): Promise<CourseCard[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { startedAt: "asc" },
    select: {
      id: true,
      status: true,
      completedAt: true,
      track: {
        select: {
          id: true, slug: true, titleRu: true, coverUrl: true, taskCategory: true, isPublished: true,
          partner: { select: { name: true, logoUrl: true, websiteUrl: true } },
          lessons: { orderBy: { order: "asc" }, select: { id: true, order: true, titleRu: true, type: true, durationMin: true } },
        },
      },
      progress: { select: { lessonId: true } },
      submission: { select: { status: true, createdAt: true, reviewedAt: true, feedback: true } },
    },
  });
  return enrollments.map((e) => {
    const done = new Set(e.progress.map((p) => p.lessonId));
    const lessons = e.track.lessons;
    const required = requiredLessonIds(lessons);
    const requiredDone = required.filter((id) => done.has(id)).length;
    const remaining = lessons.filter((l) => !done.has(l.id));
    const next = remaining[0] ?? null;
    const taskLesson = lessons.find((l) => l.type === "TASK") ?? null;
    let submission: SubmissionState = "NONE";
    if (e.submission) submission = e.submission.status as SubmissionState;
    else if (required.length > 0 && requiredDone === required.length) submission = "READY";
    const doneCount = lessons.filter((l) => done.has(l.id)).length;
    return {
      enrollmentId: e.id,
      trackId: e.track.id,
      slug: e.track.slug,
      titleRu: e.track.titleRu,
      coverUrl: e.track.coverUrl,
      taskCategory: e.track.taskCategory,
      partner: e.track.partner,
      status: e.status,
      total: lessons.length,
      done: doneCount,
      percent: lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0,
      requiredTotal: required.length,
      requiredDone,
      nextLessonId: next?.id ?? null,
      nextLessonOrder: next?.order ?? null,
      nextLessonTitle: next?.titleRu ?? null,
      taskLessonId: taskLesson?.id ?? null,
      submission,
      submissionDate: e.submission ? (e.submission.reviewedAt ?? e.submission.createdAt).toISOString() : null,
      feedback: e.submission?.feedback ?? null,
      completedAt: e.completedAt ? e.completedAt.toISOString() : null,
      remainingLessons: remaining,
    };
  });
}

/** Текущий трек: ACTIVE с наибольшим прогрессом (при равенстве — более ранняя запись). */
export function pickCurrent(cards: CourseCard[]): CourseCard | null {
  const active = cards.filter((c) => c.status === "ACTIVE");
  if (active.length === 0) return null;
  return active.reduce((best, c) => (c.percent > best.percent ? c : best), active[0]);
}

/* ── План занятий ────────────────────────────────────────────────── */

export interface PlanItem {
  date: string; // YYYY-MM-DD
  dueLabel: string;
  lessonId: string;
  order: number;
  titleRu: string;
  slug: string;
  trackTitle: string;
  overdue: boolean;
}

/**
 * Раскладывает оставшиеся уроки по выбранным дням начиная с даты плана (не раньше сегодня - 7 дней,
 * чтобы «перенесено» не уходило в бесконечность). Возвращает элементы в окне [сегодня-7 … сегодня+7].
 */
export function schedulePlan(
  plan: { daysPerWeek: number; preferredDays: number[]; updatedAt: Date },
  cards: CourseCard[],
  today = new Date()
): PlanItem[] {
  const current = pickCurrent(cards);
  if (!current) return [];
  // текущий трек первым, затем остальные ACTIVE
  const ordered = [current, ...cards.filter((c) => c.status === "ACTIVE" && c !== current)];
  const queue = ordered.flatMap((c) => c.remainingLessons.map((l) => ({ ...l, slug: c.slug, trackTitle: c.titleRu })));
  if (queue.length === 0) return [];

  let days = Array.from(new Set(plan.preferredDays.filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b);
  if (days.length === 0) days = [1, 2, 3, 4, 5, 6, 0].slice(0, Math.max(1, Math.min(7, plan.daysPerWeek)));
  if (days.length > plan.daysPerWeek) days = days.slice(0, plan.daysPerWeek);
  const allowed = new Set(days);

  const t0 = startOfDay(today);
  const start = startOfDay(plan.updatedAt) < addDays(t0, -7) ? addDays(t0, -7) : startOfDay(plan.updatedAt);
  const end = addDays(t0, 7);
  const items: PlanItem[] = [];
  let cursor = start;
  let qi = 0;
  while (qi < queue.length && cursor <= end) {
    if (allowed.has(cursor.getDay())) {
      const l = queue[qi++];
      items.push({
        date: dayKey(cursor),
        dueLabel: formatDue(cursor),
        lessonId: l.id,
        order: l.order,
        titleRu: l.titleRu,
        slug: l.slug,
        trackTitle: l.trackTitle,
        overdue: cursor < t0,
      });
    }
    cursor = addDays(cursor, 1);
  }
  return items;
}

/* ── Достижения ──────────────────────────────────────────────────── */

export interface Achievement {
  key: string;
  icon: string;
  title: string;
  hint: string;
  earned: boolean;
  earnedAt: string | null;
  link: string | null;
}

export async function getAchievements(userId: string, cards?: CourseCard[], streak?: number): Promise<Achievement[]> {
  const cs = cards ?? (await getCourseCards(userId));
  const st = streak ?? computeStreak(await getActivityDays(userId));
  const [prompts, submissions, mentor] = await Promise.all([
    prisma.savedPrompt.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.submission.findFirst({ where: { enrollment: { userId } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.mentorMessage.findFirst({ where: { userId, role: "user" }, orderBy: { createdAt: "asc" }, select: { createdAt: true, lessonId: true } }),
  ]);
  const list: Achievement[] = [];
  for (const c of cs) {
    list.push({
      key: `graduate:${c.trackId}`,
      icon: "🎓",
      title: `Выпускник: ${c.titleRu}`,
      hint: "Пройдите все уроки и сдайте итоговое задание",
      earned: c.status === "COMPLETED",
      earnedAt: c.status === "COMPLETED" ? c.completedAt : null,
      link: c.status === "COMPLETED" ? `/learn/certificate/${c.enrollmentId}` : `/academy/${c.slug}`,
    });
  }
  list.push({ key: "first-prompt", icon: "✍️", title: "Первый промпт", hint: "Сохраните любой промпт в «Мои промпты»", earned: !!prompts, earnedAt: prompts?.createdAt.toISOString() ?? null, link: "/learn/prompts" });
  list.push({ key: "streak-7", icon: "🔥", title: "Неделя подряд", hint: "Занимайтесь 7 дней подряд: урок, заметка или вопрос Устоду", earned: st >= 7, earnedAt: null, link: "/learn" });
  list.push({ key: "first-submission", icon: "📝", title: "Первое задание", hint: "Сдайте итоговое задание любого курса", earned: !!submissions, earnedAt: submissions?.createdAt.toISOString() ?? null, link: "/learn/assignments" });
  list.push({ key: "mentor-talk", icon: "💬", title: "Разговор с Устодом", hint: "Задайте Устоду вопрос на любом уроке", earned: !!mentor, earnedAt: mentor?.createdAt.toISOString() ?? null, link: "/learn/mentor" });
  const half = cs.find((c) => c.percent >= 50);
  list.push({ key: "half-way", icon: "📚", title: "Половина пути", hint: "Пройдите половину уроков любого курса", earned: !!half, earnedAt: null, link: half ? `/academy/${half.slug}` : "/academy" });
  return list;
}

/* ── Устод: диалоги ──────────────────────────────────────────────── */

export interface MentorDialog {
  lessonId: string;
  lessonOrder: number;
  lessonTitle: string;
  slug: string;
  trackTitle: string;
  count: number;
  lastAt: string;
  lastPreview: string;
}

export async function getMentorDialogs(userId: string, limit?: number): Promise<MentorDialog[]> {
  const groups = await prisma.mentorMessage.groupBy({
    by: ["lessonId"],
    where: { userId },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  if (groups.length === 0) return [];
  const sorted = groups.sort((a, b) => (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0)).slice(0, limit ?? groups.length);
  const lessons = await prisma.lesson.findMany({
    where: { id: { in: sorted.map((g) => g.lessonId) } },
    select: { id: true, order: true, titleRu: true, track: { select: { slug: true, titleRu: true } } },
  });
  const lastMessages = await Promise.all(
    sorted.map((g) => prisma.mentorMessage.findFirst({ where: { userId, lessonId: g.lessonId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { content: true, role: true } }))
  );
  return sorted.map((g, i) => {
    const l = lessons.find((x) => x.id === g.lessonId);
    const last = lastMessages[i];
    return {
      lessonId: g.lessonId,
      lessonOrder: l?.order ?? 0,
      lessonTitle: l?.titleRu ?? "Урок",
      slug: l?.track.slug ?? "",
      trackTitle: l?.track.titleRu ?? "",
      count: g._count._all,
      lastAt: (g._max.createdAt ?? new Date()).toISOString(),
      lastPreview: (last ? (last.role === "assistant" ? "Устод: " : "Вы: ") + last.content : "").slice(0, 140),
    };
  });
}

/* ── Overview ───────────────────────────────────────────────────── */

export async function getOverview(userId: string) {
  const [user, cards, days, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } }),
    getCourseCards(userId),
    getActivityDays(userId),
    prisma.learningPlan.findUnique({ where: { userId }, select: { daysPerWeek: true, preferredDays: true, updatedAt: true } }),
  ]);
  const streak = computeStreak(days);
  const current = pickCurrent(cards);
  // Этап 6: текущий урок прочитан (тест начат), но тест не сдан → «Пройти тест урока N»
  let nextLessonQuizPending = false;
  if (current?.nextLessonId) {
    const qs = await quizStatusByLesson([current.nextLessonId], userId);
    const st = qs.get(current.nextLessonId);
    nextLessonQuizPending = !!st && st.hasQuiz && st.attempted && !st.quizPassed;
  }
  const [achievements, mentor, recommended] = await Promise.all([
    getAchievements(userId, cards, streak),
    getMentorDialogs(userId, 3),
    prisma.track.findFirst({
      where: { isPublished: true, id: { notIn: cards.map((c) => c.trackId) } },
      orderBy: { order: "asc" },
      select: { id: true, slug: true, titleRu: true, descriptionRu: true, coverUrl: true, taskCategory: true, estimatedHours: true, partner: { select: { name: true } }, _count: { select: { lessons: true } } },
    }),
  ]);
  return {
    user: { name: user?.name ?? "", role: user?.role ?? "CUSTOMER", workHref: user?.role === "EXECUTOR" ? "/executor" : "/customer" },
    streak,
    activeToday: days.has(dayKey(new Date())),
    current,
    nextLessonQuizPending,
    plan: plan ? { daysPerWeek: plan.daysPerWeek, preferredDays: plan.preferredDays, items: schedulePlan(plan, cards) } : null,
    courses: cards,
    achievements: { earned: achievements.filter((a) => a.earned).length, total: achievements.length, top: achievements.filter((a) => a.earned).slice(0, 3), list: achievements },
    mentor,
    recommended,
  };
}

/* ── Сертификат ─────────────────────────────────────────────────── */

export function certificateNumber(enrollmentId: string): string {
  return "TA-" + createHash("sha1").update(enrollmentId).digest("hex").slice(0, 8).toUpperCase();
}
