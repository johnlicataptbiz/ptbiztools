import type { ActionItem, MetricResult } from '../plTypes'
import type { MetricId } from './benchmarkProfiles'

interface ActionTemplate {
  text: string
  phase: 1 | 2 | 3
  target: string
  expectedImpact: string
}

type GradeKey = 'red' | 'yellow'

const ACTION_LIBRARY: Record<MetricId, Record<GradeKey, ActionTemplate>> = {
  arpv: {
    red: {
      text: 'Implement a structured silent price raise on new inquiries and standardize package pricing.',
      phase: 1,
      target: 'Reach >= $185 ARPV',
      expectedImpact: 'Higher revenue yield without increasing visit volume',
    },
    yellow: {
      text: 'Test incremental pricing tiers and reduce discretionary discounting on plans of care.',
      phase: 1,
      target: 'Move ARPV into elite band',
      expectedImpact: 'Improved margin and pricing confidence',
    },
  },
  recurring: {
    red: {
      text: 'Launch a continuity offer (membership or small-group) with an explicit post-rehab transition script.',
      phase: 2,
      target: 'Raise recurring ratio above 30%',
      expectedImpact: 'Stabilized monthly cash flow and reduced acquisition pressure',
    },
    yellow: {
      text: 'Add retention checkpoints at discharge to increase continuity enrollment rate.',
      phase: 2,
      target: 'Expand recurring base toward 40%',
      expectedImpact: 'More durable recurring revenue base',
    },
  },
  rent: {
    red: {
      text: 'Renegotiate lease terms to a flat monthly cap and eliminate revenue-share exposure.',
      phase: 1,
      target: 'Reduce facility burden below 10%',
      expectedImpact: 'Immediate overhead relief and margin recovery',
    },
    yellow: {
      text: 'Audit unused square footage and renegotiate CAM/utilities clauses at renewal.',
      phase: 2,
      target: 'Push facility burden below 7%',
      expectedImpact: 'Lower fixed-cost drag as revenue scales',
    },
  },
  payroll: {
    red: {
      text: 'Replace flat revenue-split compensation with base + KPI bonus tied to retention and utilization.',
      phase: 1,
      target: 'Bring payroll ratio below 50%',
      expectedImpact: 'Restored gross margin and healthier labor economics',
    },
    yellow: {
      text: 'Introduce productivity and retention scorecards in compensation plans.',
      phase: 2,
      target: 'Move payroll ratio into 30%-40% elite range',
      expectedImpact: 'Aligned incentives and stronger unit economics',
    },
  },
  margin: {
    red: {
      text: 'Run a full overhead and pricing reset: cut software redundancies, cap CAC channels, and reprice care plans.',
      phase: 1,
      target: 'Restore net margin above 10%',
      expectedImpact: 'Re-establishes near-term cashflow safety',
    },
    yellow: {
      text: 'Create a 90-day margin expansion sprint focused on recurring growth and overhead compression.',
      phase: 3,
      target: 'Push net margin above 20%',
      expectedImpact: 'Compounding profitability and resilience',
    },
  },
  grossMargin: {
    red: {
      text: 'Renegotiate payment processing and supplier contracts; remove low-margin offerings.',
      phase: 1,
      target: 'Lift gross margin above 80%',
      expectedImpact: 'Improves contribution margin on every dollar earned',
    },
    yellow: {
      text: 'Track COGS leakage weekly and enforce supply purchasing controls.',
      phase: 2,
      target: 'Reach gross margin >= 85%',
      expectedImpact: 'Protects service-line profitability',
    },
  },
  marketingEfficiency: {
    red: {
      text: 'Pause lowest-ROI paid channels and launch a 90-day referral/workshop sprint.',
      phase: 1,
      target: 'Reduce marketing spend below 15%',
      expectedImpact: 'Lower PAC and better lead quality',
    },
    yellow: {
      text: 'Rebalance channel mix toward relationship referrals and local partnerships.',
      phase: 2,
      target: 'Bring marketing spend below 10%',
      expectedImpact: 'Higher LTV/PAC efficiency',
    },
  },
  techAdminBurden: {
    red: {
      text: 'Consolidate duplicated software, automate admin workflows, and set monthly tooling budgets.',
      phase: 1,
      target: 'Bring tech/admin below 8%',
      expectedImpact: 'Stops margin erosion from overhead creep',
    },
    yellow: {
      text: 'Standardize stack ownership and remove underused subscriptions.',
      phase: 2,
      target: 'Return tech/admin to 3%-5%',
      expectedImpact: 'Lower fixed operating overhead',
    },
  },
  revenueStratification: {
    red: {
      text: 'Rebuild offer ladder to hit benchmark mix across front-end, continuity, and tertiary revenue.',
      phase: 2,
      target: 'Achieve balanced revenue stratification fit',
      expectedImpact: 'More stable and scalable revenue composition',
    },
    yellow: {
      text: 'Tune continuity and tertiary offers to reduce dependence on front-end revenue spikes.',
      phase: 3,
      target: 'Move stratification score into green band',
      expectedImpact: 'Lower revenue volatility over time',
    },
  },
  leadConversion: {
    red: {
      text: 'Retrain discovery-call workflow and tighten the pre-evaluation qualification script.',
      phase: 1,
      target: 'Lift lead-to-eval conversion above 40%',
      expectedImpact: 'More booked evaluations from existing lead volume',
    },
    yellow: {
      text: 'AB-test intake scripts and response-time SLAs to increase booking rates.',
      phase: 2,
      target: 'Push conversion above 60%',
      expectedImpact: 'Improved funnel throughput',
    },
  },
  packageCommitment: {
    red: {
      text: 'Standardize evaluation close framework with goal-linked package recommendations.',
      phase: 1,
      target: 'Raise commitment above 50%',
      expectedImpact: 'Immediate increase in upfront cash collections',
    },
    yellow: {
      text: 'Coach clinicians on objection handling tied to outcomes and cost of inaction.',
      phase: 2,
      target: 'Reach >= 70% commitment rate',
      expectedImpact: 'Higher completion rates and predictable revenue',
    },
  },
  pacLtv: {
    red: {
      text: 'Cut high-cost acquisition spend and prioritize retention and continuity upsells.',
      phase: 1,
      target: 'Raise LTV:PAC to >= 2.0x',
      expectedImpact: 'Moves growth model back to positive economics',
    },
    yellow: {
      text: 'Increase LTV via continuity pathways while reducing PAC through referral campaigns.',
      phase: 2,
      target: 'Reach LTV:PAC >= 3.0x',
      expectedImpact: 'Sustainable growth efficiency',
    },
  },
  nps: {
    red: {
      text: 'Implement immediate service-recovery workflow and weekly NPS root-cause review.',
      phase: 1,
      target: 'Raise NPS above 7.0',
      expectedImpact: 'Reduced churn and referral decline risk',
    },
    yellow: {
      text: 'Create promoter referral activation process and tighten patient experience standards.',
      phase: 3,
      target: 'Push NPS to 9.0+',
      expectedImpact: 'Stronger organic demand engine',
    },
  },
}

