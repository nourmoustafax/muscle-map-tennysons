import {
  REGIONS,
  type Alignment,
  type DataMode,
  type Observation,
  type Region,
  type Review,
} from "./domain";
import { alignFunction, reviewObservations } from "./engine";

export interface OverviewSelection {
  mode: DataMode;
  participant: string;
  namespace: string;
  modality: string;
  day: number;
}

export type OverviewComparison = "higher" | "lower" | "unchanged" | "unknown";

export interface OverviewRegion {
  region: Region;
  review: Review;
  alignment: Alignment;
  comparison: OverviewComparison;
  label: string;
  headline: string;
  summary: string;
  missing: string[];
  nextStep: string;
  priority: number;
}

export interface Overview {
  regions: OverviewRegion[];
  headline: string;
  summary: string;
  nextStep: string;
  focusRegion?: Region;
}

const regionOrder = Object.keys(REGIONS) as Region[];
const finite = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

function regionName(region: Region): string {
  return region === "RIGHT_MEDIAL_GASTROCNEMIUS"
    ? "calf"
    : REGIONS[region].short;
}

function comparisonFor(review: Review): OverviewComparison {
  // Missingness and comparability always win over an apparently positive row.
  if (
    review.state === "BASELINE_MISSING" ||
    review.state === "MEASUREMENT_MISSING" ||
    review.state === "CHECK_COMPARABILITY" ||
    !review.baseline ||
    !review.latest ||
    review.change === undefined
  )
    return "unknown";
  if (review.change > 0) return "higher";
  if (review.change < 0) return "lower";
  return "unchanged";
}

function labelFor(comparison: OverviewComparison): string {
  switch (comparison) {
    case "higher":
      return "Higher than explicit baseline";
    case "lower":
      return "Lower than explicit baseline";
    case "unchanged":
      return "Unchanged from explicit baseline";
    default:
      return "Comparison unavailable";
  }
}

function missingFor(review: Review, alignment: Alignment): string[] {
  const missing: string[] = [];
  if (review.state === "BASELINE_MISSING")
    missing.push("An explicit comparable baseline is not available.");
  if (review.state === "MEASUREMENT_MISSING")
    missing.push("The latest scheduled anatomy measurement is missing.");
  if (review.state === "CHECK_COMPARABILITY")
    missing.push(
      "One or more anatomy records still need a comparability check.",
    );
  if (!review.latest && review.state !== "MEASUREMENT_MISSING")
    missing.push("No current comparable anatomy measurement is available.");
  if (review.excluded.some((item) => item.reason.includes("not compatible")))
    missing.push(
      "Some anatomy records were excluded because their comparison details differ.",
    );
  if (alignment.status !== "aligned")
    missing.push("Verified function context is not available for this region.");
  return [...new Set(missing)];
}

function headlineFor(name: string, comparison: OverviewComparison): string {
  switch (comparison) {
    case "higher":
      return `${name} is higher than its explicit baseline`;
    case "lower":
      return `${name} is lower than its explicit baseline`;
    case "unchanged":
      return `${name} is unchanged from its explicit baseline`;
    default:
      return `${name} needs an evidence review`;
  }
}

function summaryFor(
  name: string,
  review: Review,
  comparison: OverviewComparison,
): string {
  if (comparison === "unknown") {
    if (review.state === "BASELINE_MISSING")
      return `${name}: no explicit comparable baseline is available, so change is not calculated.`;
    if (review.state === "MEASUREMENT_MISSING")
      return `${name}: the latest scheduled anatomy measurement is missing. The last valid measurement remains visible, but it is not carried forward.`;
    if (review.state === "CHECK_COMPARABILITY")
      return `${name}: the current anatomy records need a comparability review before change can be interpreted.`;
    if (!review.latest)
      return `${name}: no current comparable anatomy measurement is available for this review day.`;
    return `${name}: the available anatomy records do not support a baseline comparison at this review day.`;
  }
  const change = review.change as number;
  const direction =
    comparison === "higher"
      ? "higher"
      : comparison === "lower"
        ? "lower"
        : "unchanged";
  const latest = review.latest as Observation;
  return `${name} is ${direction} than the explicit baseline by ${change > 0 ? "+" : ""}${change.toFixed(1)}% at study day ${latest.day}. This is a descriptive result from comparable anatomy records.`;
}

