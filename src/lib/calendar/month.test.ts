import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { localDateInTimeZone } from "../profile/timezone.ts";
import { isoWeekday } from "../recurrence/schedule.ts";
import {
  buildMonthGrid,
  neighborHref,
  parseMonth,
  resolveSelectedDate,
  shiftMonth,
} from "./month.ts";

describe("month grid", () => {
  it("starts each week on Monday and keeps full weeks", () => {
    const grid = buildMonthGrid(2026, 11);

    assert.ok(grid);
    assert.equal(grid.start, "2026-10-26");
    assert.equal(grid.end, "2026-12-06");
    assert.equal(grid.days.length % 7, 0);
    assert.equal(isoWeekday(grid.start), 1);
    assert.equal(isoWeekday(grid.end), 7);
    assert.equal(grid.days[0]?.inMonth, false);
    assert.equal(grid.days.find((day) => day.date === "2026-11-01")?.inMonth, true);
    assert.equal(grid.days.at(-1)?.inMonth, false);
  });

  it("crosses the year in January and December", () => {
    const january = buildMonthGrid(2026, 1);
    const december = buildMonthGrid(2026, 12);

    assert.equal(january?.start, "2025-12-29");
    assert.equal(january?.end, "2026-02-01");
    assert.equal(december?.start, "2026-11-30");
    assert.equal(december?.end, "2027-01-03");
    assert.equal(december?.days.find((day) => day.date === "2027-01-01")?.inMonth, false);
  });

  it("keeps February 29 only in a leap year", () => {
    const leap = buildMonthGrid(2024, 2);
    const common = buildMonthGrid(2026, 2);

    assert.equal(leap?.days.some((day) => day.date === "2024-02-29" && day.inMonth), true);
    assert.equal(common?.days.some((day) => day.date === "2026-02-29"), false);
    assert.equal(common?.days.some((day) => day.date === "2026-02-28" && day.inMonth), true);
  });

  it("shifts January and December into the next year", () => {
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
    assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
    assert.equal(neighborHref(2026, 12, 1), "/calendar?month=2027-01&date=2027-01-01");
    assert.equal(neighborHref(2026, 1, -1), "/calendar?month=2025-12&date=2025-12-01");
  });

  it("rejects a month whose dates are not four-digit ISO dates", () => {
    assert.equal(buildMonthGrid(99, 1), null);
    assert.deepEqual(parseMonth("0099-01", "2026-11-07"), { year: 2026, month: 11 });
    assert.deepEqual(parseMonth("2026-13", "2026-11-07"), { year: 2026, month: 11 });
    assert.deepEqual(parseMonth(undefined, "2026-01-15"), { year: 2026, month: 1 });
  });

  it("keeps a visible date and otherwise uses today or the first of the month", () => {
    const november = buildMonthGrid(2026, 11);
    const december = buildMonthGrid(2026, 12);

    assert.ok(november);
    assert.ok(december);
    assert.equal(resolveSelectedDate("2026-11-15", november, "2026-11-07"), "2026-11-15");
    assert.equal(resolveSelectedDate("2026-10-01", november, "2026-11-07"), "2026-11-07");
    assert.equal(resolveSelectedDate(undefined, december, "2026-11-07"), "2026-12-01");
  });
});

describe("profile date", () => {
  it("uses the IANA zone instead of the machine clock", () => {
    const instant = new Date("2026-11-07T10:00:00.000Z");

    assert.equal(localDateInTimeZone("Etc/GMT+12", instant), "2026-11-06");
    assert.equal(localDateInTimeZone("Europe/Moscow", instant), "2026-11-07");
    assert.equal(localDateInTimeZone("Pacific/Kiritimati", instant), "2026-11-08");
  });
});
