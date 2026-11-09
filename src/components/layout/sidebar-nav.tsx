"use client";

import Link from "next/link";

import { NavLink } from "@/components/layout/nav-link";
import { primaryNavItems, settingsNavItem } from "@/lib/navigation";

export function SidebarNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-4 py-5">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Personal Progress Hub
        </Link>
      </div>
      <nav aria-label="Основная навигация" className="flex flex-1 flex-col gap-1 px-3">
        {primaryNavItems.map((item) => (
          <NavLink key={item.href} item={item} variant="sidebar" />
        ))}
      </nav>
      <div className="border-t px-3 py-3">
        <NavLink item={settingsNavItem} variant="sidebar" />
      </div>
    </aside>
  );
}
