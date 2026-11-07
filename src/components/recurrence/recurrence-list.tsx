"use client";

import { useEffect, useOptimistic, useState, useTransition, type ChangeEvent, type FormEvent } from "react";

import { taskFieldClassName } from "@/components/tasks/task-field";
import { Button } from "@/components/ui/button";
import type { TCatalogArea, TCatalogProject } from "@/lib/organization/model";
import {
  laterDate,
  recurrenceInputSchema,
  recurrenceUpdateSchema,
  skipDateSchema,
  zodMessage,
  type TRecurrenceRule,
  type TRecurrenceStatus,
  type TRecurrenceUnit,
} from "@/lib/recurrence/model";
import {
  cancelRecurrenceRule,
  createRecurrenceRule,
  deleteRecurrenceRule,
  pauseRecurrenceRule,
  resumeRecurrenceRule,
  skipRecurrenceDate,
  updateRecurrenceRule,
} from "@/lib/recurrence/actions";
import { formatDueDate, priorityLabels, taskPriorities, type TTaskPriority } from "@/lib/tasks/model";

type TProps = {
  rules: TRecurrenceRule[];
  areas: TCatalogArea[];
  projects: TCatalogProject[];
  today: string;
  loadError: string | null;
  focusRuleId: string | null;
};

type TDraft = {
  title: string;
  description: string;
  priority: TTaskPriority;
  areaId: string;
  projectId: string;
  unit: TRecurrenceUnit;
  intervalCount: string;
  weekdays: number[];
  startDate: string;
  endDate: string;
};

type TUpdate =
  | { type: "add"; rule: TRecurrenceRule }
  | { type: "patch"; id: string; patch: Partial<TRecurrenceRule> }
  | { type: "remove"; id: string };

const weekdayLabels = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const statusLabels: Record<TRecurrenceStatus, string> = {
  active: "Активно",
  paused: "На паузе",
  cancelled: "Отменено",
};

const emptyDraft: TDraft = {
  title: "",
  description: "",
  priority: "medium",
  areaId: "",
  projectId: "",
  unit: "week",
  intervalCount: "1",
  weekdays: [1],
  startDate: "",
  endDate: "",
};

function applyRuleUpdate(rules: TRecurrenceRule[], update: TUpdate) {
  if (update.type === "remove") {
    return rules.filter((rule) => rule.id !== update.id);
  }

  if (update.type === "add") {
    return [update.rule, ...rules];
  }

  return rules.map((rule) => (rule.id === update.id ? { ...rule, ...update.patch } : rule));
}

function draftFromRule(rule: TRecurrenceRule): TDraft {
  return {
    title: rule.title,
    description: rule.description ?? "",
    priority: rule.priority,
    areaId: rule.areaId ?? "",
    projectId: rule.projectId ?? "",
    unit: rule.unit,
    intervalCount: String(rule.intervalCount),
    weekdays: rule.weekdays,
    startDate: rule.startDate,
    endDate: rule.endDate ?? "",
  };
}

