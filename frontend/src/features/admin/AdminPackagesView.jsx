import React, { useState, useEffect } from "react";
import {
  Dumbbell,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Tag,
  AlertCircle,
  X,
} from "lucide-react";

export function AdminPackagesView({ ctx }) {
  const isDemo = Boolean(ctx?.user?.demo);
  const PAGE_SIZE = 10;
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "GYM",
    price: 500000,
    duration_days: 30,
    description: "",
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete Confirm Modal
  const [deleteId, setDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchPackages = async () => {
    if (isDemo) {
      setPackages(Array.isArray(ctx?.data?.packages) ? ctx.data.packages : []);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/packages", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [isDemo]);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: "",
      category: "GYM",
      price: 600000,
      duration_days: 30,
      description: "",
      active: true,
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (pkg) => {
    setIsEditing(true);
    setCurrentId(pkg.id);
    setFormData({
      name: pkg.name || "",
      category: pkg.category || "GYM",
      price: pkg.price || 0,
      duration_days: pkg.duration_days || 30,
      description: pkg.description || "",
      active: pkg.active !== false,
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Vui lòng nhập tên gói tập");
      return;
    }
    if (formData.price < 0) {
      setErrorMsg("Giá gói không được nhỏ hơn 0");
      return;
    }
    if (formData.duration_days <= 0) {
      setErrorMsg("Thời hạn gói phải lớn hơn 0");
      return;
    }

    if (isDemo) {
      if (isEditing) {
        setPackages((prev) => prev.map((p) => (p.id === currentId ? { ...p, ...formData } : p)));
        ctx?.flash?.("[Demo] Đã cập nhật gói tập");
      } else {
        setPackages((prev) => [{ id: Date.now(), ...formData }, ...prev]);
        ctx?.flash?.("[Demo] Đã tạo gói tập mới");
      }
      setModalOpen(false);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const url = isEditing
        ? `/api/admin/packages/${currentId}`
        : "/api/admin/packages";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setModalOpen(false);
        ctx?.flash?.(isEditing ? "Đã cập nhật gói tập" : "Đã tạo gói tập mới");
        fetchPackages();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || "Không thể lưu gói tập. Vui lòng kiểm tra lại dữ liệu.");
      }
    } catch (err) {
      setErrorMsg("Đã xảy ra lỗi kết nối");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (isDemo) {
      setPackages((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
      ctx?.flash?.("[Demo] Đã xóa gói tập");
      return;
    }
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/packages/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setDeleteId(null);
        ctx?.flash?.("Đã xóa gói tập");
        fetchPackages();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.message || "Không thể xóa gói tập này (có thể đã có hội viên đăng ký).";
        setDeleteError(msg);
        ctx?.flash?.(msg);
      }
    } catch (err) {
      setDeleteError("Lỗi kết nối khi xóa gói tập");
      ctx?.flash?.("Lỗi kết nối khi xóa gói tập");
    }
  };

  const toggleStatus = async (pkg) => {
    if (isDemo) {
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, active: !p.active } : p)));
      ctx?.flash?.(pkg.active ? "[Demo] Đã tạm ngưng gói tập" : "[Demo] Đã mở bán gói tập");
      return;
    }
    try {
      const updated = { ...pkg, active: !pkg.active };
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        ctx?.flash?.(updated.active ? "Đã mở bán gói tập" : "Đã tạm ngưng gói tập");
        fetchPackages();
      } else {
        ctx?.flash?.("Không thể cập nhật trạng thái gói tập");
      }
    } catch (err) {
      ctx?.flash?.("Lỗi kết nối máy chủ");
    }
  };

  // Filtered List
  const filtered = packages.filter((p) => {
    const matchSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === "ALL" || p.category === categoryFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? p.active : !p.active);
    return matchSearch && matchCat && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePackages = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // KPI Summary
  const totalCount = packages.length;
  const gymCount = packages.filter((p) => p.category === "GYM").length;
  const yogaCount = packages.filter((p) => p.category === "YOGA").length;
  const boxingCount = packages.filter((p) => p.category === "BOXING").length;
  const activeCount = packages.filter((p) => p.active).length;

  return (
    <div className="og-admin-view-scroll" style={{ padding: "24px 32px" }}>
      {/* Top Banner & KPI Cards */}
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
        <div>
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
              <Dumbbell size={20} />
            </span>
            <div>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Quản lý gói tập
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Cấu hình các gói tập Gym, Yoga, Boxing và chính sách thành viên
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
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
          <span>Tạo gói tập mới</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="og-admin-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            TỔNG SỐ GÓI TẬP
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {totalCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#16a34a", marginTop: 2, fontWeight: 600 }}>
            {activeCount} đang mở bán
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            GÓI GYM
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {gymCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Thể hình & Sức bền
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            GÓI YOGA
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
            {yogaCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Dẻo dai & Thư giãn
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            GÓI BOXING
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0284c7", marginTop: 4 }}>
            {boxingCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Đối kháng & Phản xạ
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
              placeholder="Tìm kiếm gói tập theo tên hoặc mô tả..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

          {/* Category Filter */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Bộ môn:</span>
            {["ALL", "GYM", "YOGA", "BOXING"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategoryFilter(c);
                  setPage(1);
                }}
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

        {/* Status Filter */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Trạng thái:</span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "ACTIVE", label: "Đang bán" },
            { id: "INACTIVE", label: "Tạm dừng" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setStatusFilter(s.id);
                setPage(1);
              }}
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

      {/* Package List Grid / Table */}
      <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="og-admin-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "25%" }}>TÊN GÓI TẬP</th>
              <th style={{ width: "15%" }}>BỘ MÔN</th>
              <th style={{ width: "15%" }}>GIÁ NIÊM YẾT</th>
              <th style={{ width: "15%" }}>THỜI HẠN</th>
              <th style={{ width: "15%" }}>TRẠNG THÁI</th>
              <th style={{ width: "15%", textAlign: "right" }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Đang tải danh sách gói tập...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  Không tìm thấy gói tập nào phù hợp.
                </td>
              </tr>
            ) : (
              visiblePackages.map((pkg) => {
                const badgeColor =
                  pkg.category === "GYM"
                    ? { bg: "#0f172a", text: "#fff" }
                    : pkg.category === "YOGA"
                    ? { bg: "#dc2626", text: "#fff" }
                    : { bg: "#0284c7", text: "#fff" };

                return (
                  <tr key={pkg.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                        {pkg.name}
                      </div>
                      {pkg.description && (
                        <div
                          style={{
                            fontSize: "0.76rem",
                            color: "#64748b",
                            marginTop: 2,
                            maxWidth: 320,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pkg.description}
                        </div>
                      )}
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
                        {pkg.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                        {Number(pkg.price).toLocaleString("vi-VN")} đ
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#475569", fontSize: "0.84rem", fontWeight: 600 }}>
                        {pkg.duration_days} ngày ({Math.round(pkg.duration_days / 30)} tháng)
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleStatus(pkg)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 8px",
                          borderRadius: 20,
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          background: pkg.active ? "#dcfce7" : "#f1f5f9",
                          color: pkg.active ? "#15803d" : "#64748b",
                        }}
                        title="Bấm để bật/tắt mở bán"
                      >
                        {pkg.active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        <span>{pkg.active ? "Đang mở bán" : "Tạm ngưng"}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(pkg)}
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                            padding: "5px 8px",
                            borderRadius: 5,
                            cursor: "pointer",
                            color: "#0f172a",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.76rem",
                            fontWeight: 600,
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(pkg.id);
                            setDeleteError("");
                          }}
                          style={{
                            border: "1px solid #fee2e2",
                            background: "#fef2f2",
                            padding: "5px 8px",
                            borderRadius: 5,
                            cursor: "pointer",
                            color: "#dc2626",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.76rem",
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length > PAGE_SIZE && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderTop: "1px solid #e2e8f0",
              fontSize: "0.82rem",
              color: "#475569",
            }}
          >
            <span>
              Hiển thị {visiblePackages.length} / {filtered.length} gói tập
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  opacity: currentPage <= 1 ? 0.5 : 1,
                }}
              >
                Trang trước
              </button>
              <span style={{ fontWeight: 700 }}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                }}
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: THÊM / CHỈNH SỬA GÓI TẬP
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
              animation: "fadeIn 0.15s ease",
            }}
          >
            {/* Modal Header */}
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
                <Dumbbell size={18} color="#dc2626" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {isEditing ? "Chỉnh sửa gói tập" : "Thêm mới gói tập"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: "20px 22px" }}>
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
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Tên gói tập *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Gói Gym SS-26 Gold, Yoga Unlimited..."
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
                    <option value="GYM">Gym (Thể hình)</option>
                    <option value="YOGA">Yoga (Dẻo dai)</option>
                    <option value="BOXING">Boxing (Đối kháng)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Thời hạn (ngày) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })}
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

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Giá niêm yết (VNĐ) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
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

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Mô tả & Đặc quyền
                </label>
                <textarea
                  rows="3"
                  placeholder="Mô tả quyền lợi phòng tập, khăn tắm, tủ đồ cá nhân..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.84rem",
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
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0f172a" }}>
                    Kích hoạt mở bán ngay trên hệ thống
                  </span>
                </label>
              </div>

              {/* Actions */}
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
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#475569",
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
                  {submitting ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo gói"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: XÁC NHẬN XÓA GÓI TẬP
         ======================================================== */}
      {deleteId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 24,
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <h4 style={{ margin: "0 0 10px", fontSize: "1.1rem", color: "#0f172a", fontWeight: 700 }}>
              Xác nhận xóa gói tập?
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
              Hành động này sẽ xóa gói tập khỏi hệ thống. Nếu gói tập đã có hội viên đăng ký trước đó, hệ thống sẽ bảo lưu an toàn dữ liệu và từ chối xóa.
            </p>
            {deleteError && (
              <div
                style={{
                  padding: "8px 10px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                  color: "#dc2626",
                  fontSize: "0.8rem",
                  marginBottom: 14,
                }}
              >
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Xóa gói
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
