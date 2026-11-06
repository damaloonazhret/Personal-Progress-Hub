import {
  CheckCircle2,
  FolderKanban,
  Inbox,
  Layers,
  LayoutDashboard,
  ListChecks,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type TNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const primaryNavItems: TNavItem[] = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/inbox", label: "Входящие", icon: Inbox },
  { href: "/today", label: "Сегодня", icon: ListChecks },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/areas", label: "Сферы", icon: Layers },
  { href: "/completed", label: "Готово", icon: CheckCircle2 },
];

export const settingsNavItem: TNavItem = {
  href: "/settings",
  label: "Настройки",
  icon: Settings,
};
