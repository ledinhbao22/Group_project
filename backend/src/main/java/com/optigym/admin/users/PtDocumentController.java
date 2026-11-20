package com.optigym.admin.users;
import com.optigym.shared.security.SessionSecurity;
import com.optigym.shared.web.Inputs;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/admin/trainers")
public class PtDocumentController {
 private final JdbcTemplate db; private final SessionSecurity security;
 public PtDocumentController(JdbcTemplate db,SessionSecurity security){this.db=db;this.security=security;}
 @GetMapping("/{id}/cv") public ResponseEntity<byte[]> download(@PathVariable long id,HttpServletRequest req){
  security.admin(req);var rows=db.queryForList("SELECT filename,mime,content FROM pt_documents WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 1",id);if(rows.isEmpty())throw Inputs.missing();var row=rows.get(0);
  return ResponseEntity.ok().header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").header("Content-Disposition",ContentDisposition.attachment().filename((String)row.get("filename"),StandardCharsets.UTF_8).build().toString()).contentType(MediaType.parseMediaType((String)row.get("mime"))).body((byte[])row.get("content"));
 }
}
