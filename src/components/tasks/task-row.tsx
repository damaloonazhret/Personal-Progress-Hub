"use client";

import { useState, type ChangeEvent } from "react";

import { taskFieldClassName } from "@/components/tasks/task-field";
import { Button } from "@/components/ui/button";
import type { TCatalog } from "@/lib/organization/queries";
import {
  editTaskSchema,
  formatCompletedAt,
  formatDueDate,
  isPastDueDate,
  priorityLabels,
  taskPriorities,
  zodMessage,
  type TTask,
  type TTaskPriority,
  type TTaskView,
} from "@/lib/tasks/model";

type TEditInput = {
  id: string;
  title: string;
  description: string;
  priority: TTaskPriority;
  dueDate: string;
};

type TProps = {
  task: TTask;
  view: TTaskView;
  today: string;
  isFirst: boolean;
  isLast: boolean;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  onAddToToday: (id: string) => void;
  onRemoveFromToday: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSave: (input: TEditInput) => Promise<{ error: string | null }>;
  catalog?: TCatalog;
  onPlace?: (id: string, placement: { projectId: string | null; areaId: string | null }) => void;
};

export function TaskRow({
  task,
  view,
  today,
  isFirst,
  isLast,
  onComplete,
  onRestore,
  onAddToToday,
  onRemoveFromToday,
  onDelete,
  onMove,
  onSave,
  catalog,
  onPlace,
}: TProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TTaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const canReorder = view !== "completed";
  const isMoveUpDisabled = isFirst;
  const isMoveDownDisabled = isLast;
  const showDueDate = Boolean(task.dueDate);
  const dueDateIsPast = Boolean(task.dueDate) && isPastDueDate(task.dueDate ?? "", today);
  const projectName = catalog?.projects.find((project) => project.id === task.projectId)?.name ?? null;
  const areaName = catalog?.areas.find((area) => area.id === task.areaId)?.name ?? null;
  const showPlacement = Boolean(onPlace && catalog);
  const placementValue = task.projectId ? `project:${task.projectId}` : task.areaId ? `area:${task.areaId}` : "inbox";
  const showAddToToday = view !== "completed" && view !== "today" && !task.inToday;
  const showRemoveFromToday = view !== "completed" && task.inToday;
  const hasAreas = Boolean(catalog && catalog.areas.length > 0);
  const hasProjects = Boolean(catalog && catalog.projects.length > 0);
  const locationLabel = projectName ? `Проект: ${projectName}` : areaName ? `Сфера: ${areaName}` : null;

  const handleComplete = () => {
    onComplete(task.id);
  };

  const handleRestore = () => {
    onRestore(task.id);
  };

  const handleAddToToday = () => {
    onAddToToday(task.id);
  };

  const handleRemoveFromToday = () => {
    onRemoveFromToday(task.id);
  };

  const handlePlacementChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    if (!onPlace) {
      return;
    }

    if (value === "inbox") {
      onPlace(task.id, { projectId: null, areaId: null });
      return;
    }

    if (value.startsWith("project:")) {
      const projectId = value.slice("project:".length);
      const project = catalog?.projects.find((item) => item.id === projectId);
      onPlace(task.id, { projectId, areaId: project?.areaId ?? null });
      return;
    }

    if (value.startsWith("area:")) {
      onPlace(task.id, { projectId: null, areaId: value.slice("area:".length) });
    }
  };

  const handleMoveUp = () => {
    onMove(task.id, "up");
  };

  const handleMoveDown = () => {
    onMove(task.id, "down");
  };

  const handleAskDelete = () => {
    setError(null);
    setIsEditing(false);
    setIsConfirmingDelete(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmingDelete(false);
  };

  const handleConfirmDelete = () => {
    setIsConfirmingDelete(false);
    onDelete(task.id);
  };

  const handleStartEdit = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setDueDate(task.dueDate ?? "");
    setError(null);
    setIsConfirmingDelete(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    if (name === "title") {
      setTitle(value);
    }

    if (name === "description") {
      setDescription(value);
    }

    if (name === "dueDate") {
      setDueDate(value);
    }

    if (name === "priority" && (value === "low" || value === "medium" || value === "high")) {
      setPriority(value);
    }
  };

  const handleSave = () => {
    const parsed = editTaskSchema.safeParse({
      id: task.id,
      title,
      description,
      priority,
      dueDate,
    });

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    setIsSaving(true);
    setError(null);

    void onSave(parsed.data).then((result) => {
      setIsSaving(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsEditing(false);
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Название
            <input name="title" value={title} onChange={handleFieldChange} className={`${taskFieldClassName} h-10`} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Описание
            <textarea
              name="description"
              value={description}
              onChange={handleFieldChange}
              rows={3}
              className={`${taskFieldClassName} py-2`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Приоритет
              <select
                name="priority"
                value={priority}
                onChange={handleFieldChange}
                className={`${taskFieldClassName} h-10`}
              >
                {taskPriorities.map((item) => (
                  <option key={item} value={item}>
                    {priorityLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Срок
              <input
                name="dueDate"
                type="date"
                value={dueDate}
                onChange={handleFieldChange}
                className={`${taskFieldClassName} h-10`}
              />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">Срок не добавляет задачу в «Сегодня».</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-medium break-words">{task.title}</h2>
            <span className="shrink-0 text-xs text-muted-foreground">{priorityLabels[task.priority]}</span>
          </div>
          {task.description ? (
            <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{task.description}</p>
          ) : null}
          {locationLabel ? <p className="text-sm text-muted-foreground">{locationLabel}</p> : null}
          {showDueDate && task.dueDate ? (
            <p className="text-sm text-muted-foreground">
              Срок: {formatDueDate(task.dueDate)}
              {dueDateIsPast ? " · срок прошёл" : ""}
            </p>
          ) : null}
          {task.completedAt ? (
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
              Выполнена {formatCompletedAt(task.completedAt)}
            </p>
          ) : null}
        </div>
      )}

      {isConfirmingDelete ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <p className="text-sm">Удалить задачу «{task.title}»? Это нельзя отменить.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
              Удалить
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelDelete}>
              Отмена
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!isEditing && !isConfirmingDelete ? (
        <div className="flex flex-wrap gap-2">
          {view === "completed" ? (
            <Button type="button" variant="outline" onClick={handleRestore}>
              Вернуть
            </Button>
          ) : (
            <Button type="button" onClick={handleComplete}>
              Готово
            </Button>
          )}
          {showAddToToday ? (
            <Button type="button" variant="outline" onClick={handleAddToToday}>
              На сегодня
            </Button>
          ) : null}
          {showRemoveFromToday ? (
            <Button type="button" variant="outline" onClick={handleRemoveFromToday}>
              Убрать из сегодня
            </Button>
          ) : null}
          {canReorder ? (
            <>
              <Button type="button" variant="outline" onClick={handleMoveUp} disabled={isMoveUpDisabled}>
                Выше
              </Button>
              <Button type="button" variant="outline" onClick={handleMoveDown} disabled={isMoveDownDisabled}>
                Ниже
              </Button>
            </>
          ) : null}
          <Button type="button" variant="outline" onClick={handleStartEdit}>
            Изменить
          </Button>
          <Button type="button" variant="destructive" onClick={handleAskDelete}>
            Удалить
          </Button>
        </div>
      ) : null}
      {showPlacement && !isEditing && !isConfirmingDelete ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Раздел
          <select value={placementValue} onChange={handlePlacementChange} className={`${taskFieldClassName} h-10`}>
            <option value="inbox">Входящие</option>
            {hasAreas && catalog ? (
              <optgroup label="Сферы">
                {catalog.areas.map((area) => (
                  <option key={area.id} value={`area:${area.id}`}>
                    {area.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {hasProjects && catalog ? (
              <optgroup label="Проекты">
                {catalog.projects.map((project) => {
                  const projectArea = catalog.areas.find((area) => area.id === project.areaId);
                  const projectLabel = projectArea ? `${projectArea.name} · ${project.name}` : project.name;

                  return (
                    <option key={project.id} value={`project:${project.id}`}>
                      {projectLabel}
                    </option>
                  );
                })}
              </optgroup>
            ) : null}
          </select>
        </label>
      ) : null}
    </li>
  );
}
