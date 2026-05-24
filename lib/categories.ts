// ─── Shared category, profession, and skill constants ────────────────────────
// Import from here to keep all labels/emojis/gradients in sync across the app.

export const CATEGORIES = [
  { key: "SHOPPING",  emoji: "🛒", label: "Покупки",    desc: "Магазин, Корвон, рынок",      gradient: "linear-gradient(135deg, #60a5fa, #6366f1)" },
  { key: "DELIVERY",  emoji: "🚗", label: "Доставка",   desc: "Посылки, документы",           gradient: "linear-gradient(135deg, #fb923c, #f97316)" },
  { key: "QUEUE",     emoji: "⏰", label: "Очередь",    desc: "ОВИР, банк, поликлиника",      gradient: "linear-gradient(135deg, #a78bfa, #8b5cf6)" },
  { key: "HOUSEHOLD", emoji: "🏠", label: "Дом",        desc: "Ремонт, монтаж, мебель",       gradient: "linear-gradient(135deg, #14A800, #00d4aa)" },
  { key: "ONLINE",    emoji: "💻", label: "IT задачи",  desc: "Сайт, дизайн, программа",      gradient: "linear-gradient(135deg, #64748b, #6366f1)" },
  { key: "CLEANING",  emoji: "🧹", label: "Уборка",     desc: "Квартира, офис, генеральная",  gradient: "linear-gradient(135deg, #06b6d4, #0891b2)" },
  { key: "DRIVER",    emoji: "🚕", label: "Водитель",   desc: "Поездки, трансфер, аренда",    gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  { key: "MOVING",    emoji: "📦", label: "Переезды",   desc: "Грузчики, перевозка вещей",    gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
  { key: "COOKING",   emoji: "🍳", label: "Готовка",    desc: "Ужин, торт, праздничный стол", gradient: "linear-gradient(135deg, #ec4899, #db2777)" },
  { key: "PHOTO",     emoji: "📸", label: "Фото/видео", desc: "Съёмка, монтаж, обработка",   gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

/** Fast O(1) lookup by key */
export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<string, typeof CATEGORIES[number]>;

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
