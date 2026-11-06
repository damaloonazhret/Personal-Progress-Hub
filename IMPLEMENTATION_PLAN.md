# Implementation plan

Источник требований: `instruction.md`.

## Сделано

- [x] Phase 0 — аудит. Репозиторий был пустым, Supabase project уже создан.
- [x] Чистый Next.js baseline. Коммит `d1c059d` на `main`: Next.js 16.4.4, React 19, TypeScript, Tailwind CSS 4, ESLint, `src/`.
- [x] Phase 1 — Foundation. Коммит `4ae0a41` на `feature/phase-1-foundation`.
- [x] Phase 2 — Database. Таблицы areas, projects, tasks, составные внешние ключи, индексы, RLS и `src/types/database.ts`. Миграции применены к существующему пустому проекту.

## Дальше

- [x] Phase 3 — Authentication. Email и пароль, сессия, защита маршрутов, подтверждение почты.
- [ ] Phase 4 — Core tasks. CRUD, выполнение, Inbox и Today.
- [ ] Phase 5 — Projects и Areas, группировка, прогресс, фильтры.
- [ ] Phase 6 — Dashboard.
- [ ] Phase 7 — PWA: manifest, service worker, offline shell.
- [ ] Phase 8 — Vitest, Testing Library, Playwright.
- [ ] Phase 9 — GitHub Actions: lint, typecheck, tests, build. Деплой остаётся за Vercel.
- [ ] Phase 10 — Production.

## Модель Today

Подтверждено и записано в `tasks`:

- `in_today` — задача остаётся в Today, пока её не выполнят или не уберут.
- `today_position` — порядок только на экране Today.
- `due_date` — необязательный срок, сам по себе не добавляет задачу в Today.
- `position` — порядок во входящих и внутри проекта.

