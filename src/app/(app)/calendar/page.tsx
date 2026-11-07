import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { CalendarBoard } from "@/components/calendar/calendar-board";
import { SectionPage } from "@/components/layout/section-page";
import {
  buildMonthGrid,
  calendarHref,
  formatMonthTitle,
  monthKey,
  neighborHref,
  parseMonth,
  resolveSelectedDate,
} from "@/lib/calendar/month";
import { getCatalog } from "@/lib/organization/queries";
import { getLocalToday } from "@/lib/profile/queries";
import { getCalendarTasks } from "@/lib/tasks/queries";

export const metadata: Metadata = {
  title: "Календарь",
};

export const instant = false;

type TProps = {
  searchParams: Promise<{
    month?: string;
    date?: string;
  }>;
};

async function CalendarContent({ searchParams }: TProps) {
  await connection();
  const params = await searchParams;
  const today = await getLocalToday();
  const requested = parseMonth(params.month, today);
  const grid = buildMonthGrid(requested.year, requested.month);

  if (!grid) {
    return <p className="text-sm text-destructive">Не удалось открыть этот месяц.</p>;
  }

  const selectedDate = resolveSelectedDate(params.date, grid, today);
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const [result, catalog] = await Promise.all([getCalendarTasks(grid.start, grid.end), getCatalog()]);

  return (
    <CalendarBoard
      key={`${grid.start}:${selectedDate}`}
      today={today}
      monthLabel={formatMonthTitle(grid.year, grid.month)}
      monthQuery={monthKey(grid.year, grid.month)}
      days={grid.days}
      tasks={result.tasks}
      selectedDate={selectedDate}
      rangeStart={grid.start}
      rangeEnd={grid.end}
      previousHref={neighborHref(grid.year, grid.month, -1)}
      nextHref={neighborHref(grid.year, grid.month, 1)}
      todayHref={calendarHref(todayYear, todayMonth, today)}
      loadError={result.error ?? catalog.error}
      catalog={catalog}
    />
  );
}

export default function CalendarPage({ searchParams }: TProps) {
  return (
    <SectionPage
      title="Календарь"
      description="Месяц с понедельника. В ячейке день плана, не срок. Открытие месяца создаёт повторения на видимые недели, включая будущие."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка календаря…</p>}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </SectionPage>
  );
}
