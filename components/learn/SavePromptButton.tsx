"use client";

import { useState } from "react";
import { PromptFormModal, type PromptDraft } from "./PromptFormModal";

interface Props {
  lessonId: string;
  lessonTitle: string;
  source?: "PRACTICE" | "MENTOR";
  initialBody?: string;
  variant?: "button" | "icon";
  className?: string;
}

/** «💾 Сохранить промпт» — со страницы урока (PRACTICE) или из чата Устода (MENTOR, иконка). */
export function SavePromptButton({ lessonId, lessonTitle, source = "PRACTICE", initialBody = "", variant = "button", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const draft: PromptDraft = {
    title: initialBody ? initialBody.replace(/^Вот мой промпт:\s*/i, "").slice(0, 60) : `Промпт к уроку: ${lessonTitle}`.slice(0, 120),
    body: initialBody.replace(/^Вот мой промпт:\s*/i, ""),
    tags: [],
    source,
    lessonId,
  };
  return (
    <>
      {variant === "icon" ? (
        <button type="button" onClick={() => setOpen(true)} className={`text-xs opacity-70 hover:opacity-100 ${className}`} title="Сохранить как промпт" aria-label="Сохранить как промпт">
          {saved ? "✓" : "💾"}
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`btn-secondary ${className}`}>
          💾 {saved ? "Промпт сохранён" : "Сохранить промпт"}
        </button>
      )}
      <PromptFormModal open={open} initial={draft} onClose={() => setOpen(false)} onSaved={() => setSaved(true)} />
    </>
  );
}
