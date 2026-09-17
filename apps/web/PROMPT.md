# Product Prompt — Smart Cycle Count Scoring

> Hard copy of the original product brief (saved at Next.js project root per non-negotiable constraint).

---

We need to build a new project inside this "Github" folder. On a high-level definition, the deliverable will be a web app that helps warehouse management teams manage sections (Also known as "bins") inside the warehouse. Our target users are warehouse management teams who audit inventory every day. Currently they do not have any automation in place to actively monitor sections/bins, so they need to manually check all sections to count inventory, keep track of merchandize movement, bins availability and spot issues. With this app, we should help teams prioritize their audits by "risk score", helping them focus first on what really needs their attention. Each warehouse block/section/bin must have a score ranging from 0-10 where "0" is low-risk (green) and "100" is high-risk (red). Scoring is determined by a series of industry standard factors such as "last checked", and movement of pallets (merchandize) and such (I'll need your help researching what other risk factors could be considered, so mark this as a preliminary task).

Constraints:
1. No authentication is needed, this is a test project to be used purely internally
2. The dashboard should be the initial page where users land upon first access
3. The app should allow the user to create/set up a warehouse
4. A warehouse is just a collection of bins ("blocks", "sections")
5. A warehouse can contain N aisles (as defined by initial user setup)
6. Aisles can contain N racks (as defined by initial user setup)
7. Racks can contain N bins (as defined by initial user setup)
8. Bins can contain up to 4 pallets each
9. Pallets can be moved to any available Bin across all racks on any aisle as long as the target Bin is empty
10. Pallets cannot be moved to an occupied Bin
11. The dashboard (main view) should display a high-tech, yet minimal, grid of aisles, racks and bins

Desired tech stack:
1. Next.js will serve the UI and offer a proxy API to communicate with the backend (Nextjs)
2. Nestjs will be our API, which will interact with our Postgres Database (hosted on Supabase) using Prisma

Non-negotiable constraints:
1. Save a hard copy of this prompt as a markdown file on the root of the next.js project
2. Let's work in stages, DO NOT attempt to build everything at once. We'll plan the entire project but build progressively in this order: UI/Next.js base structure => Dashboard UI refinement and tweaks with hardcoded nodes => Once all UI elements are in place, we'll proceed with the Nest.js API + Supabase seed script. I'll continue providing guidance, tweaks and context along the way
3. Let's use Shadcn for all UI components
4. Let's use TailwindCSS
5. Next.js app needs to be fully responsive
6. Project will be called "smart-cycle-count-scoring-bryan"

---

## Clarifications (post-prompt)

1. **Risk score scale:** `0` (green / low risk) → `100` (red / high risk). The "0–10" wording in the original prompt was a mistake.
2. **Bin capacity / moves:** Bins hold up to **4 pallets**. A pallet may move to a target bin only if that bin has a free slot (`occupiedCount < 4`). "Empty" in the original prompt means "has available capacity," not necessarily zero pallets.

## Appendix — v1 risk score formula

See `apps/api/src/scoring/risk-score.ts` and Stage 3 docs. v1 uses weighted factors:

| Factor | Weight | Signal |
| --- | ---: | --- |
| Days since last checked | 45% | Linear 0→100 over 0–30 days |
| Recent movement (7d) | 35% | Linear 0→100 over 0–10 moves |
| Occupancy density | 20% | `(palletCount / 4) * 100` |

`riskScore = round(clamp(0, 100, 0.45*checked + 0.35*movement + 0.20*occupancy))`
