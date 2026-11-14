import type {
  Alignment,
  DataMode,
  Observation,
  Region,
  Review,
} from "./domain";

interface Selection {
  mode: DataMode;
  participant: string;
  region: Region;
  modality: string;
  day: number;
  namespace?: string;
}

type ComparisonKey = {
  site: string;
  side: Observation["side"];
  protocol: string;
  namespace: string;
};

const normalise = (value: string | undefined): string =>
  (value ?? "").trim().toLocaleLowerCase();
const finiteValue = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);
const validSide = (side: Observation["side"]): boolean =>
  side === "right" || side === "left" || side === "bilateral";

function sideCompatible(
  left: Observation["side"],
  right: Observation["side"],
): boolean {
  if (!left || !right) return false;
  return left === right;
}

function keyFor(row: Observation): ComparisonKey | undefined {
  if (
    !row.site.trim() ||
    !row.protocol.trim() ||
    !row.namespace.trim() ||
    !validSide(row.side)
  )
    return undefined;
  return {
    site: normalise(row.site),
    side: row.side,
    protocol: normalise(row.protocol),
    namespace: normalise(row.namespace),
  };
}

function keyCompatible(row: Observation, reference: ComparisonKey): boolean {
  const key = keyFor(row);
  return Boolean(
    key &&
      key.site === reference.site &&
      key.protocol === reference.protocol &&
      key.namespace === reference.namespace &&
      sideCompatible(key.side, reference.side),
  );
}

function isExplicitBaseline(row: Observation): boolean {
  return row.baseline === true || normalise(row.phase) === "baseline";
}

function isValidCsa(row: Observation): boolean {
  return (
    row.stream === "anatomy" &&
    row.quality === "valid" &&
    finiteValue(row.value) &&
    row.value >= 0 &&
    row.measurement === "CSA" &&
    row.side === "right" &&
    normalise(row.unit).replace("²", "2") === "cm2"
  );
}

function rowOrder(rows: Observation[]): Observation[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        a.row.day - b.row.day ||
        a.index - b.index ||
        a.row.id.localeCompare(b.row.id),
    )
    .map(({ row }) => row);
}

function uniqueReasons(reasons: string[]): string[] {
  return [...new Set(reasons)];
}

function reviewNarrative(
  review: Pick<Review, "state" | "latest" | "baseline" | "change" | "age">,
): string {
  if (review.state === "BASELINE_MISSING") {
    return "No explicit comparable baseline is available. Identify a valid reference before calculating change; the display is not a clearance decision.";
  }
  if (review.state === "MEASUREMENT_MISSING") {
    return "The latest scheduled anatomy row is missing. The last valid measurement remains visible, but it is not carried forward as a new observation.";
  }
  if (review.state === "CHECK_COMPARABILITY") {
    return "One or more rows need a comparability check for site, side, protocol, namespace, units, or quality before they can affect the trend.";
  }
  if (!review.latest || !review.baseline) {
    return "No current comparable anatomy measurement is available. Unknown evidence is not a medical clearance.";
  }
  if (review.state === "REPEATED_DECREASE") {
    return "At least two successive strict decreases are present across comparable observed values. This is a descriptive product flag, not a clinical severity label or clearance.";
  }
  if (review.state === "BELOW_BASELINE") {
    return review.change === undefined
      ? "The latest value is below baseline, but percentage change is unavailable because the baseline is zero. Continue monitoring; this is not a medical clearance."
      : `The latest comparable value is below the explicit baseline (${review.change.toFixed(1)}% change). Check context and planned reassessment; this is not a medical clearance.`;
  }
  return `The latest comparable value is visible at study day ${review.latest.day}${review.age === 0 ? "" : ` (${review.age} day${review.age === 1 ? "" : "s"} old)`}. Continue monitoring; this is not a medical clearance.`;
}

