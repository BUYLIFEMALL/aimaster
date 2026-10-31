const { chromium } = require('D:/Antigravity/AIMaster/thumbnail-master/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function captureLive() {
  const browser = await chromium.launch();
  const artDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\07fcc352-f8eb-42d2-b89d-e045a6909967';

  // 1. Desktop Home
  const pageDesktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  console.log('Navigating to live https://coupang-ops.buylife.xyz/home ...');
  try {
    await pageDesktop.goto('https://coupang-ops.buylife.xyz/home', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.warn('Navigation note:', e.message);
  }
  await pageDesktop.screenshot({ path: path.join(artDir, 'cpg_live_desktop_home.png') });
  console.log('Captured cpg_live_desktop_home.png');

  // 2. Desktop Guide
  try {
    await pageDesktop.goto('https://coupang-ops.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.warn('Navigation note:', e.message);
  }
  await pageDesktop.screenshot({ path: path.join(artDir, 'cpg_live_desktop_guide.png') });
  console.log('Captured cpg_live_desktop_guide.png');

  // 3. Mobile
  const pageMobile = await browser.newPage({
    viewport: { width: 400, height: 840 },
    deviceScaleFactor: 2
  });
  try {
    await pageMobile.goto('https://coupang-ops.buylife.xyz/home', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.warn('Navigation note:', e.message);
  }
  await pageMobile.screenshot({ path: path.join(artDir, 'cpg_live_mobile.png') });
  console.log('Captured cpg_live_mobile.png');

  await browser.close();
  console.log('All live captures complete!');
}

captureLive().catch(err => {
  console.error('Error capturing live:', err);
  process.exit(1);
});
