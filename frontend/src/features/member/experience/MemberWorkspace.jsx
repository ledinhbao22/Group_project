import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import "./member-dashboard.css";
import promoAthleteImg from "../assets/promo-athlete.jpg";
import memberAvatarImg from "../assets/member-avatar.jpg";
import {
  buildMonthActivityGrid,
  hasScheduleConflict,
  isWithinOneHour,
} from "./memberStreakModel.js";
import {
  formatHeroDateVi,
  getGreetingVi,
  shortMemberName,
  synthesizeMemberNotifications,
} from "./memberDashboardHelpers.js";
import { MemberHomeTab } from "./MemberHomeTab.jsx";
import {
  MemberMembershipTab,
  MemberNotificationsTab,
  MemberProgressTab,
  MemberScheduleTab,
  MemberSettingsTab,
  MemberTrainersTab,
  MemberWorkoutTab,
} from "./MemberSubTabs.jsx";

const VALID_TABS = new Set([
  "home",
  "workout",
  "schedule",
  "trainers",
  "progress",
  "membership",
  "notifications",
  "settings",
]);

const NAV_ITEMS = [
  { id: "home", label: "Tổng quan", icon: Home },
  { id: "workout", label: "Buổi tập của tôi", icon: Dumbbell },
  { id: "schedule", label: "Lịch tập", icon: CalendarDays },
  { id: "trainers", label: "HLV của tôi", icon: User },
  { id: "progress", label: "Tiến độ", icon: BarChart2 },
  { id: "membership", label: "Gói tập", icon: CreditCard },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

const MOBILE_TABS = [
  { id: "home", label: "Tổng quan", icon: Home },
  { id: "workout", label: "Buổi tập", icon: Dumbbell },
  { id: "schedule", label: "Lịch tập", icon: CalendarDays },
  { id: "progress", label: "Tiến độ", icon: BarChart2 },
  { id: "settings", label: "Tài khoản", icon: User },
];

const defaultFutureLocal = () => {
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
};

function buildInitialDemoState(ctx) {
  const today = new Date().toISOString().slice(0, 10);
  const ym = today.slice(0, 7);
  const subs = ctx?.data?.overview?.subscriptions || [];
  const activeSub = subs[0] || {
    id: 501,
    name: "Gói Premium",
    category: "GYM",
    duration_days: 90,
    starts_on: `${ym}-01`,
    ends_on: "2026-12-20",
  };
  return {
    overview: {
      hasActiveSubscription: true,
      activeSubscription: activeSub,
      daysRemaining: 30,
      subscriptions: subs.length ? subs : [activeSub],
      orders: ctx?.data?.orders || [],
      contracts: [
        { id: 1, pt_id: 201, pt_name: "Coach Minh Nguyễn", specialty: "GYM", total_sessions: 12, remaining_sessions: 9 },
      ],
      latestMetric: {
        id: 1,
        weight_kg: 54.5,
        body_fat_pct: 17.8,
        muscle_mass_kg: 24.6,
        inbody_score: 84,
        note: "Tăng cơ tốt, giữ đều nhịp tập",
        recorded_at: new Date().toISOString(),
      },
      streak: {
        currentStreakWeeks: 3,
        bestStreakWeeks: 5,
        currentWeekDone: 4,
        weeklyTarget: 5,
        currentWeekMet: false,
        checkedInDates: [`${ym}-02`, `${ym}-04`, `${ym}-06`, `${ym}-09`, `${ym}-11`, `${ym}-13`, `${ym}-16`, `${ym}-18`, `${ym}-19`, `${ym}-20`],
      },
    },
    trainers: [
      {
        id: 201,
        name: "Coach Minh Nguyễn",
        email: "minh.pt@optigym.vn",
        phone: "0912 345 678",
        specialty: "GYM & Sức mạnh",
        member_code: "OG-00000201",
        remaining_sessions: 9,
        total_sessions: 12,
        completed_sessions_count: 34,
      },
      {
        id: 202,
        name: "Trần Mai Chi",
        email: "chi.pt@optigym.vn",
        phone: "0934 567 890",
        specialty: "YOGA & Phục hồi",
        member_code: "OG-00000202",
        remaining_sessions: 0,
        total_sessions: 0,
        completed_sessions_count: 21,
      },
    ],
    schedule: {
      classes: ctx?.data?.classes?.length
        ? ctx.data.classes
        : [
            {
              id: 1,
              name: "Yoga Flow Class",
              category: "YOGA",
              coach: "Trần Mai Chi",
              room: "Studio Yoga",
              starts_at: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
              duration_minutes: 60,
              capacity: 18,
              filled: 12,
              status: "OPEN",
              my_booking_status: "BOOKED",
            },
            {
              id: 2,
              name: "Boxing Basics",
              category: "BOXING",
              coach: "Coach Minh Nguyễn",
              room: "Khu Boxing",
              starts_at: new Date(Date.now() + 29 * 3600 * 1000).toISOString(),
              duration_minutes: 60,
              capacity: 14,
              filled: 8,
              status: "OPEN",
              my_booking_status: null,
            },
          ],
      ptSessions: [
        {
          id: 901,
          pt_id: 201,
          pt_name: "Coach Minh Nguyễn",
          specialty: "GYM",
          room: "Phòng Gym chính",
          starts_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          duration_minutes: 75,
          status: "CONFIRMED",
          note: "Thân trên: Ngực · Lưng · Vai · Tay",
        },
      ],
    },
    progress: {
      latest: {
        id: 1,
        weight_kg: 54.5,
        body_fat_pct: 17.8,
        muscle_mass_kg: 24.6,
        inbody_score: 84,
        note: "Tăng cơ tốt, giữ đều nhịp tập",
        recorded_by_name: "Coach Minh Nguyễn",
        recorded_at: new Date().toISOString(),
      },
      weightDelta: 0.7,
      metrics: [
        { id: 1, weight_kg: 54.5, body_fat_pct: 17.8, muscle_mass_kg: 24.6, inbody_score: 84, note: "Đo định kỳ", recorded_by_name: "Coach Minh Nguyễn", recorded_at: new Date().toISOString() },
        { id: 2, weight_kg: 54.1, body_fat_pct: 18.1, muscle_mass_kg: 24.1, inbody_score: 82, note: "Giữa kỳ", recorded_by_name: "Coach Minh Nguyễn", recorded_at: `${ym}-10T09:00:00Z` },
        { id: 3, weight_kg: 53.8, body_fat_pct: 18.5, muscle_mass_kg: 23.7, inbody_score: 80, note: "Đầu kỳ", recorded_by_name: "Coach Minh Nguyễn", recorded_at: `${ym}-01T09:00:00Z` },
      ],
    },
    history: {
      sessionsCount: 10,
      focusMinutes: 645,
      checkins: ctx?.data?.checkins?.slice(0, 6) || [],
      logs: [
        {
          id: 1,
          program_name: "Thân trên (Upper Body)",
          duration_minutes: 75,
          feedback: "Ngực · Lưng · Vai · Tay — ổn định mức tạ",
          logged_by_name: "Coach Minh Nguyễn",
          logged_by_role: "PT",
          completed_at: new Date().toISOString(),
        },
      ],
      programs: [
        {
          id: 1,
          name: "Thân trên — Sức mạnh & Hypertrophy",
          source_type: "PT",
          author_name: "Coach Minh Nguyễn",
          notes: "Ngực · Lưng · Vai · Tay",
          exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: "8-10", weight: "45 kg" },
            { name: "Lat Pulldown", sets: 4, reps: "10-12", weight: "40 kg" },
          ],
        },
      ],
    },
  };
}

