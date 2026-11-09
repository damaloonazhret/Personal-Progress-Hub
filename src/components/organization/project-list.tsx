"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type ChangeEvent, type FormEvent } from "react";

import { RecordFields } from "@/components/organization/record-fields";
import { Button } from "@/components/ui/button";
import { createProject, deleteProject, moveProject, updateProject } from "@/lib/organization/actions";
import {
  formatProgress,
  moveRecords,
  projectInputSchema,
  projectUpdateSchema,
  zodMessage,
  type TCatalogArea,
  type TDirection,
  type TProjectCard,
} from "@/lib/organization/model";

type TProps = {
  areas: TCatalogArea[];
  projects: TProjectCard[];
  loadError: string | null;
  fixedAreaId?: string;
};

type TUpdate =
  | { type: "add"; project: TProjectCard }
  | { type: "patch"; id: string; patch: Partial<TProjectCard> }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; direction: TDirection };

function applyProjectUpdate(projects: TProjectCard[], update: TUpdate) {
  if (update.type === "remove") {
    return projects.filter((project) => project.id !== update.id);
  }

  if (update.type === "add") {
    return [...projects, update.project].sort((left, right) => left.position - right.position);
  }

  if (update.type === "move") {
    const current = projects.find((project) => project.id === update.id);

    if (!current) {
      return projects;
    }

    const siblings = projects.filter((project) => project.areaId === current.areaId);
    const movedSiblings = moveRecords(siblings, update.id, update.direction);
    const siblingOrder = new Map(movedSiblings.map((project, index) => [project.id, index]));

    return projects
      .map((project) => movedSiblings.find((item) => item.id === project.id) ?? project)
      .sort((left, right) => {
        if (left.areaId !== current.areaId || right.areaId !== current.areaId) {
          return 0;
        }

        return (siblingOrder.get(left.id) ?? 0) - (siblingOrder.get(right.id) ?? 0);
      });
  }

  return projects.map((project) => (project.id === update.id ? { ...project, ...update.patch } : project));
}

export function ProjectList({ areas, projects, loadError, fixedAreaId }: TProps) {
  const [optimisticProjects, applyOptimistic] = useOptimistic(projects, applyProjectUpdate);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState(fixedAreaId ?? areas[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();
  const hasAreas = areas.length > 0;
  const isEmpty = optimisticProjects.length === 0;
  const showEmptyProjects = hasAreas && isEmpty && !loadError;
  const savedProjectIds = new Set(projects.map((project) => project.id));

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

    if (event.target.name === "areaId") {
      setAreaId(event.target.value);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = projectInputSchema.safeParse({ name, description, areaId: fixedAreaId ?? areaId });

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    const area = areas.find((item) => item.id === parsed.data.areaId);
    const project: TProjectCard = {
      id: crypto.randomUUID(),
      areaId: parsed.data.areaId,
      areaName: area?.name ?? "Сфера",
      name: parsed.data.name,
      description: parsed.data.description.length === 0 ? null : parsed.data.description,
      position: Number.MAX_SAFE_INTEGER,
      progress: { active: 0, completed: 0, total: 0, percent: 0 },
    };

    setIsPending(true);
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "add", project });
      const result = await createProject(parsed.data);
      setIsPending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setName("");
      setDescription("");
    });
  };

  const handleSave = (input: { id: string; name: string; description: string; areaId: string }) => {
    const parsed = projectUpdateSchema.safeParse(input);

    if (!parsed.success) {
      return Promise.resolve({ error: zodMessage(parsed.error) });
    }

    return new Promise<{ error: string | null }>((resolve) => {
      const area = areas.find((item) => item.id === parsed.data.areaId);
      startTransition(async () => {
        applyOptimistic({
          type: "patch",
          id: parsed.data.id,
          patch: {
            name: parsed.data.name,
            description: parsed.data.description.length === 0 ? null : parsed.data.description,
            areaId: parsed.data.areaId,
            areaName: area?.name ?? "Сфера",
          },
        });
        const result = await updateProject(parsed.data);
        resolve(result);
      });
    });
  };

  const handleDelete = (id: string) => {
    run({ type: "remove", id }, () => deleteProject(id));
  };

  const handleMove = (id: string, direction: TDirection) => {
    run({ type: "move", id, direction }, () => moveProject(id, direction));
  };

  return (
    <div className="flex flex-col gap-4">
      {hasAreas ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">Новый проект</p>
          <RecordFields
            name={name}
            description={description}
            areaId={fixedAreaId ?? areaId}
            areas={fixedAreaId ? undefined : areas}
            onChange={handleChange}
          />
          {fixedAreaId ? <p className="text-sm text-muted-foreground">Проект будет создан в этой сфере.</p> : null}
          <p className="text-sm text-muted-foreground">Проект всегда относится к сфере. Без сферы его создать нельзя.</p>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Добавление…" : "Добавить"}
          </Button>
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm leading-6 text-muted-foreground">Сначала создайте сферу. Проект не может существовать без неё.</p>
          <Link href="/areas" className="mt-3 inline-flex text-sm font-medium underline-offset-4 hover:underline">
            Открыть сферы
          </Link>
        </div>
      )}
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
      {showEmptyProjects ? (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm leading-6 text-muted-foreground">Проектов пока нет. Пустой проект не показывает 100%.</p>
        </div>
      ) : null}
      {fixedAreaId ? (
        <ProjectGroup
          projects={optimisticProjects}
          areas={areas}
          savedProjectIds={savedProjectIds}
          onSave={handleSave}
          onDelete={handleDelete}
          onMove={handleMove}
        />
      ) : (
        areas.map((area) => {
          const areaProjects = optimisticProjects.filter((project) => project.areaId === area.id);

          if (areaProjects.length === 0) {
            return null;
          }

          return (
            <section key={area.id} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">{area.name}</h2>
              <ProjectGroup
                projects={areaProjects}
                areas={areas}
                savedProjectIds={savedProjectIds}
                onSave={handleSave}
                onDelete={handleDelete}
                onMove={handleMove}
              />
            </section>
          );
        })
      )}
    </div>
  );
}

