const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const outDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';
  const liveUrl = 'https://threads-content-ops.buylife.xyz/login';

  console.log(`Navigating to ${liveUrl}...`);
  try {
    const res = await page.goto(liveUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`Response status: ${res ? res.status() : 'null'}`);
    await page.waitForTimeout(2000);

    const loginPath = path.join(outDir, 'tco_v225_live_login.png');
    await page.screenshot({ path: loginPath, fullPage: true });
    console.log(`Saved screenshot to ${loginPath}`);
  } catch (err) {
    console.error('Error during live navigation:', err);
  } finally {
    await browser.close();
  }
})();
