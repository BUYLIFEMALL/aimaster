const { chromium } = require('../personality-suite/node_modules/playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('🌐 AIMaster 메인 사이트 Phase 1 배포 후 Edge 실세션 검수 시작');
  console.log('===============================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 100,
  });

  // 1. 데스크톱 뷰포트 (1440px)
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await contextDesktop.newPage();

  console.log('[1/4] 데스크톱 (1440px) 메인 사이트 접속...');
  await page.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1-1. Hero CTA 영역 캡처
  const capHero = path.join(ARTIFACT_DIR, 'edge_main_phase1_desktop_hero.png');
  await page.screenshot({ path: capHero, fullPage: false });
  console.log('  ✓ 데스크톱 Hero CTA 캡처 완료:', capHero);

  // 1-2. 이달의 무료 프로그램 카드 영역으로 스크롤하여 캡처
  await page.evaluate(() => {
    const freeHeading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('무료 프로그램'));
    if (freeHeading) {
      freeHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      window.scrollBy(0, 1400);
    }
  });
  await page.waitForTimeout(1000);
  const capFree = path.join(ARTIFACT_DIR, 'edge_main_phase1_desktop_free_card.png');
  await page.screenshot({ path: capFree, fullPage: false });
  console.log('  ✓ 데스크톱 무료 프로그램 카드(무료 이용하기 버튼) 캡처 완료:', capFree);

  // 2. 모바일 뷰포트 (375px)
  console.log('[2/4] 모바일 (375px) 메인 사이트 접속...');
  const contextMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await contextMobile.newPage();
  await mobilePage.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  // 2-1. 모바일 Hero 캡처 (상단 와이드 + 2열 그리드)
  const capMobHero = path.join(ARTIFACT_DIR, 'edge_main_phase1_mobile_hero.png');
  await mobilePage.screenshot({ path: capMobHero, fullPage: false });
  console.log('  ✓ 모바일 Hero 2열 버튼 캡처 완료:', capMobHero);

  // 2-2. 모바일 햄버거 메뉴 열기 및 전체 오버레이 캡처
  console.log('[3/4] 모바일 햄버거 메뉴 오픈 및 백드롭 오버레이 검증...');
  const menuBtn = await mobilePage.$('header button');
  if (menuBtn) {
    await menuBtn.click();
    await mobilePage.waitForTimeout(800);
    const capMobMenu = path.join(ARTIFACT_DIR, 'edge_main_phase1_mobile_menu.png');
    await mobilePage.screenshot({ path: capMobMenu, fullPage: false });
    console.log('  ✓ 모바일 메뉴 오버레이(뒷배경 차단) 캡처 완료:', capMobMenu);
  }

  console.log('[4/4] 3초간 화면 유지 후 종료 대기...');
  await page.waitForTimeout(3000);
  await browser.close();
  console.log('🎉 Phase 1 Edge 검수 완료!');
}

main().catch(err => {
  console.error('검수 에러:', err);
  process.exit(1);
});
