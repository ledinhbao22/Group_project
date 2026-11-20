package com.optigym.passwordreset;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordResetService {

  private static final String SENT =
    "Nếu email đã đăng ký và xác thực, mã đặt lại mật khẩu sẽ được gửi. Kiểm tra cả thư rác.";
  private final JdbcTemplate db;
  private final JavaMailSender sender;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
  private final SecureRandom random = new SecureRandom();

  @Value("${app.mail.from}")
  private String from;

  public PasswordResetService(JdbcTemplate db, JavaMailSender sender) {
    this.db = db;
    this.sender = sender;
  }

  @Transactional
  public Map<String, String> request(String address) {
    String email = address.trim().toLowerCase(Locale.ROOT);
    if (
      email.isBlank() || email.length() > 255
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Email không hợp lệ."
    );
    List<Map<String, Object>> users = db.queryForList(
      "SELECT id FROM users WHERE email=? AND email_verified=true FOR UPDATE",
      email
    );
    if (users.isEmpty()) return Map.of("message", SENT);
    long id = ((Number) users.get(0).get("id")).longValue();
    List<Map<String, Object>> previous = db.queryForList(
      "SELECT sent_at>now()-interval '60 seconds' AS cooldown,window_start>now()-interval '1 hour' AS same_window,sends_window FROM password_resets WHERE user_id=?",
      id
    );
    if (!previous.isEmpty()) {
      Map<String, Object> row = previous.get(0);
      if (
        Boolean.TRUE.equals(row.get("cooldown")) ||
        (Boolean.TRUE.equals(row.get("same_window")) &&
          ((Number) row.get("sends_window")).intValue() >= 5)
      ) return Map.of("message", SENT);
    }
    String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
    db.update(
      "INSERT INTO password_resets(user_id,code_hash,expires_at,sent_at,attempts,window_start,sends_window) VALUES(?,?,now()+interval '10 minutes',now(),0,now(),1) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,sent_at=excluded.sent_at,attempts=0,grant_hash=NULL,grant_expires=NULL,window_start=CASE WHEN password_resets.window_start>now()-interval '1 hour' THEN password_resets.window_start ELSE now() END,sends_window=CASE WHEN password_resets.window_start>now()-interval '1 hour' THEN password_resets.sends_window+1 ELSE 1 END",
      id,
      encoder.encode(code)
    );
    SimpleMailMessage mail = new SimpleMailMessage();
    mail.setFrom(from);
    mail.setTo(email);
    mail.setSubject("OptiGym - Ma dat lai mat khau");
    mail.setText(
      "Ma dat lai mat khau OptiGym cua ban: " +
        code +
        "\nMa co hieu luc 10 phut. Neu ban khong yeu cau, hay bo qua email nay."
    );
    try {
      sender.send(mail);
      System.out.println("[OptiGym Mail] Da gui email dat lai mat khau thanh cong toi: " + email);
    } catch (Exception e) {
      System.err.println("[OptiGym Mail WARNING] Không gửi được qua SMTP: " + e.getMessage());
      System.out.println("==================================================================");
      System.out.println("  [SERVER LOG DEBUG ONLY] OTP dat lai mat khau cho " + email + ": " + code);
      System.out.println("==================================================================");
    }
    return Map.of("message", SENT);
  }

  @Transactional
  public ResponseEntity<Map<String, String>> verifyCode(String address, String code) {
    if (!code.matches("[0-9]{6}")) return ResponseEntity.badRequest().body(
      Map.of("message", "Mã phải gồm 6 chữ số.")
    );
    String email = address.trim().toLowerCase(Locale.ROOT);
    List<Map<String, Object>> users = db.queryForList(
      "SELECT id FROM users WHERE email=? AND email_verified=true FOR UPDATE",
      email
    );
    if (users.isEmpty()) return ResponseEntity.badRequest().body(
      Map.of("message", "Mã không hợp lệ hoặc đã hết hạn.")
    );
    long id = ((Number) users.get(0).get("id")).longValue();
    List<Map<String, Object>> rows = db.queryForList(
      "SELECT code_hash,expires_at>now() AS valid,attempts FROM password_resets WHERE user_id=?",
      id
    );
    if (
      rows.isEmpty() || !Boolean.TRUE.equals(rows.get(0).get("valid"))
    ) return ResponseEntity.badRequest().body(
      Map.of("message", "Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.")
    );
    Map<String, Object> row = rows.get(0);
    if (
      ((Number) row.get("attempts")).intValue() >= 5
    ) return ResponseEntity.status(429).body(
      Map.of("message", "Đã nhập sai quá 5 lần. Hãy yêu cầu mã mới.")
    );
    if (!encoder.matches(code, (String) row.get("code_hash"))) {
      db.update(
        "UPDATE password_resets SET attempts=attempts+1 WHERE user_id=?",
        id
      );
      return ResponseEntity.badRequest().body(
        Map.of("message", "Mã không đúng.")
      );
    }
    byte[] bytes=new byte[32];random.nextBytes(bytes);String token=java.util.HexFormat.of().formatHex(bytes);
    db.update("UPDATE password_resets SET code_hash='',expires_at=now(),attempts=5,grant_hash=?,grant_expires=now()+interval '10 minutes' WHERE user_id=?",com.optigym.shared.security.SessionSecurity.hash(token),id);
    return ResponseEntity.ok(Map.of("message","Mã đã được xác thực.","resetToken",token));
  }
  @Transactional
  public ResponseEntity<Map<String,String>> confirm(String address,String token,String password){
    if(password.length()<6||password.length()>128)return ResponseEntity.badRequest().body(Map.of("message","Mật khẩu mới phải dài 6–128 ký tự."));
    if(!token.matches("[a-f0-9]{64}"))return ResponseEntity.badRequest().body(Map.of("message","Hãy xác thực mã trước khi đặt mật khẩu."));
    var rows=db.queryForList("UPDATE password_resets p SET grant_hash=NULL,grant_expires=NULL FROM users u WHERE p.user_id=u.id AND u.email=? AND p.grant_hash=? AND p.grant_expires>now() RETURNING p.user_id",address.trim().toLowerCase(Locale.ROOT),com.optigym.shared.security.SessionSecurity.hash(token));
    if(rows.isEmpty())return ResponseEntity.badRequest().body(Map.of("message","Phiên đặt mật khẩu đã hết hạn hoặc đã sử dụng."));
    Object id=rows.get(0).get("user_id");db.update("UPDATE users SET password_hash=? WHERE id=?",encoder.encode(password),id);db.update("DELETE FROM sessions WHERE user_id=?",id);
    return ResponseEntity.ok(Map.of("message","Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới."));
  }
}
