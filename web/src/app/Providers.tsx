import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { I18nProvider } from "../i18n/I18nProvider";
import { ConnectionProvider } from "../save/ConnectionProvider";

/** What every screen needs around it: server state, connection state and the language. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <ConnectionProvider>
        <I18nProvider>{children}</I18nProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
