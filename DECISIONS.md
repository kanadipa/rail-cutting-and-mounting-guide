# Decisions

## Mounting order
Computed once, at import: each GLB is loaded in Node, placed with `placeComponent` and measured. Model
origins differ per article, so I don't sort by pose position. Left to right by the box's left edge. Parts
on the same stretch: the nearer one first, the other clips onto it. A marker carrier goes after the last
part of its BMK group. A pure function, tested on real data. The lib is unchanged.

## UX
- **One action per screen:** a 64 px Done button. Green confirms, navy moves you, vermilion is the thing to
  do now, teal clips onto another part. "Take off -XD1:4/1" is the only way back.
- **Fixed cut order.** The cut screen always shows the next rail in the bar plan. The pieces lie along the
  bar in that order, so each cut is measured from the bar's end and the remnant stays one piece.
- **The header counts parts, not rails.** A rail counts nothing until its last part is on, so "0 of 2
  rails" hides real progress. "31 of 71 parts" shows it.
- **Choosing a rail.** Any cut rail opens; uncut rails are locked. "Next" marks the rail in progress, else
  the first cut one waiting. It is a suggestion, not a queue. The app opens on the rail in progress and a
  finished rail offers the next, so the page is mostly for switching.
- **3D rotates only where a part's direction matters.** A rail profile looks the same along its length, so
  the cut view is fixed, with a whole-bar view.
- **Shop words:** "64 mm from left end", and an amber "Leave 50 mm free" at a gap.
- **Mark the cut piece.** -U1 and -U2 differ by 13 mm, so a reminder asks to write the BMK on it.
- **Only what is saved is shown.** No optimistic updates. A banner keeps the last saved step if the network
  drops.

## Data model
PostgreSQL. NestJS + Prisma: a layered API (controller → service → repository) with typed queries and real
migrations, so benches, operators or a planner view mean a new module, not a rework. Tables: `articles`,
`cabinets` → `rails` → `placed_items`, `rail_progress`, `work_events`. `rails.part_count` is set at import.
BMKs are unique per cabinet. Progress is compare-and-set (`{from: 12, to: 13}`): a retry does nothing, a
stale screen gets a 409. The import is one transaction, batched in chunks.

## Found in the data
-1K1/2 and -1K2/2 overlap on -U1; -6K1/2 reaches 1.8 mm past its rail end. Both show as plan warnings.

## Not built, on purpose
- Skipping a part: parts sit flush, so it can't go in later.
- **Undoing a confirmed cut.** The piece is already cut and off the bar. The risk is a mis-tap before
  cutting. I accepted it: the reminder and the 600 ms tap lock sit before that button. Fix it with `npm run seed:reset`.
- Scan confirmation, offline mode, login, a planner dashboard.

## Assumptions, and what changes if they are wrong
- **Kerf 0 mm** (`KERF_MM`). With a 3 mm saw, each piece after the first starts 3 mm later, the remnant
  shrinks 3 mm per cut, and a piece that no longer fits moves to a new bar. Only the cutting plan changes:
  set `KERF_MM`, import again.
- **Positions are mm from the left end.** From the right, only the where-line wording changes.
- **Cut order follows the bar plan** (see UX).
- **Trusted bench network, no login.** `operator_id` columns are ready; claiming rails is next.
- **Screen:** iPad Pro 13" landscape, 1024×768 to 1920×1080. English default, German one tap away.

## Questions I would ask Vetaion
- What is the kerf of your saw?
- Are off-cuts (remnants) reused, and from which length?
- Are positions on the drawing measured from the left end?
- Do several benches work on one cabinet at the same time?

## Next steps
- Offline queue with sync; operators and rail claiming; barcode confirmation.
- Re-cutting a ruined piece, with the bar plan updated; remnant reuse.
- Serve assets from the API or a CDN, not the Vite middleware.

## AI tools
Claude for requirements, system design and reviewing the design. Google AI Studio (Gemini) for brainstorming
requirements and UI mockups. Claude Code for implementation and testing.
