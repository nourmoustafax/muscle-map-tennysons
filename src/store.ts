import type {
  FollowUp,
  Incident,
  LocalStore,
  Observation,
  Region,
} from "./domain";
import { validateObservation, sourceIdentity } from "./ingestion";

export const STORE_KEY = "musclemap-release-v2";

export function emptyStore(): LocalStore {
  return {
    version: 2,
    observations: [],
    followUps: [],
    incidents: [],
    audit: [],
  };
}

const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const regionSet = new Set<Region>([
  "RIGHT_QUADRICEPS_GROUP",
  "RIGHT_MEDIAL_GASTROCNEMIUS",
]);
const modes = new Set(["research", "simulated", "manual"]);
const followUpActions = new Set([
  "verify_measurement",
  "reassessment",
  "medical_review",
  "exercise_review",
  "continue_monitoring",
]);
const followUpStatuses = new Set(["draft", "prepared"]);
const isoDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

const isoDay = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const time = Date.parse(value + "T00:00:00Z");
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
};

function validateFollowUp(value: unknown): value is FollowUp {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<FollowUp>;
  return (
    nonempty(row.id) &&
    nonempty(row.participant) &&
    typeof row.mode === "string" &&
    modes.has(row.mode) &&
    typeof row.day === "number" &&
    Number.isFinite(row.day) &&
    regionSet.has(row.region as Region) &&
    typeof row.action === "string" &&
    followUpActions.has(row.action) &&
    nonempty(row.note) &&
    typeof row.status === "string" &&
    followUpStatuses.has(row.status) &&
    isoDate(row.createdAt) &&
    Array.isArray(row.evidenceIds) &&
    row.evidenceIds.every(nonempty)
  );
}

function validateIncident(value: unknown): value is Incident {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<Incident>;
  return (
    nonempty(row.id) &&
    nonempty(row.description) &&
    nonempty(row.region) &&
    Array.isArray(row.reportedSymptoms) &&
    row.reportedSymptoms.every(nonempty) &&
    typeof row.escalationNotice === "boolean" &&
    Array.isArray(row.noticeReasons) &&
    row.noticeReasons.every(nonempty) &&
    isoDate(row.createdAt) &&
    row.nonOperational === true &&
    (row.onsetDate === undefined || isoDay(row.onsetDate)) &&
    (row.owner === undefined ||
      (row.owner !== null &&
        typeof row.owner === "object" &&
        nonempty(row.owner.profileId) &&
        nonempty(row.owner.participant) &&
        nonempty(row.owner.namespace) &&
        modes.has(row.owner.mode)))
  );
}

function validateStoreValue(value: unknown): {
  store?: LocalStore;
  error?: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { error: "stored value is not an object" };
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 2)
    return { error: "unknown or unsupported store schema version" };
  const allowed = new Set([
    "version",
    "observations",
    "followUps",
    "incidents",
    "audit",
  ]);
  const unknown = Object.keys(candidate).filter((key) => !allowed.has(key));
  if (unknown.length)
    return { error: `stored value has unknown fields: ${unknown.join(", ")}` };
  if (
    !Array.isArray(candidate.observations) ||
    !Array.isArray(candidate.followUps) ||
    !Array.isArray(candidate.incidents) ||
    !Array.isArray(candidate.audit)
  )
    return { error: "stored value has malformed collections" };
  const observations: Observation[] = [];
  const ids = new Set<string>();
  const sourceIds = new Set<string>();
  for (const input of candidate.observations) {
    const result = validateObservation(input);
    if (!result.row)
      return {
        error: `stored observation is invalid: ${result.error ?? "unknown validation error"}`,
      };
    if (ids.has(result.row.id))
      return {
        error: `stored observations contain duplicate id: ${result.row.id}`,
      };
    ids.add(result.row.id);
    const sourceId = sourceIdentity(result.row);
    if (sourceIds.has(sourceId))
      return {
        error:
          "stored observations contain a duplicate source-row measurement identity",
      };
    sourceIds.add(sourceId);
    observations.push(result.row);
  }
  if (!candidate.followUps.every(validateFollowUp))
    return { error: "stored follow-up is malformed" };
  if (!candidate.incidents.every(validateIncident))
    return { error: "stored incident is malformed" };
  for (const audit of candidate.audit) {
    if (!audit || typeof audit !== "object" || Array.isArray(audit))
      return { error: "stored audit entry is malformed" };
    const entry = audit as Record<string, unknown>;
    if (
      !isoDate(entry.at) ||
      !nonempty(entry.action) ||
      !Array.isArray(entry.ids) ||
      !entry.ids.every(nonempty)
    )
      return { error: "stored audit entry is malformed" };
  }
  return {
    store: {
      version: 2,
      observations,
      followUps: candidate.followUps as FollowUp[],
      incidents: candidate.incidents as Incident[],
      audit: candidate.audit as LocalStore["audit"],
    },
  };
}

export function readStore(storage: Pick<Storage, "getItem">): {
  store: LocalStore;
  error?: string;
} {
  let raw: string | null;
  try {
    raw = storage.getItem(STORE_KEY);
  } catch (caught) {
    return {
      store: emptyStore(),
      error: `unable to read local store: ${caught instanceof Error ? caught.message : "storage error"}`,
    };
  }
  if (raw === null) return { store: emptyStore() };
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = validateStoreValue(parsed);
    if (!result.store)
      return {
        store: emptyStore(),
        error: result.error ?? "stored value is invalid",
      };
    return { store: result.store };
  } catch (caught) {
    return {
      store: emptyStore(),
      error: `stored value is malformed: ${caught instanceof Error ? caught.message : "parse error"}`,
    };
  }
}

export function saveStore(
  store: LocalStore,
  storage: Pick<Storage, "setItem">,
): { ok: boolean; error?: string } {
  const result = validateStoreValue(store);
  if (!result.store)
    return { ok: false, error: result.error ?? "store is invalid" };
  try {
    storage.setItem(STORE_KEY, JSON.stringify(result.store));
    return { ok: true };
  } catch (caught) {
    return {
      ok: false,
      error: `unable to save local store: ${caught instanceof Error ? caught.message : "storage quota or storage error"}`,
    };
  }
}
