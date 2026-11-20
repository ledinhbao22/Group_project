package com.optigym.auth;

import static com.optigym.shared.web.RequestValues.bad;
import static com.optigym.shared.web.RequestValues.str;

import com.optigym.shared.security.SessionSecurity;
import com.optigym.verification.EmailVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AuthController {

  private final JdbcTemplate db;
  private final EmailVerificationService verification;
  private final SessionSecurity security;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

  public AuthController(
    JdbcTemplate db,
    EmailVerificationService verification,
    SessionSecurity security
  ) {
    this.db = db;
    this.verification = verification;
    this.security = security;
  }

  @Transactional
  @PostMapping("/auth/register")
  public Map<String, Object> register(
    @RequestBody Map<String, Object> b,
    HttpServletRequest req
  ) {
    security.writeCheck(req);
    String name = str(b, "name"),
      email = str(b, "email").toLowerCase(Locale.ROOT),
      pass = Objects.toString(b.getOrDefault("password", ""), ""),
      role = str(b, "role").toUpperCase(Locale.ROOT),
      phone = str(b, "phone"),
      specialty = str(b, "specialty").toUpperCase(Locale.ROOT);
    if (
      name.length() < 2 ||
      name.length() > 120 ||
      !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") ||
      email.length() > 255 ||
      pass.length() < 6 ||
      pass.length() > 128 ||
      !List.of("MEMBER", "PT").contains(role)
    ) bad("Kiểm tra tên, email, mật khẩu (6–128 ký tự) và vai trò");
    if (
      phone.length() > 30 ||
      (!phone.isEmpty() && !phone.matches("[+0-9 ()-]{6,30}")) ||
      (role.equals("PT") &&
        !List.of("GYM", "YOGA", "BOXING").contains(specialty))
    ) bad("Thông tin liên hệ hoặc chuyên môn không hợp lệ");
    com.optigym.shared.web.UploadFiles.Upload cv = role.equals("PT")
      ? com.optigym.shared.web.UploadFiles.decode(str(b,"cv_name"),str(b,"cv_data"),false) : null;
    long id;
    try {
      id = db.queryForObject(
        "INSERT INTO users(name,email,password_hash,role,status,phone,specialty,email_verified) VALUES(?,?,?,?,?,?,?,false) RETURNING id",
        Long.class,
        name,
        email,
        passwords.encode(pass),
        role,
        role.equals("PT") ? "PENDING" : "ACTIVE",
        phone,
        role.equals("PT") ? specialty : ""
      );
    } catch (DuplicateKeyException e) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "Email đã được sử dụng"
      );
    }
    if (role.equals("MEMBER")) {
      String memberCode = String.format(Locale.ROOT, "OG-%08d", id);
      db.update("UPDATE users SET member_code=? WHERE id=?", memberCode, id);
    }
    if(cv!=null) db.update("INSERT INTO pt_documents(user_id,filename,mime,content) VALUES(?,?,?,?)",id,cv.name(),cv.mime(),cv.bytes());
    verification.issueNew(id, email);
    return Map.of(
      "message",
      "Đã gửi mã xác thực đến email " + email + ". Vui lòng kiểm tra hộp thư (kể cả thư rác) để hoàn tất đăng ký."
    );
  }

  @PostMapping("/auth/login")
  public Map<String, Object> login(
    @RequestBody Map<String, Object> b,
    HttpServletRequest req,
    HttpServletResponse res
  ) {
    security.writeCheck(req);
    String email = str(b, "email").toLowerCase(Locale.ROOT),
      pass = Objects.toString(b.getOrDefault("password", ""), "");
    List<Map<String, Object>> rows = db.queryForList(
      "SELECT id,name,email,role,status,phone,specialty,email_verified,password_hash,member_code FROM users WHERE email=?",
      email
    );
    if (
      rows.isEmpty() ||
      !passwords.matches(pass, (String) rows.get(0).get("password_hash"))
    ) throw new ResponseStatusException(
      HttpStatus.UNAUTHORIZED,
      "Email hoặc mật khẩu không đúng"
    );
    Map<String, Object> u = rows.get(0);
    if (
      !Boolean.TRUE.equals(u.get("email_verified"))
    ) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Email chưa xác thực. Hãy nhập mã được gửi qua email."
    );
    if (!"ACTIVE".equals(u.get("status"))) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Tài khoản đang chờ duyệt hoặc đã bị khóa"
    );
    String token = security.newToken();
    db.update(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      security.hash(token),
      u.get("id"),
      java.sql.Timestamp.from(Instant.now().plusSeconds(7 * 86400))
    );
    security.setCookie(res, token, 7 * 86400);
    return Map.of(
      "id",
      u.get("id"),
      "name",
      u.get("name"),
      "email",
      u.get("email"),
      "role",
      u.get("role"),
      "status",
      Objects.toString(u.get("status"), "ACTIVE"),
      "phone",
      Objects.toString(u.get("phone"), ""),
      "specialty",
      Objects.toString(u.get("specialty"), ""),
      "member_code",
      Objects.toString(u.get("member_code"), "")
    );
  }

  @PostMapping("/auth/logout")
  public Map<String, Object> logout(
    HttpServletRequest req,
    HttpServletResponse res
  ) {
    security.writeCheck(req);
    String token = security.cookie(req);
    if (!token.isBlank()) db.update(
      "DELETE FROM sessions WHERE token_hash=?",
      security.hash(token)
    );
    security.setCookie(res, "", 0);
    return Map.of("ok", true);
  }

  @GetMapping("/auth/me")
  public Map<String, Object> current(HttpServletRequest req) {
    return security.me(req);
  }
}
