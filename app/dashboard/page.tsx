import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TaskCard } from "@/components/TaskCard";
import { RoleTabs } from "./RoleTabs";

export const metadata = { title: "Дашборд — Taskchi" };

interface PageProps {
  searchParams: { view?: string };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;
  const view = searchParams.view === "executor" ? "executor" : "customer";

  const [myTasks, myOffers, myChats, stats, user] = await Promise.all([
    prisma.task.findMany({
      where: { creatorId: userId },
      include: {
        creator: { select: { id: true, name: true, avatar: true, rating: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.offer.findMany({
      where: { executorId: userId },
      include: {
        task: {
          include: {
            creator: { select: { id: true, name: true, avatar: true, rating: true } },
            _count: { select: { offers: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.chat.findMany({
      where: { OR: [{ customerId: userId }, { executorId: userId }] },
      include: {
        task: { select: { title: true, status: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        customer: { select: { id: true, name: true } },
        executor: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.$transaction([
      prisma.task.count({ where: { creatorId: userId } }),
      prisma.task.count({ where: { executorId: userId, status: "DONE" } }),
      prisma.task.count({ where: { creatorId: userId, status: "OPEN" } }),
      prisma.offer.count({ where: { executorId: userId, status: "PENDING" } }),
    ]),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, rating: true, reviewCount: true, city: true },
    }),
  ]);

  const [totalCreated, doneExecuted, openTasks, pendingOffers] = stats;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#14A800] via-[#0d8c00] to-[#0a7000] rounded-2xl p-6 mb-6 text-white shadow-lg shadow-green-200/50">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Привет, {user?.name?.split(" ")[0]}! 👋
              </h1>
              <p className="text-green-100 text-sm">
                {user?.city && `📍 ${user.city} · `}
                {user?.rating && user.rating > 0
                  ? `★ ${user.rating.toFixed(1)} · ${user.reviewCount} отзывов`
                  : "Taskchi — ваш личный помощник"}
              </p>
            </div>
          </div>
          <Link
            href="/tasks/create"
            className="shrink-0 bg-white text-[#14A800] hover:bg-green-50 font-bold py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm"
          >
            + Создать поручение
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Моих поручений", value: totalCreated, bg: "bg-blue-50", text: "text-blue-600", icon: "📋" },
          { label: "Выполнено задач", value: doneExecuted, bg: "bg-emerald-50", text: "text-emerald-600", icon: "✅" },
          { label: "Открытых", value: openTasks, bg: "bg-[#e6f9e6]", text: "text-[#14A800]", icon: "🟢" },
          { label: "Ожид. откликов", value: pendingOffers, bg: "bg-amber-50", text: "text-amber-600", icon: "⏳" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-extrabold ${s.text}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role tabs */}
      <RoleTabs currentView={view} />

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Main content — switches by view */}
        <div className="lg:col-span-2 space-y-5">

          {view === "customer" ? (
            /* === ЗАКАЗЧИК VIEW === */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center p-5 pb-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">🛍️</span>
                  Мои поручения
                  {myTasks.length > 0 && (
                    <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {myTasks.length}
                    </span>
                  )}
                </h2>
                <Link href="/tasks" className="text-[#14A800] text-sm font-semibold hover:text-[#0d8c00] flex items-center gap-1">
                  Все задачи
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="p-5">
                {myTasks.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {myTasks.map((task) => (
                      <TaskCard key={task.id} task={task as Parameters<typeof TaskCard>[0]["task"]} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-gray-600 font-medium mb-1">Нет поручений</p>
                    <p className="text-gray-400 text-sm mb-4">Создайте первое — исполнители откликнутся сами</p>
                    <Link href="/tasks/create" className="btn-primary text-sm">
                      Создать поручение
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* === ИСПОЛНИТЕЛЬ VIEW === */
            <div className="space-y-4">
              {/* Available tasks */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center p-5 pb-4 border-b border-gray-50">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    Задачи рядом с вами
                  </h2>
                  <Link href="/tasks" className="text-[#14A800] text-sm font-semibold hover:text-[#0d8c00]">
                    Смотреть все →
                  </Link>
                </div>
                <div className="p-5">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-3xl">🗺️</div>
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">Задачи рядом с вами в {user?.city || "Душанбе"}</p>
                      <p className="text-sm text-gray-500">Откликайтесь на задачи и зарабатывайте</p>
                    </div>
                    <Link href={`/tasks?city=${encodeURIComponent(user?.city || "Душанбе")}`} className="btn-primary text-sm shrink-0">
                      Найти →
                    </Link>
                  </div>
                </div>
              </div>

              {/* My offers */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center p-5 pb-4 border-b border-gray-50">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">📨</span>
                    Мои отклики
                    {pendingOffers > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingOffers} ожидают
                      </span>
                    )}
                  </h2>
                </div>
                <div className="p-5">
                  {myOffers.length > 0 ? (
                    <div className="space-y-2">
                      {myOffers.map((offer) => (
                        <Link
                          key={offer.id}
                          href={`/tasks/${offer.task.id}`}
                          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-[#e6f9e6] rounded-xl transition-colors group border border-transparent hover:border-green-200"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm truncate group-hover:text-[#0d8c00]">
                              {offer.task.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <span className="font-bold text-green-600">{offer.price.toLocaleString("ru-RU")} сом</span>
                              <span>·</span>
                              <span>
                                {offer.status === "PENDING" ? "⏳ Ожидает ответа" :
                                 offer.status === "ACCEPTED" ? "✅ Принят" : "❌ Отклонён"}
                              </span>
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-[#14A800] shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-xl">
                      <div className="text-4xl mb-3">👋</div>
                      <p className="text-gray-600 font-medium mb-1">Вы ещё не откликались</p>
                      <p className="text-gray-400 text-sm mb-4">Найдите задачу и предложите свои услуги</p>
                      <Link href="/tasks" className="btn-primary text-sm">
                        Найти задачу
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Chats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5 pb-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="text-lg">💬</span>
                Чаты
              </h2>
            </div>
            <div className="p-4">
              {myChats.length > 0 ? (
                <div className="space-y-2">
                  {myChats.map((chat) => {
                    const partner = chat.customerId === userId ? chat.executor : chat.customer;
                    const lastMsg = chat.messages[0];
                    return (
                      <Link
                        key={chat.id}
                        href={`/chat/${chat.id}`}
                        className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors group border border-transparent hover:border-blue-200"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {partner.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-gray-800 truncate">{partner.name}</div>
                          <div className="text-xs text-gray-500 truncate">{chat.task.title}</div>
                          {lastMsg && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {lastMsg.sender.name}: {lastMsg.content}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">💬</div>
                  <p className="text-gray-400 text-sm">Нет активных чатов</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Быстрые действия
            </p>
            <div className="space-y-1">
              {[
                { href: "/tasks/create", icon: "➕", label: "Создать поручение", color: "hover:bg-[#e6f9e6] hover:text-[#0d8c00]" },
                { href: "/tasks", icon: "🔍", label: "Найти задачи", color: "hover:bg-blue-50 hover:text-blue-700" },
                { href: `/profile/${userId}`, icon: "👤", label: "Мой профиль", color: "hover:bg-purple-50 hover:text-purple-700" },
                { href: "/map", icon: "🗺️", label: "Карта задач", color: "hover:bg-green-50 hover:text-green-700" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors text-gray-700 ${action.color}`}
                >
                  <span className="text-base">{action.icon}</span>
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
