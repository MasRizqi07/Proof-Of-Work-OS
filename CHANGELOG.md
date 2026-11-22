# Changelog — Proof of Work OS

All notable changes to this project will be documented in this file.

---

## [0.1.0-beta] — 2026-11-22

### Added

- **Evidence Domain Model (`server/src/routes/evidence.js`)**:
  - `POST /api/tasks/:taskId/evidence` with discriminated union (`url` vs `note`).
  - Strict protocol validation allowing only `http://` and `https://` URLs, preventing stored XSS (`javascript:`, `data:`, `ftp:`).
  - Maximum 20 proofs per task enforcement with `409 EVIDENCE_LIMIT_REACHED`.
  - Transactional activity logging (`evidence.added`, `evidence.deleted`).
  - Cascade deletion of evidence items when parent task is deleted.
- **Metrics Service (`server/src/services/metrics.js`)**:
  - `GET /api/metrics/summary` returning totals (`completed`, `withProof`, `withoutProof`, `proofRate`, `overdueOpen`), current/longest streak, and 8-week trend array.
  - Pure 5-vector streak algorithm tested against timezone boundaries (WIB `16:59:59Z` vs `17:30:00Z`).
  - SQL-level aggregation per week using PostgreSQL `date_trunc` with explicit UTC timezone conversion.
- **Frontend Evidence & Task Management (`client/src/components/TaskDetailDialog.jsx`)**:
  - Native accessible `<dialog>` for task editing and proof attachment.
  - Proof count badge (`{evidenceCount} / 20`) with live TanStack Query invalidation.
  - Safe URL rendering (`safeHref`): only `http:` and `https:` render as clickable links; all other protocols render as plain text.
  - Native `<dialog>` confirmation dialog for task deletion (`DeleteConfirmDialog.jsx`).
  - Task status badges and proof badges (`No proof yet` vs `With proof · N`).
  - 8-week responsive SVG proof ratio chart (`WeeklyProofChart.jsx`) with dual-color bars, accessible legend, and data table alternative.
  - Project task counts (`total` and `done`) in project listing and cards.
- **Design Token System (`client/src/styles/tokens.css`)**:
  - Three-tier token architecture (Primitive, Semantic, Component).
  - Dual dark mode support (`[data-theme='dark']` and `@media (prefers-color-scheme: dark)`) with 100% property-identical values.
  - Self-hosted IBM Plex Sans and IBM Plex Mono fonts.
  - Zero hex `#...` or `rgba(...)` color literals outside `tokens.css`.
  - Error boundary components with retry controls.
- **Cross-Boundary Contract Testing (`server/integration/contracts/`)**:
  - Contract validation suite for `GET /api/tasks`, `GET /api/tasks/:id/evidence`, `GET /api/metrics/summary`, and `GET /api/projects`.
  - Client-side mock fixture validation asserting exact key and type alignment.

### Fixed

- **Phase 6R Remediation (R-01 through R-11)**:
  - **R-01**: `GET /api/tasks/:taskId/evidence` returns paginated object `{ items, page, limit, total, pages }` ordered newest first (`createdAt: 'desc'`).
  - **R-02**: `TaskDetailDialog` retains focus on form fields (e.g. "Label" input) across parent component re-renders.
  - **R-03**: Task editing computes field diffs, sends only changed fields in `PATCH`, awaits server response before displaying "Saved.", and displays inline error with `role="alert"` and form rollback on failure.
  - **R-04**: Streak computation rewritten with UTC calendar arithmetic, eliminating day skew across US Daylight Saving Time (DST) transitions (`America/New_York`) and southern hemisphere DST transitions (`Pacific/Auckland`).
  - **R-05**: `fetchMetricsSummary` aggregates per-week counts directly in SQL via `Prisma.sql`, avoiding transferring thousands of task records into Node.js process memory.
  - **R-06**: Resolved high-severity ReDoS advisory (`effect <=3.22.0`, GHSA-7589-6fvf-x4pw) via root `package.json` `overrides` without down-versioning Prisma CLI.
  - **R-07**: Excluded health probes (`/api/ping` and `/api/ready`) from rate limiting.
  - **R-08**: Validated `search` query parameter in `GET /api/projects` (rejects non-strings and strings > 100 chars with `400 VALIDATION_ERROR`).
  - **R-09**: Removed test-double branching (`typeof db.task?.groupBy === 'function'`) and fallback from production project routes.
  - **R-10**: Non-http/https URLs render as plain text without link tags.
  - **R-11**: Integrated cross-boundary contract tests into integration suite.
- **Server Integrity (Phase 2)**:
  - Differentiated `503 SERVICE_UNAVAILABLE` (database unreachable during user provisioning) from `401 AUTH_INVALID`.
  - Fixed `completedAt` timestamp overwriting on repeated `done` patches.
  - Fixed pagination query parsing (`?page=abc` now returns `400 VALIDATION_ERROR` instead of `500`).
  - Enforced PostgreSQL CHECK constraints for task progress range (`0..100`) and `completedAt` status correlation.

### Changed

- Upgraded `zod` to `^4.6.7`.
- Overrode `deepmerge-ts` to `8.0.2` and `effect` to `>=3.22.1`.
- Standardized ESLint configuration to flat config (`eslint.config.js`).

### Not Included (Deferred)

The following items are deferred according to PRD scope and are intentionally not present in this release:

- AI coach / LLM recommendations
- GitHub OAuth identity verification
- File uploads to cloud object storage
- Public unauthenticated profiles
- Multi-user team workspaces and organizations
- Email notifications and SMTP integration
- Real-time WebSockets
- Automated OpenAPI / Swagger documentation generation
- Internationalization (i18n)
- TypeScript rewrite
