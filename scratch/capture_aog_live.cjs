const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const brainDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';

  console.log('Navigating to https://graphic.buylife.xyz/login...');
  await page.goto('https://graphic.buylife.xyz/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(brainDir, 'aog_v120_live_login.png'), fullPage: false });
  console.log('Saved: aog_v120_live_login.png');

  console.log('Navigating to https://graphic.buylife.xyz/guide...');
  await page.goto('https://graphic.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(brainDir, 'aog_v120_live_guide.png'), fullPage: false });
  console.log('Saved: aog_v120_live_guide.png');

  await browser.close();
  console.log('LIVE VERIFICATION CAPTURES COMPLETED!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
