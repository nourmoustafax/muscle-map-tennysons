import type {
  DataMode,
  FollowUp,
  LocalStore,
  Observation,
  Region,
} from "./domain";
import { validateObservation } from "./ingestion";
import { readStore, saveStore, STORE_KEY } from "./store";
import { measurementDate, todayDate } from "./personal-review";
import type {
  MonitorTask,
  PersonalState,
  Profile,
  TaskOutcome,
  TaskSource,
} from "./personal-types";

export const PERSONAL_KEY = "musclemap-personal-v1";

const MODES = new Set<DataMode>(["research", "simulated", "manual"]);
const REGIONS = new Set<Region>([
  "RIGHT_QUADRICEPS_GROUP",
  "RIGHT_MEDIAL_GASTROCNEMIUS",
]);
const TASK_KINDS = new Set<MonitorTask["kind"]>([
  "assessment",
  "followup",
  "exercise",
]);
const TASK_STATUSES = new Set<MonitorTask["status"]>([
  "scheduled",
  "pending",
  "completed",
  "cancelled",
]);
const OUTCOME_RESULTS = new Set<TaskOutcome["result"]>([
  "completed",
  "partial",
  "not_completed",
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const validId = (value: unknown): value is string =>
  typeof value === "string" && ID_PATTERN.test(value);
const validDateOnly = (value: unknown): value is string => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
  );
};
const validDateTime = (value: unknown): value is string =>
  typeof value === "string" &&
  DATE_TIME_PATTERN.test(value) &&
  Number.isFinite(Date.parse(value));
const validUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
const keysOnly = (value: Record<string, unknown>, allowed: Set<string>) =>
  Object.keys(value).filter((key) => !allowed.has(key));
const validationError = (message: string): { error: string } => ({
  error: message,
});

function canonicalObservation(value: unknown): {
  row?: Observation;
  error?: string;
} {
  const result = validateObservation(value);
  return result.row
    ? { row: result.row }
    : { error: result.error ?? "observation is invalid" };
}

function validateProfile(
  value: unknown,
  index: number,
): {
  profile?: Profile;
  error?: string;
} {
  if (!isRecord(value))
    return validationError(`profile ${index + 1} is malformed`);
  const unknown = keysOnly(
    value,
    new Set([
      "id",
      "name",
      "mode",
      "participant",
      "namespace",
      "missionName",
      "missionStartDate",
      "createdAt",
    ]),
  );
  if (unknown.length)
    return validationError(
      `profile ${index + 1} has unknown fields: ${unknown.join(", ")}`,
    );
  if (
    !validId(value.id) ||
    !nonempty(value.name) ||
    typeof value.mode !== "string" ||
    !MODES.has(value.mode as DataMode) ||
    !validId(value.participant) ||
    !validId(value.namespace) ||
    !validDateTime(value.createdAt)
  )
    return validationError(`profile ${index + 1} is invalid`);
  if (value.missionName !== undefined && !nonempty(value.missionName))
    return validationError(`profile ${index + 1} has an invalid missionName`);
  if (
    value.missionStartDate !== undefined &&
    !validDateOnly(value.missionStartDate)
  )
    return validationError(
      `profile ${index + 1} has an invalid missionStartDate`,
    );
  return {
    profile: {
      id: value.id,
      name: value.name.trim(),
      mode: value.mode as DataMode,
      participant: value.participant,
      namespace: value.namespace,
      ...(value.missionName === undefined
        ? {}
        : { missionName: value.missionName.trim() }),
      ...(value.missionStartDate === undefined
        ? {}
        : { missionStartDate: value.missionStartDate }),
      createdAt: value.createdAt,
    },
  };
}

function validateSource(
  value: unknown,
  label: string,
): {
  source?: TaskSource;
  error?: string;
} {
  if (!isRecord(value)) return validationError(`${label} is malformed`);
  const unknown = keysOnly(value, new Set(["kind", "name", "url"]));
  if (unknown.length)
    return validationError(
      `${label} has unknown fields: ${unknown.join(", ")}`,
    );
  if (
    !new Set<TaskSource["kind"]>(["user", "team", "education"]).has(
      value.kind as TaskSource["kind"],
    )
  )
    return validationError(`${label}.kind is invalid`);
  if (value.name !== undefined && !nonempty(value.name))
    return validationError(`${label}.name is invalid`);
  if (value.kind === "team" && !nonempty(value.name))
    return validationError(`${label}.name is required for team sources`);
  if (value.url !== undefined && !validUrl(value.url))
    return validationError(`${label}.url must be an http(s) URL`);
  return {
    source: {
      kind: value.kind as TaskSource["kind"],
      ...(value.name === undefined ? {} : { name: value.name.trim() }),
      ...(value.url === undefined ? {} : { url: value.url }),
    },
  };
}

