import { z } from "zod";

import { taskPriorities, zodMessage, type TTaskPriority } from "@/lib/tasks/model";
import { isRealIsoDate } from "@/lib/recurrence/schedule";

export const recurrenceUnits = ["day", "week"] as const;
export const recurrenceStatuses = ["active", "paused", "cancelled"] as const;

export type TRecurrenceUnit = (typeof recurrenceUnits)[number];
export type TRecurrenceStatus = (typeof recurrenceStatuses)[number];

export type TRecurrenceRule = {
  id: string;
  title: string;
  description: string | null;
  priority: TTaskPriority;
  areaId: string | null;
  projectId: string | null;
  unit: TRecurrenceUnit;
  intervalCount: number;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
  status: TRecurrenceStatus;
  generateFrom: string;
};

const optionalIdSchema = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .pipe(z.string().uuid("Выберите запись из списка.").nullable());

const dateSchema = z.string().trim().superRefine((value, context) => {
  if (!isRealIsoDate(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Укажите корректную дату." });
  }
});

const optionalDateSchema = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .superRefine((value, context) => {
    if (value !== null && !isRealIsoDate(value)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Укажите корректную дату." });
    }
  });

export const recurrenceInputSchema = z
  .object({
    title: z.string().trim().min(1, "Введите название.").max(200, "Название не длиннее 200 символов."),
    description: z.string().trim().max(4000, "Описание не длиннее 4000 символов."),
    priority: z.enum(taskPriorities, { message: "Выберите приоритет." }),
    areaId: optionalIdSchema,
    projectId: optionalIdSchema,
    unit: z.enum(recurrenceUnits, { message: "Выберите день или неделю." }),
    intervalCount: z.coerce
      .number({ message: "Укажите интервал." })
      .int("Интервал должен быть целым.")
      .min(1, "Интервал не меньше 1.")
      .max(365, "Интервал не больше 365."),
    weekdays: z.array(z.number().int().min(1).max(7)),
    startDate: dateSchema,
    endDate: optionalDateSchema,
  })
  .superRefine((value, context) => {
    if (value.unit === "day" && value.weekdays.length > 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Для повтора по дням дни недели не нужны.", path: ["weekdays"] });
    }

    if (value.unit === "week" && value.weekdays.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Выберите хотя бы один день недели.",
        path: ["weekdays"],
      });
    }

    if (new Set(value.weekdays).size !== value.weekdays.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Дни недели не должны повторяться.", path: ["weekdays"] });
    }

    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Окончание не может быть раньше начала.", path: ["endDate"] });
    }
  });

export const recurrenceUpdateSchema = recurrenceInputSchema.and(z.object({ id: z.string().uuid() }));

export const recurrenceIdSchema = z.string().uuid();

export const skipDateSchema = z.object({
  id: z.string().uuid(),
  occurrenceDate: dateSchema,
});

export function laterDate(left: string, right: string) {
  return left > right ? left : right;
}

export { zodMessage };
