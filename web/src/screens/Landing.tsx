import { Navigate } from "react-router-dom";
import { useCabinet, useCabinets } from "../api/queries";
import { ConnectionBanner } from "../app/ConnectionBanner";
import { landingPath } from "../app/landing";
import { Loading, Message } from "../app/Message";
import shell from "../app/Shell.module.css";
import { useI18n } from "../i18n/I18nProvider";

/** "/" has no screen of its own: it sends the operator to where the work stands. */
export function Landing() {
  const { t } = useI18n();
  const cabinets = useCabinets();
  // The bench works on one cabinet; choosing between several is not part of this app.
  const cabinetId = cabinets.data?.[0]?.id;

  return (
    <div className={shell.app}>
      <ConnectionBanner />
      <main className={shell.main}>
        {cabinetId !== undefined ? (
          <LandOn cabinetId={cabinetId} />
        ) : cabinets.isSuccess ? (
          <Message text={t.notFound.noJob} />
        ) : (
          <Loading text={t.loading} />
        )}
      </main>
    </div>
  );
}

function LandOn({ cabinetId }: { cabinetId: number }) {
  const { t } = useI18n();
  const cabinet = useCabinet(cabinetId);
  if (!cabinet.data) return <Loading text={t.loading} />;
  return <Navigate to={landingPath(cabinet.data)} replace />;
}
