import type { ReactNode } from "react";
import styles from "./Shell.module.css";

/** A full-screen statement with its way out: not found, nothing loaded. */
export function Message({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className={styles.message}>
      <p className={styles.messageText}>{text}</p>
      {children}
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <div className={styles.message}>
      <p className={styles.loading}>{text}</p>
    </div>
  );
}
