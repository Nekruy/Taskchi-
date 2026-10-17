# 01 — Модуль Academy: схема Prisma и миграция

**Дата:** 10.09.2026
**Статус:** готово с оговорками (миграция сгенерирована, НЕ применена — см. «Вопросы»)

## Что изменено

Добавлены модели учебного модуля Academy в схему Prisma. Миграция сгенерирована офлайн через `prisma migrate diff` (без подключения к БД), к базе не применялась. Схема прошла `npx prisma validate`.

### Затронутые файлы

1. `prisma/schema.prisma` — изменён:
   - В модель `User` добавлены **только обратные связи** (скалярных полей не добавлено):
     `enrollments Enrollment[] @relation("UserEnrollments")`,
     `enrollmentsCreated Enrollment[] @relation("EnrollmentsCreated")`,
     `submissionsReviewed Submission[] @relation("SubmissionsReviewed")`,
     `executorCategories ExecutorCategory[]`.
   - В конец файла добавлен блок `// ─── Academy ───` с:
     - enum `LessonType { VIDEO EXTERNAL TEXT TASK }`
     - enum `EnrollmentStatus { ACTIVE COMPLETED DROPPED }`
     - enum `SubmissionStatus { PENDING APPROVED REJECTED }`
     - моделями `Track`, `Lesson`, `Enrollment`, `LessonProgress`, `Submission`, `Center`, `ExecutorCategory`
   - Таблицы замаплены в snake_case по конвенции проекта: `tracks`, `lessons`, `enrollments`, `lesson_progress`, `submissions`, `centers`, `executor_categories`.
   - Модели `Task`, `Escrow`, поле `User.role`, логика `passportStatus` и роут офферов — **не тронуты**.
2. `prisma/migrations/20260910000000_academy/migration.sql` — создан (SQL ниже).

### Ключевые решения по схеме

- `Enrollment`: `@@unique([userId, trackId])`; индексы отчётности `@@index([centerId])`, `@@index([status])`, `@@index([completedAt])`; `startedAt DateTime @default(now())`.
- `Lesson.trackId` → `onDelete: Cascade`; `LessonProgress.enrollmentId` → `onDelete: Cascade`. Остальные FK — дефолты Prisma (Restrict для обязательных, SetNull для необязательных).
- `Submission.enrollmentId @unique` (одно тестовое задание на запись), `reviewer` — связь на User `"SubmissionsReviewed"`.
- `ExecutorCategory`: `@@unique([userId, category])`; `source String` (значения "ACADEMY" | "MANUAL" — комментарием); `trackId String?` — простой скаляр без FK (по образцу `Review.taskId` в проекте). Ни одна существующая проверка на эту таблицу не опирается — это только запись о допуске.
- Денежные суммы в модуле не хранятся нигде; заработок при необходимости читается из `Escrow`.
- Текстовые поля (`descriptionRu/Tj`, `contentMd`, `comment`, `feedback`) — `@db.Text` (для Postgres эквивалентно String, указано явно по ТЗ).

## SQL миграции (полностью)

```sql
-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'EXTERNAL', 'TEXT', 'TASK');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

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

-- CreateIndex
CREATE INDEX "enrollments_centerId_idx" ON "enrollments"("centerId");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE INDEX "enrollments_completedAt_idx" ON "enrollments"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_userId_trackId_key" ON "enrollments"("userId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_enrollmentId_lessonId_key" ON "lesson_progress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_enrollmentId_key" ON "submissions"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "executor_categories_userId_category_key" ON "executor_categories"("userId", "category");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_enrolledById_fkey" FOREIGN KEY ("enrolledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executor_categories" ADD CONSTRAINT "executor_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Замечания, риски, предупреждения

1. **ВАЖНО — не применять через `prisma migrate deploy`, пока не пересобрана история миграций.** История сломана (находка К13 в AUDIT.md): две init-миграции применяются в неверном лексикографическом порядке и не соответствуют текущей схеме (~5 таблиц и ~25 колонок отсутствуют). `migrate deploy` на проде попытается прогнать их первыми и упадёт. Безопасные варианты:
   - `prisma db push` — применит diff со схемой напрямую (так прод жил до сих пор), миграционный файл останется документацией;
   - либо сначала пересобрать историю (одна актуальная init + `migrate resolve --applied` на проде), затем deploy — это правильный долгосрочный путь.
2. Каскады: удаление `Track` каскадно удалит `Lesson`, но заблокируется Restrict'ом от `Enrollment.trackId` и `LessonProgress.lessonId` — опубликованный трек с записями удалить нельзя (намеренно; для скрытия есть `isPublished=false`).
3. `Enrollment.userId` — Restrict: пользователь с записями на треки станет ещё одним блокером удаления аккаунта (в проекте и так нигде нет `onDelete` — общая проблема из аудита, Т7).
4. `source` в `ExecutorCategory` — String без enum (по ТЗ): опечатка на письме создаст «новый» источник молча. Аналогично `provider` в `Lesson`.
5. Индексы добавлены строго по ТЗ (centerId, status, completedAt + unique-ограничения). НЕ добавлены: `lessons(trackId)` — выборка «уроки трека» будет без индекса; `executor_categories` покрыт unique(userId, category) для запросов по пользователю, но запрос «все допущенные к категории X» пойдёт сканом.
6. Двуязычные поля (titleRu/titleTj) — первые Ru/Tj-поля в проекте; i18n-инфраструктуры в интерфейсе нет (см. пункт F прошлого отчёта), отдавать Tj-контент пока нечем.

## TODO и заглушки

- Заглушек в коде нет — задача касалась только схемы и миграции. Кода (роутов, страниц) для Academy ещё не существует.
- TODO: применить миграцию (см. «Вопросы»); после применения — `npx prisma generate`.
- TODO (по желанию): индекс `@@index([trackId])` на `Lesson` при появлении первого запроса списка уроков.

## Вопросы, требующие решения человека

1. Как применять: `prisma db push` сейчас или сначала пересобрать историю миграций (рекомендую второе, это же закроет К13 из аудита)?
2. Добавить ли индекс на `lessons.trackId` сверх ТЗ?
3. Нужен ли FK для `ExecutorCategory.trackId` → `Track` (сейчас простой String? по ТЗ)?
