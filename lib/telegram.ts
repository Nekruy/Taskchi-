import TelegramBot from "node-telegram-bot-api";

let bot: TelegramBot | null = null;

function getBot(): TelegramBot | null {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  if (!bot) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  }
  return bot;
}

// ─── Notification helpers ──────────────────────────────────────────────────────

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<void> {
  const b = getBot();
  if (!b || !chatId) return;
  try {
    await b.sendMessage(chatId, text, { parse_mode: parseMode });
  } catch (err) {
    console.error("[Telegram] Failed to send message:", err);
  }
}

// ─── Event notifications ───────────────────────────────────────────────────────

export async function notifyNewTask(params: {
  telegramId?: string;
  taskTitle: string;
  taskId: string;
  budget: number;
  city: string;
}): Promise<void> {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taskchi.up.railway.app";

  const text = `
🆕 <b>Новая задача!</b>

📋 <b>${params.taskTitle}</b>
💰 Бюджет: ${params.budget} сомони
📍 ${params.city}

<a href="${appUrl}/tasks/${params.taskId}">Открыть задачу →</a>
`.trim();

  // Notify admin
  if (adminChatId) {
    await sendTelegramMessage(adminChatId, text);
  }

  // Notify user
  if (params.telegramId) {
    await sendTelegramMessage(
      params.telegramId,
      `✅ Ваша задача <b>"${params.taskTitle}"</b> успешно опубликована на Taskchi!\n\n<a href="${appUrl}/tasks/${params.taskId}">Посмотреть →</a>`
    );
  }
}

export async function notifyNewOffer(params: {
  customerTelegramId?: string;
  executorName: string;
  taskTitle: string;
  taskId: string;
  offerPrice: number;
}): Promise<void> {
  if (!params.customerTelegramId) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taskchi.up.railway.app";
  const text = `
💼 <b>Новый отклик на вашу задачу!</b>

📋 Задача: <b>${params.taskTitle}</b>
👤 Исполнитель: ${params.executorName}
💰 Предложенная цена: ${params.offerPrice} сомони

<a href="${appUrl}/tasks/${params.taskId}">Посмотреть и принять →</a>
`.trim();

  await sendTelegramMessage(params.customerTelegramId, text);
}

export async function notifyOfferAccepted(params: {
  executorTelegramId?: string;
  taskTitle: string;
  taskId: string;
  customerName: string;
}): Promise<void> {
  if (!params.executorTelegramId) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taskchi.up.railway.app";
  const text = `
🎉 <b>Ваш отклик принят!</b>

📋 Задача: <b>${params.taskTitle}</b>
👤 Заказчик: ${params.customerName}

Перейдите в чат, чтобы обсудить детали.
<a href="${appUrl}/tasks/${params.taskId}">Открыть →</a>
`.trim();

  await sendTelegramMessage(params.executorTelegramId, text);
}

export async function notifyTaskCompleted(params: {
  executorTelegramId?: string;
  customerTelegramId?: string;
  taskTitle: string;
  amount: number;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taskchi.up.railway.app";

  if (params.executorTelegramId) {
    await sendTelegramMessage(
      params.executorTelegramId,
      `💸 <b>Оплата получена!</b>\n\nЗадача "<b>${params.taskTitle}</b>" завершена.\nСумма: ${params.amount} сомони переведена на ваш счёт.\n\nСпасибо за работу! 🙌`
    );
  }

  if (params.customerTelegramId) {
    await sendTelegramMessage(
      params.customerTelegramId,
      `✅ <b>Задача выполнена!</b>\n\n"<b>${params.taskTitle}</b>" успешно завершена.\nОставьте отзыв исполнителю на <a href="${appUrl}">Taskchi</a>.`
    );
  }
}

export async function notifyNewMessage(params: {
  recipientTelegramId?: string;
  senderName: string;
  taskTitle: string;
  chatId: string;
  preview: string;
}): Promise<void> {
  if (!params.recipientTelegramId) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taskchi.up.railway.app";
  await sendTelegramMessage(
    params.recipientTelegramId,
    `💬 <b>${params.senderName}</b>: ${params.preview.slice(0, 100)}\n\n📋 Задача: ${params.taskTitle}\n<a href="${appUrl}/chat/${params.chatId}">Ответить →</a>`
  );
}
