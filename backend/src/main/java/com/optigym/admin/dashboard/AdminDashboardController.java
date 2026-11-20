package com.optigym.admin.dashboard;

import com.optigym.coaching.TrainingRulesService;
import com.optigym.shared.security.SessionSecurity;
import com.optigym.shared.web.Inputs;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

  private final JdbcTemplate db;
  private final SessionSecurity security;

  public AdminDashboardController(JdbcTemplate db, SessionSecurity security) {
    this.db = db;
    this.security = security;
  }

  /**
   * API chính thức cung cấp số liệu thực tế cho toàn bộ biểu đồ của Admin Dashboard
   * Hỗ trợ lọc theo kỳ độc lập từng biểu đồ hoặc toàn bộ
   */
  @GetMapping("/dashboard/metrics")
  public Map<String, Object> getMetrics(
    @RequestParam(value = "period", defaultValue = "week") String period,
    @RequestParam(value = "statusPeriod", required = false) String statusPeriod,
    @RequestParam(value = "packagePeriod", required = false) String packagePeriod,
    @RequestParam(value = "growthPeriod", required = false) String growthPeriod,
    @RequestParam(value = "attendancePeriod", required = false) String attendancePeriod,
    @RequestParam(value = "coachPeriod", required = false) String coachPeriod,
    @RequestParam(value = "frequencyPeriod", required = false) String frequencyPeriod,
    @RequestParam(value = "checkinPeriod", required = false) String checkinPeriod,
    HttpServletRequest req
  ) {
    security.admin(req);
    String defaultPeriod = cleanPeriod(period);
    String pStatus = statusPeriod != null ? cleanPeriod(statusPeriod) : defaultPeriod;
    String pPackage = packagePeriod != null ? cleanPeriod(packagePeriod) : defaultPeriod;
    String pGrowth = growthPeriod != null ? cleanPeriod(growthPeriod) : defaultPeriod;
    String pAttendance = attendancePeriod != null ? cleanPeriod(attendancePeriod) : defaultPeriod;
    String pCoach = coachPeriod != null ? cleanPeriod(coachPeriod) : defaultPeriod;
    String pFrequency = frequencyPeriod != null ? cleanPeriod(frequencyPeriod) : defaultPeriod;
    String pCheckin = checkinPeriod != null ? cleanPeriod(checkinPeriod) : defaultPeriod;

    // 1. Số liệu Hội viên (Members)
    long totalMembers = queryCount("SELECT count(*) FROM users WHERE role='MEMBER'");
    long activeMembers = queryCount("SELECT count(*) FROM users WHERE role='MEMBER' AND status='ACTIVE'");
    long suspendedMembers = queryCount("SELECT count(*) FROM users WHERE role='MEMBER' AND status='DISABLED'");
    long expiredMembers = queryCount(
      "SELECT count(DISTINCT s.member_id) FROM subscriptions s " +
      "WHERE NOT EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.member_id=s.member_id AND s2.ends_on >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)"
    );
    long newMembers = queryCount(
      "SELECT count(*) FROM users WHERE role='MEMBER' AND created_at >= " + getIntervalForPeriod(defaultPeriod)
    );
    long cancelledMembers = queryCount("SELECT count(*) FROM users WHERE role='MEMBER' AND status='REJECTED'");

    Map<String, Object> membersSummary = new LinkedHashMap<>();
    membersSummary.put("total", totalMembers);
    membersSummary.put("active", activeMembers);
    membersSummary.put("suspended", suspendedMembers);
    membersSummary.put("expired", expiredMembers);
    membersSummary.put("newMembers", newMembers);
    membersSummary.put("cancelled", cancelledMembers);

    // Grouped Bar Chart: Trạng thái hội viên theo kỳ độc lập
    List<Map<String, Object>> statusChart = getMemberStatusChart(pStatus, expiredMembers);

    // Donut Chart: Cơ cấu gói tập theo tỉ lệ Gym, Yoga, Boxing độc lập
    List<Map<String, Object>> packageStructure = getPackageStructure(pPackage);

    // Line Chart: Tăng trưởng hội viên (chỉ số lượng vì chỉ có 1 loại hội viên) độc lập
    List<Map<String, Object>> growthChart = getMemberGrowthChart(pGrowth);

    Map<String, Object> membersData = new LinkedHashMap<>();
    membersData.put("summary", membersSummary);
    membersData.put("statusChart", statusChart);
    membersData.put("packageStructure", packageStructure);
    membersData.put("growthChart", growthChart);
    membersData.put("statusPeriod", pStatus);
    membersData.put("packagePeriod", pPackage);
    membersData.put("growthPeriod", pGrowth);

    // 2. Số liệu Buổi tập (Sessions & PT)
    long totalSessions = queryCount("SELECT count(*) FROM coach_sessions");
    long upcomingSessions = queryCount("SELECT count(*) FROM coach_sessions WHERE status='CONFIRMED' AND starts_at >= now()");
    long completedSessions = queryCount("SELECT count(*) FROM coach_sessions WHERE status='COMPLETED'");
    long ongoingSessions = queryCount("SELECT count(*) FROM coach_sessions WHERE starts_at <= now() AND starts_at + (duration_minutes || ' minutes')::interval >= now()");
    long cancelledSessions = queryCount("SELECT count(*) FROM coach_sessions WHERE status IN ('CANCELLED', 'REJECTED', 'LATE_CANCELLED')");

    Map<String, Object> sessionsSummary = new LinkedHashMap<>();
    sessionsSummary.put("total", totalSessions);
    sessionsSummary.put("upcoming", upcomingSessions);
    sessionsSummary.put("completed", completedSessions);
    sessionsSummary.put("ongoing", ongoingSessions);
    sessionsSummary.put("cancelled", cancelledSessions);

    String attInterval = getIntervalForPeriod(pAttendance);
    long attTotal = queryCount("SELECT count(*) FROM coach_sessions WHERE starts_at >= " + attInterval);
    long attCompleted = queryCount("SELECT count(*) FROM coach_sessions WHERE status='COMPLETED' AND starts_at >= " + attInterval);
    double attendanceRateVal = getAttendanceRate(attTotal, attCompleted);
    Map<String, Object> attendanceRate = Map.of(
      "percentage", attendanceRateVal,
      "total", attTotal,
      "attended", attCompleted,
      "period", pAttendance
    );

    // Top coaches ranking & sessions comparison theo kỳ độc lập
    List<Map<String, Object>> coaches = getCoachesStats(pCoach);

    Map<String, Object> sessionsData = new LinkedHashMap<>();
    sessionsData.put("summary", sessionsSummary);
    sessionsData.put("attendanceRate", attendanceRate);
    sessionsData.put("coaches", coaches);
    sessionsData.put("coachPeriod", pCoach);
    sessionsData.put("attendancePeriod", pAttendance);

    // 3. Số liệu Điểm danh (Attendance)
    long checkinsToday = queryCount("SELECT count(*) FROM checkins WHERE checked_in_at >= CURRENT_DATE");
    long checkinsThisWeek = queryCount("SELECT count(*) FROM checkins WHERE checked_in_at >= date_trunc('week', now())");
    long checkinsThisMonth = queryCount("SELECT count(*) FROM checkins WHERE checked_in_at >= date_trunc('month', now())");

    Map<String, Object> attendanceSummary = new LinkedHashMap<>();
    attendanceSummary.put("today", checkinsToday);
    attendanceSummary.put("thisWeek", checkinsThisWeek);
    attendanceSummary.put("thisMonth", checkinsThisMonth);

    // Danh sách điểm danh gần đây nhất
    List<Map<String, Object>> recentCheckins = getRecentCheckins(pCheckin);

    // Tần suất điểm danh (Horizontal bar chart) theo kỳ độc lập
    List<Map<String, Object>> frequencyChart = getAttendanceFrequency(pFrequency);

    Map<String, Object> attendanceData = new LinkedHashMap<>();
    attendanceData.put("summary", attendanceSummary);
    attendanceData.put("recentCheckins", recentCheckins);
    attendanceData.put("frequencyChart", frequencyChart);
    attendanceData.put("frequencyPeriod", pFrequency);
    attendanceData.put("checkinPeriod", pCheckin);

    return Map.of(
      "period", defaultPeriod,
      "members", membersData,
      "sessions", sessionsData,
      "attendance", attendanceData
    );
  }

  /**
   * Chi tiết báo cáo & phân tích chuyên sâu cho từng phân hệ
   */
  @GetMapping("/dashboard/reports")
  public Map<String, Object> getReports(
    @RequestParam(value = "tab", defaultValue = "members") String tab,
    @RequestParam(value = "period", defaultValue = "week") String period,
    @RequestParam(value = "search", defaultValue = "") String search,
    HttpServletRequest req
  ) {
    security.admin(req);
    String cleanTab = tab.trim().toLowerCase(Locale.ROOT);
    String term = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";

    if ("sessions".equals(cleanTab)) {
      List<Map<String, Object>> rows = db.queryForList(
        "SELECT cs.id, to_char(cs.starts_at, 'DD/MM/YYYY HH24:MI') as start_time, cs.duration_minutes, cs.status, cs.note, " +
        "pt.name as pt_name, pt.specialty as pt_specialty, m.name as member_name, m.member_code, r.name as room_name " +
        "FROM coach_sessions cs " +
        "JOIN users pt ON cs.pt_id = pt.id " +
        "JOIN users m ON cs.member_id = m.id " +
        "LEFT JOIN rooms r ON cs.room_id = r.id " +
        "WHERE lower(pt.name) LIKE ? OR lower(m.name) LIKE ? OR lower(cs.status) LIKE ? " +
        "ORDER BY cs.starts_at DESC LIMIT 50",
        term, term, term
      );
      return Map.of("tab", "sessions", "items", rows);
    } else if ("attendance".equals(cleanTab)) {
      List<Map<String, Object>> rows = db.queryForList(
        "SELECT c.id, to_char(c.checked_in_at, 'DD/MM/YYYY') as date, to_char(c.checked_in_at, 'HH24:MI') as in_time, " +
        "COALESCE(to_char(c.checked_out_at, 'HH24:MI'), 'Đang tập') as out_time, " +
        "u.name, u.email, u.member_code, u.role, r.name as room_name " +
        "FROM checkins c " +
        "JOIN users u ON c.member_id = u.id " +
        "LEFT JOIN rooms r ON c.room_id = r.id " +
        "WHERE lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR lower(u.member_code) LIKE ? " +
        "ORDER BY c.checked_in_at DESC LIMIT 50",
        term, term, term
      );
      return Map.of("tab", "attendance", "items", rows);
    } else {
      // Default: members
      List<Map<String, Object>> rows = db.queryForList(
        "SELECT u.id, u.name, u.email, u.phone, u.member_code, u.status, u.specialty, " +
        "to_char(u.created_at, 'DD/MM/YYYY') as join_date, " +
        "COALESCE((SELECT p.category FROM subscriptions s JOIN packages p ON s.package_id = p.id WHERE s.member_id = u.id ORDER BY s.ends_on DESC LIMIT 1), 'GYM') as package_type, " +
        "(SELECT count(*) FROM checkins c WHERE c.member_id = u.id) as total_checkins " +
        "FROM users u " +
        "WHERE u.role = 'MEMBER' AND (lower(u.name) LIKE ? OR lower(u.email) LIKE ? OR lower(u.member_code) LIKE ?) " +
        "ORDER BY u.id DESC LIMIT 50",
        term, term, term
      );
      return Map.of("tab", "members", "items", rows);
    }
  }

  // --- Helper Query Methods ---

  private long queryCount(String sql) {
    try {
      Long count = db.queryForObject(sql, Long.class);
      return count != null ? count : 0L;
    } catch (Exception e) {
      return 0L;
    }
  }

  private String cleanPeriod(String p) {
    if (p == null) return "week";
    String clean = p.trim().toLowerCase(Locale.ROOT);
    return List.of("week", "month", "year").contains(clean) ? clean : "week";
  }

  private String getIntervalForPeriod(String period) {
    switch (period) {
      case "month":
        return "now() - interval '30 days'";
      case "year":
        return "now() - interval '365 days'";
      case "week":
      default:
        return "now() - interval '7 days'";
    }
  }

  private String[] bucketLabels(String period) {
    LocalDate today = LocalDate.now(TrainingRulesService.VN_ZONE);
    String[] labels = new String[4];
    for (int i = 0; i < 4; i++) {
      int back = 3 - i;
      if ("year".equals(period)) {
        labels[i] = String.valueOf(today.minusYears(back).getYear());
      } else if ("month".equals(period)) {
        labels[i] = "Tháng " + today.minusMonths(back).getMonthValue();
      } else {
        labels[i] = "Tuần " + (i + 1);
      }
    }
    return labels;
  }

  private List<Map<String, Object>> getMemberStatusChart(String period, long expired) {
    List<Map<String, Object>> points = new ArrayList<>();
    String[] labels = bucketLabels(period);
    int stepDays = "year".equals(period) ? 365 : "month".equals(period) ? 30 : 7;
    for (int i = 0; i < 4; i++) {
      int offsetDays = (3 - i) * stepDays;
      String cutoff = offsetDays == 0 ? "now()" : "now() - interval '" + offsetDays + " days'";
      long totalAt = queryCount("SELECT count(*) FROM users WHERE role='MEMBER' AND created_at <= " + cutoff);
      long activeAt = queryCount("SELECT count(*) FROM users WHERE role='MEMBER' AND status='ACTIVE' AND created_at <= " + cutoff);
      points.add(Map.of(
        "label", labels[i],
        "total", totalAt,
        "active", activeAt,
        "expired", i == 3 ? expired : 0L
      ));
    }
    return points;
  }

  private List<Map<String, Object>> getPackageStructure(String period) {
    Map<String, Long> counts = new HashMap<>();
    try {
      String filter = "";
      if ("week".equals(period)) {
        filter = "AND s.starts_on >= CURRENT_DATE - INTERVAL '14 days' ";
      } else if ("month".equals(period)) {
        filter = "AND s.starts_on >= CURRENT_DATE - INTERVAL '60 days' ";
      }
      List<Map<String, Object>> rows = db.queryForList(
        "SELECT p.category, count(*) as count " +
        "FROM subscriptions s " +
        "JOIN packages p ON s.package_id = p.id " +
        "WHERE p.category IN ('GYM', 'YOGA', 'BOXING') " +
        filter +
        "GROUP BY p.category"
      );
      for (var r : rows) {
        String cat = (String) r.get("category");
        Number cnt = (Number) r.get("count");
        counts.put(cat, cnt != null ? cnt.longValue() : 0L);
      }
    } catch (Exception ignored) {}

    long gymCount = counts.getOrDefault("GYM", 0L);
    long yogaCount = counts.getOrDefault("YOGA", 0L);
    long boxingCount = counts.getOrDefault("BOXING", 0L);
    long total = gymCount + yogaCount + boxingCount;

    double gymPct = total == 0 ? 0.0 : Math.round(gymCount * 1000.0 / total) / 10.0;
    double yogaPct = total == 0 ? 0.0 : Math.round(yogaCount * 1000.0 / total) / 10.0;
    double boxingPct = total == 0 ? 0.0 : Math.max(0.0, Math.round((100.0 - gymPct - yogaPct) * 10.0) / 10.0);

    List<Map<String, Object>> result = new ArrayList<>();
    result.add(Map.of("specialty", "GYM", "label", "Gym", "count", gymCount, "percentage", gymPct, "color", "#0f172a"));
    result.add(Map.of("specialty", "YOGA", "label", "Yoga", "count", yogaCount, "percentage", yogaPct, "color", "#dc2626"));
    result.add(Map.of("specialty", "BOXING", "label", "Boxing", "count", boxingCount, "percentage", boxingPct, "color", "#cbd5e1"));
    return result;
  }

  private List<Map<String, Object>> getMemberGrowthChart(String period) {
    List<Map<String, Object>> growth = new ArrayList<>();
    String[] labels = bucketLabels(period);
    int stepDays = "year".equals(period) ? 365 : "month".equals(period) ? 30 : 7;
    for (int i = 0; i < 4; i++) {
      int endOffset = (3 - i) * stepDays;
      int startOffset = (4 - i) * stepDays;
      String endCutoff = endOffset == 0 ? "now()" : "now() - interval '" + endOffset + " days'";
      String startCutoff = "now() - interval '" + startOffset + " days'";
      long countAt = queryCount("SELECT count(*) FROM users WHERE role='MEMBER' AND created_at <= " + endCutoff);
      long newInBucket = queryCount("SELECT count(*) FROM users WHERE role='MEMBER' AND created_at > " + startCutoff + " AND created_at <= " + endCutoff);
      growth.add(Map.of("label", labels[i], "count", countAt, "newCount", newInBucket));
    }
    return growth;
  }

  private double getAttendanceRate(long totalSessions, long completedSessions) {
    if (totalSessions <= 0) return 0.0;
    return Math.round((double) completedSessions * 1000.0 / totalSessions) / 10.0;
  }

  private List<Map<String, Object>> getCoachesStats(String period) {
    String timeFilter = "";
    if ("week".equals(period)) {
      timeFilter = "AND cs.starts_at >= CURRENT_DATE - INTERVAL '7 days' ";
    } else if ("month".equals(period)) {
      timeFilter = "AND cs.starts_at >= CURRENT_DATE - INTERVAL '30 days' ";
    }
    try {
      List<Map<String, Object>> rows = db.queryForList(
        "SELECT u.name, COALESCE(u.specialty, 'GYM') as specialty, " +
        "count(cs.id) as total, " +
        "count(CASE WHEN cs.status = 'COMPLETED' OR cs.status = 'CONFIRMED' THEN 1 END) as attended " +
        "FROM users u " +
        "LEFT JOIN coach_sessions cs ON cs.pt_id = u.id " + timeFilter +
        "WHERE u.role = 'PT' " +
        "GROUP BY u.id, u.name, u.specialty " +
        "ORDER BY total DESC, attended DESC " +
        "LIMIT 10"
      );
      List<Map<String, Object>> res = new ArrayList<>();
      for (var r : rows) {
        Number total = (Number) r.get("total");
        Number attended = (Number) r.get("attended");
        res.add(Map.of(
          "name", r.get("name"),
          "specialty", r.get("specialty"),
          "total", total != null ? total.intValue() : 0,
          "attended", attended != null ? attended.intValue() : 0
        ));
      }
      return res;
    } catch (Exception ignored) {
      return List.of();
    }
  }

  private List<Map<String, Object>> getRecentCheckins(String period) {
    String intervalFilter = "";
    if ("week".equals(period)) {
      intervalFilter = "WHERE c.checked_in_at >= CURRENT_DATE - INTERVAL '7 days' ";
    } else if ("month".equals(period)) {
      intervalFilter = "WHERE c.checked_in_at >= CURRENT_DATE - INTERVAL '30 days' ";
    }
    try {
      List<Map<String, Object>> rows = db.queryForList(
        "SELECT c.id, to_char(c.checked_in_at, 'DD/MM/YYYY') as date, u.name, u.email, " +
        "CASE WHEN u.role = 'PT' THEN 'Huấn luyện viên' WHEN u.role = 'ADMIN' THEN 'Quản trị viên' ELSE 'Hội viên' END as role, " +
        "to_char(c.checked_in_at, 'HH12:MI AM') as in_time, " +
        "COALESCE(to_char(c.checked_out_at, 'HH12:MI AM'), 'Đang tập') as out_time, " +
        "COALESCE(r.name, 'Phòng Gym') as room_name " +
        "FROM checkins c " +
        "JOIN users u ON c.member_id = u.id " +
        "LEFT JOIN rooms r ON c.room_id = r.id " +
        intervalFilter +
        "ORDER BY c.checked_in_at DESC " +
        "LIMIT 10"
      );
      List<Map<String, Object>> res = new ArrayList<>();
      for (var r : rows) {
        res.add(Map.of(
          "id", r.get("id"),
          "date", r.get("date"),
          "name", r.get("name"),
          "email", r.get("email"),
          "role", r.get("role"),
          "inTime", r.get("in_time"),
          "outTime", r.get("out_time"),
          "roomName", r.get("room_name")
        ));
      }
      return res;
    } catch (Exception ignored) {
      return List.of();
    }
  }

  private List<Map<String, Object>> getAttendanceFrequency(String period) {
    List<Map<String, Object>> res = new ArrayList<>();
    String[] labels = bucketLabels(period);
    int stepDays = "year".equals(period) ? 365 : "month".equals(period) ? 30 : 7;
    for (int i = 0; i < 4; i++) {
      int endOffset = (3 - i) * stepDays;
      int startOffset = (4 - i) * stepDays;
      String endCutoff = endOffset == 0 ? "now()" : "now() - interval '" + endOffset + " days'";
      String startCutoff = "now() - interval '" + startOffset + " days'";
      long count = queryCount("SELECT count(*) FROM checkins WHERE checked_in_at > " + startCutoff + " AND checked_in_at <= " + endCutoff);
      res.add(Map.of("label", labels[i], "count", count));
    }
    return res;
  }

  // ========================================================
  // QUẢN LÝ CHƯƠNG TRÌNH ƯU ĐÃI (PROMOTIONS / VOUCHERS)
  // ========================================================
  @GetMapping("/promotions")
  public List<Map<String, Object>> listPromotions(HttpServletRequest req) {
    security.admin(req);
    return db.queryForList("SELECT * FROM promotions ORDER BY id DESC");
  }

  private Object[] promotionValues(Map<String, Object> b) {
    String code = Inputs.text(b, "code", 2, 40).toUpperCase(Locale.ROOT);
    String title = Inputs.text(b, "title", 2, 160);
    String discountType = Inputs.choice(
      Map.of("discount_type", Objects.toString(b.getOrDefault("discount_type", "PERCENT"), "PERCENT").trim().toUpperCase(Locale.ROOT)),
      "discount_type",
      "PERCENT",
      "AMOUNT"
    );
    String category = Inputs.choice(
      Map.of("category", Objects.toString(b.getOrDefault("category", "ALL"), "ALL").trim().toUpperCase(Locale.ROOT)),
      "category",
      "ALL",
      "GYM",
      "YOGA",
      "BOXING"
    );
    long discountValue = Inputs.number(
      Map.of("discount_value", b.getOrDefault("discount_value", 10)),
      "discount_value",
      1,
      "PERCENT".equals(discountType) ? 100L : 1_000_000_000L
    );
    int usageLimit = (int) Inputs.number(
      Map.of("usage_limit", b.getOrDefault("usage_limit", 100)),
      "usage_limit",
      1,
      1_000_000L
    );
    LocalDate startsAt = Inputs.date(b, "starts_at");
    if (startsAt == null) startsAt = LocalDate.now();
    LocalDate endsAt = Inputs.date(b, "ends_at");
    if (endsAt == null) endsAt = startsAt.plusDays(30);
    if (endsAt.isBefore(startsAt)) {
      throw Inputs.bad("Ngày kết thúc không được trước ngày bắt đầu");
    }
    boolean active = Boolean.parseBoolean(Objects.toString(b.getOrDefault("active", "true"), "true"));
    return new Object[] { code, title, discountType, discountValue, category, startsAt, endsAt, usageLimit, active };
  }

  @PostMapping("/promotions")
  public Map<String, Object> createPromotion(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    Object[] v = promotionValues(b);
    db.update(
      "INSERT INTO promotions (code, title, discount_type, discount_value, category, starts_at, ends_at, usage_limit, active) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      v
    );
    return Map.of("ok", true, "message", "Tạo chương trình ưu đãi thành công");
  }

  @PutMapping("/promotions/{id}")
  public Map<String, Object> updatePromotion(@PathVariable long id, @RequestBody Map<String, Object> b, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    Object[] v = promotionValues(b);
    Object[] args = Arrays.copyOf(v, 10);
    args[9] = id;
    if (db.update(
      "UPDATE promotions SET code=?, title=?, discount_type=?, discount_value=?, category=?, starts_at=?, ends_at=?, usage_limit=?, active=? WHERE id=?",
      args
    ) == 0) {
      throw Inputs.missing();
    }
    return Map.of("ok", true, "message", "Cập nhật ưu đãi thành công");
  }

  @PatchMapping("/promotions/{id}/toggle")
  public Map<String, Object> togglePromotion(@PathVariable long id, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    if (db.update("UPDATE promotions SET active = NOT active WHERE id = ?", id) == 0) {
      throw Inputs.missing();
    }
    return Map.of("ok", true);
  }

  @DeleteMapping("/promotions/{id}")
  public Map<String, Object> deletePromotion(@PathVariable long id, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    if (db.update("DELETE FROM promotions WHERE id = ?", id) == 0) {
      throw Inputs.missing();
    }
    return Map.of("ok", true);
  }

  // ========================================================
  // QUẢN LÝ GÓI TẬP (PACKAGES)
  // ========================================================
  @GetMapping("/packages")
  public List<Map<String, Object>> listPackages(HttpServletRequest req) {
    security.admin(req);
    return db.queryForList("SELECT * FROM packages ORDER BY id DESC");
  }

  @PostMapping("/packages")
  public Map<String, Object> createPackage(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    String name = Inputs.text(b, "name", 2, 120);
    String category = Inputs.choice(b, "category", "GYM", "YOGA", "BOXING");
    long price = Inputs.number(b, "price", 0, 1_000_000_000L);
    int durationDays = (int) Inputs.number(b, "duration_days", 1, 3650);
    String description = Inputs.text(b, "description", 0, 1000);
    boolean active = !Boolean.FALSE.equals(b.get("active"));
    return db.queryForMap(
      "INSERT INTO packages(name, category, price, duration_days, description, active) VALUES(?,?,?,?,?,?) RETURNING *",
      name, category, price, durationDays, description, active
    );
  }

  @PutMapping("/packages/{id}")
  public Map<String, Object> updatePackage(@PathVariable long id, @RequestBody Map<String, Object> b, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    String name = Inputs.text(b, "name", 2, 120);
    String category = Inputs.choice(b, "category", "GYM", "YOGA", "BOXING");
    long price = Inputs.number(b, "price", 0, 1_000_000_000L);
    int durationDays = (int) Inputs.number(b, "duration_days", 1, 3650);
    String description = Inputs.text(b, "description", 0, 1000);
    boolean active = !Boolean.FALSE.equals(b.get("active"));
    if (db.update(
      "UPDATE packages SET name=?, category=?, price=?, duration_days=?, description=?, active=? WHERE id=?",
      name, category, price, durationDays, description, active, id
    ) == 0) {
      throw Inputs.missing();
    }
    return Map.of("ok", true);
  }

  @DeleteMapping("/packages/{id}")
  public Map<String, Object> deletePackage(@PathVariable long id, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    if (db.update("DELETE FROM packages WHERE id=?", id) == 0) {
      throw Inputs.missing();
    }
    return Map.of("ok", true);
  }

  // ========================================================
  // LỊCH LỚP TẬP (CLASSES)
  // ========================================================
  @GetMapping("/classes")
  public List<Map<String, Object>> listAdminClasses(HttpServletRequest req) {
    security.admin(req);
    return queryClasses();
  }

  private List<Map<String, Object>> queryClasses() {
    return db.queryForList(
      "SELECT c.id, c.name, c.category, c.pt_id, u.name AS coach, c.room_id, r.name AS room, " +
      "c.starts_at, c.duration_minutes, c.capacity, " +
      "(SELECT count(*) FROM class_bookings cb WHERE cb.class_id=c.id AND cb.status IN ('BOOKED','LATE_CANCELLED'))::int AS filled, c.status " +
      "FROM gym_classes c JOIN users u ON u.id=c.pt_id JOIN rooms r ON r.id=c.room_id ORDER BY c.starts_at DESC"
    );
  }

  @PostMapping("/classes")
  public Map<String, Object> createClass(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    String name = Inputs.text(b, "name", 2, 120);
    String category = Inputs.choice(b, "category", "GYM", "YOGA", "BOXING");
    long ptId = Inputs.number(b, "pt_id", 1, Long.MAX_VALUE);
    long roomId = Inputs.number(b, "room_id", 1, Long.MAX_VALUE);
    int durationMinutes = (int) Inputs.number(b, "duration_minutes", 15, 480);
    int capacity = (int) Inputs.number(b, "capacity", 1, 500);
    Instant startInstant;
    try {
      startInstant = Instant.parse(Objects.toString(b.get("starts_at"), "").trim());
    } catch (Exception e) {
      throw Inputs.bad("Thời gian bắt đầu không hợp lệ");
    }
    Timestamp startsAt = Timestamp.from(startInstant);
    if (db.queryForObject("SELECT count(*) FROM users WHERE id=? AND role='PT' AND status='ACTIVE'", Long.class, ptId) == 0) {
      throw Inputs.bad("Huấn luyện viên không tồn tại hoặc chưa hoạt động");
    }
    if (db.queryForObject("SELECT count(*) FROM rooms WHERE id=? AND active=true", Long.class, roomId) == 0) {
      throw Inputs.bad("Phòng tập không tồn tại hoặc đang tạm đóng");
    }

    List<Map<String, Object>> ptBusy = db.queryForList(
      "SELECT starts_at, duration_minutes FROM gym_classes WHERE pt_id=? AND status='OPEN' " +
      "UNION ALL SELECT starts_at, duration_minutes FROM coach_sessions WHERE pt_id=? AND status IN ('REQUESTED','CONFIRMED')",
      ptId, ptId
    );
    for (var s : ptBusy) {
      Instant exStart = toInstant(s.get("starts_at"));
      int exDur = s.get("duration_minutes") instanceof Number n ? n.intValue() : 60;
      if (TrainingRulesService.overlaps(startInstant, durationMinutes, exStart, exDur)) {
        throw Inputs.bad("Huấn luyện viên đã có lịch lớp hoặc buổi 1-1 trùng khung giờ này");
      }
    }

    List<Map<String, Object>> roomBusy = db.queryForList(
      "SELECT starts_at, duration_minutes FROM gym_classes WHERE room_id=? AND status='OPEN'",
      roomId
    );
    for (var r : roomBusy) {
      Instant exStart = toInstant(r.get("starts_at"));
      int exDur = r.get("duration_minutes") instanceof Number n ? n.intValue() : 60;
      if (TrainingRulesService.overlaps(startInstant, durationMinutes, exStart, exDur)) {
        throw Inputs.bad("Phòng tập đã có lớp khác trong khung giờ này");
      }
    }

    return db.queryForMap(
      "INSERT INTO gym_classes(name, category, pt_id, room_id, starts_at, duration_minutes, capacity, status) " +
      "VALUES(?,?,?,?,?,?,?,'OPEN') RETURNING *",
      name, category, ptId, roomId, startsAt, durationMinutes, capacity
    );
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

  @PatchMapping("/classes/{id}/cancel")
  public Map<String, Object> cancelClass(@PathVariable long id, HttpServletRequest req) {
    security.admin(req);
    security.writeCheck(req);
    if (db.update("UPDATE gym_classes SET status='CANCELLED' WHERE id=? AND status='OPEN'", id) == 0) {
      throw Inputs.bad("Lớp không ở trạng thái mở đăng ký");
    }
    return Map.of("ok", true);
  }

  // ========================================================
  // LẬP HÓA ĐƠN THỦ CÔNG CHO QUẢN TRỊ VIÊN (ADMIN ORDERS)
  // ========================================================
  @Transactional
  @PostMapping("/orders")
  public Map<String, Object> createAdminOrder(@RequestBody Map<String, Object> b, HttpServletRequest req) {
    var admin = security.admin(req);
    security.writeCheck(req);
    long memberId = Inputs.number(b, "member_id", 1, Long.MAX_VALUE);
    long packageId = Inputs.number(b, "package_id", 1, Long.MAX_VALUE);
    var memberRows = db.queryForList("SELECT id, name, member_code FROM users WHERE id=? AND role='MEMBER'", memberId);
    if (memberRows.isEmpty()) {
      throw Inputs.bad("Hội viên không tồn tại");
    }
    var pkgRows = db.queryForList("SELECT * FROM packages WHERE id=?", packageId);
    if (pkgRows.isEmpty()) {
      throw Inputs.bad("Gói tập không tồn tại");
    }
    var p = pkgRows.get(0);
    long packagePrice = ((Number) p.get("price")).longValue();
    int packageDays = ((Number) p.get("duration_days")).intValue();
    String packageCategory = Objects.toString(p.get("category"), "GYM").toUpperCase(Locale.ROOT);

    Long promoId = null;
    String promoCode = Objects.toString(b.get("promotion_code"), "").trim().toUpperCase(Locale.ROOT);
    long discountAmount = 0L;
    LocalDate today = LocalDate.now(TrainingRulesService.VN_ZONE);

    if (!promoCode.isEmpty()) {
      var promoRows = db.queryForList("SELECT * FROM promotions WHERE code=? FOR UPDATE", promoCode);
      if (promoRows.isEmpty()) {
        throw Inputs.bad("Mã ưu đãi không tồn tại");
      }
      var pr = promoRows.get(0);
      if (!Boolean.TRUE.equals(pr.get("active"))) {
        throw Inputs.bad("Mã ưu đãi đang tạm ngưng");
      }
      LocalDate startsAt = toLocalDate(pr.get("starts_at"));
      LocalDate endsAt = toLocalDate(pr.get("ends_at"));
      if ((startsAt != null && today.isBefore(startsAt)) || (endsAt != null && today.isAfter(endsAt))) {
        throw Inputs.bad("Mã ưu đãi chưa đến hạn hoặc đã hết hạn sử dụng");
      }
      int usageLimit = pr.get("usage_limit") instanceof Number n ? n.intValue() : 0;
      int usedCount = pr.get("used_count") instanceof Number n ? n.intValue() : 0;
      if (usedCount >= usageLimit) {
        throw Inputs.bad("Mã ưu đãi đã hết lượt sử dụng");
      }
      String promoCat = Objects.toString(pr.get("category"), "ALL").toUpperCase(Locale.ROOT);
      if (!"ALL".equals(promoCat) && !promoCat.equals(packageCategory)) {
        throw Inputs.bad("Mã ưu đãi chỉ áp dụng cho gói " + promoCat);
      }

      long discountVal = pr.get("discount_value") instanceof Number n ? n.longValue() : 0L;
      String discountType = Objects.toString(pr.get("discount_type"), "PERCENT").toUpperCase(Locale.ROOT);
      discountAmount = "PERCENT".equals(discountType)
        ? Math.min(packagePrice, Math.round(packagePrice * (discountVal / 100.0)))
        : Math.min(packagePrice, Math.max(0L, discountVal));
      promoId = ((Number) pr.get("id")).longValue();
      db.update("UPDATE promotions SET used_count = used_count + 1 WHERE id=?", promoId);
    }

    long finalTotal = Math.max(0L, packagePrice - discountAmount);
    String rawMethod = Objects.toString(b.get("payment_method"), "CASH").trim().toUpperCase(Locale.ROOT);
    String paymentMethod = List.of("CASH", "TRANSFER", "POS", "CARD").contains(rawMethod) ? rawMethod : "CASH";

    String ref = "INV" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
    String status = "PAID".equalsIgnoreCase(Objects.toString(b.get("status"), "PAID")) ? "PAID" : "PENDING";
    var order = db.queryForMap(
      "INSERT INTO orders(reference, member_id, package_id, package_name, package_price, package_days, pt_name, pt_price, pt_days, pt_sessions, promotion_id, promotion_code, discount_amount, payment_method, total, status, confirmed_by, paid_at) " +
      "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, " + ("PAID".equals(status) ? "now()" : "null") + ") RETURNING *",
      ref, memberId, packageId, p.get("name"), packagePrice, packageDays, "", 0, 0, 0, promoId, promoCode, discountAmount, paymentMethod, finalTotal, status, "PAID".equals(status) ? admin.get("id") : null
    );
    if ("PAID".equals(status)) {
      activateSubscriptionChain(memberId, packageId, packageDays);
    }
    return order;
  }

  private void activateSubscriptionChain(long memberId, long packageId, int days) {
    LocalDate today = LocalDate.now(TrainingRulesService.VN_ZONE);
    LocalDate startsOn = today;
    List<Map<String, Object>> currentSubs = db.queryForList(
      "SELECT ends_on FROM subscriptions WHERE member_id=? ORDER BY ends_on DESC LIMIT 1",
      memberId
    );
    if (!currentSubs.isEmpty() && currentSubs.get(0).get("ends_on") != null) {
      LocalDate currentEnd = toLocalDate(currentSubs.get(0).get("ends_on"));
      if (currentEnd != null && !currentEnd.isBefore(today)) {
        startsOn = currentEnd.plusDays(1);
      }
    }
    LocalDate endsOn = startsOn.plusDays(Math.max(1, days) - 1);
    db.update(
      "INSERT INTO subscriptions(member_id,package_id,starts_on,ends_on) VALUES(?,?,?,?)",
      memberId, packageId, Date.valueOf(startsOn), Date.valueOf(endsOn)
    );
  }

  @Transactional
  @PatchMapping("/orders/{id}/paid")
  public Map<String, Object> markOrderPaid(@PathVariable long id, HttpServletRequest req) {
    var admin = security.admin(req);
    security.writeCheck(req);
    var rows = db.queryForList("SELECT id, member_id, package_id, package_days, status FROM orders WHERE id=? FOR UPDATE", id);
    if (rows.isEmpty()) throw Inputs.missing();
    var o = rows.get(0);
    if ("PAID".equals(o.get("status"))) return Map.of("ok", true);
    db.update("UPDATE orders SET status='PAID', confirmed_by=?, paid_at=now() WHERE id=?", admin.get("id"), id);
    if (o.get("package_id") != null && ((Number) o.get("package_days")).intValue() > 0) {
      long memberId = ((Number) o.get("member_id")).longValue();
      long packageId = ((Number) o.get("package_id")).longValue();
      int days = ((Number) o.get("package_days")).intValue();
      activateSubscriptionChain(memberId, packageId, days);
    }
    return Map.of("ok", true);
  }
}
