package com.optigym.member;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optigym.coaching.TrainingRulesService;
import com.optigym.shared.security.SessionSecurity;
import com.optigym.shared.web.Inputs;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/member")
public class MemberController {

  private final JdbcTemplate db;
  private final SessionSecurity security;
  private final TrainingRulesService rules;
  private final ObjectMapper json = new ObjectMapper();

  public MemberController(JdbcTemplate db, SessionSecurity security, TrainingRulesService rules) {
    this.db = db;
    this.security = security;
    this.rules = rules;
  }

  private Map<String, Object> requireMember(HttpServletRequest req) {
    var u = security.me(req);
    String role = Objects.toString(u.get("role"), "");
    if (!List.of("MEMBER", "ADMIN").contains(role)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ dành cho hội viên");
    }
    return u;
  }

  private void requireActiveSubscription(long memberId) {
    LocalDate today = LocalDate.now(TrainingRulesService.VN_ZONE);
    Long activeCount = db.queryForObject(
      "SELECT count(*) FROM subscriptions WHERE member_id=? AND ends_on >= ?",
      Long.class,
      memberId,
      Date.valueOf(today)
    );
    if (activeCount == null || activeCount == 0) {
      throw Inputs.bad("Bạn cần có gói tập đang còn hạn để đặt lịch. Vui lòng liên hệ quầy lễ tân.");
    }
  }

  private static Instant toInstant(Object ts) {
    if (ts instanceof Timestamp t) return t.toInstant();
    if (ts instanceof Instant i) return i;
    if (ts != null) {
      try {
        return Instant.parse(ts.toString());
      } catch (Exception ignored) {}
    }
    return null;
  }

  private static LocalDate toLocalDate(Object d) {
    if (d instanceof Date sqlDate) return sqlDate.toLocalDate();
    if (d instanceof LocalDate ld) return ld;
    if (d != null) {
      try {
        return LocalDate.parse(d.toString().substring(0, 10));
      } catch (Exception ignored) {}
    }
    return null;
  }

  private void ensureNoMemberScheduleConflict(long memberId, Instant candidateStart, int candidateDuration) {
    List<Map<String, Object>> ptSessions = db.queryForList(
      "SELECT id, starts_at, duration_minutes FROM coach_sessions WHERE member_id=? AND status IN ('REQUESTED','CONFIRMED')",
      memberId
    );
    for (var s : ptSessions) {
      Instant sStart = toInstant(s.get("starts_at"));
      int sDur = s.get("duration_minutes") instanceof Number n ? n.intValue() : 60;
      if (rules.hasTimeOverlap(candidateStart, candidateDuration, sStart, sDur)) {
        throw Inputs.bad("Trùng khung giờ với một buổi tập PT 1-1 khác của bạn");
      }
    }

    List<Map<String, Object>> bookedClasses = db.queryForList(
      "SELECT c.id, c.starts_at, c.duration_minutes FROM class_bookings cb JOIN gym_classes c ON c.id=cb.class_id " +
      "WHERE cb.member_id=? AND cb.status='BOOKED' AND c.status='OPEN'",
      memberId
    );
    for (var c : bookedClasses) {
      Instant cStart = toInstant(c.get("starts_at"));
      int cDur = c.get("duration_minutes") instanceof Number n ? n.intValue() : 60;
      if (rules.hasTimeOverlap(candidateStart, candidateDuration, cStart, cDur)) {
        throw Inputs.bad("Trùng khung giờ với một lớp học nhóm bạn đã đăng ký");
      }
    }
  }

  private Map<String, Object> loadStreakSummary(long memberId) {
    LocalDate today = LocalDate.now(TrainingRulesService.VN_ZONE);

    Integer targetObj = db.queryForList(
      "SELECT weekly_target FROM member_training_settings WHERE member_id=?",
      memberId
    ).stream().map(r -> ((Number) r.get("weekly_target")).intValue()).findFirst().orElse(3);

    List<Map<String, Object>> targetRows = db.queryForList(
      "SELECT week_start, target_sessions FROM member_weekly_targets WHERE member_id=?",
      memberId
    );
    Map<LocalDate, Integer> historyTargets = new HashMap<>();
    for (var row : targetRows) {
      LocalDate ws = toLocalDate(row.get("week_start"));
      if (ws != null && row.get("target_sessions") instanceof Number n) {
        historyTargets.put(ws, n.intValue());
      }
    }

    List<Map<String, Object>> checkinRows = db.queryForList(
      "SELECT DISTINCT (checked_in_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS checkin_date " +
      "FROM checkins WHERE member_id=? ORDER BY checkin_date ASC",
      memberId
    );
    List<LocalDate> dates = new ArrayList<>(checkinRows.size());
    for (var r : checkinRows) {
      LocalDate d = toLocalDate(r.get("checkin_date"));
      if (d != null) dates.add(d);
    }

    return rules.calculateWeeklyStreak(dates, targetObj, historyTargets, today);
  }

