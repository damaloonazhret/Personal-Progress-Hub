# Cursor AI — Personal Progress Hub
## Project Specification & Step-by-Step Implementation Guide

Ты выступаешь в роли Senior Full-Stack Engineer и Technical Lead. Твоя задача — помочь мне разработать полноценное персональное веб-приложение Personal Progress Hub на Next.js с использованием Supabase в качестве backend.

Я — frontend-разработчик с опытом React, TypeScript и Next.js. Я хочу не просто получить готовый код, а разобраться в архитектуре, научиться правильно организовывать проект, работать с PostgreSQL, настраивать PWA и автоматизировать deployment через GitHub Actions.

Поэтому работай последовательно, небольшими итерациями, объясняй важные технические решения и проверяй результат каждого этапа.

---

# 1. Product Vision

Personal Progress Hub — это personal productivity application для управления задачами, проектами и личным прогрессом.

Главная идея приложения:

**Я хочу видеть, что нужно сделать в конкретный день и в каком порядке, что уже сделано и что осталось.**

Планирование идёт только по датам: на день и на неделю. У задачи нет времени начала, окончания и продолжительности. Я сам решаю, в какой момент дня её выполнять. Приложение помогает выбрать день и порядок, а не расписать часы.

Это не time-blocking и не система управления встречами. Часы, временные интервалы, duration и time slots не нужны.

Например, у меня есть задачи:

- Изучить 20 новых английских слов.
- Провести тренировку.
- Разобраться с настройкой GitHub Actions.
- Подготовить документы для поездки.
- Смонтировать видео.
- Изучить документацию Next.js.

Я хочу видеть их в одном месте, планировать по дням, выбирать порядок, отмечать выполненное и наблюдать за прогрессом.

Приложение должно помогать мне действовать, а не превращаться в сложный инструмент с временной сеткой.

Основные UX-принципы:

- Minimalism.
- Mobile-first.
- Fast interaction.
- Low cognitive load.
- Flexible task management.
- Planning by date, without times.
- No mandatory time scheduling.
- Clear progress visualization.

---

# 2. Project Context

Supabase project уже создан.

Project URL:

https://supabase.com/dashboard/project/cylmwkuxyvhyxxrfkzfz

В Supabase Dashboard доступны:

- Project URL.
- Publishable key.
- Direct connection string.
- CLI setup commands.

Используй уже созданный Supabase project.

Не создавай новый проект Supabase.

Не запрашивай у меня секретные ключи в чате.

Используй environment variables:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Для серверных операций при необходимости используй отдельные server-side credentials.

Никогда не помещай Supabase service_role key, secret key или database password в клиентский bundle, Git repository или NEXT_PUBLIC_* variables.

Если нужные environment variables отсутствуют, сообщи мне об этом и объясни, где их взять.

---

# 3. Technology Stack

Используй следующий стек:

## Core

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Supabase.
- PostgreSQL.

## Supabase Integration

- @supabase/supabase-js.
- @supabase/ssr для корректной интеграции Supabase Auth с Next.js.
- Supabase PostgreSQL для хранения данных.
- Supabase Row Level Security (RLS) для защиты пользовательских данных.

## Data Management

- TanStack Query для client-side queries и mutations, если это оправдано архитектурой.
- React Hook Form.
- Zod.
- TypeScript types, генерируемые из Supabase schema.

Не добавляй библиотеки без необходимости.

## PWA

- Web App Manifest.
- Service Worker.
- Installable application.
- Offline application shell.
- Возможность постепенно реализовать offline data access.

Сначала изучи актуальные рекомендации по реализации PWA в выбранной версии Next.js.

Не используй устаревшие API или библиотеки только потому, что они встречаются в старых примерах.

## Testing

- Vitest.
- React Testing Library.
- Playwright для E2E tests.

## Deployment

- GitHub.
- GitHub Actions.
- Vercel.

---

