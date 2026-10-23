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
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('[1/4] 일반 회원 테스트 계정(buylifemall@naver.com) 매직링크 생성...');
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

  const browserCookies = [];
  for (const c of rawCookies) {
    browserCookies.push({
      name: c.name,
      value: c.value,
      domain: '.buylife.xyz',
      path: '/',
      httpOnly: c.options?.httpOnly ?? false,
      secure: true,
      sameSite: 'Lax'
    });
    browserCookies.push({
      name: c.name,
      value: c.value,
      domain: 'shorts-viral-studio.buylife.xyz',
      path: '/',
      httpOnly: c.options?.httpOnly ?? false,
      secure: true,
      sameSite: 'Lax'
    });
    browserCookies.push({
      name: c.name,
      value: c.value,
      domain: 'shorts-viral-studio-nfn3leh59-buylife.vercel.app',
      path: '/',
      httpOnly: c.options?.httpOnly ?? false,
      secure: true,
      sameSite: 'Lax'
    });
  }

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  console.log('[2/4] Microsoft Edge 포그라운드(headless: false) 브라우저 실행...');
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: false,
    args: ['--start-maximized']
  });

  const baseUrl = 'https://shorts-viral-studio.buylife.xyz';

  try {
    // 1. 데스크톱 검수 (1440x900)
    console.log('[3/4] 데스크톱(1440px) 대시보드 및 가이드북 검수 시작...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    await desktopContext.addCookies(browserCookies);
    const desktopPage = await desktopContext.newPage();

    // 데스크톱 대시보드
    console.log(' -> 대시보드(/) 이동...');
    await desktopPage.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(2000);
    const dashPath = path.join(artifactDir, 'edge_shorts_viral_studio_desktop_dashboard_v111.png');
    await desktopPage.screenshot({ path: dashPath, fullPage: true });
    console.log(' ✓ 캡처 완료:', dashPath);

    // 데스크톱 가이드북
    console.log(' -> 가이드북(/guide) 이동...');
    await desktopPage.goto(`${baseUrl}/guide`, { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(2000);
    const guidePath = path.join(artifactDir, 'edge_shorts_viral_studio_desktop_guide_v111.png');
    await desktopPage.screenshot({ path: guidePath, fullPage: true });
    console.log(' ✓ 캡처 완료:', guidePath);

    await desktopContext.close();

    // 2. 모바일 검수 (375x812)
    console.log('[4/4] 모바일(375px) 반응형 검수 시작...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    await mobileContext.addCookies(browserCookies);
    const mobilePage = await mobileContext.newPage();

    // 모바일 대시보드
    console.log(' -> 모바일 대시보드(/) 이동...');
    await mobilePage.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(2000);
    const mobDashPath = path.join(artifactDir, 'edge_shorts_viral_studio_mobile_dashboard_v111.png');
    await mobilePage.screenshot({ path: mobDashPath, fullPage: true });
    console.log(' ✓ 캡처 완료:', mobDashPath);

    // 모바일 햄버거 메뉴 열기
    console.log(' -> 모바일 메뉴 버튼 클릭...');
    const menuBtn = mobilePage.locator('button[aria-label="메뉴 열기"], button[aria-label="메뉴 닫기"]').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await mobilePage.waitForTimeout(1000);
    }
    const mobMenuPath = path.join(artifactDir, 'edge_shorts_viral_studio_mobile_menu_v111.png');
    await mobilePage.screenshot({ path: mobMenuPath, fullPage: false });
    console.log(' ✓ 캡처 완료:', mobMenuPath);

    // 모바일 가이드북
    console.log(' -> 모바일 가이드북(/guide) 이동...');
    await mobilePage.goto(`${baseUrl}/guide`, { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(2000);
    const mobGuidePath = path.join(artifactDir, 'edge_shorts_viral_studio_mobile_guide_v111.png');
    await mobilePage.screenshot({ path: mobGuidePath, fullPage: true });
    console.log(' ✓ 캡처 완료:', mobGuidePath);

    await mobileContext.close();
    console.log('🎉 모든 Edge 포그라운드 실세션 검수 및 캡처가 성공적으로 완결되었습니다!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('검수 실행 중 오류 발생:', err);
  process.exit(1);
});
