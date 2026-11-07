"use client";

import { useState, type ChangeEvent } from "react";

import { taskFieldClassName } from "@/components/tasks/task-field";
import { Button } from "@/components/ui/button";
import type { TCatalog } from "@/lib/organization/queries";
import {
  editTaskSchema,
  priorityLabels,
  scheduleTaskSchema,
  taskPriorities,
  zodMessage,
  type TTask,
  type TTaskPriority,
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
  catalog: TCatalog;
  isMoveUpDisabled: boolean;
  isMoveDownDisabled: boolean;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSave: (input: TEditInput) => Promise<{ error: string | null }>;
  onSchedule: (id: string, scheduledDate: string) => Promise<{ error: string | null }>;
  onClearDate: (id: string) => Promise<{ error: string | null }>;
};

export function CalendarDayTask({
  task,
  catalog,
  isMoveUpDisabled,
  isMoveDownDisabled,
  onComplete,
  onRestore,
  onMove,
  onSave,
  onSchedule,
  onClearDate,
}: TProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TTaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [moveDate, setMoveDate] = useState(task.scheduledDate ?? "");
  const isDone = task.status === "done";
  const projectName = catalog.projects.find((project) => project.id === task.projectId)?.name ?? null;
  const areaName = catalog.areas.find((area) => area.id === task.areaId)?.name ?? null;
  const locationLabel = projectName ? `Проект: ${projectName}` : areaName ? `Сфера: ${areaName}` : null;
  const statusLabel = isDone ? "Выполнена" : "Не выполнена";
  const isMoveUpButtonDisabled = isMoveUpDisabled || isSaving;
  const isMoveDownButtonDisabled = isMoveDownDisabled || isSaving;

  const handleComplete = () => {
    onComplete(task.id);
  };

  const handleRestore = () => {
    onRestore(task.id);
  };

  const handleMoveUp = () => {
    onMove(task.id, "up");
  };

  const handleMoveDown = () => {
    onMove(task.id, "down");
  };

  const handleStartEdit = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setDueDate(task.dueDate ?? "");
    setError(null);
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

    if (name === "moveDate") {
      setMoveDate(value);
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

  const handleSchedule = () => {
    if (moveDate.length === 0) {
      setError("Укажите дату.");
      return;
    }

    const parsed = scheduleTaskSchema.safeParse({ id: task.id, scheduledDate: moveDate });

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    setIsSaving(true);
    setError(null);

    void onSchedule(task.id, parsed.data.scheduledDate).then((result) => {
      setIsSaving(false);

      if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleClearDate = () => {
    setIsSaving(true);
    setError(null);

    void onClearDate(task.id).then((result) => {
      setIsSaving(false);

      if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <li className={`flex flex-col gap-3 rounded-xl border border-border bg-card p-3 ${isDone ? "opacity-70" : ""}`}>
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
              <select name="priority" value={priority} onChange={handleFieldChange} className={`${taskFieldClassName} h-10`}>
                {taskPriorities.map((item) => (
                  <option key={item} value={item}>
                    {priorityLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Срок
              <input name="dueDate" type="date" value={dueDate} onChange={handleFieldChange} className={`${taskFieldClassName} h-10`} />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">Срок не меняет день плана.</p>
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
            <h3 className={`text-base font-medium break-words ${isDone ? "text-muted-foreground line-through" : ""}`}>{task.title}</h3>
            <span className="shrink-0 text-xs text-muted-foreground">{priorityLabels[task.priority]}</span>
          </div>
          <p className="text-sm text-muted-foreground">{statusLabel}</p>
          {locationLabel ? <p className="text-sm text-muted-foreground">{locationLabel}</p> : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!isEditing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {isDone ? (
              <Button type="button" variant="outline" onClick={handleRestore} disabled={isSaving}>
                Вернуть
              </Button>
            ) : (
              <Button type="button" onClick={handleComplete} disabled={isSaving}>
                Готово
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleStartEdit} disabled={isSaving}>
              Изменить
            </Button>
            <Button type="button" variant="outline" onClick={handleMoveUp} disabled={isMoveUpButtonDisabled}>
              Выше
            </Button>
            <Button type="button" variant="outline" onClick={handleMoveDown} disabled={isMoveDownButtonDisabled}>
              Ниже
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium">
              День плана
              <input name="moveDate" type="date" value={moveDate} onChange={handleFieldChange} className={`${taskFieldClassName} h-10`} />
            </label>
            <Button type="button" variant="outline" onClick={handleSchedule} disabled={isSaving}>
              Перенести
            </Button>
            <Button type="button" variant="outline" onClick={handleClearDate} disabled={isSaving}>
              Убрать дату
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
