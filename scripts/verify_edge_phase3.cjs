const { chromium } = require('../personality-suite/node_modules/playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('🌐 Phase 3 비주얼 고도화 실세션 검수 시작 (Microsoft Edge)');
  console.log('===============================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 100,
  });

  // 1. 데스크톱 검수
  console.log('[1/5] 데스크톱 (1440x900) 메인 접속...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await desktopContext.newPage();
  await page.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 1-1. Hero 인터랙티브 쇼케이스 & 비로그인 KPI 캡처
  const capHero = path.join(ARTIFACT_DIR, 'edge_main_phase3_hero_showcase.png');
  await page.screenshot({ path: capHero, fullPage: false });
  console.log('  ✓ Hero 쇼케이스 및 스마트 KPI 캡처 완료:', capHero);

  // 1-2. 쇼케이스 '네온 마케팅 콘솔' 탭 클릭
  console.log('[2/5] 쇼케이스 탭 전환 (네온 콘솔)...');
  const neonTab = page.locator('button:has-text("Neon Console")').first();
  if (await neonTab.count() > 0) {
    await neonTab.click();
    await page.waitForTimeout(600);
    const capNeon = path.join(ARTIFACT_DIR, 'edge_main_phase3_showcase_neon.png');
    await page.screenshot({ path: capNeon, fullPage: false });
    console.log('  ✓ 네온 콘솔 탭 전환 캡처 완료:', capNeon);
  }

  // 1-3. 스크롤 내려 프로그램 카드 디자인 템플릿 뱃지 및 호버 확인
  console.log('[3/5] 프로그램 카드 템플릿 뱃지 영역으로 스크롤...');
  await page.evaluate(() => window.scrollBy(0, 850));
  await page.waitForTimeout(1000);

  // 첫 번째 카드 호버
  const firstCard = page.locator('article, div[class*="rounded"]').filter({ hasText: '자세히 보기' }).first();
  if (await firstCard.count() > 0) {
    await firstCard.hover();
    await page.waitForTimeout(500);
  }

  const capCards = path.join(ARTIFACT_DIR, 'edge_main_phase3_template_badges.png');
  await page.screenshot({ path: capCards, fullPage: false });
  console.log('  ✓ 프로그램 카드 템플릿 뱃지 및 호버 캡처 완료:', capCards);

  await desktopContext.close();

  // 2. 모바일 (375x812) 검수
  console.log('[4/5] 모바일 (375x812) 반응형 접속...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);

  const capMobile = path.join(ARTIFACT_DIR, 'edge_main_phase3_mobile.png');
  await mobilePage.screenshot({ path: capMobile, fullPage: false });
  console.log('  ✓ 모바일 Phase 3 쇼케이스 캡처 완료:', capMobile);

  await mobileContext.close();

  console.log('[5/5] 브라우저 종료 및 완료!');
  await browser.close();
  console.log('🎉 Phase 3 비주얼 고도화 검수 성공!');
}

main().catch(err => {
  console.error('검수 에러:', err);
  process.exit(1);
});
