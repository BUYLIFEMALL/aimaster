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
  console.log("★ [40번 네이버 카페 포스팅 자동화 v1.20] Microsoft Edge 최전면 포그라운드 실세션 검수 시작");
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

  // 1. 메인 대시보드 검수
  console.log("- 1. 메인 대시보드 검수 접속: https://naver-cafe-poster.buylife.xyz/dashboard");
  await page.goto("https://naver-cafe-poster.buylife.xyz/dashboard", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  const mainPath = path.join(artifactDir, "edge_cafe_desktop_main_v120.png");
  await page.screenshot({ path: mainPath });
  console.log(`  [캡처 1 완료] 메인 대시보드 -> ${mainPath}`);

  // 2. 대시보드 하단 KPI 및 진행 현황 통계 카드 검수
  console.log("- 2. 메인 하단 KPI 및 진행 현황 카드 검수...");
  await page.evaluate(() => window.scrollBy(0, 450));
  await page.waitForTimeout(1000);

  const kpiPath = path.join(artifactDir, "edge_cafe_desktop_kpi_v120.png");
  await page.screenshot({ path: kpiPath });
  console.log(`  [캡처 2 완료] KPI 및 통계 카드 -> ${kpiPath}`);

  // 3. 비주얼 가이드북 상단 검수
  console.log("- 3. 비주얼 가이드북 검수 접속: https://naver-cafe-poster.buylife.xyz/guide");
  await page.goto("https://naver-cafe-poster.buylife.xyz/guide", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  const guidePath = path.join(artifactDir, "edge_cafe_desktop_guide_v120.png");
  await page.screenshot({ path: guidePath });
  console.log(`  [캡처 3 완료] 비주얼 가이드북 상단 -> ${guidePath}`);

  // 4. 가이드북 매트릭스 및 FAQ 아코디언 검수
  console.log("- 4. 가이드북 매트릭스 & FAQ 아코디언 검수...");
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1000);

  const matrixPath = path.join(artifactDir, "edge_cafe_desktop_guide_matrix_v120.png");
  await page.screenshot({ path: matrixPath });
  console.log(`  [캡처 4 완료] 가이드북 매트릭스 & FAQ -> ${matrixPath}`);

  // 5. 글감 수집 화면 검수
  console.log("- 5. 글감 수집 화면 검수 접속: https://naver-cafe-poster.buylife.xyz/candidates");
  await page.goto("https://naver-cafe-poster.buylife.xyz/candidates", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  const candPath = path.join(artifactDir, "edge_cafe_desktop_candidates_v120.png");
  await page.screenshot({ path: candPath });
  console.log(`  [캡처 5 완료] 글감 수집 화면 -> ${candPath}`);

  // 6. 모바일 반응형 뷰포트(375x812) 검수
  console.log("- 6. 모바일 반응형 뷰포트(375x812) 검수...");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
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
  await mobilePage.goto("https://naver-cafe-poster.buylife.xyz/dashboard", { waitUntil: "networkidle", timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  const mobilePath = path.join(artifactDir, "edge_cafe_mobile_guide_v120.png");
  await mobilePage.screenshot({ path: mobilePath });
  console.log(`  [캡처 6 완료] 모바일 대시보드 뷰 -> ${mobilePath}`);
  await mobileContext.close();

  // 7. 메인 화면 복귀 및 최전면 10분 유지 대기
  console.log("- 7. 메인 화면으로 복귀하여 창을 최전면에 유지합니다 (10분 유지 대기)...");
  await page.goto("https://naver-cafe-poster.buylife.xyz/dashboard", { waitUntil: "networkidle", timeout: 30000 });
  console.log("★ 모든 6종 캡처 완료! 주인님께서 직접 보실 수 있도록 실제 Edge 창을 10분간 최전면에 유지합니다.");

  // 10분간 브라우저 유지 (600,000ms)
  await new Promise(r => setTimeout(r, 600000));
  await browser.close();
  console.log("★ Microsoft Edge 검수 세션이 정상 종료되었습니다.");
}

main().catch(err => {
  console.error("검수 중 오류 발생:", err);
  process.exit(1);
});
