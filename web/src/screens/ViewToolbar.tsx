import type { ReactNode } from "react";
import { ZOOM_STEP_MAX, ZOOM_STEP_MIN } from "../three/MountView";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./ViewToolbar.module.css";

interface ViewToolbarProps {
  zoomStep: number;
  onZoom: (step: number) => void;
  wholeRail: boolean;
  onToggleWholeRail: () => void;
  rotating: boolean;
  onToggleRotate: () => void;
}

/**
 * Small icon keys in the corner of the 3D view. The two toggles show the mode the view is in now
 * (pressed = on), not the action a tap would take.
 */
export function ViewToolbar({ zoomStep, onZoom, wholeRail, onToggleWholeRail, rotating, onToggleRotate }: ViewToolbarProps) {
  const { t } = useI18n();
  return (
    <div className={styles.bar} role="toolbar" aria-label={t.mount.viewTools}>
      <IconButton label={t.mount.zoomOut} disabled={zoomStep <= ZOOM_STEP_MIN} onClick={() => onZoom(zoomStep - 1)}>
        <path d="M5 12h14" />
      </IconButton>
      <IconButton label={t.mount.zoomIn} disabled={zoomStep >= ZOOM_STEP_MAX} onClick={() => onZoom(zoomStep + 1)}>
        <path d="M5 12h14M12 5v14" />
      </IconButton>
      <span className={styles.divider} aria-hidden="true" />
      <IconButton label={t.mount.wholeRail} pressed={wholeRail} onClick={onToggleWholeRail}>
        {wholeRail ? (
          // Whole rail: a long bar with all its parts.
          <>
            <path d="M2 17h20" />
            <path d="M4 17V9h2v8M8 17V7h2v10M12 17V9h2v8M16 17V7h2v10" />
          </>
        ) : (
          // Close-up: one part inside a frame.
          <>
            <path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" />
            <rect x="9" y="9" width="6" height="6" />
          </>
        )}
      </IconButton>
      <IconButton label={t.mount.rotate} pressed={rotating} onClick={onToggleRotate}>
        {/* Turn: an arrow round a point. */}
        <path d="M20 12a8 8 0 1 1-2.5-5.8" />
        <path d="M20 4v5h-5" />
      </IconButton>
    </div>
  );
}

function IconButton({
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
