const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ActionLogInput {
  actionType: string;
  description: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

export async function logAction(input: ActionLogInput): Promise<void> {
  try {
    await fetch(`${API_BASE}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

export const ActionTypes = {
  TRANSCRIPT_UPLOADED: 'transcript_uploaded',
  TRANSCRIPT_PASTED: 'transcript_pasted',
  GRADE_GENERATED: 'grade_generated',
  PDF_GENERATED: 'pdf_generated',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
} as const;
