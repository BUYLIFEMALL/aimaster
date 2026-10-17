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

    // 1-1. 메인 작업 화면
    console.log('  - 메인 접속: https://ai-influencer.buylife.xyz');
    await desktopPage.goto('https://ai-influencer.buylife.xyz', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(2000);
    const mainPath = path.join(artifactDir, 'edge_ai_influencer_main_desktop_v110.png');
    await desktopPage.screenshot({ path: mainPath, fullPage: true });
    console.log('    ✓ 메인 화면 캡처 저장:', mainPath);

    // 1-2. 매뉴얼 보기 (사이드바의 연동 & 사용 매뉴얼 버튼 클릭)
    console.log('  - 매뉴얼 열기...');
    const guideBtn = desktopPage.locator('button:has-text("연동 & 사용 매뉴얼"), a:has-text("연동 & 사용 매뉴얼")').first();
    if (await guideBtn.isVisible()) {
      await guideBtn.click();
      await desktopPage.waitForTimeout(1500);
      const guidePath = path.join(artifactDir, 'edge_ai_influencer_guide_desktop_v110.png');
      await desktopPage.screenshot({ path: guidePath, fullPage: true });
      console.log('    ✓ 매뉴얼 화면 캡처 저장:', guidePath);
    }

    await desktopContext.close();

    // 2) 모바일 검수 (390x844, iPhone 14)
    console.log('4. 모바일 검수 시작 (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    await mobileContext.addCookies(browserCookies);
    const mobilePage = await mobileContext.newPage();

    // 2-1. 모바일 메인
    console.log('  - 모바일 메인 접속...');
    await mobilePage.goto('https://ai-influencer.buylife.xyz', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);
    const mobMainPath = path.join(artifactDir, 'edge_ai_influencer_main_mobile_v110.png');
    await mobilePage.screenshot({ path: mobMainPath, fullPage: true });
    console.log('    ✓ 모바일 메인 캡처 저장:', mobMainPath);

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
