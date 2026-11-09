import { addIsoDays, isRealIsoDate, isoWeekday, isoWeekMonday } from "../recurrence/schedule.ts";

const earliestDate = "1000-01-01";
const latestDate = "9999-12-31";

export const calendarWeekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export type TCalendarDay = {
  date: string;
  inMonth: boolean;
};

export type TCalendarGrid = {
  year: number;
  month: number;
  start: string;
  end: string;
  days: TCalendarDay[];
};

export function monthKey(year: number, month: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function lastDateOfMonth(year: number, month: number) {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return addIsoDays(`${monthKey(nextYear, nextMonth)}-01`, -1);
}

export function buildMonthGrid(year: number, month: number): TCalendarGrid | null {
  const monthIsValid = Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;

  if (!monthIsValid) {
    return null;
  }

  const first = `${monthKey(year, month)}-01`;
  const last = lastDateOfMonth(year, month);

  if (!isRealIsoDate(first) || !isRealIsoDate(last)) {
    return null;
  }

  const start = isoWeekMonday(first);
  const end = addIsoDays(last, 7 - isoWeekday(last));
  const rangeIsValid = isRealIsoDate(start) && isRealIsoDate(end) && start >= earliestDate && end <= latestDate;

  if (!rangeIsValid) {
    return null;
  }

  const days: TCalendarDay[] = [];
  const monthPrefix = monthKey(year, month);
  let cursor = start;

  while (cursor <= end) {
    days.push({ date: cursor, inMonth: cursor.slice(0, 7) === monthPrefix });
    cursor = addIsoDays(cursor, 1);
  }

  if (days.length === 0 || days.length % 7 !== 0) {
    return null;
  }

  return { year, month, start, end, days };
}

export function parseMonth(value: string | undefined, today: string) {
  const fallbackYear = Number(today.slice(0, 4));
  const fallbackMonth = Number(today.slice(5, 7));

  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));

    if (buildMonthGrid(year, month)) {
      return { year, month };
    }
  }

  return { year: fallbackYear, month: fallbackMonth };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = index - nextYear * 12 + 1;

  return { year: nextYear, month: nextMonth };
}

export function resolveSelectedDate(value: string | undefined, grid: TCalendarGrid, today: string) {
  const valueIsVisible = Boolean(value && isRealIsoDate(value) && value >= grid.start && value <= grid.end);

  if (valueIsVisible && value) {
    return value;
  }

  if (today >= grid.start && today <= grid.end) {
    return today;
  }

  return `${monthKey(grid.year, grid.month)}-01`;
}

export function calendarHref(year: number, month: number, date: string) {
  return `/calendar?month=${monthKey(year, month)}&date=${date}`;
}

export function neighborHref(year: number, month: number, delta: number) {
  const next = shiftMonth(year, month, delta);
  const grid = buildMonthGrid(next.year, next.month);

  if (!grid) {
    return null;
  }

  return calendarHref(next.year, next.month, `${monthKey(next.year, next.month)}-01`);
}

export function formatMonthTitle(year: number, month: number) {
  const label = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekday(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);

  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
