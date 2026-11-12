import type { Dictionary } from "./en";

export const de: Dictionary = {
  locale: "de-DE",
  appTitle: "Schienen-Assistent",
  loading: "Lädt…",
  tabCut: (done, total) => `Sägen ${done}/${total}`,
  tabMount: (done, total) => `Bestücken ${done}/${total}`,
  language: "Sprache",

  status: {
    TO_CUT: "Zu sägen",
    READY: "Bereit zum Bestücken",
    IN_PROGRESS: "In Arbeit",
    DONE: "Fertig",
  },

  cut: {
    listTitle: "Schienen sägen",
    toCut: "Zu sägen",
    current: "Aktuell",
    cut: "Gesägt ✓",
    undo: "Rückgängig",
    wentWrong: "Schnitt misslungen",
    profile: (profile) => `TS ${profile}`,
    fromBar: (bar) => `Stange ${bar}`,
    barLeft: (length) => `${length} Rest`,
    stepDeburr: "Beide Enden entgraten",
    stepMark: (bmk) => `${bmk} auf das Stück schreiben`,
    done: (bmk) => `Entgratet und mit ${bmk} beschriftet · Fertig`,
    allCut: "Alle Schienen gesägt",
    allCutRemnant: (length) => `${length} Rest an der Stange`,
    startMounting: "Bestücken starten",
  },

  picker: {
    title: "Schiene wählen",
    cutFirst: "Erst sägen",
    parts: (mounted, total) => `${mounted} / ${total}`,
    next: "Als Nächstes",
  },

  mount: {
    rails: "Schienen",
    wholeRail: "Ganze Schiene",
    closeUp: "Nahansicht",
    first: (at) => `Erstes Teil · ${at} vom linken Ende`,
    nextTo: (bmk, at) => `Neben ${bmk} · ${at} vom linken Ende`,
    afterGap: (gap, at) => `${gap} frei lassen, dann bei ${at}`,
    clipOnto: (bmk) => `Auf ${bmk} stecken`,
    carrier: (bmk) => `Oben auf ${bmk} rasten`,
    carrierLabels: (from, to) => (from === to ? `beschriftet ${from}` : `beschriftet ${from} … ${to}`),
    take: (size, index) => `${size} Stück nehmen · dies ist ${index} von ${size}`,
    warnOverlap: (bmk) => `Plan prüfen: überlappt ${bmk}. Vor dem Montieren die Planung fragen.`,
    warnPastEnd: "Plan prüfen: ragt über das Schienenende. Vor dem Montieren die Planung fragen.",
    back: "Zurück",
    done: "Fertig",
    finish: (bmk) => `${bmk} montiert · Schiene abschließen`,
    notCut: (bmk) => `${bmk} ist noch nicht gesägt.`,
    goCut: "Zum Sägen",
    stale: "Der Fortschritt wurde an einem anderen Bildschirm geändert.",
    noModel: "Keine 3D-Ansicht für dieses Teil",
  },

  railDone: {
    title: (bmk) => `✓ ${bmk} fertig`,
    next: (bmk) => `Weiter: ${bmk}`,
    cutNext: "Nächste Schiene sägen",
    finishJob: "Auftrag abschließen",
    choose: "Andere Schiene wählen",
    backToLast: "Zurück zum letzten Teil",
  },

  jobDone: {
    title: "✓ Auftrag fertig",
    summary: (rails, parts) => `${rails} Schienen gesägt und bestückt · ${parts} Teile`,
    overview: "Schienen anzeigen",
  },

  save: {
    saving: "Speichert…",
    retrying: "Nicht gespeichert · neuer Versuch",
    failed: "Nicht gespeichert. Noch einmal tippen.",
  },

  connection: {
    lost: "Keine Verbindung.",
    lastSaved: (what) => `Zuletzt gespeichert: ${what}.`,
    keepRail: "Schiene so lassen, wie sie ist.",
    savedPart: (count, total) => `Teil ${count} von ${total}`,
    savedNothing: (bmk) => `noch nichts auf ${bmk} montiert`,
    savedCut: (done, total) => `${done} von ${total} Schienen gesägt`,
  },

  confirm: {
    reset: (bmk, count) =>
      `Auf ${bmk} ${count === 1 ? "ist 1 Teil" : `sind ${count} Teile`} montiert. Abnehmen und neu sägen?`,
    yes: "Ja, neu sägen",
    no: "Nein, so lassen",
  },

  notFound: {
    cabinet: (id) => `Schrank ${id} nicht gefunden. Auftragsnummer prüfen.`,
    rail: "Schiene nicht gefunden.",
    page: "Seite nicht gefunden.",
    noJob: "Kein Auftrag geladen. Zuerst den Import ausführen.",
    back: "Zurück zum Start",
    backToRails: "Zurück zu den Schienen",
  },

  mm: (value) => `${value} mm`,
};
