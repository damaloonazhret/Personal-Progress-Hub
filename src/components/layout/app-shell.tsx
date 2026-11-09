import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type TProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: TProps) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:justify-end">
          <Link href="/dashboard" className="text-sm font-semibold md:hidden">
            Progress Hub
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="text-sm text-muted-foreground hover:text-foreground md:hidden"
            >
              Настройки
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
