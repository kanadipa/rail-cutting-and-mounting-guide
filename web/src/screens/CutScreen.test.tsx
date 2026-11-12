import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeServer, startFakeServer } from "../test/fakeServer";
import { pass, renderApp } from "../test/renderApp";

// jsdom has no WebGL: the 3D bar is checked by eye.
vi.mock("../three/BarCutView", () => ({ BarCutView: () => null }));
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

  it("shows the deburr and mark steps as a reminder with nothing to tap", async () => {
    await openCutScreen({ cut: false });
    const reminder = screen.getByRole("note");
    expect(within(reminder).getByText("Before you put it in the tray:")).toBeTruthy();
    expect(within(reminder).getByText("Deburr both ends")).toBeTruthy();
    expect(within(reminder).getByText("Write -U1 on the piece")).toBeTruthy();
    expect(within(reminder).queryAllByRole("button")).toHaveLength(0);
    expect(within(reminder).queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("offers only Undo on a cut rail, and undoing puts it back to be cut", async () => {
    await openCutScreen({});
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo.getAttribute("title")).toBe("Tapped Done too early");
    // The only button in the rail list is Undo: no re-cut.
    expect(within(screen.getByRole("region", { name: "Rails to cut" })).getAllByRole("button")).toHaveLength(1);

    fireEvent.click(undo);
    await pass(0);
    expect(server.undos).toBe(1);
    expect(server.cutAt).toBeNull();
    expect(doneButton().textContent).toBe("Deburred and marked -U1 · Done");
  });

  it("dims Undo with a reason when parts are mounted, and sends nothing when it is tapped", async () => {
    await openCutScreen({ mountedCount: 2 });
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo.getAttribute("aria-disabled")).toBe("true");
    expect(undo.getAttribute("aria-describedby")).toBe(screen.getByText("Take the parts off step by step to undo the cut.").id);

    fireEvent.click(undo);
    await pass(0);
    expect(server.undos).toBe(0);
    expect(server.mountedCount).toBe(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps Undo usable on a cut rail with nothing mounted", async () => {
    await openCutScreen({});
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo.getAttribute("aria-disabled")).toBeNull();
    expect(undo).toHaveProperty("disabled", false);
    expect(screen.queryByText("Take the parts off step by step to undo the cut.")).toBeNull();
  });
});
