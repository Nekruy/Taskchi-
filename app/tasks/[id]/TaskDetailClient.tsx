"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  CHILDREN: { label: "Дети", emoji: "👶" },
  SHOPPING: { label: "Покупки", emoji: "🛒" },
  DELIVERY: { label: "Доставка", emoji: "🚚" },
  QUEUE: { label: "Очередь", emoji: "🕐" },
  HOUSEHOLD: { label: "Дом", emoji: "🏠" },
  ONLINE: { label: "Онлайн", emoji: "💻" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Открыта", cls: "badge-open" },
  IN_PROGRESS: { label: "В работе", cls: "badge-progress" },
  REVIEW: { label: "На проверке", cls: "badge-review" },
  DONE: { label: "Выполнена", cls: "badge-done" },
  CANCELLED: { label: "Отменена", cls: "badge-cancelled" },
};

interface TaskDetailClientProps {
  task: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    budget: number;
    commissionFee: number;
    city: string;
    address?: string | null;
    deadline?: Date | string | null;
    isGroupTask: boolean;
    executorsNeeded: number;
    aiParsed: boolean;
    createdAt: Date | string;
    creator: {
      id: string; name: string; avatar?: string | null;
      rating: number; reviewCount: number; city: string; bio?: string | null;
    };
    executor?: { id: string; name: string; avatar?: string | null; rating: number; reviewCount: number } | null;
    offers: Array<{
      id: string; price: number; message: string; status: string;
      executor: { id: string; name: string; avatar?: string | null; rating: number; reviewCount: number };
    }>;
    contract?: { id: string; status: string; pdfUrl?: string | null } | null;
    escrow?: { id: string; status: string; amount: number; commission: number } | null;
    chat?: { id: string } | null;
    _count: { offers: number };
  };
  session: Session | null;
}

