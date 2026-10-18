import type { Metadata } from "next";
import Link from "next/link";
import { requireLearnSession } from "@/lib/learn-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Заметки — Моя учёба" };

export default async function NotesPage() {
  const session = await requireLearnSession("/learn/notes");
  const notes = await prisma.lessonNote.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, content: true, updatedAt: true, lesson: { select: { id: true, order: true, titleRu: true, track: { select: { slug: true, titleRu: true } } } } },
  });

  return (
    <div>
      <h1 className="section-title text-3xl mb-1">Заметки</h1>
      <p className="text-gray-500 text-sm mb-6">Ваши записи по урокам. Редактируются на странице урока</p>
      {notes.length === 0 ? (
        <div className="card text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p className="font-semibold text-gray-600">Заметок пока нет</p>
          <p className="text-sm mt-1">Блок «Мои заметки» есть под каждым уроком</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Link key={n.id} href={`/academy/${n.lesson.track.slug}/${n.lesson.id}`} className="card-lift block">
              <p className="text-xs text-gray-500 mb-1">
                {n.lesson.track.titleRu} › Урок {n.lesson.order}: {n.lesson.titleRu}
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3">{n.content}</p>
              <p className="text-[11px] text-gray-400 mt-2">{n.updatedAt.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