type TGroupProps = {
  projects: TProjectCard[];
  areas: TCatalogArea[];
  savedProjectIds: Set<string>;
  onSave: (input: { id: string; name: string; description: string; areaId: string }) => Promise<{ error: string | null }>;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: TDirection) => void;
};

function ProjectGroup({ projects, areas, savedProjectIds, onSave, onDelete, onMove }: TGroupProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-3">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          areas={areas}
          isFirst={index === 0}
          isLast={index === projects.length - 1}
          isSaved={savedProjectIds.has(project.id)}
          onSave={onSave}
          onDelete={onDelete}
          onMove={onMove}
        />
      ))}
    </ul>
  );
}

type TCardProps = {
  project: TProjectCard;
  areas: TCatalogArea[];
  isFirst: boolean;
  isLast: boolean;
  isSaved: boolean;
  onSave: TGroupProps["onSave"];
  onDelete: (id: string) => void;
  onMove: (id: string, direction: TDirection) => void;
};

function ProjectCard({ project, areas, isFirst, isLast, isSaved, onSave, onDelete, onMove }: TCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [areaId, setAreaId] = useState(project.areaId);
  const lockArea = project.progress.total > 0;
  const isMoveUpDisabled = !isSaved || isFirst;
  const isMoveDownDisabled = !isSaved || isLast;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (event.target.name === "name") {
      setName(event.target.value);
    }

    if (event.target.name === "description") {
      setDescription(event.target.value);
    }

    if (event.target.name === "areaId") {
      setAreaId(event.target.value);
    }
  };

  const handleStartEdit = () => {
    setName(project.name);
    setDescription(project.description ?? "");
    setAreaId(project.areaId);
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
    void onSave({ id: project.id, name, description, areaId }).then((result) => {
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
    onDelete(project.id);
  };

  const handleMoveUp = () => {
    onMove(project.id, "up");
  };

  const handleMoveDown = () => {
    onMove(project.id, "down");
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <RecordFields
            name={name}
            description={description}
            areaId={areaId}
            areas={areas}
            lockArea={lockArea}
            onChange={handleChange}
          />
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
              <Link href={`/projects/${project.id}`} className="underline-offset-4 hover:underline">
                {project.name}
              </Link>
            ) : (
              project.name
            )}
          </h2>
          {project.description ? <p className="text-sm leading-6 text-muted-foreground">{project.description}</p> : null}
          <p className="text-sm text-muted-foreground">
            {project.areaName} · {formatProgress(project.progress)}
          </p>
        </div>
      )}
      {isConfirmingDelete ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <p className="text-sm">Удалить проект «{project.name}»? Задачи проекта тоже удалятся. Это нельзя отменить.</p>
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
