import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./ViewKeys.module.css";

/** The small raised bar of icon keys in the corner of a 3D view. */
export function ViewKeys({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.bar} role="toolbar" aria-label={label}>
      {children}
    </div>
  );
}

export function ViewKeysDivider() {
  return <span className={styles.divider} aria-hidden="true" />;
}

/** An icon key. `pressed` makes it a toggle: pressed shows the mode the view is in now. */
export function IconButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.key}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/** A key that navigates, with its word next to the icon. Disabled while a save is on its way. */
export function LinkKey({
  to,
  label,
  text,
  disabled,
  isLocked,
  children,
}: {
  to: string;
  /** What a screen reader says; the visible word is `text`. */
  label: string;
  text: string;
  disabled: boolean;
  /** Says whether taps are ignored right now (see useTapLock). */
  isLocked: () => boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={styles.linkKey}
      aria-label={label}
      title={label}
      aria-disabled={disabled || undefined}
      draggable={false}
      onClick={(event) => {
        if (disabled || isLocked()) event.preventDefault();
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
      {text}
    </Link>
  );
}
