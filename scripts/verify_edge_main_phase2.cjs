const { chromium } = require('../personality-suite/node_modules/playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('🌐 AIMaster 메인 사이트 Phase 2 Edge 실세션 검수 시작');
  console.log('===============================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 100,
  });

  // 1. 데스크톱 (1440px)
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await contextDesktop.newPage();

  console.log('[1/4] 데스크톱 메인 접속...');
  await page.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 스크롤 내려 통계 및 2-Tab 이용안내 영역 확인
  await page.evaluate(() => window.scrollBy(0, 650));
  await page.waitForTimeout(1000);

  // 1-1. 2-Tab 스마트 이용안내 (기본 탭: 서비스 이용 안내) 캡처
  const capNotice1 = path.join(ARTIFACT_DIR, 'edge_main_phase2_notice_tabs_1.png');
  await page.screenshot({ path: capNotice1, fullPage: false });
  console.log('  ✓ 2-Tab 이용안내 (탭1) 캡처 완료:', capNotice1);

  // 1-2. 드림팀 혜택 탭 클릭 및 캡처
  const dreamTab = page.locator('button:has-text("드림팀")');
  if (await dreamTab.count() > 0) {
    await dreamTab.click();
    await page.waitForTimeout(800);
    const capNotice2 = path.join(ARTIFACT_DIR, 'edge_main_phase2_notice_tabs_2.png');
    await page.screenshot({ path: capNotice2, fullPage: false });
    console.log('  ✓ 2-Tab 드림팀 혜택 (탭2) 캡처 완료:', capNotice2);
  }

  // 1-3. 카테고리 퀵 롤링 바 및 프로그램 카탈로그 상단 캡처
  await page.evaluate(() => window.scrollBy(0, 250));
  await page.waitForTimeout(800);
  const capQuickBar = path.join(ARTIFACT_DIR, 'edge_main_phase2_category_quick_bar.png');
  await page.screenshot({ path: capQuickBar, fullPage: false });
  console.log('  ✓ 카테고리 퀵 바 캡처 완료:', capQuickBar);

  // 2. 모바일 (375px)
  console.log('[2/4] 모바일 (375px) 메인 접속...');
  const contextMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await contextMobile.newPage();
  await mobilePage.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);

  // 모바일에서 통계와 2-Tab, 카테고리 퀵 바가 연결되는 스크롤 위치
  await mobilePage.evaluate(() => window.scrollBy(0, 480));
  await mobilePage.waitForTimeout(1000);
  const capMobileFlow = path.join(ARTIFACT_DIR, 'edge_main_phase2_mobile_flow.png');
  await mobilePage.screenshot({ path: capMobileFlow, fullPage: false });
  console.log('  ✓ 모바일 375px 플로우 캡처 완료:', capMobileFlow);

  console.log('[3/4] 3초간 화면 유지 후 종료 대기...');
  await page.waitForTimeout(3000);
  await browser.close();
  console.log('🎉 Phase 2 Edge 검수 완료!');
}

main().catch(err => {
  console.error('검수 에러:', err);
  process.exit(1);
});
