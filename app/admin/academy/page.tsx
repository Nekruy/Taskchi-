"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AcademyTabs } from "./AcademyTabs";

type Status = "PENDING" | "APPROVED" | "REJECTED";

interface Row {
  id: string;
  status: Status;
  workUrl: string | null;
  comment: string | null;
  createdAt: string;
  reviewedAt: string | null;
  feedback: string | null;
  user: { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null };
  track: { slug: string; titleRu: string };
  progress: { completed: number; total: number };
}

const TABS: { key: Status; label: string }[] = [
  { key: "PENDING", label: "На проверке" },
  { key: "APPROVED", label: "Принятые" },
  { key: "REJECTED", label: "Отклонённые" },
];

const STATUS_CLS: Record<Status, string> = {
  PENDING: "badge-review",
  APPROVED: "badge-open",
  REJECTED: "badge-cancelled",
};
const STATUS_LABEL: Record<Status, string> = {
  PENDING: "На проверке",
  APPROVED: "Принято",
  REJECTED: "Отклонено",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAcademyPage() {
  const [tab, setTab] = useState<Status>("PENDING");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  async function load(status: Status) {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/admin/academy/submissions?status=${status}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error || `Не удалось загрузить список (${res.status})`);
        setRows([]);
        return;
      }
      setRows(data.submissions ?? []);
    } catch {
      setLoadError("Нет связи с сервером");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

  async function review(id: string, action: "APPROVE" | "REJECT") {
    const feedback = (feedbackMap[id] || "").trim();
    if (action === "REJECT" && feedback.length < 10) {
      setActionError((p) => ({ ...p, [id]: "При отклонении укажите причину — минимум 10 символов" }));
      return;
    }
    setActioning(id);
    setActionError((p) => ({ ...p, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/academy/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((p) => ({ ...p, [id]: data.error || `Ошибка ${res.status}` }));
        return;
      }
      setFeedbackMap((p) => ({ ...p, [id]: "" }));
      await load(tab);
      // Обновляем счётчик в сайдбаре
      window.dispatchEvent(new Event("academy:submissions-changed"));
    } catch {
      setActionError((p) => ({ ...p, [id]: "Нет связи с сервером" }));
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Академия — проверка заданий</h1>
      <AcademyTabs />
      <p className="text-sm text-gray-500 mb-6">
        Принятая работа открывает ученику категорию трека и бейдж «Taskchi Academy».
      </p>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key ? "bg-[#14A800] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
        </div>
      ) : loadError ? (
        <div className="card text-center py-12">
          <p className="text-red-600 font-semibold mb-3">{loadError}</p>
          <button type="button" onClick={() => load(tab)} className="btn-secondary">
            Повторить
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🎓</div>
          <p>Работ не найдено</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="card">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {row.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.user.avatarUrl} alt={row.user.name} className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-brand text-white font-bold flex items-center justify-center">
                      {row.user.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/profile/${row.user.id}`} className="font-bold text-gray-900 hover:text-[#14A800]">
                        {row.user.name}
                      </Link>
                      <span className={STATUS_CLS[row.status]}>{STATUS_LABEL[row.status]}</span>
                    </div>
                    <div className="text-sm text-gray-500 space-x-3 mt-0.5">
                      {row.user.phone && <span>📱 {row.user.phone}</span>}
                      <span>✉️ {row.user.email}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <Link href={`/academy/${row.track.slug}`} className="font-semibold text-gray-800 hover:text-[#14A800]">
                    {row.track.titleRu}
                  </Link>
                  <div className="text-gray-500 mt-0.5">
                    {row.progress.completed}/{row.progress.total} уроков
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700 space-y-1.5 mb-4">
                <div>
                  <span className="text-gray-500">Сдано:</span> {fmt(row.createdAt)}
                  {row.reviewedAt && (
                    <>
                      {" · "}
                      <span className="text-gray-500">Проверено:</span> {fmt(row.reviewedAt)}
                    </>
                  )}
                </div>
                {row.workUrl ? (
                  <div>
                    <a href={row.workUrl} target="_blank" rel="noopener noreferrer" className="btn-outline py-1.5 px-4 text-xs">
                      Открыть работу ↗
                    </a>
                  </div>
                ) : (
                  <div className="text-gray-400">Ссылка на работу не указана</div>
                )}
                {row.comment && (
                  <div>
                    <span className="text-gray-500">Комментарий ученика:</span> {row.comment}
                  </div>
                )}
                {row.feedback && row.status !== "PENDING" && (
                  <div>
                    <span className="text-gray-500">Комментарий проверяющего:</span> {row.feedback}
                  </div>
                )}
              </div>

              {row.status === "PENDING" && (
                <div className="border-t border-gray-100 pt-4">
                  <textarea
                    value={feedbackMap[row.id] || ""}
                    onChange={(e) => setFeedbackMap((p) => ({ ...p, [row.id]: e.target.value }))}
                    rows={2}
                    maxLength={2000}
                    placeholder="Комментарий ученику — обязателен при отклонении (мин. 10 символов)"
                    className="input-field text-sm mb-3 resize-y"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => review(row.id, "APPROVE")}
                      disabled={actioning === row.id}
                      className="btn-primary flex-1"
                    >
                      {actioning === row.id ? "..." : "✓ Принять"}
                    </button>
                    <button
                      type="button"
                      onClick={() => review(row.id, "REJECT")}
                      disabled={actioning === row.id}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-[20px] text-sm font-bold transition-colors"
                    >
                      {actioning === row.id ? "..." : "✗ Отклонить"}
                    </button>
                  </div>
                  {actionError[row.id] && <p className="text-sm text-red-600 mt-2">{actionError[row.id]}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