  // ========================================================
  // 1. OVERVIEW & MEMBERSHIP STATUS (VIEW-ONLY COUNTER MODEL)
  // ========================================================
  @GetMapping("/overview")
  public Map<String, Object> overview(HttpServletRequest req) {
    var u = requireMember(req);
    long memberId = Inputs.id(u);
    LocalDate today = LocalDate.now(TrainingRulesService.VN_ZONE);

    List<Map<String, Object>> subs = db.queryForList(
      "SELECT s.id, s.package_id, p.name, p.category, p.price, p.duration_days, s.starts_on, s.ends_on " +
      "FROM subscriptions s JOIN packages p ON p.id=s.package_id " +
      "WHERE s.member_id=? ORDER BY s.ends_on DESC",
      memberId
    );

    Map<String, Object> activeSub = null;
    long daysRemaining = 0;
    for (var s : subs) {
      LocalDate endsOn = toLocalDate(s.get("ends_on"));
      if (endsOn != null && !endsOn.isBefore(today)) {
        activeSub = s;
        daysRemaining = ChronoUnit.DAYS.between(today, endsOn) + 1;
        break;
      }
    }

    List<Map<String, Object>> orders = db.queryForList(
      "SELECT id, reference, package_name, package_price, package_days, pt_name, pt_sessions, total, status, paid_at, created_at " +
      "FROM orders WHERE member_id=? ORDER BY created_at DESC LIMIT 50",
      memberId
    );

    List<Map<String, Object>> latestMetrics = db.queryForList(
      "SELECT id, weight_kg, body_fat_pct, muscle_mass_kg, inbody_score, note, recorded_at " +
      "FROM body_metrics WHERE member_id=? ORDER BY recorded_at DESC LIMIT 2",
      memberId
    );

    List<Map<String, Object>> contracts = db.queryForList(
      "SELECT pa.id, pa.pt_id, pt.name AS pt_name, pt.specialty, pa.total_sessions, pa.remaining_sessions " +
      "FROM pt_assignments pa JOIN users pt ON pt.id=pa.pt_id WHERE pa.member_id=? AND pa.active=true",
      memberId
    );

    Map<String, Object> res = new LinkedHashMap<>();
    res.put("hasActiveSubscription", activeSub != null);
    res.put("activeSubscription", activeSub);
    res.put("daysRemaining", daysRemaining);
    res.put("subscriptions", subs);
    res.put("orders", orders);
    res.put("contracts", contracts);
    res.put("latestMetric", latestMetrics.isEmpty() ? null : latestMetrics.get(0));
    res.put("streak", loadStreakSummary(memberId));
    return res;
  }

  // ========================================================
  // 2. TRAINERS DIRECTORY & DOSSIER FOR MEMBER
  // ========================================================
  @GetMapping("/trainers")
  public List<Map<String, Object>> trainers(HttpServletRequest req) {
    var u = requireMember(req);
    long memberId = Inputs.id(u);
    return db.queryForList(
      "SELECT pt.id, pt.name, pt.email, pt.phone, COALESCE(pt.specialty, 'GYM') AS specialty, pt.member_code, " +
      "COALESCE((SELECT pa.remaining_sessions FROM pt_assignments pa WHERE pa.pt_id=pt.id AND pa.member_id=? AND pa.active=true LIMIT 1), 0) AS remaining_sessions, " +
      "COALESCE((SELECT pa.total_sessions FROM pt_assignments pa WHERE pa.pt_id=pt.id AND pa.member_id=? AND pa.active=true LIMIT 1), 0) AS total_sessions, " +
      "(SELECT count(*) FROM coach_sessions cs WHERE cs.pt_id=pt.id AND cs.status='COMPLETED')::int AS completed_sessions_count " +
      "FROM users pt WHERE pt.role='PT' AND pt.status='ACTIVE' AND pt.email_verified=true ORDER BY pt.name ASC",
      memberId,
      memberId
    );
  }

