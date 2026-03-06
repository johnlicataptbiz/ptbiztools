export interface PhaseScore {
  name: string;
  score: number;
  maxScore: number;
  summary?: string;
  evidence?: string[];
}

export interface CriticalBehavior {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'unknown';
  note: string;
  evidence?: string[];
}

export interface DeterministicScore {
  weightedPhaseScore: number;
  penaltyPoints: number;
  unknownPenalty: number;
  overallScore: number;
}

export interface ConfidenceScore {
  score: number;
  evidenceCoverage: number;
  quoteVerificationRate: number;
  transcriptQuality: number;
}

export interface GradeResult {
  score: number;
  outcome: 'BOOKED' | 'NOT BOOKED' | 'UNKNOWN';
  summary: string;
  phaseScores: PhaseScore[];
  strengths: string[];
  improvements: string[];
  redFlags: string[];
  deidentifiedTranscript: string;
  // Extended data from v2 API
  criticalBehaviors?: CriticalBehavior[];
  deterministic?: DeterministicScore;
  confidence?: ConfidenceScore;
  prospectSummary?: string;
  evidence?: {
    phases: Record<string, PhaseScore>;
    criticalBehaviors: Record<string, CriticalBehavior>;
  };
}

const PLACEHOLDERS: Record<string, string> = {
  patient: '[PATIENT]',
  clinician: '[CLINICIAN]',
  clinic: '[CLINIC]',
  city: '[CITY]',
  phone: '[PHONE]',
  email: '[EMAIL]',
  date: '[DATE]',
  time: '[TIME]',
  insurance: '[INSURANCE]',
  referral: '[REFERRAL]',
};

function detectNames(text: string): Record<string, string[]> {
  const patterns: Record<string, RegExp[]> = {
    patient: [
      /(?:patient|caller|prospect|lead|they|them|him|her|their|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+:/gm,
    ],
    clinician: [
      /(?:clinician|doctor|therapist|caller|staff|coach|me|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    ],
  };
  
  const result: Record<string, string[]> = { patient: [], clinician: [] };
  
  for (const [type, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      const matches = text.match(regex);
      if (matches) {
        for (const match of matches) {
          const name = match.replace(/^(patient|caller|prospect|lead|they|them|him|her|their|name is|clinician|doctor|therapist|caller|staff|coach|me|i am|i'm)\s+/i, '').trim();
          if (name.length > 2 && name.length < 30 && !['The', 'This', 'That', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(name)) {
            if (!result[type].includes(name)) {
              result[type].push(name);
            }
          }
        }
      }
    }
  }
  
  return result;
}

export function deidentifyTranscript(transcript: string): string {
  let result = transcript;
  const names = detectNames(transcript);
  
  for (const name of names.patient) {
    if (name.length > 2) {
      result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), PLACEHOLDERS.patient);
    }
  }
  
  for (const name of names.clinician) {
    if (name.length > 2) {
      result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), PLACEHOLDERS.clinician);
    }
  }
  
  result = result.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, PLACEHOLDERS.phone);
  result = result.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/gi, PLACEHOLDERS.email);
  result = result.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, PLACEHOLDERS.date);
  result = result.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, PLACEHOLDERS.date);
  result = result.replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, PLACEHOLDERS.time);
  
  return result;
}

