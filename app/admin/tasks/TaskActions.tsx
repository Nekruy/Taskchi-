"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

interface TaskActionsProps {
  taskId: string;
}

export function TaskActions({ taskId }: TaskActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Удалить задачу? Это действие необратимо.")) return;

    setLoading(true);
    try {
      await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
      >
        🗑️ Удалить
      </button>
      <Link
        href={`/tasks/${taskId}`}
        className="text-xs bg-[#1D4354]/10 text-[#1D4354] hover:bg-[#1D4354]/20 px-2 py-1 rounded transition-colors"
      >
        📋 Открыть
      </Link>
    </div>
  );
}
