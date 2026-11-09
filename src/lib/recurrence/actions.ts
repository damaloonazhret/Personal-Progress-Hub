"use server";

import { requireUser } from "@/lib/auth/session";
import { revalidateWork } from "@/lib/app/revalidate";
import { getLocalToday } from "@/lib/profile/queries";
import {
  laterDate,
  recurrenceIdSchema,
  recurrenceInputSchema,
  recurrenceUpdateSchema,
  skipDateSchema,
  zodMessage,
} from "@/lib/recurrence/model";
import { emptyToNull } from "@/lib/tasks/model";

export type TRecurrenceActionState = {
  error: string | null;
};

const saveError = "Не удалось сохранить правило.";

function ok(): TRecurrenceActionState {
  return { error: null };
}

function failed(message = saveError): TRecurrenceActionState {
  return { error: message };
}

async function resolvePlacement(userId: string, areaId: string | null, projectId: string | null) {
  const { supabase } = await requireUser();

  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id, area_id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data || (areaId && areaId !== data.area_id)) {
      return null;
    }

    return { areaId: data.area_id, projectId: data.id };
  }

  if (areaId) {
    const { data } = await supabase.from("areas").select("id").eq("id", areaId).eq("user_id", userId).maybeSingle();

    if (!data) {
      return null;
    }

    return { areaId: data.id, projectId: null };
  }

  return { areaId: null, projectId: null };
}

function sortedWeekdays(unit: "day" | "week", weekdays: number[]) {
  if (unit === "day") {
    return [];
  }

  return [...new Set(weekdays)].sort((left, right) => left - right);
}

export async function createRecurrenceRule(input: {
  title: string;
  description: string;
  priority: string;
  areaId: string;
  projectId: string;
  unit: string;
  intervalCount: number;
  weekdays: number[];
  startDate: string;
  endDate: string;
}): Promise<TRecurrenceActionState> {
  const parsed = recurrenceInputSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const placement = await resolvePlacement(userId, parsed.data.areaId, parsed.data.projectId);

  if (!placement) {
    return failed();
  }

  const { error } = await supabase.from("recurrence_rules").insert({
    user_id: userId,
    title: parsed.data.title,
    description: emptyToNull(parsed.data.description),
    priority: parsed.data.priority,
    area_id: placement.areaId,
    project_id: placement.projectId,
    unit: parsed.data.unit,
    interval_count: parsed.data.intervalCount,
    weekdays: sortedWeekdays(parsed.data.unit, parsed.data.weekdays),
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    status: "active",
    generate_from: parsed.data.startDate,
  });

  if (error) {
    return failed();
  }

  revalidateWork();
  return ok();
}

export async function updateRecurrenceRule(input: {
  id: string;
  title: string;
  description: string;
  priority: string;
  areaId: string;
  projectId: string;
  unit: string;
  intervalCount: number;
  weekdays: number[];
  startDate: string;
  endDate: string;
}): Promise<TRecurrenceActionState> {
  const parsed = recurrenceUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const placement = await resolvePlacement(userId, parsed.data.areaId, parsed.data.projectId);

  if (!placement) {
    return failed();
  }

  const { error } = await supabase.rpc("apply_recurrence_series", {
    p_rule_id: parsed.data.id,
    p_title: parsed.data.title,
    p_description: emptyToNull(parsed.data.description),
    p_priority: parsed.data.priority,
    p_area_id: placement.areaId,
    p_project_id: placement.projectId,
    p_unit: parsed.data.unit,
    p_interval_count: parsed.data.intervalCount,
    p_weekdays: sortedWeekdays(parsed.data.unit, parsed.data.weekdays),
    p_start_date: parsed.data.startDate,
    p_end_date: parsed.data.endDate,
  });

  if (error) {
    return failed();
  }

  revalidateWork();
  return ok();
}

export async function pauseRecurrenceRule(id: string) {
  const parsed = recurrenceIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recurrence_rules")
    .update({ status: "paused" })
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateWork();
  return ok();
}

export async function resumeRecurrenceRule(id: string) {
  const parsed = recurrenceIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const { data: current, error: currentError } = await supabase
    .from("recurrence_rules")
    .select("start_date, status")
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError || !current || current.status !== "paused") {
    return failed();
  }

  const localToday = await getLocalToday();
  const { data, error } = await supabase
    .from("recurrence_rules")
    .update({ status: "active", generate_from: laterDate(localToday, current.start_date) })
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .eq("status", "paused")
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateWork();
  return ok();
}

export async function cancelRecurrenceRule(id: string) {
  const parsed = recurrenceIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recurrence_rules")
    .update({ status: "cancelled" })
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateWork();
  return ok();
}

export async function deleteRecurrenceRule(id: string) {
  const parsed = recurrenceIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_recurrence_series", {
    p_rule_id: parsed.data,
  });

  if (error) {
    return failed();
  }

  revalidateWork();
  return ok();
}

export async function skipRecurrenceDate(input: { id: string; occurrenceDate: string }) {
  const parsed = skipDateSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const { data: rule, error: ruleError } = await supabase
    .from("recurrence_rules")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .maybeSingle();

  if (ruleError || !rule) {
    return failed();
  }

  const { error } = await supabase.from("recurrence_skips").insert({
    user_id: userId,
    rule_id: rule.id,
    occurrence_date: parsed.data.occurrenceDate,
  });

  if (error && error.code !== "23505") {
    return failed();
  }

  revalidateWork();
  return ok();
}
