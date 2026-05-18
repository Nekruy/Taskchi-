"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function VerifyPhonePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCountdown() {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function sendOTP() {
    const trimmed = phone.trim();
    if (!trimmed) { setError("Введите номер телефона"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/sms/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка отправки"); return; }
      setStep("code");
      startCountdown();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!code || code.length !== 6) { setError("Введите 6-значный код"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/sms/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Неверный код"); return; }
      router.push("/verify/documents");
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-gray-500 mb-6">Войдите для верификации</p>
        <Link href="/login" className="btn-primary">Войти</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {["Телефон", "Документы", "Готово"].map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i === 0 ? "bg-[#14A800] text-white" : "bg-gray-200 text-gray-400"
            }`}>{i + 1}</div>
            <span className={`text-xs font-medium ${i === 0 ? "text-[#14A800]" : "text-gray-400"}`}>{label}</span>
            {i < 2 && <div className="h-px flex-1 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {step === "phone" ? (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📱</div>
              <h1 className="text-xl font-bold text-gray-900">Подтверждение телефона</h1>
              <p className="text-gray-500 text-sm mt-1">Введите номер для получения SMS кода</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Номер телефона</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+992 XX XXX XXXX"
                className="input-field text-lg tracking-wide"
                onKeyDown={(e) => e.key === "Enter" && sendOTP()}
              />
            </div>

            <button
              onClick={sendOTP}
              disabled={loading || !phone.trim()}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? "Отправляем..." : "Получить SMS код"}
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔑</div>
              <h1 className="text-xl font-bold text-gray-900">Введите код из SMS</h1>
              <p className="text-gray-500 text-sm mt-1">
                Код отправлен на <strong>{phone}</strong>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
            )}

            <div className="mb-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="input-field text-3xl tracking-widest text-center font-bold"
                onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                autoFocus
              />
            </div>

            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="btn-primary w-full justify-center py-3 mb-3"
            >
              {loading ? "Проверяем..." : "Подтвердить"}
            </button>

            <div className="text-center">
              {countdown > 0 ? (
                <span className="text-sm text-gray-400">Повторно через {countdown} сек</span>
              ) : (
                <button
                  onClick={() => { setCode(""); sendOTP(); }}
                  className="text-sm text-[#14A800] hover:text-[#0d8c00] font-medium"
                >
                  Отправить повторно
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3"
            >
              ← Изменить номер
            </button>
          </>
        )}
      </div>
    </div>
  );
}
