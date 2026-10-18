# 06 — Academy, Этап 2: сдача задания, проверка, допуск, бейдж

**Дата:** 18.10.2026
**Ветка:** `feature/academy`, коммиты `82b3698 … 4aa33a4` (+ этот отчёт), запушено в `origin/feature/academy`.
**Статус:** выполнено полностью. Петля замкнута на dev-базе: уроки → сдача → проверка админом → `Enrollment COMPLETED` + `ExecutorCategory DIGITAL/ACADEMY` + уведомление → бейдж в профиле, в откликах и на `/academy`.
**Проверки:** `npx tsc --noEmit` — 0 ошибок; `npm run build` — exit 0; e2e на `npm run dev` — 47/47 (основной сценарий) + 8/8 (бейдж в отклике). Прод `xukvllwttragtnhfvnue` не тронут (п. 7).

---

## 1. Схема — `82b3698`
`prisma/schema.prisma`: `Submission.workUrl String?` (строка 451). `migrate diff` против dev → ровно одна строка `ALTER TABLE "submissions" ADD COLUMN "workUrl" TEXT;`. `npm run db:push:dev` — применено (5,7 с). `fileUrls` оставлен, нигде не используется.

## 2. API ученика — `a1ab2f5`
`app/api/academy/tracks/[slug]/submission/route.ts`:
- **GET** — 401 без сессии; 404 трек; 403 без записи; `{ submission | null, canSubmit, missingLessons }`. `submission` — `SUBMISSION_STUDENT_SELECT` (id, status, workUrl, comment, feedback, reviewedAt, createdAt — без `reviewerId`). `canSubmit = missingLessons === 0 && status !== APPROVED`.
- **POST** — zod: `workUrl` `z.string().url()` + `startsWith("https://")`, `comment` ≤ 2000 optional; 400 с первым сообщением zod; 409 «Сначала пройдите все уроки»; 409 если `APPROVED`; `upsert` по `enrollmentId` → `PENDING`, `feedback` не затирается (в `update` его нет). 201 при создании, 200 при пересдаче.

`lib/academy.ts` (+80 строк): `getAcademyBadges()`, `requiredLessonIds()` / `countMissingLessons()` (все уроки, кроме `TASK`), `SUBMISSION_STUDENT_SELECT`, `toStudentSubmission()` (сериализация дат для клиента).

## 3. API админа — `12494a3`, `app/api/admin/academy/submissions/`
Гейт во всех трёх: `if (!session?.user?.isAdmin) → 403 "Forbidden"` (как в `admin/passport`).
- **GET `?status=`** (`route.ts`) — default `PENDING`, неизвестный статус → `PENDING`. Поля по ТЗ, `user.avatarUrl` ← `User.avatar`, `progress { completed, total }` считается по обязательным урокам (без TASK → «7/7»). Сортировка: `PENDING` по `createdAt asc`, остальные по `reviewedAt desc`.
- **GET `/count`** — `{ pending }`.
- **POST `/[id]/review`** — zod `{ action: APPROVE|REJECT, feedback }`, для REJECT `feedback ≥ 10` (refine, 400); 404; 409 если не `PENDING`. **APPROVE** — одна `$transaction`: `Submission → APPROVED, reviewerId, reviewedAt`; `Enrollment → COMPLETED, completedAt`; `ExecutorCategory.upsert` по `[userId, category = track.taskCategory]` с `source "ACADEMY"`, `trackId`; `notification.create`. **REJECT** — `$transaction`: `Submission → REJECTED, feedback, reviewerId, reviewedAt` + уведомление.
- Уведомления (решение 7): хелпера в проекте нет — везде прямой `prisma.notification.create` (`app/api/offers/route.ts:88` и др.); использован тот же паттерн. Типы `ACADEMY_APPROVED` / `ACADEMY_REJECTED`, `link` → урок TASK (`/academy/<slug>/<lessonId>`), `taskId` не заполняется.

