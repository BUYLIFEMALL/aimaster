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
  console.log('Microsoft Edge 포그라운드(headless: false) 실세션 검수 시작...');
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 일반 회원 테스트 계정(buylifemall@naver.com)으로 세션 생성
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

  console.log('- Microsoft Edge 포그라운드 브라우저 실행...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    args: ['--start-maximized', '--window-size=1440,900']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  await context.addCookies(browserCookies);

  const page = await context.newPage();

  // 1. 데스크톱 1440px 스튜디오 대시보드
  console.log('- 데스크톱 스튜디오 대시보드 (/studio) 검수 중...');
  await page.goto('https://banana-canvas.buylife.xyz/studio', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_banana_canvas_desktop_studio_v108.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_banana_canvas_desktop_studio_v108.png');

  // 2. 데스크톱 1440px 비주얼 가이드북 (/guide)
  console.log('- 데스크톱 비주얼 가이드북 (/guide) 검수 중...');
  await page.goto('https://banana-canvas.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_banana_canvas_desktop_guide_v108.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_banana_canvas_desktop_guide_v108.png');

  // 3. 데스크톱 1440px API 키 설정 (/settings)
  console.log('- 데스크톱 API 키 설정 (/settings) 검수 중...');
  await page.goto('https://banana-canvas.buylife.xyz/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_banana_canvas_desktop_settings_v108.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_banana_canvas_desktop_settings_v108.png');

  // 4. 데스크톱 1440px 결과 기록 (/history)
  console.log('- 데스크톱 결과 기록 (/history) 검수 중...');
  await page.goto('https://banana-canvas.buylife.xyz/history', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_banana_canvas_desktop_history_v108.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_banana_canvas_desktop_history_v108.png');

  // 5. 모바일 375px 스튜디오 대시보드
  console.log('- 모바일 375px 스튜디오 대시보드 검수 중...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('https://banana-canvas.buylife.xyz/studio', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_banana_canvas_mobile_studio_v108.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_banana_canvas_mobile_studio_v108.png');

  // 6. 모바일 375px 햄버거 메뉴 열림
  console.log('- 모바일 375px 햄버거 메뉴 토글 중...');
  const menuBtn = await page.$('.mobile-header button');
  if (menuBtn) {
    await menuBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'edge_banana_canvas_mobile_menu_v108.png'), fullPage: false });
    console.log('  -> 캡처 완료: edge_banana_canvas_mobile_menu_v108.png');
  }

  // 7. 모바일 375px 비주얼 가이드북
  console.log('- 모바일 375px 비주얼 가이드북 (/guide) 검수 중...');
  await page.goto('https://banana-canvas.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'edge_banana_canvas_mobile_guide_v108.png'), fullPage: false });
  console.log('  -> 캡처 완료: edge_banana_canvas_mobile_guide_v108.png');

  console.log('\n======================================================');
  console.log('✅ Microsoft Edge 포그라운드 실세션 검수 100% 완료!');
  console.log('주인님께서 확인하실 수 있도록 Edge 실제 창을 10분간 화면에 유지합니다.');
  console.log('======================================================\n');

  // 데스크톱 뷰로 복귀하여 스튜디오 홈 화면 유지
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://banana-canvas.buylife.xyz/studio', { waitUntil: 'networkidle' });

  // 10분(600초)간 화면 유지
  await page.waitForTimeout(600000);
  await browser.close();
}

main().catch(err => {
  console.error('검수 실행 오류:', err);
  process.exit(1);
});
