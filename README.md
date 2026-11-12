# Rail cutting & mounting guide

A touchscreen guide for a cabinet workbench, in two steps: **cut** every rail from the raw bar, then
**mount** its parts one at a time, left to right. The screens say what to take, what it looks like and
where it goes, in 3D on the rail itself. English and German.

> Confidential: the challenge, its data and the 3D models are provided by Vetaion GmbH for this application
> only. Do not publish or share them.

- **The task as given:** [TASK.md](TASK.md) (the original challenge text).
- **Decisions, data model and next steps:** [DECISIONS.md](DECISIONS.md).
- **Background:** [docs/](docs/) (cabinets, the data model, the 3D lib).

## Run

**Requirements:** Node.js 20.11 or newer, Docker (for PostgreSQL), a browser with WebGL. No accounts, no secrets.

```bash
docker compose up -d     # PostgreSQL on port 54329
npm run setup            # install, create .env, migrate, import the job from data/
npm run dev              # API and operator app together
npm test                 # all tests (needs the database running)
```

- Operator app: **http://localhost:5173** (it opens on the step where the job stands).
- API: http://localhost:3000/api (health: `/api/health`).
- `npm run typecheck` checks all three packages.
- `npm run seed:reset` imports the job again and **deletes its progress**. `npm run setup` is safe to repeat:
  an imported job and its progress are left alone.
- `npm run demo` starts the lib's original reference demo (not part of the solution).
- Ports and the database address are in `.env` (created from `.env.example`). If you change
  `POSTGRES_PORT`, change it in the two database URLs too.

## Layout

```
server/   NestJS + Prisma API. src/domain holds the pure rules (mount order, cutting plan, gaps,
          grouping); prisma/ has the schema, migrations and the import (npm run setup runs it)
web/      the operator app (Vite + React, uses lib/), tests with Vitest
lib/      the 3D toolkit as delivered (unchanged)
data/ assets/ docs/ tests/   as delivered
```

`/assets` (3D models and pictures) is served by the Vite dev server; there is no production build yet.
