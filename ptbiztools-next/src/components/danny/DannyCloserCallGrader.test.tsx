import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import SalesCallGrader from './DannyCloserCallGrader';
import * as api from '@/lib/ptbiz-api';
import * as helpers from './graderV2Helpers';

// Mock modules
vi.mock('@/lib/ptbiz-api');
vi.mock('sonner');
vi.mock('@/constants/tool-badges', () => ({ TOOL_BADGES: { sales: '/mock-sales-badge.png' } }));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

beforeAll(() => {
  // Mock crypto
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => 'mock-session-id'),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.getItem.mockReturnValue(null);
  vi.mocked(api.gradeDannySalesCallV2).mockResolvedValue({ data: mockGradeResponse });
  vi.mocked(api.logAction).mockResolvedValue(undefined);
  vi.mocked(api.saveCoachingAnalysis).mockResolvedValue({ analysisId: 'mock-id' });
  vi.mocked(api.savePdfExport).mockResolvedValue({});
  vi.mocked(api.extractTranscriptFromFile).mockResolvedValue({ text: 'mock transcript', wordCount: 200, sourceType: 'pdf' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockGradeResponse = {
  version: 'v2' as const,
  programProfile: 'Rainmaker' as const,
  deterministic: { weightedPhaseScore: 72, penaltyPoints: 5, unknownPenalty: 0, overallScore: 67 },
  phaseScores: {
    connection: { score: 85, summary: 'Good rapport', evidence: [] },
    discovery: { score: 60, summary: 'More depth needed', evidence: [] },
    gap_creation: { score: 70, summary: 'Gap identified', evidence: [] },
    temp_check: { score: 75, summary: 'Temp checked', evidence: [] },
    solution: { score: 80, summary: 'Solution presented', evidence: [] },
    close: { score: 65, summary: 'Close attempted', evidence: [] },
    followup: { score: 70, summary: 'Follow-up planned', evidence: [] },
  },
  criticalBehaviors: {
    free_consulting: { status: 'fail' as const, note: 'Gave advice', evidence: [] },
    discount_discipline: { status: 'pass' as const, note: 'No discounts', evidence: [] },
    emotional_depth: { status: 'pass' as const, note: 'Good probing', evidence: [] },
    time_management: { status: 'pass' as const, note: 'On time', evidence: [] },
    personal_story: { status: 'unknown' as const, note: 'Not observed', evidence: [] },
  },
  highlights: {
    topStrength: 'Strong connection',
    topImprovement: 'Deeper discovery',
    prospectSummary: 'Ready but price sensitive',
  },
  confidence: { score: 92, evidenceCoverage: 0.95, quoteVerificationRate: 0.9, transcriptQuality: 0.85 },
  qualityGate: { accepted: true, reasons: [] },
  metadata: { closer: 'Test Coach', model: 'gpt-4' },
};

describe('DannyCloserCallGrader', () => {
  test('renders grade view initially', () => {
    render(<SalesCallGrader />);
    expect(screen.getByText('Sales Call Grader')).toBeInTheDocument();
    expect(screen.getByText(/Drop a file here/)).toBeInTheDocument();
  });

  test('switches to history view', () => {
    render(<SalesCallGrader />);
    const dashboardBtn = screen.getByText('Dashboard');
    fireEvent.click(dashboardBtn);
    expect(screen.getByText('No calls graded yet')).toBeInTheDocument();
  });

  test('renders clinic icons and backgrounds in modal', async () => {
    const { container } = render(<SalesCallGrader />);
    
    // Trigger modal open (simulate history + click)
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify([{
      id: 1,
      date: new Date().toISOString(),
      closer: 'John',
      outcome: 'Won',
      program: 'Rainmaker',
      prospectName: 'Test Prospect',
      result: mockGradeResponse,
    }]));
    
    // Re-render with history
    const { rerender } = render(<SalesCallGrader />, { container });
    
    // Open results modal
    const lastResultBtn = screen.getByRole('button', { name: /Last Result/i });
    fireEvent.click(lastResultBtn);
    
    await waitFor(() => {
      expect(screen.getByAltText(/growth clinic icon/i)).toBeInTheDocument();
      expect(document.querySelector('.clinic-pattern-kpi')).toBeInTheDocument();
    });
  });

  test('word count gate disables/enables grade button', async () => {
    render(<SalesCallGrader />);
    const textarea = screen.getByRole('textbox');
    
    // Below threshold
    fireEvent.change(textarea, { target: { value: 'short text' } });
    expect(screen.getByText('Grade This Call')).toBeDisabled();
    
    // Above threshold
    fireEvent.change(textarea, { target: { value: 'word '.repeat(150) } });
    await waitFor(() => expect(screen.getByText('Grade This Call')).not.toBeDisabled());
  });
});

describe('DannyCloserCallGrader Utils', () => {
  test('utils: canSubmitByWordCount', () => {
    expect(helpers.canSubmitByWordCount(100, 120)).toBe(false);
    expect(helpers.canSubmitByWordCount(130, 120)).toBe(true);
    expect(helpers.canSubmitByWordCount(0, 120)).toBe(false);
  });

  test('utils: getWordGateMessage', () => {
    expect(helpers.getWordGateMessage(100, 120)).toMatch(/Need/);
    expect(helpers.getWordGateMessage(130, 120)).toMatch(/Quality gate ready/);
  });

  test('utils: normalizeBehaviorStatus', () => {
    expect(helpers.normalizeBehaviorStatus({ status: 'pass' })).toBe('pass');
    expect(helpers.normalizeBehaviorStatus({ pass: true })).toBe('pass');
    expect(helpers.normalizeBehaviorStatus({ pass: false })).toBe('fail');
    expect(helpers.normalizeBehaviorStatus({})).toBe('unknown');
  });
});


