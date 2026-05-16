"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "./StarRating";

interface ReviewModalProps {
  taskId: string;
  receiverId: string;
  receiverName: string;
  onClose: () => void;
}

export function ReviewModal({ taskId, receiverId, receiverName, onClose }: ReviewModalProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, receiverId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-slide-up">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Оставить отзыв</h2>
        <p className="text-slate-500 text-sm mb-4">О пользователе {receiverName}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Оценка</label>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Комментарий (необязательно)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Расскажите о своём опыте..."
            className="input-field resize-none h-24"
            maxLength={500}
          />
          <div className="text-xs text-slate-400 text-right mt-1">{comment.length}/500</div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button onClick={submit} disabled={loading} className="btn-primary flex-1">
            {loading ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
