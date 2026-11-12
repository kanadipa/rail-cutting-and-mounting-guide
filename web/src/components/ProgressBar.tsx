import styles from "./ProgressBar.module.css";

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const share = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <div className={styles.fill} style={{ width: `${share * 100}%` }} />
    </div>
  );
}
