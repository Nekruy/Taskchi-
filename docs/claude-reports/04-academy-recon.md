# 04 — Academy, Этап 0: разведка (без изменений)

**Дата:** 18.10.2026
**Ветка:** `feature/academy` (`59caf48`), рабочее дерево чистое, кроме незакоммиченного `docs/claude-reports/04-git-commit-academy-push-blocked.md` (см. п. 1.4).
**Режим:** только чтение. Выполнялись: `git` без записи (плюс `git checkout feature/academy` — задача указывала эту ветку, а сессия стартовала на `main`), read-only SQL, `npx tsc --noEmit`, `npm run build`, `npx prisma migrate diff`. Код, схема, база, `package.json` не менялись. Побочный эффект `npm run build` (перегенерация `server.js`, `prisma/seed.js`) дал идентичные файлы — `git status` после сборки чист.

Ссылки на ранее выясненное: `AUDIT.md` (К/В/Т-находки), отчёты 01–03 (`docs/claude-reports/`).

---

## 1. Ветки

### 1.1 Расхождение
```
git log --oneline main..feature/academy
59caf48 chore(android): обновлены baseline profiles после сборки
b0be805 docs: аудит проекта и отчёты по модулю Academy
a613733 feat(academy): схема Academy, категория DIGITAL, единый справочник категорий
dd8fe45 feat(brand): новый логотип — плиточная иконка вместо изометрической

git log --oneline feature/academy..main
57c9224 feat(brand): новый логотип — плиточная иконка вместо изометрической
```
Общий предок — `169e9cb`. `feature/academy` = `origin/feature/academy` (`59caf48`), `main` = `origin/main` (`57c9224`) — обе ветки запушены (блокировка из отчёта 04-git-commit снята).

### 1.2 Коммиты main, которых нет в feature/academy
Один: `57c9224` (логотип). Это пересозданный коммит с тем же содержимым, что `dd8fe45` в `feature/academy`: `git diff --stat 57c9224 dd8fe45 -- public/` пуст, оба меняют те же 4 файла (`public/favicon.svg`, `logo-dark.svg`, `logo-icon.svg`, `logo.svg`). Других коммитов в `main` нет.

### 1.3 Конфликты при мерже feature/academy → main
`git merge-tree --write-tree main feature/academy` → exit 0, дерево `21e2328`, **конфликтов нет**. Логотип с обеих сторон идентичен, остальные 20 файлов диффа `main...feature/academy` в `main` не трогались (AUDIT.md, 3 отчёта, 11 файлов кода, схема, 3 миграции, 2 бинарника baseline profiles).

### 1.4 Нумерация отчётов
В рабочем дереве лежит незакоммиченный `docs/claude-reports/04-git-commit-academy-push-blocked.md` (17.10.2026, нет ни в `main`, ни в `feature/academy`). Настоящий отчёт по ТЗ назван `04-academy-recon.md` — номер дублируется. Не трогал; решение в п. «Решения».

---

## 2. База (только чтение)

### 2.1 Куда ведут переменные
| Файл | Переменная | Проект Supabase | Хост | Статус |
|---|---|---|---|---|
| `.env` (04.06.2026) | `DATABASE_URL` | `xukvllwttragtnhfvnue` | `aws-1-eu-central-1.pooler.supabase.com:6543`, `pgbouncer=true` | работает |
| `.env` | `DIRECT_URL` | `xukvllwttragtnhfvnue` | `db.xukvllwttragtnhfvnue.supabase.co:5432` | **DNS ENOTFOUND** с этой машины (прямые хосты Supabase — IPv6); session-пулер `aws-1-eu-central-1.pooler.supabase.com:5432` доступен и работает |
| `.env.local` (10.09.2026, в .gitignore) | `DATABASE_URL`, `DIRECT_URL` | **`evxaenwcvepubljqwurb`** | `aws-0-ap-northeast-2.pooler.supabase.com` (Сеул), 6543 / 5432 | TCP-соединение открывается, но Prisma: `P1001 Can't reach database server` на обоих портах. Проект, вероятно, на паузе или удалён — **не проверено, причина: нет доступа к дашборду Supabase** |

