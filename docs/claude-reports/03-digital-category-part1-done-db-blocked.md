# 03 — Категория DIGITAL: часть 1 выполнена, часть 2 ЗАБЛОКИРОВАНА (БД похожа на прод)

**Дата:** 10.09.2026
**Статус:** заблокировано на части 2. Часть 1 (код) выполнена полностью и проверена tsc. Части 2 (db push) и 3 (сид) НЕ выполнялись — к базе не применялось ничего, только чтение.

## ЧАСТЬ 1 — что изменено

### 1. Enum и индекс (prisma/schema.prisma)
- В конец `enum TaskCategory` добавлено `DIGITAL // Цифровые услуги / Хидматҳои рақамӣ`. Существующие значения и порядок не тронуты.
- В модель `Lesson` добавлен `@@index([trackId])`.
- `npx prisma validate` — ок; `npx prisma generate` выполнен (локальная кодогенерация, БД не затронута).

### 2. Найденные места дублирования списка категорий (все, greap по именам значений)
1. `app/api/tasks/route.ts:13` — zod-enum из 6 старых категорий
2. `lib/groq.ts:22` — union-тип ParsedTask.category из 6 старых
3. `lib/groq.ts:43-49, 57` — список категорий строкой в промпте AI-парсера (6 старых)
4. `lib/categories.ts` — UI-справочник (10, без CHILDREN)
5. `app/tasks/TaskFilters.tsx:6-14` — фильтры каталога (только 6 старых!)
6. `components/TaskCard.tsx:6-13` — карточка задачи (6 старых)
7. `app/tasks/[id]/TaskDetailClient.tsx:8-20` — страница задачи (11)
8. `app/customer/page.tsx:8-13` — иконки (11)
9. `app/map/MapClient.tsx:6-13` — эмодзи карты (6 старых)
10. `app/admin/page.tsx:7-14` — лейблы аналитики (6 старых)
11. `app/admin/tasks/page.tsx:13-20, 38, 46` — лейблы + список фильтров + строковый каст (6 старых)
12. НЕ тронуты намеренно: `app/layout.tsx:117-121` — 5 маркетинговых ссылок в футере (не полный список, синхронизации не требует); `prisma/seed.ts` — значения-данные демо-задач, не список.

### 3. Приведение к единому источнику истины
- **`lib/categories.ts`** — переписан блок категорий: добавлен `ALL_CATEGORIES: Record<TaskCategory, CategoryMeta>` (импорт enum из `@prisma/client`; Record по enum ⇒ новое значение в схеме без записи здесь не скомпилируется — это и есть compile-time-защита от рассинхрона). `CATEGORIES` (видимые) теперь производная: `ALL_CATEGORIES` минус `HIDDEN_CATEGORIES = ["CHILDREN"]` — CHILDREN осталась скрытой. Добавлена `DIGITAL`: эмодзи 🖥️, лейбл «Цифровые услуги», desc «Карточки, видео, ИИ». `CATEGORY_MAP` теперь включает и скрытую CHILDREN (для отображения legacy-задач). `CategoryKey` = `TaskCategory`.
- **`app/api/tasks/route.ts`** — `category: z.nativeEnum(TaskCategory)`.
- **`lib/groq.ts`** — `ParsedTask.category: TaskCategory`; список в промпте и перечень допустимых значений в JSON-шаблоне генерируются из `Object.values(TaskCategory)` + описания из `ALL_CATEGORIES`.
- **`app/tasks/TaskFilters.tsx`** — локальный список заменён на производный от `CATEGORIES` (+ пункт «Все задачи»).
- **`components/TaskCard.tsx`**, **`app/tasks/[id]/TaskDetailClient.tsx`** — локальные словари заменены на `CATEGORY_MAP`.
- **`app/customer/page.tsx`**, **`app/map/MapClient.tsx`** — словари эмодзи выводятся из `ALL_CATEGORIES`.
- **`app/admin/page.tsx`**, **`app/admin/tasks/page.tsx`** — лейблы выводятся из `ALL_CATEGORIES`; список фильтров — `Object.values(TaskCategory)`; строковый каст заменён на проверку принадлежности enum (`categories.includes(...)`) — заодно закрыт 500 на мусорном query-параметре.

