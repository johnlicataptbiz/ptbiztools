/**
 * Discovery Grader - Constants
 * All static configuration: phases, red flags, outcomes, grading stages, legacy map.
 * Safe for Phase A extraction: no runtime side effects.
 */

import type { PhaseDefinition, RedFlagDefinition, GradingStage } from "./types";

export const MIN_WORDS = 120;

export const PHASES: PhaseDefinition[] = [
  {
    id: "opening",
    name: "Opening & Rapport",
    maxPoints: 10,
    great: [
      "Warm, confident greeting with the patient's name",
      "If referred: acknowledge the referral, express genuine interest",
      "Light rapport building that feels natural",
      "Energy is high but not forced",
    ],
    mistakes: [
      "Jumping straight into clinical questions without rapport",
      "Sounding scripted or robotic",
      "Over-rapport: 5+ minutes of small talk",
      "Excessive filler words",
    ],
  },
  {
    id: "setScene",
    name: "Set the Scene / Take Control",
    maxPoints: 10,
    great: [
      "Clearly sets agenda for the call",
      "Gets verbal agreement to proceed",
      "Asks how they found the clinic",
      "Clinician is leading, not following",
    ],
    mistakes: [
      "Never setting an agenda",
      "Letting patient dictate the flow",
      "Handing control to the patient",
      "Answering insurance question before building value",
    ],
  },
  {
    id: "discoveryCurrentState",
    name: "Discovery: Current State",
    maxPoints: 15,
    great: [
      "Asks about current situation, duration, what they have tried",
      "Gets specific about limitations and day-to-day impact",
      "Asks about previous treatment experiences",
      "Quantifies where possible: pain level, frequency, activity levels",
    ],
    mistakes: [
      "Staying at surface level then immediately pitching",
      "Only asking clinical questions, no functional impact",
      "Not asking why now or what made them reach out",
      "Getting too clinical/diagnostic instead of listening",
    ],
  },
  {
    id: "discoveryGoals",
    name: "Discovery: Goals & Why",
    maxPoints: 15,
    great: [
      "Asks what the ideal outcome looks like (magic wand question)",
      "Gets specific goals, not vague",
      "Asks WHY the goal matters, uncovers deeper motivation",
      "Asks about cost of inaction",
    ],
    mistakes: [
      "Never asking about goals, jumping from symptoms to pitch",
      "Accepting vague goals without digging deeper",
      "Missing the emotional layer entirely",
      "Not asking why now, the trigger that made them reach out",
    ],
    callout:
      "This phase is the most commonly underdone. The emotional motivation is what makes the price feel worth it later.",
  },
  {
    id: "valuePresentation",
    name: "Value Presentation",
    maxPoints: 20,
    great: [
      "Summarizes what they heard before pitching",
      "Connects clinic approach to THEIR specific situation",
      "Differentiates from insurance PT with specifics",
      "Frames outcome, not just process",
      "Expresses genuine confidence they can help",
    ],
    mistakes: [
      "Generic pitch not referencing anything the patient said",
      "Never summarizing/reflecting what they heard",
      "Leading with price before building value",
      "Weak differentiation from insurance PT",
      "No confidence statement",
    ],
  },
  {
    id: "objectionHandling",
    name: "Objection Handling",
    maxPoints: 15,
    great: [
      "Acknowledge: Validate the concern genuinely",
      "Associate: Connect to positive behavior of successful patients",
      "Ask: Ask a question about their concern to stay in control",
      "Reframes insurance question with value-first approach",
      "Explores payment options (HSA/FSA, payment plans, superbills)",
    ],
    mistakes: [
      "Giving up after the first objection",
      "Answering objections with a monologue instead of questions",
      "Referring the patient to a competitor",
      "Getting defensive about pricing",
    ],
  },
  {
    id: "close",
    name: "The Close",
    maxPoints: 15,
    great: [
      "Assumptive close with specific time options",
      "Offers specific times, not open-ended scheduling",
      "Ties close back to their specific goals",
      "Handles logistics confidently",
      "Preframes continuity and follow-up scheduling",
    ],
    mistakes: [
      "Never asking for the booking",
      "Closing transactionally without tying back to goals",
      "Not scheduling follow-ups beyond the eval",
      "Ending passively instead of booking",
    ],
  },
];

export const RED_FLAGS: RedFlagDefinition[] = [
  {
    id: "rf1",
    label: "Referred patient to a competitor",
    deduction: -15,
    desc: "Actively sends a qualified lead away",
  },
  {
    id: "rf2",
    label: "Diagnosed on the phone (not clinical framing)",
    deduction: -10,
    desc: "Named specific conditions / prescribed treatment",
  },
  {
    id: "rf3",
    label: "Led with price before building value",
    deduction: -10,
    desc: "Patient had no context to evaluate worth",
  },
  {
    id: "rf4",
    label: "Asked Do you have any questions?",
    deduction: -5,
    desc: "Hands control to the patient",
  },
  {
    id: "rf5",
    label: "Never attempted to close",
    deduction: -10,
    desc: "Not trying to book is a missed opportunity",
  },
  {
    id: "rf6",
    label: "Validated the competition",
    deduction: -10,
    desc: "Said something positive about a competitor",
  },
  {
    id: "rf7",
    label: "Failed to redirect early insurance question",
    deduction: -5,
    desc: "Answered insurance question before building value",
  },
];

export const OUTCOMES = ["BOOKED", "NOT BOOKED", "UNKNOWN"] as const;

export const DISCOVERY_GRADING_STAGES: readonly GradingStage[] = [
  {
    title: "Parsing transcript structure",
    detail: "Separating discovery and close segments for cleaner phase scoring.",
  },
  {
    title: "Running deterministic framework",
    detail: "Applying weighted phase rules and critical behavior penalties.",
  },
  {
    title: "Verifying evidence quality",
    detail: "Confirming transcript quotes and consistency before final score.",
  },
  {
    title: "Saving analysis records",
    detail: "Writing this run to your analyses dashboard and export history.",
  },
] as const;

export const LEGACY_PHASE_MAP = [
  { id: "connection", name: "Opening & Rapport" },
  { id: "discovery", name: "Discovery — Current State" },
  { id: "gap_creation", name: "Discovery — Goals & Why" },
  { id: "solution", name: "Value Presentation" },
  { id: "temp_check", name: "Objection Handling" },
  { id: "close", name: "The Close" },
  { id: "followup", name: "Follow-up / Wrap" },
] as const;

/** Max points per legacy phase ID (used in adaptV2ToGradeResult) */
export const LEGACY_PHASE_MAX_POINTS: Record<string, number> = {
  connection: 10,
  discovery: 15,
  gap_creation: 15,
  solution: 20,
  temp_check: 15,
  close: 15,
  followup: 10,
};
