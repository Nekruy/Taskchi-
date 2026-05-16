import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedTask {
  title: string;
  description: string;
  category: "CHILDREN" | "SHOPPING" | "DELIVERY" | "QUEUE" | "HOUSEHOLD" | "ONLINE";
  budget: number;
  city: string;
  address?: string;
  deadline?: string;
  isGroupTask: boolean;
  executorsNeeded: number;
}

export interface ExecutorMatch {
  userId: string;
  score: number;
  reason: string;
}

// ─── Parse task from free text ────────────────────────────────────────────────

export async function parseTaskFromText(rawText: string): Promise<ParsedTask> {
  const prompt = `Ты — ИИ-помощник маркетплейса задач Taskchi для Таджикистана.
Пользователь описал задачу в свободной форме. Извлеки структурированные данные.

Категории задач:
- CHILDREN: дети, няня, репетитор, уход за детьми
- SHOPPING: покупки, магазин, товары, харид
- DELIVERY: доставка, курьер, привезти, расонидан
- QUEUE: очередь, стоять, навбат
- HOUSEHOLD: уборка, ремонт, домашние дела
- ONLINE: интернет, онлайн, компьютер, дизайн, перевод

Текст задачи: "${rawText}"

Ответь строго в формате JSON (без markdown, без пояснений):
{
  "title": "краткое название задачи (до 60 символов)",
  "description": "подробное описание",
  "category": "CHILDREN|SHOPPING|DELIVERY|QUEUE|HOUSEHOLD|ONLINE",
  "budget": число в сомони (если не указано — предложи разумную сумму),
  "city": "город (по умолчанию Душанбе)",
  "address": "адрес если указан или null",
  "deadline": "ISO дата если указана или null",
  "isGroupTask": false,
  "executorsNeeded": 1
}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = completion.choices[0]?.message?.content || "{}";

  try {
    // Strip possible markdown code blocks
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as ParsedTask;
  } catch {
    return {
      title: rawText.slice(0, 60),
      description: rawText,
      category: "HOUSEHOLD",
      budget: 50,
      city: "Душанбе",
      isGroupTask: false,
      executorsNeeded: 1,
    };
  }
}

// ─── Generate contract text ───────────────────────────────────────────────────

export interface ContractParams {
  taskTitle: string;
  taskDescription: string;
  customerName: string;
  executorName: string;
  amount: number;
  deadline?: string;
  city: string;
}

export async function generateContractText(params: ContractParams): Promise<string> {
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `Ты — юридический ИИ-помощник. Составь договор оказания услуг для маркетплейса Taskchi (Таджикистан).

Данные:
- Задание: ${params.taskTitle}
- Описание: ${params.taskDescription}
- Заказчик: ${params.customerName}
- Исполнитель: ${params.executorName}
- Сумма: ${params.amount} сомони
- Срок: ${params.deadline || "по договорённости"}
- Город: ${params.city}
- Дата: ${today}

Составь официальный договор на русском языке с разделами:
1. Предмет договора
2. Права и обязанности сторон
3. Стоимость и порядок оплаты
4. Сроки выполнения
5. Ответственность сторон
6. Порядок разрешения споров
7. Реквизиты и подписи

Договор должен быть юридически грамотным, но простым для понимания. Учти законодательство Республики Таджикистан.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
  });

  return completion.choices[0]?.message?.content || "Не удалось сгенерировать договор";
}

// ─── AI task suggestions ───────────────────────────────────────────────────────

export async function suggestExecutors(
  taskDescription: string,
  executorProfiles: Array<{ id: string; name: string; bio: string; rating: number }>
): Promise<ExecutorMatch[]> {
  if (executorProfiles.length === 0) return [];

  const profilesText = executorProfiles
    .map((e) => `ID: ${e.id}, Имя: ${e.name}, Рейтинг: ${e.rating}, Описание: ${e.bio}`)
    .join("\n");

  const prompt = `Задание: "${taskDescription}"

Доступные исполнители:
${profilesText}

Оцени подходящих исполнителей и верни топ-3 в формате JSON массива (без markdown):
[{"userId": "id", "score": 0-100, "reason": "краткое объяснение на русском"}]`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 400,
  });

  const content = completion.choices[0]?.message?.content || "[]";
  try {
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as ExecutorMatch[];
  } catch {
    return [];
  }
}

// ─── AI chat assistant ────────────────────────────────────────────────────────

export async function getAIAssistantReply(
  userMessage: string,
  context: string
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Ты — ИИ-помощник маркетплейса Taskchi для Таджикистана. Контекст: ${context}.
Помогай пользователям с вопросами о задачах, оплате и работе платформы. Отвечай кратко на русском языке.`,
      },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content || "Не могу ответить на этот вопрос.";
}
