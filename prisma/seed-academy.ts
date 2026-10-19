// Сид Academy — трек «ИИ-инструменты для работы», 8 уроков.
// Контент уроков читается из content/academy/ai-tools/lesson-NN*.md (NN = порядковый номер):
//   - titleRu — первая строка файла (H1), без префикса «Урок N.»;
//   - contentMd — файл без этой первой строки (страница урока уже выводит titleRu заголовком);
//   - уроки 1–7 — TEXT, урок 8 — TASK; длительности — DURATIONS ниже.
// Идемпотентен: трек upsert по slug, уроки — по [trackId, order]; Enrollment/LessonProgress не трогает.
// Запуск: dev — npm run db:seed:academy:dev; прод — DATABASE_URL="<session-пулер :5432>" ts-node --project tsconfig.server.json prisma/seed-academy.ts

import { PrismaClient, LessonType } from "@prisma/client";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { QuizDataSchema, QUIZ_SEED_ORDER } from "../lib/academy-blocks";

const prisma = new PrismaClient();

const CONTENT_DIR = join(__dirname, "..", "content", "academy", "ai-tools");

const TRACK = {
  slug: "ai-tools",
  titleRu: "ИИ-инструменты для работы",
  titleTj: "Абзорҳои зеҳни сунъӣ барои кор",
  descriptionRu:
    "Научитесь использовать ChatGPT, Claude и Gemini в повседневной работе: писать тексты и письма, переводить, работать с таблицами и создавать изображения для соцсетей. После курса вы сможете брать цифровые задачи на Taskchi.",
  descriptionTj:
    "Истифодаи ChatGPT, Claude ва Gemini-ро дар кори ҳаррӯза омӯзед: навиштани матн ва мактуб, тарҷума, кор бо ҷадвалҳо ва сохтани тасвир барои шабакаҳои иҷтимоӣ. Пас аз курс шумо метавонед дар Taskchi вазифаҳои рақамӣ гиред.",
  taskCategory: "DIGITAL" as const,
  estimatedHours: 5,
  order: 1,
  isPublished: true,
};

/** Таджикские названия по номеру урока (RU берётся из файла). */
const TITLES_TJ: Record<number, string> = {
  1: "ChatGPT, Claude ва Gemini чистанд ва аз ҳам чӣ фарқ доранд",
  2: "Чӣ тавр дархостро (промптро) дуруст тартиб диҳем",
  3: "Матн менависем: постҳо, мактубҳо, тавсифи молҳо",
  4: "Матнҳоро тарҷума ва мутобиқ мекунем RU ⇄ TJ ⇄ EN",
  5: "Бо ҷадвалҳо ва маълумот тавассути зеҳни сунъӣ кор мекунем",
  6: "Сохтани тасвирҳо барои шабакаҳои иҷтимоӣ",
  7: "Чӣ тавр корро ба тартиб дароварда ба фармоишгар супорем",
  8: "Супориши ниҳоӣ",
};

const DURATIONS: Record<number, number> = { 1: 25, 2: 30, 3: 40, 4: 35, 5: 35, 6: 40, 7: 30, 8: 120 };
const TYPES: Record<number, LessonType> = { 1: "TEXT", 2: "TEXT", 3: "TEXT", 4: "TEXT", 5: "TEXT", 6: "TEXT", 7: "TEXT", 8: "TASK" };
const EXPECTED_LESSONS = 8;

type LessonSeed = {
  order: number;
  titleRu: string;
  titleTj: string;
  type: LessonType;
  contentMd: string;
  durationMin: number;
};