function getSeverityScore(grade: MetricResult['grade']): number {
  if (grade === 'red') return 2
  if (grade === 'yellow') return 1
  return 0
}

export function buildActionPlan(metrics: MetricResult[]): ActionItem[] {
  const prioritized = metrics
    .filter((metric) => metric.grade !== 'green')
    .sort((a, b) => {
      const severityDelta = getSeverityScore(b.grade) - getSeverityScore(a.grade)
      if (severityDelta !== 0) return severityDelta
      return b.weight - a.weight
    })

  const actions: ActionItem[] = []

  for (const metric of prioritized) {
    if (actions.length >= 3) break

    const templates = ACTION_LIBRARY[metric.id as MetricId]
    if (!templates) continue

    const template = metric.grade === 'red' ? templates.red : templates.yellow
    if (!template) continue

    actions.push({
      id: `${metric.id}-${metric.grade}-${actions.length + 1}`,
      metricId: metric.id,
      text: template.text,
      phase: template.phase,
      completed: false,
      target: template.target,
      expectedImpact: template.expectedImpact,
      rationale: metric.diagnostic,
      knowledgeRefSlug: metric.knowledgeRefSlug,
      knowledgeRefSection: metric.knowledgeRefSection,
    })
  }

  if (actions.length === 0) {
    actions.push({
      id: 'maintain-performance',
      metricId: 'general',
      text: 'Maintain elite benchmarks and re-run this audit monthly to catch early drift.',
      phase: 3,
      completed: false,
      target: 'Keep all core metrics green',
      expectedImpact: 'Sustained financial performance and readiness for scale',
    })
  }

  return actions.slice(0, 3)
}