function validateOutcome(
  value: unknown,
  label: string,
): {
  outcome?: TaskOutcome;
  error?: string;
} {
  if (!isRecord(value)) return validationError(`${label} is malformed`);
  if (
    keysOnly(value, new Set(["at", "result", "note", "observationIds"]))
      .length ||
    !(validDateOnly(value.at) || validDateTime(value.at)) ||
    !OUTCOME_RESULTS.has(value.result as TaskOutcome["result"]) ||
    !nonempty(value.note) ||
    !Array.isArray(value.observationIds) ||
    !value.observationIds.every(validId)
  )
    return validationError(`${label} is invalid`);
  return {
    outcome: {
      at: value.at,
      result: value.result as TaskOutcome["result"],
      note: value.note,
      observationIds: [...value.observationIds],
    },
  };
}

function validateTask(
  value: unknown,
  index: number,
): {
  task?: MonitorTask;
  error?: string;
} {
  const label = `task ${index + 1}`;
  if (!isRecord(value)) return validationError(`${label} is malformed`);
  const unknown = keysOnly(
    value,
    new Set([
      "id",
      "profileId",
      "kind",
      "title",
      "reason",
      "region",
      "measurement",
      "method",
      "protocol",
      "dueDate",
      "status",
      "source",
      "instructions",
      "evidenceIds",
      "outcomes",
      "parentTaskId",
      "createdAt",
      "updatedAt",
    ]),
  );
  if (unknown.length)
    return validationError(
      `${label} has unknown fields: ${unknown.join(", ")}`,
    );
  if (
    !validId(value.id) ||
    !validId(value.profileId) ||
    !TASK_KINDS.has(value.kind as MonitorTask["kind"]) ||
    !nonempty(value.title) ||
    !nonempty(value.reason) ||
    (value.region !== undefined && !REGIONS.has(value.region as Region)) ||
    (value.measurement !== undefined && !nonempty(value.measurement)) ||
    (value.method !== undefined && !nonempty(value.method)) ||
    (value.protocol !== undefined && !nonempty(value.protocol)) ||
    (value.dueDate !== undefined && !validDateOnly(value.dueDate)) ||
    !TASK_STATUSES.has(value.status as MonitorTask["status"]) ||
    !Array.isArray(value.evidenceIds) ||
    !value.evidenceIds.every(validId) ||
    !Array.isArray(value.outcomes) ||
    !validDateTime(value.createdAt) ||
    !validDateTime(value.updatedAt)
  )
    return validationError(`${label} is invalid`);
  const sourceResult = validateSource(value.source, `${label}.source`);
  if (!sourceResult.source) return sourceResult;
  const outcomes: TaskOutcome[] = [];
  for (
    let outcomeIndex = 0;
    outcomeIndex < value.outcomes.length;
    outcomeIndex += 1
  ) {
    const result = validateOutcome(
      value.outcomes[outcomeIndex],
      `${label}.outcomes[${outcomeIndex}]`,
    );
    if (!result.outcome) return result;
    outcomes.push(result.outcome);
  }
  if (value.instructions !== undefined && !nonempty(value.instructions))
    return validationError(`${label}.instructions is invalid`);
  if (value.parentTaskId !== undefined && !validId(value.parentTaskId))
    return validationError(`${label}.parentTaskId is invalid`);
  return {
    task: {
      id: value.id,
      profileId: value.profileId,
      kind: value.kind as MonitorTask["kind"],
      title: value.title.trim(),
      reason: value.reason.trim(),
      ...(value.region === undefined ? {} : { region: value.region as Region }),
      ...(value.measurement === undefined
        ? {}
        : { measurement: value.measurement.trim() }),
      ...(value.method === undefined ? {} : { method: value.method.trim() }),
      ...(value.protocol === undefined
        ? {}
        : { protocol: value.protocol.trim() }),
      ...(value.dueDate === undefined ? {} : { dueDate: value.dueDate }),
      status: value.status as MonitorTask["status"],
      source: sourceResult.source,
      ...(value.instructions === undefined
        ? {}
        : { instructions: value.instructions.trim() }),
      evidenceIds: [...value.evidenceIds],
      outcomes,
      ...(value.parentTaskId === undefined
        ? {}
        : { parentTaskId: value.parentTaskId }),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    },
  };
}

