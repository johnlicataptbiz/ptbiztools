import { Router } from 'express';
import { prisma } from '../services/prisma.js';

export const knowledgeDocRouter = Router();

const knowledgeDocs = [
  {
    title: "Discovery Call Grading Rubric",
    content: `# Discovery Call Grading Rubric

## Overview
This rubric defines what a great cash-based physical therapy discovery call looks like. It is used to evaluate call transcripts and generate coaching feedback.

## The Call Framework (7 Phases)

### Phase 1: Opening & Rapport (10 points)
- Warm, confident greeting with the patient's name
- If referred: acknowledge the referral, express genuine interest
- Light rapport building that feels natural

### Phase 2: Set the Scene / Take Control (10 points)
- Clinician clearly sets the agenda
- Gets verbal agreement to proceed

### Phase 3: Discovery — Current State (15 points)
- Asks about their current situation
- Gets specific about limitations

### Phase 4: Discovery — Goals & Why (15 points)
- Asks what their goal is
- Gets specific about the goal
- Asks WHY the goal matters

### Phase 5: Transition & Value Presentation (20 points)
- Summarizes what they heard
- Connects clinic's approach to THEIR specific situation

### Phase 6: Objection Handling (15 points)
Using AAA Framework:
- Acknowledge, Associate, Ask

### Phase 7: The Close (15 points)
- Assumptive close with specific times

## Red Flags
- Referred patient to a competitor: -15 points
- Diagnosed on the phone: -10 points
- Led with price before building value: -10 points
- Asked "Do you have any questions?": -5 points`,
    category: "coaching",
    source: "PT Biz Internal"
  },
  {
    title: "P&L Grader Technical Specification",
    content: `# P&L Grader Modal - Technical Specification

## Overview
A standalone, highly interactive "P&L Grader Modal" component for a Vite + React + TypeScript SPA. This modal calculates and grades the financial health of a physical therapy clinic based on specific industry benchmarks and outputs a dynamic 90-day action plan.

## Tech Stack
React 18 (Functional components, Hooks), TypeScript, Vanilla CSS/CSS Modules, Framer Motion, Lucide React, html2canvas & jspdf

## Clinic Profile Inputs
clinicSize: "Individual Clinician" | "Multi-Clinician"
clinicModel: "Cash-Based" | "Hybrid"
businessStage: "Startup" | "Growth Mode" | "Maintenance"

## Financial Data Inputs (Trailing 12 Months or 30-Day Window)
totalGrossRevenue, totalPatientVisits, revenueFromContinuity, totalFacilityCosts, totalStaffPayroll, totalOperatingExpenses, ownerSalary, ownerAddBacks

## Grading Thresholds

### Metric 1: Average Revenue Per Visit (ARPV)
Calc: totalGrossRevenue / totalPatientVisits
Green (> $150 - $184), Red (< $150)

### Metric 2: Recurring Revenue Ratio
Calc: revenueFromContinuity / totalGrossRevenue
Green (> 30%), Yellow (15% - 29%), Red (< 15%)

### Metric 3: Facility Cost / Rent Burden
Calc: totalFacilityCosts / totalGrossRevenue
Green (< 7%), Yellow (7% - 10%), Red (> 10%)

### Metric 4: People Cost / Clinical Payroll
Calc: totalStaffPayroll / totalGrossRevenue
Green (< 35%), Yellow (35% - 45%), Red (> 45%)

### Metric 5: True Net Profit Margin
Calc: (totalGrossRevenue - totalOperatingExpenses) / totalGrossRevenue
Green (> 20%), Yellow (10% - 19%), Red (< 10%)

## Advanced Outputs

### Enterprise Valuation Estimator & ODI
Calculate Net Profit + ownerSalary + ownerAddBacks = ODI. Show estimated range of ODI * 3.0 to ODI * 5.0.

### Cash Flow Analysis
Automated summary based on Net Profit and Recurring Revenue.

### 90-Day Action Plan
Dynamically generate 3 specific steps based on lowest-scoring metrics.

## Branding Colors
Primary Dark (#1a1a2e), Accent Red (#e94560), Deep Blue (#0f3460), Success Green (#2d8a4e), Warning Amber (#c47f17), Error Red (#c0392b)

## Financial Architecture Details

### Revenue Stratification
Front-End Revenue (Evaluations, Packages): 45-60%
Continuity Revenue (Wellness, Small Group): 30-50%
Tertiary Revenue (Recovery, Digital): 5-15%

### Overhead Benchmarks
Facility/Rent: 5-10% of Gross Revenue
Clinical Payroll: <50% of Gross Revenue
Marketing: Decreasing % over time (Target <10%)
Tech & Admin: 3-5% of Gross Revenue

### Key Performance Indicators
Lead-to-Evaluation Conversion Rate
Package/Plan of Care Commitment Rate: Target 70%
Capacity Utilization Rate
Average Revenue Per Visit (ARPV): $150-200+
Net Promoter Score (NPS): Target 9+

### Enterprise Valuation
ODI = Net Profit + Fair Market Owner's Salary + Discretionary Business Add-backs
Current multiples: 3x-5x ODI`,
    category: "technical",
    source: "PT Biz Internal"
  }
];

knowledgeDocRouter.get('/', async (req, res) => {
  try {
    const docs = await prisma.knowledgeDoc.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ docs, total: docs.length });
  } catch (error) {
    console.error('Error fetching knowledge docs:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge docs' });
  }
});

knowledgeDocRouter.post('/seed', async (req, res) => {
  try {
    // Clear existing and seed
    await prisma.knowledgeDoc.deleteMany();
    
    for (const doc of knowledgeDocs) {
      await prisma.knowledgeDoc.create({ data: doc });
    }
    
    res.json({ success: true, message: 'Knowledge docs seeded' });
  } catch (error) {
    console.error('Error seeding knowledge docs:', error);
    res.status(500).json({ error: 'Failed to seed knowledge docs' });
  }
});

knowledgeDocRouter.get('/:id', async (req, res) => {
  try {
    const doc = await prisma.knowledgeDoc.findUnique({
      where: { id: req.params.id }
    });
    if (!doc) {
      return res.status(404).json({ error: 'Doc not found' });
    }
    res.json(doc);
  } catch (error) {
    console.error('Error fetching knowledge doc:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge doc' });
  }
});
