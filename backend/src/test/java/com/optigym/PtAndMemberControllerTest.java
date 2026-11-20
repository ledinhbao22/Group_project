package com.optigym;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.optigym.coaching.PtController;
import com.optigym.coaching.TrainingRulesService;
import com.optigym.member.MemberController;
import com.optigym.shared.security.SessionSecurity;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = { PtController.class, MemberController.class })
@Import(TrainingRulesService.class)
class PtAndMemberControllerTest {

  @MockBean
  JdbcTemplate db;

  @MockBean
  SessionSecurity security;

  @Autowired
  MockMvc mvc;

  @Test
  void ptCompletingSessionDecrementsRemainingSessions() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 201L, "role", "PT", "name", "Lê Quốc Bảo"));
    when(db.queryForList(contains("FROM coach_sessions WHERE id=?"), eq(10L)))
      .thenReturn(List.of(Map.of(
        "id", 10L,
        "pt_id", 201L,
        "member_id", 101L,
        "status", "CONFIRMED",
        "duration_minutes", 60,
        "note", "Upper Body"
      )));
    when(db.update(contains("UPDATE coach_sessions SET status=?"), eq("COMPLETED"), eq(10L))).thenReturn(1);

    mvc.perform(patch("/api/coaching/sessions/10")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"status":"COMPLETED"}
          """))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.status").value("COMPLETED"));

    verify(db).update(
      contains("UPDATE pt_assignments SET remaining_sessions = GREATEST(0, remaining_sessions - 1)"),
      eq(201L),
      eq(101L)
    );
  }

  @Test
  void ptRecordingInBodyMetricsForbidsMemberAndAllowsPt() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 101L, "role", "MEMBER"));
    mvc.perform(post("/api/pt/clients/101/metrics")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"weight_kg":64.5,"body_fat_pct":18.2,"muscle_mass_kg":28.4,"inbody_score":81,"note":"Tốt"}
          """))
       .andExpect(status().isForbidden());

    when(security.me(any())).thenReturn(Map.of("id", 201L, "role", "PT"));
    when(db.queryForObject(contains("FROM users WHERE id=? AND role='MEMBER'"), eq(Long.class), eq(101L)))
      .thenReturn(1L);
    mvc.perform(post("/api/pt/clients/101/metrics")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"weight_kg":64.5,"body_fat_pct":18.2,"muscle_mass_kg":28.4,"inbody_score":81,"note":"Tốt"}
          """))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.ok").value(true));
  }

  @Test
  void memberBookingRejectsWhenNoActiveSubscription() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 101L, "role", "MEMBER"));
    when(db.queryForObject(contains("FROM subscriptions WHERE member_id=?"), eq(Long.class), eq(101L), any()))
      .thenReturn(0L);

    mvc.perform(post("/api/member/classes/5/book"))
       .andExpect(status().isBadRequest());
  }

  @Test
  void memberBookingRejectsOverlappingTimeSlot() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 101L, "role", "MEMBER", "name", "Nguyễn Khánh Linh"));
    when(db.queryForObject(contains("FROM subscriptions WHERE member_id=?"), eq(Long.class), eq(101L), any()))
      .thenReturn(1L);
    when(db.queryForObject(contains("FROM users WHERE id=? AND role='PT'"), eq(Long.class), eq(201L)))
      .thenReturn(1L);
    when(db.queryForObject(contains("FROM rooms WHERE id=? AND active=true"), eq(Long.class), eq(1L)))
      .thenReturn(1L);

    Instant base = Instant.now().plus(Duration.ofHours(5));
    // Existing PT session at base (60 mins)
    when(db.queryForList(contains("FROM coach_sessions WHERE member_id=?"), eq(101L)))
      .thenReturn(List.of(Map.of(
        "id", 88L,
        "starts_at", Timestamp.from(base),
        "duration_minutes", 60
      )));
    when(db.queryForList(contains("FROM class_bookings cb JOIN gym_classes"), eq(101L)))
      .thenReturn(List.of());

    Instant overlappingStart = base.plus(Duration.ofMinutes(30));
    mvc.perform(post("/api/member/sessions")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"pt_id":201,"room_id":1,"starts_at":"%s","duration_minutes":60,"note":"Tập ngực"}
          """.formatted(overlappingStart.toString())))
       .andExpect(status().isBadRequest());
  }

  @Test
  void memberLateCancelUnderOneHourAppliesLateCancelledAndDeductsPtSession() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 101L, "role", "MEMBER", "name", "Nguyễn Khánh Linh"));
    Instant startsIn30m = Instant.now().plus(Duration.ofMinutes(30));
    when(db.queryForList(contains("FROM coach_sessions WHERE id=? AND member_id=?"), eq(77L), eq(101L)))
      .thenReturn(List.of(Map.of(
        "id", 77L,
        "pt_id", 201L,
        "member_id", 101L,
        "starts_at", Timestamp.from(startsIn30m),
        "status", "CONFIRMED"
      )));

    mvc.perform(patch("/api/member/sessions/77/cancel"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.status").value("LATE_CANCELLED"))
       .andExpect(jsonPath("$.latePenalty").value(true));

    verify(db).update(
      contains("UPDATE pt_assignments SET remaining_sessions = GREATEST(0, remaining_sessions - 1)"),
      eq(201L),
      eq(101L)
    );
  }

  @Test
  void memberLateCancelGroupClassKeepsSlotConsumedWithLateCancelledStatus() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 101L, "role", "MEMBER"));
    Instant startsIn25m = Instant.now().plus(Duration.ofMinutes(25));
    when(db.queryForList(contains("FROM class_bookings cb JOIN gym_classes"), eq(12L), eq(101L)))
      .thenReturn(List.of(Map.of(
        "booking_id", 301L,
        "class_id", 12L,
        "starts_at", Timestamp.from(startsIn25m),
        "status", "BOOKED"
      )));

    mvc.perform(patch("/api/member/classes/12/cancel"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.status").value("LATE_CANCELLED"))
       .andExpect(jsonPath("$.latePenalty").value(true));

    verify(db).update(
      contains("UPDATE class_bookings SET status=?, cancelled_at=now() WHERE id=?"),
      eq("LATE_CANCELLED"),
      eq(301L)
    );
  }

  @Test
  void ptDashboardReturnsCoachingAlertsForLowSessions() throws Exception {
    when(security.me(any())).thenReturn(Map.of("id", 201L, "role", "PT", "name", "Lê Quốc Bảo"));
    when(db.queryForObject(anyString(), eq(Long.class), eq(201L))).thenReturn(0L);
    when(db.queryForObject(anyString(), eq(Long.class), eq(201L), eq(201L))).thenReturn(1L);
    when(db.queryForList(contains("pa.remaining_sessions <= 2"), eq(201L)))
      .thenReturn(List.of(Map.of("member_id", 101L, "member_name", "Nguyễn Khánh Linh", "remaining_sessions", 1)));

    mvc.perform(get("/api/pt/dashboard"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.alerts[0].memberName").value("Nguyễn Khánh Linh"))
       .andExpect(jsonPath("$.alerts[0].category").value("Còn 1 buổi PT"))
       .andExpect(jsonPath("$.alerts[0].priority").value("MEDIUM"));
  }
}
