package com.optigym.operations;
import com.optigym.shared.security.SessionSecurity;
import com.optigym.shared.web.Inputs;
import jakarta.servlet.http.HttpServletRequest;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class OperationsController {
 private final JdbcTemplate db; private final SessionSecurity security;
 public OperationsController(JdbcTemplate db,SessionSecurity security){this.db=db;this.security=security;}
 @GetMapping("/rooms") public List<Map<String,Object>> rooms(HttpServletRequest req){security.me(req);return db.queryForList("SELECT r.*, (SELECT count(*) FROM checkins c WHERE c.room_id=r.id AND c.checked_out_at IS NULL) AS occupancy FROM rooms r ORDER BY r.id");}
 @PostMapping("/admin/rooms") public Map<String,Object> room(@RequestBody Map<String,Object>b,HttpServletRequest req){
  security.admin(req);security.writeCheck(req);
  String code=Inputs.text(b,"code",2,24).toUpperCase(Locale.ROOT);
  Long dup=db.queryForObject("SELECT count(*) FROM rooms WHERE code=?",Long.class,code);
  if(dup!=null&&dup>0)throw Inputs.bad("Mã phòng đã tồn tại");
  return db.queryForMap("INSERT INTO rooms(code,name,capacity) VALUES(?,?,?) RETURNING *",code,Inputs.text(b,"name",2,100),Inputs.number(b,"capacity",1,10000));
 }
 @PutMapping("/admin/rooms/{id}") public Map<String,Object> roomEdit(@PathVariable long id,@RequestBody Map<String,Object>b,HttpServletRequest req){security.admin(req);security.writeCheck(req);if(db.update("UPDATE rooms SET name=?,capacity=?,active=? WHERE id=?",Inputs.text(b,"name",2,100),Inputs.number(b,"capacity",1,10000),Boolean.TRUE.equals(b.get("active")),id)==0)throw Inputs.missing();return Map.of("ok",true);}
 @GetMapping("/checkins") public List<Map<String,Object>> checkins(HttpServletRequest req){var u=security.me(req);String role=(String)u.get("role");if(!List.of("ADMIN","MEMBER").contains(role))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  // Return an explicit projection: no names, emails or telephone numbers in this API.
  String sql="SELECT c.id,u.member_code,r.name AS room,r.id AS room_id,c.checked_in_at,c.checked_out_at FROM checkins c JOIN users u ON u.id=c.member_id JOIN rooms r ON r.id=c.room_id";
  return role.equals("ADMIN")?db.queryForList(sql+" ORDER BY c.checked_in_at DESC LIMIT 1000"):db.queryForList(sql+" WHERE c.member_id=? ORDER BY c.checked_in_at DESC LIMIT 1000",u.get("id"));
 }
 @GetMapping("/admin/checkins") public List<Map<String,Object>> adminCheckins(HttpServletRequest req){
  security.admin(req);
  return db.queryForList(
   "SELECT c.id, to_char(c.checked_in_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY') AS date, " +
   "u.name, u.email, u.member_code, " +
   "to_char(c.checked_in_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH12:MI AM') AS \"inTime\", " +
   "COALESCE(to_char(c.checked_out_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH12:MI AM'), 'Đang tập') AS \"outTime\", " +
   "COALESCE(r.name, 'Phòng Gym') AS \"roomName\" " +
   "FROM checkins c JOIN users u ON c.member_id=u.id LEFT JOIN rooms r ON c.room_id=r.id " +
   "ORDER BY c.checked_in_at DESC LIMIT 200"
  );
 }
 @Transactional @PostMapping("/admin/checkins") public Map<String,Object> checkin(@RequestBody Map<String,Object>b,HttpServletRequest req){security.admin(req);security.writeCheck(req);long room=Inputs.number(b,"room_id",1,Long.MAX_VALUE);var rooms=db.queryForList("SELECT id,capacity FROM rooms WHERE id=? AND active=true FOR UPDATE",room);if(rooms.isEmpty())throw Inputs.bad("Phòng chưa mở hoạt động");
  var users=db.queryForList("SELECT id FROM users WHERE member_code=? AND role='MEMBER' AND status='ACTIVE' AND email_verified=true FOR UPDATE",Inputs.text(b,"member_code",3,24).toUpperCase(Locale.ROOT));if(users.isEmpty())throw Inputs.bad("Mã hội viên không hợp lệ hoặc tài khoản chưa hoạt động");Object member=users.get(0).get("id");
  if(db.queryForObject("SELECT count(*) FROM checkins WHERE member_id=? AND checked_out_at IS NULL",Long.class,member)>0)throw Inputs.bad("Hội viên đang có lượt tập chưa check-out");
  if(db.queryForObject("SELECT count(*) FROM checkins WHERE room_id=? AND checked_out_at IS NULL",Long.class,room)>=((Number)rooms.get(0).get("capacity")).longValue())throw Inputs.bad("Phòng đã đủ sức chứa");
  return db.queryForMap("INSERT INTO checkins(member_id,room_id) VALUES(?,?) RETURNING id,checked_in_at",member,room);
 }
 @PatchMapping("/admin/checkins/{id}/checkout") public Map<String,Object> checkout(@PathVariable long id,HttpServletRequest req){security.admin(req);security.writeCheck(req);if(db.update("UPDATE checkins SET checked_out_at=now() WHERE id=? AND checked_out_at IS NULL",id)==0)throw Inputs.bad("Lượt vào không còn mở");return Map.of("ok",true);}
 @GetMapping("/admin/heatmap") public Map<String,Object> heatmap(@RequestParam String from,@RequestParam String to,HttpServletRequest req){security.admin(req);LocalDate start,end;try{start=LocalDate.parse(from);end=LocalDate.parse(to);}catch(Exception e){throw Inputs.bad("Khoảng ngày không hợp lệ");}if(end.isBefore(start)||end.isAfter(start.plusDays(365)))throw Inputs.bad("Chọn khoảng tối đa 366 ngày");
  return Map.of("from",from,"to",to,"rooms",rooms(req),"cells",db.queryForList("SELECT c.room_id,extract(isodow from c.checked_in_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS weekday,extract(hour from c.checked_in_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hour,count(*) AS visits FROM checkins c WHERE (c.checked_in_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN ? AND ? GROUP BY c.room_id,weekday,hour",start,end),"totals",db.queryForList("SELECT r.id AS room_id,r.name,count(c.id) AS visits,round(avg(extract(epoch FROM (c.checked_out_at-c.checked_in_at))/60)) AS average_minutes FROM rooms r LEFT JOIN checkins c ON c.room_id=r.id AND (c.checked_in_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN ? AND ? GROUP BY r.id,r.name ORDER BY visits DESC",start,end));
 }
 @GetMapping("/admin/equipment") public List<Map<String,Object>> equipment(HttpServletRequest req){security.admin(req);return db.queryForList("SELECT e.*,r.name AS room FROM equipment e JOIN rooms r ON r.id=e.room_id ORDER BY e.code");}
 private Object[] equipmentValues(Map<String,Object>b,Long excludeId){
  long room=Inputs.number(b,"room_id",1,Long.MAX_VALUE);
  Long roomCount=db.queryForObject("SELECT count(*) FROM rooms WHERE id=?",Long.class,room);
  if(roomCount==null||roomCount==0)throw Inputs.bad("Phòng không tồn tại");
  String code=Inputs.text(b,"code",2,40).toUpperCase(Locale.ROOT);
  Long dup=excludeId==null
   ? db.queryForObject("SELECT count(*) FROM equipment WHERE code=?",Long.class,code)
   : db.queryForObject("SELECT count(*) FROM equipment WHERE code=? AND id<>?",Long.class,code,excludeId);
  if(dup!=null&&dup>0)throw Inputs.bad("Mã thiết bị đã tồn tại");
  return new Object[]{code,Inputs.text(b,"name",2,120),Inputs.text(b,"category",2,40),room,Inputs.choice(b,"status","ACTIVE","MAINTENANCE","BROKEN","RETIRED"),Inputs.date(b,"purchased_on"),Inputs.date(b,"next_service"),Inputs.text(b,"notes",0,2000)};
 }
 @Transactional @PostMapping("/admin/equipment") public Map<String,Object> addEquipment(@RequestBody Map<String,Object>b,HttpServletRequest req){var u=security.admin(req);security.writeCheck(req);Object[] v=equipmentValues(b,null);var e=db.queryForMap("INSERT INTO equipment(code,name,category,room_id,status,purchased_on,next_service,notes) VALUES(?,?,?,?,?,?,?,?) RETURNING *",v);db.update("INSERT INTO equipment_events(equipment_id,actor_id,status,note) VALUES(?,?,?,?)",e.get("id"),u.get("id"),v[4],"Thêm thiết bị");return e;}
 @Transactional @PutMapping("/admin/equipment/{id}") public Map<String,Object> editEquipment(@PathVariable long id,@RequestBody Map<String,Object>b,HttpServletRequest req){var u=security.admin(req);security.writeCheck(req);Object[] v=equipmentValues(b,id),args=Arrays.copyOf(v,9);args[8]=id;if(db.update("UPDATE equipment SET code=?,name=?,category=?,room_id=?,status=?,purchased_on=?,next_service=?,notes=?,updated_at=now() WHERE id=?",args)==0)throw Inputs.missing();db.update("INSERT INTO equipment_events(equipment_id,actor_id,status,note) VALUES(?,?,?,?)",id,u.get("id"),v[4],v[7]);return Map.of("ok",true);}
 @DeleteMapping("/admin/equipment/{id}") public Map<String,Object> deleteEquipment(@PathVariable long id,HttpServletRequest req){security.admin(req);security.writeCheck(req);if(db.update("DELETE FROM equipment WHERE id=?",id)==0)throw Inputs.missing();return Map.of("ok",true);}
 @GetMapping("/classes") public List<Map<String,Object>> classes(HttpServletRequest req){
  security.me(req);
  return db.queryForList("SELECT c.id,c.name,c.category,c.pt_id,u.name AS coach,c.room_id,r.name AS room,c.starts_at,c.duration_minutes,c.capacity,(SELECT count(*) FROM class_bookings cb WHERE cb.class_id=c.id AND cb.status IN ('BOOKED','LATE_CANCELLED'))::int AS filled,c.status FROM gym_classes c JOIN users u ON u.id=c.pt_id JOIN rooms r ON r.id=c.room_id ORDER BY c.starts_at DESC");
 }
 @GetMapping("/orders") public List<Map<String,Object>> orders(HttpServletRequest req){
  var u=security.me(req);String role=(String)u.get("role");
  if(!List.of("ADMIN","MEMBER").contains(role))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  String sql="SELECT o.*,u.name AS member_name,u.member_code FROM orders o JOIN users u ON u.id=o.member_id";
  return role.equals("ADMIN")?db.queryForList(sql+" ORDER BY o.created_at DESC LIMIT 500"):db.queryForList(sql+" WHERE o.member_id=? ORDER BY o.created_at DESC LIMIT 500",u.get("id"));
 }
 @GetMapping("/admin/equipment/{id}/history") public List<Map<String,Object>> history(@PathVariable long id,HttpServletRequest req){security.admin(req);return db.queryForList("SELECT e.id,e.status,e.note,e.created_at,u.name AS actor FROM equipment_events e JOIN users u ON u.id=e.actor_id WHERE e.equipment_id=? ORDER BY e.created_at DESC",id);}
}
