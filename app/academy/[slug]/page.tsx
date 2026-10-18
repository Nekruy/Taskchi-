import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { CATEGORY_MAP } from "@/lib/categories";
import {
  LESSON_LIST_SELECT,
  LESSON_TYPE_ICON,
  LESSON_TYPE_LABEL,
  formatMinutes,
  getEnrollment,
  pluralLessons,
} from "@/lib/academy";
import { TrackActionsClient } from "./TrackActionsClient";

export const dynamic = "force-dynamic";

async function loadTrack(slug: string) {
  return prisma.track.findUnique({
    where: { slug },
    include: { lessons: { select: LESSON_LIST_SELECT, orderBy: { order: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const track = await prisma.track.findUnique({
    where: { slug: params.slug },
    select: { titleRu: true, descriptionRu: true, isPublished: true },
  });
  if (!track || !track.isPublished) return { title: "Курс не найден" };
  return { title: `${track.titleRu} — Академия`, description: track.descriptionRu.slice(0, 160) };
}

export default async function TrackPage({ params }: { params: { slug: string } }) {
  const [track, session] = await Promise.all([loadTrack(params.slug), getServerSession(authOptions)]);
  if (!track || !track.isPublished) notFound();

  const userId = session?.user?.id ?? null;
  const enrollment = userId ? await getEnrollment(userId, track.id) : null;
  const completed = new Set(enrollment?.completedLessonIds ?? []);

  const cat = CATEGORY_MAP[track.taskCategory] ?? { emoji: "📋", label: track.taskCategory };
  const total = track.lessons.length;
  const done = track.lessons.filter((l) => completed.has(l.id)).length;
  const totalMinutes = track.lessons.reduce((s, l) => s + (l.durationMin ?? 0), 0);
  const firstLessonId = track.lessons[0]?.id ?? null;
  const nextLessonId = track.lessons.find((l) => !completed.has(l.id))?.id ?? firstLessonId;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Link href="/academy" className="btn-ghost -ml-3 mb-4 text-gray-500">
        ← Все курсы
      </Link>

      {/* ── Шапка трека ── */}
      <div className="card md:p-8 mb-6 animate-fade-in">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="badge-category">
            <span className="text-sm leading-none">{cat.emoji}</span>
            {cat.label}
          </span>
          <span className="badge-open">Бесплатно</span>
        </div>

        <h1 className="section-title text-3xl md:text-4xl">{track.titleRu}</h1>
        <p className="text-gray-600 leading-relaxed mt-4">{track.descriptionRu}</p>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-5">
          <span>📚 {pluralLessons(total)}</span>
          <span>⏱ ~{totalMinutes > 0 ? formatMinutes(totalMinutes) : `${track.estimatedHours} ч`}</span>
        </div>

        <TrackActionsClient
          slug={track.slug}
          isLoggedIn={!!userId}
          isEnrolled={!!enrollment}
          isCompleted={enrollment?.status === "COMPLETED"}
          firstLessonId={firstLessonId}
          nextLessonId={nextLessonId}
          done={done}
          total={total}
        />
      </div>

      {/* ── Уроки ── */}
      <h2 className="text-xl font-extrabold text-gray-900 mb-3">Программа курса</h2>
      <div className="card p-0 overflow-hidden divide-y divide-[#f0f9f0]">
        {track.lessons.map((l) => {
          const isDone = completed.has(l.id);
          const canOpen = !!enrollment;
          const inner = (
            <>
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  isDone ? "bg-[#14A800] text-white" : "bg-primary-50 text-[#14A800]"
                }`}
              >
                {isDone ? "✓" : l.order}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold leading-snug ${isDone ? "text-gray-500" : "text-gray-900"}`}>
                  {l.titleRu}
                </span>
                <span className="block text-xs text-gray-400 mt-0.5">
                  {LESSON_TYPE_ICON[l.type]} {LESSON_TYPE_LABEL[l.type]}
                  {l.durationMin ? ` · ${l.durationMin} мин` : ""}
                </span>
              </span>
              {canOpen && <span className="text-gray-300 text-lg">›</span>}
            </>
          );
          const cls = "flex items-center gap-3 px-4 py-3.5";
          return canOpen ? (
            <Link key={l.id} href={`/academy/${track.slug}/${l.id}`} className={`${cls} hover:bg-primary-50 transition-colors`}>
              {inner}
            </Link>
          ) : (
            <div key={l.id} className={cls}>
              {inner}
            </div>
          );
        })}
        {track.lessons.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">Уроки скоро появятся</p>
        )}
      </div>
    </div>
  );
}
