# OptiGym Ver 2 — Test Plan

## 1. Test Environment
- **OS**: Windows
- **Workspace**: `D:\optigym_ver2`
- **Backend Toolchain**: Maven + Java 24.0.1 (targeting Java 17)
- **Frontend Toolchain**: Node.js + Vite 6.4.3

## 2. Execution Phases
| Phase | Activities | Commands / Methods |
|---|---|---|
| 1. Baseline & Build | Run existing backend tests, frontend build, render check, and existing JS unit tests | `mvn test`, `npm run build`, `npm run test:render`, `node --test src/features/tracking/trackingModel.test.js` |
| 2. Static & Contract Verification | Scan missing imports, cross-check Java endpoints vs frontend API calls, cross-check Java SQL tables/columns vs `db/schema/*.sql`, verify `fetch` `credentials` options | Node analysis scripts + source inspection |
| 3. Unit & Edge-Case Testing | Test `format.js`, `date.js`, `trackingModel.js` with worst-case inputs (emoji, trailing spaces, `undefined`, weight=0) | `node --input-type=module` test harness |
| 4. Security & Backend Logic Audit | Audit `SessionSecurity`, `AuthController`, `AccountController`, `AdminUserController`, `PtDocumentController`, `PasswordResetService`, `EmailVerificationService`, `AdminDashboardController`, `OperationsController`, `AdminBootstrapConfiguration` | Code & test coverage review |
| 5. UI Resilience (`break-ui`) | Audit `AuthView`, `SettingsView`, `AdminWorkspace`, `AdminUsersView`, `AdminDashboardView`, `PtWorkspace`, `Avatar`, `Tag` against `CATALOG.md` | CSS/JSX analysis (visual browser check blocked by build failure) |

## 3. Entry & Exit Criteria
- **Entry**: Codebase present at `D:\optigym_ver2`; member module explicitly excluded.
- **Exit**: All runnable checks executed after final inspection, all defects logged with reproduction & root cause in `docs/qa/qa-report.md`, release recommendation issued.
