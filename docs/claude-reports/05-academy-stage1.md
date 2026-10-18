# 05 — Academy, Этап 1: база, каталог, запись, прогресс

**Дата:** 18.10.2026
**Ветка:** `feature/academy`, коммиты `9e51c9c … aef9bbe` (+ этот отчёт), запушено в `origin/feature/academy`.
**Статус:** выполнено полностью. Раздел `/academy` работает на dev-базе `evxaenwcvepubljqwurb`; прод `xukvllwttragtnhfvnue` не тронут (проверено read-only, п. 5).
**Проверки:** `npx tsc --noEmit` — 0 ошибок; `npm run build` — exit 0; e2e-сценарий на `npm run dev` — 39/39.

---

## 1. База

### 1.1 Решения 2, 3 — `9e51c9c`
- `prisma/schema.prisma`: `Message.imageUrl String?` (строка 254), `User.birthDate DateTime? @db.Timestamptz(6)` (110).
- `package.json`: devDependency `dotenv-cli`; скрипты
  `db:push:dev` = `dotenv -e .env.local -- node scripts/prisma-direct.js db push`,
  `db:seed:academy:dev` = `dotenv -e .env.local -- ts-node --project tsconfig.server.json prisma/seed-academy.ts`.
- **Отклонение от решения 2 (вынужденное):** `dotenv -e .env.local -- npx prisma db push` в чистом виде не работает — schema engine через transaction-пулер `:6543?pgbouncer=true` зависает (5 минут без ответа, то же наблюдалось в отчёте 04 §2.3 для прода). Добавлен `scripts/prisma-direct.js` (15 строк): подставляет `DIRECT_URL` (session-пулер `:5432`) в `DATABASE_URL` и запускает Prisma CLI. Префикс `dotenv -e .env.local` сохранён, `.env.local` не менялся. Prisma Client в рантайме (Next, сид) через 6543 работает нормально.
- Prisma CLI при этом всё равно печатает `Environment variables loaded from .env` — это его собственный загрузчик, но уже установленные dotenv-cli переменные он **не перезаписывает**; в логе `db push` виден правильный хост `aws-0-ap-northeast-2…:5432`.

### 1.2 `migrate diff` против dev (до push)
Dev-база была **полностью пустой** (0 таблиц), поэтому diff = вся схема: 11 `CREATE TYPE`, 20 `CREATE TABLE`, 20 индексов, 32 `ALTER TABLE … ADD CONSTRAINT` (все FK). `DROP` и `ALTER COLUMN` — **ни одного** (единственное совпадение по слову DROP — значение enum `'DROPPED'`). `TaskCategory` создаётся сразу с `DIGITAL`, `users.birthDate` — `TIMESTAMPTZ(6)`, `messages.imageUrl` — `TEXT`.

### 1.3 `db:push:dev`
Выполнен (24 с). Read-only проверка после: 20 таблиц в `public`, 7 таблиц Academy на месте, `TaskCategory` содержит `DIGITAL`, `birthDate` = `timestamp with time zone`.

### 1.4 Сид — `fdea45e`, `prisma/seed-academy.ts`
Трек `ai-tools` (DIGITAL, 6 ч, order 1, published) + 8 уроков: 1–7 `EXTERNAL`/`youtube`/`PLACEHOLDER_<n>`/20–40 мин, 8 — `TASK` с markdown-заданием (посты для кофейни, изображение, Google Doc, 5 критериев). Tj-названия переведены, не транслит. Идемпотентность: трек `upsert` по `slug`; у `Lesson` нет unique по `[trackId, order]`, поэтому upsert эмулирован `findFirst` + `update`/`create`. Повторный запуск проверен — дублей нет. `Center` не сидируется.

Итог в dev после всех прогонов и очистки тестовых данных: `tracks 1, lessons 8, enrollments 0, lesson_progress 0, users 0`.

---

## 2. API — `3ee5064`, `app/api/academy/`

| Роут | Файл | Поведение |
|---|---|---|
| `GET /tracks` | `tracks/route.ts` | опубликованные по `order`; `lessonsCount`, `totalMinutes`, `enrollment {status, completedLessons} \| null` для текущей сессии |
| `GET /tracks/[slug]` | `tracks/[slug]/route.ts` | трек, уроки (`id, order, titleRu, type, durationMin` — без `externalUrl`/`contentMd`), `enrollment`, `completedLessonIds`; 404 если нет/не опубликован |
| `POST /tracks/[slug]/enroll` | `tracks/[slug]/enroll/route.ts` | 401 без сессии; создаёт `ACTIVE` → 201; повторно → 200 с тем же id; гонка P2002 обработана; `{ enrollmentId, firstLessonId }` |
| `GET /lessons/[id]` | `lessons/[id]/route.ts` | 401 / 403 без записи / 404; полный урок + `prevLessonId`, `nextLessonId`, `completed` |
| `POST /lessons/[id]/complete` | `lessons/[id]/complete/route.ts` | 401/403/404; `upsert` `LessonProgress` по `[enrollmentId, lessonId]`; `{ completedLessons, total, nextLessonId \| null }` |

