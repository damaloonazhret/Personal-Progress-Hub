# Architecture

Документ описывает текущий каркас. Продуктовая модель из `instruction.md` ещё не записана в базу.

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

## Что сознательно отложено

- Таблицы, RLS и миграции — Phase 2.
- Формы входа — Phase 3.
- TanStack Query, React Hook Form и Zod — когда появятся реальные мутации и формы.
- PWA и GitHub Actions — отдельные поздние фазы.
