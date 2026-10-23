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
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = platform.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || platform.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();

const targetUrl = 'https://threads-easy-planner.buylife.xyz';
const artifactDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('일반 회원 테스트 계정(buylifemall@naver.com) 인증 세션 생성 중...');
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

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

  console.log('Microsoft Edge 포그라운드(화면 노출) 브라우저 시작 중...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  const browser = await chromium.launch({
    executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
    channel: fs.existsSync(edgePath) ? undefined : 'msedge',
    headless: false,
    slowMo: 300,
  });

  try {
    // 1. 데스크톱 (1440x900)
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    });
    await contextDesktop.addCookies(browserCookies);

    const pageDesktop = await contextDesktop.newPage();
    console.log('데스크톱 메인 접속 중:', targetUrl);
    await pageDesktop.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await pageDesktop.waitForTimeout(2500);

    const desktopCapture = path.join(artifactDir, 'edge_threads_planner_desktop_main_v145.png');
    await pageDesktop.screenshot({ path: desktopCapture, fullPage: false });
    console.log('데스크톱 메인 캡처 완료:', desktopCapture);

    // 가이드 페이지
    console.log('데스크톱 가이드 접속 중:', targetUrl + '/guide');
    await pageDesktop.goto(targetUrl + '/guide', { waitUntil: 'networkidle', timeout: 30000 });
    await pageDesktop.waitForTimeout(2000);

    const desktopGuideCapture = path.join(artifactDir, 'edge_threads_planner_desktop_guide_v145.png');
    await pageDesktop.screenshot({ path: desktopGuideCapture, fullPage: false });
    console.log('데스크톱 가이드 캡처 완료:', desktopGuideCapture);

    // 보관함 페이지
    console.log('데스크톱 보관함 접속 중:', targetUrl + '/saved');
    await pageDesktop.goto(targetUrl + '/saved', { waitUntil: 'networkidle', timeout: 30000 });
    await pageDesktop.waitForTimeout(2000);

    const desktopSavedCapture = path.join(artifactDir, 'edge_threads_planner_desktop_saved_v145.png');
    await pageDesktop.screenshot({ path: desktopSavedCapture, fullPage: false });
    console.log('데스크톱 보관함 캡처 완료:', desktopSavedCapture);

    await contextDesktop.close();

    // 2. 모바일 (375x812)
    const contextMobile = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    });
    await contextMobile.addCookies(browserCookies);

    const pageMobile = await contextMobile.newPage();
    console.log('모바일 메인 접속 중:', targetUrl);
    await pageMobile.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await pageMobile.waitForTimeout(2500);

    const mobileCapture = path.join(artifactDir, 'edge_threads_planner_mobile_main_v145.png');
    await pageMobile.screenshot({ path: mobileCapture, fullPage: false });
    console.log('모바일 메인 캡처 완료:', mobileCapture);

    // 모바일 가이드
    console.log('모바일 가이드 접속 중:', targetUrl + '/guide');
    await pageMobile.goto(targetUrl + '/guide', { waitUntil: 'networkidle', timeout: 30000 });
    await pageMobile.waitForTimeout(2000);

    const mobileGuideCapture = path.join(artifactDir, 'edge_threads_planner_mobile_guide_v145.png');
    await pageMobile.screenshot({ path: mobileGuideCapture, fullPage: false });
    console.log('모바일 가이드 캡처 완료:', mobileGuideCapture);

    await contextMobile.close();
    console.log('모든 Edge 포그라운드 실세션 검수 캡처 완료!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('검수 실행 중 오류:', err);
  process.exit(1);
});
