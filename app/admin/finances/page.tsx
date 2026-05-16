import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Финансы" };

const escrowStatusLabels: Record<string, { label: string; className: string }> = {
  HELD: { label: "Удерживается", className: "badge-progress" },
  RELEASED: { label: "Выплачено", className: "badge-open" },
  REFUNDED: { label: "Возвращено", className: "badge-cancelled" },
};

export default async function AdminFinancesPage() {
  const [escrowStats, heldEscrows, releasedEscrows, refundedEscrows, recentEscrows] =
    await Promise.all([
      prisma.escrow.aggregate({
        _sum: { amount: true, commission: true },
        _count: true,
      }),
      prisma.escrow.aggregate({
        where: { status: "HELD" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.escrow.aggregate({
        where: { status: "RELEASED" },
        _sum: { amount: true, commission: true },
        _count: true,
      }),
      prisma.escrow.aggregate({
        where: { status: "REFUNDED" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.escrow.findMany({
        include: {
          task: { select: { id: true, title: true } },
          holder: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  const totalAmount = escrowStats._sum.amount ?? 0;
  const totalCommission = escrowStats._sum.commission ?? 0;
  const heldAmount = heldEscrows._sum.amount ?? 0;
  const releasedAmount = releasedEscrows._sum.amount ?? 0;
  const releasedCommission = releasedEscrows._sum.commission ?? 0;
  const refundedAmount = refundedEscrows._sum.amount ?? 0;

  const statCards = [
    {
      icon: "💳",
      label: "Общий оборот",
      value: `${totalAmount.toLocaleString("ru-RU")} сом`,
      sub: `${escrowStats._count} транзакций`,
      color: "text-gray-900",
    },
    {
      icon: "🔒",
      label: "Удерживается",
      value: `${heldAmount.toLocaleString("ru-RU")} сом`,
      sub: `${heldEscrows._count} активных`,
      color: "text-yellow-600",
    },
    {
      icon: "✅",
      label: "Выплачено",
      value: `${releasedAmount.toLocaleString("ru-RU")} сом`,
      sub: `${releasedEscrows._count} сделок`,
      color: "text-[#14A800]",
    },
    {
      icon: "↩️",
      label: "Возвращено",
      value: `${refundedAmount.toLocaleString("ru-RU")} сом`,
      sub: `${refundedEscrows._count} возвратов`,
      color: "text-red-500",
    },
    {
      icon: "💵",
      label: "Прибыль платформы",
      value: `${releasedCommission.toLocaleString("ru-RU")} сом`,
      sub: `Комиссия с выплат`,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Финансы</h1>
        <p className="text-gray-500 text-sm">Эскроу-транзакции и финансовая аналитика</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="text-gray-500 text-xs mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-gray-400 text-xs mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Последние транзакции</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Задача</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Держатель</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Сумма</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Комиссия</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentEscrows.map((escrow) => {
                const statusInfo = escrowStatusLabels[escrow.status] ?? {
                  label: escrow.status,
                  className: "",
                };
                return (
                  <tr key={escrow.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tasks/${escrow.task.id}`}
                        className="text-[#14A800] hover:underline font-medium max-w-[180px] block truncate"
                      >
                        {escrow.task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${escrow.holder.id}`}
                        className="text-gray-700 hover:text-[#14A800]"
                      >
                        {escrow.holder.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {escrow.amount.toLocaleString("ru-RU")} сом
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {escrow.commission.toLocaleString("ru-RU")} сом
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(escrow.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                );
              })}
              {recentEscrows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Транзакций нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {recentEscrows.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Показано последние {recentEscrows.length} транзакций
          </div>
        )}
      </div>
    </div>
  );
}
