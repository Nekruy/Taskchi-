// ─── Academy: общие хелперы для API и страниц ────────────────────────────────

import { prisma } from "@/lib/prisma";

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

/**
 * Достаёт id ролика из ссылок youtube.com/watch?v=, youtu.be/, /embed/, /shorts/.
 * Возвращает null для не-YouTube ссылок.
 */
export function extractYoutubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.slice(1).split("/")[0] || null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?]+)/);
      id = m ? m[1] : null;
    }
  }
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return id;
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
