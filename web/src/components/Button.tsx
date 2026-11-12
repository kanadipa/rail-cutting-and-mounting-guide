import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./Button.module.css";

/** confirm = work is done (green). go = move somewhere (navy). */
export type Tone = "confirm" | "go" | "secondary" | "quiet";

const classes = (tone: Tone, primary: boolean, extra = ""): string =>
  [styles.button, styles[tone], primary ? styles.primary : "", extra].filter(Boolean).join(" ");

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone: Tone;
  /** The screen's one main action: the largest target. */
  primary?: boolean;
  children: ReactNode;
}

export function Button({ tone, primary = false, className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={classes(tone, primary, className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({ to, tone, primary = false, children }: { to: string; tone: Tone; primary?: boolean; children: ReactNode }) {
  return (
    <Link to={to} className={classes(tone, primary)} draggable={false}>
      {children}
    </Link>
  );
}

export const buttonStyles = styles;
