"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientQuizData, QuizResultItem } from "@/lib/academy-blocks";

interface Props {
  blockId: string;
  data: ClientQuizData;
  required: boolean;
  initial: { score: number; total: number; passed: boolean; attempts: number } | null;
}

type Phase = "intro" | "question" | "result" | "collapsed";

/** Перемешивание вариантов: храним порядок отображения → исходный индекс. */
function shuffledOrder(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const QUIZ_PASSED_EVENT = "lesson:quiz-passed";

export function QuizBlock({ blockId, data, required, initial }: Props) {
  const [phase, setPhase] = useState<Phase>(initial?.passed ? "collapsed" : "intro");
  const [idx, setIdx] = useState(0);
  const [orders, setOrders] = useState<number[][]>([]);
  const [answers, setAnswers] = useState<number[]>([]); // исходные индексы
  const [picked, setPicked] = useState<number | null>(null); // исходный индекс выбранного на текущем вопросе
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; results: QuizResultItem[]; attempts: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [best, setBest] = useState(initial);

  const total = data.total;
  const q = data.questions[idx];
  const order = orders[idx] ?? data.questions[idx]?.options.map((_, i) => i) ?? [];

  const start = useCallback(() => {
    setOrders(data.questions.map((qq) => shuffledOrder(qq.options.length)));
    setAnswers([]);
    setPicked(null);
    setIdx(0);
    setResult(null);
    setError("");
    setPhase("question");
  }, [data.questions]);

  const pick = useCallback((origIndex: number) => {
    if (picked !== null) return; // ответ менять нельзя
    setPicked(origIndex);
  }, [picked]);

  const next = useCallback(async () => {
    if (picked === null) return;
    const nextAnswers = [...answers, picked];
    setAnswers(nextAnswers);
    setPicked(null);
    if (idx + 1 < total) {
      setIdx(idx + 1);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/academy/blocks/${blockId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || `Ошибка ${res.status}. Попробуйте ещё раз`);
        setIdx(total - 1);
        setAnswers(nextAnswers.slice(0, -1));
        return;
      }
      setResult(j);
      setBest({ score: j.score, total: j.total, passed: j.passed, attempts: j.attempts });
      setPhase("result");
      if (j.passed) window.dispatchEvent(new CustomEvent(QUIZ_PASSED_EVENT, { detail: { blockId } }));
    } catch {
      setError("Нет связи с сервером. Проверьте интернет");
    } finally {
      setLoading(false);
    }
  }, [picked, answers, idx, total, blockId]);

  // Клавиатура: 1–4 выбор, Enter — дальше
  useEffect(() => {
    if (phase !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if (/^[1-4]$/.test(e.key) && picked === null) {
        const pos = Number(e.key) - 1;
        if (order[pos] !== undefined) pick(order[pos]);
      } else if (e.key === "Enter" && picked !== null && !loading) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, picked, order, pick, next, loading]);

  // Мгновенная подсветка после выбора: правильный ответ знаем только по результатам сервера → подсвечиваем
  // выбранный вариант, а правильность показываем через ответ сервера по завершении. Чтобы дать «мгновенно»
  // зелёный/красный и объяснение, запрашиваем проверку одного вопроса локально невозможно (correct скрыт),
  // поэтому после выбора показываем «Ответ принят», а разбор — на экране результатов по каждому вопросу.
  const passLabel = useMemo(() => (data.passScore !== null ? `нужно ${data.passScore} правильных` : "без порога"), [data.passScore]);

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
        <button type="button" onClick={start} className="btn-secondary py-2 text-xs">
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
        {best && !best.passed && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-3 inline-block">
            Прошлая попытка: {best.score}/{best.total} · попыток {best.attempts}
          </p>
        )}
        <div className="mt-5">
          <button type="button" onClick={start} className="btn-primary">
            Начать
          </button>
        </div>
      </section>
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="card md:p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{result.passed ? "🎉" : "💪"}</div>
          <h3 className="text-xl font-extrabold text-gray-900">
            {result.score} из {result.total} — {result.passed ? "тест пройден ✓" : "попробуйте ещё раз"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {result.passed ? "Теперь можно отметить урок пройденным" : `Нужно ${data.passScore ?? 0} правильных · попытка ${result.attempts}`}
          </p>
        </div>
        <ol className="space-y-3 mb-6">
          {data.questions.map((qq, i) => {
            const r = result.results[i];
            const a = answers[i];
            return (
              <li key={i} className={`rounded-xl border px-4 py-3 ${r.isRight ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <p className="font-semibold text-gray-900 text-sm">
                  {r.isRight ? "✅" : "❌"} {i + 1}. {qq.q}
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  Ваш ответ: <span className="font-semibold">{qq.options[a] ?? "—"}</span>
                  {!r.isRight && (
                    <>
                      {" · "}Правильно: <span className="font-semibold">{qq.options[r.correct]}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-600 mt-1">{r.explanation}</p>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-3 justify-center">
          {result.passed ? (
            <button type="button" onClick={() => setPhase("collapsed")} className="btn-secondary">
              Свернуть
            </button>
          ) : (
            <>
              <button type="button" onClick={start} className="btn-primary">
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
        <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${Math.round(((idx + (picked !== null ? 1 : 0)) / total) * 100)}%` }} />
      </div>
      <h3 className="text-lg font-extrabold text-gray-900 leading-snug mb-4">{q.q}</h3>
      <div className="space-y-2">
        {order.map((orig, pos) => {
          const isPicked = picked === orig;
          return (
            <button
              key={orig}
              type="button"
              onClick={() => pick(orig)}
              disabled={picked !== null}
              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                isPicked
                  ? "border-[#14A800] bg-primary-50 text-gray-900"
                  : picked !== null
                  ? "border-gray-100 bg-gray-50 text-gray-400"
                  : "border-gray-200 bg-white text-gray-800 hover:border-[#14A800] hover:bg-primary-50/40"
              }`}
            >
              <span className="inline-flex w-6 h-6 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold items-center justify-center mr-2.5 align-middle">{pos + 1}</span>
              {q.options[orig]}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-5">
        <span className="text-xs text-gray-400">{picked === null ? "Клавиши 1–4 — выбрать" : "Ответ принят · Enter — дальше"}</span>
        <button type="button" onClick={next} disabled={picked === null || loading} className="btn-primary">
          {loading ? "Проверяем..." : idx + 1 < total ? "Дальше →" : "Завершить"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </section>
  );
}