function calculatePhaseScores(transcript: string): { phases: PhaseScore[], redFlags: string[] } {
  const lower = transcript.toLowerCase();
  const phases: PhaseScore[] = [];
  const redFlags: string[] = [];
  
  const hasRapport = /hello|hi|hey|good (morning|afternoon|evening)/.test(lower) && 
    /how (are you|do you do)|nice to|talk to you/.test(lower);
  const hasOverRapport = /5 minutes|5min|long time|caught up|small talk/gi.test(lower) && lower.length > 5000;
  phases.push({
    name: 'Opening & Rapport',
    score: hasRapport ? (hasOverRapport ? 6 : 9) : 4,
    maxScore: 10
  });
  
  const hasAgenda = /goal (of|for) (today|call)|purpose (of|for) (today|call)|i'd like to (give you|share)/.test(lower);
  const hasControl = /sound good|does that (work|make sense)|agree/.test(lower);
  const askedQuestions = /do you have any questions?/i.test(lower);
  if (askedQuestions) {
    redFlags.push('Asked "Do you have any questions?" - hands control to the patient');
  }
  phases.push({
    name: 'Set the Scene / Take Control',
    score: hasAgenda && hasControl ? 8 : (hasAgenda || hasControl ? 5 : 3),
    maxScore: 10
  });
  
  const hasDiscovery = /what('s| is) going on|what('s| is) happening|how long|what have you tried|previous (pt|physical therapy|chiro|chiropractor)/.test(lower);
  const hasLimitations = /affect(ing|s)? (your |the )?(day|daily|life|work|activities)|what can('t| not) you do|limit(ation|s)/.test(lower);
  const hasWhyNow = /why now|what made you|trigger|finally decided|finally ready/.test(lower);
  phases.push({
    name: 'Discovery — Current State',
    score: (hasDiscovery ? 8 : 0) + (hasLimitations ? 4 : 0) + (hasWhyNow ? 3 : 0),
    maxScore: 15
  });
  
  const hasGoals = /goal|if we could|magic wand|what do you want|what would you like|ideal outcome/.test(lower);
  const hasWhy = /why (is|does|do|would)|why (important|matters|meaning)|what does that mean to you/.test(lower);
  const hasCostOfInaction = /what happens if|what('s| is) at stake|cost of not|if you don('t| not)|keep going the way/.test(lower);
  phases.push({
    name: 'Discovery — Goals & Why',
    score: (hasGoals ? 5 : 0) + (hasWhy ? 5 : 0) + (hasCostOfInaction ? 5 : 0),
    maxScore: 15
  });
  
  const hasSummary = /let me (make sure|confirm|recap)|so just to (summarize|clarify)|here('s| is) what i('ve| have)/.test(lower);
  const hasDifferentiation = /different from|unlike|most places|insurance (pt|physical therapy)|15 minutes|60 minutes|90 minutes|one-on-one|1 on 1/.test(lower);
  const hasConfidence = /confident|i('m| am) (really |very )?confident|believe we can|excited to help/.test(lower);
  phases.push({
    name: 'Value Presentation',
    score: (hasSummary ? 6 : 0) + (hasDifferentiation ? 7 : 0) + (hasConfidence ? 7 : 0),
    maxScore: 20
  });
  
  const hasInsuranceObj = /insurance|do you take|out of network|reimburse|superbill/.test(lower);
  const hasAcknowledge = /totally understand|great question|smart question|that('s| is) fair|valid concern/.test(lower);
  const hasReferral = /referred|competitor|they could|maybe try|you might want|check out/.test(lower) && !/we don't|we don('t| not)/.test(lower);
  if (hasReferral) {
    redFlags.push('Referred patient to a competitor');
  }
  const hasPhoneDiagnosis = /it sounds like|you have|you('ve| have) got|that('s| is) a|diagnosis|prescribe|you should do/i.test(lower) && 
    /labral|rotator cuff|meniscus|herniated|spinal|disc/gi.test(lower);
  if (hasPhoneDiagnosis) {
    redFlags.push('Diagnosed on the phone - reduces need for evaluation');
  }
  phases.push({
    name: 'Objection Handling',
    score: hasInsuranceObj ? (hasAcknowledge ? 12 : 8) : 6,
    maxScore: 15
  });
  
  const hasClose = /let('s| us| me) (get you|schedule|book)|i'd love to|can we|ready to (get|start)/.test(lower);
  const hasSpecificTime = /(this |next )?(week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|available|works for you/.test(lower);
  const hasTieBack = /get you (back|started|on the path)|(run|play|work|train) again|that goal/.test(lower);
  const noCloseAttempt = !hasClose && (lower.includes('reach out') || lower.includes('let me know') || lower.includes('thanks for'));
  if (noCloseAttempt) {
    redFlags.push('Never attempted to close');
  }
  phases.push({
    name: 'The Close',
    score: hasClose ? (hasSpecificTime ? (hasTieBack ? 15 : 12) : 9) : 4,
    maxScore: 15
  });
  
  return { phases, redFlags };
}

export function gradeTranscript(transcript: string): GradeResult {
  const deidentified = deidentifyTranscript(transcript);
  const { phases, redFlags: extractedRedFlags } = calculatePhaseScores(transcript);
  
  const outcomeMatch = transcript.match(/booked|scheduled|confirmed|will come|set up|appointment/i);
  const notBookedMatch = transcript.match(/not ready|need to think|talk to|can't afford|not interested|no thanks/i);
  let outcome: 'BOOKED' | 'NOT BOOKED' | 'UNKNOWN' = 'UNKNOWN';
  if (outcomeMatch && !notBookedMatch) {
    outcome = 'BOOKED';
  } else if (notBookedMatch) {
    outcome = 'NOT BOOKED';
  }
  
  let totalScore = phases.reduce((sum, p) => sum + p.score, 0);
  
  const redFlags: string[] = [];
  for (const flag of extractedRedFlags) {
    if (!redFlags.includes(flag)) {
      redFlags.push(flag);
    }
  }
  
  const redFlagDeductions: Record<string, number> = {
    'referred': -15,
    'diagnostic': -10,
    'price': -10,
    'questions': -5,
    'never close': -10,
    'competitor': -10,
    'insurance': -5,
  };
  
  for (const flag of redFlags) {
    const lower = flag.toLowerCase();
    if (lower.includes('competitor')) totalScore += redFlagDeductions['referred'];
    else if (lower.includes('diagnosis')) totalScore += redFlagDeductions['diagnostic'];
    else if (lower.includes('price')) totalScore += redFlagDeductions['price'];
    else if (lower.includes('questions')) totalScore += redFlagDeductions['questions'];
    else if (lower.includes('close')) totalScore += redFlagDeductions['never close'];
    else if (lower.includes('insurance')) totalScore += redFlagDeductions['insurance'];
  }
  
  totalScore = Math.max(0, Math.min(100, totalScore));
  
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  const phase0 = phases[0];
  if (phase0.score >= 7) {
    strengths.push('Good rapport building with warm greeting');
  }
  
  const phase1 = phases[1];
  if (phase1.score >= 7) {
    strengths.push('Set clear agenda and maintained call control');
  } else if (phase1.score < 5) {
    improvements.push('Set the agenda early: "The goal of today\'s call is to make sure you\'re a good fit for us and we\'re the best next step for you. Sound good?"');
  }
  
  const phase2 = phases[2];
  if (phase2.score >= 12) {
    strengths.push('Thorough discovery with specific questions about current state and limitations');
  } else if (phase2.score < 8) {
    improvements.push('Dive deeper into limitations: "How is this affecting your day-to-day?" and "Why now? What made you reach out today?"');
  }
  
  const phase3 = phases[3];
  if (phase3.score >= 12) {
    strengths.push('Excellent goal discovery - uncovered both clinical and emotional motivation');
  } else if (phase3.score < 8) {
    improvements.push('Ask "Why does that matter?" after getting goals. Ask "What happens if this doesn\'t get better?" to uncover cost of inaction.');
  }
  
  const phase4 = phases[4];
  if (phase4.score >= 15) {
    strengths.push('Strong value presentation with clear differentiation and confidence');
  } else if (phase4.score < 12) {
    improvements.push('Summarize what you heard, differentiate from insurance PT, and express confidence: "I\'m really confident we can help with this."');
  }
  
  const phase5 = phases[5];
  if (phase5.score >= 10) {
    strengths.push('Handled objections with acknowledgment before responding');
  }
  
  const phase6 = phases[6];
  if (phase6.score >= 12) {
    strengths.push('Strong close with specific times and goal tie-back');
  } else if (phase6.score < 8) {
    improvements.push('Use an assumptive close: "I\'d love to get you scheduled. Does this week or next week work better?"');
  }
  
  if (strengths.length === 0) {
    strengths.push('Started the call - this is the first step to improvement');
  }
  if (improvements.length === 0) {
    improvements.push('Keep practicing the framework - consistency is key to mastery');
  }
  
  const summaryMessages: Record<string, string> = {
    '90': 'Exceptional call with strong discovery, value presentation, and smooth close.',
    '80': 'Strong call with good fundamentals - minor polish needed on deeper discovery or close.',
    '70': 'Decent call - got basics right but left value on the table in discovery or objection handling.',
    '60': 'Below average - multiple phases need improvement, likely missed key objections or close.',
    '0': 'Significant issues - recommend focused practice on the full framework.',
  };
  
  const scoreKey = totalScore >= 90 ? '90' : totalScore >= 80 ? '80' : totalScore >= 70 ? '70' : totalScore >= 60 ? '60' : '0';
  
  return {
    score: totalScore,
    outcome,
    summary: summaryMessages[scoreKey],
    phaseScores: phases,
    strengths,
    improvements,
    redFlags,
    deidentifiedTranscript: deidentified,
  };
}
