import React, { useEffect, useMemo, useState } from "react";
import {
  Home,
  CalendarDays,
  Users,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Search,
  Play,
  ArrowRight,
  Check,
  X,
  Plus,
  Activity,
  ShieldCheck,
  Edit3,
  Award,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import heroAthlete from "./assets/hero-athlete.jpg";
import ptAvatar from "./assets/pt-avatar.jpg";
import clientFemale from "./assets/client-female.jpg";
import { ptDemoData } from "../../shared/demo/ptData.js";
import "./pt-athletic.css";

const STATUS_LABELS = {
  REQUESTED: "Chờ duyệt",
  CONFIRMED: "Đã lên lịch",
  COMPLETED: "Hoàn thành",
  MISSED: "Vắng buổi",
  CANCELLED: "Đã hủy",
  LATE_CANCELLED: "Hủy muộn (-1 buổi)",
  REJECTED: "Đã từ chối",
};

const fmtTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDateTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const defaultDatetimeLocal = () => {
  const d = new Date(Date.now() + 2 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
};

export function PtWorkspace({ ctx, page, logout, toast, setToast }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [range, setRange] = useState("all");
  const [reportPeriod, setReportPeriod] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");

  const [dash, setDash] = useState(null);
  const [reports, setReports] = useState(null);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [exerciseLib, setExerciseLib] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [busy, setBusy] = useState(false);

  // Modals & Dossier
  const [showNotifs, setShowNotifs] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [assignModalTpl, setAssignModalTpl] = useState(null);
  const [sessionFilter, setSessionFilter] = useState("ALL");

  // Forms
  const [sessForm, setSessForm] = useState({
    partner: "",
    starts_at: defaultDatetimeLocal(),
    duration_minutes: 60,
    room_id: "",
    note: "",
  });
  const [metricForm, setMetricForm] = useState({
    weight_kg: "",
    body_fat_pct: "",
    muscle_mass_kg: "",
    inbody_score: "",
    note: "",
  });
  const [logForm, setLogForm] = useState({
    program_name: "",
    duration_minutes: 60,
    feedback: "",
  });

  // Program Builder (1-1 with System Exercise Library)
  const [exGroupFilter, setExGroupFilter] = useState("Tất cả");
  const [progMemberId, setProgMemberId] = useState("");
  const [progName, setProgName] = useState("");
  const [progNotes, setProgNotes] = useState("");
  const [progPhases, setProgPhases] = useState({ warmup: 10, main: 40, cooldown: 10 });
  const [progExercises, setProgExercises] = useState([]);
  const [assignMemberId, setAssignMemberId] = useState("");
  const [reqMemberId, setReqMemberId] = useState("");
  const [reqNote, setReqNote] = useState("");

  // Profile Edit & Password
  const [editingProfile, setEditingProfile] = useState(false);
  const [profName, setProfName] = useState(ctx?.user?.name || "");
  const [profPhone, setProfPhone] = useState(ctx?.user?.phone || "");
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });

  const isDemo = Boolean(ctx?.user?.demo);
  const ptName = ctx?.user?.name || "Minh Anh";
  const showSettings = page === "settings" || activeTab === "settings";
  const notify = (msg) => ctx?.flash?.(msg);

  const buildDemoDashAndReports = (sessList, clientList, notifList) => {
    const completed = sessList.filter((s) => s.status === "COMPLETED");
    const scheduled = sessList.filter((s) => ["CONFIRMED", "COMPLETED", "MISSED", "LATE_CANCELLED"].includes(s.status));
    const rate = scheduled.length ? Math.round((completed.length * 100) / scheduled.length) : 100;
    const hours = Math.round((completed.reduce((a, b) => a + (Number(b.duration_minutes) || 60), 0) / 60) * 10) / 10;
    const todayDow = ((new Date().getDay() + 6) % 7);
    const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const weeklyBars = dayLabels.map((label, idx) => ({
      label,
      sessionsCount: idx <= todayDow ? (idx % 2 === 0 ? 2 : 1) : 1,
      hours: idx <= todayDow ? (idx % 2 === 0 ? 2 : 1) : 1,
      isToday: idx === todayDow,
    }));
    setDash({
      completionRate: rate,
      completedCount: completed.length,
      totalScheduled: scheduled.length,
      teachingHours: hours,
      activeClientsCount: clientList.length,
      todayCount: sessList.filter((s) => s.status === "CONFIRMED").length,
      unreadNotifications: notifList.filter((n) => !n.is_read).length,
      nextSession: sessList.find((s) => s.status === "CONFIRMED") || null,
      alerts: clientList.slice(0, 2).map((c, idx) => ({
        memberId: c.id,
        memberName: c.name,
        category: idx === 0 ? "Còn 2 buổi PT" : "Quá hạn InBody",
        priority: idx === 0 ? "MEDIUM" : "HIGH",
      })),
      weeklyBars,
    });
    setReports({
      currentCount: completed.length,
      prevCount: Math.max(0, completed.length - 1),
      attendanceRate: rate,
      totalCompleted: completed.length,
      totalMissed: sessList.filter((s) => ["MISSED", "LATE_CANCELLED"].includes(s.status)).length,
      activeClientsCount: clientList.length,
      series: [
        { label: "W1", count: 2, attendanceRate: 85 },
        { label: "W2", count: 3, attendanceRate: 90 },
        { label: "W3", count: 4, attendanceRate: 92 },
        { label: "W4", count: 3, attendanceRate: 88 },
        { label: "W5", count: 5, attendanceRate: 95 },
        { label: "W6", count: 4, attendanceRate: 90 },
        { label: "W7", count: completed.length, attendanceRate: rate, isCurrent: true },
      ],
      categories: [
        { name: "Huấn luyện 1-1", count: completed.length },
        { name: "Vắng / Hủy muộn", count: sessList.filter((s) => ["MISSED", "LATE_CANCELLED"].includes(s.status)).length },
      ],
    });
  };

  const loadAll = async (r = range, repP = reportPeriod) => {
    if (isDemo) {
      const seed = ptDemoData();
      const clientList = seed.clients.map((c, idx) => ({
        ...c,
        remaining_sessions: Math.max(1, 10 - idx * 2),
        total_sessions: 12,
        latest_weight: 56 + idx * 3,
      }));
      const sessList = seed.coachSessions;
      const roomList = (Array.isArray(ctx?.data?.rooms) && ctx.data.rooms.length
        ? ctx.data.rooms
        : [{ id: 1, name: "Phòng Gym", active: true }, { id: 2, name: "Phòng Yoga", active: true }]);
      const notifList = [
        { id: 1, title: "Yêu cầu đặt lịch 1-1 mới", body: `${clientList[3]?.name || "Hội viên"} vừa đặt lịch tập 1-1.`, is_read: false, created_at: new Date().toISOString() },
      ];
      const exList = [
        { id: 1, name: "Barbell Bench Press", group: "Ngực", phase: "MAIN", sets: 4, reps: "8-10", weight: "50 kg" },
        { id: 2, name: "Barbell Back Squat", group: "Chân", phase: "MAIN", sets: 4, reps: "6-8", weight: "70 kg" },
        { id: 3, name: "Lat Pulldown", group: "Lưng", phase: "MAIN", sets: 3, reps: "10-12", weight: "40 kg" },
        { id: 4, name: "Plank Core", group: "Core", phase: "COOLDOWN", sets: 3, reps: "60s", weight: "Bodyweight" },
      ];
      const tplList = [
        { id: 1, name: "Hypertrophy Thân trên", warmup_minutes: 10, main_minutes: 40, cooldown_minutes: 10, exercises: exList.slice(0, 3), notes: "Tăng tạ 2.5kg mỗi tuần" },
      ];
      setClients(clientList);
      setSessions(sessList);
      setPrograms(seed.programs);
      setTemplates(tplList);
      setExerciseLib(exList);
      setNotifications(notifList);
      setRequests([]);
      setRooms(roomList);
      buildDemoDashAndReports(sessList, clientList, notifList);
      setSessForm((f) => ({
        ...f,
        partner: f.partner || (clientList[0]?.id ? String(clientList[0].id) : ""),
        room_id: f.room_id || (roomList[0]?.id ? String(roomList[0].id) : "1"),
      }));
      setProgMemberId((prev) => prev || (clientList[0]?.id ? String(clientList[0].id) : ""));
      return;
    }
    try {
      const [d, cl, ss, pg, tp, ex, nt, rq, rm, rp] = await Promise.all([
        ctx.api(`/pt/dashboard?range=${r}`).catch(() => null),
        ctx.api("/pt/clients").catch(() => []),
        ctx.api("/coaching/sessions").catch(() => []),
        ctx.api("/coaching/programs").catch(() => []),
        ctx.api("/pt/templates").catch(() => []),
        ctx.api("/pt/exercises").catch(() => []),
        ctx.api("/pt/notifications").catch(() => []),
        ctx.api("/pt/assignment-requests").catch(() => []),
        ctx.api("/rooms").catch(() => []),
        ctx.api(`/pt/reports?period=${repP}`).catch(() => null),
      ]);
      if (d) setDash(d);
      if (rp) setReports(rp);
      const clientList = Array.isArray(cl) ? cl : [];
      setClients(clientList);
      setSessions(Array.isArray(ss) ? ss : []);
      setPrograms(Array.isArray(pg) ? pg : []);
      setTemplates(Array.isArray(tp) ? tp : []);
      setExerciseLib(Array.isArray(ex) ? ex : []);
      setNotifications(Array.isArray(nt) ? nt : []);
      setRequests(Array.isArray(rq) ? rq : []);
      const activeRooms = (Array.isArray(rm) ? rm : []).filter((x) => x.active !== false);
      setRooms(activeRooms);

      setSessForm((f) => ({
        ...f,
        partner: f.partner || (clientList[0]?.id ? String(clientList[0].id) : ""),
        room_id: f.room_id || (activeRooms[0]?.id ? String(activeRooms[0].id) : "1"),
      }));
      setProgMemberId((prev) => prev || (clientList[0]?.id ? String(clientList[0].id) : ""));
    } catch (err) {
      notify(err.message);
    }
  };

  useEffect(() => {
    loadAll(range, reportPeriod);
  }, [isDemo, range, reportPeriod]);

  const openClientDossier = async (client) => {
    setSelectedClient(client);
    if (isDemo) {
      setDossier({
        member: { ...client, created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
        metrics: [
          { id: 1, weight_kg: client.latest_weight || 62, body_fat_pct: 18.2, muscle_mass_kg: 27.4, inbody_score: 82, note: "Đo định kỳ", recorded_at: new Date().toISOString() },
        ],
        weightDelta: -0.8,
        attendance: { rate: 92, completed: 8, missed: 1, nextSession: sessions.find((s) => s.member_id === client.id && s.status === "CONFIRMED") || null },
        contracts: [{ id: 1, total_sessions: client.total_sessions || 12, remaining_sessions: client.remaining_sessions ?? 8 }],
        goals: [],
        recentSessions: sessions.filter((s) => s.member_id === client.id),
        achievements: [{ id: 1, program_name: "Thân trên & Core", feedback: "Tốt, giữ form chuẩn", completed_at: new Date().toISOString() }],
      });
      return;
    }
    try {
      const data = await ctx.api(`/pt/clients/${client.id}/dossier`);
      setDossier(data);
    } catch (err) {
      notify(err.message);
    }
  };

  const handleSessionAction = async (sessionId, status) => {
    if (isDemo) {
      const nextSessions = sessions.map((s) => (s.id === sessionId ? { ...s, status } : s));
      setSessions(nextSessions);
      buildDemoDashAndReports(nextSessions, clients, notifications);
      notify(`[Xem thử] Đã cập nhật buổi tập: ${STATUS_LABELS[status] || status}`);
      return;
    }
    setBusy(true);
    try {
      await ctx.api(`/coaching/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      notify(`Đã cập nhật buổi tập: ${STATUS_LABELS[status] || status}`);
      await loadAll(range, reportPeriod);
      if (selectedClient) await openClientDossier(selectedClient);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessForm.partner) return notify("Vui lòng chọn học viên");
    if (isDemo) {
      const target = clients.find((c) => String(c.id) === String(sessForm.partner));
      const roomObj = rooms.find((r) => String(r.id) === String(sessForm.room_id));
      const created = {
        id: Date.now(),
        pt_id: ctx?.user?.id || 201,
        member_id: Number(sessForm.partner),
        member_name: target?.name || "Học viên",
        room_id: Number(sessForm.room_id || 1),
        room: roomObj?.name || "Phòng Gym",
        starts_at: new Date(sessForm.starts_at).toISOString(),
        duration_minutes: Number(sessForm.duration_minutes) || 60,
        status: "CONFIRMED",
        note: sessForm.note,
      };
      const nextSessions = [created, ...sessions];
      setSessions(nextSessions);
      buildDemoDashAndReports(nextSessions, clients, notifications);
      setShowNewSession(false);
      setSessForm((f) => ({ ...f, note: "" }));
      notify("[Xem thử] Đã tạo buổi tập mới");
      return;
    }
    setBusy(true);
    try {
      const iso = new Date(sessForm.starts_at).toISOString();
      await ctx.api("/coaching/sessions", {
        method: "POST",
        body: JSON.stringify({
          partner: Number(sessForm.partner),
          starts_at: iso,
          duration_minutes: Number(sessForm.duration_minutes),
          room_id: Number(sessForm.room_id || 1),
          note: sessForm.note,
        }),
      });
      notify("Đã tạo buổi tập mới");
      setShowNewSession(false);
      setSessForm((f) => ({ ...f, note: "" }));
      await loadAll(range, reportPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddMetric = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (isDemo) {
      const item = {
        id: Date.now(),
        weight_kg: Number(metricForm.weight_kg),
        body_fat_pct: metricForm.body_fat_pct ? Number(metricForm.body_fat_pct) : null,
        muscle_mass_kg: metricForm.muscle_mass_kg ? Number(metricForm.muscle_mass_kg) : null,
        inbody_score: metricForm.inbody_score ? Number(metricForm.inbody_score) : null,
        note: metricForm.note,
        recorded_at: new Date().toISOString(),
      };
      setDossier((prev) => (prev ? { ...prev, metrics: [item, ...(prev.metrics || [])] } : prev));
      setMetricForm({ weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", inbody_score: "", note: "" });
      notify("[Xem thử] Đã lưu chỉ số InBody");
      return;
    }
    setBusy(true);
    try {
      await ctx.api(`/pt/clients/${selectedClient.id}/metrics`, {
        method: "POST",
        body: JSON.stringify({
          weight_kg: metricForm.weight_kg,
          body_fat_pct: metricForm.body_fat_pct || null,
          muscle_mass_kg: metricForm.muscle_mass_kg || null,
          inbody_score: metricForm.inbody_score ? Number(metricForm.inbody_score) : null,
          note: metricForm.note,
        }),
      });
      notify("Đã lưu chỉ số InBody vào hồ sơ học viên");
      setMetricForm({ weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", inbody_score: "", note: "" });
      await openClientDossier(selectedClient);
      await loadAll(range, reportPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddWorkoutLog = async (e) => {
    e.preventDefault();
    if (!selectedClient || !logForm.program_name.trim()) return;
    if (isDemo) {
      const item = {
        id: Date.now(),
        program_name: logForm.program_name.trim(),
        duration_minutes: Number(logForm.duration_minutes) || 60,
        feedback: logForm.feedback.trim(),
        completed_at: new Date().toISOString(),
      };
      setDossier((prev) => (prev ? { ...prev, achievements: [item, ...(prev.achievements || [])] } : prev));
      setLogForm({ program_name: "", duration_minutes: 60, feedback: "" });
      notify("[Xem thử] Đã ghi nhận log buổi tập");
      return;
    }
    setBusy(true);
    try {
      await ctx.api(`/pt/clients/${selectedClient.id}/logs`, {
        method: "POST",
        body: JSON.stringify({
          program_name: logForm.program_name.trim(),
          duration_minutes: Number(logForm.duration_minutes) || 60,
          feedback: logForm.feedback.trim(),
        }),
      });
      notify("Đã ghi nhận log buổi tập cho học viên");
      setLogForm({ program_name: "", duration_minutes: 60, feedback: "" });
      await openClientDossier(selectedClient);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addExerciseToBuilder = (ex) => {
    setProgExercises((prev) => [
      ...prev,
      {
        uid: Date.now() + Math.random(),
        name: ex.name,
        phase: ex.phase || "MAIN",
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || "10"),
        weight: String(ex.weight || ""),
      },
    ]);
  };

  const updateBuilderEx = (uid, field, val) => {
    setProgExercises((prev) => prev.map((x) => (x.uid === uid ? { ...x, [field]: val } : x)));
  };

  const handleDeliverProgram = async (saveAsTemplate) => {
    if (!progMemberId) return notify("Vui lòng chọn học viên nhận giáo án");
    if (!progName.trim()) return notify("Vui lòng nhập tên giáo án");
    if (!progExercises.length) return notify("Hãy chọn ít nhất 1 bài tập từ thư viện");

    const cleanExercises = progExercises.map((ex, i) => ({
      id: i + 1,
      name: ex.name,
      phase: ex.phase,
      sets: Number(ex.sets) || 3,
      reps: String(ex.reps || "10"),
      weight: String(ex.weight || ""),
    }));

    if (isDemo) {
      const target = clients.find((c) => String(c.id) === String(progMemberId));
      const newProg = {
        id: Date.now(),
        pt_id: ctx?.user?.id || 201,
        member_id: Number(progMemberId),
        member_name: target?.name || "Học viên",
        name: progName.trim(),
        exercises: cleanExercises,
        notes: progNotes,
        completed_count: 0,
        created_at: new Date().toISOString(),
      };
      setPrograms((prev) => [newProg, ...prev]);
      if (saveAsTemplate) {
        setTemplates((prev) => [
          {
            id: Date.now() + 1,
            name: progName.trim(),
            warmup_minutes: Number(progPhases.warmup),
            main_minutes: Number(progPhases.main),
            cooldown_minutes: Number(progPhases.cooldown),
            exercises: cleanExercises,
            notes: progNotes,
          },
          ...prev,
        ]);
      }
      setProgName("");
      setProgNotes("");
      setProgExercises([]);
      notify(saveAsTemplate ? "[Xem thử] Đã lưu mẫu & giao giáo án!" : "[Xem thử] Đã giao giáo án!");
      return;
    }

    setBusy(true);
    try {
      if (saveAsTemplate) {
        const tpl = await ctx.api("/pt/templates", {
          method: "POST",
          body: JSON.stringify({
            name: progName.trim(),
            warmup_minutes: Number(progPhases.warmup),
            main_minutes: Number(progPhases.main),
            cooldown_minutes: Number(progPhases.cooldown),
            exercises: cleanExercises,
            notes: progNotes,
          }),
        });
        await ctx.api(`/pt/templates/${tpl.id}/assign`, {
          method: "POST",
          body: JSON.stringify({ member_id: Number(progMemberId) }),
        });
        notify("Đã lưu mẫu giáo án & giao cho học viên!");
      } else {
        await ctx.api("/coaching/programs", {
          method: "POST",
          body: JSON.stringify({
            member_id: Number(progMemberId),
            name: progName.trim(),
            exercises: cleanExercises,
            notes: progNotes,
          }),
        });
        notify("Đã giao giáo án trực tiếp cho học viên!");
      }
      setProgName("");
      setProgNotes("");
      setProgExercises([]);
      await loadAll(range, reportPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAssignTemplate = async (e) => {
    e.preventDefault();
    if (!assignModalTpl || !assignMemberId) return;
    if (isDemo) {
      const target = clients.find((c) => String(c.id) === String(assignMemberId));
      setPrograms((prev) => [
        {
          id: Date.now(),
          pt_id: ctx?.user?.id || 201,
          member_id: Number(assignMemberId),
          member_name: target?.name || "Học viên",
          name: assignModalTpl.name,
          exercises: assignModalTpl.exercises || [],
          notes: assignModalTpl.notes || "",
          completed_count: 0,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setAssignModalTpl(null);
      notify("[Xem thử] Đã gán mẫu giáo án sang học viên");
      return;
    }
    setBusy(true);
    try {
      await ctx.api(`/pt/templates/${assignModalTpl.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ member_id: Number(assignMemberId) }),
      });
      notify("Đã gán mẫu giáo án sang học viên");
      setAssignModalTpl(null);
      await loadAll(range, reportPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRequestAssignment = async (e) => {
    e.preventDefault();
    if (!reqMemberId) return;
    if (isDemo) {
      setRequests((prev) => [
        { id: Date.now(), member_id: Number(reqMemberId), member_name: `Hội viên #${reqMemberId}`, note: reqNote, status: "PENDING" },
        ...prev,
      ]);
      setReqMemberId("");
      setReqNote("");
      notify("[Xem thử] Đã gửi đề xuất nhận học viên lên Admin");
      return;
    }
    setBusy(true);
    try {
      await ctx.api("/pt/assignment-requests", {
        method: "POST",
        body: JSON.stringify({ member_id: Number(reqMemberId), note: reqNote }),
      });
      notify("Đã gửi đề xuất nhận học viên lên Admin");
      setReqMemberId("");
      setReqNote("");
      await loadAll(range, reportPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkNotifRead = async (id) => {
    if (isDemo) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      return;
    }
    try {
      await ctx.api(`/pt/notifications/${id}/read`, { method: "PATCH" });
      await loadAll(range, reportPeriod);
    } catch (err) {
      notify(err.message);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const profile = ctx?.user?.demo
        ? { name: profName.trim(), phone: profPhone.trim() }
        : await ctx.api("/account/profile", {
            method: "PATCH",
            body: JSON.stringify({ name: profName.trim(), phone: profPhone.trim() }),
          });
      ctx?.updateUser?.(profile);
      setEditingProfile(false);
      notify(ctx?.user?.demo ? "Đã cập nhật hồ sơ xem thử." : "Đã lưu hồ sơ PT.");
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (pwdForm.next.length < 6) return notify("Mật khẩu mới tối thiểu 6 ký tự");
    if (pwdForm.next !== pwdForm.confirm) return notify("Mật khẩu xác nhận không khớp");
    if (isDemo) {
      setChangingPwd(false);
      setPwdForm({ current: "", next: "", confirm: "" });
      return notify("[Xem thử] Đã đổi mật khẩu thành công");
    }
    setBusy(true);
    try {
      await ctx.api("/account/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: pwdForm.current, new_password: pwdForm.next }),
      });
      setChangingPwd(false);
      setPwdForm({ current: "", next: "", confirm: "" });
      notify("Đã cập nhật mật khẩu mới thành công");
    } catch (err) {
      notify(err.message || "Không thể đổi mật khẩu");
    } finally {
      setBusy(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchFilter = sessionFilter === "ALL" || s.status === sessionFilter;
      const matchQuery =
        !q ||
        (s.member_name || "").toLowerCase().includes(q) ||
        (s.note || "").toLowerCase().includes(q) ||
        (s.room || "").toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [sessions, sessionFilter, q]);

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.member_code || "").toLowerCase().includes(q),
    );
  }, [clients, q]);

  const exerciseGroups = useMemo(() => {
    const groups = new Set(["Tất cả"]);
    exerciseLib.forEach((e) => groups.add(e.group));
    return [...groups];
  }, [exerciseLib]);

  const filteredExercises = useMemo(() => {
    return exerciseLib.filter(
      (e) => exGroupFilter === "Tất cả" || e.group === exGroupFilter,
    );
  }, [exerciseLib, exGroupFilter]);

  const completionRate = dash?.completionRate ?? 0;
  const completedCount = dash?.completedCount ?? 0;
  const totalScheduled = dash?.totalScheduled ?? 0;
  const teachingHours = dash?.teachingHours ?? 0;
  const activeClientsCount = dash?.activeClientsCount ?? clients.length;
  const unreadCount = dash?.unreadNotifications ?? notifications.filter((n) => !n.is_read).length;
  const nextSession = dash?.nextSession || sessions.find((s) => s.status === "CONFIRMED") || null;
  const alerts = dash?.alerts || [];
  const weeklyBars = dash?.weeklyBars || [
    { label: "T2", sessionsCount: 0, hours: 0 },
    { label: "T3", sessionsCount: 0, hours: 0 },
    { label: "T4", sessionsCount: 0, hours: 0 },
    { label: "T5", sessionsCount: 0, hours: 0, isToday: true },
    { label: "T6", sessionsCount: 0, hours: 0 },
    { label: "T7", sessionsCount: 0, hours: 0 },
    { label: "CN", sessionsCount: 0, hours: 0 },
  ];
  const maxBar = Math.max(1, ...weeklyBars.map((b) => Math.max(b.sessionsCount || 0, b.hours || 0)));
  const activeTpl = templates[0] || { warmup_minutes: 10, main_minutes: 40, cooldown_minutes: 10 };
  const todayDayNum = new Date().getDate();
  const ringDash = Math.round((completionRate / 100) * 176);
  const donutDash = Math.round((completionRate / 100) * 314);

  // Reports SVG helpers
  const repSeries = reports?.series || [];
  const maxRepCount = Math.max(1, ...repSeries.map((x) => x.count || 0));
  const repCats = reports?.categories || [];
  const maxCatCount = Math.max(1, ...repCats.map((x) => x.count || 0));

  return (
    <div className="pt-ath-app">
      {/* Slim Left Icon Rail */}
      <aside className="pt-ath-rail" aria-label="Điều hướng PT">
        <button
          className="pt-ath-logo"
          onClick={() => {
            setActiveTab("overview");
            ctx?.go?.("home");
          }}
          title="OptiGym PT"
        >
          OG
        </button>

        <nav className="pt-ath-rail-nav">
          <button
            className={`pt-ath-rail-btn ${activeTab === "overview" && !showSettings ? "active" : ""}`}
            onClick={() => {
              setActiveTab("overview");
              ctx?.go?.("home");
            }}
            title="Tổng quan PT"
          >
            <Home size={18} />
          </button>
          <button
            className={`pt-ath-rail-btn ${activeTab === "schedule" ? "active" : ""}`}
            onClick={() => setActiveTab("schedule")}
            title="Lịch huấn luyện & Điểm danh"
          >
            <CalendarDays size={18} />
          </button>
          <button
            className={`pt-ath-rail-btn ${activeTab === "clients" ? "active" : ""}`}
            onClick={() => setActiveTab("clients")}
            title="Học viên & Hồ sơ"
          >
            <Users size={18} />
          </button>
          <button
            className={`pt-ath-rail-btn ${activeTab === "programs" ? "active" : ""}`}
            onClick={() => setActiveTab("programs")}
            title="Giáo án 1-1"
          >
            <ClipboardList size={18} />
          </button>
          <button
            className={`pt-ath-rail-btn ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
            title="Báo cáo hiệu suất"
          >
            <BarChart3 size={18} />
          </button>
          <button
            className={`pt-ath-rail-btn ${showNotifs ? "active" : ""}`}
            onClick={() => setShowNotifs((v) => !v)}
            title="Thông báo huấn luyện"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="pt-ath-badge-count">{unreadCount}</span>}
          </button>
          <button
            className={`pt-ath-rail-btn ${showSettings ? "active" : ""}`}
            onClick={() => {
              setActiveTab("settings");
              ctx?.go?.("settings");
            }}
            title="Cài đặt tài khoản"
          >
            <Settings size={18} />
          </button>
        </nav>

        <button className="pt-ath-rail-foot" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
          <LogOut size={17} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="pt-ath-main">
        {/* Mobile Header */}
        <header className="pt-ath-mob-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="pt-ath-logo" style={{ width: 32, height: 32, fontSize: 12, borderRadius: 9 }}>
              OG
            </div>
            <strong style={{ fontSize: 15 }}>OptiGym PT</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="pt-ath-rail-btn"
              style={{ width: 34, height: 34 }}
              onClick={() => setShowNotifs((v) => !v)}
              aria-label="Thông báo"
            >
              <Bell size={15} />
              {unreadCount > 0 && <span className="pt-ath-badge-count">{unreadCount}</span>}
            </button>
            <button className="pt-ath-plus-pill" style={{ width: 34, height: 34 }} onClick={() => setShowNewSession(true)}>
              +
            </button>
            <img
              src={ptAvatar}
              alt={ptName}
              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #A3FF12" }}
            />
          </div>
        </header>

        {/* Desktop Top Pill Bar */}
        <header className="pt-ath-topbar">
          <div className="pt-ath-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm học viên, ca tập..."
              aria-label="Tìm học viên, ca tập"
            />
          </div>

          <div className="pt-ath-pills">
            <button
              className={`pt-ath-pill ${activeTab === "overview" && !showSettings ? "active" : ""}`}
              onClick={() => {
                setActiveTab("overview");
                ctx?.go?.("home");
              }}
            >
              <span className="pt-ath-dot" />
              Tổng quan PT
            </button>
            <button
              className={`pt-ath-pill ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
            >
              Lịch huấn luyện ({sessions.filter((s) => s.status === "REQUESTED").length} chờ duyệt)
            </button>
            <button
              className={`pt-ath-pill ${activeTab === "clients" ? "active" : ""}`}
              onClick={() => setActiveTab("clients")}
            >
              Học viên &amp; Hồ sơ ({clients.length})
            </button>
            <button
              className={`pt-ath-pill ${activeTab === "programs" ? "active" : ""}`}
              onClick={() => setActiveTab("programs")}
            >
              Giáo án 1-1 ({programs.length})
            </button>
            <button
              className={`pt-ath-pill ${activeTab === "reports" ? "active" : ""}`}
              onClick={() => setActiveTab("reports")}
            >
              Báo cáo
            </button>
            <button className="pt-ath-plus-pill" onClick={() => setShowNewSession(true)} title="Tạo buổi tập mới">
              +
            </button>
          </div>

          <button
            className="pt-ath-profile"
            onClick={() => {
              setActiveTab("settings");
              ctx?.go?.("settings");
            }}
          >
            <img src={ptAvatar} alt={ptName} />
            <span>{ptName} · PT</span>
          </button>
        </header>

        {showSettings ? (
          /* ==================== SETTINGS TAB ==================== */
          <section className="pt-ath-settings">
            <div className="pt-ath-title-row">
              <div>
                <h1 className="pt-ath-title" style={{ fontSize: 26 }}>
                  Tài khoản &amp; Hồ sơ PT
                </h1>
                <small style={{ color: "#9aa09a" }}>
                  Thông tin đăng nhập, liên hệ và vai trò huấn luyện viên trong OptiGym.
                </small>
              </div>
            </div>

            <div className="pt-ath-settings-grid">
              <div className="pt-ath-bento pt-ath-profile-card">
                <div className="pt-ath-profile-avatar-wrap">
                  <img src={ptAvatar} alt={ptName} />
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{ptName}</h2>
                <span className="pt-ath-role-pill">HUẤN LUYỆN VIÊN PT</span>
                <div style={{ fontSize: 12, color: "#9aa09a" }}>
                  {ctx?.user?.member_code || "PT Workspace"} · {ctx?.user?.specialty || "Personal Training"}
                </div>

                <div className="pt-ath-profile-stats">
                  <div>
                    <strong>{String(activeClientsCount).padStart(2, "0")}</strong>
                    <small>Học viên</small>
                  </div>
                  <div>
                    <strong>{completionRate}%</strong>
                    <small>Hoàn thành</small>
                  </div>
                </div>
              </div>

              <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Thông tin tài khoản</h2>
                  {!editingProfile && (
                    <button
                      className="pt-ath-btn-lime"
                      onClick={() => {
                        setProfName(ctx?.user?.name || "");
                        setProfPhone(ctx?.user?.phone || "");
                        setEditingProfile(true);
                      }}
                    >
                      <Edit3 size={13} /> Chỉnh sửa hồ sơ
                    </button>
                  )}
                </div>

                {editingProfile ? (
                  <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="pt-ath-form-grid">
                      <label className="pt-ath-field">
                        Họ và tên *
                        <input value={profName} onChange={(e) => setProfName(e.target.value)} required minLength={2} maxLength={120} />
                      </label>
                      <label className="pt-ath-field">
                        Số điện thoại
                        <input value={profPhone} onChange={(e) => setProfPhone(e.target.value)} maxLength={30} placeholder="09xx xxx xxx" />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" className="pt-ath-btn-lime" disabled={busy}>
                        {busy ? "Đang lưu…" : "Lưu hồ sơ"}
                      </button>
                      <button type="button" className="pt-ath-btn-ghost" disabled={busy} onClick={() => setEditingProfile(false)}>
                        Hủy
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-ath-kv-list">
                    <div className="pt-ath-kv-row"><span>Họ và tên</span><b>{ctx?.user?.name}</b></div>
                    <div className="pt-ath-kv-row"><span>Email</span><b>{ctx?.user?.email}</b></div>
                    <div className="pt-ath-kv-row"><span>Số điện thoại</span><b>{ctx?.user?.phone || "Chưa cập nhật"}</b></div>
                    <div className="pt-ath-kv-row"><span>Vai trò</span><b style={{ color: "#A3FF12" }}>Huấn luyện viên cá nhân (PT)</b></div>
                    <div className="pt-ath-kv-row"><span>Phiên đăng nhập</span><b style={{ color: "#4ade80" }}>{ctx?.user?.demo ? "Bản xem thử" : "Đang hoạt động"}</b></div>
                  </div>
                )}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 14 }}>Bảo mật &amp; Mật khẩu</strong>
                    {!changingPwd && (
                      <button type="button" className="pt-ath-btn-ghost" onClick={() => setChangingPwd(true)}>
                        Đổi mật khẩu
                      </button>
                    )}
                  </div>
                  {changingPwd ? (
                    <form onSubmit={handleSubmitPassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="pt-ath-form-grid">
                        <label className="pt-ath-field">
                          Mật khẩu hiện tại *
                          <input type="password" required value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} />
                        </label>
                        <label className="pt-ath-field">
                          Mật khẩu mới (tối thiểu 6 ký tự) *
                          <input type="password" required minLength={6} value={pwdForm.next} onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })} />
                        </label>
                      </div>
                      <label className="pt-ath-field">
                        Xác nhận mật khẩu mới *
                        <input type="password" required minLength={6} value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
                      </label>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="submit" className="pt-ath-btn-lime" disabled={busy}>
                          {busy ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
                        </button>
                        <button type="button" className="pt-ath-btn-ghost" disabled={busy} onClick={() => setChangingPwd(false)}>
                          Hủy
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="pt-ath-security-note">
                      <ShieldCheck size={20} color="#A3FF12" style={{ flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 12, color: "#9aa09a", lineHeight: 1.5 }}>
                        Phiên đăng nhập được bảo vệ bằng cookie HttpOnly. Email và vai trò được quản lý riêng bởi Admin để bảo vệ tài khoản.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : activeTab === "schedule" ? (
          /* ==================== TAB: LỊCH HUẤN LUYỆN & ĐIỂM DANH ==================== */
          <section className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="pt-ath-title-row">
              <div>
                <h1 className="pt-ath-title" style={{ fontSize: 22 }}>
                  Lịch huấn luyện &amp; Chấm công PT
                </h1>
                <small style={{ color: "#9aa09a" }}>
                  Duyệt lịch Member đặt, điểm danh Hoàn thành (trừ 1 buổi) hoặc Vắng buổi (MISSED - không trừ buổi).
                </small>
              </div>
              <button className="pt-ath-btn-lime" onClick={() => setShowNewSession(true)}>
                <Plus size={14} /> Tạo buổi tập mới
              </button>
            </div>

            <div className="pt-ath-pills">
              {[
                ["ALL", "Tất cả"],
                ["REQUESTED", "Chờ duyệt"],
                ["CONFIRMED", "Đã lên lịch"],
                ["COMPLETED", "Hoàn thành"],
                ["MISSED", "Vắng buổi"],
              ].map(([k, lbl]) => (
                <button
                  key={k}
                  className={`pt-ath-pill ${sessionFilter === k ? "active" : ""}`}
                  style={{ height: 34, fontSize: 12 }}
                  onClick={() => setSessionFilter(k)}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredSessions.map((s) => (
                <div className="pt-ath-sub-bento" key={s.id}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 14 }}>{s.member_name}</strong>
                      <span className={`pt-ath-tag ${(s.status || "").toLowerCase()}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#9aa09a", marginTop: 4 }}>
                      {fmtDateTime(s.starts_at)} · {s.duration_minutes} phút · {s.room}
                    </div>
                    {s.note && <div style={{ fontSize: 12, color: "#d2d6d2", marginTop: 3 }}>{s.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {s.status === "REQUESTED" && (
                      <>
                        <button className="pt-ath-btn-lime" disabled={busy} onClick={() => handleSessionAction(s.id, "CONFIRMED")}>
                          <Check size={13} /> Duyệt lịch
                        </button>
                        <button className="pt-ath-btn-danger" disabled={busy} onClick={() => handleSessionAction(s.id, "REJECTED")}>
                          Từ chối
                        </button>
                      </>
                    )}
                    {s.status === "CONFIRMED" && (
                      <>
                        <button className="pt-ath-btn-lime" disabled={busy} onClick={() => handleSessionAction(s.id, "COMPLETED")}>
                          <Check size={13} /> Hoàn thành (-1 buổi)
                        </button>
                        <button className="pt-ath-btn-danger" disabled={busy} onClick={() => handleSessionAction(s.id, "MISSED")}>
                          Vắng (MISSED)
                        </button>
                        <button className="pt-ath-btn-ghost" disabled={busy} onClick={() => handleSessionAction(s.id, "CANCELLED")}>
                          Hủy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!filteredSessions.length && (
                <div style={{ color: "#9aa09a", fontSize: 13, padding: 16 }}>
                  Chưa có buổi tập nào khớp bộ lọc.
                </div>
              )}
            </div>
          </section>
        ) : activeTab === "clients" ? (
          /* ==================== TAB: HỌC VIÊN & HỒ SƠ CHI TIẾT (IMAGE 2) ==================== */
          <section className="pt-ath-lower" style={{ gridTemplateColumns: "0.95fr 1.25fr" }}>
            <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h1 className="pt-ath-title" style={{ fontSize: 22 }}>
                Học viên phụ trách ({filteredClients.length})
              </h1>
              {filteredClients.map((c) => (
                <div
                  className="pt-ath-sub-bento"
                  key={c.id}
                  style={
                    selectedClient?.id === c.id
                      ? { borderColor: "#A3FF12", background: "rgba(163,255,18,0.06)" }
                      : undefined
                  }
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={clientFemale}
                      alt={c.name}
                      style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "1px solid #A3FF12" }}
                    />
                    <div>
                      <strong style={{ fontSize: 14 }}>{c.name}</strong>
                      <div style={{ fontSize: 11, color: "#9aa09a" }}>
                        {c.member_code || `ID #${c.id}`} · Còn {c.remaining_sessions ?? 0} buổi PT
                        {c.latest_weight ? ` · ${c.latest_weight} kg` : ""}
                      </div>
                    </div>
                  </div>
                  <button className="pt-ath-btn-lime" onClick={() => openClientDossier(c)}>
                    <Activity size={13} /> Hồ sơ
                  </button>
                </div>
              ))}

              <form
                onSubmit={handleRequestAssignment}
                className="pt-ath-sub-bento"
                style={{ flexDirection: "column", alignItems: "stretch", marginTop: 6 }}
              >
                <strong style={{ fontSize: 13, color: "#A3FF12" }}>
                  Đề xuất nhận học viên mới (gửi Admin duyệt)
                </strong>
                <div className="pt-ath-form-grid">
                  <label className="pt-ath-field">
                    ID Hội viên
                    <input type="number" min="1" placeholder="VD: 6" value={reqMemberId} onChange={(e) => setReqMemberId(e.target.value)} required />
                  </label>
                  <label className="pt-ath-field">
                    Ghi chú gửi Admin
                    <input placeholder="Lý do đề xuất..." value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
                  </label>
                </div>
                <button type="submit" className="pt-ath-btn-ghost" disabled={busy} style={{ alignSelf: "flex-start" }}>
                  Gửi đề xuất phân công
                </button>
                {requests.length > 0 && (
                  <div style={{ fontSize: 11, color: "#9aa09a" }}>
                    Gần nhất: {requests[0].member_name} — {requests[0].status}
                  </div>
                )}
              </form>
            </div>

            {/* Right Panel: Complete Member Dossier */}
            <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!selectedClient || !dossier ? (
                <div style={{ color: "#9aa09a", fontSize: 13, padding: 20 }}>
                  Chọn một học viên bên trái để xem hồ sơ sức khỏe, InBody, log buổi tập cũ, mục tiêu và thành tích.
                </div>
              ) : (
                <>
                  <div>
                    <span className="pt-ath-role-pill">ĐANG TẬP · {dossier.member.member_code || `ID #${dossier.member.id}`}</span>
                    <h2 style={{ margin: "8px 0 4px", fontSize: 24, fontWeight: 700 }}>{dossier.member.name}</h2>
                    <div style={{ fontSize: 12, color: "#9aa09a" }}>
                      {dossier.member.phone || "Chưa có SĐT"} · {dossier.member.email} · Tham gia {fmtDateTime(dossier.member.created_at)}
                    </div>
                  </div>

                  {/* 3-Col Metric Strip */}
                  <div className="pt-ath-dossier-strip">
                    <div className="pt-ath-dossier-cell">
                      <small>CÂN NẶNG</small>
                      <strong>{dossier.metrics?.[0]?.weight_kg ? `${dossier.metrics[0].weight_kg} kg` : "—"}</strong>
                      <span>
                        {dossier.weightDelta != null
                          ? `${dossier.weightDelta > 0 ? "+" : ""}${dossier.weightDelta} kg so với lần đầu`
                          : "Chưa có lịch sử"}
                      </span>
                    </div>
                    <div className="pt-ath-dossier-cell">
                      <small>CHUYÊN CẦN</small>
                      <strong>{dossier.attendance?.rate ?? 100}%</strong>
                      <span>
                        {dossier.attendance?.completed ?? 0} xong · {dossier.attendance?.missed ?? 0} vắng
                      </span>
                    </div>
                    <div className="pt-ath-dossier-cell">
                      <small>CHỈ SỐ CHÍNH</small>
                      <strong>
                        {dossier.metrics?.[0]?.inbody_score
                          ? `InBody ${dossier.metrics[0].inbody_score}`
                          : dossier.metrics?.[0]?.muscle_mass_kg
                            ? `Cơ ${dossier.metrics[0].muscle_mass_kg} kg`
                            : "Chưa đo"}
                      </strong>
                      <span>
                        {dossier.contracts?.[0]
                          ? `Còn ${dossier.contracts[0].remaining_sessions ?? 0}/${dossier.contracts[0].total_sessions ?? dossier.contracts[0].sessions ?? 0} buổi PT`
                          : "Chưa có hợp đồng"}
                      </span>
                    </div>
                  </div>

                  {/* Mục tiêu & Buổi tiếp theo */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa09a", letterSpacing: 0.8 }}>MỤC TIÊU &amp; HẸN TIẾP</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                      {dossier.goals?.length ? dossier.goals.map((g) => `${g.title} (${g.progress ?? g.completion ?? 0}%)`).join(" · ") : "Tăng cơ, cải thiện thể lực & độ bền"}
                    </div>
                    {dossier.attendance?.nextSession?.starts_at && (
                      <div style={{ fontSize: 12, color: "#A3FF12", marginTop: 3 }}>
                        Buổi tiếp theo: {fmtDateTime(dossier.attendance.nextSession.starts_at)} · {dossier.attendance.nextSession.room}
                      </div>
                    )}
                  </div>

                  {/* Điểm danh gần đây (8 tiles + session log) */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa09a", letterSpacing: 0.8, marginBottom: 8 }}>
                      ĐIỂM DANH GẦN ĐÂY ({dossier.recentSessions?.length || 0} BUỔI)
                    </div>
                    <div className="pt-ath-att-tiles">
                      {Array.from({ length: 8 }).map((_, idx) => {
                        const s = dossier.recentSessions?.[idx];
                        const cls = s?.status === "COMPLETED" ? "completed" : s?.status === "MISSED" ? "missed" : "";
                        return <div key={idx} className={`pt-ath-att-tile ${cls}`} title={s ? `${fmtDateTime(s.starts_at)} · ${s.status}` : "Trống"} />;
                      })}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                      {(dossier.recentSessions || []).slice(0, 5).map((s) => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                          <span>{fmtDateTime(s.starts_at)} · {s.note || s.room}</span>
                          <span className={`pt-ath-tag ${(s.status || "").toLowerCase()}`}>{STATUS_LABELS[s.status] || s.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thành tích & Feedback giáo án */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa09a", letterSpacing: 0.8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Award size={13} color="#A3FF12" /> THÀNH TÍCH &amp; LOG TẬP LUYỆN
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(dossier.achievements || []).slice(0, 4).map((w) => (
                        <div className="pt-ath-sub-bento" key={w.id} style={{ padding: "10px 12px" }}>
                          <div>
                            <b style={{ fontSize: 12 }}>{w.program_name}</b>
                            <div style={{ fontSize: 11, color: "#9aa09a" }}>{w.feedback || "Đã hoàn thành buổi tập"}</div>
                          </div>
                          <small style={{ fontSize: 11, color: "#A3FF12" }}>{fmtDateTime(w.completed_at)}</small>
                        </div>
                      ))}
                      {(!dossier.achievements || !dossier.achievements.length) && (
                        <div style={{ fontSize: 12, color: "#9aa09a" }}>Học viên chưa ghi nhận feedback bài tập nào.</div>
                      )}
                    </div>
                  </div>

                  {/* Form ghi nhận InBody */}
                  <form onSubmit={handleAddMetric} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
                    <strong style={{ fontSize: 13, color: "#A3FF12" }}>Cập nhật chỉ số sức khỏe / InBody</strong>
                    <div className="pt-ath-form-grid">
                      <label className="pt-ath-field">
                        Cân nặng (kg) *
                        <input type="number" step="0.1" required value={metricForm.weight_kg} onChange={(e) => setMetricForm({ ...metricForm, weight_kg: e.target.value })} />
                      </label>
                      <label className="pt-ath-field">
                        Tỷ lệ mỡ (%)
                        <input type="number" step="0.1" value={metricForm.body_fat_pct} onChange={(e) => setMetricForm({ ...metricForm, body_fat_pct: e.target.value })} />
                      </label>
                      <label className="pt-ath-field">
                        Khối lượng cơ (kg)
                        <input type="number" step="0.1" value={metricForm.muscle_mass_kg} onChange={(e) => setMetricForm({ ...metricForm, muscle_mass_kg: e.target.value })} />
                      </label>
                      <label className="pt-ath-field">
                        Điểm InBody (1-100)
                        <input type="number" value={metricForm.inbody_score} onChange={(e) => setMetricForm({ ...metricForm, inbody_score: e.target.value })} />
                      </label>
                    </div>
                    <label className="pt-ath-field">
                      Ghi chú đánh giá
                      <input value={metricForm.note} onChange={(e) => setMetricForm({ ...metricForm, note: e.target.value })} placeholder="Nhận xét buổi đo..." />
                    </label>
                    <button type="submit" className="pt-ath-btn-lime" disabled={busy} style={{ alignSelf: "flex-start" }}>
                      Lưu chỉ số InBody
                    </button>
                  </form>

                  {/* Form ghi nhận Log buổi tập */}
                  <form onSubmit={handleAddWorkoutLog} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
                    <strong style={{ fontSize: 13, color: "#A3FF12" }}>Ghi nhận log buổi tập cho học viên</strong>
                    <div className="pt-ath-form-grid">
                      <label className="pt-ath-field">
                        Tên buổi tập / Giáo án *
                        <input required value={logForm.program_name} onChange={(e) => setLogForm({ ...logForm, program_name: e.target.value })} placeholder="VD: Thân trên & Core — Tuần 2" />
                      </label>
                      <label className="pt-ath-field">
                        Thời lượng (phút)
                        <input type="number" min="10" max="240" value={logForm.duration_minutes} onChange={(e) => setLogForm({ ...logForm, duration_minutes: e.target.value })} />
                      </label>
                    </div>
                    <label className="pt-ath-field">
                      Nhận xét kỹ thuật &amp; Mức tạ đạt được
                      <input value={logForm.feedback} onChange={(e) => setLogForm({ ...logForm, feedback: e.target.value })} placeholder="VD: Squat 70kg x 8 reps tốt, giữ lưng thẳng..." />
                    </label>
                    <button type="submit" className="pt-ath-btn-ghost" disabled={busy} style={{ alignSelf: "flex-start" }}>
                      Lưu log buổi tập
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        ) : activeTab === "programs" ? (
          /* ==================== TAB: GIÁO ÁN 1-1 TỪ THƯ VIỆN HỆ THỐNG ==================== */
          <section className="pt-ath-lower" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
            <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h1 className="pt-ath-title" style={{ fontSize: 22 }}>
                Lên giáo án 1-1 cho học viên
              </h1>

              <div className="pt-ath-form-grid">
                <label className="pt-ath-field">
                  1. Chọn học viên được phân công *
                  <select value={progMemberId} onChange={(e) => setProgMemberId(e.target.value)}>
                    <option value="">-- Chọn học viên --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.member_code || `#${c.id}`})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pt-ath-field">
                  2. Tên giáo án *
                  <input
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    placeholder="VD: Hypertrophy Thân trên — Tuần 1"
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <label className="pt-ath-field">
                  Khởi động (phút)
                  <input type="number" value={progPhases.warmup} onChange={(e) => setProgPhases({ ...progPhases, warmup: e.target.value })} />
                </label>
                <label className="pt-ath-field">
                  Bài chính (phút)
                  <input type="number" value={progPhases.main} onChange={(e) => setProgPhases({ ...progPhases, main: e.target.value })} />
                </label>
                <label className="pt-ath-field">
                  Giãn cơ (phút)
                  <input type="number" value={progPhases.cooldown} onChange={(e) => setProgPhases({ ...progPhases, cooldown: e.target.value })} />
                </label>
              </div>

              {/* Exercise Picker from System Library */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#A3FF12", marginBottom: 8 }}>
                  3. Chọn bài tập mẫu có sẵn từ hệ thống:
                </div>
                <div className="pt-ath-pills" style={{ marginBottom: 10 }}>
                  {exerciseGroups.map((g) => (
                    <button
                      type="button"
                      key={g}
                      className={`pt-ath-pill ${exGroupFilter === g ? "active" : ""}`}
                      style={{ height: 30, fontSize: 11, padding: "0 12px" }}
                      onClick={() => setExGroupFilter(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="pt-ath-ex-lib">
                  {filteredExercises.map((ex) => (
                    <div className="pt-ath-sub-bento" key={ex.id} style={{ padding: "8px 12px" }}>
                      <div>
                        <b style={{ fontSize: 13 }}>{ex.name}</b>
                        <div style={{ fontSize: 11, color: "#9aa09a" }}>
                          {ex.group} · {ex.sets} hiệp × {ex.reps} · {ex.weight}
                        </div>
                      </div>
                      <button type="button" className="pt-ath-btn-lime" style={{ padding: "5px 10px" }} onClick={() => addExerciseToBuilder(ex)}>
                        <Plus size={12} /> Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Exercises Editor */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f3f5f2", marginBottom: 8 }}>
                  4. Danh sách bài tập trong giáo án ({progExercises.length} bài):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {progExercises.map((item) => (
                    <div className="pt-ath-sub-bento" key={item.uid} style={{ padding: "10px 12px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 13, minWidth: 140 }}>{item.name}</strong>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={item.phase}
                          onChange={(e) => updateBuilderEx(item.uid, "phase", e.target.value)}
                          style={{ background: "#121412", color: "#f3f5f2", border: "1px solid #383d40", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                        >
                          <option value="WARMUP">Khởi động</option>
                          <option value="MAIN">Bài chính</option>
                          <option value="COOLDOWN">Giãn cơ</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={item.sets}
                          onChange={(e) => updateBuilderEx(item.uid, "sets", e.target.value)}
                          style={{ width: 52, background: "#121412", color: "#f3f5f2", border: "1px solid #383d40", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                          title="Số hiệp"
                        />
                        <input
                          value={item.reps}
                          onChange={(e) => updateBuilderEx(item.uid, "reps", e.target.value)}
                          style={{ width: 64, background: "#121412", color: "#f3f5f2", border: "1px solid #383d40", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                          placeholder="Reps"
                        />
                        <input
                          value={item.weight}
                          onChange={(e) => updateBuilderEx(item.uid, "weight", e.target.value)}
                          style={{ width: 78, background: "#121412", color: "#f3f5f2", border: "1px solid #383d40", borderRadius: 6, padding: "4px 6px", fontSize: 11 }}
                          placeholder="Mức tạ"
                        />
                        <button
                          type="button"
                          className="pt-ath-btn-danger"
                          style={{ padding: "4px 8px" }}
                          onClick={() => setProgExercises((p) => p.filter((x) => x.uid !== item.uid))}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!progExercises.length && (
                    <div style={{ fontSize: 12, color: "#9aa09a" }}>Chưa có bài tập nào. Hãy chọn từ danh sách mẫu ở trên.</div>
                  )}
                </div>
              </div>

              <label className="pt-ath-field">
                Ghi chú huấn luyện cho học viên
                <input value={progNotes} onChange={(e) => setProgNotes(e.target.value)} placeholder="Lưu ý kỹ thuật, nhịp thở, mức tạ tăng dần..." />
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="pt-ath-btn-lime" disabled={busy} onClick={() => handleDeliverProgram(false)}>
                  Giao ngay cho học viên
                </button>
                <button type="button" className="pt-ath-btn-ghost" disabled={busy} onClick={() => handleDeliverProgram(true)}>
                  Lưu làm mẫu &amp; Giao
                </button>
              </div>
            </div>

            {/* Right Column: Assigned Programs & Reusable Templates */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Giáo án đã giao cho học viên ({programs.length})</h2>
                {programs.slice(0, 8).map((p) => (
                  <div className="pt-ath-sub-bento" key={p.id}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{p.name}</strong>
                      <div style={{ fontSize: 11, color: "#A3FF12", marginTop: 2 }}>
                        Học viên: {p.member_name} · {(p.exercises || []).length} bài tập
                      </div>
                      <div style={{ fontSize: 11, color: "#9aa09a", marginTop: 2 }}>
                        Đã tập {p.completed_count || 0} lần · {fmtDateTime(p.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
                {!programs.length && <div style={{ fontSize: 12, color: "#9aa09a" }}>Chưa giao giáo án nào.</div>}
              </div>

              <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Mẫu giáo án tái sử dụng ({templates.length})</h2>
                {templates.map((t) => (
                  <div className="pt-ath-sub-bento" key={t.id}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{t.name}</strong>
                      <div style={{ fontSize: 11, color: "#9aa09a" }}>
                        {t.warmup_minutes}p / {t.main_minutes}p / {t.cooldown_minutes}p · {(t.exercises || []).length} bài
                      </div>
                    </div>
                    <button
                      className="pt-ath-btn-lime"
                      onClick={() => {
                        setAssignModalTpl(t);
                        setAssignMemberId(clients?.[0]?.id ? String(clients[0].id) : "");
                      }}
                    >
                      Gán nhanh
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : activeTab === "reports" ? (
          /* ==================== TAB: BÁO CÁO HIỆU SUẤT (IMAGE 3) ==================== */
          <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="pt-ath-title-row">
              <div>
                <small style={{ color: "#9aa09a", fontSize: 11, letterSpacing: 1 }}>
                  {reportPeriod === "month" ? "6 THÁNG GẦN NHẤT" : "7 TUẦN GẦN NHẤT"}
                </small>
                <h1 className="pt-ath-title">BÁO CÁO HIỆU SUẤT PT</h1>
              </div>
              <div className="pt-ath-range">
                <button className={reportPeriod === "week" ? "active" : ""} onClick={() => setReportPeriod("week")}>
                  Theo tuần
                </button>
                <button className={reportPeriod === "month" ? "active" : ""} onClick={() => setReportPeriod("month")}>
                  Theo tháng
                </button>
              </div>
            </div>

            <div className="pt-ath-bento" style={{ padding: 0, overflow: "hidden" }}>
              <div className="pt-ath-rep-kpi">
                <div className="pt-ath-rep-cell">
                  <small>{reportPeriod === "month" ? "BUỔI THÁNG NÀY" : "BUỔI TUẦN NÀY"}</small>
                  <strong>{reports?.currentCount ?? 0}</strong>
                  <span>Kỳ trước: {reports?.prevCount ?? 0}</span>
                </div>
                <div className="pt-ath-rep-cell">
                  <small>TỶ LỆ CÓ MẶT</small>
                  <strong style={{ color: "#A3FF12" }}>{reports?.attendanceRate ?? 0}%</strong>
                  <span>{reports?.totalCompleted ?? 0} hoàn thành · {reports?.totalMissed ?? 0} vắng</span>
                </div>
                <div className="pt-ath-rep-cell">
                  <small>GIỜ ĐỨNG LỚP TỔNG</small>
                  <strong>{teachingHours}h</strong>
                  <span>Từ các buổi COMPLETED</span>
                </div>
                <div className="pt-ath-rep-cell">
                  <small>HỌC VIÊN ĐANG THEO</small>
                  <strong>{reports?.activeClientsCount ?? activeClientsCount}</strong>
                  <span>Được phân công hoạt động</span>
                </div>
              </div>
            </div>

            <div className="pt-ath-lower">
              {/* Bar Chart: Số buổi huấn luyện */}
              <div className="pt-ath-bento">
                <small style={{ fontSize: 10, letterSpacing: 1, color: "#9aa09a" }}>THEO KỲ THỐNG KÊ</small>
                <h3 style={{ margin: "4px 0 14px", fontSize: 18 }}>SỐ BUỔI HUẤN LUYỆN</h3>
                <div className="pt-ath-rep-bars">
                  {repSeries.map((item) => (
                    <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <small style={{ fontSize: 10, color: item.isCurrent ? "#A3FF12" : "#9aa09a" }}>{item.count}</small>
                      <div
                        className={`pt-ath-rep-bar ${item.isCurrent ? "current" : ""}`}
                        style={{ height: Math.max(6, Math.round(((item.count || 0) / maxRepCount) * 116)) }}
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-ath-dbar-labels" style={{ gridTemplateColumns: `repeat(${Math.max(1, repSeries.length)}, 1fr)` }}>
                  {repSeries.map((item) => (
                    <span key={item.label} style={item.isCurrent ? { color: "#A3FF12", fontWeight: 700 } : undefined}>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Line Chart: Tỷ lệ có mặt */}
              <div className="pt-ath-bento">
                <small style={{ fontSize: 10, letterSpacing: 1, color: "#9aa09a" }}>% BUỔI HỌC VIÊN CÓ MẶT</small>
                <h3 style={{ margin: "4px 0 14px", fontSize: 18 }}>TỶ LỆ CÓ MẶT</h3>
                <svg viewBox="0 0 360 155" style={{ width: "100%", height: 155 }}>
                  {[30, 65, 100, 135].map((y) => (
                    <line key={y} x1="16" y1={y} x2="344" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  ))}
                  {repSeries.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#A3FF12"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={repSeries
                        .map((item, i) => {
                          const x = 24 + (i * 312) / Math.max(1, repSeries.length - 1);
                          const y = 135 - ((item.attendanceRate || 0) / 100) * 105;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  )}
                  {repSeries.map((item, i) => {
                    const x = 24 + (i * 312) / Math.max(1, repSeries.length - 1);
                    const y = 135 - ((item.attendanceRate || 0) / 100) * 105;
                    return (
                      <g key={item.label}>
                        <circle cx={x} cy={y} r="4" fill={item.isCurrent ? "#A3FF12" : "#F3F5F2"} />
                        <text x={x} y="152" textAnchor="middle" fill="#9AA09A" fontSize="10">
                          {item.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Phân bố loại buổi */}
            <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>PHÂN BỐ LOẠI BUỔI</h3>
              {repCats.map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 120, fontSize: 13, color: "#d2d6d2" }}>{c.name}</span>
                  <div className="pt-ath-cat-track">
                    <div className="pt-ath-cat-fill" style={{ width: `${Math.round(((c.count || 0) / maxCatCount) * 100)}%` }} />
                  </div>
                  <strong style={{ width: 32, textAlign: "right", color: "#A3FF12" }}>{c.count}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* ==================== TAB: TỔNG QUAN PT (ATHLETIC PRECISION BENTO) ==================== */
          <>
            <div className="pt-ath-title-row">
              <h1 className="pt-ath-title">OptiGym PT Dashboard</h1>
              <div className="pt-ath-range">
                <button className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>
                  Tuần này
                </button>
                <button className={range === "30d" ? "active" : ""} onClick={() => setRange("30d")}>
                  30 ngày
                </button>
                <button className={range === "all" ? "active" : ""} onClick={() => setRange("all")}>
                  Tất cả
                </button>
              </div>
            </div>

            {/* Mobile Prominent Next Session Card */}
            <section className="pt-ath-mob-next">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#A3FF12", letterSpacing: 0.6 }}>
                  {nextSession ? `BUỔI KẾ TIẾP · ${fmtTime(nextSession.starts_at)}` : "CHƯA CÓ CA SẮP TỚI"}
                </span>
                <span style={{ background: "#A3FF12", color: "#0D0E0D", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 99 }}>
                  {todayDayNum} HÔM NAY
                </span>
              </div>
              {nextSession ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={clientFemale}
                      alt={nextSession.member_name}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #A3FF12" }}
                    />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{nextSession.member_name}</div>
                      <div style={{ fontSize: 12, color: "#9AA09A" }}>
                        {nextSession.room} · {nextSession.duration_minutes}p {nextSession.note ? `· ${nextSession.note}` : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    className="pt-ath-btn-lime"
                    style={{ width: "100%", justifyContent: "center", padding: 12 }}
                    onClick={() => setActiveTab("schedule")}
                  >
                    Mở chi tiết &amp; Điểm danh <ArrowRight size={15} />
                  </button>
                </>
              ) : (
                <button className="pt-ath-btn-lime" onClick={() => setShowNewSession(true)}>
                  + Tạo buổi tập mới
                </button>
              )}
            </section>

            {/* Upper Bento Grid */}
            <section className="pt-ath-upper">
              <div className="pt-ath-left-stack">
                <div className="pt-ath-bento pt-ath-prog">
                  <svg width="68" height="68" viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
                    <circle cx="34" cy="34" r="28" fill="none" stroke="#2C2F2C" strokeWidth="7" />
                    <circle
                      cx="34"
                      cy="34"
                      r="28"
                      fill="none"
                      stroke="#A3FF12"
                      strokeWidth="7"
                      strokeDasharray={`${ringDash} 176`}
                      strokeLinecap="round"
                      transform="rotate(-90 34 34)"
                    />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div className="pt-ath-prog-lbl">Tỷ lệ hoàn thành ca</div>
                    <div className="pt-ath-prog-row">
                      <span className="pt-ath-prog-val">{completionRate}%</span>
                      <span className="pt-ath-prog-delta">
                        {completedCount}/{totalScheduled} ca
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-ath-bento" onClick={() => setActiveTab("programs")} style={{ cursor: "pointer" }}>
                  <div className="pt-ath-phase-title">
                    <span>Phân bổ giai đoạn buổi tập</span>
                    <small style={{ fontSize: 11, color: "#A3FF12" }}>Soạn giáo án →</small>
                  </div>
                  <div className="pt-ath-phase-labels">
                    <span>Khởi động</span>
                    <span>Bài chính</span>
                    <span>Giãn cơ</span>
                  </div>
                  <div className="pt-ath-phase-bars">
                    <div className="pt-ath-pbar p1">{activeTpl.warmup_minutes}p</div>
                    <div className="pt-ath-pbar p2">{activeTpl.main_minutes}p</div>
                    <div className="pt-ath-pbar p3">{activeTpl.cooldown_minutes}p</div>
                  </div>
                </div>

                <div className="pt-ath-bento">
                  <div className="pt-ath-cue-top">
                    <img src={clientFemale} alt={nextSession?.member_name || "Học viên"} />
                    <div className="pt-ath-cue-meta" style={{ flex: 1 }}>
                      <b>{nextSession ? nextSession.member_name : "Chưa có ca sắp tới"}</b>
                      <small>
                        {nextSession
                          ? `${nextSession.room} · ${nextSession.note || "Huấn luyện 1-1"}`
                          : "Nhấn + để lên lịch buổi mới"}
                      </small>
                    </div>
                    <Play size={14} color="#A3FF12" fill="#A3FF12" />
                  </div>
                  <div className="pt-ath-track">
                    <div className="pt-ath-track-fill" />
                  </div>
                  <div className="pt-ath-cue-times">
                    <span>{nextSession ? fmtTime(nextSession.starts_at) : "--:--"}</span>
                    {nextSession ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="pt-ath-btn-lime"
                          style={{ padding: "4px 10px", fontSize: 10 }}
                          disabled={busy}
                          onClick={() => handleSessionAction(nextSession.id, "COMPLETED")}
                        >
                          ✓ Hoàn thành
                        </button>
                        <button
                          className="pt-ath-btn-danger"
                          style={{ padding: "4px 10px", fontSize: 10 }}
                          disabled={busy}
                          onClick={() => handleSessionAction(nextSession.id, "MISSED")}
                        >
                          Vắng
                        </button>
                      </div>
                    ) : (
                      <span>60p</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-ath-bento pt-ath-center">
                <div>
                  <div className="pt-ath-score-top">
                    <span className="pt-ath-score-val">{completionRate}%</span>
                    <span className="pt-ath-score-lbl">Score<br />Chuyên cần</span>
                  </div>
                  <div className="pt-ath-clock">
                    {nextSession ? fmtTime(nextSession.starts_at) : "--:--"} <span>VN</span>
                  </div>
                  <div className="pt-ath-next-mini">
                    <b>{nextSession ? nextSession.member_name : "Trống lịch"}</b>
                    <small>
                      {nextSession
                        ? `${nextSession.duration_minutes}p · ${nextSession.room}`
                        : "Không có buổi CONFIRMED tiếp theo"}
                    </small>
                  </div>
                </div>

                <div className="pt-ath-wheel">
                  <span className="pt-ath-wheel-ghost">{todayDayNum - 1}</span>
                  <div className="pt-ath-wheel-pill">
                    <div className="pt-ath-wheel-circle">{todayDayNum}</div>
                    <div className="pt-ath-wheel-day">HÔM NAY</div>
                  </div>
                  <span className="pt-ath-wheel-ghost">{todayDayNum + 1}</span>
                </div>
              </div>

              <div className="pt-ath-bento pt-ath-hl">
                <div className="pt-ath-hl-left">
                  <div className="pt-ath-hl-title">
                    Hiệu suất {range === "all" ? "tổng hợp" : range === "30d" ? "30 ngày" : "tuần"} (Weekly Highlights)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <svg width="128" height="128" viewBox="0 0 132 132">
                      <circle cx="66" cy="66" r="50" fill="none" stroke="#5B6B42" strokeWidth="22" opacity="0.55" />
                      <circle
                        cx="66"
                        cy="66"
                        r="50"
                        fill="none"
                        stroke="#A3FF12"
                        strokeWidth="22"
                        strokeDasharray={`${donutDash} 314`}
                        transform="rotate(-90 66 66)"
                      />
                      <text x="66" y="72" textAnchor="middle" fill="#F3F5F2" fontSize="22" fontWeight="700">
                        {completionRate}%
                      </text>
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 13, color: "#D2D6D2" }}>
                        Hoàn thành <b style={{ color: "#A3FF12" }}>{completedCount} / {totalScheduled}</b> ca
                      </div>
                      <div style={{ fontSize: 12, color: "#9AA09A" }}>
                        {dash?.todayCount ?? 0} buổi hôm nay · {alerts.length} cần chú ý
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-ath-hl-right">
                  <div className="pt-ath-hl-pills">
                    <div className="pt-ath-stat-pill">
                      <strong>{teachingHours}h</strong>
                      <small>Giờ đứng lớp</small>
                    </div>
                    <div className="pt-ath-stat-pill">
                      <strong>+{String(activeClientsCount).padStart(2, "0")}</strong>
                      <small>Học viên phụ trách</small>
                    </div>
                  </div>
                  <img src={heroAthlete} alt="OptiGym Athlete" className="pt-ath-hero-img" />
                </div>
              </div>
            </section>

            {/* Lower Bento Grid */}
            <section className="pt-ath-lower">
              <div className="pt-ath-bento">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>Hiệu suất huấn luyện</div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#9AA09A" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <i style={{ width: 8, height: 8, borderRadius: 2, background: "#A3FF12", display: "inline-block" }} />
                      Số buổi
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <i style={{ width: 8, height: 8, borderRadius: 2, background: "#6A8540", display: "inline-block" }} />
                      Giờ đứng lớp
                    </span>
                  </div>
                </div>

                <div className="pt-ath-perf-body">
                  <div>
                    <div className="pt-ath-dual-bars">
                      {weeklyBars.map((b) => (
                        <div className="pt-ath-dbar-group" key={b.label} title={`${b.label}: ${b.sessionsCount} ca · ${b.hours}h`}>
                          <div className="pt-ath-dbar-a" style={{ height: Math.max(4, Math.round(((b.sessionsCount || 0) / maxBar) * 126)) }} />
                          <div className="pt-ath-dbar-b" style={{ height: Math.max(4, Math.round(((b.hours || 0) / maxBar) * 126)) }} />
                        </div>
                      ))}
                    </div>
                    <div className="pt-ath-dbar-labels">
                      {weeklyBars.map((b) => (
                        <span key={b.label} style={b.isToday ? { color: "#A3FF12", fontWeight: 700 } : undefined}>
                          {b.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-ath-sum-box">
                    <div className="pt-ath-sum-row"><span>Hoàn thành</span><b>{completedCount} buổi</b></div>
                    <div className="pt-ath-sum-row"><span>Giờ đứng lớp</span><b>{teachingHours} giờ</b></div>
                    <div className="pt-ath-sum-row">
                      <span>Chờ duyệt</span>
                      <b style={{ color: "#A3FF12" }}>{sessions.filter((s) => s.status === "REQUESTED").length} yêu cầu</b>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-ath-bento" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>Lịch &amp; Học viên cần chú ý</div>
                  <button className="pt-ath-btn-ghost" onClick={() => setActiveTab("schedule")}>Xem lịch →</button>
                </div>

                <div className="pt-ath-sub-bento">
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14 }}>Lịch gần nhất ({filteredSessions.slice(0, 5).length} ca)</h4>
                    <div className="pt-ath-av-stack">
                      <img src={heroAthlete} alt="HV 1" />
                      <img src={clientFemale} alt="HV 2" />
                      <img src={ptAvatar} alt="HV 3" />
                      <button className="pt-ath-av-plus" onClick={() => setShowNewSession(true)} title="Thêm ca">+</button>
                    </div>
                    <div style={{ fontSize: 11, color: "#8A908A" }}>
                      {sessions.filter((s) => s.status === "REQUESTED").length} chờ duyệt · {sessions.filter((s) => s.status === "CONFIRMED").length} đã xác nhận
                    </div>
                  </div>
                  <div className="pt-ath-bd-box">
                    <div className="pt-ath-bd-title">Lịch gần nhất</div>
                    {filteredSessions.slice(0, 3).map((s) => (
                      <div className="pt-ath-bd-row" key={s.id}>
                        <b>{fmtTime(s.starts_at)}</b>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 105 }}>{s.member_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-ath-sub-bento">
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14 }}>Học viên cần chú ý ({alerts.length})</h4>
                    <div className="pt-ath-av-stack">
                      <img src={clientFemale} alt="Alert 1" />
                      <img src={heroAthlete} alt="Alert 2" />
                      <img src={ptAvatar} alt="Alert 3" />
                      <button className="pt-ath-av-plus" onClick={() => setActiveTab("clients")} title="Xem học viên">→</button>
                    </div>
                    <div style={{ fontSize: 11, color: "#8A908A" }}>Vắng buổi · Quá hạn InBody · Rà soát giáo án</div>
                  </div>
                  <div className="pt-ath-bd-box">
                    <div className="pt-ath-bd-title">Coaching Alerts</div>
                    {alerts.slice(0, 3).map((a, idx) => (
                      <div className="pt-ath-bd-row" key={`${a.memberId}-${idx}`}>
                        <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 85 }}>{a.memberName}</b>
                        <span style={{ color: a.priority === "HIGH" ? "#f87171" : "#fbbf24" }}>{a.category}</span>
                      </div>
                    ))}
                    {!alerts.length && <div style={{ fontSize: 11, color: "#9aa09a" }}>Không có cảnh báo</div>}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Mobile Floating Bottom Navigation */}
        <nav className="pt-ath-mob-nav" aria-label="Điều hướng di động PT">
          <button
            className={`pt-ath-mnav-btn ${activeTab === "overview" && !showSettings ? "active" : ""}`}
            onClick={() => {
              setActiveTab("overview");
              ctx?.go?.("home");
            }}
          >
            Tổng quan
          </button>
          <button className={`pt-ath-mnav-btn ${activeTab === "schedule" ? "active" : ""}`} onClick={() => setActiveTab("schedule")}>
            Lịch
          </button>
          <button className={`pt-ath-mnav-btn ${activeTab === "clients" ? "active" : ""}`} onClick={() => setActiveTab("clients")}>
            Học viên
          </button>
          <button className={`pt-ath-mnav-btn ${activeTab === "programs" ? "active" : ""}`} onClick={() => setActiveTab("programs")}>
            Giáo án
          </button>
          <button className={`pt-ath-mnav-btn ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            Báo cáo
          </button>
        </nav>
      </main>

      {/* ==================== MODAL: TẠO BUỔI TẬP MỚI ==================== */}
      {showNewSession && (
        <div className="pt-ath-modal-backdrop" onClick={() => setShowNewSession(false)}>
          <form className="pt-ath-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateSession}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Tạo buổi tập 1-1 mới</h3>
              <button type="button" className="pt-ath-btn-ghost" onClick={() => setShowNewSession(false)}><X size={14} /></button>
            </div>
            <label className="pt-ath-field">
              Học viên *
              <select value={sessForm.partner} onChange={(e) => setSessForm({ ...sessForm, partner: e.target.value })} required>
                <option value="">-- Chọn học viên --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (còn {c.remaining_sessions ?? 0} buổi)</option>
                ))}
              </select>
            </label>
            <div className="pt-ath-form-grid">
              <label className="pt-ath-field">
                Thời gian bắt đầu *
                <input type="datetime-local" value={sessForm.starts_at} onChange={(e) => setSessForm({ ...sessForm, starts_at: e.target.value })} required />
              </label>
              <label className="pt-ath-field">
                Thời lượng (phút)
                <input type="number" min="15" max="180" value={sessForm.duration_minutes} onChange={(e) => setSessForm({ ...sessForm, duration_minutes: e.target.value })} />
              </label>
            </div>
            <label className="pt-ath-field">
              Phòng tập
              <select value={sessForm.room_id} onChange={(e) => setSessForm({ ...sessForm, room_id: e.target.value })}>
                {rooms.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </label>
            <label className="pt-ath-field">
              Nội dung buổi tập
              <input value={sessForm.note} onChange={(e) => setSessForm({ ...sessForm, note: e.target.value })} placeholder="VD: Sức mạnh thân trên, đo InBody..." />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="pt-ath-btn-ghost" onClick={() => setShowNewSession(false)}>Hủy</button>
              <button type="submit" className="pt-ath-btn-lime" disabled={busy}>Xác nhận tạo buổi</button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL: GÁN MẪU GIÁO ÁN ==================== */}
      {assignModalTpl && (
        <div className="pt-ath-modal-backdrop" onClick={() => setAssignModalTpl(null)}>
          <form className="pt-ath-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleAssignTemplate}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Gán giáo án: {assignModalTpl.name}</h3>
              <button type="button" className="pt-ath-btn-ghost" onClick={() => setAssignModalTpl(null)}><X size={14} /></button>
            </div>
            <label className="pt-ath-field">
              Chọn học viên nhận giáo án *
              <select value={assignMemberId} onChange={(e) => setAssignMemberId(e.target.value)} required>
                <option value="">-- Chọn học viên --</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <button type="submit" className="pt-ath-btn-lime" disabled={busy}>Đồng bộ giáo án sang học viên</button>
          </form>
        </div>
      )}

      {/* ==================== MODAL: THÔNG BÁO PT ==================== */}
      {showNotifs && (
        <div className="pt-ath-modal-backdrop" onClick={() => setShowNotifs(false)}>
          <div className="pt-ath-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Thông báo PT ({unreadCount} chưa đọc)</h3>
              <button className="pt-ath-btn-ghost" onClick={() => setShowNotifs(false)}><X size={14} /></button>
            </div>
            {notifications.map((n) => (
              <div className="pt-ath-sub-bento" key={n.id} style={{ opacity: n.is_read ? 0.65 : 1 }}>
                <div>
                  <strong style={{ fontSize: 13, color: n.is_read ? "#d2d6d2" : "#A3FF12" }}>{n.title}</strong>
                  <div style={{ fontSize: 12, color: "#9aa09a", marginTop: 2 }}>{n.body}</div>
                  <div style={{ fontSize: 10, color: "#7e847e", marginTop: 4 }}>{fmtDateTime(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <button className="pt-ath-btn-ghost" onClick={() => handleMarkNotifRead(n.id)}>Đã đọc</button>
                )}
              </div>
            ))}
            {!notifications.length && <div style={{ fontSize: 13, color: "#9aa09a" }}>Chưa có thông báo nào.</div>}
          </div>
        </div>
      )}

      {toast && (
        <div className="g-toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToast?.("")}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "inline-flex", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
