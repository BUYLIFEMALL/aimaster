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
const BASE_URL = 'https://ai-auto-blog.buylife.xyz';

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
    slowMo: 80,
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await desktopContext.addCookies(browserCookies);
  const page = await desktopContext.newPage();

  console.log('[4/5] 데스크톱 화면 검수 진행...');
  // 1. 메인 콘솔 접속
  console.log(`  -> ${BASE_URL}/ 접속 중...`);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);

  const cap1 = path.join(ARTIFACT_DIR, 'edge_blog_desktop_main_v175.png');
  await page.screenshot({ path: cap1, fullPage: false });
  console.log(`  ✓ 캡처 1 완료: ${cap1}`);

  // 2. KPI 카드 및 파이프라인 가이드 바
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(1000);
  const cap2 = path.join(ARTIFACT_DIR, 'edge_blog_desktop_kpi_v175.png');
  await page.screenshot({ path: cap2, fullPage: false });
  console.log(`  ✓ 캡처 2 완료: ${cap2}`);

  // 3. AI 글쓰기 폼 접속 (/write/ai-form)
  console.log(`  -> ${BASE_URL}/write/ai-form 접속 중...`);
  await page.goto(`${BASE_URL}/write/ai-form`, { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);
  const cap3 = path.join(ARTIFACT_DIR, 'edge_blog_desktop_write_v175.png');
  await page.screenshot({ path: cap3, fullPage: false });
  console.log(`  ✓ 캡처 3 완료: ${cap3}`);

  // 4. 독립 비주얼 가이드북 (/guide) 접속
  console.log(`  -> ${BASE_URL}/guide 접속 중...`);
  await page.goto(`${BASE_URL}/guide`, { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);
  const cap4 = path.join(ARTIFACT_DIR, 'edge_blog_desktop_guide_v175.png');
  await page.screenshot({ path: cap4, fullPage: false });
  console.log(`  ✓ 캡처 4 완료: ${cap4}`);

  // 5. 가이드북 모델 매트릭스 & SEO 수칙 & FAQ
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);
  const cap5 = path.join(ARTIFACT_DIR, 'edge_blog_desktop_guide_matrix_v175.png');
  await page.screenshot({ path: cap5, fullPage: false });
  console.log(`  ✓ 캡처 5 완료: ${cap5}`);

  console.log('[5/5] 모바일 반응형 검수 진행...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();

  // 6. 모바일 메인
  console.log(`  -> 모바일 ${BASE_URL}/ 접속 중...`);
  await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 35000 });
  await mobilePage.waitForTimeout(2000);
  const cap6 = path.join(ARTIFACT_DIR, 'edge_blog_mobile_main_v175.png');
  await mobilePage.screenshot({ path: cap6, fullPage: false });
  console.log(`  ✓ 캡처 6 완료: ${cap6}`);

  // 7. 모바일 가이드
  console.log(`  -> 모바일 ${BASE_URL}/guide 접속 중...`);
  await mobilePage.goto(`${BASE_URL}/guide`, { waitUntil: 'networkidle', timeout: 35000 });
  await mobilePage.waitForTimeout(2000);
  const cap7 = path.join(ARTIFACT_DIR, 'edge_blog_mobile_guide_v175.png');
  await mobilePage.screenshot({ path: cap7, fullPage: false });
  console.log(`  ✓ 캡처 7 완료: ${cap7}`);

  console.log('메인 데스크톱 창으로 복귀...');
  await page.bringToFront();

  console.log('===============================================================');
  console.log('🎉 Edge 포그라운드 실세션 검수 완료! 모든 캡처가 성공적으로 저장되었습니다.');
  console.log('사용자 실시간 확인을 위해 Microsoft Edge 창을 10분간(600초) 포그라운드로 유지합니다...');
  console.log('===============================================================');

  await page.waitForTimeout(600000);

  await browser.close();
  console.log('Edge 브라우저 세션 종료.');
}

main().catch((err) => {
  console.error('검수 실행 중 에러 발생:', err);
  process.exit(1);
});
