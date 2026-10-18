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
  console.log('★ [23번 style-dna-analyzer v1.22] Microsoft Edge 최전면 포그라운드 실세션 검수 시작');
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

  // 1. 데스크톱 보관함 대시보드
  console.log('- [1/6] 데스크톱 보관함 대시보드 (/dashboard) 검수 중...');
  await page.goto('https://style-dna-analyzer.buylife.xyz/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  const cap1 = path.join(artifactDir, 'edge_style_dna_desktop_dashboard_v122.png');
  await page.screenshot({ path: cap1, fullPage: false });
  console.log('  -> 캡처 완료:', path.basename(cap1));

  // 2. 비주얼 에디토리얼 가이드북 (/guide)
  console.log('- [2/6] 비주얼 에디토리얼 가이드북 (/guide) 검수 중...');
  await page.goto('https://style-dna-analyzer.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(1500);

  // 첫 번째 FAQ 아코디언 토글 클릭
  const faqBtn = page.locator('button:has-text("어떤 이미지를 넣어야 가장 정확한 스타일 DNA가 추출되나요?")');
  if (await faqBtn.count() > 0) {
    await faqBtn.first().click();
    await page.waitForTimeout(500);
  }
  const cap2 = path.join(artifactDir, 'edge_style_dna_desktop_guide_v122.png');
  await page.screenshot({ path: cap2, fullPage: false });
  console.log('  -> 캡처 완료:', path.basename(cap2));

  // 3. 1단계 이미지 DNA 분석 스튜디오 (/analyze)
  console.log('- [3/6] 1단계 이미지 DNA 분석 스튜디오 (/analyze) 검수 중...');
  await page.goto('https://style-dna-analyzer.buylife.xyz/analyze', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  const cap3 = path.join(artifactDir, 'edge_style_dna_desktop_analyze_v122.png');
  await page.screenshot({ path: cap3, fullPage: false });
  console.log('  -> 캡처 완료:', path.basename(cap3));

  // 4. 2단계 프롬프트 보정 스튜디오 (/refine)
  console.log('- [4/6] 2단계 프롬프트 보정 스튜디오 (/refine) 검수 중...');
  await page.goto('https://style-dna-analyzer.buylife.xyz/refine', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(1500);
  const cap4 = path.join(artifactDir, 'edge_style_dna_desktop_refine_v122.png');
  await page.screenshot({ path: cap4, fullPage: false });
  console.log('  -> 캡처 완료:', path.basename(cap4));

  // 5. API 키 등록·플랫폼 연동 (/settings)
  console.log('- [5/6] API 키 등록·플랫폼 연동 (/settings) 검수 중...');
  await page.goto('https://style-dna-analyzer.buylife.xyz/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(1500);
  const cap5 = path.join(artifactDir, 'edge_style_dna_desktop_settings_v122.png');
  await page.screenshot({ path: cap5, fullPage: false });
  console.log('  -> 캡처 완료:', path.basename(cap5));

  // 6. 모바일 375px 반응형 뷰포트 검수 (/guide)
  console.log('- [6/6] 모바일 375px 반응형 뷰포트 검수 중...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('https://style-dna-analyzer.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);
  const cap6 = path.join(artifactDir, 'edge_style_dna_mobile_guide_v122.png');
  await mobilePage.screenshot({ path: cap6, fullPage: false });
  console.log('  -> 캡처 완료:', path.basename(cap6));
  await mobileContext.close();

  console.log('===============================================================');
  console.log('✅ Microsoft Edge 전면 포그라운드 실세션 검수 100% 완료!');
  console.log('주인님께서 직접 화면을 보실 수 있도록 데스크톱 가이드 화면을 최전면에 10분간 유지합니다.');
  console.log('===============================================================');

  // 데스크톱 페이지를 가이드북으로 최전면 활성화 및 10분 대기
  await page.goto('https://style-dna-analyzer.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await page.bringToFront();
  await page.waitForTimeout(600000); // 10분 유지

  await browser.close();
}

main().catch((err) => {
  console.error('검수 실행 중 에러 발생:', err);
  process.exit(1);
});
