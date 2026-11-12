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
- **One action per screen, sized by the bench design.** `assembly.html` sets the sizes: 64 px main action,
  44–78 px BMK and cut length, 15 px body text. Done is the big pill, Back a smaller warm-grey one beside it.
  Green confirms work, navy moves you somewhere, vermilion marks the thing to do now, teal a part that clips onto another part.
- **"Where" in shop words:** "Next to -XD1:4/1 · 64 mm from left end", "Clip onto -2K1/2", and an amber
  "Leave 50 mm free, then at 230 mm" where the plan has a gap. On -U2 that gap is the most likely place for a mistake.
- **Mark the cut piece.** -U1 and -U2 differ by 13 mm. The cut step asks to deburr and write the BMK
  on the piece, shown as a reminder note ("Before you put it in the tray") above the same tap as "Done".
  Nothing in it is tappable, so it cannot be ticked off without doing the work.
- **Identical parts:** "Take 10 · this is 1 of 10" saves trips to the shelf. Each part is still confirmed.
- **Double taps:** the button is disabled while saving and the next step ignores taps for 600 ms.
- **The screen only shows what is saved.** No optimistic updates; if the network drops, a banner keeps the
  last saved step. Every step is saved, so reopening lands on the rail in progress.
- EN/DE, because the operators are in Germany.

## Data model
PostgreSQL (Docker), NestJS, Prisma. `articles` (the catalog), `cabinets` → `rails` → `placed_items`
(with the computed `mount_seq`, x-range, gap and the part it clips onto), `rail_progress` (one row per
rail: cut or not, how many parts mounted) and `work_events` (append-only history). `rails.part_count` is set
at import. Rail status is derived, never stored. BMKs are unique per cabinet, not globally. CHECK
constraints keep impossible states out, e.g. parts mounted on an uncut rail. `operator_id` columns on
`rail_progress` and `work_events` are ready for later: nothing writes them yet, because there is no login
(trusted bench network).
Progress updates are compare-and-set (`{from: 12, to: 13}`): a retry is a no-op and a stale screen gets a
409 instead of moving progress backwards. Events are only written when state changes.
Scale: queries are scoped to one cabinet and one rail, all indexed. A rail holds a few hundred parts at
most, so loading one stays bounded. The import batches its writes (a fixed number of statements, one
transaction) and measures each article's model once. The heavy traffic is the 3D files: static, cacheable.

## Not built, on purpose
- **Skipping a part:** parts sit flush, so a skipped part can't go in later without taking others off.
- Undoing a cut with parts mounted: parts come off step by step, so no bulk reset. The server still refuses it.
- Scan confirmation, a real offline mode, operators/login, a planner dashboard.

## Found in the data
-1K1/2 and -1K2/2 are drawn on the same stretch of -U1 (133 and 132 mm), and -6K1/2 reaches 1.8 mm past its
right end. The import stores both as a `plan_warning` on the part; the mount screen shows an amber line on
that step ("Plan check: overlaps -1K2/2. Ask the planner before mounting.") and does not block.

## Assumptions
- Kerf is 0 mm (one constant, `KERF_MM`); the remnant shown follows from it.
- Positions are measured in mm from the rail's left end.
- English is the default language; German is one tap away and remembered.
- The screen is an iPad Pro 13" in landscape (works from 1024×768 to 1920×1080, stacks in portrait).
- The 3D models and pictures are served by a small static middleware in the Vite dev server (immutable,
  cached for a year). There is no production build yet.

## Next steps
Offline queue with sync, operators and rail claiming for several benches, planner view of import
problems, barcode confirmation, kerf and remnant reuse once I know Vetaion's numbers. Re-cutting a ruined
piece, with the bar plan updated (piece taken from the remnant or a new bar) and kerf from Vetaion's saw.
Serve assets from the API or a CDN in a production build instead of the Vite middleware.

## Changes to the lib
None. The screens use `lib/core` and `useGlb` with their own fixed-view canvas; rotation is a toggle.

## AI tools
Claude for requirements, system design and reviewing the design. G0ogle Studio for brainstorming requirements
and UI mockups. Claude Code for implementation and testing. 
