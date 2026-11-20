import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  ShieldAlert,
  CheckCircle,
  XCircle,
  FileText,
  Trash2,
  Lock,
  Unlock,
  Layers3,
} from "lucide-react";
import { PageTitle } from "../../shared/ui/PageTitle.jsx";
import { Section } from "../../shared/ui/Section.jsx";
import { Button } from "../../shared/ui/Button.jsx";
import { Field } from "../../shared/ui/Field.jsx";
import { Modal } from "../../shared/ui/Modal.jsx";
import { Tag } from "../../shared/ui/Tag.jsx";
import { roleNames } from "../../shared/config/roles.js";
import { currency } from "../../shared/lib/format.js";

export function AdminUsersView({ ctx, initialRoleFilter = "ALL" }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [addModal, setAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: initialRoleFilter === "PT" || initialRoleFilter === "STAFF" ? "PT" : "MEMBER",
    specialty: "GYM",
    password: "password123",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assignModal, setAssignModal] = useState(false);
  const [ptAssignments, setPtAssignments] = useState([]);
  const [ptRequests, setPtRequests] = useState([]);
  const [assignForm, setAssignForm] = useState({ pt_id: "", member_id: "", sessions: 12, note: "" });
  const [requestSessions, setRequestSessions] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Manual Package Assignment State
  const [pkgAssignModal, setPkgAssignModal] = useState(false);
  const [pkgTargetMember, setPkgTargetMember] = useState(null);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [pkgAssignForm, setPkgAssignForm] = useState({ member_id: "", package_id: "" });
  const [pkgAssignError, setPkgAssignError] = useState("");

  useEffect(() => {
    if (initialRoleFilter) {
      setRoleFilter(initialRoleFilter);
      setNewUser((prev) => ({
        ...prev,
        role: initialRoleFilter === "PT" || initialRoleFilter === "STAFF" ? "PT" : "MEMBER",
      }));
    }
  }, [initialRoleFilter]);

  const demoUsers = [
    {
      id: 1,
      name: "Trần Minh Anh",
      email: "admin@demo.optigym",
      role: "ADMIN",
      status: "ACTIVE",
      email_verified: true,
      phone: "0901234567",
      specialty: "",
      member_code: "OG-00000001",
      created_at: "2026-10-01T08:00:00Z",
      has_cv: false,
    },
    {
      id: 201,
      name: "Lê Quốc Bảo",
      email: "pt@demo.optigym",
      role: "PT",
      status: "ACTIVE",
      email_verified: true,
      phone: "091 245 6789",
      specialty: "GYM",
      member_code: "OG-00000201",
      created_at: "2026-10-02T09:30:00Z",
      has_cv: true,
    },
    {
      id: 202,
      name: "Phạm Đức Huy",
      email: "huy@demo.optigym",
      role: "PT",
      status: "PENDING",
      email_verified: true,
      phone: "094 678 9012",
      specialty: "BOXING",
      member_code: "OG-00000202",
      created_at: "2026-11-10T14:15:00Z",
      has_cv: true,
    },
    {
      id: 101,
      name: "Nguyễn Khánh Linh",
      email: "linh@demo.optigym",
      role: "MEMBER",
      status: "ACTIVE",
      email_verified: true,
      phone: "090 234 5600",
      specialty: "",
      member_code: "OG-00000101",
      created_at: "2026-10-05T10:00:00Z",
      has_cv: false,
    },
    {
      id: 102,
      name: "Phạm Hoàng Nam",
      email: "nam@demo.optigym",
      role: "MEMBER",
      status: "ACTIVE",
      email_verified: true,
      phone: "090 234 5601",
      specialty: "",
      member_code: "OG-00000102",
      created_at: "2026-10-12T11:20:00Z",
      has_cv: false,
    },
    {
      id: 103,
      name: "Lê Thanh Trúc",
      email: "truc@demo.optigym",
      role: "MEMBER",
      status: "ACTIVE",
      email_verified: false,
      phone: "090 234 5602",
      specialty: "",
      member_code: "OG-00000103",
      created_at: "2026-11-12T16:45:00Z",
      has_cv: false,
    },
  ];

  async function loadUsers() {
    setLoading(true);
    if (ctx.user.demo) {
      setUsers(demoUsers);
      setLoading(false);
      return;
    }
    try {
      const data = await ctx.api("/admin/users?role=ALL");
      setUsers(data);
    } catch (e) {
      ctx.flash(e.message || "Không thể tải danh sách tài khoản");
      setUsers(demoUsers);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [ctx.user?.demo]);

  async function changeStatus(user, newStatus) {
    if (user.role === "ADMIN") {
      ctx.flash("Không thể sửa trạng thái tài khoản quản trị viên.");
      return;
    }
    if (ctx.user.demo) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      ctx.flash(`[Demo] Đã chuyển tài khoản sang trạng thái ${newStatus}`);
      return;
    }
    try {
      await ctx.api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: user.name,
          phone: user.phone || "",
          specialty: user.specialty || "",
          status: newStatus,
        }),
      });
      ctx.flash(`Đã cập nhật trạng thái tài khoản ${user.name}`);
      loadUsers();
    } catch (e) {
      ctx.flash(e.message);
    }
  }

  function deleteUser(user) {
    if (user.role === "ADMIN") {
      ctx.flash("Không thể xóa tài khoản Quản trị viên.");
      return;
    }
    setDeleteTarget(user);
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    if (ctx.user.demo) {
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      setDeleteTarget(null);
      ctx.flash("[Demo] Đã xóa tài khoản.");
      return;
    }
    setBusy(true);
    try {
      await ctx.api(`/admin/users/${target.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      ctx.flash(`Đã xóa tài khoản ${target.name}`);
      loadUsers();
    } catch (e) {
      ctx.flash(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (ctx.user.demo) {
      const id = Date.now();
      const code = `OG-${String(id).slice(-8)}`;
      setUsers((prev) => [
        {
          ...newUser,
          id,
          member_code: code,
          status: "ACTIVE",
          email_verified: true,
          created_at: new Date().toISOString(),
          has_cv: false,
        },
        ...prev,
      ]);
      setAddModal(false);
      ctx.flash("[Demo] Đã tạo tài khoản mới.");
      setBusy(false);
      return;
    }
    try {
      await ctx.api("/admin/members", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      setAddModal(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        role: "MEMBER",
        specialty: "GYM",
        password: "password123",
      });
      ctx.flash("Đã thêm tài khoản mới thành công.");
      loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      const matchCode = u.member_code?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchCode) return false;
    }
    return true;
  });

  const pendingPtCount = users.filter((u) => u.role === "PT" && u.status === "PENDING").length;
  const isPendingPtQuickActive = roleFilter === "PT" && statusFilter === "PENDING";
  const activePts = users.filter((u) => u.role === "PT" && u.status === "ACTIVE");
  const activeMembers = users.filter((u) => u.role === "MEMBER" && u.status === "ACTIVE");

  async function openAssignModal() {
    setAssignModal(true);
    setAssignForm((prev) => ({
      ...prev,
      pt_id: prev.pt_id || (activePts[0]?.id ? String(activePts[0].id) : ""),
      member_id: prev.member_id || (activeMembers[0]?.id ? String(activeMembers[0].id) : ""),
    }));
    if (ctx.user.demo) return;
    try {
      const [asg, reqs] = await Promise.all([
        ctx.api("/admin/pt-assignments").catch(() => []),
        ctx.api("/admin/pt-assignment-requests").catch(() => []),
      ]);
      setPtAssignments(Array.isArray(asg) ? asg : []);
      setPtRequests(Array.isArray(reqs) ? reqs : []);
    } catch {
      // ignore
    }
  }

  async function handleAssignPt(e) {
    e.preventDefault();
    if (!assignForm.pt_id || !assignForm.member_id) return;
    setBusy(true);
    try {
      if (!ctx.user.demo) {
        await ctx.api("/admin/pt-assignments", {
          method: "POST",
          body: JSON.stringify({
            pt_id: Number(assignForm.pt_id),
            member_id: Number(assignForm.member_id),
            sessions: Number(assignForm.sessions) || 12,
            note: assignForm.note,
          }),
        });
        const asg = await ctx.api("/admin/pt-assignments").catch(() => []);
        setPtAssignments(Array.isArray(asg) ? asg : []);
      }
      ctx.flash("Đã gán PT & cấp số buổi tập cho hội viên");
    } catch (err) {
      ctx.flash(err.message || "Không thể gán PT");
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewRequest(reqId, status) {
    const chosenSessions = Math.max(1, Number(requestSessions[reqId] ?? 12) || 12);
    setBusy(true);
    try {
      if (!ctx.user.demo) {
        await ctx.api(`/admin/pt-assignment-requests/${reqId}`, {
          method: "PATCH",
          body: JSON.stringify({ status, sessions: chosenSessions }),
        });
        const [asg, reqs] = await Promise.all([
          ctx.api("/admin/pt-assignments").catch(() => []),
          ctx.api("/admin/pt-assignment-requests").catch(() => []),
        ]);
        setPtAssignments(Array.isArray(asg) ? asg : []);
        setPtRequests(Array.isArray(reqs) ? reqs : []);
      }
      ctx.flash(status === "APPROVED" ? `Đã duyệt đề xuất phân công PT (${chosenSessions} buổi)` : "Đã từ chối đề xuất");
    } catch (err) {
      ctx.flash(err.message || "Không thể xử lý đề xuất");
    } finally {
      setBusy(false);
    }
  }

  async function openPkgAssignModal(member = null) {
    setPkgTargetMember(member);
    setPkgAssignError("");
    const fallbackPkgs = Array.isArray(ctx?.data?.packages) ? ctx.data.packages : [];
    let pkgs = availablePackages.length ? availablePackages : fallbackPkgs;
    if (!ctx.user.demo && !availablePackages.length) {
      try {
        const res = await ctx.api("/admin/packages");
        if (Array.isArray(res) && res.length) {
          pkgs = res;
          setAvailablePackages(res);
        }
      } catch {
        // use fallback
      }
    } else if (fallbackPkgs.length && !availablePackages.length) {
      setAvailablePackages(fallbackPkgs);
    }
    const activePkgs = pkgs.filter((p) => p.active !== false);
    setPkgAssignForm({
      member_id: member?.id ? String(member.id) : activeMembers[0]?.id ? String(activeMembers[0].id) : "",
      package_id: activePkgs[0]?.id ? String(activePkgs[0].id) : "",
    });
    setPkgAssignModal(true);
  }

  async function handleAssignPackageSubmit(e) {
    e.preventDefault();
    if (!pkgAssignForm.member_id || !pkgAssignForm.package_id) {
      setPkgAssignError("Vui lòng chọn hội viên và gói tập");
      return;
    }
    setBusy(true);
    setPkgAssignError("");
    try {
      const memberId = Number(pkgAssignForm.member_id);
      const packageId = Number(pkgAssignForm.package_id);
      const pkg = availablePackages.find((p) => Number(p.id) === packageId);
      if (ctx.user.demo) {
        const days = Number(pkg?.duration_days || 30);
        const ends = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === memberId
              ? { ...u, package_name: pkg?.name || "Gói tập", ends_on: ends, days_left: days }
              : u
          )
        );
        ctx.flash(`[Demo] Đã gán gói ${pkg?.name || ""} cho hội viên`);
      } else {
        await ctx.api("/admin/subscriptions", {
          method: "POST",
          body: JSON.stringify({ member_id: memberId, package_id: packageId }),
        });
        await loadUsers();
        ctx.flash("Đã gán / gia hạn gói tập cho hội viên thành công");
      }
      setPkgAssignModal(false);
    } catch (err) {
      setPkgAssignError(err.message || "Không thể gán gói tập");
    } finally {
      setBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <PageTitle
        title="Quản lý tài khoản & phân quyền"
        description="Xem danh sách người dùng, cấp quyền, duyệt đơn đăng ký Huấn luyện viên và kiểm soát trạng thái tài khoản."
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0, maxWidth: 320 }}>
            <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted, #9ca3af)" }} />
            <input
              type="text"
              placeholder="Tìm theo tên, email, sđt, mã..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              style={{
                paddingLeft: 34,
                paddingRight: 12,
                height: 38,
                borderRadius: 4,
                border: "1px solid var(--border, #d1d5db)",
                width: "100%",
              }}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            style={{ height: 38, padding: "0 10px", borderRadius: 4, border: "1px solid var(--border, #d1d5db)", maxWidth: "100%" }}
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="MEMBER">Hội viên (MEMBER)</option>
            <option value="PT">Huấn luyện viên (PT)</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ height: 38, padding: "0 10px", borderRadius: 4, border: "1px solid var(--border, #d1d5db)", maxWidth: "100%" }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            <option value="PENDING">Chờ duyệt (PENDING)</option>
            <option value="DISABLED">Bị khóa (DISABLED)</option>
            <option value="REJECTED">Từ chối (REJECTED)</option>
          </select>

          <button
            type="button"
            onClick={() => {
              if (isPendingPtQuickActive) {
                setRoleFilter(initialRoleFilter || "ALL");
                setStatusFilter("ALL");
              } else {
                setRoleFilter("PT");
                setStatusFilter("PENDING");
              }
              setPage(1);
            }}
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 6,
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: "pointer",
              border: isPendingPtQuickActive ? "1px solid #dc2626" : "1px solid #fed7aa",
              background: isPendingPtQuickActive ? "#dc2626" : "#fff7ed",
              color: isPendingPtQuickActive ? "#ffffff" : "#c2410c",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>PT chờ duyệt</span>
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 99,
                fontSize: "0.75rem",
                background: isPendingPtQuickActive ? "rgba(255,255,255,0.22)" : "#ffedd5",
              }}
            >
              {pendingPtCount}
            </span>
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button quiet type="button" onClick={() => openPkgAssignModal(null)}>
            <Layers3 size={16} style={{ marginRight: 6 }} /> Gán gói tập
          </Button>
          <Button quiet type="button" onClick={openAssignModal}>
            <Users size={16} style={{ marginRight: 6 }} /> Phân công PT &amp; Hợp đồng
          </Button>
          <Button onClick={() => setAddModal(true)}>
            <UserPlus size={16} style={{ marginRight: 6 }} /> Thêm tài khoản
          </Button>
        </div>
      </div>

      <Section>
        {loading ? (
          <p style={{ padding: 20, textAlign: "center" }}>Đang tải danh sách tài khoản...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 30, textAlign: "center", color: "var(--muted, #6b7280)" }}>
            Không tìm thấy tài khoản phù hợp với điều kiện lọc.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.92rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)", background: "rgba(0,0,0,0.02)" }}>
                  <th style={{ padding: "12px 10px" }}>Tài khoản</th>
                  <th style={{ padding: "12px 10px" }}>Email & SĐT</th>
                  <th style={{ padding: "12px 10px" }}>Vai trò</th>
                  <th style={{ padding: "12px 10px" }}>Mã / Chuyên môn</th>
                  <th style={{ padding: "12px 10px" }}>Xác thực</th>
                  <th style={{ padding: "12px 10px" }}>Trạng thái</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                    <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                      {u.name}
                      {u.id === ctx.user.id && (
                        <span style={{ marginLeft: 6, fontSize: "0.75rem", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                          Bạn
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 10px", overflowWrap: "anywhere", maxWidth: 260 }}>
                      <div>{u.email}</div>
                      <small style={{ color: "var(--muted, #6b7280)" }}>{u.phone || "—"}</small>
                    </td>
                    <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                      <Tag
                        kind={
                          u.role === "ADMIN" ? "danger" : u.role === "PT" ? "warning" : "default"
                        }
                      >
                        {roleNames[u.role] || u.role}
                      </Tag>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {u.member_code && <code style={{ fontSize: "0.85rem" }}>{u.member_code}</code>}
                      {u.role === "MEMBER" && (
                        <div style={{ marginTop: 3, fontSize: "0.78rem" }}>
                          {u.package_name ? (
                            <span style={{ color: Number(u.days_left) >= 0 ? "#15803d" : "#dc2626", fontWeight: 600 }}>
                              {u.package_name} ({Number(u.days_left) >= 0 ? `còn ${u.days_left} ngày` : `hết hạn ${String(u.ends_on).slice(0, 10)}`})
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Chưa có gói tập</span>
                          )}
                        </div>
                      )}
                      {u.specialty && (
                        <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted, #6b7280)" }}>
                          {u.specialty}
                        </span>
                      )}
                      {u.has_cv && (
                        ctx.user.demo ? (
                          <button
                            type="button"
                            onClick={() => ctx.flash("[Demo] Chức năng tải CV chỉ khả dụng khi đăng nhập thật.")}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "#2563eb", marginTop: 4, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                          >
                            <FileText size={13} /> Xem CV (Mẫu)
                          </button>
                        ) : (
                          <a
                            href={`/api/admin/trainers/${u.id}/cv`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "#2563eb", marginTop: 4 }}
                          >
                            <FileText size={13} /> Xem CV
                          </a>
                        )
                      )}
                    </td>
                    <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                      {u.email_verified ? (
                        <span style={{ color: "#16a34a", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={14} /> Đã xác thực
                        </span>
                      ) : (
                        <span style={{ color: "#ca8a04", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
                          <ShieldAlert size={14} /> Chờ OTP
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          background:
                            u.status === "ACTIVE"
                              ? "#dcfce7"
                              : u.status === "PENDING"
                              ? "#fef9c3"
                              : "#fee2e2",
                          color:
                            u.status === "ACTIVE"
                              ? "#15803d"
                              : u.status === "PENDING"
                              ? "#854d0e"
                              : "#b91c1c",
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        {u.role === "MEMBER" && u.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => openPkgAssignModal(u)}
                            title={`Gia hạn / gán gói tập cho ${u.name}`}
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: 4,
                              padding: "4px 8px",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Layers3 size={13} /> Gán gói
                          </button>
                        )}
                        {u.role === "PT" && u.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => changeStatus(u, "ACTIVE")}
                              title="Duyệt đơn PT"
                              style={{
                                background: "#16a34a",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Duyệt PT
                            </button>
                            <button
                              type="button"
                              onClick={() => changeStatus(u, "REJECTED")}
                              title="Từ chối đơn PT"
                              style={{
                                background: "#dc2626",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                              }}
                            >
                              Từ chối
                            </button>
                          </>
                        )}

                        {u.role !== "ADMIN" && (
                          u.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => changeStatus(u, "DISABLED")}
                              title="Khóa tài khoản"
                              style={{
                                background: "transparent",
                                border: "1px solid #d1d5db",
                                borderRadius: 4,
                                padding: "4px 6px",
                                cursor: "pointer",
                                color: "#6b7280",
                              }}
                            >
                              <Lock size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => changeStatus(u, "ACTIVE")}
                              title="Mở khóa tài khoản"
                              style={{
                                background: "transparent",
                                border: "1px solid #16a34a",
                                borderRadius: 4,
                                padding: "4px 6px",
                                cursor: "pointer",
                                color: "#16a34a",
                              }}
                            >
                              <Unlock size={14} />
                            </button>
                          )
                        )}

                        {u.role !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => deleteUser(u)}
                            title="Xóa tài khoản"
                            style={{
                              background: "transparent",
                              border: "1px solid #fca5a5",
                              borderRadius: 4,
                              padding: "4px 6px",
                              cursor: "pointer",
                              color: "#ef4444",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 10px", borderTop: "1px solid var(--border, #e5e7eb)", fontSize: "0.85rem" }}>
                <span>Hiển thị {visibleRows.length} / {filtered.length} tài khoản</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Button quiet type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    Trang trước
                  </Button>
                  <span>{currentPage} / {totalPages}</span>
                  <Button quiet type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                    Trang sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {addModal && (
        <Modal title="Thêm tài khoản mới" onClose={() => setAddModal(false)}>
          <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field
              label="Họ và tên"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
              minLength={2}
              maxLength={120}
            />
            <Field
              label="Email đăng nhập"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
              maxLength={255}
            />
            <Field
              label="Số điện thoại"
              type="tel"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              maxLength={30}
            />
            <div>
              <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>
                Vai trò
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                style={{ width: "100%", height: 38, borderRadius: 4, border: "1px solid #d1d5db", padding: "0 10px" }}
              >
                <option value="MEMBER">Hội viên (MEMBER)</option>
                <option value="PT">Huấn luyện viên (PT)</option>
              </select>
            </div>

            {newUser.role === "PT" && (
              <div>
                <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>
                  Chuyên môn
                </label>
                <select
                  value={newUser.specialty}
                  onChange={(e) => setNewUser({ ...newUser, specialty: e.target.value })}
                  style={{ width: "100%", height: 38, borderRadius: 4, border: "1px solid #d1d5db", padding: "0 10px" }}
                >
                  <option value="GYM">GYM & BODYBUILDING</option>
                  <option value="YOGA">YOGA & MOBILITY</option>
                  <option value="BOXING">BOXING & MARTIAL ARTS</option>
                </select>
              </div>
            )}

            <Field
              label="Mật khẩu khởi tạo"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              minLength={6}
              maxLength={128}
            />

            {error && <p role="alert" style={{ color: "#ef4444", fontSize: "0.88rem" }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <Button quiet type="button" onClick={() => setAddModal(false)}>
                Hủy
              </Button>
              <Button disabled={busy} type="submit">
                {busy ? "Đang tạo…" : "Tạo tài khoản"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {assignModal && (
        <Modal
          title="Phân công PT & Hợp đồng buổi tập 1-1"
          description="Gán huấn luyện viên cho hội viên tại quầy hoặc duyệt đề xuất nhận học viên từ PT."
          onClose={() => setAssignModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <form onSubmit={handleAssignPt} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, marginBottom: 4 }}>
                    Huấn luyện viên (PT) *
                  </label>
                  <select
                    value={assignForm.pt_id}
                    onChange={(e) => setAssignForm({ ...assignForm, pt_id: e.target.value })}
                    required
                    style={{ width: "100%", height: 38, borderRadius: 4, border: "1px solid #d1d5db", padding: "0 8px" }}
                  >
                    <option value="">-- Chọn PT --</option>
                    {activePts.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name} ({pt.specialty || "GYM"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, marginBottom: 4 }}>
                    Hội viên *
                  </label>
                  <select
                    value={assignForm.member_id}
                    onChange={(e) => setAssignForm({ ...assignForm, member_id: e.target.value })}
                    required
                    style={{ width: "100%", height: 38, borderRadius: 4, border: "1px solid #d1d5db", padding: "0 8px" }}
                  >
                    <option value="">-- Chọn Hội viên --</option>
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.member_code || `#${m.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10 }}>
                <Field
                  label="Số buổi PT cấp"
                  type="number"
                  min={1}
                  max={300}
                  value={assignForm.sessions}
                  onChange={(e) => setAssignForm({ ...assignForm, sessions: e.target.value })}
                />
                <Field
                  label="Ghi chú hợp đồng"
                  value={assignForm.note}
                  onChange={(e) => setAssignForm({ ...assignForm, note: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit" disabled={busy}>
                  Lưu phân công PT
                </Button>
              </div>
            </form>

            {ptRequests.filter((r) => r.status === "PENDING").length > 0 && (
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                <strong style={{ fontSize: "0.88rem", display: "block", marginBottom: 8 }}>
                  Đề xuất nhận học viên từ PT chờ duyệt
                </strong>
                {ptRequests
                  .filter((r) => r.status === "PENDING")
                  .map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        background: "#f8fafc",
                        borderRadius: 6,
                        marginBottom: 6,
                        fontSize: "0.84rem",
                      }}
                    >
                      <div>
                        <b>{r.pt_name}</b> đề xuất nhận <b>{r.member_name}</b> ({r.member_code})
                        {r.note ? <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{r.note}</div> : null}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          aria-label="Số buổi duyệt"
                          value={requestSessions[r.id] ?? 12}
                          onChange={(e) => setRequestSessions((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          style={{ width: 62, height: 32, borderRadius: 4, border: "1px solid #d1d5db", padding: "0 6px", fontSize: "0.82rem" }}
                        />
                        <Button type="button" disabled={busy} onClick={() => handleReviewRequest(r.id, "APPROVED")}>
                          Duyệt
                        </Button>
                        <Button quiet type="button" disabled={busy} onClick={() => handleReviewRequest(r.id, "REJECTED")}>
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {ptAssignments.length > 0 && (
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, maxHeight: 180, overflowY: "auto" }}>
                <strong style={{ fontSize: "0.88rem", display: "block", marginBottom: 8 }}>
                  Hợp đồng PT đang hiệu lực ({ptAssignments.length})
                </strong>
                {ptAssignments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.82rem",
                      padding: "6px 0",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <span>
                      PT <b>{a.pt_name}</b> &rarr; <b>{a.member_name}</b> ({a.member_code})
                    </span>
                    <span style={{ fontWeight: 700, color: "#15803d" }}>
                      Còn {a.remaining_sessions}/{a.total_sessions} buổi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {pkgAssignModal && (
        <Modal
          title={pkgTargetMember ? `Gia hạn / Gán gói tập cho ${pkgTargetMember.name}` : "Gán gói tập thủ công cho Hội viên"}
          description="Gói tập sẽ tự động nối tiếp hạn hiện tại (nếu hội viên đang còn hạn) hoặc bắt đầu từ hôm nay."
          onClose={() => setPkgAssignModal(false)}
        >
          <form onSubmit={handleAssignPackageSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, marginBottom: 4 }}>
                Hội viên nhận gói *
              </label>
              <select
                value={pkgAssignForm.member_id}
                onChange={(e) => setPkgAssignForm({ ...pkgAssignForm, member_id: e.target.value })}
                required
                style={{ width: "100%", height: 38, borderRadius: 4, border: "1px solid #d1d5db", padding: "0 10px" }}
              >
                <option value="">-- Chọn hội viên --</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.member_code || `#${m.id}`}) {m.package_name ? `— Đang có: ${m.package_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, marginBottom: 4 }}>
                Chọn gói tập đang mở bán *
              </label>
              <select
                value={pkgAssignForm.package_id}
                onChange={(e) => setPkgAssignForm({ ...pkgAssignForm, package_id: e.target.value })}
                required
                style={{ width: "100%", height: 38, borderRadius: 4, border: "1px solid #d1d5db", padding: "0 10px" }}
              >
                <option value="">-- Chọn gói tập --</option>
                {availablePackages
                  .filter((p) => p.active !== false)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category} · {p.duration_days} ngày) — {currency(p.price)}
                    </option>
                  ))}
              </select>
            </div>

            {pkgAssignError && (
              <p role="alert" style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>
                {pkgAssignError}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <Button quiet type="button" onClick={() => setPkgAssignModal(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Đang gán gói…" : "Xác nhận gán gói tập"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Xác nhận xóa tài khoản"
          description={`Thao tác này sẽ xóa vĩnh viễn tài khoản ${deleteTarget.name} (${deleteTarget.email}) cùng các phiên đăng nhập liên quan.`}
          onClose={() => !busy && setDeleteTarget(null)}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <Button quiet type="button" disabled={busy} onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button type="button" disabled={busy} onClick={confirmDeleteUser}>
              {busy ? "Đang xóa…" : "Xác nhận xóa"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
