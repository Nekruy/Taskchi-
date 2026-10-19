"use client";

import { useEffect, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { extractYoutubeId } from "@/lib/youtube";

type BlockType = "TEXT" | "QUIZ" | "VIDEO";
interface Block {
  id: string;
  order: number;
  type: BlockType;
  data: unknown;
  _count: { progress: number };
}
interface Question {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}
const TYPE_LABEL: Record<BlockType, string> = { TEXT: "📄 Текст", QUIZ: "🧠 Тест", VIDEO: "🎬 Видео" };
const emptyQ = (): Question => ({ q: "", options: ["", "", "", ""], correct: 0, explanation: "" });

function preview(b: Block): string {
  const d = b.data as Record<string, unknown>;
  if (b.type === "TEXT") return String(d.md ?? "").slice(0, 80);
  if (b.type === "VIDEO") return String(d.url ?? "");
  const qs = (d.questions as unknown[]) ?? [];
  return `${qs.length} вопр. · порог ${d.passScore ?? "—"}`;
}

/** Секция «Блоки» в форме урока (только для существующего урока). */
export function BlocksEditor({ lessonId }: { lessonId: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<Block | "new" | null>(null);
  const [newType, setNewType] = useState<BlockType>("TEXT");
  const [busy, setBusy] = useState<string | null>(null);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 2000);
  };

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/academy/lessons/${lessonId}/blocks`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      setBlocks(data.blocks ?? []);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function move(b: Block, direction: "up" | "down") {
    setBusy(b.id);
    setError("");
    const res = await fetch(`/api/admin/academy/blocks/${b.id}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || `Ошибка ${res.status}`);
    else setBlocks(data.blocks);
    setBusy(null);
  }
  async function remove(b: Block) {
    if (!window.confirm(`Удалить блок «${TYPE_LABEL[b.type]}»?`)) return;
    setBusy(b.id);
    setError("");
    const res = await fetch(`/api/admin/academy/blocks/${b.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || `Ошибка ${res.status}`);
    else {
      showToast("Блок удалён");
      await load();
    }
    setBusy(null);
  }

  return (
    <section className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 className="font-bold text-gray-900">Блоки ({blocks.length})</h4>
        <div className="flex items-center gap-2">
          {toast && <span className="text-xs font-semibold text-[#14A800]">✓ {toast}</span>}
          {editing === null && (
            <>
              <select value={newType} onChange={(e) => setNewType(e.target.value as BlockType)} className="input-field w-auto py-1.5 text-xs">
                {(Object.keys(TYPE_LABEL) as BlockType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setEditing("new")} className="btn-primary py-1.5 px-3 text-xs">
                + Блок
              </button>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">Если блоков нет — урок показывает contentMd как раньше. Тест с порогом обязателен для завершения урока.</p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {editing === "new" && (
        <BlockForm lessonId={lessonId} type={newType} block={null} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); showToast("Сохранено"); await load(); }} />
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Загрузка…</p>
      ) : (
        <div className="divide-y divide-[#f0f9f0] border border-gray-100 rounded-xl overflow-hidden">
          {blocks.length === 0 && editing !== "new" && <p className="text-xs text-gray-400 px-3 py-3">Блоков нет — урок рендерится из contentMd</p>}
          {blocks.map((b, i) =>
            editing && editing !== "new" && editing.id === b.id ? (
              <div key={b.id} className="p-3">
                <BlockForm lessonId={lessonId} type={b.type} block={b} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); showToast("Сохранено"); await load(); }} />
              </div>
            ) : (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 text-xs bg-white">
                <span className="w-7 text-center font-bold text-gray-400">{b.order}</span>
                <span className="w-16 shrink-0">{TYPE_LABEL[b.type]}</span>
                <span className="flex-1 min-w-0 truncate text-gray-700">{preview(b)}</span>
                {b._count.progress > 0 && <span className="text-gray-400 shrink-0" title="Учеников с прогрессом">👤 {b._count.progress}</span>}
                <button type="button" onClick={() => move(b, "up")} disabled={i === 0 || busy === b.id} className="btn-ghost px-1.5 py-0.5 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(b, "down")} disabled={i === blocks.length - 1 || busy === b.id} className="btn-ghost px-1.5 py-0.5 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => setEditing(b)} disabled={busy === b.id} className="btn-ghost px-1.5 py-0.5">Изменить</button>
                <button type="button" onClick={() => remove(b)} disabled={busy === b.id} className="btn-ghost px-1.5 py-0.5 text-red-600">Удалить</button>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

/* ── Форма блока по типу ──────────────────────────────────────── */
function BlockForm({ lessonId, type, block, onCancel, onSaved }: { lessonId: string; type: BlockType; block: Block | null; onCancel: () => void; onSaved: () => void }) {
  const d = (block?.data ?? {}) as Record<string, unknown>;
  const [order, setOrder] = useState(String(block?.order ?? ""));
  const [md, setMd] = useState(String(d.md ?? ""));
  const [url, setUrl] = useState(String(d.url ?? ""));
  const [passScore, setPassScore] = useState(d.passScore !== undefined ? String(d.passScore) : "3");
  const [questions, setQuestions] = useState<Question[]>(Array.isArray(d.questions) && (d.questions as Question[]).length ? (d.questions as Question[]) : [emptyQ()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  function setQ(i: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let data: unknown;
    if (type === "TEXT") {
      if (!md.trim()) return setError("Введите текст блока");
      data = { md };
    } else if (type === "VIDEO") {
      if (!url.trim().startsWith("https://")) return setError("Нужна https-ссылка");
      data = { url: url.trim() };
    } else {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.q.trim().length < 3) return setError(`Вопрос ${i + 1}: текст минимум 3 символа`);
        if (q.options.some((o: string) => !o.trim())) return setError(`Вопрос ${i + 1}: заполните все 4 варианта`);
        if (!q.explanation.trim()) return setError(`Вопрос ${i + 1}: нужно объяснение`);
      }
      const ps = passScore.trim() === "" ? undefined : Number(passScore);
      if (ps !== undefined && (ps < 0 || ps > questions.length)) return setError("Порог не может быть больше числа вопросов");
      data = { passScore: ps, questions: questions.map((q) => ({ q: q.q.trim(), options: q.options.map((o) => o.trim()), correct: q.correct, explanation: q.explanation.trim() })) };
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = { type, data };
      if (order.trim() !== "") body.order = Number(order);
      const res = await fetch(block ? `/api/admin/academy/blocks/${block.id}` : `/api/admin/academy/lessons/${lessonId}/blocks`, {
        method: block ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || `Ошибка ${res.status}`);
        return;
      }
      onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  const ytId = type === "VIDEO" ? extractYoutubeId(url) : null;

  return (
    <form onSubmit={save} className="card bg-primary-50/40 border-[#14A800]/30 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h5 className="font-bold text-gray-900 text-sm">{block ? "Изменить блок" : "Новый блок"} · {TYPE_LABEL[type]}</h5>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          Порядок
          <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="input-field w-20 py-1 text-xs" placeholder="авто" />
        </label>
      </div>

      {type === "TEXT" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <textarea value={md} onChange={(e) => setMd(e.target.value)} rows={10} className="input-field font-mono text-xs resize-y" placeholder="## Заголовок\n\nТекст…" />
          <div className="card min-h-[100px] max-h-[360px] overflow-auto">{md.trim() ? <Markdown content={md} /> : <p className="text-xs text-gray-400">Превью</p>}</div>
        </div>
      )}

      {type === "VIDEO" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="input-field" placeholder="https://www.youtube.com/watch?v=… или https://…/video.mp4" required />
          {url.startsWith("https://") && (ytId ? (
            <div className="aspect-video rounded-xl overflow-hidden bg-black"><iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${ytId}`} title="Превью" allowFullScreen /></div>
          ) : (
            <video controls playsInline preload="metadata" src={url} className="w-full aspect-video rounded-xl bg-black" />
          ))}
        </div>
      )}

      {type === "QUIZ" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Порог прохождения (passScore)
            <input type="number" min={0} max={questions.length} value={passScore} onChange={(e) => setPassScore(e.target.value)} className="input-field w-20 py-1 text-xs" />
            <span className="text-gray-400">из {questions.length} · пусто = тест необязательный</span>
          </label>
          {questions.map((q, i) => (
            <div key={i} className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Вопрос {i + 1}</span>
                {questions.length > 1 && (
                  <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, k) => k !== i))} className="btn-ghost px-2 py-0.5 text-xs text-red-600">Удалить</button>
                )}
              </div>
              <input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} className="input-field text-sm" placeholder="Текст вопроса" />
              {q.options.map((o, k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${block?.id ?? "new"}-${i}`} checked={q.correct === k} onChange={() => setQ(i, { correct: k })} className="accent-[#14A800]" title="Правильный" />
                  <input value={o} onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })} className="input-field py-1.5 text-sm" placeholder={`Вариант ${k + 1}`} />
                </label>
              ))}
              <input value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} className="input-field text-sm" placeholder="Объяснение (показывается после ответа)" />
            </div>
          ))}
          <div className="flex items-center gap-2">
            {questions.length < 20 && (
              <button type="button" onClick={() => setQuestions((qs) => [...qs, emptyQ()])} className="btn-secondary py-1.5 px-3 text-xs">+ Вопрос</button>
            )}
            <button type="button" onClick={() => setShowPreview((v) => !v)} className="btn-ghost py-1.5 px-3 text-xs">{showPreview ? "Скрыть превью" : "Превью"}</button>
          </div>
          {showPreview && (
            <div className="card">
              <p className="text-xs text-gray-500 mb-2">Как увидит ученик (варианты перемешиваются):</p>
              <p className="font-bold text-gray-900 text-sm mb-2">{questions[0]?.q || "…"}</p>
              {questions[0]?.options.map((o, k) => (
                <div key={k} className={`px-3 py-2 rounded-lg border text-sm mb-1 ${k === questions[0].correct ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`}>{o || `Вариант ${k + 1}`}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? "Сохраняем..." : block ? "Сохранить блок" : "Добавить блок"}</button>
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">Отмена</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
