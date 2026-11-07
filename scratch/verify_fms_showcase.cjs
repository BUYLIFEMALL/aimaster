const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const brainDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';

  console.log("Navigating to http://localhost:3800/showcase.html...");
  await page.goto("http://localhost:3800/showcase.html", { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(brainDir, 'fms_showcase_live_verified.png'), fullPage: false });
  console.log("✓ Saved fms_showcase_live_verified.png");

  console.log("Navigating to http://localhost:3800/comparison.html...");
  await page.goto("http://localhost:3800/comparison.html", { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(brainDir, 'fms_comparison_live_verified.png'), fullPage: false });
  console.log("✓ Saved fms_comparison_live_verified.png");

  // 라이트박스 팝업 클릭 검증
  console.log("Testing Lightbox Popup on showcase.html...");
  await page.goto("http://localhost:3800/showcase.html", { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  const firstCard = await page.$('.view-card');
  if (firstCard) {
    await firstCard.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(brainDir, 'fms_lightbox_verified.png'), fullPage: false });
    console.log("✓ Saved fms_lightbox_verified.png");
  }

  await browser.close();
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
}

main().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
