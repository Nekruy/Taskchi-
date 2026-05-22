"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Ссылка недействительна");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка сервера"); }
      else { setDone(true); setTimeout(() => router.push("/login"), 3000); }
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/"><span className="text-3xl">🎯</span></Link>
          <h1 className="text-2xl font-bold mt-2">Новый пароль</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-7">
          {done ? (
            <div className="text-center">
              <p className="font-semibold text-lg">✅ Пароль изменён!</p>
              <p className="text-gray-500 mt-2">Перенаправляем на страницу входа...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Новый пароль</label>
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов" className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Повторите пароль</label>
                <input type={showPass ? "text" : "password"} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Повторите пароль" className="input-field w-full" required />
              </div>
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="text-sm text-gray-500">
                {showPass ? "Скрыть" : "Показать"} пароль
              </button>
              <button type="submit" disabled={loading || !token}
                className="btn-primary w-full justify-center py-3">
                {loading ? "Сохранение..." : "Сохранить пароль"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}