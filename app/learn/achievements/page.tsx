import type { Metadata } from "next";
import Link from "next/link";
import { requireLearnSession } from "@/lib/learn-session";
import { getAchievements, formatDateRu } from "@/lib/learn";

export const metadata: Metadata = { title: "Достижения — Моя учёба" };

export default async function AchievementsPage() {
  const session = await requireLearnSession("/learn/achievements");
  const list = await getAchievements(session.user.id);
  const earned = list.filter((a) => a.earned).length;

  return (
    <div>
      <h1 className="section-title text-3xl mb-1">Достижения</h1>
      <p className="text-gray-500 text-sm mb-6">Получено {earned} из {list.length}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((a) => (
          <div key={a.key} className={`card flex items-start gap-4 ${a.earned ? "border-[#14A800]/30" : "opacity-80"}`}>
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${a.earned ? "bg-primary-50" : "bg-gray-100 grayscale"}`}>{a.icon}</span>
            <div className="min-w-0">
              <h3 className={`font-bold leading-snug ${a.earned ? "text-gray-900" : "text-gray-500"}`}>{a.title}</h3>
              {a.earned ? (
                <p className="text-xs text-[#14A800] font-semibold mt-1">
                  Получено{a.earnedAt ? ` · ${formatDateRu(new Date(a.earnedAt))}` : ""}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Как получить: {a.hint}</p>
              )}
              {a.link && (
                <Link href={a.link} className="text-xs font-semibold text-[#14A800] hover:underline mt-2 inline-block">
                  {a.key.startsWith("graduate:") && a.earned ? "Сертификат →" : a.earned ? "Открыть →" : "Перейти →"}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
