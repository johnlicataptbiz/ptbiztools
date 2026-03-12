import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const legacyBackendDomain = "https://ptbiz-backend-production.up.railway.app";
const canonicalBackendDomain = "https://ptbiztools-backend-production.up.railway.app";

const envBackendUrl = process.env.PTBIZ_BACKEND_URL?.trim() || "";
const normalizedEnvBackendUrl = envBackendUrl
  .replace(legacyBackendDomain, canonicalBackendDomain)
  .replace(legacyBackendDomain.replace("https://", "http://"), canonicalBackendDomain);

const rawBackendUrl = normalizedEnvBackendUrl || `${canonicalBackendDomain}/api`;

function ensureApiBase(url: string) {
  const normalized = url.replace(/\/+$/, "");
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
}

const backendApiBase = ensureApiBase(rawBackendUrl);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '22001532.fs1.hubspotusercontent-na1.net',
        pathname: '/hubfs/**',
      },
      {
        protocol: 'https',
        hostname: '*.hubspotusercontent-na1.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ca.slack-edge.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'logos.hunter.io',
        pathname: '/**',
      },
    ],
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
      { source: "/api/zoom/:path*", destination: `${backendApiBase}/zoom/:path*` },
      { source: "/health", destination: backendApiBase.replace(/\/api$/i, "/health") },
    ];
  },
};

export default withWorkflow(nextConfig);
