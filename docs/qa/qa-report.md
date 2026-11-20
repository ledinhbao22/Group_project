# OptiGym Ver 2 — QA Report (Post-Fix Verification)

## 1. Scope & Build Identification
- **Project**: `D:\optigym_ver2` (standalone environment; `Optigym_personal` stopped without deleting files/volumes; `frontend/node_modules` junction removed and reinstalled independently).
- **Scope Verified**: Backend (`Auth`, `Verification`, `PasswordReset`, `Account`, `AdminUsers`, `PtDocuments`, `AdminDashboard`, `Operations`, `SessionSecurity`, `AdminBootstrapConfiguration`, `db/schema/01..07`) and Frontend non-member modules (`AuthView`, `SettingsView`, `AdminWorkspace`, `AdminDashboardView`, `AdminUsersView`, `AdminAttendanceView`, `AdminHeatmapView`, `AdminPackagesView`, `AdminPromotionsView`, `AdminScheduleView`, `AdminInvoicesView`, `PtWorkspace`, `TrackingPage`, `trackingModel`, `App`, `PagesView`, `HomeView`, `shared/*`).
- **Excluded Scope**: `MEMBER`-specific features (`frontend/src/features/member/**`) per user request.
- **Release Recommendation**: **GO (with minor mobile header CSS polish backlog)** — All critical build, schema, API, and runtime defects are resolved; local Docker stack (`db`, `backend`, `frontend`) is up and verified end-to-end.

---

## 2. Environment
- **OS**: Windows
- **Backend**: Java `17` (Docker `eclipse-temurin:17-jre`) / Java `24.0.1` (local `mvn test`), Spring Boot `3.3.5`
- **Database**: PostgreSQL `16-alpine` (`optigym_ver2-db-1`, volume `optigym_ver2_optigym_ver2_pg`)
- **Frontend**: Node.js `22-alpine` (Docker) / Vite `6.4.6` (`optigym_ver2-frontend-1`)
- **Live URLs**: Frontend `http://localhost:5173`, Backend `http://localhost:8080`

---

## 3. Verification Commands & Results (Post-Fix)

| Check | Command / Target | Exit / Status | Result |
|---|---|---|---|
| Backend Maven Tests | `cd d:\optigym_ver2\backend; mvn test` | `0` | **PASS — 16/16** (`AdminAndValidationTest`: 6, `AuthAndSecurityTest`: 4, `PasswordResetFlowTest`: 6) |
| Frontend Production Build | `cd d:\optigym_ver2\frontend; npm run build` | `0` | **PASS** — `1724 modules transformed`, built in `3.79s` |
| Frontend SSR Render Check | `cd d:\optigym_ver2\frontend; npm run test:render` | `0` | **PASS** — `AuthView`, `AdminWorkspace`, `AdminUsersView`, `SettingsView` rendered |
| Frontend Unit Tests | `cd d:\optigym_ver2\frontend; node --test src/features/tracking/trackingModel.test.js src/shared/lib/format.test.js` | `0` | **PASS — 9/9** |
| Java SQL vs DDL Schema Scan | Node cross-check `backend/src/main/java` vs `db/schema/*.sql` | `0` | **PASS** — `MISSING TABLES: {}` |
| Docker Compose Stack | `cd d:\optigym_ver2; docker compose up --build -d` | `0` | **PASS** — `optigym_ver2-db-1` (healthy), `optigym_ver2-backend-1` (started in 5.585s), `optigym_ver2-frontend-1` (Vite ready in 610ms) |
| Live E2E API + Real PostgreSQL | Node suite against `http://localhost:8080/api` | `0` | **PASS — 23/23** (Auth, `/auth/me`, Admin users/summary/metrics/reports/promotions/packages/heatmap/equipment/rooms/checkins/classes/orders, PT PDF CV upload/download/delete, forgot-password) |
| Live Browser UI Verification | `browser` subagent on `http://localhost:5173` | Verified (`BROWSER_HOST_FACTS`) | **PASS** — Landing, Zone tabs, Admin login, Dashboard, Packages (3 seeded), Users/RBAC, Promotions, Heatmap, Settings (`0` console errors, `0` post-login 4xx/5xx) |

---

## 4. Defects Resolved Since Baseline

