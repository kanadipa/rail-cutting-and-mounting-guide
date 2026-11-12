import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeServer, startFakeServer } from "../test/fakeServer";
import { pass, renderApp } from "../test/renderApp";

// jsdom has no WebGL: the 3D bar is checked by eye.
vi.mock("../three/BarCutView", () => ({
  BarCutView: ({ glbUrl, bar, wholeBar }: { glbUrl: string; bar: { articleId: number }; wholeBar?: boolean }) => (
    <div data-testid="bar-view" data-glb={glbUrl} data-article={bar.articleId} data-whole={String(wholeBar === true)} />
  ),
}));
vi.mock("../three/MountView", () => ({ MountView: () => null, ZOOM_STEP_MIN: -3, ZOOM_STEP_MAX: 5 }));

const CUT_URL = "/cabinets/1/cut";
const doneButton = () => screen.getByRole("button", { name: /Done|Saving|Not saved/ });

let server: FakeServer;

async function openCutScreen(initial: Parameters<typeof startFakeServer>[0]): Promise<void> {
  server = startFakeServer(initial);
  renderApp(CUT_URL);
  await pass(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("cut screen", () => {
  it("names the piece in the Done button and cuts it when tapped", async () => {
    await openCutScreen({ cut: false });
    expect(doneButton().textContent).toBe("Deburred and marked -U1 · Done");

    fireEvent.click(doneButton());
    await pass(0);
    expect(server.cutAt).not.toBeNull();
    expect(screen.getByText("All rails cut")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start mounting/ })).toBeTruthy();
  });

  it("puts the deburr-and-mark reminder in the Done button, with no extra panel", async () => {
    await openCutScreen({ cut: false });
    expect(doneButton().textContent).toBe("Deburred and marked -U1 · Done");
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByText("Before you put it in the tray:")).toBeNull();
  });

  it("shows a cut rail with only its BMK, length and Cut ✓: a cut is final, nothing to tap", async () => {
    await openCutScreen({});
    const list = screen.getByRole("region", { name: "Rails to cut" });
    expect(within(list).getByText("-U1")).toBeTruthy();
    expect(within(list).getByText("306 mm")).toBeTruthy();
    expect(within(list).getByText("Cut ✓")).toBeTruthy();
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
    expect(within(list).queryAllByRole("link")).toHaveLength(0);
  });

  it("draws each bar of the summary with the model of its own article", async () => {
    await openCutScreen({ secondBar: true });
    expect(screen.getByText("All rails cut")).toBeTruthy();
    const views = screen.getAllByTestId("bar-view");
    expect(views.map((view) => [view.getAttribute("data-article"), view.getAttribute("data-glb")])).toEqual([
      ["1", "/assets/glb/rail.glb"],
      ["2", "/assets/glb/rail-b.glb"],
    ]);
  });

  it("switches the 3D view between the stretch around the piece and the whole bar", async () => {
    await openCutScreen({ cut: false });
    const toggle = screen.getByRole("button", { name: "Whole bar" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("bar-view").getAttribute("data-whole")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("bar-view").getAttribute("data-whole")).toBe("true");

    fireEvent.click(toggle);
    expect(screen.getByTestId("bar-view").getAttribute("data-whole")).toBe("false");
  });
});
