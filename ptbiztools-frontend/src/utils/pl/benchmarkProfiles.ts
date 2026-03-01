import type { GradeBand, MetricGroup } from '../plTypes'

export type MetricId =
  | 'arpv'
  | 'recurring'
  | 'rent'
  | 'payroll'
  | 'margin'
  | 'grossMargin'
  | 'marketingEfficiency'
  | 'techAdminBurden'
  | 'revenueStratification'
  | 'leadConversion'
  | 'packageCommitment'
  | 'pacLtv'
  | 'nps'

export interface BenchmarkMetricProfile {
  id: MetricId
  name: string
  group: MetricGroup
  source: 'core' | 'advanced'
  weight: number
  target: string
  tip: string
  diagnosticIntent: string
  knowledgeRefSlug: string
  knowledgeRefSection: string
  gradeBands: GradeBand[]
}

export interface BenchmarkProfile {
  id: string
  version: string
  title: string
  metrics: Record<MetricId, BenchmarkMetricProfile>
}

export const DEFAULT_BENCHMARK_PROFILE: BenchmarkProfile = {
  id: 'cash-based-pt-financial-architecture',
  version: '2026.02',
  title: 'Cash-Based PT Financial Architecture',
  metrics: {
    arpv: {
      id: 'arpv',
      name: 'Avg Revenue Per Visit',
      group: 'core',
      source: 'core',
      weight: 1.2,
      target: '>= $185',
      tip: 'Use silent price raises and package optimization to improve ARPV.',
      diagnosticIntent: 'Measure pricing power and value capture per visit.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '8.2 Grading Logic and Threshold Matrices',
      gradeBands: [
        { grade: 'green', label: '> $185', min: 185.01 },
        { grade: 'yellow', label: '$150 - $185', min: 150, max: 185 },
        { grade: 'red', label: '< $150', max: 149.99 },
      ],
    },
    recurring: {
      id: 'recurring',
      name: 'Recurring Revenue Ratio',
      group: 'core',
      source: 'core',
      weight: 1.15,
      target: '30% - 50%',
      tip: 'Continuity programs stabilize cash flow and increase enterprise value.',
      diagnosticIntent: 'Measure recurring revenue durability and volatility reduction.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '3.2 Secondary Revenue',
      gradeBands: [
        { grade: 'green', label: '> 30%', min: 30.01 },
        { grade: 'yellow', label: '15% - 30%', min: 15, max: 30 },
        { grade: 'red', label: '< 15%', max: 14.99 },
      ],
    },
    rent: {
      id: 'rent',
      name: 'Facility Cost %',
      group: 'core',
      source: 'core',
      weight: 1,
      target: '< 7% elite, <= 10% acceptable',
      tip: 'Negotiate flat/capped rent and avoid percentage-of-revenue lease structures.',
      diagnosticIntent: 'Detect over-leverage on real estate burden.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '4.1 Facility Costs and Rent Strategy',
      gradeBands: [
        { grade: 'green', label: '< 7%', max: 6.99 },
        { grade: 'yellow', label: '7% - 10%', min: 7, max: 10 },
        { grade: 'red', label: '> 10%', min: 10.01 },
      ],
    },
    payroll: {
      id: 'payroll',
      name: 'Clinical Payroll %',
      group: 'core',
      source: 'core',
      weight: 1.1,
      target: '30% - 40% elite, <= 50% max',
      tip: 'Use base + bonus compensation aligned to retention and capacity KPIs.',
      diagnosticIntent: 'Measure labor efficiency excluding owner distributions.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '4.2 Staffing, Payroll, and Compensation Engineering',
      gradeBands: [
        { grade: 'green', label: '30% - 40%', min: 30, max: 40 },
        { grade: 'yellow', label: '41% - 50%', min: 40.01, max: 50 },
        { grade: 'red', label: '> 50%', min: 50.01 },
      ],
    },
    margin: {
      id: 'margin',
      name: 'Net Profit Margin',
      group: 'core',
      source: 'core',
      weight: 1.3,
      target: '>= 20% (elite 20-40%+)',
      tip: 'Target margin expansion with pricing, overhead controls, and recurring revenue.',
      diagnosticIntent: 'Measure true financial resilience after all operating expenses.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '5.2 Net Profit Margin Analysis',
      gradeBands: [
        { grade: 'green', label: '> 20%', min: 20.01 },
        { grade: 'yellow', label: '10% - 20%', min: 10, max: 20 },
        { grade: 'red', label: '< 10%', max: 9.99 },
      ],
    },
    grossMargin: {
      id: 'grossMargin',
      name: 'Gross Margin',
      group: 'operational',
      source: 'advanced',
      weight: 0.9,
      target: '> 85%',
      tip: 'Track merchant fees and COGS leakage to protect high-margin service economics.',
      diagnosticIntent: 'Measure variable-cost control before overhead allocation.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '5.1 Gross Margin Analysis',
      gradeBands: [
        { grade: 'green', label: '>= 85%', min: 85 },
        { grade: 'yellow', label: '80% - 84.9%', min: 80, max: 84.99 },
        { grade: 'red', label: '< 80%', max: 79.99 },
      ],
    },
    marketingEfficiency: {
      id: 'marketingEfficiency',
      name: 'Marketing Spend %',
      group: 'operational',
      source: 'advanced',
      weight: 0.75,
      target: '< 10% once mature',
      tip: 'Shift from paid traffic dependency toward relationship and referral engines.',
      diagnosticIntent: 'Check if acquisition spend is scaling efficiently.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '4.3 Marketing Efficiency and PAC',
      gradeBands: [
        { grade: 'green', label: '< 10%', max: 9.99 },
        { grade: 'yellow', label: '10% - 15%', min: 10, max: 15 },
        { grade: 'red', label: '> 15%', min: 15.01 },
      ],
    },
    techAdminBurden: {
      id: 'techAdminBurden',
      name: 'Tech & Admin %',
      group: 'operational',
      source: 'advanced',
      weight: 0.65,
      target: '3% - 5%',
      tip: 'Consolidate tools and automate admin workflows to preserve margin.',
      diagnosticIntent: 'Detect software/admin overhead creep.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '4.4 Technological Leverage and Administrative Overhead',
      gradeBands: [
        { grade: 'green', label: '3% - 5%', min: 3, max: 5 },
        { grade: 'yellow', label: '5.01% - 8%', min: 5.01, max: 8 },
        { grade: 'red', label: '> 8%', min: 8.01 },
      ],
    },
    revenueStratification: {
      id: 'revenueStratification',
      name: 'Revenue Stratification Fit',
      group: 'operational',
      source: 'advanced',
      weight: 0.8,
      target: 'Front-End 45-60%, Continuity 30-50%, Tertiary 5-15%',
      tip: 'Diversify beyond single-visit revenue and increase continuity penetration.',
      diagnosticIntent: 'Validate revenue mix against cash-based architecture benchmarks.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: 'Revenue Stratification',
      gradeBands: [
        { grade: 'green', label: '>= 85 fit score', min: 85 },
        { grade: 'yellow', label: '65 - 84 fit score', min: 65, max: 84.99 },
        { grade: 'red', label: '< 65 fit score', max: 64.99 },
      ],
    },
    leadConversion: {
      id: 'leadConversion',
      name: 'Lead to Eval Conversion',
      group: 'growth',
      source: 'advanced',
      weight: 0.75,
      target: '>= 60%',
      tip: 'Improve discovery-call quality and tighten local offer positioning.',
      diagnosticIntent: 'Measure top-of-funnel conversion efficiency.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '6. Key Performance Indicators (KPIs) of Clinical Growth',
      gradeBands: [
        { grade: 'green', label: '>= 60%', min: 60 },
        { grade: 'yellow', label: '40% - 59.9%', min: 40, max: 59.99 },
        { grade: 'red', label: '< 40%', max: 39.99 },
      ],
    },
    packageCommitment: {
      id: 'packageCommitment',
      name: 'Package Commitment Rate',
      group: 'growth',
      source: 'advanced',
      weight: 0.95,
      target: '>= 70%',
      tip: 'Use patient-goal anchored value communication and clear plan recommendations.',
      diagnosticIntent: 'Measure ability to convert evaluations into plans of care.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '3.1 Front-End Revenue',
      gradeBands: [
        { grade: 'green', label: '>= 70%', min: 70 },
        { grade: 'yellow', label: '50% - 69.9%', min: 50, max: 69.99 },
        { grade: 'red', label: '< 50%', max: 49.99 },
      ],
    },
    pacLtv: {
      id: 'pacLtv',
      name: 'LTV to PAC Ratio',
      group: 'growth',
      source: 'advanced',
      weight: 0.85,
      target: '>= 3.0x',
      tip: 'Raise LTV via continuity and reduce PAC via referral channels.',
      diagnosticIntent: 'Ensure acquisition economics are accretive.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '4.3 Marketing Efficiency and PAC',
      gradeBands: [
        { grade: 'green', label: '>= 3.0x', min: 3 },
        { grade: 'yellow', label: '2.0x - 2.99x', min: 2, max: 2.99 },
        { grade: 'red', label: '< 2.0x', max: 1.99 },
      ],
    },
    nps: {
      id: 'nps',
      name: 'Net Promoter Score',
      group: 'growth',
      source: 'advanced',
      weight: 0.7,
      target: '>= 9.0',
      tip: 'NPS drives referral velocity and lowers long-run acquisition costs.',
      diagnosticIntent: 'Measure referral propensity and perceived service value.',
      knowledgeRefSlug: 'cash-based-pt-financial-pl-research-2026-02',
      knowledgeRefSection: '6. Key Performance Indicators (KPIs) of Clinical Growth',
      gradeBands: [
        { grade: 'green', label: '>= 9.0', min: 9 },
        { grade: 'yellow', label: '7.0 - 8.9', min: 7, max: 8.99 },
        { grade: 'red', label: '< 7.0', max: 6.99 },
      ],
    },
  },
}
