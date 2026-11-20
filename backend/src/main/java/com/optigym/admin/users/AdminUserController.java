package com.optigym.admin.users;

import static com.optigym.shared.web.RequestValues.bad;
import static com.optigym.shared.web.RequestValues.str;

import com.optigym.shared.security.SessionSecurity;
import com.optigym.shared.web.Inputs;
import com.optigym.verification.EmailVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
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
public class AdminUserController {

  private final JdbcTemplate db;
  private final EmailVerificationService verification;
  private final SessionSecurity security;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

  public AdminUserController(
    JdbcTemplate db,
    EmailVerificationService verification,
    SessionSecurity security
  ) {
    this.db = db;
    this.verification = verification;
    this.security = security;
  }

  @GetMapping("/admin/users")
  public List<Map<String, Object>> users(
    @RequestParam(defaultValue = "ALL") String role,
    HttpServletRequest req
  ) {
    security.admin(req);
    String baseSql =
      "SELECT u.id,u.name,u.email,u.role,u.status,u.email_verified,u.phone,u.specialty,u.created_at,u.member_code," +
      "EXISTS(SELECT 1 FROM pt_documents d WHERE d.user_id=u.id) AS has_cv," +
      "sub.package_name,sub.ends_on,sub.days_left " +
      "FROM users u " +
      "LEFT JOIN LATERAL (" +
      "  SELECT p.name AS package_name, s.ends_on, (s.ends_on - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int AS days_left " +
      "  FROM subscriptions s JOIN packages p ON p.id=s.package_id " +
      "  WHERE s.member_id=u.id ORDER BY s.ends_on DESC LIMIT 1" +
      ") sub ON true ";
    if ("ALL".equalsIgnoreCase(role)) {
      return db.queryForList(baseSql + "ORDER BY u.id DESC");
    }
    String upperRole = role.toUpperCase(Locale.ROOT);
    if (!List.of("MEMBER", "PT", "ADMIN").contains(upperRole)) {
      bad("Vai trò không hợp lệ");
    }
    return db.queryForList(baseSql + "WHERE u.role=? ORDER BY u.id DESC", upperRole);
  }

  @Transactional
  @PostMapping("/admin/subscriptions")
  public Map<String, Object> assignSubscription(
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    var admin = security.admin(req);
    security.writeCheck(req);
    long memberId = Inputs.number(b, "member_id", 1, Long.MAX_VALUE);
    long packageId = Inputs.number(b, "package_id", 1, Long.MAX_VALUE);

    List<Map<String, Object>> members = db.queryForList(
      "SELECT id, name, status FROM users WHERE id=? AND role='MEMBER'",
      memberId
    );
    if (members.isEmpty() || !"ACTIVE".equals(members.get(0).get("status"))) {
      bad("Hội viên không hợp lệ hoặc chưa ở trạng thái hoạt động");
    }

    List<Map<String, Object>> packages = db.queryForList(
      "SELECT id, name, price, duration_days FROM packages WHERE id=? AND active=true",
      packageId
    );
    if (packages.isEmpty()) {
      bad("Gói tập không hợp lệ hoặc đang tạm ngưng");
    }
    var pkg = packages.get(0);
    int days = ((Number) pkg.get("duration_days")).intValue();
    long price = pkg.get("price") instanceof Number n ? n.longValue() : 0L;

    LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    LocalDate startsOn = today;

    // Nếu hội viên đang có gói còn hạn thì tự động cộng nối tiếp hạn hiện tại
    List<Map<String, Object>> currentSubs = db.queryForList(
      "SELECT ends_on FROM subscriptions WHERE member_id=? ORDER BY ends_on DESC LIMIT 1",
      memberId
    );
    if (!currentSubs.isEmpty() && currentSubs.get(0).get("ends_on") != null) {
      Object rawEnd = currentSubs.get(0).get("ends_on");
      LocalDate currentEnd = rawEnd instanceof Date d
        ? d.toLocalDate()
        : LocalDate.parse(rawEnd.toString().substring(0, 10));
      if (!currentEnd.isBefore(today)) {
        startsOn = currentEnd.plusDays(1);
      }
    }
    LocalDate endsOn = startsOn.plusDays(Math.max(1, days) - 1);

    db.update(
      "INSERT INTO subscriptions(member_id,package_id,starts_on,ends_on) VALUES(?,?,?,?)",
      memberId,
      packageId,
      Date.valueOf(startsOn),
      Date.valueOf(endsOn)
    );

    String ref = "SUB" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
    db.update(
      "INSERT INTO orders(reference, member_id, package_id, package_name, package_price, package_days, total, status, confirmed_by, paid_at) " +
      "VALUES(?,?,?,?,?,?,?,'PAID',?,now())",
      ref,
      memberId,
      packageId,
      pkg.get("name"),
      price,
      days,
      price,
      admin.get("id")
    );

    return Map.of(
      "ok", true,
      "package_name", Objects.toString(pkg.get("name"), ""),
      "starts_on", startsOn.toString(),
      "ends_on", endsOn.toString()
    );
  }

