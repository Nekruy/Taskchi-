"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";

// ─── Constants ────────────────────────────────────────────────────────────────

function categoryIcon(key: string): string {
  return CATEGORY_MAP[key]?.emoji ?? "📋";
}

const NAV = [
  { href: "/executor",               icon: "📋", label: "Задачи" },
  { href: "/executor/earnings",      icon: "💰", label: "Заработок" },
  { href: "/executor/notifications", icon: "🔔", label: "Уведомления" },
  { href: "/profile",                icon: "👤", label: "Профиль" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type UserInfo = {
  id: string; name: string; avatar: string | null;
  passportStatus: string; passportNote: string | null;
  rating: number; reviewCount: number;
  workArea: string | null; city: string;
  isAvailable: boolean; skills: string[];
  headline: string | null; about: string | null;
  createdAt: string;
  lastName: string | null;
  gender: string | null;
  birthDate: string | null;
  education: string | null;
  educationField: string | null;
  extraSkills: string[];
  hasCar: boolean;
  workWeekends: boolean;
  profession: string | null;
};

type TaskRow = {
  id: string; title: string; budget: number; status: string;
  createdAt: string; updatedAt: string;
  creator: { id: string; name: string };
  chat?: { id: string } | null;
  deadline?: string | null;
};

type AvailableTask = {
  id: string; title: string; category: string; budget: number;
  address: string | null; city: string; deadline: string | null;
};

type MyOffer = {
  id: string;
  price: number;
  message: string;
  status: string;
  createdAt: string;
  task: {
    id: string;
    title: string;
    budget: number;
    status: string;
    category: string;
    address: string | null;
    createdAt: string;
    creator: { name: string; avatar: string | null; rating: number };
    chat?: { id: string } | null;
  };
};

type DashData = {
  user: UserInfo;
  activeTasks: TaskRow[];
  completedTasks: TaskRow[];
  earned: number;
  myOffers: MyOffer[];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, delay = 0 }: { label: string; value: string | number; delay?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#e8f5e8] p-4 animate-scale-in"
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: "0 2px 12px rgba(20,168,0,.06)",
        transition: "box-shadow .2s, transform .2s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(20,168,0,.14)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(20,168,0,.06)"; (e.currentTarget as HTMLElement).style.transform = ""; }}
    >
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

// Active task card with "Mark done" button
function ActiveTaskCard({
  task,
  onMarkDone,
}: {
  task: TaskRow;
  onMarkDone: (id: string) => Promise<void>;
}) {
  const [marking, setMarking] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function confirmDone() {
    setMarking(true);
    setShowModal(false);
    await onMarkDone(task.id);
    setMarking(false);
  }

  return (
    <>
      {/* Confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Отметить как выполненную?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Заказчик должен подтвердить выполнение. После подтверждения оплата будет переведена.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDone}
                className="flex-1 py-2.5 bg-[#14A800] text-white rounded-xl text-sm font-semibold hover:bg-[#0d8c00]"
              >
                Да, выполнено
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-100 rounded-xl p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">Заказчик: {task.creator.name}</p>
            {task.deadline && (
              <p className="text-xs text-gray-400">
                Срок: {new Date(task.deadline).toLocaleDateString("ru-RU")}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-[#14A800] text-sm">{task.budget} сом</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">В работе</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1 border-t border-gray-50">
          {task.chat?.id && (
            <Link
              href={`/chat/${task.chat.id}`}
              className="flex-1 text-center text-xs font-semibold py-2 border border-[#14A800] text-[#14A800] rounded-xl hover:bg-green-50 transition-colors"
            >
              💬 Открыть чат
            </Link>
          )}
          <button
            onClick={() => setShowModal(true)}
            disabled={marking}
            className="flex-1 text-center text-xs font-semibold py-2 bg-[#14A800] text-white rounded-xl hover:bg-[#0d8c00] transition-colors disabled:opacity-60"
          >
            {marking ? "..." : "✅ Выполнено"}
          </button>
        </div>
      </div>
    </>
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
  const [taskTab, setTaskTab] = useState<"active" | "done" | "offers">("active");
  const [toggling, setToggling] = useState(false);

  // Resume editing
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headlineDraft, setHeadlineDraft] = useState("");
  const [savingHeadline, setSavingHeadline] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);
  const headlineInputRef = useRef<HTMLInputElement>(null);

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

  async function markTaskDone(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "PATCH" });
    if (res.ok) {
      // Optimistically remove from active, refresh
      setData((d) => d ? {
        ...d,
        activeTasks: d.activeTasks.filter((t) => t.id !== taskId),
      } : d);
      setToast(true);
    } else {
      const err = await res.json();
      alert(err.error ?? "Ошибка");
    }
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

  const { user, activeTasks, completedTasks, earned, myOffers } = data;
  const isApproved = user.passportStatus === "APPROVED";

  const badges = [
    ...(isApproved ? [{ icon: "✅", label: "Паспорт проверен" }] : []),
    ...(user.rating >= 4.5 && user.reviewCount >= 10 ? [{ icon: "⭐", label: "Топ исполнитель" }] : []),
    ...(completedTasks.length >= 20 ? [{ icon: "🚀", label: "Быстрый отклик" }] : []),
    ...(completedTasks.length < 3 ? [{ icon: "🆕", label: "Новичок" }] : []),
  ];

  const progressSteps = [
    { done: Boolean(user.lastName),      label: "Фамилия" },
    { done: Boolean(user.gender),        label: "Пол" },
    { done: Boolean(user.birthDate),     label: "Дата рождения" },
    { done: Boolean(user.education),     label: "Образование" },
    { done: Boolean(user.profession),    label: "Профессия" },
    { done: Boolean(user.avatar),        label: "Фото профиля" },
    { done: Boolean(user.headline),      label: "Заголовок" },
    { done: Boolean(user.about),         label: "О себе" },
    { done: user.skills.length > 0,      label: "Навыки" },
    { done: Boolean(user.workArea),      label: "Район работы" },
  ];
  const resumePct = progressSteps.filter((s) => s.done).length * 10;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Toast */}
      {toast && (
        <Toast
          message="Задача отправлена на проверку заказчику!"
          onClose={() => setToast(false)}
        />
      )}

      {/* ── Animated gradient hero header ── */}
      <div
        className="relative overflow-hidden px-4 pt-8 pb-6"
        style={{
          background: "linear-gradient(135deg, #0d1f0d 0%, #0a2a1a 50%, #061a0a 100%)",
        }}
      >
        {/* Glow blobs */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(20,168,0,.35) 0%, transparent 65%)", filter: "blur(30px)" }} />
        <div className="absolute -bottom-6 left-1/4 w-40 h-40 rounded-full pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(0,212,170,.25) 0%, transparent 65%)", filter: "blur(30px)" }} />

        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)", boxShadow: "0 4px 20px rgba(20,168,0,.4)" }}
            >
              {user.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,.5)" }}>
                Панель исполнителя
              </p>
              <h1 className="text-xl font-extrabold text-white truncate">{user.name}</h1>
              {user.headline && (
                <p className="text-sm mt-0.5 truncate" style={{ color: "rgba(255,255,255,.6)" }}>{user.headline}</p>
              )}
            </div>
            {/* Availability toggle — compact */}
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              style={{
                background: data.user.isAvailable ? "rgba(20,168,0,.25)" : "rgba(255,255,255,.10)",
                color: data.user.isAvailable ? "#14A800" : "rgba(255,255,255,.6)",
                border: data.user.isAvailable ? "1px solid rgba(20,168,0,.4)" : "1px solid rgba(255,255,255,.15)",
              }}
            >
              {data.user.isAvailable ? "● Доступен" : "○ Занят"}
            </button>
          </div>

          {/* Quick stats strip */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Выполнено",  value: completedTasks.length },
              { label: "Заработано", value: `${earned.toLocaleString()} сом` },
              { label: "Рейтинг",    value: `⭐ ${user.rating.toFixed(1)}` },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-xl px-3 py-2 text-center animate-scale-in"
                style={{
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.10)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <p className="text-base font-extrabold text-white leading-tight">{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,.50)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
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
          <StatCard label="Отзывы"       value={user.reviewCount}         delay={0}   />
          <StatCard label="Задачи в работе" value={activeTasks.length}    delay={80}  />
          <StatCard label="Доступен сейчас" value={user.isAvailable ? "✅ Да" : "❌ Нет"} delay={160} />
          <StatCard label="Готовность резюме" value={`${resumePct}%`}     delay={240} />
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
                    +10% {s.label}
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

        {/* D) My tasks + My offers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          {/* ── Tab bar ── */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {/* Active */}
            <button
              onClick={() => setTaskTab("active")}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                taskTab === "active" ? "bg-[#14A800] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Активные ({activeTasks.length})
            </button>

            {/* My offers */}
            <button
              onClick={() => setTaskTab("offers")}
              className={`relative px-3 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                taskTab === "offers" ? "bg-[#14A800] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Мои отклики ({myOffers.length})
              {/* pending badge */}
              {myOffers.filter((o) => o.status === "PENDING").length > 0 && taskTab !== "offers" && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {myOffers.filter((o) => o.status === "PENDING").length}
                </span>
              )}
            </button>

            {/* Done */}
            <button
              onClick={() => setTaskTab("done")}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                taskTab === "done" ? "bg-[#14A800] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Завершённые ({completedTasks.length})
            </button>
          </div>

          {/* ── Offer stats strip (only on offers tab) ── */}
          {taskTab === "offers" && myOffers.length > 0 && (() => {
            const pending  = myOffers.filter((o) => o.status === "PENDING").length;
            const accepted = myOffers.filter((o) => o.status === "ACCEPTED").length;
            return (
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
                  ⏳ Ожидают: {pending}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-700 rounded-full">
                  ✅ Приняты: {accepted}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">
                  Всего: {myOffers.length}
                </span>
              </div>
            );
          })()}

          {/* ── Content ── */}
          <div className="space-y-3">

            {/* ACTIVE tab */}
            {taskTab === "active" && (
              activeTasks.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Нет активных задач</p>
              ) : (
                activeTasks.map((task) => (
                  <ActiveTaskCard key={task.id} task={task} onMarkDone={markTaskDone} />
                ))
              )
            )}

            {/* OFFERS tab */}
            {taskTab === "offers" && (
              myOffers.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500 text-sm font-medium mb-1">
                    Вы ещё не откликались на задачи
                  </p>
                  <p className="text-gray-400 text-xs mb-4">
                    Найдите подходящую задачу и откликнитесь!
                  </p>
                  <Link
                    href="/tasks"
                    className="inline-block text-sm font-semibold px-5 py-2.5 bg-[#14A800] text-white rounded-xl hover:bg-[#0d8c00] transition-colors"
                  >
                    Смотреть задачи
                  </Link>
                </div>
              ) : (
                myOffers.map((offer) => {
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    PENDING:   { label: "⏳ Ожидает ответа",      cls: "bg-amber-100 text-amber-700" },
                    ACCEPTED:  { label: "✅ Принят!",              cls: "bg-green-100 text-green-700" },
                    REJECTED:  { label: "❌ Не выбран",            cls: "bg-red-100 text-red-600" },
                    WITHDRAWN: { label: "Отозван",                 cls: "bg-gray-100 text-gray-500" },
                  };
                  const taskStatusMap: Record<string, { label: string; cls: string }> = {
                    OPEN:        { label: "Открыта",     cls: "bg-blue-100 text-blue-700" },
                    IN_PROGRESS: { label: "В работе",    cls: "bg-blue-100 text-blue-700" },
                    REVIEW:      { label: "На проверке", cls: "bg-yellow-100 text-yellow-700" },
                    DONE:        { label: "Завершена",   cls: "bg-green-100 text-green-700" },
                    CANCELLED:   { label: "Отменена",    cls: "bg-gray-100 text-gray-500" },
                  };
                  const offerSt  = statusMap[offer.status]          ?? { label: offer.status,      cls: "bg-gray-100 text-gray-500" };
                  const taskSt   = taskStatusMap[offer.task.status]  ?? { label: offer.task.status, cls: "bg-gray-100 text-gray-500" };

                  return (
                    <div
                      key={offer.id}
                      className={`border rounded-xl p-3 space-y-2.5 ${
                        offer.status === "ACCEPTED"
                          ? "border-green-200 bg-green-50"
                          : offer.status === "REJECTED"
                          ? "border-red-100 bg-red-50/40"
                          : "border-gray-100"
                      }`}
                    >
                      {/* Row 1: category + title + budget */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base shrink-0">{categoryIcon(offer.task.category)}</span>
                          <p className="font-semibold text-gray-900 text-sm truncate">{offer.task.title}</p>
                        </div>
                        <p className="font-bold text-[#14A800] text-sm shrink-0">{offer.task.budget} сом</p>
                      </div>

                      {/* Row 2: customer + task status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">
                          👤 {offer.task.creator.name}
                          {offer.task.creator.rating > 0 && (
                            <> · ⭐ {offer.task.creator.rating.toFixed(1)}</>
                          )}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${taskSt.cls}`}>
                          {taskSt.label}
                        </span>
                      </div>

                      {/* Row 3: offer details */}
                      <div className="bg-white/80 rounded-lg px-3 py-2 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">Ваш отклик</span>
                          <span className="text-xs font-bold text-[#14A800]">{offer.price} сом</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{offer.message}</p>
                      </div>

                      {/* Row 4: offer status + date */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${offerSt.cls}`}>
                          {offerSt.label}
                          {offer.status === "ACCEPTED" && " Начинайте работу"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(offer.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>

                      {/* Row 5: actions */}
                      <div className="flex gap-2 pt-0.5">
                        <Link
                          href={`/tasks/${offer.task.id}`}
                          className="flex-1 text-center text-xs font-semibold py-1.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          Смотреть задачу
                        </Link>
                        {offer.status === "ACCEPTED" && (
                          <Link
                            href={offer.task.chat?.id ? `/chat/${offer.task.chat.id}` : `/tasks/${offer.task.id}`}
                            className="flex-1 text-center text-xs font-semibold py-1.5 bg-[#14A800] text-white rounded-xl hover:bg-[#0d8c00] transition-colors"
                          >
                            💬 Открыть чат
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}

            {/* DONE tab */}
            {taskTab === "done" && (
              completedTasks.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Нет завершённых задач</p>
              ) : (
                completedTasks.map((task) => (
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
                ))
              )
            )}

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
            {available.map((task, i) => (
              <div
                key={task.id}
                className="relative bg-white rounded-2xl border border-[#e8f5e8] p-4 overflow-hidden animate-fade-up"
                style={{
                  animationDelay: `${i * 60}ms`,
                  boxShadow: "0 2px 10px rgba(20,168,0,.06)",
                }}
              >
                {!isApproved && (
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="text-sm font-semibold text-gray-500">🔒 Верификация требуется</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{categoryIcon(task.category)}</span>
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
                        style={{ boxShadow: "0 2px 8px rgba(20,168,0,.25)" }}
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
