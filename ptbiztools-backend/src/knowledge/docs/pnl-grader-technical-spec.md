# P&L Grader Modal - Technical Specification

## Overview
A standalone, highly interactive P&L grading component for a Vite + React + TypeScript SPA. The component calculates and grades the financial health of a physical therapy clinic against cash-based industry benchmarks and generates a dynamic 90-day action plan.

## Tech Stack
- React 18+ (hooks)
- TypeScript
- Vanilla CSS
- Framer Motion
- Lucide React
- html2canvas + jsPDF

## Clinic Profile Inputs
- clinicSize: Individual Clinician | Multi-Clinician
- clinicModel: Cash-Based | Hybrid
- businessStage: Startup | Growth Mode | Maintenance

## Financial Inputs
- totalGrossRevenue
- totalPatientVisits
- revenueFromContinuity
- totalFacilityCosts
- totalStaffPayroll
- totalOperatingExpenses
- ownerSalary
- ownerAddBacks

## Core Grading Thresholds
### Average Revenue Per Visit (ARPV)
- Green: > $185
- Yellow: $150 - $184
- Red: < $150

### Recurring Revenue Ratio
- Green: > 30%
- Yellow: 15% - 29%
- Red: < 15%

### Facility Cost / Rent Burden
- Green: < 7%
- Yellow: 7% - 10%
- Red: > 10%

### Clinical Payroll Ratio
- Green: < 35%
- Yellow: 35% - 45%
- Red: > 45%

### True Net Profit Margin
- Green: > 20%
- Yellow: 10% - 19%
- Red: < 10%

## Advanced Outputs
- ODI (Owner's Discretionary Income)
- Enterprise valuation range (3x to 5x ODI)
- Cash flow analysis summary
- 90-day prioritized action plan

## Financial Architecture Notes
### Revenue Stratification
- Front-End Revenue: 45% - 60%
- Continuity Revenue: 30% - 50%
- Tertiary Revenue: 5% - 15%

### Overhead Benchmarks
- Facility / Rent: 5% - 10%
- Clinical Payroll: < 50%
- Marketing: trend toward < 10%
- Tech & Admin: 3% - 5%

### KPI Targets
- Package commitment rate: >= 70%
- ARPV: $150 - $200+
- Capacity utilization: 600% - 650%
- NPS: 9+
