"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface VerificationData {
  isVerified: boolean;
  isChildVerified: boolean;
  verification: {
    id: string;
    status: string;
    type: string;
    adminNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
}

export default function VerifyStatusPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch("/api/verification/status")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <Link href="/login" className="btn-primary">Войти</Link>
      </div>
    );
  }

  const verif = data?.verification;
  const vStatus = verif?.status ?? "NOT_SUBMITTED";

  const statusConfig = {
    NOT_SUBMITTED: {
      icon: "⚪",
      bg: "bg-gray-50",
      border: "border-gray-200",
      badge: "bg-gray-100 text-gray-600",
      title: "Верификация не пройдена",
      desc: "Пройдите верификацию, чтобы вызывать больше доверия у заказчиков.",
    },
    PENDING: {
      icon: "⏳",
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      title: "Документы на проверке",
      desc: "Проверка обычно занимает 1–2 рабочих дня. Мы уведомим вас о результате.",
    },
    APPROVED: {
      icon: "✅",
      bg: "bg-green-50",
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
      title: "Верификация пройдена",
      desc: "Ваш аккаунт верифицирован. Это повышает доверие заказчиков к вам.",
    },
    REJECTED: {
      icon: "❌",
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700",
      title: "В верификации отказано",
      desc: "К сожалению, мы не смогли подтвердить ваши документы.",
    },
  }[vStatus] ?? {
    icon: "⚪",
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    title: "Неизвестный статус",
    desc: "",
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Статус верификации</h1>

      {/* Main status card */}
      <div className={`rounded-2xl border p-6 mb-5 ${statusConfig.bg} ${statusConfig.border}`}>
        <div className="flex items-start gap-4">
          <div className="text-4xl">{statusConfig.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-gray-900">{statusConfig.title}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig.badge}`}>
                {vStatus}
              </span>
            </div>
            <p className="text-sm text-gray-600">{statusConfig.desc}</p>

            {vStatus === "REJECTED" && verif?.adminNote && (
              <div className="mt-3 p-3 bg-white/60 rounded-xl border border-red-100 text-sm text-red-700">
                <strong>Причина:</strong> {verif.adminNote}
              </div>
            )}

            {verif?.createdAt && (
              <p className="text-xs text-gray-400 mt-3">
                Подано: {new Date(verif.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Badges */}
      {(data?.isVerified || data?.isChildVerified) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-gray-800 mb-3">Ваши бейджи</h3>
          <div className="flex flex-wrap gap-2">
            {data.isVerified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                ✓ Верифицирован
              </span>
            )}
            {data.isChildVerified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                👶 Допущен к детским задачам
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {vStatus === "NOT_SUBMITTED" && (
          <Link href="/verify/phone" className="btn-primary w-full justify-center py-3 text-center">
            Пройти верификацию →
          </Link>
        )}
        {vStatus === "REJECTED" && (
          <Link href="/verify/phone" className="btn-primary w-full justify-center py-3 text-center">
            Подать документы повторно
          </Link>
        )}
        {vStatus === "APPROVED" && !data?.isChildVerified && (
          <Link href="/verify/children" className="btn-secondary w-full text-center py-3">
            👶 Получить допуск к детским задачам
          </Link>
        )}
        <Link href="/dashboard" className="text-center text-sm text-gray-400 hover:text-gray-600 py-2">
          ← На главную
        </Link>
      </div>
    </div>
  );
}
