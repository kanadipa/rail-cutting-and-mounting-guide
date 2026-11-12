import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  question: string;
  yes: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
}

/** A yes/no question that blocks the screen. Both answers are large; "no" keeps things as they are. */
export function ConfirmDialog({ question, yes, no, onYes, onNo }: ConfirmDialogProps) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-label={question}>
        <p className={styles.question}>{question}</p>
        <div className={styles.actions}>
          <Button tone="secondary" primary onClick={onNo}>
            {no}
          </Button>
          <Button tone="confirm" primary onClick={onYes}>
            {yes}
          </Button>
        </div>
      </div>
    </div>
  );
}
