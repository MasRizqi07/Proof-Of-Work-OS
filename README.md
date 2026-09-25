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

`GET /api/ping` is public and returns `{ "status": "ok", "requestId": "..." }`.
All other `/api/*` routes require `Authorization: Bearer <Supabase access
token>`. Successful authentication creates or updates the corresponding
database user.

The authenticated API currently exposes:

| Method                   | Route                      | Purpose                                   |
| ------------------------ | -------------------------- | ----------------------------------------- |
| `GET`                    | `/api/user`                | Current user, profile, and basic metrics  |
| `GET`, `POST`            | `/api/projects`            | List or create owned projects             |
| `GET`, `PATCH`, `DELETE` | `/api/projects/:projectId` | Read, update, or archive an owned project |
| `GET`, `POST`            | `/api/tasks`               | List or create owned tasks                |
| `GET`                    | `/api/tasks/:taskId`       | Read an owned task                        |
| `PATCH`, `DELETE`        | `/api/tasks/:taskId`       | Update or delete an owned task            |

List endpoints support pagination (`page`, `limit`); projects also support
`search`, and tasks support `status` and `projectId`. JSON errors include an
error code/message and request ID. Task `status` values are `todo`,
`in-progress`, `done`, and `cancelled`; priorities are `low`, `medium`,
`high`, and `urgent`. Projects use `active`, `paused`, or `completed` status
values. Project deletion is a soft archive.
Completing a task records `completedAt`; moving it out of `done` clears that
timestamp. Meaningful project/task mutations also append an activity event.
The user response includes completed-task, completed-project, and
weekly-activity metrics. The API does not expose arbitrary database queries.

## Verification and CI

Run the same mandatory gates locally:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

GitHub Actions starts a disposable PostgreSQL 16 service, generates Prisma,
applies all committed migrations with `prisma migrate deploy`, verifies that
the migration state is clean, and runs every gate above. The audit is
blocking: high- and critical-severity advisories fail CI; there is no
`continue-on-error` security bypass. CI uses only ephemeral test data and
example Supabase configuration; it does not test authenticated production
flows.

## Current limitations

- A real Supabase project and access token are required for authenticated
  development and end-to-end testing; the CI token-free tests cover only
  health and authentication rejection behavior.
- The UI has a demo mode when Supabase browser settings are absent. It does
  not provide a local identity provider.
- “AI career system” and analytics are currently product/UI foundations:
  there is no AI provider integration, background job system, or persisted
  points/streak calculation yet.
- The API has no versioned contract/OpenAPI document, refresh-token endpoint,
  role administration, or realtime subscriptions. Project deletion is a soft
  archive; task deletion is permanent.
- Production deployment, secret management, backups, migrations, and
  observability must be supplied by the hosting environment. Never use the CI
  database URL or example Supabase URL for production.
