import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatMinutes, getAcademyBadges, pluralLessons } from "@/lib/academy";
import { AcademyBadge } from "@/components/AcademyBadge";
import { PartnerLine } from "@/components/PartnerLine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Академия",
  description:
    "Taskchi Academy — бесплатные курсы по цифровым навыкам: ИИ-инструменты, тексты, изображения. Учись, сдай задание и получай задачи на Taskchi.",
};

const STEPS = [
  { icon: "📚", title: "Учись", text: "Короткие уроки с практикой — в своём темпе" },
  { icon: "✅", title: "Сдай задание", text: "Итоговая работа проверяется наставником" },
  { icon: "💼", title: "Получай задачи", text: "Берите заказы в своей категории на Taskchi" },
];

export default async function AcademyPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const [tracks, badges] = await Promise.all([
    prisma.track.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      partner: { select: { name: true, logoUrl: true, websiteUrl: true } },
      lessons: { select: { durationMin: true } },
      // Без сессии userId = null → where по несуществующему id даёт пустой массив
      enrollments: {
        where: { userId: userId ?? "__anonymous__" },
        select: { status: true, _count: { select: { progress: true } } },
      },
    },
    }),
    userId ? getAcademyBadges(userId) : Promise.resolve([]),
  ]);
  const isGraduate = badges.length > 0;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-gradient-hero border-b border-border-green">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
          <span className="badge-category mb-4">🎓 Бесплатно</span>
          <h1 className="section-title text-4xl md:text-5xl">Taskchi Academy</h1>
          <p className="section-subtitle max-w-2xl mx-auto">
            Бесплатно научись цифровым навыкам — и получай задачи на Taskchi
          </p>
          {isGraduate && (
            <p className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-gray-800">
              <AcademyBadge badges={badges} />
              Вы — выпускник Taskchi Academy
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card text-left sm:text-center animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="font-bold text-gray-900">
                  <span className="text-[#14A800] mr-1.5">{i + 1}.</span>
                  {s.title}
                </div>
                <p className="text-sm text-gray-500 mt-1 leading-snug">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tracks ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Курсы</h2>
            <p className="text-gray-500 text-sm mt-1">Выберите направление и начните сегодня</p>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🎓</div>
            <p className="font-semibold text-gray-600">Курсы скоро появятся</p>
            <p className="text-sm mt-1">Мы готовим первые треки — загляните позже</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tracks.map((t) => {
              const cat = CATEGORY_MAP[t.taskCategory] ?? { emoji: "📋", label: t.taskCategory };
              const lessonsCount = t.lessons.length;
              const totalMinutes = t.lessons.reduce((s, l) => s + (l.durationMin ?? 0), 0);
              const enrollment = t.enrollments[0];
              const done = enrollment?._count.progress ?? 0;
              const isDone = enrollment?.status === "COMPLETED";
              const duration = totalMinutes > 0 ? `~${formatMinutes(totalMinutes)}` : `~${t.estimatedHours} ч`;

              return (
                <Link key={t.id} href={`/academy/${t.slug}`} className="card-lift flex flex-col group overflow-hidden">
                  {t.coverUrl && (
                    <div className="-mx-5 -mt-5 mb-4 aspect-video bg-primary-50 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="badge-category">
                      <span className="text-sm leading-none">{cat.emoji}</span>
                      {cat.label}
                    </span>
                    {enrollment && (isDone ? <span className="badge-open">Пройден ✓</span> : <span className="badge-progress">В процессе</span>)}
                  </div>

                  <h3 className="font-bold text-gray-900 text-lg leading-snug mb-2 group-hover:text-[#14A800] transition-colors">
                    {t.titleRu}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3">{t.descriptionRu}</p>
                  {t.partner && (
                    <div className="mb-3">
                      <PartnerLine partner={t.partner} />
                    </div>
                  )}

                  <div className="mt-auto">
                    <p className="text-xs text-gray-400 font-medium mb-3">
                      {pluralLessons(lessonsCount)} · {duration}
                    </p>

                    {enrollment && !isDone && lessonsCount > 0 && (
                      <div className="h-1.5 rounded-full bg-gray-100 mb-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-brand transition-all"
                          style={{ width: `${Math.round((done / lessonsCount) * 100)}%` }}
                        />
                      </div>
                    )}

                    <span className={`${isDone ? "btn-outline" : "btn-primary"} w-full`}>
                      {isDone ? "Пройден ✓" : enrollment ? `Продолжить · ${done}/${lessonsCount}` : "Начать"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Для компаний и школ ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <div className="card md:p-8 flex flex-col md:flex-row md:items-center gap-5 border-[#14A800]/20 bg-gradient-brand-light">
          <div className="text-4xl shrink-0">🤝</div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-gray-900">Для компаний и школ</h2>
            <p className="text-gray-600 mt-1 leading-relaxed">
              Разместите свой бесплатный курс на Taskchi Academy — ученики проходят его у нас и получают задачи.
            </p>
          </div>
          <a
            href="mailto:info@taskchi.tj?subject=Курс на Taskchi Academy"
            className="btn-primary shrink-0"
          >
            Написать нам
          </a>
        </div>
      </section>
    </div>
  );
}
