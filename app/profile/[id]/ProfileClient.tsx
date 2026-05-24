"use client";

import { useState } from "react";
import { Session } from "next-auth";
import Link from "next/link";
import { CATEGORY_MAP, PROFESSION_MAP } from "@/lib/categories";

// ─── Constants ────────────────────────────────────────────────────────────────

const EDUCATION_LABELS: Record<string, string> = {
  SCHOOL:     "Среднее образование",
  COLLEGE:    "Среднее специальное",
  UNIVERSITY: "Высшее образование",
  MASTERS:    "Магистратура",
  COURSES:    "Курсы / самообразование",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  about?: string | null;
  headline?: string | null;
  city: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isChildVerified: boolean;
  createdAt: Date | string;
  phone?: string | null;
  telegramHandle?: string | null;
  role: string;
  skills: string[];
  workArea?: string | null;
  passportStatus: string;
  // New executor profile fields
  lastName?: string | null;
  gender?: string | null;
  birthDate?: Date | string | null;
  education?: string | null;
  educationField?: string | null;
  extraSkills?: string[];
  hasCar?: boolean;
  workWeekends?: boolean;
  profession?: string | null;
  verification?: { status: string } | null;
  tasksExecuted: Array<{
    id: string;
    title: string;
    category: string;
    budget: number;
    updatedAt: Date | string;
  }>;
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    taskId: string;
    createdAt: Date | string;
    giver: { id: string; name: string; avatar?: string | null };
  }>;
}

interface ProfileClientProps {
  user: UserProfile;
  session: Session | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-amber-400 font-semibold shrink-0 w-6 text-right">{rating}★</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-400 shrink-0 w-5 text-right text-xs">{count}</span>
    </div>
  );
}

function Avatar({ src, name, size = "lg" }: { src?: string | null; name: string; size?: "sm" | "lg" }) {
  const cls = size === "lg"
    ? "w-20 h-20 text-3xl rounded-2xl"
    : "w-9 h-9 text-sm rounded-full";
  return (
    <div className={`${cls} bg-green-100 flex items-center justify-center text-[#14A800] font-bold shrink-0 overflow-hidden`}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : name[0]?.toUpperCase()
      }
    </div>
  );
}