### Полный список изменённых файлов
1. `prisma/schema.prisma`
2. `lib/categories.ts`
3. `lib/groq.ts`
4. `app/api/tasks/route.ts`
5. `app/tasks/TaskFilters.tsx`
6. `components/TaskCard.tsx`
7. `app/tasks/[id]/TaskDetailClient.tsx`
8. `app/customer/page.tsx`
9. `app/map/MapClient.tsx`
10. `app/admin/page.tsx`
11. `app/admin/tasks/page.tsx`
12. `prisma/migrations/20260910000001_task_category_digital/migration.sql` (создан)
13. `prisma/migrations/20260910000002_lessons_trackid_index/migration.sql` (создан)

### SQL миграций (не применены)

`prisma/migrations/20260910000001_task_category_digital/migration.sql`:
```sql
-- AlterEnum
ALTER TYPE "TaskCategory" ADD VALUE 'DIGITAL';
```

`prisma/migrations/20260910000002_lessons_trackid_index/migration.sql`:
```sql
-- CreateIndex
CREATE INDEX "lessons_trackId_idx" ON "lessons"("trackId");
```

(SQL сверен с `prisma migrate diff` — ровно ALTER TYPE ... ADD VALUE и CREATE INDEX, ничего больше.)

### Проверка (п.1.5)
- `npx tsc --noEmit` — 0 ошибок по всему проекту.
- Создание DIGITAL-задачи через обычный роут: форма `app/tasks/create/page.tsx` берёт категории из `CATEGORIES` (DIGITAL теперь там), zod `z.nativeEnum(TaskCategory)` его принимает. Компиляционно подтверждено; рантайм-создание возможно только после применения enum в БД (часть 2 — заблокирована).
- Фильтрация в UI: `TaskFilters` теперь показывает все видимые категории (DIGITAL включая), GET `/api/tasks?category=...` передаёт значение в Prisma-фильтр без изменений формата.

## ЧАСТЬ 2 — ЗАБЛОКИРОВАНО: не могу подтвердить, что DATABASE_URL — ветка разработки

Факты (только чтение):
- `.env`: `DATABASE_URL` → Supabase-проект `xukvllwttragtnhfvnue` (pooler, eu-central-1). Это **единственный** референс БД в конфигурации; признаков отдельной dev-ветки Supabase (другой ref в hostname) нет.
- Read-only запрос в эту базу: **19 пользователей, 6 задач**, последний пользователь зарегистрирован 30.05.2026, демо-аккаунтов из seed (`alice@taskchi.tj`/`bob@taskchi.tj`) **нет**.
- По контексту проекта «уже есть реальные зарегистрированные пользователи» — 19 аккаунтов без seed-примесей выглядят как реальные люди. Вывод: с высокой вероятностью это **продовая база**, а не ветка разработки.

По условию задачи («убедись, что это ветка разработки, при ошибке — остановись») применение остановлено. К базе не применялось ничего.

### Что произойдёт при `db push` в эту базу, если вы разрешите
Изменения аддитивные и данных не трогают: `ALTER TYPE ADD VALUE`, создание 7 новых таблиц Academy (из отчёта 01 — они ещё не применены), 1 индекс на новой таблице. Риск для существующих данных минимален, но решение — за вами.

## ЧАСТЬ 3 — не выполнялась (следует за частью 2)
`prisma/seed-academy.ts`, скрипт `seed:academy`, 2 записи Center — не созданы. Треки не создавались, externalUrl-заглушек пока нет.

## TODO и заглушки
- TODO: часть 2 (применение) и часть 3 (сид) — после вашего решения по базе.
- Заглушек в коде нет.

## Замечания и риски
- AI-ветка `app/api/tasks/route.ts:70-86` по-прежнему кладёт ответ LLM в БД без zod-валидации (К11 из AUDIT.md) — в рамках этой задачи не трогал; теперь LLM знает про все 12 значений enum, включая скрытую CHILDREN.
- `TaskFilters` раньше показывал CHILDREN в фильтрах, теперь она скрыта и там (консистентно с остальным UI). Старые CHILDREN-задачи по-прежнему корректно отображаются через `CATEGORY_MAP`.
- Миграции 20260910000001/2 записаны как документация; применять их через `migrate deploy` нельзя до пересборки истории (К13).

## Вопросы, требующие решения человека
1. База `xukvllwttragtnhfvnue` с 19 пользователями — это прод? Варианты: (а) разрешить `db push` + сид именно в неё (изменения аддитивные); (б) дать `DATABASE_URL` ветки разработки — тогда выполню части 2–3 туда.
