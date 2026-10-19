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
  console.log("★ [58번 YOUTUBE Shorts 자동화 v1.20] Microsoft Edge 최전면 포그라운드 실세션 검수 시작");
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
    args: [
      '--start-maximized',
      '--force-device-scale-factor=1',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const projectRef = "esgxyikcnnvmlhygjkth";
  const cookieName = `sb-${projectRef}-auth-token`;

  const rawCookieVal = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
    token_type: "bearer",
    expires_in: session.expires_in,
    expires_at: session.expires_at,
  });

  const base64Val = Buffer.from(rawCookieVal).toString('base64');
  const cookieValue = `base64-${base64Val}`;

  const context = await browser.newContext({
    viewport: null,
  });

  await context.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: '.buylife.xyz',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: `${cookieName}-code-verifier`,
      value: 'verifier',
      domain: '.buylife.xyz',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    }
  ]);

  const page = await context.newPage();

  console.log("\n[1/6] 데스크톱 메인 워크스페이스(https://shots.buylife.xyz/candidates) 접속...");
  await page.goto("https://shots.buylife.xyz/candidates", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const shot1 = path.join(artifactDir, 'edge_shots_desktop_main_v120.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`  -> 캡처 완료: ${shot1}`);

  console.log("\n[2/6] 데스크톱 스튜디오 헤더 & 3대 KPI 카드 영역 클로즈업...");
  const shot2 = path.join(artifactDir, 'edge_shots_desktop_kpi_v120.png');
  await page.screenshot({ path: shot2, clip: { x: 260, y: 0, width: 1180, height: 600 } });
  console.log(`  -> 캡처 완료: ${shot2}`);

  console.log("\n[3/6] 신규 비주얼 가이드북(https://shots.buylife.xyz/guide) 접속...");
  await page.goto("https://shots.buylife.xyz/guide", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const shot3 = path.join(artifactDir, 'edge_shots_desktop_guide_v120.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`  -> 캡처 완료: ${shot3}`);

  console.log("\n[4/6] 가이드북 9:16 비주얼 프롬프트 매트릭스 & FAQ 영역 스크롤...");
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(1500);

  const shot4 = path.join(artifactDir, 'edge_shots_desktop_guide_matrix_v120.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log(`  -> 캡처 완료: ${shot4}`);

  // 모바일 컨텍스트 생성
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  await mobileContext.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: '.buylife.xyz',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    }
  ]);

  const mobilePage = await mobileContext.newPage();

  console.log("\n[5/6] 모바일 뷰 워크스페이스 반응형 검수...");
  await mobilePage.goto("https://shots.buylife.xyz/candidates", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2500);

  const shot5 = path.join(artifactDir, 'edge_shots_mobile_candidates_v120.png');
  await mobilePage.screenshot({ path: shot5, fullPage: false });
  console.log(`  -> 캡처 완료: ${shot5}`);

  console.log("\n[6/6] 모바일 뷰 비주얼 가이드북 반응형 검수...");
  await mobilePage.goto("https://shots.buylife.xyz/guide", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2500);

  const shot6 = path.join(artifactDir, 'edge_shots_mobile_guide_v120.png');
  await mobilePage.screenshot({ path: shot6, fullPage: false });
  console.log(`  -> 캡처 완료: ${shot6}`);

  console.log("\n===============================================================");
  console.log("★ 6종 핵심 캡처 수집 완료!");
  console.log("★ 주인님께서 직접 실시간 확인하실 수 있도록 Microsoft Edge 최전면 창을 10분간(600초) 유지합니다.");
  console.log("===============================================================");

  // 10분 대기 (화면 유지)
  await page.bringToFront();
  await page.waitForTimeout(600000);

  console.log("\n10분 포그라운드 검수 대기 종료. 브라우저를 정리합니다.");
  await browser.close();
}

main().catch(err => {
  console.error("검수 실행 중 에러 발생:", err);
  process.exit(1);
});
