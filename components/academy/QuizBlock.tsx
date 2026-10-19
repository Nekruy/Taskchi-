"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientQuizData } from "@/lib/academy-blocks";

interface Props {
  blockId: string;
  data: ClientQuizData;
  required: boolean;
  initial: { score: number; total: number; passed: boolean; attempts: number } | null;
  /** Незавершённая попытка (из BlockProgress.data.inProgress) — продолжаем с первого неотвеченного вопроса. */
  inProgress: { answers: (number | null)[] } | null;
}

type Phase = "intro" | "question" | "result" | "collapsed";
interface Feedback {
  isRight: boolean;
  correct: number;
  explanation: string;
}

/** Перемешивание вариантов: порядок отображения → исходный индекс. */
function shuffledOrder(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const QUIZ_PASSED_EVENT = "lesson:quiz-passed";

export function QuizBlock({ blockId, data, required, initial, inProgress }: Props) {
  const total = data.total;
  const resumeIndex = useMemo(() => {
    if (!inProgress || inProgress.answers.length !== total) return null;
    const i = inProgress.answers.findIndex((a) => a === null);
    return i === -1 ? null : i;
  }, [inProgress, total]);

  const [phase, setPhase] = useState<Phase>(initial?.passed && resumeIndex === null ? "collapsed" : "intro");
  const [idx, setIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; attempts: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [best, setBest] = useState(initial);

  const q = data.questions[idx];

  const goTo = useCallback((i: number) => {
    setIdx(i);
    setOrder(shuffledOrder(data.questions[i]?.options.length ?? 4));
    setPicked(null);
    setFeedback(null);
    setError("");
  }, [data.questions]);

  const start = useCallback((from = 0) => {
    setResult(null);
    goTo(from);
    setPhase("question");
  }, [goTo]);

  /** Выбор варианта → мгновенная проверка одного вопроса на сервере. */
  const pick = useCallback(async (origIndex: number) => {
    if (picked !== null || loading) return;
    setPicked(origIndex);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/academy/blocks/${blockId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: idx, answer: origIndex }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409 && typeof j.current === "number") {
        // рассинхрон с сервером (например, второй вкладкой) — перейти к актуальному вопросу
        goTo(j.current);
        setError(j.error || "Продолжаем с текущего вопроса");
        return;
      }
      if (!res.ok) {
        setPicked(null);
        setError(j.error || `Ошибка ${res.status}. Попробуйте ещё раз`);
        return;
      }
      setFeedback({ isRight: j.isRight, correct: j.correct, explanation: j.explanation });
    } catch {
      setPicked(null);
      setError("Нет связи с сервером. Проверьте интернет");
    } finally {
      setLoading(false);
    }
  }, [picked, loading, blockId, idx, goTo]);

  /** «Дальше»: следующий вопрос или завершение попытки. */
  const next = useCallback(async () => {
    if (!feedback || loading) return;
    if (idx + 1 < total) {
      goTo(idx + 1);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/academy/blocks/${blockId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || `Ошибка ${res.status}. Попробуйте ещё раз`);
        return;
      }
      setResult({ score: j.score, total: j.total, passed: j.passed, attempts: j.attempts });
      setBest({ score: j.score, total: j.total, passed: j.passed, attempts: j.attempts });
      setPhase("result");
      if (j.passed) window.dispatchEvent(new CustomEvent(QUIZ_PASSED_EVENT, { detail: { blockId } }));
    } catch {
      setError("Нет связи с сервером. Проверьте интернет");
    } finally {
      setLoading(false);
    }
  }, [feedback, loading, idx, total, blockId, goTo]);

  // Клавиатура: 1–4 выбор, Enter — дальше
  useEffect(() => {
    if (phase !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (/^[1-4]$/.test(e.key) && picked === null) {
        const pos = Number(e.key) - 1;
        if (order[pos] !== undefined) pick(order[pos]);
      } else if (e.key === "Enter" && feedback && !loading) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, picked, order, pick, next, feedback, loading]);

  const passLabel = data.passScore !== null ? `нужно ${data.passScore} правильных` : "без порога";

  if (phase === "collapsed" && best) {
    return (
      <section className="card border-[#14A800]/30 bg-primary-50/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#14A800] text-white flex items-center justify-center text-lg">✓</span>
          <div>
            <p className="font-bold text-gray-900">Тест пройден · {best.score}/{best.total}</p>
            <p className="text-xs text-gray-500">Попыток: {best.attempts}</p>
          </div>
        </div>
        <button type="button" onClick={() => start(0)} className="btn-secondary py-2 text-xs">
          Пройти ещё раз
        </button>
      </section>
    );
  }

  if (phase === "intro") {
    return (
      <section className="card md:p-8 text-center">
        <div className="text-4xl mb-2">🧠</div>
        <h3 className="text-xl font-extrabold text-gray-900">Проверь себя</h3>
        <p className="text-sm text-gray-500 mt-1">
          {total} {total === 1 ? "вопрос" : total < 5 ? "вопроса" : "вопросов"} · {passLabel}
          {required && " · нужен для завершения урока"}
        </p>
        {best && !best.passed && best.attempts > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-3 inline-block">
            Прошлая попытка: {best.score}/{best.total} · попыток {best.attempts}
          </p>
        )}
        <div className="mt-5">
          {resumeIndex !== null ? (
            <button type="button" onClick={() => start(resumeIndex)} className="btn-primary">
              Продолжить тест ({resumeIndex}/{total} отвечено)
            </button>
          ) : (
            <button type="button" onClick={() => start(0)} className="btn-primary">
              Начать
            </button>
          )}
        </div>
      </section>
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="card md:p-8 text-center">
        <div className="text-4xl mb-2">{result.passed ? "🎉" : "💪"}</div>
        <h3 className="text-xl font-extrabold text-gray-900">
          {result.score} из {result.total} — {result.passed ? "тест пройден ✓" : "попробуйте ещё раз"}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {result.passed ? "Теперь можно отметить урок пройденным" : `Нужно ${data.passScore ?? 0} правильных · попытка ${result.attempts}`}
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          {result.passed ? (
            <button type="button" onClick={() => setPhase("collapsed")} className="btn-secondary">
              Свернуть
            </button>
          ) : (
            <>
              <button type="button" onClick={() => start(0)} className="btn-primary">
                Пройти заново
              </button>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-outline">
                Перечитать урок
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  // phase === "question"
  return (
    <section className="card md:p-8" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span className="font-semibold">Вопрос {idx + 1}/{total}</span>
        <span>{passLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-5">
        <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${Math.round(((idx + (feedback ? 1 : 0)) / total) * 100)}%` }} />
      </div>
      <h3 className="text-lg font-extrabold text-gray-900 leading-snug mb-4">{q.q}</h3>
      <div className="space-y-2">
        {order.map((orig, pos) => {
          const isPicked = picked === orig;
          const isCorrect = feedback ? feedback.correct === orig : false;
          let cls = "border-gray-200 bg-white text-gray-800 hover:border-[#14A800] hover:bg-primary-50/40";
          if (feedback) {
            if (isCorrect) cls = "border-emerald-400 bg-emerald-50 text-gray-900";
            else if (isPicked) cls = "border-red-400 bg-red-50 text-gray-900";
            else cls = "border-gray-100 bg-gray-50 text-gray-400";
          } else if (isPicked) cls = "border-[#14A800] bg-primary-50 text-gray-900";
          else if (picked !== null) cls = "border-gray-100 bg-gray-50 text-gray-400";
          return (
            <button key={orig} type="button" onClick={() => pick(orig)} disabled={picked !== null} className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${cls}`}>
              <span className="inline-flex w-6 h-6 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold items-center justify-center mr-2.5 align-middle">{pos + 1}</span>
              {q.options[orig]}
              {feedback && isCorrect && <span className="ml-2 text-emerald-600 font-bold">✓</span>}
              {feedback && isPicked && !isCorrect && <span className="ml-2 text-red-500 font-bold">✗</span>}
            </button>
          );
        })}
      </div>
      {feedback && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${feedback.isRight ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
          <p className="font-bold mb-0.5">{feedback.isRight ? "Верно!" : "Неверно"}</p>
          <p className="text-gray-700">{feedback.explanation}</p>
        </div>
      )}
      <div className="flex items-center justify-between mt-5">
        <span className="text-xs text-gray-400">{!feedback ? (loading ? "Проверяем…" : "Клавиши 1–4 — выбрать") : "Enter — дальше"}</span>
        <button type="button" onClick={next} disabled={!feedback || loading} className="btn-primary">
          {loading && feedback ? "Считаем..." : idx + 1 < total ? "Дальше →" : "Завершить"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </section>
  );
}