## 4. Страницы ученика — `78f5004`
- `app/academy/[slug]/[lessonId]/SubmissionClient.tsx` (новый): пять состояний по ТЗ — замок «осталось N», форма (`input-field` url + textarea, «Отправить на проверку»), жёлтая `PENDING` (бейдж `badge-review`, дата, ссылка, комментарий), красная `REJECTED` (`badge-cancelled`, feedback, «Пересдать» → та же форма с предзаполнением и прошлым комментарием наставника), зелёная `APPROVED` (`badge-open`, дата, feedback, «🎓 Вам открыта категория 🖥️ Цифровые услуги», «Смотреть задачи →» → `/tasks?category=DIGITAL`). Ошибки — под кнопкой; после успеха `router.refresh()`.
- `app/academy/[slug]/[lessonId]/page.tsx`: для `TASK` сервер читает `Submission` по `enrollmentId`, считает `missingLessons`, передаёт в `SubmissionClient`; заглушка «Сдача задания откроется скоро» удалена. `LessonBody` получил проп `submissionPanel`.
- `app/academy/[slug]/page.tsx` + `TrackActionsClient.tsx`: проп `isCompleted` → бейдж «Курс пройден ✓» вместо прогресс-бара, кнопка «Повторить курс» (`btn-outline`, ведёт на урок 1).
- `app/academy/page.tsx`: `getAcademyBadges(userId)` параллельно с треками; в hero строка «🎓 Вы — выпускник Taskchi Academy» с бейджем; карточка `COMPLETED` — бейдж «Пройден ✓», кнопка `btn-outline` «Пройден ✓», прогресс-бар скрыт.

## 5. Страницы админа — `4aa33a4`
- `app/admin/AdminSidebar.tsx`: пункт «🎓 Академия» → `/admin/academy`; счётчик — `fetch /api/admin/academy/submissions/count` при монтировании и смене `pathname`, красный кружок при `pending > 0` (других бейджей в сайдбаре не было — сделан свой). Страница после действия шлёт `window.dispatchEvent("academy:submissions-changed")`, сайдбар перечитывает счётчик.
- `app/admin/academy/page.tsx` (клиентская, по образцу `verification/page.tsx`): табы, карточки (аватар/инициал, имя → профиль, телефон, email, трек → страница трека, «7/7 уроков», даты сдачи/проверки, «Открыть работу ↗» `target=_blank rel=noopener noreferrer`, комментарий ученика, комментарий проверяющего), textarea + «✓ Принять» / «✗ Отклонить» (клиентская валидация ≥ 10 символов + серверная), ошибки загрузки и действий показываются, кнопка «Повторить».

## 6. Бейдж — `50948f1`
- `components/AcademyBadge.tsx`: `<span className="badge-open" title="…">🎓 Taskchi Academy</span>`; `title` = «<трек> · <категория>» (несколько — через «; »). Не рендерится при пустом массиве.
- `app/profile/[id]/page.tsx` → `getAcademyBadges(user.id)` → проп `academyBadges` в `ProfileClient.tsx`: бейдж рядом с «✓ Верифицирован», ниже строка «🎓 Подтверждено Taskchi Academy: Цифровые услуги» (над тегами навыков — отдельного блока «категории» в профиле нет, есть `skills`).
- `app/tasks/[id]/page.tsx`: в `offers.executor` добавлен `executorCategories (source=ACADEMY)`, названия треков одним запросом, в клиент уходит `executor.academyBadges`; `TaskDetailClient.tsx` рендерит бейдж под рейтингом в карточке отклика (видит заказчик).
- Отклонение от ТЗ: `getAcademyBadges` не может сделать `include track` — у `ExecutorCategory.trackId` нет FK (решение отчёта 01), название трека берётся вторым запросом `track.findMany`.