  // ========================================================
  // 3. SCHEDULE: GROUP CLASSES & 1-1 PT SESSIONS (BOOK + 1H CANCEL)
  // ========================================================
  @GetMapping("/schedule")
  public Map<String, Object> schedule(HttpServletRequest req) {
    var u = requireMember(req);
    long memberId = Inputs.id(u);

    List<Map<String, Object>> classes = db.queryForList(
      "SELECT c.id, c.name, c.category, c.pt_id, pt.name AS coach, c.room_id, r.name AS room, " +
      "c.starts_at, c.duration_minutes, c.capacity, c.status, " +
      "(SELECT count(*) FROM class_bookings cb WHERE cb.class_id=c.id AND cb.status IN ('BOOKED','LATE_CANCELLED'))::int AS filled, " +
      "(SELECT cb.status FROM class_bookings cb WHERE cb.class_id=c.id AND cb.member_id=? LIMIT 1) AS my_booking_status " +
      "FROM gym_classes c JOIN users pt ON pt.id=c.pt_id JOIN rooms r ON r.id=c.room_id " +
      "ORDER BY c.starts_at DESC LIMIT 100",
      memberId
    );

    List<Map<String, Object>> ptSessions = db.queryForList(
      "SELECT s.id, s.pt_id, pt.name AS pt_name, COALESCE(pt.specialty, 'GYM') AS specialty, " +
      "s.room_id, COALESCE(r.name, 'Phòng Gym') AS room, s.starts_at, s.duration_minutes, s.status, s.note " +
      "FROM coach_sessions s JOIN users pt ON pt.id=s.pt_id LEFT JOIN rooms r ON r.id=s.room_id " +
      "WHERE s.member_id=? ORDER BY s.starts_at DESC LIMIT 100",
      memberId
    );

    return Map.of("classes", classes, "ptSessions", ptSessions);
  }

  @Transactional
  @PostMapping("/classes/{classId}/book")
  public Map<String, Object> bookClass(@PathVariable long classId, HttpServletRequest req) {
    var u = requireMember(req);
    security.writeCheck(req);
    long memberId = Inputs.id(u);

    requireActiveSubscription(memberId);

    var classRows = db.queryForList(
      "SELECT id, name, starts_at, duration_minutes, capacity, status FROM gym_classes WHERE id=? FOR UPDATE",
      classId
    );
    if (classRows.isEmpty()) throw Inputs.missing();
    var c = classRows.get(0);
    if (!"OPEN".equals(c.get("status"))) {
      throw Inputs.bad("Lớp học này hiện không mở đăng ký");
    }

    Instant startsAt = toInstant(c.get("starts_at"));
    int duration = c.get("duration_minutes") instanceof Number n ? n.intValue() : 60;
    if (startsAt == null || !startsAt.isAfter(Instant.now())) {
      throw Inputs.bad("Lớp học đã bắt đầu hoặc đã qua giờ đăng ký");
    }

    // Check existing booking status
    var existingBooking = db.queryForList(
      "SELECT id, status FROM class_bookings WHERE class_id=? AND member_id=?",
      classId,
      memberId
    );
    if (!existingBooking.isEmpty()) {
      String st = Objects.toString(existingBooking.get(0).get("status"), "");
      if ("BOOKED".equals(st)) throw Inputs.bad("Bạn đã đặt chỗ lớp học này rồi");
      if ("LATE_CANCELLED".equals(st)) throw Inputs.bad("Bạn đã hủy muộn lớp này (< 1 tiếng), slot không thể đặt lại");
    }

    Long filledObj = db.queryForObject(
      "SELECT count(*) FROM class_bookings WHERE class_id=? AND status IN ('BOOKED','LATE_CANCELLED')",
      Long.class,
      classId
    );
    long filled = filledObj != null ? filledObj : 0L;
    int capacity = ((Number) c.get("capacity")).intValue();
    if (filled >= capacity) {
      throw Inputs.bad("Lớp học đã đủ sĩ số tối đa");
    }

    ensureNoMemberScheduleConflict(memberId, startsAt, duration);

    db.update(
      "INSERT INTO class_bookings(class_id, member_id, status) VALUES(?,?,'BOOKED') " +
      "ON CONFLICT (class_id, member_id) DO UPDATE SET status='BOOKED', cancelled_at=NULL",
      classId,
      memberId
    );
    return Map.of("ok", true, "status", "BOOKED");
  }