export function validatePersonalState(value: unknown): {
  state?: PersonalState;
  error?: string;
} {
  if (!isRecord(value))
    return validationError("personal state is not an object");
  const unknown = keysOnly(
    value,
    new Set([
      "version",
      "profiles",
      "activeProfileId",
      "lastPersonalProfileId",
      "baselines",
      "tasks",
      "history",
      "views",
    ]),
  );
  if (unknown.length)
    return validationError(
      `personal state has unknown fields: ${unknown.join(", ")}`,
    );
  if (
    value.version !== 1 ||
    !Array.isArray(value.profiles) ||
    !validId(value.activeProfileId) ||
    !isRecord(value.baselines) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.history) ||
    !isRecord(value.views)
  )
    return validationError(
      "personal state has malformed collections or version",
    );

  const profiles: Profile[] = [];
  const profileIds = new Set<string>();
  for (let index = 0; index < value.profiles.length; index += 1) {
    const result = validateProfile(value.profiles[index], index);
    if (!result.profile) return result;
    if (profileIds.has(result.profile.id))
      return validationError(`duplicate profile id: ${result.profile.id}`);
    profileIds.add(result.profile.id);
    profiles.push(result.profile);
  }
  if (!profiles.length || !profileIds.has(value.activeProfileId))
    return validationError("activeProfileId does not identify a profile");

  if (
    value.lastPersonalProfileId !== undefined &&
    !profiles.some(
      (p) => p.id === value.lastPersonalProfileId && p.mode === "manual",
    )
  )
    return validationError(
      "lastPersonalProfileId does not identify a personal profile",
    );
  const baselines: Record<string, string> = {};
  for (const [key, baseline] of Object.entries(value.baselines)) {
    if (!nonempty(key) || (baseline !== "" && !validId(baseline)))
      return validationError("baseline mapping is invalid");
    baselines[key] = baseline;
  }

  const tasks: MonitorTask[] = [];
  const taskIds = new Set<string>();
  for (let index = 0; index < value.tasks.length; index += 1) {
    const result = validateTask(value.tasks[index], index);
    if (!result.task) return result;
    if (taskIds.has(result.task.id))
      return validationError(`duplicate task id: ${result.task.id}`);
    if (!profileIds.has(result.task.profileId))
      return validationError(`task ${index + 1} references an unknown profile`);
    taskIds.add(result.task.id);
    tasks.push(result.task);
  }

  const history: PersonalState["history"] = [];
  for (let index = 0; index < value.history.length; index += 1) {
    const entry = value.history[index];
    if (
      !isRecord(entry) ||
      keysOnly(entry, new Set(["at", "action", "recordId", "before", "after"]))
        .length ||
      !validDateTime(entry.at) ||
      !nonempty(entry.action) ||
      !validId(entry.recordId)
    )
      return validationError(`history entry ${index + 1} is invalid`);
    const before =
      entry.before === undefined
        ? undefined
        : canonicalObservation(entry.before);
    const after =
      entry.after === undefined ? undefined : canonicalObservation(entry.after);
    if (before && !before.row)
      return validationError(`history entry ${index + 1} before is invalid`);
    if (after && !after.row)
      return validationError(`history entry ${index + 1} after is invalid`);
    history.push({
      at: entry.at,
      action: entry.action,
      recordId: entry.recordId,
      ...(before?.row === undefined ? {} : { before: before.row }),
      ...(after?.row === undefined ? {} : { after: after.row }),
    });
  }

  const views: PersonalState["views"] = {};
  for (const [key, viewValue] of Object.entries(value.views)) {
    if (!isRecord(viewValue))
      return validationError(`view ${key} is malformed`);
    if (
      keysOnly(viewValue, new Set(["region", "method", "date", "day"]))
        .length ||
      !REGIONS.has(viewValue.region as Region) ||
      !nonempty(viewValue.method) ||
      (viewValue.date !== undefined && !validDateOnly(viewValue.date)) ||
      (viewValue.day !== undefined &&
        (typeof viewValue.day !== "number" || !Number.isFinite(viewValue.day)))
    )
      return validationError(`view ${key} is invalid`);
    views[key] = {
      region: viewValue.region as Region,
      method: viewValue.method,
      ...(viewValue.date === undefined ? {} : { date: viewValue.date }),
      ...(viewValue.day === undefined ? {} : { day: viewValue.day }),
    };
  }
  return {
    state: {
      version: 1,
      profiles,
      activeProfileId: value.activeProfileId,
      ...(value.lastPersonalProfileId === undefined
        ? {}
        : { lastPersonalProfileId: value.lastPersonalProfileId as string }),
      baselines,
      tasks,
      history,
      views,
    },
  };
}

