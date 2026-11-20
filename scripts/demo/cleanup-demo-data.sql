-- ==============================================================================
-- cleanup-demo-data.sql: Xoa sach toan bo du lieu gia demo duoc tao boi
-- seed-demo-data.sql ma KHONG xoa tai khoan admin/pt/member goc hay du lieu that.
-- ==============================================================================

BEGIN;

-- 1. Xoa cac tai khoan demo (@demo.seed.optigym) -> Cascade xoa subscriptions, orders,
--    checkins, pt_assignments, pt_assignment_requests, coach_sessions, body_metrics,
--    workout_programs, workout_logs, class_bookings, pt_documents, pt_notifications lien quan.
DELETE FROM users WHERE email LIKE '%@demo.seed.optigym';

-- 2. Xoa thiet bi & ma uu dai demo
DELETE FROM equipment WHERE code LIKE 'DEMO-EQ-%';
DELETE FROM promotions WHERE code LIKE 'DEMO%';
DELETE FROM orders WHERE reference LIKE 'DEMOORD-%';

-- 3. Xoa cac lop nhom demo (cascade xoa class_bookings)
DELETE FROM gym_classes
WHERE name IN (
  'Strength Foundations',
  'HIIT Đốt Mỡ Buổi Tối',
  'Core & Functional Stability',
  'Yoga Flow & Mobility',
  'Hatha Yoga Phục Hồi',
  'Boxing Conditioning Cơ Bản'
);

-- 4. Xoa du lieu demo gan cho PT id=3 & Member id=7 goc (giu nguyen ban ghi goc truoc do)
DELETE FROM workout_logs
WHERE feedback IN (
  'Hoàn thành đủ 4 hiệp Bench Press 45kg, form vai ổn định.',
  'Squat 60kg đạt độ sâu chuẩn, kiểm soát nhịp thở tốt.',
  'Tăng nhẹ tạ Lat Pulldown lên 47.5kg, độ mỏi cơ tốt.',
  'Chạy bộ nhịp tim đều 135 bpm, giãn cơ 10 phút.'
);

DELETE FROM workout_programs
WHERE name IN (
  'Phác đồ Tăng cơ Thân trên (Tuần 1-4)',
  'Phác đồ Sức mạnh Thân dưới & Core',
  'Cardio Phục hồi & Core Cuối tuần',
  'Định hình Thân trên & Siết eo',
  'Strength Foundation 5x5'
);

DELETE FROM pt_templates
WHERE name IN (
  'Hypertrophy Thân trên (Push/Pull)',
  'Sức mạnh Thân dưới & Core',
  'Full Body Đốt mỡ & Conditioning'
);

DELETE FROM coach_sessions
WHERE note IN (
  'Buổi 1:1 Đẩy ngực & Vai - Kiểm tra kỹ thuật Bench Press',
  'Học viên đề xuất tập Chân & Core buổi chiều',
  'Hoàn thành bài Upper Body Hypertrophy đạt ngưỡng RPE 8',
  'Đánh giá Form Squat & Deadlift nền tảng'
);

DELETE FROM body_metrics
WHERE note LIKE 'Đo định kỳ%';

DELETE FROM checkins
WHERE member_id = 7
  AND id > 1
  AND checked_in_at < date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh';

DELETE FROM member_weekly_targets
WHERE member_id = 7
  AND week_start = (date_trunc('week', CURRENT_DATE) - interval '14 days')::date;

DELETE FROM pt_notifications
WHERE title IN (
  'Yêu cầu đặt lịch 1:1 mới',
  'Cảnh báo học viên sắp hết buổi',
  'Học viên đã hết số buổi PT',
  'Lớp Strength Foundations hôm nay'
);

-- 5. Xoa goi tap demo bo sung (chi xoa goi khong con subscription/order nao tham chieu)
DELETE FROM packages
WHERE name IN ('Gym 3 tháng', 'Gym 6 tháng', 'Yoga 3 tháng', 'Boxing 3 tháng', 'VIP All-in 12 tháng')
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.package_id = packages.id)
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.package_id = packages.id);

COMMIT;
