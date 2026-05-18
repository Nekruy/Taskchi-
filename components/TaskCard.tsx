import Link from "next/link";

/* ── Category config ─────────────────────────────────────────── */
const CAT: Record<string, { label: string; emoji: string; pill: string; icon: string }> = {
  CHILDREN: { label: "Дети",      emoji: "🧒", pill: "bg-pink-50 text-pink-700 border-pink-200",    icon: "bg-pink-100"   },
  SHOPPING: { label: "Покупки",   emoji: "🛒", pill: "bg-blue-50 text-blue-700 border-blue-200",    icon: "bg-blue-100"   },
  DELIVERY: { label: "Доставка",  emoji: "🚗", pill: "bg-amber-50 text-amber-700 border-amber-200", icon: "bg-amber-100"  },
  QUEUE:    { label: "Очередь",   emoji: "⏰", pill: "bg-purple-50 text-purple-700 border-purple-200", icon: "bg-purple-100" },
  HOUSEHOLD:{ label: "Дом",       emoji: "🏠", pill: "bg-green-50 text-green-700 border-green-200", icon: "bg-green-100"  },
  ONLINE:   { label: "IT задача", emoji: "💻", pill: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "bg-indigo-100" },
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
  const cat    = CAT[task.category]    ?? { label: task.category, emoji: "📋", pill: "bg-gray-100 text-gray-600 border-gray-200", icon: "bg-gray-100" };
  const status = STATUS[task.status]  ?? { label: task.status, cls: "badge" };
  const offerCount = task._count.offers;
  const offerLabel = offerCount === 0 ? "Нет откликов"
    : `${offerCount} ${offerCount === 1 ? "отклик" : offerCount < 5 ? "отклика" : "откликов"}`;

  return (
    <Link href={`/tasks/${task.id}`} className="block card-lift group animate-slide-up">

      {/* ── Top row: category + status ── */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cat.pill}`}>
          <span className={`w-5 h-5 ${cat.icon} rounded-full flex items-center justify-center text-sm`}>
            {cat.emoji}
          </span>
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

      {/* ── Budget row ── */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <span className="text-2xl font-extrabold" style={{ color: "var(--clr-money)" }}>
            {task.budget.toLocaleString("ru-RU")}
          </span>
          <span className="text-sm font-semibold text-gray-400 ml-1">сом</span>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full font-medium">
          {offerLabel}
        </span>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-gray-50 mb-4" />

      {/* ── Creator row ── */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#14A800] to-[#0d8c00] flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-sm">
          {task.creator.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-gray-700 truncate">{task.creator.name}</p>
            {task.creator.isVerified && (
              <span title="Верифицирован" className="text-[#14A800] text-xs shrink-0">✓</span>
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

      {/* ── "Откликнуться" button ── */}
      <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all duration-200 ${
        task.status === "OPEN"
          ? "bg-gradient-to-r from-[#14A800] to-[#0d8c00] text-white group-hover:from-[#0d8c00] group-hover:to-[#0a7000] shadow-sm group-hover:shadow-md"
          : "bg-gray-100 text-gray-500"
      }`}>
        {task.status === "OPEN" ? "Откликнуться →" : "Подробнее →"}
      </div>
    </Link>
  );
}
