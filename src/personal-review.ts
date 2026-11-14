import type { DataMode, Observation, Region, Review } from "./domain";
import type { PersonalReview, Profile } from "./personal-types";

const DAY_MS = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(?:$|T)/;

const normalise = (value: string | undefined): string =>
  (value ?? "").trim().toLocaleLowerCase();

const finite = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const validDateOnly = (value: string): boolean => {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};

const datePart = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim();
  const match = ISO_DATE_PREFIX.exec(candidate);
  return match && validDateOnly(match[1]) ? match[1] : undefined;
};

const dayToDate = (ordinal: number): string => {
  const date = new Date(ordinal * DAY_MS);
  return date.toISOString().slice(0, 10);
};

const canonicalUnit = (value: string | undefined): string =>
  normalise(value).replace(/\s+/g, "").replace("²", "2");

const isCsaUnit = (value: string | undefined): boolean =>
  canonicalUnit(value) === "cm2";

const isExplicitBaseline = (row: Observation): boolean =>
  row.baseline === true || normalise(row.phase) === "baseline";

const rowContext = (row: Observation): string =>
  [
    row.mode,
    row.participant,
    row.namespace,
    row.region ?? "",
    row.side ?? "",
    row.measurement,
    canonicalUnit(row.unit),
    row.modality,
    row.protocol,
    row.site,
  ]
    .map(normalise)
    .join("\u001f");

const sameIdentity = (
  row: Observation,
  profile: Profile,
  region: Region,
  method: string,
): boolean =>
  row.mode === profile.mode &&
  row.participant === profile.participant &&
  row.namespace === profile.namespace &&
  row.stream === "anatomy" &&
  row.region === region &&
  row.side === "right" &&
  row.measurement === "CSA" &&
  isCsaUnit(row.unit) &&
  normalise(row.modality) === normalise(method);

const comparisonCompatible = (left: Observation, right: Observation): boolean =>
  left.mode === right.mode &&
  left.participant === right.participant &&
  left.namespace === right.namespace &&
  left.region === right.region &&
  left.side === right.side &&
  left.measurement === right.measurement &&
  canonicalUnit(left.unit) === canonicalUnit(right.unit) &&
  normalise(left.modality) === normalise(right.modality) &&
  normalise(left.protocol) === normalise(right.protocol) &&
  normalise(left.site) === normalise(right.site);

const coordinate = (row: Observation, profile: Profile): number | undefined => {
  if (profile.mode === "manual") {
    const date = measurementDate(row, profile);
    return date ? dateDay(date) : undefined;
  }
  return finite(row.day) ? row.day : undefined;
};

const ordered = (rows: Observation[], profile: Profile): Observation[] =>
  rows
    .map((row, index) => ({ row, index, coordinate: coordinate(row, profile) }))
    .sort(
      (a, b) =>
        (a.coordinate ?? Number.POSITIVE_INFINITY) -
          (b.coordinate ?? Number.POSITIVE_INFINITY) ||
        a.index - b.index ||
        a.row.id.localeCompare(b.row.id),
    )
    .map(({ row }) => row);

const reasonOnce = (reasons: string[], reason: string): void => {
  if (!reasons.includes(reason)) reasons.push(reason);
};

/** Return the supplied calendar date, never a calendar invented from a raw study day. */
export function measurementDate(
  row: Observation,
  profile: Profile,
): string | undefined {
  const acquired = datePart(row.acquiredAt);
  if (acquired) return acquired;

  const timepoint = datePart(row.timepoint);
  if (timepoint) return timepoint;

  if (profile.mode !== "simulated") return undefined;
  const start = datePart(profile.missionStartDate);
  if (!start || !finite(row.day) || !Number.isInteger(row.day))
    return undefined;
  try {
    return dayToDate(dateDay(start) + row.day);
  } catch {
    return undefined;
  }
}

