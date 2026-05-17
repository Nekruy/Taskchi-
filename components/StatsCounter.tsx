"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (target === 0) return;
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, wrapRef };
}

export function StatsCounter({
  stats,
}: {
  stats: { totalTasks: number; totalUsers: number; doneTasks: number };
}) {
  const items = [
    { n: stats.totalTasks, label: "Поручений создано", emoji: "📋", color: "text-[#14A800]" },
    { n: stats.totalUsers, label: "Пользователей",     emoji: "👥", color: "text-blue-500"   },
    { n: stats.doneTasks,  label: "Успешно выполнено", emoji: "✅", color: "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((s) => (
        <StatItem key={s.label} {...s} />
      ))}
    </div>
  );
}

function StatItem({ n, label, emoji, color }: { n: number; label: string; emoji: string; color: string }) {
  const { count, wrapRef } = useCountUp(n);
  return (
    <div
      ref={wrapRef}
      className="flex flex-col items-center gap-1 py-4 px-2 rounded-2xl bg-gray-50 border border-gray-100 text-center"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}
    >
      <span className={`text-3xl font-extrabold tabular-nums ${color}`}>
        {count.toLocaleString("ru-RU")}
      </span>
      <span className="text-xs text-gray-500 font-medium">{emoji} {label}</span>
    </div>
  );
}
