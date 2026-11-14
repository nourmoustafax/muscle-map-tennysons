import Papa from "papaparse";
import type { DataMode, Observation, Quality, Region, Stream } from "./domain";

const REGIONS = new Set<Region>([
  "RIGHT_QUADRICEPS_GROUP",
  "RIGHT_MEDIAL_GASTROCNEMIUS",
]);
const MODES = new Set<DataMode>(["research", "simulated", "manual"]);
const STREAMS = new Set<Stream>(["anatomy", "function", "activity", "symptom"]);
const QUALITIES = new Set<Quality>(["valid", "missing", "check_comparability"]);
const LINKAGES = new Set(["verified", "unverified"]);
const CORE_HEADERS = new Set([
  "id",
  "participant",
  "mode",
  "stream",
  "day",
  "timepoint",
  "phase",
  "value",
  "unit",
  "measurement",
  "modality",
  "protocol",
  "site",
  "quality",
  "sourceId",
  "sourceRow",
  "namespace",
  "linkage",
]);
const OPTIONAL_HEADERS = new Set([
  "region",
  "relatedRegion",
  "side",
  "acquiredAt",
  "baseline",
  "note",
  "importedAt",
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const normaliseUnit = (value: string): string =>
  value
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
const isoWithTimezone =
  /^(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2}))$/i;

function error(message: string): { error: string } {
  return { error: message };
}

function parseFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${field} must be a finite number`);
  return value;
}

function normaliseMeasurementUnit(
  stream: Stream,
  value: unknown,
): { unit?: string; error?: string } {
  const raw = value === undefined || value === null ? "" : String(value).trim();
  if (stream === "symptom") {
    if (raw) return error("symptom observations must not use a numeric unit");
    return { unit: "" };
  }
  if (!raw) return error(`unit is required for ${stream} observations`);
  const compact = raw.toLowerCase().replace(/\s+/g, "").replace("²", "2");
  if (stream === "anatomy")
    return compact === "cm2"
      ? { unit: "cm²" }
      : error(
          "anatomy CSA observations must use cm² (cm2 is accepted and normalized)",
        );
  if (stream === "function") {
    if (compact === "n") return { unit: "N" };
    if (compact === "nm" || compact === "n·m" || compact === "n.m")
      return { unit: "Nm" };
    if (compact === "w") return { unit: "W" };
    if (
      compact === "s" ||
      compact === "sec" ||
      compact === "second" ||
      compact === "seconds"
    )
      return { unit: "s" };
    return error("function units must be N, Nm, W, or s");
  }
  if (compact === "w") return { unit: "W" };
  if (
    compact === "min" ||
    compact === "mins" ||
    compact === "minute" ||
    compact === "minutes"
  )
    return { unit: "min" };
  if (compact === "w/min" || compact === "wpermin") return { unit: "W/min" };
  return error("activity units must be W, min, or W/min");
}

function checkIso(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (
    typeof value !== "string" ||
    !isoWithTimezone.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(`${field} must be an ISO date-time with timezone`);
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-])(\d{2})?:?(\d{2})?$/i.exec(
      value,
    );
  if (!match)
    throw new Error(`${field} must be an ISO date-time with timezone`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const offsetHour = match[7].toUpperCase() === "Z" ? 0 : Number(match[8]);
  const offsetMinute = match[7].toUpperCase() === "Z" ? 0 : Number(match[9]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (
    month < 1 ||
    month > 12 ||
    date < 1 ||
    date > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  )
    throw new Error(`${field} must be an ISO date-time with timezone`);
  return value;
}

function idField(value: unknown, field: string): string {
  const candidate = text(value);
  if (!candidate || !ID_PATTERN.test(candidate))
    throw new Error(`${field} is missing or has invalid identifier characters`);
  return candidate;
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: Set<T>,
  field: string,
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const candidate = text(value) as T | undefined;
  if (!candidate || !allowed.has(candidate))
    throw new Error(`${field} is invalid`);
  return candidate;
}

function boolValue(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new Error(`${field} must be true or false`);
}

export function validateObservation(input: unknown): {
  row?: Observation;
  error?: string;
} {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("observation must be an object");
    const value = input as Record<string, unknown>;
    const id = idField(value.id, "id");
    const participant = idField(value.participant, "participant");
    const mode = value.mode as DataMode;
    const stream = value.stream as Stream;
    if (!MODES.has(mode)) throw new Error("mode is invalid");
    if (!STREAMS.has(stream)) throw new Error("stream is invalid");
    const day = parseFiniteNumber(value.day, "day");
    const timepoint = text(value.timepoint);
    const phase = text(value.phase);
    const measurement = text(value.measurement);
    const modality = text(value.modality);
    const protocol = text(value.protocol);
    const site = text(value.site);
    const sourceId = idField(value.sourceId, "sourceId");
    const sourceRow = text(value.sourceRow);
    const namespace = idField(value.namespace, "namespace");
    if (
      !timepoint ||
      !phase ||
      !measurement ||
      !modality ||
      !protocol ||
      !site ||
      !sourceRow
    )
      throw new Error(
        "timepoint, phase, measurement, modality, protocol, site, and sourceRow are required",
      );
    const region = optionalEnum(value.region, REGIONS, "region");
    const relatedRegion = optionalEnum(
      value.relatedRegion,
      REGIONS,
      "relatedRegion",
    );
    const side = optionalEnum(
      value.side,
      new Set(["right", "left", "bilateral"] as const),
      "side",
    );
    const quality = value.quality as Quality;
    if (!QUALITIES.has(quality)) throw new Error("quality is invalid");
    const linkage = value.linkage as "verified" | "unverified";
    if (!LINKAGES.has(linkage)) throw new Error("linkage is invalid");
    if (stream === "anatomy" && !region)
      throw new Error("anatomy observations require region");
    if (stream === "anatomy" && measurement !== "CSA")
      throw new Error("this anatomical adapter supports CSA only");
    if ((region || relatedRegion) && side !== "right")
      throw new Error("these mapped regions require right laterality");
    if (stream === "function" && !relatedRegion)
      throw new Error("function observations require relatedRegion");
    if ((stream === "anatomy" || stream === "function") && !side)
      throw new Error(`${stream} observations require side`);
    if (typeof value.value === "string" && value.value.trim() === "")
      throw new Error("numerical value must not be empty");
    let numericValue: number | null;
    if (stream === "symptom") {
      if (value.value !== undefined && value.value !== null)
        throw new Error(
          "symptom records contain reported text, not a numeric physiological measurement",
        );
      if (!text(value.note))
        throw new Error("symptom records require a reported note");
      numericValue = null;
    } else if (quality === "missing") {
      if (value.value !== undefined && value.value !== null)
        throw new Error(
          "missing observations require an explicit null/NA value; a supplied measurement cannot be silently discarded",
        );
      numericValue = null;
    } else if (value.value === null || value.value === undefined) {
      throw new Error("numeric value is required unless quality is missing");
    } else {
      numericValue = parseFiniteNumber(value.value, "value");
      if (numericValue < 0)
        throw new Error("numeric value must not be negative");
    }
    const normalizedUnit = normaliseMeasurementUnit(stream, value.unit);
    if (normalizedUnit.error) throw new Error(normalizedUnit.error);
    if (
      quality === "missing" &&
      value.value !== undefined &&
      value.value !== null &&
      typeof value.value === "number" &&
      !Number.isFinite(value.value)
    )
      throw new Error("value must be finite");
    const acquiredAt = checkIso(value.acquiredAt, "acquiredAt");
    const importedAt = checkIso(value.importedAt, "importedAt");
    const baseline = boolValue(value.baseline, "baseline");
    const note =
      value.note === undefined || value.note === null || value.note === ""
        ? undefined
        : text(value.note);
    if (
      value.note !== undefined &&
      value.note !== null &&
      value.note !== "" &&
      !note
    )
      throw new Error("note must be text");
    const row: Observation = {
      id,
      participant,
      mode,
      stream,
      region,
      relatedRegion,
      side,
      day,
      timepoint,
      phase,
      acquiredAt,
      value: numericValue,
      unit: normalizedUnit.unit ?? "",
      measurement,
      modality,
      protocol,
      site,
      quality,
      sourceId,
      sourceRow,
      namespace,
      linkage,
      baseline,
      note,
      importedAt,
    };
    return { row };
  } catch (caught) {
    return error(
      caught instanceof Error ? caught.message : "invalid observation",
    );
  }
}

function parseCsv(textValue: string): {
  headers?: string[];
  records: string[][];
  error?: string;
} {
  const parsed = Papa.parse<string[]>(textValue, {
    delimiter: ",",
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length)
    return {
      records: [],
      error: `Malformed CSV: ${parsed.errors.map((e) => e.message).join("; ")}`,
    };
  const records = parsed.data;
  if (!records.length) return { records, error: "CSV has no header row" };
  const headers = records[0].map((header) =>
    header.replace(/^\ufeff/, "").trim(),
  );
  if (headers.some((header) => !header))
    return { records: [], error: "CSV contains an empty header" };
  if (new Set(headers).size !== headers.length)
    return { records: [], error: "CSV contains duplicate headers" };
  return { headers, records: records.slice(1) };
}

function csvValue(field: string, header: string): unknown {
  if (field === "") return undefined;
  if (header === "value" && field.toLowerCase() === "null") return null;
  if (header === "day" || header === "value") {
    const number = Number(field);
    return Number.isFinite(number) ? number : field;
  }
  if (header === "baseline") return field;
  return field;
}

function importedResearch(row: Observation): Observation {
  if (row.mode !== "research") return row;
  const reported = row.quality;
  const quality: Quality =
    reported === "valid" ? "check_comparability" : reported;
  const note =
    reported === "valid"
      ? `${row.note ? `${row.note} ` : ""}Imported research quality reported as valid; comparability check required before use.`
      : row.note;
  return {
    ...row,
    namespace: `imported-${row.namespace}`,
    linkage: "unverified",
    quality,
    note: `${note ?? ""} Original declared namespace: ${row.namespace}; imported provenance is not NASA-file verified.`,
  };
}

export function parseImport(
  textValue: string,
  format: "json" | "csv",
  existing: Observation[],
): { rows: Observation[]; errors: string[] } {
  const errors: string[] = [];
  let inputs: unknown[] = [];
  if (typeof textValue !== "string")
    return { rows: [], errors: ["import text must be a string"] };
  if (format === "json") {
    try {
      const parsed: unknown = JSON.parse(textValue);
      if (Array.isArray(parsed)) inputs = parsed;
      else if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { rows?: unknown }).rows)
      )
        inputs = (parsed as { rows: unknown[] }).rows;
      else
        errors.push(
          "JSON import must be an array or an object with a rows array",
        );
    } catch {
      errors.push("JSON import is malformed");
    }
  } else if (format === "csv") {
    const parsed = parseCsv(textValue);
    if (parsed.error || !parsed.headers)
      errors.push(parsed.error ?? "CSV import is malformed");
    else {
      const unsupported = parsed.headers.filter(
        (header) => !CORE_HEADERS.has(header) && !OPTIONAL_HEADERS.has(header),
      );
      const missing = [...CORE_HEADERS].filter(
        (header) => !parsed.headers!.includes(header),
      );
      if (unsupported.length)
        errors.push(`CSV has unsupported headers: ${unsupported.join(", ")}`);
      if (missing.length)
        errors.push(`CSV is missing canonical headers: ${missing.join(", ")}`);
      if (!errors.length)
        inputs = parsed.records.map((record) =>
          Object.fromEntries(
            parsed.headers!.map((header, index) => [
              header,
              csvValue(record[index] ?? "", header),
            ]),
          ),
        );
      if (
        !errors.length &&
        parsed.records.some(
          (record) => record.length !== parsed.headers!.length,
        )
      )
        errors.push("CSV row has a different number of fields than the header");
    }
  } else {
    errors.push("format must be json or csv");
  }
  if (errors.length) return { rows: [], errors };
  const rows: Observation[] = [];
  inputs.forEach((input, index) => {
    const result = validateObservation(input);
    if (!result.row)
      errors.push(`row ${index + 1}: ${result.error ?? "invalid observation"}`);
    else rows.push(importedResearch(result.row));
  });
  const seen = new Set<string>();
  const seenSources = new Set<string>();
  const existingSources = new Set(existing.map(sourceIdentity));
  for (const row of rows) {
    if (seen.has(row.id))
      errors.push(`duplicate observation id in import: ${row.id}`);
    seen.add(row.id);
    const identity = sourceIdentity(row);
    if (seenSources.has(identity) || existingSources.has(identity))
      errors.push(
        `duplicate source-row measurement identity: ${row.sourceId} / ${row.sourceRow}`,
      );
    seenSources.add(identity);
  }
  const existingIds = new Set(existing.map((row) => row.id));
  for (const row of rows)
    if (existingIds.has(row.id))
      errors.push(`observation id already exists: ${row.id}`);
  if (errors.length) return { rows: [], errors };
  return { rows, errors: [] };
}

export function sourceIdentity(row: Observation): string {
  return JSON.stringify([
    row.mode,
    row.namespace,
    row.sourceId,
    row.sourceRow,
    row.participant,
    row.stream,
    row.region ?? row.relatedRegion ?? "",
    row.measurement,
    row.modality,
  ]);
}
