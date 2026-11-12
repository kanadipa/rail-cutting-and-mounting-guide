import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/configureApp";
import { importPlan } from "../prisma/import/importPlan";
import { PROJECT_ROOT, realCatalog, realRails } from "./realPlan";

/**
 * The API against a real database. Two small cabinets are written directly, so the tests do not
 * depend on the import: cabinet A has one rail with three parts, cabinet B has a rail of its own.
 */
const prisma = new PrismaClient();
const NAMES = ["API test cabinet A", "API test cabinet B"];
let app: INestApplication;
let cabinetA: number;
let cabinetB: number;
let railA: number;
let railB: number;

async function removeTestCabinets(): Promise<void> {
  await prisma.workEvent.deleteMany({ where: { cabinet: { name: { in: NAMES } } } });
  await prisma.cabinet.deleteMany({ where: { name: { in: NAMES } } });
}

async function createCabinet(name: string, railBmk: string): Promise<{ cabinetId: number; railId: number }> {
  const article = (articleNumber: string, category: string, barLengthMm?: number) =>
    prisma.article.upsert({
      where: { manufacturer_articleNumber: { manufacturer: "Test", articleNumber } },
      update: {},
      create: { manufacturer: "Test", articleNumber, displayName: articleNumber, category, barLengthMm, glbPath: "assets/glb/x.glb" },
    });
  const railArticle = await article("rail-profile", "rail", 2000);
  const terminal = await article("terminal", "terminal");
  const rail = await prisma.rail.create({
    data: {
      cabinet: { create: { name } },
      bmk: railBmk,
      article: { connect: { id: railArticle.id } },
      cutLengthMm: 300,
      cutOrder: 1,
      barIndex: 0,
      barOffsetMm: 0,
      partCount: 3,
      progress: { create: {} },
      placedItems: {
        create: [1, 2, 3].map((seq) => ({
          bmk: `-X1:${seq}`,
          articleId: terminal.id,
          pose: { positionMm: [seq * 10, 0, 0], quaternion: [0, 0, 0, 1] },
          mountSeq: seq,
          xStartMm: seq * 10,
          xEndMm: seq * 10 + 10,
          zMinMm: -7,
          gapBeforeMm: seq === 1 ? 10 : 0,
        })),
      },
    },
  });
  return { cabinetId: rail.cabinetId, railId: rail.id };
}

const api = () => request(app.getHttpServer());
const railUrl = (suffix = "") => `/api/cabinets/${cabinetA}/rails/${railA}${suffix}`;
const step = (from: number, to: number) => api().put(railUrl("/progress")).send({ from, to });
const events = () => prisma.workEvent.findMany({ where: { railId: railA }, orderBy: { id: "asc" }, include: { placedItem: true } });
const eventTypes = async () => (await events()).map((event) => event.type);

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
});

beforeEach(async () => {
  await removeTestCabinets();
  ({ cabinetId: cabinetA, railId: railA } = await createCabinet(NAMES[0], "-U1"));
  ({ cabinetId: cabinetB, railId: railB } = await createCabinet(NAMES[1], "-U1"));
});

afterAll(async () => {
  await removeTestCabinets();
  await app.close();
  await prisma.$disconnect();
});

describe("GET /api/health", () => {
  it("answers ok when the database does", async () => {
    await api().get("/api/health").expect(200, { status: "ok" });
  });
});

