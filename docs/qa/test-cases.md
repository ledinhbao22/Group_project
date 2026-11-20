# OptiGym Ver 2 — Test Cases & Traceability

> Excludes `MEMBER`-specific views/flows (`frontend/src/features/member/**`) per user scope.

| TC ID | Module | Scenario | Method / Command | Expected | Observed Status |
|---|---|---|---|---|---|
| TC-01 | Frontend Build | Production bundle builds cleanly (`npm run build`) | `npm run build` in `frontend/` | Exit 0, bundle emitted | **FAIL** (missing `equipment.js` / `invoices.js` / 6 `PagesView` imports) |
| TC-02 | Frontend Render Check | SSR render script executes (`npm run test:render`) | `npm run test:render` in `frontend/` | Exit 0 | **FAIL** (`scripts/check-render.jsx` missing) |
| TC-03 | Frontend Imports | All non-member relative JS/JSX imports resolve on disk | Node import scan across `frontend/src` | 0 missing imports | **FAIL** (8 missing imports) |
| TC-04 | Backend Unit/WebMvc | Existing JUnit test suites pass (`AuthAndSecurityTest`, `PasswordResetFlowTest`) | `mvn test` in `backend/` | 10/10 pass | **PASS** (10/10, note: uses mocked `JdbcTemplate`/`SessionSecurity`) |
| TC-05 | Tracking Model | Weighted progress, forecast learning/behind/scope-reduction, archived children | `node --test src/features/tracking/trackingModel.test.js` | 5/5 pass | **PASS** (5/5) |
| TC-06 | Tracking Edge Case | `progressOf` when child weights sum to `0` | Node edge-case harness | Returns finite number (e.g. `0`) | **FAIL** (returns `NaN`) |
| TC-07 | UI Formatting (`break-ui`) | `initials()` with Vietnamese diacritics, single char, trailing spaces, emoji (`"🏋️ Minh"`) | Node edge-case harness | Valid initials, no lone surrogates | **FAIL** (`"🏋️ Minh"` -> `"\ud83cM"`, `"Nguyễn Linh "` -> `"L"`) |
| TC-08 | UI Formatting (`break-ui`) | `formatNumber(1284)`, `currency(0)`, `formatNumber(undefined)` | Node edge-case harness | Formatted Vietnamese numbers; safe null handling | **PARTIAL** (`1284` -> `"1.284"`, `undefined` -> `"NaN"`) |
| TC-09 | DB Schema Consistency | All tables & columns referenced in Java SQL exist in `db/schema/*.sql` | Node schema-vs-Java scan + manual inspection | 0 missing tables/columns | **FAIL** (9 missing tables + missing `grant_hash`, `grant_expires` in `password_resets`) |
| TC-10 | API Contract Alignment | Non-member frontend API calls match backend `@*Mapping` endpoints | Node endpoint cross-check | All called endpoints exist | **FAIL** (`/api/pt/*`, `/api/coaching/*`, `/api/classes`, `/api/admin/packages`, `/api/orders`, `/api/tracking`, etc. missing) |
| TC-11 | Auth & Security | Role guard (`adminUsersRequiresAdminRole`, `ptCvDownloadRequiresAdminRole`, `getProfileRequiresAuthentication`) | `AuthAndSecurityTest` + code audit | 401/403 enforced | **PASS** in MockMvc; code audit notes `writeCheck` skips when `Origin` is absent |
| TC-12 | Password Reset Flow | 3-step flow (`request` -> `verifyCode` -> `confirm`) with 5-attempt lockout & single-use token | `PasswordResetFlowTest` + SQL audit | Works end-to-end on real DB | **BLOCKED/FAIL** on real DB (`grant_hash`/`grant_expires` missing in `03-password-reset.sql`) |
| TC-13 | Admin & PT Workspace UI | Toast notifications, `loadErrors`, `HomeView` `"users"` link, `AdminUsersView` table & modal validation | Code & CSS audit (`break-ui`) | Feedback visible, links work, overflow handled | **FAIL** (`AdminWorkspace`/`PtWorkspace` drop `toast`, `HomeView` `go("users")` no-op, missing `maxLength`/pagination/wrapping) |