function profileIdFor(
  mode: DataMode,
  participant: string,
  namespace: string,
): string {
  const clean = (value: string) => value.replace(/[^A-Za-z0-9._:/-]+/g, "-");
  return `legacy-${clean(mode)}-${clean(participant)}-${clean(namespace)}`;
}

function profileForLegacy(
  observations: Observation[],
  mode: DataMode,
  participant: string,
  namespace: string,
  createdAt: string,
): Profile {
  return {
    id: profileIdFor(mode, participant, namespace),
    name: mode === "manual" ? participant : `Participant ${participant}`,
    mode,
    participant,
    namespace,
    createdAt,
  };
}

export function researchProfile(participant: string): Profile {
  const id = participant.trim();
  return {
    id: `research-${id}`,
    name: `Participant ${id}`,
    mode: "research",
    participant: id,
    namespace: "nasa-cft70-anatomy",
    createdAt: new Date().toISOString(),
  };
}

function demoProfile(createdAt: string): Profile {
  return {
    id: "demo",
    name: "Demo crew member",
    mode: "simulated",
    participant: "DEMO-01",
    namespace: "fictional-mission-2028",
    missionName: "Fictional mission demonstration",
    missionStartDate: "2028-03-01",
    createdAt,
  };
}

function defaultState(): PersonalState {
  const createdAt = new Date().toISOString();
  const personal: Profile = {
    id: "personal-default",
    name: "My profile",
    mode: "manual",
    participant: "ME-01",
    namespace: "personal-me-01",
    createdAt,
  };
  const demo = demoProfile(createdAt);
  const demoTask: MonitorTask = {
    id: "demo-assessment-2028-05-10",
    profileId: demo.id,
    kind: "assessment",
    title: "Fictional CSA assessment",
    reason: "Fictional scenario follow-up",
    region: "RIGHT_QUADRICEPS_GROUP",
    measurement: "CSA",
    method: "Panoramic ultrasound",
    protocol: "demo panoramic protocol A",
    dueDate: "2028-05-10",
    status: "scheduled",
    source: { kind: "education", name: "Fictional mission demonstration" },
    instructions: "Record the fictional right quadriceps CSA result.",
    evidenceIds: [],
    outcomes: [],
    createdAt,
    updatedAt: createdAt,
  };
  return {
    version: 1,
    profiles: [personal, demo],
    activeProfileId: personal.id,
    baselines: {},
    tasks: [demoTask],
    history: [],
    views: {},
  };
}

