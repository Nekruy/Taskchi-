"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, string> = {
  CHILDREN: "🧒", SHOPPING: "🛒", DELIVERY: "🚗",
  QUEUE: "⏰", HOUSEHOLD: "🏠", ONLINE: "💻",
  CLEANING: "🧹", DRIVER: "🚘", MOVING: "📦",
  COOKING: "🍳", PHOTO: "📷",
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

// Dispute modal
function DisputeModal({
  taskId,
  onClose,
  onSubmit,
}: {
  taskId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!reason.trim()) { setError("Опишите причину спора"); return; }
    setLoading(true);
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, reason }),
    });
    setLoading(false);
    if (res.ok) {
      onSubmit();
    } else {
      const d = await res.json();
      setError(d.error ?? "Ошибка");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-bold text-gray-900 text-lg mb-2">⚠️ Открыть спор</h3>
        <p className="text-sm text-gray-500 mb-4">
          Опишите проблему. Администратор рассмотрит ваш спор и свяжется с вами.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Исполнитель не выполнил задачу / качество не соответствует..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none h-24 mb-3 focus:outline-none focus:border-red-400"
        />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "..." : "Открыть спор"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  tab,
  onApprove,
  onDispute,
}: {
  task: TaskRow;
  tab: Tab;
  onApprove?: (id: string) => Promise<void>;
  onDispute?: (id: string) => void;
}) {
  const [approving, setApproving] = useState(false);

  async function handleApprove() {
    if (!onApprove) return;
    setApproving(true);
    await onApprove(task.id);
    setApproving(false);
  }

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

      <div className="flex gap-2 pt-1 border-t border-gray-50 flex-wrap">
        {tab === "active" && (
          <Link href={`/tasks/${task.id}`}
            className="flex-1 text-center text-xs font-semibold py-2 bg-[#14A800] text-white rounded-xl hover:bg-[#0d8c00] transition-colors">
            Смотреть отклики ({task._count.offers})
          </Link>
        )}

        {tab === "review" && (
          <>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex-1 text-center text-xs font-semibold py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {approving ? "..." : "✅ Принять работу"}
            </button>
            <button
              onClick={() => onDispute?.(task.id)}
              className="flex-1 text-center text-xs font-semibold py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            >
              ⚠️ Открыть спор
            </button>
          </>
        )}

        {tab === "done" && (
          <div className="flex gap-2 w-full">
            {!task.hasReview && task.executor && (
              <Link href={`/tasks/${task.id}?review=executor`}
                className="flex-1 text-center text-xs font-semibold py-2 border border-[#14A800] text-[#14A800] rounded-xl hover:bg-green-50 transition-colors">
                ⭐ Оставить отзыв
              </Link>
            )}
            <Link
              href={`/tasks/create?repeat=${task.id}`}
              className="flex-1 text-center text-xs font-semibold py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              🔄 Заказать снова
            </Link>
          </div>
        )}

        {(tab === "cancelled" || (tab !== "active" && tab !== "review" && tab !== "done")) && (
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
  const [disputeTaskId, setDisputeTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/customer/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [status]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function approveTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/approve`, { method: "PATCH" });
    if (res.ok) {
      setData((d) => {
        if (!d) return d;
        const task = d.reviewTasks.find((t) => t.id === taskId);
        if (!task) return d;
        return {
          ...d,
          reviewTasks: d.reviewTasks.filter((t) => t.id !== taskId),
          completedTasks: [{ ...task, status: "DONE", hasReview: false }, ...d.completedTasks],
        };
      });
      setToast("✅ Работа принята! Оплата переведена исполнителю.");
    } else {
      const err = await res.json();
      alert(err.error ?? "Ошибка");
    }
  }

  function handleDisputeSubmit() {
    setDisputeTaskId(null);
    setToast("⚠️ Спор открыт. Администратор свяжется с вами.");
  }

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
      {/* Dispute modal */}
      {disputeTaskId && (
        <DisputeModal
          taskId={disputeTaskId}
          onClose={() => setDisputeTaskId(null)}
          onSubmit={handleDisputeSubmit}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold max-w-xs text-center">
            {toast}
          </div>
        </div>
      )}

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
                {t.key === "review" && reviewTasks.length > 0 && (
                  <span className="ml-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full inline-flex items-center justify-center">
                    {reviewTasks.length}
                  </span>
                )}
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
              shownTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  tab={tab}
                  onApprove={tab === "review" ? approveTask : undefined}
                  onDispute={tab === "review" ? setDisputeTaskId : undefined}
                />
              ))
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
