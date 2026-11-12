import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { App } from "../app/App";
import { Providers } from "../app/Providers";

/** Renders the whole app at an address, as the browser would. */
export function renderApp(path: string) {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>
    </Providers>,
  );
}

/**
 * Lets time pass (fake timers) and everything waiting on it settle. A screen loads its cabinet,
 * then its rail, then renders, so a few rounds are needed before the page stands still.
 */
export async function pass(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  for (let round = 0; round < 4; round += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}
