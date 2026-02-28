const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000/api';

// Authentication & Team Types
export interface TeamMember {
  id: string;
  name: string;
  title: string;
  teamSection: string;
  imageUrl: string;
  passwordHash?: string;
}

export interface User {
  id: string;
  name: string;
  title: string;
  teamSection: string;
  imageUrl: string;
}

// Auth API functions
export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const response = await fetch(`${API_BASE}/auth/team`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch team');
    return await response.json();
  } catch (error) {
    console.error('Failed to get team members:', error);
    return [];
  }
}

export async function login(userId: string, password: string, rememberMe: boolean): Promise<{ user?: User, error?: string, needsSetup?: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, password, rememberMe }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error, needsSetup: data.needsSetup };
    return { user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Network error' };
  }
}

export async function logout(): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

export async function getMe(): Promise<{ user?: User, error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!response.ok) return { error: 'Not authenticated' };
    const data = await response.json();
    return { user: data.user };
  } catch (error) {
    console.error('Get me error:', error);
    return { error: 'Network error' };
  }
}

export async function setupPassword(userId: string, password: string): Promise<{ user?: User, error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/setup-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, password }),
    });
    if (!response.ok) return { error: 'Setup failed' };
    const data = await response.json();
    return { user: data.user };
  } catch (error) {
    console.error('Setup password error:', error);
    return { error: 'Network error' };
  }
}


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
