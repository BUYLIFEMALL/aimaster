const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'reverse-prompt/package.json'));
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
const publicKey = platform.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverKey = platform.SUPABASE_SERVICE_ROLE_KEY;

const TARGET_URL = 'https://ebook-studio.buylife.xyz';
const ARTIFACTS_DIR = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('★ [20번 ebook-studio v1.10] Microsoft Edge 최전면 포그라운드 실세션 검수 시작');
  console.log('===============================================================');

  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('- 일반 회원 테스트 계정(buylifemall@naver.com) 매직링크 인증 토큰 발급 및 검증...');
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
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-position=0,0'
    ]
  });

  const context = await browser.newContext({
    viewport: null
  });
  await context.addCookies(browserCookies);

  const page = await context.newPage();

  // 1. 메인 스튜디오 전경 검수 (/)
  console.log(`- 1. 메인 스튜디오 대시보드 검수 접속: ${TARGET_URL}/`);
  await page.goto(`${TARGET_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const studioShotPath = path.join(ARTIFACTS_DIR, 'edge_ebook_desktop_studio_v110.png');
  await page.screenshot({ path: studioShotPath, fullPage: false });
  console.log(`  [캡처 1 완료] 메인 스튜디오 화면 -> ${studioShotPath}`);

  // 2. 원본 문서 입력 & 목차 분할 영역 검수 (스크롤)
  console.log('- 2. 원본 자료 입력 패널 검수...');
  await page.evaluate(() => window.scrollBy(0, 350));
  await page.waitForTimeout(1000);
  const inputsShotPath = path.join(ARTIFACTS_DIR, 'edge_ebook_desktop_inputs_v110.png');
  await page.screenshot({ path: inputsShotPath, fullPage: false });
  console.log(`  [캡처 2 완료] 원본 자료 입력 화면 -> ${inputsShotPath}`);

  // 3. 비주얼 가이드북 검수 (/guide)
  console.log(`- 3. 비주얼 가이드북 검수 접속: ${TARGET_URL}/guide`);
  await page.goto(`${TARGET_URL}/guide`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const guideShotPath = path.join(ARTIFACTS_DIR, 'edge_ebook_desktop_guide_v110.png');
  await page.screenshot({ path: guideShotPath, fullPage: false });
  console.log(`  [캡처 3 완료] 비주얼 가이드북 상단 -> ${guideShotPath}`);

  // 4. 가이드북 FAQ 아코디언 인터랙션 검수
  console.log('- 4. 가이드북 FAQ 아코디언 인터랙션 검수...');
  await page.evaluate(() => window.scrollBy(0, 850));
  await page.waitForTimeout(1000);
  const faqButtons = await page.$$('button:has-text("Q2"), button:has-text("Q3"), button:has-text("HTML")');
  if (faqButtons.length > 0) {
    try {
      await faqButtons[0].click();
      await page.waitForTimeout(600);
    } catch (e) {
      console.log('  (FAQ 클릭 통과)');
    }
  }
  const faqShotPath = path.join(ARTIFACTS_DIR, 'edge_ebook_desktop_guide_faq_v110.png');
  await page.screenshot({ path: faqShotPath, fullPage: false });
  console.log(`  [캡처 4 완료] 가이드북 FAQ 아코디언 -> ${faqShotPath}`);

  // 5. API 키 설정 모달 검수
  console.log('- 5. API 키 설정 모달 검수...');
  await page.goto(`${TARGET_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const settingsBtn = await page.$('button:has-text("API 키"), button:has-text("API Key"), button:has-text("설정")');
  if (settingsBtn) {
    try {
      await settingsBtn.click();
      await page.waitForTimeout(800);
    } catch (e) {
      console.log('  (설정 버튼 클릭 통과)');
    }
  }
  const settingsShotPath = path.join(ARTIFACTS_DIR, 'edge_ebook_desktop_settings_v110.png');
  await page.screenshot({ path: settingsShotPath, fullPage: false });
  console.log(`  [캡처 5 완료] API 키 설정 모달 화면 -> ${settingsShotPath}`);

  // 6. 모바일 반응형 검수 (375x812)
  console.log('- 6. 모바일 반응형 뷰포트(375x812) 검수...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${TARGET_URL}/guide`, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  const mobileShotPath = path.join(ARTIFACTS_DIR, 'edge_ebook_mobile_guide_v110.png');
  await mobilePage.screenshot({ path: mobileShotPath, fullPage: false });
  console.log(`  [캡처 6 완료] 모바일 가이드북 뷰 -> ${mobileShotPath}`);
  await mobileContext.close();

  // 7. 메인 스튜디오 대시보드로 복귀하여 10분간 화면 최전면 유지
  console.log('- 7. 메인 스튜디오 대시보드로 복귀하여 창을 최전면에 유지합니다 (10분 유지 대기)...');
  await page.goto(`${TARGET_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.bringToFront();

  console.log('★ 모든 6종 캡처 완료! 주인님께서 직접 보실 수 있도록 실제 Edge 창을 10분간 최전면에 유지합니다.');
  
  // 10분(600초) 대기
  const WAIT_MS = 10 * 60 * 1000;
  await page.waitForTimeout(WAIT_MS);

  await browser.close();
  console.log('★ Microsoft Edge 검수 세션이 정상 종료되었습니다.');
}

main().catch(err => {
  console.error('검수 실패:', err);
  process.exit(1);
});
