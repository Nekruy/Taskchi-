import { prisma } from "@/lib/prisma";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Аналитика" };

const categoryLabels: Record<string, string> = {
  CHILDREN: "👶 Дети",
  SHOPPING: "🛒 Покупки",
  DELIVERY: "🚚 Доставка",
  QUEUE: "⏳ Очередь",
  HOUSEHOLD: "🏠 Домашние дела",
  ONLINE: "💻 Онлайн",
};

export default async function AdminAnalyticsPage() {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const [
    totalUsers,
    newUsersWeek,
    newUsersMonth,
    totalTasks,
    openTasks,
    progressTasks,
    doneTasks,
    cancelledTasks,
    totalEscrows,
    heldEscrows,
    releasedEscrows,
    openDisputes,
    categoryGroups,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "OPEN" } }),
    prisma.task.count({ where: { status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.task.count({ where: { status: "CANCELLED" } }),
    prisma.escrow.aggregate({ _sum: { amount: true, commission: true }, _count: true }),
    prisma.escrow.aggregate({ where: { status: "HELD" }, _sum: { amount: true }, _count: true }),
    prisma.escrow.aggregate({ where: { status: "RELEASED" }, _sum: { amount: true, commission: true }, _count: true }),
    prisma.dispute.count({ where: { status: "OPEN" } }),
    prisma.task.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        createdAt: true,
        isVerified: true,
      },
    }),
  ]);

  const totalRevenue = releasedEscrows._sum.commission ?? 0;
  const maxCategory = categoryGroups[0]?._count.id ?? 1;

  const taskFunnel = [
    { label: "Открыты", count: openTasks, color: "bg-blue-500" },
    { label: "В работе", count: progressTasks, color: "bg-yellow-500" },
    { label: "Готово", count: doneTasks, color: "bg-[#14A800]" },
    { label: "Отменены", count: cancelledTasks, color: "bg-red-400" },
  ];

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Аналитика</h1>
      <p className="text-gray-500 text-sm mb-8">Обзор показателей платформы</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-gray-500 text-sm mb-1">Пользователи</p>
          <p className="text-3xl font-bold text-gray-900">{totalUsers.toLocaleString("ru-RU")}</p>
          <p className="text-[#14A800] text-sm mt-2">+{newUsersWeek} на этой неделе</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-gray-500 text-sm mb-1">Задачи</p>
          <p className="text-3xl font-bold text-gray-900">{totalTasks.toLocaleString("ru-RU")}</p>
          <p className="text-blue-500 text-sm mt-2">{openTasks} открыты сейчас</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-gray-500 text-sm mb-1">Выручка платформы</p>
          <p className="text-3xl font-bold text-gray-900">
            {totalRevenue.toLocaleString("ru-RU")} сом
          </p>
          <p className="text-gray-400 text-sm mt-2">
            комиссия с {releasedEscrows._count} сделок
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-gray-500 text-sm mb-1">Открытые споры</p>
          <p className="text-3xl font-bold text-gray-900">{openDisputes}</p>
          <p className="text-red-500 text-sm mt-2">
            {openDisputes === 0 ? "Всё спокойно" : "Требуют рассмотрения"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        {/* Task Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Воронка задач</h2>
          <div className="space-y-3">
            {taskFunnel.map((item) => {
              const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-800">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Categories */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Популярные категории</h2>
          <div className="space-y-3">
            {categoryGroups.map((cat) => {
              const pct = Math.round((cat._count.id / maxCategory) * 100);
              return (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {categoryLabels[cat.category] ?? cat.category}
                    </span>
                    <span className="font-medium text-gray-800">{cat._count.id}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#14A800]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryGroups.length === 0 && (
              <p className="text-gray-400 text-sm">Нет данных</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* User Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Активность пользователей</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Всего</span>
              <span className="font-bold text-gray-900">{totalUsers.toLocaleString("ru-RU")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">За 7 дней</span>
              <span className="font-bold text-[#14A800]">+{newUsersWeek}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">За 30 дней</span>
              <span className="font-bold text-blue-500">+{newUsersMonth}</span>
            </div>
            <div className="border-t pt-3">
              <p className="text-gray-400 text-xs">
                Рост за месяц:{" "}
                {totalUsers > 0
                  ? Math.round((newUsersMonth / totalUsers) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        {/* Recent Users - spans 2 columns */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Последние регистрации</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Имя</th>
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-left pb-2 font-medium">Город</th>
                  <th className="text-left pb-2 font-medium">Дата</th>
                  <th className="text-left pb-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-medium text-gray-800">{user.name}</td>
                    <td className="py-2.5 text-gray-500">{user.email}</td>
                    <td className="py-2.5 text-gray-500">{user.city}</td>
                    <td className="py-2.5 text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-2.5">
                      {user.isVerified ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Верифицирован
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Новый
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400">
                      Нет пользователей
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