# 4. Application Structure

Приложение должно иметь понятную структуру.

Предлагаемая структура:

src/
  app/
    (app)/
      dashboard/
      inbox/
      today/
      projects/
      areas/
      completed/
      settings/
    auth/
      login/
      signup/
      callback/
    api/
    layout.tsx
    page.tsx

  components/
    ui/
    layout/
    tasks/
    projects/
    areas/
    dashboard/

  features/
    tasks/
    projects/
    areas/

  lib/
    supabase/
    utils/
    validations/

  hooks/
  types/

supabase/
  migrations/
  config.toml

.github/
  workflows/

Это предварительная структура.

Перед реализацией проанализируй существующий проект и адаптируй структуру под него.

Не перестраивай весь проект без необходимости.

Не создавай дублирующие файлы и компоненты.

---

# 5. Core Domain Model

Приложение должно поддерживать следующие сущности.

## Areas

Areas — крупные направления жизни.

Примеры:

- English.
- Fitness.
- Development.
- Travel.
- Personal.

Поля:

- id.
- user_id.
- name.
- description.
- color.
- icon.
- position.
- created_at.
- updated_at.

## Projects

Projects — конкретные проекты внутри Areas.

Примеры:

Development:
- Personal Progress Hub.
- Next.js Learning.
- CI/CD Learning.

English:
- Vocabulary.
- Speaking.
- Shadowing.

Поля:

- id.
- user_id.
- area_id.
- name.
- description.
- status.
- color.
- position.
- created_at.
- updated_at.

## Tasks

Tasks — конкретные действия.

Поля:

- id.
- user_id.
- area_id.
- project_id.
- title.
- description.
- status.
- priority.
- due_date.
- position.
- created_at.
- updated_at.
- completed_at.

Основные статусы:

- todo.
- done.

При необходимости можно добавить archived, но не усложняй модель без реальной необходимости.

Priority:

- low.
- medium.
- high.

Due date — необязательный срок выполнения.

Дата планирования — день, на который пользователь собирается выполнить задачу. Это другое понятие. Поле появится в Phase 6 и не заменяет `due_date`.

Не добавляй обязательное поле scheduled_time.

Не привязывай задачи к обязательным временным слотам.

## Дополнительные сущности

Phase 6 разделяет три понятия: шаблон задачи, правило повторения и конкретную задачу. Повторение становится самостоятельной задачей. Пропуск одного повторения не меняет всё правило.

Окончательную структуру таблиц сейчас не фиксируем. Перед Phase 6 нужно отдельно разобрать существующую схему, спроектировать миграции и проверить граничные случаи. До этого схему Supabase и прикладной код под планирование не менять.

Если для реализации прогресса или истории выполнения действительно потребуется дополнительная таблица, сначала объясни мне, зачем она нужна.

Не создавай избыточную domain model.

---

# 6. Main Application Features

## Dashboard

Главный экран приложения.

Он должен показывать:

- Количество активных задач.
- Количество выполненных задач за текущий день.
- Задачи на сегодня.
- Активные проекты.
- Progress по направлениям.
- Недавно выполненные задачи.

Dashboard должен быть информативным, но не перегруженным.

## Inbox

Inbox — список всех задач, которые ещё не распределены по конкретным проектам или дням.

Возможности:

- Создание задачи.
- Редактирование.
- Удаление.
- Изменение priority.
- Перемещение в проект.
- Перемещение в Today.
- Mark as completed.

## Today

Today — задачи на текущий день.

Phase 4 уже делает это ручным списком: задача попадает сюда, только если её добавили, и остаётся, пока её не выполнят или не уберут. `due_date` сам по себе в Today не добавляет. Невыполненная задача не считается просроченной только потому, что наступил следующий день.

