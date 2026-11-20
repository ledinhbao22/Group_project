package com.optigym;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.optigym.passwordreset.PasswordResetService;
import com.optigym.shared.security.SessionSecurity;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
class PasswordResetFlowTest {
 JdbcTemplate db=mock(JdbcTemplate.class);PasswordResetService service=new PasswordResetService(db,mock(JavaMailSender.class));
 @Test void codeAloneCannotChangePassword(){var result=service.confirm("a@example.test","123456","123456");assertEquals(400,result.getStatusCode().value());verifyNoInteractions(db);}
 @Test void fiveCharacterPasswordRejectedBeforeConsumingGrant(){var result=service.confirm("a@example.test","a".repeat(64),"12345");assertEquals(400,result.getStatusCode().value());verifyNoInteractions(db);}
 @Test void successfulVerificationReturnsGrantWithoutChangingPassword(){when(db.queryForList(contains("SELECT id FROM users"),any(Object.class))).thenReturn(List.of(Map.of("id",1L)));when(db.queryForList(contains("SELECT code_hash"),any(Object.class))).thenReturn(List.of(Map.of("code_hash",new BCryptPasswordEncoder().encode("123456"),"valid",true,"attempts",0)));var result=service.verifyCode("a@example.test","123456");assertEquals(200,result.getStatusCode().value());String grant=result.getBody().get("resetToken");assertTrue(grant.matches("[a-f0-9]{64}"));verify(db).update(contains("grant_hash=?"),eq(SessionSecurity.hash(grant)),eq(1L));verify(db,never()).update(contains("UPDATE users"),any(Object[].class));}
 @Test void incorrectCodeIncrementsAttempts(){when(db.queryForList(contains("SELECT id FROM users"),any(Object.class))).thenReturn(List.of(Map.of("id",1L)));when(db.queryForList(contains("SELECT code_hash"),any(Object.class))).thenReturn(List.of(Map.of("code_hash",new BCryptPasswordEncoder().encode("111111"),"valid",true,"attempts",2)));assertEquals(400,service.verifyCode("a@example.test","222222").getStatusCode().value());verify(db).update(contains("attempts=attempts+1"),eq(1L));}
 @Test void exhaustedCodeCannotIssueGrant(){when(db.queryForList(contains("SELECT id FROM users"),any(Object.class))).thenReturn(List.of(Map.of("id",1L)));when(db.queryForList(contains("SELECT code_hash"),any(Object.class))).thenReturn(List.of(Map.of("code_hash","unused","valid",true,"attempts",5)));assertEquals(429,service.verifyCode("a@example.test","123456").getStatusCode().value());verify(db,never()).update(anyString(),any(Object[].class));}
 @Test void sixCharactersAcceptedAndGrantCannotBeReused(){when(db.queryForList(contains("RETURNING p.user_id"),any(Object.class),any(Object.class))).thenReturn(List.of(Map.of("user_id",1L)),List.of());String token="a".repeat(64);assertEquals(200,service.confirm("a@example.test",token,"123456").getStatusCode().value());assertEquals(400,service.confirm("a@example.test",token,"123456").getStatusCode().value());verify(db,times(1)).update(contains("UPDATE users"),any(),eq(1L));verify(db).update("DELETE FROM sessions WHERE user_id=?",1L);}
}
