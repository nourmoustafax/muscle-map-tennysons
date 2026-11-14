import type { DataMode, Observation, Region, Stream } from "./domain";
import { reviewObservations } from "./engine";

export interface IntakeDestinationKey {
  participant: string;
  mode: DataMode;
  namespace: string;
  region?: Region;
  modality: string;
}

export type IntakeStepStatus = "complete" | "attention" | "unchanged";

export interface IntakeStep {
  label: string;
  detail: string;
  status: IntakeStepStatus;
}

export interface IntakeChange {
  key: IntakeDestinationKey;
  destination: string;
  stream: Stream;
  incomingIds: string[];
  beforeIds: string[];
  afterIds: string[];
  beforeCount: number;
  afterCount: number;
  status: "added" | "updated" | "unchanged" | "attention";
  comparison: "ready" | "missing" | "check_comparability" | "not_applicable";
  detail: string;
  anatomyChanged: boolean;
}

export interface IntakeDescription {
  title: string;
  summary: string;
  steps: IntakeStep[];
  changes: IntakeChange[];
  followUpSuggested: boolean;
  anatomyChanged: boolean;
}

function regionFor(row: Observation): Region | undefined {
  return row.region ?? row.relatedRegion;
}

function keyFor(row: Observation): IntakeDestinationKey {
  return {
    participant: row.participant,
    mode: row.mode,
    namespace: row.namespace,
    region: regionFor(row),
    modality: row.modality,
  };
}

function keyString(key: IntakeDestinationKey): string {
  return [
    key.participant,
    key.mode,
    key.namespace,
    key.region ?? "unmapped",
    key.modality,
  ].join("|");
}

function sameKey(row: Observation, key: IntakeDestinationKey): boolean {
  const rowKey = keyFor(row);
  return (
    rowKey.participant === key.participant &&
    rowKey.mode === key.mode &&
    rowKey.namespace === key.namespace &&
    rowKey.region === key.region &&
    rowKey.modality === key.modality
  );
}

function displayStream(rows: Observation[]): Stream {
  const first = rows[0];
  return first?.stream ?? "symptom";
}

function canonicalStats(rows: Observation[]): {
  valid: number;
  missing: number;
  pending: number;
  mapped: number;
} {
  return {
    valid: rows.filter((row) => row.quality === "valid").length,
    missing: rows.filter(
      (row) => row.quality === "missing" || row.value === null,
    ).length,
    pending: rows.filter((row) => row.quality === "check_comparability").length,
    mapped: rows.filter((row) => Boolean(regionFor(row))).length,
  };
}

function rowSignature(row: Observation): string {
  return JSON.stringify([
    row.id,
    row.day,
    row.value,
    row.quality,
    row.unit,
    row.measurement,
    row.protocol,
    row.site,
    row.sourceId,
    row.sourceRow,
  ]);
}

function changeFor(
  incoming: Observation[],
  before: Observation[],
  after: Observation[],
  key: IntakeDestinationKey,
): IntakeChange {
  const scopedIncoming = incoming.filter((row) => sameKey(row, key));
  const scopedBefore = before.filter((row) => sameKey(row, key));
  const scopedAfter = after.filter((row) => sameKey(row, key));
  const streams = new Set(scopedIncoming.map((row) => row.stream));
  const stream = displayStream(scopedIncoming);
  const hasAnatomy = streams.has("anatomy");
  const hasOnlyContext = [...streams].every(
    (item) => item === "function" || item === "activity",
  );
  const pending = scopedIncoming.some(
    (row) => row.quality === "check_comparability",
  );
  const missing = scopedIncoming.some(
    (row) => row.quality === "missing" || row.value === null,
  );
  const mapped = scopedIncoming.every((row) => Boolean(regionFor(row)));
  const afterHasIncoming = scopedIncoming.every((row) =>
    scopedAfter.some((candidate) => candidate.id === row.id),
  );
  const anatomyChanged = hasAnatomy;
  let status: IntakeChange["status"] = "unchanged";
  if (!afterHasIncoming) status = "attention";
  else if (missing || pending || !mapped) status = "attention";
  else if (
    scopedIncoming.some(
      (row) => !scopedBefore.some((candidate) => candidate.id === row.id),
    )
  )
    status = scopedBefore.length ? "updated" : "added";

  let comparison: IntakeChange["comparison"] = "not_applicable";
  if (hasAnatomy) {
    const review = key.region
      ? reviewObservations(after, {
          mode: key.mode,
          participant: key.participant,
          namespace: key.namespace,
          region: key.region,
          modality: key.modality,
          day: Math.max(0, ...scopedAfter.map((row) => row.day)),
        })
      : undefined;
    if (pending) comparison = "check_comparability";
    else if (
      !afterHasIncoming ||
      !review ||
      review.state === "BASELINE_MISSING" ||
      review.state === "MEASUREMENT_MISSING"
    )
      comparison = "missing";
    else if (review.state === "CHECK_COMPARABILITY")
      comparison = "check_comparability";
    else comparison = "ready";
  }

  let detail: string;
  if (hasOnlyContext && !hasAnatomy) {
    detail =
      "Function/activity context was received for this destination. CSA remains unchanged; this context does not use an anatomy baseline.";
  } else if (!mapped) {
    detail = "The incoming record is not mapped to a measured region yet.";
  } else if (pending) {
    detail =
      "The record is present, but its quality requires a comparability review before it can affect the trend.";
  } else if (missing) {
    detail =
      "The record is present with a missing value; no value was imputed and no trend was changed by assumption.";
  } else if (!afterHasIncoming) {
    detail =
      "The post-intake records do not contain every incoming observation; review the save result before relying on it.";
  } else {
    detail = `The ${hasAnatomy ? "anatomy record" : "context record"} is present in the destination review.`;
  }

  return {
    key,
    destination: keyString(key),
    stream,
    incomingIds: scopedIncoming.map((row) => row.id),
    beforeIds: scopedBefore.map((row) => row.id),
    afterIds: scopedAfter.map((row) => row.id),
    beforeCount: scopedBefore.length,
    afterCount: scopedAfter.length,
    status,
    comparison,
    detail,
    anatomyChanged,
  };
}

