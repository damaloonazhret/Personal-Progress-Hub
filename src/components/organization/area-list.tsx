"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type ChangeEvent, type FormEvent } from "react";

import { RecordFields } from "@/components/organization/record-fields";
import { Button } from "@/components/ui/button";
import { createArea, deleteArea, moveArea, updateArea } from "@/lib/organization/actions";
import {
  areaInputSchema,
  areaUpdateSchema,
  formatProgress,
  moveRecords,
  zodMessage,
  type TAreaCard,
  type TDirection,
} from "@/lib/organization/model";

type TProps = {
  areas: TAreaCard[];
  loadError: string | null;
};

type TUpdate =
  | { type: "add"; area: TAreaCard }
  | { type: "patch"; id: string; patch: Partial<TAreaCard> }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; direction: TDirection };

function applyAreaUpdate(areas: TAreaCard[], update: TUpdate) {
  if (update.type === "remove") {
    return areas.filter((area) => area.id !== update.id);
  }

  if (update.type === "add") {
    return [...areas, update.area].sort((left, right) => left.position - right.position);
  }

  if (update.type === "move") {
    return moveRecords(areas, update.id, update.direction);
  }

  return areas.map((area) => (area.id === update.id ? { ...area, ...update.patch } : area));
}

export function AreaList({ areas, loadError }: TProps) {
  const [optimisticAreas, applyOptimistic] = useOptimistic(areas, applyAreaUpdate);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();
  const isEmpty = optimisticAreas.length === 0;
  const savedAreaIds = new Set(areas.map((area) => area.id));

  const run = (update: TUpdate, request: () => Promise<{ error: string | null }>) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic(update);
      const result = await request();

      if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (event.target.name === "name") {
      setName(event.target.value);
    }

    if (event.target.name === "description") {
      setDescription(event.target.value);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = areaInputSchema.safeParse({ name, description });

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    const area: TAreaCard = {
      id: crypto.randomUUID(),
      name: parsed.data.name,
      description: parsed.data.description.length === 0 ? null : parsed.data.description,
      position: Number.MAX_SAFE_INTEGER,
      projectCount: 0,
      progress: { active: 0, completed: 0, total: 0, percent: 0 },
    };

    setIsPending(true);
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "add", area });
      const result = await createArea(parsed.data);
      setIsPending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setName("");
      setDescription("");
    });
  };

  const handleSave = (input: { id: string; name: string; description: string }) => {
    const parsed = areaUpdateSchema.safeParse(input);

    if (!parsed.success) {
      return Promise.resolve({ error: zodMessage(parsed.error) });
    }

    return new Promise<{ error: string | null }>((resolve) => {
      startTransition(async () => {
        applyOptimistic({
          type: "patch",
          id: parsed.data.id,
          patch: {
            name: parsed.data.name,
            description: parsed.data.description.length === 0 ? null : parsed.data.description,
          },
        });
        const result = await updateArea(parsed.data);
        resolve(result);
      });
    });
  };

  const handleDelete = (id: string) => {
    run({ type: "remove", id }, () => deleteArea(id));
  };

  const handleMove = (id: string, direction: TDirection) => {
    run({ type: "move", id, direction }, () => moveArea(id, direction));
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-3">
        <p className="text-sm font-medium">Новая сфера</p>
        <RecordFields name={name} description={description} onChange={handleChange} />
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Добавление…" : "Добавить"}
        </Button>
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
      {isEmpty && !loadError ? (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Сфер пока нет. Создайте направление, например английский, тренировки или разработка.
          </p>
        </div>
      ) : null}
      {optimisticAreas.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {optimisticAreas.map((area, index) => (
            <AreaCard
              key={area.id}
              area={area}
              isFirst={index === 0}
              isLast={index === optimisticAreas.length - 1}
              isSaved={savedAreaIds.has(area.id)}
              onSave={handleSave}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type TCardProps = {
  area: TAreaCard;
  isFirst: boolean;
  isLast: boolean;
  isSaved: boolean;
  onSave: (input: { id: string; name: string; description: string }) => Promise<{ error: string | null }>;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: TDirection) => void;
};

function AreaCard({ area, isFirst, isLast, isSaved, onSave, onDelete, onMove }: TCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(area.name);
  const [description, setDescription] = useState(area.description ?? "");
  const projectLabel = `Проектов: ${area.projectCount}`;
  const isMoveUpDisabled = !isSaved || isFirst;
  const isMoveDownDisabled = !isSaved || isLast;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (event.target.name === "name") {
      setName(event.target.value);
    }

    if (event.target.name === "description") {
      setDescription(event.target.value);
    }
  };

  const handleStartEdit = () => {
    setName(area.name);
    setDescription(area.description ?? "");
    setError(null);
    setIsConfirmingDelete(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = () => {
    setIsSaving(true);
    setError(null);
    void onSave({ id: area.id, name, description }).then((result) => {
      setIsSaving(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsEditing(false);
    });
  };

  const handleAskDelete = () => {
    setIsEditing(false);
    setIsConfirmingDelete(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmingDelete(false);
  };

  const handleConfirmDelete = () => {
    setIsConfirmingDelete(false);
    onDelete(area.id);
  };

  const handleMoveUp = () => {
    onMove(area.id, "up");
  };

  const handleMoveDown = () => {
    onMove(area.id, "down");
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <RecordFields name={name} description={description} onChange={handleChange} />
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
          <h2 className="text-base font-medium break-words">
            {isSaved ? (
              <Link href={`/areas/${area.id}`} className="underline-offset-4 hover:underline">
                {area.name}
              </Link>
            ) : (
              area.name
            )}
          </h2>
          {area.description ? <p className="text-sm leading-6 text-muted-foreground">{area.description}</p> : null}
          <p className="text-sm text-muted-foreground">
            {projectLabel} · {formatProgress(area.progress)}
          </p>
        </div>
      )}
      {isConfirmingDelete ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <p className="text-sm">Удалить сферу «{area.name}»? Её проекты и задачи тоже удалятся. Это нельзя отменить.</p>
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
          <Button type="button" variant="outline" onClick={handleMoveUp} disabled={isMoveUpDisabled}>
            Выше
          </Button>
          <Button type="button" variant="outline" onClick={handleMoveDown} disabled={isMoveDownDisabled}>
            Ниже
          </Button>
          <Button type="button" variant="outline" onClick={handleStartEdit} disabled={!isSaved}>
            Изменить
          </Button>
          <Button type="button" variant="destructive" onClick={handleAskDelete} disabled={!isSaved}>
            Удалить
          </Button>
        </div>
      ) : null}
    </li>
  );
}
