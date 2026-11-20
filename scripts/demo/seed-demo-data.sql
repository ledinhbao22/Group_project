-- ==============================================================================
-- seed-demo-data.sql: Du lieu gia de demo cho ca 3 workspace (ADMIN, PT, MEMBER)
-- Co the xoa sach an toan bang scripts/demo/cleanup-demo-data.sql ma khong anh
-- huong toi tai khoan admin/pt/member goc va cac ban ghi co san truoc do.
-- Mat khau chung cua cac tai khoan demo moi tao: 123456
-- ==============================================================================

BEGIN;

-- 1. Tai khoan PT & Member demo (@demo.seed.optigym)
INSERT INTO users(name, email, password_hash, role, status, phone, specialty, email_verified, member_code, created_at)
VALUES
  ('Trần Mai Chi',   'pt.yoga@demo.seed.optigym',     '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'PT',     'ACTIVE',   '0912345601', 'YOGA',   true,  '',            now() - interval '45 days'),
  ('Hoàng Minh Khôi','pt.boxing@demo.seed.optigym',   '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'PT',     'PENDING',  '0912345602', 'BOXING', true,  '',            now() - interval '2 days'),
  ('Nguyễn Khánh Linh','linh.nguyen@demo.seed.optigym','$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'ACTIVE',   '0987000101', '',       true,  'OG-DEMO0101', now() - interval '35 days'),
  ('Phạm Minh Tuấn', 'tuan.pham@demo.seed.optigym',   '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'ACTIVE',   '0987000102', '',       true,  'OG-DEMO0102', now() - interval '28 days'),
  ('Lê Thảo Vy',     'vy.le@demo.seed.optigym',       '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'ACTIVE',   '0987000103', '',       true,  'OG-DEMO0103', now() - interval '20 days'),
  ('Vũ Đức Anh',     'anh.vu@demo.seed.optigym',      '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'ACTIVE',   '0987000104', '',       true,  'OG-DEMO0104', now() - interval '12 days'),
  ('Đặng Thu Hà',    'ha.dang@demo.seed.optigym',     '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'ACTIVE',   '0987000105', '',       true,  'OG-DEMO0105', now() - interval '50 days'),
  ('Hoàng Gia Huy',  'huy.hoang@demo.seed.optigym',   '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'DISABLED', '0987000106', '',       true,  'OG-DEMO0106', now() - interval '40 days'),
  ('Bùi Ngọc Lan',   'lan.bui@demo.seed.optigym',     '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'ACTIVE',   '0987000107', '',       true,  'OG-DEMO0107', now() - interval '4 days'),
  ('Nguyễn Hoàng Nam','nam.nguyen@demo.seed.optigym', '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'MEMBER', 'ACTIVE',   '0987000108', '',       true,  'OG-DEMO0108', now() - interval '6 days')
ON CONFLICT (email) DO NOTHING;

-- CV dinh kem cho PT cho duyet (Hoang Minh Khoi)
INSERT INTO pt_documents(user_id, filename, mime, content)
SELECT u.id, 'CV-Hoang-Minh-Khoi-Boxing.pdf', 'application/pdf', convert_to('%PDF-1.4 Demo CV Hoang Minh Khoi - HLV Boxing', 'UTF8')
FROM users u
WHERE u.email = 'pt.boxing@demo.seed.optigym'
  AND NOT EXISTS (SELECT 1 FROM pt_documents d WHERE d.user_id = u.id);

-- 2. Goi tap bo sung & Ma uu dai (Admin Packages & Promotions)
INSERT INTO packages(name, category, price, duration_days, description, active)
SELECT v.name, v.category, v.price, v.duration_days, v.description, v.active
FROM (VALUES
  ('Gym 3 tháng',         'GYM',    1500000,  90, 'Tiết kiệm 16% khi đăng ký trọn gói khu vực Gym & Cardio 90 ngày.', true),
  ('Gym 6 tháng',         'GYM',    2700000, 180, 'Gói dài hạn kèm 02 buổi đánh giá InBody & định hướng tập luyện.', true),
  ('Yoga 3 tháng',        'YOGA',   1950000,  90, 'Không giới hạn lớp Yoga Flow, Hatha & Mobility trong 90 ngày.', true),
  ('Boxing 3 tháng',      'BOXING', 2250000,  90, 'Tập Boxing & Conditioning không giới hạn cùng trang bị tiêu chuẩn.', true),
  ('VIP All-in 12 tháng', 'GYM',    7500000, 365, 'Toàn quyền sử dụng Gym, Yoga, Boxing và ưu tiên đặt lịch giờ vàng.', true)
) AS v(name, category, price, duration_days, description, active)
WHERE NOT EXISTS (SELECT 1 FROM packages p WHERE p.name = v.name);

INSERT INTO promotions(code, title, discount_type, discount_value, category, starts_at, ends_at, usage_limit, used_count, active)
VALUES
  ('DEMONEW15',   'Ưu đãi hội viên mới 15%',            'PERCENT', 15,     'ALL',    CURRENT_DATE - 10, CURRENT_DATE + 45, 200, 14, true),
  ('DEMOYOGA20',  'Tuần lễ Yoga giảm 20%',              'PERCENT', 20,     'YOGA',   CURRENT_DATE - 5,  CURRENT_DATE + 25, 80,  6,  true),
  ('DEMOBOX100K', 'Giảm thẳng 100.000đ gói Boxing',     'AMOUNT',  100000, 'BOXING', CURRENT_DATE - 7,  CURRENT_DATE + 30, 50,  4,  true),
  ('DEMOVIP10',   'Ưu đãi gia hạn cuối quý (Tạm khóa)', 'PERCENT', 10,     'GYM',    CURRENT_DATE - 40, CURRENT_DATE - 5,  100, 22, false)
ON CONFLICT (code) DO NOTHING;

-- 3. Thiet bi phong tap & Nhat ky bao tri (Admin Equipment)
INSERT INTO equipment(code, name, category, room_id, status, purchased_on, next_service, notes)
SELECT v.code, v.name, v.category, r.id, v.status, v.purchased_on, v.next_service, v.notes
FROM (VALUES
  ('DEMO-EQ-001', 'Máy chạy bộ Technogym Excite', 'Cardio',   'GYM',    'ACTIVE',      DATE '2025-03-10', CURRENT_DATE + 25, 'Vận hành ổn định, đã tra dầu băng tải.'),
  ('DEMO-EQ-002', 'Khung Squat Rack Rogue R-3',     'Sức mạnh', 'GYM',    'ACTIVE',      DATE '2025-01-18', CURRENT_DATE + 40, 'Kiểm tra chốt an toàn định kỳ.'),
  ('DEMO-EQ-003', 'Máy đạp đùi Leg Press 45°',      'Sức mạnh', 'GYM',    'ACTIVE',      DATE '2025-04-05', CURRENT_DATE + 5,  'Sắp đến hạn bảo dưỡng thanh trượt.'),
  ('DEMO-EQ-004', 'Máy kéo xô đôi Cable Crossover', 'Sức mạnh', 'GYM',    'MAINTENANCE', DATE '2024-11-20', CURRENT_DATE - 3,  'Đang thay dây cáp thép bên trái.'),
  ('DEMO-EQ-005', 'Xe đạp Spinning Matrix IC7',     'Cardio',   'GYM',    'BROKEN',      DATE '2024-09-12', CURRENT_DATE - 10, 'Hỏng cảm biến lực kháng từ, chờ linh kiện.'),
  ('DEMO-EQ-006', 'Bộ thảm & Block Yoga Manduka',   'Yoga',     'YOGA',   'ACTIVE',      DATE '2025-06-01', CURRENT_DATE + 30, 'Vệ sinh khử khuẩn hàng tuần.'),
  ('DEMO-EQ-007', 'Bao cát treo Fairtex 45 kg',     'Boxing',   'BOXING', 'ACTIVE',      DATE '2025-02-14', CURRENT_DATE + 12, 'Kiểm tra móc treo trần.'),
  ('DEMO-EQ-008', 'Đồng hồ bấm hiệp Boxing Timer',  'Boxing',   'BOXING', 'ACTIVE',      DATE '2025-05-08', CURRENT_DATE + 50, 'Hoạt động bình thường.')
) AS v(code, name, category, room_code, status, purchased_on, next_service, notes)
JOIN rooms r ON r.code = v.room_code
ON CONFLICT (code) DO NOTHING;

INSERT INTO equipment_events(equipment_id, actor_id, status, note, created_at)
SELECT e.id, 1, e.status, COALESCE(NULLIF(e.notes, ''), 'Cập nhật kiểm tra định kỳ'), now() - interval '2 days'
FROM equipment e
WHERE e.code LIKE 'DEMO-EQ-%'
  AND NOT EXISTS (SELECT 1 FROM equipment_events ev WHERE ev.equipment_id = e.id);

-- 4. Goi tap dang ky (Subscriptions) & Hoa don (Orders)
INSERT INTO subscriptions(member_id, package_id, starts_on, ends_on)
SELECT u.id, p.id, CURRENT_DATE - v.ago_days, CURRENT_DATE + v.left_days
FROM (VALUES
  ('linh.nguyen@demo.seed.optigym', 'Gym 3 tháng',         25,  65),
  ('tuan.pham@demo.seed.optigym',   'Gym 6 tháng',         40, 140),
  ('vy.le@demo.seed.optigym',       'Yoga 3 tháng',        18,  72),
  ('anh.vu@demo.seed.optigym',      'Boxing 3 tháng',      12,  78),
  ('ha.dang@demo.seed.optigym',     'Gym 1 tháng',         42, -12),
  ('nam.nguyen@demo.seed.optigym',  'Yoga 1 tháng',         5,  25)
) AS v(email, pkg_name, ago_days, left_days)
JOIN users u ON u.email = v.email
JOIN packages p ON p.name = v.pkg_name
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.member_id = u.id);

INSERT INTO orders(reference, member_id, package_id, package_name, package_price, package_days, promotion_id, promotion_code, discount_amount, payment_method, total, status, confirmed_by, paid_at, created_at)
SELECT
  v.ref,
  u.id,
  p.id,
  p.name,
  p.price,
  p.duration_days,
  pr.id,
  COALESCE(pr.code, ''),
  v.discount_amt,
  v.pay_method,
  GREATEST(0, p.price - v.discount_amt),
  v.status,
  CASE WHEN v.status = 'PAID' THEN 1 ELSE NULL END,
  CASE WHEN v.status = 'PAID' THEN now() - (v.days_ago || ' days')::interval ELSE NULL END,
  now() - (v.days_ago || ' days')::interval
FROM (VALUES
  ('DEMOORD-001', 'linh.nguyen@demo.seed.optigym', 'Gym 3 tháng',         'DEMONEW15',   225000, 'TRANSFER', 'PAID',      25),
  ('DEMOORD-002', 'tuan.pham@demo.seed.optigym',   'Gym 6 tháng',         'DEMONEW15',   405000, 'CARD',     'PAID',      40),
  ('DEMOORD-003', 'vy.le@demo.seed.optigym',       'Yoga 3 tháng',        'DEMOYOGA20',  390000, 'TRANSFER', 'PAID',      18),
  ('DEMOORD-004', 'anh.vu@demo.seed.optigym',      'Boxing 3 tháng',      'DEMOBOX100K', 100000, 'CASH',     'PAID',      12),
  ('DEMOORD-005', 'ha.dang@demo.seed.optigym',     'Gym 1 tháng',         NULL,               0, 'CASH',     'PAID',      42),
  ('DEMOORD-006', 'nam.nguyen@demo.seed.optigym',  'Yoga 1 tháng',        'DEMOYOGA20',  150000, 'TRANSFER', 'PAID',       5),
  ('DEMOORD-007', 'lan.bui@demo.seed.optigym',     'Gym 3 tháng',         'DEMONEW15',   225000, 'TRANSFER', 'SUBMITTED',  1),
  ('DEMOORD-008', 'linh.nguyen@demo.seed.optigym', 'Yoga 1 tháng',        NULL,               0, 'CASH',     'PENDING',    0)
) AS v(ref, email, pkg_name, promo_code, discount_amt, pay_method, status, days_ago)
JOIN users u ON u.email = v.email
JOIN packages p ON p.name = v.pkg_name
LEFT JOIN promotions pr ON pr.code = v.promo_code
ON CONFLICT (reference) DO NOTHING;

-- 5. Lop nhom (Gym Classes) & Dat cho (Class Bookings)
INSERT INTO gym_classes(name, category, pt_id, room_id, starts_at, duration_minutes, capacity, status)
SELECT v.name, v.category, pt.id, r.id, v.starts_at, v.duration, v.cap, v.status
FROM (VALUES
  ('Strength Foundations',         'GYM',    'baocaclodeptrai@gmail.com', 1, (CURRENT_DATE + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 60, 20, 'OPEN'),
  ('HIIT Đốt Mỡ Buổi Tối',         'GYM',    'baocaclodeptrai@gmail.com', 1, (CURRENT_DATE + interval '1 day 19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 45, 22, 'OPEN'),
  ('Core & Functional Stability',  'GYM',    'baocaclodeptrai@gmail.com', 1, (CURRENT_DATE - interval '1 day' + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 60, 18, 'COMPLETED'),
  ('Yoga Flow & Mobility',         'YOGA',   'pt.yoga@demo.seed.optigym', 2, (CURRENT_DATE + interval '1 day 8 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 60, 16, 'OPEN'),
  ('Hatha Yoga Phục Hồi',          'YOGA',   'pt.yoga@demo.seed.optigym', 2, (CURRENT_DATE + interval '2 days 17 hours 30 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh', 60, 16, 'OPEN'),
  ('Boxing Conditioning Cơ Bản',   'BOXING', 'baocaclodeptrai@gmail.com', 3, (CURRENT_DATE + interval '2 days 19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 60, 14, 'OPEN')
) AS v(name, category, pt_email, room_id, starts_at, duration, cap, status)
JOIN users pt ON pt.email = v.pt_email
JOIN rooms r ON r.id = v.room_id
WHERE NOT EXISTS (SELECT 1 FROM gym_classes gc WHERE gc.name = v.name);

INSERT INTO class_bookings(class_id, member_id, status)
SELECT gc.id, u.id, 'BOOKED'
FROM (VALUES
  ('Strength Foundations',        'linh.nguyen@demo.seed.optigym'),
  ('Strength Foundations',        'tuan.pham@demo.seed.optigym'),
  ('HIIT Đốt Mỡ Buổi Tối',        'tuan.pham@demo.seed.optigym'),
  ('Yoga Flow & Mobility',        'dinhbao220906@gmail.com'),
  ('Yoga Flow & Mobility',        'vy.le@demo.seed.optigym'),
  ('Yoga Flow & Mobility',        'nam.nguyen@demo.seed.optigym'),
  ('Boxing Conditioning Cơ Bản',  'anh.vu@demo.seed.optigym'),
  ('Core & Functional Stability', 'linh.nguyen@demo.seed.optigym')
) AS v(class_name, email)
JOIN gym_classes gc ON gc.name = v.class_name
JOIN users u ON u.email = v.email
ON CONFLICT (class_id, member_id) DO NOTHING;

-- 6. Check-in lich su (cho Streak Member #7, Attendance & Heatmap Admin)
-- Check-in lich su cho hoi vien that id=7 de tao chuoi streak 3 tuan lien tiep (chi chen khi chua co check-in nao truoc ngay hom nay)
INSERT INTO checkins(member_id, room_id, checked_in_at, checked_out_at)
SELECT 7, 1, ts_in, ts_in + interval '65 minutes'
FROM (VALUES
  ((date_trunc('week', CURRENT_DATE) - interval '14 days' + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('week', CURRENT_DATE) - interval '12 days' + interval '18 hours 30 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('week', CURRENT_DATE) - interval '10 days' + interval '17 hours 30 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('week', CURRENT_DATE) - interval '7 days'  + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('week', CURRENT_DATE) - interval '5 days'  + interval '19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('week', CURRENT_DATE) - interval '3 days'  + interval '18 hours 15 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('week', CURRENT_DATE) + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ((date_trunc('week', CURRENT_DATE) + interval '2 days 18 hours 30 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh')
) AS v(ts_in)
WHERE NOT EXISTS (
  SELECT 1 FROM checkins c
  WHERE c.member_id = 7 AND c.checked_in_at < date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
);

-- Giu target tuan truoc (=3) de streak tinh chuan lien tuc
INSERT INTO member_weekly_targets(member_id, week_start, target_sessions)
VALUES
  (7, (date_trunc('week', CURRENT_DATE) - interval '14 days')::date, 3),
  (7, (date_trunc('week', CURRENT_DATE) - interval '7 days')::date, 3)
ON CONFLICT (member_id, week_start) DO NOTHING;

-- Check-in cua cac hoi vien demo (gom 3 luot dang tap hom nay + nhieu khung gio trong 2 tuan de Heatmap & Peak Hours sinh dong)
INSERT INTO checkins(member_id, room_id, checked_in_at, checked_out_at)
SELECT u.id, v.room_id, v.ts_in, v.ts_out
FROM (VALUES
  ('linh.nguyen@demo.seed.optigym', 1, now() - interval '45 minutes', NULL),
  ('tuan.pham@demo.seed.optigym',   1, now() - interval '25 minutes', NULL),
  ('vy.le@demo.seed.optigym',       2, now() - interval '15 minutes', NULL),
  ('anh.vu@demo.seed.optigym',      3, (CURRENT_DATE + interval '7 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE + interval '8 hours 10 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('linh.nguyen@demo.seed.optigym', 1, (CURRENT_DATE - interval '1 day' + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '1 day' + interval '19 hours 15 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('tuan.pham@demo.seed.optigym',   1, (CURRENT_DATE - interval '1 day' + interval '19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '1 day' + interval '20 hours 10 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('vy.le@demo.seed.optigym',       2, (CURRENT_DATE - interval '2 days' + interval '17 hours 30 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '2 days' + interval '18 hours 35 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('anh.vu@demo.seed.optigym',      3, (CURRENT_DATE - interval '2 days' + interval '19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '2 days' + interval '20 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('nam.nguyen@demo.seed.optigym',  2, (CURRENT_DATE - interval '3 days' + interval '8 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '3 days' + interval '9 hours 5 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('linh.nguyen@demo.seed.optigym', 1, (CURRENT_DATE - interval '4 days' + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '4 days' + interval '19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('tuan.pham@demo.seed.optigym',   1, (CURRENT_DATE - interval '5 days' + interval '18 hours 30 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '5 days' + interval '19 hours 45 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ('anh.vu@demo.seed.optigym',      3, (CURRENT_DATE - interval '6 days' + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', (CURRENT_DATE - interval '6 days' + interval '19 hours 10 minutes') AT TIME ZONE 'Asia/Ho_Chi_Minh')
) AS v(email, room_id, ts_in, ts_out)
JOIN users u ON u.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM checkins c WHERE c.member_id = u.id);

-- 7. Phan cong PT & De xuat PT (PT Assignments & Requests)
INSERT INTO pt_assignments(pt_id, member_id, total_sessions, remaining_sessions, active, assigned_by, note)
SELECT pt.id, m.id, v.tot, v.rem, true, 1, v.note
FROM (VALUES
  ('baocaclodeptrai@gmail.com', 'linh.nguyen@demo.seed.optigym', 12, 10, 'Mục tiêu tăng cơ thân trên & cải thiện tư thế'),
  ('baocaclodeptrai@gmail.com', 'tuan.pham@demo.seed.optigym',   12,  6, 'Tăng sức mạnh Compound Squat/Bench/Deadlift'),
  ('baocaclodeptrai@gmail.com', 'vy.le@demo.seed.optigym',        8,  2, 'Sắp hết buổi, cần tư vấn gia hạn gói PT'),
  ('baocaclodeptrai@gmail.com', 'anh.vu@demo.seed.optigym',       8,  0, 'Đã hoàn thành hết số buổi gói 8 buổi'),
  ('pt.yoga@demo.seed.optigym', 'nam.nguyen@demo.seed.optigym',  10,  8, 'Cải thiện độ linh hoạt lưng dưới & vai')
) AS v(pt_email, m_email, tot, rem, note)
JOIN users pt ON pt.email = v.pt_email
JOIN users m ON m.email = v.m_email
ON CONFLICT (pt_id, member_id) DO NOTHING;

INSERT INTO pt_assignment_requests(pt_id, member_id, note, status, reviewed_by, reviewed_at)
SELECT pt.id, m.id, v.note, v.status, CASE WHEN v.status = 'APPROVED' THEN 1 ELSE NULL END, CASE WHEN v.status = 'APPROVED' THEN now() - interval '5 days' ELSE NULL END
FROM (VALUES
  ('baocaclodeptrai@gmail.com', 'lan.bui@demo.seed.optigym',     'Hội viên mới đăng ký muốn tập 1:1 tăng thể lực cơ bản', 'PENDING'),
  ('pt.yoga@demo.seed.optigym', 'vy.le@demo.seed.optigym',       'Học viên muốn kèm thêm 6 buổi Yoga phục hồi cột sống', 'PENDING'),
  ('baocaclodeptrai@gmail.com', 'linh.nguyen@demo.seed.optigym', 'Đề xuất nhận kèm gói 12 buổi định hình vóc dáng', 'APPROVED')
) AS v(pt_email, m_email, note, status)
JOIN users pt ON pt.email = v.pt_email
JOIN users m ON m.email = v.m_email
WHERE NOT EXISTS (
  SELECT 1 FROM pt_assignment_requests r WHERE r.pt_id = pt.id AND r.member_id = m.id
);

-- 8. Lich PT 1:1 (Coach Sessions - bao gom sap toi, cho xac nhan, da hoan thanh, bo lo)
INSERT INTO coach_sessions(pt_id, member_id, room_id, starts_at, duration_minutes, status, note)
SELECT pt.id, m.id, v.room_id, v.starts_at, 60, v.status, v.note
FROM (VALUES
  ('baocaclodeptrai@gmail.com', 'dinhbao220906@gmail.com',      1, (CURRENT_DATE + interval '17 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',              'CONFIRMED', 'Buổi 1:1 Đẩy ngực & Vai - Kiểm tra kỹ thuật Bench Press'),
  ('baocaclodeptrai@gmail.com', 'dinhbao220906@gmail.com',      1, (CURRENT_DATE + interval '2 days 17 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',       'REQUESTED', 'Học viên đề xuất tập Chân & Core buổi chiều'),
  ('baocaclodeptrai@gmail.com', 'dinhbao220906@gmail.com',      1, (CURRENT_DATE - interval '4 days' + interval '17 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'COMPLETED', 'Hoàn thành bài Upper Body Hypertrophy đạt ngưỡng RPE 8'),
  ('baocaclodeptrai@gmail.com', 'dinhbao220906@gmail.com',      1, (CURRENT_DATE - interval '8 days' + interval '17 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'COMPLETED', 'Đánh giá Form Squat & Deadlift nền tảng'),
  ('baocaclodeptrai@gmail.com', 'linh.nguyen@demo.seed.optigym',1, (CURRENT_DATE + interval '19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',              'CONFIRMED', 'Lịch 1:1 Siết cơ & Cardio cuối buổi'),
  ('baocaclodeptrai@gmail.com', 'tuan.pham@demo.seed.optigym',  1, (CURRENT_DATE + interval '1 day 18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',        'REQUESTED', 'Xin đổi giờ sang 18h00 để test 1RM Back Squat'),
  ('baocaclodeptrai@gmail.com', 'vy.le@demo.seed.optigym',      1, (CURRENT_DATE - interval '2 days' + interval '18 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'MISSED',    'Học viên bận đột xuất chưa kịp báo trước'),
  ('baocaclodeptrai@gmail.com', 'linh.nguyen@demo.seed.optigym',1, (CURRENT_DATE - interval '5 days' + interval '19 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'COMPLETED', 'Buổi tập Lưng - Vai & Đo InBody định kỳ'),
  ('pt.yoga@demo.seed.optigym', 'nam.nguyen@demo.seed.optigym', 2, (CURRENT_DATE + interval '1 day 9 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',       'CONFIRMED', 'Buổi 1:1 Yoga Giãn cơ & Mở khớp vai'),
  ('pt.yoga@demo.seed.optigym', 'nam.nguyen@demo.seed.optigym', 2, (CURRENT_DATE - interval '3 days' + interval '9 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'COMPLETED', 'Đánh giá độ linh hoạt cột sống tuần đầu')
) AS v(pt_email, m_email, room_id, starts_at, status, note)
JOIN users pt ON pt.email = v.pt_email
JOIN users m ON m.email = v.m_email
WHERE NOT EXISTS (
  SELECT 1 FROM coach_sessions cs WHERE cs.pt_id = pt.id AND cs.member_id = m.id AND cs.note = v.note
);

-- 9. Chi so InBody (Body Metrics) cho Member that id=7 va hoc vien demo
INSERT INTO body_metrics(member_id, recorded_by, weight_kg, body_fat_pct, muscle_mass_kg, inbody_score, note, recorded_at)
SELECT m.id, pt.id, v.w, v.bf, v.mm, v.sc, v.note, v.rec_at
FROM (VALUES
  ('dinhbao220906@gmail.com',       'baocaclodeptrai@gmail.com', 69.8, 19.6, 30.8, 78, 'Đo định kỳ đầu tháng: Nền tảng ổn định',              now() - interval '24 days'),
  ('dinhbao220906@gmail.com',       'baocaclodeptrai@gmail.com', 69.1, 18.4, 31.4, 81, 'Đo định kỳ giữa kỳ: Giảm mỡ tốt, cơ bắp tăng đều',      now() - interval '11 days'),
  ('dinhbao220906@gmail.com',       'baocaclodeptrai@gmail.com', 68.6, 17.3, 32.0, 84, 'Đo định kỳ gần nhất: Đạt mốc InBody 84',                now() - interval '2 days'),
  ('linh.nguyen@demo.seed.optigym', 'baocaclodeptrai@gmail.com', 55.2, 20.1, 23.8, 79, 'Đo định kỳ đầu kỳ',                                     now() - interval '20 days'),
  ('linh.nguyen@demo.seed.optigym', 'baocaclodeptrai@gmail.com', 54.4, 18.5, 24.5, 83, 'Đo định kỳ tháng 2: Tăng cơ rõ rệt',                    now() - interval '3 days'),
  ('tuan.pham@demo.seed.optigym',   'baocaclodeptrai@gmail.com', 76.5, 21.0, 34.2, 77, 'Đo định kỳ đầu vào gói Strength',                       now() - interval '15 days'),
  ('tuan.pham@demo.seed.optigym',   'baocaclodeptrai@gmail.com', 75.8, 19.4, 34.9, 80, 'Đo định kỳ tuần 3: Tăng khối lượng cơ',                 now() - interval '1 day')
) AS v(m_email, pt_email, w, bf, mm, sc, note, rec_at)
JOIN users m ON m.email = v.m_email
JOIN users pt ON pt.email = v.pt_email
WHERE NOT EXISTS (
  SELECT 1 FROM body_metrics bm WHERE bm.member_id = m.id AND bm.note = v.note
);

-- 10. Giao an mau cua PT (Templates) & Giao an da giao (Workout Programs)
INSERT INTO pt_templates(pt_id, name, warmup_minutes, main_minutes, cooldown_minutes, exercises_json, notes)
SELECT pt.id, v.name, 10, 40, 10, v.ex_json, v.notes
FROM users pt
CROSS JOIN (VALUES
  (
    'Hypertrophy Thân trên (Push/Pull)',
    '[{"id":1,"name":"Khởi động khớp & Mobility toàn thân","phase":"WARMUP","sets":1,"reps":"8 phút","weight":"Bodyweight","rest_seconds":30},{"id":2,"name":"Barbell Bench Press (Đẩy ngực thanh đòn)","phase":"MAIN","sets":4,"reps":"8-10","weight":"45 kg","rest_seconds":90},{"id":3,"name":"Lat Pulldown (Kéo xô rộng tay)","phase":"MAIN","sets":4,"reps":"10-12","weight":"45 kg","rest_seconds":75},{"id":4,"name":"Overhead Dumbbell Press (Đẩy vai tạ đơn)","phase":"MAIN","sets":3,"reps":"10","weight":"14 kg","rest_seconds":60},{"id":5,"name":"Giãn cơ tĩnh & Hạ nhịp tim","phase":"COOLDOWN","sets":1,"reps":"7 phút","weight":"Bodyweight","rest_seconds":30}]',
    'Tăng 2.5kg mức tạ nếu hoàn thành đủ số reps ở 2 buổi liên tiếp.'
  ),
  (
    'Sức mạnh Thân dưới & Core',
    '[{"id":1,"name":"Khởi động khớp & Mobility toàn thân","phase":"WARMUP","sets":1,"reps":"8 phút","weight":"Bodyweight","rest_seconds":30},{"id":2,"name":"Barbell Back Squat (Gánh tạ đòn)","phase":"MAIN","sets":4,"reps":"6-8","weight":"60 kg","rest_seconds":120},{"id":3,"name":"Romanian Deadlift (RDL đùi sau)","phase":"MAIN","sets":3,"reps":"10","weight":"50 kg","rest_seconds":90},{"id":4,"name":"Plank siết Core & Hít thở","phase":"MAIN","sets":3,"reps":"60 giây","weight":"Bodyweight","rest_seconds":45}]',
    'Giữ lưng trung lập khi Squat và Deadlift.'
  ),
  (
    'Full Body Đốt mỡ & Conditioning',
    '[{"id":1,"name":"Khởi động khớp & Mobility toàn thân","phase":"WARMUP","sets":1,"reps":"8 phút","weight":"Bodyweight","rest_seconds":30},{"id":2,"name":"Leg Press (Đạp đùi máy)","phase":"MAIN","sets":3,"reps":"12","weight":"90 kg","rest_seconds":60},{"id":3,"name":"Seated Cable Row (Kéo cáp lưng giữa)","phase":"MAIN","sets":3,"reps":"12","weight":"40 kg","rest_seconds":60},{"id":4,"name":"HIIT Máy chạy bộ / Đạp xe","phase":"MAIN","sets":1,"reps":"15 phút","weight":"Level 7","rest_seconds":60}]',
    'Nghỉ ngắn giữa các hiệp để duy trì nhịp tim vùng đốt mỡ.'
  )
) AS v(name, ex_json, notes)
WHERE pt.email = 'baocaclodeptrai@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM pt_templates t WHERE t.pt_id = pt.id AND t.name = v.name);

INSERT INTO pt_templates(pt_id, name, warmup_minutes, main_minutes, cooldown_minutes, exercises_json, notes)
SELECT pt.id, 'Yoga Flow Phục hồi Cột sống', 10, 40, 10,
  '[{"id":1,"name":"Khởi động khớp & Mobility toàn thân","phase":"WARMUP","sets":1,"reps":"8 phút","weight":"Thảm Yoga","rest_seconds":20},{"id":2,"name":"Chuỗi Sun Salutation & Mở khớp hông","phase":"MAIN","sets":3,"reps":"5 chu kỳ","weight":"Thảm Yoga","rest_seconds":45},{"id":3,"name":"Giãn cơ tĩnh & Hạ nhịp tim","phase":"COOLDOWN","sets":1,"reps":"10 phút","weight":"Thảm Yoga","rest_seconds":20}]',
  'Ưu tiên nhịp thở sâu và giữ thăng bằng.'
FROM users pt
WHERE pt.email = 'pt.yoga@demo.seed.optigym'
  AND NOT EXISTS (SELECT 1 FROM pt_templates t WHERE t.pt_id = pt.id AND t.name = 'Yoga Flow Phục hồi Cột sống');

INSERT INTO workout_programs(pt_id, member_id, source_type, name, exercises_json, notes)
SELECT pt.id, m.id, v.src, v.name, v.ex_json, v.notes
FROM (VALUES
  ('baocaclodeptrai@gmail.com', 'dinhbao220906@gmail.com',       'PT',   'Phác đồ Tăng cơ Thân trên (Tuần 1-4)', '[{"id":1,"name":"Barbell Bench Press (Đẩy ngực thanh đòn)","phase":"MAIN","sets":4,"reps":"8-10","weight":"45 kg","rest_seconds":90},{"id":2,"name":"Lat Pulldown (Kéo xô rộng tay)","phase":"MAIN","sets":4,"reps":"10-12","weight":"45 kg","rest_seconds":75},{"id":3,"name":"Overhead Dumbbell Press (Đẩy vai tạ đơn)","phase":"MAIN","sets":3,"reps":"10","weight":"14 kg","rest_seconds":60}]', 'Tập 2 buổi/tuần xen kẽ buổi Thân dưới.'),
  ('baocaclodeptrai@gmail.com', 'dinhbao220906@gmail.com',       'PT',   'Phác đồ Sức mạnh Thân dưới & Core',    '[{"id":1,"name":"Barbell Back Squat (Gánh tạ đòn)","phase":"MAIN","sets":4,"reps":"6-8","weight":"60 kg","rest_seconds":120},{"id":2,"name":"Romanian Deadlift (RDL đùi sau)","phase":"MAIN","sets":3,"reps":"10","weight":"50 kg","rest_seconds":90},{"id":3,"name":"Plank siết Core & Hít thở","phase":"MAIN","sets":3,"reps":"60 giây","weight":"Bodyweight","rest_seconds":45}]', 'Chú ý kiểm soát nhịp hạ 2-3 giây.'),
  ('baocaclodeptrai@gmail.com', 'dinhbao220906@gmail.com',       'SELF', 'Cardio Phục hồi & Core Cuối tuần',     '[{"id":1,"name":"HIIT Máy chạy bộ / Đạp xe","phase":"MAIN","sets":1,"reps":"15 phút","weight":"Level 6","rest_seconds":45},{"id":2,"name":"Plank siết Core & Hít thở","phase":"MAIN","sets":3,"reps":"60 giây","weight":"Bodyweight","rest_seconds":30}]', 'Lịch tự tập nhẹ nhàng ngày cuối tuần.'),
  ('baocaclodeptrai@gmail.com', 'linh.nguyen@demo.seed.optigym', 'PT',   'Định hình Thân trên & Siết eo',        '[{"id":1,"name":"Incline Dumbbell Press (Đẩy ngực dốc trên)","phase":"MAIN","sets":3,"reps":"12","weight":"12 kg","rest_seconds":60},{"id":2,"name":"Seated Cable Row (Kéo cáp lưng giữa)","phase":"MAIN","sets":3,"reps":"12","weight":"30 kg","rest_seconds":60},{"id":3,"name":"Plank siết Core & Hít thở","phase":"MAIN","sets":3,"reps":"60 giây","weight":"Bodyweight","rest_seconds":45}]', 'Giữ nhịp thở đều trong lúc siết Core.'),
  ('baocaclodeptrai@gmail.com', 'tuan.pham@demo.seed.optigym',   'PT',   'Strength Foundation 5x5',               '[{"id":1,"name":"Barbell Back Squat (Gánh tạ đòn)","phase":"MAIN","sets":5,"reps":"5","weight":"75 kg","rest_seconds":120},{"id":2,"name":"Barbell Bench Press (Đẩy ngực thanh đòn)","phase":"MAIN","sets":5,"reps":"5","weight":"60 kg","rest_seconds":120}]', 'Tập trung form chuẩn ở mức 80% 1RM.'),
  ('pt.yoga@demo.seed.optigym', 'nam.nguyen@demo.seed.optigym',  'PT',   'Yoga Phục hồi Lưng & Vai',             '[{"id":1,"name":"Chuỗi Sun Salutation & Mở khớp hông","phase":"MAIN","sets":3,"reps":"5 chu kỳ","weight":"Thảm Yoga","rest_seconds":45},{"id":2,"name":"Giãn cơ tĩnh & Hạ nhịp tim","phase":"COOLDOWN","sets":1,"reps":"10 phút","weight":"Thảm Yoga","rest_seconds":20}]', 'Thực hiện chậm rãi theo nhịp thở.')
) AS v(pt_email, m_email, src, name, ex_json, notes)
LEFT JOIN users pt ON pt.email = v.pt_email AND v.src = 'PT'
JOIN users m ON m.email = v.m_email
WHERE NOT EXISTS (SELECT 1 FROM workout_programs wp WHERE wp.member_id = m.id AND wp.name = v.name);

-- 11. Nhat ky buoi tap da hoan thanh (Workout Logs)
INSERT INTO workout_logs(member_id, program_id, logged_by, program_name, duration_minutes, exercises_json, feedback, completed_at)
SELECT m.id, wp.id, COALESCE(pt.id, m.id), wp.name, v.dur, wp.exercises_json, v.fb, v.comp_at
FROM (VALUES
  ('dinhbao220906@gmail.com',       'baocaclodeptrai@gmail.com', 'Phác đồ Tăng cơ Thân trên (Tuần 1-4)', 60, 'Hoàn thành đủ 4 hiệp Bench Press 45kg, form vai ổn định.', now() - interval '9 days'),
  ('dinhbao220906@gmail.com',       'baocaclodeptrai@gmail.com', 'Phác đồ Sức mạnh Thân dưới & Core',    55, 'Squat 60kg đạt độ sâu chuẩn, kiểm soát nhịp thở tốt.',     now() - interval '6 days'),
  ('dinhbao220906@gmail.com',       'baocaclodeptrai@gmail.com', 'Phác đồ Tăng cơ Thân trên (Tuần 1-4)', 60, 'Tăng nhẹ tạ Lat Pulldown lên 47.5kg, độ mỏi cơ tốt.',      now() - interval '3 days'),
  ('dinhbao220906@gmail.com',       NULL,                        'Cardio Phục hồi & Core Cuối tuần',     40, 'Chạy bộ nhịp tim đều 135 bpm, giãn cơ 10 phút.',           now() - interval '1 day'),
  ('linh.nguyen@demo.seed.optigym', 'baocaclodeptrai@gmail.com', 'Định hình Thân trên & Siết eo',        55, 'Tập tốt nhóm cơ lưng và vai, duy trì đều.',               now() - interval '4 days'),
  ('tuan.pham@demo.seed.optigym',   'baocaclodeptrai@gmail.com', 'Strength Foundation 5x5',               65, 'Đạt mục tiêu 5x5 Back Squat 75kg sạch form.',              now() - interval '2 days'),
  ('nam.nguyen@demo.seed.optigym',  'pt.yoga@demo.seed.optigym',   'Yoga Phục hồi Lưng & Vai',             50, 'Nhịp thở đều, độ mở khớp vai cải thiện rõ rệt.',           now() - interval '3 days')
) AS v(m_email, pt_email, prog_name, dur, fb, comp_at)
JOIN users m ON m.email = v.m_email
JOIN workout_programs wp ON wp.member_id = m.id AND wp.name = v.prog_name
LEFT JOIN users pt ON pt.email = v.pt_email
WHERE NOT EXISTS (SELECT 1 FROM workout_logs wl WHERE wl.member_id = m.id AND wl.feedback = v.fb);

-- 12. Thong bao cho PT (PT Notifications)
INSERT INTO pt_notifications(pt_id, title, body, is_read, created_at)
SELECT pt.id, v.title, v.body, v.is_read, v.ts
FROM users pt
CROSS JOIN (VALUES
  ('Yêu cầu đặt lịch 1:1 mới',        'Học viên Bảo Lê Đình vừa gửi đề xuất buổi tập Chân & Core vào 17:00 sau 2 ngày tới.', false, now() - interval '2 hours'),
  ('Cảnh báo học viên sắp hết buổi',   'Học viên Lê Thảo Vy chỉ còn 2/8 buổi PT; hãy nhắc gia hạn trước buổi tới.',         false, now() - interval '5 hours'),
  ('Học viên đã hết số buổi PT',       'Học viên Vũ Đức Anh đã sử dụng 8/8 buổi PT; cần cập nhật gói tiếp theo.',          true,  now() - interval '1 day'),
  ('Lớp Strength Foundations hôm nay', 'Lớp nhóm 18:00 tại Phòng Gym đã có học viên đặt chỗ, chuẩn bị giáo án khởi động.', true,  now() - interval '2 days')
) AS v(title, body, is_read, ts)
WHERE pt.email = 'baocaclodeptrai@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM pt_notifications n WHERE n.pt_id = pt.id AND n.title = v.title);

INSERT INTO pt_notifications(pt_id, title, body, is_read, created_at)
SELECT pt.id, 'Lịch tập Yoga 1:1 sắp tới', 'Buổi tập Yoga Giãn cơ & Mở khớp vai cùng Nguyễn Hoàng Nam diễn ra lúc 09:00 ngày mai.', false, now() - interval '1 hour'
FROM users pt
WHERE pt.email = 'pt.yoga@demo.seed.optigym'
  AND NOT EXISTS (SELECT 1 FROM pt_notifications n WHERE n.pt_id = pt.id AND n.title = 'Lịch tập Yoga 1:1 sắp tới');

COMMIT;
