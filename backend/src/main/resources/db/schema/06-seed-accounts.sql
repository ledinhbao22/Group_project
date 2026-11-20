-- ==============================================================================
-- 06-seed-accounts.sql: Du lieu tai khoan quan tri vien cho OptiGym Ver 2
-- Chi giu lai duy nhat tai khoan Admin mac dinh, khong chua tai khoan mau
-- Mat khau mac dinh: 123456 (Bcrypt: $2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO)
-- ==============================================================================

INSERT INTO users(name, email, password_hash, role, status, phone, specialty, email_verified, member_code)
VALUES
  ('OptiGym Admin', 'admin@demo.optigym', '$2a$12$Ixkbw.F8z6ALv7hQyE0aneZgrGvp67lZUgomgEQA/tQTHH.BYRUUO', 'ADMIN', 'ACTIVE', '0901234567', '', true, 'OG-00000001')
ON CONFLICT (email) DO NOTHING;
