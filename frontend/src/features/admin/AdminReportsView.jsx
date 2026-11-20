import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  Clock,
  ArrowLeft,
  Download,
  Printer,
  Search,
  ChevronDown,
  Dumbbell,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function AdminReportsView({
  ctx,
  onNavigate,
  initialTab = "members",
  initialPeriod = "week",
}) {
  const isDemo = Boolean(ctx?.user?.demo);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [period, setPeriod] = useState(initialPeriod);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({ items: [] });
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialPeriod) setPeriod(initialPeriod);
  }, [initialPeriod]);

  // Fetch report items based on tab & period
  const fetchReport = async (tabToFetch, currentPeriod, searchKeyword = "") => {
    if (isDemo) {
      const term = searchKeyword.trim().toLowerCase();
      let items = [];
      if (tabToFetch === "sessions") {
        items = (ctx?.data?.coachSessions || []).map((s) => ({
          id: s.id,
          start_time: new Date(s.starts_at).toLocaleString("vi-VN"),
          duration_minutes: s.duration_minutes,
          status: s.status,
          note: s.note,
          pt_name: s.pt_name,
          pt_specialty: "GYM",
          member_name: s.member_name,
          room_name: s.room,
        }));
      } else if (tabToFetch === "attendance") {
        items = (ctx?.data?.checkins || []).map((c) => ({
          id: c.id,
          date: new Date(c.checked_in_at).toLocaleDateString("vi-VN"),
          in_time: new Date(c.checked_in_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          out_time: c.checked_out_at ? new Date(c.checked_out_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Đang tập",
          name: c.member_name,
          member_code: c.member_code,
          room_name: c.room,
        }));
      } else {
        items = (ctx?.data?.members || []).map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          member_code: m.member_code,
          status: m.status,
          join_date: "01/11/2026",
          package_type: m.package_name || "GYM",
          total_checkins: 6,
        }));
      }
      if (term) {
        items = items.filter((it) => JSON.stringify(it).toLowerCase().includes(term));
      }
      setReportData({ tab: tabToFetch, items });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({
        tab: tabToFetch,
        period: currentPeriod,
        search: searchKeyword,
      });
      const res = await fetch(`/api/admin/dashboard/reports?${q.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metrics for KPI banner
  const fetchMetrics = async (currentPeriod) => {
    if (isDemo) {
      const mList = ctx?.data?.members || [];
      setMetrics({
        members: { summary: { total: mList.length, active: mList.filter((m) => m.status === "ACTIVE").length } },
        sessions: { summary: { total: (ctx?.data?.coachSessions || []).length, completed: (ctx?.data?.coachSessions || []).filter((s) => s.status === "COMPLETED").length } },
        attendance: { summary: { today: (ctx?.data?.checkins || []).length, thisWeek: (ctx?.data?.checkins || []).length, thisMonth: (ctx?.data?.checkins || []).length } },
      });
      return;
    }
    try {
      const res = await fetch(`/api/admin/dashboard/metrics?period=${currentPeriod}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (res.ok) {
        const json = await res.json();
        setMetrics(json);
      }
    } catch (err) {
      console.error("Failed to load metrics:", err);
    }
  };

  useEffect(() => {
    fetchReport(activeTab, period, search);
    fetchMetrics(period);
  }, [isDemo, activeTab, period]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReport(activeTab, period, search);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  // Export current table as CSV
  const exportCSV = () => {
    if (!reportData.items || reportData.items.length === 0) {
      if (ctx.flash) ctx.flash("Không có dữ liệu để xuất");
      return;
    }
    const items = reportData.items;
    const headers = Object.keys(items[0]).join(",");
    const rows = items.map((obj) =>
      Object.values(obj)
        .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `optigym_${activeTab}_report_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (ctx.flash) ctx.flash("Đã xuất báo cáo CSV thành công!");
  };

  const periodLabels = {
    week: "Theo tuần",
    month: "Theo tháng",
    year: "Theo năm",
  };

  return (
    <div className="og-admin-view-scroll" style={{ padding: "24px 28px" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("home")}
            className="og-admin-filter-pill"
            style={{
              padding: "7px 12px",
              background: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={15} />
            <span>Quay lại Bảng điều khiển</span>
          </button>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Báo cáo & Phân tích chuyên sâu
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Theo dõi dữ liệu thực tế hội viên, buổi tập PT và lượt điểm danh
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Period Selector */}
          <div
            style={{
              display: "inline-flex",
              background: "#f1f5f9",
              padding: 3,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            {["week", "month", "year"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                style={{
                  border: "none",
                  background: period === p ? "#ffffff" : "transparent",
                  color: period === p ? "#0f172a" : "#64748b",
                  fontWeight: period === p ? 700 : 500,
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  boxShadow: period === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={exportCSV}
            className="og-admin-filter-pill"
            style={{
              background: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
            }}
            title="Xuất dữ liệu bảng hiện tại sang tệp CSV"
          >
            <Download size={14} color="#2563eb" />
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="og-admin-filter-pill"
            style={{
              background: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
            }}
            title="In trang báo cáo này"
          >
            <Printer size={14} color="#64748b" />
            <span>In</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      {metrics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div
            className="og-admin-card"
            style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Tổng Hội viên
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
                {metrics.members?.summary?.total ?? 0}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: 600 }}>
                +{metrics.members?.summary?.active ?? 0} đang hoạt động
              </div>
            </div>
          </div>

          <div
            className="og-admin-card"
            style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dc2626",
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Tổng Buổi tập
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
                {metrics.sessions?.summary?.total ?? 0}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#dc2626", fontWeight: 600 }}>
                {metrics.sessions?.attendanceRate?.percentage ?? 0}% tỷ lệ tham gia
              </div>
            </div>
          </div>

          <div
            className="og-admin-card"
            style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#f0fdf4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#16a34a",
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Điểm danh hôm nay
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
                {metrics.attendance?.summary?.today ?? 0}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 500 }}>
                {metrics.attendance?.summary?.thisWeek ?? 0} trong tuần này
              </div>
            </div>
          </div>

          <div
            className="og-admin-card"
            style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#faf5ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9333ea",
              }}
            >
              <Dumbbell size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Cơ cấu gói tập
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                {(() => {
                  const pkg = metrics.members?.packageStructure || [];
                  const pct = (sp) => pkg.find((p) => p.specialty === sp)?.percentage ?? 0;
                  return `Gym: ${pct("GYM")}% • Yoga: ${pct("YOGA")}% • Boxing: ${pct("BOXING")}%`;
                })()}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 500 }}>
                Theo số lượng đăng ký thực tế
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation & Search Toolbar */}
      <div
        className="og-admin-card"
        style={{
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: activeTab === "members" ? 700 : 500,
              background: activeTab === "members" ? "#0f172a" : "#f1f5f9",
              color: activeTab === "members" ? "#ffffff" : "#475569",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <Users size={16} />
            <span>Phân tích Hội viên & Gói tập</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: activeTab === "sessions" ? 700 : 500,
              background: activeTab === "sessions" ? "#0f172a" : "#f1f5f9",
              color: activeTab === "sessions" ? "#ffffff" : "#475569",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <Calendar size={16} />
            <span>Phân tích Buổi tập & HLV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: activeTab === "attendance" ? 700 : 500,
              background: activeTab === "attendance" ? "#0f172a" : "#f1f5f9",
              color: activeTab === "attendance" ? "#ffffff" : "#475569",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <Clock size={16} />
            <span>Phân tích Điểm danh & Lượt ra vào</span>
          </button>
        </div>

        {/* Live Search Box */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm họ tên, email, mã..."
              style={{
                padding: "7px 12px 7px 30px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                width: 230,
                outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            className="og-admin-filter-pill"
            style={{
              background: "#0f172a",
              color: "#ffffff",
              padding: "7px 14px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Main Table Content */}
      <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Đang tải dữ liệu phân tích chi tiết...
          </div>
        ) : reportData.items && reportData.items.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Không tìm thấy bản ghi phù hợp.
          </div>
        ) : activeTab === "members" ? (
          /* TAB 1: MEMBERS TABLE */
          <div style={{ overflowX: "auto" }}>
            <table className="og-admin-table">
              <thead>
                <tr>
                  <th>MÃ HỘI VIÊN</th>
                  <th>HỌ VÀ TÊN</th>
                  <th>GÓI TẬP</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY THAM GIA</th>
                  <th>LƯỢT TẬP</th>
                </tr>
              </thead>
              <tbody>
                {reportData.items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          color: "#0f172a",
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {m.member_code || `OG-${String(m.id).padStart(8, "0")}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem" }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{m.email}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          color:
                            m.package_type === "GYM"
                              ? "#0f172a"
                              : m.package_type === "YOGA"
                              ? "#dc2626"
                              : "#d97706",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              m.package_type === "GYM"
                                ? "#0f172a"
                                : m.package_type === "YOGA"
                                ? "#dc2626"
                                : "#d97706",
                          }}
                        />
                        {m.package_type || "GYM"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: m.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                          color: m.status === "ACTIVE" ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {m.status === "ACTIVE" ? "Đang hoạt động" : "Tạm ngưng"}
                      </span>
                    </td>
                    <td style={{ color: "#64748b", fontSize: "0.82rem" }}>{m.join_date}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>
                        {m.total_checkins || 0}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginLeft: 4 }}>
                        buổi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "sessions" ? (
          /* TAB 2: SESSIONS TABLE */
          <div style={{ overflowX: "auto" }}>
            <table className="og-admin-table">
              <thead>
                <tr>
                  <th>THỜI GIAN</th>
                  <th>HUẤN LUYỆN VIÊN</th>
                  <th>HỘI VIÊN</th>
                  <th>KHU VỰC</th>
                  <th>NỘI DUNG TẬP</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {reportData.items.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.82rem" }}>
                      {s.start_time}
                      <div style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 400 }}>
                        {s.duration_minutes} phút
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem" }}>
                        {s.pt_name}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#dc2626", fontWeight: 600 }}>
                        {s.pt_specialty || "GYM"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem" }}>
                        {s.member_name}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{s.member_code}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                        {s.room_name || "Phòng Gym"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "#334155", maxWidth: 280 }}>
                      {s.note || "Tập luyện theo giáo án cá nhân"}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background:
                            s.status === "COMPLETED"
                              ? "#dcfce7"
                              : s.status === "CONFIRMED"
                              ? "#eff6ff"
                              : "#fef3c7",
                          color:
                            s.status === "COMPLETED"
                              ? "#16a34a"
                              : s.status === "CONFIRMED"
                              ? "#2563eb"
                              : "#d97706",
                        }}
                      >
                        {s.status === "COMPLETED"
                          ? "Đã hoàn thành"
                          : s.status === "CONFIRMED"
                          ? "Sắp diễn ra"
                          : "Đang chờ duyệt"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 3: ATTENDANCE TABLE */
          <div style={{ overflowX: "auto" }}>
            <table className="og-admin-table">
              <thead>
                <tr>
                  <th>NGÀY</th>
                  <th>HỘI VIÊN</th>
                  <th>KHU VỰC</th>
                  <th>GIỜ VÀO</th>
                  <th>GIỜ RA</th>
                  <th>VAI TRÒ</th>
                </tr>
              </thead>
              <tbody>
                {reportData.items.map((a) => (
                  <tr key={a.id}>
                    <td style={{ color: "#64748b", fontSize: "0.82rem" }}>{a.date}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem" }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{a.email}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 500 }}>
                        {a.room_name || "Phòng Gym"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.82rem",
                          color: "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }}
                        />
                        {a.in_time}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.82rem",
                          color: a.out_time === "Đang tập" ? "#2563eb" : "#dc2626",
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: a.out_time === "Đang tập" ? "#2563eb" : "#dc2626",
                          }}
                        />
                        {a.out_time}
                      </span>
                    </td>
                    <td>
                      <span className="og-admin-badge-blue">
                        {a.role === "PT" ? "Huấn luyện viên" : "Hội viên"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