  @Transactional
  @PatchMapping("/classes/{classId}/cancel")
  public Map<String, Object> cancelClassBooking(@PathVariable long classId, HttpServletRequest req) {
    var u = requireMember(req);
    security.writeCheck(req);
    long memberId = Inputs.id(u);

    var rows = db.queryForList(
      "SELECT cb.id AS booking_id, cb.class_id, cb.status, c.starts_at " +
      "FROM class_bookings cb JOIN gym_classes c ON c.id=cb.class_id " +
      "WHERE cb.class_id=? AND cb.member_id=?",
      classId,
      memberId
    );
    if (rows.isEmpty() || !"BOOKED".equals(rows.get(0).get("status"))) {
      throw Inputs.bad("Bạn chưa có lịch đặt đang mở cho lớp này");
    }
    var row = rows.get(0);
    long bookingId = ((Number) row.get("booking_id")).longValue();
    Instant startsAt = toInstant(row.get("starts_at"));

    boolean late = rules.isLateCancellation(startsAt, Instant.now());
    String nextStatus = late ? "LATE_CANCELLED" : "CANCELLED";

    db.update(
      "UPDATE class_bookings SET status=?, cancelled_at=now() WHERE id=?",
      nextStatus,
      bookingId
    );

    return Map.of(
      "ok", true,
      "status", nextStatus,
      "latePenalty", late,
      "message", late
        ? "Đã hủy dưới 1 tiếng trước giờ học: slot nhóm vẫn bị trừ theo quy định."
        : "Đã hủy đặt lớp và hoàn lại slot thành công."
    );
  }

  @Transactional
  @PostMapping("/sessions")
  public Map<String, Object> bookPtSession(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var u = requireMember(req);
    security.writeCheck(req);
    long memberId = Inputs.id(u);

    requireActiveSubscription(memberId);

    long ptId = Inputs.number(b, "pt_id", 1, Long.MAX_VALUE);
    long roomId = b.get("room_id") != null ? Inputs.number(b, "room_id", 1, Long.MAX_VALUE) : 1L;
    int duration = b.get("duration_minutes") != null ? (int) Inputs.number(b, "duration_minutes", 15, 180) : 60;
    String note = Inputs.text(b, "note", 0, 500);

    Instant startsAt;
    try {
      startsAt = Instant.parse(Objects.toString(b.get("starts_at"), "").trim());
    } catch (Exception e) {
      throw Inputs.bad("Thời gian bắt đầu không hợp lệ");
    }
    if (!startsAt.isAfter(Instant.now())) {
      throw Inputs.bad("Vui lòng chọn thời gian trong tương lai");
    }

    Long ptCount = db.queryForObject(
      "SELECT count(*) FROM users WHERE id=? AND role='PT' AND status='ACTIVE' AND email_verified=true",
      Long.class,
      ptId
    );
    if (ptCount == null || ptCount == 0) throw Inputs.bad("Huấn luyện viên không khả dụng");

    Long roomCount = db.queryForObject(
      "SELECT count(*) FROM rooms WHERE id=? AND active=true",
      Long.class,
      roomId
    );
    if (roomCount == null || roomCount == 0) throw Inputs.bad("Phòng tập chưa mở hoạt động");

    // 1. Check member's own schedule conflicts
    ensureNoMemberScheduleConflict(memberId, startsAt, duration);

    // 2. Check PT's schedule conflicts (1-1 sessions & classes taught by PT)
    List<Map<String, Object>> ptBusy = db.queryForList(
      "SELECT starts_at, duration_minutes FROM coach_sessions WHERE pt_id=? AND status IN ('REQUESTED','CONFIRMED') " +
      "UNION ALL SELECT starts_at, duration_minutes FROM gym_classes WHERE pt_id=? AND status='OPEN'",
      ptId,
      ptId
    );
    for (var s : ptBusy) {
      Instant sStart = toInstant(s.get("starts_at"));
      int sDur = s.get("duration_minutes") instanceof Number n ? n.intValue() : 60;
      if (rules.hasTimeOverlap(startsAt, duration, sStart, sDur)) {
        throw Inputs.bad("Huấn luyện viên đã kín lịch ở khung giờ này");
      }
    }

    var created = db.queryForMap(
      "INSERT INTO coach_sessions(pt_id, member_id, room_id, starts_at, duration_minutes, status, note) " +
      "VALUES(?,?,?,?,?,'REQUESTED',?) RETURNING *",
      ptId,
      memberId,
      roomId,
      Timestamp.from(startsAt),
      duration,
      note
    );

    db.update(
      "INSERT INTO pt_notifications(pt_id, title, body) VALUES(?,?,?)",
      ptId,
      "Yêu cầu đặt lịch 1-1 mới",
      "Hội viên " + Objects.toString(u.get("name"), "") + " vừa đặt lịch tập 1-1."
    );
    return created;
  }