`SHADOW_DATABASE_URL` нет. `prisma/schema.prisma:7-10` — datasource использует только `env("DATABASE_URL")`, `directUrl` не задан, т.е. `DIRECT_URL` Prisma вообще не читает.

**Критично для Этапа 1 — две базы в двух файлах:**
- Next.js загружает `.env.local` поверх `.env` (лог сборки: `Environments: .env.local, .env`). Значит `npm run dev` / `next build` локально идут в **сеульскую недоступную** базу `evxaenwcvepubljqwurb`.
- Prisma CLI (`db push`, `migrate`, `studio`, `seed`) читает **только `.env`** → `xukvllwttragtnhfvnue`.
- Отчёт 03 видел только `.env` и назвал её «единственным референсом» — `.env.local` появился 10.09 в 17:13, уже после отчёта.

### 2.2 База `xukvllwttragtnhfvnue` (.env) — это прод
Подтверждение: публичный `GET https://taskchi-production.up.railway.app/api/tasks` (URL из `capacitor.config.ts:9`) возвращает `total: 3`, id `cmpl5ode…`, `cmpl3fyq…`, `cmpl3eje…` — ровно три OPEN-задачи этой базы (`select id,status from tasks`). Railway-прод работает с ней.

| Показатель | Значение |
|---|---|
| PostgreSQL | 17.6 |
| Таблицы public | `chats, contracts, disputes, escrows, messages, notifications, offers, otp_codes, password_reset_tokens, reviews, tasks, users, verifications` (13) |
| Таблицы Academy (`tracks, lessons, enrollments, lesson_progress, submissions, centers, executor_categories`) | **нет ни одной** |
| Enum-ы `LessonType / EnrollmentStatus / SubmissionStatus` | нет |
| `TaskCategory` | `CHILDREN, SHOPPING, DELIVERY, QUEUE, HOUSEHOLD, ONLINE, CLEANING, DRIVER, MOVING, COOKING, PHOTO` — **DIGITAL нет** |
| `_prisma_migrations` | **таблицы не существует** → Prisma Migrate к базе никогда не применялся, схема накатывалась `db push` (подтверждает К13) |
| users | 21 (в отчёте 03 было 19; +2 после 10.09) |
| tasks | 6 (3 OPEN, 3 IN_PROGRESS), последняя создана 30.05.2026 |
| escrows / offers / chats / messages | 3 / 4 / 3 / 0 |
| payments | таблицы нет (модели `Payment` в схеме нет; «деньги» — это `escrows`, см. AUDIT резюме) |
| Последняя регистрация | 06.10.2026 12:16 UTC |
| Колонок в `users` | 76 |

### 2.3 `prisma migrate diff --from-url <прод> --to-schema-datamodel prisma/schema.prisma --script`
Через `DIRECT_URL` — недоступен (DNS). Через transaction-пулер 6543 — процесс `schema-engine` висел >3 мин, снят вручную. Через **session-пулер (тот же хост, порт 5432, без `pgbouncer=true`)** — отработал за секунды. SQL полностью:

