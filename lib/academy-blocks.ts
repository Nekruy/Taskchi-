// ─── Academy, Этап 6: блоки урока — схемы, подсчёт теста, стрип ответов ──────
// Клиент-безопасный модуль (без prisma): используется и в API, и в компонентах.

import { z } from "zod";

export const BLOCK_TYPES = ["TEXT", "QUIZ", "VIDEO"] as const;
export type BlockTypeName = (typeof BLOCK_TYPES)[number];

/** Порядок QUIZ-блока, который сид ставит в конец урока. */
export const QUIZ_SEED_ORDER = 100;

export const QuizQuestionSchema = z.object({
  q: z.string().trim().min(3, "Вопрос минимум 3 символа").max(500),
  options: z.array(z.string().trim().min(1, "Вариант не может быть пустым").max(300)).length(4, "Ровно 4 варианта ответа"),
  correct: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1, "Нужно объяснение").max(1000),
});

export const QuizDataSchema = z
  .object({
    passScore: z.number().int().min(0).optional(),
    questions: z.array(QuizQuestionSchema).min(1, "Минимум 1 вопрос").max(20, "Максимум 20 вопросов"),
  })
  .refine((d) => d.passScore === undefined || d.passScore <= d.questions.length, {
    message: "passScore не может быть больше числа вопросов",
    path: ["passScore"],
  });

export const TextDataSchema = z.object({ md: z.string().trim().min(1, "Текст блока пустой").max(50000) });
export const VideoDataSchema = z.object({
  url: z.string().trim().url("Некорректная ссылка").refine((u) => u.startsWith("https://"), "Ссылка должна начинаться с https://"),
});

export type QuizData = z.infer<typeof QuizDataSchema>;
export type TextData = z.infer<typeof TextDataSchema>;
export type VideoData = z.infer<typeof VideoDataSchema>;

/** Валидирует data по типу; бросает ZodError. */
export function parseBlockData(type: BlockTypeName, data: unknown): QuizData | TextData | VideoData {
  if (type === "QUIZ") return QuizDataSchema.parse(data);
  if (type === "TEXT") return TextDataSchema.parse(data);
  return VideoDataSchema.parse(data);
}

/** QUIZ обязателен, если задан passScore. TEXT/VIDEO — всегда «обязательны», но закрываются кнопкой «Дальше». */
export function isRequiredBlock(block: { type: string; data: unknown }): boolean {
  if (block.type === "QUIZ") {
    const d = block.data as Partial<QuizData> | null;
    return typeof d?.passScore === "number";
  }
  return false; // TEXT/VIDEO не блокируют завершение урока (решение 3: блокирует только тест)
}

/** Версия QUIZ для клиента: без correct и explanation. */
export interface ClientQuizQuestion {
  q: string;
  options: string[];
}
export interface ClientQuizData {
  passScore: number | null;
  total: number;
  questions: ClientQuizQuestion[];
}
export function stripQuizForClient(data: QuizData): ClientQuizData {
  return {
    passScore: data.passScore ?? null,
    total: data.questions.length,
    questions: data.questions.map((q) => ({ q: q.q, options: q.options })),
  };
}

/** Текущая незавершённая попытка (переживает перезагрузку страницы). */
export interface QuizInProgress {
  answers: (number | null)[];
  startedAt: string;
}

/**
 * Что хранится в BlockProgress.data для QUIZ: последний завершённый результат (score/total/answers/passed)
 * + необязательная незавершённая попытка inProgress. XP на будущее считается из score/total/attempts.
 */
export interface QuizProgressData {
  score: number;
  total: number;
  answers: number[];
  passed: boolean;
  inProgress?: QuizInProgress | null;
}

/** Проверка одного вопроса (для мгновенной обратной связи). */
export function checkAnswer(data: QuizData, questionIndex: number, answer: number): QuizResultItem {
  const q = data.questions[questionIndex];
  return { correct: q.correct, explanation: q.explanation, isRight: answer === q.correct };
}

export interface QuizResultItem {
  correct: number;
  explanation: string;
  isRight: boolean;
}

/** Подсчёт попытки: answers — индексы в ИСХОДНОМ порядке вариантов (клиент перемешивает только отображение). */
export function scoreQuiz(data: QuizData, answers: number[]): { score: number; total: number; passed: boolean; results: QuizResultItem[] } {
  const results = data.questions.map((q, i) => {
    const a = answers[i];
    const isRight = typeof a === "number" && a === q.correct;
    return { correct: q.correct, explanation: q.explanation, isRight };
  });
  const score = results.filter((r) => r.isRight).length;
  const total = data.questions.length;
  const passed = data.passScore === undefined ? true : score >= data.passScore;
  return { score, total, passed, results };
}

/** Блок считается завершённым: для QUIZ — passed (если passScore задан), иначе — наличие прогресса. */
export function isBlockDone(block: { type: string; data: unknown }, progress: { data: unknown } | null | undefined): boolean {
  if (!progress) return false;
  if (block.type === "QUIZ" && isRequiredBlock(block)) {
    const d = progress.data as Partial<QuizProgressData> | null;
    return !!d?.passed;
  }
  return true;
}
