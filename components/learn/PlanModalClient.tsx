"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = [
  { v: 1, l: "Пн" }, { v: 2, l: "Вт" }, { v: 3, l: "Ср" }, { v: 4, l: "Чт" }, { v: 5, l: "Пт" }, { v: 6, l: "Сб" }, { v: 0, l: "Вс" },
];

interface Props {
  initial?: { daysPerWeek: number; preferredDays: number[] } | null;
  triggerLabel?: string;
  triggerClass?: string;
}

export function PlanModalClient({ initial, triggerLabel = "Составить план", triggerClass = "btn-primary" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(initial?.daysPerWeek ?? 3);
  const [picked, setPicked] = useState<number[]>(initial?.preferredDays ?? [1, 3, 5]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(v: number) {
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  }

  async function save() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/learn/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysPerWeek: days, preferredDays: picked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  const tooMany = picked.length > days;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="План занятий">
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">План занятий</h3>
            <p className="text-sm text-gray-500 mb-5">Сколько дней в неделю вы готовы учиться? Мы разложим оставшиеся уроки по датам.</p>

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Дней в неделю: <span className="text-[#14A800]">{days}</span>
            </label>
            <input type="range" min={1} max={7} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-[#14A800] mb-5" />

            <p className="text-sm font-semibold text-gray-700 mb-2">Удобные дни</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {DAYS.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggle(d.v)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                    picked.includes(d.v) ? "bg-[#14A800] text-white border-[#14A800]" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                  }`}
                >
                  {d.l}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-5">
              {picked.length === 0 ? "Без выбора дней — распределим с понедельника." : tooMany ? `Выбрано дней больше, чем ${days} — возьмём первые ${days}.` : " "}
            </p>

            <div className="flex items-center gap-3">
              <button type="button" onClick={save} disabled={loading} className="btn-primary">
                {loading ? "Сохраняем..." : "Сохранить план"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary" disabled={loading}>
                Отмена
              </button>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
