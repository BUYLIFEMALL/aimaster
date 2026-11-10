import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to live production login page: https://coupang-ops.buylife.xyz/login');
  await page.goto('https://coupang-ops.buylife.xyz/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const outDir = 'D:/Antigravity/Design/84_minimal_commerce_atelier/coupang-ops';
  const outPath = path.join(outDir, 'live_production_v119_login.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('✔ Live production v1.19 screenshot captured at:', outPath);

  // Check UI elements on page
  const title = await page.title();
  const hasButton = await page.$('.btn-3d-blue') !== null;
  const termsText = await page.textContent('body');
  const hasStandardTerms = termsText.includes('진행 시 이용약관 및 개인정보 처리방침에 동의합니다');

  console.log({
    title,
    hasButton,
    hasStandardTerms
  });

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