describe("plan", () => {
  it("lists the cabinets", async () => {
    const response = await api().get("/api/cabinets").expect(200);
    expect(response.body).toEqual(expect.arrayContaining([{ id: cabinetA, name: NAMES[0] }]));
  });

  it("returns a cabinet with its rails, their status and the bar usage", async () => {
    const response = await api().get(`/api/cabinets/${cabinetA}`).expect(200);
    expect(response.body).toMatchObject({
      id: cabinetA,
      name: NAMES[0],
      rails: [{ id: railA, bmk: "-U1", cutLengthMm: 300, cutOrder: 1, status: "TO_CUT", mountedCount: 0, partCount: 3 }],
      bars: [{ barIndex: 0, barLengthMm: 2000, glbUrl: "/assets/glb/x.glb", usedMm: 300, remnantMm: 1700, pieces: [{ railId: railA, bmk: "-U1", offsetMm: 0, lengthMm: 300 }] }],
    });
  });

  it("returns a rail with its parts in mount order and where each goes", async () => {
    const response = await api().get(railUrl()).expect(200);
    expect(response.body.parts.map((part: { bmk: string }) => part.bmk)).toEqual(["-X1:1", "-X1:2", "-X1:3"]);
    expect(response.body.parts[0]).toMatchObject({
      mountSeq: 1,
      manufacturer: "Test",
      articleNumber: "terminal",
      glbUrl: "/assets/glb/x.glb",
      where: { kind: "FIRST", atMm: 10 },
      group: { size: 3, index: 1 },
      planWarning: null,
    });
    expect(response.body.parts[1].where).toEqual({ kind: "NEXT_TO", neighbourBmk: "-X1:1", atMm: 20 });
  });

  it("answers CABINET_NOT_FOUND for an unknown cabinet", async () => {
    const response = await api().get("/api/cabinets/999999").expect(404);
    expect(response.body.error).toMatchObject({ code: "CABINET_NOT_FOUND", details: { cabinetId: 999999 } });
  });

  it("does not find a rail through another cabinet", async () => {
    const response = await api().get(`/api/cabinets/${cabinetA}/rails/${railB}`).expect(404);
    expect(response.body.error.code).toBe("RAIL_NOT_FOUND");
  });

  it("rejects an id that is not a number", async () => {
    const response = await api().get("/api/cabinets/abc").expect(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("answers unknown routes in the same error shape", async () => {
    const response = await api().get("/api/nothing-here").expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("cutting", () => {
  it("marks a rail cut and records it", async () => {
    const response = await api().put(railUrl("/cut")).expect(200);
    expect(response.body).toMatchObject({ railId: railA, status: "READY", mountedCount: 0, partCount: 3, changed: true });
    expect(response.body.cutAt).not.toBeNull();
    expect(await eventTypes()).toEqual(["CUT"]);
  });

  it("changes nothing and records nothing when the rail is already cut", async () => {
    const first = await api().put(railUrl("/cut")).expect(200);
    const second = await api().put(railUrl("/cut")).expect(200);
    expect(second.body).toMatchObject({ changed: false, cutAt: first.body.cutAt });
    expect(await eventTypes()).toEqual(["CUT"]);
  });

  it("does not cut a rail through another cabinet", async () => {
    const response = await api().put(`/api/cabinets/${cabinetA}/rails/${railB}/cut`).expect(404);
    expect(response.body.error.code).toBe("RAIL_NOT_FOUND");
    expect((await api().get(`/api/cabinets/${cabinetB}/rails/${railB}`)).body.status).toBe("TO_CUT");
  });
});

describe("mount progress (compare-and-set)", () => {
  beforeEach(async () => {
    await api().put(railUrl("/cut"));
  });

  it("applies a step forward and records which part was mounted", async () => {
    const response = await step(0, 1).expect(200);
    expect(response.body).toMatchObject({ status: "IN_PROGRESS", mountedCount: 1, changed: true });
    const last = (await events()).at(-1);
    expect([last?.type, last?.placedItem?.bmk]).toEqual(["MOUNT", "-X1:1"]);
  });

  it("applies a step back and records which part came off", async () => {
    await step(0, 1);
    await step(1, 2);
    const response = await step(2, 1).expect(200);
    expect(response.body).toMatchObject({ mountedCount: 1, changed: true });
    const last = (await events()).at(-1);
    expect([last?.type, last?.placedItem?.bmk]).toEqual(["UNMOUNT", "-X1:2"]);
  });

  it("finishes the rail with the last part", async () => {
    await step(0, 1);
    await step(1, 2);
    expect((await step(2, 3).expect(200)).body.status).toBe("DONE");
  });

  it("treats a replayed step as done already: no change, no second event", async () => {
    await step(0, 1).expect(200);
    const replay = await step(0, 1).expect(200);
    expect(replay.body).toMatchObject({ mountedCount: 1, changed: false });
    expect(await eventTypes()).toEqual(["CUT", "MOUNT"]);
  });

  it("refuses a step from a stale screen and says where the rail really is", async () => {
    await step(0, 1);
    await step(1, 2);
    const response = await step(0, 1).expect(409);
    expect(response.body.error).toMatchObject({ code: "STALE_PROGRESS", details: { mountedCount: 2 } });
    expect((await api().get(railUrl())).body.mountedCount).toBe(2);
  });

  it("lets only one of two simultaneous taps count", async () => {
    const responses = await Promise.all([step(0, 1), step(0, 1), step(0, 1)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(responses.filter((response) => response.body.changed)).toHaveLength(1);
    expect(await eventTypes()).toEqual(["CUT", "MOUNT"]);
  });

  it.each([
    ["two parts at once", 0, 2],
    ["no movement", 1, 1],
    ["past the last part", 3, 4],
    ["from beyond the rail", 5, 4],
  ])("rejects %s as INVALID_STEP", async (_, from, to) => {
    const response = await step(from, to).expect(400);
    expect(response.body.error.code).toBe("INVALID_STEP");
  });

  it.each([
    ["a missing field", { from: 0 }],
    ["text", { from: "0", to: "1" }],
    ["a negative count", { from: 0, to: -1 }],
    ["an unknown field", { from: 0, to: 1, force: true }],
  ])("rejects %s as VALIDATION_FAILED", async (_, body) => {
    const response = await api().put(railUrl("/progress")).send(body).expect(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("refuses to mount on a rail that is not cut", async () => {
    // Cabinet B's rail has not been cut.
    const response = await api().put(`/api/cabinets/${cabinetB}/rails/${railB}/progress`).send({ from: 0, to: 1 }).expect(409);
    expect(response.body.error.code).toBe("RAIL_NOT_CUT");
  });

  it("does not move a rail through another cabinet", async () => {
    await api().put(`/api/cabinets/${cabinetB}/rails/${railB}/cut`);
    const response = await api().put(`/api/cabinets/${cabinetA}/rails/${railB}/progress`).send({ from: 0, to: 1 }).expect(404);
    expect(response.body.error.code).toBe("RAIL_NOT_FOUND");
    expect((await api().get(`/api/cabinets/${cabinetB}/rails/${railB}`)).body.mountedCount).toBe(0);
  });
});

describe("database constraints", () => {
  it("refuse parts mounted on an uncut rail, whatever the code does", async () => {
    await expect(prisma.railProgress.update({ where: { railId: railA }, data: { mountedCount: 1 } })).rejects.toThrow();
  });

  it("refuse a negative mounted count and a rail without length", async () => {
    await expect(
      prisma.railProgress.update({ where: { railId: railA }, data: { cutAt: new Date(), mountedCount: -1 } }),
    ).rejects.toThrow();
    await expect(prisma.rail.update({ where: { id: railA }, data: { cutLengthMm: 0 } })).rejects.toThrow();
  });

  it("refuse a negative part count", async () => {
    await expect(prisma.rail.update({ where: { id: railA }, data: { partCount: -1 } })).rejects.toThrow();
  });
});

describe("replaying an import with reset", () => {
  const REPLAY = "API replay cabinet";
  const runImport = () =>
    importPlan(prisma, { cabinetName: REPLAY, rails: realRails(), catalog: realCatalog(), projectRoot: PROJECT_ROOT, reset: true });

  /** What an operator sees: each rail's part count and its parts in mount order, with where they clip. */
  async function snapshot(cabinetId: number) {
    const cabinet = (await api().get(`/api/cabinets/${cabinetId}`).expect(200)).body;
    const rails = [];
    for (const summary of cabinet.rails) {
      const rail = (await api().get(`/api/cabinets/${cabinetId}/rails/${summary.id}`).expect(200)).body;
      rails.push({
        bmk: rail.bmk,
        partCount: rail.partCount,
        order: rail.parts.map((part: { bmk: string; where: unknown; planWarning: unknown }) => [part.bmk, part.where, part.planWarning]),
      });
    }
    return { rails: cabinet.rails.map((rail: { bmk: string; partCount: number; cutOrder: number }) => [rail.bmk, rail.partCount, rail.cutOrder]), detail: rails };
  }

  afterAll(async () => {
    await prisma.workEvent.deleteMany({ where: { cabinet: { name: REPLAY } } });
    await prisma.cabinet.deleteMany({ where: { name: REPLAY } });
  });

  it("gives the same mount order and part counts, and the count matches the parts stored", async () => {
    const first = await runImport();
    const before = await snapshot(first.cabinetId);

    const second = await runImport();
    const after = await snapshot(second.cabinetId);

    expect(after).toEqual(before);
    const expected = Object.fromEntries(realRails().map((rail) => [rail.bmk, rail.placedItems.length]));
    expect(Object.fromEntries(after.rails.map(([bmk, count]: [string, number]) => [bmk, count]))).toEqual(expected);
    for (const rail of await prisma.rail.findMany({ where: { cabinetId: second.cabinetId }, include: { _count: { select: { placedItems: true } } } })) {
      expect(rail.partCount).toBe(rail._count.placedItems);
    }
  });

  it("points a plan warning at the part itself", async () => {
    const { cabinetId } = await runImport();
    const warned = await prisma.placedItem.findMany({
      where: { rail: { cabinetId }, planWarning: "OVERLAPS_PART" },
      include: { planWarningItem: true },
    });
    for (const part of warned) expect(part.planWarningItem?.railId).toBe(part.railId);
    expect(warned.length).toBeGreaterThan(0);
  });
});
