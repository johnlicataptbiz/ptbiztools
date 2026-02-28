import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const discoveryRubric = `# Discovery Call Grading Rubric

## Overview
This rubric defines what a great cash-based physical therapy discovery call looks like. It is used to evaluate call transcripts and generate coaching feedback.

## The Call Framework (7 Phases)

### Phase 1: Opening & Rapport (10 points)
- Warm, confident greeting with the patient's name
- If referred: acknowledge the referral, express genuine interest
- Light rapport building that feels natural
- Energy is high but not forced

**Common mistakes:**
- Jumping straight into clinical questions without any rapport
- Sounding scripted or robotic
- Over-rapport: spending 5+ minutes on small talk

### Phase 2: Set the Scene / Take Control (10 points)
- Clinician clearly sets the agenda
- Gets verbal agreement to proceed
- Asks how they found the clinic before diving into the medical history
- The clinician is leading the conversation, not following it

**Common mistakes:**
- Never setting an agenda
- Letting the patient dictate the flow (especially insurance questions)
- Asking "Do you have any questions?" (RED FLAG)

### Phase 3: Discovery — Current State (15 points)
- Asks about their current situation
- Gets specific about limitations
- Asks about previous treatment
- Quantifies where possible

### Phase 4: Discovery — Goals & Why (15 points)
- Asks what their goal is
- Gets specific about the goal
- Asks WHY the goal matters
- Asks about cost of inaction

### Phase 5: Transition & Value Presentation (20 points)
- Summarizes what they heard
- Connects clinic's approach to THEIR specific situation
- Differentiates from insurance PT
- Explains the evaluation
- Frames outcome, not just process

### Phase 6: Objection Handling (15 points)
Using AAA Framework:
- Acknowledge: Validate the concern
- Associate: Connect it to positive behavior
- Ask: Ask a question about their concern

### Phase 7: The Close (15 points)
- Assumptive close
- Offers specific times
- Ties close back to their goals
- Handles logistics confidently

## Red Flags (Automatic Deductions)
- Referred patient to a competitor: -15 points
- Diagnosed on the phone: -10 points
- Led with price before building value: -10 points
- Asked "Do you have any questions?": -5 points
- Never attempted to close: -10 points
`;

const pnlGuide = `# The Financial Architecture of Cash-Based Physical Therapy and Performance Wellness Practices

## 1. The Macroeconomic Restructuring of Physical Therapy
The economic landscape has undergone fundamental restructuring. Medicare reimbursement rates slashed ~10% over 5 years. Operating costs surged (rent, utilities, overhead). APTA reports 9.5% national vacancy rate for outpatient PT positions.

## 2. The Foundational Economics of the Cash-Based Model
- Traditional clinic: ~$105 net per visit, needs 14-20 patients/day to cover overhead
- Cash-based model: Target $150-200 ARPS (Average Revenue Per Session)
- **Clarity Formula**: Annual Revenue Target ÷ Patient LTV = New Patients Needed
- Example: $500K ÷ $2,000 LTV = 250 new patients/year = ~21/month = ~5/week

## 3. Revenue Ecosystem
### 3.1 Front-End Revenue (45-60% of gross)
- Initial evaluations, single sessions, plans of care
- Package/Plan of Care Commitment Rate: Target 70%+

### 3.2 Continuity Revenue (30-50% of gross)
- Wellness memberships, small group training, remote coaching
- Creates Monthly Recurring Revenue (MRR)
- Two small group cohorts = $50K+ annual recurring revenue

### 3.3 Tertiary Revenue (5-15% of gross)
- Recovery room access, digital courses, retail supplements
- Near 100% margin on digital products

## 4. Expense Benchmarks
| Category | Target |
|----------|--------|
| Facility/Rent | 5-10% of gross |
| Clinical Payroll | <50% of gross |
| Marketing | <10% (decreasing) |
| Tech & Admin | 3-5% of gross |

## 5. Profitability
- Gross Margin: Target >85%
- Net Profit Margin: Target 20-30% (elite: 40%+)

## 6. Key Performance Indicators
- Lead-to-Evaluation Conversion Rate
- Package/Plan of Care Commitment Rate: Target 70%+
- Capacity Utilization Rate: 600-650%
- Average Revenue Per Visit: Target $150-200
- Net Promoter Score: Target 9+

## 7. Enterprise Valuation
- ODI = Net Profit + Owner's Fair Market Salary + Add-backs
- Valuation: 3x-5x ODI
- $150K ODI = $450K-$750K enterprise value

## 8. P&L Grader Metrics

### Metric 1: ARPV
- Green (Elite): >$185
- Yellow (Average): $150-184
- Red (Critical): <$150

### Metric 2: Recurring Revenue Ratio
- Green: >30%
- Yellow: 15-29%
- Red: <15%

### Metric 3: Rent Burden %
- Green: <7%
- Yellow: 7-10%
- Red: >10%

### Metric 4: Clinical Payroll Ratio
- Green: 30-40%
- Yellow: 41-50%
- Red: >50%

### Metric 5: Net Profit Margin
- Green: >20%
- Yellow: 10-19%
- Red: <10%
`;

async function main() {
  // Clear existing knowledge docs
  await prisma.knowledgeDoc.deleteMany();
  
  // Insert Discovery Call Rubric
  await prisma.knowledgeDoc.create({
    data: {
      title: "Discovery Call Grading Rubric",
      content: discoveryRubric,
      category: "coaching",
      source: "PT Biz Internal",
    },
  });
  
  // Insert P&L Guide
  await prisma.knowledgeDoc.create({
    data: {
      title: "Cash-Based PT Financial Architecture",
      content: pnlGuide,
      category: "financial",
      source: "PT Biz Internal",
    },
  });
  
  console.log("Knowledge docs seeded successfully!");
  
  const docs = await prisma.knowledgeDoc.findMany();
  console.log(`Total docs in database: ${docs.length}`);
  docs.forEach(d => console.log(`- ${d.title} (${d.category})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
