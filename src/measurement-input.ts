import Papa from "papaparse";
import { REGIONS } from "./domain";
import type { Observation, Region } from "./domain";
import { validateObservation } from "./ingestion";
import type { MeasurementInput, Profile } from "./personal-types";
import { dateDay, measurementDate, todayDate } from "./personal-review";

const NASA_SOURCE = /(?:^|[^a-z0-9])(?:nasa|cft70)(?:[^a-z0-9]|$)/i;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const SUPPORTED_REGIONS = new Set<Region>(Object.keys(REGIONS) as Region[]);
const SUPPORTED_TYPES = new Set(["CSA", "function", "symptom"]);
const FUNCTION_UNITS = new Set(["n", "nm", "w", "s"]);
const SIMPLIFIED_IMPORT_FIELDS = new Set([
  "date",
  "region",
  "type",
  "method",
  "device",
  "value",
  "unit",
  "protocol",
  "note",
  "missing",
  "confirmed",
  "baseline",
  "duplicateConfirmed",
  "sourceId",
  "sourceRow",
  "participant",
  "namespace",
  "mode",
]);

const text = (value: unknown): string =>
  typeof value === "string"
    ? value.trim()
    : value === undefined || value === null
      ? ""
      : String(value).trim();

const slug = (filename: string): string => {
  const base =
    filename.trim().replace(/\\/g, "/").split("/").at(-1) ?? "import";
  const withoutExtension = base.replace(/\.[^.]+$/, "");
  return (
    withoutExtension
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "import"
  );
};

const uuid = (): string => {
  const candidate = globalThis.crypto?.randomUUID?.();
  if (candidate) return candidate;
  const random = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  return `${random()}-${random()}-${random()}-${random()}`;
};

const validDate = (value: string): boolean => {
  if (!DATE_ONLY.test(value)) return false;
  try {
    dateDay(value);
    return true;
  } catch {
    return false;
  }
};

const safeDateInput = (value: string): string => {
  const candidate = text(value);
  if (!validDate(candidate))
    throw new Error("date must be a valid YYYY-MM-DD date");
  return candidate;
};

const safeSourceId = (value: string): boolean =>
  Boolean(value) && !NASA_SOURCE.test(value);

const normalizedUnit = (value: string): string =>
  text(value).toLocaleLowerCase().replace(/\s+/g, "").replace("²", "2");

const exactDuplicateKey = (
  row: Observation | undefined,
  profile: Profile,
  input: MeasurementInput,
): string => {
  const value = input.missing ? "<missing>" : text(input.value);
  return JSON.stringify([
    profile.participant,
    input.date,
    input.region,
    input.type,
    value,
    normalizedUnit(input.unit),
    text(input.method).toLocaleLowerCase(),
    text(input.protocol).toLocaleLowerCase(),
    row?.site ?? REGIONS[input.region]?.site ?? "",
  ]);
};

const existingDuplicateKey = (row: Observation, profile: Profile): string => {
  const type = row.stream === "anatomy" ? "CSA" : row.stream;
  const region = row.region ?? row.relatedRegion;
  const date = measurementDate(row, profile) ?? "";
  return JSON.stringify([
    row.participant,
    date,
    region ?? "",
    type,
    row.value === null ? "<missing>" : String(row.value),
    normalizedUnit(row.unit),
    text(row.modality).toLocaleLowerCase(),
    text(row.protocol).toLocaleLowerCase(),
    text(row.site),
  ]);
};

const contextMatches = (row: Observation, profile: Profile): boolean =>
  row.mode === profile.mode &&
  row.participant === profile.participant &&
  row.namespace === profile.namespace;