function migrateLegacy(
  state: PersonalState,
  legacy: LocalStore,
  createdAt: string,
): PersonalState {
  const profiles = [...state.profiles];
  const profileByScope = new Map(
    profiles.map((profile) => [
      `${profile.mode}|${profile.participant}|${profile.namespace}`,
      profile,
    ]),
  );
  for (const row of legacy.observations) {
    const scope = `${row.mode}|${row.participant}|${row.namespace}`;
    if (!profileByScope.has(scope)) {
      const profile = profileForLegacy(
        legacy.observations,
        row.mode,
        row.participant,
        row.namespace,
        createdAt,
      );
      profileByScope.set(scope, profile);
      profiles.push(profile);
    }
  }
  const tasks = [...state.tasks];
  const taskIds = new Set(tasks.map((task) => task.id));
  for (const followUp of legacy.followUps) {
    const scope = `${followUp.mode}|${followUp.participant}|${followUp.namespace ?? ""}`;
    let profile = profileByScope.get(scope);
    if (!profile) {
      profile = profileForLegacy(
        legacy.observations,
        followUp.mode,
        followUp.participant,
        followUp.namespace ?? `legacy-${followUp.participant}`,
        followUp.createdAt,
      );
      profileByScope.set(scope, profile);
      profiles.push(profile);
    }
    const id = `legacy-${followUp.id}`;
    if (taskIds.has(id)) continue;
    tasks.push({
      id,
      profileId: profile.id,
      kind: "followup",
      title: followUp.action.replace(/_/g, " "),
      reason:
        followUp.note ||
        "Legacy local review draft; no additional reason supplied.",
      region: followUp.region,
      status: "pending",
      source: { kind: "user", name: `Legacy local follow-up ${followUp.id}` },
      evidenceIds: [...followUp.evidenceIds],
      outcomes: [],
      createdAt: followUp.createdAt,
      updatedAt: followUp.createdAt,
    });
    taskIds.add(id);
  }
  const baselines = { ...state.baselines };
  for (const row of legacy.observations) {
    if (
      row.mode !== "manual" ||
      row.baseline !== true ||
      row.stream !== "anatomy" ||
      !row.region ||
      row.quality !== "valid" ||
      row.value === null ||
      !Number.isFinite(row.value) ||
      row.value <= 0
    )
      continue;
    const profile = profileByScope.get(
      `${row.mode}|${row.participant}|${row.namespace}`,
    );
    if (!profile) continue;
    const key = baselineKey(profile, row.region, row.modality);
    if (!Object.hasOwn(baselines, key)) baselines[key] = row.id;
  }
  return { ...state, profiles, tasks, baselines };
}

function readPersonalRaw(storage: Pick<Storage, "getItem">): {
  raw: string | null;
  state?: PersonalState;
  error?: string;
} {
  let raw: string | null;
  try {
    raw = storage.getItem(PERSONAL_KEY);
  } catch (caught) {
    return {
      raw: null,
      error: `unable to read personal state: ${caught instanceof Error ? caught.message : "storage error"}`,
    };
  }
  if (raw === null) return { raw };
  try {
    const result = validatePersonalState(JSON.parse(raw));
    return result.state
      ? { raw, state: result.state }
      : { raw, error: result.error ?? "stored personal state is invalid" };
  } catch (caught) {
    return {
      raw,
      error: `stored personal state is malformed: ${caught instanceof Error ? caught.message : "parse error"}`,
    };
  }
}

export function readPersonalState(
  storage: Pick<Storage, "getItem">,
  legacy: LocalStore,
): { state: PersonalState; error?: string; created: boolean } {
  const now = new Date().toISOString();
  const stored = readPersonalRaw(storage);
  if (stored.error)
    return {
      state: migrateLegacy(defaultState(), legacy, now),
      error: stored.error,
      created: true,
    };
  if (stored.state) {
    const migrated = migrateLegacy(stored.state, legacy, now);
    return { state: migrated, created: false };
  }
  const state = migrateLegacy(defaultState(), legacy, now);
  const manual = state.profiles.find(
    (profile) =>
      profile.mode === "manual" &&
      legacy.observations.some(
        (row) =>
          row.mode === profile.mode &&
          row.participant === profile.participant &&
          row.namespace === profile.namespace,
      ),
  );
  return {
    state: { ...state, activeProfileId: manual?.id ?? "personal-default" },
    created: true,
  };
}

function serializedPersonalState(state: PersonalState): {
  value?: string;
  error?: string;
} {
  const result = validatePersonalState(state);
  if (!result.state)
    return { error: result.error ?? "personal state is invalid" };
  try {
    return { value: JSON.stringify(result.state) };
  } catch (caught) {
    return {
      error: `unable to serialize personal state: ${caught instanceof Error ? caught.message : "serialization error"}`,
    };
  }
}

export function savePersonalState(
  state: PersonalState,
  storage: Pick<Storage, "getItem" | "setItem">,
): { ok: boolean; error?: string } {
  const serialized = serializedPersonalState(state);
  if (!serialized.value)
    return {
      ok: false,
      error: serialized.error ?? "personal state is invalid",
    };
  const existing = readPersonalRaw(storage);
  if (existing.error)
    return { ok: false, error: `personal write blocked: ${existing.error}` };
  try {
    storage.setItem(PERSONAL_KEY, serialized.value);
    return { ok: true };
  } catch (caught) {
    return {
      ok: false,
      error: `unable to save personal state: ${caught instanceof Error ? caught.message : "storage quota or storage error"}`,
    };
  }
}

