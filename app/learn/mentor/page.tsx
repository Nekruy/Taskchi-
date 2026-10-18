import type { Metadata } from "next";
import Link from "next/link";
import { requireLearnSession } from "@/lib/learn-session";
import { getMentorDialogs } from "@/lib/learn";
import { MENTOR_NAME } from "@/lib/academy";

export const metadata: Metadata = { title: "Разговоры с Устодом — Моя учёба" };

export default async function LearnMentorPage() {
  const session = await requireLearnSession("/learn/mentor");
  const dialogs = await getMentorDialogs(session.user.id);

  return (
    <div>
      <h1 className="section-title text-3xl mb-1">Разговоры с {MENTOR_NAME}ом</h1>
      <p className="text-gray-500 text-sm mb-6">По одному диалогу на урок. Откройте урок — чат продолжится с историей</p>
      {dialogs.length === 0 ? (
        <div className="card text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">🎓</div>
          <p className="font-semibold text-gray-600">Разговоров пока нет</p>
          <p className="text-sm mt-1">Кнопка «Спросить {MENTOR_NAME}а» есть на каждом уроке</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dialogs.map((d) => (
            <Link key={d.lessonId} href={`/academy/${d.slug}/${d.lessonId}`} className="card-lift flex items-start gap-4">
              <span className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg shrink-0">🎓</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{d.trackTitle} › Урок {d.lessonOrder}</p>
                <p className="font-bold text-gray-900 truncate">{d.lessonTitle}</p>
                <p className="text-sm text-gray-600 truncate mt-1">{d.lastPreview}</p>
              </div>
              <div className="text-right text-xs text-gray-400 shrink-0">
                <p>{d.count} сообщ.</p>
                <p>{new Date(d.lastAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
