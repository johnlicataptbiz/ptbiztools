import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = process.env.PTBIZ_API_URL || 'https://ptbiz-backend-production.up.railway.app/api';
const ADMIN_NAME = process.env.PTBIZ_ADMIN_NAME || 'Jack Licata';
const ADMIN_PASSWORD = process.env.PTBIZ_ADMIN_PASSWORD;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_ASSETS = [
  { key: 'intro-combined', filePath: path.join(__dirname, 'public', 'intro-video.mp4') },
];

function mimeTypeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mp3') return 'audio/mpeg';
  throw new Error(`Unsupported media extension "${ext}" for ${filePath}`);
}

async function getAdminUserId() {
  const response = await fetch(`${API_URL}/auth/team`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch team list: HTTP ${response.status}`);
  }

  const users = await response.json();
  const admin = users.find((user) => user.name === ADMIN_NAME);
  if (!admin) {
    throw new Error(`Could not find admin profile "${ADMIN_NAME}" in /auth/team`);
  }

  return admin.id;
}

async function loginAsAdmin(userId) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      password: ADMIN_PASSWORD,
      rememberMe: true,
      sessionId: `seed-videos-${Date.now()}`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Admin login failed: HTTP ${response.status} ${payload.error || ''}`.trim());
  }

  const cookie = response.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('Admin login succeeded but no set-cookie header was returned');
  }

  return cookie.split(';')[0];
}

async function uploadAsset(asset, cookie) {
  if (!fs.existsSync(asset.filePath)) {
    throw new Error(`Missing media file: ${asset.filePath}`);
  }

  const mimeType = mimeTypeForFile(asset.filePath);
  const base64 = fs.readFileSync(asset.filePath).toString('base64');

  const response = await fetch(`${API_URL}/videos/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      name: asset.key,
      data: base64,
      mimeType,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Upload failed for ${asset.key}: HTTP ${response.status} ${payload.error || ''}`.trim());
  }

  console.log(`Uploaded ${asset.key} (${mimeType})`);
}

async function verifyAsset(key) {
  const response = await fetch(`${API_URL}/videos/${key}`);
  console.log(`Verify ${key}: HTTP ${response.status}`);
  if (response.status !== 200) {
    throw new Error(`Verification failed for ${key}: expected 200, got ${response.status}`);
  }
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error('Missing PTBIZ_ADMIN_PASSWORD environment variable');
  }

  console.log('Resolving admin user...');
  const adminUserId = await getAdminUserId();
  console.log(`Using admin profile "${ADMIN_NAME}" (${adminUserId})`);

  console.log('Logging in as admin...');
  const cookie = await loginAsAdmin(adminUserId);

  console.log('Uploading required intro asset...');
  for (const asset of REQUIRED_ASSETS) {
    await uploadAsset(asset, cookie);
  }

  console.log('Verifying backend media endpoint...');
  for (const asset of REQUIRED_ASSETS) {
    await verifyAsset(asset.key);
  }

  console.log('Video seed complete: combined intro asset is live.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
