"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { icon: "🧒", title: "Дети",     desc: "Садик, школа, секции" },
  { icon: "🛒", title: "Покупки",  desc: "Магазин, аптека" },
  { icon: "🚗", title: "Доставка", desc: "Посылки, химчистка" },
  { icon: "⏰", title: "Очередь",  desc: "ОВИР, банк" },
  { icon: "🏠", title: "Дом",      desc: "Ремонт, уборка" },
  { icon: "💻", title: "IT",       desc: "Сайт, дизайн" },
];

export default function CustomerOnboardingPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">Добро пожаловать в Taskchi!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Найдите исполнителя для любой задачи в Душанбе
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <p className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
            Какие задачи вы можете разместить?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{cat.title}</p>
                  <p className="text-xs text-gray-500">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/tasks/create"
            className="flex-1 btn-primary justify-center py-3 text-base"
          >
            + Создать первую задачу
          </Link>
          <button
            onClick={() => router.push("/customer")}
            className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Посмотреть задачи
          </button>
        </div>
      </div>
    </div>
  );
}
