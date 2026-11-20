import React, { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  Copy,
} from "lucide-react";

export function AdminPromotionsView({ ctx }) {
  const isDemo = Boolean(ctx?.user?.demo);
  const PAGE_SIZE = 10;
  const [promotions, setPromotions] = useState([]);
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
    code: "",
    title: "",
    discount_type: "PERCENT",
    discount_value: 20,
    category: "ALL",
    starts_at: new Date().toISOString().slice(0, 10),
    ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    usage_limit: 100,
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchPromotions = async () => {
    if (isDemo) {
      setPromotions([
        {
          id: 1,
          code: "OPTIGYM10",
          title: "Ưu đãi hội viên mới 10%",
          discount_type: "PERCENT",
          discount_value: 10,
          category: "ALL",
          starts_at: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
          ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          usage_limit: 100,
          used_count: 12,
          active: true,
        },
        {
          id: 2,
          code: "BOXING100K",
          title: "Giảm 100k gói Boxing",
          discount_type: "AMOUNT",
          discount_value: 100000,
          category: "BOXING",
          starts_at: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
          ends_at: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
          usage_limit: 50,
          used_count: 7,
          active: true,
        },
      ]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      }
    } catch (err) {
      console.error("Failed to load promotions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [isDemo]);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      code: "",
      title: "",
      discount_type: "PERCENT",
      discount_value: 15,
      category: "ALL",
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      usage_limit: 100,
      active: true,
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setIsEditing(true);
    setCurrentId(p.id);
    setFormData({
      code: p.code || "",
      title: p.title || "",
      discount_type: p.discount_type || "PERCENT",
      discount_value: p.discount_value || 10,
      category: p.category || "ALL",
      starts_at: p.starts_at ? String(p.starts_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
      ends_at: p.ends_at ? String(p.ends_at).slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      usage_limit: p.usage_limit || 100,
      active: p.active !== false,
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setErrorMsg("Vui lòng nhập mã ưu đãi");
      return;
    }
    if (!formData.title.trim()) {
      setErrorMsg("Vui lòng nhập tên chương trình");
      return;
    }
    const val = Number(formData.discount_value);
    if (formData.discount_type === "PERCENT" && (!Number.isFinite(val) || val < 1 || val > 100)) {
      setErrorMsg("Mức giảm phần trăm phải nằm trong khoảng 1% – 100%");
      return;
    }
    if (formData.discount_type === "AMOUNT" && (!Number.isFinite(val) || val < 1000)) {
      setErrorMsg("Mức giảm tiền trực tiếp cần tối thiểu 1.000đ");
      return;
    }
    if (formData.starts_at && formData.ends_at && formData.ends_at < formData.starts_at) {
      setErrorMsg("Ngày kết thúc không được trước ngày bắt đầu");
      return;
    }

    if (isDemo) {
      if (isEditing) {
        setPromotions((prev) => prev.map((p) => (p.id === currentId ? { ...p, ...formData, code: formData.code.trim().toUpperCase() } : p)));
        ctx?.flash?.("[Demo] Đã cập nhật chương trình ưu đãi");
      } else {
        setPromotions((prev) => [{ id: Date.now(), ...formData, code: formData.code.trim().toUpperCase(), used_count: 0 }, ...prev]);
        ctx?.flash?.("[Demo] Đã tạo mã ưu đãi mới");
      }
      setModalOpen(false);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const url = isEditing
        ? `/api/admin/promotions/${currentId}`
        : "/api/admin/promotions";
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
        ctx?.flash?.(isEditing ? "Đã cập nhật chương trình ưu đãi" : "Đã tạo mã ưu đãi mới");
        fetchPromotions();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || "Không thể lưu ưu đãi. Mã ưu đãi có thể đã trùng.");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id) => {
    if (isDemo) {
      setPromotions((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
      ctx?.flash?.("[Demo] Đã cập nhật trạng thái mã ưu đãi");
      return;
    }
    try {
      const res = await fetch(`/api/admin/promotions/${id}/toggle`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (res.ok) {
        ctx?.flash?.("Đã cập nhật trạng thái mã ưu đãi");
        fetchPromotions();
      } else {
        ctx?.flash?.("Không thể đổi trạng thái mã ưu đãi");
      }
    } catch (err) {
      ctx?.flash?.("Lỗi kết nối máy chủ");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (isDemo) {
      setPromotions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      ctx?.flash?.("[Demo] Đã xóa mã ưu đãi");
      return;
    }
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/promotions/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setDeleteTarget(null);
        ctx?.flash?.("Đã xóa mã ưu đãi");
        fetchPromotions();
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.message || "Không thể xóa mã ưu đãi này");
      }
    } catch (err) {
      setDeleteError("Lỗi kết nối máy chủ");
    } finally {
      setDeleteBusy(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    ctx?.flash?.(`Đã sao chép mã ${code}`);
    setTimeout(() => setCopiedCode(""), 1800);
  };

  // Filtered
  const filtered = promotions.filter((p) => {
    const term = search.toLowerCase();
    const matchSearch =
      (p.code || "").toLowerCase().includes(term) ||
      (p.title || "").toLowerCase().includes(term);

    const matchCat = categoryFilter === "ALL" || p.category === categoryFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? p.active : !p.active);

    return matchSearch && matchCat && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePromotions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeCount = promotions.filter((p) => p.active).length;
  const percentCount = promotions.filter((p) => p.discount_type === "PERCENT").length;
  const amountCount = promotions.filter((p) => p.discount_type === "AMOUNT").length;

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
            <Tag size={20} />
          </span>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Chương trình ưu đãi
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Cấu hình các voucher giảm giá, mã khuyến mãi chào mừng và chiến dịch thu hút hội viên
            </p>
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
          <span>Tạo ưu đãi mới</span>
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
            TỔNG CHƯƠNG TRÌNH
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {promotions.length}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#16a34a", marginTop: 2, fontWeight: 600 }}>
            {activeCount} đang áp dụng
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            ƯU ĐÃI GIẢM %
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
            {percentCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Giảm theo tỷ lệ phần trăm
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            ƯU ĐÃI TIỀN MẶT (VNĐ)
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7", marginTop: 4 }}>
            {amountCount}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Trừ tiền trực tiếp vào hóa đơn
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
              placeholder="Tìm theo mã code, tiêu đề..."
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

          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Áp dụng:</span>
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

        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Trạng thái:</span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "ACTIVE", label: "Đang mở" },
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

      {/* Promotions Table */}
      <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="og-admin-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "18%" }}>MÃ VOUCHER</th>
              <th style={{ width: "24%" }}>TIÊU ĐỀ CHƯƠNG TRÌNH</th>
              <th style={{ width: "16%" }}>MỨC GIẢM</th>
              <th style={{ width: "14%" }}>ÁP DỤNG</th>
              <th style={{ width: "14%" }}>TRẠNG THÁI</th>
              <th style={{ width: "14%", textAlign: "right" }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Đang tải danh sách ưu đãi...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  Không tìm thấy chương trình ưu đãi nào.
                </td>
              </tr>
            ) : (
              visiblePromotions.map((item) => {
                const isPercent = item.discount_type === "PERCENT";
                const displayVal = isPercent
                  ? `${item.discount_value}%`
                  : `${Number(item.discount_value).toLocaleString("vi-VN")} đ`;

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 800,
                            color: "#dc2626",
                            background: "#fef2f2",
                            border: "1px dashed #fca5a5",
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: "0.85rem",
                          }}
                        >
                          {item.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(item.code)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
                          title="Sao chép mã"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      {copiedCode === item.code && (
                        <div style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>
                          Đã sao chép!
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
                        {item.starts_at ? String(item.starts_at).slice(0, 10) : "18/11/2026"} &rarr;{" "}
                        {item.ends_at ? String(item.ends_at).slice(0, 10) : "18/12/2026"}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          color: isPercent ? "#dc2626" : "#0f172a",
                        }}
                      >
                        {displayVal}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: "#f1f5f9",
                          color: "#334155",
                        }}
                      >
                        {item.category === "ALL" ? "Tất cả gói" : item.category}
                      </span>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                        Đã dùng: {item.used_count || 0}/{item.usage_limit || 100}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleStatus(item.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 20,
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          background: item.active ? "#dcfce7" : "#f1f5f9",
                          color: item.active ? "#15803d" : "#64748b",
                        }}
                      >
                        {item.active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        <span>{item.active ? "Đang áp dụng" : "Tạm dừng"}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                            padding: "4px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                            color: "#0f172a",
                            fontSize: "0.76rem",
                            fontWeight: 600,
                          }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteError("");
                          }}
                          style={{
                            border: "1px solid #fee2e2",
                            background: "#fef2f2",
                            padding: "4px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                            color: "#dc2626",
                            fontSize: "0.76rem",
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={12} />
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
              Hiển thị {visiblePromotions.length} / {filtered.length} chương trình
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
          MODAL: THÊM / CHỈNH SỬA ƯU ĐÃI
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
              maxWidth: 500,
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
                <Tag size={18} color="#dc2626" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {isEditing ? "Chỉnh sửa mã ưu đãi" : "Tạo mã ưu đãi mới"}
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
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Mã Code Ưu đãi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: OPTIGYM2026, SUMMER50..."
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.86rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    outline: "none",
                    fontFamily: "monospace",
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Tên chương trình khuyến mãi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Khai xuân đón lộc, Ưu đãi thành viên mới..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                    Loại giảm giá *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
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
                    <option value="PERCENT">Phần trăm (%)</option>
                    <option value="AMOUNT">Số tiền trực tiếp (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Mức giảm ({formData.discount_type === "PERCENT" ? "%" : "VNĐ"}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
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
                    Áp dụng cho bộ môn *
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
                    <option value="ALL">Tất cả gói tập</option>
                    <option value="GYM">Chỉ gói Gym</option>
                    <option value="YOGA">Chỉ gói Yoga</option>
                    <option value="BOXING">Chỉ gói Boxing</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Giới hạn lượt dùng *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 100 })}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
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
                    Ngày kết thúc *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
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
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0f172a" }}>
                    Kích hoạt chương trình ngay lập tức
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
                  {submitting ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo ưu đãi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
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
            <h4 style={{ margin: "0 0 10px", fontSize: "1.05rem", color: "#0f172a", fontWeight: 700 }}>
              Xác nhận xóa mã ưu đãi {deleteTarget.code}?
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
              Hành động này sẽ xóa vĩnh viễn chương trình <strong>{deleteTarget.title}</strong> khỏi hệ thống.
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
                onClick={() => setDeleteTarget(null)}
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
                disabled={deleteBusy}
                onClick={confirmDelete}
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
                {deleteBusy ? "Đang xóa..." : "Xóa ưu đãi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