function snapshot(storage: Pick<Storage, "getItem">): {
  values?: Record<string, string | null>;
  error?: string;
} {
  try {
    return {
      values: {
        [STORE_KEY]: storage.getItem(STORE_KEY),
        [PERSONAL_KEY]: storage.getItem(PERSONAL_KEY),
      },
    };
  } catch (caught) {
    return {
      error: `unable to snapshot stores: ${caught instanceof Error ? caught.message : "storage error"}`,
    };
  }
}

function restore(
  storage: Pick<Storage, "setItem" | "removeItem">,
  values: Record<string, string | null>,
): string[] {
  const errors: string[] = [];
  for (const key of [STORE_KEY, PERSONAL_KEY]) {
    try {
      const raw = values[key];
      if (raw === null) storage.removeItem(key);
      else storage.setItem(key, raw);
    } catch (caught) {
      errors.push(
        `${key}: ${caught instanceof Error ? caught.message : "rollback storage error"}`,
      );
    }
  }
  return errors;
}

export function commitStores(
  legacy: LocalStore,
  state: PersonalState,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): { ok: boolean; error?: string } {
  const checkedState = serializedPersonalState(state);
  if (!checkedState.value)
    return {
      ok: false,
      error: checkedState.error ?? "personal state is invalid",
    };
  const legacyStage: { value?: string; error?: string } = (() => {
    const stage: { value?: string } = {};
    const result = saveStore(legacy, {
      setItem: (_key, value) => {
        stage.value = value;
      },
    });
    return result.ok
      ? stage
      : { error: result.error ?? "legacy store is invalid" };
  })();
  if (!legacyStage.value)
    return { ok: false, error: legacyStage.error ?? "legacy store is invalid" };

  const original = snapshot(storage);
  if (!original.values) return { ok: false, error: original.error };
  if (original.values[STORE_KEY] !== null) {
    const checkedLegacy = readStore(storage);
    if (checkedLegacy.error)
      return {
        ok: false,
        error: `legacy write blocked: ${checkedLegacy.error}`,
      };
  }
  if (original.values[PERSONAL_KEY] !== null) {
    const checkedPersonal = readPersonalRaw(storage);
    if (checkedPersonal.error)
      return {
        ok: false,
        error: `personal write blocked: ${checkedPersonal.error}`,
      };
  }

  try {
    storage.setItem(STORE_KEY, legacyStage.value);
    storage.setItem(PERSONAL_KEY, checkedState.value);
    return { ok: true };
  } catch (caught) {
    const rollbackErrors = restore(storage, original.values);
    return {
      ok: false,
      error: `unable to commit stores: ${caught instanceof Error ? caught.message : "storage write error"}${
        rollbackErrors.length
          ? `; rollback failed: ${rollbackErrors.join("; ")}`
          : "; rolled back"
      }`,
    };
  }
}

export function restoreStores(
  legacy: LocalStore,
  state: PersonalState,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): { ok: boolean; error?: string } {
  const checkedState = serializedPersonalState(state);
  if (!checkedState.value)
    return {
      ok: false,
      error: checkedState.error ?? "personal state is invalid",
    };
  const legacyStage: { value?: string; error?: string } = (() => {
    const stage: { value?: string } = {};
    const result = saveStore(legacy, {
      setItem: (_key, value) => {
        stage.value = value;
      },
    });
    return result.ok
      ? stage
      : { error: result.error ?? "legacy store is invalid" };
  })();
  if (!legacyStage.value)
    return { ok: false, error: legacyStage.error ?? "legacy store is invalid" };

  const original = snapshot(storage);
  if (!original.values) return { ok: false, error: original.error };
  try {
    storage.setItem(STORE_KEY, legacyStage.value);
    storage.setItem(PERSONAL_KEY, checkedState.value);
    return { ok: true };
  } catch (caught) {
    const rollbackErrors = restore(storage, original.values);
    return {
      ok: false,
      error: `unable to restore stores: ${caught instanceof Error ? caught.message : "storage write error"}${
        rollbackErrors.length
          ? `; rollback failed: ${rollbackErrors.join("; ")}`
          : "; rolled back"
      }`,
    };
  }
}

