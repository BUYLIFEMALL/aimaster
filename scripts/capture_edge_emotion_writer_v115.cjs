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
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = platform.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || platform.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();

const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('Microsoft Edge 포그라운드(headless: false) 실세션 검수 시작...');
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 일반 회원 테스트 계정(buylifemall@naver.com)으로 세션 생성
  console.log('- 일반 회원 테스트 계정(buylifemall@naver.com) 매직링크 인증 토큰 발급...');
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'buylifemall@naver.com'
  });
  if (linkError) throw linkError;

  const { data: auth, error: otpError } = await authClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token
  });
  if (otpError) throw otpError;

  const rawCookies = [];
  const ssr = createServerClient(url, publicKey, {
    cookies: { getAll: () => [], setAll: v => rawCookies.push(...v) }
  });
  await ssr.auth.setSession(auth.session);

  const browserCookies = rawCookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: '.buylife.xyz',
    path: '/',
    httpOnly: c.options?.httpOnly ?? false,
    secure: true,
    sameSite: 'Lax'
  }));

  console.log('- Microsoft Edge 포그라운드(headless: false) 브라우저 기동...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    args: ['--start-maximized']
  });

  const baseUrl = 'https://emotion-writer.buylife.xyz';

  // 1. 데스크톱 검수 (1440x900)
  console.log('- [데스크톱 세션] 1440x900 브라우저 컨텍스트 생성...');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  await context.addCookies(browserCookies);
  const page = await context.newPage();

  // (1) 제작 스튜디오 홈 (/)
  console.log('- 데스크톱: 제작 스튜디오 홈(/) 이동 및 검수...');
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const shotStudio = path.join(artifactDir, 'edge_emotion_writer_desktop_studio_v115.png');
  await page.screenshot({ path: shotStudio, fullPage: true });
  console.log('  * 캡처 저장:', shotStudio);

  // (2) 비주얼 가이드북 (/guide)
  console.log('- 데스크톱: 비주얼 가이드북(/guide) 이동 및 검수...');
  await page.goto(`${baseUrl}/guide`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const shotGuide = path.join(artifactDir, 'edge_emotion_writer_desktop_guide_v115.png');
  await page.screenshot({ path: shotGuide, fullPage: true });
  console.log('  * 캡처 저장:', shotGuide);

  // (3) API 키 설정 (/settings)
  console.log('- 데스크톱: API 키 설정(/settings) 이동 및 검수...');
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const shotSettings = path.join(artifactDir, 'edge_emotion_writer_desktop_settings_v115.png');
  await page.screenshot({ path: shotSettings, fullPage: true });
  console.log('  * 캡처 저장:', shotSettings);

  // 2. 모바일 반응형 검수 (375x812 iPhone 13)
  console.log('- [모바일 세션] 375x812 뷰포트 컨텍스트 생성...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();

  // (4) 모바일 스튜디오 홈 헤더 및 카드
  console.log('- 모바일: 스튜디오 홈(/) 반응형 검수...');
  await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  const shotMobStudio = path.join(artifactDir, 'edge_emotion_writer_mobile_studio_v115.png');
  await mobilePage.screenshot({ path: shotMobStudio, fullPage: false });
  console.log('  * 캡처 저장:', shotMobStudio);

  // (5) 모바일 햄버거 메뉴 클릭 및 슬라이딩 드로어
  console.log('- 모바일: 햄버거 메뉴 클릭 및 슬라이딩 드로어 검수...');
  const hamburgerBtn = await mobilePage.$('button[aria-label="메뉴 열기"]');
  if (hamburgerBtn) {
    await hamburgerBtn.click();
    await mobilePage.waitForTimeout(1000);
    const shotMobDrawer = path.join(artifactDir, 'edge_emotion_writer_mobile_drawer_v115.png');
    await mobilePage.screenshot({ path: shotMobDrawer, fullPage: false });
    console.log('  * 캡처 저장:', shotMobDrawer);
  }

  // (6) 모바일 비주얼 가이드북 (/guide)
  console.log('- 모바일: 비주얼 가이드북(/guide) 반응형 검수...');
  await mobilePage.goto(`${baseUrl}/guide`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  const shotMobGuide = path.join(artifactDir, 'edge_emotion_writer_mobile_guide_v115.png');
  await mobilePage.screenshot({ path: shotMobGuide, fullPage: false });
  console.log('  * 캡처 저장:', shotMobGuide);

  console.log('✅ 모든 실세션 화면 검수 및 스크린샷 수집 완료!');
  console.log('주인님 확인을 위해 포그라운드 Edge 브라우저 창을 10분간 유지합니다...');
  await new Promise(r => setTimeout(r, 600000));
}

main().catch(err => {
  console.error('검수 실행 중 오류:', err);
  process.exit(1);
});
