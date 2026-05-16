import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TaskCard } from "@/components/TaskCard";

export const dynamic = "force-dynamic";

/* ── DB queries ──────────────────────────────────────────────── */
async function getStats() {
  const [totalTasks, totalUsers, doneTasks] = await Promise.all([
    prisma.task.count(),
    prisma.user.count(),
    prisma.task.count({ where: { status: "DONE" } }),
  ]);
  return { totalTasks, totalUsers, doneTasks };
}

async function getRecentTasks() {
  return prisma.task.findMany({
    where: { status: "OPEN" },
    include: {
      creator: { select: { id: true, name: true, avatar: true, rating: true } },
      _count:  { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
}

async function getTopExecutors() {
  return prisma.user.findMany({
    orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
    where: { reviewCount: { gt: 0 } },
    select: { id: true, name: true, avatar: true, rating: true, reviewCount: true, city: true },
    take: 4,
  });
}

/* ── Static data ─────────────────────────────────────────────── */
const CATEGORIES = [
  { key: "CHILDREN", emoji: "🧒", label: "Дети",      desc: "Садик, школа, секции",     from: "from-pink-400",   to: "to-rose-500",   bg: "bg-pink-50   hover:bg-pink-100   border-pink-100"   },
  { key: "SHOPPING", emoji: "🛒", label: "Покупки",   desc: "Магазин, Корвон, рынок",   from: "from-blue-400",   to: "to-indigo-500", bg: "bg-blue-50   hover:bg-blue-100   border-blue-100"   },
  { key: "DELIVERY", emoji: "🚗", label: "Доставка",  desc: "Посылки, химчистка",       from: "from-amber-400",  to: "to-orange-500", bg: "bg-amber-50  hover:bg-amber-100  border-amber-100"  },
  { key: "QUEUE",    emoji: "⏰", label: "Очередь",   desc: "ОВИР, банк, поликлиника",  from: "from-purple-400", to: "to-violet-500", bg: "bg-purple-50 hover:bg-purple-100 border-purple-100" },
  { key: "HOUSEHOLD",emoji: "🏠", label: "Дом",       desc: "Ремонт, уборка, мебель",   from: "from-green-400",  to: "to-emerald-500",bg: "bg-green-50  hover:bg-green-100  border-green-100"  },
  { key: "ONLINE",   emoji: "💻", label: "IT задачи", desc: "Сайт, дизайн, программа",  from: "from-slate-500",  to: "to-indigo-600", bg: "bg-indigo-50 hover:bg-indigo-100 border-indigo-100" },
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
      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="bg-gradient-to-br from-green-50 via-emerald-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center min-h-[520px]">

            {/* ── Left: text + search ── */}
            <div className="max-w-xl">
              {/* Location badge */}
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-bold px-3.5 py-1.5 rounded-full mb-6 border border-green-200">
                <span className="w-2 h-2 rounded-full bg-[#14A800] animate-pulse" />
                🇹🇯 Душанбе и города Таджикистана
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-5">
                Любая задача —
                <br />
                <span className="text-gradient">за минуты</span>
              </h1>

              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Опишите что нужно сделать. AI найдёт лучшего исполнителя рядом. От похода в магазин до IT проекта.
              </p>

              {/* Search / create form */}
              <form action="/tasks/create" method="GET" className="mb-5">
                <div className="flex rounded-2xl overflow-hidden border-2 border-gray-200 bg-white focus-within:border-[#14A800] focus-within:ring-4 focus-within:ring-[#e6f9e6] transition-all duration-200"
                     style={{ boxShadow: "0 4px 20px rgba(0,0,0,.08)" }}>
                  <input
                    name="q"
                    type="text"
                    placeholder="Забрать ребёнка из садика №15 в 17:00..."
                    className="flex-1 px-5 py-4 text-gray-800 placeholder-gray-400 text-sm bg-transparent focus:outline-none"
                  />
                  <button type="submit"
                    className="btn-primary rounded-none rounded-r-xl px-6 py-4 text-sm shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Создать
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 ml-1">AI автоматически заполнит все детали</p>
              </form>

              {/* Example pills — kept orange per design */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Постоять в очереди в ОВИР",
                  "Сходить в Корвон за продуктами",
                  "Сделать сайт-визитку",
                  "Забрать посылку с почты",
                ].map((ex) => (
                  <a key={ex}
                    href={`/tasks/create?q=${encodeURIComponent(ex)}`}
                    className="text-xs bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-700 px-3 py-1.5 rounded-full transition-all duration-150 font-medium">
                    {ex}
                  </a>
                ))}
              </div>
            </div>

            {/* ── Right: floating illustration ── */}
            <div className="hidden md:flex items-center justify-center relative h-[480px]">
              {/* Decorative background blob */}
              <div className="absolute w-80 h-80 bg-green-100 rounded-full blur-3xl opacity-60" />

              {/* Card 1 — behind, offset */}
              <div className="absolute top-8 right-4 w-64 bg-white rounded-2xl border border-gray-100 p-4 animate-float-slow"
                   style={{ boxShadow: "0 8px 32px rgba(0,0,0,.10)", transform: "rotate(3deg)" }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">⏰</span>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">Очередь</span>
                  <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Открыта</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 leading-tight">Постоять в очереди в ОВИР</p>
                <p className="text-xs text-gray-400 mb-3">Нужен человек с 8 утра, документы у меня</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-[#14A800]">150 <span className="text-xs font-semibold text-gray-400">сом</span></span>
                  <span className="text-xs text-gray-400">3 отклика</span>
                </div>
              </div>

              {/* Card 2 — front, main */}
              <div className="relative z-10 w-72 bg-white rounded-2xl border border-gray-100 p-4 animate-float"
                   style={{ boxShadow: "0 16px 48px rgba(20,168,0,.18), 0 4px 16px rgba(0,0,0,.10)" }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-sm">🧒</span>
                  <span className="text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">Дети</span>
                  <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Открыта</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 leading-tight">Забрать ребёнка из садика №15 в 17:00</p>
                <p className="text-xs text-gray-400 mb-3">Садик в районе Сино, нужен надёжный человек</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-extrabold text-[#14A800]">200 <span className="text-xs font-semibold text-gray-400">сом</span></span>
                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">5 откликов</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#14A800] to-[#0d8c00] flex items-center justify-center text-white font-bold text-xs">З</div>
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
              <div className="absolute bottom-10 left-2 w-56 bg-white rounded-2xl border border-gray-100 p-3.5"
                   style={{ boxShadow: "0 8px 24px rgba(0,0,0,.09)", transform: "rotate(-2deg)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-sm">💻</span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">IT задача</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-2 leading-tight">Сделать сайт-визитку за 2 дня</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-[#14A800]">500 <span className="text-xs font-semibold text-gray-400">сом</span></span>
                  <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Готово ✓</span>
                </div>
              </div>

              {/* AI badge floating */}
              <div className="absolute top-4 left-8 bg-white border border-green-200 rounded-2xl px-3.5 py-2.5 flex items-center gap-2"
                   style={{ boxShadow: "0 4px 16px rgba(20,168,0,.20)" }}>
                <span className="text-base">🤖</span>
                <div>
                  <p className="text-xs font-extrabold text-gray-900 leading-none">AI подобрал</p>
                  <p className="text-[10px] text-[#14A800] font-semibold mt-0.5">3 исполнителя рядом</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════ STATS ════════════════════════════ */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: stats.totalTasks, label: "Поручений создано", emoji: "📋", color: "text-[#14A800]" },
              { n: stats.totalUsers, label: "Пользователей",     emoji: "👥", color: "text-blue-500"   },
              { n: stats.doneTasks,  label: "Успешно выполнено", emoji: "✅", color: "text-emerald-500" },
            ].map((s) => (
              <div key={s.label}
                   className="flex flex-col items-center gap-1 py-4 px-2 rounded-2xl bg-gray-50 border border-gray-100 text-center"
                   style={{ boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
                <span className={`text-3xl font-extrabold ${s.color}`}>
                  {s.n.toLocaleString("ru-RU")}
                </span>
                <span className="text-xs text-gray-500 font-medium">{s.emoji} {s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ CATEGORIES ═══════════════════════════ */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="section-title">Какая задача у вас?</h2>
            <p className="section-subtitle">Выберите категорию или опишите задачу своими словами</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <Link key={cat.key} href={`/tasks?category=${cat.key}`}
                className={`${cat.bg} border rounded-2xl p-4 text-center group transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-green-200`}>
                <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${cat.from} ${cat.to} flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-shadow`}>
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
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px border-t-2 border-dashed border-green-200" />

            {[
              {
                n: "01", emoji: "📝", title: "Опишите задачу",
                desc: "Напишите своими словами — как другу. AI сам заполнит категорию, бюджет и срок.",
                gradient: "from-[#14A800] to-[#0d8c00]",
              },
              {
                n: "02", emoji: "👤", title: "Выберите исполнителя",
                desc: "AI подберёт топ помощников рядом. Смотрите рейтинг, отзывы — выбирайте.",
                gradient: "from-blue-500 to-indigo-600",
              },
              {
                n: "03", emoji: "✅", title: "Получите результат",
                desc: "Деньги заморожены до выполнения. Исполнитель получает оплату только от вас.",
                gradient: "from-emerald-500 to-teal-600",
              },
            ].map((item) => (
              <div key={item.n} className="relative z-10 text-center flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
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
        <section className="py-16 px-4 bg-gray-50">
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
                <Link key={executor.id} href={`/profile/${executor.id}`} className="card-lift text-center group">
                  {i < 3 && (
                    <div className="flex justify-center mb-3">
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        i === 0 ? "bg-amber-100 text-amber-700" :
                        i === 1 ? "bg-gray-100 text-gray-600" :
                                  "bg-green-50 text-green-700"
                      }`}>
                        {i === 0 ? "🥇 #1" : i === 1 ? "🥈 #2" : "🥉 #3"}
                      </span>
                    </div>
                  )}

                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#14A800] to-[#0d8c00] flex items-center justify-center text-white text-2xl font-extrabold mb-3 shadow-md group-hover:shadow-lg transition-shadow">
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

                  <div className="mt-4 text-xs font-bold text-[#14A800] group-hover:text-[#0d8c00] transition-colors">
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
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="section-title">Почему нам доверяют</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST.map((t) => (
              <div key={t.label} className="card text-center group hover:-translate-y-1 transition-all duration-200">
                <div className="text-3xl mb-3">{t.icon}</div>
                <h3 className="font-extrabold text-gray-900 mb-1 text-sm">{t.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ CTA ══════════════════════════════ */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#14A800] to-[#0d8c00] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-xl mx-auto text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
            Попробуйте прямо сейчас
          </h2>
          <p className="text-green-100 mb-8 text-base leading-relaxed">
            Первое поручение за 30 секунд. Регистрация бесплатная.
            <br />Оплата только после выполнения.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#14A800] font-bold py-3.5 px-8 rounded-xl text-base transition-all duration-200 hover:bg-green-50 hover:-translate-y-px"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,.15)" }}>
              Создать аккаунт бесплатно
            </Link>
            <Link href="/tasks"
              className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3.5 px-8 rounded-xl text-base transition-all duration-200 backdrop-blur-sm">
              Смотреть задачи
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
