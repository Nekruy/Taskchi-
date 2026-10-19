import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  LESSON_LIST_SELECT,
  LESSON_TYPE_ICON,
  LESSON_TYPE_LABEL,
  SUBMISSION_STUDENT_SELECT,
  countMissingLessons,
  extractYoutubeId,
  getEnrollment,
  getLessonBlocksForUser,
  quizStatusByLesson,
  toStudentSubmission,
} from "@/lib/academy";
import { Markdown } from "@/components/Markdown";
import { QuizBlock } from "@/components/academy/QuizBlock";
import { TextBlockDone } from "@/components/academy/TextBlockDone";
import type { ClientQuizData } from "@/lib/academy-blocks";
import { LessonNavClient } from "./LessonNavClient";
import { SubmissionClient } from "./SubmissionClient";
import { MentorChat } from "@/components/academy/MentorChat";
import { SavePromptButton } from "@/components/learn/SavePromptButton";
import { LessonNotes } from "@/components/learn/LessonNotes";
import { MENTOR_NAME } from "@/lib/academy";

export const dynamic = "force-dynamic";

interface Params {
  params: { slug: string; lessonId: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: { titleRu: true, track: { select: { titleRu: true } } },
  });
  if (!lesson) return { title: "Урок не найден" };
  return { title: `${lesson.titleRu} — ${lesson.track.titleRu}` };
}

/* ── Контент по типу урока ─────────────────────────────────────── */
function LessonBody({
  lesson,
  submissionPanel,
}: {
  lesson: { type: string; externalUrl: string | null; contentMd: string | null; titleRu: string };
  submissionPanel?: React.ReactNode;
}) {
  if (lesson.type === "EXTERNAL") {
    const url = lesson.externalUrl ?? "";
    const ytId = extractYoutubeId(url);
    if (ytId && ytId.startsWith("PLACEHOLDER")) {
      return (
        <div className="aspect-video rounded-2xl bg-gray-900 text-white flex flex-col items-center justify-center gap-2 text-center px-6">
          <span className="text-4xl">🎬</span>
          <p className="font-semibold">Видео скоро появится</p>
          <p className="text-sm text-gray-300">Мы монтируем этот урок. Пока можно переходить к следующему.</p>
        </div>
      );
    }
    if (ytId) {
      return (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
            title={lesson.titleRu}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    }
    return (
      <div className="card text-center py-10">
        <div className="text-4xl mb-3">🔗</div>
        <p className="text-gray-600 mb-4">Материал урока открывается на внешнем сайте</p>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Открыть материал ↗
          </a>
        ) : (
          <p className="text-sm text-gray-400">Ссылка пока не добавлена</p>
        )}
      </div>
    );
  }

  if (lesson.type === "TEXT") {
    return lesson.contentMd ? (
      <div className="card md:p-8">
        <Markdown content={lesson.contentMd} />
      </div>
    ) : (
      <div className="card text-center py-10 text-gray-400">Текст урока пока не добавлен</div>
    );
  }

  if (lesson.type === "TASK") {
    return (
      <div className="space-y-4">
        {lesson.contentMd && (
          <div className="card md:p-8">
            <Markdown content={lesson.contentMd} />
          </div>
        )}
        {submissionPanel}
      </div>
    );
  }

  // VIDEO — прямая ссылка на mp4 / HLS, HTML5-плеер
  if (lesson.type === "VIDEO" && lesson.externalUrl) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        <video controls playsInline preload="metadata" src={lesson.externalUrl} className="w-full h-full">
          Ваш браузер не поддерживает видео.{" "}
          <a href={lesson.externalUrl} className="underline">Скачать файл</a>
        </video>
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-2xl bg-gray-900 text-white flex flex-col items-center justify-center gap-2">
      <span className="text-4xl">🎬</span>
      <p className="font-semibold">Видео скоро</p>
    </div>
  );
}