С Phase 6 в Today автоматически попадают задачи, запланированные на текущую календарную дату. Обычную задачу на текущий день можно добавить сразу, без правила повторения. Незавершённая задача после смены даты не исчезает сама: пользователь переносит её на другой день. Срок `due_date` и дата планирования остаются разными полями.

Возможности:

- Добавление задач из Inbox.
- Добавление задач из Projects.
- Быстрое добавление задачи на текущий день.
- Изменение порядка задач.
- Отметка выполнения.
- Перенос задачи обратно в Inbox.
- Просмотр количества оставшихся задач.

## Шаблоны задач

Пользователь создаёт шаблон и указывает название, описание, приоритет и другие подходящие параметры.

Из шаблона создаётся новая задача. Её можно редактировать независимо от шаблона. Один шаблон используется неограниченное число раз.

Это Phase 6, блок Templates.

## Повторяющиеся задачи

Правило повторения настраивается гибко:

- Каждый день.
- Каждые N дней.
- Каждую неделю.
- Каждые N недель.
- В определённые дни недели.
- Пользовательский интервал.

У правила есть дата начала и необязательная дата окончания. Его можно приостановить и возобновить, изменить или отменить. Одно конкретное повторение можно пропустить, не меняя остальное правило.

Каждое сгенерированное повторение — самостоятельная задача. Редактирование одного экземпляра не меняет всю серию. Повторное открытие или обновление страницы не создаёт дубликаты.

Это Phase 6, блок Recurring Tasks.

## Календарь

Отдельный раздел «Календарь» с двумя представлениями:

- День — список задач на выбранную дату.
- Неделя — обзор задач по дням недели.

Возможности:

- Переключение дат и недель.
- Создание задачи прямо из календаря.
- Перемещение задачи на другой день.
- Отображение повторяющихся задач.
- Сортировка задач внутри дня.
- Отображение приоритетов.

Часы, временные интервалы, duration, time slots и управление встречами не входят в этот раздел.

Это Phase 6, блок Calendar.

## Приоритет и порядок дня

Приоритет задачи: низкий, средний, высокий.

По умолчанию задачи дня сортируются по приоритету. Пользователь может вручную менять порядок.

Если задача переносится в другую группу приоритета, приоритет меняется по новому положению. Если она двигается внутри той же группы, меняется только позиция.

Приоритет и ручной порядок сохраняются после перезагрузки.

Phase 4 уже хранит приоритет и ручной порядок. Автоматическая смена приоритета при переносе между группами — требование Phase 6, текущий код этого не делает.

## Projects

Projects — список активных проектов.

Каждый проект должен показывать:

- Название.
- Area.
- Количество задач.
- Количество выполненных задач.
- Progress percentage.
- Список задач.

Progress рассчитывается на основании выполненных и активных задач.

Например:

English Speaking

- 30 tasks.
- 12 completed.
- 18 remaining.
- Progress: 40%.

Пустой проект не должен отображать 100% progress.

## Areas

Areas — направления жизни.

Каждое направление показывает связанные проекты и задачи.

## Completed

Список выполненных задач.

Возможности:

- Просмотр истории.
- Фильтрация по проекту.
- Фильтрация по Area.
- Фильтрация по дате выполнения.
- Восстановление задачи.

---

# 7. UX / UI Requirements

Приложение должно выглядеть как современный minimal productivity tool.

Основные требования:

- Mobile-first responsive design.
- Хорошая поддержка iPhone.
- Поддержка desktop.
- Dark mode и light mode.
- Удобная навигация.
- Минимальное количество действий для создания задачи.
- Быстрое переключение между разделами.
- Хорошая визуальная иерархия.
- Accessible controls.
- Empty states.
- Loading states.
- Error states.
- Toast notifications.

Основная навигация:

- Dashboard.
- Inbox.
- Today.
- Calendar.
- Projects.
- Areas.
- Completed.

Раздел Calendar появляется в Phase 6. До неё его в навигации нет.

На mobile используй компактную навигацию, например bottom navigation.

