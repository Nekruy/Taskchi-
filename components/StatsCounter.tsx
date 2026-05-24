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
          const eased    = 1 - Math.pow(1 - progress, 3);
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

const ITEMS = [
  { key: "totalTasks", label: "Поручений создано", emoji: "📋" },
  { key: "totalUsers", label: "Пользователей",     emoji: "👥" },
  { key: "doneTasks",  label: "Успешно выполнено", emoji: "✅" },
] as const;

export function StatsCounter({
  stats,
}: {
  stats: { totalTasks: number; totalUsers: number; doneTasks: number };
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {ITEMS.map((s) => (
        <StatItem key={s.key} n={stats[s.key]} label={s.label} emoji={s.emoji} />
      ))}
    </div>
  );
}

function StatItem({ n, label, emoji }: { n: number; label: string; emoji: string }) {
  const { count, wrapRef } = useCountUp(n);
  return (
    <div
      ref={wrapRef}
      className="flex flex-col items-center gap-1.5 py-5 px-3 rounded-2xl text-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(20,168,0,.06) 0%, rgba(0,212,170,.06) 100%)",
        border:     "1px solid #e8f5e8",
        boxShadow:  "0 2px 12px rgba(20,168,0,.06)",
      }}
    >
      {/* Subtle gradient shine top-right */}
      <div
        className="absolute -top-4 -right-4 w-12 h-12 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #14A800, transparent)" }}
      />

      <span className="text-2xl mb-0.5">{emoji}</span>
      <span
        className="text-3xl font-extrabold tabular-nums price-gradient"
      >
        {count.toLocaleString("ru-RU")}
      </span>
      <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
    </div>
  );
}
