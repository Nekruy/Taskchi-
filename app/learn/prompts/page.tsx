import type { Metadata } from "next";
import { requireLearnSession } from "@/lib/learn-session";
import { PromptsClient } from "@/components/learn/PromptsClient";

export const metadata: Metadata = { title: "Мои промпты — Моя учёба" };

export default async function PromptsPage() {
  await requireLearnSession("/learn/prompts");
  return (
    <div>
      <h1 className="section-title text-3xl mb-1">Мои промпты</h1>
      <p className="text-gray-500 text-sm mb-6">Библиотека ваших запросов к ИИ — копируйте и используйте в работе</p>
      <PromptsClient />
    </div>
  );
}
