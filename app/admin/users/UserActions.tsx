"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

interface UserActionsProps {
  userId: string;
  isVerified: boolean;
  isBanned: boolean;
}

export function UserActions({ userId, isVerified, isBanned }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const doAction = async (action: string) => {
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {!isVerified ? (
        <button
          onClick={() => doAction("verify")}
          disabled={loading}
          className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          ✅ Верифицировать
        </button>
      ) : (
        <button
          onClick={() => doAction("unverify")}
          disabled={loading}
          className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          ❌ Отозвать
        </button>
      )}

      {!isBanned ? (
        <button
          onClick={() => doAction("ban")}
          disabled={loading}
          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          🚫 Заблокировать
        </button>
      ) : (
        <button
          onClick={() => doAction("unban")}
          disabled={loading}
          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          ✅ Разблокировать
        </button>
      )}

      <Link
        href={`/profile/${userId}`}
        className="text-xs bg-[#1D4354]/10 text-[#1D4354] hover:bg-[#1D4354]/20 px-2 py-1 rounded transition-colors"
      >
        👤 Профиль
      </Link>
    </div>
  );
}
