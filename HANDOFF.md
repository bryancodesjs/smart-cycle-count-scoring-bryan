# Smart Cycle Count Scoring — Session Handoff

> **For the next Cursor session:** read this file first, then continue from **Current blocker** and **Next actions**. Do not re-scaffold the project. Prefer small, incremental changes guided by the user.

**Project path:** `C:\Users\PC\Documents\GitHub\smart-cycle-count-scoring-bryan`  
**Last updated:** 2026-09-17 (end of session — user shutting down for the day)  
**Plan file (do not edit unless asked):** Cursor plan “Smart Cycle Count Scoring — Project Plan”

---

## Product summary

Internal warehouse web app for **cycle-count prioritization by risk score**.

- Users: warehouse management teams auditing inventory daily  
- Hierarchy: **Warehouse → Aisles → Racks → Bins** (user-defined N × N × N at setup)  
- Bins hold **up to 4 pallets**; move allowed only if target has a free slot (`occupiedCount < 4`)  
- Risk score: **0 (green / low) → 100 (red / high)**  
- No authentication  
- Landing page: **Dashboard** (`/`)

**Clarifications locked in (override original prompt wording where they conflict):**

1. Score range is **0–100**, not 0–10  
2. “Empty bin” for moves means **has capacity**, not necessarily zero pallets  

Original product brief (verbatim + clarifications appendix): [`apps/web/PROMPT.md`](apps/web/PROMPT.md)

---

## Tech stack

| Layer | Tech |
| --- | --- |
| UI | Next.js (App Router), Tailwind CSS v4, shadcn/ui |
| BFF / proxy | Next.js `app/api/*` → Nest on `:3001` |
| API | NestJS |
| ORM / DB | Prisma 6 + Postgres (Supabase) |
| Local DB option | `docker-compose.yml` (Postgres 16) — Docker was **not** available on the build machine |

---

## Repo layout

```
smart-cycle-count-scoring-bryan/
├── README.md                 # Quick start
├── HANDOFF.md                # This file
├── docker-compose.yml        # Optional local Postgres
├── package.json              # Root scripts only (no npm workspaces)
├── apps/
│   ├── web/                  # Next.js UI + proxy + PROMPT.md
│   └── api/                  # NestJS + Prisma + seed
```

Root scripts (from repo root):

```bash
npm run dev:web
npm run dev:api
npm run build:web
npm run build:api
npm run prisma:generate --prefix apps/api
npm run prisma:migrate --prefix apps/api
npm run seed --prefix apps/api
```

Each app has its **own** `node_modules` (workspaces were removed after hoisting broke Next builds).

---

## Plan by stages

### Stage 1 — Next.js base structure — DONE

- Monorepo folder created  
- `apps/web` scaffolded (Next.js 16, TypeScript, Tailwind v4, ESLint, `src/`)  
- shadcn/ui initialized (radix-nova); components added: button, card, input, label, badge, sheet, dialog, select, separator, scroll-area, tooltip  
- [`apps/web/PROMPT.md`](apps/web/PROMPT.md) saved  
- Routes: `/` dashboard, `/setup`, `/bins/[id]`  
- Domain types / constants in `apps/web/src/lib/domain.ts`  
- `apps/api` Nest shell created (expanded in Stage 3)

### Stage 2 — Dashboard UI (hardcoded / local) — DONE

- Responsive aisle → rack → bin grid with risk coloring  
- Risk legend; bin sheet with pallets + move UI (capacity 4)  
- Warehouse setup form  
- Local demo warehouse + `localStorage` via `WarehouseProvider`  
- Falls back to **LOCAL** when API is unavailable; shows **LIVE** when API responds  

Key UI files:

- `apps/web/src/components/dashboard-view.tsx`  
- `apps/web/src/components/warehouse-grid.tsx`  
- `apps/web/src/components/bin-detail-sheet.tsx`  
- `apps/web/src/components/setup-view.tsx`  
- `apps/web/src/components/warehouse-provider.tsx`  
- `apps/web/src/lib/warehouse.ts` (demo fixture + local move)  
- `apps/web/src/lib/risk.ts` (client-side score + color helpers)

### Stage 3 — NestJS API + Prisma + seed + proxy — CODE DONE; DB CONNECT STILL BLOCKED

Implemented:

- Prisma schema: Warehouse, Aisle, Rack, Bin, Pallet  
- Migration SQL: `apps/api/prisma/migrations/20260317000000_init/`  
- Seed: `apps/api/prisma/seed.ts` (demo layout + pallets + computed scores)  
- Endpoints:
  - `GET /warehouses/current`
  - `POST /warehouses`
  - `GET /bins/:id`
  - `POST /pallets/move` `{ palletId, targetBinId }`
- Scoring: `apps/api/src/scoring/risk-score.ts` (+ unit tests passing)  
- Next proxy routes:
  - `apps/web/src/app/api/warehouses/current/route.ts`
  - `apps/web/src/app/api/warehouses/route.ts`
  - `apps/web/src/app/api/pallets/move/route.ts`
- Env examples: `apps/api/.env.example`, `apps/web/.env.example` / `.env.local`  
- Builds verified: `apps/api` nest build OK; `apps/web` next build OK  

