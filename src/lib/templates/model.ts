import { z } from "zod";

import { taskPriorities, zodMessage, type TTaskPriority } from "@/lib/tasks/model";

export type TTemplate = {
  id: string;
  title: string;
  description: string | null;
  priority: TTaskPriority;
  areaId: string | null;
  projectId: string | null;
  position: number;
};

const optionalIdSchema = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .pipe(z.string().uuid("Выберите запись из списка.").nullable());

export const templateInputSchema = z.object({
  title: z.string().trim().min(1, "Введите название.").max(200, "Название не длиннее 200 символов."),
  description: z.string().trim().max(4000, "Описание не длиннее 4000 символов."),
  priority: z.enum(taskPriorities, { message: "Выберите приоритет." }),
  areaId: optionalIdSchema,
  projectId: optionalIdSchema,
});

export const templateUpdateSchema = templateInputSchema.extend({
  id: z.string().uuid(),
});

export { zodMessage };
