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

  console.log('[1/4] 일반 회원 테스트 계정 매직링크 생성...');
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
  console.log('[2/4] Microsoft Edge 포그라운드(headless: false) 실행...');
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: false,
    args: ['--window-size=1460,960']
  });

  try {
    // 1. 데스크톱 대시보드 검수 (1440x900)
    console.log('[3/4] 데스크톱 대시보드 검수 (1440x900)...');
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await desktopContext.addCookies(browserCookies);
    const page = await desktopContext.newPage();

    await page.goto('https://threads-affiliate-poster.buylife.xyz/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const desktopDashPath = path.join(artifactDir, 'edge_threads_affiliate_desktop_dashboard_v161.png');
    await page.screenshot({ path: desktopDashPath, fullPage: true });
    console.log('  -> 데스크톱 대시보드 캡처 저장:', desktopDashPath);

    // 2. 데스크톱 연동 & 사용 매뉴얼 검수 (/guide)
    console.log('  -> 데스크톱 사용 매뉴얼 이동...');
    await page.goto('https://threads-affiliate-poster.buylife.xyz/guide', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const desktopGuidePath = path.join(artifactDir, 'edge_threads_affiliate_desktop_guide_v161.png');
    await page.screenshot({ path: desktopGuidePath, fullPage: true });
    console.log('  -> 데스크톱 사용 매뉴얼 캡처 저장:', desktopGuidePath);
    await desktopContext.close();

    // 3. 모바일 대시보드 & 매뉴얼 검수 (375x812)
    console.log('[4/4] 모바일 반응형 검수 (375x812)...');
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await mobileContext.addCookies(browserCookies);
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto('https://threads-affiliate-poster.buylife.xyz/dashboard', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const mobileDashPath = path.join(artifactDir, 'edge_threads_affiliate_mobile_dashboard_v161.png');
    await mobilePage.screenshot({ path: mobileDashPath, fullPage: true });
    console.log('  -> 모바일 대시보드 캡처 저장:', mobileDashPath);

    // 모바일 햄버거 메뉴 열기 검수
    const menuBtn = await mobilePage.$('button[aria-label="메뉴 열기"]');
    if (menuBtn) {
      await menuBtn.click();
      await mobilePage.waitForTimeout(800);
      const mobileMenuPath = path.join(artifactDir, 'edge_threads_affiliate_mobile_menu_v161.png');
      await mobilePage.screenshot({ path: mobileMenuPath });
      console.log('  -> 모바일 햄버거 메뉴 열림 캡처 저장:', mobileMenuPath);
    }

    // 모바일 사용 매뉴얼 (/guide)
    await mobilePage.goto('https://threads-affiliate-poster.buylife.xyz/guide', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const mobileGuidePath = path.join(artifactDir, 'edge_threads_affiliate_mobile_guide_v161.png');
    await mobilePage.screenshot({ path: mobileGuidePath, fullPage: true });
    console.log('  -> 모바일 사용 매뉴얼 캡처 저장:', mobileGuidePath);

    await mobileContext.close();

    console.log('✅ 모든 Microsoft Edge 포그라운드 실세션 검수 완료!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('검수 실패:', err);
  process.exit(1);
});
