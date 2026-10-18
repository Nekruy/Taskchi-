// ─── Academy, Этап 4: ИИ-наставник на странице урока ─────────────────────────
// Логика живёт здесь, роут /api/academy/mentor — только транспорт.

import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { MENTOR_NAME } from "@/lib/academy";
import { GROQ_MODEL } from "@/lib/groq";

export const MENTOR_DAILY_LIMIT = 30;
export const MENTOR_HISTORY_TURNS = 10; // последние N сообщений диалога в контекст модели
export const MENTOR_LESSON_CHARS = 8000; // обрезка contentMd
export const MENTOR_MESSAGE_MAX = 1500;
const GROQ_TIMEOUT_MS = 20_000;
const MODEL = GROQ_MODEL; // единый fallback с lib/groq.ts (AI-парсер задач)

export class MentorUnavailableError extends Error {
  constructor(message = "Наставник сейчас недоступен, попробуйте через минуту") {
    super(message);
    this.name = "MentorUnavailableError";
  }
}

let client: Groq | null = null;
function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) throw new MentorUnavailableError();
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: GROQ_TIMEOUT_MS, maxRetries: 1 });
  return client;
}

/** Начало текущих суток по времени сервера. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Сколько сообщений ученик ещё может отправить сегодня (админы — без лимита). */
export async function getRemainingToday(userId: string, isAdmin: boolean): Promise<number> {
  if (isAdmin) return MENTOR_DAILY_LIMIT; // условно «много»; UI показывает число
  const used = await prisma.mentorMessage.count({
    where: { userId, role: "user", createdAt: { gte: startOfToday() } },
  });
  return Math.max(0, MENTOR_DAILY_LIMIT - used);
}

export interface PromptContext {
  lessonTitle: string;
  trackTitle: string;
  done: number;
  total: number;
  lessonContentMd: string;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const content = (ctx.lessonContentMd || "(у этого урока нет текста)").slice(0, MENTOR_LESSON_CHARS);
  return `Ты — ${MENTOR_NAME}, ИИ-наставник Taskchi Academy. Ты помогаешь ученику разобраться в уроке «${ctx.lessonTitle}» курса «${ctx.trackTitle}». Ученик прошёл ${ctx.done} из ${ctx.total} уроков.

Правила:
- Отвечай коротко и по делу: 3–6 предложений, при необходимости список. Простым языком, без академичности. Примеры — из жизни малого бизнеса в Таджикистане (кофейня, магазин, салон, доставка).
- Опирайся на текст урока ниже. Если вопрос выходит за рамки курса (ИИ-инструменты для работы) — вежливо скажи, что это за рамками, и предложи вернуться к теме. На вопросы о других уроках курса отвечать можно.
- Не делай практику и итоговое задание за ученика. Если просят «напиши за меня пост/промпт/перевод» — откажи дружелюбно, объясни, как сделать самому, и предложи проверить его вариант, когда он пришлёт.
- Если ученик прислал свой промпт или текст и просит оценить — разбери по критериям из урока: что хорошо, чего не хватает, один конкретный шаг для улучшения. Не переписывай за него целиком.
- Ты — ИИ и можешь ошибаться; если не уверен, скажи об этом и посоветуй проверить. Не выдумывай факты, цены, ссылки.
- Никогда не проси личные данные, пароли, номера карт.
- Отвечай на языке вопроса: русский или таджикский. Если ученик пишет на таджикском — отвечай на таджикском.
- Представляйся как ИИ-помощник Taskchi Academy, не как человек.
- Отвечай только на последнее сообщение ученика. Не пересказывай урок и не повторяй свои прошлые ответы, если об этом не просят.

Текст урока:
---
${content}
---`;
}

export interface MentorTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskResult {
  reply: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  model: string;
}

/** Вызов модели. История — последние N сообщений диалога (без текущего), message — новый вопрос. */
export async function askMentor(ctx: PromptContext, history: MentorTurn[], message: string): Promise<AskResult> {
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(ctx) },
    ...history.slice(-MENTOR_HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  let completion;
  try {
    completion = await getClient().chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 700,
    });
  } catch (err) {
    const e = err as { status?: number; name?: string; message?: string };
    console.error("[Academy mentor] Groq error", { status: e.status, name: e.name, message: e.message?.slice(0, 300), model: MODEL });
    throw new MentorUnavailableError();
  }

  const reply = completion.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    console.error("[Academy mentor] empty completion", { model: MODEL, finish: completion.choices?.[0]?.finish_reason });
    throw new MentorUnavailableError();
  }
  const u = completion.usage;
  return {
    reply,
    usage: u ? { promptTokens: u.prompt_tokens, completionTokens: u.completion_tokens, totalTokens: u.total_tokens } : null,
    model: MODEL,
  };
}
