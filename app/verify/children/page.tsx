"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function VerifyChildrenPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    noCriminalRecord: false,
    experience: "",
    references: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.noCriminalRecord) {
      setError("Необходимо подтверждение об отсутствии судимостей");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("type", "CHILDREN");
      const res = await fetch("/api/verification/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      router.push("/verify/status");
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
        <Link href="/login" className="btn-primary">Войти</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">👶</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Допуск к детским задачам</h1>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Для выполнения задач, связанных с детьми, требуется расширенная проверка.
          Это обеспечивает безопасность семей, которые вам доверяют.
        </p>
      </div>

      {/* Why needed */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <span>ℹ️</span> Зачем это нужно?
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Безопасность детей — наш главный приоритет</li>
          <li>• Родители хотят знать, кому доверяют своего ребёнка</li>
          <li>• Дополнительная проверка повышает ваш рейтинг доверия</li>
        </ul>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Criminal record */}
        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-[#14A800] transition-colors">
          <input
            type="checkbox"
            checked={form.noCriminalRecord}
            onChange={(e) => setForm((p) => ({ ...p, noCriminalRecord: e.target.checked }))}
            className="mt-0.5 w-4 h-4 accent-[#14A800]"
            required
          />
          <div>
            <p className="font-semibold text-gray-800 text-sm">Отсутствие судимостей <span className="text-red-500">*</span></p>
            <p className="text-xs text-gray-500 mt-0.5">
              Подтверждаю, что у меня нет судимостей, особенно связанных с преступлениями против несовершеннолетних
            </p>
          </div>
        </label>

        {/* Experience */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Опыт работы с детьми
          </label>
          <textarea
            value={form.experience}
            onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
            placeholder="Расскажите о вашем опыте: няня, воспитатель, педагог, родитель и т.д."
            className="input-field resize-none h-24"
          />
        </div>

        {/* References */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Рекомендации <span className="text-gray-400 font-normal">(необязательно)</span>
          </label>
          <textarea
            value={form.references}
            onChange={(e) => setForm((p) => ({ ...p, references: e.target.value }))}
            placeholder="Контакты людей, которые могут вас рекомендовать (детский сад, школа, прошлые работодатели)"
            className="input-field resize-none h-24"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !form.noCriminalRecord}
          className="btn-primary w-full justify-center py-3"
        >
          {loading ? "Отправляем..." : "👶 Подать заявку на допуск"}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Решение принимается администраторами в течение 1–3 рабочих дней
        </p>
      </form>

      <div className="mt-4 text-center">
        <Link href="/verify/documents" className="text-sm text-gray-400 hover:text-gray-600">
          ← Вернуться к документам
        </Link>
      </div>
    </div>
  );
}
