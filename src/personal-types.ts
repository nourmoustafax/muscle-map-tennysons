import type { DataMode, Observation, Region, Review } from "./domain";
export interface Profile {
  id: string;
  name: string;
  mode: DataMode;
  participant: string;
  namespace: string;
  missionName?: string;
  missionStartDate?: string;
  createdAt: string;
}
export interface TaskSource {
  kind: "user" | "team" | "education";
  name?: string;
  url?: string;
}
export interface TaskOutcome {
  at: string;
  result: "completed" | "partial" | "not_completed";
  note: string;
  observationIds: string[];
}
export interface MonitorTask {
  id: string;
  profileId: string;
  kind: "assessment" | "followup" | "exercise";
  title: string;
  reason: string;
  region?: Region;
  measurement?: string;
  method?: string;
  protocol?: string;
  dueDate?: string;
  status: "scheduled" | "pending" | "completed" | "cancelled";
  source: TaskSource;
  instructions?: string;
  evidenceIds: string[];
  outcomes: TaskOutcome[];
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface PersonalState {
  version: 1;
  profiles: Profile[];
  activeProfileId: string;
  /** Personal context to restore when leaving a public or fictional example. */
  lastPersonalProfileId?: string;
  baselines: Record<string, string>;
  tasks: MonitorTask[];
  history: {
    at: string;
    action: string;
    recordId: string;
    before?: Observation;
    after?: Observation;
  }[];
  views: Record<
    string,
    { region: Region; method: string; date?: string; day?: number }
  >;
}
export interface MeasurementInput {
  date: string;
  region: Region;
  type: "CSA" | "function" | "symptom";
  method: string;
  device?: string;
  value: string;
  unit: string;
  protocol: string;
  note: string;
  missing?: boolean;
  confirmed?: boolean;
  baseline?: boolean;
  duplicateConfirmed?: boolean;
  sourceId?: string;
  sourceRow?: string;
}
export interface PersonalReview {
  review: Review;
  latest?: Observation;
  baseline?: Observation;
  previous?: Observation;
  change?: number;
  previousChange?: number;
  ageDays?: number;
  visibleRows: Observation[];
  dateMissing: Observation[];
  reasons: string[];
  latestIsComparable: boolean;
}
