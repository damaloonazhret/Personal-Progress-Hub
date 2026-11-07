const dayMs = 86_400_000;

function utcDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtc(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isRealIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = utcDate(value);

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isoWeekday(isoDate: string) {
  const day = utcDate(isoDate).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isoWeekMonday(isoDate: string) {
  const date = utcDate(isoDate);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (isoWeekday(isoDate) - 1));
  return formatUtc(monday);
}

export function daysBetween(startDate: string, occurrenceDate: string) {
  return Math.round((utcDate(occurrenceDate).getTime() - utcDate(startDate).getTime()) / dayMs);
}

export function weekIndex(startDate: string, occurrenceDate: string) {
  return daysBetween(isoWeekMonday(startDate), isoWeekMonday(occurrenceDate)) / 7;
}

export function addIsoDays(isoDate: string, days: number) {
  const date = utcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtc(date);
}

export const recurrenceBatchDays = 92;
export const recurrenceBatchRuleCount = 25;

export type TRecurrenceSchedule = {
  unit: "day" | "week";
  intervalCount: number;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
  generateFrom: string;
};

export function occurrenceDatesInRange(rule: TRecurrenceSchedule, fromDate: string, toDate: string) {
  const windowStart = [fromDate, rule.startDate, rule.generateFrom].sort().at(-1) ?? fromDate;
  const windowEnd = rule.endDate && rule.endDate < toDate ? rule.endDate : toDate;

  if (windowStart > windowEnd) {
    return [];
  }

  if (rule.unit === "day") {
    const remainder = daysBetween(rule.startDate, windowStart) % rule.intervalCount;
    const dates: string[] = [];
    let cursor = remainder === 0 ? windowStart : addIsoDays(windowStart, rule.intervalCount - remainder);

    while (cursor <= windowEnd) {
      dates.push(cursor);
      cursor = addIsoDays(cursor, rule.intervalCount);
    }

    return dates;
  }

  const dates: string[] = [];
  let monday = isoWeekMonday(windowStart);
  let index = weekIndex(rule.startDate, monday);

  if (index < 0) {
    monday = isoWeekMonday(rule.startDate);
    index = 0;
  }

  if (index % rule.intervalCount !== 0) {
    monday = addIsoDays(monday, (rule.intervalCount - (index % rule.intervalCount)) * 7);
  }

  const weekdays = [...rule.weekdays].sort((left, right) => left - right);

  while (monday <= windowEnd) {
    for (const weekday of weekdays) {
      const date = addIsoDays(monday, weekday - 1);

      if (date >= windowStart && date <= windowEnd && date >= rule.startDate) {
        dates.push(date);
      }
    }

    monday = addIsoDays(monday, rule.intervalCount * 7);
  }

  return dates;
}

export function recurrenceWindows(fromDate: string, toDate: string) {
  const windows: { fromDate: string; toDate: string }[] = [];
  let cursor = fromDate;

  while (cursor <= toDate) {
    const end = addIsoDays(cursor, recurrenceBatchDays - 1);
    const to = end < toDate ? end : toDate;
    windows.push({ fromDate: cursor, toDate: to });
    cursor = addIsoDays(to, 1);
  }

  return windows;
}

export function recurrenceRuleChunks<T>(rules: T[]) {
  const chunks: T[][] = [];

  for (let index = 0; index < rules.length; index += recurrenceBatchRuleCount) {
    chunks.push(rules.slice(index, index + recurrenceBatchRuleCount));
  }

  return chunks;
}

export type TRecurrenceMatch = {
  unit: "day" | "week";
  intervalCount: number;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
  generateFrom: string;
  occurrenceDate: string;
};

export function matchesRecurrenceDate(input: TRecurrenceMatch) {
  if (input.occurrenceDate < input.startDate || input.occurrenceDate < input.generateFrom) {
    return false;
  }

  if (input.endDate && input.occurrenceDate > input.endDate) {
    return false;
  }

  if (input.unit === "day") {
    const distance = daysBetween(input.startDate, input.occurrenceDate);
    return distance % input.intervalCount === 0;
  }

  if (!input.weekdays.includes(isoWeekday(input.occurrenceDate))) {
    return false;
  }

  const index = weekIndex(input.startDate, input.occurrenceDate);
  return index >= 0 && index % input.intervalCount === 0;
}
