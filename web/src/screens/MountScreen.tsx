import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, hasCode } from "../api/client";
import { keys } from "../api/queries";
import type { Rail } from "../api/types";
import { useCabinetContext } from "../app/CabinetLayout";
import { paths } from "../app/landing";
import { Message } from "../app/Message";
import { Button, LinkButton } from "../components/Button";
import { PositionStrip } from "../components/PositionStrip";
import { ProgressBar } from "../components/ProgressBar";
import { SaveButton } from "../components/SaveButton";
import { useI18n } from "../i18n/I18nProvider";
import { useSave } from "../save/useSave";
import { useTapLock } from "../save/useTapLock";
import { MountView } from "../three/MountView";
import styles from "./Mount.module.css";
import { PartCard } from "./PartCard";

interface Step {
  from: number;
  to: number;
}

/**
 * Step 2, the core screen: one part at a time. The part shown is always the next one the server
 * has not confirmed, so a reload, another tablet or a break all resume at the right part.
 */
export function MountScreen({ rail }: { rail: Rail }) {
  const { t } = useI18n();
  const cabinet = useCabinetContext();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [wholeRail, setWholeRail] = useState(false);
  const [stale, setStale] = useState(false);

  const mounted = rail.mountedCount;
  const total = rail.parts.length;
  const isLocked = useTapLock(mounted);

  const step = useSave({
    cabinetId: cabinet.id,
    lastSaved: mounted === 0 ? t.connection.savedNothing(rail.bmk) : t.connection.savedPart(mounted, total),
    save: ({ from, to }: Step) => api.step(cabinet.id, rail.id, from, to),
    onSaved: (progress) => {
      setStale(false);
      if (progress.status === "DONE") navigate(paths.railDone(cabinet.id, rail.id));
    },
    onRejected: (error) => {
      // Someone else moved this rail on, or took its cut back: show what is true now.
      if (!hasCode(error, "STALE_PROGRESS") && !hasCode(error, "RAIL_NOT_CUT")) return;
      setStale(true);
      void client.invalidateQueries({ queryKey: keys.rail(cabinet.id, rail.id) });
      void client.invalidateQueries({ queryKey: keys.cabinet(cabinet.id) });
    },
  });

  if (rail.status === "TO_CUT") {
    return (
      <Message text={t.mount.notCut(rail.bmk)}>
        <LinkButton to={paths.cut(cabinet.id)} tone="go" primary>
          {t.mount.goCut}
        </LinkButton>
      </Message>
    );
  }
  if (rail.status === "DONE") return <Navigate to={paths.railDone(cabinet.id, rail.id)} replace />;

  const part = rail.parts[mounted];
  const isLast = mounted === total - 1;

  return (
    <div className={styles.screen}>
      <div className={styles.top}>
        <span className={styles.topProgress}>
          <span className="bmk">{rail.bmk}</span> · {mounted} / {total}
        </span>
        <ProgressBar done={mounted} total={total} />
        <LinkButton to={paths.rails(cabinet.id)} tone="secondary">
          {t.mount.rails}
        </LinkButton>
      </div>

      <div className={styles.body}>
        <PartCard part={part} />
        <div className={styles.visual}>
          <div className={styles.view}>
            <MountView rail={rail} current={part} wholeRail={wholeRail} />
            <Button tone="secondary" className={styles.viewToggle} aria-pressed={wholeRail} onClick={() => setWholeRail((whole) => !whole)}>
              {wholeRail ? t.mount.closeUp : t.mount.wholeRail}
            </Button>
          </div>
          <PositionStrip parts={rail.parts} mountedCount={mounted} />
        </div>
      </div>

      <div className={styles.footer}>
        <Button tone="secondary" primary disabled={mounted === 0 || step.pending} onClick={() => step.save({ from: mounted, to: mounted - 1 })}>
          {t.mount.back}
        </Button>
        <p className={styles.notice} role="status">
          {stale ? t.mount.stale : step.failed ? t.save.failed : ""}
        </p>
        <SaveButton
          tone="confirm"
          primary
          pending={step.pending}
          retrying={step.retrying}
          isLocked={isLocked}
          onTap={() => step.save({ from: mounted, to: mounted + 1 })}
        >
          {isLast ? t.mount.finish(part.bmk) : `${part.bmk} · ${t.mount.done}`}
        </SaveButton>
      </div>
    </div>
  );
}