```sql
-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'EXTERNAL', 'TEXT', 'TASK');
-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');
-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
-- AlterEnum
ALTER TYPE "TaskCategory" ADD VALUE 'DIGITAL';

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "imageUrl";
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "birthDate" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "titleTj" TEXT NOT NULL,
    "descriptionRu" TEXT NOT NULL,
    "descriptionTj" TEXT NOT NULL,
    "coverUrl" TEXT,
    "taskCategory" "TaskCategory" NOT NULL,
    "estimatedHours" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "titleRu" TEXT NOT NULL,
    "titleTj" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "externalUrl" TEXT,
    "contentMd" TEXT,
    "provider" TEXT,
    "durationMin" INTEGER,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "centerId" TEXT,
    "enrolledById" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "fileUrls" TEXT[],
    "comment" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "centers_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "executor_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "source" TEXT NOT NULL,
    "trackId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "executor_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracks_slug_key" ON "tracks"("slug");
CREATE INDEX "lessons_trackId_idx" ON "lessons"("trackId");
CREATE INDEX "enrollments_centerId_idx" ON "enrollments"("centerId");
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");
CREATE INDEX "enrollments_completedAt_idx" ON "enrollments"("completedAt");
CREATE UNIQUE INDEX "enrollments_userId_trackId_key" ON "enrollments"("userId", "trackId");
CREATE UNIQUE INDEX "lesson_progress_enrollmentId_lessonId_key" ON "lesson_progress"("enrollmentId", "lessonId");
CREATE UNIQUE INDEX "submissions_enrollmentId_key" ON "submissions"("enrollmentId");
CREATE UNIQUE INDEX "executor_categories_userId_category_key" ON "executor_categories"("userId", "category");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_enrolledById_fkey" FOREIGN KEY ("enrolledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "executor_categories" ADD CONSTRAINT "executor_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Дифф НЕ чисто аддитивный** — два пункта, которых отчёты 01–03 не видели (там diff считался офлайн, без базы):

1. `ALTER TABLE "messages" DROP COLUMN "imageUrl"` — в проде колонка `messages.imageUrl text` **существует** (добавлена мимо Prisma; в git-истории `schema.prisma` поля `imageUrl` не было никогда — `git log -S imageUrl -- prisma/schema.prisma` пуст). В `prisma/schema.prisma:247-258` модели `Message` поля нет, а код его пишет: `app/api/chat/[id]/messages/route.ts:86` и читает `app/chat/[id]/ChatClient.tsx:221-227`. Это и есть В5 из AUDIT: Prisma Client не знает поле → отправка фото падает. Сейчас в `messages` 0 строк, потерять нечего, но `db push` **удалит колонку**, и починка В5 потребует её создавать заново.
2. `ALTER TABLE "users" ALTER COLUMN "birthDate" SET DATA TYPE TIMESTAMP(3)` — в проде `timestamp with time zone`, в схеме (`schema.prisma:110`) `DateTime?` без `@db.Timestamptz`. Значение заполнено у 1 пользователя; перезапись таблицы `users` (21 строка) — безопасно, но это изменение чужой таблицы.

Остальное — ровно содержимое миграций `20260910000000/1/2` (отчёты 01, 03).

### 2.4 База `evxaenwcvepubljqwurb` (.env.local)
Не проверена ничем: все запросы и `migrate diff` падают с P1001. Что в ней (пустая? копия прода? dev-ветка?) — неизвестно.

---

## 3. Что из Academy реально есть в коде

`grep -rniE "academy|\bTrack\b|Enrollment|\bLesson|Submission"` по `app/`, `components/`, `lib/`, `server.ts`, `server.js`, `middleware.ts`, `types/`:

- `app/admin/tasks/page.tsx:88` — комментарий `// handled by form submission`. Ложное совпадение.

Больше **ничего**. Ни роута `app/api/academy/*`, ни страниц `app/academy/*`, ни компонентов. Academy существует только как:
- `prisma/schema.prisma:348-490` — блок `// ─── Academy ───`: enum-ы (350, 357, 363), модели `Track` 369, `Lesson` 390, `Enrollment` 409, `LessonProgress` 433, `Submission` 445, `Center` 461, `ExecutorCategory` 475; обратные связи в `User` 137-140; `DIGITAL` в enum 25.
- `prisma/migrations/20260910000000_academy`, `…01_task_category_digital`, `…02_lessons_trackid_index` — не применены (п. 2.2).
- `lib/categories.ts:29` — запись `DIGITAL` в `ALL_CATEGORIES` (отчёт 03).
- Сгенерированный Prisma Client в `node_modules` знает модели (tsc проходит) — но в проде их таблиц нет.

