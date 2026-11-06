"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { TNavItem } from "@/lib/navigation";

type TProps = {
  item: TNavItem;
  variant: "sidebar" | "bottom";
};

export function NavLink({ item, variant }: TProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center rounded-lg text-sm transition-colors",
        variant === "sidebar" && "gap-3 px-3 py-2",
        variant === "bottom" && "min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-[11px] leading-none",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon aria-hidden="true" />
      <span className={cn(variant === "bottom" && "truncate")}>{item.label}</span>
    </Link>
  );
}
