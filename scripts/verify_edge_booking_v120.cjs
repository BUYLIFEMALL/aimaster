const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { chromium } = ownRequire('playwright');
const { createClient } = ownRequire('@supabase/supabase-js');
const { createServerClient } = ownRequire('@supabase/ssr');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co';
const publicKey = platform.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || platform.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  console.log('[1/5] Supabase 인증 클라이언트 생성 (AIMaster 운영 DB: esgxyikcnnvmlhygjkth)...');
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('[2/5] 일반 회원 테스트 계정(buylifemall@naver.com) 매직링크 세션 획득...');
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'buylifemall@naver.com',
  });
  if (linkError) throw linkError;

  const { data: auth, error: otpError } = await authClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });
  if (otpError) throw otpError;

  const rawCookies = [];
  const ssr = createServerClient(url, publicKey, {
    cookies: { getAll: () => [], setAll: (v) => rawCookies.push(...v) },
  });
  await ssr.auth.setSession(auth.session);

  const browserCookies = rawCookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: '.buylife.xyz',
    path: '/',
    httpOnly: c.options?.httpOnly ?? false,
    secure: true,
    sameSite: 'Lax',
  }));

  console.log('[3/5] Microsoft Edge 전용 브라우저 포그라운드(headless: false) 실행...');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: false,
    args: ['--start-maximized'],
  });

  // --- 1. 데스크톱 뷰포트 검수 (1280x900) ---
  console.log('[4/5] 데스크톱 화면 검수 진행...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await desktopContext.addCookies(browserCookies);
  const page = await desktopContext.newPage();

  console.log('  -> /reservations 접속 중...');
  await page.goto('https://booking-reminder.buylife.xyz/reservations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1-1. 상단 히어로 배너 & 3대 KPI
  const capMain = path.join(ARTIFACT_DIR, 'edge_booking_desktop_main_v120.png');
  await page.screenshot({ path: capMain, fullPage: false });
  console.log(`  ✓ 캡처 1 완료: ${capMain}`);

  // 1-2. 3단계 파이프라인 & 신규 예약 등록 폼
  await page.evaluate(() => window.scrollBy(0, 320));
  await page.waitForTimeout(1000);
  const capKpi = path.join(ARTIFACT_DIR, 'edge_booking_desktop_kpi_v120.png');
  await page.screenshot({ path: capKpi, fullPage: false });
  console.log(`  ✓ 캡처 2 완료: ${capKpi}`);

  // 1-3. 리마인드 규칙 & 예약 목록 관리
  await page.evaluate(() => window.scrollBy(0, 450));
  await page.waitForTimeout(1000);
  const capRules = path.join(ARTIFACT_DIR, 'edge_booking_desktop_rules_v120.png');
  await page.screenshot({ path: capRules, fullPage: false });
  console.log(`  ✓ 캡처 3 완료: ${capRules}`);

  // 1-4. 가이드북 (/guide) 접속
  console.log('  -> /guide 접속 중...');
  await page.goto('https://booking-reminder.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const capGuide = path.join(ARTIFACT_DIR, 'edge_booking_desktop_guide_v120.png');
  await page.screenshot({ path: capGuide, fullPage: false });
  console.log(`  ✓ 캡처 4 완료: ${capGuide}`);

  // 1-5. 가이드북 매트릭스 표 & BYOK & FAQ
  await page.evaluate(() => window.scrollBy(0, 480));
  await page.waitForTimeout(1000);
  const capGuideMatrix = path.join(ARTIFACT_DIR, 'edge_booking_desktop_guide_matrix_v120.png');
  await page.screenshot({ path: capGuideMatrix, fullPage: false });
  console.log(`  ✓ 캡처 5 완료: ${capGuideMatrix}`);

  // --- 2. 모바일 반응형 검수 (390x844) ---
  console.log('[5/5] 모바일 반응형 검수 진행...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();

  console.log('  -> 모바일 /reservations 접속 중...');
  await mobilePage.goto('https://booking-reminder.buylife.xyz/reservations', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);

  const capMobileMain = path.join(ARTIFACT_DIR, 'edge_booking_mobile_main_v120.png');
  await mobilePage.screenshot({ path: capMobileMain, fullPage: false });
  console.log(`  ✓ 캡처 6 완료: ${capMobileMain}`);

  console.log('  -> 모바일 /guide 접속 중...');
  await mobilePage.goto('https://booking-reminder.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);

  const capMobileGuide = path.join(ARTIFACT_DIR, 'edge_booking_mobile_guide_v120.png');
  await mobilePage.screenshot({ path: capMobileGuide, fullPage: false });
  console.log(`  ✓ 캡처 7 완료: ${capMobileGuide}`);

  await mobileContext.close();

  // 메인 창을 데스크톱 /reservations로 복귀 후 10분간 화면 유지
  console.log('메인 데스크톱 창으로 복귀...');
  await page.goto('https://booking-reminder.buylife.xyz/reservations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('===============================================================');
  console.log('🎉 Edge 포그라운드 실세션 검수 완료! 모든 캡처가 성공적으로 저장되었습니다.');
  console.log('사용자 실시간 확인을 위해 Microsoft Edge 창을 10분간(600초) 포그라운드로 유지합니다...');
  console.log('===============================================================');

  // 10분(600초) 유지
  await page.waitForTimeout(600000);
  await browser.close();
  console.log('Edge 브라우저 세션 종료.');
}

main().catch((err) => {
  console.error('검수 중 에러 발생:', err);
  process.exit(1);
});
