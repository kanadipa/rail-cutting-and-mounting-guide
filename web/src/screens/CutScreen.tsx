import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { RailSummary } from "../api/types";
import { useCabinetContext } from "../app/CabinetLayout";
import { paths } from "../app/landing";
import { BarStrip } from "../components/BarStrip";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SaveButton } from "../components/SaveButton";
import { useI18n } from "../i18n/I18nProvider";
import { useResetConfirmation } from "../save/useResetConfirmation";
import { useSave } from "../save/useSave";
import { useTapLock } from "../save/useTapLock";
import { CutPieceView } from "../three/CutPieceView";
import styles from "./Cut.module.css";

/** Taking a cut back: a mistaken tap (undo) or a ruined piece (re-cut). */
interface Reversal {
  rail: RailSummary;
  kind: "undo" | "recut";
  confirmReset: boolean;
}

/** Step 1: cut every rail from the bar, in the planned order, one at a time. */
export function CutScreen() {
  const { t, mm } = useI18n();
  const cabinet = useCabinetContext();
  const navigate = useNavigate();
  const rails = cabinet.rails;
  const current = rails.find((rail) => rail.status === "TO_CUT") ?? null;
  const cutIds = new Set(rails.filter((rail) => rail.status !== "TO_CUT").map((rail) => rail.id));
  const lastSaved = t.connection.savedCut(cutIds.size, rails.length);
  const isLocked = useTapLock(current?.id ?? "all-cut");

  const cut = useSave({ cabinetId: cabinet.id, lastSaved, save: (railId: number) => api.markCut(cabinet.id, railId) });

  const reset = useResetConfirmation<Reversal>();
  const reverse = useSave({
    cabinetId: cabinet.id,
    lastSaved,
    save: ({ rail, kind, confirmReset }: Reversal) =>
      kind === "undo" ? api.undoCut(cabinet.id, rail.id, confirmReset) : api.recut(cabinet.id, rail.id, confirmReset),
    onRejected: (error, request) => void reset.askIfRequired(error, request),
  });

  const bar = cabinet.bars.find((candidate) => candidate.pieces.some((piece) => piece.railId === current?.id)) ?? cabinet.bars[0];
  const saving = cut.pending || reverse.pending;

  return (
    <div className={styles.screen}>
      <section className={styles.list} aria-label={t.cut.listTitle}>
        <h2 className={styles.listTitle}>{t.cut.listTitle}</h2>
        {rails.map((rail) => {
          const isCut = rail.status !== "TO_CUT";
          const isCurrent = rail.id === current?.id;
          return (
            <article key={rail.id} className={`${styles.card} ${isCurrent ? styles.cardCurrent : ""} ${isCut ? styles.cardDone : ""}`}>
              <div className={styles.cardTop}>
                <span className={`bmk ${styles.cardBmk}`}>{rail.bmk}</span>
                <span className={styles.cardLength}>{mm(rail.cutLengthMm)}</span>
              </div>
              <span className={styles.cardState}>{isCut ? t.cut.cut : isCurrent ? t.cut.current : t.cut.toCut}</span>
              {isCut && (
                <div className={styles.cardActions}>
                  <Button tone="quiet" disabled={saving} onClick={() => reverse.save({ rail, kind: "undo", confirmReset: false })}>
                    {t.cut.undo}
                  </Button>
                  <Button tone="quiet" disabled={saving} onClick={() => reverse.save({ rail, kind: "recut", confirmReset: false })}>
                    {t.cut.wentWrong}
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {current ? (
        <section className={styles.work}>
          <div className={styles.hero}>
            <h1 className={`bmk ${styles.heroBmk}`}>{current.bmk}</h1>
            <span className={styles.heroLength}>{mm(current.cutLengthMm)}</span>
            {current.profile && <span className={styles.heroProfile}>{t.cut.profile(current.profile.replace("X", "×"))}</span>}
          </div>
          <div className={styles.view}>
            <CutPieceView glbUrl={current.glbUrl} cutLengthMm={current.cutLengthMm} barLengthMm={current.barLengthMm} />
          </div>
          {bar && <BarStrip bar={bar} currentRailId={current.id} cutRailIds={cutIds} />}
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber}>1</span>
              {t.cut.stepDeburr}
            </li>
            <li>
              <span className={styles.stepNumber}>2</span>
              {t.cut.stepMark(current.bmk)}
            </li>
          </ol>
          {cut.failed && <p className={styles.problem}>{t.save.failed}</p>}
          <div className={styles.action}>
            <SaveButton tone="confirm" primary pending={cut.pending} retrying={cut.retrying} disabled={reverse.pending} isLocked={isLocked} onTap={() => cut.save(current.id)}>
              {t.cut.done(current.bmk)}
            </SaveButton>
          </div>
        </section>
      ) : (
        <section className={styles.work}>
          <div className={styles.summary}>
            <h1 className={styles.summaryTitle}>{t.cut.allCut}</h1>
            {bar && <p className={styles.summaryRemnant}>{t.cut.allCutRemnant(mm(bar.remnantMm))}</p>}
          </div>
          {bar && <BarStrip bar={bar} currentRailId={null} cutRailIds={cutIds} />}
          <div className={styles.action}>
            <Button tone="go" primary disabled={saving} onClick={() => !isLocked() && navigate(paths.rails(cabinet.id))}>
              {t.cut.startMounting}
            </Button>
          </div>
        </section>
      )}

      {reset.pending && (
        <ConfirmDialog
          question={t.confirm.reset(reset.pending.request.rail.bmk, reset.pending.mountedCount)}
          yes={t.confirm.yes}
          no={t.confirm.no}
          onNo={reset.clear}
          onYes={() => {
            reverse.save({ ...reset.pending!.request, confirmReset: true });
            reset.clear();
          }}
        />
      )}
    </div>
  );
}