### Research — risk weights (v1) — DONE

Documented in `PROMPT.md` appendix and code:

```
riskScore = round(clamp(0, 100,
  0.45 * daysSinceCheckedScore +   // 0–30 days → 0–100
  0.35 * recentMovementScore +     // 0–10 moves in 7d → 0–100
  0.20 * occupancyScore            // palletCount / 4 * 100
))
```

Later factors (not in v1): discrepancy history, ABC/value, adjustments, location complexity, shrink/returns, operational criticality.

---

## Current blocker (where we stopped)

### Prisma migrate → Supabase P1001

User’s `apps/api/.env` was using the **direct** connection:

```text
postgresql://postgres:***@db.rqqvhztyspiznsrkdnsk.supabase.co:5432/postgres
```

That host resolves to **IPv6 only** on this project. The user’s network could not reach it → **P1001 Can’t reach database server**.

**Fix already explained to user (not yet confirmed working):**

1. Supabase Dashboard → **Connect** → use **Session pooler** (port **5432**)  
2. User format: `postgres.<project-ref>` (e.g. `postgres.rqqvhztyspiznsrkdnsk`)  
3. Host like: `aws-0-<region>.pooler.supabase.com`  
4. URL-encode special chars in password  
5. Set as `DATABASE_URL` in `apps/api/.env`  
6. Re-run:

```powershell
npm run prisma:migrate --prefix apps/api
npm run seed --prefix apps/api
```

See updated guidance in [`apps/api/.env.example`](apps/api/.env.example).

**Until migrate + seed succeed:** UI works in **LOCAL** mode with demo data; Nest API cannot talk to Postgres.

---

## What’s left / next actions (pick up here)

### 1. Unblock database (immediate)

- [ ] User updates `apps/api/.env` to Session pooler URI  
- [ ] Confirm connectivity: `npm run prisma:migrate --prefix apps/api`  
- [ ] Run seed: `npm run seed --prefix apps/api`  
- [ ] Start API + web; confirm dashboard badge shows **LIVE** and data matches seed  

If pooler still fails: check project not paused, password encoding, correct region host from dashboard; or enable Supabase IPv4 add-on / use local `docker compose up -d` with local `DATABASE_URL`.

### 2. Smoke-test live flows

- [ ] Setup page creates warehouse via `POST /warehouses` (replaces existing)  
- [ ] Move pallet respects capacity 4; risk scores refresh  
- [ ] Bin detail page `/bins/[id]` with live IDs  

### 3. Likely polish (user-guided; do not invent large scope)

- [ ] UI tweaks to grid / risk colors / mobile layout  
- [ ] Mark bin as “checked” (update `lastCheckedAt` + recompute score) — not built yet  
- [ ] Expand scoring factors beyond v1  
- [ ] Deploy (Vercel web + hosted API) — out of scope until asked  
- [ ] Quiet Prisma deprecation warning about `package.json#prisma` seed config (optional `prisma.config.ts`; stay on Prisma 6 unless intentionally upgrading)

### 4. Do not redo

- Do not re-run `create-next-app` / Nest scaffold from scratch  
- Do not reintroduce npm workspaces without fixing Next dependency resolution  
- Do not switch to Prisma 7 without adapters / `prisma.config.ts` (Prisma 7 was attempted then downgraded to 6 on purpose)  
- Do not edit the Cursor plan file unless the user asks  

---

## How the app behaves today

```mermaid
flowchart TD
  Browser --> NextWeb["apps/web"]
  NextWeb -->|"fetch /api/*"| Proxy["Next route handlers"]
  Proxy -->|"API_BASE_URL default :3001"| Nest["apps/api"]
  Nest --> Prisma --> Supabase["Supabase Postgres"]
  NextWeb -->|"API 503 / unreachable"| Local["localStorage + demo warehouse"]
```

- `WarehouseProvider` tries `GET /api/warehouses/current` first  
- On failure → demo / localStorage warehouse (`source: "local"`)  
- Moves/setup try API first when `source === "api"`, else local helpers  

---

## Environment checklist

| File | Purpose |
| --- | --- |
| `apps/api/.env` | `DATABASE_URL`, `PORT=3001` (gitignored) |
| `apps/api/.env.example` | Pooler-first docs |
| `apps/web/.env.local` | `API_BASE_URL=http://localhost:3001` |

---

## Verification already done this session

- Risk unit tests: **2 passed** (`apps/api/src/scoring/risk-score.spec.ts`)  
- `npm run build` in `apps/api`: success  
- `npm run build` in `apps/web`: success (after removing nested `.git`, fixing turbopack root, installing `picocolors`, dropping workspaces)  
- Nested `apps/web/.git` removed; git repo initialized at **monorepo root**  

---

## Suggested first message for next session

> Continue from `HANDOFF.md`. Help me finish Supabase Session pooler `DATABASE_URL`, run migrate + seed, then verify LIVE dashboard and pallet moves against the API.

---

## Working agreement (from original plan)

Build progressively; user continues to guide tweaks. Prefer completing the DB unblock and live smoke tests before new features.
