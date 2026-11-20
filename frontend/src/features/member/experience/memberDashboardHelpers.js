const VI_WEEKDAYS = [
  "CHỦ NHẬT",
  "THỨ HAI",
  "THỨ BA",
  "THỨ TƯ",
  "THỨ NĂM",
  "THỨ SÁU",
  "THỨ BẢY",
];

export function formatHeroDateVi(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const wdIdx = wdMap[get("weekday")] ?? d.getDay();
  const day = Number(get("day")) || d.getDate();
  const month = Number(get("month")) || d.getMonth() + 1;
  return `${VI_WEEKDAYS[wdIdx]}, ${day} THÁNG ${month}`;
}

export function getGreetingVi(now = new Date()) {
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    hour12: false,
  }).format(now instanceof Date ? now : new Date(now));
  const h = Number(hourStr) || 9;
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function shortMemberName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "Bạn";
}

/**
 * Tính dữ liệu biểu đồ tuần (T2 -> CN) từ ngày check-in thực tế & log buổi tập.
 */
export function buildWeeklyConsistencySeries(checkedInDates = [], logs = [], todayIso) {
  const safeToday = (todayIso || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })).slice(0, 10);
  const anchor = new Date(`${safeToday}T12:00:00Z`);
  const dow = anchor.getUTCDay(); // 0=Sun..6=Sat
  const offsetToMon = (dow + 6) % 7;
  const monday = new Date(anchor.getTime() - offsetToMon * 86400000);

  const checkinSet = new Set((checkedInDates || []).map((d) => String(d).slice(0, 10)));
  const logCountByDay = new Map();
  for (const l of logs || []) {
    const day = String(l.completed_at || "").slice(0, 10);
    if (day) logCountByDay.set(day, (logCountByDay.get(day) || 0) + 1);
  }

  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return labels.map((label, idx) => {
    const cur = new Date(monday.getTime() + idx * 86400000);
    const iso = cur.toISOString().slice(0, 10);
    const hasCheckin = checkinSet.has(iso);
    const logCount = logCountByDay.get(iso) || 0;
    let pct = 20;
    if (hasCheckin && logCount > 0) pct = 92;
    else if (hasCheckin) pct = 78;
    else if (logCount > 0) pct = 72;
    else if (iso <= safeToday) pct = 32;
    else pct = 25;
    return { label, date: iso, pct, active: hasCheckin || logCount > 0 };
  });
}

export function synthesizeMemberNotifications({ streak, scheduleData, overview, completedLogs }) {
  const items = [];
  const done = streak?.currentWeekDone || 0;
  const target = streak?.weeklyTarget || 3;

  if (done > 0) {
    items.push({
      id: "streak-progress",
      kind: "trophy",
      title: done >= target ? "Đạt mục tiêu tuần!" : "Làm tốt lắm!",
      body: `Bạn đã hoàn thành ${done}/${target} buổi trong tuần này.`,
      time: "Hôm nay",
      unread: true,
    });
  }

  const upcomingPt = (scheduleData?.ptSessions || []).find((s) =>
    ["CONFIRMED", "REQUESTED"].includes(s.status)
  );
  if (upcomingPt) {
    items.push({
      id: `pt-${upcomingPt.id}`,
      kind: "calendar",
      title: upcomingPt.status === "CONFIRMED" ? "Lịch tập PT đã xác nhận" : "Yêu cầu PT đang chờ duyệt",
      body: `PT ${upcomingPt.pt_name} · ${upcomingPt.room || "Phòng Gym"}`,
      time: "Sắp tới",
      unread: upcomingPt.status === "CONFIRMED",
    });
  }

  if (overview && !overview.hasActiveSubscription) {
    items.push({
      id: "sub-expired",
      kind: "alert",
      title: "Gói tập chưa kích hoạt",
      body: "Liên hệ quầy lễ tân để đăng ký hoặc gia hạn gói tập.",
      time: "Nhắc nhở",
      unread: true,
    });
  } else if (overview?.daysRemaining > 0 && overview.daysRemaining <= 7) {
    items.push({
      id: "sub-expiring",
      kind: "alert",
      title: "Gói tập sắp hết hạn",
      body: `Còn ${overview.daysRemaining} ngày hiệu lực (${overview.activeSubscription?.name || ""}).`,
      time: "Gói tập",
      unread: true,
    });
  }

  if ((completedLogs || []).length > 0 && items.length < 3) {
    const latest = completedLogs[0];
    items.push({
      id: `log-${latest.id}`,
      kind: "check",
      title: `Đã ghi nhận: ${latest.program_name}`,
      body: `${latest.duration_minutes} phút · ${latest.logged_by_name || "Tự tập"}`,
      time: "Gần đây",
      unread: false,
    });
  }

  if (!items.length) {
    items.push({
      id: "welcome-optigym",
      kind: "trophy",
      title: "Chào mừng đến OptiGym!",
      body: "Đặt lớp học nhóm hoặc check-in tại quầy để bắt đầu chuỗi tuần.",
      time: "Mới",
      unread: false,
    });
  }

  return items;
}
