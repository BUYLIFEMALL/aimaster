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

  console.log('일반 회원 테스트 계정(buylifemall@naver.com) 매직링크 생성...');
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
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

  // 1. 데스크톱 검수 (1440x900)
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await contextDesktop.addCookies(browserCookies);
  const pageDesktop = await contextDesktop.newPage();

  console.log('1. 데스크톱 대시보드(https://ai-task-planner.buylife.xyz/dashboard) 접속...');
  await pageDesktop.goto('https://ai-task-planner.buylife.xyz/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await pageDesktop.waitForTimeout(2000);

  const dashShot = path.join(artifactDir, 'edge_task_planner_dashboard_desktop_v107.png');
  await pageDesktop.screenshot({ path: dashShot, fullPage: false });
  console.log('데스크톱 대시보드 캡처 완료:', dashShot);

  console.log('2. 데스크톱 사용 매뉴얼(/guide) 이동...');
  await pageDesktop.goto('https://ai-task-planner.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await pageDesktop.waitForTimeout(1500);

  const guideShot = path.join(artifactDir, 'edge_task_planner_guide_desktop_v107.png');
  await pageDesktop.screenshot({ path: guideShot, fullPage: false });
  console.log('데스크톱 가이드 캡처 완료:', guideShot);

  // 가이드 FAQ 아코디언 열기
  const faqBtn = pageDesktop.locator('button:has-text("타이머를 켜두고")');
  if (await faqBtn.count() > 0) {
    await faqBtn.first().click();
    await pageDesktop.waitForTimeout(500);
    const faqShot = path.join(artifactDir, 'edge_task_planner_guide_faq_v107.png');
    await pageDesktop.screenshot({ path: faqShot, fullPage: false });
    console.log('가이드 FAQ 아코디언 캡처 완료:', faqShot);
  }

  // 2. 모바일 반응형 검수 (390x844)
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await contextMobile.addCookies(browserCookies);
  const pageMobile = await contextMobile.newPage();

  console.log('3. 모바일 대시보드 접속...');
  await pageMobile.goto('https://ai-task-planner.buylife.xyz/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await pageMobile.waitForTimeout(2000);

  const mobileDashShot = path.join(artifactDir, 'edge_task_planner_mobile_dash_v107.png');
  await pageMobile.screenshot({ path: mobileDashShot, fullPage: false });
  console.log('모바일 대시보드 캡처 완료:', mobileDashShot);

  // 모바일 햄버거 메뉴 열기
  const menuBtn = pageMobile.locator('button[aria-label="메뉴 열기"]');
  if (await menuBtn.count() > 0) {
    await menuBtn.first().click();
    await pageMobile.waitForTimeout(500);
    const mobileMenuShot = path.join(artifactDir, 'edge_task_planner_mobile_menu_v107.png');
    await pageMobile.screenshot({ path: mobileMenuShot, fullPage: false });
    console.log('모바일 햄버거 메뉴 캡처 완료:', mobileMenuShot);
  }

  await browser.close();
  console.log('모든 검수 완료!');
}

main().catch(err => {
  console.error('검수 실패:', err);
  process.exit(1);
});
