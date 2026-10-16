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
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 일반 회원 테스트 계정: buylifemall@naver.com
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
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });

  const artDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

  try {
    // 1. 데스크톱 가이드북 검수 (1440x1200)
    const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await contextDesktop.addCookies(browserCookies);
    const pageDesktop = await contextDesktop.newPage();

    console.log('Navigating to https://playlist-maker.buylife.xyz/guide ...');
    await pageDesktop.goto('https://playlist-maker.buylife.xyz/guide', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(2000);
    console.log('Desktop URL:', pageDesktop.url());

    const capDesktop1 = path.join(artDir, 'edge_playlist_guide_desktop_v108.png');
    await pageDesktop.screenshot({ path: capDesktop1, fullPage: false });
    console.log('Saved Desktop Top:', capDesktop1);

    // 스크롤하여 5단계 파이프라인 및 API 키 섹션 캡처
    await pageDesktop.evaluate(() => window.scrollBy(0, 650));
    await pageDesktop.waitForTimeout(1000);
    const capDesktop2 = path.join(artDir, 'edge_playlist_guide_pipeline_v108.png');
    await pageDesktop.screenshot({ path: capDesktop2, fullPage: false });
    console.log('Saved Desktop Pipeline:', capDesktop2);

    // 스크롤하여 23종 장르 맵 & FAQ 캡처
    await pageDesktop.evaluate(() => window.scrollBy(0, 950));
    await pageDesktop.waitForTimeout(1000);
    const capDesktop3 = path.join(artDir, 'edge_playlist_guide_genres_v108.png');
    await pageDesktop.screenshot({ path: capDesktop3, fullPage: false });
    console.log('Saved Desktop Genres:', capDesktop3);

    // 2. 메인 스튜디오 데스크톱 캡처 (사이드바 📖 연동 & 사용 매뉴얼 메뉴 확인)
    console.log('Navigating to https://playlist-maker.buylife.xyz/studio ...');
    await pageDesktop.goto('https://playlist-maker.buylife.xyz/studio', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(2000);
    const capDesktopStudio = path.join(artDir, 'edge_playlist_studio_desktop_v108.png');
    await pageDesktop.screenshot({ path: capDesktopStudio, fullPage: false });
    console.log('Saved Studio Desktop:', capDesktopStudio);

    // 3. 모바일 반응형 검수 (380x844)
    const contextMobile = await browser.newContext({ viewport: { width: 380, height: 844 }, isMobile: true, hasTouch: true });
    await contextMobile.addCookies(browserCookies);
    const pageMobile = await contextMobile.newPage();

    console.log('Navigating to mobile https://playlist-maker.buylife.xyz/guide ...');
    await pageMobile.goto('https://playlist-maker.buylife.xyz/guide', { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(2000);
    const capMobile1 = path.join(artDir, 'edge_playlist_guide_mobile_v108.png');
    await pageMobile.screenshot({ path: capMobile1, fullPage: false });
    console.log('Saved Mobile Top:', capMobile1);

    console.log('All Edge inspection screenshots for playlist-channel-studio successfully captured!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Edge inspection failed:', err);
  process.exit(1);
});