| ID | Summary | Resolution |
|---|---|---|
| **DEF-01 / DEF-06 / DEF-10** | 8 missing frontend imports, missing `scripts/check-render.jsx`, `"users"` route mismatch | Fixed [PagesView.jsx](file:///d:/optigym_ver2/frontend/src/app/PagesView.jsx), [freshSample.js](file:///d:/optigym_ver2/frontend/src/shared/demo/freshSample.js), [navigation.js](file:///d:/optigym_ver2/frontend/src/shared/config/navigation.js), [loadPaths.js](file:///d:/optigym_ver2/frontend/src/shared/api/loadPaths.js), added [check-render.jsx](file:///d:/optigym_ver2/frontend/scripts/check-render.jsx) |
| **DEF-02** | `password_resets` missing `grant_hash` & `grant_expires` columns | Added columns + idempotent `ALTER TABLE` to [03-password-reset.sql](file:///d:/optigym_ver2/backend/src/main/resources/db/schema/03-password-reset.sql) |
| **DEF-03 / DEF-04** | 9 missing DB tables + missing packages/orders/classes endpoints | Added [07-operations-and-admin.sql](file:///d:/optigym_ver2/backend/src/main/resources/db/schema/07-operations-and-admin.sql), wired in [application.properties](file:///d:/optigym_ver2/backend/src/main/resources/application.properties), added endpoints in [AdminDashboardController.java](file:///d:/optigym_ver2/backend/src/main/java/com/optigym/admin/dashboard/AdminDashboardController.java) and [OperationsController.java](file:///d:/optigym_ver2/backend/src/main/java/com/optigym/operations/OperationsController.java) |
| **DEF-05 / DEF-07 / DEF-08 / DEF-12** | Bootstrap crash with existing admin, unvalidated promotions, `member_code` race/omission, CV ordering | Fixed [AdminBootstrapConfiguration.java](file:///d:/optigym_ver2/backend/src/main/java/com/optigym/config/AdminBootstrapConfiguration.java), [AdminDashboardController.java](file:///d:/optigym_ver2/backend/src/main/java/com/optigym/admin/dashboard/AdminDashboardController.java), [AuthController.java](file:///d:/optigym_ver2/backend/src/main/java/com/optigym/auth/AuthController.java), [AdminUserController.java](file:///d:/optigym_ver2/backend/src/main/java/com/optigym/admin/users/AdminUserController.java), [PtDocumentController.java](file:///d:/optigym_ver2/backend/src/main/java/com/optigym/admin/users/PtDocumentController.java) |
| **DEF-09 / DEF-11 / DEF-13 / break-ui** | Dropped `toast`/`loadErrors`, misplaced `credentials`, `initials` emoji surrogate bug, `progressOf` zero-weight `NaN`, `Tag` `kind`, `AdminUsersView` table/modal edge cases | Fixed [AdminWorkspace.jsx](file:///d:/optigym_ver2/frontend/src/features/admin/layout/AdminWorkspace.jsx), [PtWorkspace.jsx](file:///d:/optigym_ver2/frontend/src/features/pt/PtWorkspace.jsx), [format.js](file:///d:/optigym_ver2/frontend/src/shared/lib/format.js), [trackingModel.js](file:///d:/optigym_ver2/frontend/src/features/tracking/trackingModel.js), [Tag.jsx](file:///d:/optigym_ver2/frontend/src/shared/ui/Tag.jsx), [AdminUsersView.jsx](file:///d:/optigym_ver2/frontend/src/features/admin/AdminUsersView.jsx), and all 7 Admin view `fetch` calls |

---

## 5. Residual Notes & Minor Observations
- **Minor Mobile Header Overflow (`375px` width)**: In `AdminWorkspace` at `375x812`, the right-most logout icon (`x=351`) slightly exceeds the `360px` container width next to `"Bảng điều khiển"`. Non-blocking; can be tightened with smaller mobile topbar gaps/title truncation.
- **SSR Warning**: `AdminDashboardView` SVG `<circle><title>` emits a React SSR warning about multi-child `<title>` arrays; harmless in client rendering.
- **Mock-based Java Tests**: Maven tests use Mockito for `JdbcTemplate`/`SessionSecurity`; real SQL integration is verified via the live PostgreSQL E2E run above.
- **Browser Evidence**: `C:/Users/PC/.gemini/antigravity/brain/dc28d2f4-c620-48fb-978e-c398bfaf2605/browser_evidence/3e81b09a-af9a-41ab-8977-1cdb41a9f96c/final_step_21.png`.
