# Deployment Guide — Proof of Work OS

This guide covers the deployment of Proof of Work OS (Express API + React SPA + PostgreSQL database via Prisma + Supabase Auth).

---

## 1. Target Architecture

```
                    ┌─────────────────────────┐
                    │  Static Host / CDN      │
                    │  (Cloudflare Pages /    │
                    │   Vercel / Netlify)     │
                    │   React 19 + Vite SPA   │
                    └────────────┬────────────┘
                                 │
                     HTTPS API   │
                     Requests    │
                                 ▼
                    ┌─────────────────────────┐
                    │  API Service (Railway)  │
                    │  Node.js 20+ / Express  │
                    │  Helmet + CORS + Proxy  │
                    └────────────┬────────────┘
                                 │
                     Database    │
                     Connection  │
                                 ▼
                    ┌─────────────────────────┐
                    │  PostgreSQL 16+         │
                    │  Managed DB / Supabase  │
                    │  Pooler (Transaction)   │
                    └─────────────────────────┘
```

---

## 2. Environment Variables

### Server (`server/`)

| Variable               |  Required   |    Default     | Description                                                                                                  |
| :--------------------- | :---------: | :------------: | :----------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`             |     Yes     |  `production`  | Set to `production` in live environments. Enforces CORS and DB checks.                                       |
| `PORT`                 |     No      |     `4000`     | Port on which Express listens. Platform port injection is supported.                                         |
| `DATABASE_URL`         |     Yes     |       —        | PostgreSQL connection string with transaction pooler or direct URI.                                          |
| `SUPABASE_URL`         |     Yes     |       —        | Remote Supabase project URL (used for JWT remote JWKS validation).                                           |
| `CORS_ORIGIN`          | Yes in prod |       —        | Explicit allowed frontend origins (e.g. `https://app.proofofwork.os`). Must be explicitly set in production. |
| `RATE_LIMIT_WINDOW_MS` |     No      |    `900000`    | Sliding rate limit window (15 minutes = 900,000 ms).                                                         |
| `RATE_LIMIT_MAX`       |     No      |     `100`      | Maximum requests allowed per window per IP (excluding health probes).                                        |
| `BODY_LIMIT`           |     No      |    `100kb`     | Maximum incoming JSON payload size.                                                                          |
| `TRUST_PROXY`          |     No      |      `0`       | Number of upstream reverse proxies to trust (e.g. `1` for Railway/Fly).                                      |
| `APP_TIMEZONE`         |     No      | `Asia/Jakarta` | IANA timezone used for weekly aggregation and streak boundaries.                                             |

### Client (`client/`)

| Variable                 | Required in prod | Description                                                                                                                                   |
| :----------------------- | :--------------: | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`           |       Yes        | Base URL of the deployed API (e.g. `https://api.proofofwork.os/api`). If omitted in production, the app renders a configuration error screen. |
| `VITE_SUPABASE_URL`      |       Yes        | Public Supabase project URL for authentication.                                                                                               |
| `VITE_SUPABASE_ANON_KEY` |       Yes        | Public Supabase anonymous client key.                                                                                                         |

---

## 3. Deployment Steps

### Step 1: Database Provisioning & Migrations

Run database migrations before starting or switching traffic to new API instances:

```bash
# Apply all pending migrations sequentially
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

> **Note on Connection Pooling**: When connecting through PgBouncer or Supabase transaction pooling, use `pgbouncer=true` in `DATABASE_URL`. For migrations that require DDL locks, configure `directUrl` pointing directly to port 5432.

### Step 2: Deploy Backend API

1. Configure environment variables in the host dashboard (Railway, Render, or Fly.io).
2. Build and start command:
   ```bash
   npm --workspace server start
   ```
3. Set health check probe path:
   - **Liveness probe**: `GET /api/ping` (returns `200` with `{ status: "ok", requestId: "..." }`)
   - **Readiness probe**: `GET /api/ready` (queries `SELECT 1` on PostgreSQL; returns `200` on success or `503 SERVICE_UNAVAILABLE` if database is down)

### Step 3: Deploy Client Frontend

1. Configure client environment variables in the static host (Vercel, Cloudflare Pages, or Netlify).
2. Build command:
   ```bash
   npm --workspace client run build
   ```
3. Output directory: `client/dist`.
4. Configure SPA fallback rule: redirect all unknown routes (`/*`) to `/index.html` with status `200`.

---

## 4. Health Probes & Readiness Checks

| Endpoint         | Auth | Purpose                            | Success Response                 | Failure Response          |
| :--------------- | :--: | :--------------------------------- | :------------------------------- | :------------------------ |
| `GET /api/ping`  | None | Process liveness check             | `200 OK` `{ "status": "ok" }`    | Process unresponsive      |
| `GET /api/ready` | None | Database connectivity verification | `200 OK` `{ "status": "ready" }` | `503 SERVICE_UNAVAILABLE` |

Health probes are excluded from express-rate-limit to prevent false-positive downtime alerts from monitoring services.

---

## 5. Security & Operational Hardening

- **Helmet Security Headers**: Strict-Transport-Security, X-Content-Type-Options, Frameguard, and X-XSS-Protection enabled by default.
- **Strict CORS**: Origin whitelist enforced; wildcard `*` disallowed in production.
- **Payload Limits**: Strict JSON body limit (100 KB default) prevents memory exhaustion.
- **No Secret Leakage**: `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are strictly server-side environment variables and are never bundled, returned in JSON errors, or logged.
- **Safe Protocols**: Client only generates clickable links for `http://` and `https://` URLs; dangerous protocols (`javascript:`, `data:`, `file:`, `ftp:`) are rendered as plain text.

---

## 6. Rollback Procedures

### Application Rollback

To revert to a previous working commit:

```bash
# Revert commit on the release branch
git revert <commit-sha>
git push origin feat/proof-foundation
```

### Database Migration Rollback

If a migration needs to be reversed:

1. Never edit applied historical migrations (`0001_init`, `0002_harden_task_lifecycle`, `0003_evidence_domain`, `0004_task_showcase_profile`).
2. Write a compensating down-migration using standard SQL and deploy using `prisma migrate deploy`.
