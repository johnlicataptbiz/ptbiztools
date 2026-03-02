const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalRuntime = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';
const envApiBase = import.meta.env.VITE_API_URL?.trim();

// In production, force same-origin API to keep auth cookies first-party.
// In local development, allow explicit backend URL override.
export const API_BASE = isLocalRuntime
  ? (envApiBase || 'http://localhost:3000/api')
  : '/api';

