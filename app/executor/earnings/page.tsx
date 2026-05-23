"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/executor",               icon: "📋", label: "Задачи" },
  { href: "/executor/earnings",      icon: "💰", label: "Заработок" },
  { href: "/executor/notifications", icon: "🔔", label: "Уведомления" },
  { href: "/profile",                icon: "👤", label: "Профиль" },
];

type TaskRow = { id: string; title: string; budget: number; updatedAt: string };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function weekEarnings(tasks: TaskRow[], weeksAgo: number): number {
  const now = startOfDay(new Date());
  const from = new Date(now); from.setDate(from.getDate() - (weeksAgo + 1) * 7);
  const to   = new Date(now); to.setDate(to.getDate()   - weeksAgo * 7);
  return tasks
    .filter((t) => { const d = new Date(t.updatedAt); return d >= from && d < to; })
    .reduce((s, t) => s + t.budget, 0);
}

export default function EarningsPage() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/executor/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.completedTasks ?? []);
        setLoading(false);
      });
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
      </div>
    );
  }

  const now = new Date();
  const startWeek  = startOfDay(new Date(now)); startWeek.setDate(startWeek.getDate() - 7);
  const startMonth = startOfDay(new Date(now)); startMonth.setDate(startMonth.getDate() - 30);

  const thisWeek  = tasks.filter((t) => new Date(t.updatedAt) >= startWeek).reduce((s, t) => s + t.budget, 0);
  const thisMonth = tasks.filter((t) => new Date(t.updatedAt) >= startMonth).reduce((s, t) => s + t.budget, 0);
  const allTime   = tasks.reduce((s, t) => s + t.budget, 0);

  const weeks = [3, 2, 1, 0].map((w) => ({
    label: w === 0 ? "Эта нед." : w === 1 ? "Прош. нед." : `${w + 1} нед. назад`,
    value: weekEarnings(tasks, w),
  }));
  const maxWeek = Math.max(...weeks.map((w) => w.value), 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Заработок</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "За неделю",  value: thisWeek },
            { label: "За месяц",   value: thisMonth },
            { label: "За всё время", value: allTime },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-400">сом</p>
            </div>
          ))}
        </div>

        {/* Bar chart — last 4 weeks */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">Динамика по неделям</h2>
          <div className="flex items-end gap-3 h-32">
            {weeks.map((w) => (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-700">
                  {w.value > 0 ? w.value.toLocaleString() : ""}
                </span>
                <div className="w-full flex items-end" style={{ height: "80px" }}>
                  <div
                    className="w-full bg-[#14A800] rounded-t-lg transition-all"
                    style={{ height: `${Math.round((w.value / maxWeek) * 80)}px`, minHeight: w.value > 0 ? "4px" : "0" }}
                  />
                </div>
                <span className="text-xs text-gray-400 text-center leading-tight">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Выполненные задачи</h2>
          {tasks.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">Нет выполненных задач</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:opacity-80 transition-opacity"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(task.updatedAt).toLocaleDateString("ru-RU", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="font-bold text-[#14A800] shrink-0 ml-4">
                    +{task.budget.toLocaleString()} сом
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
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
