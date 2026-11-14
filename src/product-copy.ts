import type { DataMode, Review } from "./domain";

export function findingTitle(review: Review): string {
  switch (review.state) {
    case "BASELINE_MISSING":
      return "Personal baseline not available";
    case "MEASUREMENT_MISSING":
      return "Latest measurement missing";
    case "CHECK_COMPARABILITY":
      return "Measurements need a comparison check";
    case "REPEATED_DECREASE":
      return "Decrease across consecutive measurements";
    case "BELOW_BASELINE":
      return "Lower than the personal baseline";
    default:
      return "No decrease detected in available measurements";
  }
}

export function findingSummary(review: Review, mode: DataMode): string {
  const dayWord = mode === "simulated" ? "mission" : "study";
  if (review.state === "BASELINE_MISSING")
    return "The available records do not include a valid personal reference. A measurement can still be viewed, but change from baseline cannot be established.";
  if (review.state === "MEASUREMENT_MISSING")
    return `The latest expected measurement is missing. The last valid value${review.latest ? ` is from ${dayWord} day ${review.latest.day}` : ""} remains visible; it has not been treated as a new measurement.`;
  if (review.state === "CHECK_COMPARABILITY")
    return "Some measurements cannot yet be compared. Check the recorded method, measurement site and quality before using them to interpret a change.";
  if (!review.latest || !review.baseline)
    return "A comparable measurement is not available for this review. Missing information is not a reassuring result.";
  const change =
    review.change === undefined
      ? "A percentage change is not available."
      : `The latest measurement is ${Math.abs(review.change).toFixed(1)}% ${review.change < 0 ? "lower" : review.change > 0 ? "higher" : "different"} than the personal baseline.`;
  if (review.state === "REPEATED_DECREASE")
    return `${change} The last three comparable measurements show two successive decreases. This describes the observed sequence, not a cause or clinical severity.`;
  return `${review.change === 0 ? "The latest measured value equals the personal baseline." : change} Size alone does not establish strength, muscle quality or exercise effectiveness.`;
}

export function recommendedFollowUp(review: Review): {
  title: string;
  detail: string;
  action: string;
} {
  switch (review.state) {
    case "BASELINE_MISSING":
      return {
        title: "Confirm the personal baseline",
        detail:
          "Identify a valid reference measured with the same method and site before interpreting change.",
        action: "verify_measurement",
      };
    case "MEASUREMENT_MISSING":
      return {
        title: "Follow up on the missing measurement",
        detail:
          "Check whether the scheduled assessment is available. Do not fill the gap with an estimate.",
        action: "reassessment",
      };
    case "CHECK_COMPARABILITY":
      return {
        title: "Check the measurement details",
        detail:
          "Review site, side, units and method with the appropriate personnel before comparing these records.",
        action: "verify_measurement",
      };
    case "REPEATED_DECREASE":
      return {
        title: "Prepare a measurement review",
        detail:
          "Document the observed sequence and discuss a comparable reassessment or review within existing mission procedures.",
        action: "reassessment",
      };
    case "BELOW_BASELINE":
      return {
        title: "Review the change in context",
        detail:
          "Check the measurement quality and available performance observations with your authorized review team.",
        action: "verify_measurement",
      };
    default:
      return {
        title: "Continue planned monitoring",
        detail:
          "Keep the next assessment in the existing routine. No decrease detected does not mean medical clearance.",
        action: "continue_monitoring",
      };
  }
}