export function MemberWorkspace({ ctx, page, logout, toast, setToast }) {
  const isDemo = Boolean(ctx?.user?.demo);
  const demoSeed = useMemo(() => buildInitialDemoState(ctx), [isDemo]);

  const normalizeTab = (p) => (VALID_TABS.has(p) ? p : "home");
  const [activeTab, setActiveTab] = useState(() => normalizeTab(page));
  useEffect(() => {
    setActiveTab(normalizeTab(page));
  }, [page]);

  const switchTab = (tab) => {
    const next = normalizeTab(tab);
    setActiveTab(next);
    setMobileDrawerOpen(false);
    ctx?.go?.(next);
  };

  const [historyPeriod, setHistoryPeriod] = useState("month");
  const [calendarYm, setCalendarYm] = useState(() => new Date().toISOString().slice(0, 7));

  const [overview, setOverview] = useState(() => (isDemo ? demoSeed.overview : null));
  const [trainers, setTrainers] = useState(() => (isDemo ? demoSeed.trainers : []));
  const [scheduleData, setScheduleData] = useState(() => (isDemo ? demoSeed.schedule : { classes: [], ptSessions: [] }));
  const [progressData, setProgressData] = useState(() => (isDemo ? demoSeed.progress : { latest: null, weightDelta: null, metrics: [] }));
  const [historyData, setHistoryData] = useState(() => (isDemo ? demoSeed.history : { sessionsCount: 0, focusMinutes: 0, checkins: [], logs: [], programs: [] }));
  const [rooms, setRooms] = useState(() => (Array.isArray(ctx?.data?.rooms) && ctx.data.rooms.length ? ctx.data.rooms : [{ id: 1, name: "Phòng Gym chính" }]));
  const [exerciseLib, setExerciseLib] = useState([]);
  const [busy, setBusy] = useState(false);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState([]);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Modals
  const [selectedPtProfile, setSelectedPtProfile] = useState(null);
  const [bookPtModal, setBookPtModal] = useState(null);
  const [ptBookForm, setPtBookForm] = useState({
    starts_at: defaultFutureLocal(),
    duration_minutes: 60,
    room_id: "1",
    note: "",
  });
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState(null);
  const [showSelfProgramModal, setShowSelfProgramModal] = useState(false);
  const [selfProgName, setSelfProgName] = useState("");
  const [selfProgNotes, setSelfProgNotes] = useState("");
  const [selfProgExercises, setSelfProgExercises] = useState([]);
  const [showSelfLogModal, setShowSelfLogModal] = useState(false);
  const [selfLogForm, setSelfLogForm] = useState({ program_name: "", duration_minutes: 45, feedback: "" });

  // Settings / Account states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profName, setProfName] = useState(ctx?.user?.name || "");
  const [profPhone, setProfPhone] = useState(ctx?.user?.phone || "");
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });

  const notify = (msg) => ctx?.flash?.(msg);

  const loadAll = async (period = historyPeriod) => {
    if (isDemo) return;
    try {
      const [ov, tr, sc, pr, hs, rm, ex] = await Promise.all([
        ctx.api("/member/overview").catch(() => null),
        ctx.api("/member/trainers").catch(() => []),
        ctx.api("/member/schedule").catch(() => ({ classes: [], ptSessions: [] })),
        ctx.api("/member/progress").catch(() => ({ latest: null, weightDelta: null, metrics: [] })),
        ctx.api(`/member/workout-history?period=${period}`).catch(() => null),
        ctx.api("/rooms").catch(() => []),
        ctx.api("/pt/exercises").catch(() => []),
      ]);
      if (ov) setOverview(ov);
      setTrainers(Array.isArray(tr) ? tr : []);
      if (sc) setScheduleData({ classes: sc.classes || [], ptSessions: sc.ptSessions || [] });
      if (pr) setProgressData(pr);
      if (hs) setHistoryData(hs);
      const activeRooms = (Array.isArray(rm) ? rm : []).filter((r) => r.active !== false);
      if (activeRooms.length) setRooms(activeRooms);
      setExerciseLib(Array.isArray(ex) ? ex : []);
    } catch (err) {
      notify(err.message);
    }
  };

  useEffect(() => {
    loadAll(historyPeriod);
  }, [isDemo, historyPeriod]);

  const user = ctx?.user || {};
  const memberName = user.name || "Hội viên OptiGym";
  const shortName = shortMemberName(memberName);
  const memberCode = user.member_code || "OG-MEMBER";

  const streak = historyData?.streak || overview?.streak || {
    currentStreakWeeks: 0,
    bestStreakWeeks: 0,
    currentWeekDone: 0,
    weeklyTarget: 3,
    currentWeekMet: false,
    checkedInDates: [],
  };

  const monthGrid = useMemo(
    () => buildMonthActivityGrid(calendarYm, streak.checkedInDates || []),
    [calendarYm, streak.checkedInDates]
  );

  const hasActiveSub = Boolean(overview?.hasActiveSubscription);
  const activeSub = overview?.activeSubscription || null;
  const daysRemaining = overview?.daysRemaining ?? 0;
  const metricsList = progressData?.metrics || [];
  const latestMetric = progressData?.latest || overview?.latestMetric || null;
  const completedLogs = historyData?.logs || [];
  const checkinsList = historyData?.checkins || [];
  const allPrograms = historyData?.programs || [];

  const myActiveScheduleItems = useMemo(() => {
    const bookedCls = (scheduleData.classes || [])
      .filter((c) => c.my_booking_status === "BOOKED" && c.status === "OPEN")
      .map((c) => ({ starts_at: c.starts_at, duration_minutes: c.duration_minutes, status: "BOOKED" }));
    const openPt = (scheduleData.ptSessions || [])
      .filter((s) => ["REQUESTED", "CONFIRMED"].includes(s.status))
      .map((s) => ({ starts_at: s.starts_at, duration_minutes: s.duration_minutes, status: s.status }));
    return [...bookedCls, ...openPt];
  }, [scheduleData]);

  const nextUpcomingItem = useMemo(() => {
    const now = Date.now();
    const items = [
      ...(scheduleData.ptSessions || [])
        .filter((s) => ["REQUESTED", "CONFIRMED"].includes(s.status) && Date.parse(s.starts_at) >= now - 3600000)
        .map((s) => ({
          id: `pt-${s.id}`,
          title: `Tập 1-1 · ${s.pt_name}`,
          subtitle: s.note || `Huấn luyện cá nhân · ${s.duration_minutes} phút`,
          room: s.room || "Phòng Gym chính",
          starts_at: s.starts_at,
        })),
      ...(scheduleData.classes || [])
        .filter((c) => c.my_booking_status === "BOOKED" && Date.parse(c.starts_at) >= now - 3600000)
        .map((c) => ({
          id: `cls-${c.id}`,
          title: c.name,
          subtitle: `Lớp ${c.category} · HLV ${c.coach}`,
          room: c.room || "Studio",
          starts_at: c.starts_at,
        })),
    ].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
    return items[0] || null;
  }, [scheduleData]);

  const notifications = useMemo(
    () => synthesizeMemberNotifications({ streak, scheduleData, overview, completedLogs }),
    [streak, scheduleData, overview, completedLogs]
  );

  const unreadCount = notifications.filter((n) => n.unread && !readNotifIds.includes(n.id)).length;

  // Backend Action Handlers
  const handleUpdateStreakGoal = async (newTarget) => {
    const target = Number(newTarget);
    if (target < 1 || target > 7) return;
    if (isDemo) {
      setOverview((prev) => ({
        ...prev,
        streak: { ...prev.streak, weeklyTarget: target, currentWeekMet: (prev.streak?.currentWeekDone || 0) >= target },
      }));
      notify(`[Xem thử] Đã đặt mục tiêu ${target} buổi/tuần`);
      return;
    }
    setBusy(true);
    try {
      const updatedStreak = await ctx.api("/member/streak-goal", {
        method: "PUT",
        body: JSON.stringify({ weekly_target: target }),
      });
      setOverview((prev) => (prev ? { ...prev, streak: updatedStreak } : prev));
      setHistoryData((prev) => (prev ? { ...prev, streak: updatedStreak } : prev));
      notify(`Đã cập nhật mục tiêu ${target} buổi/tuần`);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBookClass = async (cls) => {
    if (!hasActiveSub) {
      notify("Bạn cần có gói tập đang còn hạn để đặt lịch. Vui lòng liên hệ quầy lễ tân.");
      return;
    }
    if (hasScheduleConflict(myActiveScheduleItems, cls.starts_at, cls.duration_minutes)) {
      notify("Lớp học này bị trùng khung giờ với lịch tập khác của bạn!");
      return;
    }
    if (isDemo) {
      setScheduleData((prev) => ({
        ...prev,
        classes: prev.classes.map((c) =>
          c.id === cls.id ? { ...c, filled: (c.filled || 0) + 1, my_booking_status: "BOOKED" } : c
        ),
      }));
      notify(`[Xem thử] Đã đặt chỗ lớp ${cls.name}`);
      return;
    }
    setBusy(true);
    try {
      await ctx.api(`/member/classes/${cls.id}/book`, { method: "POST" });
      notify(`Đã đặt chỗ lớp ${cls.name} thành công`);
      await loadAll(historyPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openBookPtModal = (pt) => {
    setBookPtModal(pt);
    setPtBookForm({
      starts_at: defaultFutureLocal(),
      duration_minutes: 60,
      room_id: rooms[0]?.id ? String(rooms[0].id) : "1",
      note: "",
    });
  };

  const handleSubmitBookPt = async (e) => {
    e.preventDefault();
    if (!bookPtModal) return;
    if (!hasActiveSub) {
      notify("Bạn cần có gói tập đang còn hạn để đặt lịch PT 1-1.");
      return;
    }
    const iso = new Date(ptBookForm.starts_at).toISOString();
    if (hasScheduleConflict(myActiveScheduleItems, iso, Number(ptBookForm.duration_minutes))) {
      notify("Khung giờ này bị trùng với một lịch tập khác của bạn!");
      return;
    }
    if (isDemo) {
      const created = {
        id: Date.now(),
        pt_id: bookPtModal.id,
        pt_name: bookPtModal.name,
        specialty: bookPtModal.specialty,
        room: rooms.find((r) => String(r.id) === String(ptBookForm.room_id))?.name || "Phòng Gym chính",
        starts_at: iso,
        duration_minutes: Number(ptBookForm.duration_minutes) || 60,
        status: "REQUESTED",
        note: ptBookForm.note,
      };
      setScheduleData((prev) => ({ ...prev, ptSessions: [created, ...prev.ptSessions] }));
      setBookPtModal(null);
      notify(`[Xem thử] Đã gửi yêu cầu đặt lịch 1-1 với ${bookPtModal.name}`);
      return;
    }
    setBusy(true);
    try {
      await ctx.api("/member/sessions", {
        method: "POST",
        body: JSON.stringify({
          pt_id: bookPtModal.id,
          room_id: Number(ptBookForm.room_id || rooms[0]?.id || 1),
          starts_at: iso,
          duration_minutes: Number(ptBookForm.duration_minutes) || 60,
          note: ptBookForm.note,
        }),
      });
      setBookPtModal(null);
      notify(`Đã gửi lịch hẹn 1-1 tới ${bookPtModal.name}`);
      await loadAll(historyPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const askCancelItem = (kind, item) => {
    setCancelConfirmTarget({ kind, item, isLate: isWithinOneHour(item.starts_at) });
  };

  const confirmCancelSchedule = async () => {
    if (!cancelConfirmTarget) return;
    const { kind, item, isLate } = cancelConfirmTarget;
    if (isDemo) {
      const nextSt = isLate ? "LATE_CANCELLED" : "CANCELLED";
      if (kind === "CLASS") {
        setScheduleData((prev) => ({
          ...prev,
          classes: prev.classes.map((c) =>
            c.id === item.id
              ? { ...c, my_booking_status: nextSt, filled: isLate ? c.filled : Math.max(0, (c.filled || 1) - 1) }
              : c
          ),
        }));
      } else {
        setScheduleData((prev) => ({
          ...prev,
          ptSessions: prev.ptSessions.map((s) => (s.id === item.id ? { ...s, status: nextSt } : s)),
        }));
      }
      setCancelConfirmTarget(null);
      notify(isLate ? "[Xem thử] Đã hủy muộn (<1 tiếng)" : "[Xem thử] Đã hủy lịch đúng hạn");
      return;
    }
    setBusy(true);
    try {
      const url = kind === "CLASS" ? `/member/classes/${item.id}/cancel` : `/member/sessions/${item.id}/cancel`;
      const res = await ctx.api(url, { method: "PATCH" });
      setCancelConfirmTarget(null);
      notify(res.message || "Đã cập nhật hủy lịch");
      await loadAll(historyPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSelfProgram = async (e) => {
    e.preventDefault();
    if (!selfProgName.trim()) return notify("Vui lòng nhập tên giáo án cá nhân");
    if (isDemo) {
      const created = {
        id: Date.now(),
        name: selfProgName.trim(),
        source_type: "SELF",
        author_name: "Tự thiết kế",
        notes: selfProgNotes,
        exercises: selfProgExercises,
      };
      setHistoryData((prev) => ({ ...prev, programs: [created, ...(prev.programs || [])] }));
      setShowSelfProgramModal(false);
      setSelfProgName("");
      setSelfProgNotes("");
      setSelfProgExercises([]);
      notify("[Xem thử] Đã lưu giáo án tự tập");
      return;
    }
    setBusy(true);
    try {
      await ctx.api("/member/self-programs", {
        method: "POST",
        body: JSON.stringify({
          name: selfProgName.trim(),
          notes: selfProgNotes.trim(),
          exercises: selfProgExercises,
        }),
      });
      setShowSelfProgramModal(false);
      setSelfProgName("");
      setSelfProgNotes("");
      setSelfProgExercises([]);
      notify("Đã tạo giáo án cá nhân");
      await loadAll(historyPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSelfLog = async (e) => {
    e.preventDefault();
    if (!selfLogForm.program_name.trim()) return notify("Vui lòng nhập tên buổi tập");
    if (isDemo) {
      const created = {
        id: Date.now(),
        program_name: selfLogForm.program_name.trim(),
        duration_minutes: Number(selfLogForm.duration_minutes) || 45,
        feedback: selfLogForm.feedback,
        logged_by_name: "Tự ghi nhận",
        logged_by_role: "MEMBER",
        completed_at: new Date().toISOString(),
      };
      setHistoryData((prev) => ({
        ...prev,
        sessionsCount: (prev.sessionsCount || 0) + 1,
        focusMinutes: (prev.focusMinutes || 0) + created.duration_minutes,
        logs: [created, ...(prev.logs || [])],
      }));
      setShowSelfLogModal(false);
      setSelfLogForm({ program_name: "", duration_minutes: 45, feedback: "" });
      notify("[Xem thử] Đã lưu nhật ký buổi tập");
      return;
    }
    setBusy(true);
    try {
      await ctx.api("/member/workout-logs", {
        method: "POST",
        body: JSON.stringify({
          program_name: selfLogForm.program_name.trim(),
          duration_minutes: Number(selfLogForm.duration_minutes) || 45,
          feedback: selfLogForm.feedback.trim(),
        }),
      });
      setShowSelfLogModal(false);
      setSelfLogForm({ program_name: "", duration_minutes: 45, feedback: "" });
      notify("Đã lưu log buổi tập vào lịch sử");
      await loadAll(historyPeriod);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const profile = isDemo
        ? { name: profName.trim(), phone: profPhone.trim() }
        : await ctx.api("/account/profile", {
            method: "PATCH",
            body: JSON.stringify({ name: profName.trim(), phone: profPhone.trim() }),
          });
      ctx?.updateUser?.(profile);
      setEditingProfile(false);
      notify("Đã cập nhật thông tin hội viên");
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
      return notify("[Xem thử] Đã đổi mật khẩu");
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

  const heroDateLabel = useMemo(() => formatHeroDateVi(), []);
  const greetingText = useMemo(() => getGreetingVi(), []);

  return (
    <div className="om-root">
      {/* DESKTOP SIDEBAR */}
      <aside className="om-sidebar" aria-label="Điều hướng hội viên">
        <div>
          <button type="button" className="om-brand" onClick={() => switchTab("home")}>
            OPTIGYM<span className="om-brand-dot">.</span>
          </button>

          <nav className="om-nav">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`om-nav-item ${activeTab === id ? "active" : ""}`}
                onClick={() => switchTab(id)}
              >
                <span className="om-nav-left">
                  <span className="om-nav-icon">
                    <Icon size={16} strokeWidth={activeTab === id ? 2.2 : 1.8} />
                  </span>
                  <span>{label}</span>
                </span>
                {id === "notifications" && unreadCount > 0 && (
                  <span className="om-nav-badge">{unreadCount}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="om-promo">
          <img src={promoAthleteImg} alt="Kỷ luật tạo nên vóc dáng" />
          <div className="om-promo-overlay">
            <span className="om-promo-title">
              PHONG ĐỘ
              <br />
              ĐỈNH CAO
            </span>
            <span className="om-promo-bar" />
            <span className="om-promo-code">{memberCode}</span>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="om-main">
        {/* MOBILE STICKY HEADER */}
        <header className="om-mob-header">
          <button
            type="button"
            className="om-brand"
            style={{ padding: 0, fontSize: 18 }}
            onClick={() => switchTab("home")}
          >
            OPTIGYM<span className="om-brand-dot">.</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="om-icon-btn"
              style={{ width: 34, height: 34 }}
              onClick={() => switchTab("notifications")}
              aria-label="Thông báo"
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="om-dot-danger" />}
            </button>
            <button
              type="button"
              className="om-avatar-btn"
              style={{ padding: 2 }}
              onClick={() => switchTab("settings")}
              aria-label="Hồ sơ hội viên"
            >
              <img src={memberAvatarImg} alt={memberName} className="om-avatar-img" style={{ width: 28, height: 28 }} />
            </button>
            <button
              type="button"
              className="om-icon-btn"
              style={{ width: 34, height: 34 }}
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Mở menu"
            >
              <Menu size={17} />
            </button>
          </div>
        </header>

        <div className="om-content">
          <div key={activeTab} className="om-tab-content">
          {/* GREETING HEADER (HOME) */}
          {activeTab === "home" && (
            <>
              <header className="om-header">
                <div>
                  <div className="om-eyebrow">{heroDateLabel}</div>
                  <h1 className="om-greeting">
                    {greetingText}, {shortName}.
                  </h1>
                  <p className="om-subtitle">Kiên trì tạo nên vóc dáng.</p>
                </div>

                <div className="om-header-actions">
                  <button
                    type="button"
                    className="om-icon-btn"
                    onClick={() => switchTab("notifications")}
                    aria-label="Thông báo"
                  >
                    <Bell size={17} />
                    {unreadCount > 0 && <span className="om-dot-danger" />}
                  </button>
                  <button
                    type="button"
                    className="om-avatar-btn"
                    onClick={() => switchTab("settings")}
                    aria-label="Tài khoản hội viên"
                  >
                    <img src={memberAvatarImg} alt={memberName} className="om-avatar-img" />
                    <ChevronDown size={14} />
                  </button>
                </div>
              </header>

              <div className="om-mob-greeting">
                <div className="om-eyebrow">{heroDateLabel}</div>
                <h1 className="om-greeting">
                  {greetingText}, {shortName}.
                </h1>
                <p className="om-subtitle">Kiên trì tạo nên vóc dáng.</p>
              </div>
            </>
          )}

          {/* TAB CONTENT */}
          {activeTab === "home" && (
            <MemberHomeTab
              streak={streak}
              latestMetric={latestMetric}
              metricsList={metricsList}
              nextUpcomingItem={nextUpcomingItem}
              allPrograms={allPrograms}
              completedLogs={completedLogs}
              scheduleData={scheduleData}
              trainers={trainers}
              overview={overview}
              hasActiveSub={hasActiveSub}
              activeSub={activeSub}
              daysRemaining={daysRemaining}
              notifications={notifications}
              busy={busy}
              onSwitchTab={switchTab}
              onBookClass={handleBookClass}
              onOpenBookPt={openBookPtModal}
              onOpenPtProfile={setSelectedPtProfile}
              onOpenSelfLog={() => setShowSelfLogModal(true)}
            />
          )}

          {activeTab === "workout" && (
            <MemberWorkoutTab
              allPrograms={allPrograms}
              completedLogs={completedLogs}
              checkinsList={checkinsList}
              showAllLogs={showAllLogs}
              setShowAllLogs={setShowAllLogs}
              onOpenSelfProgram={() => setShowSelfProgramModal(true)}
              onOpenSelfLog={() => setShowSelfLogModal(true)}
            />
          )}

          {activeTab === "schedule" && (
            <MemberScheduleTab
              scheduleData={scheduleData}
              busy={busy}
              onBookClass={handleBookClass}
              onAskCancel={askCancelItem}
              onGoTrainers={() => switchTab("trainers")}
            />
          )}

          {activeTab === "trainers" && (
            <MemberTrainersTab
              trainers={trainers}
              onOpenProfile={setSelectedPtProfile}
              onOpenBookPt={openBookPtModal}
            />
          )}

          {activeTab === "progress" && (
            <MemberProgressTab
              streak={streak}
              monthGrid={monthGrid}
              setCalendarYm={setCalendarYm}
              historyPeriod={historyPeriod}
              setHistoryPeriod={setHistoryPeriod}
              historyData={historyData}
              progressData={progressData}
              latestMetric={latestMetric}
              metricsList={metricsList}
              busy={busy}
              onUpdateGoal={handleUpdateStreakGoal}
            />
          )}

          {activeTab === "membership" && (
            <MemberMembershipTab
              memberCode={memberCode}
              memberName={memberName}
              hasActiveSub={hasActiveSub}
              activeSub={activeSub}
              daysRemaining={daysRemaining}
              overview={overview}
            />
          )}

          {activeTab === "notifications" && (
            <MemberNotificationsTab
              notifications={notifications}
              readNotifIds={readNotifIds}
              onMarkAllRead={() => setReadNotifIds(notifications.map((n) => n.id))}
            />
          )}

          {activeTab === "settings" && (
            <MemberSettingsTab
              user={user}
              memberName={memberName}
              memberCode={memberCode}
              editingProfile={editingProfile}
              setEditingProfile={setEditingProfile}
              profName={profName}
              setProfName={setProfName}
              profPhone={profPhone}
              setProfPhone={setProfPhone}
              onSaveProfile={handleSaveProfile}
              changingPwd={changingPwd}
              setChangingPwd={setChangingPwd}
              pwdForm={pwdForm}
              setPwdForm={setPwdForm}
              onSubmitPassword={handleSubmitPassword}
              busy={busy}
              logout={logout}
            />
          )}
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="om-mob-tabs" aria-label="Điều hướng di động">
        {MOBILE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`om-mob-tab ${activeTab === id ? "active" : ""}`}
            onClick={() => switchTab(id)}
          >
            <Icon size={19} strokeWidth={activeTab === id ? 2.2 : 1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* MOBILE FULL MENU DRAWER */}
      {mobileDrawerOpen && (
        <div className="om-modal-backdrop" onClick={() => setMobileDrawerOpen(false)}>
          <div className="om-modal" onClick={(e) => e.stopPropagation()}>
            <div className="om-card-head">
              <span className="om-brand" style={{ padding: 0 }}>
                OPTIGYM<span className="om-brand-dot">.</span>
              </span>
              <button type="button" className="om-icon-btn" onClick={() => setMobileDrawerOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`om-nav-item ${activeTab === id ? "active" : ""}`}
                  onClick={() => switchTab(id)}
                >
                  <span className="om-nav-left">
                    <span className="om-nav-icon"><Icon size={16} /></span>
                    <span>{label}</span>
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className="om-btn-danger" onClick={logout}>
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* MODAL: HỒ SƠ CHI TIẾT PT */}
      {selectedPtProfile && (
        <div className="om-modal-backdrop" onClick={() => setSelectedPtProfile(null)}>
          <div className="om-modal" onClick={(e) => e.stopPropagation()}>
            <div className="om-card-head">
              <h3 style={{ margin: 0, fontSize: 18 }}>Hồ sơ Huấn luyện viên</h3>
              <button type="button" className="om-icon-btn" onClick={() => setSelectedPtProfile(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="om-kv-list">
              <div className="om-kv-row"><span>Họ và tên</span><b>{selectedPtProfile.name}</b></div>
              <div className="om-kv-row"><span>Chuyên môn</span><b style={{ color: "#A3E635" }}>{selectedPtProfile.specialty || "GYM"}</b></div>
              <div className="om-kv-row"><span>Email</span><b>{selectedPtProfile.email}</b></div>
              <div className="om-kv-row"><span>Số điện thoại</span><b>{selectedPtProfile.phone || "Tại quầy lễ tân"}</b></div>
              <div className="om-kv-row"><span>Số buổi đã huấn luyện</span><b>{selectedPtProfile.completed_sessions_count || 0} buổi</b></div>
              <div className="om-kv-row">
                <span>Hợp đồng 1-1</span>
                <b style={{ color: "#A3E635" }}>
                  {selectedPtProfile.remaining_sessions > 0
                    ? `Còn ${selectedPtProfile.remaining_sessions}/${selectedPtProfile.total_sessions} buổi`
                    : "Đặt lịch lẻ / Tại quầy"}
                </b>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="om-btn-ghost" onClick={() => setSelectedPtProfile(null)}>Đóng</button>
              <button
                type="button"
                className="om-btn-lime"
                onClick={() => {
                  const pt = selectedPtProfile;
                  setSelectedPtProfile(null);
                  openBookPtModal(pt);
                }}
              >
                Đặt lịch 1-1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐẶT LỊCH 1-1 VỚI PT */}
      {bookPtModal && (
        <div className="om-modal-backdrop" onClick={() => setBookPtModal(null)}>
          <form className="om-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitBookPt}>
            <div className="om-card-head">
              <h3 style={{ margin: 0, fontSize: 18 }}>Đặt lịch 1-1 · {bookPtModal.name}</h3>
              <button type="button" className="om-icon-btn" onClick={() => setBookPtModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="om-grid-2">
              <label className="om-field">
                Ngày &amp; giờ bắt đầu *
                <input
                  type="datetime-local"
                  required
                  value={ptBookForm.starts_at}
                  onChange={(e) => setPtBookForm({ ...ptBookForm, starts_at: e.target.value })}
                />
              </label>
              <label className="om-field">
                Thời lượng (phút)
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={ptBookForm.duration_minutes}
                  onChange={(e) => setPtBookForm({ ...ptBookForm, duration_minutes: e.target.value })}
                />
              </label>
            </div>
            <label className="om-field">
              Phòng tập
              <select
                value={ptBookForm.room_id}
                onChange={(e) => setPtBookForm({ ...ptBookForm, room_id: e.target.value })}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label className="om-field">
              Ghi chú cho HLV
              <input
                value={ptBookForm.note}
                onChange={(e) => setPtBookForm({ ...ptBookForm, note: e.target.value })}
                placeholder="VD: Tập thân trên, kiểm tra kỹ thuật đẩy ngực..."
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="om-btn-ghost" onClick={() => setBookPtModal(null)}>Hủy</button>
              <button type="submit" className="om-btn-lime" disabled={busy}>Xác nhận đặt lịch</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: XÁC NHẬN HỦY LỊCH */}
      {cancelConfirmTarget && (
        <div className="om-modal-backdrop" onClick={() => setCancelConfirmTarget(null)}>
          <div className="om-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18, color: cancelConfirmTarget.isLate ? "#fca5a5" : "#F8FAFC" }}>
              {cancelConfirmTarget.isLate ? "Cảnh báo hủy muộn (< 1 tiếng)!" : "Xác nhận hủy lịch?"}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", lineHeight: 1.55 }}>
              {cancelConfirmTarget.isLate
                ? "Buổi tập sắp bắt đầu trong chưa đầy 1 tiếng. Hủy lúc này vẫn bị trừ 1 buổi PT / slot lớp nhóm theo quy định."
                : "Thời gian hủy hợp lệ (trước 1 tiếng). Bạn không bị trừ buổi và slot sẽ được hoàn lại."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="om-btn-ghost" onClick={() => setCancelConfirmTarget(null)}>Giữ lại</button>
              <button type="button" className="om-btn-danger" disabled={busy} onClick={confirmCancelSchedule}>
                {cancelConfirmTarget.isLate ? "Đồng ý hủy & Trừ buổi" : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TỰ LÊN GIÁO ÁN CÁ NHÂN */}
      {showSelfProgramModal && (
        <div className="om-modal-backdrop" onClick={() => setShowSelfProgramModal(false)}>
          <form className="om-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveSelfProgram}>
            <div className="om-card-head">
              <h3 style={{ margin: 0, fontSize: 18 }}>Tự lên giáo án cá nhân</h3>
              <button type="button" className="om-icon-btn" onClick={() => setShowSelfProgramModal(false)}>
                <X size={16} />
              </button>
            </div>
            <label className="om-field">
              Tên giáo án / Buổi tập *
              <input
                required
                value={selfProgName}
                onChange={(e) => setSelfProgName(e.target.value)}
                placeholder="VD: Thân trên · Ngực Lưng Vai"
              />
            </label>
            <label className="om-field">
              Ghi chú mục tiêu
              <input
                value={selfProgNotes}
                onChange={(e) => setSelfProgNotes(e.target.value)}
                placeholder="VD: Nghỉ 90s giữa hiệp..."
              />
            </label>
            {exerciseLib.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "#A3E635", marginBottom: 6 }}>
                  Thêm bài tập từ thư viện ({selfProgExercises.length} đã chọn):
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 120, overflowY: "auto" }}>
                  {exerciseLib.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      className="om-btn-ghost"
                      style={{ fontSize: 11, padding: "5px 10px" }}
                      onClick={() =>
                        setSelfProgExercises((prev) => [
                          ...prev,
                          { name: ex.name, sets: ex.sets || 3, reps: ex.reps || "10", weight: ex.weight || "" },
                        ])
                      }
                    >
                      + {ex.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="om-btn-ghost" onClick={() => setShowSelfProgramModal(false)}>Hủy</button>
              <button type="submit" className="om-btn-lime" disabled={busy}>Lưu giáo án</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: TỰ GHI LOG BUỔI TẬP */}
      {showSelfLogModal && (
        <div className="om-modal-backdrop" onClick={() => setShowSelfLogModal(false)}>
          <form className="om-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveSelfLog}>
            <div className="om-card-head">
              <h3 style={{ margin: 0, fontSize: 18 }}>Ghi log buổi tập hoàn thành</h3>
              <button type="button" className="om-icon-btn" onClick={() => setShowSelfLogModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="om-grid-2">
              <label className="om-field">
                Tên buổi tập *
                <input
                  required
                  value={selfLogForm.program_name}
                  onChange={(e) => setSelfLogForm({ ...selfLogForm, program_name: e.target.value })}
                  placeholder="VD: Tập Thân trên"
                />
              </label>
              <label className="om-field">
                Thời lượng (phút)
                <input
                  type="number"
                  min="10"
                  max="240"
                  value={selfLogForm.duration_minutes}
                  onChange={(e) => setSelfLogForm({ ...selfLogForm, duration_minutes: e.target.value })}
                />
              </label>
            </div>
            <label className="om-field">
              Cảm nhận / Mức tạ
              <input
                value={selfLogForm.feedback}
                onChange={(e) => setSelfLogForm({ ...selfLogForm, feedback: e.target.value })}
                placeholder="VD: Hoàn thành đủ hiệp, giữ nhịp tốt..."
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="om-btn-ghost" onClick={() => setShowSelfLogModal(false)}>Hủy</button>
              <button type="submit" className="om-btn-lime" disabled={busy}>Lưu buổi tập</button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="om-toast" role="status">
          <CheckCircle2 size={18} color="#A3E635" />
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToast?.("")}
            style={{ background: "none", border: "none", color: "#9CA3AF", padding: 2 }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