На desktop можно использовать sidebar.

Не делай интерфейс похожим на сложную enterprise application.

Основная задача — быстро открыть приложение, увидеть список задач и начать действовать.

---

# 8. Authentication & Security

Реализуй полноценную Supabase Auth integration.

Требования:

- Email/password authentication.
- Signup.
- Login.
- Logout.
- Session management.
- Protected routes.
- Server-side session handling.
- Redirect unauthenticated users на login.
- Redirect authenticated users на dashboard.

Все пользовательские данные должны быть защищены.

Используй Row Level Security.

Для каждой таблицы с пользовательскими данными создай соответствующие RLS policies.

Пользователь должен иметь возможность читать, создавать, изменять и удалять только собственные записи.

Не полагайся исключительно на фильтрацию user_id в frontend.

Безопасность должна обеспечиваться на уровне database policies и server-side logic.

---

# 9. Database Migrations

Используй Supabase CLI и migrations.

Все изменения database schema должны быть представлены в виде migration files.

Не изменяй production database вручную, если соответствующее изменение можно оформить migration.

При необходимости используй Supabase CLI для:

- Инициализации локальной конфигурации.
- Создания migrations.
- Генерации TypeScript types.
- Проверки database schema.
- Применения migrations.

Если для выполнения CLI-команды требуется подключение к Supabase или подтверждение с моей стороны, объясни, что именно нужно сделать.

Не выполняй destructive migrations без предварительного объяснения.

Не удаляй существующие таблицы или данные без моего явного согласия.

---

# 10. PWA Requirements

Приложение должно быть installable.

Требования:

- Manifest.
- Application icons.
- App name.
- Theme color.
- Standalone display mode.
- Service Worker.
- Offline application shell.
- Correct handling of cached assets.

Приложение должно корректно открываться после установки на iPhone.

Не обещай полноценную offline synchronization до её реализации.

Сначала обеспечь возможность загрузить интерфейс offline.

Затем отдельно реализуй offline data access.

При реализации offline mutations обязательно учитывай:

- Pending changes.
- Synchronization queue.
- Retry strategy.
- Conflict resolution.
- Возможные дубликаты операций.

Не кэшируй приватные API responses или пользовательские данные без продуманной стратегии безопасности.

---

# 11. GitHub Actions & CI/CD

Я хочу научиться правильно организовывать deployment pipeline.

Настрой GitHub Actions для автоматических проверок.

Предлагаемый pipeline:

1. Checkout repository.
2. Setup Node.js.
3. Install dependencies.
4. ESLint.
5. TypeScript checks.
6. Unit tests.
7. Production build.

Pipeline должен запускаться при:

- Pull requests.
- Push в main.
- При необходимости — push в develop.

Не добавляй deployment credentials в Git repository.

Используй GitHub Secrets и environment variables.

Для deployment используй Vercel.

Если GitHub уже подключён к Vercel, объясни, какие действия выполняет Vercel автоматически, а какие проверки остаются за GitHub Actions.

Не создавай дублирующие deployment pipelines без необходимости.

---

# 12. Development Workflow

Это критически важная часть задания.

**Не пытайся реализовать весь проект за один проход.**

Работай строго поэтапно.

Текущий статус фаз ведётся в `IMPLEMENTATION_PLAN.md`. Завершённые фазы не переделывай.

## Phase 0 — Project Audit

Сначала:

1. Изучи текущую структуру проекта.
2. Проверь package.json.
3. Проверь Next.js version.
4. Проверь существующие зависимости.
5. Проверь текущую конфигурацию TypeScript.
6. Проверь Tailwind CSS.
7. Проверь Git repository.
8. Проверь наличие Supabase integration.
9. Проверь существующие environment variables, не выводя их секретные значения.
10. Определи, какие компоненты уже реализованы.

Не изменяй файлы на этом этапе.

Составь краткий audit report:

- Что уже существует.
- Что настроено правильно.
- Что необходимо исправить.
- Какие следующие шаги.

После этого предложи implementation plan.

## Phase 1 — Foundation

Настрой:

- Базовую архитектуру.
- Supabase clients.
- Environment variables.
- Базовые UI components.
- Layout.
- Navigation.
- Theme.

Проверь:

- npm run lint.
- npm run typecheck, если такой script существует.
- npm run build.

Если scripts отсутствуют, добавь их.

## Phase 2 — Database

Создай:

- Areas table.
- Projects table.
- Tasks table.
- Foreign keys.
- Indexes.
- RLS policies.
- Migrations.

Проверь корректность schema.

Сгенерируй TypeScript types.

## Phase 3 — Authentication

Реализуй signup, login, logout и protected routes.

Проверь корректность session handling.

## Phase 4 — Tasks

Уже реализовано и принято:

- Create task.
- Read tasks.
- Update task.
- Delete task.
- Mark as completed.
- Inbox.
- Today как ручной список.
- Краткая сводка на обзоре.

Календарное планирование, шаблоны и повторения сюда не входят.

## Phase 5 — Projects & Areas

Реализуй:

- Projects CRUD.
- Areas CRUD.
- Task grouping.
- Progress calculations.
- Filters.

## Phase 6 — Planning: Templates, Recurring Tasks & Calendar

Одна большая фаза из трёх последовательных блоков. У каждого блока свои критерии готовности и проверки. К следующему блоку не переходи, пока текущий не проверен.

Перед первым блоком отдельно спроектируй миграции по существующей схеме. Не выбирай структуру таблиц заранее и не начинай код, пока разбор схемы и граничных случаев не согласован.

Общие архитектурные требования фазы:

- Шаблон, правило повторения и конкретная задача разделены.
- Экземпляр повторения независим от серии.
- Повторная генерация не создаёт дубликаты.
- Дата планирования хранится отдельно от `due_date`.
- Календарная дата считается в локальном часовом поясе пользователя, без времени суток.
- Ручной порядок и приоритет сохраняются.
- Все строки закрыты RLS и видны только владельцу.
- Одно пропущенное повторение не меняет всё правило.
- Незавершённая задача не пропадает при смене даты, пока пользователь сам её не перенесёт.

### Block 1 — Templates

Готово, когда пользователь может:

- Создать шаблон с названием, описанием, приоритетом и другими подходящими параметрами.
- Создать из шаблона новую задачу.
- Изменить эту задачу, не изменяя шаблон.
- Использовать тот же шаблон сколько угодно раз.

Проверь создание, повторное использование, независимость задачи от шаблона и доступ только к своим шаблонам.

### Block 2 — Recurring Tasks

Готово, когда правило умеет:

- Каждый день.
- Каждые N дней.
- Каждую неделю.
- Каждые N недель.
- Выбранные дни недели.
- Пользовательский интервал.
- Дату начала и необязательную дату окончания.
- Паузу и возобновление.
- Пропуск одного повторения.
- Изменение и отмену правила.

Каждое повторение — отдельная задача. Правка одного экземпляра не меняет серию. Обновление страницы и повторный заход не создают дубликаты.

Проверь все интервалы, паузу, пропуск, отмену, независимость экземпляра и отсутствие дублей.

### Block 3 — Calendar

Готово, когда есть раздел «Календарь»:

- День: задачи выбранной даты.
- Неделя: задачи по дням недели.
- Переключение дат и недель.
- Создание задачи из календаря.
- Перенос задачи на другой день.
- Повторяющиеся задачи видны в своих днях.
- Внутри дня задачи по умолчанию идут по приоритету, и порядок можно менять вручную.
- Приоритет виден.
- Перенос в другую группу приоритета меняет приоритет. Перенос внутри группы меняет только позицию.
- Приоритет и порядок сохраняются после перезагрузки.
- Задача, запланированная на сегодняшнюю календарную дату, видна в Today.
- Обычную задачу на сегодня можно добавить без правила повторения.
- Незавершённая задача остаётся, пока пользователь не перенесёт её на другой день.
- `due_date` не подменяет дату планирования.

