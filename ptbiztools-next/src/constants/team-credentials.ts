/**
 * Frontend credential + clinic name map for team members.
 * Keyed by lowercase full name for easy lookup.
 * Data sourced from backend bio fields + known credentials.
 */

export interface TeamMemberMeta {
  credentials?: string; // e.g. "PT, DPT", "PT, DPT, OCS"
  clinicName?: string;  // e.g. "Natural Wellness Physiotherapy"
}

export const TEAM_MEMBER_META: Record<string, TeamMemberMeta> = {
  // ── Partners ──────────────────────────────────────────────────────────
  "danny matta": {
    credentials: "PT, DPT",
    clinicName: "Athletes' Potential",
  },
  "yves gege": {
    credentials: "PT, DPT",
    clinicName: "Made 2 Move Physical Therapy",
  },
  "jerred moon": {
    credentials: undefined,
    clinicName: undefined,
  },

  // ── Coaches ───────────────────────────────────────────────────────────
  "courtney morse": {
    credentials: "PT, DPT",
    clinicName: "Natural Wellness Physiotherapy",
  },
  "brooke miller": {
    credentials: "PT, DPT",
    clinicName: "PeakRx Therapy",
  },
  "elizabeth rudd": {
    credentials: "PT, DPT",
    clinicName: "Well Equipt",
  },
  "daniel laughlin": {
    credentials: "PT, DPT",
    clinicName: undefined,
  },
  "jaxie meth": {
    credentials: "PT, DPT",
    clinicName: "The METHOD Performance & PT",
  },
  "dj haskins": {
    credentials: "PT, DPT",
    clinicName: "Bliss Pelvic Health",
  },
  "ashley speights": {
    credentials: "PT, DPT",
    clinicName: "The PHYT Collective",
  },
  "chris robl": {
    credentials: "PT, DPT",
    clinicName: "Physio Room",
  },
  "ziad dahdul": {
    credentials: "PT, DPT",
    clinicName: undefined,
  },
  "michael sclafani": {
    credentials: "PT, DPT",
    clinicName: "Tideline Sports Performance",
  },
  "colleen davis": {
    credentials: "PT, DPT",
    clinicName: "GOAT Physical Therapy",
  },
  "tyler humphries": {
    credentials: "PT, DPT",
    clinicName: "Bulletproof Physical Therapy",
  },

  // ── Advisors ──────────────────────────────────────────────────────────
  "john licata": {
    credentials: undefined,
    clinicName: undefined,
  },
  "toni counts": {
    credentials: "PT, DPT",
    clinicName: "Off The Block Performance PT",
  },

  // ── Client Success ────────────────────────────────────────────────────
  "brandon erwin": {
    credentials: undefined,
    clinicName: undefined,
  },
  "amy gege": {
    credentials: undefined,
    clinicName: undefined,
  },
  "ashley matta": {
    credentials: undefined,
    clinicName: undefined,
  },
  "nicole miller": {
    credentials: "DPT",
    clinicName: undefined,
  },
  "bekah fay": {
    credentials: "DPT",
    clinicName: undefined,
  },

  // ── Acquisitions ──────────────────────────────────────────────────────
  "kaitlin wilcox": {
    credentials: "RN",
    clinicName: undefined,
  },
  "trampis beatty": {
    credentials: undefined,
    clinicName: undefined,
  },
  "justin pfluger": {
    credentials: undefined,
    clinicName: undefined,
  },
  "jack licata": {
    credentials: undefined,
    clinicName: undefined,
  },
  "e'an verdugo": {
    credentials: undefined,
    clinicName: undefined,
  },
};

/**
 * Look up credential + clinic metadata for a team member by name.
 */
export function getTeamMemberMeta(name: string): TeamMemberMeta {
  return TEAM_MEMBER_META[name.trim().toLowerCase()] || {};
}
