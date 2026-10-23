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
  console.log('★ [71번 ai-slide-builder v1.10] Microsoft Edge 최전면 포그라운드 실세션 검수 시작');
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
    // 1. 데스크톱 메인 스튜디오
    console.log('- [1/6] 데스크톱 메인 스튜디오 (/) 검수 중...');
    await page.goto('https://ai-slide-builder.buylife.xyz/', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(2000);
    const studioPath = path.join(artifactDir, 'edge_slide_desktop_studio_v110.png');
    await page.screenshot({ path: studioPath, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(studioPath));

    // 2. 비주얼 가이드북
    console.log('- [2/6] 비주얼 가이드북 (/guide) 검수 중...');
    await page.goto('https://ai-slide-builder.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(2000);
    const guidePath = path.join(artifactDir, 'edge_slide_desktop_guide_v110.png');
    await page.screenshot({ path: guidePath, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(guidePath));

    // 3. 가이드 FAQ 아코디언 오픈
    console.log('- [3/6] 가이드 FAQ 아코디언 오픈 검수 중...');
    await page.evaluate(() => {
      const details = document.querySelector('section#faq details');
      if (details) details.setAttribute('open', 'true');
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);
    const faqPath = path.join(artifactDir, 'edge_slide_desktop_guide_faq_v110.png');
    await page.screenshot({ path: faqPath, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(faqPath));

    // 4. API 키 설정 모달 오픈
    console.log('- [4/6] API키 등록·플랫폼 연동 모달 검수 중...');
    await page.goto('https://ai-slide-builder.buylife.xyz/', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('API키등록'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(1000);
    const settingsPath = path.join(artifactDir, 'edge_slide_desktop_settings_modal_v110.png');
    await page.screenshot({ path: settingsPath, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(settingsPath));

    // 5. 슬라이드 상세 도움말 모달
    console.log('- [5/6] 슬라이드 도움말 모달 검수 중...');
    await page.goto('https://ai-slide-builder.buylife.xyz/', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('도움말'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(1000);
    const helpModalPath = path.join(artifactDir, 'edge_slide_desktop_help_modal_v110.png');
    await page.screenshot({ path: helpModalPath, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(helpModalPath));

    // 6. 모바일 반응형 뷰포트
    console.log('- [6/6] 모바일 375px 반응형 뷰포트 (/guide) 검수 중...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true
    });
    await mobileContext.addCookies(browserCookies);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('https://ai-slide-builder.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 35000 });
    await mobilePage.waitForTimeout(2000);
    const mobilePath = path.join(artifactDir, 'edge_slide_mobile_guide_v110.png');
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    console.log('  -> 캡처 완료:', path.basename(mobilePath));
    await mobilePage.close();
    await mobileContext.close();

    // 10분 유지 안내
    console.log('===============================================================');
    console.log('✅ Microsoft Edge 전면 포그라운드 실세션 검수 100% 완료!');
    console.log('주인님께서 직접 화면을 보실 수 있도록 데스크톱 메인 스튜디오 화면을 최전면에 10분간 유지합니다.');
    console.log('===============================================================');

    await page.goto('https://ai-slide-builder.buylife.xyz/', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(600000); // 10분 유지

  } catch (err) {
    console.error('검수 중 오류 발생:', err);
  } finally {
    await browser.close();
    console.log('검수 세션 종료.');
  }
}

main().catch(err => {
  console.error('실행 실패:', err);
  process.exit(1);
});
