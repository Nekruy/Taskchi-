"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CATEGORIES,
  PROFESSIONS,
  EXTRA_SKILLS,
  EDUCATION_LEVELS,
  DISTRICTS,
} from "@/lib/categories";

const TOTAL_STEPS = 4;

export default function ExecutorOnboardingPage() {
  const router  = useRouter();
  const { status } = useSession();

  const [step,    setStep]    = useState(1);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // ── Step 1 — Personal info ────────────────────────────────────────────────
  const [lastName,        setLastName]        = useState("");
  const [gender,          setGender]          = useState("");
  const [birthDate,       setBirthDate]       = useState("");
  const [avatarPreview,   setAvatarPreview]   = useState<string | null>(null);
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 2 — Profession ───────────────────────────────────────────────────
  const [profession, setProfession] = useState("");
  const [skills,     setSkills]     = useState<string[]>([]);

  // ── Step 3 — Education & Extra skills ────────────────────────────────────
  const [education,      setEducation]      = useState("");
  const [educationField, setEducationField] = useState("");
  const [extraSkills,    setExtraSkills]    = useState<string[]>([]);
  const [hasCar,         setHasCar]         = useState(false);
  const [workWeekends,   setWorkWeekends]   = useState(false);

  // ── Step 4 — About ────────────────────────────────────────────────────────
  const [headline, setHeadline] = useState("");
  const [about,    setAbout]    = useState("");
  const [workArea, setWorkArea] = useState("");

  // ── Helpers ───────────────────────────────────────────────────────────────

  function toggleSkill(value: string) {
    setSkills((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  function toggleExtraSkill(value: string) {
    setExtraSkills((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res  = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.url);
      } else {
        setError("Ошибка загрузки фото: " + (data.error ?? "попробуйте снова"));
        setAvatarPreview(null);
      }
    } catch {
      setError("Ошибка соединения при загрузке фото");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleFinish() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/executor", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName,
          gender,
          birthDate:     birthDate  || undefined,
          avatar:        avatarUrl  || undefined,
          profession,
          skills,
          education,
          educationField,
          extraSkills,
          hasCar,
          workWeekends,
          headline,
          about,
          workArea,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка сохранения");
        setLoading(false);
        return;
      }
      router.push("/executor");
    } catch {
      setError("Ошибка соединения с сервером");
      setLoading(false);
    }
  }

  // ── Loading guard ─────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)" }}
          >
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Стать исполнителем</h1>
          <p className="text-gray-500 text-sm">Заполните профиль — это займёт 2 минуты</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s < step    ? "bg-[#14A800] text-white" :
                  s === step  ? "bg-[#14A800] text-white ring-4 ring-[#14A800]/20" :
                                "bg-gray-200 text-gray-400"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < TOTAL_STEPS && (
                <div className={`w-10 h-1 rounded-full transition-all ${s < step ? "bg-[#14A800]" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              <span className="shrink-0">⚠️</span>
              {error}
            </div>
          )}

          {/* ═══════════════════════════════════ STEP 1 ─ ЛИЧНЫЕ ДАННЫЕ */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Личные данные</h2>
              <p className="text-sm text-gray-500 mb-6">Расскажите немного о себе</p>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 hover:border-[#14A800] transition-colors shrink-0 overflow-hidden"
                >
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <span className="text-2xl">📸</span>
                      <span className="text-[10px] mt-1 font-semibold">Фото</span>
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Фото профиля</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Необязательно — но исполнители с фото<br />получают на 40% больше заказов
                  </p>
                </div>
              </div>

              {/* Last name */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Фамилия</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ваша фамилия"
                  className="input-field"
                  maxLength={60}
                />
              </div>

              {/* Gender */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Пол</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "MALE",   label: "👨 Мужчина" },
                    { value: "FEMALE", label: "👩 Женщина" },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        gender === g.value
                          ? "border-[#14A800] bg-green-50 text-gray-900"
                          : "border-gray-200 text-gray-600 hover:border-green-300"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Birth date */}
              <div className="mb-7">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Дата рождения{" "}
                  <span className="font-normal text-gray-400">(необязательно)</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 10)}
                  className="input-field"
                />
              </div>

              <button
                onClick={() => { setError(""); setStep(2); }}
                className="btn-primary w-full justify-center py-3"
              >
                Далее →
              </button>
            </>
          )}

          {/* ═══════════════════════════════════ STEP 2 ─ ПРОФЕССИЯ */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Ваша профессия</h2>
              <p className="text-sm text-gray-500 mb-5">
                Выберите основной вид деятельности и категории задач
              </p>

              {/* Primary profession — single-select grid */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Основная профессия
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PROFESSIONS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setProfession(p.key)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                        profession === p.key
                          ? "border-[#14A800] bg-green-50"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <div className="text-2xl mb-0.5">{p.emoji}</div>
                      <div className="text-xs font-semibold text-gray-800 leading-tight">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills / categories — multi-select */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Какие задачи выполняете?{" "}
                  <span className="normal-case text-gray-400">(можно несколько)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleSkill(c.key)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                        skills.includes(c.key)
                          ? "border-[#14A800] bg-green-50"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <span className="text-lg shrink-0">{c.emoji}</span>
                      <span className="text-sm font-semibold text-gray-800">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(""); setStep(1); }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => {
                    if (!profession)       { setError("Выберите профессию"); return; }
                    if (!skills.length)    { setError("Выберите хотя бы одну категорию задач"); return; }
                    setError(""); setStep(3);
                  }}
                  className="flex-1 btn-primary justify-center py-3"
                >
                  Далее →
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════ STEP 3 ─ ОБРАЗОВАНИЕ */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Образование и навыки</h2>
              <p className="text-sm text-gray-500 mb-5">
                Добавьте информацию для полного резюме
              </p>

              {/* Education level */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Уровень образования
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="input-field"
                >
                  <option value="">Выберите...</option>
                  {EDUCATION_LEVELS.map((e) => (
                    <option key={e.key} value={e.key}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Education field */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Специальность{" "}
                  <span className="font-normal text-gray-400">(необязательно)</span>
                </label>
                <input
                  type="text"
                  value={educationField}
                  onChange={(e) => setEducationField(e.target.value)}
                  placeholder="Например: Экономика, IT, Медицина..."
                  className="input-field"
                  maxLength={100}
                />
              </div>

              {/* Extra skills */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Дополнительные навыки
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EXTRA_SKILLS.map((skill) => (
                    <button
                      key={skill.key}
                      type="button"
                      onClick={() => toggleExtraSkill(skill.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                        extraSkills.includes(skill.key)
                          ? "border-[#14A800] bg-green-50"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <span className="shrink-0">{skill.emoji}</span>
                      <span className="text-xs font-semibold text-gray-800">{skill.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 mb-6">
                {[
                  {
                    state: hasCar, toggle: () => setHasCar(!hasCar),
                    icon: "🚗", title: "Есть личный автомобиль", sub: "Доставка и поездки",
                  },
                  {
                    state: workWeekends, toggle: () => setWorkWeekends(!workWeekends),
                    icon: "📅", title: "Работаю в выходные", sub: "Суббота и воскресенье",
                  },
                ].map((t) => (
                  <div key={t.title} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{t.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                        <p className="text-xs text-gray-500">{t.sub}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={t.toggle}
                      className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                        t.state ? "bg-[#14A800]" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow transition-all duration-200 ${
                          t.state ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(""); setStep(2); }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => { setError(""); setStep(4); }}
                  className="flex-1 btn-primary justify-center py-3"
                >
                  Далее →
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════ STEP 4 ─ О СЕБЕ */}
          {step === 4 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">О себе</h2>
              <p className="text-sm text-gray-500 mb-5">
                Последний шаг — расскажите заказчикам о себе
              </p>

              {/* Headline */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Заголовок резюме
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
                  placeholder="Курьер и помощник в Душанбе, опыт 5 лет"
                  className="input-field"
                  maxLength={120}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{headline.length}/120</p>
              </div>

              {/* About */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">О себе</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value.slice(0, 500))}
                  rows={4}
                  placeholder="Расскажите об опыте, сильных сторонах, подходе к работе..."
                  className="input-field resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{about.length}/500</p>
              </div>

              {/* Work area */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Район работы
                </label>
                <div className="space-y-2">
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
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(""); setStep(3); }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 btn-primary justify-center py-3"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Сохранение...
                    </span>
                  ) : "Готово ✓"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
