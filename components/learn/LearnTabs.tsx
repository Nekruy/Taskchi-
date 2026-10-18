"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/learn", label: "Главная", exact: true },
  { href: "/learn/assignments", label: "Задания" },
  { href: "/learn/prompts", label: "Промпты" },
  { href: "/learn/notes", label: "Заметки" },
  { href: "/learn/achievements", label: "Достижения" },
  { href: "/learn/mentor", label: "Устод" },
];

export function LearnTabs({ workHref }: { workHref: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/learn/certificate")) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 no-print">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              active ? "bg-[#14A800] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
      <Link href={workHref} className="shrink-0 ml-auto btn-ghost text-xs text-gray-500 whitespace-nowrap">
        → Режим работы
      </Link>
    </div>
  );
}
