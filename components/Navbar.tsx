"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [dropdownOpen, setDropdown]   = useState(false);
  const [searchQuery, setSearch]      = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdown(false);
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

  return (
    <header className="sticky top-0 z-50 bg-white" style={{ boxShadow: "0 1px 0 #e5e7eb, 0 2px 8px rgba(0,0,0,.06)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 select-none">
          <span className="text-2xl leading-none">🎯</span>
          <span className="font-extrabold text-xl tracking-tight text-gradient">Taskchi</span>
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
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border-2 border-gray-100
                         rounded-xl text-gray-700 placeholder-gray-400
                         focus:outline-none focus:bg-white focus:border-[#14A800]
                         focus:ring-4 focus:ring-[#e6f9e6]
                         transition-all duration-200"
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
              <Link href="/tasks/create" className="btn-primary py-2 px-4 text-sm">
                + Поручение
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdown(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl border-2 border-gray-100 hover:border-green-200 transition-all bg-white shadow-sm"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14A800] to-[#0d8c00] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 max-w-[90px] truncate">
                    {session.user.name?.split(" ")[0]}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl border border-gray-100 py-2 animate-fade-in"
                       style={{ boxShadow: "0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)" }}>
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-50 mb-1">
                      <p className="font-bold text-gray-900 text-sm truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{session.user.email}</p>
                    </div>

                    {[
                      { href: "/dashboard",               icon: "📊", label: "Дашборд" },
                      { href: `/profile/${session.user.id}`, icon: "👤", label: "Мой профиль" },
                      { href: "/tasks/create",            icon: "✍️", label: "Создать поручение" },
                    ].map((item) => (
                      <Link key={item.href} href={item.href}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        onClick={() => setDropdown(false)}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button
                        onClick={() => { signOut({ callbackUrl: "/" }); setDropdown(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <span>🚪</span>
                        Выйти
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
        <button
          className="md:hidden ml-auto p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
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

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 pt-3 space-y-2 animate-fade-in"
             style={{ boxShadow: "0 8px 16px rgba(0,0,0,.06)" }}>
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
              className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#14A800] focus:ring-4 focus:ring-[#e6f9e6] transition-all"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/tasks"      className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl" onClick={() => setMenuOpen(false)}>📋 Задачи</Link>
            <Link href="/map"        className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl" onClick={() => setMenuOpen(false)}>🗺️ Карта</Link>
          </div>

          {session ? (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <Link href="/tasks/create" className="btn-primary w-full justify-center py-3" onClick={() => setMenuOpen(false)}>
                + Создать поручение
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/dashboard"             className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl text-sm" onClick={() => setMenuOpen(false)}>📊 Дашборд</Link>
                <Link href={`/profile/${session.user.id}`} className="flex items-center gap-2 py-2.5 px-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl text-sm" onClick={() => setMenuOpen(false)}>👤 Профиль</Link>
              </div>
              <button onClick={() => { signOut({ callbackUrl: "/" }); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 py-2.5 px-3 text-red-600 font-medium hover:bg-red-50 rounded-xl text-sm">
                🚪 Выйти
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
              <Link href="/login"    className="btn-outline  justify-center py-3" onClick={() => setMenuOpen(false)}>Войти</Link>
              <Link href="/register" className="btn-primary  justify-center py-3" onClick={() => setMenuOpen(false)}>Регистрация</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
