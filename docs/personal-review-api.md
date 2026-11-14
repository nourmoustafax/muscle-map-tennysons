# Personal review and measurement-input API

This API is a data-handling layer for personal and fictional demonstration profiles. It does not change the existing domain, engine, ingestion, store, or bundled research files.

## Review API

```ts
measurementDate(row: Observation, profile: Profile): string | undefined
 dateDay(value: string): number
todayDate(): string
reviewForProfile(
  all: Observation[],
  profile: Profile,
  region: Region,
  method: string,
  baselineId: string | undefined,
  cutoff?: { date?: string; day?: number },
): PersonalReview
```

`measurementDate` returns only a calendar date that is actually supplied by `acquiredAt` or an ISO date/time `timepoint`. Simulated records may additionally derive a date from a supplied `missionStartDate` and their existing study day. Research rows never acquire a calendar date from a study day. Manual legacy rows without a supplied date remain date-missing and are never interpreted as mission days.

`dateDay` validates an exact `YYYY-MM-DD` calendar date and returns its UTC ordinal. It throws for invalid dates rather than allowing JavaScript date rollover. `todayDate` returns the current UTC date in that format.

`reviewForProfile` scopes rows by the complete personal context: mode, participant, namespace, mapped region, right side, CSA anatomy type, canonical `cm²` unit, and the requested method/modality. Manual rows are copied before calendar-derived plot coordinates are applied, so source IDs and source rows on the input are not mutated. Research review uses study days and defaults to day 69 when no cutoff day is supplied; simulated review defaults to the latest in-scope study day; manual review defaults to today’s UTC date.

The latest valid measurement remains visible even when it does not match the selected baseline’s protocol or site. Comparison rows use the latest row’s exact protocol, site, method, unit, region, side, mode, participant, and namespace; missing or incompatible rows are not bridged. The previous comparison is independent of baseline availability. Baseline change is calculated only when the explicit selected baseline is in scope, valid, positive, non-future, and exactly comparable:

```text
(current - reference) / reference * 100
```

Personal profiles never implicitly select their first record as a baseline. Research and simulated profiles may use a source-explicit baseline (`baseline: true` or `phase: "baseline"`) only when no baseline ID is supplied. An absent, future, wrong-context, invalid-quality, incompatible, or zero/non-positive selected baseline produces an explicit reason and no baseline percentage. Missing values remain `null` and remain visible as chart discontinuities. Returned `latest`, `baseline`, `previous`, and `visibleRows` are copies that retain original observation IDs, `sourceId`, and `sourceRow` values. `PersonalReview.review.state` is descriptive data state, not a clinical classification.

## Measurement entry API

```ts
buildMeasurement(
  profile: Profile,
  input: MeasurementInput,
  existing: Observation[],
  editing?: Observation,
): { row?: Observation; error?: string; duplicateIds: string[] }
```

Research profiles are read-only. Manual and simulated entries use the profile’s participant and namespace. Supported mapped regions are the two right-sided regions in `REGIONS`; no new acquisition sites or undocumented instructions are generated. CSA uses `cm²`. Function uses `N`, `Nm`, `W`, or `s` and receives a method/device label. Symptoms are dated, regional related-region self-reports with a `null` value, empty unit, and no triage interpretation.

Manual future dates are rejected. Simulated entries require a supplied mission start date and derive study day from the supplied date difference. Entry timestamps are stored in `importedAt`; day-precision measurement dates are kept in `timepoint` and do not claim an exact acquisition clock time. `validateObservation` is the final canonical validator. Unconfirmed numeric entries use `check_comparability`; confirmed entries use `valid`; missing entries require a null value and use `missing`.

Potential duplicates compare profile participant, supplied date, region, type, value/null, unit, method, protocol, and mapped site. A duplicate is rejected unless `duplicateConfirmed` is explicitly true. Generated source rows are UUIDs. Editing preserves the old `id`, `sourceId`, `sourceRow`, `importedAt`, and context; editing a row from another participant, mode, or namespace is rejected rather than silently rewritten. NASA/CFT70-looking source IDs cannot be self-asserted by personal entry.

## Simplified personal import

```ts
parsePersonalImport(
  text: string,
  format: "json" | "csv",
  profile: Profile,
  existing: Observation[],
  filename: string,
): { rows: Observation[]; errors: string[] }

personalImportTemplate(profile: Profile): unknown
```

JSON accepts an array or `{ "personalMeasurementInput": [] }`. CSV accepts these simplified fields: `date, region, type, method, value, unit, protocol, note`; optional `device, missing, confirmed, baseline, duplicateConfirmed, sourceRow, participant, namespace, mode, sourceId` are also recognized. The filename becomes a safe `IMPORT-<slug>` source ID and each row keeps its supplied source row, or a deterministic one-based row number. Declared research mode, a different participant/namespace/mode, or NASA/CFT70 provenance is rejected before mapping. Numeric zero is preserved as zero; null/empty values are not coerced into zero. Import is atomic: any invalid row or duplicate returns no rows.

`personalImportTemplate` contains an empty `personalMeasurementInput` array and a clearly marked placeholder example. It does not seed fictional or assumed user measurements.

## Limitations

This layer does not authenticate profiles, establish clinical validity, infer health or readiness, supply normal ranges, create acquisition instructions, or convert NASA research participants into personal identities. It cannot recover a calendar date from a study-day-only research row. It also does not persist changes itself; callers must use the existing store workflow after accepting a validated observation.
