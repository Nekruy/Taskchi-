"use client";

import { useEffect, useState } from "react";

export const PRESET_TAGS = ["Посты", "Письма", "Описания", "Перевод", "Таблицы", "Картинки", "Другое"];

export interface PromptDraft {
  id?: string;
  title: string;
  body: string;
  tags: string[];
  source: "PRACTICE" | "MENTOR" | "MANUAL";
  lessonId?: string | null;
}

interface Props {
  open: boolean;
  initial: PromptDraft;
  knownTags?: string[];
  onClose: () => void;
  onSaved: (prompt: unknown) => void;
}

export function PromptFormModal({ open, initial, knownTags = [], onClose, onSaved }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(initial.title);
      setBody(initial.body);
      setTagsText(initial.tags.join(", "));
      setError("");
    }
  }, [open, initial]);

  if (!open) return null;

  const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
  const suggestions = Array.from(new Set([...PRESET_TAGS, ...knownTags])).filter((t) => !tags.includes(t));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (title.trim().length < 2) return setError("Название минимум 2 символа");
    if (body.trim().length < 5) return setError("Текст промпта минимум 5 символов");
    setLoading(true);
    try {
      const res = await fetch(initial.id ? `/api/learn/prompts/${initial.id}` : "/api/learn/prompts", {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial.id ? { title: title.trim(), body: body.trim(), tags } : { title: title.trim(), body: body.trim(), tags, source: initial.source, lessonId: initial.lessonId ?? null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      onSaved(data.prompt);
      onClose();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form onSubmit={save} className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Промпт">
        <h3 className="text-lg font-extrabold text-gray-900 mb-4">{initial.id ? "Изменить промпт" : "Сохранить промпт"}</h3>

        <label className="block text-xs font-semibold text-gray-600 mb-1">Название</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field mb-3" placeholder="Пост о новом десерте" maxLength={120} required />

        <label className="block text-xs font-semibold text-gray-600 mb-1">Текст промпта</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="input-field mb-3 resize-y font-mono text-xs" placeholder="Ты — SMM-специалист кофейни в Душанбе…" required />

        <label className="block text-xs font-semibold text-gray-600 mb-1">Теги (через запятую)</label>
        <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className="input-field mb-2" placeholder="Посты, Кофейня" />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {suggestions.slice(0, 12).map((t) => (
              <button key={t} type="button" onClick={() => setTagsText(tags.length ? `${tags.join(", ")}, ${t}` : t)} className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-[#14A800]">
                + {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Сохраняем..." : "Сохранить"}
          </button>
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
            Отмена
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
