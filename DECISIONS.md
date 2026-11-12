# Decisions

## Mounting order
The order is computed once, when the plan is imported. The seed script loads every GLB with three.js in
Node, places it with the lib's `placeComponent` and measures its real bounding box. I don't sort by the
pose position, because model origins differ per article: base unit `-1K2/2` has its origin in a different
spot than the other base units, so sorting by origin puts a module before its base unit.
Rules: left to right by the box's left edge. When two parts share a stretch of rail (≥ 50% overlap), the
one nearer the rail goes first and the other clips onto it. A marker carrier goes on after the last part
of its BMK group (`-XE` labels every `-XE:…`, so it is the final step of -U2) and clips onto the part under
it. The rule is a pure function with tests on the real data. Computing it at import means a bad plan
fails at a desk, not at the bench.

## UX
- **One action per screen, readable from a metre away.** Huge BMK and length, one large Done button
  bottom right. Back is smaller and further away. Green confirms work, navy moves you somewhere.
- **"Where" in shop words:** "Next to -XD1:4/1 · 64 mm from left end", "Clip onto -2K1/2", and an amber
  "Leave 50 mm free, then at 230 mm" where the plan has a gap. On -U2 that gap is the most likely place for a mistake.
- **Mark the cut piece.** -U1 and -U2 differ by 13 mm. The cut step asks to deburr and write the BMK
  on the piece, confirmed with the same tap as "Done".
- **Identical parts:** "Take 10 · this is 1 of 10" saves trips to the shelf. Each part is still confirmed.
- **Double taps:** the button is disabled while saving and the next step ignores taps for 600 ms.
  Otherwise the second tap lands on the next part.
- **The screen only shows what is saved.** No optimistic updates. If the network drops, a banner stays up
  with the last saved step. This is not an offline app.
- **Resume anywhere.** Every step is saved; reopening lands on the rail in progress.
- EN/DE, because the operators are in Germany.

## Data model
PostgreSQL (Docker), NestJS, Prisma. `articles` (the catalog), `cabinets` → `rails` → `placed_items`
(with the computed `mount_seq`, x-range, gap and the part it clips onto), `rail_progress` (one row per
rail: cut or not, how many parts mounted) and `work_events` (append-only history). Rail status is derived,
never stored. BMKs are unique per cabinet, not globally. CHECK constraints keep impossible states out,
e.g. parts mounted on an uncut rail.
Progress updates are compare-and-set (`{from: 12, to: 13}`): a retry is a no-op and a stale screen gets a
409 instead of moving progress backwards. Events are only written when state changes.
Scale: queries are scoped to one cabinet and one rail, all indexed. A rail physically holds a few hundred
parts at most, so loading a whole rail stays bounded. The heavy traffic is the 3D files, served as static,
cacheable assets. The seed is safe to re-run.

## Not built, on purpose
- **Skipping a part:** parts sit flush, so a skipped part can't go in later without taking others off.
- Scan confirmation, a real offline mode, operators/login (trusted bench network; columns are ready),
  a planner dashboard.

## Found in the data
-1K1/2 and -1K2/2 are drawn on the same stretch of -U1 (133 and 132 mm), and -6K1/2 reaches 1.8 mm past its
right end. The import stores both as a `plan_warning` on the part; the mount screen shows an amber line on
that step ("Plan check: overlaps -1K2/2. Ask the planner before mounting.") and does not block.

## Assumptions
- Kerf is 0 mm (one constant, `KERF_MM`); the remnant shown follows from it.
- Positions are measured in mm from the rail's left end.
- English is the default language; German is one tap away and remembered.
- The screen is an iPad Pro 13" in landscape (works from 1024×768 to 1920×1080, stacks in portrait).

## Next steps
Offline queue with sync, operators and rail claiming for several benches, planner view of import
problems, barcode confirmation, kerf and remnant reuse once I know Vetaion's numbers.

## Changes to the lib
None. The screens use `lib/core` and `useGlb` with their own fixed-view canvas; rotation is a toggle.

## AI tools
Claude for requirements, system design and reviewing the design. Gemini for brainstorming requirements
and UI mockups. Fable for implementation, working from a written brief. <!-- adjust -->
