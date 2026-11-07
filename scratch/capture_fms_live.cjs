const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const brainDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';

  console.log("Navigating to https://free-music-studio.buylife.xyz/login...");
  await page.goto("https://free-music-studio.buylife.xyz/login", { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(brainDir, 'fms_v133_live_login.png'), fullPage: false });
  console.log("✓ Saved fms_v133_live_login.png");

  console.log("Navigating to https://free-music-studio.buylife.xyz/guide...");
  await page.goto("https://free-music-studio.buylife.xyz/guide", { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(brainDir, 'fms_v133_live_guide.png'), fullPage: false });
  console.log("✓ Saved fms_v133_live_guide.png");

  await browser.close();
  console.log("FMS LIVE VERIFICATION COMPLETED!");
}

main().catch(err => {
  console.error("Live verification error:", err);
  process.exit(1);
});
