"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DisputeActionsProps {
  disputeId: string;
}

export function DisputeActions({ disputeId }: DisputeActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const doAction = async (action: string, resolution?: string) => {
    setLoading(true);
    try {
      await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resolution }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleResolveCustomer = () => {
    const resolution = window.prompt(
      "Введите решение в пользу заказчика (средства будут возвращены):"
    );
    if (resolution === null) return; // cancelled
    doAction("resolve_customer", resolution);
  };

  const handleResolveExecutor = () => {
    const resolution = window.prompt(
      "Введите решение в пользу исполнителя (средства будут выплачены):"
    );
    if (resolution === null) return; // cancelled
    doAction("resolve_executor", resolution || undefined);
  };

  const handleClose = () => {
    if (!confirm("Закрыть спор без решения?")) return;
    doAction("close");
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={handleResolveCustomer}
        disabled={loading}
        className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
      >
        👤 Заказчику
      </button>
      <button
        onClick={handleResolveExecutor}
        disabled={loading}
        className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
      >
        🔧 Исполнителю
      </button>
      <button
        onClick={handleClose}
        disabled={loading}
        className="text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
      >
        ✖️ Закрыть
      </button>
    </div>
  );
}
