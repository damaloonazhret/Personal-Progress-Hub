"use client";

import { useOptimistic, useState, useTransition, type ChangeEvent, type FormEvent } from "react";

import { taskFieldClassName } from "@/components/tasks/task-field";
import { Button } from "@/components/ui/button";
import { moveRecords, type TCatalogArea, type TCatalogProject, type TDirection } from "@/lib/organization/model";
import { createTaskFromTemplate } from "@/lib/tasks/actions";
import { priorityLabels, taskPriorities, type TTaskPriority } from "@/lib/tasks/model";
import { createTemplate, deleteTemplate, moveTemplate, updateTemplate } from "@/lib/templates/actions";
import { templateInputSchema, templateUpdateSchema, zodMessage, type TTemplate } from "@/lib/templates/model";

type TProps = {
  templates: TTemplate[];
  areas: TCatalogArea[];
  projects: TCatalogProject[];
  loadError: string | null;
};

type TUpdate =
  | { type: "add"; template: TTemplate }
  | { type: "patch"; id: string; patch: Partial<TTemplate> }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; direction: TDirection };

type TDraft = {
  title: string;
  description: string;
  priority: TTaskPriority;
  areaId: string;
  projectId: string;
};

const emptyDraft: TDraft = {
  title: "",
  description: "",
  priority: "medium",
  areaId: "",
  projectId: "",
};

function applyTemplateUpdate(templates: TTemplate[], update: TUpdate) {
  if (update.type === "remove") {
    return templates.filter((template) => template.id !== update.id);
  }

  if (update.type === "add") {
    return [...templates, update.template].sort((left, right) => left.position - right.position);
  }

  if (update.type === "move") {
    return moveRecords(templates, update.id, update.direction);
  }

  return templates.map((template) => (template.id === update.id ? { ...template, ...update.patch } : template));
}

function draftFromTemplate(template: TTemplate): TDraft {
  return {
    title: template.title,
    description: template.description ?? "",
    priority: template.priority,
    areaId: template.areaId ?? "",
    projectId: template.projectId ?? "",
  };
}

function readDraft(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, draft: TDraft, projects: TCatalogProject[]): TDraft {
  const { name, value } = event.target;

  if (name === "title") {
    return { ...draft, title: value };
  }

  if (name === "description") {
    return { ...draft, description: value };
  }

  if (name === "priority" && (value === "low" || value === "medium" || value === "high")) {
    return { ...draft, priority: value };
  }

  if (name === "areaId") {
    const projectStillVisible = projects.some((project) => project.id === draft.projectId && project.areaId === value);
    return { ...draft, areaId: value, projectId: projectStillVisible ? draft.projectId : "" };
  }

  if (name === "projectId") {
    return { ...draft, projectId: value };
  }

  return draft;
}

