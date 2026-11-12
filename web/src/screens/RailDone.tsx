import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Rail } from "../api/types";
import { useCabinetContext } from "../app/CabinetLayout";
import { paths, suggestedRail } from "../app/landing";
import { LinkButton } from "../components/Button";
import { SaveButton } from "../components/SaveButton";
import { useI18n } from "../i18n/I18nProvider";
import { useSave } from "../save/useSave";
import styles from "./Done.module.css";

/** A rail is complete. One obvious way on, and a way back if the last part was confirmed too early. */
export function RailDone({ rail }: { rail: Rail }) {
  const { t } = useI18n();
  const cabinet = useCabinetContext();
  const navigate = useNavigate();
  const total = rail.parts.length;

  const reopen = useSave({
    cabinetId: cabinet.id,
    lastSaved: t.connection.savedPart(total, total),
    save: () => api.step(cabinet.id, rail.id, total, total - 1),
    onSaved: () => navigate(paths.mount(cabinet.id, rail.id)),
  });

  if (rail.status !== "DONE") return <Navigate to={paths.mount(cabinet.id, rail.id)} replace />;

  const others = cabinet.rails.filter((other) => other.id !== rail.id);
  const next = suggestedRail(others);
  const allDone = others.every((other) => other.status === "DONE");

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{t.railDone.title(rail.bmk)}</h1>
      <div className={styles.actions}>
        {next ? (
          <LinkButton to={paths.mount(cabinet.id, next.id)} tone="go" primary>
            {t.railDone.next(next.bmk)}
          </LinkButton>
        ) : allDone ? (
          <LinkButton to={paths.jobDone(cabinet.id)} tone="go" primary>
            {t.railDone.finishJob}
          </LinkButton>
        ) : (
          <LinkButton to={paths.cut(cabinet.id)} tone="go" primary>
            {t.railDone.cutNext}
          </LinkButton>
        )}
        {!allDone && (
          <LinkButton to={paths.rails(cabinet.id)} tone="secondary">
            {t.railDone.choose}
          </LinkButton>
        )}
        <div className={styles.small}>
          <SaveButton tone="quiet" pending={reopen.pending} retrying={reopen.retrying} onTap={() => reopen.save(undefined)}>
            {t.railDone.backToLast}
          </SaveButton>
        </div>
      </div>
    </div>
  );
}