  @Transactional
  @PatchMapping("/sessions/{sessionId}/cancel")
  public Map<String, Object> cancelPtSession(@PathVariable long sessionId, HttpServletRequest req) {
    var u = requireMember(req);
    security.writeCheck(req);
    long memberId = Inputs.id(u);

    var rows = db.queryForList(
      "SELECT id, pt_id, member_id, starts_at, status FROM coach_sessions WHERE id=? AND member_id=?",
      sessionId,
      memberId
    );
    if (rows.isEmpty()) throw Inputs.missing();
    var s = rows.get(0);
    String currentStatus = Objects.toString(s.get("status"), "");
    if (!List.of("REQUESTED", "CONFIRMED").contains(currentStatus)) {
      throw Inputs.bad("Buổi tập này không còn ở trạng thái có thể hủy");
    }

    long ptId = ((Number) s.get("pt_id")).longValue();
    Instant startsAt = toInstant(s.get("starts_at"));
    boolean late = rules.isLateCancellation(startsAt, Instant.now());
    String nextStatus = late ? "LATE_CANCELLED" : "CANCELLED";

    db.update("UPDATE coach_sessions SET status=? WHERE id=?", nextStatus, sessionId);

    if (late) {
      db.update(
        "UPDATE pt_assignments SET remaining_sessions = GREATEST(0, remaining_sessions - 1), updated_at=now() WHERE pt_id=? AND member_id=? AND active=true",
        ptId,
        memberId
      );
    }

    return Map.of(
      "ok", true,
      "status", nextStatus,
      "latePenalty", late,
      "message", late
        ? "Hủy dưới 1 tiếng trước giờ tập: vẫn trừ 1 buổi PT / tính phí theo quy định."
        : "Đã hủy lịch hẹn PT đúng hạn (không trừ buổi)."
    );
  }

  // ========================================================
  // 4. PROGRESS (PT-MEASURED BODY METRICS - READ ONLY FOR MEMBER)
  // ========================================================
  @GetMapping("/progress")
  public Map<String, Object> progress(HttpServletRequest req) {
    var u = requireMember(req);
    long memberId = Inputs.id(u);

    List<Map<String, Object>> metrics = db.queryForList(
      "SELECT bm.id, bm.weight_kg, bm.body_fat_pct, bm.muscle_mass_kg, bm.inbody_score, bm.note, bm.recorded_at, " +
      "COALESCE(pt.name, 'Huấn luyện viên') AS recorded_by_name " +
      "FROM body_metrics bm LEFT JOIN users pt ON pt.id=bm.recorded_by " +
      "WHERE bm.member_id=? ORDER BY bm.recorded_at DESC LIMIT 30",
      memberId
    );

    Double weightDelta = null;
    if (metrics.size() >= 2) {
      double latest = ((Number) metrics.get(0).get("weight_kg")).doubleValue();
      double oldest = ((Number) metrics.get(metrics.size() - 1).get("weight_kg")).doubleValue();
      weightDelta = Math.round((latest - oldest) * 10.0) / 10.0;
    }

    Map<String, Object> res = new LinkedHashMap<>();
    res.put("latest", metrics.isEmpty() ? null : metrics.get(0));
    res.put("weightDelta", weightDelta);
    res.put("metrics", metrics);
    return res;
  }

