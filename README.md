# Smart Cycle Count Scoring — Bryan

Monorepo for a warehouse cycle-count risk scoring app (Next.js + NestJS + Prisma + Postgres).

## Structure

- `apps/web` — Next.js UI (shadcn + Tailwind) with BFF proxy routes
- `apps/api` — NestJS REST API + Prisma → Postgres

## Quick start (local Postgres via Docker)

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_cycle_count

cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..

npm run prisma:generate
npm run prisma:migrate
npm run seed

npm run dev:api   # :3001
npm run dev:web   # :3000
```

Open http://localhost:3000 — dashboard loads from the API when available; otherwise falls back to a local demo warehouse.

## MVP flows

1. **Heatmap dashboard (`/`)** — color-coded bins (green → red by risk). Click a bin for score, factor breakdown (“why”), pallets, and moves.
2. **Recompute scores** — dashboard button calls `POST /scores/recompute` and refreshes the map.
3. **Audit plan (`/audit`)** — create Top N risky bins as tasks (`PENDING` / `DONE`).
4. **Count flow (`/count`)** — mobile-friendly: search or scan bin code, review expected pallets, enter counted qty, mark Pass/Fail (updates `lastCheckedAt` + last result + recomputes that bin; completes matching plan task when present).

## Risk score (v1)

`0` green → `100` red:

| Factor | Weight | Scale |
| --- | --- | --- |
| Days since last audited | 35% | 0→100 over 0–30 days |
| Putaway / pick / move | 25% | 0→100 over 0–8 events in 30 days |
| Adjustments | 15% | 0→100 over 0–3 adjusts in 30 days |
| Occupancy | 15% | pallets / capacity (4) × 100 |
| Last audit failed | 10% | 100 after FAIL until a later PASS |

Factor scores are persisted on each bin and shown in the bin drawer / detail page.

See `apps/api/src/scoring/risk-score.ts` and `apps/web/PROMPT.md`.

## API (Nest)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/warehouses/current` | Warehouse tree + scores |
| POST | `/warehouses` | Replace warehouse layout |
| GET | `/bins/:id` | Bin detail + breakdown |
| POST | `/pallets/move` | Move pallet |
| POST | `/scores/recompute` | Recompute all bin scores |
| POST | `/audit-plans` | Create Top N plan |
| GET | `/audit-plans/current` | Latest plan + tasks |
| GET | `/audits/bins/:code` | Lookup bin for count flow |
| POST | `/audits/count` | Record count + pass/fail |

## Seed

`npm run seed` creates ~30 bins (3×2×5), demo pallets, ~last-month inventory activities (putaway / pick / adjust / move), and computed risk scores.
