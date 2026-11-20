import test from "node:test";
import assert from "node:assert/strict";
import {
  getServiceAlert,
  summarizeEquipment,
  filterEquipment,
} from "./equipmentModel.js";

test("getServiceAlert classifies missing, overdue, due soon, and normal dates", () => {
  assert.equal(getServiceAlert(null, "2026-11-20").level, "NONE");
  assert.equal(getServiceAlert("", "2026-11-20").level, "NONE");

  const overdue = getServiceAlert("2026-11-15", "2026-11-20");
  assert.equal(overdue.level, "OVERDUE");
  assert.equal(overdue.daysLeft, -5);

  const dueToday = getServiceAlert("2026-11-20", "2026-11-20");
  assert.equal(dueToday.level, "DUE_SOON");
  assert.equal(dueToday.daysLeft, 0);

  const dueSoon = getServiceAlert("2026-11-27", "2026-11-20");
  assert.equal(dueSoon.level, "DUE_SOON");
  assert.equal(dueSoon.daysLeft, 7);

  const ok = getServiceAlert("2026-12-10", "2026-11-20");
  assert.equal(ok.level, "OK");
  assert.equal(ok.daysLeft, 20);
});

const sampleItems = [
  {
    id: 1,
    code: "GYM-TM-001",
    name: "Máy chạy bộ Technogym",
    category: "Cardio",
    room_id: 1,
    room: "Phòng Gym",
    status: "ACTIVE",
    next_service: "2026-11-10",
    notes: "Băng tải",
  },
  {
    id: 2,
    code: "GYM-LP-002",
    name: "Máy đạp đùi",
    category: "Sức mạnh",
    room_id: 1,
    room: "Phòng Gym",
    status: "MAINTENANCE",
    next_service: "2026-12-30",
    notes: "Thay cáp",
  },
  {
    id: 3,
    code: "BOX-BG-003",
    name: "Bao cát 45kg",
    category: "Boxing",
    room_id: 3,
    room: "Phòng Boxing",
    status: "BROKEN",
    next_service: null,
    notes: "Rách vỏ da",
  },
  {
    id: 4,
    code: "YOG-MAT-004",
    name: "Thảm cũ",
    category: "Yoga",
    room_id: 2,
    room: "Phòng Yoga",
    status: "RETIRED",
    next_service: "2026-10-01",
    notes: "Đã thanh lý",
  },
];

test("summarizeEquipment calculates status and service-due KPI counts", () => {
  const stats = summarizeEquipment(sampleItems, "2026-11-20");
  assert.deepEqual(stats, {
    total: 4,
    active: 1,
    maintenance: 1,
    broken: 1,
    retired: 1,
    brokenOrRetired: 2,
    serviceDue: 3,
  });
});

test("filterEquipment filters by query, roomId, status, and onlyDue", () => {
  assert.equal(
    filterEquipment(sampleItems, { query: "technogym" }, "2026-11-20").length,
    1
  );
  assert.equal(
    filterEquipment(sampleItems, { roomId: "1" }, "2026-11-20").length,
    2
  );
  assert.equal(
    filterEquipment(sampleItems, { status: "BROKEN" }, "2026-11-20").length,
    1
  );
  assert.equal(
    filterEquipment(sampleItems, { onlyDue: true }, "2026-11-20").length,
    3
  );
});