function reviewNextStep(state: Review["state"]): string {
  switch (state) {
    case "BASELINE_MISSING":
      return "Identify and verify an explicit comparable baseline.";
    case "MEASUREMENT_MISSING":
      return "Request or await the scheduled observation; do not impute it.";
    case "CHECK_COMPARABILITY":
      return "Verify source, side, site, units, protocol, and namespace before interpretation.";
    case "REPEATED_DECREASE":
      return "Log for verification or review; do not infer cause or clearance.";
    case "BELOW_BASELINE":
      return "Check context and planned reassessment.";
    default:
      return "Continue monitoring; this does not imply medical clearance.";
  }
}

export function reviewObservations(
  all: Observation[],
  selection: Selection,
): Review {
  const selected = all.filter(
    (row) =>
      row.stream === "anatomy" &&
      row.participant === selection.participant &&
      row.mode === selection.mode &&
      row.region === selection.region &&
      row.modality === selection.modality &&
      (selection.namespace === undefined ||
        row.namespace === selection.namespace),
  );
  const inScope = rowOrder(
    selected.filter(
      (row) => Number.isFinite(row.day) && row.day <= selection.day,
    ),
  );
  const futureRows = selected.filter(
    (row) => Number.isFinite(row.day) && row.day > selection.day,
  );
  const excluded: { id: string; reason: string }[] = [
    ...selected
      .filter((row) => !Number.isFinite(row.day))
      .map((row) => ({
        id: row.id,
        reason: "invalid study day excluded from review",
      })),
    ...futureRows.map((row) => ({
      id: row.id,
      reason: "future study-day row excluded from the review cursor",
    })),
  ];

  const numericRows = inScope.filter(isValidCsa);
  const explicitBaselineRows = numericRows.filter(isExplicitBaseline);
  const anchor = rowOrder(explicitBaselineRows)[0];
  const referenceKey = anchor ? keyFor(anchor) : undefined;
  const comparable: Observation[] = [];

  for (const row of inScope) {
    if (!isValidCsa(row)) {
      const reason =
        row.quality === "missing" || row.value === null
          ? "scheduled row has no measurement value"
          : row.quality === "check_comparability"
            ? "quality requires comparability review"
            : "not a valid cm² anatomy measurement";
      excluded.push({ id: row.id, reason });
      continue;
    }
    if (!referenceKey || !keyCompatible(row, referenceKey)) {
      excluded.push({
        id: row.id,
        reason: !referenceKey
          ? "No valid explicit baseline: observation retained, comparison pending reference."
          : "site, side, protocol, or namespace is not compatible with the comparison stream",
      });
      continue;
    }
    comparable.push(row);
  }

  const orderedComparable = rowOrder(comparable);
  const baseline = rowOrder(orderedComparable.filter(isExplicitBaseline))[0];
  const latest = baseline
    ? orderedComparable.at(-1)
    : rowOrder(numericRows).at(-1);
  const previous = orderedComparable.at(-2);
  const latestScheduledDay = inScope.length
    ? Math.max(...inScope.map((row) => row.day))
    : undefined;
  const validAtLatestDay =
    latestScheduledDay === undefined
      ? false
      : orderedComparable.some((row) => row.day === latestScheduledDay);
  const missingLatest =
    latestScheduledDay !== undefined &&
    inScope.some(
      (row) =>
        row.day === latestScheduledDay &&
        (row.quality === "missing" || row.value === null),
    ) &&
    !validAtLatestDay;

  let state: Review["state"] = "NO_DECREASE_FLAG";
  if (!baseline) state = "BASELINE_MISSING";
  else if (missingLatest) state = "MEASUREMENT_MISSING";
  else if (baseline.value === 0) state = "CHECK_COMPARABILITY";
  else if (
    inScope.some((row) => row.quality === "check_comparability") ||
    excluded.some(
      (item) =>
        item.reason.includes("not compatible") ||
        item.reason.includes("not a valid"),
    )
  )
    state = "CHECK_COMPARABILITY";
  else if (
    orderedComparable.length >= 3 &&
    (orderedComparable.at(-3)!.value as number) >
      (orderedComparable.at(-2)!.value as number) &&
    (orderedComparable.at(-2)!.value as number) >
      (orderedComparable.at(-1)!.value as number)
  )
    state = "REPEATED_DECREASE";
  else if (
    latest &&
    baseline &&
    finiteValue(latest.value) &&
    finiteValue(baseline.value) &&
    latest.value < baseline.value
  )
    state = "BELOW_BASELINE";

  const change =
    latest &&
    baseline &&
    finiteValue(latest.value) &&
    finiteValue(baseline.value) &&
    baseline.value !== 0
      ? ((latest.value - baseline.value) / Math.abs(baseline.value)) * 100
      : undefined;
  const age = latest ? selection.day - latest.day : undefined;
  const review: Review = {
    rows: inScope,
    comparable: orderedComparable,
    latest,
    baseline,
    previous,
    state,
    change,
    age,
    futureCount: futureRows.length,
    excluded: excluded.map((item) => ({ ...item, reason: item.reason.trim() })),
    narrative: "",
    nextStep: reviewNextStep(state),
  };
  review.narrative = reviewNarrative(review);
  return review;
}

