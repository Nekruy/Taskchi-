"use client";

import { useState } from "react";

export function AssignmentFeedback({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className="text-gray-400">—</span>;
  const long = text.length > 120;
  return (
    <span className="text-gray-700">
      {open || !long ? text : text.slice(0, 120) + "…"}
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="ml-1 text-[#14A800] text-xs font-semibold hover:underline">
          {open ? "свернуть" : "раскрыть"}
        </button>
      )}
    </span>
  );
}
