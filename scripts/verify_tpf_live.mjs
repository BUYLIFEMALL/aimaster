import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

async function verify() {
  console.log('🔍 Playwright 라이브 검수 시작...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. 로그인 페이지 검수
  await page.goto('https://trending-product-finder.buylife.xyz/login', { waitUntil: 'networkidle' });
  const title = await page.title();
  console.log(`✓ 로그인 페이지 타이틀: ${title}`);

  // 5단계 표준 규격 요소 확인
  const logoVisible = await page.locator('text=📈').isVisible();
  const badgeVisible = await page.locator('text=AIMASTER TRENDING PRODUCT FINDER').isVisible();
  const nameVisible = await page.locator('text=실시간 급상승 소싱 트렌드 발굴기').isVisible();
  const loginBtnVisible = await page.locator('text=로그인 시작 →').isVisible();
  const termsVisible = await page.locator('text=진행 시 이용약관 및 개인정보 처리방침에 동의합니다.').isVisible();

  console.log(`  - 1단계 로고(📈): ${logoVisible}`);
  console.log(`  - 2단계 영문 뱃지: ${badgeVisible}`);
  console.log(`  - 3단계 프로그램명: ${nameVisible}`);
  console.log(`  - 4단계 3D 엠보싱 버튼: ${loginBtnVisible}`);
  console.log(`  - 5단계 1행 약관: ${termsVisible}`);

  await page.screenshot({ path: 'trending-product-finder/docs/evidence/live_verified_login.png' });
  console.log('✓ 라이브 로그인 화면 캡처 저장: live_verified_login.png');

  await browser.close();
  console.log('🎉 라이브 세션 검수 완료!');
}

verify().catch(console.error);
