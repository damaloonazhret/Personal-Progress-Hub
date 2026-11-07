import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { restoreScheduledDate } from "../tasks/restore.ts";
import {
  addIsoDays,
  isoWeekMonday,
  isoWeekday,
  keepsSeriesOccurrence,
  matchesRecurrenceDate,
  nextSeriesGenerateFrom,
  occurrenceDatesInRange,
  recurrenceWindows,
  weekIndex,
  type TRecurrenceSchedule,
} from "./schedule.ts";

const weekRule = {
  unit: "week" as const,
  intervalCount: 2,
  weekdays: [1, 5],
  startDate: "2026-11-04",
  endDate: null,
  generateFrom: "2026-11-04",
};

describe("ISO week anchor", () => {
  it("starts the week on Monday", () => {
    assert.equal(isoWeekday("2026-11-01"), 7);
    assert.equal(isoWeekday("2026-11-02"), 1);
    assert.equal(isoWeekMonday("2026-11-04"), "2026-11-02");
  });

  it("keeps a year boundary in the same ISO week", () => {
    assert.equal(isoWeekMonday("2026-12-31"), "2026-12-28");
    assert.equal(isoWeekMonday("2027-01-03"), "2026-12-28");
    assert.equal(weekIndex("2026-12-31", "2027-01-01"), 0);
    assert.equal(weekIndex("2026-12-31", "2027-01-04"), 1);
  });

  it("repeats selected days every second week, not fourteen days from each day", () => {
    assert.equal(matchesRecurrenceDate({ ...weekRule, occurrenceDate: "2026-11-06" }), true);
    assert.equal(matchesRecurrenceDate({ ...weekRule, occurrenceDate: "2026-11-02" }), false);
    assert.equal(matchesRecurrenceDate({ ...weekRule, occurrenceDate: "2026-11-09" }), false);
    assert.equal(matchesRecurrenceDate({ ...weekRule, occurrenceDate: "2026-11-13" }), false);
    assert.equal(matchesRecurrenceDate({ ...weekRule, occurrenceDate: "2026-11-16" }), true);
    assert.equal(matchesRecurrenceDate({ ...weekRule, occurrenceDate: "2026-11-20" }), true);
  });

  it("crosses a month without shifting the week grid", () => {
    const rule = {
      ...weekRule,
      startDate: "2026-01-30",
      generateFrom: "2026-01-30",
      weekdays: [5],
    };

    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2026-01-30" }), true);
    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2026-02-06" }), false);
    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2026-02-13" }), true);
  });

  it("includes a later weekday in the start week and the next matching year week", () => {
    const rule = {
      unit: "week" as const,
      intervalCount: 2,
      weekdays: [1, 5],
      startDate: "2026-12-31",
      endDate: null,
      generateFrom: "2026-12-31",
    };

    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2026-12-28" }), false);
    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2027-01-01" }), true);
    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2027-01-04" }), false);
    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2027-01-11" }), true);
    assert.equal(matchesRecurrenceDate({ ...rule, occurrenceDate: "2027-01-15" }), true);
  });
});

