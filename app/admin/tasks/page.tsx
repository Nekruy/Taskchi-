import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Metadata } from "next";
import { TaskActions } from "./TaskActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Задачи" };

interface PageProps {
  searchParams: { status?: string; category?: string };
}

const categoryLabels: Record<string, string> = {
  CHILDREN: "👶 Дети",
  SHOPPING: "🛒 Покупки",
  DELIVERY: "🚚 Доставка",
  QUEUE: "⏳ Очередь",
  HOUSEHOLD: "🏠 Домашние дела",
  ONLINE: "💻 Онлайн",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Открыта", className: "badge-open" },
  IN_PROGRESS: { label: "В работе", className: "badge-progress" },
  REVIEW: { label: "На проверке", className: "badge-progress" },
  DONE: { label: "Готово", className: "badge-done" },
  CANCELLED: { label: "Отменена", className: "badge-cancelled" },
};

const statusFilters = [
  { label: "Все", value: "" },
  { label: "Открыты", value: "OPEN" },
  { label: "В работе", value: "IN_PROGRESS" },
  { label: "Готово", value: "DONE" },
  { label: "Отменены", value: "CANCELLED" },
];

const categories = ["CHILDREN", "SHOPPING", "DELIVERY", "QUEUE", "HOUSEHOLD", "ONLINE"];

export default async function AdminTasksPage({ searchParams }: PageProps) {
  const { status, category } = searchParams;

  const tasks = await prisma.task.findMany({
    where: {
      ...(status ? { status: status as "OPEN" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED" } : {}),
      ...(category ? { category: category as "CHILDREN" | "SHOPPING" | "DELIVERY" | "QUEUE" | "HOUSEHOLD" | "ONLINE" } : {}),
    },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Задачи</h1>
        <p className="text-gray-500 text-sm">Управление задачами на платформе</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {statusFilters.map((tab) => (
            <Link
              key={tab.value}
              href={`?${tab.value ? `status=${tab.value}` : ""}${category ? `&category=${category}` : ""}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                (status ?? "") === tab.value
                  ? "bg-[#1D4354] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Category filter */}
        <form method="GET">
          {status && <input type="hidden" name="status" value={status} />}
          <select
            name="category"
            defaultValue={category ?? ""}
            onChange={(e) => {
              // handled by form submission
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A800] mr-2"
          >
            <option value="">Все категории</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-[#14A800] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#12960a] transition-colors"
          >
            Применить
          </button>
          {(status || category) && (
            <Link
              href="/admin/tasks"
              className="ml-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Сбросить
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Задача</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Категория</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Бюджет</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Заказчик</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Офферы</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Создана</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task) => {
                const statusInfo = statusLabels[task.status] ?? { label: task.status, className: "" };
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-[200px] truncate">
                        {task.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {categoryLabels[task.category] ?? task.category}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {task.budget.toLocaleString("ru-RU")} сом
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${task.creator.id}`}
                        className="text-[#14A800] hover:underline"
                      >
                        {task.creator.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{task._count.offers}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(task.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-3">
                      <TaskActions taskId={task.id} />
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Задачи не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {tasks.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Показано {tasks.length} из 50
          </div>
        )}
      </div>
    </div>
  );
}
