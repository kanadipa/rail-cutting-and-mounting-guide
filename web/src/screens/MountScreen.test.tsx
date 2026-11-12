import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeServer, startFakeServer } from "../test/fakeServer";
import { pass, renderApp } from "../test/renderApp";

// jsdom has no WebGL. The 3D views are checked by eye; these tests are about saving.
vi.mock("../three/MountView", () => ({ MountView: () => null }));
vi.mock("../three/BarCutView", () => ({ BarCutView: () => null }));

const MOUNT_URL = "/cabinets/1/rails/5/mount";
const doneButton = () => screen.getByRole("button", { name: /Done|Saving|Not saved|Finish rail/ });
const currentPart = () => screen.getByRole("heading", { level: 1 }).textContent;

let server: FakeServer;

async function openMountScreen(initial: Parameters<typeof startFakeServer>[0] = {}): Promise<void> {
  server = startFakeServer(initial);
  renderApp(MOUNT_URL);
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

describe("mount screen: saving a step", () => {
  it("shows the first part the server has not confirmed", async () => {
    await openMountScreen({ mountedCount: 1 });
    expect(currentPart()).toBe("-X1:2");
    expect(screen.getByText("Next to -X1:1 · 20 mm from left end")).toBeTruthy();
  });

  it("disables Done the moment it is tapped and waits for the server before moving on", async () => {
    await openMountScreen();
    server.hold = true;

    fireEvent.click(doneButton());
    expect(doneButton()).toHaveProperty("disabled", true);
    fireEvent.click(doneButton());
    await pass(100);
    expect(server.steps).toEqual(["0>1"]);
    expect(currentPart()).toBe("-X1:1");

    server.release();
    await pass(0);
    expect(currentPart()).toBe("-X1:2");
    expect(doneButton()).toHaveProperty("disabled", false);
  });

  it('says "Saving…" only when the answer takes longer than 150 ms', async () => {
    await openMountScreen();
    server.hold = true;
    fireEvent.click(doneButton());

    await pass(140);
    expect(doneButton().textContent).toBe("-X1:1 · Done");
    await pass(20);
    expect(doneButton().textContent).toBe("Saving…");
  });

  it("ignores a second tap for 600 ms after moving on, so a double tap confirms one part", async () => {
    await openMountScreen();
    fireEvent.click(doneButton());
    await pass(0);
    expect(currentPart()).toBe("-X1:2");

    await pass(300);
    fireEvent.click(doneButton());
    await pass(0);
    expect(server.steps).toEqual(["0>1"]);
    expect(currentPart()).toBe("-X1:2");

    await pass(300);
    fireEvent.click(doneButton());
    await pass(0);
    expect(server.steps).toEqual(["0>1", "1>2"]);
    expect(currentPart()).toBe("-X1:3");
  });

  it("keeps Back disabled, not hidden, on the first part", async () => {
    await openMountScreen();
    expect(screen.getByRole("button", { name: "Back" })).toHaveProperty("disabled", true);
  });

  it("goes one part back and saves that too", async () => {
    await openMountScreen({ mountedCount: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await pass(0);
    expect(server.steps).toEqual(["2>1"]);
    expect(currentPart()).toBe("-X1:2");
  });

  it("finishes the rail with the last part", async () => {
    await openMountScreen({ mountedCount: 2 });
    expect(doneButton().textContent).toBe("Mounted -X1:3 · Finish rail");
    fireEvent.click(doneButton());
    await pass(0);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("✓ -U1 done");
  });
});

describe("mount screen: when the save does not get through", () => {
  it("keeps a banner up with the last saved part, retries the same step, and clears once saved", async () => {
    await openMountScreen({ mountedCount: 1 });
    server.down = true;

    fireEvent.click(doneButton());
    await pass(50);
    expect(screen.getByRole("alert").textContent).toContain("No connection. Last saved: part 1 of 3. Keep the rail as it is.");
    expect(doneButton().textContent).toBe("Not saved · retrying");
    expect(doneButton()).toHaveProperty("disabled", true);
    expect(currentPart()).toBe("-X1:2");

    // Still down after the first retries: the banner stays, it is not a toast.
    await pass(4000);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(currentPart()).toBe("-X1:2");

    server.down = false;
    await pass(8000);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(currentPart()).toBe("-X1:3");
    expect(new Set(server.steps)).toEqual(new Set(["1>2"]));
  });

  it("lands on the real part when another screen moved the rail on", async () => {
    await openMountScreen();
    server.mountedCount = 2;

    fireEvent.click(doneButton());
    await pass(50);
    expect(screen.getByText("Progress was updated on another screen.")).toBeTruthy();
    expect(currentPart()).toBe("-X1:3");
  });

  it("never shows the server's own error wording", async () => {
    await openMountScreen();
    server.refuseWith = { code: "INTERNAL", status: 400 };
    fireEvent.click(doneButton());
    await pass(50);
    expect(screen.queryByText(/server wording/)).toBeNull();
    expect(screen.getByText("Not saved. Tap again.")).toBeTruthy();
  });
});

describe("opening the app", () => {
  it('"/" lands on the rail in progress', async () => {
    server = startFakeServer({ mountedCount: 1 });
    renderApp("/");
    await pass(0);
    expect(currentPart()).toBe("-X1:2");
  });

  it('"/" lands on cutting when a rail is still to cut', async () => {
    server = startFakeServer({ cut: false });
    renderApp("/");
    await pass(0);
    expect(screen.getByRole("button", { name: "Deburred and marked -U1 · Done" })).toBeTruthy();
  });

  it("says so when the cabinet or the rail does not exist", async () => {
    server = startFakeServer();
    renderApp("/cabinets/2/cut");
    await pass(0);
    expect(screen.getByText("Cabinet 2 not found. Check the job number.")).toBeTruthy();

    cleanup();
    renderApp("/cabinets/1/rails/99/mount");
    await pass(0);
    expect(screen.getByText("Rail not found.")).toBeTruthy();
  });
});
