"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") setVerifiedSuccess(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error === "EMAIL_NOT_VERIFIED") {
      setUnverifiedEmail(email);
      setLoading(false);
    } else if (result?.error) {
      setError("Неверный email или пароль");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleResend() {
    if (!unverifiedEmail) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      setResendMessage(res.ok ? "Письмо отправлено!" : (data.error || "Ошибка"));
    } catch {
      setResendMessage("Ошибка соединения");
    }
    setResendLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Добро пожаловать</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Войдите в свой аккаунт Taskchi</p>
        </div>

        {verifiedSuccess && (
          <div className="mb-4 flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Email подтверждён! Теперь вы можете войти.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          {unverifiedEmail && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Подтвердите email — мы отправили код на <strong>{unverifiedEmail}</strong></span>
              </div>
              <div className="flex items-center gap-3 mt-2 pl-6">
                <Link
                  href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="text-amber-700 font-semibold underline underline-offset-2 hover:text-amber-900 text-xs"
                >
                  Ввести код →
                </Link>
                <span className="text-amber-400">·</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-amber-700 font-semibold underline underline-offset-2 hover:text-amber-900 text-xs disabled:opacity-50"
                >
                  {resendLoading ? "Отправка..." : "Отправить повторно"}
                </button>
                {resendMessage && (
                  <span className={`text-xs ${resendMessage.includes("отправлено") ? "text-green-600" : "text-red-500"}`}>
                    {resendMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ваша@почта.com"
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Пароль
                </label>
                <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-[#14A800] transition-colors">
                  Забыли пароль?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                  required
                  autoComplete="current-password"
                />
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
                  Вход...
                </>
              ) : "Войти"}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-600 font-medium mb-1">Demo аккаунты:</p>
            <p className="text-xs text-blue-500 font-mono">alice@taskchi.tj / password123</p>
            <p className="text-xs text-blue-500 font-mono">bob@taskchi.tj / password123</p>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
            Нет аккаунта?{" "}
            <Link href="/register" className="text-[#14A800] hover:text-[#0d8c00] font-semibold">
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
