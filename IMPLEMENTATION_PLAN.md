# Implementation plan

Источник требований: `instruction.md`.

## Сделано

- [x] Phase 0 — аудит. Репозиторий был пустым, Supabase project уже создан.
- [x] Чистый Next.js baseline. Коммит `d1c059d` на `main`: Next.js 16.4.4, React 19, TypeScript, Tailwind CSS 4, ESLint, `src/`.
- [x] Phase 1 — Foundation. Клиенты Supabase, `.env.example`, shadcn/ui, тема, оболочка и навигация по разделам.

## Дальше

- [ ] Phase 2 — Database. Таблицы areas, projects, tasks, внешние ключи, индексы, RLS, миграции и сгенерированные TypeScript types.
- [ ] Phase 3 — Authentication. Signup, login, logout, защита маршрутов.
- [ ] Phase 4 — Core tasks. CRUD, выполнение, Inbox и Today.
- [ ] Phase 5 — Projects и Areas, группировка, прогресс, фильтры.
- [ ] Phase 6 — Dashboard.
- [ ] Phase 7 — PWA: manifest, service worker, offline shell.
- [ ] Phase 8 — Vitest, Testing Library, Playwright.
- [ ] Phase 9 — GitHub Actions: lint, typecheck, tests, build. Деплой остаётся за Vercel.
- [ ] Phase 10 — Production.

## Перед Phase 2

Принадлежность к Today предлагается хранить на задаче, отдельно от необязательного `due_date`:

- `in_today` — задача остаётся в Today, пока её не выполнят или не вернут назад.
- `today_position` — порядок только на экране Today.
- `position` — порядок во входящих и внутри проекта.

Отдельная таблица истории пока не нужна: для списка выполненного хватает `completed_at`.

Миграции не применяются, пока это решение не подтверждено.
