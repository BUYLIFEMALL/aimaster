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
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  await context.addCookies(browserCookies);

  const page = await context.newPage();
  console.log('https://yt-playlist.buylife.xyz 접속...');
  await page.goto('https://yt-playlist.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 사이드바 확인 캡처
  const sidebarShot = path.join(artifactDir, 'edge_yt_quick_help_sidebar.png');
  await page.screenshot({ path: sidebarShot, fullPage: false });
  console.log('사이드바 캡처 완료:', sidebarShot);

  // 퀵 도움말 버튼 클릭
  const helpBtn = page.locator('button:has-text("퀵 도움말")');
  if (await helpBtn.count() > 0) {
    console.log('💡 퀵 도움말 버튼 클릭...');
    await helpBtn.first().click();
    await page.waitForTimeout(1000);

    const modalShot = path.join(artifactDir, 'edge_yt_quick_help_modal.png');
    await page.screenshot({ path: modalShot, fullPage: false });
    console.log('퀵 도움말 팝업(모달) 캡처 완료:', modalShot);
  } else {
    console.log('⚠️ 퀵 도움말 버튼을 찾을 수 없습니다.');
  }

  await browser.close();
  console.log('검수 완료!');
}

main().catch(err => {
  console.error('검수 실패:', err);
  process.exit(1);
});
