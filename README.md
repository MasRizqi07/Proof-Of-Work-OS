# Proof of Work OS

Proof of Work OS is a full-stack Node.js + React application for developer
performance tracking. It stores projects, tasks, profiles, and activity events
in PostgreSQL and uses Supabase Auth for identity.

## Architecture

- **Frontend (`client/`)**: React + Vite UI. It obtains a Supabase session and
  sends the access token to the API as a bearer token.
- **API (`server/`)**: Express application on port 4000. Helmet, CORS,
  request IDs, structured error responses, JSON body limits, and rate limiting
  are applied before the routes.
- **Data (`prisma/`)**: Prisma schema and committed PostgreSQL migrations.
  `User`, `Profile`, `Project`, `Task`, and `ActivityEvent` are related by
  foreign keys with owner/user-scoped indexes.
- **Authentication**: The API verifies Supabase JWTs against the Supabase
  project's remote JWKS, issuer, and `authenticated` audience. A valid token
  is upserted into `User`; route queries then scope data to that user's ID.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL` and `SUPABASE_URL`.
   For the browser, copy `client/.env.example` to `client/.env` and set
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and optionally
   `VITE_API_URL`).

3. Generate the Prisma client and apply the committed migrations:

   ```bash
   npx prisma generate
   npm run db:migrate:deploy
   npm --workspace server run prisma:seed
   ```

   The seed is a no-op unless `SEED_OWNER_ID` is set. For local-only schema
   development, use `npx prisma migrate dev --name <name>` instead of changing
   the migration history by hand.

4. Start both apps:

   ```bash
   npm run dev
   ```

   The API is available at `http://localhost:4000`; the Vite client is
   available at `http://localhost:5173`.

## API

`GET /api/ping` and `GET /api/ready` are public health probes that bypass rate limiting. All other `/api/*` routes require `Authorization: Bearer <Supabase access token>`. Successful authentication creates or updates the corresponding database user.

The API exposes:

| Method                   | Route                                     | Purpose                                                              |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------------------- |
| `GET`                    | `/api/ping`                               | Service liveness check (public, request ID tracking)                 |
| `GET`                    | `/api/ready`                              | Database readiness check (`SELECT 1` on PostgreSQL)                  |
| `GET`                    | `/api/user`                               | Current user, profile, and overview metrics                          |
| `PATCH`                  | `/api/user/profile`                       | Update user name, bio, and focus                                     |
| `GET`                    | `/api/activities`                         | Paginated user activity event feed                                   |
| `GET`, `POST`            | `/api/projects`                           | List (with search, pagination, `taskCounts`) or create owned project |
| `GET`, `PATCH`, `DELETE` | `/api/projects/:projectId`                | Read, update, or soft-archive an owned project                       |
| `GET`, `POST`            | `/api/tasks`                              | List (with `status`, `projectId`, `hasProof`, paging) or create task |
| `GET`, `PATCH`, `DELETE` | `/api/tasks/:taskId`                      | Read, update (syncs `completedAt`), or delete an owned task          |
| `GET`, `POST`            | `/api/tasks/:taskId/evidence`             | List attached proof (paginated, desc) or attach proof (max 20)       |
| `DELETE`                 | `/api/tasks/:taskId/evidence/:evidenceId` | Remove attached proof (cascades automatically on task deletion)      |
| `GET`                    | `/api/metrics/summary`                    | Timezone-aware metrics (totals, 5-vector streak, 8-week array)       |

List endpoints support pagination (`page`, `limit`); projects also support
`search`, and tasks support `status`, `projectId`, and `hasProof`. JSON errors include an
error code/message and request ID. Task `status` values are `todo`,
`in-progress`, `done`, and `cancelled`; priorities are `low`, `medium`,
`high`, and `urgent`. Projects use `active`, `paused`, or `completed` status
values. Project deletion is a soft archive.
Completing a task records `completedAt`; moving it out of `done` clears that
timestamp. Meaningful project/task mutations also append an activity event.
The metrics summary aggregates per week in SQL and computes pure streaks across DST boundaries.

Root dependency overrides lock `deepmerge-ts` to `8.0.2` and `effect` to `>=3.22.1` to resolve transitive dependency vulnerabilities in Prisma configuration tools. These overrides are validated by the Prisma generation and test gates.
Frontend `dist` output is intentionally ignored because CI/CD builds the
artifact from source.

## Verification and CI

Run the mandatory gates locally:

```bash
npm run format:check
npm run lint
npm test
npm --workspace server run test:integration
npm run build
npm audit --audit-level=high
```

GitHub Actions starts a disposable PostgreSQL 16 service, generates Prisma,
applies all committed migrations with `prisma migrate deploy`, verifies that
the migration state is clean, and runs every gate above. The audit is
blocking: high- and critical-severity advisories fail CI.

## Current limitations

- A real Supabase project and access token are required for authenticated
  browser usage; without Supabase configuration, the frontend renders a
  configuration required screen.
- AI coach recommendations, GitHub OAuth PR ownership linking, file uploads,
  and unauthenticated public profiles are deferred to future phases.
- Project deletion is a soft archive; task deletion is permanent and
  cascades all attached evidence items.
- Production deployment, secret management, backups, and observability
  must be supplied by the hosting environment as documented in `DEPLOY.md`.
