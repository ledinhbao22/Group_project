package com.optigym;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.optigym.account.AccountController;
import com.optigym.admin.users.AdminUserController;
import com.optigym.admin.users.PtDocumentController;
import com.optigym.auth.AuthController;
import com.optigym.shared.security.SessionSecurity;
import com.optigym.verification.EmailVerificationController;
import com.optigym.verification.EmailVerificationService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@WebMvcTest(controllers = {
  AuthController.class,
  AdminUserController.class,
  AccountController.class,
  PtDocumentController.class,
  EmailVerificationController.class
})
class AuthAndSecurityTest {

  @MockBean
  JdbcTemplate db;

  @MockBean
  SessionSecurity security;

  @MockBean
  EmailVerificationService verificationService;

  @Autowired
  MockMvc mvc;

  @Test
  void adminUsersRequiresAdminRole() throws Exception {
    when(security.admin(any())).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin"));
    mvc.perform(get("/api/admin/users"))
       .andExpect(status().isForbidden());
    verifyNoInteractions(db);
  }

  @Test
  void getProfileRequiresAuthentication() throws Exception {
    when(security.me(any())).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập"));
    mvc.perform(get("/api/account/profile"))
       .andExpect(status().isUnauthorized());
  }

  @Test
  void getProfileReturnsUserDataWhenAuthenticated() throws Exception {
    when(security.me(any())).thenReturn(Map.of(
      "id", 101L,
      "name", "Nguyễn Khánh Linh",
      "email", "linh@demo.optigym",
      "role", "MEMBER",
      "status", "ACTIVE"
    ));
    mvc.perform(get("/api/account/profile"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.email").value("linh@demo.optigym"))
       .andExpect(jsonPath("$.role").value("MEMBER"));
  }

  @Test
  void ptCvDownloadRequiresAdminRole() throws Exception {
    when(security.admin(any())).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
    mvc.perform(get("/api/admin/trainers/201/cv"))
       .andExpect(status().isForbidden());
    verifyNoInteractions(db);
  }
}
