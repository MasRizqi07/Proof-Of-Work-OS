# Proof of Work OS

A full-stack Node.js + React developer performance tracking and AI career system.

## Workspace structure

- `server/` - Express API backend
- `client/` - React + Vite frontend

## Getting started

1. Install dependencies

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure `DATABASE_URL` and `SUPABASE_URL`. Copy `client/.env.example` to `client/.env` and configure the same Supabase project URL plus `VITE_SUPABASE_ANON_KEY`.

3. Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm --workspace server run prisma:seed
```

4. Start both apps in development

```bash
npm run dev
```

The backend runs on `http://localhost:4000` and the frontend on `http://localhost:5173`.

## Verification commands

```bash
npm run lint
npm run format:check
npm test
npm run build
```

The API requires a Supabase bearer token for `/api/*` routes other than `/api/ping`. PostgreSQL/Supabase connectivity and authenticated end-to-end flows must be validated with project-specific credentials; CI validates schema generation and application checks without connecting to production data.

## Features

- Task tracking and progress analytics
- User profile and performance insights
- AI-powered career coaching interface
