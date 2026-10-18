import type { Metadata } from "next";
import Link from "next/link";
import { requireLearnSession } from "@/lib/learn-session";
import { getCourseCards, formatDateRu } from "@/lib/learn";
import { AssignmentFeedback } from "./AssignmentFeedback";

export const metadata: Metadata = { title: "Задания — Моя учёба" };

const BADGE: Record<string, { label: string; cls: string }> = {
  READY: { label: "Готово к сдаче", cls: "badge-progress" },
  PENDING: { label: "На проверке", cls: "badge-review" },
  APPROVED: { label: "Принято ✓", cls: "badge-open" },
  REJECTED: { label: "На доработку", cls: "badge-cancelled" },
};

export default async function AssignmentsPage() {
  const session = await requireLearnSession("/learn/assignments");
  const rows = (await getCourseCards(session.user.id)).filter((c) => c.submission !== "NONE");

  return (
    <div>
      <h1 className="section-title text-3xl mb-1">Задания</h1>
      <p className="text-gray-500 text-sm mb-6">Итоговые работы по курсам: сданные и готовые к сдаче</p>

      {rows.length === 0 ? (
        <div className="card text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p className="font-semibold text-gray-600">Заданий пока нет</p>
          <p className="text-sm mt-1">Задание откроется, когда пройдёте все уроки курса</p>
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2.5">Курс</th>
                <th className="px-4 py-2.5">Статус</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Дата</th>
                <th className="px-4 py-2.5">Обратная связь</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => {
                const b = BADGE[c.submission];
                return (
                  <tr key={c.enrollmentId} className="align-top">
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.titleRu}</td>
                    <td className="px-4 py-3"><span className={b.cls}>{b.label}</span></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.submissionDate ? formatDateRu(new Date(c.submissionDate)) : "—"}</td>
                    <td className="px-4 py-3 max-w-md"><AssignmentFeedback text={c.feedback} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {c.taskLessonId && <Link href={`/academy/${c.slug}/${c.taskLessonId}`} className="btn-secondary py-1.5 px-3 text-xs">Открыть</Link>}
                        {c.status === "COMPLETED" && <Link href={`/learn/certificate/${c.enrollmentId}`} className="btn-primary py-1.5 px-3 text-xs">Сертификат</Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