describe("day intervals", () => {
  it("counts every day and every third day from the start date", () => {
    const daily = {
      unit: "day" as const,
      intervalCount: 1,
      weekdays: [],
      startDate: "2026-01-30",
      endDate: "2026-02-02",
      generateFrom: "2026-01-30",
    };

    assert.equal(matchesRecurrenceDate({ ...daily, occurrenceDate: "2026-01-30" }), true);
    assert.equal(matchesRecurrenceDate({ ...daily, occurrenceDate: "2026-02-01" }), true);
    assert.equal(matchesRecurrenceDate({ ...daily, occurrenceDate: "2026-02-03" }), false);

    const everyThird = { ...daily, intervalCount: 3, endDate: null };
    assert.equal(matchesRecurrenceDate({ ...everyThird, occurrenceDate: "2026-02-02" }), true);
    assert.equal(matchesRecurrenceDate({ ...everyThird, occurrenceDate: "2026-02-01" }), false);
  });

  it("lists every day and every third day inside the window", () => {
    const daily: TRecurrenceSchedule = {
      unit: "day",
      intervalCount: 1,
      weekdays: [],
      startDate: "2026-01-30",
      endDate: "2026-02-02",
      generateFrom: "2026-01-30",
    };

    assert.deepEqual(occurrenceDatesInRange(daily, "2026-01-01", "2026-03-01"), [
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);

    const everyThird = { ...daily, intervalCount: 3, endDate: null };
    assert.deepEqual(occurrenceDatesInRange(everyThird, "2026-01-30", "2026-02-08"), [
      "2026-01-30",
      "2026-02-02",
      "2026-02-05",
      "2026-02-08",
    ]);
  });

  it("does not fill dates before generate_from", () => {
    assert.equal(
      matchesRecurrenceDate({
        unit: "day",
        intervalCount: 1,
        weekdays: [],
        startDate: "2026-11-01",
        endDate: null,
        generateFrom: "2026-11-05",
        occurrenceDate: "2026-11-04",
      }),
      false,
    );
    assert.deepEqual(occurrenceDatesInRange(
      {
        unit: "day",
        intervalCount: 1,
        weekdays: [],
        startDate: "2026-11-01",
        endDate: null,
        generateFrom: "2026-11-05",
      },
      "2026-11-01",
      "2026-11-06",
    ), ["2026-11-05", "2026-11-06"]);
  });
});

describe("occurrence expansion", () => {
  const rules: TRecurrenceSchedule[] = [
    weekRule,
    {
      unit: "week",
      intervalCount: 1,
      weekdays: [1, 3, 5],
      startDate: "2026-11-04",
      endDate: "2026-11-20",
      generateFrom: "2026-11-04",
    },
    {
      unit: "week",
      intervalCount: 2,
      weekdays: [1, 5],
      startDate: "2026-12-31",
      endDate: null,
      generateFrom: "2027-01-04",
    },
    {
      unit: "day",
      intervalCount: 1,
      weekdays: [],
      startDate: "2026-01-30",
      endDate: "2026-02-02",
      generateFrom: "2026-01-30",
    },
  ];

  it("agrees with the single-date match across month and year boundaries", () => {
    for (const rule of rules) {
      let cursor = "2026-01-01";

      while (cursor <= "2027-02-01") {
        const listed = occurrenceDatesInRange(rule, "2026-01-01", "2027-02-01").includes(cursor);
        assert.equal(listed, matchesRecurrenceDate({ ...rule, occurrenceDate: cursor }), cursor);
        cursor = addIsoDays(cursor, 1);
      }
    }
  });

  it("covers a long range with contiguous 92-day batches", () => {
    const windows = recurrenceWindows("2026-11-01", "2027-03-15");
    assert.equal(windows[0]?.fromDate, "2026-11-01");
    assert.equal(windows.at(-1)?.toDate, "2027-03-15");

    for (let index = 0; index < windows.length; index += 1) {
      const window = windows[index];
      assert.ok(window);
      assert.ok(window.toDate >= window.fromDate);
      const length = (Date.parse(`${window.toDate}T00:00:00Z`) - Date.parse(`${window.fromDate}T00:00:00Z`)) / 86_400_000 + 1;
      assert.ok(length <= 92);
      const next = windows[index + 1];

      if (next) {
        assert.equal(next.fromDate, addIsoDays(window.toDate, 1));
      }
    }
  });
});

function scheduleMatch(occurrenceDate: string, schedule: Partial<TRecurrenceSchedule> & { startDate: string }) {
  return matchesRecurrenceDate({
    unit: schedule.unit ?? "week",
    intervalCount: schedule.intervalCount ?? 1,
    weekdays: schedule.weekdays ?? [1],
    startDate: schedule.startDate,
    endDate: schedule.endDate ?? null,
    generateFrom: schedule.startDate,
    occurrenceDate,
  });
}

describe("series reconcile", () => {
  it("keeps a completed occurrence that no longer matches", () => {
    const matches = scheduleMatch("2026-11-02", { unit: "week", weekdays: [3], startDate: "2026-11-04" });
    assert.equal(matches, false);
    assert.equal(keepsSeriesOccurrence("done", false, matches), true);
  });

  it("drops an active occurrence that no longer matches", () => {
    const matches = scheduleMatch("2026-11-02", { unit: "week", weekdays: [3], startDate: "2026-11-04" });
    assert.equal(keepsSeriesOccurrence("todo", false, matches), false);
  });

  it("keeps an active occurrence on a still selected weekday", () => {
    const matches = scheduleMatch("2026-11-04", { unit: "week", weekdays: [3], startDate: "2026-11-04" });
    assert.equal(matches, true);
    assert.equal(keepsSeriesOccurrence("todo", false, matches), true);
  });

  it("drops a skipped date even when it still matches", () => {
    const matches = scheduleMatch("2026-11-04", { unit: "week", weekdays: [3], startDate: "2026-11-04" });
    assert.equal(keepsSeriesOccurrence("todo", true, matches), false);
    assert.equal(keepsSeriesOccurrence("done", true, matches), true);
  });

  it("drops active dates outside a shorter end date and keeps completed ones", () => {
    const matches = scheduleMatch("2026-11-18", {
      unit: "week",
      weekdays: [3],
      startDate: "2026-11-04",
      endDate: "2026-11-11",
    });
    assert.equal(matches, false);
    assert.equal(keepsSeriesOccurrence("todo", false, matches), false);
    assert.equal(keepsSeriesOccurrence("done", false, matches), true);
  });

  it("drops active dates before a later start date", () => {
    const matches = scheduleMatch("2026-11-04", { unit: "week", weekdays: [3], startDate: "2026-11-11" });
    assert.equal(matches, false);
    assert.equal(keepsSeriesOccurrence("todo", false, matches), false);
  });

  it("recalculates an interval without duplicating a date that still matches", () => {
    const everyWeek = scheduleMatch("2026-11-09", { unit: "day", intervalCount: 1, weekdays: [], startDate: "2026-11-02" });
    const everyOther = scheduleMatch("2026-11-09", { unit: "day", intervalCount: 2, weekdays: [], startDate: "2026-11-02" });
    const offInterval = scheduleMatch("2026-11-10", { unit: "day", intervalCount: 2, weekdays: [], startDate: "2026-11-02" });
    assert.equal(everyWeek, true);
    assert.equal(everyOther, false);
    assert.equal(offInterval, true);
    assert.equal(keepsSeriesOccurrence("todo", false, everyOther), false);
    assert.equal(keepsSeriesOccurrence("todo", false, offInterval), true);
  });

  it("resets generate_from when the schedule changes and keeps it otherwise", () => {
    assert.equal(nextSeriesGenerateFrom("2026-11-20", "2026-11-04", true), "2026-11-04");
    assert.equal(nextSeriesGenerateFrom("2026-11-20", "2026-11-04", false), "2026-11-20");
    assert.equal(nextSeriesGenerateFrom("2026-11-01", "2026-11-04", false), "2026-11-04");
  });

  it("does not generate a second row for the same occurrence date", () => {
    const dates = occurrenceDatesInRange(
      {
        unit: "week",
        intervalCount: 1,
        weekdays: [1, 3],
        startDate: "2026-11-02",
        endDate: null,
        generateFrom: "2026-11-02",
      },
      "2026-11-02",
      "2026-11-15",
    );
    assert.deepEqual(dates, ["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);
    assert.equal(new Set(dates).size, dates.length);
  });
});

describe("calendar restore", () => {
  it("keeps the planned date in the calendar and clears it from Today and Completed", () => {
    const planned = "2026-11-12";
    assert.equal(planned, "2026-11-12");
    assert.equal(restoreScheduledDate("calendar", planned), planned);
    assert.equal(restoreScheduledDate("today", planned), null);
    assert.equal(restoreScheduledDate("completed", planned), null);
  });
});