Часов, интервалов, duration, time slots и встреч в календаре нет.

## Phase 7 — Dashboard improvements

Расширь обзор: выполненное за день, задачи на сегодня, активные проекты, прогресс по направлениям и недавно выполненные задачи.

Не подменяй эту фазу календарём из Phase 6.

## Phase 8 — PWA

Добавь manifest, Service Worker, installation support и offline application shell.

## Phase 9 — Testing

Добавь unit tests и E2E tests.

Проверь основные пользовательские сценарии.

## Phase 10 — CI/CD

Настрой GitHub Actions.

Проверь pipeline на pull request.

## Phase 11 — Production Deployment

Подготовь production deployment.

Проверь:

- Environment variables.
- Supabase production configuration.
- Database migrations.
- Authentication redirects.
- RLS policies.
- PWA installation.
- Mobile responsiveness.

---

# 13. Mandatory Rules For Cursor

Следуй этим правилам на протяжении всего проекта.

### Rule 1 — Incremental Development

Не реализуй все phases одновременно.

Работай над одной phase за раз.

### Rule 2 — Explain Important Decisions

Перед существенными архитектурными изменениями объясняй:

- Что изменяется.
- Почему это необходимо.
- Какие альтернативы существуют.
- Почему выбран текущий вариант.

Не объясняй каждую строку очевидного кода.

### Rule 3 — Inspect Before Editing

Перед изменением файла изучи его текущее содержимое.

Не переписывай файлы полностью, если можно внести точечные изменения.

### Rule 4 — Verify After Changes

После каждой meaningful iteration:

- Запусти lint.
- Запусти typecheck.
- Запусти relevant tests.
- Проверь build, когда это необходимо.

Если проверка не проходит, исправь проблему прежде, чем переходить дальше.

### Rule 5 — No Fake Implementations

Не создавай mock backend, если можно использовать настоящий Supabase.

Не оставляй кнопки, которые визуально работают, но ничего не делают.

Не используй hardcoded data вместо реальных данных, если feature уже подключена к backend.

### Rule 6 — No Unnecessary Complexity

Не добавляй:

- Microservices.
- Redis.
- Docker, если он не нужен для выбранного deployment.
- Сложные abstractions.
- Избыточные state management libraries.
- Ненужные таблицы.
- Сложную permission system.

Предпочитай простые и maintainable решения.

### Rule 7 — Ask Before Destructive Actions

Перед удалением данных, destructive migrations или изменением production infrastructure обязательно получи моё подтверждение.

### Rule 8 — Maintain Project Documentation

Поддерживай актуальный:

- README.md.
- DEVELOPMENT.md.
- ARCHITECTURE.md.
- IMPLEMENTATION_PLAN.md.

В IMPLEMENTATION_PLAN.md отмечай completed phases и следующие шаги.

### Rule 9 — End Each Phase With A Report

После завершения каждой phase предоставляй:

1. Что реализовано.
2. Какие файлы изменены.
3. Какие команды выполнены.
4. Какие проверки пройдены.
5. Какие проблемы остались.
6. Что необходимо сделать вручную.
7. Следующий этап.

Не переходи к следующей phase автоматически, если требуется моё решение или подтверждение.

---

# 14. Start Here

Начни с Phase 0 — Project Audit.

Не создавай новые компоненты и не изменяй код до завершения аудита.

Изучи текущий проект, подготовь audit report и предложи конкретный implementation plan с учетом того, что Supabase project уже создан.

Моя цель — получить качественное, maintainable приложение, которое я действительно буду использовать ежедневно, и одновременно освоить полноценный workflow разработки и deployment Next.js application.