"use client";

import { useEffect, useState } from "react";

type VerifStatus = "PENDING" | "APPROVED" | "REJECTED";

interface VerifItem {
  id: string;
  status: VerifStatus;
  type: string;
  passportPhoto: string | null;
  selfiePhoto: string | null;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; name: string; phone: string | null; email: string };
}

function PhotoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Документ"
        className="max-w-full max-h-[90vh] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="absolute top-4 right-4 text-white text-2xl bg-black/40 w-10 h-10 rounded-full hover:bg-black/60"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "", label: "Все" },
  { key: "PENDING", label: "На проверке" },
  { key: "APPROVED", label: "Одобрены" },
  { key: "REJECTED", label: "Отклонены" },
];

export default function AdminVerificationPage() {
  const [tab, setTab] = useState("");
  const [items, setItems] = useState<VerifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/verification${tab ? `?status=${tab}` : ""}`);
    const data = await res.json();
    setItems(data.verifications ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function action(id: string, act: "approve" | "reject") {
    setActioning(id);
    await fetch(`/api/admin/verification/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, adminNote: noteMap[id] || "" }),
    });
    await load();
    setActioning(null);
  }

  const statusBadge = (s: VerifStatus) => {
    const m = {
      PENDING: "bg-amber-100 text-amber-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    const l = { PENDING: "На проверке", APPROVED: "Одобрена", REJECTED: "Отклонена" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m[s]}`}>{l[s]}</span>;
  };

  return (
    <div className="p-6 max-w-5xl">
      {photoModal && <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Верификация исполнителей</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? "bg-[#14A800] text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
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
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>Заявок не найдено</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{item.user.name}</span>
                    {statusBadge(item.status)}
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                      {item.type === "CHILDREN" ? "👶 Детские задачи" : "Базовая"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-x-3">
                    {item.user.phone && <span>📱 {item.user.phone}</span>}
                    <span>✉️ {item.user.email}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Подано: {new Date(item.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {item.passportPhoto ? (
                  <button
                    onClick={() => setPhotoModal(item.passportPhoto!)}
                    className="relative group rounded-xl overflow-hidden border border-gray-100 hover:border-[#14A800] transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.passportPhoto} alt="Паспорт" className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-lg">
                        🔍 Открыть
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                      Паспорт
                    </div>
                  </button>
                ) : (
                  <div className="h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    Нет фото паспорта
                  </div>
                )}

                {item.selfiePhoto ? (
                  <button
                    onClick={() => setPhotoModal(item.selfiePhoto!)}
                    className="relative group rounded-xl overflow-hidden border border-gray-100 hover:border-[#14A800] transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.selfiePhoto} alt="Селфи" className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-lg">
                        🔍 Открыть
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                      Селфи
                    </div>
                  </button>
                ) : (
                  <div className="h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    Нет селфи
                  </div>
                )}
              </div>

              {/* Note + actions */}
              {item.status === "PENDING" && (
                <div className="border-t border-gray-100 pt-4">
                  <input
                    type="text"
                    placeholder="Комментарий при отклонении (необязательно)"
                    value={noteMap[item.id] || ""}
                    onChange={(e) => setNoteMap((p) => ({ ...p, [item.id]: e.target.value }))}
                    className="input-field text-sm mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => action(item.id, "approve")}
                      disabled={actioning === item.id}
                      className="flex-1 py-2.5 bg-[#14A800] hover:bg-[#0d8c00] text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      {actioning === item.id ? "..." : "✓ Одобрить"}
                    </button>
                    <button
                      onClick={() => action(item.id, "reject")}
                      disabled={actioning === item.id}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      {actioning === item.id ? "..." : "✗ Отклонить"}
                    </button>
                  </div>
                </div>
              )}

              {item.status !== "PENDING" && item.adminNote && (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <p className="text-sm text-gray-500">
                    <strong>Комментарий:</strong> {item.adminNote}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
