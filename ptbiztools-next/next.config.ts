import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const rawBackendUrl = process.env.PTBIZ_BACKEND_URL?.trim() || "https://ptbiz-backend-production.up.railway.app/api";

function ensureApiBase(url: string) {
  const normalized = url.replace(/\/+$/, "");
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
}

const backendApiBase = ensureApiBase(rawBackendUrl);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      {
        source: "/pl-calculator-advanced",
        destination: "/pl-calculator",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${backendApiBase}/auth/:path*` },
      { source: "/api/actions/:path*", destination: `${backendApiBase}/actions/:path*` },
      { source: "/api/analytics/:path*", destination: `${backendApiBase}/analytics/:path*` },
      { source: "/api/pl-imports/:path*", destination: `${backendApiBase}/pl-imports/:path*` },
      { source: "/api/transcripts/:path*", destination: `${backendApiBase}/transcripts/:path*` },
      { source: "/api/danny-tools/:path*", destination: `${backendApiBase}/danny-tools/:path*` },
      { source: "/health", destination: backendApiBase.replace(/\/api$/i, "/health") },
    ];
  },
};

export default withWorkflow(nextConfig);
