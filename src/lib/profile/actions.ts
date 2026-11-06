"use server";

import { requireUser } from "@/lib/auth/session";
import { FALLBACK_TIME_ZONE, isIanaTimeZone } from "@/lib/profile/timezone";

export async function saveBrowserTimeZone(timeZone: string) {
  if (!isIanaTimeZone(timeZone)) {
    return false;
  }

  const { supabase, userId } = await requireUser();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("saveBrowserTimeZone", profileError.message);
    return false;
  }

  if (!profile) {
    const { error } = await supabase.from("profiles").insert({ user_id: userId, timezone: timeZone });

    if (error) {
      console.error("saveBrowserTimeZone", error.message);
      return false;
    }

    return true;
  }

  if (profile.timezone !== FALLBACK_TIME_ZONE || timeZone === profile.timezone) {
    return false;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ timezone: timeZone })
    .eq("user_id", userId)
    .eq("timezone", FALLBACK_TIME_ZONE);

  if (error) {
    console.error("saveBrowserTimeZone", error.message);
    return false;
  }

  return true;
}
