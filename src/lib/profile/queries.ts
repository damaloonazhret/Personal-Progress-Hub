import { requireUser } from "@/lib/auth/session";
import { FALLBACK_TIME_ZONE, isIanaTimeZone, localDateInTimeZone } from "@/lib/profile/timezone";

export async function getProfileTimeZone() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("profiles").select("timezone").eq("user_id", userId).maybeSingle();

  if (data?.timezone && isIanaTimeZone(data.timezone)) {
    return data.timezone;
  }

  return FALLBACK_TIME_ZONE;
}

export async function getLocalToday() {
  const timeZone = await getProfileTimeZone();
  return localDateInTimeZone(timeZone);
}
