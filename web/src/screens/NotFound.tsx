import { ConnectionBanner } from "../app/ConnectionBanner";
import { Message } from "../app/Message";
import shell from "../app/Shell.module.css";
import { LinkButton } from "../components/Button";
import { useI18n } from "../i18n/I18nProvider";

/** An address that leads nowhere, inside a cabinet or outside one. */
export function NotFound({ standalone = false }: { standalone?: boolean }) {
  const { t } = useI18n();
  const message = (
    <Message text={t.notFound.page}>
      <LinkButton to="/" tone="go" primary>
        {t.notFound.back}
      </LinkButton>
    </Message>
  );
  if (!standalone) return message;
  return (
    <div className={shell.app}>
      <ConnectionBanner />
      <main className={shell.main}>{message}</main>
    </div>
  );
}
