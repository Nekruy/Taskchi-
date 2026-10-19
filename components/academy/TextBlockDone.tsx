"use client";

import { useState } from "react";

/** Кнопка «Дальше» под TEXT/VIDEO-блоком: отмечает блок завершённым. */
export function TextBlockDone({ blockId, initialDone }: { blockId: string; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone);
  const [loading, setLoading] = useState(false);
  async function mark() {
    setLoading(true);
    try {
      const res = await fetch(`/api/academy/blocks/${blockId}/complete`, { method: "POST" });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex justify-end mt-2">
      {done ? (
        <span className="text-xs text-[#14A800] font-semibold">✓ Прочитано</span>
      ) : (
        <button type="button" onClick={mark} disabled={loading} className="btn-secondary py-1.5 px-4 text-xs">
          {loading ? "..." : "Дальше ↓"}
        </button>
      )}
    </div>
  );
}