Сид-скрипта (`prisma/seed-academy.ts`) нет; `prisma/seed.ts` — старый демо-сид задач.

---

## 4. Паттерны, на которые опираемся

### 4.1 API-роут с auth и zod — `app/api/tasks/route.ts`
- Импорты: `getServerSession` + `authOptions` из `@/lib/auth`, `prisma` из `@/lib/prisma`, `z` (строки 1-6).
- Zod-схема на модуле: `CreateTaskSchema` 11-25, enum категории через `z.nativeEnum(TaskCategory)` (14).
- Auth: `const session = await getServerSession(authOptions); if (!session) return 401` — 62-65, `session.user.id` — 80/109.
- Валидация: `CreateTaskSchema.parse(body)` 101; `ZodError → 400` с первым сообщением 126-128; остальное → 500 с `console.error("[Tasks POST]")` 129-130.
- GET публичный, пагинация `page/limit/skip` 33-35, ответ `{ tasks, total, page, pages }` 57.
- Динамический сегмент: `app/api/tasks/[id]/route.ts:7-10` — `{ params }: { params: { id: string } }` (Next 14, params синхронные).
- Админ-проверка: `app/api/admin/passport/route.ts:7-10` — `if (!session?.user?.isAdmin) return 403 "Forbidden"`.
- Охват: zod импортирован в 8 из 43 `route.ts`; 35 роутов без zod (AUDIT Т9/К11). Для Academy брать образец из `tasks/route.ts`, а не «средний по больнице».

### 4.2 Сессия
- **Серверные компоненты/роуты:** `getServerSession(authOptions)` — `app/dashboard/page.tsx:9-10` (+ `redirect("/login")`), `app/admin/layout.tsx:18-22` (гейт по `isAdmin`), `app/tasks/[id]/page.tsx:23-50` (параллельно с запросом данных через `Promise.all`). Страницы с БД помечают `export const dynamic = "force-dynamic"` (`dashboard/page.tsx:6`, `tasks/page.tsx:7`, `tasks/[id]/page.tsx:8`).
- **Клиентские:** `useSession()` из `next-auth/react` — `components/Navbar.tsx:20`, `app/customer/page.tsx:4`; `SessionProvider` в `app/providers.tsx:3-7`, подключён в `app/layout.tsx:67`.
- Поля сессии: `types/next-auth.d.ts` — `user.id, isAdmin, isEmailVerified, role` (role — строка `"CUSTOMER" | "EXECUTOR"`, см. `lib/auth.ts:65,74`). JWT, 30 дней (`lib/auth.ts:9-12`; В13).
- `middleware.ts:32-39` matcher: `/dashboard`, `/tasks/create`, `/chat`, `/profile/edit`, `/admin`. **`/academy` под middleware не попадёт** — защиту страниц уроков делать в самой странице (`redirect`) или расширять matcher.
- Альтернативный способ в upload-роутах: `getToken({ req })` из `next-auth/jwt` (`app/api/upload/chat-photo/route.ts:2,35`).

### 4.3 Клиентский компонент с загрузкой и статусами — `app/admin/verification/page.tsx`
- `"use client"` (1); типы ответа локально (5-17).
- Состояния: `tab`, `rows`, `loading`, `actioning` (58-63); `load()` → `fetch(/api/...)` → `setRows(data.users ?? [])` (65-71); `useEffect(() => { load(); }, [tab])` с eslint-disable (73).
- Действие: `setActioning(id)` → POST JSON → `await load()` → сброс (75-84).
- UI-состояния: спиннер `animate-spin … border-[#14A800]` (109-112), пустое состояние с эмодзи (113-117), табы-кнопки (93-107), карточка `bg-white rounded-2xl border border-gray-100 shadow-sm p-5` (121), локальная `PhotoModal` (19-40).
- Нет обработки `!res.ok` и ошибок сети — ошибка молча даст пустой список (Т9). Переносить паттерн вместе с этой оговоркой.

