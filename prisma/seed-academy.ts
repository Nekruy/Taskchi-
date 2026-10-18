// Сид Academy — один опубликованный трек «ИИ-инструменты для работы» с 8 уроками.
// Идемпотентен: трек upsert по slug, уроки upsert по [trackId, order].
// Запуск (dev-база из .env.local): npm run db:seed:academy:dev

import { PrismaClient, LessonType } from "@prisma/client";

const prisma = new PrismaClient();

const TRACK = {
  slug: "ai-tools",
  titleRu: "ИИ-инструменты для работы",
  titleTj: "Абзорҳои зеҳни сунъӣ барои кор",
  descriptionRu:
    "Научитесь использовать ChatGPT, Claude и Gemini в повседневной работе: писать тексты и письма, переводить, работать с таблицами и создавать изображения для соцсетей. После курса вы сможете брать цифровые задачи на Taskchi.",
  descriptionTj:
    "Истифодаи ChatGPT, Claude ва Gemini-ро дар кори ҳаррӯза омӯзед: навиштани матн ва мактуб, тарҷума, кор бо ҷадвалҳо ва сохтани тасвир барои шабакаҳои иҷтимоӣ. Пас аз курс шумо метавонед дар Taskchi вазифаҳои рақамӣ гиред.",
  taskCategory: "DIGITAL" as const,
  estimatedHours: 6,
  order: 1,
  isPublished: true,
};

type LessonSeed = {
  order: number;
  titleRu: string;
  titleTj: string;
  type: LessonType;
  externalUrl?: string;
  provider?: string;
  durationMin?: number;
  contentMd?: string;
};

const EXTERNAL_LESSONS: Array<[string, string, number]> = [
  ["Что такое ChatGPT, Claude и Gemini и чем они отличаются", "ChatGPT, Claude ва Gemini чистанд ва аз ҳам чӣ фарқ доранд", 25],
  ["Как правильно формулировать запрос (промпт)", "Чӣ тавр дархостро (промптро) дуруст тартиб диҳем", 30],
  ["Пишем тексты: посты, письма, описания товаров", "Матн менависем: постҳо, мактубҳо, тавсифи молҳо", 35],
  ["Переводим и адаптируем тексты RU ⇄ TJ ⇄ EN", "Матнҳоро тарҷума ва мутобиқ мекунем RU ⇄ TJ ⇄ EN", 30],
  ["Работаем с таблицами и данными через ИИ", "Бо ҷадвалҳо ва маълумот тавассути зеҳни сунъӣ кор мекунем", 40],
  ["Генерация изображений для соцсетей", "Сохтани тасвирҳо барои шабакаҳои иҷтимоӣ", 30],
  ["Как оформить и сдать работу заказчику", "Чӣ тавр корро ба тартиб дароварда ба фармоишгар супорем", 20],
];

const FINAL_TASK_MD = `## Итоговое задание

Представьте, что вы получили на Taskchi заказ от кофейни в Душанбе.

**Что нужно сделать:**

1. С помощью ИИ напишите **3 поста для Instagram** кофейни: анонс нового напитка, пост о команде и пост-приглашение на выходные. Каждый пост — 60–120 слов, с хэштегами.
2. Сгенерируйте **1 изображение** для любого из постов (укажите, каким инструментом и каким промптом).
3. Оформите всё в **Google Doc**: заголовок, 3 поста, изображение, использованные промпты. Откройте доступ по ссылке.

**Критерии оценки:**

- Тексты написаны живым русским языком, без явных «следов ИИ» и ошибок.
- Посты отличаются по цели и тону, а не повторяют друг друга.
- Изображение соответствует теме поста и подходит для соцсетей.
- Документ аккуратно оформлен, промпты приложены.
- Работа сдана одной ссылкой на Google Doc с открытым доступом.

> Сдача задания откроется в следующем обновлении Академии.`;

const LESSONS: LessonSeed[] = [
  ...EXTERNAL_LESSONS.map(([titleRu, titleTj, durationMin], i): LessonSeed => ({
    order: i + 1,
    titleRu,
    titleTj,
    type: "EXTERNAL",
    provider: "youtube",
    externalUrl: `https://www.youtube.com/watch?v=PLACEHOLDER_${i + 1}`,
    durationMin,
  })),
  {
    order: 8,
    titleRu: "Итоговое задание",
    titleTj: "Супориши ниҳоӣ",
    type: "TASK",
    durationMin: 90,
    contentMd: FINAL_TASK_MD,
  },
];

async function main() {
  console.log("🎓 Seeding Academy...");

  const { slug, ...trackData } = TRACK;
  const track = await prisma.track.upsert({
    where: { slug },
    update: trackData,
    create: { slug, ...trackData },
  });
  console.log(`  track ${track.slug} (${track.id})`);

  for (const lesson of LESSONS) {
    const data = {
      titleRu: lesson.titleRu,
      titleTj: lesson.titleTj,
      type: lesson.type,
      externalUrl: lesson.externalUrl ?? null,
      provider: lesson.provider ?? null,
      durationMin: lesson.durationMin ?? null,
      contentMd: lesson.contentMd ?? null,
    };
    // У Lesson нет unique по [trackId, order] — эмулируем upsert вручную.
    const existing = await prisma.lesson.findFirst({
      where: { trackId: track.id, order: lesson.order },
      select: { id: true },
    });
    const saved = existing
      ? await prisma.lesson.update({ where: { id: existing.id }, data })
      : await prisma.lesson.create({ data: { ...data, trackId: track.id, order: lesson.order } });
    console.log(`  lesson ${saved.order}. ${saved.titleRu} [${saved.type}]`);
  }

  const count = await prisma.lesson.count({ where: { trackId: track.id } });
  console.log(`✅ Academy seeded: 1 track, ${count} lessons`);
}

main()
  .catch((e) => {
    console.error("❌ Academy seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
