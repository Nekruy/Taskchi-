"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  taskId?: string | null;
  link?: string | null;
  createdAt: string;
}

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdown] = useState(false);
  const [searchQuery, setSearch]    = useState("");
  const [bellOpen, setBellOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef     = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // silently fail
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [session, fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdown(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setBellOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/tasks?q=${encodeURIComponent(q)}` : "/tasks");
    setMenuOpen(false);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markOneRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markOneRead(n.id);
    setBellOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <header
      className="sticky top-0 z-50 bg-white"
      style={{ borderBottom: "1px solid #e8f5e8", boxShadow: "0 2px 16px rgba(20,168,0,.06)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 select-none group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-lg font-extrabold shadow-sm group-hover:shadow-md transition-shadow"
            style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)" }}
          >
            ✓
          </div>
          <span className="font-extrabold text-xl tracking-tight gradient-text">Taskchi</span>
        </Link>

        {/* ── Search bar (desktop) ── */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full group">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#14A800] transition-colors"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти поручение..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white text-gray-700 placeholder-gray-400
                         focus:outline-none transition-all duration-200"
              style={{
                border: "1.5px solid #e8f5e8",
                borderRadius: "20px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#14A800";
                e.currentTarget.style.boxShadow   = "0 0 0 4px rgba(20,168,0,.10)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e8f5e8";
                e.currentTarget.style.boxShadow   = "none";
              }}
            />
          </div>
        </form>

        {/* ── Desktop right side ── */}
        <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">

          <Link href="/tasks" className="btn-ghost text-sm hidden lg:inline-flex">
            Задачи
          </Link>
          <Link href="/map" className="btn-ghost text-sm hidden lg:inline-flex">
            Карта
          </Link>

          {session ? (
            <>
              {/* Create task — gradient pill */}
              <Link
                href="/tasks/create"
                className="btn-primary py-2 px-5 text-sm animate-btn-pulse"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Поручение
              </Link>

              {/* ── Notification Bell ── */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => { setBellOpen(!bellOpen); if (!bellOpen) fetchNotifications(); }}
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-green-50 transition-colors"
                  title="Уведомления"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white rounded-2xl py-2 animate-fade-in z-50"
                    style={{ border: "1px solid #e8f5e8", boxShadow: "0 12px 40px rgba(20,168,0,.12), 0 2px 8px rgba(0,0,0,.06)" }}
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#f0f9f0" }}>
                      <span className="font-bold text-gray-900 text-sm">Уведомления</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-[#14A800] font-semibold hover:underline"
                        >
                          Отметить все прочитанными
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-8">Нет уведомлений</p>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b last:border-0 ${!n.isRead ? "bg-blue-50" : ""}`}
                            style={{ borderColor: "#f0f9f0" }}
                          >
                            <div className="flex items-start gap-2">
                              {!n.isRead && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                              )}
                              <div className={!n.isRead ? "" : "pl-4"}>
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {new Date(n.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdown(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-[20px] bg-white transition-all"
                  style={{
                    border: "1.5px solid #e8f5e8",
                    boxShadow: dropdownOpen ? "0 0 0 3px rgba(20,168,0,.12)" : "0 1px 4px rgba(20,168,0,.08)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
                    style={{ background: "linear-gradient(135deg, #14A800, #00d4aa)" }}
                  >
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 max-w-[90px] truncate">
                    {session.user.name?.split(" ")[0]}
                  </span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl py-2 animate-fade-in"
                    style={{ border: "1px solid #e8f5e8", boxShadow: "0 12px 40px rgba(20,168,0,.12), 0 2px 8px rgba(0,0,0,.06)" }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b mb-1" style={{ borderColor: "#f0f9f0" }}>
                      <p className="font-bold text-gray-900 text-sm truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{session.user.email}</p>
                    </div>

                    {[
                      { href: session.user.role === "EXECUTOR" ? "/executor" : "/customer", icon: "📊", label: "Личный кабинет" },
                      { href: `/profile/${session.user.id}`,                                icon: "👤", label: "Мой профиль"    },
                      { href: "/tasks/create",                                              icon: "✍️", label: "Создать поручение" },
                    ].map((item) => (
                      <Link key={item.href} href={item.href}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:text-[#14A800] transition-colors"
                        onClick={() => setDropdown(false)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(20,168,0,.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t mt-1 pt-1" style={{ borderColor: "#f0f9f0" }}>
                      <button
                        onClick={() => { signOut({ callbackUrl: "/" }); setDropdown(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <span>🚪</span> Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-outline py-2 px-4 text-sm">
                Войти
              </Link>
              <Link href="/register" className="btn-primary py-2 px-4 text-sm">
                Регистрация
              </Link>
            </div>
          )}
        </div>

        {/* ── Hamburger (mobile) ── */}
        <div className="md:hidden ml-auto flex items-center gap-2">
          {/* Mobile bell */}
          {session && (
            <button
              onClick={() => router.push("/executor/notifications")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            className="p-2.5 rounded-xl text-gray-600 hover:bg-green-50 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div
          className="md:hidden bg-white px-4 pb-4 pt-3 space-y-2 animate-fade-in"
          style={{ borderTop: "1px solid #e8f5e8", boxShadow: "0 8px 24px rgba(20,168,0,.08)" }}
        >
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="relative mb-3">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти поручение..."
              className="w-full pl-10 pr-4 py-3 text-sm bg-white focus:outline-none transition-all"
              style={{ border: "1.5px solid #e8f5e8", borderRadius: "20px" }}
            />
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/tasks" className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:text-[#14A800] hover:bg-green-50 rounded-xl" onClick={() => setMenuOpen(false)}>📋 Задачи</Link>
            <Link href="/map"   className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:text-[#14A800] hover:bg-green-50 rounded-xl" onClick={() => setMenuOpen(false)}>🗺️ Карта</Link>
          </div>

          {session ? (
            <div className="space-y-2" style={{ borderTop: "1px solid #e8f5e8", paddingTop: "12px" }}>
              <Link href="/tasks/create" className="btn-primary w-full justify-center py-3" onClick={() => setMenuOpen(false)}>
                + Создать поручение
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href={session.user.role === "EXECUTOR" ? "/executor" : "/customer"} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:bg-green-50 rounded-xl text-sm" onClick={() => setMenuOpen(false)}>📊 Кабинет</Link>
                <Link href={`/profile/${session.user.id}`} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:bg-green-50 rounded-xl text-sm" onClick={() => setMenuOpen(false)}>👤 Профиль</Link>
              </div>
              <button onClick={() => { signOut({ callbackUrl: "/" }); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 py-2.5 px-3 text-red-600 font-medium hover:bg-red-50 rounded-xl text-sm">
                🚪 Выйти
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2" style={{ borderTop: "1px solid #e8f5e8", paddingTop: "12px" }}>
              <Link href="/login"    className="btn-outline  justify-center py-3" onClick={() => setMenuOpen(false)}>Войти</Link>
              <Link href="/register" className="btn-primary  justify-center py-3" onClick={() => setMenuOpen(false)}>Регистрация</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
