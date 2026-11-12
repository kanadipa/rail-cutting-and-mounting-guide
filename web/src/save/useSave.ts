import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { isRetryable } from "../api/client";
import { applyProgress } from "../api/queries";
import type { Progress } from "../api/types";
import { useConnection } from "./ConnectionProvider";

const MAX_RETRY_DELAY_MS = 8000;

interface SaveOptions<Variables> {
  cabinetId: number;
  save: (variables: Variables) => Promise<Progress>;
  /** What the server last confirmed, for the banner shown while a save cannot get through. */
  lastSaved: string | null;
  onSaved?: (progress: Progress, variables: Variables) => void;
  onRejected?: (error: unknown, variables: Variables) => void;
}

/**
 * Saves one progress change and waits for the server: nothing moves on screen until it answered.
 *
 * This is the only place a save is retried. While the server cannot be reached the same request
 * is sent again with exponential backoff; the API's compare-and-set makes a repeat harmless.
 * An answer from the server, including a refusal, is never retried.
 */
export function useSave<Variables>({ cabinetId, save, lastSaved, onSaved, onRejected }: SaveOptions<Variables>) {
  const client = useQueryClient();
  const { reportSaveFailing, reportSaveSettled } = useConnection();

  // Set in the tap itself: the mutation reports "pending" a moment later, and a second tap
  // must not slip through in between.
  const inFlight = useRef(false);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: save,
    // Keep trying when the browser thinks it is offline too; it is often wrong on a bench network.
    networkMode: "always",
    retry: (_count, error) => isRetryable(error),
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS),
    onSuccess: (progress, variables) => {
      applyProgress(client, cabinetId, progress);
      onSaved?.(progress, variables);
    },
    onError: onRejected,
    onSettled: () => {
      inFlight.current = false;
      setSubmitted(false);
      reportSaveSettled();
    },
  });
  const { mutate } = mutation;

  const submit = useCallback(
    (variables: Variables) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSubmitted(true);
      mutate(variables);
    },
    [mutate],
  );

  const retrying = mutation.isPending && mutation.failureCount > 0;
  useEffect(() => {
    if (retrying) reportSaveFailing(lastSaved);
  }, [retrying, lastSaved, reportSaveFailing]);

  return { save: submit, pending: submitted || mutation.isPending, retrying, failed: mutation.isError };
}
