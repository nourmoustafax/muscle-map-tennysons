import type { Incident } from "./domain";

/** This is an incident-documentation aid, NOT a validated triage model. */

type RegionRule = {
  label: string;
  terms: string[];
};

type SymptomRule = {
  label: string;
  terms: string[];
};

const regionRules: RegionRule[] = [
  { label: "chest", terms: ["chest"] },
  { label: "head", terms: ["head"] },
  { label: "neck", terms: ["neck"] },
  { label: "face", terms: ["face"] },
  { label: "jaw", terms: ["jaw"] },
  { label: "eye", terms: ["eye", "eyes"] },
  { label: "shoulder", terms: ["shoulder", "shoulders"] },
  { label: "back", terms: ["back"] },
  { label: "abdomen", terms: ["abdomen", "abdominal", "belly"] },
  { label: "arm", terms: ["arm", "arms", "upper arm"] },
  { label: "elbow", terms: ["elbow", "elbows"] },
  { label: "wrist", terms: ["wrist", "wrists"] },
  { label: "hand", terms: ["hand", "hands"] },
  { label: "hip", terms: ["hip", "hips"] },
  { label: "thigh", terms: ["thigh", "thighs", "upper leg"] },
  { label: "quadriceps", terms: ["quadriceps", "quad", "quads"] },
  { label: "knee", terms: ["knee", "knees"] },
  { label: "leg", terms: ["leg", "legs"] },
  { label: "calf", terms: ["calf", "calves", "gastrocnemius"] },
  { label: "ankle", terms: ["ankle", "ankles"] },
  { label: "foot", terms: ["foot", "feet"] },
];

/* These are reported words or close literal synonyms, not diagnoses. */
const symptomRules: SymptomRule[] = [
  {
    label: "severe chest pain",
    terms: ["severe chest pain", "intense chest pain", "chest pressure"],
  },
  { label: "chest pain", terms: ["chest pain"] },
  {
    label: "severe pain",
    terms: [
      "severe pain",
      "excruciating pain",
      "intense pain",
      "unbearable pain",
      "worst pain",
    ],
  },
  { label: "sudden pain", terms: ["sudden pain", "acute pain"] },
  {
    label: "pain",
    terms: ["pain", "ache", "aching", "soreness", "sore", "discomfort"],
  },
  {
    label: "breathing difficulty",
    terms: [
      "breathing difficulty",
      "difficulty breathing",
      "trouble breathing",
      "shortness of breath",
      "short of breath",
      "breathlessness",
      "labored breathing",
      "cannot breathe",
      "can't breathe",
    ],
  },
  { label: "choking", terms: ["choking", "choked"] },
  {
    label: "unconscious",
    terms: [
      "unconscious",
      "unresponsive",
      "cannot be awakened",
      "can't be awakened",
      "cannot wake",
      "can't wake",
      "passed out",
    ],
  },
  {
    label: "bleeding",
    terms: ["bleeding", "heavy bleeding", "blood loss", "blood flowing"],
  },
  {
    label: "weakness",
    terms: [
      "weakness",
      "weak",
      "loss of strength",
      "cannot move",
      "can't move",
      "unable to move",
      "loss of movement",
    ],
  },
  {
    label: "numbness",
    terms: ["numbness", "numb", "tingling", "pins and needles"],
  },
  { label: "swelling", terms: ["swelling", "swollen", "edema"] },
  {
    label: "seizure",
    terms: ["seizure", "seizures", "convulsion", "convulsions"],
  },
  { label: "confusion", terms: ["confusion", "confused", "disoriented"] },
  { label: "fainting", terms: ["fainting", "fainted", "faint"] },
  {
    label: "dizziness",
    terms: ["dizziness", "dizzy", "lightheaded", "light-headed"],
  },
  {
    label: "severe headache",
    terms: ["severe headache", "sudden severe headache", "worst headache"],
  },
  {
    label: "injury",
    terms: [
      "injury",
      "injured",
      "trauma",
      "fall",
      "collision",
      "impact",
      "deep wound",
      "gaping wound",
      "burn",
      "burned",
      "burnt",
    ],
  },
  {
    label: "vomiting or diarrhea",
    terms: ["vomiting", "vomit", "throwing up", "diarrhea", "diarrhoea"],
  },
  { label: "fever", terms: ["fever", "high temperature"] },
  {
    label: "exposure",
    terms: ["poisoning", "overdose", "smoke exposure", "fume exposure"],
  },
];

