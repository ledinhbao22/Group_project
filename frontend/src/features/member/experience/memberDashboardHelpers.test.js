import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeklyConsistencySeries,
  formatHeroDateVi,
  getGreetingVi,
  shortMemberName,
  synthesizeMemberNotifications,
} from "./memberDashboardHelpers.js";

test("shortMemberName extracts given name cleanly in Vietnamese", () => {
  assert.equal(shortMemberName("Lê Đình Bảo"), "Bảo");
  assert.equal(shortMemberName("Nguyễn Khánh Linh"), "Linh");
  assert.equal(shortMemberName(""), "Bạn");
});

test("formatHeroDateVi and getGreetingVi produce Vietnamese text", () => {
  const morning = new Date("2026-11-20T02:00:00Z"); // 09:00 Asia/Ho_Chi_Minh (Friday)
  assert.equal(getGreetingVi(morning), "Chào buổi sáng");
  assert.equal(formatHeroDateVi(morning), "THỨ SÁU, 20 THÁNG 11");
});

test("buildWeeklyConsistencySeries maps T2..CN active check-ins and logs", () => {
  const series = buildWeeklyConsistencySeries(
    ["2026-11-16", "2026-11-18"],
    [{ completed_at: "2026-11-18T10:00:00Z" }],
    "2026-11-20"
  );
  assert.equal(series.length, 7);
  assert.equal(series[0].label, "T2");
  assert.equal(series[0].active, true); // 2026-11-16 Monday
  assert.equal(series[2].pct, 92); // Wednesday checkin + log
  assert.equal(series[6].label, "CN");
});

test("synthesizeMemberNotifications creates Vietnamese alerts from backend overview and schedule", () => {
  const notifs = synthesizeMemberNotifications({
    streak: { currentWeekDone: 4, weeklyTarget: 4 },
    scheduleData: {
      ptSessions: [{ id: 1, pt_name: "Minh Nguyễn", room: "Gym", status: "CONFIRMED" }],
    },
    overview: { hasActiveSubscription: true, daysRemaining: 5, activeSubscription: { name: "Gói 3 tháng" } },
    completedLogs: [],
  });
  assert.equal(notifs.length, 3);
  assert.equal(notifs[0].title, "Đạt mục tiêu tuần!");
  assert.equal(notifs[1].title, "Lịch tập PT đã xác nhận");
  assert.equal(notifs[2].title, "Gói tập sắp hết hạn");
});