function inputValue(input: MeasurementInput): number | null | undefined {
  if (input.type === "symptom" || input.missing) return null;
  const raw = text(input.value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function measurementLabel(input: MeasurementInput): string {
  if (input.type === "CSA") return "CSA";
  if (input.type === "symptom") return "Self-reported symptom";
  const unit = text(input.unit);
  return unit
    ? `Functional result (${unit})`
    : `Functional result — ${text(input.method)}`;
}

function buildRawObservation(
  profile: Profile,
  input: MeasurementInput,
  date: string,
  editing?: Observation,
): Record<string, unknown> {
  const isSymptom = input.type === "symptom";
  const isCsa = input.type === "CSA";
  const sourceId =
    editing?.sourceId ||
    text(input.sourceId) ||
    (profile.mode === "simulated" ? "DEMO-ENTRY" : "USER-ENTRY");
  const sourceRow = editing?.sourceRow || text(input.sourceRow) || uuid();
  const id = editing?.id ?? `personal-${uuid()}`;
  const numericValue = inputValue(input);
  const day =
    profile.mode === "simulated"
      ? profile.missionStartDate
        ? dateDay(date) - dateDay(profile.missionStartDate)
        : 0
      : dateDay(date);
  const confirmed = input.confirmed === true;
  const quality = isSymptom
    ? "valid"
    : input.missing
      ? "missing"
      : confirmed
        ? "valid"
        : "check_comparability";
  const note =
    [
      text(input.device) ? `Equipment identifier: ${text(input.device)}` : "",
      text(input.note),
    ]
      .filter(Boolean)
      .join("\n") || undefined;
  const sameDate = editing && measurementDate(editing, profile) === date;
  return {
    id,
    participant: profile.participant,
    mode: profile.mode,
    stream: isSymptom ? "symptom" : isCsa ? "anatomy" : "function",
    region: isCsa ? input.region : isSymptom ? undefined : undefined,
    relatedRegion:
      input.type === "function" || isSymptom ? input.region : undefined,
    side: "right",
    day,
    timepoint: sameDate ? editing.timepoint : date,
    phase:
      input.baseline && !isSymptom
        ? "baseline"
        : editing?.phase || "assessment",
    value: numericValue,
    unit: isSymptom ? "" : text(input.unit),
    measurement: measurementLabel(input),
    modality:
      text(input.method) || (isSymptom ? "Self-report" : text(input.device)),
    protocol: text(input.protocol),
    site:
      editing && (editing.region || editing.relatedRegion) === input.region
        ? editing.site
        : REGIONS[input.region].site,
    quality,
    sourceId,
    sourceRow,
    namespace: profile.namespace,
    linkage: confirmed ? "verified" : "unverified",
    baseline:
      (input.baseline === true || editing?.baseline === true) && !isSymptom,
    note,
    // New dates have day precision. Preserve an existing exact time only when its date was not changed.
    ...(sameDate && editing.acquiredAt
      ? { acquiredAt: editing.acquiredAt }
      : {}),
    importedAt: editing?.importedAt ?? new Date().toISOString(),
  };
}

export function buildMeasurement(
  profile: Profile,
  input: MeasurementInput,
  existing: Observation[],
  editing?: Observation,
): { row?: Observation; error?: string; duplicateIds: string[] } {
  const duplicateIds: string[] = [];
  try {
    if (profile.mode === "research")
      throw new Error(
        "research profiles are read-only; personal entry requires a manual or simulated profile",
      );
    if (!SUPPORTED_REGIONS.has(input.region))
      throw new Error("region is not a supported right-sided mapped region");
    if (!SUPPORTED_TYPES.has(input.type))
      throw new Error("measurement type is not supported");
    const date = safeDateInput(input.date);
    if (profile.mode === "manual" && dateDay(date) > dateDay(todayDate()))
      throw new Error("future dates are not allowed for personal measurements");
    if (profile.mode === "simulated" && profile.missionStartDate === undefined)
      throw new Error(
        "simulated measurements require a supplied mission start date",
      );
    if (
      profile.mode === "simulated" &&
      (!profile.missionStartDate || !validDate(profile.missionStartDate))
    )
      throw new Error("mission start date must be a valid YYYY-MM-DD date");
    if (!text(input.method) && !text(input.device) && input.type !== "symptom")
      throw new Error("method or device is required");
    if (!text(input.protocol)) throw new Error("protocol is required");
    if (input.type === "CSA" && normalizedUnit(input.unit) !== "cm2")
      throw new Error("CSA measurements must use cm²");
    if (
      input.type === "function" &&
      !FUNCTION_UNITS.has(normalizedUnit(input.unit))
    )
      throw new Error("function measurements must use N, Nm, W, or s");
    if (input.type !== "symptom" && input.missing && text(input.value))
      throw new Error(
        "a missing measurement must not also supply a numeric value",
      );
    if (
      input.type !== "symptom" &&
      !input.missing &&
      inputValue(input) === undefined
    )
      throw new Error(
        "a numeric value is required unless the measurement is marked missing",
      );
    if (input.type === "symptom" && text(input.value))
      throw new Error("symptoms use a null value, not a numeric value");
    if (input.type === "symptom" && !text(input.note))
      throw new Error("symptoms require a dated self-report note");
    if (text(input.sourceId) && !safeSourceId(text(input.sourceId)))
      throw new Error(
        "NASA/CFT70 source IDs cannot be self-asserted by personal entry",
      );
    if (editing) {
      if (!contextMatches(editing, profile))
        throw new Error(
          "editing cannot silently change participant, mode, or namespace context",
        );
      if (!safeSourceId(editing.sourceId))
        throw new Error(
          "NASA/CFT70 source IDs cannot be edited as personal entry",
        );
    }

    const raw = buildRawObservation(profile, input, date, editing);
    const validation = validateObservation(raw);
    if (!validation.row)
      throw new Error(
        validation.error ??
          "measurement failed canonical observation validation",
      );
    const row = validation.row;

    const key = exactDuplicateKey(row, profile, input);
    for (const candidate of existing) {
      if (editing && candidate.id === editing.id) continue;
      if (!contextMatches(candidate, profile)) continue;
      if (
        existingDuplicateKey(candidate, profile) === key &&
        !duplicateIds.includes(candidate.id)
      )
        duplicateIds.push(candidate.id);
    }
    if (duplicateIds.length && input.duplicateConfirmed !== true)
      return {
        error: `potential duplicate measurement; confirm explicitly to add (${duplicateIds.join(", ")})`,
        duplicateIds,
      };
    return { row, duplicateIds };
  } catch (caught) {
    return {
      error:
        caught instanceof Error ? caught.message : "measurement is invalid",
      duplicateIds,
    };
  }
}

type ImportRecord = Record<string, unknown>;

function declaredImportError(
  record: ImportRecord,
  profile: Profile,
  filename: string,
): string | undefined {
  const participant = text(record.participant);
  const namespace = text(record.namespace);
  const mode = text(record.mode);
  const sourceId = text(record.sourceId);
  if (participant && participant !== profile.participant)
    return "declared participant differs from the selected profile";
  if (namespace && namespace !== profile.namespace)
    return "declared namespace differs from the selected profile";
  if (mode === "research")
    return "research-mode rows cannot be imported into personal records";
  if (mode && mode !== profile.mode)
    return "declared mode differs from the selected profile";
  if ((sourceId && !safeSourceId(sourceId)) || NASA_SOURCE.test(filename))
    return "NASA/CFT70 source provenance cannot be self-asserted by personal import";
  return undefined;
}

function parseCsv(textValue: string): {
  records: ImportRecord[];
  errors: string[];
} {
  const parsed = Papa.parse<Record<string, string>>(textValue, {
    header: true,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length)
    return {
      records: [],
      errors: parsed.errors.map((error) => `CSV: ${error.message}`),
    };
  if (!parsed.meta.fields?.length)
    return {
      records: [],
      errors: ["CSV personal import has no header row"],
    };
  if (parsed.data.some((record) => Object.hasOwn(record, "__parsed_extra")))
    return {
      records: [],
      errors: ["CSV personal import has a row with too many fields"],
    };
  return { records: parsed.data as ImportRecord[], errors: [] };
}

export function parsePersonalImport(
  textValue: string,
  format: "json" | "csv",
  profile: Profile,
  existing: Observation[],
  filename: string,
): { rows: Observation[]; errors: string[] } {
  const errors: string[] = [];
  if (profile.mode === "research")
    return {
      rows: [],
      errors: ["research profiles cannot accept personal imports"],
    };
  if (typeof textValue !== "string")
    return { rows: [], errors: ["import text must be a string"] };
  const sourceId = `IMPORT-${slug(filename)}`;
  if (!safeSourceId(sourceId) || NASA_SOURCE.test(filename))
    return {
      rows: [],
      errors: [
        "NASA/CFT70 filenames cannot be used as personal import provenance",
      ],
    };

  let records: ImportRecord[] = [];
  if (format === "json") {
    try {
      const parsed: unknown = JSON.parse(textValue);
      if (Array.isArray(parsed))
        records = parsed.filter((item): item is ImportRecord =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
        );
      else if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray(
          (parsed as { personalMeasurementInput?: unknown })
            .personalMeasurementInput,
        )
      )
        records = (parsed as { personalMeasurementInput: ImportRecord[] })
          .personalMeasurementInput;
      else
        errors.push(
          "JSON personal import must be an array or personalMeasurementInput array",
        );
      if (Array.isArray(parsed) && records.length !== parsed.length)
        errors.push("every JSON import item must be an object");
    } catch {
      errors.push("JSON personal import is malformed");
    }
  } else if (format === "csv") {
    const parsed = parseCsv(textValue);
    records = parsed.records;
    errors.push(...parsed.errors);
    if (
      records.length &&
      ![
        "date",
        "region",
        "type",
        "method",
        "value",
        "unit",
        "protocol",
        "note",
      ].every((field) => Object.hasOwn(records[0], field))
    )
      errors.push(
        "CSV personal import is missing one or more required simplified fields",
      );
    const unknown = Object.keys(records[0] ?? {}).filter(
      (field) => !SIMPLIFIED_IMPORT_FIELDS.has(field),
    );
    if (unknown.length)
      errors.push(
        `CSV personal import has unknown fields: ${[...new Set(unknown)].join(", ")}`,
      );
  } else errors.push("format must be json or csv");

  if (errors.length) return { rows: [], errors };
  const unknownRecordFields = records.flatMap((record, index) =>
    Object.keys(record)
      .filter((field) => !SIMPLIFIED_IMPORT_FIELDS.has(field))
      .map((field) => `row ${index + 1} has unknown field: ${field}`),
  );
  if (unknownRecordFields.length)
    return { rows: [], errors: [...new Set(unknownRecordFields)] };
  const declarations = records
    .map((record) => declaredImportError(record, profile, filename))
    .filter((error): error is string => Boolean(error));
  if (declarations.length)
    return { rows: [], errors: [...new Set(declarations)] };

  const accepted: Observation[] = [];
  const existingSourceRows = new Set(
    existing
      .filter((candidate) => contextMatches(candidate, profile))
      .map((candidate) =>
        JSON.stringify([candidate.sourceId, candidate.sourceRow]),
      ),
  );
  const importedSourceRows = new Set<string>();
  records.forEach((record, index) => {
    const recordSourceId = text(record.sourceId) || sourceId;
    const recordSourceRow = text(record.sourceRow) || String(index + 1);
    const sourceRowKey = JSON.stringify([recordSourceId, recordSourceRow]);
    if (
      importedSourceRows.has(sourceRowKey) ||
      existingSourceRows.has(sourceRowKey)
    )
      errors.push(
        `row ${index + 1}: duplicate source-row measurement identity: ${recordSourceId} / ${recordSourceRow}`,
      );
    importedSourceRows.add(sourceRowKey);
    const input: MeasurementInput = {
      date: text(record.date),
      region: text(record.region) as Region,
      type: text(record.type) as MeasurementInput["type"],
      method: text(record.method),
      device: text(record.device) || undefined,
      value:
        record.value === null || record.value === undefined
          ? ""
          : String(record.value),
      unit: text(record.unit),
      protocol: text(record.protocol),
      note: text(record.note),
      missing:
        record.missing === true ||
        text(record.missing).toLocaleLowerCase() === "true",
      confirmed:
        record.confirmed === true ||
        text(record.confirmed).toLocaleLowerCase() === "true",
      baseline:
        record.baseline === true ||
        text(record.baseline).toLocaleLowerCase() === "true",
      duplicateConfirmed:
        record.duplicateConfirmed === true ||
        text(record.duplicateConfirmed).toLocaleLowerCase() === "true",
      sourceId: recordSourceId,
      sourceRow: recordSourceRow,
    };
    const result = buildMeasurement(profile, input, [...existing, ...accepted]);
    if (!result.row)
      errors.push(
        `row ${index + 1}: ${result.error ?? "invalid personal measurement"}`,
      );
    else accepted.push(result.row);
  });
  if (errors.length) return { rows: [], errors };
  return { rows: accepted, errors: [] };
}

export function personalImportTemplate(profile: Profile): unknown {
  return {
    templateVersion: 1,
    profile: {
      id: profile.id,
      participant: profile.participant,
      namespace: profile.namespace,
      mode: profile.mode,
    },
    personalMeasurementInput: [],
    fields: [
      "date",
      "region",
      "type",
      "method",
      "value",
      "unit",
      "protocol",
      "note",
    ],
    placeholderExample: {
      date: "YYYY-MM-DD",
      region: "RIGHT_QUADRICEPS_GROUP",
      type: "CSA",
      method: "<documented method or device>",
      value: "<numeric value; placeholder only>",
      unit: "cm²",
      protocol: "<documented protocol>",
      note: "<optional note>",
      placeholder: true,
    },
  };
}
