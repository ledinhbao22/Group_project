package com.optigym.shared.web;
import java.util.*;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
public final class Inputs {
 public static String text(Map<String,Object> b,String key,int min,int max){String s=Objects.toString(b.get(key),"").trim();if(s.length()<min||s.length()>max)throw bad("Thông tin "+key+" không hợp lệ");return s;}
 public static long number(Map<String,Object> b,String key,long min,long max){try{long n=Long.parseLong(Objects.toString(b.get(key),""));if(n<min||n>max)throw new Exception();return n;}catch(Exception e){throw bad("Giá trị "+key+" không hợp lệ");}}
 public static LocalDate date(Map<String,Object>b,String key){String s=Objects.toString(b.get(key),"");try{return s.isBlank()?null:LocalDate.parse(s);}catch(Exception e){throw bad("Ngày không hợp lệ");}}
 public static String choice(Map<String,Object>b,String key,String...values){String s=text(b,key,1,40);if(!List.of(values).contains(s))throw bad("Lựa chọn "+key+" không hợp lệ");return s;}
 public static ResponseStatusException bad(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
 public static ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy dữ liệu");}
 public static long id(Map<String,Object> u){return ((Number)u.get("id")).longValue();}
}
