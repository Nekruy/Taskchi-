"use client";

import { useState } from "react";
import Link from "next/link";

export default function PassportVerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Выберите фото паспорта"); return; }
    setError("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("passportPhoto", file);

      const res = await fetch("/api/verify/passport", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка загрузки");
        setLoading(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Ошибка соединения с сервером");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🎯</span>
            <span className="font-extrabold text-2xl text-gradient">Taskchi</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Верификация паспорта</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Загрузите фото паспорта для верификации</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          {done ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Паспорт отправлен на проверку</h2>
              <p className="text-gray-500 text-sm mb-6">
                Мы уведомим вас в течение 24 часов.
              </p>
              <Link href="/dashboard" className="btn-primary justify-center py-3 inline-flex">
                Перейти в личный кабинет
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                📋 Сфотографируйте разворот паспорта с фотографией. Убедитесь, что текст чёткий и хорошо читается.
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Фото паспорта (лицевая сторона) <span className="text-red-500">*</span>
                </label>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#14A800] transition-colors bg-gray-50 hover:bg-green-50">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Предпросмотр" className="h-full w-full object-contain rounded-xl p-1" />
                  ) : (
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">📄</div>
                      <p className="text-sm text-gray-500">Нажмите для выбора фото</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG до 10 МБ</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Загрузка...
                  </>
                ) : "Отправить на проверку"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
