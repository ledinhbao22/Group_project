const VI_MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

/**
 * Xây dựng lưới lịch Activity theo tháng (7 cột CN -> T7 giống ảnh mẫu Streak/Activity).
 */
export function buildMonthActivityGrid(yearMonth, checkedInDates = [], todayIso) {
  const safeToday = (todayIso || new Date().toISOString()).slice(0, 10);
  const ym = /^\d{4}-\d{2}$/.test(String(yearMonth || ""))
    ? String(yearMonth)
    : safeToday.slice(0, 7);
  const [yearStr, monthStr] = ym.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1; // 0..11

  const countByDate = new Map();
  for (const raw of checkedInDates || []) {
    const d = String(raw || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      countByDate.set(d, (countByDate.get(d) || 0) + 1);
    }
  }

  const firstDay = new Date(Date.UTC(year, monthIdx, 1));
  const startDow = firstDay.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < startDow; i += 1) {
    cells.push({ key: `pad-start-${i}`, empty: true });
  }

  let activeDaysInMonth = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
    const count = countByDate.get(dateStr) || 0;
    const active = count > 0;
    if (active) activeDaysInMonth += 1;
    cells.push({
      key: dateStr,
      empty: false,
      day,
      date: dateStr,
      active,
      count,
      isToday: dateStr === safeToday,
      intensity: !active ? 0 : count >= 2 ? 4 : 3,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `pad-end-${cells.length}`, empty: true });
  }

  return {
    yearMonth: ym,
    year,
    month: monthIdx + 1,
    monthLabel: `${VI_MONTHS[monthIdx] || "Tháng"}, ${year}`,
    activeDaysInMonth,
    cells,
  };
}

export function shiftYearMonth(yearMonth, deltaMonths) {
  const [y, m] = String(yearMonth || "2026-11").split("-").map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 11) - 1 + deltaMonths, 1));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

export function formatFocusTime(totalMinutes) {
  const mins = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function isWithinOneHour(startsAtIso, nowMs = Date.now()) {
  const targetMs = Date.parse(startsAtIso);
  if (Number.isNaN(targetMs)) return false;
  const diffMinutes = (targetMs - nowMs) / 60000;
  return diffMinutes > 0 && diffMinutes < 60;
}

export function hasScheduleConflict(existingItems = [], candidateStartsAt, candidateDuration = 60) {
  const startA = Date.parse(candidateStartsAt);
  if (Number.isNaN(startA)) return false;
  const endA = startA + Math.max(1, Number(candidateDuration) || 60) * 60000;
  const activeStatuses = new Set(["BOOKED", "REQUESTED", "CONFIRMED", "OPEN"]);

  return (existingItems || []).some((item) => {
    if (item.status && !activeStatuses.has(item.status)) return false;
    const startB = Date.parse(item.starts_at);
    if (Number.isNaN(startB)) return false;
    const endB = startB + Math.max(1, Number(item.duration_minutes) || 60) * 60000;
    return startA < endB && startB < endA;
  });
}
