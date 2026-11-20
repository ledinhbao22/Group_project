import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Calendar,
  Clock,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Check,
  Flame,
  Dumbbell,
  Sparkles,
  Zap,
} from "lucide-react";

/**
 * Dropdown chọn kỳ thời gian độc lập cho từng biểu đồ
 * Trải xuống 3 tùy chọn: Theo tuần, Theo tháng, Theo năm
 */
function ChartPeriodDropdown({ value = "week", onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const options = [
    { key: "week", label: "Theo tuần" },
    { key: "month", label: "Theo tháng" },
    { key: "year", label: "Theo năm" },
  ];

  const currentLabel = options.find((o) => o.key === value)?.label || "Theo tuần";

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="og-admin-filter-pill"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          cursor: "pointer",
          background: open ? "#f8fafc" : "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          padding: "5px 10px",
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "#0f172a",
          outline: "none",
          boxShadow: open ? "0 0 0 2px rgba(220, 38, 38, 0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
          transition: "all 0.15s ease",
        }}
        title="Chọn chế độ xem thời gian"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          size={13}
          color="#64748b"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {open && (
        <div
          className="og-admin-dropdown-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            zIndex: 999,
            minWidth: 125,
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.key === value;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  fontSize: "0.82rem",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#dc2626" : "#334155",
                  background: isSelected ? "#fef2f2" : "transparent",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={13} color="#dc2626" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminDashboardView({ ctx, onNavigate }) {
  const isDemo = Boolean(ctx?.user?.demo);
  // Chế độ xem thời gian độc lập cho từng biểu đồ
  const [statusPeriod, setStatusPeriod] = useState("week");
  const [packagePeriod, setPackagePeriod] = useState("week");
  const [growthPeriod, setGrowthPeriod] = useState("week");
  const [attendanceRatePeriod, setAttendanceRatePeriod] = useState("week");
  const [coachPeriod, setCoachPeriod] = useState("week");
  const [checkinPeriod, setCheckinPeriod] = useState("week");
  const [frequencyPeriod, setFrequencyPeriod] = useState("week");

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  const [hoveredWeek, setHoveredWeek] = useState(null);
  const [hoveredCoach, setHoveredCoach] = useState(null);
  const [hoveredGrowth, setHoveredGrowth] = useState(null);

  // Fetch metrics từ Backend theo từng tham số độc lập
  const fetchMetrics = async () => {
    if (isDemo) {
      const membersList = Array.isArray(ctx?.data?.members) ? ctx.data.members : [];
      const trainersList = Array.isArray(ctx?.data?.trainers) ? ctx.data.trainers : [];
      const sessionsList = Array.isArray(ctx?.data?.coachSessions) ? ctx.data.coachSessions : [];
      const checkinsList = Array.isArray(ctx?.data?.checkins) ? ctx.data.checkins : [];
      const completed = sessionsList.filter((s) => s.status === "COMPLETED").length;
      const rate = sessionsList.length ? Math.round((completed * 1000) / sessionsList.length) / 10 : 85.0;
      setMetrics({
        period: "week",
        members: {
          summary: {
            total: membersList.length,
            active: membersList.filter((m) => m.status === "ACTIVE").length,
            suspended: 0,
            expired: membersList.filter((m) => Number(m.days_left) < 0).length,
            newMembers: Math.min(membersList.length, 3),
            cancelled: 0,
          },
          statusChart: [
            { label: "Tuần 1", total: Math.max(1, membersList.length - 3), active: Math.max(1, membersList.length - 4), expired: 0 },
            { label: "Tuần 2", total: Math.max(1, membersList.length - 2), active: Math.max(1, membersList.length - 3), expired: 0 },
            { label: "Tuần 3", total: Math.max(1, membersList.length - 1), active: Math.max(1, membersList.length - 2), expired: 0 },
            { label: "Tuần 4", total: membersList.length, active: membersList.filter((m) => m.status === "ACTIVE").length, expired: 1 },
          ],
          packageStructure: [
            { specialty: "GYM", label: "Gym", count: 4, percentage: 57.1, color: "#0f172a" },
            { specialty: "YOGA", label: "Yoga", count: 2, percentage: 28.6, color: "#dc2626" },
            { specialty: "BOXING", label: "Boxing", count: 1, percentage: 14.3, color: "#cbd5e1" },
          ],
          growthChart: [
            { label: "Tuần 1", count: Math.max(1, membersList.length - 3), newCount: 1 },
            { label: "Tuần 2", count: Math.max(1, membersList.length - 2), newCount: 1 },
            { label: "Tuần 3", count: Math.max(1, membersList.length - 1), newCount: 1 },
            { label: "Tuần 4", count: membersList.length, newCount: 1 },
          ],
        },
        sessions: {
          summary: {
            total: sessionsList.length,
            upcoming: sessionsList.filter((s) => s.status === "CONFIRMED").length,
            completed,
            ongoing: 1,
            cancelled: 0,
          },
          attendanceRate: { percentage: rate, total: sessionsList.length, attended: completed, period: attendanceRatePeriod },
          coaches: trainersList.map((t, idx) => ({
            name: t.name,
            specialty: t.specialty || "GYM",
            total: 10 - idx * 2,
            attended: 9 - idx * 2,
          })),
        },
        attendance: {
          summary: { today: checkinsList.length, thisWeek: checkinsList.length * 3, thisMonth: checkinsList.length * 9 },
          recentCheckins: checkinsList.slice(0, 6).map((c, idx) => ({
            id: c.id || idx + 1,
            date: new Date().toLocaleDateString("vi-VN"),
            name: c.member_name || "Hội viên",
            email: c.member_code || "OG-DEMO",
            role: "Hội viên",
            inTime: "08:30 AM",
            outTime: c.checked_out_at ? "09:45 AM" : "Đang tập",
            roomName: c.room || "Phòng Gym",
          })),
          frequencyChart: [
            { label: "Tuần 1", count: 18 },
            { label: "Tuần 2", count: 24 },
            { label: "Tuần 3", count: 29 },
            { label: "Tuần 4", count: 34 },
          ],
        },
      });
      setLoading(false);
      return;
    }
    try {
      const q = new URLSearchParams({
        statusPeriod,
        packagePeriod,
        growthPeriod,
        attendancePeriod: attendanceRatePeriod,
        coachPeriod,
        checkinPeriod,
        frequencyPeriod,
      });
      const res = await fetch(`/api/admin/dashboard/metrics?${q.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (res.ok) {
        const json = await res.json();
        setMetrics(json);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [
    isDemo,
    statusPeriod,
    packagePeriod,
    growthPeriod,
    attendanceRatePeriod,
    coachPeriod,
    checkinPeriod,
    frequencyPeriod,
  ]);

  // State Bản đồ nhiệt phòng tập (Dashboard Room Heatmap)
  const [heatmapData, setHeatmapData] = useState({ rooms: [], cells: [], totals: [] });
  const [heatmapRoomType, setHeatmapRoomType] = useState("gym"); // 'gym' | 'yoga' | 'boxing'
  const [heatmapHoveredCell, setHeatmapHoveredCell] = useState(null);
  const [heatmapPeriod, setHeatmapPeriod] = useState(30); // 7, 14, 30 days

  useEffect(() => {
    let isMounted = true;
    if (isDemo) {
      const demoRooms = Array.isArray(ctx?.data?.rooms) && ctx.data.rooms.length
        ? ctx.data.rooms
        : [
            { id: 1, code: "GYM", name: "Phòng Gym", capacity: 40, occupancy: 14, active: true },
            { id: 2, code: "YOGA", name: "Phòng Yoga", capacity: 20, occupancy: 8, active: true },
            { id: 3, code: "BOXING", name: "Phòng Boxing", capacity: 16, occupancy: 5, active: true },
          ];
      const cells = [];
      for (let d = 1; d <= 7; d++) {
        for (const h of [7, 8, 9, 17, 18, 19, 20]) {
          cells.push({ room_id: 1, weekday: d, hour: h, visits: h >= 17 ? 10 + d : 5 + d });
          cells.push({ room_id: 2, weekday: d, hour: h, visits: h >= 17 ? 6 : 4 });
        }
      }
      setHeatmapData({ rooms: demoRooms, cells, totals: [] });
      return;
    }
    const fetchHeatmap = async () => {
      try {
        const to = new Date().toISOString().slice(0, 10);
        const from = new Date(Date.now() - heatmapPeriod * 86400000).toISOString().slice(0, 10);
        const q = new URLSearchParams({ from, to });
        const res = await fetch(`/api/admin/heatmap?${q.toString()}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setHeatmapData(json);
        }
      } catch (err) {
        console.error("Failed to load dashboard heatmap:", err);
      }
    };
    fetchHeatmap();
    return () => {
      isMounted = false;
    };
  }, [isDemo, heatmapPeriod]);

  // Đồng bộ nhanh tất cả biểu đồ (tùy chọn)
  const syncAllPeriods = (p) => {
    setStatusPeriod(p);
    setPackagePeriod(p);
    setGrowthPeriod(p);
    setAttendanceRatePeriod(p);
    setCoachPeriod(p);
    setCheckinPeriod(p);
    setFrequencyPeriod(p);
  };

  // Real DB Data (zero / empty defaults while loading or when DB is empty)
  const members = metrics?.members || {};
  const mSummary = members.summary || {
    total: 0,
    active: 0,
    suspended: 0,
    expired: 0,
    newMembers: 0,
    cancelled: 0,
  };
  const statusChartData = members.statusChart || [
    { label: "Tuần 1", total: 0, active: 0, expired: 0 },
    { label: "Tuần 2", total: 0, active: 0, expired: 0 },
    { label: "Tuần 3", total: 0, active: 0, expired: 0 },
    { label: "Tuần 4", total: 0, active: 0, expired: 0 },
  ];
  const packageStructure = members.packageStructure || [
    { specialty: "GYM", label: "Gym", count: 0, percentage: 0, color: "#0f172a" },
    { specialty: "YOGA", label: "Yoga", count: 0, percentage: 0, color: "#dc2626" },
    { specialty: "BOXING", label: "Boxing", count: 0, percentage: 0, color: "#cbd5e1" },
  ];
  const growthChartData = members.growthChart || [
    { label: "Tuần 1", count: 0, newCount: 0 },
    { label: "Tuần 2", count: 0, newCount: 0 },
    { label: "Tuần 3", count: 0, newCount: 0 },
    { label: "Tuần 4", count: 0, newCount: 0 },
  ];

  const sessions = metrics?.sessions || {};
  const sSummary = sessions.summary || {
    total: 0,
    upcoming: 0,
    completed: 0,
    ongoing: 0,
    cancelled: 0,
  };
  const attendanceRate = sessions.attendanceRate || {
    percentage: 0,
    total: 0,
    attended: 0,
  };
  const coachesData = sessions.coaches || [];

  const attendance = metrics?.attendance || {};
  const aSummary = attendance.summary || {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  };
  const recentCheckins = attendance.recentCheckins || [];
  const attendanceFreqData = attendance.frequencyChart || [
    { label: "Tuần 1", count: 0 },
    { label: "Tuần 2", count: 0 },
    { label: "Tuần 3", count: 0 },
    { label: "Tuần 4", count: 0 },
  ];

  // Helper for Donut Stroke Calculation
  const gymItem = packageStructure.find((p) => p.specialty === "GYM") || packageStructure[0] || { percentage: 0, count: 0 };
  const yogaItem = packageStructure.find((p) => p.specialty === "YOGA") || packageStructure[1] || { percentage: 0, count: 0 };
  const boxingItem = packageStructure.find((p) => p.specialty === "BOXING") || packageStructure[2] || { percentage: 0, count: 0 };

  const totalPackageCount = (gymItem.count || 0) + (yogaItem.count || 0) + (boxingItem.count || 0);

  const circumference = 2 * Math.PI * 54; // ~339.29
  const gymLen = ((gymItem.percentage || 0) / 100) * circumference;
  const yogaLen = ((yogaItem.percentage || 0) / 100) * circumference;
  const boxingLen = ((boxingItem.percentage || 0) / 100) * circumference;

  // Helper for Rate Speedometer Gauge Arc (radius 75, angle 180deg)
  const gaugeCircumference = Math.PI * 75; // ~235.62
  const gaugeFillLen = (Math.min(100, Math.max(0, attendanceRate.percentage)) / 100) * gaugeCircumference;

  // Cấu hình 3 loại phòng tập: Gym, Yoga, Boxing
  const roomTypeConfigs = [
    {
      id: "gym",
      label: "Phòng Gym",
      namePattern: ["gym", "sample-1", "thể hình"],
      color: "#dc2626",
      bgBadge: "#fee2e2",
      description: "Máy tập thể lực, tạ đơn, cardio & kháng lực",
    },
    {
      id: "yoga",
      label: "Phòng Yoga",
      namePattern: ["yoga", "pilates", "sample-2", "flow"],
      color: "#2563eb",
      bgBadge: "#dbeafe",
      description: "Thảm nóng, yoga bay, dẻo dai & thư giãn",
    },
    {
      id: "boxing",
      label: "Phòng Boxing",
      namePattern: ["boxing", "combat", "sample-3", "võ thuật"],
      color: "#d97706",
      bgBadge: "#fef3c7",
      description: "Bao cát, võ đài đối kháng & phản xạ",
    },
  ];

  const activeHeatmapCfg =
    roomTypeConfigs.find((c) => c.id === heatmapRoomType) || roomTypeConfigs[0];

  const allHeatmapRooms = heatmapData.rooms || [];

  const targetRoomIds = allHeatmapRooms
    .filter((r) => {
      const code = (r.code || "").toLowerCase();
      const name = (r.name || "").toLowerCase();
      return activeHeatmapCfg.namePattern.some((p) => code.includes(p) || name.includes(p));
    })
    .map((r) => r.id);

  const resolvedRoomIds = targetRoomIds;

  const matchingHeatmapCells = (heatmapData.cells || []).filter((c) =>
    resolvedRoomIds.includes(Number(c.room_id))
  );

  const getHeatmapVisits = (weekday, hour) => {
    return matchingHeatmapCells
      .filter((c) => c.weekday === weekday && c.hour === hour)
      .reduce((sum, c) => sum + (Number(c.visits) || 0), 0);
  };

  const dayLabels = [
    { id: 1, label: "Thứ 2" },
    { id: 2, label: "Thứ 3" },
    { id: 3, label: "Thứ 4" },
    { id: 4, label: "Thứ 5" },
    { id: 5, label: "Thứ 6" },
    { id: 6, label: "Thứ 7" },
    { id: 7, label: "Chủ nhật" },
  ];

  // Tính max visits cho loại phòng hiện tại
  let heatmapMaxVisits = 1;
  for (let d = 1; d <= 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = getHeatmapVisits(d, h);
      if (v > heatmapMaxVisits) heatmapMaxVisits = v;
    }
  }

  const getHeatmapCellBg = (visits) => {
    if (!visits || visits <= 0) return "#f1f5f9";
    const ratio = Math.min(1, visits / Math.max(1, heatmapMaxVisits));
    if (ratio < 0.25) return "#fee2e2";
    if (ratio < 0.5) return "#fca5a5";
    if (ratio < 0.75) return "#f87171";
    if (ratio < 0.95) return "#dc2626";
    return "#991b1b";
  };

  // Thống kê nhanh theo loại phòng được chọn
  const activeRoomsList = allHeatmapRooms.filter((r) => resolvedRoomIds.includes(r.id));
  const activeOcc = activeRoomsList.reduce((s, r) => s + (Number(r.occupancy) || 0), 0);
  const activeCap = activeRoomsList.reduce((s, r) => s + (Number(r.capacity) || 0), 0);
  const activeOccPct = activeCap > 0 ? Math.round((activeOcc / activeCap) * 100) : 0;

  const activeTotalsList = (heatmapData.totals || []).filter((t) => resolvedRoomIds.includes(t.room_id));
  const activeTotalVisits =
    activeTotalsList.length > 0
      ? activeTotalsList.reduce((s, t) => s + (Number(t.visits) || 0), 0)
      : matchingHeatmapCells.reduce((s, c) => s + (Number(c.visits) || 0), 0);

  const activeAvgMinutes =
    activeTotalsList.length > 0 && activeTotalVisits > 0
      ? Math.round(activeTotalsList.reduce((s, t) => s + (Number(t.average_minutes) || 0), 0) / activeTotalsList.length)
      : 0;

  const activePeakHourStr = activeTotalVisits > 0
    ? (() => {
        let bestH = null, bestV = 0;
        for (let h = 0; h < 24; h++) {
          const sumH = matchingHeatmapCells.filter((c) => c.hour === h).reduce((s, c) => s + (Number(c.visits) || 0), 0);
          if (sumH > bestV) { bestV = sumH; bestH = h; }
        }
        return bestH !== null ? `${String(bestH).padStart(2, "0")}:00 – ${String((bestH + 1) % 24).padStart(2, "0")}:00` : "—";
      })()
    : "—";

  const roomTypeStatusColor =
    activeOccPct >= 85 ? "#dc2626" : activeOccPct >= 50 ? "#d97706" : "#16a34a";

  return (
    <div className="og-admin-view-scroll">
      {/* Mobile KPI Cards */}
      <div className="og-admin-mobile-kpis">
        <div className="og-admin-mobile-kpi-card">
          <div className="og-admin-mobile-kpi-title">TỔNG HỘI VIÊN</div>
          <div className="og-admin-mobile-kpi-value">{mSummary.total}</div>
          <div className="og-admin-mobile-kpi-sub" style={{ color: "#16a34a" }}>
            +{mSummary.active} đang hoạt động
          </div>
        </div>
        <div className="og-admin-mobile-kpi-card">
          <div className="og-admin-mobile-kpi-title">BUỔI TẬP ĐÃ HOÀN THÀNH</div>
          <div className="og-admin-mobile-kpi-value">{sSummary.completed}</div>
          <div className="og-admin-mobile-kpi-sub" style={{ color: "#2563eb" }}>
            {sSummary.upcoming} sắp diễn ra
          </div>
        </div>
        <div className="og-admin-mobile-kpi-card">
          <div className="og-admin-mobile-kpi-title">LƯỢT CHECK-IN HÔM NAY</div>
          <div className="og-admin-mobile-kpi-value">{aSummary.today}</div>
          <div className="og-admin-mobile-kpi-sub" style={{ color: "#dc2626" }}>
            {aSummary.thisWeek} trong tuần
          </div>
        </div>
        <div className="og-admin-mobile-kpi-card">
          <div className="og-admin-mobile-kpi-title">CƠ CẤU GÓI TẬP</div>
          <div className="og-admin-mobile-kpi-value">
            {gymItem.percentage}% Gym
          </div>
          <div className="og-admin-mobile-kpi-sub" style={{ color: "#16a34a" }}>
            {yogaItem.percentage}% Yoga • {boxingItem.percentage}% Boxing
          </div>
        </div>
      </div>

      {/* Top Controls Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "0 0 16px",
          padding: "10px 18px",
          background: "#ffffff",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#0f172a",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
            Chế độ xem độc lập theo từng biểu đồ
          </span>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Đồng bộ nhanh tất cả:</span>
            {[
              { id: "week", label: "Tuần" },
              { id: "month", label: "Tháng" },
              { id: "year", label: "Năm" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => syncAllPeriods(p.id)}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#334155",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 5,
                  fontSize: "0.74rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate("heatmap", { tab: "members", period: statusPeriod })}
          style={{
            background: "transparent",
            border: "none",
            color: "#2563eb",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>Xem tất cả Báo cáo & Phân tích</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* ========================================================
          SECTION 1: HỘI VIÊN
         ======================================================== */}
      <section className="og-admin-section">
        <div className="og-admin-section-header">
          <div className="og-admin-section-title-wrap">
            <span className="og-admin-section-icon-badge">
              <Users size={15} />
            </span>
            <h2 className="og-admin-section-title">Hội viên</h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="og-admin-section-stats-bar">
              <span className="og-admin-stat-item">
                Tổng hội viên: <strong>{mSummary.total}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Đang hoạt động: <strong>{mSummary.active}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Tạm ngưng: <strong>{mSummary.suspended}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Hết hạn: <strong>{mSummary.expired}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Mới: <strong>{mSummary.newMembers}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Đã hủy: <strong>{mSummary.cancelled}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate("heatmap", { tab: "members", period: statusPeriod })}
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                whiteSpace: "nowrap",
              }}
            >
              <span>Xem chi tiết</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        <div className="og-admin-grid-3">
          {/* Card 1.1: Trạng thái hội viên (Grouped Bar Chart) */}
          <div className="og-admin-card">
            <div className="og-admin-card-header">
              <h3 className="og-admin-card-title">Trạng thái hội viên</h3>
              <ChartPeriodDropdown value={statusPeriod} onChange={setStatusPeriod} />
            </div>

            {/* SVG Grouped Bar Chart */}
            <div style={{ height: 180, position: "relative", width: "100%" }}>
              <svg viewBox="0 0 320 180" width="100%" height="100%" style={{ overflow: "visible" }}>
                <line x1="15" y1="30" x2="305" y2="30" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="15" y1="80" x2="305" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="15" y1="130" x2="305" y2="130" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="15" y1="150" x2="305" y2="150" stroke="#e2e8f0" strokeWidth="1" />

                {statusChartData.map((d, i) => {
                  const groupX = 35 + i * 72;
                  const maxVal = Math.max(1, ...statusChartData.map((s) => s.total || 0));
                  const hTotal = d.total > 0 ? Math.max(4, (d.total / maxVal) * 120) : 0;
                  const hActive = d.active > 0 ? Math.max(4, (d.active / maxVal) * 120) : 0;
                  const hExpired = d.expired > 0 ? Math.max(4, (d.expired / maxVal) * 120) : 0;

                  return (
                    <g
                      key={d.label}
                      onMouseEnter={() => setHoveredWeek(d)}
                      onMouseLeave={() => setHoveredWeek(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <rect x={groupX} y={150 - hTotal} width="10" height={hTotal} fill="#0f172a" rx="2" />
                      <rect x={groupX + 13} y={150 - hActive} width="10" height={hActive} fill="#dc2626" rx="2" />
                      <rect x={groupX + 26} y={150 - hExpired} width="10" height={hExpired} fill="#cbd5e1" rx="2" />

                      <text x={groupX + 18} y="168" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="500">
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {hoveredWeek && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "#0f172a",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: "0.72rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{hoveredWeek.label}</div>
                  <div>Tổng: {hoveredWeek.total}</div>
                  <div style={{ color: "#f87171" }}>Đang hoạt động: {hoveredWeek.active}</div>
                  <div style={{ color: "#94a3b8" }}>Hết hạn: {hoveredWeek.expired}</div>
                </div>
              )}
            </div>

            <div className="og-admin-legend-row">
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot circle" style={{ background: "#0f172a" }} />
                <span>Tổng hội viên</span>
              </span>
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot circle" style={{ background: "#dc2626" }} />
                <span>Đang hoạt động</span>
              </span>
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot circle" style={{ background: "#cbd5e1" }} />
                <span>Hết hạn</span>
              </span>
            </div>
          </div>

          {/* Card 1.2: Cơ cấu gói tập (Donut Chart: Gym, Yoga, Boxing) */}
          <div className="og-admin-card">
            <div className="og-admin-card-header">
              <h3 className="og-admin-card-title">Cơ cấu gói tập (Gym, Yoga, Boxing)</h3>
              <ChartPeriodDropdown value={packagePeriod} onChange={setPackagePeriod} />
            </div>

            {/* SVG Donut Chart for Gym, Yoga, Boxing */}
            <div
              style={{
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <svg viewBox="0 0 160 160" width="160" height="160">
                <circle cx="80" cy="80" r="54" fill="none" stroke="#f1f5f9" strokeWidth="26" />

                {/* Slice 1: Gym (#0f172a Dark Navy) */}
                <circle
                  cx="80"
                  cy="80"
                  r="54"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="26"
                  strokeDasharray={`${gymLen} ${circumference}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 80 80)"
                  style={{ transition: "stroke-dasharray 0.4s ease" }}
                >
                  <title>{`Gym: ${gymItem.percentage}% (${gymItem.count} gói)`}</title>
                </circle>

                {/* Slice 2: Yoga (#dc2626 Crimson Red) */}
                <circle
                  cx="80"
                  cy="80"
                  r="54"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="26"
                  strokeDasharray={`${yogaLen} ${circumference}`}
                  strokeDashoffset={String(-gymLen)}
                  transform="rotate(-90 80 80)"
                  style={{ transition: "stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease" }}
                >
                  <title>{`Yoga: ${yogaItem.percentage}% (${yogaItem.count} gói)`}</title>
                </circle>

                {/* Slice 3: Boxing (#cbd5e1 Muted Soft Blue) */}
                <circle
                  cx="80"
                  cy="80"
                  r="54"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="26"
                  strokeDasharray={`${boxingLen} ${circumference}`}
                  strokeDashoffset={String(-(gymLen + yogaLen))}
                  transform="rotate(-90 80 80)"
                  style={{ transition: "stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease" }}
                >
                  <title>{`Boxing: ${boxingItem.percentage}% (${boxingItem.count} gói)`}</title>
                </circle>

                {/* Inner Cut-out Hole */}
                <circle cx="80" cy="80" r="41" fill="#ffffff" />
              </svg>

              {/* Clean Badge inside Center Hole */}
              <div
                style={{
                  position: "absolute",
                  textAlign: "center",
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                  {totalPackageCount}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>
                  Gói đăng ký
                </div>
              </div>
            </div>

            <div className="og-admin-legend-row">
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot" style={{ background: "#0f172a" }} />
                <span>Gym ({gymItem.percentage}%)</span>
              </span>
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot" style={{ background: "#dc2626" }} />
                <span>Yoga ({yogaItem.percentage}%)</span>
              </span>
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot" style={{ background: "#cbd5e1" }} />
                <span>Boxing ({boxingItem.percentage}%)</span>
              </span>
            </div>
          </div>

          {/* Card 1.3: Tăng trưởng hội viên (Chỉ số lượng vì chỉ có 1 loại hội viên) */}
          <div className="og-admin-card">
            <div className="og-admin-card-header">
              <h3 className="og-admin-card-title">Tăng trưởng hội viên (Số lượng)</h3>
              <ChartPeriodDropdown value={growthPeriod} onChange={setGrowthPeriod} />
            </div>

            {/* Single Spline Line Chart with Area Glow */}
            <div style={{ height: 180, width: "100%", position: "relative" }}>
              <svg viewBox="0 0 320 180" width="100%" height="100%" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="20" y1="40" x2="300" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="90" x2="300" y2="90" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="140" x2="300" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="150" x2="300" y2="150" stroke="#e2e8f0" strokeWidth="1" />

                {/* X labels */}
                {growthChartData.map((g, idx) => (
                  <text key={idx} x={35 + idx * 80} y="166" fontSize="10" fill="#94a3b8" textAnchor="middle">
                    {g.label}
                  </text>
                ))}

                {/* Area & Line computed from real growthChartData */}
                {(() => {
                  const maxGrowth = Math.max(1, ...growthChartData.map((x) => x.count || 0));
                  const pts = growthChartData.map((g, idx) => ({
                    x: 35 + idx * 80,
                    y: (g.count || 0) === 0 ? 148 : 148 - ((g.count || 0) / maxGrowth) * 105,
                    g,
                  }));
                  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y.toFixed(1)}`).join(" ");
                  const areaD = pts.length
                    ? `${lineD} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`
                    : "";
                  return (
                    <>
                      {areaD && <path d={areaD} fill="url(#growthAreaGrad)" />}
                      {lineD && (
                        <path
                          d={lineD}
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {pts.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r="4.5"
                          fill="#ffffff"
                          stroke="#dc2626"
                          strokeWidth="2.5"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setHoveredGrowth(p.g)}
                          onMouseLeave={() => setHoveredGrowth(null)}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>

              {hoveredGrowth && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "#0f172a",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: "0.72rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{hoveredGrowth.label}</div>
                  <div>Tổng số lượng: {hoveredGrowth.count} hội viên</div>
                  <div style={{ color: "#4ade80" }}>Mới trong kỳ: +{hoveredGrowth.newCount}</div>
                </div>
              )}
            </div>

            <div className="og-admin-legend-row">
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot circle" style={{ background: "#dc2626" }} />
                <span>Số lượng hội viên toàn hệ thống (Chỉ 1 loại hội viên)</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 2: BUỔI TẬP
         ======================================================== */}
      <section className="og-admin-section">
        <div className="og-admin-section-header">
          <div className="og-admin-section-title-wrap">
            <span className="og-admin-section-icon-badge">
              <Calendar size={15} />
            </span>
            <h2 className="og-admin-section-title">Buổi tập</h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="og-admin-section-stats-bar">
              <span className="og-admin-stat-item">
                Tổng buổi tập: <strong>{sSummary.total}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Sắp diễn ra: <strong>{sSummary.upcoming}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Đã hoàn thành: <strong>{sSummary.completed}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Đang diễn ra: <strong>{sSummary.ongoing}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Đã hủy: <strong>{sSummary.cancelled}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate("heatmap", { tab: "sessions", period: coachPeriod })}
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                whiteSpace: "nowrap",
              }}
            >
              <span>Xem chi tiết</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        <div className="og-admin-grid-2">
          {/* Card 2.1: Tỷ lệ tham gia buổi tập (Semi-circular Gauge) */}
          <div className="og-admin-card">
            <div className="og-admin-card-header">
              <h3 className="og-admin-card-title">Tỷ lệ tham gia buổi tập</h3>
              <ChartPeriodDropdown value={attendanceRatePeriod} onChange={setAttendanceRatePeriod} />
            </div>

            {/* Speedometer Gauge SVG */}
            <div
              style={{
                height: 180,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <svg viewBox="0 0 200 120" width="200" height="120">
                <path
                  d="M 25 105 A 75 75 0 0 1 175 105"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                <path
                  d="M 25 105 A 75 75 0 0 1 175 105"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="14"
                  strokeDasharray={`${gaugeFillLen} ${gaugeCircumference}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 0.4s ease" }}
                />

                <text x="100" y="88" textAnchor="middle" fontSize="24" fontWeight="800" fill="#0f172a">
                  {attendanceRate.percentage}%
                </text>
                <text x="100" y="105" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="500">
                  Đã tham gia ({attendanceRate.attended}/{attendanceRate.total})
                </text>
              </svg>
            </div>

            <div className="og-admin-legend-row">
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot" style={{ background: "#cbd5e1" }} />
                <span>Tổng buổi tập ({attendanceRate.total})</span>
              </span>
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot" style={{ background: "#dc2626" }} />
                <span>Đã tham gia ({attendanceRate.attended})</span>
              </span>
            </div>
          </div>

          {/* Card 2.2: Buổi tập theo huấn luyện viên */}
          <div className="og-admin-card">
            <div className="og-admin-card-header">
              <h3 className="og-admin-card-title">Buổi tập theo huấn luyện viên</h3>
              <ChartPeriodDropdown value={coachPeriod} onChange={setCoachPeriod} />
            </div>

            {/* Bar Chart comparing trainers */}
            <div style={{ height: 180, width: "100%", position: "relative" }}>
              <svg viewBox="0 0 540 180" width="100%" height="100%" style={{ overflow: "visible" }}>
                <line x1="20" y1="30" x2="520" y2="30" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="80" x2="520" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="130" x2="520" y2="130" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="150" x2="520" y2="150" stroke="#e2e8f0" strokeWidth="1" />

                {coachesData.length === 0 ? (
                  <text x="270" y="95" textAnchor="middle" fontSize="12" fill="#94a3b8">
                    Chưa có dữ liệu buổi tập của huấn luyện viên
                  </text>
                ) : (
                  coachesData.map((c, i) => {
                    const x = 32 + i * 50;
                    const maxH = 120;
                    const maxCap = Math.max(1, ...coachesData.map((item) => item.total || 0));
                    const hTotal = c.total > 0 ? Math.max(4, Math.min(maxH, (c.total / maxCap) * maxH)) : 0;
                    const hAttended = c.attended > 0 ? Math.max(4, Math.min(hTotal, (c.attended / maxCap) * maxH)) : 0;

                    return (
                      <g
                        key={c.name + i}
                        onMouseEnter={() => setHoveredCoach(c)}
                        onMouseLeave={() => setHoveredCoach(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <rect x={x} y={150 - hTotal} width="18" height={hTotal} fill="#f1f5f9" rx="3" />
                        <rect x={x} y={150 - hAttended} width="18" height={hAttended} fill="#dc2626" rx="3" />

                        <text
                          x={x + 9}
                          y="166"
                          textAnchor="middle"
                          fontSize="9.5"
                          fill="#64748b"
                          fontWeight="500"
                        >
                          {c.name.split(" ").slice(-1)[0]}
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>

              {hoveredCoach && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "#0f172a",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: "0.72rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{hoveredCoach.name}</div>
                  <div>Tổng hướng dẫn: {hoveredCoach.total} buổi</div>
                  <div style={{ color: "#f87171" }}>Hội viên tham gia: {hoveredCoach.attended}</div>
                </div>
              )}
            </div>

            <div className="og-admin-legend-row">
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot" style={{ background: "#cbd5e1" }} />
                <span>Tổng buổi đã hướng dẫn</span>
              </span>
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot" style={{ background: "#dc2626" }} />
                <span>Hội viên tham gia</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3: ĐIỂM DANH
         ======================================================== */}
      <section className="og-admin-section">
        <div className="og-admin-section-header">
          <div className="og-admin-section-title-wrap">
            <span className="og-admin-section-icon-badge">
              <Clock size={15} />
            </span>
            <h2 className="og-admin-section-title">Điểm danh</h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="og-admin-section-stats-bar">
              <span className="og-admin-stat-item">
                Hôm nay: <strong>{aSummary.today}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Tuần này: <strong>{aSummary.thisWeek}</strong>
              </span>
              <span>&bull;</span>
              <span className="og-admin-stat-item">
                Tháng này: <strong>{aSummary.thisMonth}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate("heatmap", { tab: "attendance", period: checkinPeriod })}
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                whiteSpace: "nowrap",
              }}
            >
              <span>Xem chi tiết</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        <div className="og-admin-grid-attendance">
          {/* Card 3.1: Lượt điểm danh gần đây */}
          <div className="og-admin-card">
            <div className="og-admin-card-header">
              <h3 className="og-admin-card-title">Lượt điểm danh gần đây (Thực tế)</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ChartPeriodDropdown value={checkinPeriod} onChange={setCheckinPeriod} />
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("heatmap", { tab: "attendance", period: checkinPeriod })}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span>Xem tất cả</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="og-admin-table">
                <thead>
                  <tr>
                    <th>NGÀY</th>
                    <th>NGƯỜI DÙNG</th>
                    <th>KHU VỰC</th>
                    <th>GIỜ VÀO</th>
                    <th>GIỜ RA</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCheckins.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "24px 12px", color: "#94a3b8", fontSize: "0.85rem" }}>
                        Chưa có lượt điểm danh nào.
                      </td>
                    </tr>
                  ) : (
                    recentCheckins.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ color: "#64748b", fontSize: "0.82rem" }}>{row.date}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>
                          {row.name}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "0.76rem" }}>{row.email}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                          {row.roomName || "Phòng Gym"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.82rem",
                            color: "#16a34a",
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }}
                          />
                          {row.inTime}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.82rem",
                            color: row.outTime === "Đang tập" ? "#2563eb" : "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: row.outTime === "Đang tập" ? "#2563eb" : "#dc2626",
                            }}
                          />
                          {row.outTime}
                        </span>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3.2: Tần suất điểm danh (Horizontal Bar Chart) */}
          <div className="og-admin-card">
            <div className="og-admin-card-header">
              <h3 className="og-admin-card-title">Tần suất điểm danh</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("heatmap")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                  title="Xem bản đồ nhiệt mật độ phòng tập 24/7"
                >
                  <span>Mật độ Heatmap</span>
                  <ArrowUpRight size={13} />
                </button>
                <ChartPeriodDropdown value={frequencyPeriod} onChange={setFrequencyPeriod} />
              </div>
            </div>

            {/* Horizontal Bar Chart */}
            <div
              style={{
                height: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-around",
                padding: "8px 0",
              }}
            >
              {attendanceFreqData.map((d, i) => {
                const maxCount = Math.max(1, ...attendanceFreqData.map((item) => item.count || 0));
                const pct = d.count > 0 ? Math.min(100, (d.count / maxCount) * 100) : 0;
                return (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 55,
                        fontSize: "0.78rem",
                        color: "#64748b",
                        fontWeight: 500,
                        textAlign: "right",
                      }}
                    >
                      {d.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 14,
                        background: "#f1f5f9",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: i === 0 ? "#dc2626" : i === 1 ? "#1e293b" : "#94a3b8",
                          borderRadius: 4,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 45,
                        fontSize: "0.78rem",
                        color: "#0f172a",
                        fontWeight: 700,
                      }}
                    >
                      {d.count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="og-admin-legend-row">
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot circle" style={{ background: "#dc2626" }} />
                <span>Cao điểm ({Math.max(0, ...attendanceFreqData.map((item) => item.count || 0))} lượt)</span>
              </span>
              <span className="og-admin-legend-item">
                <span className="og-admin-legend-dot circle" style={{ background: "#94a3b8" }} />
                <span>Tiêu chuẩn</span>
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 3.3: BẢNG BẢN ĐỒ NHIỆT PHÒNG TẬP (HEATMAP 24/7)
            HIỂN THỊ HEATMAP & 3 BUTTON CHỌN LOẠI PHÒNG (GYM, YOGA, BOXING)
           ======================================================== */}
        <div className="og-admin-card" style={{ marginTop: 20, padding: "22px 24px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={20} />
              </span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3
                    style={{
                      fontSize: "1.08rem",
                      fontWeight: 800,
                      color: "#0f172a",
                      margin: 0,
                    }}
                  >
                    Bản đồ nhiệt mật độ phòng tập (Heatmap 24/7)
                  </h3>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: activeHeatmapCfg.bgBadge,
                      color: activeHeatmapCfg.color,
                      border: `1px solid ${activeHeatmapCfg.color}33`,
                    }}
                  >
                    {activeHeatmapCfg.label}
                  </span>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Theo dõi khung giờ cao điểm và tần suất ra vào theo thời gian thực cho từng loại phòng
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Presets */}
              <div
                style={{
                  display: "inline-flex",
                  gap: 4,
                  background: "#f8fafc",
                  padding: 3,
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                {[
                  { label: "7 ngày qua", days: 7 },
                  { label: "14 ngày qua", days: 14 },
                  { label: "30 ngày qua", days: 30 },
                ].map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setHeatmapPeriod(p.days)}
                    style={{
                      border: "none",
                      background: heatmapPeriod === p.days ? "#ffffff" : "transparent",
                      color: heatmapPeriod === p.days ? "#0f172a" : "#64748b",
                      fontWeight: heatmapPeriod === p.days ? 700 : 500,
                      fontSize: "0.76rem",
                      padding: "4px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      boxShadow: heatmapPeriod === p.days ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* View all button */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("heatmap")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#dc2626",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title="Mở toàn màn hình Bản đồ nhiệt phòng tập"
              >
                <span>Chi tiết toàn diện</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Metrics of Selected Room Type */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>SỨC CHỨA & ĐANG TẬP</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {activeOcc} <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#64748b" }}>/ {activeCap} người</span>
                <span style={{ marginLeft: 8, fontSize: "0.75rem", fontWeight: 700, color: roomTypeStatusColor }}>
                  ({activeOccPct}%)
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>TỔNG LƯỢT CHECK-IN</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {activeTotalVisits} <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#64748b" }}>lượt ({heatmapPeriod} ngày)</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>KHUNG GIỜ CAO ĐIỂM NHẤT</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                {activePeakHourStr}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>THỜI LƯỢNG TẬP TRUNG BÌNH</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {activeAvgMinutes} <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#64748b" }}>phút / buổi</span>
              </div>
            </div>
          </div>

          {/* Interactive Cell Info Tooltip / Banner */}
          <div
            style={{
              padding: "8px 14px",
              background: heatmapHoveredCell ? "#fef2f2" : "#f1f5f9",
              border: heatmapHoveredCell ? "1px solid #fecaca" : "1px solid #e2e8f0",
              borderRadius: 6,
              marginBottom: 10,
              fontSize: "0.82rem",
              color: heatmapHoveredCell ? "#991b1b" : "#475569",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.15s ease",
            }}
          >
            <span>
              {heatmapHoveredCell ? (
                <>
                  🔥 <strong>{heatmapHoveredCell.dayLabel}</strong>, <strong>{heatmapHoveredCell.hour}:00 – {heatmapHoveredCell.hour}:59</strong>:{" "}
                  <span style={{ color: "#dc2626", fontWeight: 800 }}>{heatmapHoveredCell.visits} lượt</span> check-in ({activeHeatmapCfg.label})
                </>
              ) : (
                <>💡 Di chuột hoặc nhấp vào từng ô giờ để xem chi tiết lượt tập theo khung giờ của <strong>{activeHeatmapCfg.label}</strong></>
              )}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
              Đỉnh điểm: <strong>{heatmapMaxVisits} lượt/giờ</strong>
            </span>
          </div>

          {/* Heatmap Grid (Scrollable on small screens) */}
          <div style={{ overflowX: "auto", paddingBottom: 6 }}>
            <div
              key={heatmapRoomType}
              className="og-admin-heatmap-content"
              style={{ minWidth: 680 }}
            >
              {/* Hour Labels Header (00h - 23h) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px repeat(24, 1fr)",
                  gap: 3,
                  marginBottom: 4,
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>Thứ / Giờ</div>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    style={{
                      fontSize: "0.68rem",
                      color: h % 3 === 0 ? "#475569" : "#94a3b8",
                      fontWeight: h % 3 === 0 ? 700 : 500,
                      textAlign: "center",
                    }}
                  >
                    {h < 10 ? `0${h}` : h}
                  </div>
                ))}
              </div>

              {/* 7 Days Rows */}
              {dayLabels.map((day) => (
                <div
                  key={day.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px repeat(24, 1fr)",
                    gap: 3,
                    marginBottom: 3,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      color: day.id >= 6 ? "#dc2626" : "#334155",
                    }}
                  >
                    {day.label}
                  </div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const visits = getHeatmapVisits(day.id, h);
                    const bg = getHeatmapCellBg(visits);
                    const isHovered =
                      heatmapHoveredCell?.dayId === day.id && heatmapHoveredCell?.hour === h;
                    return (
                      <div
                        key={h}
                        className="og-admin-heatmap-cell"
                        onClick={() =>
                          setHeatmapHoveredCell({
                            dayId: day.id,
                            dayLabel: day.label,
                            hour: h < 10 ? `0${h}` : `${h}`,
                            visits,
                          })
                        }
                        onMouseEnter={() =>
                          setHeatmapHoveredCell({
                            dayId: day.id,
                            dayLabel: day.label,
                            hour: h < 10 ? `0${h}` : `${h}`,
                            visits,
                          })
                        }
                        title={`${day.label}, ${h}:00-${h}:59 (${activeHeatmapCfg.label}): ${visits} lượt`}
                        style={{
                          height: 22,
                          background: bg,
                          borderRadius: 3,
                          cursor: "pointer",
                          outline: isHovered ? "2px solid #0f172a" : "none",
                          transform: isHovered ? "scale(1.18)" : "scale(1)",
                          zIndex: isHovered ? 5 : 1,
                          position: "relative",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Color Legend Scale */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 6,
              fontSize: "0.72rem",
              color: "#64748b",
            }}
          >
            <span>Ít / Trống</span>
            <span style={{ width: 14, height: 10, background: "#f1f5f9", borderRadius: 2, border: "1px solid #e2e8f0" }} />
            <span style={{ width: 14, height: 10, background: "#fee2e2", borderRadius: 2 }} />
            <span style={{ width: 14, height: 10, background: "#fca5a5", borderRadius: 2 }} />
            <span style={{ width: 14, height: 10, background: "#f87171", borderRadius: 2 }} />
            <span style={{ width: 14, height: 10, background: "#dc2626", borderRadius: 2 }} />
            <span style={{ width: 14, height: 10, background: "#991b1b", borderRadius: 2 }} />
            <span style={{ fontWeight: 700, color: "#991b1b" }}>Rất đông</span>
          </div>

          {/* ========================================================
              3 BUTTONS CHO 3 LOẠI PHÒNG (GYM, YOGA, BOXING)
              BẤM VÀO LOẠI PHÒNG NÀO THÌ HIỂN THỊ HEATMAP PHÒNG NẤY
             ======================================================== */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px dashed #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#475569",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span>CHỌN LOẠI PHÒNG ĐỂ XEM BẢN ĐỒ NHIỆT RIÊNG BIỆT:</span>
              <span style={{ fontSize: "0.74rem", fontWeight: 500, color: "#94a3b8" }}>
                Click chọn phòng để cập nhật dữ liệu heatmap tức thì
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {roomTypeConfigs.map((cfg) => {
                const isSelected = heatmapRoomType === cfg.id;
                // Calculate quick occupancy for this button
                const cfgRoomIds = allHeatmapRooms
                  .filter((r) => {
                    const code = (r.code || "").toLowerCase();
                    const name = (r.name || "").toLowerCase();
                    return cfg.namePattern.some((p) => code.includes(p) || name.includes(p));
                  })
                  .map((r) => r.id);
                const occ = allHeatmapRooms
                  .filter((r) => cfgRoomIds.includes(r.id))
                  .reduce((s, r) => s + (Number(r.occupancy) || 0), 0);
                const cap = allHeatmapRooms
                  .filter((r) => cfgRoomIds.includes(r.id))
                  .reduce((s, r) => s + (Number(r.capacity) || 20), 0);
                const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;

                return (
                  <button
                    key={cfg.id}
                    type="button"
                    className="og-admin-room-btn"
                    onClick={() => {
                      setHeatmapRoomType(cfg.id);
                      setHeatmapHoveredCell(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "left",
                      background: isSelected ? "#0f172a" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#0f172a",
                      border: isSelected ? "2px solid #dc2626" : "1px solid #e2e8f0",
                      boxShadow: isSelected
                        ? "0 8px 20px -4px rgba(15, 23, 42, 0.25), 0 0 0 2px rgba(220, 38, 38, 0.2)"
                        : "0 1px 3px rgba(0, 0, 0, 0.04)",
                      transform: isSelected ? "translateY(-1px)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isSelected ? "rgba(220, 38, 38, 0.25)" : "#f8fafc",
                          color: isSelected ? "#f87171" : cfg.color,
                          border: `1px solid ${isSelected ? "rgba(220, 38, 38, 0.4)" : "#e2e8f0"}`,
                        }}
                      >
                        {cfg.id === "gym" ? (
                          <Dumbbell size={22} />
                        ) : cfg.id === "yoga" ? (
                          <Sparkles size={22} />
                        ) : (
                          <Zap size={22} />
                        )}
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span>{cfg.label}</span>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "#dc2626",
                                color: "#ffffff",
                              }}
                            >
                              ĐANG XEM
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.76rem",
                            marginTop: 3,
                            color: isSelected ? "#94a3b8" : "#64748b",
                          }}
                        >
                          Đang tập: <strong style={{ color: isSelected ? "#38bdf8" : "#0284c7" }}>{occ}/{cap}</strong> ({pct}%)
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: isSelected ? "2px solid #dc2626" : "2px solid #cbd5e1",
                        background: isSelected ? "#dc2626" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontSize: "0.75rem",
                        fontWeight: 900,
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
