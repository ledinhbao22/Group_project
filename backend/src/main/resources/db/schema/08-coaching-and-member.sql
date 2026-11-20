-- ==============================================================================
-- 08-coaching-and-member.sql: Bang nghiep vu PT, Coaching & Member (Ver 2)
-- ==============================================================================

ALTER TABLE coach_sessions DROP CONSTRAINT IF EXISTS coach_sessions_status_check;
ALTER TABLE coach_sessions ADD CONSTRAINT coach_sessions_status_check
  CHECK (status IN ('REQUESTED','CONFIRMED','COMPLETED','MISSED','CANCELLED','REJECTED','LATE_CANCELLED'));

CREATE TABLE IF NOT EXISTS pt_assignments (
  id BIGSERIAL PRIMARY KEY,
  pt_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_sessions INTEGER NOT NULL DEFAULT 0 CHECK (total_sessions >= 0),
  remaining_sessions INTEGER NOT NULL DEFAULT 0 CHECK (remaining_sessions >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pt_id, member_id)
);

CREATE TABLE IF NOT EXISTS pt_assignment_requests (
  id BIGSERIAL PRIMARY KEY,
  pt_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0),
  body_fat_pct NUMERIC(5,2),
  muscle_mass_kg NUMERIC(5,2),
  inbody_score INTEGER,
  note TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercises (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  muscle_group VARCHAR(40) NOT NULL,
  default_phase VARCHAR(20) NOT NULL DEFAULT 'MAIN',
  default_sets INTEGER NOT NULL DEFAULT 3,
  default_reps VARCHAR(30) NOT NULL DEFAULT '10',
  default_weight VARCHAR(40) NOT NULL DEFAULT ''
);

INSERT INTO exercises(name, muscle_group, default_phase, default_sets, default_reps, default_weight)
SELECT * FROM (
  VALUES
    ('Khởi động khớp & Mobility toàn thân', 'Khởi động', 'WARMUP', 1, '8 phút', 'Bodyweight'),
    ('Barbell Bench Press (Đẩy ngực thanh đòn)', 'Ngực', 'MAIN', 4, '8-10', '40-60 kg'),
    ('Incline Dumbbell Press (Đẩy ngực dốc trên)', 'Ngực', 'MAIN', 3, '10-12', '16-22 kg'),
    ('Barbell Back Squat (Gánh tạ đòn)', 'Chân', 'MAIN', 4, '6-8', '50-80 kg'),
    ('Romanian Deadlift (RDL đùi sau)', 'Chân', 'MAIN', 3, '10', '40-60 kg'),
    ('Leg Press (Đạp đùi máy)', 'Chân', 'MAIN', 3, '12', '80-120 kg'),
    ('Lat Pulldown (Kéo xô rộng tay)', 'Lưng', 'MAIN', 4, '10-12', '35-55 kg'),
    ('Seated Cable Row (Kéo cáp lưng giữa)', 'Lưng', 'MAIN', 3, '10-12', '35-50 kg'),
    ('Overhead Dumbbell Press (Đẩy vai tạ đơn)', 'Vai', 'MAIN', 3, '10', '12-18 kg'),
    ('Lateral Raise (Dang tạ đơn vai giữa)', 'Vai', 'MAIN', 3, '12-15', '6-10 kg'),
    ('Plank siết Core & Hít thở', 'Core & Cardio', 'MAIN', 3, '60 giây', 'Bodyweight'),
    ('HIIT Máy chạy bộ / Đạp xe', 'Core & Cardio', 'MAIN', 1, '15 phút', 'Level 7'),
    ('Tổ hợp Đấm bao cát 3 hiệp', 'Boxing', 'MAIN', 3, '3 phút', 'Găng 12oz'),
    ('Chuỗi Sun Salutation & Mở khớp hông', 'Yoga', 'MAIN', 3, '5 chu kỳ', 'Thảm Yoga'),
    ('Giãn cơ tĩnh & Hạ nhịp tim', 'Giãn cơ', 'COOLDOWN', 1, '7 phút', 'Bodyweight')
) AS seed(name, muscle_group, default_phase, default_sets, default_reps, default_weight)
WHERE NOT EXISTS (SELECT 1 FROM exercises);

CREATE TABLE IF NOT EXISTS pt_templates (
  id BIGSERIAL PRIMARY KEY,
  pt_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  warmup_minutes INTEGER NOT NULL DEFAULT 10,
  main_minutes INTEGER NOT NULL DEFAULT 40,
  cooldown_minutes INTEGER NOT NULL DEFAULT 10,
  exercises_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_programs (
  id BIGSERIAL PRIMARY KEY,
  pt_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id BIGINT REFERENCES pt_templates(id) ON DELETE SET NULL,
  source_type VARCHAR(20) NOT NULL DEFAULT 'PT' CHECK (source_type IN ('PT','SELF')),
  name VARCHAR(120) NOT NULL,
  exercises_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id BIGINT REFERENCES workout_programs(id) ON DELETE SET NULL,
  session_id BIGINT REFERENCES coach_sessions(id) ON DELETE SET NULL,
  logged_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  program_name VARCHAR(120) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  exercises_json TEXT NOT NULL DEFAULT '[]',
  feedback TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_bookings (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES gym_classes(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED','CANCELLED','LATE_CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE (class_id, member_id)
);

CREATE TABLE IF NOT EXISTS member_training_settings (
  member_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weekly_target INTEGER NOT NULL DEFAULT 3 CHECK (weekly_target BETWEEN 1 AND 7),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_weekly_targets (
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  target_sessions INTEGER NOT NULL CHECK (target_sessions BETWEEN 1 AND 7),
  PRIMARY KEY (member_id, week_start)
);

CREATE TABLE IF NOT EXISTS pt_notifications (
  id BIGSERIAL PRIMARY KEY,
  pt_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
