import React from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  LogOut,
  Plus,
  ShieldCheck,
  Trophy,
  UserCheck,
} from "lucide-react";
import trainerAvatarImg from "../assets/trainer-avatar.jpg";
import { currency } from "../../../shared/lib/format.js";
import { formatFocusTime, isWithinOneHour, shiftYearMonth } from "./memberStreakModel.js";

const STATUS_LABELS = {
  BOOKED: "Đã giữ chỗ",
  REQUESTED: "Chờ PT duyệt",
  CONFIRMED: "Đã lên lịch",
  COMPLETED: "Hoàn thành",
  MISSED: "Vắng buổi",
  CANCELLED: "Đã hủy",
  LATE_CANCELLED: "Hủy muộn (đã trừ buổi/slot)",
  REJECTED: "PT từ chối",
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDateOnly = (raw) => {
  if (!raw) return "—";
  const s = String(raw).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return fmtDateTime(raw);
};

export function MemberWorkoutTab({
  allPrograms,
  completedLogs,
  checkinsList,
  showAllLogs,
  setShowAllLogs,
  onOpenSelfProgram,
  onOpenSelfLog,
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="om-page-head">
        <div>
          <div className="om-eyebrow">CHƯƠNG TRÌNH &amp; NHẬT KÝ TẬP LUYỆN</div>
          <h1>Buổi tập của tôi</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="om-btn-ghost" onClick={onOpenSelfProgram}>
            <Plus size={14} /> Tự lên giáo án
          </button>
          <button type="button" className="om-btn-lime" onClick={onOpenSelfLog}>
            <Plus size={14} /> Ghi log buổi tập
          </button>
        </div>
      </div>

      <div className="om-grid-2">
        <div className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">GIÁO ÁN 1-1 &amp; TỰ TẬP ({allPrograms.length})</span>
          </div>
          {allPrograms.map((p) => (
            <div
              key={p.id}
              className="om-list-row"
              style={{ flexDirection: "column", alignItems: "stretch", gap: 8, padding: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 14 }}>{p.name}</strong>
                <span className="om-pill upcoming">
                  {p.source_type === "PT" ? `PT: ${p.author_name}` : "Tự thiết kế"}
                </span>
              </div>
              {p.notes && <div style={{ fontSize: 12, color: "#9CA3AF" }}>{p.notes}</div>}
              {(p.exercises || []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {p.exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        padding: "5px 8px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <span>{idx + 1}. {ex.name}</span>
                      <span style={{ color: "#A3E635", fontWeight: 600 }}>
                        {ex.sets} hiệp × {ex.reps} {ex.weight ? `· ${ex.weight}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!allPrograms.length && (
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>
              Chưa có giáo án nào. PT sẽ giao giáo án cho bạn hoặc bạn có thể bấm &ldquo;Tự lên giáo án&rdquo;.
            </div>
          )}
        </div>

        <div className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">
              NHẬT KÝ BUỔI TẬP &amp; CHECK-IN ({completedLogs.length + checkinsList.length})
            </span>
            <button type="button" className="om-link-lime" onClick={() => setShowAllLogs((v) => !v)}>
              <Eye size={13} /> {showAllLogs ? "Thu gọn" : "Xem toàn bộ"}
            </button>
          </div>
          {completedLogs.slice(0, showAllLogs ? 50 : 6).map((l) => (
            <div className="om-list-row" key={`log-${l.id}`}>
              <div className="om-list-meta">
                <strong>{l.program_name}</strong>
                <span>
                  {l.duration_minutes} phút · {l.logged_by_role === "PT" ? `PT: ${l.logged_by_name}` : "Tự ghi nhận"}
                  {l.feedback ? ` · "${l.feedback}"` : ""}
                </span>
              </div>
              <small style={{ fontSize: 11, color: "#A3E635", whiteSpace: "nowrap" }}>
                {fmtDateTime(l.completed_at)}
              </small>
            </div>
          ))}
          {checkinsList.slice(0, showAllLogs ? 50 : 4).map((c) => (
            <div className="om-list-row" key={`chk-${c.id}`}>
              <div className="om-list-meta">
                <strong>Check-in · {c.room}</strong>
                <span>Vào lúc {fmtDateTime(c.checked_in_at)} · ~{c.duration_minutes || 60} phút</span>
              </div>
              <span className="om-pill booked">Check-in</span>
            </div>
          ))}
          {!completedLogs.length && !checkinsList.length && (
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>Chưa có log buổi tập hoàn thành.</div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MemberScheduleTab({
  scheduleData,
  busy,
  onBookClass,
  onAskCancel,
  onGoTrainers,
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="om-page-head">
        <div>
          <div className="om-eyebrow">ĐẶT CHỖ LỚP NHÓM &amp; QUẢN LÝ LỊCH PT 1-1</div>
          <h1>Lịch tập &amp; Lớp học</h1>
        </div>
        <button type="button" className="om-btn-lime" onClick={onGoTrainers}>
          <Plus size={14} /> Đặt lịch PT 1-1
        </button>
      </div>

      <div
        className="om-card"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "rgba(163, 230, 53, 0.06)",
          borderColor: "rgba(163, 230, 53, 0.28)",
        }}
      >
        <AlertTriangle size={18} color="#A3E635" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "#D1D5DB", lineHeight: 1.5 }}>
          <b style={{ color: "#A3E635" }}>Quy định CLB:</b> Cần gói tập còn hạn để đặt lịch. Hệ thống tự động chặn đặt trùng giờ giữa lớp nhóm và PT 1-1. Hủy muộn dưới <b>1 tiếng</b> vẫn bị trừ 1 buổi PT / slot nhóm.
        </span>
      </div>

      <div className="om-grid-2">
        <div className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">LỊCH HẸN PT 1-1 CỦA TÔI ({(scheduleData.ptSessions || []).length})</span>
          </div>
          {(scheduleData.ptSessions || []).map((s) => {
            const canCancel = ["REQUESTED", "CONFIRMED"].includes(s.status) && Date.parse(s.starts_at) > Date.now();
            const lateWarn = isWithinOneHour(s.starts_at);
            return (
              <div className="om-list-row" key={s.id}>
                <div className="om-list-meta">
                  <strong>PT {s.pt_name} · {STATUS_LABELS[s.status] || s.status}</strong>
                  <span>{fmtDateTime(s.starts_at)} · {s.duration_minutes} phút · {s.room}</span>
                  {s.note && <span>Ghi chú: {s.note}</span>}
                </div>
                {canCancel && (
                  <button
                    type="button"
                    className="om-btn-danger"
                    disabled={busy}
                    onClick={() => onAskCancel("PT", s)}
                  >
                    {lateWarn ? "Hủy (<1h)" : "Hủy lịch"}
                  </button>
                )}
              </div>
            );
          })}
          {!(scheduleData.ptSessions || []).length && (
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>Bạn chưa có buổi tập 1-1 nào.</div>
          )}
        </div>

        <div className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">LỚP HỌC NHÓM TẠI CLB ({(scheduleData.classes || []).length})</span>
          </div>
          {(scheduleData.classes || []).map((c) => {
            const isBooked = c.my_booking_status === "BOOKED";
            const isLateCancelled = c.my_booking_status === "LATE_CANCELLED";
            const isFuture = Date.parse(c.starts_at) > Date.now();
            const isFull = Number(c.filled || 0) >= Number(c.capacity || 20);
            return (
              <div className="om-list-row" key={c.id}>
                <div className="om-list-meta">
                  <strong>{c.name} ({c.category})</strong>
                  <span>
                    {fmtDateTime(c.starts_at)} · {c.room} · HLV {c.coach} · {c.filled || 0}/{c.capacity} chỗ
                  </span>
                </div>
                {c.status === "OPEN" && isFuture && (
                  isBooked ? (
                    <button
                      type="button"
                      className="om-btn-danger"
                      disabled={busy}
                      onClick={() => onAskCancel("CLASS", c)}
                    >
                      Hủy chỗ
                    </button>
                  ) : isLateCancelled ? (
                    <span className="om-pill danger">Đã trừ slot</span>
                  ) : (
                    <button
                      type="button"
                      className="om-btn-lime"
                      style={{ padding: "7px 14px" }}
                      disabled={busy || isFull}
                      onClick={() => onBookClass(c)}
                    >
                      {isFull ? "Hết chỗ" : "Đặt chỗ"}
                    </button>
                  )
                )}
              </div>
            );
          })}
          {!(scheduleData.classes || []).length && (
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>Hiện chưa có lớp nhóm nào mở đăng ký.</div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MemberTrainersTab({ trainers, onOpenProfile, onOpenBookPt }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="om-page-head">
        <div>
          <div className="om-eyebrow">DANH SÁCH HUẤN LUYỆN VIÊN ĐANG HOẠT ĐỘNG</div>
          <h1>HLV của tôi ({trainers.length})</h1>
        </div>
      </div>

      <div className="om-grid-3">
        {trainers.map((pt) => (
          <div className="om-card" key={pt.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src={trainerAvatarImg} alt={pt.name} className="om-trainer-avatar" />
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 16, display: "block" }}>{pt.name}</strong>
                <span style={{ fontSize: 12, color: "#A3E635", fontWeight: 600 }}>
                  Chuyên môn: {pt.specialty || "GYM"}
                </span>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                  Đã hướng dẫn {pt.completed_sessions_count || 0} buổi
                </div>
              </div>
            </div>

            {Number(pt.remaining_sessions) > 0 && (
              <div className="om-kv-row">
                <span>Hợp đồng 1-1 của bạn</span>
                <b style={{ color: "#A3E635" }}>Còn {pt.remaining_sessions}/{pt.total_sessions} buổi</b>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <button type="button" className="om-btn-ghost" onClick={() => onOpenProfile(pt)} style={{ flex: 1 }}>
                <UserCheck size={14} /> Hồ sơ PT
              </button>
              <button type="button" className="om-btn-lime" onClick={() => onOpenBookPt(pt)} style={{ flex: 1 }}>
                <Plus size={14} /> Đặt lịch 1-1
              </button>
            </div>
          </div>
        ))}
        {!trainers.length && (
          <div className="om-card" style={{ color: "#9CA3AF", fontSize: 13 }}>
            Hiện chưa có huấn luyện viên nào sẵn sàng.
          </div>
        )}
      </div>
    </section>
  );
}

export function MemberProgressTab({
  streak,
  monthGrid,
  setCalendarYm,
  historyPeriod,
  setHistoryPeriod,
  historyData,
  progressData,
  latestMetric,
  metricsList,
  busy,
  onUpdateGoal,
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="om-page-head">
        <div>
          <div className="om-eyebrow">CHUỖI STREAK TUẦN &amp; CHỈ SỐ INBODY (DO PT ĐO)</div>
          <h1>Tiến độ tập luyện</h1>
        </div>
      </div>

      <div className="om-grid-2">
        {/* Left: Streak & Activity Calendar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="om-card" style={{ alignItems: "center", textAlign: "center" }}>
            <Flame size={40} color="#A3E635" />
            <div style={{ fontSize: 50, fontWeight: 800, color: "#A3E635", lineHeight: 1 }}>
              {streak.currentStreakWeeks || 0}
            </div>
            <strong style={{ fontSize: 15 }}>Chuỗi tuần đạt mục tiêu (Kỷ lục: {streak.bestStreakWeeks || 0} tuần)</strong>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              Tuần này: <b style={{ color: "#A3E635" }}>{streak.currentWeekDone || 0}/{streak.weeklyTarget || 3}</b> buổi check-in
            </span>

            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>MỤC TIÊU SỐ BUỔI / TUẦN:</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                  const active = Number(streak.weeklyTarget || 3) === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={busy}
                      onClick={() => onUpdateGoal(num)}
                      className={active ? "om-btn-lime" : "om-btn-ghost"}
                      style={{ padding: "6px 10px", borderRadius: 8 }}
                    >
                      {num}b
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="om-card">
            <div className="om-card-head">
              <button
                type="button"
                className="om-icon-btn"
                onClick={() => setCalendarYm((ym) => shiftYearMonth(ym, -1))}
                aria-label="Tháng trước"
              >
                <ChevronLeft size={16} />
              </button>
              <strong style={{ fontSize: 15 }}>{monthGrid.monthLabel}</strong>
              <button
                type="button"
                className="om-icon-btn"
                onClick={() => setCalendarYm((ym) => shiftYearMonth(ym, 1))}
                aria-label="Tháng sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="om-cal-grid" style={{ textAlign: "center", fontSize: 11, color: "#6B7280", fontWeight: 700 }}>
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="om-cal-grid">
              {monthGrid.cells.map((cell) =>
                cell.empty ? (
                  <div key={cell.key} />
                ) : (
                  <div
                    key={cell.key}
                    className={`om-cal-cell ${cell.active ? "active" : ""} ${cell.isToday ? "today" : ""}`}
                    title={`${cell.date}: ${cell.active ? "Đã check-in" : "Chưa check-in"}`}
                  >
                    {cell.day}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right: Period stats & InBody Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, background: "#16181C", padding: 5, borderRadius: 999, border: "1px solid #262A31" }}>
            {[
              ["week", "Tuần"],
              ["month", "Tháng"],
              ["all", "Tất cả"],
            ].map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setHistoryPeriod(k)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: historyPeriod === k ? "#A3E635" : "transparent",
                  color: historyPeriod === k ? "#0B0D08" : "#9CA3AF",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="om-strip-cell">
              <small>SỐ BUỔI TẬP</small>
              <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={18} color="#A3E635" />
                {historyData?.sessionsCount ?? 0}
              </strong>
            </div>
            <div className="om-strip-cell">
              <small>THỜI GIAN TẬP</small>
              <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={18} color="#A3E635" />
                {formatFocusTime(historyData?.focusMinutes ?? 0)}
              </strong>
            </div>
          </div>

          <div className="om-card">
            <div className="om-card-head">
              <span className="om-card-label">
                <Activity size={15} /> CHỈ SỐ CƠ THỂ &amp; INBODY
              </span>
              <span className="om-pill upcoming">Chỉ xem · PT đo</span>
            </div>

            {metricsList.length > 0 ? (
              <>
                <div className="om-strip">
                  <div className="om-strip-cell">
                    <small>CÂN NẶNG</small>
                    <strong>{latestMetric?.weight_kg} kg</strong>
                    <span style={{ color: "#A3E635" }}>
                      {progressData?.weightDelta != null
                        ? `${progressData.weightDelta > 0 ? "+" : ""}${progressData.weightDelta} kg so với đầu kỳ`
                        : "Lần đo đầu"}
                    </span>
                  </div>
                  <div className="om-strip-cell">
                    <small>MỠ / CƠ</small>
                    <strong>{latestMetric?.body_fat_pct ?? "—"}%</strong>
                    <span>Cơ: {latestMetric?.muscle_mass_kg ?? "—"} kg</span>
                  </div>
                  <div className="om-strip-cell">
                    <small>ĐIỂM INBODY</small>
                    <strong style={{ color: "#A3E635" }}>{latestMetric?.inbody_score ?? "—"}</strong>
                    <span>{latestMetric?.recorded_by_name || "HLV"}</span>
                  </div>
                </div>

                {metricsList.slice(0, 6).map((m) => (
                  <div className="om-list-row" key={m.id}>
                    <div className="om-list-meta">
                      <strong>{m.weight_kg} kg · InBody {m.inbody_score ?? "—"}</strong>
                      <span>
                        Mỡ {m.body_fat_pct ?? "—"}% · Cơ {m.muscle_mass_kg ?? "—"} kg {m.note ? `· ${m.note}` : ""}
                      </span>
                    </div>
                    <small style={{ fontSize: 11, color: "#9CA3AF" }}>{fmtDateOnly(m.recorded_at)}</small>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ fontSize: 13, color: "#9CA3AF" }}>
                Chưa có bản ghi InBody nào. Hãy liên hệ PT để đo chỉ số đầu tiên.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MemberMembershipTab({ memberCode, memberName, hasActiveSub, activeSub, daysRemaining, overview }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="om-page-head">
        <div>
          <div className="om-eyebrow">THẺ HỘI VIÊN ĐIỆN TỬ &amp; LỊCH SỬ TẠI QUẦY</div>
          <h1>Gói tập &amp; Hóa đơn</h1>
        </div>
      </div>

      <div className="om-grid-2">
        <div className="om-card">
          <div
            style={{
              padding: 20,
              borderRadius: 14,
              background: "radial-gradient(circle at 85% 20%, rgba(163, 230, 53, 0.2), #121412 72%)",
              border: "1px solid #4C6B1A",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="om-pill upcoming">THẺ HỘI VIÊN OPTIGYM</span>
              <strong style={{ color: "#A3E635", fontFamily: "monospace", fontSize: 14 }}>{memberCode}</strong>
            </div>
            <h2 style={{ margin: "12px 0 6px", fontSize: 22 }}>{memberName}</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#D1D5DB" }}>
              {hasActiveSub
                ? `Đang kích hoạt: ${activeSub?.name} · Còn ${daysRemaining} ngày (hết hạn ${fmtDateOnly(activeSub?.ends_on)})`
                : "Chưa có gói tập còn hạn. Vui lòng gia hạn tại quầy lễ tân."}
            </p>
          </div>

          <span className="om-card-label">GÓI TẬP ĐÃ ĐĂNG KÝ</span>
          {(overview?.subscriptions || []).map((s) => (
            <div className="om-list-row" key={s.id}>
              <div className="om-list-meta">
                <strong>{s.name}</strong>
                <span>{fmtDateOnly(s.starts_on)} → {fmtDateOnly(s.ends_on)}</span>
              </div>
              <span className="om-pill upcoming">{s.category}</span>
            </div>
          ))}

          {(overview?.contracts || []).length > 0 && (
            <>
              <span className="om-card-label" style={{ marginTop: 6 }}>HỢP ĐỒNG PT 1-1</span>
              {overview.contracts.map((c) => (
                <div className="om-list-row" key={c.id}>
                  <div className="om-list-meta">
                    <strong>PT {c.pt_name} ({c.specialty})</strong>
                    <span>Tổng {c.total_sessions} buổi</span>
                  </div>
                  <span className="om-pill booked">Còn {c.remaining_sessions} buổi</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">LỊCH SỬ HÓA ĐƠN ({(overview?.orders || []).length})</span>
          </div>
          {(overview?.orders || []).map((o) => (
            <div className="om-list-row" key={o.id || o.reference}>
              <div className="om-list-meta">
                <strong>{o.package_name || "Gói tập OptiGym"} · #{o.reference}</strong>
                <span>{currency(o.total || o.package_price || 0)} · {fmtDateOnly(o.created_at)}</span>
              </div>
              <span className={`om-pill ${o.status === "PAID" ? "booked" : "upcoming"}`}>
                {o.status === "PAID" ? "Đã thanh toán" : o.status}
              </span>
            </div>
          ))}
          {!(overview?.orders || []).length && (
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>Chưa có hóa đơn nào trong lịch sử.</div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MemberNotificationsTab({ notifications, readNotifIds, onMarkAllRead }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="om-page-head">
        <div>
          <div className="om-eyebrow">CẬP NHẬT TẬP LUYỆN, LỊCH HẸN &amp; GÓI TẬP</div>
          <h1>Thông báo ({notifications.length})</h1>
        </div>
        <button type="button" className="om-btn-ghost" onClick={onMarkAllRead}>
          Đánh dấu đã đọc tất cả
        </button>
      </div>

      <div className="om-card">
        {notifications.map((n) => {
          const isRead = !n.unread || readNotifIds.includes(n.id);
          return (
            <div className="om-list-row" key={n.id} style={{ opacity: isRead ? 0.78 : 1 }}>
              <span className="om-notif-icon">
                {n.kind === "trophy" ? (
                  <Trophy size={16} color="#F59E0B" />
                ) : n.kind === "alert" ? (
                  <AlertTriangle size={16} color="#EF4444" />
                ) : (
                  <CalendarCheck size={16} color="#A3E635" />
                )}
              </span>
              <div className="om-list-meta">
                <strong>{n.title}</strong>
                <span>{n.body}</span>
              </div>
              <span className={`om-pill ${isRead ? "book" : "upcoming"}`}>
                {isRead ? "Đã xem" : n.time}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MemberSettingsTab({
  user,
  memberName,
  memberCode,
  editingProfile,
  setEditingProfile,
  profName,
  setProfName,
  profPhone,
  setProfPhone,
  onSaveProfile,
  changingPwd,
  setChangingPwd,
  pwdForm,
  setPwdForm,
  onSubmitPassword,
  busy,
  logout,
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="om-page-head">
        <div>
          <div className="om-eyebrow">HỒ SƠ CÁ NHÂN &amp; BẢO MẬT TÀI KHOẢN</div>
          <h1>Cài đặt tài khoản</h1>
        </div>
      </div>

      <div className="om-grid-2">
        <div className="om-card">
          <div className="om-card-head">
            <span className="om-card-label">THÔNG TIN HỘI VIÊN</span>
            {!editingProfile && (
              <button
                type="button"
                className="om-btn-lime"
                onClick={() => {
                  setProfName(user.name || "");
                  setProfPhone(user.phone || "");
                  setEditingProfile(true);
                }}
              >
                Chỉnh sửa
              </button>
            )}
          </div>

          {editingProfile ? (
            <form onSubmit={onSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="om-field">
                Họ và tên *
                <input value={profName} onChange={(e) => setProfName(e.target.value)} required minLength={2} />
              </label>
              <label className="om-field">
                Số điện thoại
                <input value={profPhone} onChange={(e) => setProfPhone(e.target.value)} />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="om-btn-lime" disabled={busy}>Lưu thay đổi</button>
                <button type="button" className="om-btn-ghost" onClick={() => setEditingProfile(false)}>Hủy</button>
              </div>
            </form>
          ) : (
            <div className="om-kv-list">
              <div className="om-kv-row"><span>Họ và tên</span><b>{memberName}</b></div>
              <div className="om-kv-row"><span>Mã thẻ check-in</span><b style={{ color: "#A3E635" }}>{memberCode}</b></div>
              <div className="om-kv-row"><span>Email</span><b>{user.email}</b></div>
              <div className="om-kv-row"><span>Số điện thoại</span><b>{user.phone || "Chưa cập nhật"}</b></div>
            </div>
          )}

          <div className="om-list-row" style={{ marginTop: 4 }}>
            <ShieldCheck size={18} color="#A3E635" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              Mã hội viên ({memberCode}) dùng để quét điểm danh tại quầy lễ tân và tính chuỗi Streak tuần.
            </span>
          </div>
        </div>

        <div className="om-card" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="om-card-head">
              <span className="om-card-label">BẢO MẬT &amp; ĐĂNG XUẤT</span>
              {!changingPwd && (
                <button type="button" className="om-btn-ghost" onClick={() => setChangingPwd(true)}>
                  Đổi mật khẩu
                </button>
              )}
            </div>

            {changingPwd ? (
              <form onSubmit={onSubmitPassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label className="om-field">
                  Mật khẩu hiện tại *
                  <input
                    type="password"
                    required
                    value={pwdForm.current}
                    onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                  />
                </label>
                <label className="om-field">
                  Mật khẩu mới (tối thiểu 6 ký tự) *
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pwdForm.next}
                    onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                  />
                </label>
                <label className="om-field">
                  Xác nhận mật khẩu mới *
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pwdForm.confirm}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  />
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" className="om-btn-lime" disabled={busy}>Cập nhật mật khẩu</button>
                  <button type="button" className="om-btn-ghost" onClick={() => setChangingPwd(false)}>Hủy</button>
                </div>
              </form>
            ) : (
              <div style={{ fontSize: 13, color: "#9CA3AF" }}>
                Phiên đăng nhập được bảo vệ bằng cookie HttpOnly. Bạn có thể đổi mật khẩu định kỳ để tăng bảo mật.
              </div>
            )}
          </div>

          <button type="button" className="om-btn-danger" onClick={logout} style={{ width: "100%" }}>
            <LogOut size={15} /> Đăng xuất khỏi OptiGym
          </button>
        </div>
      </div>
    </section>
  );
}
