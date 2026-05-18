"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
import Link from "next/link";

function VerificationBadge({ isVerified, isChildVerified, pendingVerification }: {
  isVerified: boolean;
  isChildVerified: boolean;
  pendingVerification: boolean;
}) {
  if (isVerified && isChildVerified) {
    return (
      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
          ✓ Верифицирован
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
          👶 Детские задачи
        </span>
      </div>
    );
  }
  if (isVerified) {
    return (
      <div className="flex justify-center mt-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
          ✓ Верифицирован
        </span>
      </div>
    );
  }
  if (pendingVerification) {
    return (
      <div className="flex justify-center mt-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
          ⏳ На проверке
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-center mt-2">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
        Не верифицирован
      </span>
    </div>
  );
}

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    bio?: string | null;
    city: string;
    rating: number;
    reviewCount: number;
    isVerified: boolean;
    isChildVerified: boolean;
    createdAt: Date | string;
    phone?: string | null;
    telegramHandle?: string | null;
    verification?: { status: string } | null;
    tasksCreated: Array<{ id: string; title: string; budget: number; createdAt: Date | string }>;
    tasksExecuted: Array<{ id: string; title: string; budget: number; createdAt: Date | string }>;
    reviewsReceived: Array<{
      id: string;
      rating: number;
      comment?: string | null;
      createdAt: Date | string;
      giver: { id: string; name: string; avatar?: string | null };
    }>;
  };
  session: Session | null;
}

export function ProfileClient({ user, session }: ProfileClientProps) {
  const router = useRouter();
  const isOwn = session?.user.id === user.id;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio || "",
    city: user.city,
    phone: user.phone || "",
    telegramHandle: user.telegramHandle || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/profile/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="md:col-span-1 space-y-4">
          <div className="card text-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-[#14A800] text-3xl font-bold mx-auto mb-3">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                user.name[0]?.toUpperCase()
              )}
            </div>

            <h1 className="text-xl font-bold text-slate-800 mb-1">{user.name}</h1>

            <VerificationBadge
              isVerified={user.isVerified}
              isChildVerified={user.isChildVerified}
              pendingVerification={user.verification?.status === "PENDING"}
            />

            <div className="text-slate-500 text-sm mt-2">📍 {user.city}</div>

            {user.rating > 0 && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {stars.map((s) => (
                  <span key={s} className={s <= Math.round(user.rating) ? "text-amber-400" : "text-slate-300"}>
                    ★
                  </span>
                ))}
                <span className="text-sm text-slate-600 ml-1">
                  {user.rating.toFixed(1)} ({user.reviewCount})
                </span>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              На Taskchi с {new Date(user.createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
            </div>

            {user.telegramHandle && (
              <a
                href={`https://t.me/${user.telegramHandle}`}
                target="_blank"
                className="mt-3 flex items-center justify-center gap-1.5 text-blue-500 hover:text-blue-600 text-sm"
              >
                <span>💬</span> @{user.telegramHandle}
              </a>
            )}

            {isOwn && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setEditing(!editing)}
                  className="btn-secondary text-sm w-full"
                >
                  {editing ? "Отмена" : "✏️ Редактировать"}
                </button>
                {!user.isVerified && user.verification?.status !== "PENDING" && (
                  <Link
                    href="/verify/phone"
                    className="block text-center text-sm w-full py-2 px-3 bg-[#14A800] text-white rounded-xl font-semibold hover:bg-[#0d8c00] transition-colors"
                  >
                    🛡️ Пройти верификацию
                  </Link>
                )}
                {user.verification?.status === "PENDING" && (
                  <Link
                    href="/verify/status"
                    className="block text-center text-sm w-full py-2 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-semibold hover:bg-amber-100 transition-colors"
                  >
                    ⏳ Статус верификации
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="card">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Задач создано</span>
                <span className="font-semibold">{user.tasksCreated.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Задач выполнено</span>
                <span className="font-semibold">{user.tasksExecuted.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Отзывов</span>
                <span className="font-semibold">{user.reviewCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-5">
          {/* Edit form */}
          {isOwn && editing && (
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-4">Редактировать профиль</h2>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Имя</label>
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">О себе</label>
                  <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} className="input-field resize-none h-24" placeholder="Расскажите о себе..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Телефон</label>
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input-field" placeholder="+992..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Telegram</label>
                    <input value={form.telegramHandle} onChange={(e) => update("telegramHandle", e.target.value)} className="input-field" placeholder="username" />
                  </div>
                </div>
                <button onClick={saveProfile} disabled={saving} className="btn-primary w-full">
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}

          {/* Bio */}
          {user.bio && !editing && (
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-2">О себе</h2>
              <p className="text-slate-600 text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Reviews */}
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-4">
              Отзывы ({user.reviewCount})
            </h2>
            {user.reviewsReceived.length > 0 ? (
              <div className="space-y-4">
                {user.reviewsReceived.map((review) => (
                  <div key={review.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-[#14A800] text-sm font-bold">
                        {review.giver.name[0]}
                      </div>
                      <div>
                        <Link href={`/profile/${review.giver.id}`} className="text-sm font-medium text-slate-800 hover:text-[#14A800]">
                          {review.giver.name}
                        </Link>
                        <div className="flex">
                          {stars.map((s) => (
                            <span key={s} className={`text-sm ${s <= review.rating ? "text-amber-400" : "text-slate-300"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <div className="ml-auto text-xs text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-slate-600 ml-10">{review.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm">
                Пока нет отзывов
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
