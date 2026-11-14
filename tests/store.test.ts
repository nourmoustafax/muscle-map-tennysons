import { describe, expect, it } from "vitest";
import type { Observation } from "../src/domain";
import { emptyStore, readStore, saveStore, STORE_KEY } from "../src/store";

const observation = (id = "o-1"): Observation => ({
  id,
  participant: "p1",
  mode: "manual",
  stream: "anatomy",
  region: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 0,
  timepoint: "T0",
  phase: "baseline",
  value: 12,
  unit: "cm²",
  measurement: "CSA",
  modality: "MRI",
  protocol: "protocol-1",
  site: "right thigh",
  quality: "valid",
  sourceId: "source-1",
  sourceRow: "row-1",
  namespace: "local:demo",
  linkage: "verified",
  baseline: true,
});

class MemoryStorage {
  value: string | null = null;
  getItem = (_key: string) => this.value;
  setItem = (_key: string, value: string) => {
    this.value = value;
  };
}

describe("release store", () => {
  it("round trips validated observations under the release key", () => {
    const storage = new MemoryStorage();
    const store = emptyStore();
    store.observations.push(observation());
    expect(saveStore(store, storage)).toEqual({ ok: true });
    expect(storage.value).toContain('"version":2');
    expect(readStore(storage).store.observations[0]).toMatchObject({
      id: "o-1",
      value: 12,
    });
    expect(STORE_KEY).toBe("musclemap-release-v2");
  });

  it("reports malformed and unknown schemas without silently accepting or overwriting them", () => {
    const storage = new MemoryStorage();
    storage.value =
      '{"version":1,"observations":[],"followUps":[],"incidents":[],"audit":[]}';
    const result = readStore(storage);
    expect(result.error).toMatch(/schema/);
    expect(result.store).toEqual(emptyStore());
    expect(storage.value).toContain('"version":1');
    expect(
      saveStore(
        { ...emptyStore(), observations: [{ ...observation(), value: -1 }] },
        storage,
      ),
    ).toMatchObject({ ok: false });
  });

  it("surfaces storage quota/write errors", () => {
    const storage = {
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(saveStore(emptyStore(), storage)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/quota/),
    });
  });
});
