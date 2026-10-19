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

const TARGET_URL = 'https://reverse-prompt.buylife.xyz';
const ARTIFACTS_DIR = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('★ [73번 reverse-prompt v1.10] Microsoft Edge 최전면 포그라운드 실세션 검수 시작');
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
      '--window-position=0,0',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
  });

  await context.addCookies(browserCookies);
  const page = await context.newPage();

  try {
    // 1. 데스크톱 메인 스튜디오 (/analyze) 검수
    console.log('- [1/6] 데스크톱 메인 스튜디오 (/analyze) 검수 중...');
    await page.goto(`${TARGET_URL}/analyze`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);

    const studioCapturePath = path.join(ARTIFACTS_DIR, 'edge_rp_desktop_studio_v110.png');
    await page.screenshot({ path: studioCapturePath, fullPage: false });
    console.log('  -> 캡처 완료: edge_rp_desktop_studio_v110.png');

    // 2. 비주얼 가이드북 (/guide) 검수
    console.log('- [2/6] 비주얼 가이드북 (/guide) 검수 중...');
    await page.goto(`${TARGET_URL}/guide`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const guideCapturePath = path.join(ARTIFACTS_DIR, 'edge_rp_desktop_guide_v110.png');
    await page.screenshot({ path: guideCapturePath, fullPage: false });
    console.log('  -> 캡처 완료: edge_rp_desktop_guide_v110.png');

    // 3. 가이드 FAQ 아코디언 오픈 검수
    console.log('- [3/6] 가이드 FAQ 아코디언 오픈 검수 중...');
    const faqDetails = await page.$$('details');
    if (faqDetails.length > 1) {
      await faqDetails[1].click(); // 두 번째 FAQ 클릭 오픈
      await page.waitForTimeout(500);
    }
    const faqCapturePath = path.join(ARTIFACTS_DIR, 'edge_rp_desktop_guide_faq_v110.png');
    await page.screenshot({ path: faqCapturePath, fullPage: false });
    console.log('  -> 캡처 완료: edge_rp_desktop_guide_faq_v110.png');

    // 4. API키등록·플랫폼연동 (/settings) 검수
    console.log('- [4/6] API키등록·플랫폼연동 (/settings) 검수 중...');
    await page.goto(`${TARGET_URL}/settings`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const settingsCapturePath = path.join(ARTIFACTS_DIR, 'edge_rp_desktop_settings_modal_v110.png');
    await page.screenshot({ path: settingsCapturePath, fullPage: false });
    console.log('  -> 캡처 완료: edge_rp_desktop_settings_modal_v110.png');

    // 5. 내 분석 기록 (/history) 검수
    console.log('- [5/6] 내 분석 기록 (/history) 검수 중...');
    await page.goto(`${TARGET_URL}/history`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const historyCapturePath = path.join(ARTIFACTS_DIR, 'edge_rp_desktop_history_v110.png');
    await page.screenshot({ path: historyCapturePath, fullPage: false });
    console.log('  -> 캡처 완료: edge_rp_desktop_history_v110.png');

    // 6. 모바일 375px 반응형 뷰포트 (/guide) 검수
    console.log('- [6/6] 모바일 375px 반응형 뷰포트 (/guide) 검수 중...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    await mobileContext.addCookies(browserCookies);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${TARGET_URL}/guide`, { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(2000);

    const mobileCapturePath = path.join(ARTIFACTS_DIR, 'edge_rp_mobile_guide_v110.png');
    await mobilePage.screenshot({ path: mobileCapturePath, fullPage: false });
    console.log('  -> 캡처 완료: edge_rp_mobile_guide_v110.png');
    await mobileContext.close();

    // 메인 스튜디오로 복귀하여 최전면에 창 10분 유지
    await page.goto(`${TARGET_URL}/analyze`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('===============================================================');
    console.log('✅ Microsoft Edge 전면 포그라운드 실세션 검수 100% 완료!');
    console.log('주인님께서 직접 화면을 보실 수 있도록 데스크톱 메인 스튜디오 화면을 최전면에 10분간 유지합니다.');
    console.log('===============================================================');

    await page.waitForTimeout(600000); // 10분 유지
  } catch (err) {
    console.error('검수 중 오류:', err);
  } finally {
    await browser.close();
    console.log('검수 세션 종료.');
  }
}

main().catch(err => {
  console.error('검수 스크립트 실패:', err);
  process.exit(1);
});
