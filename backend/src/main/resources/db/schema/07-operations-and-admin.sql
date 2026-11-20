-- ==============================================================================
-- 07-operations-and-admin.sql: Bang van hanh & quan tri cho OptiGym Ver 2
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(24) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO rooms(code, name, capacity, active)
VALUES
  ('GYM', 'Phòng Gym', 40, true),
  ('YOGA', 'Phòng Yoga', 20, true),
  ('BOXING', 'Phòng Boxing', 16, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS checkins (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS equipment (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(40) NOT NULL,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','MAINTENANCE','BROKEN','RETIRED')),
  purchased_on DATE,
  next_service DATE,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_events (
  id BIGSERIAL PRIMARY KEY,
  equipment_id BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packages (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('GYM','YOGA','BOXING')),
  price BIGINT NOT NULL CHECK (price >= 0),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO packages(name, category, price, duration_days, description, active)
SELECT * FROM (
  VALUES
    ('Gym 1 tháng', 'GYM', 600000, 30, 'Truy cập khu vực Gym & Cardio toàn thời gian trong 30 ngày.', true),
    ('Yoga 1 tháng', 'YOGA', 750000, 30, 'Tham gia các lớp Yoga & Mobility không giới hạn.', true),
    ('Boxing 1 tháng', 'BOXING', 850000, 30, 'Tập luyện Boxing & Combat với đầy đủ trang bị.', true)
) AS seed(name, category, price, duration_days, description, active)
WHERE NOT EXISTS (SELECT 1 FROM packages);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_sessions (
  id BIGSERIAL PRIMARY KEY,
  pt_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('REQUESTED','CONFIRMED','COMPLETED','MISSED','CANCELLED','REJECTED')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(160) NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT','AMOUNT')),
  discount_value BIGINT NOT NULL CHECK (discount_value > 0),
  category VARCHAR(20) NOT NULL DEFAULT 'ALL',
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  usage_limit INTEGER NOT NULL DEFAULT 100 CHECK (usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(32) NOT NULL UNIQUE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id BIGINT REFERENCES packages(id) ON DELETE SET NULL,
  package_name VARCHAR(120) NOT NULL DEFAULT '',
  package_price BIGINT NOT NULL DEFAULT 0,
  package_days INTEGER NOT NULL DEFAULT 0,
  pt_name VARCHAR(120) NOT NULL DEFAULT '',
  pt_price BIGINT NOT NULL DEFAULT 0,
  pt_days INTEGER NOT NULL DEFAULT 0,
  pt_sessions INTEGER NOT NULL DEFAULT 0,
  promotion_id BIGINT REFERENCES promotions(id) ON DELETE SET NULL,
  promotion_code VARCHAR(40) NOT NULL DEFAULT '',
  discount_amount BIGINT NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
  total BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','SUBMITTED','PAID','CANCELLED')),
  confirmed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promotion_id BIGINT REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promotion_code VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH';

CREATE TABLE IF NOT EXISTS gym_classes (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('GYM','YOGA','BOXING')),
  pt_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  capacity INTEGER NOT NULL DEFAULT 20 CHECK (capacity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CANCELLED','COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
