import { describe, expect, it } from "vitest";
import type { LocalStore, Observation } from "../src/domain";
import type { MonitorTask, PersonalState, Profile } from "../src/personal-types";
import {
  PERSONAL_KEY,
  baselineKey,
  commitStores,
  completeAssessment,
  createProfile,
  nextTask,
  parsePlan,
  profileRows,
  readPersonalState,
  researchProfile,
  restoreStores,
  savePersonalState,
  validatePersonalState,
} from "../src/personal-state";
import { STORE_KEY } from "../src/store";

class MemoryStorage {
  private values = new Map<string, string>();
  failKey?: string;
  getItem = (key: string): string | null => this.values.get(key) ?? null;
  setItem = (key: string, value: string): void => {
    if (key === this.failKey) throw new Error("quota exceeded");
    this.values.set(key, value);
  };
  removeItem = (key: string): void => {
    this.values.delete(key);
  };
  setRaw(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const observation = (overrides: Partial<Observation> = {}): Observation => ({
  id: "manual-1",
  participant: "ME-01",
  mode: "manual",
  stream: "anatomy",
  region: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 0,
  timepoint: "T0",
  phase: "assessment",
  acquiredAt: "2026-11-13T09:00:00Z",
  value: 25,
  unit: "cm²",
  measurement: "CSA",
  modality: "Panoramic ultrasound",
  protocol: "personal-protocol",
  site: "Right thigh",
  quality: "valid",
  sourceId: "personal-source",
  sourceRow: "row-1",
  namespace: "personal-me-01",
  linkage: "unverified",
  ...overrides,
});

const legacyStore = (overrides: Partial<LocalStore> = {}): LocalStore => ({
  version: 2,
  observations: [],
  followUps: [],
  incidents: [],
  audit: [],
  ...overrides,
});

function personalState(storage = new MemoryStorage()): {
  storage: MemoryStorage;
  state: PersonalState;
  profile: Profile;
} {
  const result = readPersonalState(storage, legacyStore());
  const profile = result.state.profiles.find((item) => item.id === "personal-default")!;
  return { storage, state: result.state, profile };
}

function task(profile: Profile): MonitorTask {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id: "assessment-1",
    profileId: profile.id,
    kind: "assessment",
    title: "CSA assessment",
    reason: "User supplied follow-up",
    region: "RIGHT_QUADRICEPS_GROUP",
    measurement: "CSA",
    method: "Panoramic ultrasound",
    protocol: "personal-protocol",
    dueDate: "2026-11-14",
    status: "scheduled",
    source: { kind: "user", name: "My plan" },
    evidenceIds: [],
    outcomes: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe("personal-state isolation and migration", () => {
  it("creates stable personal/demo defaults without touching the v2 raw payload", () => {
    const storage = new MemoryStorage();
    const rawLegacy = JSON.stringify(legacyStore());
    storage.setRaw(STORE_KEY, rawLegacy);
    const result = readPersonalState(storage, legacyStore());
    expect(result.created).toBe(true);
    expect(result.state.profiles[0]).toMatchObject({
      id: "personal-default",
      name: "My profile",
      mode: "manual",
      participant: "ME-01",
      namespace: "personal-me-01",
    });
    expect(result.state.profiles.find((profile) => profile.id === "demo")).toMatchObject({
      name: "Demo crew member",
      mode: "simulated",
      participant: "DEMO-01",
      namespace: "fictional-mission-2028",
      missionName: "Fictional mission demonstration",
      missionStartDate: "2028-03-01",
    });
    expect(result.state.tasks).toHaveLength(1);
    expect(result.state.tasks[0]).toMatchObject({
      profileId: "demo",
      dueDate: "2028-05-10",
      region: "RIGHT_QUADRICEPS_GROUP",
      measurement: "CSA",
      method: "Panoramic ultrasound",
      protocol: "demo panoramic protocol A",
    });
    expect(storage.getItem(STORE_KEY)).toBe(rawLegacy);
    expect(storage.getItem(PERSONAL_KEY)).toBeNull();
  });

  it("derives exact legacy profiles and follow-up tasks without migrating incidents", () => {
    const row = observation({ id: "legacy-row", participant: "LEGACY-1", namespace: "crew-local" });
    const legacy = legacyStore({
      observations: [row],
      followUps: [
        {
          id: "fu-1",
          participant: "LEGACY-1",
          mode: "manual",
          namespace: "crew-local",
          day: 2,
          region: "RIGHT_QUADRICEPS_GROUP",
          action: "reassessment",
          note: "Check the stored method.",
          status: "draft",
          createdAt: "2026-01-02T00:00:00Z",
          evidenceIds: ["legacy-row"],
        },
      ],
      incidents: [
        {
          id: "incident-1",
          description: "old",
          region: "calf",
          reportedSymptoms: [],
          escalationNotice: false,
          noticeReasons: [],
          createdAt: "2026-01-02T00:00:00Z",
          nonOperational: true,
        },
      ],
    });
    const result = readPersonalState(new MemoryStorage(), legacy);
    const migrated = result.state.profiles.find(
      (profile) => profile.participant === "LEGACY-1",
    )!;
    expect(migrated).toMatchObject({ mode: "manual", namespace: "crew-local" });
    expect(result.state.activeProfileId).toBe(migrated.id);
    expect(result.state.tasks).toContainEqual(
      expect.objectContaining({
        id: "legacy-fu-1",
        profileId: migrated.id,
        status: "pending",
        evidenceIds: ["legacy-row"],
      }),
    );
    expect(result.state).not.toHaveProperty("incidents");
  });

  it("keeps research rows read-only and scopes rows by exact identity", () => {
    const profile = researchProfile("7326");
    const row = observation({
      mode: "research",
      participant: "7326",
      namespace: "nasa-cft70-anatomy",
      id: "research-row",
    });
    const unrelated = { ...row, id: "other", participant: "7327" };
    const rows = [row, unrelated];
    expect(profileRows(rows, profile)).toEqual([row]);
    expect(rows).toEqual([row, unrelated]);
    expect(profile).toMatchObject({
      id: "research-7326",
      name: "Participant 7326",
      namespace: "nasa-cft70-anatomy",
    });
  });
});

describe("personal task workflow", () => {
  it("does not mark missing dates overdue and selects only owned active tasks", () => {
    const { state, profile } = personalState();
    const pending = task(profile);
    pending.id = "pending-no-date";
    pending.dueDate = undefined;
    pending.status = "pending";
    const overdue = { ...task(profile), id: "overdue", dueDate: "2026-11-13" };
    const other = { ...task(profile), id: "other", profileId: "demo", dueDate: "2020-01-01" };
    const next = nextTask({ ...state, tasks: [pending, overdue, other] }, profile, "2026-11-14");
    expect(next?.id).toBe("overdue");
    expect(nextTask({ ...state, tasks: [pending] }, profile, "2026-11-14")?.id).toBe(
      "pending-no-date",
    );
  });

  it("completes only a valid exact assessment and rejects wrong, missing, future, and old rows", () => {
    const { profile } = personalState();
    const establishedProfile = { ...profile, createdAt: "2026-01-01T00:00:00Z" };
    const assessment = task(establishedProfile);
    const currentObservation = observation({
      acquiredAt: new Date(Date.now() - 1000).toISOString(),
    });
    const completed = completeAssessment(
      assessment,
      currentObservation,
      establishedProfile,
    );
    expect(completed.task.status).toBe(
      "completed",
    );
    expect(completeAssessment(assessment, observation({ region: "RIGHT_MEDIAL_GASTROCNEMIUS" }), establishedProfile).error).toMatch(
      /region/i,
    );
    expect(completeAssessment(assessment, observation({ quality: "missing", value: null }), establishedProfile).error).toMatch(
      /numeric/i,
    );
    expect(
      completeAssessment(
        assessment,
        observation({ acquiredAt: "2099-01-01T00:00:00Z" }),
        establishedProfile,
      ).error,
    ).toMatch(/future/i);
    expect(
      completeAssessment(
        assessment,
        observation({ acquiredAt: "2020-01-01T00:00:00Z" }),
        establishedProfile,
      ).error,
    ).toMatch(/predates/i);
    const simulated = readPersonalState(new MemoryStorage(), legacyStore()).state.profiles.find(
      (item) => item.id === "demo",
    )!;
    expect(
      completeAssessment(
        { ...assessment, profileId: simulated.id },
        observation({
          mode: "simulated",
          participant: "DEMO-01",
          namespace: "fictional-mission-2028",
          acquiredAt: "2028-05-10T09:00:00Z",
        }),
        simulated,
      ).error,
    ).toBeUndefined();
  });

  it("round trips state and preserves the active profile", () => {
    const { storage, state } = personalState();
    const custom = createProfile("Alex Crew", "Mission A", "2028-03-01");
    const saved = { ...state, profiles: [...state.profiles, custom], activeProfileId: custom.id };
    expect(savePersonalState(saved, storage)).toEqual({ ok: true });
    const reloaded = readPersonalState(storage, legacyStore());
    expect(reloaded.created).toBe(false);
    expect(reloaded.state.activeProfileId).toBe(custom.id);
    expect(validatePersonalState(reloaded.state).error).toBeUndefined();
    expect(baselineKey(custom, "RIGHT_QUADRICEPS_GROUP", "MRI")).toContain(custom.id);
  });

  it("migrates a valid manual legacy baseline once without replacing an explicit empty selection", () => {
    const row = observation({ baseline: true, id: "legacy-baseline" });
    const legacy = legacyStore({ observations: [row] });
    const first = readPersonalState(new MemoryStorage(), legacy);
    const personal = first.state.profiles.find((item) => item.id === "personal-default")!;
    expect(first.state.baselines[baselineKey(personal, row.region!, row.modality)]).toBe(
      row.id,
    );

    const storage = new MemoryStorage();
    const explicit = {
      ...first.state,
      baselines: {
        [baselineKey(personal, row.region!, row.modality)]: "",
      },
    };
    expect(savePersonalState(explicit, storage)).toEqual({ ok: true });
    expect(readPersonalState(storage, legacy).state.baselines[baselineKey(personal, row.region!, row.modality)]).toBe("");
  });

  it("accepts day-only outcomes and rejects unnamed team sources", () => {
    const { state, profile } = personalState();
    const withOutcome = {
      ...state,
      tasks: [
        {
          ...task(profile),
          outcomes: [
            {
              at: "2026-11-14",
              result: "partial" as const,
              note: "Recorded on the supplied day",
              observationIds: [],
            },
          ],
        },
      ],
    };
    expect(validatePersonalState(withOutcome).error).toBeUndefined();
    const invalid = parsePlan(
      JSON.stringify([
        {
          kind: "followup",
          title: "Team task",
          reason: "Needs an identified source",
          source: { kind: "team" },
        },
      ]),
      profile,
    );
    expect(invalid.tasks).toEqual([]);
    expect(invalid.errors.join(" ")).toMatch(/name.*team/i);
  });
});

describe("atomic persistence and plan import", () => {
  it("rolls back both keys on quota failure and leaves malformed payloads untouched", () => {
    const storage = new MemoryStorage();
    const originalLegacy = JSON.stringify(legacyStore());
    const originalPersonal = JSON.stringify(personalState().state);
    storage.setRaw(STORE_KEY, originalLegacy);
    storage.setRaw(PERSONAL_KEY, originalPersonal);
    const { state } = personalState(storage);
    storage.failKey = PERSONAL_KEY;
    const result = commitStores(legacyStore(), state, storage);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/rolled back|rollback/i);
    expect(storage.getItem(STORE_KEY)).toBe(originalLegacy);
    expect(storage.getItem(PERSONAL_KEY)).toBe(originalPersonal);

    const malformed = new MemoryStorage();
    malformed.setRaw(PERSONAL_KEY, '{"version":999,"unknown":true}');
    const malformedResult = savePersonalState(state, malformed);
    expect(malformedResult.ok).toBe(false);
    expect(malformed.getItem(PERSONAL_KEY)).toBe('{"version":999,"unknown":true}');
  });

  it("uses restoreStores to replace malformed data and restores exact raw keys on failure", () => {
    const recovery = new MemoryStorage();
    const originalLegacy = "malformed legacy payload";
    const originalPersonal = '{"version":999,"unknown":true}';
    recovery.setRaw(STORE_KEY, originalLegacy);
    recovery.setRaw(PERSONAL_KEY, originalPersonal);
    const valid = personalState().state;
    expect(restoreStores(legacyStore(), valid, recovery)).toEqual({ ok: true });
    expect(recovery.getItem(STORE_KEY)).not.toBe(originalLegacy);
    expect(recovery.getItem(PERSONAL_KEY)).not.toBe(originalPersonal);

    const failed = new MemoryStorage();
    failed.setRaw(STORE_KEY, originalLegacy);
    failed.setRaw(PERSONAL_KEY, originalPersonal);
    failed.failKey = PERSONAL_KEY;
    expect(restoreStores(legacyStore(), valid, failed).ok).toBe(false);
    expect(failed.getItem(STORE_KEY)).toBe(originalLegacy);
    expect(failed.getItem(PERSONAL_KEY)).toBe(originalPersonal);
  });

  it("imports user-supplied assessment dates atomically and rejects unsafe sources", () => {
    const { profile } = personalState();
    const valid = parsePlan(
      JSON.stringify([
        {
          kind: "assessment",
          title: "Record CSA",
          reason: "User supplied due assessment",
          dueDate: "2026-12-01",
          region: "RIGHT_QUADRICEPS_GROUP",
          measurement: "CSA",
          method: "Panoramic ultrasound",
          protocol: "personal-protocol",
          source: { kind: "user", name: "Crew note", url: "https://example.test/plan" },
        },
      ]),
      profile,
    );
    expect(valid.errors).toEqual([]);
    expect(valid.tasks[0]).toMatchObject({ profileId: profile.id, status: "scheduled", dueDate: "2026-12-01" });

    const missingDate = parsePlan(
      JSON.stringify([
        {
          kind: "assessment",
          title: "No date",
          reason: "Must be scheduled",
          source: { kind: "user" },
        },
      ]),
      profile,
    );
    expect(missingDate.tasks).toEqual([]);
    expect(missingDate.errors.join(" ")).toMatch(/dueDate/i);

    const unsafe = parsePlan(
      JSON.stringify([
        {
          kind: "followup",
          title: "Unsafe source",
          reason: "Reject unsafe URL",
          source: { kind: "team", url: "javascript:alert(1)" },
        },
        {
          kind: "followup",
          title: "Dose",
          reason: "Reject unsupported field",
          dose: "10",
          source: { kind: "team" },
        },
      ]),
      profile,
    );
    expect(unsafe.tasks).toEqual([]);
    expect(unsafe.errors.length).toBe(2);
  });
});
