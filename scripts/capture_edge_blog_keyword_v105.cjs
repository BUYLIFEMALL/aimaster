const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-keyword/package.json'));
const { chromium } = ownRequire('playwright');
const { createClient } = ownRequire('@supabase/supabase-js');
const { createServerClient } = ownRequire('@supabase/ssr');

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
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
  console.log('1. Supabase 테스트 계정(buylifemall@naver.com) 인증 세션 발급...');
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

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  console.log('2. Microsoft Edge 포그라운드(headless: false) 실행...');
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: false,
    args: ['--start-maximized']
  });

  try {
    // 1) 데스크톱 검수 (1440x900)
    console.log('3. 데스크톱 검수 시작 (1440x900)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    await desktopContext.addCookies(browserCookies);
    const desktopPage = await desktopContext.newPage();

    // 1-1. 대시보드
    console.log('  - 대시보드 접속: https://blog-keyword.buylife.xyz/dashboard');
    await desktopPage.goto('https://blog-keyword.buylife.xyz/dashboard', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(2000);
    const dashPath = path.join(artifactDir, 'edge_blog_keyword_dashboard_desktop_v105.png');
    await desktopPage.screenshot({ path: dashPath, fullPage: true });
    console.log('    ✓ 대시보드 캡처 저장:', dashPath);

    // 1-2. 가이드 매뉴얼 (/guide)
    console.log('  - 가이드 접속: https://blog-keyword.buylife.xyz/guide');
    await desktopPage.goto('https://blog-keyword.buylife.xyz/guide', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(2000);
    const guidePath = path.join(artifactDir, 'edge_blog_keyword_guide_desktop_v105.png');
    await desktopPage.screenshot({ path: guidePath, fullPage: true });
    console.log('    ✓ 가이드 캡처 저장:', guidePath);

    // 1-3. 기록 보관함 (/history)
    console.log('  - 기록 접속: https://blog-keyword.buylife.xyz/history');
    await desktopPage.goto('https://blog-keyword.buylife.xyz/history', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);
    const histPath = path.join(artifactDir, 'edge_blog_keyword_history_desktop_v105.png');
    await desktopPage.screenshot({ path: histPath, fullPage: true });
    console.log('    ✓ 기록 캡처 저장:', histPath);

    // 1-4. 설정 (/settings)
    console.log('  - 설정 접속: https://blog-keyword.buylife.xyz/settings');
    await desktopPage.goto('https://blog-keyword.buylife.xyz/settings', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);
    const setPath = path.join(artifactDir, 'edge_blog_keyword_settings_desktop_v105.png');
    await desktopPage.screenshot({ path: setPath, fullPage: true });
    console.log('    ✓ 설정 캡처 저장:', setPath);

    await desktopContext.close();

    // 2) 모바일 검수 (375x812, iPhone)
    console.log('4. 모바일 검수 시작 (375x812)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    await mobileContext.addCookies(browserCookies);
    const mobilePage = await mobileContext.newPage();

    // 2-1. 모바일 대시보드
    console.log('  - 모바일 대시보드 접속...');
    await mobilePage.goto('https://blog-keyword.buylife.xyz/dashboard', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);
    const mobDashPath = path.join(artifactDir, 'edge_blog_keyword_dashboard_mobile_v105.png');
    await mobilePage.screenshot({ path: mobDashPath, fullPage: true });
    console.log('    ✓ 모바일 대시보드 캡처 저장:', mobDashPath);

    // 2-2. 모바일 가이드
    console.log('  - 모바일 가이드 접속...');
    await mobilePage.goto('https://blog-keyword.buylife.xyz/guide', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);
    const mobGuidePath = path.join(artifactDir, 'edge_blog_keyword_guide_mobile_v105.png');
    await mobilePage.screenshot({ path: mobGuidePath, fullPage: true });
    console.log('    ✓ 모바일 가이드 캡처 저장:', mobGuidePath);

    await mobileContext.close();
    console.log('5. Edge 포그라운드 검수 완료!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('검수 중 오류 발생:', err);
  process.exit(1);
});
