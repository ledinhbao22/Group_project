import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  LogOut,
  MapPin,
  Users,
  AlertCircle,
  X,
  UserCheck,
} from "lucide-react";

export function AdminAttendanceView({ ctx }) {
  const isDemo = Boolean(ctx?.user?.demo);
  const [checkins, setCheckins] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State: Manual Checkin
  const [modalOpen, setModalOpen] = useState(false);
  const [memberCode, setMemberCode] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchCheckins = async () => {
    if (isDemo) {
      const memByCode = new Map(
        (Array.isArray(ctx?.data?.members) ? ctx.data.members : []).map((m) => [m.member_code, m])
      );
      const demoList = (Array.isArray(ctx?.data?.checkins) ? ctx.data.checkins : []).map((c, idx) => {
        const mem = memByCode.get(c.member_code);
        return {
          id: c.id || idx + 1,
          date: c.checked_in_at ? new Date(c.checked_in_at).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN"),
          name: c.member_name || mem?.name || "Hội viên Demo",
          email: mem?.email || c.member_code || "OG-DEMO",
          inTime: c.checked_in_at ? new Date(c.checked_in_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "08:00",
          outTime: c.checked_out_at ? new Date(c.checked_out_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Đang tập",
          roomName: c.room || "Phòng Gym",
        };
      });
      setCheckins(demoList);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/checkins", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setCheckins(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load checkins:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    if (isDemo) {
      setRooms(Array.isArray(ctx?.data?.rooms) ? ctx.data.rooms : []);
      setMembers(Array.isArray(ctx?.data?.members) ? ctx.data.members : []);
      return;
    }
    try {
      const [rRes, mRes] = await Promise.all([
        fetch("/api/rooms", { credentials: "same-origin" }),
        fetch("/api/admin/users?role=MEMBER&limit=100", { credentials: "same-origin" }),
      ]);
      if (rRes.ok) {
        const rData = await rRes.json();
        setRooms((rData || []).filter((r) => r.active !== false));
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        const list = mData.users || mData || [];
        setMembers(list.filter((u) => u.status === "ACTIVE"));
      }
    } catch (err) {
      console.error("Failed to load rooms/members:", err);
    }
  };

  useEffect(() => {
    fetchCheckins();
    fetchDependencies();
  }, [isDemo]);

  const openManualModal = () => {
    setMemberCode(members[0]?.member_code || "OG-00000101");
    setSelectedRoom(rooms[0]?.id || "");
    setErrorMsg("");
    setSuccessMsg("");
    setModalOpen(true);
  };

  const handleManualCheckin = async (e) => {
    e.preventDefault();
    if (!memberCode.trim()) {
      setErrorMsg("Vui lòng nhập hoặc chọn mã hội viên");
      return;
    }
    if (!selectedRoom) {
      setErrorMsg("Vui lòng chọn phòng tập");
      return;
    }

    if (isDemo) {
      const mem = members.find((m) => (m.member_code || "").toUpperCase() === memberCode.trim().toUpperCase());
      const rm = rooms.find((r) => String(r.id) === String(selectedRoom));
      const now = new Date();
      setCheckins((prev) => [
        {
          id: Date.now(),
          date: now.toLocaleDateString("vi-VN"),
          name: mem?.name || memberCode.trim().toUpperCase(),
          email: mem?.email || memberCode.trim().toUpperCase(),
          inTime: now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          outTime: "Đang tập",
          roomName: rm?.name || "Phòng Gym",
        },
        ...prev,
      ]);
      setModalOpen(false);
      ctx?.flash?.("[Demo] Đã điểm danh vào phòng");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/checkins", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_code: memberCode.trim().toUpperCase(),
          room_id: Number(selectedRoom),
        }),
      });

      if (res.ok) {
        setSuccessMsg("Điểm danh vào phòng thành công!");
        ctx?.flash?.("Điểm danh vào phòng thành công");
        setTimeout(() => {
          setModalOpen(false);
          fetchCheckins();
        }, 600);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || "Không thể điểm danh. Hội viên đang có lượt tập chưa ra hoặc mã không đúng.");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (checkinId) => {
    if (isDemo) {
      const nowStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      setCheckins((prev) => prev.map((c) => (c.id === checkinId ? { ...c, outTime: nowStr } : c)));
      ctx?.flash?.("[Demo] Đã check-out thành công");
      return;
    }
    try {
      const res = await fetch(`/api/admin/checkins/${checkinId}/checkout`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (res.ok) {
        ctx?.flash?.("Đã ghi nhận check-out cho hội viên");
        fetchCheckins();
      } else {
        ctx?.flash?.("Không thể check-out lượt tập này");
      }
    } catch (err) {
      ctx?.flash?.("Lỗi kết nối máy chủ");
    }
  };

  // Filtered Checkins
  const filtered = checkins.filter((c) => {
    const term = search.toLowerCase();
    const matchSearch =
      (c.name || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.roomName || "").toLowerCase().includes(term);

    const matchRoom =
      roomFilter === "ALL" ||
      (c.roomName || "").toLowerCase().includes(roomFilter.toLowerCase());

    const isOngoing = c.outTime === "Đang tập";
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ONGOING" && isOngoing) ||
      (statusFilter === "OUT" && !isOngoing);

    return matchSearch && matchRoom && matchStatus;
  });

  const ongoingCount = checkins.filter((c) => c.outTime === "Đang tập").length;
  const completedCount = checkins.filter((c) => c.outTime !== "Đang tập").length;

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
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#dc2626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={20} />
          </span>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Điểm danh & Ra vào
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Giám sát lượt check-in thực tế của hội viên theo thời gian thực tại các phòng tập
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openManualModal}
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
          <span>Điểm danh thủ công</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            LƯỢT CHECK-IN HÔM NAY
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {checkins.length}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Tổng lượt ra vào ghi nhận
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            ĐANG TẬP TRONG PHÒNG
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
            {ongoingCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#2563eb", marginTop: 2, fontWeight: 600 }}>
            Chưa check-out ra về
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            ĐÃ HOÀN TẤT BUỔI TẬP
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
            {completedCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#16a34a", marginTop: 2, fontWeight: 600 }}>
            Đã check-out thành công
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div
        className="og-admin-card og-admin-filter-bar"
        style={{
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260 }}>
          <div
            style={{
              position: "relative",
              flex: 1,
              maxWidth: 360,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search size={15} style={{ position: "absolute", left: 10, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Tìm theo tên hội viên, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                fontSize: "0.84rem",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Khu vực:</span>
            {["ALL", "Gym", "Yoga", "Boxing"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoomFilter(r)}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: roomFilter === r ? "#0f172a" : "#f1f5f9",
                  color: roomFilter === r ? "#ffffff" : "#475569",
                  transition: "all 0.12s ease",
                }}
              >
                {r === "ALL" ? "Tất cả" : r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Trạng thái:</span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "ONGOING", label: "Đang tập" },
            { id: "OUT", label: "Đã ra" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              style={{
                border: "none",
                padding: "4px 10px",
                borderRadius: 5,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                background: statusFilter === s.id ? "#dc2626" : "#f1f5f9",
                color: statusFilter === s.id ? "#ffffff" : "#475569",
                transition: "all 0.12s ease",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="og-admin-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "14%" }}>NGÀY</th>
              <th style={{ width: "26%" }}>HỘI VIÊN</th>
              <th style={{ width: "18%" }}>KHU VỰC PHÒNG</th>
              <th style={{ width: "14%" }}>GIỜ VÀO</th>
              <th style={{ width: "14%" }}>GIỜ RA</th>
              <th style={{ width: "14%", textAlign: "right" }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Đang tải dữ liệu điểm danh...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  Không tìm thấy lượt điểm danh nào.
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const isOngoing = row.outTime === "Đang tập";

                return (
                  <tr key={row.id || idx}>
                    <td style={{ color: "#64748b", fontSize: "0.82rem" }}>
                      {row.date || "18/11/2026"}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>
                        {row.name}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                        {row.email}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.84rem", color: "#334155", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <MapPin size={12} color="#dc2626" />
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
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
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
                          color: isOngoing ? "#2563eb" : "#dc2626",
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: isOngoing ? "#2563eb" : "#dc2626",
                          }}
                        />
                        {row.outTime}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {isOngoing ? (
                        <button
                          type="button"
                          onClick={() => handleCheckout(row.id)}
                          style={{
                            border: "1px solid #fee2e2",
                            background: "#fef2f2",
                            color: "#dc2626",
                            padding: "4px 10px",
                            borderRadius: 5,
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <LogOut size={12} />
                          <span>Check-out</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                          Đã hoàn tất
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MODAL: ĐIỂM DANH THỦ CÔNG
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
                <Clock size={18} color="#dc2626" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Điểm danh thủ công vào phòng
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

            <form onSubmit={handleManualCheckin} style={{ padding: "20px 22px" }}>
              {errorMsg && (
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
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 6,
                    color: "#16a34a",
                    fontSize: "0.82rem",
                    marginBottom: 16,
                  }}
                >
                  {successMsg}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Mã Hội viên (Member Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: OG-00000101"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
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
                <div style={{ marginTop: 6, fontSize: "0.75rem", color: "#64748b" }}>
                  Hoặc chọn nhanh từ danh sách hội viên bên dưới:
                </div>
                <select
                  onChange={(e) => setMemberCode(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 8px",
                    fontSize: "0.8rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: 5,
                    background: "#f8fafc",
                  }}
                >
                  <option value="">-- Chọn hội viên --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.member_code || `OG-${m.id}`}>
                      {m.name} ({m.member_code || `OG-${m.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Khu vực Phòng tập *
                </label>
                <select
                  required
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "0.86rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: "#fff",
                    outline: "none",
                  }}
                >
                  <option value="">-- Chọn phòng tập --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Sức chứa: {r.capacity})
                    </option>
                  ))}
                </select>
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
                  {submitting ? "Đang điểm danh..." : "Check-in Vào phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
