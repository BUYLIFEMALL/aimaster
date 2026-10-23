const { chromium } = require('../personality-suite/node_modules/playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('🌐 AIMaster 메인 사이트 (https://www.buylife.xyz) Edge 디자인 점검 시작');
  console.log('===============================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 100,
  });

  // 데스크톱 뷰포트
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await contextDesktop.newPage();

  console.log('[1/4] 데스크톱 (1440px) 메인 사이트 접속...');
  await page.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Hero & Header
  const cap1 = path.join(ARTIFACT_DIR, 'main_desktop_hero.png');
  await page.screenshot({ path: cap1, fullPage: false });
  console.log('  ✓ 데스크톱 Hero 캡처 완료:', cap1);

  // 2. 이용안내 & 통계 영역 스크롤
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);
  const cap2 = path.join(ARTIFACT_DIR, 'main_desktop_notice_stats.png');
  await page.screenshot({ path: cap2, fullPage: false });
  console.log('  ✓ 데스크톱 통계/이용안내 캡처 완료:', cap2);

  // 3. 프로그램 카탈로그 영역 스크롤
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(1000);
  const cap3 = path.join(ARTIFACT_DIR, 'main_desktop_programs.png');
  await page.screenshot({ path: cap3, fullPage: false });
  console.log('  ✓ 데스크톱 프로그램 카드 영역 캡처 완료:', cap3);

  // 4. 모바일 뷰포트 (375px)
  console.log('[2/4] 모바일 (375px) 메인 사이트 접속...');
  const contextMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await contextMobile.newPage();
  await mobilePage.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  const cap4 = path.join(ARTIFACT_DIR, 'main_mobile_hero.png');
  await mobilePage.screenshot({ path: cap4, fullPage: false });
  console.log('  ✓ 모바일 Hero 캡처 완료:', cap4);

  // 5. 모바일 햄버거 메뉴 열기
  const menuBtn = await mobilePage.$('button[aria-label="메뉴"], button:has(svg)');
  if (menuBtn) {
    await menuBtn.click();
    await mobilePage.waitForTimeout(500);
    const cap5 = path.join(ARTIFACT_DIR, 'main_mobile_menu.png');
    await mobilePage.screenshot({ path: cap5, fullPage: false });
    console.log('  ✓ 모바일 메뉴 캡처 완료:', cap5);
  }

  // 6. 전체 프로그램 목록 페이지 (/programs) 데스크톱 확인
  console.log('[3/4] 전체 프로그램 탐색 페이지 (/programs) 점검...');
  await page.goto('https://www.buylife.xyz/programs', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const cap6 = path.join(ARTIFACT_DIR, 'main_desktop_programs_directory.png');
  await page.screenshot({ path: cap6, fullPage: false });
  console.log('  ✓ /programs 디렉터리 페이지 캡처 완료:', cap6);

  console.log('[4/4] 브라우저 창 유지 후 종료 대기...');
  await page.waitForTimeout(3000);
  await browser.close();
  console.log('🎉 디자인 검수 브라우저 실행 및 캡처 완료.');
}

main().catch(err => {
  console.error('에러 발생:', err);
  process.exit(1);
});
