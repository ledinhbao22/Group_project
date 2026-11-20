# OptiGym Ver 2 — Test Strategy

## 1. Objectives
Validate the buildability, schema integrity, backend API/security contracts, pure business logic, and UI resilience (`break-ui` edge cases) across all implemented non-member modules in `D:\optigym_ver2`.

## 2. Scope
- **In Scope**:
  - Backend: Auth, Email Verification, Password Reset, Account Profile & Password Change, Admin User & PT CV Management, Admin Dashboard & Operations APIs, Session/CSRF/RBAC security, SQL schema consistency, Startup bootstrap.
  - Frontend: Build & module resolution, shared utilities (`format.js`, `date.js`, `trackingModel.js`), Auth/Account/Admin/PT views, API client & `loadPaths` contract alignment, responsive & worst-case data resilience (`break-ui`).
- **Out of Scope**:
  - `MEMBER` workspace and member-specific features (`frontend/src/features/member/**`), per user instruction.
  - External SMTP delivery (tested via code inspection/mocking).

## 3. Skill Integration
- **`qa-orchestrator`**: Project discovery, test pyramid execution, defect triage with root causes, QA reporting (`GO` / `CONDITIONAL GO` / `NO-GO`).
- **`verification-before-completion`**: Every pass/fail claim backed by fresh command output and exact counts.
- **`systematic-debugging`**: Root-cause analysis for build failures, schema/SQL mismatches, and mock-only test blind spots.
- **`break-ui`**: Field mapping and worst-case data / CSS overflow / initials / pagination / error-state stress analysis on Auth, Account, Admin, and PT UIs.

## 4. Test Pyramid & Quality Gates
1. **Static & Build Checks**: Vite production build (`npm run build`), SSR render check (`npm run test:render`), static JS/JSX relative import resolution scan, Backend-Frontend API contract scan, Java SQL-vs-DDL schema scan.
2. **Unit Tests**: Backend JUnit tests (`mvn test`), Frontend `node --test` (`trackingModel.test.js` + edge-case checks for `format.js`, `date.js`, `trackingModel.js`).
3. **API & Security Contract Audit**: Authentication, RBAC (`ADMIN` vs `PT` vs `MEMBER`), Origin CSRF check (`writeCheck`), input validation alignment, error handling (`Errors.java`).
4. **UI Resilience (`break-ui`)**: Surface mapping and worst-case testing (names, diacritics, emojis, unbreakable emails, 0/1/1000+ rows, 320px viewport, toast visibility).

## 5. Exit / Release Gate Criteria
- `npm run build` exits `0` with no missing imports.
- `mvn test` exits `0` with integration/schema coverage verifying SQL against actual DDL.
- Zero `Critical` / `Blocker` defects (no 500s on core flows like password reset or admin dashboard/reports, no missing DDL tables for active controllers).
