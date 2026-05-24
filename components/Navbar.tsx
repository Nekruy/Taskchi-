"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdown] = useState(false);
  const [searchQuery, setSearch]    = useState("");
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
                        style={{ /* hover handled by Tailwind */ }}
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
        <button
          className="md:hidden ml-auto p-2.5 rounded-xl text-gray-600 hover:bg-green-50 transition-colors"
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
