export const EQUIPMENT_STATUS_META = {
  ACTIVE: { label: "Hoạt động", bg: "#dcfce7", color: "#15803d" },
  MAINTENANCE: { label: "Đang bảo trì", bg: "#fef3c7", color: "#b45309" },
  BROKEN: { label: "Đang hỏng", bg: "#fee2e2", color: "#dc2626" },
  RETIRED: { label: "Ngừng sử dụng", bg: "#f1f5f9", color: "#64748b" },
};

function todayIso(todayStr) {
  return (todayStr || new Date().toISOString()).slice(0, 10);
}

/**
 * Đánh giá trạng thái hạn bảo trì kế tiếp so với ngày hiện tại.
 */
export function getServiceAlert(nextService, todayStr) {
  const raw = nextService ? String(nextService).slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { level: "NONE", label: "Chưa đặt lịch", daysLeft: null };
  }
  const base = todayIso(todayStr);
  const diff = Math.round(
    (Date.parse(`${raw}T00:00:00Z`) - Date.parse(`${base}T00:00:00Z`)) / 86400000
  );
  if (diff < 0) {
    return { level: "OVERDUE", label: `Quá hạn ${Math.abs(diff)} ngày`, daysLeft: diff };
  }
  if (diff <= 7) {
    return {
      level: "DUE_SOON",
      label: diff === 0 ? "Đến hạn hôm nay" : `Còn ${diff} ngày`,
      daysLeft: diff,
    };
  }
  return { level: "OK", label: `Còn ${diff} ngày`, daysLeft: diff };
}

export function isServiceDueItem(item, todayStr) {
  if (!item || item.status === "RETIRED") return false;
  if (item.status === "MAINTENANCE" || item.status === "BROKEN") return true;
  const alert = getServiceAlert(item.next_service, todayStr);
  return alert.level === "OVERDUE" || alert.level === "DUE_SOON";
}

/**
 * Thống kê KPI thiết bị cho màn hình quản trị vận hành.
 */
export function summarizeEquipment(items = [], todayStr) {
  let active = 0;
  let maintenance = 0;
  let broken = 0;
  let retired = 0;
  let serviceDue = 0;

  for (const item of items) {
    if (item.status === "ACTIVE") active += 1;
    else if (item.status === "MAINTENANCE") maintenance += 1;
    else if (item.status === "BROKEN") broken += 1;
    else if (item.status === "RETIRED") retired += 1;
    if (isServiceDueItem(item, todayStr)) serviceDue += 1;
  }

  return {
    total: items.length,
    active,
    maintenance,
    broken,
    retired,
    brokenOrRetired: broken + retired,
    serviceDue,
  };
}

/**
 * Lọc danh sách thiết bị theo từ khóa, phòng, trạng thái và cờ đến hạn bảo trì.
 */
export function filterEquipment(
  items = [],
  { query = "", roomId = "ALL", status = "ALL", onlyDue = false } = {},
  todayStr
) {
  const q = String(query || "").trim().toLowerCase();
  return items.filter((item) => {
    if (roomId && roomId !== "ALL" && String(item.room_id) !== String(roomId)) {
      return false;
    }
    if (status && status !== "ALL" && item.status !== status) {
      return false;
    }
    if (onlyDue && !isServiceDueItem(item, todayStr)) {
      return false;
    }
    if (q) {
      const hay = [item.code, item.name, item.category, item.room, item.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
