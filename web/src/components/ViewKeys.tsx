import type { ReactNode } from "react";
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
