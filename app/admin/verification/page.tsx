"use client";

import { useEffect, useState } from "react";

type PassportStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ExecutorRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passportPhoto: string | null;
  selfiePhoto: string | null;
  passportStatus: PassportStatus;
  passportNote: string | null;
  createdAt: string;
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
        alt="Паспорт"
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

const TABS: { key: string; label: string }[] = [
  { key: "PENDING",  label: "Ожидают" },
  { key: "APPROVED", label: "Одобрены" },
  { key: "REJECTED", label: "Отклонены" },
];

const STATUS_STYLE: Record<PassportStatus, string> = {
  PENDING:  "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<PassportStatus, string> = {
  PENDING: "Ожидает", APPROVED: "Одобрен", REJECTED: "Отклонён",
};

export default function AdminVerificationPage() {
  const [tab, setTab] = useState<string>("PENDING");
  const [rows, setRows] = useState<ExecutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/passport?status=${tab}`);
    const data = await res.json();
    setRows(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function action(id: string, act: "approve" | "reject") {
    setActioning(id);
    await fetch(`/api/admin/passport/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, adminNote: noteMap[id] || "" }),
    });
    await load();
    setActioning(null);
  }

  return (
    <div className="p-6 max-w-5xl">
      {photoModal && <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Верификация исполнителей</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
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
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>Заявок не найдено</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{row.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[row.passportStatus]}`}>
                      {STATUS_LABEL[row.passportStatus]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-x-3">
                    {row.phone && <span>📱 {row.phone}</span>}
                    <span>✉️ {row.email}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Подано: {new Date(row.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { url: row.passportPhoto, label: "Лицевая сторона" },
                  { url: row.selfiePhoto,   label: "Прописка / Селфи" },
                ].map(({ url, label }) =>
                  url ? (
                    <button
                      key={label}
                      onClick={() => setPhotoModal(url)}
                      className="relative group rounded-xl overflow-hidden border border-gray-100 hover:border-[#14A800] transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={label} className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-lg">
                          🔍 Открыть
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                        {label}
                      </div>
                    </button>
                  ) : (
                    <div key={label} className="h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm flex-col gap-1">
                      <span>📷</span>
                      <span className="text-xs">{label}</span>
                    </div>
                  )
                )}
              </div>

              {/* Actions */}
              {row.passportStatus === "PENDING" && (
                <div className="border-t border-gray-100 pt-4">
                  <input
                    type="text"
                    placeholder="Причина отклонения (необязательно)"
                    value={noteMap[row.id] || ""}
                    onChange={(e) => setNoteMap((p) => ({ ...p, [row.id]: e.target.value }))}
                    className="input-field text-sm mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => action(row.id, "approve")}
                      disabled={actioning === row.id}
                      className="flex-1 py-2.5 bg-[#14A800] hover:bg-[#0d8c00] text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      {actioning === row.id ? "..." : "✓ Одобрить"}
                    </button>
                    <button
                      onClick={() => action(row.id, "reject")}
                      disabled={actioning === row.id}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      {actioning === row.id ? "..." : "✗ Отклонить"}
                    </button>
                  </div>
                </div>
              )}

              {row.passportStatus !== "PENDING" && row.passportNote && (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <p className="text-sm text-gray-500">
                    <strong>Комментарий:</strong> {row.passportNote}
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
