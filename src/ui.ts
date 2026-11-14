import { REGIONS, type Observation, type Review } from "./domain";
export function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c,
  );
}
export function value(row?: Observation): string {
  return !row || row.value === null
    ? "Not available"
    : `${row.value.toLocaleString("en", { maximumFractionDigits: 2 })} ${esc(row.unit)}`;
}
export function signed(number?: number): string {
  return number === undefined
    ? "Not calculable"
    : `${number > 0 ? "+" : ""}${number.toFixed(1)}%`;
}
export function day(number: number): string {
  return `D${number}`;
}
export function time(row?: Observation): string {
  return row
    ? `${esc(row.timepoint)} · ${esc(row.phase)}${row.acquiredAt ? ` · ${esc(row.acquiredAt.slice(0, 16).replace("T", " "))} UTC` : " · calendar time not supplied"}`
    : "No measurement in this review";
}
export function source(row?: Observation): string {
  return row
    ? `${esc(row.sourceId)} · row ${esc(row.sourceRow)}`
    : "No source observation";
}
export function titleState(review: Review): string {
  return review.state
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
export function table(rows: Observation[]): string {
  return `<div class="table-wrap"><table><thead><tr><th>Timepoint</th><th>Evidence</th><th>Region / site</th><th>Value</th><th>Quality</th><th>Source row</th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${esc(r.timepoint)}</strong><small>${esc(r.phase)} · ${day(r.day)}</small></td><td>${esc(r.measurement)}<small>${esc(r.mode)} / ${esc(r.modality)}</small></td><td>${esc(r.region ? REGIONS[r.region].short : r.site)}</td><td>${value(r)}</td><td><span class="tag ${r.quality === "valid" ? "" : "attention"}">${esc(r.quality.replace("_", " "))}</span></td><td class="mono">${source(r)}</td></tr>`).join("") || '<tr><td colspan="6">No observations in this selection.</td></tr>'}</tbody></table></div>`;
}
export function chart(review: Review): string {
  const rows = review.rows;
  if (!rows.length)
    return '<div class="empty-inline">No measured values to plot. Import verified observations or select the explicitly simulated mission.</div>';
  const good = new Set(review.comparable.map((r) => r.id));
  const vals = rows.flatMap((r) => (r.value === null ? [] : [r.value]));
  if (!vals.length)
    return '<div class="empty-inline">All visible observations are missing. No values are replaced with zero.</div>';
  const width = 760,
    height = 238,
    left = 58,
    right = 24,
    top = 28,
    bottom = 55;
  const minDay = Math.min(...rows.map((r) => r.day), review.baseline?.day ?? 0),
    maxDay = Math.max(...rows.map((r) => r.day), minDay + 1);
  const low = Math.min(...vals),
    high = Math.max(...vals),
    pad = Math.max((high - low) * 0.2, 1);
  const min = low - pad,
    max = high + pad;
  const x = (d: number) =>
    left + ((d - minDay) / (maxDay - minDay)) * (width - left - right);
  const y = (v: number) =>
    top + ((max - v) / (max - min)) * (height - top - bottom);
  const axes = [min, (min + max) / 2, max]
    .map(
      (v) =>
        `<line x1="${left}" x2="${width - right}" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" class="chart-label">${v.toFixed(1)}</text>`,
    )
    .join("");
  // Adjacent valid source points only: do not bridge missing / incompatible observations.
  const lines = rows
    .slice(1)
    .map((r, i) => {
      const p = rows[i];
      return good.has(r.id) &&
        good.has(p.id) &&
        r.value !== null &&
        p.value !== null
        ? `<path d="M${x(p.day)},${y(p.value)} L${x(r.day)},${y(r.value)}" class="trend-line"/>`
        : "";
    })
    .join("");
  const points = rows
    .map(
      (r, index) =>
        `<g><title>${esc(r.timepoint)}: ${r.value === null ? "missing" : `${r.value} ${r.unit}`} · ${esc(r.sourceRow)}</title>${r.value === null ? `<path d="M${x(r.day) - 4},${height - bottom - 14}l8,8m-8,0l8,-8" class="missing-mark"/><text x="${x(r.day)}" y="${height - bottom - 22 - (index % 2) * 12}" text-anchor="middle" class="point-label attention-text">missing</text>` : `<circle cx="${x(r.day)}" cy="${y(r.value)}" r="5" class="${good.has(r.id) ? "data-point" : "excluded-point"}"/>${index === 0 || index === rows.length - 1 || x(r.day) - x(rows[index - 1].day) > 35 ? `<text x="${x(r.day)}" y="${y(r.value) - 12}" text-anchor="middle" class="point-label">${r.value.toFixed(1)}</text>` : ""}`}<text x="${x(r.day)}" y="${height - 12 - (index % 2) * 14}" text-anchor="middle" class="chart-label">${esc(r.timepoint)}</text></g>`,
    )
    .join("");
  const baseline =
    review.baseline?.value === undefined || review.baseline.value === null
      ? ""
      : `<line x1="${left}" x2="${width - right}" y1="${y(review.baseline.value)}" y2="${y(review.baseline.value)}" class="baseline-line"/>`;
  return `<div class="chart-scroll" tabindex="0" aria-label="Longitudinal chart; scroll horizontally on small screens"><svg viewBox="0 0 ${width} ${height}" class="trend-svg" role="img" aria-label="CSA observations at their actual study-day spacing; gaps remain visible">${axes}${baseline}${lines}${points}<text x="${left}" y="14" class="chart-label">CSA · cm²</text></svg></div>`;
}
export function download(name: string, data: unknown): void {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
