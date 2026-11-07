import { requireUser } from "@/lib/auth/session";
import { getLocalToday } from "@/lib/profile/queries";
import { isRealIsoDate, recurrenceRuleChunks, recurrenceWindows } from "@/lib/recurrence/schedule";

const prepareError = "Не удалось подготовить повторяющиеся задачи.";

export async function generateRecurrenceRange(fromDate: string, toDate: string) {
  if (!isRealIsoDate(fromDate) || !isRealIsoDate(toDate) || fromDate > toDate) {
    return { error: prepareError };
  }

  const { supabase, userId } = await requireUser();
  const { data: rules, error } = await supabase
    .from("recurrence_rules")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("start_date", toDate)
    .lte("generate_from", toDate)
    .or(`end_date.is.null,end_date.gte.${fromDate}`)
    .order("id", { ascending: true });

  if (error || !rules) {
    return { error: prepareError };
  }

  if (rules.length === 0) {
    return { error: null };
  }

  for (const window of recurrenceWindows(fromDate, toDate)) {
    for (const chunk of recurrenceRuleChunks(rules)) {
      const { error: batchError } = await supabase.rpc("generate_recurrence_batch", {
        p_from: window.fromDate,
        p_to: window.toDate,
        p_rule_ids: chunk.map((rule) => rule.id),
      });

      if (batchError) {
        return { error: prepareError };
      }
    }
  }

  return { error: null };
}

export async function generateRecurrenceThroughToday() {
  const today = await getLocalToday();
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recurrence_rules")
    .select("generate_from")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("generate_from", today)
    .order("generate_from", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: prepareError };
  }

  if (!data) {
    return { error: null };
  }

  return generateRecurrenceRange(data.generate_from, today);
}