function candidateReasonSet(
  all: Observation[],
  latest: Observation,
  day: number,
  windowDays: number,
): {
  candidates: Observation[];
  reasons: string[];
  identityCandidate: boolean;
  inCursorCount: number;
} {
  const reasons: string[] = [];
  const candidates: Observation[] = [];
  let identityCandidate = false;
  let inCursorCount = 0;
  for (const row of all) {
    if (row.stream !== "function") continue;
    if (row.participant !== latest.participant || row.mode !== latest.mode)
      continue;
    if (!Number.isFinite(row.day) || row.day > day) {
      reasons.push("future or invalid-day functional row excluded");
      continue;
    }
    inCursorCount += 1;
    if (normalise(row.namespace) !== normalise(latest.namespace)) {
      reasons.push("namespace is not compatible");
      continue;
    }
    if (row.linkage !== "verified") {
      reasons.push("functional linkage is not verified");
      continue;
    }
    if (row.relatedRegion !== latest.region) {
      reasons.push("related anatomical region is not compatible");
      continue;
    }
    if (!sideCompatible(row.side, latest.side)) {
      reasons.push("side is not compatible");
      continue;
    }
    identityCandidate = true;
    if (row.quality !== "valid" || !finiteValue(row.value)) {
      reasons.push("functional row is not a valid numeric observation");
      continue;
    }
    const delta = Math.abs(row.day - latest.day);
    if (delta > windowDays) {
      reasons.push(
        `functional row is outside the ${windowDays}-day alignment window`,
      );
      continue;
    }
    candidates.push(row);
  }
  return {
    candidates,
    reasons: uniqueReasons(reasons),
    identityCandidate,
    inCursorCount,
  };
}

export function alignFunction(
  all: Observation[],
  latest: Observation | undefined,
  day: number,
  windowDays = 7,
): Alignment {
  if (!latest)
    return {
      status: "insufficient",
      reasons: ["No latest comparable anatomy observation is available."],
    };
  if (latest.stream !== "anatomy" || !latest.region)
    return {
      status: "incompatible",
      reasons: ["Alignment requires an anatomical observation with a region."],
    };
  const window =
    Number.isFinite(windowDays) && windowDays >= 0 ? windowDays : 7;
  const result = candidateReasonSet(all, latest, day, window);
  if (result.candidates.length) {
    const row = [...result.candidates].sort(
      (a, b) =>
        Math.abs(a.day - latest.day) - Math.abs(b.day - latest.day) ||
        b.day - a.day ||
        a.id.localeCompare(b.id),
    )[0];
    return {
      status: "aligned",
      row,
      deltaDays: Math.abs(row.day - latest.day),
      reasons: [
        "Same participant, source mode, namespace and laterality; verified related-region linkage within the displayed window. This is temporal context, not a causal or individual-muscle measurement.",
      ],
    };
  }
  if (!result.inCursorCount)
    return {
      status: "insufficient",
      reasons: [
        "No functional observation is available at or before the review cursor.",
      ],
    };
  const reasons = result.reasons.length
    ? result.reasons
    : [
        "No verified functional observation is available within the alignment window.",
      ];
  return {
    status: result.identityCandidate ? "insufficient" : "incompatible",
    reasons: uniqueReasons(reasons),
  };
}
