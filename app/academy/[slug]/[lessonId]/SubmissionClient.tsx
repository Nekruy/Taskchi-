"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORY_MAP } from "@/lib/categories";
import type { StudentSubmission } from "@/lib/academy";

interface Props {
  slug: string;
  category: string;
  initialSubmission: StudentSubmission | null;
  missingLessons: number;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function SubmissionClient({ slug, category, initialSubmission, missingLessons }: Props) {
  const router = useRouter();
  const [submission, setSubmission] = useState<StudentSubmission | null>(initialSubmission);
  const [editing, setEditing] = useState(false);
  const [workUrl, setWorkUrl] = useState(initialSubmission?.workUrl ?? "");
  const [comment, setComment] = useState(initialSubmission?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cat = CATEGORY_MAP[category] ?? { emoji: "📋", label: category };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/academy/tracks/${slug}/submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workUrl: workUrl.trim(), comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось отправить работу. Попробуйте ещё раз");
        return;
      }
      setSubmission(data.submission);
      setEditing(false);
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет");
    } finally {
      setLoading(false);
    }
  }

  /* ── Уроки не пройдены ── */
  if (missingLessons > 0 && !submission) {
    return (
      <div className="card bg-gray-50 text-center py-8">
        <div className="text-3xl mb-2">🔒</div>
        <p className="font-bold text-gray-700">Сдача откроется после прохождения всех уроков</p>
        <p className="text-sm text-gray-500 mt-1">
          Осталось {missingLessons} {missingLessons === 1 ? "урок" : missingLessons < 5 ? "урока" : "уроков"}
        </p>
      </div>
    );
  }

  /* ── Принято ── */
  if (submission?.status === "APPROVED") {
    return (
      <div className="card border-emerald-200 bg-emerald-50">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="badge-open">Принято</span>
          <span className="text-sm text-gray-500">{fmtDate(submission.reviewedAt)}</span>
        </div>
        {submission.feedback && (
          <p className="text-sm text-gray-700 mb-3">
            <span className="font-semibold">Комментарий наставника:</span> {submission.feedback}
          </p>
        )}
        <p className="font-bold text-gray-900 mb-4">
          🎓 Вам открыта категория {cat.emoji} {cat.label}
        </p>
        <Link href={`/tasks?category=${category}`} className="btn-primary">
          Смотреть задачи →
        </Link>
      </div>
    );
  }

  /* ── На проверке ── */
  if (submission?.status === "PENDING" && !editing) {
    return (
      <div className="card border-amber-200 bg-amber-50">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="badge-review">На проверке</span>
          <span className="text-sm text-gray-500">отправлено {fmtDate(submission.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Работа:</span>{" "}
          <a href={submission.workUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="text-[#14A800] underline break-all">
            {submission.workUrl}
          </a>
        </p>
        {submission.comment && (
          <p className="text-sm text-gray-700 mt-2">
            <span className="font-semibold">Комментарий:</span> {submission.comment}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-3">Наставник проверит работу и пришлёт уведомление.</p>
      </div>
    );
  }

  /* ── Отклонено (без формы) ── */
  if (submission?.status === "REJECTED" && !editing) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="badge-cancelled">Нужна доработка</span>
          <span className="text-sm text-gray-500">{fmtDate(submission.reviewedAt)}</span>
        </div>
        <p className="text-sm text-gray-800 mb-4">
          <span className="font-semibold">Комментарий наставника:</span> {submission.feedback || "без комментария"}
        </p>
        <button type="button" onClick={() => setEditing(true)} className="btn-primary">
          Пересдать
        </button>
      </div>
    );
  }

  /* ── Форма (первая сдача или пересдача) ── */
  return (
    <form onSubmit={submit} className="card md:p-8">
      <h3 className="font-extrabold text-gray-900 text-lg mb-1">
        {submission ? "Пересдать задание" : "Сдать задание"}
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        Приложите ссылку на работу — Google Doc, Google Drive, Figma или любой другой сайт. Доступ по ссылке должен быть открыт.
      </p>
      {submission?.feedback && (
        <p className="text-sm text-gray-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
          <span className="font-semibold">Прошлый комментарий наставника:</span> {submission.feedback}
        </p>
      )}

      <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="workUrl">
        Ссылка на работу
      </label>
      <input
        id="workUrl"
        type="url"
        required
        value={workUrl}
        onChange={(e) => setWorkUrl(e.target.value)}
        placeholder="https://docs.google.com/…"
        className="input-field mb-4"
      />

      <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="comment">
        Комментарий (необязательно)
      </label>
      <textarea
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Что было сложно, какие инструменты использовали"
        className="input-field mb-5 resize-y"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={loading || !workUrl.trim()} className="btn-primary">
          {loading ? "Отправляем..." : "Отправить на проверку"}
        </button>
        {submission && (
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary" disabled={loading}>
            Отмена
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </form>
  );
}