function nextStepFor(review: Review): string {
  switch (review.state) {
    case "BASELINE_MISSING":
      return "Find and verify a comparable starting measurement.";
    case "MEASUREMENT_MISSING":
      return "Request or await the missing scheduled measurement; do not fill the gap.";
    case "CHECK_COMPARABILITY":
      return "Review the data source, side, site, units, and method before interpreting this region.";
    case "REPEATED_DECREASE":
      return "Log the observed pattern for verification or review.";
    case "BELOW_BASELINE":
      return "Review the measurement context and planned reassessment.";
    default:
      return "Continue monitoring the available measurements.";
  }
}

function priorityFor(
  review: Review,
  comparison: OverviewComparison,
  alignment: Alignment,
): number {
  let priority = 10;
  if (comparison === "lower") priority += 70;
  if (comparison === "unknown") priority += 45;
  if (review.state === "MEASUREMENT_MISSING") priority += 30;
  if (review.state === "CHECK_COMPARABILITY") priority += 25;
  if (review.state === "BASELINE_MISSING") priority += 20;
  if (alignment.status !== "aligned") priority += 10;
  if (review.age !== undefined && review.age > 0)
    priority += Math.min(review.age, 10);
  return priority;
}

function topCopy(regions: OverviewRegion[]): {
  headline: string;
  summary: string;
  nextStep: string;
} {
  const lower = regions.filter((item) => item.comparison === "lower");
  const unknown = regions.filter((item) => item.comparison === "unknown");
  const higher = regions.filter((item) => item.comparison === "higher");
  const focus = [...regions].sort((a, b) => b.priority - a.priority)[0];

  if (lower.length && higher.length) {
    return {
      headline: "Your measured regions are responding differently",
      summary: `The ${regionName(higher[0].region).toLowerCase()} is higher than its explicit baseline while the ${regionName(lower[0].region).toLowerCase()} is lower. Review the supporting records and the missing context before drawing conclusions.`,
      nextStep: focus.nextStep,
    };
  }
  if (lower.length) {
    return {
      headline: "A measured region is lower than its explicit baseline",
      summary: `Review the ${regionName(lower[0].region).toLowerCase()} record, its actual measurement timing, and the available supporting context.`,
      nextStep: focus.nextStep,
    };
  }
  if (unknown.length) {
    return {
      headline: "The current muscle review has evidence gaps",
      summary:
        "Some measured regions cannot be compared yet because the latest record, explicit baseline, or comparability details are missing.",
      nextStep: focus.nextStep,
    };
  }
  if (higher.length === regions.length) {
    return {
      headline:
        "Both measured regions are higher than their explicit baselines",
      summary:
        "The available comparable anatomy records show higher values at the selected review day. This is a descriptive result from the selected records.",
      nextStep: focus.nextStep,
    };
  }
  return {
    headline: "The measured-region review is unchanged",
    summary:
      "The available comparable anatomy records do not show a baseline-relative change at the selected review day.",
    nextStep: focus.nextStep,
  };
}

export function buildOverview(
  all: Observation[],
  selection: OverviewSelection,
): Overview {
  const regions = regionOrder.map((region): OverviewRegion => {
    const review = reviewObservations(all, { ...selection, region });
    const alignment = functionAlignment(
      all,
      review.latest,
      selection.day,
    ).alignment;
    const comparison = comparisonFor(review);
    const name = regionName(region);
    const missing = missingFor(review, alignment);
    return {
      region,
      review,
      alignment,
      comparison,
      label: labelFor(comparison),
      headline: headlineFor(name, comparison),
      summary: summaryFor(name, review, comparison),
      missing,
      nextStep: nextStepFor(review),
      priority: priorityFor(review, comparison, alignment),
    };
  });
  const copy = topCopy(regions);
  const focus = [...regions].sort((a, b) => b.priority - a.priority)[0];
  return {
    regions,
    ...copy,
    focusRegion: focus?.region,
  };
}

function sameIdentity(left: Observation, right: Observation): boolean {
  return (
    left.participant === right.participant &&
    left.mode === right.mode &&
    left.namespace === right.namespace &&
    left.relatedRegion === right.relatedRegion &&
    left.side === right.side &&
    left.measurement === right.measurement &&
    left.unit === right.unit &&
    left.modality === right.modality &&
    left.protocol === right.protocol &&
    left.site === right.site &&
    left.sourceId === right.sourceId &&
    left.linkage === "verified" &&
    right.linkage === "verified"
  );
}

