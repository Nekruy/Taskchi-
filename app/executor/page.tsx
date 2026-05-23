"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, string> = {
  CHILDREN: "🧒", SHOPPING: "🛒", DELIVERY: "🚗",
  QUEUE: "⏰", HOUSEHOLD: "🏠", ONLINE: "💻",
};

const NAV = [
  { href: "/executor",              icon: "📋", label: "Задачи" },
  { href: "/executor/earnings",     icon: "💰", label: "Заработок" },
  { href: "/executor/notifications",icon: "🔔", label: "Уведомления" },
  { href: "/profile",               icon: "👤", label: "Профиль" },
];

type UserInfo = {
  id: string; name: string;
  passportStatus: string; passportNote: string | null;
  rating: number; reviewCount: number;
  workArea: string | null; city: string;
  isAvailable: boolean; skills: string[];
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function ExecutorDashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<DashData | null>(null);
  const [available, setAvailable] = useState<AvailableTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskTab, setTaskTab] = useState<"active" | "done">("active");
  const [toggling, setToggling] = useState(false);

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
    });
  }, [status]);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