export function TaskDetailClient({ task, session }: TaskDetailClientProps) {
  const router = useRouter();
  const [offerPrice, setOfferPrice] = useState(task.budget.toString());
  const [offerMessage, setOfferMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isCreator = session?.user.id === task.creator.id;
  const isExecutor = session?.user.id === task.executor?.id;
  const cat = CATEGORY_LABELS[task.category] || { label: task.category, emoji: "📋" };
  const statusInfo = STATUS_MAP[task.status] || { label: task.status, cls: "badge" };

  const userOffer = task.offers.find((o) => o.executor.id === session?.user.id);
  const commission = task.commissionFee;
  const executorPayout = task.budget - commission;

  async function submitOffer() {
    if (!offerMessage.trim()) {
      setError("Напишите сообщение для заказчика");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          price: parseFloat(offerPrice),
          message: offerMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("Отклик отправлен! Ожидайте ответа заказчика.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function acceptOffer(offerId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/offers/${offerId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("Исполнитель выбран! Создан чат и эскроу.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function generateContract() {
    setLoading(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("Договор сгенерирован!");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function releaseEscrow() {
    if (!confirm("Подтвердите выполнение задачи. Деньги будут переведены исполнителю.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/escrow/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("Оплата переведена исполнителю! Задача завершена.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-5">
          {/* Header */}
          <div className="card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-sm text-slate-500 font-medium">{cat.label}</span>
                {task.aiParsed && (
                  <span className="badge bg-purple-100 text-purple-700">🤖 AI</span>
                )}
              </div>
              <span className={statusInfo.cls}>{statusInfo.label}</span>
            </div>

            <h1 className="text-xl font-bold text-slate-800 mb-3">{task.title}</h1>
            <p className="text-slate-600 leading-relaxed">{task.description}</p>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
              <span>📍 {task.address ? `${task.address}, ` : ""}{task.city}</span>
              {task.deadline && (
                <span>⏰ до {new Date(task.deadline).toLocaleDateString("ru-RU")}</span>
              )}
              {task.isGroupTask && (
                <span>👥 Группа · {task.executorsNeeded} чел.</span>
              )}
              <span>📅 {new Date(task.createdAt).toLocaleDateString("ru-RU")}</span>
            </div>
          </div>

          {/* Budget & Commission */}
          <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-bold text-[#14A800]">{task.budget} сомони</div>
                <div className="text-xs text-green-600 mt-0.5">Бюджет заказчика</div>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div>Комиссия: {commission.toFixed(1)} сом</div>
                <div className="font-semibold text-slate-700">Вы получите: {executorPayout.toFixed(1)} сом</div>
              </div>
            </div>
          </div>

          {/* Escrow status */}
          {task.escrow && (
            <div className={`card border-2 ${task.escrow.status === "HELD" ? "border-blue-200 bg-blue-50" : task.escrow.status === "RELEASED" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{task.escrow.status === "HELD" ? "🔒" : task.escrow.status === "RELEASED" ? "✅" : "↩️"}</span>
                <div>
                  <div className="font-semibold text-sm">
                    Эскроу: {task.escrow.status === "HELD" ? "Заморожено" : task.escrow.status === "RELEASED" ? "Выплачено" : "Возвращено"}
                  </div>
                  <div className="text-xs text-slate-500">{task.escrow.amount} сомони · Комиссия: {task.escrow.commission} сомони</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions for creator */}
          {isCreator && task.status === "IN_PROGRESS" && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-slate-800">Управление задачей</h3>
              <div className="flex flex-wrap gap-3">
                {task.chat && (
                  <Link href={`/chat/${task.chat.id}`} className="btn-primary text-sm">
                    💬 Открыть чат
                  </Link>
                )}
                {!task.contract && (
                  <button onClick={generateContract} disabled={loading} className="btn-outline text-sm">
                    📄 Сформировать договор
                  </button>
                )}
                {task.contract?.pdfUrl && (
                  <a href={task.contract.pdfUrl} target="_blank" className="btn-secondary text-sm">
                    📥 Скачать договор PDF
                  </a>
                )}
                {task.escrow?.status === "HELD" && (
                  <button onClick={releaseEscrow} disabled={loading} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors">
                    ✅ Подтвердить выполнение
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions for executor */}
          {isExecutor && task.chat && (
            <Link href={`/chat/${task.chat.id}`} className="btn-primary block text-center">
              💬 Открыть чат с заказчиком
            </Link>
          )}

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>
          )}

          {/* Offers list (for creator) */}
          {isCreator && task.offers.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-4">
                Отклики ({task._count.offers})
              </h3>
              <div className="space-y-4">
                {task.offers.map((offer) => (
                  <div
                    key={offer.id}
                    className={`p-4 rounded-xl border ${offer.status === "ACCEPTED" ? "border-green-300 bg-green-50" : "border-slate-200"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-[#14A800] text-sm font-bold">
                          {offer.executor.name[0]}
                        </div>
                        <div>
                          <Link href={`/profile/${offer.executor.id}`} className="font-medium text-slate-800 hover:text-[#14A800] text-sm">
                            {offer.executor.name}
                          </Link>
                          {offer.executor.rating > 0 && (
                            <div className="text-xs text-amber-500">★ {offer.executor.rating.toFixed(1)} ({offer.executor.reviewCount} отзывов)</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#14A800]">{offer.price} сом</div>
                        {offer.status === "ACCEPTED" && <span className="badge badge-open text-xs">Принят</span>}
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm mb-3">{offer.message}</p>
                    {task.status === "OPEN" && offer.status === "PENDING" && (
                      <button
                        onClick={() => acceptOffer(offer.id)}
                        disabled={loading}
                        className="btn-primary text-sm py-2"
                      >
                        Принять отклик
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit offer (for non-creator) */}
          {!isCreator && task.status === "OPEN" && session && !userOffer && (
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-4">Откликнуться на задачу</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Ваша цена (сомони)
                  </label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="input-field"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Сообщение заказчику
                  </label>
                  <textarea
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="Расскажите о своём опыте и почему вы подходите для этой задачи..."
                    className="input-field resize-none h-24"
                  />
                </div>
                <button onClick={submitOffer} disabled={loading} className="btn-primary w-full">
                  {loading ? "Отправка..." : "Отправить отклик"}
                </button>
              </div>
            </div>
          )}

          {userOffer && (
            <div className="card border-green-200 bg-green-50">
              <div className="flex items-center gap-2 text-green-700">
                <span className="text-xl">✅</span>
                <div>
                  <div className="font-semibold">Вы откликнулись</div>
                  <div className="text-sm">Ваша цена: {userOffer.price} сомони · Статус: {userOffer.status === "PENDING" ? "Ожидание" : userOffer.status === "ACCEPTED" ? "Принят" : "Отклонён"}</div>
                </div>
              </div>
            </div>
          )}

          {!session && task.status === "OPEN" && (
            <div className="card text-center">
              <p className="text-slate-600 mb-3">Войдите, чтобы откликнуться на задачу</p>
              <Link href="/login" className="btn-primary">Войти</Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Creator card */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Заказчик</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-[#14A800] text-xl font-bold">
                {task.creator.name[0]}
              </div>
              <div>
                <Link href={`/profile/${task.creator.id}`} className="font-semibold text-slate-800 hover:text-[#14A800]">
                  {task.creator.name}
                </Link>
                <div className="text-sm text-slate-500">📍 {task.creator.city}</div>
                {task.creator.rating > 0 && (
                  <div className="text-sm text-amber-500">★ {task.creator.rating.toFixed(1)} ({task.creator.reviewCount})</div>
                )}
              </div>
            </div>
            {task.creator.bio && (
              <p className="text-sm text-slate-500 line-clamp-3">{task.creator.bio}</p>
            )}
          </div>

          {/* Executor card */}
          {task.executor && (
            <div className="card border-blue-100">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Исполнитель</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                  {task.executor.name[0]}
                </div>
                <div>
                  <Link href={`/profile/${task.executor.id}`} className="font-semibold text-slate-800 hover:text-[#14A800]">
                    {task.executor.name}
                  </Link>
                  {task.executor.rating > 0 && (
                    <div className="text-sm text-amber-500">★ {task.executor.rating.toFixed(1)}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
