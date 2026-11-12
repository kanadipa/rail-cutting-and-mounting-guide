import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

interface Connection {
  /** True from the first failed save or read until the server answers again. */
  lost: boolean;
  /** What the server last confirmed, in the operator's words; shown while the connection is lost. */
  lastSaved: string | null;
  /** A save failed and is being retried. */
  reportSaveFailing: (lastSaved: string | null) => void;
  /** The pending save went through, or there is none any more. */
  reportSaveSettled: () => void;
  reportReadFailing: () => void;
}

const ConnectionContext = createContext<Connection | null>(null);
const HEALTH_POLL_MS = 2000;

/**
 * Knows whether the server can be reached. This is not an offline mode: nothing is queued on the
 * device. A failed save keeps retrying and the banner stays until it went through; a failed
 * read clears as soon as the health check answers.
 */
export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [saveFailing, setSaveFailing] = useState(false);
  const [readFailing, setReadFailing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const health = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    enabled: saveFailing || readFailing,
    refetchInterval: HEALTH_POLL_MS,
    retry: false,
    gcTime: 0,
  });
  // Each health answer that arrives ends a failed read; a failed save ends only by going through.
  useEffect(() => {
    if (health.dataUpdatedAt > 0) setReadFailing(false);
  }, [health.dataUpdatedAt]);

  const reportSaveFailing = useCallback((saved: string | null) => {
    setSaveFailing(true);
    setLastSaved(saved);
  }, []);
  const reportSaveSettled = useCallback(() => setSaveFailing(false), []);
  const reportReadFailing = useCallback(() => setReadFailing(true), []);

  const value = useMemo<Connection>(
    () => ({ lost: saveFailing || readFailing, lastSaved: saveFailing ? lastSaved : null, reportSaveFailing, reportSaveSettled, reportReadFailing }),
    [saveFailing, readFailing, lastSaved, reportSaveFailing, reportSaveSettled, reportReadFailing],
  );
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): Connection {
  const connection = useContext(ConnectionContext);
  if (!connection) throw new Error("useConnection needs a ConnectionProvider above it");
  return connection;
}
