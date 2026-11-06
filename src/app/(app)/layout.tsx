import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

type TProps = {
  children: React.ReactNode;
};

export const instant = false;

export default async function AppLayout({ children }: TProps) {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
