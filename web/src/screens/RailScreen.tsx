import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { hasCode } from "../api/client";
import { useRail } from "../api/queries";
import type { Rail } from "../api/types";
import { useCabinetContext } from "../app/CabinetLayout";
import { paths } from "../app/landing";
import { Loading, Message } from "../app/Message";
import { LinkButton } from "../components/Button";
import { useI18n } from "../i18n/I18nProvider";

/** Loads the rail named in the URL for a screen that works on one rail. */
export function RailScreen({ children }: { children: (rail: Rail) => ReactNode }) {
  const { t } = useI18n();
  const cabinet = useCabinetContext();
  const { rid = "" } = useParams();
  const railId = Number(rid);
  const rail = useRail(cabinet.id, railId);

  if (!Number.isInteger(railId) || hasCode(rail.error, "RAIL_NOT_FOUND") || hasCode(rail.error, "VALIDATION_FAILED")) {
    return (
      <Message text={t.notFound.rail}>
        <LinkButton to={paths.rails(cabinet.id)} tone="go" primary>
          {t.notFound.backToRails}
        </LinkButton>
      </Message>
    );
  }
  if (!rail.data) return <Loading text={t.loading} />;
  return <>{children(rail.data)}</>;
}
