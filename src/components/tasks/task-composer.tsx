"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { taskFieldClassName } from "@/components/tasks/task-field";
import { Button } from "@/components/ui/button";
import { createTaskSchema, zodMessage, type TTask, type TTaskPlace } from "@/lib/tasks/model";

type TProps = {
  place: TTaskPlace;
  onCreate: (task: TTask) => Promise<{ error: string | null }>;
};

export function TaskComposer({ place, onCreate }: TProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inputId = `${place}-task-title`;
  const submitLabel = isPending ? "Добавление…" : "Добавить";

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = createTaskSchema.safeParse({ title, place });

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
      inToday: place === "today",
      position: Number.MAX_SAFE_INTEGER,
      todayPosition: place === "today" ? Number.MAX_SAFE_INTEGER : null,
      completedAt: null,
      projectId: null,
      createdAt: new Date().toISOString(),
    };

    setError(null);
    setIsPending(true);

    void onCreate(task).then((result) => {
      setIsPending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setTitle("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        Новая задача
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          name="title"
          value={title}
          onChange={handleTitleChange}
          placeholder={place === "today" ? "Что сделать сегодня" : "Что нужно сделать"}
          maxLength={200}
          required
          className={`${taskFieldClassName} h-10`}
        />
        <Button type="submit" disabled={isPending}>
          {submitLabel}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