export function baselineKey(
  profile: Profile,
  region: Region,
  method: string,
): string {
  return `${profile.id}:${region}:${method}`;
}

export function profileRows(
  rows: Observation[],
  profile: Profile,
): Observation[] {
  return rows.filter(
    (row) =>
      row.mode === profile.mode &&
      row.participant === profile.participant &&
      row.namespace === profile.namespace,
  );
}

export function createProfile(
  name: string,
  missionName?: string,
  missionStartDate?: string,
): Profile {
  const displayName = name.trim() || "My profile";
  const slug =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "profile";
  const profile: Profile = {
    id: `personal-${slug}`,
    name: displayName,
    mode: "manual",
    participant: `ME-${slug.toUpperCase()}`,
    namespace: `personal-${slug}`,
    createdAt: new Date().toISOString(),
  };
  if (missionName?.trim()) profile.missionName = missionName.trim();
  if (missionStartDate && validDateOnly(missionStartDate))
    profile.missionStartDate = missionStartDate;
  return profile;
}

export function getProfile(state: PersonalState): Profile {
  const profile = state.profiles.find(
    (candidate) => candidate.id === state.activeProfileId,
  );
  if (profile) return profile;
  if (state.profiles[0]) return state.profiles[0];
  throw new Error("personal state has no profiles");
}

export function nextTask(
  state: PersonalState,
  profile: Profile,
  todayISO: string,
): MonitorTask | undefined {
  const today = validDateOnly(todayISO) ? todayISO : "";
  const tasks = state.tasks
    .filter(
      (task) =>
        task.profileId === profile.id &&
        (task.status === "scheduled" || task.status === "pending"),
    )
    .sort((a, b) => {
      const overdue = (task: MonitorTask) =>
        !!today && !!task.dueDate && task.dueDate < today;
      if (overdue(a) !== overdue(b)) return overdue(a) ? -1 : 1;
      if ((a.status === "pending") !== (b.status === "pending"))
        return a.status === "pending" ? -1 : 1;
      if (a.dueDate !== undefined || b.dueDate !== undefined) {
        if (a.dueDate === undefined) return 1;
        if (b.dueDate === undefined) return -1;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      }
      return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
    });
  return tasks[0];
}

function taskFailure(message: string): { task: MonitorTask; error: string } {
  return { task: {} as MonitorTask, error: message };
}

export function completeAssessment(
  task: MonitorTask,
  row: Observation,
  profile: Profile,
): { task: MonitorTask; error?: string } {
  if (task.profileId !== profile.id)
    return taskFailure("task does not belong to profile");
  if (task.kind !== "assessment")
    return taskFailure("task is not an assessment");
  if (task.status === "cancelled" || task.status === "completed")
    return taskFailure("task is not active");
  const measuredDate = measurementDate(row, profile);
  if (!measuredDate)
    return taskFailure(
      "assessment observation requires a supplied measurement date",
    );
  if (
    row.mode !== profile.mode ||
    row.participant !== profile.participant ||
    row.namespace !== profile.namespace
  )
    return taskFailure("observation does not belong to profile");
  if (
    task.region !== undefined &&
    (row.region || row.relatedRegion) !== task.region
  )
    return taskFailure("observation region does not match task");
  const matchesType =
    task.measurement === "function"
      ? row.stream === "function"
      : task.measurement === "CSA"
        ? row.stream === "anatomy" && row.measurement === "CSA"
        : task.measurement === undefined ||
          row.measurement === task.measurement;
  if (!matchesType)
    return taskFailure("observation measurement does not match task");
  if (task.method !== undefined && row.modality !== task.method)
    return taskFailure("observation method does not match task");
  if (task.protocol !== undefined && row.protocol !== task.protocol)
    return taskFailure("observation protocol does not match task");
  if (
    row.quality !== "valid" ||
    row.value === null ||
    !Number.isFinite(row.value)
  )
    return taskFailure(
      "assessment observation must have a valid numeric value",
    );
  if (profile.mode !== "simulated") {
    if (profile.mode === "manual" && measuredDate > todayDate())
      return taskFailure("future personal observations cannot complete a task");
    if (measuredDate < task.createdAt.slice(0, 10))
      return taskFailure(
        "observation predates creation of this assessment reminder",
      );
  }
  const at = new Date().toISOString();
  const evidenceIds = task.evidenceIds.includes(row.id)
    ? [...task.evidenceIds]
    : [...task.evidenceIds, row.id];
  const outcome: TaskOutcome = {
    at,
    result: "completed",
    note: `Assessment recorded from observation ${row.id}.`,
    observationIds: [row.id],
  };
  return {
    task: {
      ...task,
      status: "completed",
      evidenceIds,
      outcomes: [...task.outcomes, outcome],
      updatedAt: at,
    },
  };
}

