import assert from 'node:assert/strict'
import test from 'node:test'
import { validateMappedInputForApproval } from './sanity.js'

test('validateMappedInputForApproval accepts valid mapped input', () => {
  const issues = validateMappedInputForApproval({
    totalGrossRevenue: 500000,
    totalPatientVisits: 2500,
    revenueFromContinuity: 170000,
    totalFacilityCosts: 32000,
    totalStaffPayroll: 175000,
    totalOperatingExpenses: 390000,
    ownerSalary: 100000,
    ownerAddBacks: 18000,
    leadCount: 220,
    evaluationsBooked: 140,
    packagesClosed: 100,
  })

  assert.deepEqual(issues, [])
})

test('validateMappedInputForApproval flags missing/invalid constraints', () => {
  const issues = validateMappedInputForApproval({
    totalGrossRevenue: 100000,
    totalPatientVisits: 500,
    revenueFromContinuity: 120000,
    totalFacilityCosts: -1,
    totalStaffPayroll: 40000,
    totalOperatingExpenses: 90000,
    ownerSalary: 30000,
    ownerAddBacks: 5000,
    leadCount: 30,
    evaluationsBooked: 40,
    packagesClosed: 50,
  })

  assert.ok(issues.some((issue) => issue.includes('totalFacilityCosts cannot be negative')))
  assert.ok(issues.some((issue) => issue.includes('revenueFromContinuity exceeds totalGrossRevenue')))
  assert.ok(issues.some((issue) => issue.includes('evaluationsBooked exceeds leadCount')))
  assert.ok(issues.some((issue) => issue.includes('packagesClosed exceeds evaluationsBooked')))
})

test('validateMappedInputForApproval flags missing required core fields', () => {
  const issues = validateMappedInputForApproval({
    totalGrossRevenue: 500000,
    totalPatientVisits: 2500,
  })

  assert.ok(issues.some((issue) => issue.includes('totalOperatingExpenses missing')))
  assert.ok(issues.some((issue) => issue.includes('ownerSalary missing')))
})
