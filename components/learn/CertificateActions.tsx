"use client";

import { useState } from "react";

export function CertificateActions() {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте ссылку:", window.location.href);
    }
  }
  return (
    <div className="flex flex-wrap gap-3 no-print">
      <button type="button" onClick={share} className="btn-primary">
        {copied ? "✓ Ссылка скопирована" : "Поделиться"}
      </button>
      <button type="button" onClick={() => window.print()} className="btn-outline">
        Скачать PDF
      </button>
    </div>
  );
}