### 4.4 Локализация
- Переключателя RU/TJ **нет**; языка в сессии/cookie/URL нет; `app/layout.tsx:65` — `<html lang="ru">`, OG `locale: "ru_RU"` (40). i18n-библиотек нет (`next-intl`, `useTranslation` — grep пуст, подтверждает Т12). Таджикский — одна строка в футере (`layout.tsx:142`) и комментарий в схеме (`schema.prisma:25`).
- В схеме Academy есть `titleTj / descriptionTj` у `Track` и `Lesson` — показывать их нечем (отчёт 01, п. 6).

### 4.5 UI-кит
- Определения — `app/globals.css`, `@layer components` (107-221): `.btn-primary` 110, `.btn-secondary` 133, `.btn-outline` 149, `.btn-ghost` 163, `.card` 173, `.card-lift` 179, `.input-field` 192, `.badge*` 206-217, `.section-title/-subtitle` 220-221. Цвета/тени/анимации — `tailwind.config.ts` (`primary`, `gradient-brand`, `shadow-card`, `animate-fade-in/slide-up`).
- Использование (вхождений в `app/`+`components/`): `btn-primary` 47, `btn-secondary` 11, `btn-outline` 4, `btn-ghost` 2 (только Navbar), `input-field` 38, `card` 35 в 5 файлах.
- Общих React-компонентов `Button/Card/Modal` **нет** — `components/` содержит 7 файлов: `Navbar`, `NavigationProgress`, `ReviewModal`, `StarRating`, `StatsCounter`, `TaskCard`, `TaskchiLogo` (мёртвый, см. отчёт 04-git-commit).
- Единообразие частичное: Navbar и дашборды рисуют рамки/тени inline-`style` (21 вхождение `style={{…border…}}` в 4 файлах, напр. `Navbar.tsx:97,130-131,189`), админка — голым Tailwind `bg-[#14A800]` вместо `btn-primary` (`verification/page.tsx:100,189`). Для Academy — держаться `btn-*`, `card`, `input-field`, `badge`.

### 4.6 Markdown-рендерер
**Отсутствует.** В `package.json` и `node_modules` нет `react-markdown`, `marked`, `remark*`, `rehype*`, `markdown-it`, `@next/mdx`, `@tailwindcss/typography`, `dompurify`/`sanitize-html`. Поле `Lesson.contentMd` (`schema.prisma:390-407`) рендерить нечем — нужна зависимость (решение в конце).

---

## 5. Навигация

### 5.1 `components/Navbar.tsx`
- **Десктоп, верхняя полоса:** ссылки `Задачи` (148-150) и `Карта` (151-153), класс `btn-ghost text-sm hidden lg:inline-flex`. «Академия» — третьей после строки 153, тем же классом. Виден только с `lg` (≥1024px): на `md` (768-1023) эти ссылки скрыты — так же будет и с Академией.
- **Dropdown профиля:** массив пунктов 273-277 (`Личный кабинет`, `Мой профиль`, `Создать поручение`) → добавить 4-й объект `{ href: "/academy", icon: "🎓", label: "Академия" }` перед закрытием массива на 277. Рендер общий (278-287), менять не нужно.
- **Мобильный bottom nav** (336-392): 5 пунктов `flex-1` в контейнере `px-1` высотой `h-16`: Главная (343), Задачи (352), центральная кнопка «Создать» `w-14` = 56px с `-mt-5` (361-371), Чаты (374), Профиль (383). Расчёт: при ширине 360px слот = (360−8)/5 ≈ 70px; при 6 пунктах ≈ 59px, при 320px (старые Android) ≈ 52px — **меньше 56px центральной кнопки**, она налезет на соседей; подпись `text-[10px]` «Академия» (~48px) упрётся в края. Шестой пункт не влезает.
  **Предложение (один вариант):** заменить пункт «Главная» (343-349) на «Академия» `🎓` с `href="/academy"` и подсветкой `pathname.startsWith("/academy")`. Логотип в шапке (`Navbar.tsx:102-110`) виден на мобильных и уже ведёт на `/`, так что путь домой не теряется.