function readDraft(
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  draft: TDraft,
  projects: TCatalogProject[],
): TDraft {
  const { name, value } = event.target;

  if (name === "weekday" && "checked" in event.target) {
    const day = Number(value);
    const weekdays = event.target.checked
      ? [...draft.weekdays, day].sort((left, right) => left - right)
      : draft.weekdays.filter((item) => item !== day);
    return { ...draft, weekdays };
  }

  if (name === "title") {
    return { ...draft, title: value };
  }

  if (name === "description") {
    return { ...draft, description: value };
  }

  if (name === "intervalCount") {
    return { ...draft, intervalCount: value };
  }

  if (name === "startDate") {
    return { ...draft, startDate: value };
  }

  if (name === "endDate") {
    return { ...draft, endDate: value };
  }

  if (name === "priority" && (value === "low" || value === "medium" || value === "high")) {
    return { ...draft, priority: value };
  }

  if (name === "unit" && (value === "day" || value === "week")) {
    return { ...draft, unit: value, weekdays: value === "day" ? [] : draft.weekdays };
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

function describeRule(rule: TRecurrenceRule) {
  const days = rule.weekdays.map((day) => weekdayLabels[day]).join(", ");

  if (rule.unit === "day") {
    return rule.intervalCount === 1 ? "Каждый день" : `Каждые ${rule.intervalCount} дн.`;
  }

  const cadence = rule.intervalCount === 1 ? "Каждую неделю" : `Каждые ${rule.intervalCount} нед.`;
  return `${cadence}: ${days}`;
}

export function RecurrenceList({ rules, areas, projects, today, loadError, focusRuleId }: TProps) {
  const [optimisticRules, applyOptimistic] = useOptimistic(rules, applyRuleUpdate);
  const [draft, setDraft] = useState<TDraft>({ ...emptyDraft, startDate: today });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();
  const isEmpty = optimisticRules.length === 0;
  const savedIds = new Set(rules.map((rule) => rule.id));

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
    setDraft((current) => readDraft(event, current, projects));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = recurrenceInputSchema.safeParse(draft);

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return;
    }

    const rule: TRecurrenceRule = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      description: parsed.data.description.length === 0 ? null : parsed.data.description,
      priority: parsed.data.priority,
      areaId: parsed.data.areaId,
      projectId: parsed.data.projectId,
      unit: parsed.data.unit,
      intervalCount: parsed.data.intervalCount,
      weekdays: parsed.data.unit === "day" ? [] : [...parsed.data.weekdays].sort((left, right) => left - right),
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: "active",
      generateFrom: parsed.data.startDate,
    };

    setIsPending(true);
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "add", rule });
      const result = await createRecurrenceRule({
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        areaId: draft.areaId,
        projectId: draft.projectId,
        unit: draft.unit,
        intervalCount: Number(draft.intervalCount),
        weekdays: draft.weekdays,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });
      setIsPending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDraft({ ...emptyDraft, startDate: today });
    });
  };

  const handleSave = (input: TDraft & { id: string; generateFrom: string }) => {
    const parsed = recurrenceUpdateSchema.safeParse(input);

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
            unit: parsed.data.unit,
            intervalCount: parsed.data.intervalCount,
            weekdays: parsed.data.unit === "day" ? [] : [...parsed.data.weekdays].sort((left, right) => left - right),
            startDate: parsed.data.startDate,
            endDate: parsed.data.endDate,
            generateFrom: laterDate(input.generateFrom, parsed.data.startDate),
          },
        });
        const result = await updateRecurrenceRule({
          id: input.id,
          title: input.title,
          description: input.description,
          priority: input.priority,
          areaId: input.areaId,
          projectId: input.projectId,
          unit: input.unit,
          intervalCount: Number(input.intervalCount),
          weekdays: input.weekdays,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        if (result.error) {
          setError(result.error);
        }

        resolve(result);
      });
    });
  };

  const handlePause = (id: string) => {
    run({ type: "patch", id, patch: { status: "paused" } }, () => pauseRecurrenceRule(id));
  };

  const handleResume = (rule: TRecurrenceRule) => {
    run(
      { type: "patch", id: rule.id, patch: { status: "active", generateFrom: laterDate(today, rule.startDate) } },
      () => resumeRecurrenceRule(rule.id),
    );
  };

  const handleCancel = (id: string) => {
    run({ type: "patch", id, patch: { status: "cancelled" } }, () => cancelRecurrenceRule(id));
  };

  const handleDelete = (id: string) => {
    run({ type: "remove", id }, () => deleteRecurrenceRule(id));
  };

  const handleSkip = (id: string, occurrenceDate: string) => {
    const parsed = skipDateSchema.safeParse({ id, occurrenceDate });

    if (!parsed.success) {
      setError(zodMessage(parsed.error));
      return Promise.resolve({ error: zodMessage(parsed.error) });
    }

    setError(null);
    return skipRecurrenceDate(parsed.data);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-3">
        <p className="text-sm font-medium">Новое правило</p>
        <RuleFields draft={draft} areas={areas} projects={projects} onChange={handleChange} />
        <p className="text-sm text-muted-foreground">Пропущенные даты до местной сегодняшней даты создают «Сегодня» и «Обзор», будущие — календарь. Правка обновляет задачи этой серии.</p>
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
          <p className="text-sm leading-6 text-muted-foreground">Правил пока нет. День или неделя, интервал и выбранные дни задаются здесь.</p>
        </div>
      ) : null}
      {optimisticRules.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {optimisticRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              areas={areas}
              projects={projects}
              today={today}
              isSaved={savedIds.has(rule.id)}
              onSave={handleSave}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onSkip={handleSkip}
              startsOpen={focusRuleId === rule.id}
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

function RuleFields({ draft, areas, projects, onChange }: TFieldsProps) {
  const areaProjects = projects.filter((project) => project.areaId === draft.areaId);
  const showProjects = draft.areaId.length > 0 && areaProjects.length > 0;
  const showWeekdays = draft.unit === "week";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Название
        <input name="title" value={draft.title} onChange={onChange} className={`${taskFieldClassName} h-10`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Описание
        <textarea name="description" value={draft.description} onChange={onChange} rows={2} className={`${taskFieldClassName} py-2`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
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
          Повтор
          <select name="unit" value={draft.unit} onChange={onChange} className={`${taskFieldClassName} h-10`}>
            <option value="day">По дням</option>
            <option value="week">По неделям</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Интервал
        <input
          name="intervalCount"
          type="number"
          min={1}
          max={365}
          value={draft.intervalCount}
          onChange={onChange}
          className={`${taskFieldClassName} h-10`}
        />
      </label>
      {showWeekdays ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Дни недели</legend>
          <div className="flex flex-wrap gap-2">
            {weekdayLabels.slice(1).map((label, index) => {
              const day = index + 1;
              const isChecked = draft.weekdays.includes(day);

              return (
                <label key={day} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-sm">
                  <input type="checkbox" name="weekday" value={day} checked={isChecked} onChange={onChange} />
                  {label}
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            Недели отсчитываются от недели даты начала. В выбранные дни активных недель создаются задачи.
          </p>
        </fieldset>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Начало
          <input name="startDate" type="date" value={draft.startDate} onChange={onChange} className={`${taskFieldClassName} h-10`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Окончание
          <input name="endDate" type="date" value={draft.endDate} onChange={onChange} className={`${taskFieldClassName} h-10`} />
        </label>
      </div>
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
  rule: TRecurrenceRule;
  areas: TCatalogArea[];
  projects: TCatalogProject[];
  today: string;
  isSaved: boolean;
  onSave: (input: TDraft & { id: string; generateFrom: string }) => Promise<{ error: string | null }>;
  onPause: (id: string) => void;
  onResume: (rule: TRecurrenceRule) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onSkip: (id: string, occurrenceDate: string) => Promise<{ error: string | null }>;
  startsOpen: boolean;
};

function RuleCard({ rule, areas, projects, today, isSaved, onSave, onPause, onResume, onCancel, onDelete, onSkip, startsOpen }: TCardProps) {
  const [isEditing, setIsEditing] = useState(startsOpen);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [skipDate, setSkipDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TDraft>(draftFromRule(rule));
  const areaName = areas.find((area) => area.id === rule.areaId)?.name ?? null;
  const projectName = projects.find((project) => project.id === rule.projectId)?.name ?? null;
  const canEdit = isSaved && rule.status !== "cancelled";
  const canPause = isSaved && rule.status === "active";
  const canResume = isSaved && rule.status === "paused";
  const canCancel = isSaved && rule.status !== "cancelled";
  const canSkip = isSaved && rule.status !== "cancelled";
  const locationLabel = projectName ? `Проект: ${projectName}` : areaName ? `Сфера: ${areaName}` : "Без раздела";

  useEffect(() => {
    if (!startsOpen) {
      return;
    }

    document.getElementById(`rule-${rule.id}`)?.scrollIntoView({ block: "nearest" });
  }, [startsOpen, rule.id]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft((current) => readDraft(event, current, projects));
  };

  const handleStartEdit = () => {
    setDraft(draftFromRule(rule));
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    void onSave({ ...draft, id: rule.id, generateFrom: rule.generateFrom }).then((result) => {
      setIsSaving(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsEditing(false);
    });
  };

  const handlePause = () => {
    onPause(rule.id);
  };

  const handleResume = () => {
    onResume(rule);
  };

  const handleCancelRule = () => {
    onCancel(rule.id);
  };

  const handleAskDelete = () => {
    setIsConfirmingDelete(true);
  };

  const handleKeep = () => {
    setIsConfirmingDelete(false);
  };

  const handleDelete = () => {
    onDelete(rule.id);
  };

  const handleSkipDate = (event: ChangeEvent<HTMLInputElement>) => {
    setSkipDate(event.target.value);
  };

  const handleSkip = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSkip(rule.id, skipDate).then((result) => {
      if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <li id={`rule-${rule.id}`} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      {isEditing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <RuleFields draft={draft} areas={areas} projects={projects} onChange={handleChange} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelEdit}>
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-medium">{rule.title}</h2>
              <span className="text-sm text-muted-foreground">{statusLabels[rule.status]}</span>
            </div>
            {rule.description ? <p className="text-sm text-muted-foreground">{rule.description}</p> : null}
            <p className="text-sm text-muted-foreground">{describeRule(rule)}</p>
            {rule.unit === "week" ? (
              <p className="text-sm text-muted-foreground">
                Недели отсчитываются от недели даты начала. В выбранные дни активных недель создаются задачи.
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              С {formatDueDate(rule.startDate)}
              {rule.endDate ? `, до ${formatDueDate(rule.endDate)}` : ""}
              {`. Новые даты с ${formatDueDate(rule.generateFrom)}.`}
            </p>
            <p className="text-sm text-muted-foreground">
              {priorityLabels[rule.priority]}. {locationLabel}.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button type="button" variant="outline" onClick={handleStartEdit}>
                Изменить
              </Button>
            ) : null}
            {canPause ? (
              <Button type="button" variant="outline" onClick={handlePause}>
                Пауза
              </Button>
            ) : null}
            {canResume ? (
              <Button type="button" variant="outline" onClick={handleResume}>
                Возобновить
              </Button>
            ) : null}
            {canCancel ? (
              <Button type="button" variant="outline" onClick={handleCancelRule}>
                Отменить правило
              </Button>
            ) : null}
            {isConfirmingDelete ? (
              <>
                <p className="w-full text-sm text-muted-foreground">Удалятся правило и все задачи этой серии.</p>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={!isSaved}>
                  Удалить навсегда
                </Button>
                <Button type="button" variant="outline" onClick={handleKeep}>
                  Оставить
                </Button>
              </>
            ) : (
              <Button type="button" variant="destructive" onClick={handleAskDelete} disabled={!isSaved}>
                Удалить
              </Button>
            )}
          </div>
          {canSkip ? (
            <form onSubmit={handleSkip} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
                Пропустить дату
                <input type="date" value={skipDate} onChange={handleSkipDate} className={`${taskFieldClassName} h-10`} />
              </label>
              <Button type="submit" variant="outline">
                Пропустить
              </Button>
            </form>
          ) : null}
        </>
      )}
    </li>
  );
}
