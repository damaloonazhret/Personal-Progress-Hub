import { z } from "zod";

export const taskPriorities = ["low", "medium", "high"] as const;

export type TTaskPriority = (typeof taskPriorities)[number];
export type TTaskStatus = "todo" | "done";
export type TTaskView = "inbox" | "today" | "completed" | "project" | "area";
export type TTaskPlace = "inbox" | "today";
export type TTaskDirection = "up" | "down";

export type TTaskScope = {
  view: TTaskView;
  projectId?: string;
  areaId?: string;
};

export type TTask = {
  id: string;
  title: string;
  description: string | null;
  status: TTaskStatus;
  priority: TTaskPriority;
  dueDate: string | null;
  inToday: boolean;
  position: number;
  todayPosition: number | null;
  completedAt: string | null;
  projectId: string | null;
  areaId: string | null;
  createdAt: string;
};

export type TOptimisticUpdate =
  | { type: "add"; task: TTask }
  | { type: "patch"; id: string; patch: Partial<TTask> }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; direction: TTaskDirection };

const dueDateSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    if (value.length === 0) {
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Укажите корректную дату." });
      return;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isRealDate =
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

    if (!isRealDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Такой даты нет." });
    }
  });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Введите название.").max(200, "Название не длиннее 200 символов."),
  place: z.enum(["inbox", "today"]),
  projectId: z.string().uuid().nullable().optional(),
  areaId: z.string().uuid().nullable().optional(),
});

export const placeTaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  areaId: z.string().uuid().nullable(),
});

export const editTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Введите название.").max(200, "Название не длиннее 200 символов."),
  description: z.string().trim().max(4000, "Описание не длиннее 4000 символов."),
  priority: z.enum(taskPriorities, { message: "Выберите приоритет." }),
  dueDate: dueDateSchema,
});

export const taskIdSchema = z.string().uuid();

export const priorityLabels: Record<TTaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export function isInboxTask(task: Pick<TTask, "status" | "projectId" | "areaId" | "inToday">) {
  return task.status === "todo" && task.projectId === null && task.areaId === null && !task.inToday;
}

export function isTodayTask(task: Pick<TTask, "status" | "inToday">) {
  return task.status === "todo" && task.inToday;
}

export function belongsToScope(task: TTask, scope: TTaskScope) {
  if (scope.view === "project") {
    return task.status === "todo" && task.projectId === scope.projectId;
  }

  if (scope.view === "area") {
    return task.status === "todo" && task.areaId === scope.areaId && task.projectId === null;
  }

  if (scope.view === "completed" && scope.projectId) {
    return task.status === "done" && task.projectId === scope.projectId;
  }

  if (scope.view === "completed" && scope.areaId) {
    return task.status === "done" && task.areaId === scope.areaId;
  }

  return belongsToView(task, scope.view);
}

export function belongsToView(task: TTask, view: TTaskView) {
  if (view === "inbox") {
    return isInboxTask(task);
  }

  if (view === "today") {
    return isTodayTask(task);
  }

  if (view === "project" || view === "area") {
    return task.status === "todo";
  }

  return task.status === "done";
}

export function compareTasks(view: TTaskView) {
  return (left: TTask, right: TTask) => {
    if (view === "completed") {
      return (right.completedAt ?? "").localeCompare(left.completedAt ?? "");
    }

    if (view === "today") {
      const byTodayPosition = (left.todayPosition ?? 0) - (right.todayPosition ?? 0);
      return byTodayPosition || left.createdAt.localeCompare(right.createdAt);
    }

    return left.position - right.position || left.createdAt.localeCompare(right.createdAt);
  };
}

export function moveTaskInList(tasks: TTask[], id: string, direction: TTaskDirection, view: Exclude<TTaskView, "completed">) {
  const ordered = [...tasks].sort(compareTasks(view));
  const index = ordered.findIndex((task) => task.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const next = ordered.slice();
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);

  return next.map((task, position) => {
    if (view === "today") {
      return { ...task, todayPosition: position };
    }

    return { ...task, position };
  });
}

export function applyTaskUpdate(tasks: TTask[], update: TOptimisticUpdate, scope: TTaskScope) {
  if (update.type === "remove") {
    return tasks.filter((task) => task.id !== update.id);
  }

  if (update.type === "move") {
    if (scope.view === "completed") {
      return tasks;
    }

    return moveTaskInList(tasks, update.id, update.direction, scope.view);
  }

  if (update.type === "add") {
    const next = belongsToScope(update.task, scope) ? [...tasks, update.task] : tasks;
    return next.sort(compareTasks(scope.view));
  }

  const patched = tasks.map((task) => (task.id === update.id ? { ...task, ...update.patch } : task));
  return patched.filter((task) => belongsToScope(task, scope)).sort(compareTasks(scope.view));
}

export function formatTaskCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} задача`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} задачи`;
  }

  return `${count} задач`;
}

export function formatDueDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isPastDueDate(dueDate: string, today: string) {
  return dueDate < today;
}

export function emptyToNull(value: string) {
  return value.length === 0 ? null : value;
}

export function zodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Проверьте поля формы.";
}
