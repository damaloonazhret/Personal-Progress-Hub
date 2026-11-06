import { z } from "zod";

import { zodMessage } from "@/lib/tasks/model";

export type TDirection = "up" | "down";

export type TProgress = {
  active: number;
  completed: number;
  total: number;
  percent: number;
};

export type TAreaCard = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  projectCount: number;
  progress: TProgress;
};

export type TProjectCard = {
  id: string;
  areaId: string;
  areaName: string;
  name: string;
  description: string | null;
  position: number;
  progress: TProgress;
};

export type TCatalogArea = {
  id: string;
  name: string;
};

export type TCatalogProject = {
  id: string;
  areaId: string;
  name: string;
};

const nameSchema = z.string().trim().min(1, "Введите название.").max(120, "Название не длиннее 120 символов.");
const descriptionSchema = z.string().trim().max(4000, "Описание не длиннее 4000 символов.");

export const areaInputSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});

export const areaUpdateSchema = areaInputSchema.extend({
  id: z.string().uuid(),
});

export const projectInputSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  areaId: z.string().uuid("Выберите сферу."),
});

export const projectUpdateSchema = projectInputSchema.extend({
  id: z.string().uuid(),
});

export const recordIdSchema = z.string().uuid();

export function progressFromCounts(active: number, completed: number): TProgress {
  const total = active + completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { active, completed, total, percent };
}

export function formatProgress(progress: TProgress) {
  if (progress.total === 0) {
    return "Нет задач";
  }

  return `Активные: ${progress.active} · Готово: ${progress.completed} · ${progress.percent}%`;
}

export function moveRecords<TItem extends { id: string; position: number }>(
  items: TItem[],
  id: string,
  direction: TDirection,
) {
  const ordered = [...items].sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
  const index = ordered.findIndex((item) => item.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const next = ordered.slice();
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);

  return next.map((item, position) => ({ ...item, position }));
}

export { zodMessage };
