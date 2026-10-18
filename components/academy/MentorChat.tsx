"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";

interface Msg {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
}

interface Props {
  lessonId: string;
  mentorName: string;
}

const QUICK = [
  { label: "Объясни проще", text: "Объясни проще, о чём этот урок", send: true },
  { label: "Приведи пример для кофейни", text: "Приведи пример из этого урока для небольшой кофейни в Душанбе", send: true },
  { label: "Проверь мой промпт", text: "Вот мой промпт: ", send: false },
];

export function MentorChat({ lessonId, mentorName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  // История при первом открытии
  useEffect(() => {
    if (!open || historyLoaded) return;
    (async () => {
      try {
        const res = await fetch(`/api/academy/mentor?lessonId=${encodeURIComponent(lessonId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessages([{ id: "err-load", role: "error", content: data.error || `Не удалось загрузить историю (${res.status})` }]);
          return;
        }
        setMessages((data.messages ?? []).map((m: { id: string; role: string; content: string }) => ({ id: m.id, role: m.role as Msg["role"], content: m.content })));
        setRemaining(data.remainingToday ?? null);
      } catch {
        setMessages([{ id: "err-net", role: "error", content: "Нет связи с сервером. Проверьте интернет" }]);
      } finally {
        setHistoryLoaded(true);
        scrollToEnd();
      }
    })();
  }, [open, historyLoaded, lessonId, scrollToEnd]);

  useEffect(() => {
    if (open) {
      scrollToEnd();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, messages.length, scrollToEnd]);

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 4 * 24 + 16) + "px";
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setMessages((m) => [...m.filter((x) => x.role !== "error"), { id: `u-${Date.now()}`, role: "user", content }]);
    setLoading(true);
    scrollToEnd();
    try {
      const res = await fetch("/api/academy/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, message: content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (typeof data.remainingToday === "number") setRemaining(data.remainingToday);
        setMessages((m) => [...m, { id: `e-${Date.now()}`, role: "error", content: data.error || `Ошибка ${res.status}. Попробуйте ещё раз` }]);
        return;
      }
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data.reply }]);
      if (typeof data.remainingToday === "number") setRemaining(data.remainingToday);
    } catch {
      setMessages((m) => [...m, { id: `e-${Date.now()}`, role: "error", content: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз" }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  function quick(q: (typeof QUICK)[number]) {
    if (q.send) {
      send(q.text);
    } else {
      setInput(q.text);
      setTimeout(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
          autoGrow(el);
        }
      }, 0);
    }
  }

  const hasDialog = messages.some((m) => m.role !== "error");

  return (
    <>
      {/* Плавающая кнопка: на мобильном над bottom nav (h-16) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary fixed right-4 bottom-20 md:bottom-6 z-40 rounded-full shadow-green-lg px-5 py-3"
          aria-label={`Спросить ${mentorName}а`}
        >
          <span className="text-lg leading-none">🎓</span>
          Спросить {mentorName}а
        </button>
      )}

      {open && (
        <>
          {/* затемнение на мобильном */}
          <div className="fixed inset-0 bg-black/30 z-[60] lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <section
            role="dialog"
            aria-label={`Чат с ${mentorName}ом`}
            className="fixed z-[70] bg-white flex flex-col shadow-2xl
                       inset-x-0 bottom-0 h-[85vh] rounded-t-3xl
                       lg:inset-x-auto lg:right-0 lg:top-16 lg:bottom-0 lg:h-auto lg:w-[400px] lg:rounded-none lg:border-l lg:border-border-green"
          >
            {/* Шапка */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border-green">
              <span className="w-9 h-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center text-lg shrink-0">🎓</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 leading-tight">{mentorName}</p>
                <p className="text-xs text-gray-500">ИИ-наставник курса</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost w-9 h-9 p-0 text-gray-500 text-xl" aria-label="Закрыть">
                ✕
              </button>
            </header>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>Я — ИИ и могу ошибаться. Проверяйте важное.</span>
              {remaining !== null && <span className="shrink-0 font-semibold">Осталось сегодня: {remaining}</span>}
            </div>

            {/* Лента */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {!historyLoaded && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-[#14A800] border-t-transparent rounded-full" />
                </div>
              )}
              {historyLoaded && !hasDialog && (
                <div className="text-sm text-gray-600">
                  <p className="mb-3">
                    Привет! Я {mentorName}, ИИ-помощник Taskchi Academy. Спросите что угодно по этому уроку — объясню, приведу пример или разберу ваш вариант.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK.map((q) => (
                      <button key={q.label} type="button" onClick={() => quick(q)} className="btn-secondary py-1.5 px-3 text-xs">
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) =>
                m.role === "error" ? (
                  <div key={m.id} className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {m.content}
                  </div>
                ) : m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] bg-gradient-brand text-white text-sm rounded-2xl rounded-br-md px-3.5 py-2.5 whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-start gap-2">
                    <span className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-sm shrink-0 mt-1">🎓</span>
                    <div className="max-w-[85%] bg-gray-100 text-gray-800 text-sm rounded-2xl rounded-bl-md px-3.5 py-2.5 break-words">
                      <Markdown content={m.content} className="prose-sm prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5" />
                    </div>
                  </div>
                )
              )}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="animate-spin w-4 h-4 border-2 border-[#14A800] border-t-transparent rounded-full" />
                  {mentorName} печатает…
                </div>
              )}
            </div>

            {/* Ввод */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="border-t border-border-green p-3 flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={1500}
                placeholder="Ваш вопрос по уроку…"
                className="input-field py-2.5 resize-none leading-6"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-4 py-2.5 shrink-0" aria-label="Отправить">
                ➤
              </button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
