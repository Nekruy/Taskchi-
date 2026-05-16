import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Metadata } from "next";
import { DisputeActions } from "./DisputeActions";

export const metadata: Metadata = { title: "Споры" };

interface PageProps {
  searchParams: { filter?: string };
}

const disputeStatusLabels: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Открыт", className: "badge-progress" },
  RESOLVED_CUSTOMER: { label: "В пользу заказчика", className: "badge-done" },
  RESOLVED_EXECUTOR: { label: "В пользу исполнителя", className: "badge-done" },
  CLOSED: { label: "Закрыт", className: "badge-cancelled" },
};

const filterTabs = [
  { label: "Все", value: "" },
  { label: "Открытые", value: "open" },
  { label: "Решённые", value: "resolved" },
];

export default async function AdminDisputesPage({ searchParams }: PageProps) {
  const { filter } = searchParams;

  const whereFilter: Record<string, unknown> = {};
  if (filter === "open") whereFilter.status = "OPEN";
  if (filter === "resolved") {
    whereFilter.status = { in: ["RESOLVED_CUSTOMER", "RESOLVED_EXECUTOR"] };
  }

  const disputes = await prisma.dispute.findMany({
    where: whereFilter,
    include: {
      task: { select: { id: true, title: true, budget: true, status: true } },
      filedBy: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Споры</h1>
        <p className="text-gray-500 text-sm">Рассмотрение конфликтных ситуаций</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `?filter=${tab.value}` : "/admin/disputes"}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                (filter ?? "") === tab.value
                  ? "bg-[#1D4354] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {disputes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-gray-600 font-medium">Споров нет 🎉</p>
          <p className="text-gray-400 text-sm mt-1">Все конфликты урегулированы</p>
        </div>
      )}

      {/* Table */}
      {disputes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Задача</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Подал</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Причина</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Создан</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {disputes.map((dispute) => {
                  const statusInfo = disputeStatusLabels[dispute.status] ?? {
                    label: dispute.status,
                    className: "",
                  };
                  return (
                    <tr key={dispute.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/tasks/${dispute.task.id}`}
                          className="text-[#14A800] hover:underline font-medium max-w-[160px] block truncate"
                        >
                          {dispute.task.title}
                        </Link>
                        <span className="text-gray-400 text-xs">
                          {dispute.task.budget.toLocaleString("ru-RU")} сом
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/profile/${dispute.filedBy.id}`}
                          className="text-gray-700 hover:text-[#14A800]"
                        >
                          {dispute.filedBy.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600 block max-w-[200px] truncate" title={dispute.reason}>
                          {dispute.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(dispute.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="px-4 py-3">
                        {dispute.status === "OPEN" ? (
                          <DisputeActions disputeId={dispute.id} />
                        ) : (
                          <span className="text-gray-400 text-xs">
                            {dispute.resolvedBy
                              ? `Решён: ${dispute.resolvedBy.name}`
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Итого: {disputes.length}
          </div>
        </div>
      )}
    </div>
  );
}