function explicitBaseline(row: Observation): boolean {
  return (
    row.baseline === true || row.phase.trim().toLocaleLowerCase() === "baseline"
  );
}

function functionAlignment(
  all: Observation[],
  latestAnatomy: Observation | undefined,
  day: number,
): {
  alignment: Alignment;
  candidate?: Observation;
  mismatched: boolean;
  unverified: boolean;
} {
  if (
    !latestAnatomy ||
    latestAnatomy.stream !== "anatomy" ||
    !latestAnatomy.region
  )
    return {
      alignment: {
        status: "insufficient",
        reasons: ["No latest comparable anatomy observation is available."],
      },
      mismatched: false,
      unverified: false,
    };
  const scoped = all.filter(
    (row) =>
      row.participant === latestAnatomy.participant &&
      row.mode === latestAnatomy.mode &&
      row.namespace === latestAnatomy.namespace,
  );
  const alignment = alignFunction(scoped, latestAnatomy, day, 7);
  const candidate = alignment.row;
  const unverified = scoped.some(
    (row) =>
      row.stream === "function" &&
      row.relatedRegion === latestAnatomy.region &&
      row.side === latestAnatomy.side &&
      row.linkage !== "verified" &&
      Number.isFinite(row.day) &&
      row.day <= day,
  );
  const mismatched =
    !!candidate &&
    scoped.some(
      (row) =>
        row.stream === "function" &&
        row.relatedRegion === candidate.relatedRegion &&
        row.side === candidate.side &&
        row.linkage === "verified" &&
        Number.isFinite(row.day) &&
        row.day <= day &&
        !sameIdentity(row, candidate),
    );
  return { alignment, candidate, mismatched, unverified };
}

export interface FunctionContext {
  alignment: Alignment;
  baseline?: Observation;
  change?: number;
  summary: string;
  limits: string[];
}

export function functionContext(
  all: Observation[],
  latestAnatomy: Observation | undefined,
  day: number,
): FunctionContext {
  const found = functionAlignment(all, latestAnatomy, day);
  const limits = [
    "Function evidence is contextual and does not measure the anatomical region's CSA.",
    "A function record does not establish cause, severity, safety, or clearance.",
  ];
  if (found.unverified)
    limits.push("Unverified or cross-source function records were not used.");
  if (found.mismatched)
    limits.push(
      "Function records with a different measurement, unit, method, protocol, site, or source were not compared.",
    );
  if (!found.candidate) {
    limits.push(
      "No matched function observation is available for this review.",
    );
    return {
      alignment: found.alignment,
      summary: "Function context is not available for this review.",
      limits,
    };
  }
  const candidate = found.candidate;
  const baseline = all
    .filter(
      (row) =>
        row.stream === "function" &&
        row.quality === "valid" &&
        explicitBaseline(row) &&
        row.day <= candidate.day &&
        sameIdentity(row, candidate) &&
        finite(row.value),
    )
    .sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))[0];
  if (!baseline) {
    limits.push(
      "No explicit comparable function baseline is available; no percentage change is reported.",
    );
    return {
      alignment: found.alignment,
      summary: `A verified function observation is available at study day ${candidate.day}, but it has no explicit comparable baseline.`,
      limits,
    };
  }
  if (baseline.value === 0) {
    limits.push(
      "The explicit function baseline is zero; percentage change is not calculated.",
    );
    return {
      alignment: found.alignment,
      baseline,
      summary: `A verified function observation is available at study day ${candidate.day}; its explicit baseline is zero, so change is not calculated.`,
      limits,
    };
  }
  const candidateValue = candidate.value as number;
  const baselineValue = baseline.value as number;
  const change =
    ((candidateValue - baselineValue) / Math.abs(baselineValue)) * 100;
  return {
    alignment: found.alignment,
    baseline,
    change,
    summary: `The matched function observation is ${change > 0 ? "+" : ""}${change.toFixed(1)}% from its explicit function baseline at study day ${candidate.day}. This is contextual evidence only; it does not assign a functional value to the measured muscle region.`,
    limits,
  };
}
