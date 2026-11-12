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
import { SaveButton } from "../components/SaveButton";
import { useI18n } from "../i18n/I18nProvider";
import { useSave } from "../save/useSave";
import { useTapLock } from "../save/useTapLock";
import { MountView } from "../three/MountView";
import styles from "./Mount.module.css";
import { PartCard } from "./PartCard";
import { ViewToolbar } from "./ViewToolbar";

interface Step {
  from: number;
  to: number;
}

/**
 * Step 2, the core screen: one part at a time. The part shown is always the next one the server
 * has not confirmed, so a reload, another tablet or a break all resume at the right part.
 */
export function MountScreen({ rail }: { rail: Rail }) {
  const { t, mm } = useI18n();
  const cabinet = useCabinetContext();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [wholeRail, setWholeRail] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [zoomStep, setZoomStep] = useState(0);
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
      <div className={styles.body}>
        {/* Keyed by part: every new part starts on its photo. */}
        <PartCard key={part.id} part={part} railBmk={rail.bmk} railLengthMm={mm(rail.cutLengthMm)} position={mounted + 1} total={total} />
        <div className={styles.visual}>
          <div className={styles.view}>
            <MountView rail={rail} current={part} wholeRail={wholeRail} free={rotating} zoomStep={zoomStep} onZoomChange={setZoomStep} />
            <ViewToolbar
              zoomStep={zoomStep}
              onZoom={setZoomStep}
              wholeRail={wholeRail}
              onToggleWholeRail={() => setWholeRail((whole) => !whole)}
              rotating={rotating}
              onToggleRotate={() => setRotating((on) => !on)}
            />
          </div>
          <PositionStrip parts={rail.parts} mountedCount={mounted} />
        </div>
      </div>

      <p className={styles.notice} role="status">
        {stale ? t.mount.stale : step.failed ? t.save.failed : ""}
      </p>
      <div className={styles.footer}>
        <Button tone="secondary" disabled={mounted === 0 || step.pending} onClick={() => step.save({ from: mounted, to: mounted - 1 })}>
          {mounted === 0 ? t.mount.backNone : t.mount.back(rail.parts[mounted - 1].bmk)}
        </Button>
        <SaveButton
          tone="confirm"
          primary
          className={styles.done}
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
