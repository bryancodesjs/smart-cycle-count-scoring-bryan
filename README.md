# Smart Cycle Count Scoring — Bryan

Monorepo for a warehouse cycle-count risk scoring app.

## Structure

- `apps/web` — Next.js UI (shadcn + Tailwind) with BFF proxy routes
- `apps/api` — NestJS REST API + Prisma → Postgres (Supabase or local)

## Quick start (local Postgres via Docker)

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL to:
# postgresql://postgres:postgres@localhost:5432/smart_cycle_count

npm install
npm run prisma:generate -w api
npm run prisma:migrate -w api
npm run seed -w api

npm run dev:api   # :3001
npm run dev:web   # :3000
```

Open http://localhost:3000 — dashboard loads from the API when available; otherwise falls back to a local demo warehouse.

## Risk score (v1)

`0` green → `100` red:

`0.45 * daysSinceChecked + 0.35 * recentMovement + 0.20 * occupancy`

See `apps/api/src/scoring/risk-score.ts` and `apps/web/PROMPT.md`.
