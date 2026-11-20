# OptiGym Ver 2 — Nền tảng Xác thực & Phân quyền (Auth & RBAC Foundation)

> **MỤC ĐÍCH**: Bản dựng mới tinh gọn của OptiGym tại `D:\optigym_ver2`, kế thừa nguyên vẹn 100% hệ thống xác thực (Đăng nhập, Đăng ký), toàn bộ các luồng xử lý tài khoản (OTP Email, Quên mật khẩu, Đổi mật khẩu, Quản lý hồ sơ) và phân quyền bảo mật 3 vai trò (`ADMIN`, `PT`, `MEMBER`).

---

## 1. Các Tính năng Kế thừa Cốt lõi (Inherited Features)

### 1.1. Xác thực & Đăng ký (Authentication & Registration)
- **Giao diện Sport-Editorial & Technical Brutalism**:
  - Landing page giới thiệu không gian phòng gym cao cấp.
  - Form xác thực Split-Screen trên Desktop (phong cách Nike Member Pass) và Slide-up Bottom Drawer trên Mobile (< 900px).
- **Đăng ký linh hoạt theo 2 vai trò**:
  - `MEMBER` (Hội viên): Nhập Họ tên, Email, Mật khẩu, Số điện thoại -> Tự động cấp mã hội viên `OG-XXXXXXXX` và gửi mã OTP xác thực email.
  - `PT` (Huấn luyện viên): Lựa chọn chuyên môn (`GYM`, `YOGA`, `BOXING`), đính kèm CV (`.pdf`, `.doc`, `.docx` tối đa 5MB) -> Tài khoản vào trạng thái `PENDING` chờ quản trị viên phê duyệt.
- **Xác thực Email OTP (2 bước)**:
  - Mã OTP 6 chữ số ngẫu nhiên, mã hóa bcrypt trong database, hiệu lực 10 phút.
  - Có cơ chế chống flood gửi lại mã (cooldown 60s) và giới hạn 5 lần thử sai.
  - *Dev Fallback*: Nếu chưa cấu hình SMTP, mã OTP tự động in ra console server để dev/test tức thì.
- **Quên & Đặt lại Mật khẩu (Password Reset)**:
  - Yêu cầu đặt lại mật khẩu qua email -> Nhập mã OTP 6 số để nhận reset token dùng 1 lần (hạn 10 phút) -> Đặt mật khẩu mới.

### 1.2. Quản lý Tài khoản (Account Management)
- **Hồ sơ cá nhân (`SettingsView.jsx` / `PATCH /api/account/profile`)**:
  - Xem thông tin tài khoản, avatar, email, mã định danh, chuyên môn, trạng thái phiên đăng nhập.
  - Cập nhật Họ và tên, Số điện thoại.
- **Đổi mật khẩu trực tiếp (`POST /api/account/change-password`)**:
  - Kiểm tra mật khẩu hiện tại, mã hóa Bcrypt mật khẩu mới (tối thiểu 6 ký tự).
- **Phê duyệt & Quản trị tài khoản (`AdminUsersView.jsx` / `AdminUserController.java`)**:
  - Quản trị viên duyệt hồ sơ Huấn luyện viên (`PENDING` sang `ACTIVE` hoặc `REJECTED`).
  - Tải và xem trực tiếp file CV của ứng viên PT (`GET /api/admin/trainers/{id}/cv`).
  - Khóa (`DISABLED`) hoặc Mở khóa (`ACTIVE`) tài khoản người dùng; vô hiệu hóa toàn bộ session khi khóa tài khoản.
  - Thêm tài khoản mới trực tiếp từ bảng quản trị.

### 1.3. Phân quyền & Bảo mật (RBAC & Session Security)
- **3 vai trò chuẩn**:
  1. `ADMIN` (Quản trị viên): Toàn quyền quản trị tài khoản, phân quyền, duyệt PT.
  2. `PT` (Huấn luyện viên): Không gian huấn luyện viên, hồ sơ chuyên môn, cập nhật tài khoản.
  3. `MEMBER` (Hội viên): Thẻ hội viên định danh, thông tin cá nhân, cập nhật tài khoản.
- **Session-Based Authentication (Không dùng JWT)**:
  - Token session ngẫu nhiên 32-byte (256-bit entropy), băm SHA-256 lưu trong PostgreSQL bảng `sessions`.
  - Cookie HttpOnly `og_session`, SameSite=Lax.
  - Kiểm tra bảo mật chống tấn công giả mạo CSRF/Origin header (`writeCheck`).
