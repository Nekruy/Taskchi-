import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Metadata } from "next";
import { UserActions } from "./UserActions";

export const metadata: Metadata = { title: "Пользователи" };

interface PageProps {
  searchParams: { q?: string; filter?: string };
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { q, filter } = searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter === "banned") where.isBanned = true;
  if (filter === "verified") where.isVerified = true;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      city: true,
      rating: true,
      reviewCount: true,
      isVerified: true,
      isBanned: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { tasksCreated: true, offers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const filterTabs = [
    { label: "Все", value: undefined },
    { label: "Верифицированы", value: "verified" },
    { label: "Заблокированы", value: "banned" },
  ];

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Пользователи</h1>
        <p className="text-gray-500 text-sm">Управление пользователями платформы</p>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <form method="GET" className="flex gap-3 mb-4">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Поиск по имени или email..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A800] focus:border-transparent"
          />
          {filter && <input type="hidden" name="filter" value={filter} />}
          <button
            type="submit"
            className="bg-[#14A800] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#12960a] transition-colors"
          >
            Найти
          </button>
        </form>
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `?filter=${tab.value}${q ? `&q=${q}` : ""}` : `?${q ? `q=${q}` : ""}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === tab.value || (!filter && !tab.value)
                  ? "bg-[#1D4354] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Пользователь</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Город</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Рейтинг</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Задачи</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Верификация</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1D4354] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          {user.name}
                          {user.isAdmin && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.city}</td>
                  <td className="px-4 py-3">
                    <span className="text-gray-800 font-medium">
                      ⭐ {user.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">({user.reviewCount})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user._count.tasksCreated}
                  </td>
                  <td className="px-4 py-3">
                    {user.isVerified ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        ✓ Верифицирован
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Не верифицирован
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.isBanned ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        🚫 Заблокирован
                      </span>
                    ) : (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        Активен
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <UserActions
                      userId={user.id}
                      isVerified={user.isVerified}
                      isBanned={user.isBanned}
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Пользователи не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Показано {users.length} из 50
          </div>
        )}
      </div>
    </div>
  );
}
