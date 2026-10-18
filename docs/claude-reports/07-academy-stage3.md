# 07 — Academy, Этап 3: партнёры, управление курсами из админки, видео

**Дата:** 18.10.2026
**Ветка:** `feature/academy`, коммиты `b46bfda … f50da1d` (+ этот отчёт), запушено в `origin/feature/academy`.
**Статус:** выполнено полностью. Контент Академии заводится из админки без программиста; курсы могут принадлежать партнёрам.
**Проверки:** `npx tsc --noEmit` — 0 ошибок; `npm run build` — exit 0 (24 роута Academy); e2e на `npm run dev` — 51/51. Прод `xukvllwttragtnhfvnue` не тронут (п. 6).

---

## 1. Схема — `b46bfda`
`prisma/schema.prisma`: модель `Partner` (id, slug @unique, name, logoUrl?, websiteUrl?, descriptionRu @db.Text, isActive=true, createdAt, tracks[]), `Track.partnerId String?` + `partner Partner? @relation(onDelete: SetNull)` + `@@index([partnerId])`. `migrate diff` против dev → `ALTER TABLE tracks ADD COLUMN partnerId`, `CREATE TABLE partners`, `CREATE UNIQUE INDEX partners_slug_key`, `CREATE INDEX tracks_partnerId_idx`, `ADD CONSTRAINT tracks_partnerId_fkey … ON DELETE SET NULL` — ничего лишнего. `db:push:dev` — применено. Сид не менялся, `ai-tools` без партнёра.

## 2. Админ-API — `ab6b3dd`, `bc2ac35`, `app/api/admin/academy/`
Общее: `lib/admin-guard.ts` → `requireAdmin()` (403 `Forbidden` без `isAdmin`, как в `admin/passport`); `lib/academy-admin.ts` — zod-схемы `PartnerSchema`/`TrackSchema`/`LessonSchema` (+ `.partial()` для PATCH), `SLUG_RE = /^[a-z0-9-]{2,40}$/`, https-проверка ссылок, `lessonTypeError()` (EXTERNAL/VIDEO → нужна ссылка, TEXT/TASK → нужен markdown), `MoveSchema`, `isUniqueError()` (P2002 → 409).

| Роут | Поведение |
|---|---|
| `GET /partners` | все, с `_count.tracks` |
| `POST /partners` | 400 zod, 409 дубликат slug, 201 |
| `PATCH /partners/[id]` | частично; 404; 409 slug |
| `DELETE /partners/[id]` | 409 «У партнёра N курс(ов) — сначала отвяжите их» |
| `GET /tracks` | все треки (и черновики) по `order`, с `partner`, `_count.lessons/enrollments`; выпускники и «на проверке» — два `enrollment.groupBy` (по `status=COMPLETED` и по `submission.status=PENDING`), без N+1; ответ `stats { enrollments, graduates, pending, lessons }` |
| `POST /tracks` | zod (`taskCategory` через `z.nativeEnum`, `partnerId` проверяется на существование → 400), 409 slug, 201 |
| `GET /tracks/[id]` | трек + уроки (полные поля) по `order` + `partner` + `_count.enrollments` |
| `PATCH /tracks/[id]` | частично (в т.ч. `isPublished`, `partnerId: null` отвязывает) |
| `DELETE /tracks/[id]` | 409 «На курс записаны N чел. — удалить нельзя. Снимите с публикации»; иначе удаление (уроки каскадом) |
| `POST /tracks/[id]/lessons` | zod + проверка по типу (400), второй `TASK` → 409, 201 |
| `PATCH /lessons/[id]` | проверка по типу на объединённом состоянии (текущее + патч); смена типа на `TASK` при существующем → 409 |
| `DELETE /lessons/[id]` | 409 «Урок уже прошли N чел.» |
| `POST /lessons/[id]/move` | `{direction}`; в `$transaction` ищет соседа по `order` и меняет значения местами (при равных `order` разводит на ±1); крайний → 409 «Урок уже крайний»; возвращает обновлённый список |