## 7. Проверка
- `tsc` 0 ошибок, `npm run build` exit 0 — в выводе 13 роутов Academy (4 страницы + 9 API).
- **E2E (47/47):** студент и админ регистрируются (админ — `isAdmin=true` через БД, затем логин, т.к. JWT кэширует флаг); запись; до уроков — `GET` даёт `missing=7`, `POST` → 409 «Сначала пройдите все уроки», страница TASK — замок «Осталось 7»; после 7 complete — `canSubmit=true`, форма; `http://` и мусор → 400; `POST` → 201 `PENDING`, карточка «На проверке»; студент/гость на admin-API → 403, студент на `/admin/academy` → 307 `/dashboard`; админ: count 1, список с `7/7`, страница 200, пункт в сайдбаре; REJECT с коротким feedback → 400, студент на review → 403, REJECT ok → count 0, вкладка «Отклонённые», студент видит feedback + «Пересдать», уведомление `ACADEMY_REJECTED`; пересдача → 200 `PENDING`, feedback сохранён, count 1; APPROVE ok, повторный review → 409, повторная сдача → 409; БД: `Enrollment COMPLETED + completedAt`, `Submission APPROVED + reviewerId`, `ExecutorCategory DIGITAL/ACADEMY/trackId`, 2 уведомления с `link`; страницы: TASK «Принято» + категория + «Смотреть задачи», трек «Курс пройден ✓» + «Повторить курс», `/academy` «Вы — выпускник» + «Пройден ✓», публичный профиль с бейджем и «Подтверждено», гость без строки выпускника, вкладка «Принятые».
- **E2E бейдж в отклике (8/8):** заказчик создаёт DIGITAL-задачу, выпускник откликается, заказчик видит «🎓 Taskchi Academy» с `title="ИИ-инструменты для работы · Цифровые услуги"`.
- Лог dev-сервера без ошибок.
- **Dev после очистки:** `tracks 1, lessons 8, enrollments 0, submissions 0, executor_categories 0, notifications 0, users 0` — тестовые пользователи, задача, отклик удалены, `ai-tools` на месте.
- **Прод (read-only):** 13 таблиц, 0 таблиц Academy, `TaskCategory` без `DIGITAL`, users 21 / tasks 6 / notifications 6 — без изменений.

## 8. Отклонения от ТЗ
1. `include track` в `getAcademyBadges` заменён вторым запросом (нет FK, п. 6).
2. `GET /submission` без записи на трек отдаёт 403, а не `{ submission: null }` — согласовано с POST; страница рендерит панель только записанным, так что на UI не влияет.
3. Прогресс в админ-списке считается по урокам без TASK («7/7»), а не по всем 8 — иначе «7/8» выглядело бы как незавершённый курс.
4. Уведомления созданы прямым `prisma.notification.create` внутри транзакции — хелпера в проекте нет.

## 9. Заглушки и долги
- `PLACEHOLDER_*` в ссылках уроков 1–7 (Этап 1) — без изменений.
- `Submission.fileUrls` — пустой массив, не используется.
- `Lesson.type VIDEO` — заглушка.
- Ревьюеры из выпускников, `Center`, Tj-интерфейс — не делались (по ТЗ).
- **К12 rate limiting** — `POST /submission` и `review` без лимитов; идемпотентны.
- **Т12 i18n**, **В19 metadataBase** — без изменений (+1 страница с предупреждением).
- Telegram-уведомления (как в `admin/passport`) для Academy не отправляются — только in-app `notifications`; при необходимости добавить `sendTelegramMessage` в review.
- Счётчик в сайдбаре обновляется при смене маршрута и после действия на `/admin/academy`, фонового поллинга нет.

## 10. Выкат в прод — дополнение к отчёту 05 §9
Шаг 1 (`migrate diff` против прода) теперь ожидаемо содержит **ещё** `ALTER TABLE "submissions" ADD COLUMN "workUrl" TEXT` — но поскольку таблицы `submissions` в проде нет, она создастся сразу с колонкой (`CREATE TABLE … "workUrl" TEXT`). Остальные шаги без изменений: `db push` через session-пулер `:5432`, сид с реальными ссылками, merge в `main`. Дополнительно после деплоя: назначить проверяющего (`users.isAdmin = true` уже есть у админов — отдельных прав не нужно) и проверить `/admin/academy`.
