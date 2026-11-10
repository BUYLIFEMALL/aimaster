import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to live production login page: https://blog-keyword.buylife.xyz/login');
  await page.goto('https://blog-keyword.buylife.xyz/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const outDir = 'D:/Antigravity/Design/81_minimal_blogger_atelier/blog-keyword';
  const outPath = path.join(outDir, 'live_production_v113_login.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('✔ Live production v1.13 screenshot captured at:', outPath);

  // Check UI elements on page
  const title = await page.title();
  const hasLogo = await page.$('svg') !== null;
  const has3dButton = await page.$('.btn-3d-sage') !== null;
  const termsText = await page.textContent('body');
  const hasStandardTerms = termsText.includes('진행 시 이용약관 및 개인정보 처리방침에 동의합니다');

  console.log({
    title,
    hasLogo,
    has3dButton,
    hasStandardTerms
  });

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
