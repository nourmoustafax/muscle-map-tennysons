import type { Region } from "./domain";
import { esc } from "./ui";

const paths: Record<string, string> = {
  overview:
    '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  measurements:
    '<path d="M4 19h16M5 15l4-5 4 3 6-9"/><circle cx="9" cy="10" r="1"/><circle cx="13" cy="13" r="1"/>',
  followups:
    '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-11 6 2 2 4-4"/>',
  incident:
    '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  book: '<path d="M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 1 4 4 0 0 0-4-1H3z"/>',
};
export function icon(name: string): string {
  return `<svg class="h-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.arrow}</svg>`;
}
export function regionName(region: Region): string {
  return region === "RIGHT_QUADRICEPS_GROUP" ? "Right thigh" : "Right calf";
}
export function initials(name: string): string {
  return esc(
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "M",
  );
}
export function comparisonDescription(
  change: number | undefined,
  anchor: string,
): string {
  if (change === undefined)
    return `A comparison with ${anchor} isn't available yet.`;
  if (change === 0) return `The recorded size is unchanged from ${anchor}.`;
  return `The recorded size is ${Math.abs(change).toFixed(1)}% ${change < 0 ? "lower" : "higher"} than ${anchor}.`;
}