/** Calculate age from birthDate */
function calcAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const bd  = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return age > 0 && age < 100 ? age : null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileClient({ user, session }: ProfileClientProps) {
  const isOwn      = session?.user?.id === user.id;
  const viewerRole = (session?.user as { role?: string } | null)?.role;
  const isCustomer = viewerRole === "CUSTOMER";
  const [copied, setCopied] = useState(false);

  const stars = [1, 2, 3, 4, 5];
  const isVerifiedByPassport = user.passportStatus === "APPROVED";

  // Build review lookup: taskId → review
  const reviewByTaskId = new Map(user.reviewsReceived.map((r) => [r.taskId, r]));

  // Rating breakdown
  const ratingBreakdown = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: user.reviewsReceived.filter((rev) => rev.rating === r).length,
  }));

  // About text: prefer `about` (executor-specific), fall back to `bio`
  const aboutText = user.about || user.bio;

  // Computed extras
  const age       = calcAge(user.birthDate);
  const profInfo  = user.profession ? PROFESSION_MAP[user.profession] : null;
  const eduLabel  = user.education  ? EDUCATION_LABELS[user.education] ?? user.education : null;

  async function shareProfile() {
    const url = `https://taskchi-production.up.railway.app/profile/${user.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте ссылку:", url);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

      {/* ══ HERO CARD ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <Avatar src={user.avatar} name={user.name} size="lg" />

          <div className="flex-1 min-w-0">
            {/* Name + verified badge */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {user.name}{user.lastName ? ` ${user.lastName}` : ""}
                </h1>
                {user.headline && (
                  <p className="text-sm text-gray-600 mt-0.5">{user.headline}</p>
                )}
                {/* Profession badge */}
                {profInfo && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                    {profInfo.emoji} {profInfo.label}
                  </span>
                )}
              </div>
              {isVerifiedByPassport && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold shrink-0">
                  ✓ Верифицирован
                </span>
              )}
            </div>

            {/* Meta: city, workArea, age, gender, memberSince */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
              <span>📍 {user.city}</span>
              {user.workArea && <span>🗺 {user.workArea}</span>}
              {age && (
                <span>
                  {user.gender === "FEMALE" ? "👩" : user.gender === "MALE" ? "👨" : "👤"} {age} лет
                </span>
              )}
              <span>
                📅 С {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                  month: "long", year: "numeric",
                })}
              </span>
            </div>

            {/* Skills tags */}
            {user.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {user.skills.map((skill) => {
                  const cat = CATEGORY_MAP[skill];
                  return (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold"
                    >
                      {cat?.emoji ?? "🔧"} {cat?.label ?? skill}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Extra skill tags */}
            {(user.extraSkills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {user.hasCar && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                    🚗 Есть авто
                  </span>
                )}
                {user.workWeekends && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                    📅 Работает в выходные
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        {(eduLabel || user.educationField) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
            <span>🎓</span>
            <span>
              {eduLabel}{user.educationField ? ` · ${user.educationField}` : ""}
            </span>
          </div>
        )}

        {/* About text */}
        {aboutText && (
          <p className="mt-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
            {aboutText}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={shareProfile}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? "✅ Скопировано!" : "🔗 Поделиться резюме"}
          </button>

          {/* "Написать" only for logged-in customers viewing someone else's profile */}
          {session && isCustomer && !isOwn && (
            <Link
              href={`/tasks/create`}
              className="flex items-center gap-2 px-4 py-2 bg-[#14A800] text-white rounded-xl text-sm font-semibold hover:bg-[#0d8c00] transition-colors"
            >
              ✉️ Написать
            </Link>
          )}

          {isOwn && (
            <Link
              href="/executor"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ✏️ Редактировать резюме
            </Link>
          )}

          {user.telegramHandle && (
            <a
              href={`https://t.me/${user.telegramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-blue-200 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              💬 Telegram
            </a>
          )}
        </div>
      </div>

      {/* ══ STATS BAR ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{user.tasksExecuted.length}</p>
          <p className="text-xs text-gray-500 mt-1 leading-tight">Выполнено задач</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-amber-400 text-lg leading-none">★</span>
            <span className="text-2xl font-bold text-gray-900">
              {user.rating > 0 ? user.rating.toFixed(1) : "—"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Рейтинг</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{user.reviewCount}</p>
          <p className="text-xs text-gray-500 mt-1">Отзывов</p>
        </div>
      </div>

      {/* ══ PORTFOLIO ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Выполненные задачи</h2>

        {user.tasksExecuted.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p className="text-3xl mb-2">📋</p>
            Пока нет выполненных задач
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {user.tasksExecuted.map((task) => {
              const review = reviewByTaskId.get(task.id);
              const cat    = CATEGORY_MAP[task.category];
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block border border-gray-100 rounded-xl p-4 hover:border-[#14A800] hover:shadow-sm transition-all"
                >
                  {/* Category */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-lg leading-none">{cat?.emoji ?? "📋"}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {cat?.label ?? task.category}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-snug">
                    {task.title}
                  </p>

                  {/* Budget */}
                  <p className="text-[#14A800] font-bold text-sm">
                    {task.budget.toLocaleString("ru-RU")} сом
                  </p>

                  {/* Review */}
                  {review && (
                    <div className="border-t border-gray-100 pt-2.5 mt-2.5 space-y-1">
                      <div className="flex items-center gap-0.5">
                        {stars.map((s) => (
                          <span key={s} className={`text-xs ${s <= review.rating ? "text-amber-400" : "text-gray-200"}`}>★</span>
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{review.rating}/5</span>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(task.updatedAt).toLocaleDateString("ru-RU", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ REVIEWS ════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Отзывы ({user.reviewCount})
        </h2>

        {user.reviewsReceived.length > 0 && (
          <div className="flex gap-6 mb-6 pb-5 border-b border-gray-100">
            {/* Average score */}
            <div className="text-center shrink-0">
              <p className="text-4xl font-bold text-gray-900">{user.rating.toFixed(1)}</p>
              <div className="flex justify-center gap-0.5 my-1.5">
                {stars.map((s) => (
                  <span key={s} className={`text-base ${s <= Math.round(user.rating) ? "text-amber-400" : "text-gray-200"}`}>★</span>
                ))}
              </div>
              <p className="text-xs text-gray-400">{user.reviewCount} отзывов</p>
            </div>

            {/* Star breakdown bars */}
            <div className="flex-1 space-y-1.5 justify-center flex flex-col">
              {ratingBreakdown.map(({ rating, count }) => (
                <StarBar key={rating} rating={rating} count={count} total={user.reviewCount} />
              ))}
            </div>
          </div>
        )}

        {user.reviewsReceived.length > 0 ? (
          <div className="space-y-4">
            {user.reviewsReceived.map((review) => (
              <div key={review.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-start gap-2.5">
                  <Avatar src={review.giver.avatar} name={review.giver.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/profile/${review.giver.id}`}
                        className="text-sm font-semibold text-gray-800 hover:text-[#14A800]"
                      >
                        {review.giver.name}
                      </Link>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric", month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5 mb-1">
                      {stars.map((s) => (
                        <span key={s} className={`text-xs ${s <= review.rating ? "text-amber-400" : "text-gray-200"}`}>★</span>
                      ))}
                      <span className="text-xs text-gray-400 ml-1">{review.rating}/5</span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-2">💬</p>
            Пока нет отзывов
          </div>
        )}
      </div>
    </div>
  );
}
