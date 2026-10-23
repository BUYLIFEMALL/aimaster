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
  console.log('===============================================================');
  console.log('★ [72번 react-ui-showcase v1.05] Microsoft Edge 최전면 포그라운드 실세션 검수 시작');
  console.log('===============================================================');

  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

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

  console.log('- Microsoft Edge 브라우저를 화면 최전면(최대화)에 실행합니다...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    args: [
      '--start-maximized',
      '--window-position=0,0',
      '--no-default-browser-check',
      '--disable-infobars'
    ]
  });

  const context = await browser.newContext({
    viewport: null // 최대화 창 그대로 사용
  });
  await context.addCookies(browserCookies);

  const page = await context.newPage();
  await page.bringToFront();

  // 1. 데스크톱 컴포넌트 갤러리 메인 대시보드 (/?tab=gallery)
  console.log('- [1/6] 데스크톱 컴포넌트 갤러리 메인 대시보드 검수 중...');
  await page.goto('https://react-ui-showcase.buylife.xyz/?tab=gallery', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_react_ui_desktop_gallery_v105.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_react_ui_desktop_gallery_v105.png');

  // 2. 데스크톱 인터랙티브 데모실 (/?tab=demos)
  console.log('- [2/6] 데스크톱 인터랙티브 데모실 검수 중...');
  await page.goto('https://react-ui-showcase.buylife.xyz/?tab=demos', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_react_ui_desktop_demos_v105.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_react_ui_desktop_demos_v105.png');

  // 3. 데스크톱 비주얼 가이드북 (/guide)
  console.log('- [3/6] 데스크톱 비주얼 가이드북 (/guide) 검수 중...');
  await page.goto('https://react-ui-showcase.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_react_ui_desktop_guide_v105.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_react_ui_desktop_guide_v105.png');

  // 4. 데스크톱 API 키 설정 (/settings)
  console.log('- [4/6] 데스크톱 API 키 설정 (/settings) 검수 중...');
  await page.goto('https://react-ui-showcase.buylife.xyz/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_react_ui_desktop_settings_v105.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_react_ui_desktop_settings_v105.png');

  // 5. 모바일 375px 컴포넌트 갤러리
  console.log('- [5/6] 모바일 375px 컴포넌트 갤러리 검수 중...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('https://react-ui-showcase.buylife.xyz/?tab=gallery', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_react_ui_mobile_gallery_v105.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_react_ui_mobile_gallery_v105.png');

  // 6. 모바일 375px 비주얼 가이드북 (/guide)
  console.log('- [6/6] 모바일 375px 비주얼 가이드북 (/guide) 검수 중...');
  await page.goto('https://react-ui-showcase.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_react_ui_mobile_guide_v105.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_react_ui_mobile_guide_v105.png');

  console.log('\n===============================================================');
  console.log('✅ Microsoft Edge 전면 포그라운드 실세션 검수 100% 완료!');
  console.log('주인님께서 직접 화면을 보실 수 있도록 데스크톱 갤러리를 최전면에 10분간 유지합니다.');
  console.log('===============================================================\n');

  // 데스크톱 뷰로 복귀하여 갤러리 홈 화면 전면 유지
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://react-ui-showcase.buylife.xyz/?tab=gallery', { waitUntil: 'networkidle' });
  await page.bringToFront();

  // 10분(600초)간 화면 전면 유지
  await page.waitForTimeout(600000);
  await browser.close();
}

main().catch(err => {
  console.error('검수 실행 오류:', err);
  process.exit(1);
});
