import React, { useEffect, useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  History,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Building2,
} from "lucide-react";
import {
  EQUIPMENT_STATUS_META,
  filterEquipment,
  getServiceAlert,
  summarizeEquipment,
} from "./equipmentModel.js";

const PAGE_SIZE = 10;

const emptyEquipForm = (rooms = []) => ({
  code: "",
  name: "",
  category: "Cardio",
  room_id: rooms[0]?.id ? String(rooms[0].id) : "",
  status: "ACTIVE",
  purchased_on: "",
  next_service: "",
  notes: "",
});

function formatDateVi(value) {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? raw : dt.toLocaleString("vi-VN");
}

export function AdminEquipmentView({ ctx }) {
  const isDemo = Boolean(ctx?.user?.demo);
  const [activeTab, setActiveTab] = useState("equipment");

  const [equipment, setEquipment] = useState(() =>
    Array.isArray(ctx?.data?.equipment) ? ctx.data.equipment : []
  );
  const [rooms, setRooms] = useState(() =>
    Array.isArray(ctx?.data?.rooms) ? ctx.data.rooms : []
  );
  const [loading, setLoading] = useState(!isDemo);

  // Equipment filters & pagination
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [onlyDue, setOnlyDue] = useState(false);
  const [page, setPage] = useState(1);

  // Add/Edit Equipment modal
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState(null);
  const [equipForm, setEquipForm] = useState(() => emptyEquipForm(ctx?.data?.rooms));
  const [equipError, setEquipError] = useState("");
  const [equipBusy, setEquipBusy] = useState(false);

  // Equipment History modal
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Equipment Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Room modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({ code: "", name: "", capacity: 30, active: true });
  const [roomError, setRoomError] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);

  const loadAll = async () => {
    if (isDemo) {
      setEquipment(Array.isArray(ctx?.data?.equipment) ? ctx.data.equipment : []);
      setRooms(Array.isArray(ctx?.data?.rooms) ? ctx.data.rooms : []);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [eqRes, rmRes] = await Promise.all([
        fetch("/api/admin/equipment", { credentials: "same-origin", headers: { Accept: "application/json" } }),
        fetch("/api/rooms", { credentials: "same-origin", headers: { Accept: "application/json" } }),
      ]);
      if (eqRes.ok) {
        const eqData = await eqRes.json();
        setEquipment(Array.isArray(eqData) ? eqData : []);
      }
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        setRooms(Array.isArray(rmData) ? rmData : []);
      }
    } catch (err) {
      ctx?.flash?.("Không thể tải dữ liệu thiết bị và phòng tập");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [isDemo]);

  const stats = summarizeEquipment(equipment);
  const filtered = filterEquipment(equipment, {
    query: search,
    roomId: roomFilter,
    status: statusFilter,
    onlyDue,
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleEquipment = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Equipment CRUD handlers
  const openAddEquip = () => {
    setEditingEquip(null);
    setEquipForm(emptyEquipForm(rooms));
    setEquipError("");
    setEquipModalOpen(true);
  };

  const openEditEquip = (item) => {
    setEditingEquip(item);
    setEquipForm({
      code: item.code || "",
      name: item.name || "",
      category: item.category || "Cardio",
      room_id: item.room_id ? String(item.room_id) : rooms[0]?.id ? String(rooms[0].id) : "",
      status: item.status || "ACTIVE",
      purchased_on: item.purchased_on ? String(item.purchased_on).slice(0, 10) : "",
      next_service: item.next_service ? String(item.next_service).slice(0, 10) : "",
      notes: item.notes || "",
    });
    setEquipError("");
    setEquipModalOpen(true);
  };

  const handleEquipSubmit = async (e) => {
    e.preventDefault();
    const code = equipForm.code.trim().toUpperCase();
    const name = equipForm.name.trim();
    const category = equipForm.category.trim();
    if (code.length < 2) {
      setEquipError("Mã thiết bị cần tối thiểu 2 ký tự");
      return;
    }
    if (name.length < 2) {
      setEquipError("Tên thiết bị cần tối thiểu 2 ký tự");
      return;
    }
    if (category.length < 2) {
      setEquipError("Danh mục thiết bị cần tối thiểu 2 ký tự");
      return;
    }
    if (!equipForm.room_id) {
      setEquipError("Vui lòng chọn phòng đặt thiết bị");
      return;
    }

    const payload = {
      code,
      name,
      category,
      room_id: Number(equipForm.room_id),
      status: equipForm.status,
      purchased_on: equipForm.purchased_on || null,
      next_service: equipForm.next_service || null,
      notes: equipForm.notes.trim(),
    };

    if (isDemo) {
      const roomName = rooms.find((r) => String(r.id) === String(payload.room_id))?.name || "Phòng tập";
      if (editingEquip) {
        const next = equipment.map((it) =>
          it.id === editingEquip.id ? { ...it, ...payload, room: roomName } : it
        );
        setEquipment(next);
        ctx?.setData?.((prev) => ({ ...prev, equipment: next }));
        ctx?.flash?.("[Demo] Đã cập nhật thiết bị");
      } else {
        const created = { id: Date.now(), ...payload, room: roomName };
        const next = [created, ...equipment];
        setEquipment(next);
        ctx?.setData?.((prev) => ({ ...prev, equipment: next }));
        ctx?.flash?.("[Demo] Đã thêm thiết bị mới");
      }
      setEquipModalOpen(false);
      return;
    }

    setEquipBusy(true);
    setEquipError("");
    try {
      const url = editingEquip ? `/api/admin/equipment/${editingEquip.id}` : "/api/admin/equipment";
      const res = await fetch(url, {
        method: editingEquip ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEquipModalOpen(false);
        ctx?.flash?.(editingEquip ? "Đã cập nhật thiết bị và ghi nhật ký bảo trì" : "Đã thêm thiết bị mới");
        await loadAll();
      } else {
        const err = await res.json().catch(() => ({}));
        setEquipError(err.message || "Không thể lưu thông tin thiết bị");
      }
    } catch {
      setEquipError("Lỗi kết nối máy chủ");
    } finally {
      setEquipBusy(false);
    }
  };

  const openHistoryModal = async (item) => {
    setHistoryTarget(item);
    setHistoryError("");
    if (isDemo) {
      setHistoryRows([
        {
          id: 1,
          status: item.status,
          note: item.notes || "Kiểm tra định kỳ",
          actor: ctx?.user?.name || "OptiGym Admin",
          created_at: new Date().toISOString(),
        },
      ]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const res = await fetch(`/api/admin/equipment/${item.id}/history`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryRows(Array.isArray(data) ? data : []);
      } else {
        setHistoryError("Không tải được lịch sử thiết bị");
      }
    } catch {
      setHistoryError("Lỗi kết nối máy chủ");
    } finally {
      setHistoryLoading(false);
    }
  };

  const confirmDeleteEquip = async () => {
    if (!deleteTarget) return;
    if (isDemo) {
      const next = equipment.filter((it) => it.id !== deleteTarget.id);
      setEquipment(next);
      ctx?.setData?.((prev) => ({ ...prev, equipment: next }));
      setDeleteTarget(null);
      ctx?.flash?.("[Demo] Đã xóa thiết bị");
      return;
    }
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/equipment/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setDeleteTarget(null);
        ctx?.flash?.("Đã xóa thiết bị khỏi danh sách");
        await loadAll();
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.message || "Không thể xóa thiết bị này");
      }
    } catch {
      setDeleteError("Lỗi kết nối máy chủ");
    } finally {
      setDeleteBusy(false);
    }
  };

  // Rooms CRUD handlers
  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({ code: "", name: "", capacity: 30, active: true });
    setRoomError("");
    setRoomModalOpen(true);
  };

  const openEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm({
      code: room.code || "",
      name: room.name || "",
      capacity: room.capacity || 20,
      active: room.active !== false,
    });
    setRoomError("");
    setRoomModalOpen(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    const code = roomForm.code.trim().toUpperCase();
    const name = roomForm.name.trim();
    const capacity = Number(roomForm.capacity);
    if (!editingRoom && code.length < 2) {
      setRoomError("Mã phòng cần tối thiểu 2 ký tự");
      return;
    }
    if (name.length < 2) {
      setRoomError("Tên phòng tập cần tối thiểu 2 ký tự");
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      setRoomError("Sức chứa phải lớn hơn 0");
      return;
    }

    if (isDemo) {
      if (editingRoom) {
        const next = rooms.map((r) =>
          r.id === editingRoom.id ? { ...r, name, capacity, active: roomForm.active } : r
        );
        setRooms(next);
        ctx?.setData?.((prev) => ({ ...prev, rooms: next }));
        ctx?.flash?.("[Demo] Đã cập nhật phòng tập");
      } else {
        const created = { id: Date.now(), code, name, capacity, active: true, occupancy: 0 };
        const next = [...rooms, created];
        setRooms(next);
        ctx?.setData?.((prev) => ({ ...prev, rooms: next }));
        ctx?.flash?.("[Demo] Đã thêm phòng tập mới");
      }
      setRoomModalOpen(false);
      return;
    }

    setRoomBusy(true);
    setRoomError("");
    try {
      const url = editingRoom ? `/api/admin/rooms/${editingRoom.id}` : "/api/admin/rooms";
      const payload = editingRoom
        ? { name, capacity, active: Boolean(roomForm.active) }
        : { code, name, capacity };
      const res = await fetch(url, {
        method: editingRoom ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setRoomModalOpen(false);
        ctx?.flash?.(editingRoom ? "Đã cập nhật phòng tập" : "Đã tạo phòng tập mới");
        await loadAll();
      } else {
        const err = await res.json().catch(() => ({}));
        setRoomError(err.message || "Không thể lưu phòng tập");
      }
    } catch {
      setRoomError("Lỗi kết nối máy chủ");
    } finally {
      setRoomBusy(false);
    }
  };

  const toggleRoomActive = async (room) => {
    const nextActive = room.active === false;
    if (isDemo) {
      const next = rooms.map((r) => (r.id === room.id ? { ...r, active: nextActive } : r));
      setRooms(next);
      ctx?.setData?.((prev) => ({ ...prev, rooms: next }));
      ctx?.flash?.(`[Demo] Đã ${nextActive ? "mở" : "tạm đóng"} ${room.name}`);
      return;
    }
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: room.name,
          capacity: room.capacity,
          active: nextActive,
        }),
      });
      if (res.ok) {
        ctx?.flash?.(`Đã ${nextActive ? "mở hoạt động" : "tạm đóng"} ${room.name}`);
        await loadAll();
      } else {
        const err = await res.json().catch(() => ({}));
        ctx?.flash?.(err.message || "Không thể đổi trạng thái phòng");
      }
    } catch {
      ctx?.flash?.("Lỗi kết nối máy chủ");
    }
  };

  return (
    <div className="og-admin-view-scroll" style={{ padding: "8px 4px" }}>
      {/* Header & Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 14,
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
            <Wrench size={20} />
          </span>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Thiết bị & Phòng tập
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Theo dõi tình trạng thiết bị, lịch bảo trì và quản lý sức chứa từng phòng tập
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "#f1f5f9", padding: 4, borderRadius: 8, gap: 4 }}>
            <button
              type="button"
              onClick={() => setActiveTab("equipment")}
              style={{
                border: "none",
                padding: "7px 14px",
                borderRadius: 6,
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "equipment" ? "#0f172a" : "transparent",
                color: activeTab === "equipment" ? "#ffffff" : "#475569",
              }}
            >
              Thiết bị & Bảo trì ({equipment.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              style={{
                border: "none",
                padding: "7px 14px",
                borderRadius: 6,
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "rooms" ? "#0f172a" : "transparent",
                color: activeTab === "rooms" ? "#ffffff" : "#475569",
              }}
            >
              Phòng tập & Sức chứa ({rooms.length})
            </button>
          </div>

          <button
            type="button"
            onClick={loadAll}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} /> Làm mới
          </button>

          <button
            type="button"
            onClick={activeTab === "equipment" ? openAddEquip : openAddRoom}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            <span>{activeTab === "equipment" ? "Thêm thiết bị" : "Thêm phòng tập"}</span>
          </button>
        </div>
      </div>

      {activeTab === "equipment" ? (
        <>
          {/* KPI Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div className="og-admin-card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>TỔNG THIẾT BỊ</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                {stats.total}
              </div>
            </div>
            <div className="og-admin-card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: 700 }}>ĐANG HOẠT ĐỘNG</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#15803d", marginTop: 4 }}>
                {stats.active}
              </div>
            </div>
            <div className="og-admin-card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "0.75rem", color: "#b45309", fontWeight: 700 }}>ĐANG BẢO TRÌ / HỎNG</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#b45309", marginTop: 4 }}>
                {stats.maintenance + stats.broken}
              </div>
            </div>
            <button
              type="button"
              className="og-admin-card"
              onClick={() => {
                setOnlyDue((v) => !v);
                setPage(1);
              }}
              style={{
                padding: "14px 16px",
                textAlign: "left",
                cursor: "pointer",
                border: onlyDue ? "2px solid #dc2626" : undefined,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 700 }}>
                CẦN XỬ LÝ / ĐẾN HẠN BẢO TRÌ
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
                {stats.serviceDue}
              </div>
            </button>
          </div>

          {/* Filter Bar */}
          <div
            className="og-admin-card og-admin-filter-bar"
            style={{
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: "1 1 320px" }}>
              <div style={{ position: "relative", flex: "1 1 210px", maxWidth: 300 }}>
                <Search
                  size={15}
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Tìm mã, tên, loại thiết bị..."
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

              <select
                value={roomFilter}
                onChange={(e) => {
                  setRoomFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "7px 10px",
                  fontSize: "0.84rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  background: "#fff",
                }}
              >
                <option value="ALL">Tất cả phòng</option>
                {rooms.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setOnlyDue((v) => !v);
                  setPage(1);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: onlyDue ? "1px solid #dc2626" : "1px solid #e2e8f0",
                  background: onlyDue ? "#fef2f2" : "#fff",
                  color: onlyDue ? "#dc2626" : "#475569",
                  cursor: "pointer",
                }}
              >
                <AlertTriangle size={13} />
                Đến hạn bảo trì ({stats.serviceDue})
              </button>
            </div>

            <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "ACTIVE", label: "Hoạt động" },
                { id: "MAINTENANCE", label: "Bảo trì" },
                { id: "BROKEN", label: "Hỏng" },
                { id: "RETIRED", label: "Ngừng dùng" },
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
                    padding: "5px 10px",
                    borderRadius: 5,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: statusFilter === s.id ? "#0f172a" : "#f1f5f9",
                    color: statusFilter === s.id ? "#ffffff" : "#475569",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Table */}
          <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="og-admin-table" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr>
                    <th>MÃ THIẾT BỊ</th>
                    <th>TÊN & LOẠI</th>
                    <th>PHÒNG</th>
                    <th>TRẠNG THÁI</th>
                    <th>BẢO TRÌ KẾ TIẾP</th>
                    <th style={{ textAlign: "right" }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                        Đang tải danh sách thiết bị...
                      </td>
                    </tr>
                  ) : visibleEquipment.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: 36, color: "#94a3b8" }}>
                        Chưa có thiết bị nào khớp điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    visibleEquipment.map((item) => {
                      const st = EQUIPMENT_STATUS_META[item.status] || EQUIPMENT_STATUS_META.ACTIVE;
                      const alert = getServiceAlert(item.next_service);
                      return (
                        <tr key={item.id}>
                          <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                            {item.code}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                              {item.category}
                              {item.notes ? ` · ${item.notes}` : ""}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#334155" }}>
                              {item.room || "—"}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 9px",
                                borderRadius: 20,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: st.bg,
                                color: st.color,
                              }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0f172a" }}>
                              {formatDateVi(item.next_service)}
                            </div>
                            {alert.level !== "NONE" && (
                              <div
                                style={{
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  color:
                                    alert.level === "OVERDUE"
                                      ? "#dc2626"
                                      : alert.level === "DUE_SOON"
                                      ? "#b45309"
                                      : "#64748b",
                                }}
                              >
                                {alert.label}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => openEditEquip(item)}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  background: "#fff",
                                  padding: "5px 9px",
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
                                <Edit2 size={12} /> Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => openHistoryModal(item)}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  padding: "5px 9px",
                                  borderRadius: 5,
                                  cursor: "pointer",
                                  color: "#334155",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.76rem",
                                  fontWeight: 600,
                                }}
                              >
                                <History size={12} /> Lịch sử
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
                                  padding: "5px 9px",
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
                                <Trash2 size={12} /> Xóa
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
                  Hiển thị {visibleEquipment.length} / {filtered.length} thiết bị
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
        </>
      ) : (
        /* Rooms Tab */
        <div className="og-admin-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="og-admin-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>MÃ PHÒNG</th>
                  <th>TÊN PHÒNG TẬP</th>
                  <th>HIỆN TẠI / SỨC CHỨA</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                      Đang tải danh sách phòng...
                    </td>
                  </tr>
                ) : rooms.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 36, color: "#94a3b8" }}>
                      Chưa có phòng tập nào trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  rooms.map((room) => {
                    const occupancy = Number(room.occupancy || 0);
                    const capacity = Math.max(1, Number(room.capacity || 1));
                    const pct = Math.min(100, Math.round((occupancy / capacity) * 100));
                    const isActive = room.active !== false;
                    return (
                      <tr key={room.id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                          {room.code}
                        </td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#0f172a" }}>
                            <Building2 size={14} color="#dc2626" />
                            {room.name}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>
                            {occupancy} / {room.capacity} người ({pct}%)
                          </div>
                          <div style={{ width: 140, height: 6, background: "#f1f5f9", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: pct >= 85 ? "#dc2626" : pct >= 60 ? "#f59e0b" : "#16a34a",
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => toggleRoomActive(room)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                              background: isActive ? "#dcfce7" : "#f1f5f9",
                              color: isActive ? "#15803d" : "#64748b",
                            }}
                          >
                            {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {isActive ? "Đang mở" : "Tạm đóng"}
                          </button>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => openEditRoom(room)}
                            style={{
                              border: "1px solid #e2e8f0",
                              background: "#fff",
                              padding: "5px 10px",
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
                            <Edit2 size={12} /> Chỉnh sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Equipment */}
      {equipModalOpen && (
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
              borderRadius: 12,
              width: "100%",
              maxWidth: 540,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Wrench size={18} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "#0f172a" }}>
                  {editingEquip ? "Cập nhật thiết bị & bảo trì" : "Thêm thiết bị mới"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEquipModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEquipSubmit} style={{ padding: "18px 20px" }}>
              {equipError && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    color: "#dc2626",
                    fontSize: "0.82rem",
                    marginBottom: 14,
                  }}
                >
                  {equipError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Mã thiết bị *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="VD: GYM-TM-001"
                    value={equipForm.code}
                    onChange={(e) => setEquipForm({ ...equipForm, code: e.target.value.toUpperCase() })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Tên thiết bị *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="VD: Máy chạy bộ Technogym"
                    value={equipForm.name}
                    onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Danh mục *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={equipForm.category}
                    onChange={(e) => setEquipForm({ ...equipForm, category: e.target.value })}
                    placeholder="Cardio, Sức mạnh..."
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Phòng đặt *
                  </label>
                  <select
                    value={equipForm.room_id}
                    onChange={(e) => setEquipForm({ ...equipForm, room_id: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", fontSize: "0.85rem" }}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Trạng thái *
                  </label>
                  <select
                    value={equipForm.status}
                    onChange={(e) => setEquipForm({ ...equipForm, status: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", fontSize: "0.85rem" }}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Đang bảo trì</option>
                    <option value="BROKEN">Đang hỏng</option>
                    <option value="RETIRED">Ngừng sử dụng</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Ngày mua / nhập kho
                  </label>
                  <input
                    type="date"
                    value={equipForm.purchased_on}
                    onChange={(e) => setEquipForm({ ...equipForm, purchased_on: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Hạn bảo trì kế tiếp
                  </label>
                  <input
                    type="date"
                    value={equipForm.next_service}
                    onChange={(e) => setEquipForm({ ...equipForm, next_service: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                  Ghi chú / Nội dung bảo trì (lưu vào nhật ký)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={equipForm.notes}
                  onChange={(e) => setEquipForm({ ...equipForm, notes: e.target.value })}
                  placeholder="Mô tả tình trạng, hạng mục vừa thay thế hoặc cần kiểm tra..."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.84rem", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEquipModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={equipBusy}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {equipBusy ? "Đang lưu..." : editingEquip ? "Lưu thay đổi" : "Thêm thiết bị"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal History */}
      {historyTarget && (
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
              borderRadius: 12,
              width: "100%",
              maxWidth: 520,
              maxHeight: "82vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                  Lịch sử bảo trì · {historyTarget.code}
                </h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{historyTarget.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, overflowY: "auto" }}>
              {historyLoading ? (
                <div style={{ textAlign: "center", color: "#64748b", padding: 20 }}>Đang tải lịch sử...</div>
              ) : historyError ? (
                <div style={{ color: "#dc2626", fontSize: "0.84rem" }}>{historyError}</div>
              ) : historyRows.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>Chưa có nhật ký sự kiện.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {historyRows.map((ev) => {
                    const st = EQUIPMENT_STATUS_META[ev.status] || EQUIPMENT_STATUS_META.ACTIVE;
                    return (
                      <div
                        key={ev.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "10px 12px",
                          background: "#f8fafc",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: st.bg,
                              color: st.color,
                            }}
                          >
                            {st.label}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {formatDateVi(ev.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.84rem", color: "#0f172a", fontWeight: 500 }}>
                          {ev.note || "Cập nhật trạng thái thiết bị"}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 4 }}>
                          Thực hiện bởi: {ev.actor || "Hệ thống"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Equipment */}
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
          <div style={{ background: "#fff", borderRadius: 10, padding: 24, maxWidth: 420, width: "100%" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              Xác nhận xóa thiết bị {deleteTarget.code}?
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: "0.84rem", color: "#64748b", lineHeight: 1.5 }}>
              Thiết bị <strong>{deleteTarget.name}</strong> cùng lịch sử sự kiện đi kèm sẽ bị xóa vĩnh viễn. Nếu thiết bị chỉ ngừng khai thác, hãy đổi trạng thái sang &ldquo;Ngừng sử dụng&rdquo;.
            </p>
            {deleteError && (
              <div style={{ marginBottom: 12, color: "#dc2626", fontSize: "0.82rem" }}>{deleteError}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={confirmDeleteEquip}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {deleteBusy ? "Đang xóa..." : "Xóa thiết bị"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Room */}
      {roomModalOpen && (
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
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 440, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={18} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "#0f172a" }}>
                  {editingRoom ? "Chỉnh sửa phòng tập" : "Thêm phòng tập mới"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRoomModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} style={{ padding: "18px 20px" }}>
              {roomError && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    color: "#dc2626",
                    fontSize: "0.82rem",
                    marginBottom: 14,
                  }}
                >
                  {roomError}
                </div>
              )}

              {!editingRoom && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                    Mã phòng *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    placeholder="VD: PILATES, FUNCTIONAL"
                    value={roomForm.code}
                    onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value.toUpperCase() })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                  Tên phòng tập *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                  Sức chứa tối đa (người) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  required
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                />
              </div>

              {editingRoom && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={roomForm.active}
                      onChange={(e) => setRoomForm({ ...roomForm, active: e.target.checked })}
                    />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Cho phép hội viên check-in vào phòng</span>
                  </label>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={roomBusy}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {roomBusy ? "Đang lưu..." : editingRoom ? "Cập nhật" : "Thêm phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