Общее: `lib/academy.ts` — `LESSON_LIST_SELECT`, `getEnrollment()`, `extractYoutubeId()` (watch / youtu.be / embed / shorts / live), `pluralLessons()`, `formatMinutes()`, иконки/лейблы типов. Все роуты `force-dynamic`, ошибки → `console.error("[Academy …]")` + 500 JSON. Zod не нужен — роуты без тела запроса (идентификаторы только в пути).

Отступление от спецификации: статус `Enrollment` никогда не меняется с `ACTIVE` (по продуктовому решению); `GET /tracks/[slug]` отдаёт `enrollment` как `{ id, status }`.

---

## 3. Страницы — `b959885`, `app/academy/`

- **`/academy`** (`page.tsx`, серверный, `force-dynamic`): hero «Taskchi Academy» на `bg-gradient-hero`, бейдж «Бесплатно», три шага-карточки (`card`), сетка треков `card-lift`: эмодзи из `CATEGORY_MAP`, `titleRu`, `descriptionRu` `line-clamp-2`, «8 уроков · ~5 ч» (сумма `durationMin`; если 0 — `estimatedHours`), прогресс-бар и «Продолжить · N/8» для записанных, иначе «Начать». Пустое состояние. `metadata` статический.
- **`/academy/[slug]`** (`page.tsx` + `TrackActionsClient.tsx`): шапка трека, описание, «Программа курса» — уроки с номером/галочкой, иконкой типа (▶ / 📄 / ✅), длительностью; ссылки на уроки только у записанных. Кнопка: гость → «Войти, чтобы начать» (`/login?callbackUrl=…`), не записан → «Записаться бесплатно» (POST → переход на урок 1), записан → «Продолжить» (первый непройденный) / «Повторить курс» + бейдж «Все уроки пройдены». Прогресс-бар. `generateMetadata`. 404 — `notFound()`.
- **`/academy/[slug]/[lessonId]`** (`page.tsx` + `LessonNavClient.tsx`): без сессии → `redirect("/login?callbackUrl=…")` в самой странице; без записи → `redirect("/academy/[slug]")`; чужой slug/неопубликованный трек → 404. Сетка `lg:grid-cols-[1fr_320px]`, sidebar `lg:sticky` с прогрессом и списком уроков, на мобильном — под контентом. Контент: `EXTERNAL` YouTube → `iframe youtube-nocookie.com/embed/<id>?rel=0` 16:9; `PLACEHOLDER_*` → заглушка «Видео скоро появится»; не-YouTube → «Открыть материал ↗»; `TEXT` → `Markdown`; `TASK` → markdown + пунктирная заглушка «Сдача задания откроется скоро»; `VIDEO` → «Видео скоро». Кнопки: «← Назад» / «← К курсу», «Отметить пройденным и дальше →» (на последнем — «Отметить пройденным ✓», после — «К курсу →»), пройденный — disabled «Пройдено ✓» + «Дальше →».
- **`components/Markdown.tsx`** — `react-markdown` + `remark-gfm`, `skipHtml` (HTML не рендерится), классы `prose` из `@tailwindcss/typography`.
- **`app/login/page.tsx`** — добавлена поддержка `callbackUrl` (только внутренние пути, начинающиеся с `/` и не с `//`); раньше после логина всегда уходило на `/dashboard`, и редирект с урока терялся бы.
- Ошибки fetch на клиенте показываются под кнопкой (`!res.ok` и сетевые), не молчат.
- inline-`style` используется только для ширины прогресс-бара и `animationDelay` — рамок/теней inline нет.

---

## 4. Навигация — `aef9bbe`
- `components/Navbar.tsx`: десктоп — «Академия» после «Карта» (`btn-ghost … hidden lg:inline-flex`); dropdown — 4-й пункт `{ href: "/academy", icon: "🎓", label: "Академия" }`; bottom nav — «Главная» → «Академия» 🎓, активна при `pathname.startsWith("/academy")`.
- `app/layout.tsx`: «Платформа» — 4-й `<li>` «Академия».
- `app/customer/page.tsx`, `app/executor/page.tsx`: пункт «Академия» в NAV-массивах (у кабинетов свой bottom nav, теперь 5 пунктов).

---

## 5. Проверка

