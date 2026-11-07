import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addIsoDays,
  isoWeekMonday,
  isoWeekday,
  matchesRecurrenceDate,
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
