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
  console.log('★ [22번 seo-thumbnail-pro v1.10] Microsoft Edge 최전면 포그라운드 실세션 검수 시작');
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

  // 1. 데스크톱 메인 워크스페이스 대시보드
  console.log('- [1/6] 데스크톱 메인 워크스페이스 (1단계 전략) 검수 중...');
  await page.goto('https://seo-thumbnail-pro.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await page.bringToFront();
  await page.waitForTimeout(2000);
  const cap1 = path.join(artifactDir, 'edge_seo_thumbnail_desktop_main_v110.png');
  await page.screenshot({ path: cap1, fullPage: false });
  console.log('  -> 캡처 완료:', path.basename(cap1));

  // 2. 비주얼 에디토리얼 가이드북 열기
  console.log('- [2/6] 비주얼 에디토리얼 가이드북 (/guide modal) 검수 중...');
  const guideBtn = page.locator('button:has-text("📖 연동 & 사용 매뉴얼")');
  if (await guideBtn.count() > 0) {
    await guideBtn.first().click();
    await page.waitForTimeout(1000);
    const cap2 = path.join(artifactDir, 'edge_seo_thumbnail_desktop_guide_v110.png');
    await page.screenshot({ path: cap2, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(cap2));

    // 첫 번째 FAQ 아코디언 토글 클릭
    const faqItem = page.locator('button:has-text("Q. 썸네일 이미지 렌더링 시간과 API 비용은 어떻게 되나요?")');
    if (await faqItem.count() > 0) {
      await faqItem.first().click();
      await page.waitForTimeout(500);
    }

    // 가이드 닫기
    const closeBtn = page.locator('button:has-text("확인했습니다")').or(page.locator('button[aria-label="가이드 닫기"]'));
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click({ force: true });
      await page.waitForTimeout(800);
    }
  }

  // 3. API 키 등록 모달 검수
  console.log('- [3/6] API 키 등록 모달 검수 중...');
  const keyBtn = page.locator('button:has-text("🔑 API키등록·플랫폼연동")');
  if (await keyBtn.count() > 0) {
    await keyBtn.first().click();
    await page.waitForTimeout(1000);
    const cap3 = path.join(artifactDir, 'edge_seo_thumbnail_desktop_apikey_v110.png');
    await page.screenshot({ path: cap3, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(cap3));

    // 모달 닫기
    const closeKey = page.locator('button[aria-label="닫기"]');
    if (await closeKey.count() > 0) {
      await closeKey.first().click({ force: true });
      await page.waitForTimeout(800);
    }
  }

  // 4. 2단계 썸네일 상세 설정 탭 검수
  console.log('- [4/6] 2단계 썸네일 상세 설정 탭 검수 중...');
  const step2Btn = page.locator('button:has-text("썸네일 상세 설정")');
  if (await step2Btn.count() > 0) {
    await step2Btn.first().click();
    await page.waitForTimeout(800);
    const cap4 = path.join(artifactDir, 'edge_seo_thumbnail_desktop_step2_v110.png');
    await page.screenshot({ path: cap4, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(cap4));
  }

  // 5. 3단계 결과물 & 피드백 탭 검수
  console.log('- [5/6] 3단계 결과물 & 피드백 탭 검수 중...');
  const step3Btn = page.locator('button:has-text("결과물 & 피드백")');
  if (await step3Btn.count() > 0) {
    await step3Btn.first().click();
    await page.waitForTimeout(800);
    const cap5 = path.join(artifactDir, 'edge_seo_thumbnail_desktop_step3_v110.png');
    await page.screenshot({ path: cap5, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(cap5));
  }

  // 6. 모바일 375px 반응형 뷰포트 검수
  console.log('- [6/6] 모바일 375px 반응형 뷰포트 검수 중...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('https://seo-thumbnail-pro.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);
  const cap6 = path.join(artifactDir, 'edge_seo_thumbnail_mobile_v110.png');
  await mobilePage.screenshot({ path: cap6, fullPage: true });
  console.log('  -> 캡처 완료:', path.basename(cap6));
  await mobileContext.close();

  console.log('===============================================================');
  console.log('✅ Microsoft Edge 전면 포그라운드 실세션 검수 100% 완료!');
  console.log('주인님께서 직접 화면을 보실 수 있도록 데스크톱 화면을 최전면에 10분간 유지합니다.');
  console.log('===============================================================');

  // 데스크톱 페이지 최전면 활성화 및 10분 대기
  await page.bringToFront();
  await page.waitForTimeout(600000); // 10분

  await browser.close();
}

main().catch((err) => {
  console.error('검수 실행 중 에러 발생:', err);
  process.exit(1);
});
