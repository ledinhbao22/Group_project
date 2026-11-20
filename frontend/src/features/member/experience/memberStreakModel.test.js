import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMonthActivityGrid,
  formatFocusTime,
  isWithinOneHour,
  hasScheduleConflict,
} from "./memberStreakModel.js";

test("buildMonthActivityGrid builds 7-column calendar cells and marks checked-in days", () => {
  const grid = buildMonthActivityGrid("2026-11", ["2026-11-02", "2026-11-02", "2026-11-18"], "2026-11-20");
  assert.equal(grid.monthLabel, "Tháng 11, 2026");
  const day2 = grid.cells.find((c) => c.date === "2026-11-02");
  const day18 = grid.cells.find((c) => c.date === "2026-11-18");
  const day20 = grid.cells.find((c) => c.date === "2026-11-20");
  const day5 = grid.cells.find((c) => c.date === "2026-11-05");
  assert.equal(day2.active, true);
  assert.equal(day18.active, true);
  assert.equal(day20.isToday, true);
  assert.equal(day5.active, false);
});

test("formatFocusTime formats minutes into Xh Ym like reference design", () => {
  assert.equal(formatFocusTime(0), "0h 0m");
  assert.equal(formatFocusTime(1505), "25h 5m");
  assert.equal(formatFocusTime(45), "0h 45m");
});

test("isWithinOneHour flags cancellations less than 60 minutes away", () => {
  const nowMs = Date.parse("2026-11-20T10:00:00Z");
  assert.equal(isWithinOneHour("2026-11-20T10:45:00Z", nowMs), true);
  assert.equal(isWithinOneHour("2026-11-20T11:00:00Z", nowMs), false);
});

test("hasScheduleConflict detects overlap across classes and PT sessions", () => {
  const existing = [
    { starts_at: "2026-11-20T11:00:00Z", duration_minutes: 60, status: "BOOKED" },
  ];
  assert.equal(
    hasScheduleConflict(existing, "2026-11-20T11:30:00Z", 60),
    true
  );
  assert.equal(
    hasScheduleConflict(existing, "2026-11-20T12:00:00Z", 60),
    false
  );
});
