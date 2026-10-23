const { chromium } = require('../personality-suite/node_modules/playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('📱 모바일 메뉴 오버레이 검수 시작...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 100,
  });

  const contextMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await contextMobile.newPage();
  await page.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 헤더 우측 상단 햄버거 버튼 클릭
  const hamburger = page.locator('header button.md\\:hidden');
  await hamburger.waitFor({ state: 'visible', timeout: 5000 });
  await hamburger.click();
  await page.waitForTimeout(1000);

  const capMobMenu = path.join(ARTIFACT_DIR, 'edge_main_phase1_mobile_menu.png');
  await page.screenshot({ path: capMobMenu, fullPage: false });
  console.log('✓ 모바일 메뉴 오버레이 캡처 완료:', capMobMenu);

  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(err => {
  console.error('검수 에러:', err);
  process.exit(1);
});
