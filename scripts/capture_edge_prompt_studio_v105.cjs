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

async function main() {
  console.log('Supabase 인증 클라이언트 초기화...');
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 일반 회원 테스트 계정: buylifemall@naver.com (최상단 지침 준수)
  console.log('일반 회원 테스트 계정 매직링크 생성...');
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

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  console.log('Microsoft Edge 브라우저 실행...');
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const artDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

  // 1. 데스크톱 검수 (1440x1200)
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  await contextDesktop.addCookies(browserCookies);
  const page = await contextDesktop.newPage();

  // (1) /guide 검수 - 상단 히어로 & 5단계 파이프라인
  console.log('1. 데스크톱 /guide 접속...');
  await page.goto('https://ai-prompt.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const capGuideTop = path.join(artDir, 'edge_prompt_studio_guide_desktop_v105.png');
  await page.screenshot({ path: capGuideTop, fullPage: false });
  console.log('캡처 완료:', capGuideTop);

  // (2) /guide 스크롤 - 5대 프레임워크 매트릭스 & 팁
  console.log('2. 가이드북 중간 스크롤 캡처...');
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1000);
  const capGuideMid = path.join(artDir, 'edge_prompt_studio_guide_pipeline_v105.png');
  await page.screenshot({ path: capGuideMid, fullPage: false });
  console.log('캡처 완료:', capGuideMid);

  // (3) /guide 하단 스크롤 - FAQ 아코디언 & 보안 배너
  console.log('3. 가이드북 하단 FAQ 스크롤 캡처...');
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);
  const capGuideFaq = path.join(artDir, 'edge_prompt_studio_guide_faq_v105.png');
  await page.screenshot({ path: capGuideFaq, fullPage: false });
  console.log('캡처 완료:', capGuideFaq);

  // (4) 모드 선택 스튜디오 메인 화면 (?tab=mode)
  console.log('4. 데스크톱 메인 스튜디오 ?tab=mode 접속...');
  await page.goto('https://ai-prompt.buylife.xyz/?tab=mode', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const capMode = path.join(artDir, 'edge_prompt_studio_mode_desktop_v105.png');
  await page.screenshot({ path: capMode, fullPage: false });
  console.log('캡처 완료:', capMode);

  // (5) 엔지니어링 빌더 화면 (?tab=build)
  console.log('5. 데스크톱 엔지니어링 빌더 ?tab=build 접속...');
  await page.goto('https://ai-prompt.buylife.xyz/?tab=build', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const capBuild = path.join(artDir, 'edge_prompt_studio_build_desktop_v105.png');
  await page.screenshot({ path: capBuild, fullPage: false });
  console.log('캡처 완료:', capBuild);

  // 2. 모바일 반응형 검수 (390x844)
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await contextMobile.addCookies(browserCookies);
  const pageMobile = await contextMobile.newPage();

  // (6) 모바일 홈 (390px)
  console.log('6. 모바일 390px 홈 접속...');
  await pageMobile.goto('https://ai-prompt.buylife.xyz/', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(2000);
  const capMobileHome = path.join(artDir, 'edge_prompt_studio_mobile_home_v105.png');
  await pageMobile.screenshot({ path: capMobileHome, fullPage: false });
  console.log('캡처 완료:', capMobileHome);

  // (7) 모바일 /guide (390px)
  console.log('7. 모바일 390px /guide 접속...');
  await pageMobile.goto('https://ai-prompt.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(2000);
  const capMobileGuide = path.join(artDir, 'edge_prompt_studio_mobile_guide_v105.png');
  await pageMobile.screenshot({ path: capMobileGuide, fullPage: false });
  console.log('캡처 완료:', capMobileGuide);

  await browser.close();
  console.log('Edge 브라우저 실세션 검수 전체 완료!');
}

main().catch(err => {
  console.error('검수 실행 중 에러 발생:', err);
  process.exit(1);
});