/** lesson-01.md, lesson-08-task.md → { order, titleRu, contentMd } */
function readLessonFile(file: string): { order: number; titleRu: string; contentMd: string } {
  const m = file.match(/^lesson-(\d{2})/);
  if (!m) throw new Error(`Неожиданное имя файла: ${file}`);
  const order = parseInt(m[1], 10);

  const raw = readFileSync(join(CONTENT_DIR, file), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const h1Index = lines.findIndex((l) => l.trim() !== "");
  const h1 = lines[h1Index] ?? "";
  if (!h1.startsWith("# ")) throw new Error(`${file}: первая непустая строка должна быть заголовком H1, получено: «${h1.slice(0, 60)}»`);

  // «# Урок 3. Пишем тексты…» → «Пишем тексты…»
  const titleRu = h1
    .replace(/^#\s+/, "")
    .replace(/^Урок\s*\d+\s*[.:—–-]?\s*/i, "")
    .trim();
  if (!titleRu) throw new Error(`${file}: пустой заголовок`);

  const contentMd = lines.slice(h1Index + 1).join("\n").replace(/^\n+/, "").trimEnd() + "\n";
  if (contentMd.trim().length < 50) throw new Error(`${file}: подозрительно короткий контент`);

  return { order, titleRu, contentMd };
}

function loadLessons(): LessonSeed[] {
  const files = readdirSync(CONTENT_DIR)
    .filter((f) => /^lesson-\d{2}.*\.md$/.test(f))
    .sort();
  if (files.length !== EXPECTED_LESSONS) {
    throw new Error(`Ожидалось ${EXPECTED_LESSONS} файлов lesson-NN*.md в ${CONTENT_DIR}, найдено ${files.length}: ${files.join(", ") || "—"}`);
  }
  const lessons = files.map((file) => {
    const { order, titleRu, contentMd } = readLessonFile(file);
    const type = TYPES[order];
    const durationMin = DURATIONS[order];
    const titleTj = TITLES_TJ[order];
    if (!type || !durationMin || !titleTj) throw new Error(`${file}: нет настроек для урока №${order}`);
    if (order === EXPECTED_LESSONS && !/task/i.test(file)) throw new Error(`${file}: последний урок должен быть файлом *-task.md`);
    return { order, titleRu, titleTj, type, contentMd, durationMin };
  });
  const orders = lessons.map((l) => l.order);
  if (new Set(orders).size !== orders.length || orders.some((o) => o < 1 || o > EXPECTED_LESSONS)) {
    throw new Error(`Номера уроков должны быть 1..${EXPECTED_LESSONS} без повторов, получено: ${orders.join(", ")}`);
  }
  return lessons.sort((a, b) => a.order - b.order);
}

async function main() {
  console.log("🎓 Seeding Academy from", CONTENT_DIR);
  const LESSONS = loadLessons();

  const { slug, ...trackData } = TRACK;
  const track = await prisma.track.upsert({
    where: { slug },
    update: trackData,
    create: { slug, ...trackData },
  });
  console.log(`  track ${track.slug} (${track.id}), ${track.estimatedHours} ч`);

  for (const lesson of LESSONS) {
    const data = {
      titleRu: lesson.titleRu,
      titleTj: lesson.titleTj,
      type: lesson.type,
      externalUrl: null,
      provider: null,
      durationMin: lesson.durationMin,
      contentMd: lesson.contentMd,
    };
    // У Lesson нет unique по [trackId, order] — эмулируем upsert вручную.
    const existing = await prisma.lesson.findFirst({
      where: { trackId: track.id, order: lesson.order },
      select: { id: true },
    });
    const saved = existing
      ? await prisma.lesson.update({ where: { id: existing.id }, data })
      : await prisma.lesson.create({ data: { ...data, trackId: track.id, order: lesson.order } });
    console.log(`  lesson ${saved.order}. ${saved.titleRu} [${saved.type}, ${saved.durationMin} мин, ${saved.contentMd?.length ?? 0} симв.]`);
  }

  // Этап 6: QUIZ-блок в конце уроков 1–7 из content/academy/ai-tools/quiz-NN.json (если файл есть).
  // Идемпотентно по [lessonId, type=QUIZ, order=QUIZ_SEED_ORDER]; JSON валидируется zod до записи.
  let quizzes = 0;
  for (const lesson of LESSONS) {
    const file = join(CONTENT_DIR, `quiz-${String(lesson.order).padStart(2, "0")}.json`);
    if (!existsSync(file)) continue;
    const raw = JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
    const data = QuizDataSchema.parse(raw); // бросит понятную ошибку при невалидном файле
    const dbLesson = await prisma.lesson.findFirst({ where: { trackId: track.id, order: lesson.order }, select: { id: true } });
    if (!dbLesson) continue;
    const existing = await prisma.lessonBlock.findFirst({ where: { lessonId: dbLesson.id, type: "QUIZ", order: QUIZ_SEED_ORDER }, select: { id: true } });
    const saved = existing
      ? await prisma.lessonBlock.update({ where: { id: existing.id }, data: { data } })
      : await prisma.lessonBlock.create({ data: { lessonId: dbLesson.id, type: "QUIZ", order: QUIZ_SEED_ORDER, data } });
    quizzes += 1;
    console.log(`  quiz  ${lesson.order}. ${data.questions.length} вопросов, passScore ${data.passScore ?? "—"} (${saved.id})`);
  }

  const count = await prisma.lesson.count({ where: { trackId: track.id } });
  console.log(`✅ Academy seeded: 1 track, ${count} lessons, ${quizzes} quiz blocks`);
}

main()
  .catch((e) => {
    console.error("❌ Academy seed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