- **Role Routing & UI Guards**:
  - Kiểm tra phiên làm việc tự động khi tải trang (`GET /api/auth/me`).
  - Chỉ cho phép truy cập các trang trong `allowedPages[user.role]`. Tự động chuyển hướng nếu không có quyền.

---

## 2. Tài khoản Dùng thử & Chế độ Xem thử (Demo Mode)

- **Tài khoản quản trị seed sẵn trong PostgreSQL (`06-seed-accounts.sql`):**
  - Email: `admin@demo.optigym` · Mật khẩu: `123456` (`ADMIN`, `ACTIVE`)
  - Các tài khoản `PT` và `MEMBER` được tạo qua form Đăng ký (xác thực OTP) hoặc do Admin tạo trực tiếp trong mục **Quản lý tài khoản**.
- **Chế độ Xem thử nhanh trên giao diện (`?demo=...`):**
  - `/?demo=ADMIN` — Giao diện Quản trị viên với dữ liệu mẫu
  - `/?demo=PT` — Không gian Huấn luyện viên PT với dữ liệu mẫu
  - `/?demo=MEMBER` — Không gian Hội viên với dữ liệu mẫu

---

## 3. Kiến trúc Thư mục

```text
D:\optigym_ver2\
├── backend/
│   ├── src/main/java/com/optigym/
│   │   ├── account/                 # Profile & đổi mật khẩu (AccountController)
│   │   ├── admin/users/             # Quản lý tài khoản, duyệt PT & xem CV (AdminUserController, PtDocumentController)
│   │   ├── auth/                    # Đăng nhập, đăng ký, phiên làm việc (AuthController)
│   │   ├── config/                  # AdminBootstrapConfiguration
│   │   ├── passwordreset/           # Quên & đặt lại mật khẩu OTP (PasswordResetController, PasswordResetService)
│   │   ├── shared/security/         # SessionSecurity.java (Session cookie, token SHA-256, RBAC)
│   │   ├── shared/web/              # Errors, Inputs, RequestValues, UploadFiles
│   │   ├── verification/            # Xác thực email OTP (EmailVerificationController, EmailVerificationService)
│   │   └── OptiGymApplication.java  # Main Spring Boot
│   ├── src/main/resources/
│   │   ├── db/schema/               # 01-users.sql -> 06-seed-accounts.sql
│   │   └── application.properties   # Cấu hình Spring Boot & Database
│   ├── src/test/java/com/optigym/   # AuthAndSecurityTest, PasswordResetFlowTest
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   │   ├── app/                     # App.jsx, HomeView.jsx
│   │   ├── features/
│   │   │   ├── auth/                # AuthView.jsx, auth.css, useAuth.js
│   │   │   ├── account/             # SettingsView.jsx (Hồ sơ & Đổi mật khẩu)
│   │   │   └── admin/               # AdminUsersView.jsx (Bảng quản lý tài khoản & duyệt PT)
│   │   └── shared/
│   │       ├── api/                 # client.js (Fetch wrapper & session handling)
│   │       ├── config/              # roles.js, navigation.js
│   │       ├── demo/                # accounts.js, readRole.js
│   │       ├── styles/              # base.css, styles.css, studio.css, platform.css
│   │       └── ui/                  # Button, Field, Modal, Loading, Avatar, Tag, Section, PageTitle...
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── compose.yaml                     # Docker compose cho PostgreSQL, Backend, Frontend
├── .env.example                     # Biến môi trường mẫu
├── .env                             # Biến môi trường cục bộ
└── README.md
```

---

## 4. Hướng dẫn Khởi chạy (Getting Started)

### Cách 1: Sử dụng Docker Compose (Khuyên dùng)
```bash
cd D:\optigym_ver2
docker compose up --build -d
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- PostgreSQL: Port `5432`

### Cách 2: Chạy Local trực tiếp

**1. Khởi động Backend:**
Yêu cầu PostgreSQL đang chạy với database `optigym_ver2` (hoặc cấu hình `DB_URL` trong file `.env`):
```powershell
cd D:\optigym_ver2\backend
mvn spring-boot:run
```

**2. Khởi động Frontend:**
```powershell
cd D:\optigym_ver2\frontend
npm run dev
```
Truy cập `http://localhost:5173`.
