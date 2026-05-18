"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
}

const navLinks = [
  { href: "/admin", icon: "📊", label: "Аналитика" },
  { href: "/admin/users", icon: "👥", label: "Пользователи" },
  { href: "/admin/tasks", icon: "📋", label: "Задачи" },
  { href: "/admin/disputes", icon: "⚖️", label: "Споры" },
  { href: "/admin/finances", icon: "💰", label: "Финансы" },
  { href: "/admin/verification", icon: "🛡️", label: "Верификация" },
];

export function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-[#1D4354] min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎯</span>
          <span className="text-white font-bold text-xl">Taskchi Admin</span>
        </div>
        <p className="text-white/50 text-xs">Панель управления</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive(link.href)
                ? "bg-white/10 text-white font-bold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User Info */}
      <div className="px-6 py-5 border-t border-white/10">
        <div className="mb-3">
          <p className="text-white text-sm font-medium truncate">{userName}</p>
          <p className="text-white/50 text-xs truncate">{userEmail}</p>
        </div>
        <Link
          href="/dashboard"
          className="block text-center text-xs text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2"
        >
          ← Перейти на сайт
        </Link>
      </div>
    </aside>
  );
}
