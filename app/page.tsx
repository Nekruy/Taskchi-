import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TaskCard } from "@/components/TaskCard";
import { StatsCounter } from "@/components/StatsCounter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ── DB queries ──────────────────────────────────────────────── */
async function getStats() {
  noStore();
  try {
    const [totalTasks, totalUsers, doneTasks] = await Promise.all([
      prisma.task.count(),
      prisma.user.count(),
      prisma.task.count({ where: { status: "DONE" } }),
    ]);
    return { totalTasks, totalUsers, doneTasks };
  } catch {
    return { totalTasks: 0, totalUsers: 0, doneTasks: 0 };
  }
}

async function getRecentTasks() {
  noStore();
  try {
    return await prisma.task.findMany({
      where: { status: "OPEN" },
      include: {
        creator: { select: { id: true, name: true, avatar: true, rating: true } },
        _count:  { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
  } catch { return []; }
}

async function getTopExecutors() {
  noStore();
  try {
    return await prisma.user.findMany({
      orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
      where:   { reviewCount: { gt: 0 } },
      select:  { id: true, name: true, avatar: true, rating: true, reviewCount: true, city: true },
      take: 4,
    });
  } catch { return []; }
}

/* ── Static data ─────────────────────────────────────────────── */
const CATEGORIES = [
  { key: "CHILDREN", emoji: "🧒", label: "Дети",      desc: "Садик, школа, секции",     gradient: "linear-gradient(135deg, #f472b6, #ec4899)" },
  { key: "SHOPPING", emoji: "🛒", label: "Покупки",   desc: "Магазин, Корвон, рынок",   gradient: "linear-gradient(135deg, #60a5fa, #6366f1)" },
  { key: "DELIVERY", emoji: "🚗", label: "Доставка",  desc: "Посылки, химчистка",       gradient: "linear-gradient(135deg, #fb923c, #f97316)" },
  { key: "QUEUE",    emoji: "⏰", label: "Очередь",   desc: "ОВИР, банк, поликлиника",  gradient: "linear-gradient(135deg, #a78bfa, #8b5cf6)" },
  { key: "HOUSEHOLD",emoji: "🏠", label: "Дом",       desc: "Ремонт, уборка, мебель",   gradient: "linear-gradient(135deg, #14A800, #00d4aa)" },
  { key: "ONLINE",   emoji: "💻", label: "IT задачи", desc: "Сайт, дизайн, программа",  gradient: "linear-gradient(135deg, #64748b, #6366f1)" },
];

const TRUST = [
  { icon: "🔒", label: "Эскроу-оплата",      desc: "Деньги переходят только после подтверждения" },
  { icon: "⭐", label: "Проверенные отзывы", desc: "Рейтинг формируется из реальных сделок"       },
  { icon: "🤖", label: "AI-подбор",          desc: "Умный алгоритм подбирает лучшего помощника"   },
  { icon: "🏙️", label: "Ваш район",          desc: "Исполнители рядом с вами в Душанбе"           },
];

/* ── Stars helper ────────────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < full ? "text-amber-400" : "text-gray-200"}`}
             fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-semibold text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default async function HomePage() {
  const [stats, recentTasks, topExecutors] = await Promise.all([
    getStats(), getRecentTasks(), getTopExecutors(),
  ]);

  return (
    <div>

      {/* ═══════════════════════════ HERO ══════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f0fff0 0%, #e0f8f0 50%, #f0fff8 100%)",
          borderBottom: "1px solid #e8f5e8",
        }}
      >
        {/* Dot pattern */}
        <div className="absolute inset-0 dot-pattern pointer-events-none" aria-hidden="true" />

        {/* Top-right glow orb */}
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,212,170,.18) 0%, transparent 65%)" }}
          aria-hidden="true"
        />
        {/* Bottom-left glow orb */}
        <div
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(20,168,0,.12) 0%, transparent 65%)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center min-h-[520px]">

            {/* ── Left: text + search ── */}
            <div className="max-w-xl">

              {/* Location pill */}
              <div
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-1.5 mb-6"
                style={{
                  background: "rgba(20,168,0,.10)",
                  color: "#14A800",
                  borderRadius: "20px",
                  border: "1px solid rgba(20,168,0,.20)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[#14A800] animate-pulse" />
                🇹🇯 Душанбе и города Таджикистана
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-5">
                Любая задача —
                <br />
                <span className="gradient-text">за минуты</span>
              </h1>

              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Опишите что нужно сделать. AI найдёт лучшего исполнителя рядом.
                От похода в магазин до IT проекта.
              </p>

              {/* Search / create form */}
              <form action="/tasks/create" method="GET" className="mb-5">
                <div
                  className="flex overflow-hidden bg-white transition-all duration-200 focus-within:shadow-lg"
                  style={{
                    borderRadius: "24px",
                    border: "2px solid #e8f5e8",
                    boxShadow: "0 4px 20px rgba(20,168,0,.10)",
                  }}
                  onFocusCapture={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#14A800";
                    (e.currentTarget as HTMLDivElement).style.boxShadow   = "0 4px 20px rgba(20,168,0,.20), 0 0 0 4px rgba(20,168,0,.08)";
                  }}
                  onBlurCapture={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    // only reset if no child is focused
                    setTimeout(() => {
                      if (!el.contains(document.activeElement)) {
                        el.style.borderColor = "#e8f5e8";
                        el.style.boxShadow   = "0 4px 20px rgba(20,168,0,.10)";
                      }
                    }, 0);
                  }}
                >
                  <input
                    name="q"
                    type="text"
                    placeholder="Забрать ребёнка из садика №15 в 17:00..."
                    className="flex-1 px-5 py-4 text-gray-800 placeholder-gray-400 text-sm bg-transparent focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 px-6 py-3 my-1.5 mr-1.5 font-bold text-sm text-white animate-btn-pulse"
                    style={{
                      background: "linear-gradient(135deg, #14A800, #00d4aa)",
                      borderRadius: "18px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Создать
                    </span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 ml-2">AI автоматически заполнит все детали</p>
              </form>

              {/* Example pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Постоять в очереди в ОВИР",
                  "Сходить в Корвон за продуктами",
                  "Сделать сайт-визитку",
                  "Забрать посылку с почты",
                ].map((ex) => (
                  <a
                    key={ex}
                    href={`/tasks/create?q=${encodeURIComponent(ex)}`}
                    className="text-xs font-medium text-gray-600 hover:text-[#14A800] px-3 py-1.5 transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,.80)",
                      border: "1px solid #e8f5e8",
                      borderRadius: "20px",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background    = "rgba(20,168,0,.08)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor   = "rgba(20,168,0,.30)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background    = "rgba(255,255,255,.80)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor   = "#e8f5e8";
                    }}
                  >
                    {ex}
                  </a>
                ))}
              </div>
            </div>

            {/* ── Right: floating illustration ── */}
            <div className="hidden md:flex items-center justify-center relative h-[480px]">
              {/* Glow blob */}
              <div
                className="absolute w-80 h-80 rounded-full blur-3xl opacity-50"
                style={{ background: "radial-gradient(circle, rgba(0,212,170,.30), rgba(20,168,0,.15))" }}
              />

              {/* Card 1 — behind, offset */}
              <div
                className="absolute top-8 right-4 w-64 bg-white p-4 animate-float-slow"
                style={{
                  borderRadius: "20px", border: "1px solid #e8f5e8",
                  boxShadow: "0 8px 32px rgba(20,168,0,.14), 0 2px 8px rgba(0,0,0,.06)",
                  transform: "rotate(3deg)",
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">⏰</span>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">Очередь</span>
                  <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Открыта</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 leading-tight">Постоять в очереди в ОВИР</p>
                <p className="text-xs text-gray-400 mb-3">Нужен человек с 8 утра, документы у меня</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold price-gradient">150 <span className="text-xs font-semibold text-gray-400" style={{ WebkitTextFillColor: "#9ca3af" }}>сом</span></span>
                  <span className="text-xs text-gray-400">3 отклика</span>
                </div>
              </div>

              {/* Card 2 — front, main */}
              <div
                className="relative z-10 w-72 bg-white p-4 animate-float"
                style={{
                  borderRadius: "20px",
                  border: "1px solid #e8f5e8",
                  boxShadow: "0 16px 48px rgba(20,168,0,.20), 0 4px 16px rgba(0,0,0,.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-sm">🧒</span>
                  <span className="text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">Дети</span>
                  <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Открыта</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 leading-tight">Забрать ребёнка из садика №15 в 17:00</p>
                <p className="text-xs text-gray-400 mb-3">Садик в районе Сино, нужен надёжный человек</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-extrabold price-gradient">200 <span className="text-xs font-semibold text-gray-400" style={{ WebkitTextFillColor: "#9ca3af" }}>сом</span></span>
                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">5 откликов</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                       style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)" }}>З</div>
                  <span className="text-xs font-semibold text-gray-600">Зарина М.</span>
                  <div className="flex items-center gap-0.5 ml-auto">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-0.5">5.0</span>
                  </div>
                </div>
              </div>

              {/* Card 3 — bottom left */}
              <div
                className="absolute bottom-10 left-2 w-56 bg-white p-3.5"
                style={{
                  borderRadius: "20px",
                  border: "1px solid #e8f5e8",
                  boxShadow: "0 8px 24px rgba(20,168,0,.12), 0 2px 8px rgba(0,0,0,.06)",
                  transform: "rotate(-2deg)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-sm">💻</span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">IT задача</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-2 leading-tight">Сделать сайт-визитку за 2 дня</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold price-gradient">500 <span className="text-xs font-semibold text-gray-400" style={{ WebkitTextFillColor: "#9ca3af" }}>сом</span></span>
                  <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Готово ✓</span>
                </div>
              </div>

              {/* AI badge */}
              <div
                className="absolute top-4 left-8 bg-white px-3.5 py-2.5 flex items-center gap-2"
                style={{
                  borderRadius: "20px",
                  border: "1px solid #e8f5e8",
                  boxShadow: "0 4px 16px rgba(20,168,0,.20)",
                }}
              >
                <span className="text-base">🤖</span>
                <div>
                  <p className="text-xs font-extrabold text-gray-900 leading-none">AI подобрал</p>
                  <p className="text-[10px] font-semibold mt-0.5 gradient-text">3 исполнителя рядом</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ STATS ══════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg, rgba(20,168,0,.04) 0%, rgba(0,212,170,.04) 100%)", borderBottom: "1px solid #e8f5e8" }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <StatsCounter stats={stats} />
        </div>
      </section>

      {/* ════════════════════════ CATEGORIES ═══════════════════════════ */}
      <section className="py-16 px-4" style={{ background: "#f8fff8" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="section-title">Какая задача у вас?</h2>
            <p className="section-subtitle">Выберите категорию или опишите задачу своими словами</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/tasks?category=${cat.key}`}
                className="group text-center transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8f5e8",
                  borderRadius: "20px",
                  padding: "16px 12px",
                  boxShadow: "0 2px 8px rgba(20,168,0,.06)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "#14A800";
                  el.style.boxShadow   = "0 8px 24px rgba(20,168,0,.16)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "#e8f5e8";
                  el.style.boxShadow   = "0 2px 8px rgba(20,168,0,.06)";
                }}
              >
                <div
                  className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-shadow"
                  style={{ background: cat.gradient }}
                >
                  {cat.emoji}
                </div>
                <p className="font-bold text-sm text-gray-800 mb-0.5">{cat.label}</p>
                <p className="text-xs text-gray-500 leading-tight">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ HOW IT WORKS ═════════════════════════ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-title">Как это работает</h2>
            <p className="section-subtitle">Три шага от мысли до результата</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Dashed connector */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px"
                 style={{ borderTop: "2px dashed #e8f5e8" }} />

            {[
              { n: "01", emoji: "📝", title: "Опишите задачу",
                desc: "Напишите своими словами — как другу. AI сам заполнит категорию, бюджет и срок.",
                gradient: "linear-gradient(135deg, #14A800, #00d4aa)" },
              { n: "02", emoji: "👤", title: "Выберите исполнителя",
                desc: "AI подберёт топ помощников рядом. Смотрите рейтинг, отзывы — выбирайте.",
                gradient: "linear-gradient(135deg, #60a5fa, #6366f1)" },
              { n: "03", emoji: "✅", title: "Получите результат",
                desc: "Деньги заморожены до выполнения. Исполнитель получает оплату только от вас.",
                gradient: "linear-gradient(135deg, #10b981, #00d4aa)" },
            ].map((item) => (
              <div key={item.n} className="relative z-10 text-center flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg"
                  style={{ background: item.gradient }}
                >
                  {item.emoji}
                </div>
                <span className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">Шаг {item.n}</span>
                <h3 className="font-extrabold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-[200px]">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/tasks/create" className="btn-primary py-3 px-8 text-base">
              Создать первое поручение →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════ TOP EXECUTORS ════════════════════════ */}
      {topExecutors.length > 0 && (
        <section className="py-16 px-4" style={{ background: "linear-gradient(135deg, #f0fff0 0%, #e8f8f0 100%)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="section-title">Топ исполнители</h2>
                <p className="section-subtitle">Проверенные помощники с лучшими отзывами</p>
              </div>
              <Link href="/tasks" className="text-[#14A800] hover:text-[#0d8c00] font-bold text-sm flex items-center gap-1">
                Все задачи →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {topExecutors.map((executor, i) => (
                <Link
                  key={executor.id}
                  href={`/profile/${executor.id}`}
                  className="group text-center transition-all duration-200"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e8f5e8",
                    borderRadius: "20px",
                    padding: "20px",
                    boxShadow: "0 2px 12px rgba(20,168,0,.08)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "#14A800";
                    el.style.boxShadow   = "0 8px 32px rgba(20,168,0,.18)";
                    el.style.transform   = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "#e8f5e8";
                    el.style.boxShadow   = "0 2px 12px rgba(20,168,0,.08)";
                    el.style.transform   = "";
                  }}
                >
                  {i < 3 && (
                    <div className="flex justify-center mb-3">
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        i === 0 ? "bg-amber-100 text-amber-700" :
                        i === 1 ? "bg-gray-100 text-gray-600"   :
                                  "bg-green-100 text-green-700"
                      }`}>
                        {i === 0 ? "🥇 #1" : i === 1 ? "🥈 #2" : "🥉 #3"}
                      </span>
                    </div>
                  )}

                  <div
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold mb-3 shadow-md group-hover:shadow-lg transition-shadow"
                    style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)" }}
                  >
                    {executor.name[0]?.toUpperCase()}
                  </div>

                  <h4 className="font-extrabold text-gray-900 mb-1">{executor.name}</h4>

                  <div className="flex justify-center mb-2">
                    <Stars rating={executor.rating} />
                  </div>

                  <p className="text-xs text-gray-400 mb-1">{executor.reviewCount} отзывов</p>
                  {executor.city && (
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {executor.city}
                    </p>
                  )}

                  <div className="mt-4 text-xs font-bold gradient-text group-hover:opacity-80 transition-opacity">
                    Посмотреть профиль →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════ RECENT TASKS ═════════════════════════ */}
      {recentTasks.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="section-title">Свежие поручения</h2>
                <p className="section-subtitle">Актуальные задачи — можно откликнуться прямо сейчас</p>
              </div>
              <Link href="/tasks" className="text-[#14A800] hover:text-[#0d8c00] font-bold text-sm flex items-center gap-1">
                Все поручения
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task as Parameters<typeof TaskCard>[0]["task"]} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════ TRUST BLOCK ══════════════════════════ */}
      <section className="py-16 px-4" style={{ background: "#f8fff8" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="section-title">Почему нам доверяют</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST.map((t) => (
              <div
                key={t.label}
                className="text-center transition-all duration-200 hover:-translate-y-1 group"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8f5e8",
                  borderRadius: "20px",
                  padding: "20px",
                  boxShadow: "0 2px 12px rgba(20,168,0,.06)",
                }}
              >
                <div
                  className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: "linear-gradient(135deg, rgba(20,168,0,.10), rgba(0,212,170,.10))" }}
                >
                  {t.icon}
                </div>
                <h3 className="font-extrabold text-gray-900 mb-1 text-sm">{t.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ CTA ══════════════════════════════ */}
      <section
        className="py-20 px-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #14A800 0%, #00d4aa 100%)" }}
      >
        {/* Orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 dot-pattern pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-xl mx-auto text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
            Попробуйте прямо сейчас
          </h2>
          <p className="text-white/80 mb-8 text-base leading-relaxed">
            Первое поручение за 30 секунд. Регистрация бесплатная.
            <br />Оплата только после выполнения.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#14A800] font-bold py-3.5 px-8 text-base transition-all duration-200 hover:bg-green-50 hover:-translate-y-px"
              style={{ borderRadius: "20px", boxShadow: "0 4px 16px rgba(0,0,0,.15)" }}
            >
              Создать аккаунт бесплатно
            </Link>
            <Link
              href="/tasks"
              className="inline-flex items-center justify-center gap-2 font-semibold py-3.5 px-8 text-base text-white transition-all duration-200 hover:-translate-y-px"
              style={{
                background: "rgba(255,255,255,.15)",
                border: "1px solid rgba(255,255,255,.30)",
                borderRadius: "20px",
                backdropFilter: "blur(8px)",
              }}
            >
              Смотреть задачи
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
