"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/academy", label: "Проверка заданий", exact: true },
  { href: "/admin/academy/tracks", label: "Курсы", exact: false },
  { href: "/admin/academy/partners", label: "Партнёры", exact: false },
  { href: "/admin/academy/mentor", label: "Наставник", exact: false },
];

export function AcademyTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              active ? "bg-[#14A800] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Короткая строка «Сохранено» — используется формами админки. */
export function Toast({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#14A800] animate-fade-in" role="status">
      ✓ {text}
    </span>
  );
}
