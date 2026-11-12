import { useEffect } from "react";
import { Outlet, useOutletContext, useParams } from "react-router-dom";
import { hasCode } from "../api/client";
import { useCabinet } from "../api/queries";
import type { Cabinet } from "../api/types";
import { LinkButton } from "../components/Button";
import { useI18n } from "../i18n/I18nProvider";
import { useConnection } from "../save/ConnectionProvider";
import { ConnectionBanner } from "./ConnectionBanner";
import { Header } from "./Header";
import { Loading, Message } from "./Message";
import styles from "./Shell.module.css";

/** Loads the cabinet named in the URL and frames every screen of it with the header and banner. */
export function CabinetLayout() {
  const { t } = useI18n();
  const { cid = "" } = useParams();
  const cabinetId = Number(cid);
  const cabinet = useCabinet(cabinetId);
  const { reportReadFailing } = useConnection();

  const unreachable = cabinet.failureCount > 0 && !cabinet.isSuccess;
  useEffect(() => {
    if (unreachable) reportReadFailing();
  }, [unreachable, reportReadFailing]);

  const notFound = !Number.isInteger(cabinetId) || hasCode(cabinet.error, "CABINET_NOT_FOUND") || hasCode(cabinet.error, "VALIDATION_FAILED");

  return (
    <div className={styles.app}>
      {cabinet.data && <Header cabinet={cabinet.data} />}
      <ConnectionBanner />
      <main className={styles.main}>
        {notFound ? (
          <Message text={t.notFound.cabinet(cid)}>
            <LinkButton to="/" tone="go" primary>
              {t.notFound.back}
            </LinkButton>
          </Message>
        ) : cabinet.data ? (
          <Outlet context={cabinet.data} />
        ) : (
          <Loading text={t.loading} />
        )}
      </main>
    </div>
  );
}

/** The cabinet of the current screen. */
export const useCabinetContext = (): Cabinet => useOutletContext<Cabinet>();
