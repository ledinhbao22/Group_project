import React from "react";
import {
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  Clock,
  CreditCard,
  MessageSquare,
  Scale,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import heroAthleteImg from "../assets/hero-athlete.jpg";
import trainerAvatarImg from "../assets/trainer-avatar.jpg";
import yogaClassImg from "../assets/class-yoga.jpg";
import boxingClassImg from "../assets/class-boxing.jpg";
import { buildWeeklyConsistencySeries } from "./memberDashboardHelpers.js";

function pickActivityThumb(cls) {
  const txt = `${cls?.category || ""} ${cls?.name || ""}`.toLowerCase();
  if (txt.includes("yoga") || txt.includes("pilates") || txt.includes("stretch")) {
    return yogaClassImg;
  }
  return boxingClassImg;
}

function fmtShortTime(iso) {
  if (!iso) return "Sắp tới";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateOnly(raw) {
  if (!raw) return "—";
  const s = String(raw).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

export function MemberHomeTab({
  streak,
  latestMetric,
  metricsList,
  nextUpcomingItem,
  allPrograms,
  completedLogs,
  scheduleData,
  trainers,
  overview,
  hasActiveSub,
  activeSub,
  daysRemaining,
  notifications,
  busy,
  onSwitchTab,
  onBookClass,
  onOpenBookPt,
  onOpenPtProfile,
  onOpenSelfLog,
}) {
  const doneWeek = Number(streak?.currentWeekDone || 0);
  const targetWeek = Math.max(1, Number(streak?.weeklyTarget || 3));
  const consistencyPct = Math.min(100, Math.round((doneWeek / targetWeek) * 100));

  // Build 5-bar mini histogram (4 prior days + current progress)
  const miniBarHeights = [
    doneWeek >= 1 ? 22 : 14,
    doneWeek >= 2 ? 28 : 18,
    doneWeek >= 3 ? 24 : 16,
    doneWeek >= 4 ? 32 : 20,
    Math.max(16, Math.round((consistencyPct / 100) * 42)),
  ];

  // Weekly consistency polyline (T2 -> CN)
  const weekSeries = buildWeeklyConsistencySeries(streak?.checkedInDates || [], completedLogs);
  const chartPoints = weekSeries.map((pt, i) => {
    const x = 22 + i * 58;
    const y = Math.round(108 - (pt.pct / 100) * 88);
    return { ...pt, x, y };
  });
  const linePath = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L${chartPoints[chartPoints.length - 1].x} 112 L${chartPoints[0].x} 112 Z`;

  // Body weight sparkline from real metrics (chronological)
  const weightPointsRaw = [...(metricsList || [])]
    .slice(0, 6)
    .reverse()
    .map((m) => Number(m.weight_kg))
    .filter((w) => Number.isFinite(w));
  const sparkValues = weightPointsRaw.length >= 2 ? weightPointsRaw : weightPointsRaw.length === 1 ? [weightPointsRaw[0], weightPointsRaw[0]] : [64, 63.5];
  const minW = Math.min(...sparkValues);
  const maxW = Math.max(...sparkValues);
  const spanW = Math.max(0.5, maxW - minW);
  const sparkCoords = sparkValues.map((w, idx) => {
    const x = 4 + (idx / Math.max(1, sparkValues.length - 1)) * 96;
    const y = Math.round(42 - ((w - minW) / spanW) * 26);
    return { x, y };
  });
  const sparkLine = sparkCoords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const sparkArea = `${sparkLine} L${sparkCoords[sparkCoords.length - 1].x} 52 L${sparkCoords[0].x} 52 Z`;

  // Hero Workout resolution: next scheduled item OR latest workout program
  const primaryProgram = allPrograms?.[0] || null;
  const heroTitle = nextUpcomingItem
    ? nextUpcomingItem.title
    : primaryProgram
      ? primaryProgram.name
      : "THÂN TRÊN & SỨC MẠNH";
  const heroSubtitle = nextUpcomingItem
    ? nextUpcomingItem.subtitle
    : primaryProgram?.notes
      ? primaryProgram.notes
      : "Ngực · Lưng · Vai · Tay · Sẵn sàng bứt phá";
  const heroTime = nextUpcomingItem ? fmtShortTime(nextUpcomingItem.starts_at) : "Tự chọn khung giờ · 60 PHÚT";
  const heroRoom = nextUpcomingItem?.room || "Phòng Gym chính";
  const heroBadge = nextUpcomingItem ? "SẮP DIỄN RA" : primaryProgram ? "GIÁO ÁN HIỆN TẠI" : "GỢI Ý HÔM NAY";

  // Trainer card data
  const primaryContract = overview?.contracts?.[0] || null;
  const primaryTrainer =
    (trainers || []).find((t) => primaryContract && t.id === primaryContract.pt_id) ||
    trainers?.[0] ||
    null;
  const nextPtSession = (scheduleData?.ptSessions || []).find(
    (s) => ["CONFIRMED", "REQUESTED"].includes(s.status) && Date.parse(s.starts_at) >= Date.now() - 3600000
  );

  // Upcoming classes (top 2)
  const upcomingClasses = (scheduleData?.classes || [])
    .filter((c) => c.status === "OPEN")
    .slice(0, 2);

  // Membership progress ratio
  const totalDays = Number(activeSub?.duration_days || 90);
  const planPct = hasActiveSub
    ? Math.max(8, Math.min(100, Math.round((Number(daysRemaining || 0) / Math.max(1, totalDays)) * 100)))
    : 0;

  // Ring Gauge math (r=54 -> C = 2*pi*54 = 339.29)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - consistencyPct / 100);

  return (
    <>
      {/* ROW 1: HERO WORKOUT + 2 KPI CARDS */}
      <div className="om-row-1">
        <article className="om-hero">
          <img
            src={heroAthleteImg}
            alt="Vận động viên tập luyện tại OptiGym"
            className="om-hero-photo"
          />
          <div className="om-hero-scrim" aria-hidden="true" />
          <div className="om-hero-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="om-card-label">BUỔI TẬP HÔM NAY</span>
                <span className="om-pill upcoming">
                  {heroBadge}
                  <span className="om-pill-dot" />
                </span>
              </div>
              <h2 className="om-hero-title">{heroTitle}</h2>
              <p className="om-hero-sub">{heroSubtitle}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="om-hero-meta">
                <span>
                  <Clock size={15} color="#9CA3AF" />
                  {heroTime}
                </span>
                <span>
                  <Building2 size={15} color="#9CA3AF" />
                  {heroRoom}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="om-btn-lime"
                  onClick={() => onSwitchTab(nextUpcomingItem ? "schedule" : "workout")}
                >
                  <span>XEM BUỔI TẬP</span>
                  <ArrowUpRight size={15} />
                </button>
                <button type="button" className="om-btn-ghost" onClick={onOpenSelfLog}>
                  + Ghi log tập
                </button>
              </div>
            </div>
          </div>
        </article>

        <div className="om-kpi-stack">
          {/* KPI 1: THIS WEEK */}
          <div className="om-kpi-card" onClick={() => onSwitchTab("progress")} style={{ cursor: "pointer" }}>
            <div>
              <div className="om-card-label">
                <span className="om-kpi-icon-box">
                  <CalendarCheck size={14} />
                </span>
                TUẦN NÀY
              </div>
              <div className="om-kpi-value">
                {String(doneWeek).padStart(2, "0")} / {String(targetWeek).padStart(2, "0")}
              </div>
              <div className="om-kpi-sub">Buổi đã hoàn thành</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div className="om-bars-mini" aria-hidden="true">
                {miniBarHeights.map((h, idx) => (
                  <div
                    key={idx}
                    className={`om-bar-col ${idx === 4 ? "lime" : ""}`}
                    style={{ height: h }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#A3E635", whiteSpace: "nowrap" }}>
                🔥 Chuỗi {streak?.currentStreakWeeks || 0} tuần
              </span>
            </div>
          </div>

          {/* KPI 2: BODY WEIGHT */}
          <div className="om-kpi-card" onClick={() => onSwitchTab("progress")} style={{ cursor: "pointer" }}>
            <div>
              <div className="om-card-label">
                <span className="om-kpi-icon-box">
                  <Scale size={14} />
                </span>
                CÂN NẶNG
              </div>
              <div className="om-kpi-value">
                {latestMetric?.weight_kg ? `${latestMetric.weight_kg} kg` : "Chưa đo"}
              </div>
              <div className="om-kpi-sub">
                {latestMetric ? `InBody ${latestMetric.inbody_score ?? "—"} · Do PT đo` : "Chưa có lần đo InBody"}
              </div>
            </div>

            <svg width="104" height="54" viewBox="0 0 104 54" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="omWeightGrad" x1="0" y1="0" x2="0" y2="54" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#A3E635" stopOpacity="0.32" />
                  <stop offset="1" stopColor="#A3E635" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={sparkArea} fill="url(#omWeightGrad)" />
              <path d={sparkLine} stroke="#A3E635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle
                cx={sparkCoords[sparkCoords.length - 1].x}
                cy={sparkCoords[sparkCoords.length - 1].y}
                r="4"
                fill="#A3E635"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ROW 2: YOUR PROGRESS + YOUR TRAINER */}
      <div className="om-row-2">
        {/* Progress Chart Card */}
        <section className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">
              <TrendingUp size={15} />
              TIẾN ĐỘ CỦA BẠN
            </span>
            <button type="button" className="om-link-lime" onClick={() => onSwitchTab("progress")}>
              XEM TẤT CẢ <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="om-progress-body">
            <div className="om-gauge-wrap">
              <svg width="100%" height="100%" viewBox="0 0 132 132">
                <circle
                  cx="66"
                  cy="66"
                  r={radius}
                  fill="none"
                  stroke="#22262D"
                  strokeWidth="12"
                />
                <circle
                  cx="66"
                  cy="66"
                  r={radius}
                  fill="none"
                  stroke="#A3E635"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 66 66)"
                />
              </svg>
              <div className="om-gauge-center">
                <strong>{consistencyPct}%</strong>
                <span>Mục tiêu<br />hàng tuần</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <svg width="100%" viewBox="0 0 400 138" fill="none" role="img" aria-label="Biểu đồ đều đặn trong tuần">
                <defs>
                  <linearGradient id="omWeekGrad" x1="0" y1="0" x2="0" y2="112" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A3E635" stopOpacity="0.24" />
                    <stop offset="1" stopColor="#A3E635" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[
                  ["100%", 20],
                  ["75%", 43],
                  ["50%", 66],
                  ["25%", 89],
                  ["0%", 112],
                ].map(([lbl, y]) => (
                  <g key={lbl}>
                    <text x="0" y={y + 3} fill="#6B7280" fontSize="9.5" fontFamily="inherit">
                      {lbl}
                    </text>
                    <line x1="34" y1={y} x2="392" y2={y} stroke="#22262D" strokeWidth="1" />
                  </g>
                ))}
                <g transform="translate(18, 0)">
                  <path d={areaPath} fill="url(#omWeekGrad)" />
                  <path d={linePath} stroke="#A3E635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  {chartPoints.map((p) => (
                    <g key={p.label}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={p.active ? "4.5" : "3.5"}
                        fill={p.active ? "#B4F446" : "#A3E635"}
                        stroke="#16181C"
                        strokeWidth="1.5"
                      />
                      <text x={p.x} y="132" textAnchor="middle" fill="#6B7280" fontSize="10" fontFamily="inherit">
                        {p.label}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* Your Trainer Card */}
        <section className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">
              <User size={15} />
              HLV CỦA BẠN
            </span>
            <button type="button" className="om-link-lime" onClick={() => onSwitchTab("trainers")}>
              ĐỘI NGŨ PT <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="om-trainer-body">
            <div className="om-trainer-left">
              <img
                src={trainerAvatarImg}
                alt={primaryTrainer?.name || "Huấn luyện viên cá nhân"}
                className="om-trainer-avatar"
              />
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <strong style={{ fontSize: 16, fontWeight: 600, color: "#F8FAFC" }}>
                  {primaryTrainer ? primaryTrainer.name : "Chưa gán HLV"}
                </strong>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                  {primaryTrainer
                    ? `Chuyên môn ${primaryTrainer.specialty || "GYM"}`
                    : "Chọn HLV để đặt lịch 1-1"}
                  {primaryContract ? ` · Còn ${primaryContract.remaining_sessions} buổi` : ""}
                </span>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {primaryTrainer ? (
                    <>
                      <button
                        type="button"
                        className="om-btn-ghost"
                        onClick={() => onOpenPtProfile(primaryTrainer)}
                      >
                        <MessageSquare size={13} />
                        Hồ sơ PT
                      </button>
                      <button
                        type="button"
                        className="om-pill booked"
                        onClick={() => onOpenBookPt(primaryTrainer)}
                      >
                        Đặt 1-1
                      </button>
                    </>
                  ) : (
                    <button type="button" className="om-btn-ghost" onClick={() => onSwitchTab("trainers")}>
                      Chọn HLV
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="om-trainer-divider" aria-hidden="true" />

            <div className="om-trainer-appt">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9CA3AF" }}>
                  <Calendar size={13} />
                  <span>Lịch hẹn kế tiếp</span>
                </div>
                <strong style={{ display: "block", fontSize: 14, color: "#F8FAFC", marginTop: 4 }}>
                  {nextPtSession ? fmtShortTime(nextPtSession.starts_at) : "Chưa có lịch hẹn"}
                </strong>
              </div>
              <button type="button" className="om-link-lime" onClick={() => onSwitchTab("schedule")}>
                Xem lịch tập <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ROW 3: MEMBERSHIP + UPCOMING ACTIVITIES + NOTIFICATIONS */}
      <div className="om-row-3">
        {/* Membership */}
        <section className="om-card" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="om-card-head">
              <span className="om-card-label">
                <CreditCard size={15} />
                GÓI TẬP
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 17, fontWeight: 700, color: "#F8FAFC" }}>
                {hasActiveSub ? activeSub?.name : "Chưa có gói còn hạn"}
              </strong>
              <span className={`om-pill ${hasActiveSub ? "active" : "danger"}`}>
                {hasActiveSub ? "Đang hoạt động" : "Hết hạn"}
              </span>
            </div>

            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              {hasActiveSub
                ? `Hiệu lực đến ${fmtDateOnly(activeSub?.ends_on)} (còn ${daysRemaining} ngày)`
                : "Đăng ký hoặc gia hạn trực tiếp tại quầy lễ tân."}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="om-progress-track" aria-label="Thời hạn gói tập còn lại">
              <div className="om-progress-fill" style={{ width: `${planPct}%` }} />
            </div>
            <button type="button" className="om-btn-ghost" onClick={() => onSwitchTab("membership")}>
              Quản lý gói <ArrowUpRight size={13} />
            </button>
          </div>
        </section>

        {/* Upcoming Activities */}
        <section className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">
              <Calendar size={15} />
              HOẠT ĐỘNG SẮP TỚI
            </span>
            <button type="button" className="om-link-lime" onClick={() => onSwitchTab("schedule")}>
              Xem lịch <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcomingClasses.map((cls) => {
              const isBooked = cls.my_booking_status === "BOOKED";
              const isFull = Number(cls.filled || 0) >= Number(cls.capacity || 20);
              return (
                <div className="om-list-row" key={cls.id}>
                  <img src={pickActivityThumb(cls)} alt={cls.name} className="om-thumb" />
                  <div className="om-list-meta">
                    <strong>{cls.name}</strong>
                    <span>
                      {fmtShortTime(cls.starts_at)} · {cls.filled || 0}/{cls.capacity} chỗ
                    </span>
                  </div>
                  {isBooked ? (
                    <button
                      type="button"
                      className="om-pill booked"
                      onClick={() => onSwitchTab("schedule")}
                    >
                      Đã đặt
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="om-pill book"
                      disabled={busy || isFull}
                      onClick={() => onBookClass(cls)}
                    >
                      {isFull ? "Đầy" : "Đặt chỗ"}
                    </button>
                  )}
                </div>
              );
            })}
            {!upcomingClasses.length && (
              <div style={{ fontSize: 13, color: "#9CA3AF", padding: "8px 0" }}>
                Chưa có lớp nhóm nào sắp mở. Bấm &ldquo;Xem lịch&rdquo; để đặt buổi PT 1-1.
              </div>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">
              <Bell size={15} />
              THÔNG BÁO
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#EF4444",
                  display: "inline-block",
                }}
              />
            </span>
            <button type="button" className="om-link-lime" onClick={() => onSwitchTab("notifications")}>
              Xem tất cả <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(notifications || []).slice(0, 2).map((n) => (
              <div
                className="om-list-row"
                key={n.id}
                onClick={() => onSwitchTab("notifications")}
                style={{ cursor: "pointer" }}
              >
                <span className="om-notif-icon">
                  {n.kind === "trophy" ? (
                    <Trophy size={15} color="#F59E0B" />
                  ) : (
                    <CalendarCheck size={15} color="#A3E635" />
                  )}
                </span>
                <div className="om-list-meta">
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                </div>
                <small style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{n.time}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
