"use client";

import Link from "next/link";

interface RoleTabsProps {
  currentView: string;
}

export function RoleTabs({ currentView }: RoleTabsProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
      <Link
        href="/dashboard?view=customer"
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          currentView === "customer"
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <span className="text-base">🛍️</span>
        <span>Мои поручения</span>
        <span className="hidden sm:inline text-xs text-gray-400 font-normal">— я заказчик</span>
      </Link>

      <Link
        href="/dashboard?view=executor"
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          currentView === "executor"
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <span className="text-base">🤝</span>
        <span>Мои выполнения</span>
        <span className="hidden sm:inline text-xs text-gray-400 font-normal">— я исполнитель</span>
      </Link>
    </div>
  );
}
