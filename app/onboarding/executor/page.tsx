"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const SKILLS = [
  { value: "CHILDREN",  label: "Дети",          icon: "🧒" },
  { value: "SHOPPING",  label: "Покупки",        icon: "🛒" },
  { value: "DELIVERY",  label: "Доставка",       icon: "🚗" },
  { value: "QUEUE",     label: "Очередь",        icon: "⏰" },
  { value: "HOUSEHOLD", label: "Дом и ремонт",   icon: "🏠" },
  { value: "ONLINE",    label: "IT и онлайн",    icon: "💻" },
];

const DISTRICTS = [
  "Исмоили Сомони",
  "Сино",
  "Фирдавси",
  "Шохмансур",
  "Весь Душанбе (все районы)",
];

export default function ExecutorOnboardingPage() {
  const router = useRouter();
  const { status } = useSession();
  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [workArea, setWorkArea] = useState("");
  const [about, setAbout] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleSkill(value: string) {
    setSkills((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  async function handleFinish() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, workArea, about }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сохранения");
        setLoading(false);
        return;
      }
      router.push("/executor");
    } catch {
      setError("Ошибка соединения с сервером");
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s <= step ? "bg-[#14A800] text-white" : "bg-gray-200 text-gray-400"
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-1 rounded-full ${s < step ? "bg-[#14A800]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Step 1 — Skills */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Выберите категории</h2>
              <p className="text-sm text-gray-500 mb-5">Какие задачи вы готовы выполнять?</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {SKILLS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSkill(s.value)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      skills.includes(s.value)
                        ? "border-[#14A800] bg-green-50 text-gray-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-green-300"
                    }`}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (skills.length === 0) { setError("Выберите хотя бы одну категорию"); return; }
                  setError("");
                  setStep(2);
                }}
                className="btn-primary w-full justify-center py-3"
              >
                Далее →
              </button>
            </>
          )}

          {/* Step 2 — Work area */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Район работы</h2>
              <p className="text-sm text-gray-500 mb-5">В каком районе Душанбе вы работаете?</p>
              <div className="space-y-2 mb-6">
                {DISTRICTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWorkArea(d)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      workArea === d
                        ? "border-[#14A800] bg-green-50 text-gray-900"
                        : "border-gray-200 text-gray-700 hover:border-green-300"
                    }`}
                  >
                    📍 {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  ← Назад
                </button>
                <button
                  onClick={() => {
                    if (!workArea) { setError("Выберите район"); return; }
                    setError("");
                    setStep(3);
                  }}
                  className="flex-1 btn-primary justify-center py-3"
                >
                  Далее →
                </button>
              </div>
            </>
          )}

          {/* Step 3 — About */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">О себе</h2>
              <p className="text-sm text-gray-500 mb-5">Кратко расскажите о своём опыте (до 200 символов)</p>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, 200))}
                rows={4}
                placeholder="Например: опыт 3 года, пунктуален, выполняю задачи быстро и качественно..."
                className="input-field resize-none mb-1"
              />
              <div className="text-right text-xs text-gray-400 mb-5">{about.length}/200</div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  ← Назад
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 btn-primary justify-center py-3"
                >
                  {loading ? "Сохранение..." : "Продолжить →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
