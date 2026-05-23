"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, string> = {
  CHILDREN: "🧒", SHOPPING: "🛒", DELIVERY: "🚗",
  QUEUE: "⏰", HOUSEHOLD: "🏠", ONLINE: "💻",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Открыта", IN_PROGRESS: "В работе", REVIEW: "На проверке",
  DONE: "Выполнено", CANCELLED: "Отменена",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  REVIEW: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};
const NAV = [
  { href: "/customer",    icon: "📋", label: "Мои задачи" },
  { href: "/tasks/create",icon: "➕", label: "Создать" },
  { href: "/chat",        icon: "💬", label: "Чаты" },
  { href: "/profile",     icon: "👤", label: "Профиль" },
];

type Executor = { id: string; name: string; rating: number; avatar: string | null };
type TaskRow = {
  id: string; title: string; category: string; budget: number;
  status: string; createdAt: string; updatedAt: string;
  executor: Executor | null;
  _count: { offers: number };
  hasReview?: boolean;
};
type DashData = {
  activeTasks: TaskRow[];
  reviewTasks: TaskRow[];
  completedTasks: (TaskRow & { hasReview: boolean })[];
  cancelledTasks: TaskRow[];
  totalSpent: number;
  recentExecutors: Executor[];
};

type Tab = "active" | "review" | "done" | "cancelled";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function TaskCard({ task, tab }: { task: TaskRow; tab: Tab }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span>{CATEGORY_ICONS[task.category] ?? "📋"}</span>
            <span className="font-semibold text-gray-900 text-sm truncate">{task.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABELS[task.status] ?? task.status}
            </span>
            {task.executor && (
              <span className="text-xs text-gray-500">👤 {task.executor.name}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-[#14A800]">{task.budget.toLocaleString()} сом</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(task.createdAt).toLocaleDateString("ru-RU")}
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-gray-50">
        {tab === "active" && (
          <Link href={`/tasks/${task.id}`}
            className="flex-1 text-center text-xs font-semibold py-2 bg-[#14A800] text-white rounded-xl hover:bg-[#0d8c00] transition-colors">
            Смотреть отклики ({task._count.offers})
          </Link>
        )}
        {tab === "review" && (
          <>
            <Link href={`/tasks/${task.id}`}
              className="flex-1 text-center text-xs font-semibold py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
              Подтвердить выполнение
            </Link>
            <Link href={`/tasks/${task.id}`}
              className="flex-1 text-center text-xs font-semibold py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors">
              Открыть спор
            </Link>
          </>
        )}
        {tab === "done" && !task.hasReview && task.executor && (
          <Link href={`/tasks/${task.id}`}
            className="flex-1 text-center text-xs font-semibold py-2 border border-[#14A800] text-[#14A800] rounded-xl hover:bg-green-50 transition-colors">
            ⭐ Оставить отзыв
          </Link>
        )}
        {tab !== "active" && tab !== "review" && (
          <Link href={`/tasks/${task.id}`}
            className="text-xs text-gray-500 hover:text-gray-700 py-1">
            Открыть →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/customer/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;
  const { activeTasks, reviewTasks, completedTasks, cancelledTasks, totalSpent, recentExecutors } = data;

  const tabConfig: { key: Tab; label: string; tasks: TaskRow[] }[] = [
    { key: "active",    label: `Активные (${activeTasks.length})`,     tasks: activeTasks },
    { key: "review",    label: `На проверке (${reviewTasks.length})`,  tasks: reviewTasks },
    { key: "done",      label: `Завершённые (${completedTasks.length})`,tasks: completedTasks },
    { key: "cancelled", label: `Отменённые (${cancelledTasks.length})`, tasks: cancelledTasks },
  ];

  const shownTasks = tabConfig.find((t) => t.key === tab)?.tasks ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Панель заказчика</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* A) Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Активных задач"    value={activeTasks.length + reviewTasks.length} />
          <StatCard label="Завершённых задач"  value={completedTasks.length} />
          <StatCard label="Потрачено"          value={`${totalSpent.toLocaleString()} сом`} />
          <StatCard label="Исполнителей"       value={recentExecutors.length > 0
            ? `${(recentExecutors.reduce((s, e) => s + e.rating, 0) / recentExecutors.length).toFixed(1)} ⭐`
            : "—"} />
        </div>

        {/* B) Create button */}
        <Link
          href="/tasks/create"
          className="flex items-center justify-center gap-2 w-full py-4 bg-[#14A800] hover:bg-[#0d8c00] text-white font-bold rounded-2xl text-base transition-colors shadow-sm shadow-green-200"
        >
          + Создать задачу
        </Link>

        {/* C) Task tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
            {tabConfig.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? "text-[#14A800] border-b-2 border-[#14A800]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-3">
            {shownTasks.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-gray-400 text-sm">Нет задач в этой категории</p>
              </div>
            ) : (
              shownTasks.map((task) => <TaskCard key={task.id} task={task} tab={tab} />)
            )}
          </div>
        </div>

        {/* D) Recent executors */}
        {recentExecutors.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-base font-bold text-gray-900 mb-3">Недавние исполнители</h2>
            <div className="space-y-3">
              {recentExecutors.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14A800] to-[#0d8c00] flex items-center justify-center text-white font-bold shrink-0">
                      {ex.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{ex.name}</p>
                      <p className="text-xs text-gray-500">⭐ {ex.rating.toFixed(1)}</p>
                    </div>
                  </div>
                  <Link
                    href="/tasks/create"
                    className="text-xs border border-[#14A800] text-[#14A800] px-3 py-1.5 rounded-xl font-semibold hover:bg-green-50 transition-colors shrink-0"
                  >
                    Написать снова
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* E) Bottom navigation */}
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
