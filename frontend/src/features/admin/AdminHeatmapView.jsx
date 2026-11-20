import React, { useState, useEffect } from "react";
import {
  Flame,
  Plus,
  Calendar,
  Users,
  Clock,
  ArrowUpRight,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  MapPin,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

export function AdminHeatmapView({ ctx }) {
  const isDemo = Boolean(ctx?.user?.demo);
  // Date ranges
  const today = new Date();
  const formatYMD = (d) => d.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [from, setFrom] = useState(formatYMD(thirtyDaysAgo));
  const [to, setTo] = useState(formatYMD(today));
  const [selectedRoom, setSelectedRoom] = useState("ALL");

  const [data, setData] = useState({ rooms: [], cells: [], totals: [] });
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  // Modal State for Room Config
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    code: "",
    name: "",
    capacity: 30,
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchHeatmap = async () => {
    if (isDemo) {
      const demoRooms = Array.isArray(ctx?.data?.rooms) && ctx.data.rooms.length
        ? ctx.data.rooms
        : [
            { id: 1, code: "GYM", name: "Phòng Gym", capacity: 40, occupancy: 14, active: true },
            { id: 2, code: "YOGA", name: "Phòng Yoga", capacity: 20, occupancy: 8, active: true },
            { id: 3, code: "BOXING", name: "Phòng Boxing", capacity: 16, occupancy: 5, active: true },
          ];
      const demoCells = [];
      for (let d = 1; d <= 7; d++) {
        for (const h of [7, 8, 9, 17, 18, 19, 20]) {
          demoCells.push({ room_id: 1, weekday: d, hour: h, visits: h >= 17 ? 12 + d : 6 + d });
          demoCells.push({ room_id: 2, weekday: d, hour: h, visits: h >= 17 ? 5 + (d % 4) : 4 });
        }
      }
      setData({
        from,
        to,
        rooms: demoRooms,
        cells: demoCells,
        totals: demoRooms.map((r, i) => ({ room_id: r.id, name: r.name, visits: 90 - i * 24, average_minutes: 62 - i * 5 })),
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/heatmap?${q.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load heatmap:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [isDemo, from, to]);

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomFormData({
      code: "",
      name: "",
      capacity: 30,
      active: true,
    });
    setModalError("");
    setModalOpen(true);
  };

  const openEditRoom = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      code: room.code || "",
      name: room.name || "",
      capacity: room.capacity || 20,
      active: room.active !== false,
    });
    setModalError("");
    setModalOpen(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomFormData.name.trim()) {
      setModalError("Vui lòng nhập tên phòng tập");
      return;
    }
    if (roomFormData.capacity <= 0) {
      setModalError("Sức chứa phải lớn hơn 0");
      return;
    }

    setSubmitting(true);
    setModalError("");

    try {
      const isEdit = Boolean(editingRoom?.id);
      const url = isEdit ? `/api/admin/rooms/${editingRoom.id}` : "/api/admin/rooms";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roomFormData),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchHeatmap();
      } else {
        const err = await res.json().catch(() => ({}));
        setModalError(err.message || "Không thể lưu thông tin phòng tập");
      }
    } catch (err) {
      setModalError("Lỗi kết nối");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter cells based on selected room
  const visibleCells = (data.cells || []).filter(
    (c) => selectedRoom === "ALL" || String(c.room_id) === String(selectedRoom)
  );

  // Helper count for weekday (1=T2 -> 7=CN) and hour (0..23)
  const getCellVisits = (weekday, hour) => {
    return visibleCells
      .filter((c) => c.weekday === weekday && c.hour === hour)
      .reduce((sum, c) => sum + (Number(c.visits) || 0), 0);
  };

  // Max visits across all 168 hours to compute intensity
  let maxVisits = 1;
  for (let d = 1; d <= 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = getCellVisits(d, h);
      if (v > maxVisits) maxVisits = v;
    }
  }

  // Color generator based on ratio (0..1)
  const getCellColor = (visits) => {
    if (!visits || visits <= 0) return "#f8fafc";
    const ratio = Math.min(1, visits / maxVisits);
    if (ratio < 0.25) return "#fee2e2"; // very light red/pink
    if (ratio < 0.5) return "#fca5a5"; // light coral
    if (ratio < 0.75) return "#f87171"; // medium crimson
    if (ratio < 0.95) return "#dc2626"; // brand crimson red
    return "#991b1b"; // dark red
  };

  const dayNames = [
    { id: 1, label: "Thứ 2" },
    { id: 2, label: "Thứ 3" },
    { id: 3, label: "Thứ 4" },
    { id: 4, label: "Thứ 5" },
    { id: 5, label: "Thứ 6" },
    { id: 6, label: "Thứ 7" },
    { id: 7, label: "Chủ nhật" },
  ];

  const roomsList = data.rooms || [];
  const totalsList = data.totals || [];

  return (
    <div className="og-admin-view-scroll" style={{ padding: "24px 32px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 16,
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
            <Flame size={22} />
          </span>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Bản đồ nhiệt phòng tập (Room Heatmap)
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Theo dõi nhịp hoạt động, khung giờ cao điểm và mật độ ra vào theo từng phòng tập 24/7
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddRoom}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#dc2626",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#b91c1c")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#dc2626")}
        >
          <Plus size={16} />
          <span>Thêm phòng tập</span>
        </button>
      </div>

      {/* Date & Room Filter Controls */}
      <div
        className="og-admin-card"
        style={{
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Từ ngày:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "0.82rem",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Đến ngày:</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "0.82rem",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                outline: "none",
              }}
            />
          </div>

          {/* Preset Buttons */}
          <div style={{ display: "inline-flex", gap: 6 }}>
            {[
              { label: "7 ngày qua", days: 7 },
              { label: "14 ngày qua", days: 14 },
              { label: "30 ngày qua", days: 30 },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => {
                  setFrom(formatYMD(new Date(Date.now() - p.days * 86400000)));
                  setTo(formatYMD(new Date()));
                }}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 5,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Room Filter Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>Xem khu vực:</span>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: "0.84rem",
              fontWeight: 600,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              background: "#ffffff",
              color: "#0f172a",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">Toàn bộ phòng tập</option>
            {roomsList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================
          ROOM CAPACITY CARDS
         ======================================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {roomsList.map((room) => {
          const occupancy = Number(room.occupancy) || 0;
          const capacity = Number(room.capacity) || 20;
          const pct = Math.min(100, Math.round((occupancy / capacity) * 100));

          const totalStats = totalsList.find((t) => t.room_id === room.id);
          const totalVisits = totalStats?.visits || 0;
          const avgMins = totalStats?.average_minutes || 0;

          // Color for occupancy badge
          const statusColor =
            pct >= 85 ? "#dc2626" : pct >= 50 ? "#d97706" : "#16a34a";

          return (
            <div
              key={room.id}
              className="og-admin-card"
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={15} color="#dc2626" />
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      {room.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditRoom(room)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: 2,
                    }}
                    title="Chỉnh sửa thông tin phòng"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "8px 0" }}>
                  <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
                    {occupancy}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    / {capacity} người đang tập
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: statusColor,
                      background: `${statusColor}15`,
                      padding: "2px 7px",
                      borderRadius: 12,
                    }}
                  >
                    {pct}% công suất
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "#f1f5f9",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: statusColor,
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: 8,
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.76rem",
                  color: "#64748b",
                }}
              >
                <span>{totalVisits} lượt trong kỳ</span>
                {avgMins > 0 ? (
                  <span>Tập TB: {avgMins} phút</span>
                ) : (
                  <span>{room.active ? "Đang mở" : "Tạm đóng"}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          HEATMAP GRID: 24H x 7 DAYS
         ======================================================== */}
      <div className="og-admin-card" style={{ padding: "20px 22px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Mật độ lượt vào theo khung giờ 24h & Thứ trong tuần
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              {loading
                ? "Đang tải dữ liệu mật độ..."
                : "Mỗi ô thể hiện tổng lượt check-in ghi nhận theo múi giờ Việt Nam. Ô màu càng sẫm thể hiện khung giờ cao điểm."}
            </p>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.74rem",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            <span>Ít</span>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "#fee2e2" }} />
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "#fca5a5" }} />
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "#f87171" }} />
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "#dc2626" }} />
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "#991b1b" }} />
            <span>Nhiều / Cao điểm</span>
          </div>
        </div>

        {/* Scrollable Grid Container */}
        <div style={{ overflowX: "auto", paddingBottom: 10 }}>
          <div style={{ minWidth: 840 }}>
            {/* Hour Labels (0..23) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "70px repeat(24, 1fr)",
                gap: 4,
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span
                  key={h}
                  style={{
                    fontSize: "0.7rem",
                    color: h % 2 === 0 ? "#475569" : "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  {String(h).padStart(2, "0")}h
                </span>
              ))}
            </div>

            {/* 7 Days Rows */}
            {dayNames.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px repeat(24, 1fr)",
                  gap: 4,
                  marginBottom: 5,
                  alignItems: "center",
                }}
              >
                {/* Day Name */}
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#334155",
                    textAlign: "right",
                    paddingRight: 8,
                  }}
                >
                  {d.label}
                </span>

                {/* 24 Hour Cells */}
                {Array.from({ length: 24 }, (_, h) => {
                  const visits = getCellVisits(d.id, h);
                  const bg = getCellColor(visits);
                  const isHovered =
                    hoveredCell?.weekday === d.id && hoveredCell?.hour === h;

                  return (
                    <button
                      key={h}
                      type="button"
                      onMouseEnter={() => setHoveredCell({ weekday: d.id, dayName: d.label, hour: h, visits })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => setSelectedCell({ weekday: d.id, dayName: d.label, hour: h, visits })}
                      style={{
                        height: 28,
                        background: bg,
                        border: isHovered ? "2px solid #0f172a" : "1px solid #e2e8f0",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "transform 0.1s ease, border 0.1s ease",
                        transform: isHovered ? "scale(1.15)" : "scale(1)",
                        zIndex: isHovered ? 10 : 1,
                        padding: 0,
                      }}
                      title={`${d.label}, ${h}:00 - ${h}:59: ${visits} lượt check-in`}
                    >
                      {visits > 0 && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            color: visits >= maxVisits * 0.7 ? "#ffffff" : "#0f172a",
                          }}
                        >
                          {visits}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Selected / Hovered Detail Bar */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 16px",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.84rem",
          }}
        >
          {hoveredCell || selectedCell ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} color="#dc2626" />
              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                {(hoveredCell || selectedCell).dayName}, {(hoveredCell || selectedCell).hour}:00 &ndash;{" "}
                {(hoveredCell || selectedCell).hour}:59:
              </span>
              <span style={{ color: "#dc2626", fontWeight: 800 }}>
                {(hoveredCell || selectedCell).visits} lượt check-in ghi nhận
              </span>
              <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
                ({selectedRoom === "ALL" ? "Toàn bộ khu vực" : roomsList.find((r) => String(r.id) === String(selectedRoom))?.name || "Khu vực đã chọn"})
              </span>
            </div>
          ) : (
            <div style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={15} color="#94a3b8" />
              <span>Rê chuột hoặc nhấp vào ô bất kỳ để xem chi tiết lượt khách theo khung giờ.</span>
            </div>
          )}

          <button
            type="button"
            onClick={fetchHeatmap}
            style={{
              background: "transparent",
              border: "none",
              color: "#2563eb",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={12} />
            <span>Làm mới số liệu</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          MODAL: THÊM / CẤU HÌNH PHÒNG TẬP
         ======================================================== */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={18} color="#dc2626" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {editingRoom ? "Chỉnh sửa phòng tập" : "Thêm mới phòng tập"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} style={{ padding: "20px 22px" }}>
              {modalError && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    color: "#dc2626",
                    fontSize: "0.82rem",
                    marginBottom: 16,
                  }}
                >
                  {modalError}
                </div>
              )}

              {!editingRoom && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Mã phòng (Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: GYM-01, YOGA-FLOW, BOXING-ZONE"
                    value={roomFormData.code}
                    onChange={(e) => setRoomFormData({ ...roomFormData, code: e.target.value.toUpperCase() })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "0.86rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      outline: "none",
                      textTransform: "uppercase",
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Tên phòng tập *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Phòng Gym Tổng Hợp, Phòng Yoga Thảm Nóng..."
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.86rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Sức chứa tối đa (người) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={roomFormData.capacity}
                  onChange={(e) => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value) || 1 })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.86rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={roomFormData.active}
                    onChange={(e) => setRoomFormData({ ...roomFormData, active: e.target.checked })}
                  />
                  <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0f172a" }}>
                    Phòng tập đang mở cửa hoạt động
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "0.84rem",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 6,
                    border: "none",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {submitting ? "Đang lưu..." : editingRoom ? "Cập nhật" : "Tạo phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
