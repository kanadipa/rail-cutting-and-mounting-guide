# Decisions

## Mounting order
Computed once, at import. The import loads every GLB with three.js in Node, places it with the lib's
`placeComponent` and measures its real bounding box. I don't sort by pose position: model origins differ
per article (`-1K2/2` has its origin elsewhere), so sorting by origin puts a module before its base unit.
Rules: left to right by the box's left edge. When two parts share a stretch of rail (≥ 50% overlap), the
one nearer the rail goes first and the other clips onto it. A marker carrier goes on after the last part
of its BMK group (`-XE` is the final step of -U2) and clips onto the part under it. A pure function, tested
on the real data. A bad plan fails at a desk, not at the bench.

## UX
- **One action per screen, sized for the bench:** 64 px main action, 44–78 px BMK
  and cut length, 15 px body. Done is the big pill; the way back is a smaller warm-grey button beside it,
  "Take off -XD1:4/1", and the only way back. Green confirms work, navy moves you somewhere, vermilion is
  the thing to do now, teal a part that clips onto another part.
- **Fixed cut order.** The cut screen always shows the next rail in the bar plan, and the operator can't
  pick another. The pieces lie along the bar in that order, so each cut is measured from the bar's end and
  the remnant stays one piece. Cutting out of order breaks the planned offsets.
- **The header counts parts, not rails.** A rail counts nothing until its last part is on, so "0 of 2
  rails" hides real progress. "31 of 71 parts" shows it.
- **Choosing a rail.** Any cut rail can be opened; uncut rails are locked. "Next" marks the rail in
  progress, else the first cut rail waiting, in cut order. It is a suggestion, not a queue. Opening the app
  lands on the rail in progress, and a finished rail offers the next one directly, so the page is mostly
  for switching rails.
- **3D rotates only where a part's direction matters** (mounting). A rail profile looks the same along its
  whole length, so the cut view stays fixed and only adds a whole-bar view.
- **"Where" in shop words:** "Next to -XD1:4/1 · 64 mm from left end", "Clip onto -2K1/2", and an amber
  "Leave 50 mm free, then at 230 mm" at a gap, the likeliest mistake on -U2.
- **Mark the cut piece.** -U1 and -U2 differ by 13 mm. The cut step asks to deburr and write the BMK on the
  piece, as a reminder note ("Before you put it in the tray") above the same tap as "Done". Nothing in it is
  tappable, so it cannot be ticked off without doing the work.
- **Identical parts:** "Take 10 · this is 1 of 10" saves trips to the shelf. Each part is still confirmed.
- **Double taps:** disabled while saving; the next step ignores taps for 600 ms.
- **Only what is saved is shown.** No optimistic updates; if the network drops, a banner keeps the last
  saved step. Every step is saved, so reopening lands on the rail in progress.
- EN/DE, because the operators are in Germany.

## Data model
PostgreSQL (Docker). NestJS + Prisma: a layered API (controller → service → repository) with typed
queries and real migrations, so adding benches, operators or a planner view means adding a module, not
reworking what exists. `articles` (the catalog), `cabinets` → `rails` → `placed_items` (with
the computed `mount_seq`, x-range, gap and the part it clips onto), `rail_progress` (one row per rail: cut or
not, how many parts mounted) and `work_events` (append-only history). `rails.part_count` is set at import.
Status is derived, never stored. BMKs are unique per cabinet, not globally. CHECK constraints keep
impossible states out, e.g. parts mounted on an uncut rail. `operator_id` columns on `rail_progress`
and `work_events` are ready for later: nothing writes them yet, because there is no login (trusted bench
network). Progress is compare-and-set (`{from: 12, to: 13}`): a retry is a no-op and a stale screen gets a 409
instead of moving progress backwards. Events are only written when state changes.
Scale: queries are scoped to one cabinet and one rail, all indexed. A rail holds a few hundred parts at
most, so loading one stays bounded. The import is batched in chunks, one transaction, and measures each
article's model once. The heavy traffic is the 3D files: static, cacheable.

## Not built, on purpose
- **Skipping a part:** parts sit flush, so a skipped part can't go in later without taking others off.
- **Undoing a confirmed cut.** It can't be undone on the bench, because the piece is already cut and taken
  off the bar. The risk is a mis-tap before cutting. I accepted it because the reminder and the 600 ms tap
  lock sit before that button. A wrong cut is fixed with `npm run seed:reset`.
- Scan confirmation, offline mode, operators/login, a planner dashboard.

## Found in the data
-1K1/2 and -1K2/2 are drawn on the same stretch of -U1 (133 and 132 mm), and -6K1/2 reaches 1.8 mm past its
right end. The import stores both as a `plan_warning` on the part; the mount screen shows an amber line on
that step ("Plan check: overlaps -1K2/2. Ask the planner before mounting.") and does not block.

## Assumptions, and what changes if they are wrong
- **Kerf is 0 mm** (`KERF_MM`). With a 3 mm saw, every piece after the first starts 3 mm later on the bar,
  the remnant shrinks 3 mm per cut, and a piece that no longer fits moves to a new bar. Only the cutting
  plan changes: set `KERF_MM` and import again. The screens read offsets and remnants from the API.
- **Positions are mm from the rail's left end.** If Vetaion measures from the right, only the where-line
  wording changes ("from right end"). The mount order stays the same.
- **Cut order follows the bar plan** (see UX).
- **Trusted bench network, no login.** `operator_id` columns are ready; claiming rails is the next step.
- **Screen:** iPad Pro 13" landscape, works from 1024×768 to 1920×1080.
- **English default,** German one tap away.
- Models and pictures come from a static middleware in the Vite dev server (immutable, cached a year).
  There is no production build yet.

## Questions I would ask Vetaion
- What is the kerf of your saw?
- Are off-cuts (remnants) reused, and from which length?
- Are positions on the drawing measured from the left end?
- Do several benches work on one cabinet at the same time?

## Next steps
- Offline queue with sync; operators and rail claiming for several benches.
- Planner view of import problems; barcode confirmation.
- Re-cutting a ruined piece, with the bar plan updated (piece taken from the remnant or a new bar) and kerf
  from Vetaion's saw.
- Kerf and remnant reuse, once I know Vetaion's numbers.
- Serve assets from the API or a CDN instead of the Vite middleware.

## Changes to the lib
None. The screens use `lib/core` and `useGlb` with their own fixed-view canvas; rotation is a toggle.

## AI tools
Claude for requirements, system design and reviewing the design. Google AI Studio (Gemini) for brainstorming
requirements and UI mockups. Claude Code for implementation and testing.