### 5.2 `app/layout.tsx` — футер
Колонка «Платформа» (104-111): `Все задачи` 107, `Создать задачу` 108, `Карта задач` 109. Ссылка «Академия» — четвёртым `<li>` после 109, класс `footer-link`. Футер `hidden md:block` (74) — на мобильных его нет.

Дополнительно: домашние NAV-массивы кабинетов — `app/customer/page.tsx:23-28`, `app/executor/page.tsx:15-19` — туда Академию можно добавить одной строкой, если понадобится вход из кабинета.

---

## 6. Сборка и деплой

### 6.1 Версии
| | |
|---|---|
| Node локально | v24.14.1 (`node -v`); npm 11.11.0 |
| Node в Docker | `node:20-slim` (`Dockerfile:1`) — расходится с локальной мажорной версией |
| Next | 14.2.35 (`package.json`, `npx next --version`) |
| Prisma CLI / Client | 5.22.0 / 5.22.0 (CLI предлагает 8.0.0-rc — игнорировать) |
| TypeScript | `^5`; zod `^3.23.8`; next-auth `^4.24.10` |

### 6.2 `npx tsc --noEmit` — exit 0, ошибок нет.

### 6.3 `npm run build` (`next build && tsc --project tsconfig.server.json`) — exit 0
Все страницы/роуты собрались (43 API-роута, 30 страниц, middleware 49.5 kB). Предупреждения дословно:
```
request to https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap failed, reason: write EPROTO 3C370000:error:0A000410:SSL routines:ssl3_read_bytes:ssl/tls alert handshake failure:openssl\ssl\record\rec_layer_s3.c:918:SSL alert number 40
Retrying 1/3...
⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000". See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
```
(первое — сеть/TLS этой машины, сборка продолжилась после retry; второе — ×19, одно на страницу, последствие В19.)
Сборка пишет `server.js` и `prisma/seed.js` в корень (`tsconfig.server.json: outDir "."`, оба файла в git, Т4) — после сборки `git status` чист.

### 6.4 Деплой
- `railway.json`: builder `DOCKERFILE`, `startCommand: node server.js`, healthcheck `/api/health` (роут возвращает `{status:"ok"}` без обращения к БД — `app/api/health/route.ts`).
- `Dockerfile`: `npm install` → `COPY . .` → `npx prisma generate` → `npm run build` с dummy `DATABASE_URL` → `CMD npm start` (`NODE_ENV=production node server.js`).
- **Ни `prisma migrate deploy`, ни `db push` нигде не выполняются** — ни в Dockerfile, ни в railway.json, ни в `package.json` scripts при старте (`prisma:migrate` есть, но никем не вызывается). Схема в прод применяется только вручную; `_prisma_migrations` в проде отсутствует (п. 2.2). Если задеплоить код Academy без ручного `db push`, рантайм упадёт на первом запросе к `tracks`.
- Сид `prisma:seed` — `ts-node … prisma/seed.ts` (демо-задачи), к Academy не относится.

### 6.5 `.env.example` vs `.env`
Есть, по ключам **не совпадает**:
- В `.env.example`, но нет в `.env` (12): `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `COMMISSION_MAX_SOMONI`, `COMMISSION_PERCENT`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `GROQ_MODEL`, `NEXT_PUBLIC_APP_NAME`, `SOCKET_PORT`, `TELEGRAM_ADMIN_CHAT_ID`. Без Cloudinary локально не работают загрузки (аватар, чат-фото, паспорт) — для `Submission.fileUrls` это тот же путь.
- В `.env`, но нет в `.env.example`: `DIRECT_URL`.
- `.env.local` — только `DATABASE_URL`, `DIRECT_URL` (п. 2.1). `NEXTAUTH_URL` и `NEXT_PUBLIC_APP_URL` в `.env` = `http://localhost:3000` — файл локальный, Railway держит свои переменные (не проверено, причина: нет доступа к Railway).

---

## 7. Блокеры и риски для Этапа 1

