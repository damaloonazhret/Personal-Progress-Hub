"use client";

import { NavLink } from "@/components/layout/nav-link";
import { primaryNavItems } from "@/lib/navigation";

export function BottomNav() {
  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex">
        {primaryNavItems.map((item) => (
          <NavLink key={item.href} item={item} variant="bottom" />
        ))}
      </div>
    </nav>
  );
}