`extractYoutubeId` вынесен в `lib/youtube.ts` (без prisma — нужен в клиентских формах), `lib/academy.ts` его реэкспортирует.

## 3. Админ-страницы — `aa8ea7d`, `app/admin/academy/`
- `AcademyTabs.tsx` — вкладки-ссылки «Проверка заданий · Курсы · Партнёры» (вставлены на `page.tsx`, `tracks/*`, `partners`); там же `Toast` — строка «✓ Сохранено» на 2 с.
- `tracks/page.tsx` — карточки: обложка (или эмодзи категории), название, `badge-open` «Опубликован» / `badge-done` «Черновик», slug, категория, порядок, партнёр, «N уроков · записей N · выпускников M · на проверке K» (K подсвечен при > 0), кнопки «Редактировать», «Снять с публикации / Опубликовать» (PATCH `isPublished`), «Открыть на сайте ↗», «+ Новый курс».
- `tracks/new/page.tsx` и `tracks/[id]/page.tsx` → `TrackFormClient.tsx`: поля по `POST /tracks`, select категории из `CATEGORIES`, select партнёра с «— Taskchi —», чекбокс «Опубликован», обложка с превью по URL; slug автогенерируется транслитом из названия, пока админ его не трогал; пустые TJ-поля заполняются RU. После создания — `router.replace` на страницу редактирования. Кнопка «Удалить курс» (confirm, 409 текстом). Блок «Уроки» (только при редактировании): строки `order · иконка типа · название · минуты · ↑ ↓ · Изменить · Удалить(confirm)`, «+ Добавить урок» → инлайн `LessonFormClient.tsx`: тип (select), порядок, минуты, название RU/TJ, и по типу — URL с превью (YouTube nocookie-iframe / `<video>` / подсказка «не YouTube») + поле «Провайдер» (авто `youtube`), либо textarea markdown с живым превью через `components/Markdown`.
- `partners/page.tsx` — список (логотип, название, Активен/Неактивен, slug, описание, «N курсов», сайт) + инлайн-форма создания/правки (slug, name, websiteUrl, logoUrl с превью, descriptionRu, isActive), «Удалить» с confirm, 409 показывается текстом.
- Все ошибки API — текстом под формой/списком; `!res.ok` обрабатывается везде; сетевые ошибки — «Нет связи с сервером». Формы на `useState` (без react-hook-form), клиентская валидация минимальная, серверная — zod.

## 4. Публичная часть — `f50da1d`
- `components/PartnerLine.tsx` — «Курс от <логотип> Alif Academy»; при `websiteUrl` — `<a target="_blank" rel="nofollow noopener noreferrer">`; для `partner = null` ничего не рендерит.
- `app/academy/page.tsx`: обложка 16:9 `object-cover` на карточке при `coverUrl` (иначе — как раньше), строка партнёра под описанием, внизу блок «Для компаний и школ» с текстом по ТЗ и кнопкой «Написать нам» → `mailto:info@taskchi.tj?subject=Курс на Taskchi Academy`.
- `app/academy/[slug]/page.tsx`: строка партнёра в шапке под заголовком.
- `app/academy/[slug]/[lessonId]/page.tsx`: `VIDEO` с `externalUrl` → `<video controls playsInline preload="metadata">` 16:9 с fallback-ссылкой; заглушка «Видео скоро» осталась только для пустого `externalUrl`.
- `GET /api/academy/tracks`, `GET /api/academy/tracks/[slug]` отдают `partner { name, logoUrl, websiteUrl } | null` (без id/slug).

