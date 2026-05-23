"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CITIES = [
  "Душанбе", "Худжанд", "Бохтар", "Кӯлоб", "Исфара",
  "Ҳисор", "Вахш", "Турсунзода", "Панҷакент", "Данғара",
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"CUSTOMER" | "EXECUTOR" | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "Душанбе",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: role ?? "CUSTOMER" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }

      router.push(data.role === "EXECUTOR" ? "/onboarding/executor" : "/login");
    } catch {
      setError("Ошибка соединения с сервером");
      setLoading(false);
    }
  }

  if (!role) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl">🎯</span>
              <span className="font-extrabold text-2xl text-gradient">Taskchi</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Кто вы?</h1>
            <p className="text-gray-500 mt-1.5 text-sm">Выберите роль для регистрации</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setRole("CUSTOMER")}
              className="flex flex-col items-center gap-3 bg-white border-2 border-gray-200 hover:border-[#14A800] rounded-2xl p-6 text-center transition-all group"
            >
              <div className="w-14 h-14 bg-blue-50 group-hover:bg-green-50 rounded-2xl flex items-center justify-center text-3xl transition-colors">
                👤
              </div>
              <div>
                <div className="font-bold text-gray-900 text-base">Я заказчик</div>
                <div className="text-xs text-gray-500 mt-1 leading-snug">Размещаю задачи и нахожу исполнителей</div>
              </div>
            </button>
            <button
              onClick={() => setRole("EXECUTOR")}
              className="flex flex-col items-center gap-3 bg-white border-2 border-gray-200 hover:border-[#14A800] rounded-2xl p-6 text-center transition-all group"
            >
              <div className="w-14 h-14 bg-orange-50 group-hover:bg-green-50 rounded-2xl flex items-center justify-center text-3xl transition-colors">
                💼
              </div>
              <div>
                <div className="font-bold text-gray-900 text-base">Я исполнитель</div>
                <div className="text-xs text-gray-500 mt-1 leading-snug">Выполняю задачи и зарабатываю деньги</div>
              </div>
            </button>
          </div>
          <div className="mt-6 text-center text-sm text-gray-500">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-[#14A800] hover:text-[#0d8c00] font-semibold">
              Войти
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🎯</span>
            <span className="font-extrabold text-2xl text-gradient">Taskchi</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Создать аккаунт</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Бесплатно · Быстро · Безопасно</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Имя и фамилия <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Алишер Нуров"
                  className="input-field pl-10"
                  required
                  minLength={2}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="alisher@email.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Пароль <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="input-field pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Телефон <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+992 XX XXX XXXX"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Город
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <select
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  className="input-field pl-10"
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Регистрация...
                </>
              ) : "Зарегистрироваться"}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400 text-center">
            Регистрируясь, вы соглашаетесь с условиями использования Taskchi
          </p>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-[#14A800] hover:text-[#0d8c00] font-semibold">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
