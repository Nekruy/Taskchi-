# 08 — Taskchi Academy: выкат в прод

**Дата:** 18.10.2026, 09:45–09:54 UTC
**Результат:** выкачено. Прод-база `xukvllwttragtnhfvnue` получила схему Academy (аддитивно) и трек `ai-tools`; код Этапов 1–3 смержен в `main` (`303b639`) и задеплоен Railway; `https://taskchi.tj/academy` работает.
**Отклонений от плана не было**, ни один шаг не остановлен. Ветка `feature/academy` сохранена (`2959532`).

---

## Шаг 1 — бэкап прода
Через session-пулер `aws-1-eu-central-1.pooler.supabase.com:5432` (`pg_dump` 17.x, `--schema=public --no-owner --no-privileges`):

| Файл | Размер | Содержимое |
|---|---|---|
| `backups/prod-schema-2026-10-18.sql` | 21,5 КБ | схема **до** выката — 13 `CREATE TABLE` |
| `backups/prod-full-2026-10-18.sql` | 42,7 КБ | схема + данные — 13 `COPY`-блоков, в `users` 21 строка |
| `backups/prod-diff-2026-10-18.sql` | — | SQL из шага 2 (что именно применено) |

`backups/` добавлен в `.gitignore` — дампы с данными пользователей в git не попадают, лежат только локально на этой машине.

## Шаг 2 — `migrate diff` против прода (session-пулер :5432)
Сводка операторов — **ровно ожидаемый набор**:

| Оператор | Кол-во | Детали |
|---|---|---|
| `CREATE TYPE` | 3 | `LessonType`, `EnrollmentStatus`, `SubmissionStatus` |
| `ALTER TYPE` | 1 | `"TaskCategory" ADD VALUE 'DIGITAL'` |
| `CREATE TABLE` | 8 | `tracks, partners, lessons, enrollments, lesson_progress, submissions, centers, executor_categories` |
| `CREATE UNIQUE INDEX` / `CREATE INDEX` | 6 / 5 | все на новых таблицах |
| `ALTER TABLE … ADD CONSTRAINT` | 11 | FK только на новых таблицах |
| `DROP …`, `ALTER COLUMN`, изменения существующих таблиц | **0** | правки `Message.imageUrl` и `birthDate @db.Timestamptz` (отчёт 05) убрали оба неаддитивных шага из отчёта 04 §2.3 |

Полный SQL сохранён в `backups/prod-diff-2026-10-18.sql` (идентичен по составу тому, что применялось на dev в Этапах 1–3).

## Шаг 3 — `db push` в прод
`DATABASE_URL=<прод :5432> node scripts/prisma-direct.js db push` → `Your database is now in sync with your Prisma schema. Done in 8.61s`.
Read-only проверка сразу после:

| Проверка | Было | Стало |
|---|---|---|
| таблиц в `public` | 13 | **21** |
| `TaskCategory` | 11 значений | 12, `DIGITAL` последним |
| `users` / `tasks` / `escrows` / `messages` | 21 / 6 / 3 / 0 | 21 / 6 / 3 / 0 |
| `messages.imageUrl` | есть | есть |
| `users.birthDate` | `timestamp with time zone` | `timestamp with time zone` |
| `tracks` / `lessons` / `partners` | — | 0 / 0 / 0 |

`_prisma_migrations` в проде по-прежнему нет (К13 — отдельная задача; файлы миграций `20260910000*` не применялись, они документация).

## Шаг 4 — сид `ai-tools`
`DATABASE_URL=<прод :5432> ts-node --project tsconfig.server.json prisma/seed-academy.ts` → `✅ Academy seeded: 1 track, 8 lessons`. Проверка: `tracks 1` (`ai-tools`, DIGITAL, `isPublished=true`, без партнёра), `lessons 8` (7 EXTERNAL по 20–40 мин с `PLACEHOLDER_<n>`, 8-й TASK 90 мин). `users 21`, `tasks 6` без изменений. Старый `prisma/seed.ts` не запускался.

## Шаг 5 — merge и деплой
- `git merge --ff-only feature/academy` — невозможен (в `main` коммит логотипа `57c9224`, пересозданный относительно `dd8fe45`), как и предполагал отчёт 04.
- Обычный `git merge` → `303b639`, **без конфликтов** (merge-tree из отчёта 04 подтвердился).
- `npm run build` на `main` — exit 0, 24 роута Academy в выводе.
- `git push origin main` → `57c9224..303b639`, 09:51:16 UTC.

## Шаг 6 — проверка прода
Деплой Railway поднялся через **146 с** после push (поллинг `/api/academy/tracks` каждые 10 с). Проверено 09:54 UTC на обоих хостах (`taskchi.tj` и `taskchi-production.up.railway.app` — один и тот же инстанс):

| URL | taskchi.tj | railway.app |
|---|---|---|
| `/api/health` | 200 | 200 |
| `/` (главная, в навбаре есть `/academy`) | 200 | 200 |
| `/tasks` (API отдаёт прежние 3 OPEN-задачи) | 200 | 200 |
| `/academy` (hero, карточка «ИИ-инструменты для работы · 8 уроков», блок «Для компаний и школ») | 200 | 200 |
| `/academy/ai-tools` | 200 | 200 |
| `/api/academy/tracks` → `1 трек, lessonsCount 8, totalMinutes 300, partner null` | 200 | 200 |
| `/api/academy/tracks/ai-tools` | 200 | 200 |
| `/admin/academy` (гость → middleware) | 307 | 307 |

До деплоя (baseline в 09:51) `/academy` и `/api/academy/tracks` отдавали 404, остальное — 200: старый код не ломался в промежутке, downtime не наблюдался.

## Что НЕ делалось
Railway-переменные, `.env`, `.env.local` не тронуты. Ветка `feature/academy` не удалена. Записей/сдач/партнёров в проде нет — только трек и уроки.

## Что дальше (вне этого выката)
1. Заменить `PLACEHOLDER_<n>` на реальные YouTube-ролики — через `/admin/academy/tracks` (сид больше не нужен) или правкой `prisma/seed-academy.ts` и повторным запуском (upsert).
2. Назначить проверяющего: любой пользователь с `isAdmin=true` видит `/admin/academy`.
3. Долги из отчётов 05–07: К13 (история миграций + `migrate deploy` в деплое), К12 rate limiting, В19 `metadataBase`, hls.js для `.m3u8`.
4. Dev-база `.env.local` синхронна с продом по схеме; `backups/` — локальная папка, при необходимости скопировать дампы в надёжное место.