export default async function LessonPage({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/academy/${params.slug}/${params.lessonId}`)}`);
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: {
      track: {
        select: {
          id: true,
          slug: true,
          titleRu: true,
          taskCategory: true,
          isPublished: true,
          lessons: { select: LESSON_LIST_SELECT, orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!lesson || !lesson.track.isPublished || lesson.track.slug !== params.slug) notFound();

  const enrollment = await getEnrollment(session.user.id, lesson.track.id);
  if (!enrollment) redirect(`/academy/${lesson.track.slug}`);

  const completed = new Set(enrollment.completedLessonIds);
  const lessons = lesson.track.lessons;

  // Этап 6: блоки урока + статус тестов по всем урокам трека (для отметок «✓ тест»)
  const [blocks, quizStatus] = await Promise.all([
    getLessonBlocksForUser(lesson.id, session.user.id),
    quizStatusByLesson(lessons.map((l) => l.id), session.user.id),
  ]);
  const hasTextBlock = blocks.some((b) => b.type === "TEXT");
  const showLegacyBody = !(hasTextBlock && (lesson.type === "TEXT" || lesson.type === "TASK")); // contentMd не дублируем
  const requiredBlocks = blocks.filter((b) => b.required);
  const quizGate = { required: requiredBlocks.length > 0, passed: requiredBlocks.every((b) => b.done) };
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const prevId = idx > 0 ? lessons[idx - 1].id : null;
  const nextId = idx < lessons.length - 1 ? lessons[idx + 1].id : null;
  const done = lessons.filter((l) => completed.has(l.id)).length;
  const percent = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;

  // Этап 5: заметка ученика к уроку
  const note = await prisma.lessonNote.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId: lesson.id } },
    select: { content: true },
  });

  // Этап 2: для урока TASK — состояние сдачи задания
  let submissionPanel: React.ReactNode = null;
  if (lesson.type === "TASK") {
    const submission = await prisma.submission.findUnique({
      where: { enrollmentId: enrollment.id },
      select: SUBMISSION_STUDENT_SELECT,
    });
    submissionPanel = (
      <SubmissionClient
        slug={lesson.track.slug}
        category={lesson.track.taskCategory}
        initialSubmission={submission ? toStudentSubmission(submission) : null}
        missingLessons={countMissingLessons(lessons, enrollment.completedLessonIds)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 min-w-0">
        <Link href="/academy" className="hover:text-[#14A800] shrink-0">Академия</Link>
        <span>›</span>
        <Link href={`/academy/${lesson.track.slug}`} className="hover:text-[#14A800] truncate">
          {lesson.track.titleRu}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
        {/* ── Контент ── */}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#14A800] mb-1">
            Урок {lesson.order} из {lessons.length} · {LESSON_TYPE_LABEL[lesson.type]}
            {lesson.durationMin ? ` · ${lesson.durationMin} мин` : ""}
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight mb-5">
            {lesson.titleRu}
          </h1>

          {showLegacyBody && <LessonBody lesson={lesson} submissionPanel={submissionPanel} />}

          {/* Этап 6: блоки по порядку */}
          {blocks.length > 0 && (
            <div className="space-y-4 mt-4">
              {blocks.map((b) => {
                if (b.type === "QUIZ") {
                  const p = b.progress?.data;
                  return (
                    <QuizBlock
                      key={b.id}
                      blockId={b.id}
                      data={b.data as ClientQuizData}
                      required={b.required}
                      initial={b.progress && p ? { score: p.score ?? 0, total: p.total ?? (b.data as ClientQuizData).total, passed: !!p.passed, attempts: b.progress.attempts } : null}
                    />
                  );
                }
                if (b.type === "TEXT") {
                  return (
                    <div key={b.id} className="card md:p-8">
                      <Markdown content={String((b.data as { md: string }).md ?? "")} />
                      <TextBlockDone blockId={b.id} initialDone={!!b.progress} />
                    </div>
                  );
                }
                const url = String((b.data as { url: string }).url ?? "");
                const yt = extractYoutubeId(url);
                return (
                  <div key={b.id}>
                    {yt ? (
                      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                        <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`} title="Видео" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                        <video controls playsInline preload="metadata" src={url} className="w-full h-full" />
                      </div>
                    )}
                    <TextBlockDone blockId={b.id} initialDone={!!b.progress} />
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <SavePromptButton lessonId={lesson.id} lessonTitle={lesson.titleRu} source="PRACTICE" />
          </div>
          <LessonNotes lessonId={lesson.id} initialContent={note?.content ?? ""} />

          <LessonNavClient
            slug={lesson.track.slug}
            lessonId={lesson.id}
            prevLessonId={prevId}
            nextLessonId={nextId}
            initiallyCompleted={completed.has(lesson.id)}
            quizRequired={quizGate.required}
            quizPassedInitially={quizGate.passed}
          />
        </div>

        {/* ── Sidebar ── */}
        <aside className="card p-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-bold text-gray-900">Прогресс</span>
            <span className="text-gray-500">
              {done}/{lessons.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
            <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${percent}%` }} />
          </div>

          <ol className="space-y-0.5">
            {lessons.map((l) => {
              const active = l.id === lesson.id;
              const isDone = completed.has(l.id);
              return (
                <li key={l.id}>
                  <Link
                    href={`/academy/${lesson.track.slug}/${l.id}`}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors ${
                      active ? "bg-primary-50 text-[#14A800] font-semibold" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isDone ? "bg-[#14A800] text-white" : active ? "bg-white text-[#14A800]" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isDone ? "✓" : l.order}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{l.titleRu}</span>
                    {quizStatus.get(l.id)?.quizPassed && <span className="text-[10px] font-semibold text-[#14A800] shrink-0" title="Тест сдан">✓ тест</span>}
                    <span className="text-xs text-gray-400 shrink-0">{LESSON_TYPE_ICON[l.type]}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>

      {/* ИИ-наставник — только для записанных (страница выше уже требует сессию и запись) */}
      <MentorChat lessonId={lesson.id} lessonTitle={lesson.titleRu} mentorName={MENTOR_NAME} />
    </div>
  );
}
