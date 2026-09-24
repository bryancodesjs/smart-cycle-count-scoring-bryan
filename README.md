# Smart Cycle Count Scoring

Warehouse cycle-count risk scoring MVP: heatmap dashboard, audit plans, and mobile count flow.

**Stack:** Next.js (`apps/web`) · NestJS + Prisma (`apps/api`) · Postgres

---

## Prerequisites

- Node.js 20+
- Docker (for local Postgres)

---

## Install, seed, and run

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Configure environment

```bash
# API
cp apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` in `apps/api/.env` to the local Docker database:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_cycle_count
PORT=3001
```

```bash
# Web (BFF → API)
cp apps/web/.env.example apps/web/.env.local
```

`apps/web/.env.local` should contain:

```env
API_BASE_URL=http://localhost:3001
```

### 3. Install dependencies

```bash
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..
```

### 4. Migrate and seed

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Seed creates ~30 bins, demo pallets, ~1 month of putaway / pick / adjust / move activity, and initial risk scores.

### 5. Run the app

In two terminals (from repo root):

```bash
npm run dev:api   # API → http://localhost:3001
npm run dev:web   # UI  → http://localhost:3000
```

Open **http://localhost:3000**

| Page | What it does |
| --- | --- |
| `/` | Heatmap dashboard — click a bin for score breakdown; **Recompute scores** |
| `/audit` | Create Top N audit plan + task list |
| `/count` | Mobile count flow — search bin, enter qty, Pass/Fail |

---

## Scoring factors

Each bin gets a **risk score from 0–100** (green → yellow → red). Higher = audit sooner.

Factors are scored 0–100 individually, then combined with fixed weights:

| Factor | Weight | How it scales |
| --- | --- | --- |
| Days since last audited | **35%** | 0 → 100 over 0–30 days unchecked |
| Activity (putaway + pick + move) | **25%** | 0 → 100 over 0–8 events in the last 30 days |
| Adjustments | **15%** | 0 → 100 over 0–3 adjustments in the last 30 days |
| Occupancy | **15%** | `(pallets / capacity)` × 100 (capacity = 4) |
| Last audit failed | **10%** | 100 after FAIL until a later PASS |

**Combined score:**

```
score =
  0.35 × daysSinceChecked
+ 0.25 × activity
+ 0.15 × adjustment
+ 0.15 × occupancy
+ 0.10 × failedAudit
```

Factor scores are stored on each bin and shown in the bin drawer / detail (“why this score”).  
Implementation: `apps/api/src/scoring/risk-score.ts`
