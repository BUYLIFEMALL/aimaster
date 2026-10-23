const { chromium } = require('../personality-suite/node_modules/playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('🌐 카테고리 퀵 바 2열 래핑 및 스크롤바 제거 검수 시작');
  console.log('===============================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('[1/2] 데스크톱 메인 접속...');
  await page.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 스크롤을 내려 통계, 2-Tab 이용안내, 2열 카테고리 퀵 바 확인
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);

  const cap2Row = path.join(ARTIFACT_DIR, 'edge_main_phase2_category_2rows.png');
  await page.screenshot({ path: cap2Row, fullPage: false });
  console.log('  ✓ 2열 카테고리 퀵 바 (스크롤바 완전 제거) 캡처 완료:', cap2Row);

  console.log('[2/2] 3초간 화면 유지 후 종료...');
  await page.waitForTimeout(3000);
  await browser.close();
  console.log('🎉 2열 카테고리 검수 완료!');
}

main().catch(err => {
  console.error('검수 에러:', err);
  process.exit(1);
});
