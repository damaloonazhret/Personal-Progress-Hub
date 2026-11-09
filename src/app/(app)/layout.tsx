import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { TimezoneSync } from "@/components/profile/timezone-sync";
import { FALLBACK_TIME_ZONE } from "@/lib/profile/timezone";
import { createClient } from "@/lib/supabase/server";

type TProps = {
  children: React.ReactNode;
};

export const instant = false;

export default async function AppLayout({ children }: TProps) {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const userId = data?.claims.sub;

  if (typeof userId !== "string" || userId.length === 0) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", userId).maybeSingle();
  const shouldCaptureTimeZone = profile?.timezone === FALLBACK_TIME_ZONE || !profile;

  return (
    <AppShell>
      {shouldCaptureTimeZone ? <TimezoneSync /> : null}
      {children}
    </AppShell>
  );
}
