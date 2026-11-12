import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { RailSummary } from "../api/types";
import { useCabinetContext } from "../app/CabinetLayout";
import { paths } from "../app/landing";
import { Button } from "../components/Button";
import { SaveButton } from "../components/SaveButton";
import { IconButton, ViewKeys } from "../components/ViewKeys";
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
  /** Off: the stretch around the piece to cut. On: the whole raw bar with every piece and the remnant. */
  const [wholeBar, setWholeBar] = useState(false);

  const cut = useSave({ cabinetId: cabinet.id, lastSaved, save: (railId: number) => api.markCut(cabinet.id, railId) });

  const barOf = (railId: number | undefined) =>
    cabinet.bars.find((candidate) => candidate.pieces.some((piece) => piece.railId === railId)) ?? cabinet.bars[0];
  const bar = barOf(current?.id);
  const saving = cut.pending;

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
                glbUrl={bar.glbUrl}
                bar={bar}
                currentRailId={current.id}
                cutRailIds={cutIds}
                wholeBar={wholeBar}
                labels={{ cutAt: (at) => t.cut.cutAt(mm(at)), mm }}
              />
            )}
            <ViewKeys label={t.cut.wholeBar}>
              <IconButton label={t.cut.wholeBar} pressed={wholeBar} onClick={() => setWholeBar((on) => !on)}>
                {wholeBar ? (
                  // Whole bar: a long bar cut into pieces.
                  <>
                    <path d="M2 12h20" />
                    <path d="M2 8v8M9 8v8M14 8v8M22 8v8" />
                  </>
                ) : (
                  // Around the piece: one stretch inside a frame.
                  <>
                    <path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" />
                    <path d="M9 12h6" />
                  </>
                )}
              </IconButton>
            </ViewKeys>
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
          <SaveButton tone="confirm" primary pending={cut.pending} retrying={cut.retrying} isLocked={isLocked} onTap={() => cut.save(current.id)}>
            {t.cut.done(current.bmk)}
          </SaveButton>
        </section>
      ) : (
        <section className={styles.work}>
          <div className={styles.summary}>
            <h1 className={styles.summaryTitle}>{t.cut.allCut}</h1>
            {cabinet.bars.length === 1 && <p className={styles.summaryRemnant}>{t.cut.allCutRemnant(mm(cabinet.bars[0].remnantMm))}</p>}
            {cabinet.bars.length > 1 && (
              <p className={styles.summaryRemnant}>
                {cabinet.bars.map((each) => `${t.cut.fromBar(each.barIndex + 1)}: ${t.cut.allCutRemnant(mm(each.remnantMm))}`).join(" · ")}
              </p>
            )}
          </div>
          {/* Every bar, each drawn with the model of its own article. */}
          {cabinet.bars.map((each) => (
            <div key={`${each.articleId}/${each.barIndex}`} className={styles.view}>
              <BarCutView glbUrl={each.glbUrl} bar={each} currentRailId={null} cutRailIds={cutIds} labels={{ cutAt: (at) => t.cut.cutAt(mm(at)), mm }} />
            </div>
          ))}
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
