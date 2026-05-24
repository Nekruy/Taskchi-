"use client";

import Link from "next/link";

/* ── Category config ─────────────────────────────────────────── */
const CAT: Record<string, { label: string; emoji: string }> = {
  CHILDREN: { label: "Дети",      emoji: "🧒" },
  SHOPPING: { label: "Покупки",   emoji: "🛒" },
  DELIVERY: { label: "Доставка",  emoji: "🚗" },
  QUEUE:    { label: "Очередь",   emoji: "⏰" },
  HOUSEHOLD:{ label: "Дом",       emoji: "🏠" },
  ONLINE:   { label: "IT задача", emoji: "💻" },
};

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN:        { label: "Открыта",  cls: "badge-open"      },
  IN_PROGRESS: { label: "В работе", cls: "badge-progress"  },
  REVIEW:      { label: "Проверка", cls: "badge-review"    },
  DONE:        { label: "Готово",   cls: "badge-done"      },
  CANCELLED:   { label: "Отменена", cls: "badge-cancelled" },
};

/* ── Star rating ─────────────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < full ? "text-amber-400" : "text-gray-200"}`}
             fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {rating > 0 && <span className="text-[11px] font-semibold text-gray-500 ml-0.5">{rating.toFixed(1)}</span>}
    </span>
  );
}

/* ── Time ago ────────────────────────────────────────────────── */
function timeAgo(date: Date): string {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1)  return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} дн назад`;
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

/* ── Props ───────────────────────────────────────────────────── */
export interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    budget: number;
    city: string;
    deadline?: Date | null;
    createdAt?: Date;
    isGroupTask: boolean;
    executorsNeeded: number;
    creator: { id: string; name: string; avatar?: string | null; rating: number; isVerified?: boolean };
    _count: { offers: number };
  };
}

/* ── Component ───────────────────────────────────────────────── */
export function TaskCard({ task }: TaskCardProps) {
  const cat    = CAT[task.category]   ?? { label: task.category, emoji: "📋" };
  const status = STATUS[task.status]  ?? { label: task.status, cls: "badge" };
  const offerCount = task._count.offers;
  const offerLabel = offerCount === 0 ? "Нет откликов"
    : `${offerCount} ${offerCount === 1 ? "отклик" : offerCount < 5 ? "отклика" : "откликов"}`;
  const isOpen = task.status === "OPEN";

  return (
    /* task-card CSS class handles all hover via pure CSS — no event handlers needed */
    <Link href={`/tasks/${task.id}`} className="task-card group animate-slide-up">

      {/* ── Category badge + status ── */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)" }}
        >
          <span className="text-sm leading-none">{cat.emoji}</span>
          {cat.label}
        </span>

        <div className="flex items-center gap-1.5">
          {task.isGroupTask && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              👥 {task.executorsNeeded}
            </span>
          )}
          <span className={status.cls}>{status.label}</span>
        </div>
      </div>

      {/* ── Title ── */}
      <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-2 group-hover:text-[#14A800] transition-colors">
        {task.title}
      </h3>

      {/* ── Description ── */}
      <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4">
        {task.description}
      </p>

      {/* ── Budget ── */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <span className="text-2xl font-extrabold price-gradient">
            {task.budget.toLocaleString("ru-RU")}
          </span>
          <span className="text-sm font-semibold text-gray-400 ml-1">сом</span>
        </div>
        <span
          className="text-xs text-gray-500 px-2.5 py-1 font-medium"
          style={{ background: "rgba(20,168,0,.06)", border: "1px solid #e8f5e8", borderRadius: "20px" }}
        >
          {offerLabel}
        </span>
      </div>

      {/* ── Divider ── */}
      <div className="h-px mb-4" style={{ background: "#f0f9f0" }} />

      {/* ── Creator ── */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-sm"
          style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)" }}
        >
          {task.creator.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-gray-700 truncate">{task.creator.name}</p>
            {task.creator.isVerified && (
              <span title="Верифицирован" className="text-[#14A800] text-xs shrink-0 font-bold">✓</span>
            )}
          </div>
          {task.creator.rating > 0
            ? <Stars rating={task.creator.rating} />
            : <span className="text-xs text-gray-400">Новый</span>
          }
        </div>
        <div className="text-right text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {task.city}
          </div>
          {task.createdAt && <div className="mt-0.5">{timeAgo(task.createdAt)}</div>}
        </div>
      </div>

      {/* ── Action button ── */}
      <div
        className="w-full py-2.5 text-sm font-bold text-center"
        style={{
          background:   isOpen ? "linear-gradient(135deg, #14A800, #00d4aa)" : "#f5f5f5",
          color:        isOpen ? "#ffffff" : "#9ca3af",
          borderRadius: "14px",
          boxShadow:    isOpen ? "0 2px 8px rgba(20,168,0,.20)" : "none",
        }}
      >
        {isOpen ? "Откликнуться →" : "Подробнее →"}
      </div>
    </Link>
  );
}