/** Return the ordinal of an actual UTC calendar date; invalid dates throw rather than roll over. */
export function dateDay(value: string): number {
  if (!validDateOnly(value))
    throw new RangeError("date must be a valid YYYY-MM-DD date");
  const parsed = new Date(`${value}T00:00:00Z`).getTime();
  if (!Number.isFinite(parsed))
    throw new RangeError("date must be a valid YYYY-MM-DD date");
  return Math.floor(parsed / DAY_MS);
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function copyForProfile(row: Observation, profile: Profile): Observation {
  const date = measurementDate(row, profile);
  if (profile.mode === "manual" && date) return { ...row, day: dateDay(date) };
  return { ...row };
}

function reviewNarrative(
  state: Review["state"],
  latest: Observation | undefined,
  change: number | undefined,
): string {
  if (!latest)
    return "No eligible measurement is available in this review scope.";
  if (state === "BASELINE_MISSING")
    return "A measurement is available, but no valid explicit reference is available for a baseline comparison.";
  if (state === "MEASUREMENT_MISSING")
    return "The latest recorded assessment is missing a numeric value; no value has been estimated.";
  if (state === "CHECK_COMPARABILITY")
    return "The selected records need a comparability check for protocol, site, unit, quality, or baseline validity.";
  if (state === "BELOW_BASELINE" && change !== undefined)
    return `The latest comparable CSA is ${change.toFixed(1)}% from the selected baseline.`;
  if (state === "REPEATED_DECREASE")
    return "The comparable sequence contains successive decreases; this describes recorded values only.";
  return "The latest comparable CSA is available; the displayed result is descriptive and not a clinical classification.";
}

function nextStep(state: Review["state"]): string {
  switch (state) {
    case "BASELINE_MISSING":
      return "Select or record a valid explicit baseline.";
    case "MEASUREMENT_MISSING":
      return "Keep the missing assessment visible; do not substitute or impute a value.";
    case "CHECK_COMPARABILITY":
      return "Check the recorded unit, method, protocol, site, quality, and reference.";
    case "BELOW_BASELINE":
      return "Review the recorded context and next assessment.";
    case "REPEATED_DECREASE":
      return "Review the comparable sequence and its measurement context.";
    default:
      return "Continue recording comparable measurements when available.";
  }
}

export function reviewForProfile(
  all: Observation[],
  profile: Profile,
  region: Region,
  method: string,
  baselineId: string | undefined,
  cutoff?: { date?: string; day?: number },
): PersonalReview {
  const reasons: string[] = [];
  const scopedRaw = all.filter((row) =>
    sameIdentity(row, profile, region, method),
  );
  const scoped = scopedRaw.map((row) => copyForProfile(row, profile));
  const dateCutoff = cutoff?.date
    ? (() => {
        try {
          return dateDay(cutoff.date!);
        } catch {
          reasonOnce(reasons, "invalid cutoff date was ignored");
          return undefined;
        }
      })()
    : profile.mode === "manual"
      ? dateDay(todayDate())
      : undefined;
  const defaultDay =
    cutoff?.day !== undefined && finite(cutoff.day)
      ? cutoff.day
      : profile.mode === "research"
        ? 69
        : profile.mode === "simulated"
          ? Math.max(...scoped.map((row) => row.day).filter(finite), 0)
          : undefined;

  const futureIds = new Set<string>();
  const inScope = scoped.filter((row) => {
    const date = measurementDate(row, profile);
    const rowDay = coordinate(row, profile);
    const future =
      profile.mode === "manual"
        ? dateCutoff !== undefined &&
          date !== undefined &&
          dateDay(date) > dateCutoff
        : cutoff?.date !== undefined &&
            dateCutoff !== undefined &&
            date !== undefined
          ? dateDay(date) > dateCutoff
          : defaultDay !== undefined &&
            rowDay !== undefined &&
            rowDay > defaultDay;
    if (future) futureIds.add(row.id);
    return !future;
  });
  for (const id of futureIds)
    reasonOnce(
      reasons,
      `future observation ${id} excluded from values and calculations`,
    );

  const dateMissing =
    profile.mode === "manual"
      ? inScope.filter((row) => measurementDate(row, profile) === undefined)
      : [];
  if (dateMissing.length && profile.mode === "manual")
    reasonOnce(
      reasons,
      "legacy rows without a supplied calendar date were retained but not interpreted as mission days",
    );

  const validNumeric = (row: Observation): boolean =>
    row.quality === "valid" && finite(row.value) && row.value >= 0;
  const eligiblePlotRows = inScope.filter(
    (row) =>
      profile.mode !== "manual" || measurementDate(row, profile) !== undefined,
  );
  const plotRows = ordered(eligiblePlotRows, profile);
  const validRows = ordered(eligiblePlotRows.filter(validNumeric), profile);
  const latest = validRows.at(-1);

  if (!scopedRaw.length)
    reasonOnce(
      reasons,
      "no observations match the exact profile, region, side, CSA, unit, and method scope",
    );
  if (inScope.some((row) => row.quality === "missing" || row.value === null))
    reasonOnce(
      reasons,
      "missing values remain null and are not converted to zero",
    );

  const explicitCandidates = validRows.filter(isExplicitBaseline);
  let selected: Observation | undefined;
  if (baselineId !== undefined) {
    const found = all.find((row) => row.id === baselineId);
    if (!found)
      reasonOnce(reasons, `selected baseline ${baselineId} is absent`);
    else {
      selected =
        scoped.find((row) => row.id === found.id) ??
        copyForProfile(found, profile);
      if (!sameIdentity(found, profile, region, method))
        reasonOnce(
          reasons,
          `selected baseline ${baselineId} is outside the exact profile, region, side, CSA, unit, or method scope`,
        );
      else if (futureIds.has(found.id))
        reasonOnce(
          reasons,
          `selected baseline ${baselineId} is in the future cutoff`,
        );
      else if (found.quality !== "valid" || !finite(found.value))
        reasonOnce(
          reasons,
          `selected baseline ${baselineId} is not a valid numeric observation`,
        );
      else if (found.value <= 0)
        reasonOnce(
          reasons,
          `selected baseline ${baselineId} is zero or non-positive; percentage change is unavailable`,
        );
    }
  } else if (profile.mode !== "manual") {
    selected = explicitCandidates[0];
    if (!selected && scopedRaw.some(isExplicitBaseline))
      reasonOnce(reasons, "no valid explicit source baseline is available");
  } else {
    reasonOnce(
      reasons,
      "no personal baseline was selected; no record was implicitly used as an anchor",
    );
  }

  if (
    selected &&
    profile.mode === "manual" &&
    !measurementDate(selected, profile)
  )
    reasonOnce(
      reasons,
      "selected baseline date is not supplied; temporal eligibility cannot be checked",
    );
  const selectedValid = Boolean(
    selected &&
      sameIdentity(selected, profile, region, method) &&
      !futureIds.has(selected.id) &&
      validNumeric(selected) &&
      selected.value! > 0 &&
      (profile.mode !== "manual" || !!measurementDate(selected, profile)),
  );
  if (
    selected &&
    selectedValid &&
    latest &&
    !comparisonCompatible(selected, latest)
  )
    reasonOnce(
      reasons,
      `selected baseline ${selected.id} does not match the latest protocol or site`,
    );

  const comparisonAnchor = latest;
  const comparable = comparisonAnchor
    ? ordered(
        validRows.filter((row) => comparisonCompatible(row, comparisonAnchor)),
        profile,
      )
    : [];
  const latestComparable = Boolean(
    latest && comparable.some((row) => row.id === latest.id),
  );
  const baselineOnPlot =
    selectedValid &&
    Boolean(selected && latest && comparisonCompatible(selected, latest))
      ? selected
      : undefined;

  if (latest) {
    for (const row of validRows) {
      if (!comparisonCompatible(row, latest))
        reasonOnce(
          reasons,
          `observation ${row.id} is not comparable with the latest protocol, site, method, or unit`,
        );
    }
  }

  const previous =
    latest && comparable.length
      ? comparable
          .filter(
            (row) =>
              row.id !== latest.id &&
              (coordinate(row, profile) ?? Infinity) <
                (coordinate(latest, profile) ?? Infinity),
          )
          .at(-1)
      : undefined;
  const change =
    latest &&
    baselineOnPlot &&
    finite(latest.value) &&
    finite(baselineOnPlot.value) &&
    baselineOnPlot.value > 0
      ? ((latest.value - baselineOnPlot.value) / baselineOnPlot.value) * 100
      : undefined;
  const previousChange =
    latest &&
    previous &&
    finite(latest.value) &&
    finite(previous.value) &&
    previous.value > 0
      ? ((latest.value - previous.value) / previous.value) * 100
      : undefined;
  if (latest && previous && previousChange === undefined)
    reasonOnce(
      reasons,
      `previous observation ${previous.id} has a zero or invalid reference value`,
    );

  const latestCoordinate = latest ? coordinate(latest, profile) : undefined;
  const missingAtLatest =
    plotRows.at(-1)?.value === null ||
    plotRows.at(-1)?.quality === "missing" ||
    (latestCoordinate !== undefined &&
      inScope.some(
        (row) =>
          coordinate(row, profile) === latestCoordinate &&
          (row.quality === "missing" || row.value === null),
      ));
  let state: Review["state"] = "NO_DECREASE_FLAG";
  if (!latest)
    state =
      missingAtLatest || inScope.length === 0
        ? "MEASUREMENT_MISSING"
        : "BASELINE_MISSING";
  else if (missingAtLatest) state = "MEASUREMENT_MISSING";
  else if (!selected || !selectedValid)
    state = selected ? "CHECK_COMPARABILITY" : "BASELINE_MISSING";
  else if (!baselineOnPlot || !latestComparable) state = "CHECK_COMPARABILITY";
  else if (selected.value === 0) state = "CHECK_COMPARABILITY";
  else if (comparable.length >= 3) {
    const last = comparable.slice(-3).map((row) => row.value as number);
    if (last[0] > last[1] && last[1] > last[2]) state = "REPEATED_DECREASE";
    else if (change !== undefined && change < 0) state = "BELOW_BASELINE";
  } else if (change !== undefined && change < 0) state = "BELOW_BASELINE";

  const ageDays = (() => {
    if (!latest) return undefined;
    if (profile.mode === "manual") {
      const latestDate = measurementDate(latest, profile);
      if (latestDate === undefined || dateCutoff === undefined)
        return undefined;
      return dateCutoff - dateDay(latestDate);
    }
    if (profile.mode === "simulated" && cutoff?.date) {
      const date = measurementDate(latest, profile);
      if (date) return dateDay(cutoff.date) - dateDay(date);
    }
    const latestDay = coordinate(latest, profile);
    return latestDay === undefined || defaultDay === undefined
      ? undefined
      : defaultDay - latestDay;
  })();

  const reviewRows = plotRows;
  const review: Review = {
    rows: reviewRows,
    comparable,
    latest,
    baseline: baselineOnPlot,
    previous,
    state,
    change,
    age: ageDays,
    futureCount: futureIds.size,
    excluded: [
      ...[...futureIds].map((id) => ({
        id,
        reason: "future observation excluded from the review cutoff",
      })),
      ...validRows
        .filter((row) => latest && !comparisonCompatible(row, latest))
        .map((row) => ({
          id: row.id,
          reason:
            "protocol, site, method, or unit is not comparable with latest",
        })),
    ],
    narrative: reviewNarrative(state, latest, change),
    nextStep: nextStep(state),
  };

  return {
    review,
    latest,
    baseline:
      selected &&
      sameIdentity(selected, profile, region, method) &&
      !futureIds.has(selected.id) &&
      selected.quality === "valid" &&
      (profile.mode !== "manual" || !!measurementDate(selected, profile))
        ? selected
        : undefined,
    previous,
    change,
    previousChange,
    ageDays,
    visibleRows: inScope,
    dateMissing,
    reasons,
    latestIsComparable: latestComparable && Boolean(baselineOnPlot),
  };
}
