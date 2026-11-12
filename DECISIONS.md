# Decisions

## Mounting order
Computed once, at import: each GLB is loaded with three.js in Node, placed with `placeComponent` and
measured. Not sorted by pose position, because model origins differ per article (`-1K2/2`). Rules: left to
right by the box's left edge; parts sharing a stretch of rail (≥ 50% overlap) go nearer-first and the
other clips onto it; a marker carrier goes last in its BMK group. A pure function, tested on real data; a bad plan fails at import.

## UX
- **One action per screen, sized by the bench design** (`assembly.html`): 64 px main action, 15 px body.
  Green confirms work, navy moves you, vermilion is the thing to do now, teal clips onto another part.
  "Take off -XD1:4/1" is the only way back.
- **"Where" in shop words:** "Next to -XD1:4/1 · 64 mm from left end", "Clip onto -2K1/2", and an amber
  "Leave 50 mm free, then at 230 mm" at a gap, the likeliest mistake on -U2.
- **Mark the cut piece:** -U1 and -U2 differ by 13 mm. A reminder note asks to deburr and write the BMK;
  nothing in it is tappable.
- **Identical parts:** "Take 10 · this is 1 of 10". Each is still confirmed.
- **Double taps:** disabled while saving; the next step ignores taps for 600 ms.
- **Only what is saved is shown.** No optimistic updates; a banner keeps the last saved step if the
  network drops. Reopening lands on the rail in progress.
- EN/DE, because the operators are in Germany.

## Data model
PostgreSQL, NestJS, Prisma. `articles`, `cabinets` → `rails` → `placed_items`, `rail_progress` and
`work_events` (append-only). `rails.part_count` is set at import. Status is derived, never stored. BMKs are
unique per cabinet. CHECK constraints keep impossible states out. `operator_id` columns on `rail_progress`
and `work_events` are ready for later: nothing writes them yet, because there is no login (trusted bench
network). Progress is compare-and-set (`{from: 12, to: 13}`): a retry is a no-op, a stale screen gets a 409.
Scale: queries are scoped to one cabinet and one rail, all indexed. The import is batched in chunks, one
transaction, and measures each article's model once. The heavy traffic is the 3D files: static, cacheable.

## Not built, on purpose
- Skipping a part: parts sit flush, so it can't go in later.
- Undoing a confirmed cut: it is final, so bar plan and history stay consistent.
- Scan confirmation, offline mode, operators/login, a planner dashboard.

## Found in the data
-1K1/2 and -1K2/2 share a stretch of -U1; -6K1/2 reaches 1.8 mm past its rail end. Both are stored as a
`plan_warning` and shown as an amber line on the step, without blocking.

## Assumptions
- Kerf is 0 mm (`KERF_MM`); positions are mm from the rail's left end.
- English is the default; German is one tap away.
- An iPad Pro 13" in landscape (1024×768 to 1920×1080).
- Models and pictures come from a static middleware in the Vite dev server (immutable, cached a year).
  There is no production build yet.

## Next steps
- Offline queue with sync; operators and rail claiming for several benches.
- Planner view of import problems; barcode confirmation.
- Re-cutting a ruined piece, with the bar plan updated and kerf from Vetaion's saw.
- Kerf and remnant reuse, once I know Vetaion's numbers.
- Serve assets from the API or a CDN instead of the Vite middleware.

## Changes to the lib
None.

## AI tools
Claude for requirements, system design and reviewing the design. Google AI Studio (Gemini) for brainstorming
requirements and UI mockups. Claude Code for implementation and testing.
