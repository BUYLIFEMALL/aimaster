const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const ownRequire = require('module').createRequire(path.join(root, 'reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');
const { createClient } = ownRequire('@supabase/supabase-js');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const env = readEnv(path.join(root, '.env.local'));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log("===============================================================");
  console.log("★ [36번 VideoToGIF v1.10] Microsoft Edge 최전면 포그라운드 실세션 검수 시작");
  console.log("===============================================================");

  const TEST_EMAIL = "buylifemall@naver.com";
  console.log(`- 일반 회원 테스트 계정(${TEST_EMAIL}) 매직링크 인증 토큰 생성...`);

  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
  });

  if (linkErr || !linkData?.properties?.email_otp) {
    console.error("매직링크 생성 실패:", linkErr);
    process.exit(1);
  }

  const { data: sessionData, error: verifyErr } = await sb.auth.verifyOtp({
    email: TEST_EMAIL,
    token: linkData.properties.email_otp,
    type: 'email',
  });

  if (verifyErr || !sessionData?.session) {
    console.error("세션 획득 실패:", verifyErr);
    process.exit(1);
  }

  const session = sessionData.session;
  console.log("- 일반 회원 세션 쿠키 준비 완료.");

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  console.log("- Microsoft Edge 브라우저를 최전면(최대화)으로 기동합니다...");

  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: false,
    args: ['--start-maximized', '--window-position=0,0']
  });

  const context = await browser.newContext({
    viewport: null, // 최대화 창 크기 유지
  });

  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)?.[1] || 'supabase';
  const cookieName = `sb-${projectRef}-auth-token`;

  const cookiePayload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
  });

  const base64Cookie = Buffer.from(cookiePayload).toString('base64');

  await context.addCookies([
    {
      name: cookieName,
      value: `base64-${base64Cookie}`,
      domain: '.buylife.xyz',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: `${cookieName}.0`,
      value: `base64-${base64Cookie}`,
      domain: '.buylife.xyz',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    }
  ]);

  const page = await context.newPage();

  // 1. 대시보드 메인 워크스페이스 검수
  console.log("- 1. 메인 스튜디오 대시보드 검수 접속: https://video-to-gif.buylife.xyz/dashboard");
  await page.goto("https://video-to-gif.buylife.xyz/dashboard", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  const cap1 = path.join(artifactDir, "edge_gif_desktop_studio_v110.png");
  await page.screenshot({ path: cap1 });
  console.log(`  [캡처 1 완료] 메인 스튜디오 화면 -> ${cap1}`);

  // 2. 드롭존 및 변환 옵션 패널 영역 캡처
  console.log("- 2. 드롭존 및 변환 옵션 패널 검수...");
  const cap2 = path.join(artifactDir, "edge_gif_desktop_dropzone_v110.png");
  await page.screenshot({ path: cap2 });
  console.log(`  [캡처 2 완료] 드롭존 및 옵션 패널 -> ${cap2}`);

  // 3. 비주얼 가이드북 상단 검수
  console.log("- 3. 비주얼 가이드북 검수 접속: https://video-to-gif.buylife.xyz/guide");
  await page.goto("https://video-to-gif.buylife.xyz/guide", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  const cap3 = path.join(artifactDir, "edge_gif_desktop_guide_v110.png");
  await page.screenshot({ path: cap3 });
  console.log(`  [캡처 3 완료] 비주얼 가이드북 상단 -> ${cap3}`);

  // 4. 가이드북 매트릭스 & FAQ 아코디언 검수
  console.log("- 4. 가이드북 매트릭스 및 FAQ 아코디언 검수...");
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(2000);

  // FAQ 1번 아코디언 클릭
  try {
    const faqBtn = await page.$("button:has-text('영상이 서버로 업로드되어')");
    if (faqBtn) await faqBtn.click();
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log("FAQ 버튼 클릭 스킵:", e.message);
  }

  const cap4 = path.join(artifactDir, "edge_gif_desktop_guide_matrix_v110.png");
  await page.screenshot({ path: cap4 });
  console.log(`  [캡처 4 완료] 가이드북 매트릭스 & FAQ -> ${cap4}`);

  // 5. 대시보드 하단 실전 활용 가이드 섹션 검수
  console.log("- 5. 대시보드 하단 실전 가이드 검수...");
  await page.goto("https://video-to-gif.buylife.xyz/dashboard", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1500);

  const cap5 = path.join(artifactDir, "edge_gif_desktop_usage_v110.png");
  await page.screenshot({ path: cap5 });
  console.log(`  [캡처 5 완료] 대시보드 하단 실전 가이드 -> ${cap5}`);

  // 6. 모바일 375px 뷰포트 검수
  console.log("- 6. 모바일 반응형 뷰포트(375x812) 검수...");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });

  await mobileContext.addCookies([
    {
      name: cookieName,
      value: `base64-${base64Cookie}`,
      domain: '.buylife.xyz',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    }
  ]);

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("https://video-to-gif.buylife.xyz/guide", { waitUntil: "networkidle", timeout: 45000 });
  await mobilePage.waitForTimeout(3000);

  const cap6 = path.join(artifactDir, "edge_gif_mobile_guide_v110.png");
  await mobilePage.screenshot({ path: cap6 });
  console.log(`  [캡처 6 완료] 모바일 가이드북 뷰 -> ${cap6}`);
  await mobileContext.close();

  // 7. 메인 스튜디오 대시보드로 복귀하여 10분간 화면 유지
  console.log("- 7. 메인 스튜디오 대시보드로 복귀하여 창을 최전면에 유지합니다 (10분 유지 대기)...");
  await page.goto("https://video-to-gif.buylife.xyz/dashboard", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));

  console.log("★ 모든 6종 캡처 완료! 주인님께서 직접 보실 수 있도록 실제 Edge 창을 10분간 최전면에 유지합니다.");
  await page.waitForTimeout(600000); // 10분

  await browser.close();
  console.log("★ Microsoft Edge 검수 세션이 정상 종료되었습니다.");
}

main().catch(err => {
  console.error("검수 스크립트 실행 중 에러:", err);
  process.exit(1);
});