Этап 1 = `/api/academy/*`, страницы `/academy`, `/academy/[slug]`, `/academy/[slug]/[lessonId]`, сид одного трека, ссылки в навигации.

### 7.1 Что из AUDIT.md блокирует именно Academy
| Находка | Влияние на Этап 1 | Вердикт |
|---|---|---|
| **К13** сломанная история миграций, прод на `db push`, `_prisma_migrations` нет | Единственный способ применить схему Academy сейчас — `db push` вручную в прод. `migrate deploy` упадёт на init-миграциях. | **Блокирует применение**, не разработку кода. Решение 2. |
| **В5** `messages.imageUrl` есть в БД, нет в схеме | `db push` удалит колонку (п. 2.3). | **Блокирует db push в текущем виде** — сначала добавить поле в `Message` (1 строка, заодно чинит В5). |
| **В16** zod-категории | Закрыто в отчёте 03 (`z.nativeEnum(TaskCategory)`). | Не блокирует. |
| **Т12** нет i18n | `titleTj/descriptionTj` некуда выводить. | Не блокирует: Этап 1 рендерит только `*Ru`, Tj-поля заполняются в сиде. |
| **К12** нет rate limiting | Эндпоинты Academy (enroll, progress, submission) будут без лимитов, как и всё остальное. | Отложить; записать в долг. |
| **К5/К6** публичные файлы верификации | `Submission.fileUrls` пойдёт тем же Cloudinary-путём с публичными URL. | Этап 1 без загрузки файлов (submission позже) — отложить. |
| **В13** JWT кэширует роль 30 дней | `ExecutorCategory` выдаётся после трека, но если в будущем права завязать на токен — не обновятся. | Отложить: Этап 1 допуск не проверяет. |
| **В8** нет privacy/terms, **К1** Socket.io, **К3/К8–К10** эскроу | К Academy не относятся. | Отложить. |
| **В19** SEO/metadataBase | Страницы `/academy/*` добавят ещё warning'ов. | Отложить; можно задать `metadataBase` попутно. |

### 7.2 Что сломается в проде при `db push` прямо сейчас
`db push` выполнит SQL из п. 2.3 целиком, включая два неаддитивных шага:
1. **Удалит `messages.imageUrl`** — данных 0 строк, потерь нет, но чат-фото (уже сломанные, В5) станет невозможно починить без новой миграции. Если сперва добавить `imageUrl String?` в `Message`, этот `DROP` исчезнет, а В5 закроется.
2. **Перепишет тип `users.birthDate`** timestamptz → timestamp(3): 1 значение, таблица 21 строка, блокировка на доли секунды; семантически значение сохранится (конвертация в UTC). Либо явно задать в схеме `@db.Timestamptz(6)` и убрать ALTER.
3. `ALTER TYPE … ADD VALUE 'DIGITAL'` — безопасно (PG 17). Новое значение станет видно уже задеплоенному коду? Нет: прод на `main` без `lib/categories.ts` из `feature/academy`, enum в его Prisma Client без DIGITAL — задачи с DIGITAL прод создать не даст, но и не сломается.
4. Семь новых таблиц и индексы — аддитивно, прод-код их не трогает.
5. `db push` **не создаст `_prisma_migrations`** и не отметит `20260910000000/1/2` применёнными → при будущей пересборке истории (К13) их придётся `migrate resolve --applied`.
6. Порядок деплоя: сначала `db push`, потом merge/деплой кода — иначе рантайм 500 на `/academy`. Обратный порядок (код раньше базы) ломает только новые страницы, старые не затрагивает.
7. Через `pgbouncer`-URL (6543) Prisma-инструменты виснут (п. 2.3) — `db push` гнать через session-пулер `…pooler.supabase.com:5432` без `?pgbouncer=true`; `DIRECT_URL` из `.env` мёртв.

