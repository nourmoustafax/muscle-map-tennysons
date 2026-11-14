export type DataMode = "research" | "simulated" | "manual";
export type Stream = "anatomy" | "function" | "activity" | "symptom";
export type Region = "RIGHT_QUADRICEPS_GROUP" | "RIGHT_MEDIAL_GASTROCNEMIUS";
export type Quality = "valid" | "missing" | "check_comparability";
export interface Observation {
  id: string;
  participant: string;
  mode: DataMode;
  stream: Stream;
  region?: Region;
  relatedRegion?: Region;
  side?: "right" | "left" | "bilateral";
  day: number;
  timepoint: string;
  phase: string;
  acquiredAt?: string;
  value: number | null;
  unit: string;
  measurement: string;
  modality: string;
  protocol: string;
  site: string;
  quality: Quality;
  sourceId: string;
  sourceRow: string;
  namespace: string;
  linkage: "verified" | "unverified";
  baseline?: boolean;
  note?: string;
  importedAt?: string;
}
export type ReviewState =
  | "BASELINE_MISSING"
  | "MEASUREMENT_MISSING"
  | "CHECK_COMPARABILITY"
  | "REPEATED_DECREASE"
  | "BELOW_BASELINE"
  | "NO_DECREASE_FLAG";
export interface Review {
  rows: Observation[];
  comparable: Observation[];
  latest?: Observation;
  baseline?: Observation;
  previous?: Observation;
  state: ReviewState;
  change?: number;
  age?: number;
  futureCount: number;
  excluded: { id: string; reason: string }[];
  narrative: string;
  nextStep: string;
}
export interface Alignment {
  status: "aligned" | "insufficient" | "incompatible";
  row?: Observation;
  deltaDays?: number;
  reasons: string[];
}
export interface SourceRecord {
  id: string;
  title: string;
  provider: string;
  url: string;
  access: string;
  format: string;
  hash?: string;
  rows?: number;
  missing?: number;
  license: string;
  limits: string;
}
export interface FollowUp {
  id: string;
  participant: string;
  mode: DataMode;
  namespace?: string;
  day: number;
  region: Region;
  action:
    | "verify_measurement"
    | "reassessment"
    | "medical_review"
    | "exercise_review"
    | "continue_monitoring";
  note: string;
  status: "draft" | "prepared";
  createdAt: string;
  evidenceIds: string[];
}
export interface Incident {
  id: string;
  description: string;
  region: string;
  reportedSymptoms: string[];
  escalationNotice: boolean;
  noticeReasons: string[];
  createdAt: string;
  nonOperational: true;
  /** New local notes are scoped; older unscoped drafts remain preserved, never guessed. */
  owner?: {
    profileId: string;
    participant: string;
    mode: DataMode;
    namespace: string;
  };
  onsetDate?: string;
}
export interface LocalStore {
  version: 2;
  observations: Observation[];
  followUps: FollowUp[];
  incidents: Incident[];
  audit: { at: string; action: string; ids: string[] }[];
}
export const REGIONS: Record<
  Region,
  {
    title: string;
    short: string;
    site: string;
    members: string;
    function: string;
  }
> = {
  RIGHT_QUADRICEPS_GROUP: {
    title: "Right quadriceps group",
    short: "Quadriceps",
    site: "Right thigh / source-defined group",
    members:
      "Rectus femoris, vastus lateralis, vastus medialis, vastus intermedius",
    function:
      "Knee extension involves the quadriceps group; a strength test is not an individual-muscle CSA measurement.",
  },
  RIGHT_MEDIAL_GASTROCNEMIUS: {
    title: "Right medial gastrocnemius",
    short: "Medial gastrocnemius",
    site: "Right posterior calf / medial head",
    members: "Medial head of the right gastrocnemius",
    function:
      "Ankle plantar-flexion involves several muscles. Cycling power cannot be assigned to this muscle.",
  },
};
