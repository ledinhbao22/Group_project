package com.optigym.shared.web;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class Errors {
  @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
  public ResponseEntity<Map<String,String>> conflict(org.springframework.dao.DataIntegrityViolationException e) {
    return ResponseEntity.status(409).body(Map.of("message", "Dữ liệu bị trùng hoặc đang được sử dụng trong lịch sử. Hãy kiểm tra mã; với dữ liệu đã phát sinh giao dịch, chọn ngừng hoạt động thay vì xóa."));
  }


  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> handle(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      Map.of(
        "message",
        e.getReason() == null ? "Yêu cầu không hợp lệ" : e.getReason()
      )
    );
  }
}
