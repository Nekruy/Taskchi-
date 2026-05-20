"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [required, setRequired] = useState(false);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
    setRequired(params.get("required") === "1");
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...Array(6)].map((_, i) => pasted[i] || "");
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const code = digits.join("");

  const handleSubmit = useCallback(async () => {
    if (code.length !== 6) {
      setError("Введите 6-значный код");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка проверки");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login?verified=1"), 2000);
    } catch {
      setError("Ошибка соединения");
      setLoading(false);
    }
  }, [code, email, router]);

  useEffect(() => {
    if (code.length === 6 && !loading && !success) {
      handleSubmit();
    }
  }, [code, loading, success, handleSubmit]);

  async function handleResend() {
    if (resendCountdown > 0 || !email) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendMessage(data.error || "Ошибка отправки");
      } else {
        setResendMessage("Письмо отправлено!");
        setResendCountdown(60);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setResendMessage("Ошибка соединения");
    }
    setResendLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email подтверждён!</h2>
          <p className="text-gray-500 mb-1">Почта тасдиқ шуд!</p>
          <p className="text-gray-400 text-sm mt-4">Перенаправляем на страницу входа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🎯</span>
            <span className="font-extrabold text-2xl text-gradient">Taskchi</span>
          </Link>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#14A800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Подтвердите email</h1>
          <p className="text-gray-500 mt-1 text-sm">Тасдиқи почтаи электронӣ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          {required && (
            <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Для создания задач необходимо подтвердить email
            </div>
          )}

          {email && (
            <p className="text-center text-sm text-gray-600 mb-6">
              Мы отправили 6-значный код на{" "}
              <span className="font-semibold text-gray-900">{email}</span>
            </p>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* 6-digit input */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                  border-gray-200 text-gray-900
                  focus:border-[#14A800] focus:ring-2 focus:ring-[#14A800]/20"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || code.length !== 6}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Проверка...
              </>
            ) : "Подтвердить"}
          </button>

          {/* Resend */}
          <div className="mt-5 text-center">
            {resendMessage && (
              <p className={`text-sm mb-2 ${resendMessage.includes("отправлено") ? "text-green-600" : "text-red-500"}`}>
                {resendMessage}
              </p>
            )}
            {resendCountdown > 0 ? (
              <p className="text-sm text-gray-400">
                Отправить повторно через{" "}
                <span className="font-semibold text-gray-600">{resendCountdown}с</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-[#14A800] hover:text-[#0d8c00] font-semibold transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Отправка..." : "Отправить повторно →"}
              </button>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition-colors">
              ← Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
