import type { Metadata } from "next";
import Link from "next/link";
import { requireLearnSession } from "@/lib/learn-session";
import { getOverview, type CourseCard } from "@/lib/learn";
import { CATEGORY_MAP } from "@/lib/categories";
import { PartnerLine } from "@/components/PartnerLine";
import { PlanModalClient } from "@/components/learn/PlanModalClient";

export const metadata: Metadata = { title: "Моя учёба", description: "Учебный кабинет Taskchi Academy" };

const SUBMISSION_BADGE: Record<CourseCard["submission"], { label: string; cls: string } | null> = {
  NONE: { label: "Не сдано", cls: "badge-done" },
  READY: { label: "Готово к сдаче", cls: "badge-progress" },
  PENDING: { label: "На проверке", cls: "badge-review" },
  APPROVED: { label: "Принято ✓", cls: "badge-open" },
  REJECTED: { label: "На доработку", cls: "badge-cancelled" },
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "ученик";
}

export default async function LearnHome() {
  const session = await requireLearnSession("/learn");
  const o = await getOverview(session.user.id);

  /* ── Нет записей: приглашение ── */
  if (o.courses.length === 0) {
    return (
      <div className="card md:p-10 text-center">
        <div className="text-5xl mb-3">🎒</div>
        <h1 className="section-title text-3xl">Привет, {firstName(o.user.name)}!</h1>
        <p className="section-subtitle max-w-xl mx-auto">
          Здесь будет ваш учебный кабинет: прогресс, план занятий, заметки и промпты. Начните с бесплатного курса.
        </p>
        {o.recommended && (
          <div className="card-lift max-w-md mx-auto mt-8 text-left">
            <span className="badge-category mb-3">{CATEGORY_MAP[o.recommended.taskCategory]?.emoji} {CATEGORY_MAP[o.recommended.taskCategory]?.label}</span>
            <h3 className="font-bold text-gray-900 text-lg">{o.recommended.titleRu}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{o.recommended.descriptionRu}</p>
            <p className="text-xs text-gray-400 mt-2">{o.recommended._count.lessons} уроков · ~{o.recommended.estimatedHours} ч{o.recommended.partner ? ` · ${o.recommended.partner.name}` : ""}</p>
            <Link href={`/academy/${o.recommended.slug}`} className="btn-primary w-full mt-4">Начать</Link>
          </div>
        )}
        <Link href="/academy" className="btn-outline mt-6">Все курсы</Link>
      </div>
    );
  }

  const cur = o.current;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
      {/* ── Основное ── */}
      <div className="space-y-6 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="section-title text-3xl">Привет, {firstName(o.user.name)}</h1>
          <span className={`badge text-sm px-3 py-1.5 ${o.streak > 0 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {o.streak > 0 ? `🔥 ${o.streak} ${o.streak === 1 ? "день" : o.streak < 5 ? "дня" : "дней"} подряд` : "Начни серию сегодня"}
          </span>
        </div>

        {/* Продолжить */}
        {cur ? (
          <section className="card md:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#14A800] mb-1">Продолжить</p>
            <h2 className="text-xl font-extrabold text-gray-900">{cur.titleRu}</h2>
            {cur.nextLessonTitle && <p className="text-sm text-gray-500 mt-1">Следующий: урок {cur.nextLessonOrder} · {cur.nextLessonTitle}</p>}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-4 mb-1.5">
              <span>Прогресс</span>
              <span>{cur.done}/{cur.total} · {cur.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
              <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${cur.percent}%` }} />
            </div>
            {cur.submission === "READY" && cur.taskLessonId ? (
              <Link href={`/academy/${cur.slug}/${cur.taskLessonId}`} className="btn-primary">Сдать задание →</Link>
            ) : cur.submission === "REJECTED" && cur.taskLessonId ? (
              <Link href={`/academy/${cur.slug}/${cur.taskLessonId}`} className="btn-primary">Пересдать задание →</Link>
            ) : cur.submission === "PENDING" && cur.taskLessonId ? (
              <Link href={`/academy/${cur.slug}/${cur.taskLessonId}`} className="btn-secondary">Задание на проверке</Link>
            ) : cur.nextLessonId ? (
              <Link href={`/academy/${cur.slug}/${cur.nextLessonId}`} className="btn-primary">{o.nextLessonQuizPending ? `Пройти тест урока ${cur.nextLessonOrder} →` : `Продолжить урок ${cur.nextLessonOrder} →`}</Link>
            ) : (
              <Link href={`/academy/${cur.slug}`} className="btn-secondary">К курсу</Link>
            )}
          </section>
        ) : (
          <section className="card md:p-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-900">Все курсы пройдены 🎉</p>
              <p className="text-sm text-gray-500">Загляните в каталог — появятся новые</p>
            </div>
            <Link href="/academy" className="btn-outline">Каталог</Link>
          </section>
        )}

        {/* На этой неделе */}
        <section className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-extrabold text-gray-900">На этой неделе</h2>
            {o.plan ? (
              <PlanModalClient initial={{ daysPerWeek: o.plan.daysPerWeek, preferredDays: o.plan.preferredDays }} triggerLabel="Изменить план" triggerClass="btn-ghost text-xs" />
            ) : null}
          </div>
          {!o.plan ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">Разложим оставшиеся уроки по удобным дням — так проще не бросить.</p>
              <PlanModalClient />
            </div>
          ) : o.plan.items.length === 0 ? (
            <p className="text-sm text-gray-500">{cur ? "На ближайшую неделю уроков по плану нет — все пройдены" : "Нечего планировать — курсы пройдены"}</p>
          ) : (
            <ul className="divide-y divide-[#f0f9f0]">
              {o.plan.items.map((it) => (
                <li key={`${it.lessonId}-${it.date}`} className="py-2.5 flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${it.overdue ? "bg-gray-100 text-gray-400" : "bg-primary-50 text-[#14A800]"}`}>{it.order}</span>
                  <Link href={`/academy/${it.slug}/${it.lessonId}`} className={`flex-1 min-w-0 truncate text-sm font-semibold ${it.overdue ? "text-gray-400" : "text-gray-900 hover:text-[#14A800]"}`}>{it.titleRu}</Link>
                  <span className={`text-xs shrink-0 ${it.overdue ? "text-gray-400" : "text-gray-500"}`}>{it.overdue ? "перенесено" : it.dueLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Мои курсы */}
        <section>
          <h2 className="font-extrabold text-gray-900 mb-3">Мои курсы</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {o.courses.map((c) => {
              const cat = CATEGORY_MAP[c.taskCategory] ?? { emoji: "📋", label: c.taskCategory };
              const badge = SUBMISSION_BADGE[c.submission];
              return (
                <div key={c.enrollmentId} className="card flex flex-col overflow-hidden">
                  {c.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverUrl} alt="" className="-mx-5 -mt-5 mb-4 aspect-video object-cover" />
                  ) : (
                    <div className="-mx-5 -mt-5 mb-4 h-20 bg-primary-50 flex items-center justify-center text-4xl">{cat.emoji}</div>
                  )}
                  <h3 className="font-bold text-gray-900 leading-snug">{c.titleRu}</h3>
                  {c.partner && <div className="mt-1"><PartnerLine partner={c.partner} /></div>}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-3 mb-1">
                    <span>{c.status === "COMPLETED" ? "Курс пройден" : "Прогресс"}</span>
                    <span>{c.percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
                    <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${c.percent}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500">Задание:</span>
                    {badge && <span className={badge.cls}>{badge.label}</span>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {c.status === "COMPLETED" ? (
                      <>
                        <Link href={`/learn/certificate/${c.enrollmentId}`} className="btn-primary py-2 text-xs">🎓 Сертификат</Link>
                        <Link href={`/academy/${c.slug}`} className="btn-secondary py-2 text-xs">Повторить</Link>
                      </>
                    ) : c.nextLessonId ? (
                      <Link href={`/academy/${c.slug}/${c.nextLessonId}`} className="btn-primary py-2 text-xs">Продолжить</Link>
                    ) : c.taskLessonId ? (
                      <Link href={`/academy/${c.slug}/${c.taskLessonId}`} className="btn-primary py-2 text-xs">{c.submission === "PENDING" ? "К заданию" : "Сдать задание"}</Link>
                    ) : (
                      <Link href={`/academy/${c.slug}`} className="btn-secondary py-2 text-xs">К курсу</Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Боковая ── */}
      <aside className="space-y-4">
        <section className="card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-extrabold text-gray-900">Достижения</h2>
            <span className="text-xs text-gray-500">{o.achievements.earned}/{o.achievements.total}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {(o.achievements.top.length ? o.achievements.top : o.achievements.list.slice(0, 3)).map((a) => (
              <span key={a.key} title={a.title} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${a.earned ? "bg-primary-50" : "bg-gray-100 grayscale opacity-60"}`}>{a.icon}</span>
            ))}
          </div>
          <Link href="/learn/achievements" className="text-sm font-semibold text-[#14A800] hover:underline">Все достижения →</Link>
        </section>

        <section className="card">
          <h2 className="font-extrabold text-gray-900 mb-2">🎓 Устод</h2>
          {o.mentor.length === 0 ? (
            <p className="text-sm text-gray-500">Пока ни одного вопроса. Устод ждёт на любом уроке — кнопка внизу справа.</p>
          ) : (
            <ul className="space-y-2">
              {o.mentor.map((d) => (
                <li key={d.lessonId}>
                  <Link href={`/academy/${d.slug}/${d.lessonId}`} className="block hover:text-[#14A800]">
                    <p className="text-sm font-semibold text-gray-900 truncate">Урок {d.lessonOrder}: {d.lessonTitle}</p>
                    <p className="text-xs text-gray-500 truncate">{d.lastPreview}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/learn/mentor" className="text-sm font-semibold text-[#14A800] hover:underline mt-3 inline-block">Все разговоры →</Link>
        </section>

        {o.recommended && (
          <section className="card">
            <h2 className="font-extrabold text-gray-900 mb-2">Рекомендуем</h2>
            <h3 className="font-semibold text-gray-900 text-sm">{o.recommended.titleRu}</h3>
            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{o.recommended.descriptionRu}</p>
            <Link href={`/academy/${o.recommended.slug}`} className="btn-outline w-full mt-3 py-2 text-xs">Посмотреть</Link>
          </section>
        )}
      </aside>
    </div>
  );
}
