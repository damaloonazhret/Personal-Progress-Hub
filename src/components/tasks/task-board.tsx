"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";

import { TaskComposer } from "@/components/tasks/task-composer";
import { TaskRow } from "@/components/tasks/task-row";
import {
  addTaskToToday,
  completeTask,
  createTask,
  deleteTask,
  moveTask,
  removeTaskFromToday,
  restoreTask,
  updateTask,
} from "@/lib/tasks/actions";
import {
  applyTaskUpdate,
  formatTaskCount,
  type TOptimisticUpdate,
  type TTask,
  type TTaskPlace,
  type TTaskView,
} from "@/lib/tasks/model";

type TProps = {
  tasks: TTask[];
  view: TTaskView;
  today: string;
  loadError: string | null;
};

const emptyCopy: Record<TTaskView, string> = {
  inbox: "Во входящих пусто. Новая задача появится здесь, пока её не возьмёшь на сегодня и не положишь в проект.",
  today: "На сегодня ничего не выбрано. Этот список не заполняется по срокам и не очищается на следующий день.",
  completed: "Выполненных задач пока нет. Завершённая задача попадёт сюда, и её можно будет вернуть.",
};

export function TaskBoard({ tasks, view, today, loadError }: TProps) {
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, (current: TTask[], update: TOptimisticUpdate) =>
    applyTaskUpdate(current, update, view),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canCreate = view === "inbox" || view === "today";
  const place: TTaskPlace = view === "today" ? "today" : "inbox";
  const isEmpty = optimisticTasks.length === 0;

  const run = (update: TOptimisticUpdate, request: () => Promise<{ error: string | null }>) => {
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

  const handleCreate = (task: TTask) => {
    return run({ type: "add", task }, () => createTask({ title: task.title, place }));
  };

  const handleComplete = (id: string) => {
    void run({ type: "remove", id }, () => completeTask(id));
  };

  const handleRestore = (id: string) => {
    void run({ type: "remove", id }, () => restoreTask(id));
  };

  const handleAddToToday = (id: string) => {
    void run({ type: "remove", id }, () => addTaskToToday(id));
  };

  const handleRemoveFromToday = (id: string) => {
    void run({ type: "remove", id }, () => removeTaskFromToday(id));
  };

  const handleDelete = (id: string) => {
    void run({ type: "remove", id }, () => deleteTask(id));
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    void run({ type: "move", id, direction }, () => moveTask(id, direction, place));
  };

  const handleSave = (input: {
    id: string;
    title: string;
    description: string;
    priority: TTask["priority"];
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

  return (
    <div className="flex flex-col gap-4">
      {canCreate ? <TaskComposer place={place} onCreate={handleCreate} /> : null}
      {view === "today" && !loadError ? (
        <p className="text-sm text-muted-foreground">{formatTaskCount(optimisticTasks.length)} в списке</p>
      ) : null}
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
      {isEmpty && !loadError ? (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm leading-6 text-muted-foreground">{emptyCopy[view]}</p>
          {view === "today" ? (
            <Link href="/inbox" className="mt-3 inline-flex text-sm font-medium underline-offset-4 hover:underline">
              Открыть входящие
            </Link>
          ) : null}
        </div>
      ) : null}
      {optimisticTasks.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {optimisticTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              view={view}
              today={today}
              isFirst={index === 0}
              isLast={index === optimisticTasks.length - 1}
              onComplete={handleComplete}
              onRestore={handleRestore}
              onAddToToday={handleAddToToday}
              onRemoveFromToday={handleRemoveFromToday}
              onDelete={handleDelete}
              onMove={handleMove}
              onSave={handleSave}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
