import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  X,
  User,
} from "lucide-react";

export function AdminScheduleView({ ctx }) {
  const isDemo = Boolean(ctx?.user?.demo);
  const [classes, setClasses] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State: Create Class
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "GYM",
    pt_id: "",
    room_id: "",
    starts_at: "",
    duration_minutes: 60,
    capacity: 20,
  });

  const fetchClasses = async () => {
    if (isDemo) {
      setClasses(Array.isArray(ctx?.data?.classes) ? ctx.data.classes : []);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/classes", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    if (isDemo) {
      const pts = (Array.isArray(ctx?.data?.trainers) ? ctx.data.trainers : []).filter((u) => u.status === "ACTIVE");
      const rms = (Array.isArray(ctx?.data?.rooms) ? ctx.data.rooms : []).filter((r) => r.active !== false);
      setCoaches(pts);
      setRooms(rms);
      return;
    }
    try {
      const [uRes, rRes] = await Promise.all([
        fetch("/api/admin/users?role=PT&limit=100", { credentials: "same-origin" }),
        fetch("/api/rooms", { credentials: "same-origin" }),
      ]);
      if (uRes.ok) {
        const uData = await uRes.json();
        const list = uData.users || uData || [];
        setCoaches(list.filter((u) => u.status === "ACTIVE"));
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRooms((rData || []).filter((r) => r.active !== false));
      }
    } catch (err) {
      console.error("Failed to load coaches/rooms:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchDependencies();
  }, [isDemo]);

  const openCreateModal = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    tmr.setHours(8, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}T08:00`;

    setFormData({
      name: "",
      category: "GYM",
      pt_id: coaches[0]?.id || "",
      room_id: rooms[0]?.id || "",
      starts_at: dateStr,
      duration_minutes: 60,
      capacity: 15,
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Vui lòng nhập tên lớp tập");
      return;
    }
    if (!formData.pt_id) {
      setErrorMsg("Vui lòng chọn huấn luyện viên");
      return;
    }
    if (!formData.room_id) {
      setErrorMsg("Vui lòng chọn phòng tập");
      return;
    }
    if (!formData.starts_at) {
      setErrorMsg("Vui lòng chọn thời gian bắt đầu");
      return;
    }

    if (isDemo) {
      const pt = coaches.find((c) => String(c.id) === String(formData.pt_id));
      const rm = rooms.find((r) => String(r.id) === String(formData.room_id));
      const created = {
        id: Date.now(),
        name: formData.name.trim(),
        category: formData.category,
        pt_id: Number(formData.pt_id),
        coach: pt?.name || "HLV",
        room_id: Number(formData.room_id),
        room: rm?.name || "Phòng Gym",
        starts_at: new Date(formData.starts_at).toISOString(),
        duration_minutes: Number(formData.duration_minutes),
        capacity: Number(formData.capacity),
        filled: 0,
        status: "OPEN",
      };
      setClasses((prev) => [created, ...prev]);
      setModalOpen(false);
      ctx?.flash?.("[Demo] Đã mở lịch lớp mới");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const dt = new Date(formData.starts_at);
      const isoWithTz = dt.toISOString();

      const res = await fetch("/api/admin/classes", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          pt_id: Number(formData.pt_id),
          room_id: Number(formData.room_id),
          starts_at: isoWithTz,
          duration_minutes: Number(formData.duration_minutes),
          capacity: Number(formData.capacity),
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        ctx?.flash?.("Đã mở lịch lớp tập mới thành công");
        fetchClasses();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || "Không thể tạo lịch lớp. Trùng lịch hoặc dữ liệu không hợp lệ.");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClass = (classId) => {
    setCancelTargetId(classId);
  };

  const confirmCancelClass = async () => {
    if (!cancelTargetId) return;
    if (isDemo) {
      setClasses((prev) => prev.map((c) => (c.id === cancelTargetId ? { ...c, status: "CANCELLED" } : c)));
      setCancelTargetId(null);
      ctx?.flash?.("[Demo] Đã hủy lớp học");
      return;
    }
    try {
      const res = await fetch(`/api/admin/classes/${cancelTargetId}/cancel`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (res.ok) {
        setCancelTargetId(null);
        ctx?.flash?.("Đã hủy lịch lớp tập");
        fetchClasses();
      } else {
        ctx?.flash?.("Không thể hủy lớp này");
      }
    } catch (err) {
      ctx?.flash?.("Lỗi kết nối máy chủ");
    }
  };

  // Filtered
  const filtered = classes.filter((c) => {
    const term = search.toLowerCase();
    const matchSearch =
      (c.name || "").toLowerCase().includes(term) ||
      (c.coach || "").toLowerCase().includes(term) ||
      (c.room || "").toLowerCase().includes(term);

    const matchCat = categoryFilter === "ALL" || c.category === categoryFilter;
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;

    return matchSearch && matchCat && matchStatus;
  });

  const openCount = classes.filter((c) => c.status === "OPEN").length;
  const cancelledCount = classes.filter((c) => c.status === "CANCELLED").length;

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
            <Calendar size={20} />
          </span>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Lịch tập & Đặt lịch
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Quản lý lịch học nhóm, buổi tập PT và phân bổ phòng tập Gym, Yoga, Boxing
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
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
          <span>Mở lịch lớp mới</span>
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
            TỔNG SỐ LỚP / BUỔI TẬP
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {classes.length}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Trên toàn bộ hệ thống
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            ĐANG MỞ ĐĂNG KÝ
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
            {openCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#16a34a", marginTop: 2, fontWeight: 600 }}>
            Hội viên có thể đặt chỗ
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            LỚP ĐÃ HỦY
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
            {cancelledCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Buổi tập không tổ chức
          </div>
        </div>
      </div>

      {/* Filter and Search */}
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
              placeholder="Tìm theo tên lớp, HLV, phòng..."
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
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Bộ môn:</span>
            {["ALL", "GYM", "YOGA", "BOXING"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: categoryFilter === c ? "#0f172a" : "#f1f5f9",
                  color: categoryFilter === c ? "#ffffff" : "#475569",
                  transition: "all 0.12s ease",
                }}
              >
                {c === "ALL" ? "Tất cả" : c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Trạng thái:</span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "OPEN", label: "Mở đăng ký" },
            { id: "CANCELLED", label: "Đã hủy" },
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

      {/* Class Schedule Table */}
      <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="og-admin-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "24%" }}>TÊN LỚP / BUỔI TẬP</th>
              <th style={{ width: "12%" }}>BỘ MÔN</th>
              <th style={{ width: "18%" }}>HLV PHỤ TRÁCH</th>
              <th style={{ width: "14%" }}>PHÒNG TẬP</th>
              <th style={{ width: "16%" }}>THỜI GIAN</th>
              <th style={{ width: "16%", textAlign: "right" }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Đang tải lịch tập...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  Không tìm thấy lịch tập nào phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const badgeColor =
                  item.category === "GYM"
                    ? { bg: "#0f172a", text: "#fff" }
                    : item.category === "YOGA"
                    ? { bg: "#dc2626", text: "#fff" }
                    : { bg: "#0284c7", text: "#fff" };

                const isOpen = item.status === "OPEN";
                const startDate = new Date(item.starts_at);
                const timeStr = startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                const dateStr = startDate.toLocaleDateString("vi-VN");

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <Users size={12} />
                        <span>Sức chứa: {item.filled || 0}/{item.capacity} học viên</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          borderRadius: 4,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          background: badgeColor.bg,
                          color: badgeColor.text,
                        }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>
                        {item.coach || "Huấn luyện viên"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "#475569", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} color="#64748b" />
                        {item.room || "Phòng tập"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.84rem" }}>
                        {timeStr} • {dateStr}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        Thời lượng: {item.duration_minutes} phút
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => handleCancelClass(item.id)}
                          style={{
                            border: "1px solid #fee2e2",
                            background: "#fef2f2",
                            color: "#dc2626",
                            padding: "4px 10px",
                            borderRadius: 5,
                            fontSize: "0.76rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Hủy lớp
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.76rem", color: "#94a3b8", fontWeight: 600 }}>
                          Đã hủy
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
          MODAL: TẠO LỊCH LỚP MỚI
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
              maxWidth: 520,
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
                <Calendar size={18} color="#dc2626" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Mở lịch lớp tập mới
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

            <form onSubmit={handleCreate} style={{ padding: "20px 22px" }}>
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

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Tên lớp tập / Buổi học *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Yoga Chào Ngày Mới, Boxing Cardio..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Bộ môn *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                    <option value="GYM">Gym</option>
                    <option value="YOGA">Yoga</option>
                    <option value="BOXING">Boxing</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Sức chứa (học viên) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
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
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Huấn luyện viên phụ trách *
                  </label>
                  <select
                    required
                    value={formData.pt_id}
                    onChange={(e) => setFormData({ ...formData, pt_id: e.target.value })}
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
                    <option value="">-- Chọn HLV --</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.specialty || "PT"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Phòng tập *
                  </label>
                  <select
                    required
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
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
                    <option value="">-- Chọn phòng --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Sức chứa: {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Ngày & Giờ bắt đầu *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: "0.84rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Thời lượng (phút) *
                  </label>
                  <select
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
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
                    <option value={45}>45 phút</option>
                    <option value={60}>60 phút (1 tiếng)</option>
                    <option value={90}>90 phút (1.5 tiếng)</option>
                    <option value={120}>120 phút (2 tiếng)</option>
                  </select>
                </div>
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
                  {submitting ? "Đang lưu..." : "Mở lịch lớp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelTargetId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 420, padding: "20px 22px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              Xác nhận hủy lớp tập?
            </h3>
            <p style={{ margin: "0 0 18px", fontSize: "0.86rem", color: "#475569", lineHeight: 1.5 }}>
              Lớp tập sẽ chuyển sang trạng thái ĐÃ HỦY và hội viên sẽ không thể tiếp tục đặt chỗ.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: "0.84rem", cursor: "pointer" }}
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={confirmCancelClass}
                style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer" }}
              >
                Xác nhận hủy lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
