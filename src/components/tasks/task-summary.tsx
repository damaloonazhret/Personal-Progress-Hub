import Link from "next/link";

import type { TTaskSummary } from "@/lib/tasks/queries";

type TProps = {
  counts: TTaskSummary;
};

const summaryItems = [
  {
    href: "/inbox",
    label: "Активные",
    hint: "Все незавершённые, включая «Сегодня».",
    key: "active",
  },
  {
    href: "/today",
    label: "Сегодня",
    hint: "Выбраны вручную и остаются на следующий день.",
    key: "today",
  },
  {
    href: "/completed",
    label: "Готово",
    hint: "Завершённые задачи можно вернуть.",
    key: "completed",
  },
] as const;

export function TaskSummary({ counts }: TProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {summaryItems.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-3xl font-semibold tracking-tight">{counts[item.key]}</span>
            <span className="text-sm leading-5 text-muted-foreground">{item.hint}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
