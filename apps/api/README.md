# API (`apps/api`)

NestJS + Prisma REST API for Smart Cycle Count Scoring.

## Setup

1. Copy `.env.example` to `.env`.
2. Point `DATABASE_URL` at Supabase Postgres **or** local Docker:

```bash
# from repo root
docker compose up -d
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_cycle_count
```

3. Generate client, migrate, seed:

```bash
npm run prisma:generate -w api
npm run prisma:migrate -w api
npm run seed -w api
npm run start:dev -w api
```

Listens on `http://localhost:3001`.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/warehouses/current` | Latest warehouse tree with bins/pallets |
| POST | `/warehouses` | Replace with a new empty warehouse layout |
| GET | `/bins/:id` | Single bin detail |
| POST | `/pallets/move` | `{ palletId, targetBinId }` (capacity 4) |