  // ========================================================
  // 5. WORKOUT HISTORY, STREAK GOAL & OPTIONAL SELF-WORKOUT LOGGING
  // ========================================================
  @GetMapping("/workout-history")
  public Map<String, Object> workoutHistory(
    @RequestParam(defaultValue = "month") String period,
    HttpServletRequest req
  ) {
    var u = requireMember(req);
    long memberId = Inputs.id(u);

    Map<String, Object> streak = loadStreakSummary(memberId);

    String checkinTimeFilter = "";
    String logTimeFilter = "";
    if ("week".equalsIgnoreCase(period)) {
      checkinTimeFilter = " AND checked_in_at >= date_trunc('week', now())";
      logTimeFilter = " AND completed_at >= date_trunc('week', now())";
    } else if ("month".equalsIgnoreCase(period)) {
      checkinTimeFilter = " AND checked_in_at >= date_trunc('month', now())";
      logTimeFilter = " AND completed_at >= date_trunc('month', now())";
    }

    List<Map<String, Object>> checkins = db.queryForList(
      "SELECT c.id, r.name AS room, c.checked_in_at, c.checked_out_at, " +
      "GREATEST(15, COALESCE(round(extract(epoch FROM (COALESCE(c.checked_out_at, c.checked_in_at + interval '60 minutes') - c.checked_in_at))/60)::int, 60)) AS duration_minutes " +
      "FROM checkins c JOIN rooms r ON r.id=c.room_id WHERE c.member_id=?" + checkinTimeFilter +
      " ORDER BY c.checked_in_at DESC LIMIT 100",
      memberId
    );

    List<Map<String, Object>> logs = db.queryForList(
      "SELECT wl.id, wl.program_id, wl.session_id, wl.program_name, wl.duration_minutes, wl.exercises_json, wl.feedback, wl.completed_at, " +
      "COALESCE(u.name, 'Tự ghi nhận') AS logged_by_name, COALESCE(u.role, 'MEMBER') AS logged_by_role " +
      "FROM workout_logs wl LEFT JOIN users u ON u.id=wl.logged_by " +
      "WHERE wl.member_id=?" + logTimeFilter + " ORDER BY wl.completed_at DESC LIMIT 100",
      memberId
    );
    for (var l : logs) {
      l.put("exercises", parseExercises(l.remove("exercises_json")));
    }

    List<Map<String, Object>> programs = db.queryForList(
      "SELECT wp.id, wp.name, wp.source_type, wp.exercises_json, wp.notes, wp.created_at, " +
      "COALESCE(pt.name, 'Tự thiết kế') AS author_name " +
      "FROM workout_programs wp LEFT JOIN users pt ON pt.id=wp.pt_id " +
      "WHERE wp.member_id=? ORDER BY wp.created_at DESC",
      memberId
    );
    for (var p : programs) {
      p.put("exercises", parseExercises(p.remove("exercises_json")));
    }

    long checkinSessions = checkins.size();
    long checkinMinutes = checkins.stream()
      .mapToLong(c -> c.get("duration_minutes") instanceof Number n ? n.longValue() : 60L)
      .sum();
    java.util.Set<LocalDate> checkinDays = new java.util.HashSet<>();
    for (var c : checkins) {
      Instant ci = toInstant(c.get("checked_in_at"));
      if (ci != null) checkinDays.add(ci.atZone(TrainingRulesService.VN_ZONE).toLocalDate());
    }
    long standaloneLogMinutes = 0L;
    long standaloneLogs = 0L;
    for (var l : logs) {
      Instant comp = toInstant(l.get("completed_at"));
      LocalDate d = comp != null ? comp.atZone(TrainingRulesService.VN_ZONE).toLocalDate() : null;
      if (d == null || !checkinDays.contains(d)) {
        standaloneLogs++;
        standaloneLogMinutes += l.get("duration_minutes") instanceof Number n ? n.longValue() : 45L;
      }
    }

    long totalSessions = Math.max(checkinSessions + standaloneLogs, logs.size());
    long focusMinutes = checkinMinutes + standaloneLogMinutes;

    Map<String, Object> res = new LinkedHashMap<>();
    res.put("streak", streak);
    res.put("period", period);
    res.put("sessionsCount", totalSessions);
    res.put("focusMinutes", focusMinutes);
    res.put("checkins", checkins);
    res.put("logs", logs);
    res.put("programs", programs);
    return res;
  }

