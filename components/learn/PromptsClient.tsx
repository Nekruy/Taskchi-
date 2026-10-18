"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PromptFormModal, type PromptDraft } from "./PromptFormModal";

interface Prompt {
  id: string;
  title: string;
  body: string;
  tags: string[];
  source: "PRACTICE" | "MENTOR" | "MANUAL";
  createdAt: string;
  lesson: { id: string; order: number; titleRu: string; track: { slug: string; titleRu: string } } | null;
}

const SOURCE_LABEL: Record<string, string> = { PRACTICE: "из урока", MENTOR: "из чата с Устодом", MANUAL: "добавлен вручную" };

export function PromptsClient() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<PromptDraft | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/learn/prompts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Не удалось загрузить (${res.status})`);
        return;
      }
      setPrompts(data.prompts ?? []);
      setTags(data.tags ?? []);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 2000);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return prompts.filter((p) => (!tag || p.tags.includes(tag)) && (!needle || p.title.toLowerCase().includes(needle) || p.body.toLowerCase().includes(needle)));
  }, [prompts, tag, q]);

  async function copy(p: Prompt) {
    try {
      await navigator.clipboard.writeText(p.body);
      showToast("Скопировано");
    } catch {
      showToast("Не удалось скопировать");
    }
  }

  async function remove(p: Prompt) {
    if (!window.confirm(`Удалить промпт «${p.title}»?`)) return;
    const res = await fetch(`/api/learn/prompts/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Ошибка ${res.status}`);
      return;
    }
    setPrompts((list) => list.filter((x) => x.id !== p.id));
    showToast("Удалено");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по тексту…" className="input-field w-auto flex-1 min-w-[200px]" />
        <select value={tag} onChange={(e) => setTag(e.target.value)} className="input-field w-auto min-w-[160px]">
          <option value="">Все теги</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setModal({ title: "", body: "", tags: [], source: "MANUAL" })} className="btn-primary">
          + Добавить промпт
        </button>
        {toast && <span className="text-sm font-semibold text-[#14A800] animate-fade-in">✓ {toast}</span>}
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">✍️</div>
          <p className="font-semibold text-gray-600">{prompts.length === 0 ? "Промптов пока нет" : "Ничего не найдено"}</p>
          <p className="text-sm mt-1">Сохраняйте удачные промпты со страницы урока или из чата с Устодом</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const open = expanded.has(p.id);
            return (
              <div key={p.id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 leading-snug">{p.title}</h3>
                  <span className="text-[11px] text-gray-400 shrink-0">{new Date(p.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
                  className={`text-left text-sm text-gray-700 whitespace-pre-wrap break-words font-mono text-xs bg-gray-50 rounded-xl p-3 ${open ? "" : "line-clamp-4"}`}
                  title={open ? "Свернуть" : "Раскрыть"}
                >
                  {p.body}
                </button>
                <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs">
                  {p.tags.map((t) => (
                    <button key={t} type="button" onClick={() => setTag(t)} className="px-2.5 py-1 rounded-full bg-primary-50 text-[#14A800] font-semibold">
                      {t}
                    </button>
                  ))}
                  <span className="text-gray-400 ml-auto">
                    {SOURCE_LABEL[p.source]}
                    {p.lesson && (
                      <>
                        {" · "}
                        <Link href={`/academy/${p.lesson.track.slug}/${p.lesson.id}`} className="hover:text-[#14A800]">
                          урок {p.lesson.order}
                        </Link>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => copy(p)} className="btn-primary py-1.5 px-3 text-xs">
                    Копировать
                  </button>
                  <button type="button" onClick={() => setModal({ id: p.id, title: p.title, body: p.body, tags: p.tags, source: p.source, lessonId: p.lesson?.id ?? null })} className="btn-secondary py-1.5 px-3 text-xs">
                    Изменить
                  </button>
                  <button type="button" onClick={() => remove(p)} className="btn-ghost py-1.5 px-3 text-xs text-red-600">
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <PromptFormModal
          open={true}
          initial={modal}
          knownTags={tags}
          onClose={() => setModal(null)}
          onSaved={() => {
            showToast("Сохранено");
            load();
          }}
        />
      )}
    </div>
  );
}
