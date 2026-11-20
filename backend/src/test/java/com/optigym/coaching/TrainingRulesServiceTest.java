package com.optigym.coaching;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class TrainingRulesServiceTest {

  private final TrainingRulesService rules = new TrainingRulesService();

  @Test
  void deduplicatesMultipleCheckinsOnSameDayAndPreservesOngoingWeekStreak() {
    // Week 1 (Mon 2026-11-09 .. Sun 2026-11-15): 3 distinct days (11-09 has 3 checkins!)
    // Week 2 (Mon 2026-11-16 .. Sun 2026-11-22, today = Wed 2026-11-18): 1 day so far (< 3 target)
    List<LocalDate> checkinDates = List.of(
      LocalDate.of(2026, 11, 9),
      LocalDate.of(2026, 11, 9),
      LocalDate.of(2026, 11, 9),
      LocalDate.of(2026, 11, 11),
      LocalDate.of(2026, 11, 13),
      LocalDate.of(2026, 11, 16)
    );

    Map<String, Object> result = rules.calculateWeeklyStreak(
      checkinDates,
      3,
      Map.of(),
      LocalDate.of(2026, 11, 18)
    );

    assertEquals(1, result.get("currentStreakWeeks"));
    assertEquals(1, result.get("bestStreakWeeks"));
    assertEquals(1, result.get("currentWeekDone"));
    assertEquals(3, result.get("weeklyTarget"));
  }

  @Test
  void incrementsStreakImmediatelyWhenOngoingWeekMeetsTargetAndRespectsHistoricalTargets() {
    // Week 1 (2026-11-02): 2 days, historical snapshot target = 2 -> completed!
    // Week 2 (2026-11-09): 2 days, historical snapshot target = 2 -> completed!
    // Week 3 (2026-11-16, current week): user raised target to 3, and already did 3 days!
    List<LocalDate> checkinDates = List.of(
      LocalDate.of(2026, 11, 2),
      LocalDate.of(2026, 11, 4),
      LocalDate.of(2026, 11, 9),
      LocalDate.of(2026, 11, 12),
      LocalDate.of(2026, 11, 16),
      LocalDate.of(2026, 11, 18),
      LocalDate.of(2026, 11, 20)
    );

    Map<LocalDate, Integer> historyTargets = Map.of(
      LocalDate.of(2026, 11, 2), 2,
      LocalDate.of(2026, 11, 9), 2,
      LocalDate.of(2026, 11, 16), 3
    );

    Map<String, Object> result = rules.calculateWeeklyStreak(
      checkinDates,
      3,
      historyTargets,
      LocalDate.of(2026, 11, 20)
    );

    assertEquals(3, result.get("currentStreakWeeks"));
    assertEquals(3, result.get("bestStreakWeeks"));
    assertEquals(3, result.get("currentWeekDone"));
  }

  @Test
  void classifiesOneHourCancellationThresholdAndRejectsStartedSession() {
    Instant now = Instant.parse("2026-11-20T04:00:00Z");

    // 45 minutes before start -> late cancellation (< 60m)
    assertTrue(rules.isLateCancellation(Instant.parse("2026-11-20T04:45:00Z"), now));

    // Exactly 60 minutes before start -> on-time cancellation
    assertFalse(rules.isLateCancellation(Instant.parse("2026-11-20T05:00:00Z"), now));

    // Already started -> 400 Bad Request
    assertThrows(
      ResponseStatusException.class,
      () -> rules.isLateCancellation(Instant.parse("2026-11-20T03:59:00Z"), now)
    );
  }

  @Test
  void detectsHalfOpenTimeOverlapCorrectly() {
    Instant s1 = Instant.parse("2026-11-20T11:00:00Z"); // 11:00 - 12:00
    assertTrue(rules.hasTimeOverlap(s1, 60, Instant.parse("2026-11-20T11:30:00Z"), 60));
    assertFalse(rules.hasTimeOverlap(s1, 60, Instant.parse("2026-11-20T12:00:00Z"), 60));
    assertFalse(rules.hasTimeOverlap(s1, 60, Instant.parse("2026-11-20T10:00:00Z"), 60));
  }
}
