"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { extractYoutubeId } from "@/lib/youtube";

export type LessonType = "VIDEO" | "EXTERNAL" | "TEXT" | "TASK";

export interface AdminLesson {
  id: string;
  order: number;
  titleRu: string;
  titleTj: string;
  type: LessonType;
  externalUrl: string | null;
  contentMd: string | null;
  provider: string | null;
  durationMin: number | null;
}

const TYPE_LABEL: Record<LessonType, string> = {
  EXTERNAL: "▶ Внешнее видео (YouTube / ссылка)",
  VIDEO: "🎬 Видеофайл (mp4 / HLS)",
  TEXT: "📄 Текст (markdown)",
  TASK: "✅ Итоговое задание (markdown)",
};

interface Props {
  trackId: string;
  lesson: AdminLesson | null;
  defaultOrder: number;
  onSaved: () => void;
  onCancel: () => void;
}

export function LessonFormClient({ trackId, lesson, defaultOrder, onSaved, onCancel }: Props) {
  const [type, setType] = useState<LessonType>(lesson?.type ?? "EXTERNAL");
  const [order, setOrder] = useState(String(lesson?.order ?? defaultOrder));
  const [titleRu, setTitleRu] = useState(lesson?.titleRu ?? "");
  const [titleTj, setTitleTj] = useState(lesson?.titleTj ?? "");
  const [externalUrl, setExternalUrl] = useState(lesson?.externalUrl ?? "");
  const [contentMd, setContentMd] = useState(lesson?.contentMd ?? "");
  const [provider, setProvider] = useState(lesson?.provider ?? "");
  const [durationMin, setDurationMin] = useState(lesson?.durationMin ? String(lesson.durationMin) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsUrl = type === "EXTERNAL" || type === "VIDEO";
  const ytId = needsUrl && type === "EXTERNAL" ? extractYoutubeId(externalUrl) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (titleRu.trim().length < 3) return setError("Название минимум 3 символа");
    if (needsUrl && !externalUrl.trim().startsWith("https://")) return setError("Нужна https-ссылка на материал");
    if (!needsUrl && !contentMd.trim()) return setError("Введите текст урока (markdown)");

    setLoading(true);
    try {
      const body = {
        order: Number(order),
        titleRu: titleRu.trim(),
        titleTj: titleTj.trim() || titleRu.trim(),
        type,
        externalUrl: needsUrl ? externalUrl.trim() : null,
        contentMd: needsUrl ? null : contentMd,
        provider: provider.trim() || (ytId ? "youtube" : null),
        durationMin: durationMin ? Number(durationMin) : null,
      };
      const res = await fetch(lesson ? `/api/admin/academy/lessons/${lesson.id}` : `/api/admin/academy/tracks/${trackId}/lessons`, {
        method: lesson ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card bg-primary-50/40 border-[#14A800]/30 space-y-4">
      <h3 className="font-bold text-gray-900">{lesson ? `Урок ${lesson.order}: изменить` : "Новый урок"}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px] gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Тип</span>
          <select value={type} onChange={(e) => setType(e.target.value as LessonType)} className="input-field mt-1">
            {(Object.keys(TYPE_LABEL) as LessonType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Порядок</span>
          <input type="number" min={1} value={order} onChange={(e) => setOrder(e.target.value)} className="input-field mt-1" required />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Минут</span>
          <input type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className="input-field mt-1" placeholder="20" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Название (RU)</span>
          <input value={titleRu} onChange={(e) => setTitleRu(e.target.value)} className="input-field mt-1" required />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Название (TJ) — можно оставить пустым, возьмём RU</span>
          <input value={titleTj} onChange={(e) => setTitleTj(e.target.value)} className="input-field mt-1" />
        </label>
      </div>

      {needsUrl ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">
                {type === "EXTERNAL" ? "Ссылка на YouTube или внешний материал" : "Прямая ссылка на видеофайл (mp4 / .m3u8)"}
              </span>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="input-field mt-1"
                placeholder={type === "EXTERNAL" ? "https://www.youtube.com/watch?v=…" : "https://res.cloudinary.com/…/video.mp4"}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Провайдер</span>
              <input value={provider} onChange={(e) => setProvider(e.target.value)} className="input-field mt-1" placeholder={ytId ? "youtube" : "cloudinary"} />
            </label>
          </div>
          {externalUrl.startsWith("https://") && (
            <div className="max-w-md">
              <p className="text-xs font-semibold text-gray-600 mb-1">Превью</p>
              {type === "EXTERNAL" && ytId ? (
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${ytId}`} title="Превью" allowFullScreen />
                </div>
              ) : type === "VIDEO" ? (
                <video controls playsInline preload="metadata" src={externalUrl} className="w-full aspect-video rounded-xl bg-black" />
              ) : (
                <p className="text-xs text-gray-500">Не YouTube — ученик увидит кнопку «Открыть материал»</p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Текст (markdown)</span>
            <textarea
              value={contentMd}
              onChange={(e) => setContentMd(e.target.value)}
              rows={12}
              className="input-field mt-1 font-mono text-xs resize-y"
              placeholder={"## Заголовок\n\nТекст урока…"}
              required
            />
          </label>
          <div>
            <span className="text-xs font-semibold text-gray-600">Превью</span>
            <div className="card mt-1 min-h-[120px] max-h-[420px] overflow-auto">
              {contentMd.trim() ? <Markdown content={contentMd} /> : <p className="text-sm text-gray-400">Начните вводить текст…</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Сохраняем..." : lesson ? "Сохранить урок" : "Добавить урок"}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          Отмена
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
