"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type ChangeEvent, type FormEvent, type MouseEvent } from "react";

import { CalendarDayTask } from "@/components/calendar/calendar-day-task";
import { Button } from "@/components/ui/button";
import { calendarWeekdayLabels, formatWeekday } from "@/lib/calendar/month";
import type { TCalendarDay } from "@/lib/calendar/month";
import type { TCatalog } from "@/lib/organization/queries";
import { cn } from "@/lib/utils";
import {
  completeTask,
  createTask,
  moveDayTask,
  restoreTask,
  scheduleTask,
  updateTask,
} from "@/lib/tasks/actions";
import {
  compareTasks,
  createTaskSchema,
  formatDueDate,
  formatTaskCount,
  isSameTodayGroup,
  moveTaskInList,
  priorityLabels,
  zodMessage,
  type TTask,
  type TTaskPriority,
} from "@/lib/tasks/model";

type TCalendarUpdate =
  | { type: "add"; task: TTask }
  | { type: "patch"; id: string; patch: Partial<TTask> }
  | { type: "remove"; id: string }
  | { type: "reorder"; id: string; direction: "up" | "down"; date: string };

type TProps = {
  today: string;
  monthLabel: string;
  monthQuery: string;
  days: TCalendarDay[];
  tasks: TTask[];
  selectedDate: string;
  rangeStart: string;
  rangeEnd: string;
  previousHref: string | null;
  nextHref: string | null;
  todayHref: string;
  loadError: string | null;
  catalog: TCatalog;
};

const priorityMarkClass: Record<TTaskPriority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

const priorityRingClass: Record<TTaskPriority, string> = {
  high: "border-red-500",
  medium: "border-amber-500",
  low: "border-sky-500",
};

function isInsideRange(task: TTask, rangeStart: string, rangeEnd: string) {
  return task.scheduledDate !== null && task.scheduledDate >= rangeStart && task.scheduledDate <= rangeEnd;
}

function reorderDay(tasks: TTask[], id: string, direction: "up" | "down", date: string) {
  const dayTasks = tasks.filter((task) => task.scheduledDate === date);
  const nextDay = moveTaskInList(dayTasks, id, direction, "today");
  const positions = new Map(nextDay.map((task) => [task.id, task.dayPosition]));

  return tasks
    .map((task) => {
      const dayPosition = positions.get(task.id);

      if (dayPosition === undefined || task.dayPosition === dayPosition) {
        return task;
      }

      return { ...task, dayPosition };
    })
    .sort(compareTasks("today"));
}

function applyCalendarUpdate(tasks: TTask[], update: TCalendarUpdate, rangeStart: string, rangeEnd: string) {
  if (update.type === "reorder") {
    return reorderDay(tasks, update.id, update.direction, update.date);
  }

  if (update.type === "remove") {
    return tasks.filter((task) => task.id !== update.id);
  }

  const next =
    update.type === "add"
      ? [...tasks, update.task]
      : tasks.map((task) => (task.id === update.id ? { ...task, ...update.patch } : task));

  return next.filter((task) => isInsideRange(task, rangeStart, rangeEnd)).sort(compareTasks("today"));
}

