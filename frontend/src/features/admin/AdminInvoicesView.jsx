import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  Eye,
  CreditCard,
  AlertCircle,
  X,
  User,
  Dumbbell,
  Calendar,
} from "lucide-react";

export function AdminInvoicesView({ ctx }) {
  const isDemo = Boolean(ctx?.user?.demo);
  const [orders, setOrders] = useState([]);
  const [members, setMembers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State: Create Invoice
  const [createModal, setCreateModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [orderStatus, setOrderStatus] = useState("PAID");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal State: View Receipt
  const [viewInvoice, setViewInvoice] = useState(null);

  const fetchOrders = async () => {
    if (isDemo) {
      setOrders(Array.isArray(ctx?.data?.orders) ? ctx.data.orders : []);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    if (isDemo) {
      setMembers(Array.isArray(ctx?.data?.members) ? ctx.data.members : []);
      setPackages(Array.isArray(ctx?.data?.packages) ? ctx.data.packages : []);
      setPromotions([
        { id: 1, code: "OPTIGYM10", title: "Giảm 10% hội viên mới", discount_type: "PERCENT", discount_value: 10, category: "ALL", active: true },
      ]);
      return;
    }
    try {
      const [mRes, pRes, prRes] = await Promise.all([
        fetch("/api/admin/users?role=MEMBER&limit=200", { credentials: "same-origin" }),
        fetch("/api/admin/packages", { credentials: "same-origin" }),
        fetch("/api/admin/promotions", { credentials: "same-origin" }),
      ]);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMembers(mData.users || mData || []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setPackages(pData || []);
      }
      if (prRes.ok) {
        const prData = await prRes.json();
        setPromotions(Array.isArray(prData) ? prData : []);
      }
    } catch (err) {
      console.error("Failed to load members/packages:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchInitialData();
  }, [isDemo]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      setErrorMsg("Vui lòng chọn hội viên đăng ký");
      return;
    }
    if (!selectedPackage) {
      setErrorMsg("Vui lòng chọn gói tập");
      return;
    }

    if (isDemo) {
      const mem = members.find((m) => String(m.id) === String(selectedMember));
      const pkg = packages.find((p) => String(p.id) === String(selectedPackage));
      const cleanCode = promoCode.trim().toUpperCase();
      const promo = promotions.find((pr) => pr.code === cleanCode && pr.active !== false);
      const price = Number(pkg?.price || 0);
      const discount = promo
        ? promo.discount_type === "PERCENT"
          ? Math.min(price, Math.round((price * Number(promo.discount_value || 0)) / 100))
          : Math.min(price, Number(promo.discount_value || 0))
        : 0;
      const created = {
        id: Date.now(),
        reference: `INV${String(Date.now()).slice(-6)}`,
        member_id: Number(selectedMember),
        member_name: mem?.name || "Hội viên",
        member_code: mem?.member_code || `OG-${selectedMember}`,
        package_name: pkg?.name || "Gói tập",
        package_days: pkg?.duration_days || 30,
        package_price: price,
        promotion_code: promo ? promo.code : "",
        discount_amount: discount,
        payment_method: paymentMethod,
        total: Math.max(0, price - discount),
        status: orderStatus,
        created_at: new Date().toISOString(),
      };
      setOrders((prev) => [created, ...prev]);
      setCreateModal(false);
      ctx?.flash?.("[Demo] Đã lập hóa đơn mới");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: Number(selectedMember),
          package_id: Number(selectedPackage),
          promotion_code: promoCode.trim().toUpperCase(),
          payment_method: paymentMethod,
          status: orderStatus,
        }),
      });

      if (res.ok) {
        setCreateModal(false);
        ctx?.flash?.("Đã lập hóa đơn mới thành công");
        fetchOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || "Không thể tạo hóa đơn");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (orderId) => {
    if (isDemo) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "PAID" } : o)));
      ctx?.flash?.("[Demo] Đã xác nhận thu tiền hóa đơn");
      return;
    }
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/paid`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (res.ok) {
        ctx?.flash?.("Đã xác nhận thanh toán & kích hoạt gói tập");
        fetchOrders();
      } else {
        ctx?.flash?.("Không thể cập nhật thanh toán đơn hàng này");
      }
    } catch (err) {
      ctx?.flash?.("Lỗi kết nối máy chủ");
    }
  };

  // Filtered Orders
  const filtered = orders.filter((o) => {
    const term = search.toLowerCase();
    const matchSearch =
      (o.reference || "").toLowerCase().includes(term) ||
      (o.member_name || "").toLowerCase().includes(term) ||
      (o.package_name || "").toLowerCase().includes(term) ||
      (o.member_code || "").toLowerCase().includes(term);

    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PAID" && o.status === "PAID") ||
      (statusFilter === "PENDING" && (o.status === "PENDING" || o.status === "SUBMITTED")) ||
      (statusFilter === "CANCELLED" && o.status === "CANCELLED");

    return matchSearch && matchStatus;
  });

  // KPI Calculations
  const totalRevenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const pendingRevenue = orders
    .filter((o) => o.status === "PENDING" || o.status === "SUBMITTED")
    .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const paidCount = orders.filter((o) => o.status === "PAID").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING" || o.status === "SUBMITTED").length;

  const pkgSelectedObj = packages.find((p) => String(p.id) === String(selectedPackage));
  const cleanPromoCode = promoCode.trim().toUpperCase();
  const matchedPromo = cleanPromoCode
    ? promotions.find((pr) => (pr.code || "").toUpperCase() === cleanPromoCode && pr.active !== false)
    : null;
  const previewPrice = Number(pkgSelectedObj?.price || 0);
  const previewDiscount = matchedPromo
    ? matchedPromo.discount_type === "PERCENT"
      ? Math.min(previewPrice, Math.round((previewPrice * Number(matchedPromo.discount_value || 0)) / 100))
      : Math.min(previewPrice, Number(matchedPromo.discount_value || 0))
    : 0;
  const previewTotal = Math.max(0, previewPrice - previewDiscount);

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
            <Receipt size={20} />
          </span>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Hóa đơn & Doanh thu
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Quản lý thanh toán gói tập, hợp đồng dịch vụ và doanh thu phòng tập
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedMember(members[0]?.id || "");
            setSelectedPackage(packages[0]?.id || "");
            setPromoCode("");
            setOrderStatus("PAID");
            setErrorMsg("");
            setCreateModal(true);
          }}
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
          <span>Lập hóa đơn mới</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            TỔNG DOANH THU ĐÃ THU
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
            {totalRevenue.toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            {paidCount} đơn đã hoàn tất thanh toán
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            DOANH THU CHỜ THU
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
            {pendingRevenue.toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            {pendingCount} đơn chờ đối soát hoặc xác nhận
          </div>
        </div>

        <div className="og-admin-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            TỔNG HÓA ĐƠN
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {orders.length}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
            Toàn bộ giao dịch hệ thống
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
            placeholder="Tìm theo mã HĐ, tên hội viên, mã HV..."
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

        {/* Status Filters */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Trạng thái:</span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PAID", label: "Đã thu tiền" },
            { id: "PENDING", label: "Chờ thanh toán" },
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
                background: statusFilter === s.id ? "#0f172a" : "#f1f5f9",
                color: statusFilter === s.id ? "#ffffff" : "#475569",
                transition: "all 0.12s ease",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="og-admin-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "16%" }}>MÃ HÓA ĐƠN</th>
              <th style={{ width: "22%" }}>HỘI VIÊN</th>
              <th style={{ width: "20%" }}>GÓI DỊCH VỤ</th>
              <th style={{ width: "15%" }}>SỐ TIỀN</th>
              <th style={{ width: "14%" }}>TRẠNG THÁI</th>
              <th style={{ width: "13%", textAlign: "right" }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Đang tải danh sách hóa đơn...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  Không tìm thấy hóa đơn nào phù hợp.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 50).map((row) => {
                const isPaid = row.status === "PAID";
                const isPending = row.status === "PENDING" || row.status === "SUBMITTED";

                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.84rem" }}>
                        {row.reference}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {row.created_at ? new Date(row.created_at).toLocaleDateString("vi-VN") : "18/11/2026"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>
                        {row.member_name || "Hội viên"}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                        {row.member_code || "OG-MEMBER"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#334155" }}>
                        {row.package_name}
                      </div>
                      {row.pt_name && (
                        <div style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                          + HLV {row.pt_name} ({row.pt_sessions} buổi)
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                        {Number(row.total).toLocaleString("vi-VN")} đ
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 20,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: isPaid ? "#dcfce7" : isPending ? "#fef3c7" : "#f1f5f9",
                          color: isPaid ? "#15803d" : isPending ? "#b45309" : "#64748b",
                        }}
                      >
                        {isPaid ? <CheckCircle size={12} /> : isPending ? <Clock size={12} /> : <XCircle size={12} />}
                        <span>{isPaid ? "Đã thanh toán" : isPending ? "Chờ thu tiền" : "Đã hủy"}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(row.id)}
                            style={{
                              border: "none",
                              background: "#16a34a",
                              color: "#fff",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Xác nhận đã nhận tiền và kích hoạt gói tập"
                          >
                            Xác nhận thu
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setViewInvoice(row)}
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                            padding: "4px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                            color: "#0f172a",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                          title="Xem chi tiết & in hóa đơn"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MODAL: LẬP HÓA ĐƠN MỚI
         ======================================================== */}
      {createModal && (
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
                <Receipt size={18} color="#dc2626" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Lập hóa đơn & Đăng ký gói tập
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ padding: "20px 22px" }}>
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
                  Chọn Hội viên đăng ký *
                </label>
                <select
                  required
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
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
                  <option value="">-- Chọn hội viên trong danh sách --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.member_code || `OG-${m.id}`}) - {m.email}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Chọn Gói tập *
                </label>
                <select
                  required
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
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
                  <option value="">-- Chọn gói tập --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category}) - {Number(p.price).toLocaleString("vi-VN")} đ / {p.duration_days} ngày
                    </option>
                  ))}
                </select>
              </div>

              {pkgSelectedObj && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#f1f5f9",
                    borderRadius: 8,
                    marginBottom: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {previewDiscount > 0 ? `Sau giảm (${matchedPromo.code} -${previewDiscount.toLocaleString("vi-VN")} đ):` : "Thành tiền gói tập:"}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                      {previewTotal.toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#475569" }}>
                    Thời hạn kích hoạt: <strong>{pkgSelectedObj.duration_days} ngày</strong>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Mã ưu đãi (tuỳ chọn)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Nhập mã voucher..."
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      fontSize: "0.85rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      outline: "none",
                      textTransform: "uppercase",
                    }}
                  />
                  {promotions.filter((pr) => pr.active !== false).length > 0 && (
                    <select
                      value={cleanPromoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      style={{
                        maxWidth: 180,
                        padding: "8px 8px",
                        fontSize: "0.82rem",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        background: "#fff",
                      }}
                    >
                      <option value="">-- Chọn mã --</option>
                      {promotions
                        .filter((pr) => pr.active !== false)
                        .map((pr) => (
                          <option key={pr.id} value={pr.code}>
                            {pr.code} ({pr.discount_type === "PERCENT" ? `-${pr.discount_value}%` : `-${Number(pr.discount_value).toLocaleString("vi-VN")}đ`})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Hình thức thanh toán
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { id: "CASH", label: "Tiền mặt" },
                    { id: "TRANSFER", label: "Chuyển khoản QR" },
                    { id: "POS", label: "Quẹt thẻ POS" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      style={{
                        padding: "8px",
                        borderRadius: 6,
                        border: paymentMethod === m.id ? "2px solid #dc2626" : "1px solid #cbd5e1",
                        background: paymentMethod === m.id ? "#fef2f2" : "#ffffff",
                        color: paymentMethod === m.id ? "#dc2626" : "#475569",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  Trạng thái hóa đơn
                </label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.84rem" }}>
                    <input
                      type="radio"
                      name="orderStatus"
                      checked={orderStatus === "PAID"}
                      onChange={() => setOrderStatus("PAID")}
                    />
                    <span style={{ fontWeight: 600, color: "#16a34a" }}>Đã thu tiền & Kích hoạt gói ngay</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.84rem" }}>
                    <input
                      type="radio"
                      name="orderStatus"
                      checked={orderStatus === "PENDING"}
                      onChange={() => setOrderStatus("PENDING")}
                    />
                    <span style={{ fontWeight: 600, color: "#b45309" }}>Lưu chờ thu tiền</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
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
                  {submitting ? "Đang xử lý..." : "Lập hóa đơn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: XEM CHI TIẾT & IN HÓA ĐƠN
         ======================================================== */}
      {viewInvoice && (
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
              padding: "24px 28px",
            }}
          >
            {/* Header Receipt */}
            <div style={{ textAlign: "center", borderBottom: "1px dashed #cbd5e1", paddingBottom: 16 }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a" }}>OPTIGYM FITNESS</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>PHIẾU THU TIỀN DỊCH VỤ / HÓA ĐƠN</div>
              <div style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 700, marginTop: 4 }}>
                MÃ: {viewInvoice.reference}
              </div>
            </div>

            <div style={{ padding: "16px 0", fontSize: "0.85rem", color: "#334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Khách hàng:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{viewInvoice.member_name || "Hội viên"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Mã hội viên:</span>
                <span>{viewInvoice.member_code || "OG-MEMBER"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Gói đăng ký:</span>
                <span style={{ fontWeight: 600 }}>{viewInvoice.package_name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Thời hạn gói:</span>
                <span>{viewInvoice.package_days || 30} ngày</span>
              </div>
              {viewInvoice.pt_name && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#64748b" }}>Kèm HLV PT:</span>
                  <span>{viewInvoice.pt_name} ({viewInvoice.pt_sessions} buổi)</span>
                </div>
              )}
              {viewInvoice.promotion_code && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#64748b" }}>Mã ưu đãi ({viewInvoice.promotion_code}):</span>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>-{Number(viewInvoice.discount_amount || 0).toLocaleString("vi-VN")} đ</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Thanh toán:</span>
                <span>{viewInvoice.payment_method || "CASH"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Trạng thái:</span>
                <span style={{ fontWeight: 700, color: viewInvoice.status === "PAID" ? "#16a34a" : "#b45309" }}>
                  {viewInvoice.status === "PAID" ? "ĐÃ THANH TOÁN" : "CHỜ THANH TOÁN"}
                </span>
              </div>

              <div
                style={{
                  borderTop: "2px solid #0f172a",
                  paddingTop: 12,
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>TỔNG THANH TOÁN:</span>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#dc2626" }}>
                  {Number(viewInvoice.total).toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 6,
                  border: "none",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Printer size={14} />
                <span>In hóa đơn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
