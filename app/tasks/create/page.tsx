"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Suspense } from "react";

const CATEGORIES = [
  { key: "CHILDREN", label: "Дети", emoji: "🧒", desc: "Только проверенные исполнители" },
  { key: "SHOPPING", label: "Покупки", emoji: "🛒", desc: "Магазин, доставка" },
  { key: "DELIVERY", label: "Доставка", emoji: "🚗", desc: "Посылки, химчистка" },
  { key: "QUEUE", label: "Очередь", emoji: "⏰", desc: "ОВИР, банк, поликлиника" },
  { key: "HOUSEHOLD", label: "Дом", emoji: "🏠", desc: "Ремонт, уборка" },
  { key: "ONLINE", label: "IT задачи", emoji: "💻", desc: "Сайт, дизайн" },
];

const CITIES = [
  "Душанбе", "Худжанд", "Бохтар", "Кӯлоб", "Исфара",
  "Ҳисор", "Вахш", "Турсунзода", "Панҷакент", "Данғара",
];

const EXAMPLES = [
  {
    text: "Забрать ребёнка из садика №15 в 17:00 сегодня. Бюджет 20 сомони.",
    category: "🧒 Дети",
  },
  {
    text: "Постоять в очереди в ОВИР вместо меня, нужно сдать документы на паспорт.",
    category: "⏰ Очередь",
  },
  {
    text: "Сходить в Корвон за продуктами по списку: молоко, хлеб, яйца, помидоры. Бюджет 50 сомони.",
    category: "🛒 Покупки",
  },
  {
    text: "Сделать сайт-визитку для мастера по маникюру. Нужно за 2 дня.",
    category: "💻 IT задачи",
  },
];

function CreateTaskInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);

  const [rawInput, setRawInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "HOUSEHOLD",
    budget: "",
    address: "",
    city: "Душанбе",
    deadline: "",
    isGroupTask: false,
    executorsNeeded: 1,
    latitude: "",
    longitude: "",
  });

  // Pre-fill from URL param (from home page search)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setRawInput(q);
  }, [searchParams]);

  function update(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAIParse() {
    if (!rawInput.trim() || rawInput.length < 10) {
      setError("Опишите задачу подробнее (минимум 10 символов)");
      return;
    }
    setError("");
    setAiParsing(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка AI-обработки. Попробуйте вручную.");
        return;
      }

      const data = await res.json();
      router.push(`/tasks/${data.task.id}`);
    } catch {
      setError("Ошибка соединения. Попробуйте ещё раз.");
    } finally {
      setAiParsing(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.title || !form.description || !form.budget) {
      setError("Заполните все обязательные поля");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget: parseFloat(form.budget),
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
          deadline: form.deadline || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка создания");
        return;
      }

      const data = await res.json();
      router.push(`/tasks/${data.task.id}`);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-3 text-gray-900">Нужна авторизация</h2>
        <p className="text-gray-500 mb-6">Войдите, чтобы создать поручение</p>
        <Link href="/login" className="btn-primary">Войти</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Новое поручение</h1>
        <p className="text-gray-500">Опишите задачу — AI заполнит все детали автоматически</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* AI Mode — primary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        {/* AI header */}
        <div className="bg-gradient-to-r from-[#14A800] to-[#0d8c00] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h2 className="font-bold">AI-создание</h2>
              <p className="text-green-100 text-xs">Напишите как другу — AI всё поймёт</p>
            </div>
            <span className="ml-auto text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
              Быстро
            </span>
          </div>
        </div>

        <div className="p-5">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Напишите что нужно сделать...&#10;&#10;Например: «Нужно забрать посылку с почты завтра утром, буду дома до 11:00, живу в районе Шохмансур»"
            className="input-field resize-none h-36 mb-4 text-base leading-relaxed"
            disabled={aiParsing}
          />

          <button
            onClick={handleAIParse}
            disabled={aiParsing || rawInput.trim().length < 10}
            className="btn-primary w-full justify-center py-3 text-base mb-2"
          >
            {aiParsing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI анализирует задачу...
              </>
            ) : (
              <>
                ✨ AI заполнит автоматически
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            AI определит категорию, предложит бюджет и срок
          </p>
        </div>

        {/* Example tasks */}
        <div className="border-t border-gray-50 px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Примеры поручений — нажмите чтобы попробовать:
          </p>
          <div className="space-y-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.text}
                type="button"
                onClick={() => { setRawInput(ex.text); setError(""); }}
                disabled={aiParsing}
                className="w-full text-left p-3 bg-gray-50 hover:bg-orange-50 hover:border-orange-200 border border-transparent rounded-xl transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-700 group-hover:text-gray-900 leading-relaxed">
                    {ex.text}
                  </p>
                  <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                    {ex.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manual toggle */}
      <button
        type="button"
        onClick={() => setShowManual(!showManual)}
        className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${showManual ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showManual ? "Скрыть ручное заполнение" : "Заполнить вручную ↓"}
      </button>

      {/* Manual form */}
      {showManual && (
        <form onSubmit={handleManualSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-3 space-y-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h3 className="font-bold text-gray-800">Ручное заполнение</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Название задачи <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Кратко: что нужно сделать"
              className="input-field"
              required
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Подробное описание <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Расскажите подробнее: адрес, время, особые пожелания..."
              className="input-field resize-none h-28"
              required
              minLength={10}
            />
          </div>

          {/* Category grid */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Категория <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => update("category", cat.key)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all text-center ${
                    form.category === cat.key
                      ? "border-[#14A800] bg-[#e6f9e6] text-[#14A800] shadow-sm"
                      : "border-gray-200 hover:border-green-200 text-gray-600 bg-white"
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-xs font-semibold">{cat.label}</div>
                  <div className="text-xs text-gray-400 leading-tight mt-0.5">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {form.category === "CHILDREN" && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
              <span className="shrink-0 mt-0.5">👶</span>
              <span>
                <strong>Только верифицированные исполнители</strong> — к детским задачам допускаются
                исполнители, прошедшие расширенную проверку документов.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Бюджет (сомони) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
                placeholder="50"
                className="input-field"
                required
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Срок выполнения
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Город</label>
              <select
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="input-field"
              >
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Адрес / район</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Шохмансур, ул. Буни-Боғ"
                className="input-field"
              />
            </div>
          </div>

          {/* Group task */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <input
              type="checkbox"
              id="groupTask"
              checked={form.isGroupTask}
              onChange={(e) => update("isGroupTask", e.target.checked)}
              className="w-4 h-4 accent-[#14A800]"
            />
            <label htmlFor="groupTask" className="text-sm text-gray-700 cursor-pointer">
              👥 Групповое поручение — нужно несколько исполнителей
            </label>
          </div>

          {form.isGroupTask && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Сколько исполнителей нужно?
              </label>
              <input
                type="number"
                value={form.executorsNeeded}
                onChange={(e) => update("executorsNeeded", parseInt(e.target.value))}
                className="input-field max-w-[120px]"
                min={2}
                max={20}
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Создаём поручение...
              </>
            ) : "Создать поручение"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CreateTaskPage() {
  return (
    <Suspense fallback={null}>
      <CreateTaskInner />
    </Suspense>
  );
}