export function describeIntake(
  incoming: Observation[],
  before: Observation[],
  after: Observation[],
): IntakeDescription {
  const stats = canonicalStats(incoming);
  const keys = new Map<string, IntakeDestinationKey>();
  for (const row of incoming) {
    const key = keyFor(row);
    keys.set(keyString(key), key);
  }
  const changes = [...keys.values()].map((key) =>
    changeFor(incoming, before, after, key),
  );
  const anatomyChanged = changes.some((change) => change.anatomyChanged);
  const contextOnly =
    incoming.length > 0 &&
    incoming.every(
      (row) => row.stream === "function" || row.stream === "activity",
    );
  const missingMapping = incoming.some(
    (row) =>
      (row.stream === "anatomy" || row.stream === "function") &&
      !regionFor(row),
  );
  const pending = stats.pending > 0;
  const missing = stats.missing > 0;
  const saved =
    incoming.length > 0 &&
    incoming.every((row) => after.some((candidate) => candidate.id === row.id));

  const steps: IntakeStep[] = [
    {
      label: "Validate records",
      detail:
        incoming.length === 0
          ? "No canonical incoming records were supplied."
          : `${incoming.length} canonical record${incoming.length === 1 ? "" : "s"} received: ${stats.valid} valid, ${stats.missing} missing value${stats.missing === 1 ? "" : "s"}, and ${stats.pending} pending quality check${stats.pending === 1 ? "" : "s"}. Source verification provenance is not asserted by this summary.`,
      status:
        incoming.length === 0
          ? "attention"
          : missing || pending
            ? "attention"
            : "complete",
    },
    {
      label: "Map to a review destination",
      detail:
        incoming.length === 0
          ? "No destination was affected."
          : `${stats.mapped} of ${incoming.length} incoming record${incoming.length === 1 ? "" : "s"} has an anatomical destination or related region.`,
      status:
        incoming.length === 0
          ? "unchanged"
          : missingMapping
            ? "attention"
            : "complete",
    },
    {
      label: "Update Health Records",
      detail:
        incoming.length === 0
          ? "No health record was updated."
          : saved
            ? `The post-intake records contain all incoming observations across ${changes.length} destination${changes.length === 1 ? "" : "s"}.`
            : "The post-intake records do not contain every incoming observation; inspect the save result before relying on the update.",
      status:
        incoming.length === 0 ? "unchanged" : saved ? "complete" : "attention",
    },
    {
      label: "Check comparison readiness",
      detail: contextOnly
        ? "Function/activity context was received. CSA remains unchanged, and no anatomy baseline was used for this event."
        : changes.some((change) => change.comparison === "check_comparability")
          ? "Check the measurement method, site, side, units or quality before using these records to compare change."
          : changes.some((change) => change.comparison === "missing")
            ? "A comparable personal baseline or expected measurement is still missing. No value is estimated to fill that gap."
            : anatomyChanged
              ? "The personal baseline and source conditions support comparison. A single reference alone is not evidence of a trend."
              : "No anatomy comparison was affected.",
      status:
        contextOnly || (!anatomyChanged && incoming.length > 0)
          ? "unchanged"
          : changes.some(
                (change) =>
                  change.comparison === "missing" ||
                  change.comparison === "check_comparability",
              )
            ? "attention"
            : "complete",
    },
    {
      label: "Recommended follow-up",
      detail:
        anatomyChanged || pending || missing
          ? "A review or documentation follow-up may be suggested from this intake; no follow-up was created automatically."
          : "No follow-up suggestion was generated from this event.",
      status: anatomyChanged || pending || missing ? "attention" : "unchanged",
    },
  ];

  let title = "No new records";
  let summary = "No canonical incoming observations were available for review.";
  if (incoming.length) {
    title = anatomyChanged
      ? "Anatomy evidence received"
      : "Context evidence received";
    summary = contextOnly
      ? "Function/activity context was received for the scoped destination. CSA remains unchanged, and this event does not borrow a baseline from another source or mode."
      : `The intake affected ${changes.length} destination${changes.length === 1 ? "" : "s"}. ${stats.valid} canonical record${stats.valid === 1 ? "" : "s"} are marked valid; ${stats.missing + stats.pending} require${stats.missing + stats.pending === 1 ? "s" : ""} attention before a comparison is relied on.`;
  }

  return {
    title,
    summary,
    steps,
    changes,
    followUpSuggested: anatomyChanged || pending || missing,
    anatomyChanged,
  };
}

export { rowSignature };