## 5. Проверка (e2e 51/51)
Админ (isAdmin через БД) и ученик регистрируются → гость/ученик на 8 админ-роутах (GET/POST/PATCH/DELETE) → 403 → партнёр: плохой slug 400, создание 201, дубликат 409, PATCH, список → трек-черновик с партнёром и обложкой 201, дубликат slug 409, мусорная категория 400, гостю 404, удаление партнёра с треком 409 → уроки EXTERNAL (YouTube) / VIDEO (публичный mp4) / TEXT / TASK 201, второй TASK 409, VIDEO без ссылки 400, TEXT без текста 400, PATCH в TASK при существующем 409, PATCH названия → move ↑ (порядок `[EXT, TEXT, VIDEO, TASK]`), первый ↑ 409, ↓ обратно → admin GET трека (4 урока, полные поля, партнёр), список со статами `4/0/0/0` и `ai-tools` с 8 уроками → публикация PATCH → гость: карточка с обложкой, «Курс от Alif Academy» с `nofollow`-ссылкой, блок «Для компаний и школ» с mailto, шапка трека с партнёром и логотипом; публичные API с `partner` и `null` у `ai-tools` → ученик записывается, VIDEO-урок рендерит `<video controls playsinline preload="metadata">`, YouTube — nocookie-iframe, TEXT — markdown, проходит урок 1 → удаление урока с прогрессом 409, без прогресса ok, удаление трека с записью 409, статы `enrollments 1, lessons 3` → 5 админ-страниц 200 админу / 307 ученику, вкладки на `/admin/academy` → снятие с публикации + отвязка партнёра, удаление партнёра ok.
`prisma:error` в логе dev-сервера — три ожидаемых P2002 из тестов на дубликат slug (ответ 409).

## 6. Состояние баз
- **Dev после очистки:** `tracks 1, lessons 8, enrollments 0, submissions 0, executor_categories 0, notifications 0, users 0, partners 0` — тестовые партнёр, трек, уроки, пользователи удалены; `ai-tools` на месте.
- **Прод (read-only):** 13 таблиц, 0 таблиц Academy/partners, `TaskCategory` без `DIGITAL`, users 21 / tasks 6 — без изменений.

## 7. Отклонения от ТЗ и решения по ходу
1. `titleTj`/`descriptionTj` обязательны на API (мин. 3/10 символов), но **форма подставляет RU при пустом TJ** — админ не обязан переводить; «равны RU» допускается, как и просили.
2. `DELETE /tracks/[id]` удаляет уроки каскадом (FK `Lesson.trackId onDelete Cascade` из Этапа 0) — только если записей нет, иначе 409.
3. У `Lesson` нет unique по `[trackId, order]` — `move` при совпадающих `order` разводит их на ±1, а не падает.
4. Статистика «на проверке» считается через `enrollment.groupBy` с фильтром `submission.status` — это один запрос, не N+1.
5. Slug трека в форме генерируется транслитерацией (RU + таджикские буквы) — ТЗ этого не требовало, сделано для удобства; админ может переписать.

## 8. Риски и долги
- Логотипы/обложки — внешние URL без проверки, что это картинка (только https): битая ссылка покажет сломанный `<img>`. Превью в форме помогает заметить.
- `<video>` для HLS `.m3u8` играет нативно только в Safari/iOS; в Chrome/Android нужен hls.js — не ставили (решение 3 допускает любой CDN, но для HLS понадобится плеер). mp4 работает везде.
- Поле `order` трека/урока без unique — два урока с одним `order` возможны (сортировка стабильна по `order`, затем произвольна).
- Partner `isActive=false` не скрывает его курсы с витрины — флаг пока информационный.
- К12 rate limiting, Т12 i18n, В19 metadataBase — без изменений; добавились 5 админ-страниц с предупреждением `metadataBase`.
- Админ-экраны без пагинации — при сотнях курсов/партнёров понадобится.

## 9. Выкат в прод — дополнение к отчётам 05 §9 / 06 §10
`migrate diff` против прода теперь дополнительно содержит `CREATE TABLE partners`, `partners_slug_key`, колонку `tracks.partnerId` (войдёт в `CREATE TABLE tracks`), `tracks_partnerId_idx` и FK `tracks_partnerId_fkey`. Всё аддитивно. Порядок прежний: `db push` через session-пулер `:5432` → сид (с реальными ссылками) → merge в `main`. После деплоя контент заводится через `/admin/academy/tracks` и `/admin/academy/partners`, сид больше не обязателен.
