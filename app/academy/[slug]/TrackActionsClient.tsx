"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  firstLessonId: string | null;
  nextLessonId: string | null;
  done: number;
  total: number;
}

export function TrackActionsClient({ slug, isLoggedIn, isEnrolled, firstLessonId, nextLessonId, done, total }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/academy/${slug}`)}`;

  async function enroll() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/academy/tracks/${slug}/enroll`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось записаться. Попробуйте ещё раз");
        return;
      }
      const target = data.firstLessonId ? `/academy/${slug}/${data.firstLessonId}` : `/academy/${slug}`;
      router.push(target);
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      {isEnrolled && total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-semibold text-gray-700">Прогресс</span>
            <span className="text-gray-500">
              {done}/{total} · {percent}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!isLoggedIn ? (
          <Link href={loginHref} className="btn-primary">
            Войти, чтобы начать
          </Link>
        ) : !isEnrolled ? (
          <button type="button" onClick={enroll} disabled={loading || !firstLessonId} className="btn-primary">
            {loading ? "Записываем..." : "Записаться бесплатно"}
          </button>
        ) : nextLessonId ? (
          <Link href={`/academy/${slug}/${nextLessonId}`} className="btn-primary">
            {done === 0 ? "Начать обучение" : done >= total ? "Повторить курс" : "Продолжить"} →
          </Link>
        ) : null}

        {done >= total && total > 0 && isEnrolled && <span className="badge-open">Все уроки пройдены 🎉</span>}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
