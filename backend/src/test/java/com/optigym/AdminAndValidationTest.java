package com.optigym;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.optigym.admin.dashboard.AdminDashboardController;
import com.optigym.admin.users.AdminUserController;
import com.optigym.auth.AuthController;
import com.optigym.operations.OperationsController;
import com.optigym.shared.security.SessionSecurity;
import com.optigym.verification.EmailVerificationService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {
  AuthController.class,
  AdminUserController.class,
  AdminDashboardController.class,
  OperationsController.class
})
class AdminAndValidationTest {

  @MockBean
  JdbcTemplate db;

  @MockBean
  SessionSecurity security;

  @MockBean
  EmailVerificationService verificationService;

  @Autowired
  MockMvc mvc;

  @Test
  void registerRejectsInvalidPhoneFormat() throws Exception {
    mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"Nguyễn Minh","email":"minh@example.com","password":"password123","role":"MEMBER","phone":"invalid!@#"}
          """))
       .andExpect(status().isBadRequest());
    verifyNoInteractions(db);
  }

  @Test
  void registerMemberGeneratesMemberCodeFromReturnedId() throws Exception {
    when(db.queryForObject(contains("RETURNING id"), eq(Long.class), any(), any(), any(), any(), any(), any(), any()))
      .thenReturn(42L);
    mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"Nguyễn Minh","email":"minh@example.com","password":"password123","role":"MEMBER","phone":"0901234567"}
          """))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.message").exists());
    verify(db).update("UPDATE users SET member_code=? WHERE id=?", "OG-00000042", 42L);
  }

  @Test
  void createPromotionRejectsInvalidPercentOver100() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    mvc.perform(post("/api/admin/promotions")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"code":"SALE200","title":"Giảm quá 100%","discount_type":"PERCENT","discount_value":150}
          """))
       .andExpect(status().isBadRequest());
    verifyNoInteractions(db);
  }

  @Test
  void createPromotionRejectsEndDateBeforeStartDate() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    mvc.perform(post("/api/admin/promotions")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"code":"SALE20","title":"Giảm 20%","discount_type":"PERCENT","discount_value":20,"starts_at":"2026-12-10","ends_at":"2026-12-01"}
          """))
       .andExpect(status().isBadRequest());
    verifyNoInteractions(db);
  }

  @Test
  void ordersEndpointForbidsPtRole() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 201L, "role", "PT"));
    mvc.perform(get("/api/orders"))
       .andExpect(status().isForbidden());
    verifyNoInteractions(db);
  }

  @Test
  void classesEndpointReturnsListForAuthenticatedUser() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.queryForList(contains("FROM gym_classes"))).thenReturn(List.of());
    mvc.perform(get("/api/classes"))
       .andExpect(status().isOk())
       .andExpect(content().json("[]"));
  }

  @Test
  void createRoomRejectsDuplicateCode() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.queryForObject(contains("FROM rooms WHERE code"), eq(Long.class), eq("GYM"))).thenReturn(1L);
    mvc.perform(post("/api/admin/rooms")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"code":"gym","name":"Phòng Gym Mới","capacity":30}
          """))
       .andExpect(status().isBadRequest());
  }

  @Test
  void createEquipmentRejectsDuplicateCode() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.queryForObject(contains("FROM rooms WHERE id"), eq(Long.class), eq(1L))).thenReturn(1L);
    when(db.queryForObject(contains("FROM equipment WHERE code"), eq(Long.class), eq("GYM-TM-001"))).thenReturn(1L);
    mvc.perform(post("/api/admin/equipment")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"code":"gym-tm-001","name":"Máy chạy bộ","category":"Cardio","room_id":1,"status":"ACTIVE","notes":""}
          """))
       .andExpect(status().isBadRequest());
  }

  @Test
  void deleteEquipmentReturnsNotFoundWhenMissing() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.update("DELETE FROM equipment WHERE id=?", 999L)).thenReturn(0);
    mvc.perform(delete("/api/admin/equipment/999"))
       .andExpect(status().isNotFound());
  }

  @Test
  void deleteEquipmentSucceedsWhenAdmin() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.update("DELETE FROM equipment WHERE id=?", 5L)).thenReturn(1);
    mvc.perform(delete("/api/admin/equipment/5"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.ok").value(true));
  }

  @Test
  void manualAssignSubscriptionCreatesSubscriptionForActiveMember() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.queryForList(contains("FROM users WHERE id=? AND role='MEMBER'"), eq(101L)))
      .thenReturn(List.of(Map.of("id", 101L, "name", "Nguyễn Khánh Linh", "status", "ACTIVE")));
    when(db.queryForList(contains("FROM packages WHERE id=? AND active=true"), eq(1L)))
      .thenReturn(List.of(Map.of("id", 1L, "name", "Gym 1 tháng", "price", 600000L, "duration_days", 30)));
    when(db.queryForList(contains("FROM subscriptions WHERE member_id=?"), eq(101L)))
      .thenReturn(List.of());

    mvc.perform(post("/api/admin/subscriptions")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"member_id":101,"package_id":1}
          """))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.ok").value(true));

    verify(db).update(contains("INSERT INTO subscriptions(member_id,package_id,starts_on,ends_on)"), eq(101L), eq(1L), any(), any());
  }

  @Test
  void createAdminOrderAppliesPercentPromotionAndIncrementsUsage() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.queryForList(contains("FROM users WHERE id=? AND role='MEMBER'"), eq(101L)))
      .thenReturn(List.of(Map.of("id", 101L, "name", "Linh", "member_code", "OG-00000101")));
    when(db.queryForList(contains("FROM packages WHERE id=?"), eq(1L)))
      .thenReturn(List.of(Map.of("id", 1L, "name", "Gym 1 tháng", "category", "GYM", "price", 600000L, "duration_days", 30)));
    when(db.queryForList(contains("FROM promotions WHERE code=? FOR UPDATE"), eq("SAVE20")))
      .thenReturn(List.of(Map.of(
        "id", 5L,
        "code", "SAVE20",
        "active", true,
        "discount_type", "PERCENT",
        "discount_value", 20L,
        "category", "ALL",
        "usage_limit", 100,
        "used_count", 1,
        "starts_at", java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(2)),
        "ends_at", java.sql.Date.valueOf(java.time.LocalDate.now().plusDays(10))
      )));
    when(db.queryForMap(contains("INSERT INTO orders("), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
      .thenReturn(Map.of("id", 10L, "total", 480000L, "discount_amount", 120000L, "promotion_code", "SAVE20"));

    mvc.perform(post("/api/admin/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"member_id":101,"package_id":1,"promotion_code":"save20","payment_method":"TRANSFER","status":"PENDING"}
          """))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.total").value(480000));

    verify(db).update("UPDATE promotions SET used_count = used_count + 1 WHERE id=?", 5L);
  }

  @Test
  void createClassRejectsPtScheduleOverlap() throws Exception {
    when(security.admin(any())).thenReturn(Map.of("id", 1L, "role", "ADMIN"));
    when(db.queryForObject(contains("FROM users WHERE id=? AND role='PT'"), eq(Long.class), eq(201L))).thenReturn(1L);
    when(db.queryForObject(contains("FROM rooms WHERE id=? AND active=true"), eq(Long.class), eq(1L))).thenReturn(1L);

    java.time.Instant base = java.time.Instant.now().plus(java.time.Duration.ofHours(6));
    when(db.queryForList(contains("FROM gym_classes WHERE pt_id=?"), eq(201L), eq(201L)))
      .thenReturn(List.of(Map.of("starts_at", java.sql.Timestamp.from(base), "duration_minutes", 60)));

    mvc.perform(post("/api/admin/classes")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"HIIT Sáng","category":"GYM","pt_id":201,"room_id":1,"starts_at":"%s","duration_minutes":60,"capacity":20}
          """.formatted(base.plus(java.time.Duration.ofMinutes(30)).toString())))
       .andExpect(status().isBadRequest());
  }
}
