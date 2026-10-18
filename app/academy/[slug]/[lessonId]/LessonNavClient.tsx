"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  lessonId: string;
  prevLessonId: string | null;
  nextLessonId: string | null;
  initiallyCompleted: boolean;
}

export function LessonNavClient({ slug, lessonId, prevLessonId, nextLessonId, initiallyCompleted }: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trackHref = `/academy/${slug}`;
  const nextHref = nextLessonId ? `/academy/${slug}/${nextLessonId}` : trackHref;

  async function completeAndNext() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/academy/lessons/${lessonId}/complete`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось сохранить прогресс. Попробуйте ещё раз");
        return;
      }
      setCompleted(true);
      router.push(data.nextLessonId ? `/academy/${slug}/${data.nextLessonId}` : trackHref);
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        {prevLessonId ? (
          <Link href={`/academy/${slug}/${prevLessonId}`} className="btn-secondary">
            ← Назад
          </Link>
        ) : (
          <Link href={trackHref} className="btn-secondary">
            ← К курсу
          </Link>
        )}

        {completed ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" disabled className="btn-outline">
              Пройдено ✓
            </button>
            <Link href={nextHref} className="btn-primary">
              {nextLessonId ? "Дальше →" : "К курсу →"}
            </Link>
          </div>
        ) : (
          <button type="button" onClick={completeAndNext} disabled={loading} className="btn-primary">
            {loading ? "Сохраняем..." : nextLessonId ? "Отметить пройденным и дальше →" : "Отметить пройденным ✓"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-3 sm:text-right">{error}</p>}
    </div>
  );
}
