import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const failedRequests = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push(response.url() + ' - Status ' + response.status());
    }
  });

  console.log('Opening https://ptbiztools-frontend.vercel.app...');
  await page.goto('https://ptbiztools-frontend.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('\n--- All Failed Requests (404/500) ---');
  if (failedRequests.length > 0) {
    // Dedupe
    const unique = [...new Set(failedRequests)];
    unique.forEach(r => console.log(r));
  } else {
    console.log('None');
  }
  
  await browser.close();
}

test().catch(console.error);