- `npx tsc --noEmit` — 0 ошибок (после правки: условный `include` ломал типизацию `_count`, заменён на `where: { userId: userId ?? "__anonymous__" }`).
- `npm run build` — exit 0; в выводе роуты `/academy`, `/academy/[slug]`, `/academy/[slug]/[lessonId]` (ƒ), 5 API-роутов. Предупреждения прежние (`metadataBase` ×22, шрифт Google — сеть).
- **E2E на `npm run dev`** (скрипт с cookie-jar, 39 проверок, все прошли): гость видит `/academy` и трек, `externalUrl` в HTML трека не утекает; API без сессии — 401 на уроке/enroll/complete; страница урока гостю → 307 на `/login?callbackUrl=%2Facademy%2Fai-tools%2F<id>`; регистрация + логин; без записи — 403 через API, 307 на страницу трека; enroll → 201, повторно → 200 тот же id; урок 1 — полный (`externalUrl`, prev=null, next=урок 2); complete 1 и 2 → `1/8`, `2/8`, повторный complete идемпотентен; после «перезагрузки» — «Продолжить · 2/8» на карточке, `2/8` на странице трека и в sidebar урока 8 (TASK: markdown + заглушка), на уроке 1 — «Пройдено ✓»; `GET /api/academy/tracks` → `{ACTIVE, 2}`; несуществующий трек, неопубликованный трек (временная запись `draft-track`), чужой slug — 404 на страницах и API; черновик не попадает в каталог.
  Тестовые пользователи и черновой трек удалены из dev-базы после прогона.
- **Прод (read-only, `xukvllwttragtnhfvnue`):** 13 таблиц в `public`, таблиц Academy — 0, `TaskCategory` без `DIGITAL`, `users` 21 / `tasks` 6, `messages.imageUrl` на месте, `birthDate` по-прежнему `timestamptz`. Ничего не утекло.

---

## 6. Заглушки
1. `externalUrl` уроков 1–7 — `https://www.youtube.com/watch?v=PLACEHOLDER_<n>`; страница распознаёт префикс `PLACEHOLDER` и показывает «Видео скоро появится». Заменить в `prisma/seed-academy.ts` (`EXTERNAL_LESSONS`) и перезапустить `db:seed:academy:dev` — upsert обновит ссылки.
2. Урок 8 (`TASK`) — блок «Сдача задания откроется скоро»; `Submission` — Этап 2.
3. Тип `VIDEO` — заглушка «Видео скоро» (треков с таким типом нет).
4. `Enrollment.status` всегда `ACTIVE`; `COMPLETED` — Этап 2.

## 7. Не сделано (вне объёма этапа)
`ExecutorCategory`, `Submission`, `Center`, бейджи, блокировка откликов — не трогались. Tj-поля заполнены в сиде, но не выводятся. `middleware.ts`, миграции `20260910000*`, `TaskchiLogo.tsx` — не тронуты.

## 8. Риски и долги
- **Соединение с dev-базой (Сеул) нестабильно:** ~10–15 % запросов падают с `P1001`, латентность 1,5–3 с на запрос; `db push`, `migrate diff` и сид запускались с ретраями. Для локальной разработки это терпимо, для демо на dev-базе — страницы грузятся 2–4 с. Прод в `eu-central-1` быстрее.
- **К12 rate limiting** — `POST enroll` и `POST complete` без лимитов, как и остальные роуты. Записи идемпотентны, флуд даёт только нагрузку.
- **Т12 i18n** — `titleTj/descriptionTj` хранятся, не показываются.
- **В19 metadataBase** — три новых страницы добавили предупреждений сборки; задать `metadataBase` в `app/layout.tsx` отдельной задачей.
- `GET /api/academy/tracks` и страница `/academy` при пустой сессии делают `where userId = "__anonymous__"` — лишний пустой join, безвреден.
- Урок доступен и после «прохождения» (можно пересматривать) — намеренно.
- В `tsconfig.server.json` `include` не содержит `seed-academy.ts`, но ts-node с `--project` компилирует файл напрямую — работает; `npm run build` его не трогает.

## 9. Выкат в прод (когда решите)
1. `npx prisma migrate diff --from-url "<session-пулер прода :5432, без pgbouncer>" --to-schema-datamodel prisma/schema.prisma --script` — ожидаемо: 3 `CREATE TYPE`, `ALTER TYPE … ADD VALUE 'DIGITAL'`, 7 `CREATE TABLE`, индексы, FK. **`DROP COLUMN imageUrl` и `ALTER COLUMN birthDate` исчезли** благодаря правкам схемы — убедиться, что их нет.
2. `DATABASE_URL="<session-пулер прода :5432>" npx prisma db push` (через 6543 зависнет; `DIRECT_URL` из `.env` на `db.<ref>.supabase.co` не резолвится). Аддитивно, данные не трогает.
3. Сид: `DATABASE_URL="<прод 6543 или 5432>" ts-node --project tsconfig.server.json prisma/seed-academy.ts` — предварительно заменив `PLACEHOLDER_*` на реальные ролики.
4. `git merge feature/academy` в `main` (конфликтов нет — отчёт 04 §1.3), push → Railway задеплоит. Порядок важен: сначала база, потом код.
5. После деплоя: `/academy` открывается, `/api/academy/tracks` отдаёт трек; старые разделы не затронуты.
