// ─── Shared category, profession, and skill constants ────────────────────────
// Import from here to keep all labels/emojis/gradients in sync across the app.

import { TaskCategory } from "@prisma/client";

export type CategoryMeta = {
  key: TaskCategory;
  emoji: string;
  label: string;
  desc: string;
  gradient: string;
};

/** Единый источник метаданных категорий. Record<TaskCategory, …> обязан
 *  покрывать ВСЕ значения enum — новое значение в schema.prisma без записи
 *  здесь не скомпилируется. */
export const ALL_CATEGORIES: Record<TaskCategory, CategoryMeta> = {
  CHILDREN:  { key: "CHILDREN",  emoji: "🧒", label: "Дети",            desc: "Няня, репетитор, уход за детьми", gradient: "linear-gradient(135deg, #f472b6, #ec4899)" },
  SHOPPING:  { key: "SHOPPING",  emoji: "🛒", label: "Покупки",         desc: "Магазин, Корвон, рынок",          gradient: "linear-gradient(135deg, #60a5fa, #6366f1)" },
  DELIVERY:  { key: "DELIVERY",  emoji: "🚗", label: "Доставка",        desc: "Посылки, документы",              gradient: "linear-gradient(135deg, #fb923c, #f97316)" },
  QUEUE:     { key: "QUEUE",     emoji: "⏰", label: "Очередь",         desc: "ОВИР, банк, поликлиника",         gradient: "linear-gradient(135deg, #a78bfa, #8b5cf6)" },
  HOUSEHOLD: { key: "HOUSEHOLD", emoji: "🏠", label: "Дом",             desc: "Ремонт, монтаж, мебель",          gradient: "linear-gradient(135deg, #14A800, #00d4aa)" },
  ONLINE:    { key: "ONLINE",    emoji: "💻", label: "IT задачи",       desc: "Сайт, дизайн, программа",         gradient: "linear-gradient(135deg, #64748b, #6366f1)" },
  CLEANING:  { key: "CLEANING",  emoji: "🧹", label: "Уборка",          desc: "Квартира, офис, генеральная",     gradient: "linear-gradient(135deg, #06b6d4, #0891b2)" },
  DRIVER:    { key: "DRIVER",    emoji: "🚕", label: "Водитель",        desc: "Поездки, трансфер, аренда",       gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  MOVING:    { key: "MOVING",    emoji: "📦", label: "Переезды",        desc: "Грузчики, перевозка вещей",       gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
  COOKING:   { key: "COOKING",   emoji: "🍳", label: "Готовка",         desc: "Ужин, торт, праздничный стол",    gradient: "linear-gradient(135deg, #ec4899, #db2777)" },
  PHOTO:     { key: "PHOTO",     emoji: "📸", label: "Фото/видео",      desc: "Съёмка, монтаж, обработка",       gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
  DIGITAL:   { key: "DIGITAL",   emoji: "🖥️", label: "Цифровые услуги", desc: "Карточки, видео, ИИ",             gradient: "linear-gradient(135deg, #0ea5e9, #6366f1)" },
};

/** Скрытые из UI категории (legacy) */
export const HIDDEN_CATEGORIES: readonly TaskCategory[] = ["CHILDREN"];

/** Видимые категории для меню, фильтров и создания задач */
export const CATEGORIES: CategoryMeta[] = Object.values(ALL_CATEGORIES).filter(
  (c) => !HIDDEN_CATEGORIES.includes(c.key)
);

export type CategoryKey = TaskCategory;

/** Fast O(1) lookup by key — включает скрытые (для отображения legacy-задач) */
export const CATEGORY_MAP: Record<string, CategoryMeta> = ALL_CATEGORIES;

// ─── Professions ─────────────────────────────────────────────────────────────

export const PROFESSIONS = [
  { key: "UNIVERSAL",     emoji: "⭐", label: "Универсальный",  desc: "Любые задачи" },
  { key: "COURIER",       emoji: "🚴", label: "Курьер",         desc: "Доставка и закупки" },
  { key: "DRIVER",        emoji: "🚗", label: "Водитель",       desc: "Поездки и трансфер" },
  { key: "CLEANER",       emoji: "🧹", label: "Уборщик",        desc: "Клининг и порядок" },
  { key: "COOKER",        emoji: "🍳", label: "Повар",          desc: "Готовка и выпечка" },
  { key: "HANDYMAN",      emoji: "🔧", label: "Мастер",         desc: "Ремонт и монтаж" },
  { key: "IT_SPECIALIST", emoji: "💻", label: "IT специалист",  desc: "Сайты и программы" },
  { key: "PHOTOGRAPHER",  emoji: "📸", label: "Фотограф",       desc: "Съёмка и монтаж" },
  { key: "TUTOR",         emoji: "📚", label: "Репетитор",      desc: "Обучение и курсы" },
  { key: "ASSISTANT",     emoji: "🤝", label: "Ассистент",      desc: "Личная помощь" },
  { key: "MOVER",         emoji: "📦", label: "Грузчик",        desc: "Переезды и подъём" },
] as const;

export const PROFESSION_MAP = Object.fromEntries(
  PROFESSIONS.map((p) => [p.key, p])
) as Record<string, typeof PROFESSIONS[number]>;

// ─── Extra skills ─────────────────────────────────────────────────────────────

export const EXTRA_SKILLS = [
  { key: "SPEAKS_RUSSIAN",        emoji: "🇷🇺", label: "Русский язык" },
  { key: "SPEAKS_TAJIK",          emoji: "🇹🇯", label: "Таджикский язык" },
  { key: "SPEAKS_ENGLISH",        emoji: "🇬🇧", label: "Английский язык" },
  { key: "FIRST_AID",             emoji: "🏥",  label: "Первая помощь" },
  { key: "CHILD_CARE",            emoji: "👶",  label: "Опыт с детьми" },
  { key: "PROFESSIONAL_COOKING",  emoji: "👨‍🍳", label: "Проф. кулинария" },
  { key: "PROFESSIONAL_CLEANING", emoji: "🫧",  label: "Проф. уборка" },
  { key: "PHOTOGRAPHY",           emoji: "📷",  label: "Фотосъёмка" },
  { key: "PROGRAMMING",           emoji: "⌨️",  label: "Программирование" },
  { key: "GRAPHIC_DESIGN",        emoji: "🎨",  label: "Дизайн" },
] as const;

// ─── Education levels ─────────────────────────────────────────────────────────

export const EDUCATION_LEVELS = [
  { key: "SCHOOL",     label: "Среднее образование" },
  { key: "COLLEGE",    label: "Среднее специальное" },
  { key: "UNIVERSITY", label: "Высшее образование" },
  { key: "MASTERS",    label: "Магистратура / аспирантура" },
  { key: "COURSES",    label: "Курсы / самообразование" },
] as const;

// ─── Districts ───────────────────────────────────────────────────────────────

export const DISTRICTS = [
  "Исмоили Сомони",
  "Сино",
  "Фирдавси",
  "Шохмансур",
  "Весь Душанбе (все районы)",
] as const;
