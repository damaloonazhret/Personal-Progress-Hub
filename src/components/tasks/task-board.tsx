"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type ChangeEvent } from "react";

import { TaskComposer } from "@/components/tasks/task-composer";
import { TaskRow } from "@/components/tasks/task-row";
import type { TCatalog } from "@/lib/organization/queries";
import {
  addTaskToToday,
  completeTask,
  createTask,
  deleteTask,
  moveTask,
  placeTask,
  removeTaskFromToday,
  restoreTask,
  updateTask,
} from "@/lib/tasks/actions";
import {
  applyTaskUpdate,
  formatTaskCount,
  isSameTodayGroup,
  type TOptimisticUpdate,
  type TTask,
  type TTaskPlace,
  type TTaskScope,
} from "@/lib/tasks/model";

type TProps = {
  tasks: TTask[];
  scope: TTaskScope;
  today: string;
  loadError: string | null;
  catalog?: TCatalog;
  showFilters?: boolean;
};

const emptyCopy: Record<TTaskScope["view"], string> = {
  inbox: "Во входящих пусто. Здесь лежат активные задачи без сферы и проекта. Дата планирования их отсюда не убирает.",
  today: "На сегодня ничего не запланировано. Незавершённая задача с прошедшей датой остаётся здесь. Срок сам по себе сюда не добавляет.",
  completed: "Выполненных задач пока нет. Завершённая задача попадёт сюда, и её можно будет вернуть.",
  project: "В проекте пока нет активных задач.",
  area: "В сфере пока нет задач вне проектов.",
};

export function TaskBoard({ tasks, scope, today, loadError, catalog, showFilters = false }: TProps) {
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, (current: TTask[], update: TOptimisticUpdate) =>
    applyTaskUpdate(current, update, scope, today),
  );
  const [error, setError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [, startTransition] = useTransition();
  const canCreate = scope.view === "inbox" || scope.view === "today" || scope.view === "project" || scope.view === "area";
  const place: TTaskPlace = scope.view === "today" ? "today" : "inbox";
  const filteredTasks = optimisticTasks.filter((task) => {
    const matchesArea = areaFilter.length === 0 || task.areaId === areaFilter;
    const matchesProject = projectFilter.length === 0 || task.projectId === projectFilter;
    return matchesArea && matchesProject;
  });
  const isEmpty = filteredTasks.length === 0;
  const filterHidesTasks = optimisticTasks.length > 0 && filteredTasks.length === 0;
  const projectOptions = catalog
    ? catalog.projects.filter((project) => areaFilter.length === 0 || project.areaId === areaFilter)
    : [];

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
    return run({ type: "add", task }, () =>
      createTask({
        title: task.title,
        place,
        projectId: task.projectId,
        areaId: task.areaId,
      }),
    );
  };

  const handleComplete = (id: string) => {
    void run({ type: "remove", id }, () => completeTask(id));
  };

  const handleRestore = (id: string) => {
    void run({ type: "remove", id }, () => restoreTask(id));
  };

  const handleAddToToday = (id: string) => {
    void run(
      { type: "patch", id, patch: { scheduledDate: today, dayPosition: Number.MAX_SAFE_INTEGER } },
      () => addTaskToToday(id),
    );
  };

  const handleRemoveFromToday = (id: string) => {
    const update: TOptimisticUpdate =
      scope.view === "today"
        ? { type: "remove", id }
        : { type: "patch", id, patch: { scheduledDate: null, dayPosition: null } };
    void run(update, () => removeTaskFromToday(id));
  };

  const handleDelete = (id: string) => {
    void run({ type: "remove", id }, () => deleteTask(id));
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    void run({ type: "move", id, direction }, () => moveTask(id, direction, scope));
  };

  const handlePlace = (id: string, placement: { projectId: string | null; areaId: string | null }) => {
    void run(
      { type: "patch", id, patch: { projectId: placement.projectId, areaId: placement.areaId } },
      () => placeTask({ id, ...placement }),
    );
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

  const handleAreaFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextArea = event.target.value;
    setAreaFilter(nextArea);
    const projectStillVisible = catalog?.projects.some(
      (project) => project.id === projectFilter && (nextArea.length === 0 || project.areaId === nextArea),
    );

    if (!projectStillVisible) {
      setProjectFilter("");
    }
  };

  const handleProjectFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    setProjectFilter(event.target.value);
  };

  return (
    <div className="flex flex-col gap-4">
      {canCreate ? (
        <TaskComposer place={place} today={today} projectId={scope.projectId ?? null} areaId={scope.areaId ?? null} onCreate={handleCreate} />
      ) : null}
      {showFilters && catalog ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Сфера
            <select value={areaFilter} onChange={handleAreaFilter} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Все сферы</option>
              {catalog.areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Проект
            <select
              value={projectFilter}
              onChange={handleProjectFilter}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Все проекты</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {scope.view === "today" && !loadError ? (
        <p className="text-sm text-muted-foreground">{formatTaskCount(filteredTasks.length)} в списке</p>
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
          <p className="text-sm leading-6 text-muted-foreground">
            {filterHidesTasks ? "Нет задач с таким фильтром." : emptyCopy[scope.view]}
          </p>
          {scope.view === "today" ? (
            <Link href="/inbox" className="mt-3 inline-flex text-sm font-medium underline-offset-4 hover:underline">
              Открыть входящие
            </Link>
          ) : null}
        </div>
      ) : null}
      {filteredTasks.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filteredTasks.map((task, index) => {
            const isTodayView = scope.view === "today";
            const isMoveUpDisabled = isTodayView ? !isSameTodayGroup(filteredTasks[index - 1], task) : index === 0;
            const isMoveDownDisabled = isTodayView
              ? !isSameTodayGroup(task, filteredTasks[index + 1])
              : index === filteredTasks.length - 1;

            return (
            <TaskRow
              key={task.id}
              task={task}
              view={scope.view}
              today={today}
              isMoveUpDisabled={isMoveUpDisabled}
              isMoveDownDisabled={isMoveDownDisabled}
              onComplete={handleComplete}
              onRestore={handleRestore}
              onAddToToday={handleAddToToday}
              onRemoveFromToday={handleRemoveFromToday}
              onDelete={handleDelete}
              onMove={handleMove}
              onSave={handleSave}
              catalog={catalog}
              onPlace={handlePlace}
            />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