type Match = { label: string; start: number; end: number };

function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped.replace(/ /g, "\\s+")}\\b`, "gi");
}

function isNegated(text: string, start: number): boolean {
  const sentenceStart = Math.max(
    0,
    Math.max(
      text.lastIndexOf(".", start - 1),
      text.lastIndexOf("!", start - 1),
      text.lastIndexOf("?", start - 1),
      text.lastIndexOf(";", start - 1),
    ) + 1,
  );
  const prefix = text.slice(sentenceStart, start);
  const negation =
    /(?:^|\s)(?:no|without|denies|denied|never|negative for)\s+(?:(?:[a-z'-]+|,|\s)){0,42}$/i.test(
      prefix,
    );
  if (negation && !/\b(?:but|however|although|except|now)\b/i.test(prefix))
    return true;
  const notNegation = /(?:^|\s)not\s+(?:(?:[a-z'-]+|,|\s)){0,24}$/i.test(
    prefix,
  );
  if (
    notNegation &&
    !/\bnot\s+just\b/i.test(prefix) &&
    !/\b(?:but|however|although|except|now)\b/i.test(prefix)
  )
    return true;
  return false;
}

function allMatches(
  text: string,
  rules: { label: string; terms: string[] }[],
): Match[] {
  const matches: Match[] = [];
  for (const rule of rules) {
    for (const term of rule.terms) {
      const expression = termPattern(term);
      for (
        let found = expression.exec(text);
        found;
        found = expression.exec(text)
      ) {
        const start = found.index;
        const end = start + found[0].length;
        if (!isNegated(text, start))
          matches.push({ label: rule.label, start, end });
      }
    }
  }
  return matches;
}

function selectNonOverlapping(matches: Match[]): string[] {
  const selected: Match[] = [];
  for (const match of matches.sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  )) {
    if (
      selected.some(
        (chosen) => match.start < chosen.end && chosen.start < match.end,
      )
    )
      continue;
    selected.push(match);
  }
  return selected
    .sort((a, b) => a.start - b.start)
    .map((match) => match.label)
    .filter((label, index, labels) => labels.indexOf(label) === index);
}

function extractReportedSymptoms(description: string): string[] {
  return selectNonOverlapping(
    allMatches(description.toLowerCase(), symptomRules),
  );
}

function extractRegions(description: string): string[] {
  return selectNonOverlapping(
    allMatches(description.toLowerCase(), regionRules),
  );
}

export function screenIncident(
  description: string,
  now = new Date().toISOString(),
): Incident {
  const reportedSymptoms = extractReportedSymptoms(description);
  const regions = extractRegions(description);
  return {
    id: `incident-${crypto.randomUUID()}`,
    description,
    region:
      regions.join(", ") ||
      "Not identified — confirm with the crew medical officer",
    reportedSymptoms,
    escalationNotice: reportedSymptoms.length > 0,
    noticeReasons: reportedSymptoms.length
      ? [
          "The report contains observable terms that may warrant prompt attention under established procedures. This keyword screen can miss or misunderstand symptoms and is not a medical assessment.",
        ]
      : [
          "No listed keyword was matched. This is NOT an assessment of safety and does not rule out an emergency.",
        ],
    createdAt: now,
    nonOperational: true,
  };
}

export type IncidentIssueType =
  | "Pain"
  | "Swelling"
  | "Numbness or tingling"
  | "Weakness or movement change"
  | "Breathing difficulty"
  | "Chest symptom"
  | "Bleeding"
  | "Consciousness change"
  | "Confusion"
  | "Seizure"
  | "Injury"
  | "Headache"
  | "Dizziness"
  | "Vomiting or diarrhea"
  | "Fever"
  | "Exposure";

const issueTypeByTerm: Record<string, IncidentIssueType> = {
  "severe chest pain": "Chest symptom",
  "chest pain": "Chest symptom",
  "severe pain": "Pain",
  "sudden pain": "Pain",
  pain: "Pain",
  "breathing difficulty": "Breathing difficulty",
  choking: "Breathing difficulty",
  unconscious: "Consciousness change",
  bleeding: "Bleeding",
  weakness: "Weakness or movement change",
  numbness: "Numbness or tingling",
  swelling: "Swelling",
  seizure: "Seizure",
  confusion: "Confusion",
  fainting: "Consciousness change",
  dizziness: "Dizziness",
  "severe headache": "Headache",
  injury: "Injury",
  "vomiting or diarrhea": "Vomiting or diarrhea",
  fever: "Fever",
  exposure: "Exposure",
};

/** Derives display-only categories; it does not add fields to the Incident schema. */
export function deriveIncidentIssueTypes(
  incidentOrDescription: Incident | string,
): IncidentIssueType[] {
  const reported =
    typeof incidentOrDescription === "string"
      ? extractReportedSymptoms(incidentOrDescription)
      : incidentOrDescription.reportedSymptoms;
  return reported
    .map((term) => issueTypeByTerm[term])
    .filter(
      (type, index, types): type is IncidentIssueType =>
        Boolean(type) && types.indexOf(type) === index,
    );
}

/** Friendly alias for consumers that already have an Incident object. */
export const incidentIssueTypes = (incident: Incident): IncidentIssueType[] =>
  deriveIncidentIssueTypes(incident);

export const incidentSteps = [
  "Activate your established mission emergency response. Do not wait for MuscleMap.",
  "Notify the crew medical officer using the approved onboard medical communication and escalation plan.",
  "Follow the applicable onboard checklist and your medical team's instructions. MuscleMap has no approved flight procedure library.",
  "Provide the situation, observed symptoms, known onset and actions already taken for handover. Save or download this report; MuscleMap does not send it to medical support.",
];

export type IncidentReference = {
  title: string;
  url: string;
  provider: string;
  role: string;
  whyShown: string;
  summary: string;
  reviewed: string;
};

type CuratedReference = Omit<IncidentReference, "whyShown" | "summary">;

/* Kept identical to public/data/emergency-references.json because this project does not enable resolveJsonModule. */
const curatedReferences: CuratedReference[] = [
  {
    title: "NASA-STD-3001: Health and Medical Care",
    url: "https://www.nasa.gov/reference/3-0-health-and-medical-care/",
    provider: "NASA",
    role: "Mission medical governance and capabilities; not an executable checklist",
    reviewed: "2026-11-14",
  },
  {
    title:
      "Medical Operations Spaceflight Considerations \u00b7 13 August 2025",
    url: "https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf",
    provider: "NASA",
    role: "OCHMO-TB-044, reference only; does not supersede mission requirements or supply treatment instructions",
    reviewed: "2026-11-14",
  },
  {
    title: "NASA: In-Flight Medical Care",
    url: "https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/",
    provider: "NASA",
    role: "Medical support and research context; not a mission-approved emergency procedure",
    reviewed: "2026-11-14",
  },
];

export function retrieveIncidentReferences(
  _incident: Incident,
): IncidentReference[] {
  return curatedReferences.map((reference) => ({
    ...reference,
    whyShown:
      "NASA medical authority and mission-requirements context; not selected as a treatment protocol.",
    summary:
      "Reference only. Use the current mission-approved medical procedure and designated medical authority.",
  }));
}
