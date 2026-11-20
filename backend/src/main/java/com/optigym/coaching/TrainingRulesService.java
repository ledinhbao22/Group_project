package com.optigym.coaching;

import com.optigym.shared.web.Inputs;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.stereotype.Service;

@Service
public class TrainingRulesService {

  public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  public static LocalDate weekStartMonday(LocalDate date) {
    return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
  }

  /**
   * Tính chuỗi Streak tuần dựa trên các ngày check-in duy nhất (tối đa 1 buổi/ngày).
   * - Tuần đang diễn ra chưa kết thúc thì giữ nguyên streak các tuần hoàn thành liên tiếp trước đó;
   *   nếu tuần hiện tại đã đạt đủ mục tiêu thì cộng +1 ngay.
   * - Tôn trọng snapshot mục tiêu từng tuần trong quá khứ (historicalTargetsByWeekStart)
   *   để khi đổi mục tiêu tuần mới không làm gãy streak các tuần đã chốt trước đó.
   */
  public Map<String, Object> calculateWeeklyStreak(
    List<LocalDate> rawCheckinDates,
    int currentWeeklyTarget,
    Map<LocalDate, Integer> historicalTargetsByWeekStart,
    LocalDate today
  ) {
    int safeTarget = Math.max(1, Math.min(7, currentWeeklyTarget));
    LocalDate safeToday = today != null ? today : LocalDate.now(VN_ZONE);
    LocalDate currentWeekStart = weekStartMonday(safeToday);

    Set<LocalDate> distinctDays = new TreeSet<>();
    if (rawCheckinDates != null) {
      for (LocalDate d : rawCheckinDates) {
        if (d != null && !d.isAfter(safeToday)) {
          distinctDays.add(d);
        }
      }
    }

    Map<LocalDate, Integer> daysPerWeek = new HashMap<>();
    for (LocalDate d : distinctDays) {
      LocalDate ws = weekStartMonday(d);
      daysPerWeek.merge(ws, 1, Integer::sum);
    }

    Map<LocalDate, Integer> snapshots = historicalTargetsByWeekStart != null
      ? historicalTargetsByWeekStart
      : Collections.emptyMap();

    int currentWeekDone = daysPerWeek.getOrDefault(currentWeekStart, 0);
    int currentWeekTarget = snapshots.getOrDefault(currentWeekStart, safeTarget);
    boolean currentWeekMet = currentWeekDone >= currentWeekTarget;

    // Tính currentStreakWeeks lùi từ tuần hiện tại về quá khứ
    int currentStreak = currentWeekMet ? 1 : 0;
    LocalDate cursor = currentWeekStart.minusWeeks(1);
    while (true) {
      int done = daysPerWeek.getOrDefault(cursor, 0);
      int target = snapshots.getOrDefault(cursor, safeTarget);
      if (done >= target) {
        currentStreak += 1;
        cursor = cursor.minusWeeks(1);
      } else {
        break;
      }
    }

    // Tính bestStreakWeeks trên toàn bộ chuỗi tuần từ tuần đầu tiên có dữ liệu tới hiện tại
    int bestStreak = currentStreak;
    if (!daysPerWeek.isEmpty()) {
      LocalDate minWeek = Collections.min(daysPerWeek.keySet());
      int running = 0;
      for (LocalDate w = minWeek; !w.isAfter(currentWeekStart); w = w.plusWeeks(1)) {
        int done = daysPerWeek.getOrDefault(w, 0);
        int target = snapshots.getOrDefault(w, safeTarget);
        if (done >= target) {
          running += 1;
          if (running > bestStreak) {
            bestStreak = running;
          }
        } else if (!w.equals(currentWeekStart)) {
          running = 0;
        }
      }
    }

    List<String> distinctDateStrings = new ArrayList<>(distinctDays.size());
    for (LocalDate d : distinctDays) {
      distinctDateStrings.add(d.toString());
    }

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("currentStreakWeeks", currentStreak);
    out.put("bestStreakWeeks", bestStreak);
    out.put("currentWeekDone", currentWeekDone);
    out.put("weeklyTarget", currentWeekTarget);
    out.put("currentWeekMet", currentWeekMet);
    out.put("totalDistinctDays", distinctDays.size());
    out.put("checkedInDates", distinctDateStrings);
    return out;
  }

  /**
   * Kiểm tra hủy lịch có nằm trong ngưỡng phạt < 60 phút trước giờ bắt đầu hay không.
   * Nếu buổi/lớp đã bắt đầu hoặc đã qua giờ thì ném lỗi 400.
   */
  public boolean isLateCancellation(Instant startsAt, Instant now) {
    if (startsAt == null) {
      throw Inputs.bad("Thời gian bắt đầu không hợp lệ");
    }
    Instant refNow = now != null ? now : Instant.now();
    if (!startsAt.isAfter(refNow)) {
      throw Inputs.bad("Buổi tập đã bắt đầu hoặc đã kết thúc, không thể hủy");
    }
    long minutesUntilStart = Duration.between(refNow, startsAt).toMinutes();
    return minutesUntilStart < 60;
  }

  /**
   * Kiểm tra 2 khoảng thời gian [startA, startA + durA) và [startB, startB + durB) có giao nhau không.
   */
  public static boolean overlaps(Instant startA, int durationMinutesA, Instant startB, int durationMinutesB) {
    if (startA == null || startB == null) return false;
    Instant endA = startA.plus(Duration.ofMinutes(Math.max(1, durationMinutesA)));
    Instant endB = startB.plus(Duration.ofMinutes(Math.max(1, durationMinutesB)));
    return startA.isBefore(endB) && startB.isBefore(endA);
  }

  public boolean hasTimeOverlap(Instant startA, int durationMinutesA, Instant startB, int durationMinutesB) {
    return overlaps(startA, durationMinutesA, startB, durationMinutesB);
  }
}