function planId(profile: Profile, title: string, index: number): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "task";
  return `plan-${profile.id}-${slug}-${index + 1}`;
}

export function parsePlan(
  text: string,
  profile: Profile,
): { tasks: MonitorTask[]; errors: string[] } {
  const errors: string[] = [];
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return { tasks: [], errors: ["plan JSON is malformed"] };
  }
  if (!Array.isArray(input))
    return { tasks: [], errors: ["plan JSON must be an array"] };
  const tasks: MonitorTask[] = [];
  const signatures = new Set<string>();
  const ids = new Set<string>();
  const now = new Date().toISOString();
  input.forEach((item, index) => {
    const label = `plan item ${index + 1}`;
    if (!isRecord(item)) {
      errors.push(`${label} is malformed`);
      return;
    }
    const unknown = keysOnly(
      item,
      new Set([
        "kind",
        "title",
        "reason",
        "dueDate",
        "region",
        "measurement",
        "method",
        "protocol",
        "source",
        "instructions",
      ]),
    );
    if (unknown.length) {
      errors.push(`${label} has unsupported fields: ${unknown.join(", ")}`);
      return;
    }
    if (
      !TASK_KINDS.has(item.kind as MonitorTask["kind"]) ||
      !nonempty(item.title) ||
      !nonempty(item.reason) ||
      (item.kind === "assessment" && !validDateOnly(item.dueDate)) ||
      (item.dueDate !== undefined && !validDateOnly(item.dueDate)) ||
      (item.region !== undefined && !REGIONS.has(item.region as Region)) ||
      (item.measurement !== undefined && !nonempty(item.measurement)) ||
      (item.method !== undefined && !nonempty(item.method)) ||
      (item.protocol !== undefined && !nonempty(item.protocol)) ||
      (item.instructions !== undefined && !nonempty(item.instructions))
    ) {
      errors.push(
        `${label} has invalid fields or an assessment is missing dueDate`,
      );
      return;
    }
    const sourceResult = validateSource(item.source, `${label}.source`);
    if (!sourceResult.source) {
      errors.push(sourceResult.error ?? `${label}.source is invalid`);
      return;
    }
    const signature = JSON.stringify([
      item.kind,
      item.title.trim(),
      item.reason.trim(),
      item.dueDate ?? null,
      item.region ?? null,
      item.measurement ?? null,
      item.method ?? null,
      item.protocol ?? null,
      sourceResult.source,
    ]);
    if (signatures.has(signature)) {
      errors.push(`${label} duplicates another plan task`);
      return;
    }
    const task: MonitorTask = {
      id: planId(profile, item.title.trim(), index),
      profileId: profile.id,
      kind: item.kind as MonitorTask["kind"],
      title: item.title.trim(),
      reason: item.reason.trim(),
      ...(item.region === undefined ? {} : { region: item.region as Region }),
      ...(item.measurement === undefined
        ? {}
        : { measurement: item.measurement.trim() }),
      ...(item.method === undefined ? {} : { method: item.method.trim() }),
      ...(item.protocol === undefined
        ? {}
        : { protocol: item.protocol.trim() }),
      ...(item.dueDate === undefined ? {} : { dueDate: item.dueDate }),
      status: item.dueDate === undefined ? "pending" : "scheduled",
      source: sourceResult.source,
      ...(item.instructions === undefined
        ? {}
        : { instructions: item.instructions.trim() }),
      evidenceIds: [],
      outcomes: [],
      createdAt: now,
      updatedAt: now,
    };
    if (ids.has(task.id)) errors.push(`${label} generates a duplicate task id`);
    ids.add(task.id);
    signatures.add(signature);
    tasks.push(task);
  });
  return errors.length ? { tasks: [], errors } : { tasks, errors: [] };
}
