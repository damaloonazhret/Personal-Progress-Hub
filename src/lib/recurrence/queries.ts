import { requireUser } from "@/lib/auth/session";
import type { TRecurrenceRule, TRecurrenceStatus, TRecurrenceUnit } from "@/lib/recurrence/model";
import type { TTaskPriority } from "@/lib/tasks/model";

const ruleColumns =
  "id, title, description, priority, area_id, project_id, unit, interval_count, weekdays, start_date, end_date, status, generate_from";

type TRuleRow = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  area_id: string | null;
  project_id: string | null;
  unit: string;
  interval_count: number;
  weekdays: number[];
  start_date: string;
  end_date: string | null;
  status: string;
  generate_from: string;
};

const loadError = "Не удалось загрузить правила.";

function mapPriority(priority: string): TTaskPriority {
  if (priority === "low" || priority === "high") {
    return priority;
  }

  return "medium";
}

function mapUnit(unit: string): TRecurrenceUnit {
  return unit === "week" ? "week" : "day";
}

function mapStatus(status: string): TRecurrenceStatus {
  if (status === "paused" || status === "cancelled") {
    return status;
  }

  return "active";
}

function mapRule(row: TRuleRow): TRecurrenceRule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: mapPriority(row.priority),
    areaId: row.area_id,
    projectId: row.project_id,
    unit: mapUnit(row.unit),
    intervalCount: row.interval_count,
    weekdays: [...row.weekdays].sort((left, right) => left - right),
    startDate: row.start_date,
    endDate: row.end_date,
    status: mapStatus(row.status),
    generateFrom: row.generate_from,
  };
}

export async function getRecurrenceRules(): Promise<{ rules: TRecurrenceRule[]; error: string | null }> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recurrence_rules")
    .select(ruleColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { rules: [], error: loadError };
  }

  return { rules: data.map(mapRule), error: null };
}