### 7.3 Прочие риски
- **Двойная база** `.env` / `.env.local` (п. 2.1): локальный `next dev` сейчас не стартует с БД вообще (сеульский проект недоступен), а любая Prisma-команда бьёт сразу в прод. До Этапа 1 это надо развести явно.
- Деплой не применяет схему (п. 6.4) — любой merge в `main` с Academy должен сопровождаться ручным шагом.
- `TaskchiLogo.tsx` — мёртвый код (отчёт 04-git-commit), к Этапу 1 не относится.

---

## Решения, которые нужны от человека

1. **Куда применять схему Academy.**
   а) `db push` прямо в прод `xukvllwttragtnhfvnue` (после правки `Message.imageUrl`, через session-пулер 5432);
   б) сначала поднять/починить dev-базу (сеульский проект из `.env.local` или новая Supabase-ветка), отлаживать там, в прод — на релизе.
   **Рекомендация:** б — Этап 1 пишет код неделю+, а прод сейчас ни в чём не нуждается; `db push` в прод оставить на момент мержа.

2. **Судьба `.env.local`.**
   а) удалить/переименовать, чтобы dev и Prisma CLI смотрели в одну базу (`.env`);
   б) оживить проект `evxaenwcvepubljqwurb` и сделать его dev-базой для обоих (тогда Prisma CLI запускать с `dotenv -e .env.local` или перенести URL в `.env`).
   **Рекомендация:** б, если проект ещё существует в Supabase; иначе а.

3. **Неаддитивные шаги диффа.**
   а) добавить `imageUrl String?` в `Message` и `@db.Timestamptz(6)` на `birthDate` → дифф станет чисто аддитивным и закроет В5;
   б) оставить как есть и принять DROP/ALTER.
   **Рекомендация:** а — две строки в схеме, ноль риска.

4. **Миграции vs db push (К13).**
   а) на Этапе 1 жить на `db push`, миграции Academy хранить как документацию (как в отчёте 01);
   б) перед Этапом 1 пересобрать историю (одна init + `migrate resolve`) и добавить `prisma migrate deploy` в `Dockerfile`/`startCommand`.
   **Рекомендация:** а для Этапа 1, б — отдельной задачей до мержа в `main`.

5. **Markdown-рендерер для `Lesson.contentMd`.**
   а) `react-markdown` + `remark-gfm` (+ `@tailwindcss/typography` для стилей);
   б) хранить уроки как HTML/plain-text и обойтись без зависимости.
   **Рекомендация:** а — `contentMd` уже в схеме, `react-markdown` по умолчанию экранирует HTML.

6. **Мобильный bottom nav.**
   а) заменить «Главная» на «Академия» (логотип в шапке остаётся ссылкой на `/`);
   б) bottom nav не трогать, вход в Академию — с главной страницы и из NAV кабинетов (`customer/page.tsx:23-28`, `executor/page.tsx:15-19`).
   **Рекомендация:** а — иначе на мобильных Академия будет в 2–3 тапах от любого экрана.

7. **Защита страниц Academy.**
   а) каталог `/academy` и страница трека публичные, урок — только с сессией через `redirect` в самой странице;
   б) добавить `/academy/:path*` в `middleware.ts` matcher (тогда и каталог закрыт).
   **Рекомендация:** а — каталог нужен для привлечения, matcher оставить как есть.

8. **Нумерация отчётов.** Незакоммиченный `04-git-commit-academy-push-blocked.md` дублирует номер.
   а) закоммитить его как `03a-…` рядом с этим отчётом;
   б) оставить незакоммиченным / удалить (информация устарела: push уже выполнен).
   **Рекомендация:** а — в нём есть вывод по `TaskchiLogo.tsx`, пригодится.

9. **Merge `feature/academy → main`.** Конфликтов нет (п. 1.3), но мерж везёт схему с таблицами, которых в проде нет; код прода их не использует, падения не будет.
   а) мержить только вместе с применением схемы (решение 1);
   б) мержить раньше — риск нулевой, пока `/academy` не задеплоен.
   **Рекомендация:** а — одна точка синхронизации кода и базы.
