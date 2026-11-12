# Decisions

## Mounting order
Computed once, at import: each GLB is loaded in Node, placed with `placeComponent` and measured. Model
origins differ per article, so I don't sort by pose position. Left to right by the box's left edge. Parts
on the same stretch: the nearer one first, the other clips onto it. A marker carrier goes after the last
part of its BMK group. A pure function, tested on real data. The lib is unchanged.

## UX
- **Fixed cut order.** The cut screen always shows the next rail in the bar plan. The pieces lie along the
  bar in that order, so each cut is measured from the bar's end and the remnant stays one piece.
- **Mark the cut piece.** -U1 and -U2 differ by 13 mm, so Done says "Deburred and marked -U1".
- **The header counts parts, not rails.** A rail counts nothing until its last part is on, so "0 of 2
  rails" hides real progress. "31 of 71 parts" shows it.
- **Choosing a rail.** Any cut rail opens; uncut rails are locked. "Next" marks the rail in progress, else
  the first cut one waiting. It is a suggestion, not a queue. The app opens on the rail in progress and a
  finished rail offers the next. "Rails" in the corner of the 3D view switches at any part.
- **Back:** "← Take off -XD1:4/1" names the part to remove. It is the only way back: parts sit flush, so
  you take off the last one.
- **3D rotates only where a part's direction matters.** A rail profile looks the same along its length, so
  the cut view is fixed.
- **Shop words:** "64 mm from left end", "Clip onto -2K1/2".
- **Out of the way while mounting.** No coordinates or rotations, only "mm from left end". No full part
  list: the strip names two parts before and three after, the rest are ticks.

## Beyond the brief
Not needed to meet the requirements. Each has a reason.
- **Progress survives a reload** (optional in the task): operators stop mid-rail and come back.
- **Saving on a flaky network:** only confirmed state is shown. Retries with backoff, a banner with the last
  saved step, a 600 ms tap lock against double taps, a 409 for a stale screen.
- **Bar plan:** a whole-bar view with the remnant shows what is left.
- **Gap hint,** "Leave 50 mm free": -U2 has 57 mm of empty rail. **Plan warnings** for overlaps and overhangs.
- **The part alone in 3D,** to turn, to check the part in hand.
- **English and German**, for operators in Germany. **Opens where the job stands,** after a break.
- **A log line per change;** `/api/health` answers only when the database does.

## Look
Calm, like a machine's panel: a warm grey frame (#E8E5DD), an ivory work area (#F5F4EF). Accent colours only
mean something: vermilion = do now, navy = go, green = done, teal = clips onto another part, amber = warning.
BMKs and measurements in Chivo Mono, like the label and the drawing; the rest in Space Grotesk.

## Data model
PostgreSQL, NestJS + Prisma, layered (controller → service → repository): operators or a planner view are
a new module, not a rework. `articles` is the
catalog. `cabinets` → `rails` → `placed_items` is the plan, written at import. A rail's BMK is unique per
cabinet, a part's BMK per rail. `rail_progress` is apart from `rails` because it changes on every tap and
the plan never does. `work_events` is an append-only audit trail. `rails.part_count` is set at import, so
nothing counts rows. Progress is compare-and-set (`{from: 12, to: 13}`). A cabinet view takes 4 queries and
a rail view 7, each by primary key or the unique `(rail_id, mount_seq)` and `(cabinet_id, cut_order)`
indexes. A mount step is 4 statements in one transaction.

**Found in the data:** -1K1/2 and -1K2/2 overlap on -U1; -6K1/2 reaches 1.8 mm past its rail end.

## Not built, on purpose
- Skipping a part: parts sit flush, so it can't go in later.
- **Undoing a confirmed cut:** the piece is already off the bar. A mis-tap is the risk; the button wording
  and the 600 ms tap lock guard it, and `npm run seed:reset` fixes it.

## Assumptions, and what changes if they are wrong
- **Kerf 0 mm** (`KERF_MM`). With a 3 mm saw, each piece after the first starts 3 mm later and a piece that
  no longer fits moves to a new bar. Set `KERF_MM`, import again. Ask: what is your saw's kerf?
- **Remnants are not reused.** Ask: are off-cuts kept, and from which length?
- **Positions are mm from the left end.** Otherwise only the where-line wording changes. Ask: is that so?
- **One bench per cabinet, trusted network, no login.** `operator_id` columns are ready. Ask: do several
  benches work on one cabinet at the same time?
- **Screen:** iPad Pro 13" landscape, 1024×768 to 1920×1080.

## Next steps
- **Scale check:** import a synthetic job (500 rails, ~30,000 parts), time the import and queries.
- **Auth:** operator login at the bench, rails claimed by an operator, a planner role.
- **Monitoring:** JSON logs to a central store, error and latency metrics per route, an alert when saves
  fail or `/api/health` goes down.
- Offline queue with sync. Barcode confirmation. Re-cutting with the bar plan updated; remnant reuse. Assets
  from the API or a CDN.

## AI tools
Claude for requirements, system design and reviewing the design. Google AI Studio (Gemini) for brainstorming
requirements and UI mockups. Claude Code for implementation and testing.
