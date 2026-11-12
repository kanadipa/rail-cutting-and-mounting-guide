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
npm run test:unit        # no database needed
```

- Operator app: **http://localhost:5173** (it opens on the step where the job stands). `npm run dev` prints
  this address and the API's in one block. If 5173 is busy it stops with "Port 5173 is already in use"
  instead of choosing another port.
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

## When something goes wrong

- **The screen only shows what the server confirmed.** Done disables at the tap and the next part appears
  only after the save is answered. "Saving…" appears only if that takes longer than 150 ms.
- **No connection:** the same save is sent again with growing pauses (up to 8 s), and the screen says
  "Not saved · retrying". A banner names the last saved step ("Last saved: part 12 of 25. Keep the rail as
  it is."). A repeated step does nothing the second time (compare-and-set), so retrying is harmless.
- **The server refuses:** a refusal is never retried. The API answers with a stable error code
  (`STALE_PROGRESS`, `RAIL_NOT_CUT`, `INVALID_STEP`, `NOT_FOUND`, `DATABASE_UNAVAILABLE`, …). The screen turns the
  code into its own short wording, in the chosen language, and never shows the server's text.
- **Another screen moved the rail on:** the screen says so and reloads the real state.
- **Unknown cabinet or rail:** a plain "not found" page with a way back.
- **Server side:** every progress change writes one structured log line (request id, what was asked, what
  happened). A database outage is a 503. `/api/health` answers only when the database does; the screen uses it to know saving works again.
