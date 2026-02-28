import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'https://ptbiz-backend-production.up.railway.app/api';

async function uploadVideo(name, filePath) {
  const data = fs.readFileSync(filePath);
  const base64 = data.toString('base64');
  
  const response = await fetch(`${API_URL}/videos/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data: base64, mimeType: 'video/mp4' })
  });
  
  const result = await response.json();
  console.log(`${name}:`, response.status, result);
  return result;
}

async function test() {
  console.log('Seeding videos to Railway DB...');
  
  await uploadVideo('intro-logo', '/Users/jl/Desktop/ptbiztools/ptbiztools-main/ptbiztools-backend/intro-logo.mp4');
  await uploadVideo('intro-danny', '/Users/jl/Desktop/ptbiztools/ptbiztools-main/ptbiztools-backend/intro-danny.mp4');
  
  console.log('\nTesting video retrieval...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://ptbiztools-frontend.vercel.app');
  await page.evaluate(() => localStorage.removeItem('ptbiz_intro_seen'));
  await page.reload();
  
  await page.waitForTimeout(3000);
  
  const videoTest = await page.evaluate(async () => {
    try {
      const logoRes = await fetch('https://ptbiz-backend-production.up.railway.app/api/videos/intro-logo');
      const dannyRes = await fetch('https://ptbiz-backend-production.up.railway.app/api/videos/intro-danny');
      return {
        logo: logoRes.status,
        danny: dannyRes.status
      };
    } catch (e) {
      return { error: e.message };
    }
  });
  
  console.log('Video API test:', videoTest);
  
  await browser.close();
  console.log('\nDone!');
}

test();
