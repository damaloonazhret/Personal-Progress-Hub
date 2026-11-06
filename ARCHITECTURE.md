# Architecture

Документ описывает каркас приложения и схему базы. Экраны задач к базе ещё не подключены.

## Приложение

Next.js App Router. Исходники лежат в `src/`.

- `/` перенаправляется на `/dashboard` в `next.config.ts`, до рендера страницы.
- `src/app/(app)/` — оболочка приложения: боковое меню на широком экране и нижняя навигация на телефоне.
- `src/components/ui/` — компоненты shadcn/ui.
- `src/components/layout/` — каркас, навигация и переключатель темы.
- `src/lib/navigation.ts` — список разделов.

Страницы разделов пока только объясняют, что появится позже. Они не показывают выдуманные задачи.

## Supabase

Два клиента и один proxy:

- `src/lib/supabase/client.ts` — браузер, `createBrowserClient`.
- `src/lib/supabase/server.ts` — Server Components, Server Actions и Route Handlers, `createServerClient` с cookies.
- `src/lib/supabase/proxy.ts` и `src/proxy.ts` — обновление сессии на каждом запросе через `auth.getClaims()`.

Proxy в Next.js 16 заменяет прежний `middleware.ts`. Server Component не может записать обновлённые cookies, поэтому refresh делается в proxy до рендера. `getSession()` на сервере не используется: cookie можно подделать, а `getClaims()` проверяет подпись токена.

Вход, регистрация и закрытие маршрутов — Phase 3. Сейчас proxy только обновляет сессию и никого не перенаправляет на login.

Ключ в клиенте — publishable key. Он публичный. Secret key и `service_role` в бандл не попадают.

## Тема

`next-themes` ставит класс `dark` на `html`. Цвета заданы токенами shadcn в `src/app/globals.css`. Tailwind CSS 4 подключает тёмную тему через `@custom-variant dark (&:is(.dark *))`.

## База

Три таблицы в `public`: `areas`, `projects`, `tasks`. У каждой включён RLS: `authenticated` читает и меняет только строки, где `user_id = auth.uid()`. Роль `anon` прав на эти таблицы не имеет.

Проект ссылается на сферу того же пользователя. Задача с `project_id` обязана ссылаться на проект того же пользователя и на ту же сферу, что и этот проект. Составные внешние ключи `(user_id, …)` не дают подставить чужой идентификатор.

`due_date` и список Today независимы. `in_today` не сбрасывается на следующий день. Завершение задачи через `status = 'done'` само проставляет `completed_at` и убирает задачу из Today. Возврат в `todo` очищает `completed_at` и не возвращает задачу в Today.

Удаление пользователя удаляет его строки. Удаление сферы удаляет её проекты и задачи, удаление проекта удаляет его задачи.

Миграции:

- `supabase/migrations/20261106150733_create_core_schema.sql`
- `supabase/migrations/20261106150852_index_task_project_area_fk.sql`

Типы схемы лежат в `src/types/database.ts` и подключены к клиентам Supabase.

## Что сознательно отложено

- Формы входа — Phase 3.
- TanStack Query, React Hook Form и Zod — когда появятся реальные мутации и формы.
- PWA и GitHub Actions — отдельные поздние фазы.
