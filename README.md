# Personal Progress Hub

Личное приложение для задач, проектов и прогресса. Задаче не нужно назначать время: её можно взять на сегодня, выполнить или оставить на потом.

Требования и этапы описаны в `instruction.md`. Этот файл не заменяет спецификацию.

## Стек

- Next.js 16 App Router, React, TypeScript, Tailwind CSS
- shadcn/ui
- Supabase через `@supabase/ssr`

## Локальный запуск

```bash
npm install
npm run dev
```

Приложение открывается на [http://localhost:3000](http://localhost:3000) и перенаправляет на `/dashboard`.

Нужен Node.js 20.9 или новее. Сейчас проект проверялся на Node.js 26 LTS.

## Переменные окружения

Скопируй `.env.example` в `.env.local` и заполни значения из Supabase Dashboard → Project Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key

`.env.local` не коммитится. Secret key, service role и пароль базы в клиент и в git не кладутся.

## Проверки

```bash
npm run lint
npm run typecheck
npm run build
```
