package com.optigym.account;

import com.optigym.shared.security.SessionSecurity;
import com.optigym.shared.web.Inputs;
import static com.optigym.shared.web.RequestValues.bad;
import static com.optigym.shared.web.RequestValues.str;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AccountController {

  private final JdbcTemplate db;
  private final SessionSecurity security;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

  public AccountController(JdbcTemplate db, SessionSecurity security) {
    this.db = db;
    this.security = security;
  }

  @GetMapping("/account/profile")
  public Map<String, Object> getProfile(HttpServletRequest req) {
    return security.me(req);
  }

  @Transactional
  @PatchMapping("/account/profile")
  public Map<String, Object> updateProfile(
    @RequestBody Map<String, Object> body,
    HttpServletRequest req
  ) {
    var user = security.me(req);
    security.writeCheck(req);
    String name = Inputs.text(body, "name", 2, 120);
    String phone = Inputs.text(body, "phone", 0, 30);
    if (!phone.isEmpty() && !phone.matches("[+0-9 ()-]{6,30}")) {
      throw Inputs.bad("Số điện thoại không hợp lệ");
    }
    db.update(
      "UPDATE users SET name=?, phone=? WHERE id=?",
      name,
      phone,
      user.get("id")
    );
    return security.me(req);
  }

  @Transactional
  @PostMapping("/account/change-password")
  public Map<String, Object> changePassword(
    @RequestBody Map<String, Object> body,
    HttpServletRequest req
  ) {
    var user = security.me(req);
    security.writeCheck(req);
    String currentPassword = Objects.toString(body.getOrDefault("current_password", ""), "");
    String newPassword = Objects.toString(body.getOrDefault("new_password", ""), "");

    if (newPassword.length() < 6 || newPassword.length() > 128) {
      bad("Mật khẩu mới phải có từ 6 đến 128 ký tự");
    }

    String hash = db.queryForObject(
      "SELECT password_hash FROM users WHERE id=?",
      String.class,
      user.get("id")
    );

    if (hash == null || !passwords.matches(currentPassword, hash)) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Mật khẩu hiện tại không chính xác"
      );
    }

    db.update(
      "UPDATE users SET password_hash=? WHERE id=?",
      passwords.encode(newPassword),
      user.get("id")
    );

    return Map.of("ok", true, "message", "Đổi mật khẩu thành công.");
  }
}
