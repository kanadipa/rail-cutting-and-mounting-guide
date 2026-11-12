/** English texts. `de.ts` must have exactly the same keys; the compiler checks it. */
export const en = {
  locale: "en-GB",
  appTitle: "Rail guide",
  loading: "Loading…",
  tabCut: (done: number, total: number) => `Cut ${done}/${total}`,
  tabMount: (done: number, total: number) => `Mount ${done}/${total}`,
  language: "Language",

  status: {
    TO_CUT: "To cut",
    READY: "Ready to mount",
    IN_PROGRESS: "In progress",
    DONE: "Done",
  },

  cut: {
    listTitle: "Rails to cut",
    toCut: "To cut",
    current: "Current",
    cut: "Cut ✓",
    undo: "Undo",
    wentWrong: "Cut went wrong",
    profile: (profile: string) => `TS ${profile}`,
    fromBar: (bar: number) => `Bar ${bar}`,
    barLeft: (length: string) => `${length} left`,
    stepDeburr: "Deburr both ends",
    stepMark: (bmk: string) => `Write ${bmk} on the piece`,
    done: (bmk: string) => `Deburred and marked ${bmk} · Done`,
    allCut: "All rails cut",
    allCutRemnant: (length: string) => `${length} left on the bar`,
    startMounting: "Start mounting",
  },

  picker: {
    title: "Choose a rail",
    cutFirst: "Cut first",
    parts: (mounted: number, total: number) => `${mounted} / ${total}`,
    next: "Next",
  },

  mount: {
    rails: "Rails",
    wholeRail: "Whole rail",
    closeUp: "Close-up",
    first: (at: string) => `First part · ${at} from left end`,
    nextTo: (bmk: string, at: string) => `Next to ${bmk} · ${at} from left end`,
    afterGap: (gap: string, at: string) => `Leave ${gap} free, then at ${at}`,
    clipOnto: (bmk: string) => `Clip onto ${bmk}`,
    carrier: (bmk: string) => `Clip on top of ${bmk}`,
    carrierLabels: (from: string, to: string) => (from === to ? `labels ${from}` : `labels ${from} … ${to}`),
    take: (size: number, index: number) => `Take ${size} · this is ${index} of ${size}`,
    warnOverlap: (bmk: string) => `Plan check: overlaps ${bmk}. Ask the planner before mounting.`,
    warnPastEnd: "Plan check: reaches past the rail end. Ask the planner before mounting.",
    back: "Back",
    done: "Done",
    finish: (bmk: string) => `Mounted ${bmk} · Finish rail`,
    notCut: (bmk: string) => `${bmk} is not cut yet.`,
    goCut: "Go to cutting",
    stale: "Progress was updated on another screen.",
    rotate: "Rotate 3D",
    lockView: "Front view",
  },

  railDone: {
    title: (bmk: string) => `✓ ${bmk} done`,
    next: (bmk: string) => `Next: ${bmk}`,
    cutNext: "Cut the next rail",
    finishJob: "Finish job",
    choose: "Choose another rail",
    backToLast: "Back to last part",
  },

  jobDone: {
    title: "✓ Job done",
    summary: (rails: number, parts: number) => `${rails} rails cut and mounted · ${parts} parts`,
    overview: "Show rails",
  },

  save: {
    saving: "Saving…",
    retrying: "Not saved · retrying",
    failed: "Not saved. Tap again.",
  },

  connection: {
    lost: "No connection.",
    lastSaved: (what: string) => `Last saved: ${what}.`,
    keepRail: "Keep the rail as it is.",
    savedPart: (count: number, total: number) => `part ${count} of ${total}`,
    savedNothing: (bmk: string) => `nothing mounted on ${bmk} yet`,
    savedCut: (done: number, total: number) => `${done} of ${total} rails cut`,
  },

  confirm: {
    reset: (bmk: string, count: number) =>
      `${bmk} has ${count} ${count === 1 ? "part" : "parts"} mounted. Take them off and re-cut?`,
    yes: "Yes, re-cut",
    no: "No, keep it",
  },

  notFound: {
    cabinet: (id: string) => `Cabinet ${id} not found. Check the job number.`,
    rail: "Rail not found.",
    page: "Page not found.",
    noJob: "No job loaded. Run the import first.",
    back: "Back to start",
    backToRails: "Back to rails",
  },

  mm: (value: string) => `${value} mm`,
};

export type Dictionary = typeof en;
