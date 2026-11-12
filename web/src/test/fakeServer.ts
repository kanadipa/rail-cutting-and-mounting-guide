import { vi } from "vitest";
import type { Cabinet, Part, Rail, RailStatus } from "../api/types";

/**
 * A stand-in for the API behind `fetch`: one cabinet with one rail of three parts, keeping the
 * rail's progress like the real server does. Tests can hold a save back or make it fail.
 */
export interface FakeServer {
  /** Mount steps the server received, as "from>to". */
  steps: string[];
  /** How many cut undos the server received. */
  undos: number;
  mountedCount: number;
  cutAt: string | null;
  /** While set, mount steps get no answer until `release()` is called. */
  hold: boolean;
  release: () => void;
  /** While true, every request fails as if the network were down. */
  down: boolean;
  /** When set, the next mount step is refused with this error code. */
  refuseWith: { code: string; status: number; details?: Record<string, unknown> } | null;
}

const PART_COUNT = 3;

const part = (seq: number, clipOn: boolean): Part => ({
  id: 100 + seq,
  bmk: `-X1:${seq}`,
  mountSeq: seq,
  pose: { positionMm: [seq * 10, 0, 0], quaternion: [0, 0, 0, 1] },
  xStartMm: seq * 10,
  xEndMm: seq * 10 + 10,
  manufacturer: "Wago",
  articleNumber: "2203-7641",
  displayName: "Terminal block",
  glbUrl: "/assets/glb/terminal.glb",
  imageUrl: "/assets/img/terminal.jpg",
  where:
    seq === 1
      ? { kind: "FIRST", atMm: 10 }
      : clipOn && seq === 2
        ? { kind: "CLIP_ONTO", onBmk: "-X1:1" }
        : { kind: "NEXT_TO", neighbourBmk: `-X1:${seq - 1}`, atMm: seq * 10 },
  group: null,
  planWarning: null,
});

export function startFakeServer(initial: { mountedCount?: number; cut?: boolean; clipOn?: boolean } = {}): FakeServer {
  let waiting: (() => void)[] = [];
  const server: FakeServer = {
    steps: [],
    undos: 0,
    mountedCount: initial.mountedCount ?? 0,
    cutAt: initial.cut === false ? null : "2026-01-01T08:00:00.000Z",
    hold: false,
    release: () => {
      waiting.forEach((resume) => resume());
      waiting = [];
    },
    down: false,
    refuseWith: null,
  };

  const status = (): RailStatus =>
    server.cutAt === null ? "TO_CUT" : server.mountedCount === 0 ? "READY" : server.mountedCount === PART_COUNT ? "DONE" : "IN_PROGRESS";
  const summary = () => ({
    id: 5,
    bmk: "-U1",
    cutLengthMm: 306,
    cutOrder: 1,
    barIndex: 0,
    barOffsetMm: 0,
    profile: "35X15",
    barLengthMm: 2000,
    glbUrl: "/assets/glb/rail.glb",
    status: status(),
    cutAt: server.cutAt,
    mountedCount: server.mountedCount,
    partCount: PART_COUNT,
  });
  const rail = (): Rail => ({ ...summary(), parts: [1, 2, 3].map((seq) => part(seq, initial.clipOn === true)) });
  const cabinet = (): Cabinet => ({
    id: 1,
    name: "Cabinet 1",
    rails: [summary()],
    bars: [{ articleId: 1, barIndex: 0, barLengthMm: 2000, usedMm: 306, remnantMm: 1694, pieces: [{ railId: 5, bmk: "-U1", offsetMm: 0, lengthMm: 306 }] }],
  });
  const progress = (changed: boolean) => ({ railId: 5, status: status(), cutAt: server.cutAt, mountedCount: server.mountedCount, partCount: PART_COUNT, changed });
  const json = (body: unknown, httpStatus = 200) => new Response(JSON.stringify(body), { status: httpStatus });
  const error = (code: string, httpStatus: number, details = {}) => json({ error: { code, message: "server wording, never shown", details } }, httpStatus);

  async function answer(url: string, init?: RequestInit): Promise<Response> {
    const method = init?.method ?? "GET";
    if (server.down) throw new TypeError("Failed to fetch");

    if (url === "/api/health") return json({ status: "ok" });
    if (url === "/api/cabinets") return json([{ id: 1, name: "Cabinet 1" }]);
    if (url === "/api/cabinets/1") return json(cabinet());
    if (url === "/api/cabinets/1/rails/5" && method === "GET") return json(rail());
    if (url === "/api/cabinets/1/rails/5/cut" && method === "PUT") {
      const changed = server.cutAt === null;
      server.cutAt ??= "2026-01-01T08:00:00.000Z";
      return json(progress(changed));
    }
    if (url === "/api/cabinets/1/rails/5/cut" && method === "DELETE") {
      server.undos += 1;
      if (server.mountedCount > 0) return error("RESET_REQUIRED", 409, { mountedCount: server.mountedCount });
      const changed = server.cutAt !== null;
      server.cutAt = null;
      server.mountedCount = 0;
      return json(progress(changed));
    }
    if (url === "/api/cabinets/1/rails/5/progress" && method === "PUT") {
      const { from, to } = JSON.parse(String(init?.body)) as { from: number; to: number };
      server.steps.push(`${from}>${to}`);
      if (server.hold) await new Promise<void>((resume) => waiting.push(resume));
      if (server.refuseWith) {
        const refusal = server.refuseWith;
        server.refuseWith = null;
        return error(refusal.code, refusal.status, refusal.details);
      }
      if (server.mountedCount === to) return json(progress(false));
      if (server.mountedCount !== from) return error("STALE_PROGRESS", 409, { mountedCount: server.mountedCount });
      server.mountedCount = to;
      return json(progress(true));
    }
    return error(url.startsWith("/api/cabinets/1/") ? "RAIL_NOT_FOUND" : "CABINET_NOT_FOUND", 404);
  }

  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => answer(url, init)));
  return server;
}
