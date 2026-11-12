import { type ReactNode, useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { Button, buttonStyles, type Tone } from "./Button";

/** A save that answers faster than this never shows "Saving…": no flicker on a good network. */
const SAVING_LABEL_DELAY_MS = 150;

interface SaveButtonProps {
  tone: Tone;
  primary?: boolean;
  children: ReactNode;
  onTap: () => void;
  /** The save is on its way. The button is disabled at once, so a second tap cannot save twice. */
  pending: boolean;
  /** The save has failed at least once and is being sent again. */
  retrying: boolean;
  disabled?: boolean;
  /** Says whether taps are ignored right now (see useTapLock). */
  isLocked?: () => boolean;
}

/** A button for an action that is saved on the server before the screen moves on. */
export function SaveButton({ tone, primary, children, onTap, pending, retrying, disabled = false, isLocked }: SaveButtonProps) {
  const { t } = useI18n();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SAVING_LABEL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const label = retrying ? t.save.retrying : pending && slow ? t.save.saving : children;
  const state = [pending ? buttonStyles.busy : "", retrying ? buttonStyles.retrying : ""].join(" ");

  return (
    <Button
      tone={tone}
      primary={primary}
      className={state}
      disabled={pending || disabled}
      onClick={() => {
        if (isLocked?.()) return;
        onTap();
      }}
    >
      {label}
    </Button>
  );
}
