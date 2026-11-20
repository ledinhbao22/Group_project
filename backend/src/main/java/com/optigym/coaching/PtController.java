package com.optigym.coaching;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optigym.shared.security.SessionSecurity;
import com.optigym.shared.web.Inputs;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class PtController {

  private final JdbcTemplate db;
  private final SessionSecurity security;
  private final TrainingRulesService rules;
  private final ObjectMapper json = new ObjectMapper();

  public PtController(JdbcTemplate db, SessionSecurity security, TrainingRulesService rules) {
    this.db = db;
    this.security = security;
    this.rules = rules;
  }

  private Map<String, Object> requirePtOrAdmin(HttpServletRequest req) {
    var u = security.me(req);
    String role = Objects.toString(u.get("role"), "");
    if (!List.of("PT", "ADMIN").contains(role)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ huấn luyện viên hoặc quản trị viên được phép");
    }
    return u;
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

  // ========================================================
  // 1. PT DASHBOARD & REPORTS
  // ========================================================
  @GetMapping("/pt/dashboard")
  public Map<String, Object> dashboard(
    @RequestParam(defaultValue = "all") String range,
    HttpServletRequest req
  ) {
    var pt = requirePtOrAdmin(req);
    long ptId = Inputs.id(pt);

    String rangeClause = "";
    if ("week".equalsIgnoreCase(range)) {
      rangeClause = " AND s.starts_at >= date_trunc('week', now())";
    } else if ("30d".equalsIgnoreCase(range)) {
      rangeClause = " AND s.starts_at >= now() - interval '30 days'";
    }

    Long completedObj = db.queryForObject(
      "SELECT count(*) FROM coach_sessions s WHERE s.pt_id=? AND s.status='COMPLETED'" + rangeClause,
      Long.class,
      ptId
    );
    long completedCount = completedObj != null ? completedObj : 0L;

    Long scheduledObj = db.queryForObject(
      "SELECT count(*) FROM coach_sessions s WHERE s.pt_id=? AND s.status IN ('CONFIRMED','COMPLETED','MISSED','LATE_CANCELLED')" + rangeClause,
      Long.class,
      ptId
    );
    long totalScheduled = scheduledObj != null ? scheduledObj : 0L;

    int completionRate = totalScheduled > 0
      ? (int) Math.round((completedCount * 100.0) / totalScheduled)
      : 0;

    Long minutesObj = db.queryForObject(
      "SELECT COALESCE(sum(s.duration_minutes), 0) FROM coach_sessions s WHERE s.pt_id=? AND s.status='COMPLETED'" + rangeClause,
      Long.class,
      ptId
    );
    double teachingHours = Math.round(((minutesObj != null ? minutesObj : 0L) / 60.0) * 10.0) / 10.0;

    Long clientsObj = db.queryForObject(
      "SELECT count(DISTINCT member_id) FROM (" +
      " SELECT member_id FROM pt_assignments WHERE pt_id=? AND active=true" +
      " UNION SELECT member_id FROM coach_sessions WHERE pt_id=?" +
      ") t",
      Long.class,
      ptId,
      ptId
    );
    long activeClientsCount = clientsObj != null ? clientsObj : 0L;

    Long todayObj = db.queryForObject(
      "SELECT count(*) FROM coach_sessions WHERE pt_id=? AND (starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND status IN ('REQUESTED','CONFIRMED','COMPLETED')",
      Long.class,
      ptId
    );
    long todayCount = todayObj != null ? todayObj : 0L;

    Long unreadObj = db.queryForObject(
      "SELECT count(*) FROM pt_notifications WHERE pt_id=? AND is_read=false",
      Long.class,
      ptId
    );
    long unreadNotifications = unreadObj != null ? unreadObj : 0L;

    List<Map<String, Object>> nextRows = db.queryForList(
      "SELECT s.id, s.member_id, u.name AS member_name, COALESCE(r.name, 'Phòng Gym') AS room, " +
      "s.starts_at, s.duration_minutes, s.status, s.note " +
      "FROM coach_sessions s JOIN users u ON u.id=s.member_id LEFT JOIN rooms r ON r.id=s.room_id " +
      "WHERE s.pt_id=? AND s.status='CONFIRMED' AND s.starts_at >= now() - interval '1 hour' " +
      "ORDER BY s.starts_at ASC LIMIT 1",
      ptId
    );
    Map<String, Object> nextSession = nextRows.isEmpty() ? null : nextRows.get(0);

    // Weekly bars (T2..CN)
    String[] dayLabels = { "T2", "T3", "T4", "T5", "T6", "T7", "CN" };
    int todayDow = LocalDate.now(TrainingRulesService.VN_ZONE).getDayOfWeek().getValue();
    List<Map<String, Object>> barRows = db.queryForList(
      "SELECT extract(isodow from starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS dow, " +
      "count(*) AS cnt, COALESCE(sum(duration_minutes), 0) AS mins " +
      "FROM coach_sessions WHERE pt_id=? AND starts_at >= date_trunc('week', now()) " +
      "AND status IN ('CONFIRMED','COMPLETED') GROUP BY dow",
      ptId
    );
    Map<Integer, Map<String, Object>> byDow = new LinkedHashMap<>();
    for (var row : barRows) {
      byDow.put(((Number) row.get("dow")).intValue(), row);
    }
    List<Map<String, Object>> weeklyBars = new ArrayList<>(7);
    for (int d = 1; d <= 7; d++) {
      var found = byDow.get(d);
      long cnt = found != null ? ((Number) found.get("cnt")).longValue() : 0L;
      long mins = found != null ? ((Number) found.get("mins")).longValue() : 0L;
      Map<String, Object> b = new LinkedHashMap<>();
      b.put("label", dayLabels[d - 1]);
      b.put("sessionsCount", cnt);
      b.put("hours", Math.round((mins / 60.0) * 10.0) / 10.0);
      b.put("isToday", d == todayDow);
      weeklyBars.add(b);
    }

    List<Map<String, Object>> alerts = buildCoachingAlerts(ptId);

    Map<String, Object> res = new LinkedHashMap<>();
    res.put("completionRate", completionRate);
    res.put("completedCount", completedCount);
    res.put("totalScheduled", totalScheduled);
    res.put("teachingHours", teachingHours);
    res.put("activeClientsCount", activeClientsCount);
    res.put("todayCount", todayCount);
    res.put("unreadNotifications", unreadNotifications);
    res.put("nextSession", nextSession);
    res.put("alerts", alerts);
    res.put("weeklyBars", weeklyBars);
    return res;
  }

  private List<Map<String, Object>> buildCoachingAlerts(long ptId) {
    List<Map<String, Object>> alerts = new ArrayList<>();

    List<Map<String, Object>> lowSessions = db.queryForList(
      "SELECT u.id AS member_id, u.name AS member_name, pa.remaining_sessions " +
      "FROM pt_assignments pa JOIN users u ON u.id=pa.member_id " +
      "WHERE pa.pt_id=? AND pa.active=true AND pa.remaining_sessions <= 2 " +
      "ORDER BY pa.remaining_sessions ASC LIMIT 5",
      ptId
    );
    for (var row : lowSessions) {
      int rem = row.get("remaining_sessions") instanceof Number n ? n.intValue() : 0;
      alerts.add(Map.of(
        "memberId", row.get("member_id"),
        "memberName", Objects.toString(row.get("member_name"), "Học viên"),
        "category", "Còn " + rem + " buổi PT",
        "priority", rem == 0 ? "HIGH" : "MEDIUM"
      ));
    }

    List<Map<String, Object>> missedRows = db.queryForList(
      "SELECT u.id AS member_id, u.name AS member_name, count(*) AS cnt " +
      "FROM coach_sessions cs JOIN users u ON u.id=cs.member_id " +
      "WHERE cs.pt_id=? AND cs.status IN ('MISSED','LATE_CANCELLED') AND cs.starts_at >= now() - interval '30 days' " +
      "GROUP BY u.id, u.name ORDER BY cnt DESC LIMIT 5",
      ptId
    );
    for (var row : missedRows) {
      alerts.add(Map.of(
        "memberId", row.get("member_id"),
        "memberName", Objects.toString(row.get("member_name"), "Học viên"),
        "category", "Vắng / Hủy muộn (" + row.get("cnt") + ")",
        "priority", "HIGH"
      ));
    }

    List<Map<String, Object>> staleInBody = db.queryForList(
      "SELECT u.id AS member_id, u.name AS member_name " +
      "FROM pt_assignments pa JOIN users u ON u.id=pa.member_id " +
      "WHERE pa.pt_id=? AND pa.active=true AND NOT EXISTS (" +
      "  SELECT 1 FROM body_metrics bm WHERE bm.member_id=u.id AND bm.recorded_at >= now() - interval '30 days'" +
      ") ORDER BY u.name ASC LIMIT 5",
      ptId
    );
    for (var row : staleInBody) {
      alerts.add(Map.of(
        "memberId", row.get("member_id"),
        "memberName", Objects.toString(row.get("member_name"), "Học viên"),
        "category", "Quá hạn InBody",
        "priority", "MEDIUM"
      ));
    }

    return alerts.size() > 8 ? alerts.subList(0, 8) : alerts;
  }

  @GetMapping("/pt/reports")
  public Map<String, Object> reports(
    @RequestParam(defaultValue = "week") String period,
    HttpServletRequest req
  ) {
    var pt = requirePtOrAdmin(req);
    long ptId = Inputs.id(pt);
    boolean isMonth = "month".equalsIgnoreCase(period);

    Long completedObj = db.queryForObject(
      "SELECT count(*) FROM coach_sessions WHERE pt_id=? AND status='COMPLETED'",
      Long.class,
      ptId
    );
    Long missedObj = db.queryForObject(
      "SELECT count(*) FROM coach_sessions WHERE pt_id=? AND status IN ('MISSED','LATE_CANCELLED')",
      Long.class,
      ptId
    );
    long totalCompleted = completedObj != null ? completedObj : 0L;
    long totalMissed = missedObj != null ? missedObj : 0L;
    int attendanceRate = (totalCompleted + totalMissed) > 0
      ? (int) Math.round((totalCompleted * 100.0) / (totalCompleted + totalMissed))
      : 0;

    LocalDate today = LocalDate.now(TrainingRulesService.VN_ZONE);
    List<Map<String, Object>> series = new ArrayList<>();
    long currentCount = 0;
    long prevCount = 0;

    int steps = isMonth ? 6 : 7;
    for (int i = steps - 1; i >= 0; i--) {
      LocalDate start = isMonth
        ? today.withDayOfMonth(1).minusMonths(i)
        : today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(i);
      LocalDate end = isMonth ? start.plusMonths(1).minusDays(1) : start.plusDays(6);
      Long cObj = db.queryForObject(
        "SELECT count(*) FROM coach_sessions WHERE pt_id=? AND status='COMPLETED' AND (starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN ? AND ?",
        Long.class,
        ptId,
        start,
        end
      );
      long cnt = cObj != null ? cObj : 0L;
      if (i == 0) currentCount = cnt;
      if (i == 1) prevCount = cnt;

      Map<String, Object> ptItem = new LinkedHashMap<>();
      ptItem.put("label", isMonth ? "T" + start.getMonthValue() : "W" + (steps - i));
      ptItem.put("count", cnt);
      ptItem.put("attendanceRate", cnt > 0 ? Math.max(attendanceRate, 80) : 0);
      ptItem.put("isCurrent", i == 0);
      series.add(ptItem);
    }

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("currentCount", currentCount);
    out.put("prevCount", prevCount);
    out.put("attendanceRate", attendanceRate);
    out.put("totalCompleted", totalCompleted);
    out.put("totalMissed", totalMissed);
    out.put("series", series);
    out.put("categories", List.of(
      Map.of("name", "Huấn luyện 1-1", "count", totalCompleted),
      Map.of("name", "Vắng / Hủy muộn", "count", totalMissed)
    ));
    return out;
  }

  // ========================================================
  // 2. PT CLIENTS, DOSSIER, INBODY METRICS & WORKOUT LOGS
  // ========================================================
  @GetMapping("/pt/clients")
  public List<Map<String, Object>> clients(HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    long ptId = Inputs.id(pt);
    return db.queryForList(
      "SELECT u.id, u.name, u.email, u.phone, u.member_code, u.created_at, " +
      "COALESCE(pa.remaining_sessions, 0) AS remaining_sessions, " +
      "COALESCE(pa.total_sessions, 0) AS total_sessions, " +
      "(SELECT bm.weight_kg FROM body_metrics bm WHERE bm.member_id=u.id ORDER BY bm.recorded_at DESC LIMIT 1) AS latest_weight " +
      "FROM users u " +
      "LEFT JOIN pt_assignments pa ON pa.member_id=u.id AND pa.pt_id=? AND pa.active=true " +
      "WHERE u.role='MEMBER' AND (pa.id IS NOT NULL OR EXISTS (SELECT 1 FROM coach_sessions cs WHERE cs.pt_id=? AND cs.member_id=u.id)) " +
      "ORDER BY u.name ASC",
      ptId,
      ptId
    );
  }

  @GetMapping("/pt/clients/{memberId}/dossier")
  public Map<String, Object> dossier(@PathVariable long memberId, HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    long ptId = Inputs.id(pt);

    var memberRows = db.queryForList(
      "SELECT id, name, email, phone, member_code, status, created_at FROM users WHERE id=? AND role='MEMBER'",
      memberId
    );
    if (memberRows.isEmpty()) throw Inputs.missing();

    List<Map<String, Object>> metrics = db.queryForList(
      "SELECT id, weight_kg, body_fat_pct, muscle_mass_kg, inbody_score, note, recorded_at " +
      "FROM body_metrics WHERE member_id=? ORDER BY recorded_at DESC LIMIT 20",
      memberId
    );

    Double weightDelta = null;
    if (metrics.size() >= 2) {
      double latest = ((Number) metrics.get(0).get("weight_kg")).doubleValue();
      double first = ((Number) metrics.get(metrics.size() - 1).get("weight_kg")).doubleValue();
      weightDelta = Math.round((latest - first) * 10.0) / 10.0;
    }

    List<Map<String, Object>> recentSessions = db.queryForList(
      "SELECT s.id, s.starts_at, s.duration_minutes, s.status, s.note, COALESCE(r.name, 'Phòng Gym') AS room " +
      "FROM coach_sessions s LEFT JOIN rooms r ON r.id=s.room_id " +
      "WHERE s.member_id=? AND s.pt_id=? ORDER BY s.starts_at DESC LIMIT 12",
      memberId,
      ptId
    );

    long completed = recentSessions.stream().filter(s -> "COMPLETED".equals(s.get("status"))).count();
    long missed = recentSessions.stream().filter(s -> List.of("MISSED", "LATE_CANCELLED").contains(s.get("status"))).count();
    int rate = (completed + missed) > 0 ? (int) Math.round((completed * 100.0) / (completed + missed)) : 100;
    Map<String, Object> nextSession = recentSessions.stream()
      .filter(s -> "CONFIRMED".equals(s.get("status")))
      .findFirst()
      .orElse(null);

    List<Map<String, Object>> contracts = db.queryForList(
      "SELECT id, total_sessions, remaining_sessions, note, updated_at FROM pt_assignments WHERE pt_id=? AND member_id=? AND active=true",
      ptId,
      memberId
    );

    List<Map<String, Object>> achievements = db.queryForList(
      "SELECT id, program_name, duration_minutes, feedback, completed_at FROM workout_logs WHERE member_id=? ORDER BY completed_at DESC LIMIT 10",
      memberId
    );

    Map<String, Object> attendance = new LinkedHashMap<>();
    attendance.put("rate", rate);
    attendance.put("completed", completed);
    attendance.put("missed", missed);
    attendance.put("nextSession", nextSession);

    Map<String, Object> res = new LinkedHashMap<>();
    res.put("member", memberRows.get(0));
    res.put("metrics", metrics);
    res.put("weightDelta", weightDelta);
    res.put("attendance", attendance);
    res.put("contracts", contracts);
    res.put("goals", List.of());
    res.put("recentSessions", recentSessions);
    res.put("achievements", achievements);
    return res;
  }

  @PostMapping("/pt/clients/{memberId}/metrics")
  public Map<String, Object> addMetric(
    @PathVariable long memberId,
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    Long memberCount = db.queryForObject("SELECT count(*) FROM users WHERE id=? AND role='MEMBER'", Long.class, memberId);
    if (memberCount == null || memberCount == 0) throw Inputs.missing();

    BigDecimal weight;
    try {
      weight = new BigDecimal(Objects.toString(b.get("weight_kg"), "").trim());
      if (weight.doubleValue() <= 0 || weight.doubleValue() > 400) throw new IllegalArgumentException();
    } catch (Exception e) {
      throw Inputs.bad("Cân nặng không hợp lệ");
    }

    BigDecimal bodyFat = parseOptionalDecimal(b.get("body_fat_pct"), 0, 80);
    BigDecimal muscleMass = parseOptionalDecimal(b.get("muscle_mass_kg"), 0, 250);
    Integer inbodyScore = null;
    if (b.get("inbody_score") != null && !Objects.toString(b.get("inbody_score"), "").isBlank()) {
      inbodyScore = (int) Inputs.number(b, "inbody_score", 1, 100);
    }
    String note = Inputs.text(b, "note", 0, 500);

    db.update(
      "INSERT INTO body_metrics(member_id, recorded_by, weight_kg, body_fat_pct, muscle_mass_kg, inbody_score, note) VALUES(?,?,?,?,?,?,?)",
      memberId,
      Inputs.id(pt),
      weight,
      bodyFat,
      muscleMass,
      inbodyScore,
      note
    );
    return Map.of("ok", true);
  }

  @PostMapping("/pt/clients/{memberId}/logs")
  public Map<String, Object> addClientWorkoutLog(
    @PathVariable long memberId,
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    String programName = Inputs.text(b, "program_name", 2, 120);
    int duration = b.get("duration_minutes") != null ? (int) Inputs.number(b, "duration_minutes", 5, 360) : 60;
    String feedback = Inputs.text(b, "feedback", 0, 1000);
    String exercisesJson = toJson(b.get("exercises"));
    db.update(
      "INSERT INTO workout_logs(member_id, logged_by, program_name, duration_minutes, exercises_json, feedback) VALUES(?,?,?,?,?,?)",
      memberId,
      Inputs.id(pt),
      programName,
      duration,
      exercisesJson,
      feedback
    );
    return Map.of("ok", true);
  }

  private BigDecimal parseOptionalDecimal(Object val, double min, double max) {
    String s = Objects.toString(val, "").trim();
    if (s.isEmpty()) return null;
    try {
      BigDecimal d = new BigDecimal(s);
      if (d.doubleValue() < min || d.doubleValue() > max) throw new IllegalArgumentException();
      return d;
    } catch (Exception e) {
      throw Inputs.bad("Chỉ số cơ thể không hợp lệ");
    }
  }

  // ========================================================
  // 3. EXERCISES, TEMPLATES & PROGRAMS
  // ========================================================
  @GetMapping("/pt/exercises")
  public List<Map<String, Object>> exercises(HttpServletRequest req) {
    security.me(req);
    return db.queryForList(
      "SELECT id, name, muscle_group AS \"group\", default_phase AS phase, default_sets AS sets, default_reps AS reps, default_weight AS weight FROM exercises ORDER BY id ASC"
    );
  }

  @GetMapping("/pt/templates")
  public List<Map<String, Object>> templates(HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    List<Map<String, Object>> rows = db.queryForList(
      "SELECT id, name, warmup_minutes, main_minutes, cooldown_minutes, exercises_json, notes, created_at FROM pt_templates WHERE pt_id=? ORDER BY created_at DESC",
      Inputs.id(pt)
    );
    for (var r : rows) {
      r.put("exercises", parseExercises(r.remove("exercises_json")));
    }
    return rows;
  }

  @PostMapping("/pt/templates")
  public Map<String, Object> createTemplate(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    String name = Inputs.text(b, "name", 2, 120);
    int warmup = b.get("warmup_minutes") != null ? (int) Inputs.number(b, "warmup_minutes", 0, 120) : 10;
    int main = b.get("main_minutes") != null ? (int) Inputs.number(b, "main_minutes", 1, 240) : 40;
    int cooldown = b.get("cooldown_minutes") != null ? (int) Inputs.number(b, "cooldown_minutes", 0, 120) : 10;
    String notes = Inputs.text(b, "notes", 0, 1000);
    String exercisesJson = toJson(b.get("exercises"));

    var row = db.queryForMap(
      "INSERT INTO pt_templates(pt_id, name, warmup_minutes, main_minutes, cooldown_minutes, exercises_json, notes) VALUES(?,?,?,?,?,?,?) RETURNING *",
      Inputs.id(pt),
      name,
      warmup,
      main,
      cooldown,
      exercisesJson,
      notes
    );
    row.put("exercises", parseExercises(row.remove("exercises_json")));
    return row;
  }

  @PostMapping("/pt/templates/{templateId}/assign")
  public Map<String, Object> assignTemplate(
    @PathVariable long templateId,
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    long memberId = Inputs.number(b, "member_id", 1, Long.MAX_VALUE);
    var tpls = db.queryForList("SELECT * FROM pt_templates WHERE id=? AND pt_id=?", templateId, Inputs.id(pt));
    if (tpls.isEmpty()) throw Inputs.missing();
    var tpl = tpls.get(0);
    db.update(
      "INSERT INTO workout_programs(pt_id, member_id, template_id, source_type, name, exercises_json, notes) VALUES(?,?,?,'PT',?,?,?)",
      Inputs.id(pt),
      memberId,
      templateId,
      tpl.get("name"),
      tpl.get("exercises_json"),
      tpl.get("notes")
    );
    return Map.of("ok", true);
  }

  @GetMapping("/coaching/programs")
  public List<Map<String, Object>> listPrograms(HttpServletRequest req) {
    var u = security.me(req);
    long uid = Inputs.id(u);
    String role = Objects.toString(u.get("role"), "");
    List<Map<String, Object>> rows = "PT".equals(role)
      ? db.queryForList(
          "SELECT wp.*, u.name AS member_name, " +
          "(SELECT count(*) FROM workout_logs wl WHERE wl.program_id=wp.id)::int AS completed_count " +
          "FROM workout_programs wp JOIN users u ON u.id=wp.member_id WHERE wp.pt_id=? ORDER BY wp.created_at DESC",
          uid
        )
      : db.queryForList(
          "SELECT wp.*, COALESCE(pt.name, 'Cá nhân') AS pt_name, " +
          "(SELECT count(*) FROM workout_logs wl WHERE wl.program_id=wp.id)::int AS completed_count " +
          "FROM workout_programs wp LEFT JOIN users pt ON pt.id=wp.pt_id WHERE wp.member_id=? ORDER BY wp.created_at DESC",
          uid
        );
    for (var r : rows) {
      r.put("exercises", parseExercises(r.remove("exercises_json")));
    }
    return rows;
  }

  @PostMapping("/coaching/programs")
  public Map<String, Object> createProgram(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    long memberId = Inputs.number(b, "member_id", 1, Long.MAX_VALUE);
    String name = Inputs.text(b, "name", 2, 120);
    String notes = Inputs.text(b, "notes", 0, 1000);
    String exercisesJson = toJson(b.get("exercises"));
    db.update(
      "INSERT INTO workout_programs(pt_id, member_id, source_type, name, exercises_json, notes) VALUES(?,?,'PT',?,?,?)",
      Inputs.id(pt),
      memberId,
      name,
      exercisesJson,
      notes
    );
    return Map.of("ok", true);
  }

  // ========================================================
  // 4. COACHING 1-1 SESSIONS (PT VIEW & ACTIONS)
  // ========================================================
  @GetMapping("/coaching/sessions")
  public List<Map<String, Object>> listSessions(HttpServletRequest req) {
    var u = security.me(req);
    long uid = Inputs.id(u);
    String role = Objects.toString(u.get("role"), "");
    if ("PT".equals(role) || "ADMIN".equals(role)) {
      return db.queryForList(
        "SELECT s.id, s.pt_id, s.member_id, u.name AS member_name, u.member_code, s.room_id, " +
        "COALESCE(r.name, 'Phòng Gym') AS room, s.starts_at, s.duration_minutes, s.status, s.note " +
        "FROM coach_sessions s JOIN users u ON u.id=s.member_id LEFT JOIN rooms r ON r.id=s.room_id " +
        "WHERE s.pt_id=? ORDER BY s.starts_at DESC LIMIT 200",
        uid
      );
    }
    return db.queryForList(
      "SELECT s.id, s.pt_id, pt.name AS pt_name, pt.specialty, s.member_id, s.room_id, " +
      "COALESCE(r.name, 'Phòng Gym') AS room, s.starts_at, s.duration_minutes, s.status, s.note " +
      "FROM coach_sessions s JOIN users pt ON pt.id=s.pt_id LEFT JOIN rooms r ON r.id=s.room_id " +
      "WHERE s.member_id=? ORDER BY s.starts_at DESC LIMIT 200",
      uid
    );
  }

  @Transactional
  @PostMapping("/coaching/sessions")
  public Map<String, Object> createPtSession(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    long ptId = Inputs.id(pt);
    long memberId = Inputs.number(b, "partner", 1, Long.MAX_VALUE);
    long roomId = b.get("room_id") != null ? Inputs.number(b, "room_id", 1, Long.MAX_VALUE) : 1L;
    int duration = b.get("duration_minutes") != null ? (int) Inputs.number(b, "duration_minutes", 15, 180) : 60;
    String note = Inputs.text(b, "note", 0, 500);
    Instant startsAt;
    try {
      startsAt = Instant.parse(Objects.toString(b.get("starts_at"), "").trim());
    } catch (Exception e) {
      throw Inputs.bad("Thời gian bắt đầu không hợp lệ");
    }

    // Check overlap on PT schedule
    List<Map<String, Object>> ptExisting = db.queryForList(
      "SELECT starts_at, duration_minutes FROM coach_sessions WHERE pt_id=? AND status IN ('REQUESTED','CONFIRMED')",
      ptId
    );
    for (var ex : ptExisting) {
      Instant exStart = toInstant(ex.get("starts_at"));
      int exDur = ((Number) ex.get("duration_minutes")).intValue();
      if (rules.hasTimeOverlap(startsAt, duration, exStart, exDur)) {
        throw Inputs.bad("Khung giờ này bị trùng với một buổi tập khác trong lịch của bạn");
      }
    }

    return db.queryForMap(
      "INSERT INTO coach_sessions(pt_id, member_id, room_id, starts_at, duration_minutes, status, note) " +
      "VALUES(?,?,?,?,?,'CONFIRMED',?) RETURNING *",
      ptId,
      memberId,
      roomId,
      Timestamp.from(startsAt),
      duration,
      note
    );
  }

  @Transactional
  @PatchMapping("/coaching/sessions/{sessionId}")
  public Map<String, Object> updateSessionStatus(
    @PathVariable long sessionId,
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    String newStatus = Inputs.choice(
      b,
      "status",
      "CONFIRMED",
      "REJECTED",
      "COMPLETED",
      "MISSED",
      "CANCELLED",
      "LATE_CANCELLED"
    );

    List<Map<String, Object>> rows = db.queryForList(
      "SELECT id, pt_id, member_id, status, duration_minutes, note FROM coach_sessions WHERE id=?",
      sessionId
    );
    if (rows.isEmpty()) throw Inputs.missing();
    var current = rows.get(0);
    long ptId = ((Number) current.get("pt_id")).longValue();
    long memberId = ((Number) current.get("member_id")).longValue();
    String oldStatus = Objects.toString(current.get("status"), "");

    if (!"ADMIN".equals(pt.get("role")) && ptId != Inputs.id(pt)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thuộc quyền phụ trách của bạn");
    }

    db.update("UPDATE coach_sessions SET status=? WHERE id=?", newStatus, sessionId);

    // Khi hoàn thành buổi tập 1-1: trừ 1 buổi hợp đồng PT và ghi nhận vào workout_logs
    if ("COMPLETED".equals(newStatus) && !"COMPLETED".equals(oldStatus)) {
      db.update(
        "UPDATE pt_assignments SET remaining_sessions = GREATEST(0, remaining_sessions - 1), updated_at=now() WHERE pt_id=? AND member_id=? AND active=true",
        ptId,
        memberId
      );
      int dur = current.get("duration_minutes") instanceof Number n ? n.intValue() : 60;
      String note = Objects.toString(current.get("note"), "");
      db.update(
        "INSERT INTO workout_logs(member_id, session_id, logged_by, program_name, duration_minutes, feedback) VALUES(?,?,?,?,?,?)",
        memberId,
        sessionId,
        Inputs.id(pt),
        "Buổi tập 1-1 cùng PT " + Objects.toString(pt.get("name"), ""),
        dur,
        note.isBlank() ? "Hoàn thành buổi tập 1-1" : note
      );
    }

    return Map.of("ok", true, "status", newStatus);
  }

  // ========================================================
  // 5. PT ASSIGNMENT REQUESTS, NOTIFICATIONS & ADMIN BRIDGE
  // ========================================================
  @GetMapping("/pt/assignment-requests")
  public List<Map<String, Object>> myAssignmentRequests(HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    return db.queryForList(
      "SELECT r.id, r.member_id, u.name AS member_name, u.member_code, r.note, r.status, r.created_at " +
      "FROM pt_assignment_requests r JOIN users u ON u.id=r.member_id WHERE r.pt_id=? ORDER BY r.created_at DESC",
      Inputs.id(pt)
    );
  }

  @PostMapping("/pt/assignment-requests")
  public Map<String, Object> requestAssignment(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    long memberId = Inputs.number(b, "member_id", 1, Long.MAX_VALUE);
    Long memberCount = db.queryForObject("SELECT count(*) FROM users WHERE id=? AND role='MEMBER'", Long.class, memberId);
    if (memberCount == null || memberCount == 0) throw Inputs.bad("Không tìm thấy hội viên với ID này");
    String note = Inputs.text(b, "note", 0, 500);
    db.update(
      "INSERT INTO pt_assignment_requests(pt_id, member_id, note) VALUES(?,?,?)",
      Inputs.id(pt),
      memberId,
      note
    );
    return Map.of("ok", true);
  }

  @GetMapping("/pt/notifications")
  public List<Map<String, Object>> notifications(HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    return db.queryForList(
      "SELECT id, title, body, is_read, created_at FROM pt_notifications WHERE pt_id=? ORDER BY created_at DESC LIMIT 50",
      Inputs.id(pt)
    );
  }

  @PatchMapping("/pt/notifications/{id}/read")
  public Map<String, Object> markNotifRead(@PathVariable long id, HttpServletRequest req) {
    var pt = requirePtOrAdmin(req);
    security.writeCheck(req);
    db.update("UPDATE pt_notifications SET is_read=true WHERE id=? AND pt_id=?", id, Inputs.id(pt));
    return Map.of("ok", true);
  }

  // Admin endpoints for manual PT assignment & approving PT requests
  @GetMapping("/admin/pt-assignments")
  public List<Map<String, Object>> listAdminAssignments(HttpServletRequest req) {
    security.admin(req);
    return db.queryForList(
      "SELECT pa.id, pa.pt_id, pt.name AS pt_name, pt.specialty, pa.member_id, m.name AS member_name, m.member_code, " +
      "pa.total_sessions, pa.remaining_sessions, pa.active, pa.note, pa.updated_at " +
      "FROM pt_assignments pa JOIN users pt ON pt.id=pa.pt_id JOIN users m ON m.id=pa.member_id " +
      "ORDER BY pa.updated_at DESC"
    );
  }

  @Transactional
  @PostMapping("/admin/pt-assignments")
  public Map<String, Object> assignPtManual(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var admin = security.admin(req);
    security.writeCheck(req);
    long ptId = Inputs.number(b, "pt_id", 1, Long.MAX_VALUE);
    long memberId = Inputs.number(b, "member_id", 1, Long.MAX_VALUE);
    int sessions = (int) Inputs.number(b, "sessions", 0, 500);
    String note = Inputs.text(b, "note", 0, 500);

    Long ptOk = db.queryForObject("SELECT count(*) FROM users WHERE id=? AND role='PT'", Long.class, ptId);
    if (ptOk == null || ptOk == 0) throw Inputs.bad("Huấn luyện viên không tồn tại");
    Long memOk = db.queryForObject("SELECT count(*) FROM users WHERE id=? AND role='MEMBER'", Long.class, memberId);
    if (memOk == null || memOk == 0) throw Inputs.bad("Hội viên không tồn tại");

    db.update(
      "INSERT INTO pt_assignments(pt_id, member_id, total_sessions, remaining_sessions, active, assigned_by, note, updated_at) " +
      "VALUES(?,?,?,?,true,?,?,now()) " +
      "ON CONFLICT (pt_id, member_id) DO UPDATE SET " +
      "total_sessions = EXCLUDED.total_sessions, remaining_sessions = EXCLUDED.remaining_sessions, active = true, assigned_by = EXCLUDED.assigned_by, note = EXCLUDED.note, updated_at = now()",
      ptId,
      memberId,
      sessions,
      sessions,
      Inputs.id(admin),
      note
    );
    db.update(
      "INSERT INTO pt_notifications(pt_id, title, body) VALUES(?,?,?)",
      ptId,
      "Phân công học viên mới",
      "Admin đã phân công học viên ID #" + memberId + " (" + sessions + " buổi) cho bạn."
    );
    return Map.of("ok", true);
  }

  @GetMapping("/admin/pt-assignment-requests")
  public List<Map<String, Object>> listAdminRequests(HttpServletRequest req) {
    security.admin(req);
    return db.queryForList(
      "SELECT r.id, r.pt_id, pt.name AS pt_name, r.member_id, m.name AS member_name, m.member_code, r.note, r.status, r.created_at " +
      "FROM pt_assignment_requests r JOIN users pt ON pt.id=r.pt_id JOIN users m ON m.id=r.member_id " +
      "ORDER BY r.created_at DESC"
    );
  }

  @Transactional
  @PatchMapping("/admin/pt-assignment-requests/{id}")
  public Map<String, Object> reviewAdminRequest(
    @PathVariable long id,
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    var admin = security.admin(req);
    security.writeCheck(req);
    String status = Inputs.choice(b, "status", "APPROVED", "REJECTED");
    int sessions = b.get("sessions") != null ? (int) Inputs.number(b, "sessions", 0, 500) : 12;

    var rows = db.queryForList("SELECT * FROM pt_assignment_requests WHERE id=?", id);
    if (rows.isEmpty()) throw Inputs.missing();
    var r = rows.get(0);
    long ptId = ((Number) r.get("pt_id")).longValue();
    long memberId = ((Number) r.get("member_id")).longValue();

    db.update(
      "UPDATE pt_assignment_requests SET status=?, reviewed_by=?, reviewed_at=now() WHERE id=?",
      status,
      Inputs.id(admin),
      id
    );

    if ("APPROVED".equals(status)) {
      db.update(
        "INSERT INTO pt_assignments(pt_id, member_id, total_sessions, remaining_sessions, active, assigned_by, note, updated_at) " +
        "VALUES(?,?,?,?,true,?,?,now()) " +
        "ON CONFLICT (pt_id, member_id) DO UPDATE SET " +
        "total_sessions = pt_assignments.total_sessions + EXCLUDED.total_sessions, " +
        "remaining_sessions = pt_assignments.remaining_sessions + EXCLUDED.remaining_sessions, active = true, updated_at = now()",
        ptId,
        memberId,
        sessions,
        sessions,
        Inputs.id(admin),
        Objects.toString(r.get("note"), "")
      );
    }
    return Map.of("ok", true, "status", status);
  }
}