  @Transactional
  @PutMapping("/streak-goal")
  public Map<String, Object> updateStreakGoal(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var u = requireMember(req);
    security.writeCheck(req);
    long memberId = Inputs.id(u);
    int weeklyTarget = (int) Inputs.number(b, "weekly_target", 1, 7);
    LocalDate currentWeekStart = TrainingRulesService.weekStartMonday(LocalDate.now(TrainingRulesService.VN_ZONE));

    // Bảo toàn lịch sử: nếu tuần trước chưa có snapshot thì đóng băng mục tiêu cũ cho tuần trước trước khi đổi
    Integer previousTarget = db.queryForList(
      "SELECT weekly_target FROM member_training_settings WHERE member_id=?",
      memberId
    ).stream().map(r -> ((Number) r.get("weekly_target")).intValue()).findFirst().orElse(null);

    if (previousTarget != null) {
      LocalDate lastWeekStart = currentWeekStart.minusWeeks(1);
      db.update(
        "INSERT INTO member_weekly_targets(member_id, week_start, target_sessions) VALUES(?,?,?) ON CONFLICT (member_id, week_start) DO NOTHING",
        memberId,
        Date.valueOf(lastWeekStart),
        previousTarget
      );
    }

    db.update(
      "INSERT INTO member_training_settings(member_id, weekly_target, updated_at) VALUES(?,?,now()) " +
      "ON CONFLICT (member_id) DO UPDATE SET weekly_target = EXCLUDED.weekly_target, updated_at = now()",
      memberId,
      weeklyTarget
    );
    db.update(
      "INSERT INTO member_weekly_targets(member_id, week_start, target_sessions) VALUES(?,?,?) " +
      "ON CONFLICT (member_id, week_start) DO UPDATE SET target_sessions = EXCLUDED.target_sessions",
      memberId,
      Date.valueOf(currentWeekStart),
      weeklyTarget
    );

    return loadStreakSummary(memberId);
  }

  @PostMapping("/self-programs")
  public Map<String, Object> createSelfProgram(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var u = requireMember(req);
    security.writeCheck(req);
    long memberId = Inputs.id(u);
    String name = Inputs.text(b, "name", 2, 120);
    String notes = Inputs.text(b, "notes", 0, 1000);
    String exercisesJson = toJson(b.get("exercises"));

    var row = db.queryForMap(
      "INSERT INTO workout_programs(pt_id, member_id, source_type, name, exercises_json, notes) VALUES(NULL,?,'SELF',?,?,?) RETURNING *",
      memberId,
      name,
      exercisesJson,
      notes
    );
    row.put("exercises", parseExercises(row.remove("exercises_json")));
    return row;
  }

  @PostMapping("/workout-logs")
  public Map<String, Object> createSelfWorkoutLog(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var u = requireMember(req);
    security.writeCheck(req);
    long memberId = Inputs.id(u);
    String programName = Inputs.text(b, "program_name", 2, 120);
    int duration = b.get("duration_minutes") != null ? (int) Inputs.number(b, "duration_minutes", 5, 360) : 45;
    String feedback = Inputs.text(b, "feedback", 0, 1000);
    Long programId = b.get("program_id") != null && !Objects.toString(b.get("program_id"), "").isBlank()
      ? Inputs.number(b, "program_id", 1, Long.MAX_VALUE)
      : null;
    String exercisesJson = toJson(b.get("exercises"));

    db.update(
      "INSERT INTO workout_logs(member_id, program_id, logged_by, program_name, duration_minutes, exercises_json, feedback) VALUES(?,?,?,?,?,?,?)",
      memberId,
      programId,
      memberId,
      programName,
      duration,
      exercisesJson,
      feedback
    );
    return Map.of("ok", true);
  }

  private List<Map<String, Object>> parseExercises(Object raw) {
    if (raw == null) return List.of();
    try {
      return json.readValue(Objects.toString(raw, "[]"), new TypeReference<List<Map<String, Object>>>() {});
    } catch (Exception e) {
      return List.of();
    }
  }

  private String toJson(Object value) {
    try {
      return json.writeValueAsString(value != null ? value : List.of());
    } catch (Exception e) {
      return "[]";
    }
  }
}