export function CalendarBoard({
  today,
  monthLabel,
  monthQuery,
  days,
  tasks,
  selectedDate,
  rangeStart,
  rangeEnd,
  previousHref,
  nextHref,
  todayHref,
  loadError,
  catalog,
}: TProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, (current: TTask[], update: TCalendarUpdate) =>
    applyCalendarUpdate(current, update, rangeStart, rangeEnd),
  );
  const [, startTransition] = useTransition();
  const dayTasks = optimisticTasks.filter((task) => task.scheduledDate === currentDate);
  const isDayEmpty = dayTasks.length === 0;
  const dayLabel = `${formatDueDate(currentDate)}, ${formatWeekday(currentDate)}`;

  const run = (update: TCalendarUpdate, request: () => Promise<{ error: string | null }>) => {
    return new Promise<{ error: string | null }>((resolve) => {
      setError(null);
      startTransition(async () => {
        applyOptimistic(update);
        const result = await request();

        if (result.error) {
          setError(result.error);
        }

        resolve(result);
      });
    });
  };

  const handleSelectDay = (event: MouseEvent<HTMLButtonElement>) => {
    const date = event.currentTarget.dataset.date;

    if (!date) {
      return;
    }

    setCurrentDate(date);
    const params = new URLSearchParams(window.location.search);
    params.set("month", monthQuery);
    params.set("date", date);
    window.history.replaceState(null, "", `/calendar?${params.toString()}`);
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = createTaskSchema.safeParse({
      title,
      place: "inbox",
      scheduledDate: currentDate,
    });

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    const task: TTask = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      description: null,
      status: "todo",
      priority: "medium",
      dueDate: null,
      scheduledDate: currentDate,
      position: Number.MAX_SAFE_INTEGER,
      dayPosition: Number.MAX_SAFE_INTEGER,
      completedAt: null,
      projectId: null,
      areaId: null,
      createdAt: new Date().toISOString(),
    };

    setIsPending(true);

    void run({ type: "add", task }, () =>
      createTask({
        title: parsed.data.title,
        place: "inbox",
        scheduledDate: currentDate,
      }),
    ).then((result) => {
      setIsPending(false);

      if (!result.error) {
        setTitle("");
      }
    });
  };

  const handleComplete = (id: string) => {
    void run({ type: "patch", id, patch: { status: "done" } }, () => completeTask(id));
  };

  const handleRestore = (id: string) => {
    void run({ type: "remove", id }, () => restoreTask(id));
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    void run({ type: "reorder", id, direction, date: currentDate }, () => moveDayTask(id, direction, currentDate));
  };

  const handleSave = (input: {
    id: string;
    title: string;
    description: string;
    priority: TTaskPriority;
    dueDate: string;
  }) => {
    return run(
      {
        type: "patch",
        id: input.id,
        patch: {
          title: input.title,
          description: input.description.length === 0 ? null : input.description,
          priority: input.priority,
          dueDate: input.dueDate.length === 0 ? null : input.dueDate,
        },
      },
      () => updateTask(input),
    );
  };

  const handleSchedule = (id: string, scheduledDate: string) => {
    const staysVisible = scheduledDate >= rangeStart && scheduledDate <= rangeEnd;
    const update: TCalendarUpdate = staysVisible
      ? { type: "patch", id, patch: { scheduledDate, dayPosition: Number.MAX_SAFE_INTEGER } }
      : { type: "remove", id };

    return run(update, () => scheduleTask({ id, scheduledDate }));
  };

  const handleClearDate = (id: string) => {
    return run({ type: "remove", id }, () => scheduleTask({ id, scheduledDate: "" }));
  };

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:items-start">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <div className="flex flex-wrap gap-2">
            {previousHref ? (
              <Button asChild variant="outline">
                <Link href={previousHref}>Назад</Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled>
                Назад
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={todayHref}>Сегодня</Link>
            </Button>
            {nextHref ? (
              <Button asChild variant="outline">
                <Link href={nextHref}>Дальше</Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled>
                Дальше
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground sm:text-xs">
          {calendarWeekdayLabels.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayItems = optimisticTasks.filter((task) => task.scheduledDate === day.date);
            const marks = dayItems.slice(0, 4);
            const hiddenCount = dayItems.length - marks.length;
            const isSelected = day.date === currentDate;
            const isToday = day.date === today;
            const label = `${formatDueDate(day.date)}${isToday ? ", сегодня" : ""}, ${formatTaskCount(dayItems.length)}`;

            return (
              <button
                key={day.date}
                type="button"
                data-date={day.date}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={label}
                onClick={handleSelectDay}
                className={cn(
                  "flex min-h-12 flex-col items-center gap-1 rounded-lg px-0.5 py-1 text-xs sm:min-h-16 sm:text-sm",
                  day.inMonth ? "text-foreground" : "bg-muted/50 text-muted-foreground",
                  isToday && !isSelected && "ring-2 ring-primary ring-inset",
                  isSelected && "bg-primary text-primary-foreground",
                )}
              >
                <span className="font-medium">{Number(day.date.slice(8, 10))}</span>
                <span className="flex h-3 items-center gap-0.5">
                  {marks.map((task) => (
                    <span
                      key={task.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        task.status === "done"
                          ? `border bg-transparent ${priorityRingClass[task.priority]}`
                          : priorityMarkClass[task.priority],
                      )}
                    />
                  ))}
                  {hiddenCount > 0 ? <span className="text-[10px] leading-none">+{hiddenCount}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Цвет точки — приоритет: красный высокий, жёлтый средний, синий низкий. Заливка — задача в работе, контур — выполнена.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{dayLabel}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Перенос и очистка даты не меняют срок и исходный день повторения. Возврат в активные снимает дату планирования.
          </p>
        </div>
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <label htmlFor="calendar-task-title" className="text-sm font-medium">
            Новая задача на этот день
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="calendar-task-title"
              name="title"
              value={title}
              onChange={handleTitleChange}
              placeholder="Что запланировать"
              maxLength={200}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" disabled={isPending} className="sm:w-auto">
              {isPending ? "Добавление…" : "Добавить"}
            </Button>
          </div>
        </form>
        {loadError ? (
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {isDayEmpty && !loadError ? (
          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="text-sm leading-6 text-muted-foreground">На этот день ничего не запланировано.</p>
          </div>
        ) : null}
        {dayTasks.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {dayTasks.map((task, index) => (
              <CalendarDayTask
                key={task.id}
                task={task}
                catalog={catalog}
                isMoveUpDisabled={!isSameTodayGroup(dayTasks[index - 1], task)}
                isMoveDownDisabled={!isSameTodayGroup(task, dayTasks[index + 1])}
                onComplete={handleComplete}
                onRestore={handleRestore}
                onMove={handleMove}
                onSave={handleSave}
                onSchedule={handleSchedule}
                onClearDate={handleClearDate}
              />
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Внутри дня сначала {priorityLabels.high.toLowerCase()}, затем {priorityLabels.medium.toLowerCase()} и {priorityLabels.low.toLowerCase()}. «Выше» и «Ниже» меняют порядок только внутри одного приоритета.
        </p>
      </div>
    </div>
  );
}
