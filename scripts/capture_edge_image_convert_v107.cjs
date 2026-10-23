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

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  // 1. 데스크톱 검수 (1440x900) - 포그라운드 (headless: false)
  console.log('1. 데스크톱 1440px Microsoft Edge 포그라운드 창 실행...');
  const desktopBrowser = await chromium.launch({ executablePath: edgePath, headless: false });
  const desktopContext = await desktopBrowser.newContext({ viewport: { width: 1440, height: 900 } });
  await desktopContext.addCookies(browserCookies);
  const desktopPage = await desktopContext.newPage();

  // 변환 스튜디오 (/convert)
  console.log('- 데스크톱 /convert 접속 중...');
  await desktopPage.goto('https://image-convert-studio.buylife.xyz/convert', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2500);
  const deskConvertPath = path.join(artifactDir, 'edge_image_convert_desktop_convert_v107.png');
  await desktopPage.screenshot({ path: deskConvertPath, fullPage: false });
  console.log(`✓ 데스크톱 변환 스튜디오 캡처 완료: ${deskConvertPath}`);

  // 콜라주 스튜디오 (/collage)
  console.log('- 데스크톱 /collage 접속 중...');
  await desktopPage.goto('https://image-convert-studio.buylife.xyz/collage', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  const deskCollagePath = path.join(artifactDir, 'edge_image_convert_desktop_collage_v107.png');
  await desktopPage.screenshot({ path: deskCollagePath, fullPage: false });
  console.log(`✓ 데스크톱 콜라주 스튜디오 캡처 완료: ${deskCollagePath}`);

  // 비주얼 가이드북 (/guide)
  console.log('- 데스크톱 /guide 접속 중...');
  await desktopPage.goto('https://image-convert-studio.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  const deskGuidePath = path.join(artifactDir, 'edge_image_convert_desktop_guide_v107.png');
  await desktopPage.screenshot({ path: deskGuidePath, fullPage: false });
  console.log(`✓ 데스크톱 비주얼 가이드북 캡처 완료: ${deskGuidePath}`);

  // 2. 모바일 검수 (375x812) - 포그라운드 (headless: false)
  console.log('2. 모바일 375px Microsoft Edge 포그라운드 창 실행...');
  const mobileBrowser = await chromium.launch({ executablePath: edgePath, headless: false });
  const mobileContext = await mobileBrowser.newContext({ viewport: { width: 375, height: 812 } });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();

  // 모바일 변환 화면 (/convert)
  console.log('- 모바일 /convert 접속 중...');
  await mobilePage.goto('https://image-convert-studio.buylife.xyz/convert', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  const mobConvertPath = path.join(artifactDir, 'edge_image_convert_mobile_convert_v107.png');
  await mobilePage.screenshot({ path: mobConvertPath, fullPage: false });
  console.log(`✓ 모바일 변환 스튜디오 캡처 완료: ${mobConvertPath}`);

  // 모바일 햄버거 메뉴 클릭 -> 드로어 열림
  console.log('- 모바일 햄버거 메뉴 클릭 및 슬라이딩 드로어 검수...');
  const hamburgerBtn = await mobilePage.$('button[aria-label="메뉴 열기"]');
  if (hamburgerBtn) {
    await hamburgerBtn.click();
    await mobilePage.waitForTimeout(600);
    const mobDrawerPath = path.join(artifactDir, 'edge_image_convert_mobile_drawer_v107.png');
    await mobilePage.screenshot({ path: mobDrawerPath, fullPage: false });
    console.log(`✓ 모바일 슬라이딩 드로어 캡처 완료: ${mobDrawerPath}`);
  }

  // 모바일 가이드북 (/guide)
  console.log('- 모바일 /guide 접속 중...');
  await mobilePage.goto('https://image-convert-studio.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  const mobGuidePath = path.join(artifactDir, 'edge_image_convert_mobile_guide_v107.png');
  await mobilePage.screenshot({ path: mobGuidePath, fullPage: false });
  console.log(`✓ 모바일 비주얼 가이드북 캡처 완료: ${mobGuidePath}`);

  console.log('🎉 Microsoft Edge 포그라운드 실세션 검수 완료! 실제 창은 닫지 않고 유지합니다.');
}

main().catch(err => {
  console.error('검수 중 에러 발생:', err);
  process.exit(1);
});
