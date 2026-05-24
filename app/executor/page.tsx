"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  CHILDREN: "🧒", SHOPPING: "🛒", DELIVERY: "🚗",
  QUEUE: "⏰", HOUSEHOLD: "🏠", ONLINE: "💻",
};

const NAV = [
  { href: "/executor",               icon: "📋", label: "Задачи" },
  { href: "/executor/earnings",      icon: "💰", label: "Заработок" },
  { href: "/executor/notifications", icon: "🔔", label: "Уведомления" },
  { href: "/profile",                icon: "👤", label: "Профиль" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type UserInfo = {
  id: string; name: string;
  passportStatus: string; passportNote: string | null;
  rating: number; reviewCount: number;
  workArea: string | null; city: string;
  isAvailable: boolean; skills: string[];
  headline?: string | null; about: string | null;
  createdAt: string;
};
type TaskRow = {
  id: string; title: string; budget: number; status: string;
  createdAt: string; updatedAt: string;
  creator: { name: string };
};
type AvailableTask = {
  id: string; title: string; category: string; budget: number;
  address: string | null; city: string; deadline: string | null;
};
type DashData = { user: UserInfo; activeTasks: TaskRow[]; completedTasks: TaskRow[]; earned: number };

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-green-600 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 text-sm font-semibold max-w-xs text-center">
        <span className="text-xl">🎉</span>
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none">×</button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExecutorDashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<DashData | null>(null);
  const [available, setAvailable] = useState<AvailableTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskTab, setTaskTab] = useState<"active" | "done">("active");
  const [toggling, setToggling] = useState(false);

  // Resume editing
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headlineDraft, setHeadlineDraft] = useState("");
  const [savingHeadline, setSavingHeadline] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);
  const headlineInputRef = useRef<HTMLInputElement>(null);

  // Toast for new portfolio item
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/executor/dashboard").then((r) => r.json()),
      fetch("/api/tasks?status=OPEN&limit=10").then((r) => r.json()),
    ]).then(([dash, tasks]) => {
      setData(dash);
      setAvailable(tasks.tasks ?? []);
      setLoading(false);

      // Portfolio toast: show if completedTasks count increased since last visit
      const prevCount = parseInt(
        typeof window !== "undefined"
          ? localStorage.getItem("tc_done_count") ?? "0"
          : "0"
      );
      const newCount = (dash.completedTasks ?? []).length;
      if (newCount > prevCount && prevCount >= 0) {
        setToast(true);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("tc_done_count", String(newCount));
      }
    });
  }, [status]);

  // Focus headline input when editing starts
  useEffect(() => {
    if (editingHeadline) headlineInputRef.current?.focus();
  }, [editingHeadline]);

  async function toggleAvailability() {
    if (!data || toggling) return;
    setToggling(true);
    const next = !data.user.isAvailable;
    await fetch("/api/executor/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    setData((d) => d ? { ...d, user: { ...d.user, isAvailable: next } } : d);
    setToggling(false);
  }

  async function saveHeadline() {
    if (!data) return;
    setSavingHeadline(true);
    const res = await fetch("/api/executor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline: headlineDraft }),
    });
    if (res.ok) {
      const { user } = await res.json();
      setData((d) => d ? { ...d, user: { ...d.user, headline: user.headline } } : d);
      setEditingHeadline(false);
    }
    setSavingHeadline(false);
  }

  async function saveAbout() {
    if (!data) return;
    setSavingAbout(true);
    const res = await fetch("/api/executor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ about: aboutDraft }),
    });
    if (res.ok) {
      const { user } = await res.json();
      setData((d) => d ? { ...d, user: { ...d.user, about: user.about } } : d);
      setEditingAbout(false);
    }
    setSavingAbout(false);
  }

  function startEditHeadline() {
    if (!data) return;
    setHeadlineDraft(data.user.headline ?? "");
    setEditingHeadline(true);
  }

  function startEditAbout() {
    if (!data) return;
    setAboutDraft(data.user.about ?? "");
    setEditingAbout(true);
  }

  // ─── Loading / guard ────────────────────────────────────────────────────────

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!data) return null;

  const { user, activeTasks, completedTasks, earned } = data;
  const isApproved = user.passportStatus === "APPROVED";

  const badges = [
    ...(isApproved ? [{ icon: "✅", label: "Паспорт проверен" }] : []),
    ...(user.rating >= 4.5 && user.reviewCount >= 10 ? [{ icon: "⭐", label: "Топ исполнитель" }] : []),
    ...(completedTasks.length >= 20 ? [{ icon: "🚀", label: "Быстрый отклик" }] : []),
    ...(completedTasks.length < 3 ? [{ icon: "🆕", label: "Новичок" }] : []),
  ];

  const shownTasks = taskTab === "active" ? activeTasks : completedTasks;

  // ─── Resume progress ─────────────────────────────────────────────────────────
  const progressSteps = [
    { done: isApproved, label: "Паспорт проверен" },
    { done: Boolean(user.headline), label: "Заголовок заполнен" },
    { done: Boolean(user.about), label: "О себе заполнено" },
    { done: user.skills.length > 0, label: "Навыки выбраны" },
    { done: completedTasks.length >= 1, label: "Первая задача выполнена" },
  ];
  const resumePct = progressSteps.filter((s) => s.done).length * 20;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Toast */}
      {toast && (
        <Toast
          message="Новая задача в портфолио! Ваш профиль стал сильнее"
          onClose={() => setToast(false)}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Панель исполнителя</h1>
        <p className="text-sm text-gray-500">{user.name}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* A) Verification status */}
        {(user.passportStatus === "NONE" || user.passportStatus === "REJECTED") && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">❌</span>
              <span className="font-bold text-red-700">Не верифицирован</span>
            </div>
            {user.passportNote && (
              <p className="text-sm text-red-600 mb-3">Причина: {user.passportNote}</p>
            )}
            <Link
              href="/verify/passport"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
            >
              Пройти верификацию
            </Link>
          </div>
        )}
        {user.passportStatus === "PENDING" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">⏳</span>
              <span className="font-bold text-amber-700">На проверке</span>
            </div>
            <p className="text-sm text-amber-600">Ваш паспорт проверяется администратором</p>
          </div>
        )}
        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">✅</span>
              <span className="font-bold text-green-700">Верифицирован</span>
            </div>
            <p className="text-sm text-green-600">Вы можете откликаться на задачи</p>
          </div>
        )}

        {/* B) Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Выполнено задач" value={completedTasks.length} />
          <StatCard label="Заработано" value={`${earned.toLocaleString()} сом`} />
          <StatCard label="Рейтинг" value={`⭐ ${user.rating.toFixed(1)}`} />
          <StatCard label="Отзывы" value={user.reviewCount} />
        </div>

        {/* ══ MY RESUME ════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-gray-900">Моё резюме</h2>
            <Link
              href={`/profile/${user.id}`}
              target="_blank"
              className="text-xs text-[#14A800] font-semibold hover:underline"
            >
              Открыть публичный профиль ↗
            </Link>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
              <span>Готовность резюме</span>
              <span className="font-bold text-gray-700">{resumePct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#14A800] rounded-full transition-all duration-500"
                style={{ width: `${resumePct}%` }}
              />
            </div>
            {resumePct < 100 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {progressSteps.filter((s) => !s.done).map((s) => (
                  <span key={s.label} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    +20% {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Headline */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Заголовок</label>
                {!editingHeadline && (
                  <button
                    onClick={startEditHeadline}
                    className="text-xs text-gray-400 hover:text-[#14A800] transition-colors"
                    title="Редактировать"
                  >
                    ✏️ Изменить
                  </button>
                )}
              </div>
              {editingHeadline ? (
                <div className="flex gap-2">
                  <input
                    ref={headlineInputRef}
                    value={headlineDraft}
                    onChange={(e) => setHeadlineDraft(e.target.value.slice(0, 120))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveHeadline();
                      if (e.key === "Escape") setEditingHeadline(false);
                    }}
                    placeholder="Курьер и помощник в Душанбе"
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#14A800] focus:ring-1 focus:ring-[#14A800]"
                    maxLength={120}
                  />
                  <button
                    onClick={saveHeadline}
                    disabled={savingHeadline}
                    className="px-3 py-2 bg-[#14A800] text-white rounded-xl text-sm font-semibold hover:bg-[#0d8c00] transition-colors disabled:opacity-60"
                  >
                    {savingHeadline ? "..." : "✓"}
                  </button>
                  <button
                    onClick={() => setEditingHeadline(false)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-700 min-h-[1.5rem]">
                  {user.headline || <span className="text-gray-400 italic">Не заполнено — добавьте краткий заголовок</span>}
                </p>
              )}
            </div>

            {/* About */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">О себе</label>
                {!editingAbout && (
                  <button
                    onClick={startEditAbout}
                    className="text-xs text-gray-400 hover:text-[#14A800] transition-colors"
                  >
                    ✏️ Изменить
                  </button>
                )}
              </div>
              {editingAbout ? (
                <div className="space-y-2">
                  <textarea
                    value={aboutDraft}
                    onChange={(e) => setAboutDraft(e.target.value.slice(0, 500))}
                    placeholder="Расскажите о своём опыте, преимуществах, подходе к работе..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#14A800] focus:ring-1 focus:ring-[#14A800] resize-none h-28"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{aboutDraft.length}/500</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingAbout(false)}
                        className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={saveAbout}
                        disabled={savingAbout}
                        className="px-4 py-1.5 bg-[#14A800] text-white rounded-xl text-xs font-semibold hover:bg-[#0d8c00] disabled:opacity-60"
                      >
                        {savingAbout ? "Сохранение..." : "Сохранить"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed min-h-[1.5rem]">
                  {user.about || <span className="text-gray-400 italic">Не заполнено — расскажите о своём опыте</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* C) Availability toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">
              {user.isAvailable ? "Я доступен" : "Недоступен"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.isAvailable ? "Заказчики видят вас онлайн" : "Вы скрыты от заказчиков"}
            </p>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            className={`w-14 h-7 rounded-full relative transition-colors duration-200 ${
              user.isAvailable ? "bg-[#14A800]" : "bg-gray-300"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow transition-all duration-200 ${
                user.isAvailable ? "left-8" : "left-1"
              }`}
            />
          </button>
        </div>

        {/* D) My tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 mb-4">
            {(["active", "done"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTaskTab(t)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  taskTab === t
                    ? "bg-[#14A800] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t === "active" ? `Активные (${activeTasks.length})` : `Завершённые (${completedTasks.length})`}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {shownTasks.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">
                {taskTab === "active" ? "Нет активных задач" : "Нет завершённых задач"}
              </p>
            ) : shownTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="block border border-gray-100 rounded-xl p-3 hover:border-[#14A800] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Заказчик: {task.creator.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#14A800] text-sm">{task.budget} сом</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(task.updatedAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* E) Available tasks */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Задачи рядом с вами</h2>
          {!isApproved && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm text-amber-700 font-semibold">
              🔒 Пройдите верификацию чтобы откликнуться
            </div>
          )}
          <div className="space-y-3">
            {available.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Нет доступных задач</p>
            )}
            {available.map((task) => (
              <div key={task.id} className="relative bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden">
                {!isApproved && (
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="text-sm font-semibold text-gray-500">🔒 Верификация требуется</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{CATEGORY_ICONS[task.category] ?? "📋"}</span>
                      <span className="font-semibold text-gray-900 text-sm truncate">{task.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                      {task.address && <span>📍 {task.address}</span>}
                      {task.deadline && (
                        <span>📅 {new Date(task.deadline).toLocaleDateString("ru-RU")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-[#14A800]">{task.budget} сом</span>
                    {isApproved && (
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-xs bg-[#14A800] hover:bg-[#0d8c00] text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      >
                        Откликнуться
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* F) Badges */}
        {badges.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Достижения</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700"
                >
                  <span>{b.icon}</span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* G) Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-20">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2.5 text-xs font-semibold transition-colors ${
              pathname === item.href ? "text-[#14A800]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
