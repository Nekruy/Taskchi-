"use client";

import { useEffect, useRef, useState } from "react";

/** Блок «Мои заметки» на странице урока: автосохранение через 1 с после ввода. */
export function LessonNotes({ lessonId, initialContent }: { lessonId: string; initialContent: string }) {
  const [value, setValue] = useState(initialContent);
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initialContent);

  async function save(content: string) {
    if (content === lastSaved.current) {
      setState("idle");
      return;
    }
    setState("saving");
    try {
      const res = await fetch("/api/learn/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        setState("error");
        return;
      }
      lastSaved.current = content;
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setError("Нет связи с сервером");
      setState("error");
    }
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onChange(v: string) {
    setValue(v);
    setState("dirty");
    setError("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(v), 1000);
  }

  const status =
    state === "saving" ? "Сохраняем…" : state === "saved" ? "✓ Сохранено" : state === "dirty" ? "Изменено" : state === "error" ? error : value ? "Сохранено" : "";

  return (
    <section className="card mt-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-bold text-gray-900">📝 Мои заметки</h3>
        <span className={`text-xs ${state === "error" ? "text-red-600" : state === "saved" ? "text-[#14A800] font-semibold" : "text-gray-400"}`}>{status}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current);
          save(value);
        }}
        rows={4}
        maxLength={20000}
        placeholder="Ваши мысли по уроку: что запомнить, что попробовать…"
        className="input-field resize-y"
      />
      <p className="text-[11px] text-gray-400 mt-1.5">Заметки видны только вам. Все заметки — в разделе «Моя учёба › Заметки».</p>
    </section>
  );
}
