"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; exact?: boolean };

/** Полный набор вкладок кабинета: первой — Академия (каталог). */
const LEARN_TABS: Tab[] = [
  { href: "/academy", label: "Академия" },
  { href: "/learn", label: "Обзор", exact: true },
  { href: "/learn/assignments", label: "Задания" },
  { href: "/learn/prompts", label: "Промпты" },
  { href: "/learn/notes", label: "Заметки" },
  { href: "/learn/achievements", label: "Достижения" },
  { href: "/learn/mentor", label: "Устод" },
];

/** Компактная полоса для каталога /academy и страницы трека — чтобы каталог и кабинет были одним разделом. */
const CATALOG_TABS: Tab[] = [
  { href: "/academy", label: "Академия" },
  { href: "/learn", label: "Моя учёба", exact: true },
  { href: "/learn/assignments", label: "Задания" },
  { href: "/learn/prompts", label: "Промпты" },
];

interface Props {
  variant?: "learn" | "catalog";
  workHref?: string;
  className?: string;
}

export function LearnTabs({ variant = "learn", workHref, className = "" }: Props) {
  const pathname = usePathname();
  if (pathname.startsWith("/learn/certificate")) return null;
  const tabs = variant === "catalog" ? CATALOG_TABS : LEARN_TABS;
  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-print ${className}`}>
      {tabs.map((t) => {
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
      {workHref && (
        <Link href={workHref} className="shrink-0 ml-auto btn-ghost text-xs text-gray-500 whitespace-nowrap">
          → Режим работы
        </Link>
      )}
    </div>
  );
}
