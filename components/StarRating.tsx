"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  const sizeClass = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${sizeClass} transition-colors ${
            star <= (hover || value)
              ? "text-amber-400"
              : "text-slate-300"
          } ${!readonly ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
