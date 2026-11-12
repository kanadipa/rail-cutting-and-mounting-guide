# Decisions

## Mounting order
Computed once, at import: each GLB is loaded in Node, placed with `placeComponent` and measured. Model
origins differ per article, so I don't sort by pose position. Left to right by the box's left edge. Parts
on the same stretch: the nearer one first, the other clips onto it. A marker carrier goes after the last
part of its BMK group. A pure function, tested on real data. The lib is unchanged.

## UX
- **Fixed cut order.** The cut screen always shows the next rail in the bar plan. The pieces lie along the
  bar in that order, so each cut is measured from the bar's end and the remnant stays one piece.
- **The header counts parts, not rails.** A rail counts nothing until its last part is on, so "0 of 2
  rails" hides real progress. "31 of 71 parts" shows it.
- **Choosing a rail.** Any cut rail opens; uncut rails are locked. "Next" marks the rail in progress, else
  the first cut one waiting. It is a suggestion, not a queue. The app opens on the rail in progress and a
  finished rail offers the next, so the page is mostly for switching.
- **3D rotates only where a part's direction matters.** A rail profile looks the same along its length, so
  the cut view is fixed.
- **Shop words:** "64 mm from left end", "Clip onto -2K1/2".
- **Mark the cut piece.** -U1 and -U2 differ by 13 mm, so the Done button says it: "Deburred and marked -U1".
- **Out of the way while mounting.** One part: BMK, name, article number, photo, where it goes. The strip
  names two parts before and three after; the rest are ticks. Poses show only as "mm from left end".

## Beyond the brief
Not needed to meet the requirements. Each has a reason.
- **Progress survives a reload** (optional in the task): operators stop mid-rail and come back.
- **Saving on a flaky network:** only confirmed state is shown. Retries with backoff, a banner with the last
  saved step, a 600 ms tap lock against double taps, a 409 for a stale screen.
- **Bar plan:** a whole-bar view with the remnant shows what is left.
- **Gap hint,** "Leave 50 mm free": -U2 has 57 mm of empty rail, the likeliest wrong placement.
- **Plan warnings** for parts that overlap or overhang, shown on their step.
- **The part alone in 3D,** to turn, to check the part in hand.
- **English and German:** the operators are in Germany.
- **Opens on the step where the job stands,** after a break or on another tablet.
- **A log line per change;** `/api/health` answers only when the database does.

## Look
Calm, like a machine's panel. A warm grey frame (#E8E5DD) around an ivory work area (#F5F4EF), softer than
white under shop lights. Colour only means something: vermilion for what to do now, navy for moving
somewhere, green for done, teal for parts that clip onto another, amber for a warning. BMKs and measurements
are in Chivo Mono, so -XD1:4 and 64 mm look like the label and the drawing. Everything else is Space Grotesk.

## Data model
PostgreSQL. NestJS + Prisma: a layered API (controller → service → repository) with typed queries and real
migrations, so benches, operators or a planner view mean a new module, not a rework. `articles` is the
catalog. `cabinets` → `rails` → `placed_items` is the plan, written at import; BMKs are unique per cabinet.
`rail_progress` is apart from `rails` because it changes on every tap and the plan never does. `work_events`
is an append-only audit trail. `rails.part_count` is set at import, so nothing counts rows. Progress is
compare-and-set (`{from: 12, to: 13}`). A cabinet view takes 4 queries and a rail view 7, each by primary key
or the unique `(rail_id, mount_seq)` and `(cabinet_id, cut_order)` indexes. A mount step is 4 statements in
one transaction.

## Found in the data
-1K1/2 and -1K2/2 overlap on -U1. -6K1/2 reaches 1.8 mm past its rail end.

## Not built, on purpose
- Skipping a part: parts sit flush, so it can't go in later.
- **Undoing a confirmed cut.** The piece is already cut and off the bar. The risk is a mis-tap before
  cutting. I accepted it: the button wording and the 600 ms tap lock guard that tap. A wrong cut is fixed
  with `npm run seed:reset`.
- Scan confirmation, offline mode, login, a planner dashboard.

## Assumptions, and what changes if they are wrong
- **Kerf 0 mm** (`KERF_MM`). With a 3 mm saw, each piece after the first starts 3 mm later, the remnant
  shrinks 3 mm per cut, and a piece that no longer fits moves to a new bar. Only the cutting plan changes:
  set `KERF_MM`, import again.
- **Positions are mm from the left end.** From the right, only the where-line wording changes.
- **Cut order follows the bar plan** (see UX).
- **Trusted bench network, no login.** `operator_id` columns are ready; claiming rails is next.
- **Screen:** iPad Pro 13" landscape, 1024×768 to 1920×1080.

## Questions I would ask Vetaion
What is the kerf of your saw? Are off-cuts (remnants) reused, and from which length? Are positions on the
drawing measured from the left end? Do several benches work on one cabinet at the same time?

## Next steps
Offline queue with sync. Operators and rail claiming. Barcode confirmation. Re-cutting a ruined piece with
the bar plan updated, and remnant reuse. Assets from the API or a CDN, not the Vite middleware.

## AI tools
Claude for requirements, system design and reviewing the design. Google AI Studio (Gemini) for brainstorming
requirements and UI mockups. Claude Code for implementation and testing.
