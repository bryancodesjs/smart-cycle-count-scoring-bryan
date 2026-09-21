# Session summary — PDF MVP + UX polish

## UI / UX fixes
- Compacted warehouse heatmap so aisles/racks fit above the fold
- Fixed Geist font wiring (`--font-sans` → `--font-geist-sans`)
- Bin detail sheet: click-to-select pallets (checkbox affordance), Actions section without redundant pallet select
- After move: reset selection/state + accessible success feedback

## PDF MVP features added

### Data / API
- Prisma: score factor fields, inventory activities, audit plans/tasks, last audit result
- Migrations applied; seed: 30 bins, pallets, activity history (picks remove stock)
- Endpoints: recompute scores, create/get audit plan, bin lookup, count pass/fail

### Scoring (activity-aware)
- Factors: days since audited, putaway/pick/move, adjustments, occupancy, last audit failed
- Persist + show factor breakdown (“why this score”)
- Dashboard **Recompute scores**

### Audit / count
- **Generate audit plan** (Top N) → `/audit` task table (PENDING/DONE)
- Mobile **Count** flow (`/count`): search or camera scan → qty → Pass/Fail → updates check date + score
- Nav links: Dashboard, Audit, Count, Setup
- Works LIVE (API) or LOCAL (localStorage fallback)

### Docs
- README updated with flows, scoring table, API list

## Commands run
```bash
npm run prisma:migrate
npm run seed
```
