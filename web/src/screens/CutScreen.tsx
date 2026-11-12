import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { RailSummary } from "../api/types";
import { useCabinetContext } from "../app/CabinetLayout";
import { paths } from "../app/landing";
import { Button } from "../components/Button";
import { SaveButton } from "../components/SaveButton";
import { useI18n } from "../i18n/I18nProvider";
import { useSave } from "../save/useSave";
import { useTapLock } from "../save/useTapLock";
import { BarCutView } from "../three/BarCutView";
import styles from "./Cut.module.css";

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

  // Undo is for a Done tapped by mistake, so it is only sent while nothing is mounted on the rail.
  const reverse = useSave({
    cabinetId: cabinet.id,
    lastSaved,
    save: (rail: RailSummary) => api.undoCut(cabinet.id, rail.id),
  });

  const barOf = (railId: number | undefined) =>
    cabinet.bars.find((candidate) => candidate.pieces.some((piece) => piece.railId === railId)) ?? cabinet.bars[0];
  const bar = barOf(current?.id);
  const saving = cut.pending || reverse.pending;

  return (
    <div className={styles.screen}>
      <section className={styles.list} aria-label={t.cut.listTitle}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>{t.cut.listTitle}</h2>
          <span className={styles.counter}>{t.cut.listCount(cutIds.size, rails.length)}</span>
        </div>
        {rails.map((rail) => {
          const isCut = rail.status !== "TO_CUT";
          const isCurrent = rail.id === current?.id;
          return (
            <article key={rail.id} className={`${styles.card} ${isCurrent ? styles.cardCurrent : ""} ${isCut ? styles.cardDone : ""}`}>
              <div className={styles.cardTop}>
                <span className={`bmk ${styles.cardBmk}`}>{rail.bmk}</span>
                <span className={styles.cardState}>{isCut ? t.cut.cut : isCurrent ? t.cut.current : t.cut.toCut}</span>
              </div>
              <span className={styles.cardLength}>{mm(rail.cutLengthMm)}</span>
              {isCut && (
                <div className={styles.cardActions}>
                  {rail.mountedCount > 0 ? (
                    <>
                      {/* Parts are on the rail: it comes apart step by step, not with one tap. */}
                      <Button tone="quiet" aria-disabled="true" aria-describedby={`undo-blocked-${rail.id}`} onClick={() => undefined}>
                        {t.cut.undo}
                      </Button>
                      <p id={`undo-blocked-${rail.id}`} className={styles.undoBlocked}>
                        {t.cut.undoBlocked}
                      </p>
                    </>
                  ) : (
                    <Button tone="quiet" disabled={saving} title={t.cut.undoHint} onClick={() => reverse.save(rail)}>
                      {t.cut.undo}
                    </Button>
                  )}
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
            <span className={`bmk ${styles.heroLength}`}>
              {current.cutLengthMm}
              <span className={styles.heroUnit}>mm</span>
            </span>
            {current.profile && <span className={styles.heroProfile}>{t.cut.profile(current.profile.replace("X", "×"))}</span>}
          </div>
          <div className={styles.view}>
            {bar && (
              <BarCutView
                glbUrl={current.glbUrl}
                bar={bar}
                currentRailId={current.id}
                cutRailIds={cutIds}
                labels={{ cutAt: (at) => t.cut.cutAt(mm(at)), mm }}
              />
            )}
            {bar && <Legend barNumber={bar.barIndex + 1} barLength={mm(bar.barLengthMm)} />}
          </div>
          {/* A reminder, not a checklist: nothing here is tapped. */}
          <div className={styles.dock} role="note">
            <span className={styles.dockLabel}>{t.cut.before}</span>
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
          </div>
          {cut.failed && <p className={styles.problem}>{t.save.failed}</p>}
          <SaveButton tone="confirm" primary pending={cut.pending} retrying={cut.retrying} disabled={reverse.pending} isLocked={isLocked} onTap={() => cut.save(current.id)}>
            {t.cut.done(current.bmk)}
          </SaveButton>
        </section>
      ) : (
        <section className={styles.work}>
          <div className={styles.summary}>
            <h1 className={styles.summaryTitle}>{t.cut.allCut}</h1>
            {bar && <p className={styles.summaryRemnant}>{t.cut.allCutRemnant(mm(bar.remnantMm))}</p>}
          </div>
          <div className={styles.view}>
            {bar && rails[0] && (
              <BarCutView glbUrl={rails[0].glbUrl} bar={bar} currentRailId={null} cutRailIds={cutIds} labels={{ cutAt: (at) => t.cut.cutAt(mm(at)), mm }} />
            )}
          </div>
          <Button tone="go" primary disabled={saving} onClick={() => !isLocked() && navigate(paths.rails(cabinet.id))}>
            {t.cut.startMounting} →
          </Button>
        </section>
      )}

    </div>
  );

  function Legend({ barNumber, barLength }: { barNumber: number; barLength: string }) {
    return (
      <div className={styles.legend} aria-hidden="true">
        <span>
          {t.cut.fromBar(barNumber)} · {barLength}
        </span>
        <span className={styles.legendNow}>{t.cut.legendNow}</span>
        <span className={styles.legendCut}>{t.cut.legendCut}</span>
        <span className={styles.legendRest}>{t.cut.legendRest}</span>
      </div>
    );
  }
}