export function TemplateList({ templates, areas, projects, loadError }: TProps) {
  const [optimisticTemplates, applyOptimistic] = useOptimistic(templates, applyTemplateUpdate);
  const [draft, setDraft] = useState<TDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();
  const isEmpty = optimisticTemplates.length === 0;
  const savedIds = new Set(templates.map((template) => template.id));

  const run = (update: TUpdate, request: () => Promise<{ error: string | null }>) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      applyOptimistic(update);
      const result = await request();

      if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft((current) => readDraft(event, current, projects));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = templateInputSchema.safeParse(draft);

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    const template: TTemplate = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      description: parsed.data.description.length === 0 ? null : parsed.data.description,
      priority: parsed.data.priority,
      areaId: parsed.data.areaId,
      projectId: parsed.data.projectId,
      position: Number.MAX_SAFE_INTEGER,
    };

    setIsPending(true);
    setError(null);
    setNotice(null);
    startTransition(async () => {
      applyOptimistic({ type: "add", template });
      const result = await createTemplate({
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        areaId: draft.areaId,
        projectId: draft.projectId,
      });
      setIsPending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDraft(emptyDraft);
    });
  };

  const handleSave = (input: TDraft & { id: string }) => {
    const parsed = templateUpdateSchema.safeParse(input);

    if (!parsed.success) {
      return Promise.resolve({ error: zodMessage(parsed.error) });
    }

    return new Promise<{ error: string | null }>((resolve) => {
      startTransition(async () => {
        applyOptimistic({
          type: "patch",
          id: parsed.data.id,
          patch: {
            title: parsed.data.title,
            description: parsed.data.description.length === 0 ? null : parsed.data.description,
            priority: parsed.data.priority,
            areaId: parsed.data.areaId,
            projectId: parsed.data.projectId,
          },
        });
        resolve(await updateTemplate(input));
      });
    });
  };

  const handleDelete = (id: string) => {
    run({ type: "remove", id }, () => deleteTemplate(id));
  };

  const handleMove = (id: string, direction: TDirection) => {
    run({ type: "move", id, direction }, () => moveTemplate(id, direction));
  };

  const handleCreateTask = (id: string) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createTaskFromTemplate(id);

      if (result.error) {
        setError(result.error);
        return;
      }

      setNotice("Задача создана. Шаблон остался без изменений.");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-3">
        <p className="text-sm font-medium">Новый шаблон</p>
        <TemplateFields draft={draft} areas={areas} projects={projects} onChange={handleChange} />
        <p className="text-sm text-muted-foreground">Сферу и проект можно не указывать. Тогда задача попадёт во входящие.</p>
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
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {isEmpty && !loadError ? (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm leading-6 text-muted-foreground">Шаблонов пока нет. Создайте заготовку и делайте из неё отдельные задачи.</p>
        </div>
      ) : null}
      {optimisticTemplates.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {optimisticTemplates.map((template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              areas={areas}
              projects={projects}
              isFirst={index === 0}
              isLast={index === optimisticTemplates.length - 1}
              isSaved={savedIds.has(template.id)}
              onSave={handleSave}
              onDelete={handleDelete}
              onMove={handleMove}
              onCreateTask={handleCreateTask}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type TFieldsProps = {
  draft: TDraft;
  areas: TCatalogArea[];
  projects: TCatalogProject[];
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
};

function TemplateFields({ draft, areas, projects, onChange }: TFieldsProps) {
  const areaProjects = projects.filter((project) => project.areaId === draft.areaId);
  const showProjects = draft.areaId.length > 0 && areaProjects.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Название
        <input name="title" value={draft.title} onChange={onChange} className={`${taskFieldClassName} h-10`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Описание
        <textarea name="description" value={draft.description} onChange={onChange} rows={3} className={`${taskFieldClassName} py-2`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Приоритет
        <select name="priority" value={draft.priority} onChange={onChange} className={`${taskFieldClassName} h-10`}>
          {taskPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Сфера
        <select name="areaId" value={draft.areaId} onChange={onChange} className={`${taskFieldClassName} h-10`}>
          <option value="">Без сферы</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>
      {showProjects ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Проект
          <select name="projectId" value={draft.projectId} onChange={onChange} className={`${taskFieldClassName} h-10`}>
            <option value="">Без проекта</option>
            {areaProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

type TCardProps = {
  template: TTemplate;
  areas: TCatalogArea[];
  projects: TCatalogProject[];
  isFirst: boolean;
  isLast: boolean;
  isSaved: boolean;
  onSave: (input: TDraft & { id: string }) => Promise<{ error: string | null }>;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: TDirection) => void;
  onCreateTask: (id: string) => void;
};

function TemplateCard({ template, areas, projects, isFirst, isLast, isSaved, onSave, onDelete, onMove, onCreateTask }: TCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TDraft>(draftFromTemplate(template));
  const areaName = areas.find((area) => area.id === template.areaId)?.name ?? null;
  const projectName = projects.find((project) => project.id === template.projectId)?.name ?? null;
  const isMoveUpDisabled = !isSaved || isFirst;
  const isMoveDownDisabled = !isSaved || isLast;
  const locationLabel = projectName ? `Проект: ${projectName}` : areaName ? `Сфера: ${areaName}` : "Во входящие";

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft((current) => readDraft(event, current, projects));
  };

  const handleStartEdit = () => {
    setDraft(draftFromTemplate(template));
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
    void onSave({ id: template.id, ...draft }).then((result) => {
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
    onDelete(template.id);
  };

  const handleMoveUp = () => {
    onMove(template.id, "up");
  };

  const handleMoveDown = () => {
    onMove(template.id, "down");
  };

  const handleCreateTask = () => {
    onCreateTask(template.id);
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <TemplateFields draft={draft} areas={areas} projects={projects} onChange={handleChange} />
          <p className="text-sm text-muted-foreground">Эта правка не изменит задачи, которые уже созданы из шаблона.</p>
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
            <h2 className="text-base font-medium break-words">{template.title}</h2>
            <span className="shrink-0 text-xs text-muted-foreground">{priorityLabels[template.priority]}</span>
          </div>
          {template.description ? <p className="text-sm leading-6 text-muted-foreground">{template.description}</p> : null}
          <p className="text-sm text-muted-foreground">{locationLabel}</p>
        </div>
      )}
      {isConfirmingDelete ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <p className="text-sm">Удалить шаблон «{template.title}»? Уже созданные из него задачи останутся.</p>
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
          <Button type="button" onClick={handleCreateTask} disabled={!isSaved}>
            Создать задачу
          </Button>
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