  @Transactional
  @PostMapping("/admin/members")
  public Map<String, Object> addMember(
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    security.admin(req);
    security.writeCheck(req);
    String name = str(b, "name"),
      email = str(b, "email").toLowerCase(Locale.ROOT),
      phone = str(b, "phone"),
      role = b.containsKey("role") ? str(b, "role").toUpperCase(Locale.ROOT) : "MEMBER",
      specialty = str(b, "specialty").toUpperCase(Locale.ROOT);

    if (
      name.length() < 2 ||
      name.length() > 120 ||
      !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") ||
      email.length() > 255 ||
      phone.length() > 30 ||
      (!phone.isEmpty() && !phone.matches("[+0-9 ()-]{6,30}")) ||
      !List.of("MEMBER", "PT").contains(role)
    ) bad("Kiểm tra thông tin họ tên, email, sđt hoặc vai trò");

    if (role.equals("PT") && !List.of("GYM", "YOGA", "BOXING").contains(specialty)) {
      specialty = "GYM";
    }

    String initialPassword = Objects.toString(b.getOrDefault("password", "123456"), "123456");
    if (initialPassword.length() < 6 || initialPassword.length() > 128) bad("Mật khẩu phải từ 6 đến 128 ký tự");

    long id;
    try {
      id = db.queryForObject(
        "INSERT INTO users(name,email,password_hash,role,status,phone,specialty,email_verified,member_code) " +
        "VALUES(?,?,?,?,?,?,?,true,'') RETURNING id",
        Long.class,
        name,
        email,
        passwords.encode(initialPassword),
        role,
        "ACTIVE",
        phone,
        role.equals("PT") ? specialty : ""
      );
    } catch (DuplicateKeyException e) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại");
    }

    String memberCode = String.format(Locale.ROOT, "OG-%08d", id);
    db.update("UPDATE users SET member_code=? WHERE id=?", memberCode, id);
    return Map.of(
      "id", id,
      "name", name,
      "email", email,
      "role", role,
      "member_code", memberCode,
      "status", "ACTIVE"
    );
  }

  @Transactional
  @PatchMapping("/admin/users/{id}")
  public Map<String, Object> updateUser(
    @PathVariable long id,
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    security.admin(req);
    security.writeCheck(req);
    String name = str(b, "name"),
      phone = str(b, "phone"),
      specialty = str(b, "specialty").toUpperCase(Locale.ROOT),
      status = str(b, "status").toUpperCase(Locale.ROOT);

    if (
      name.length() < 2 ||
      name.length() > 120 ||
      phone.length() > 30 ||
      !List.of("ACTIVE", "PENDING", "REJECTED", "DISABLED").contains(status)
    ) bad("Dữ liệu không hợp lệ");

    List<Map<String, Object>> rows = db.queryForList(
      "SELECT role,email,email_verified FROM users WHERE id=?",
      id
    );
    if (rows.isEmpty() || "ADMIN".equals(rows.get(0).get("role"))) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    String role = (String) rows.get(0).get("role");
    String email = b.containsKey("email")
      ? str(b, "email").toLowerCase(Locale.ROOT)
      : (String) rows.get(0).get("email");

    if (!email.equals(rows.get(0).get("email"))) {
      bad("Đổi email cần luồng xác thực riêng.");
    }

    if (role.equals("MEMBER") && status.equals("PENDING")) {
      bad("Trạng thái không hợp lệ");
    }

    if (
      role.equals("PT") &&
      status.equals("ACTIVE") &&
      !Boolean.TRUE.equals(rows.get(0).get("email_verified"))
    ) {
      bad("PT phải xác thực email trước khi được duyệt");
    }

    if (role.equals("PT") && !specialty.isEmpty() && !List.of("GYM", "YOGA", "BOXING").contains(specialty)) {
      bad("Chuyên môn không hợp lệ");
    }

    int n;
    try {
      n = db.update(
        "UPDATE users SET name=?,email=?,phone=?,specialty=?,status=? WHERE id=?",
        name,
        email,
        phone,
        role.equals("PT") ? (specialty.isEmpty() ? "GYM" : specialty) : "",
        status,
        id
      );
    } catch (DuplicateKeyException e) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại");
    }

    if (!status.equals("ACTIVE")) {
      db.update("DELETE FROM sessions WHERE user_id=?", id);
    }
    return Map.of("updated", n);
  }

  @DeleteMapping("/admin/users/{id}")
  public Map<String, Object> deleteUser(
    @PathVariable long id,
    HttpServletRequest req
  ) {
    security.admin(req);
    security.writeCheck(req);
    int n = db.update("DELETE FROM users WHERE id=? AND role<>'ADMIN'", id);
    if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return Map.of("deleted", n);
  }
}
