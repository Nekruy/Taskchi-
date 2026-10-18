"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";
import { AcademyTabs, Toast } from "../AcademyTabs";

interface TrackRow {
  id: string;
  slug: string;
  titleRu: string;
  taskCategory: string;
  coverUrl: string | null;
  isPublished: boolean;
  order: number;
  estimatedHours: number;
  partner: { id: string; name: string; logoUrl: string | null } | null;
  stats: { enrollments: number; graduates: number; pending: number; lessons: number };
}

export default function AdminTracksPage() {
  const [rows, setRows] = useState<TrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/academy/tracks");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Не удалось загрузить курсы (${res.status})`);
        return;
      }
      setRows(data.tracks ?? []);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 2000);
  }

  async function togglePublish(t: TrackRow) {
    setBusy(t.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/academy/tracks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !t.isPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, isPublished: !t.isPublished } : r)));
      showToast(t.isPublished ? "Снято с публикации" : "Опубликовано");
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Академия — курсы</h1>
      <AcademyTabs />

      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-sm text-gray-500">
          {rows.length} {rows.length === 1 ? "курс" : rows.length < 5 && rows.length > 0 ? "курса" : "курсов"}
        </p>
        <div className="flex items-center gap-3">
          <Toast text={toast} />
          <Link href="/admin/academy/tracks/new" className="btn-primary">
            + Новый курс
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🎓</div>
          <p>Курсов пока нет — создайте первый</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((t) => {
            const cat = CATEGORY_MAP[t.taskCategory] ?? { emoji: "📋", label: t.taskCategory };
            return (
              <div key={t.id} className="card flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-40 shrink-0">
                  {t.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.coverUrl} alt="" className="w-full aspect-video object-cover rounded-xl" />
                  ) : (
                    <div className="w-full aspect-video rounded-xl bg-primary-50 flex items-center justify-center text-4xl">{cat.emoji}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-bold text-gray-900 truncate">{t.titleRu}</h2>
                    <span className={t.isPublished ? "badge-open" : "badge-done"}>{t.isPublished ? "Опубликован" : "Черновик"}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    /academy/{t.slug} · {cat.emoji} {cat.label} · порядок {t.order} ·{" "}
                    {t.partner ? `партнёр: ${t.partner.name}` : "курс Taskchi"}
                  </p>
                  <p className="text-sm text-gray-700">
                    {t.stats.lessons} {t.stats.lessons === 1 ? "урок" : t.stats.lessons < 5 && t.stats.lessons > 0 ? "урока" : "уроков"} ·
                    записей {t.stats.enrollments} · выпускников {t.stats.graduates} · на проверке{" "}
                    <span className={t.stats.pending > 0 ? "font-bold text-amber-600" : ""}>{t.stats.pending}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link href={`/admin/academy/tracks/${t.id}`} className="btn-secondary py-1.5 px-4 text-xs">
                      Редактировать
                    </Link>
                    <button
                      type="button"
                      onClick={() => togglePublish(t)}
                      disabled={busy === t.id}
                      className={`${t.isPublished ? "btn-outline" : "btn-primary"} py-1.5 px-4 text-xs`}
                    >
                      {busy === t.id ? "..." : t.isPublished ? "Снять с публикации" : "Опубликовать"}
                    </button>
                    <a href={`/academy/${t.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                      Открыть на сайте ↗
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
