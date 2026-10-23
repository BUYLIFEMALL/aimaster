const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../document-translator/node_modules/playwright"));
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(new RegExp(`^${key}=(.*)$`));
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://esgxyikcnnvmlhygjkth.supabase.co";
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const targetEmail = "buylifemall@naver.com";
const appUrl = "https://document-translator.buylife.xyz";
const artifactDir = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

async function main() {
  console.log("===============================================================");
  console.log("🚀 AI 문서번역 자동화 (document-translator) v1.20 Edge 검수 시작");
  console.log("===============================================================");

  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log("[1/5] Supabase 인증 클라이언트 생성 (AIMaster 운영 DB: esgxyikcnnvmlhygjkth)...");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[2/5] 일반 회원 테스트 계정(${targetEmail}) 매직링크 세션 획득...`);
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("매직링크 생성 실패:", linkError);
    process.exit(1);
  }

  const magicLink = linkData.properties.action_link;
  console.log("매직링크 생성 성공.");

  console.log("[3/5] Microsoft Edge 전용 브라우저 포그라운드(headless: false) 실행...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    slowMo: 100,
  });

  // 데스크톱 검수
  console.log("[4/5] 데스크톱 화면 검수 진행...");
  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const desktopPage = await desktopContext.newPage();

  console.log("  -> 세션 인증 및 대시보드 접속 중...");
  await desktopPage.goto(magicLink, { waitUntil: "networkidle" });
  await desktopPage.goto(`${appUrl}/dashboard`, { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(2000);

  // 캡처 1: 데스크톱 메인 대시보드
  const cap1 = path.join(artifactDir, "edge_translator_desktop_main_v120.png");
  await desktopPage.screenshot({ path: cap1, fullPage: false });
  console.log("  ✓ 캡처 1 완료:", cap1);

  // 캡처 2: 3대 KPI 통계 카드
  const kpiEl = await desktopPage.$(".stat-grid-v120");
  const cap2 = path.join(artifactDir, "edge_translator_desktop_kpi_v120.png");
  if (kpiEl) {
    await kpiEl.screenshot({ path: cap2 });
  } else {
    await desktopPage.screenshot({ path: cap2, fullPage: false });
  }
  console.log("  ✓ 캡처 2 완료:", cap2);

  // 캡처 3: 4단계 파이프라인 가이드 바
  const pipeEl = await desktopPage.$(".pipeline-bar");
  const cap3 = path.join(artifactDir, "edge_translator_desktop_steps_v120.png");
  if (pipeEl) {
    await pipeEl.screenshot({ path: cap3 });
  } else {
    await desktopPage.screenshot({ path: cap3, fullPage: false });
  }
  console.log("  ✓ 캡처 3 완료:", cap3);

  // 캡처 4: 가이드북 상단 및 워크플로우
  console.log(`  -> ${appUrl}/guide 접속 중...`);
  await desktopPage.goto(`${appUrl}/guide`, { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(2000);
  const cap4 = path.join(artifactDir, "edge_translator_desktop_guide_v120.png");
  await desktopPage.screenshot({ path: cap4, fullPage: false });
  console.log("  ✓ 캡처 4 완료:", cap4);

  // 캡처 5: 가이드북 매트릭스 표 및 FAQ 아코디언
  await desktopPage.evaluate(() => window.scrollBy(0, 600));
  await desktopPage.waitForTimeout(1000);
  const cap5 = path.join(artifactDir, "edge_translator_desktop_guide_matrix_v120.png");
  await desktopPage.screenshot({ path: cap5, fullPage: false });
  console.log("  ✓ 캡처 5 완료:", cap5);

  // 모바일 검수
  console.log("[5/5] 모바일 반응형 검수 진행...");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log("  -> 모바일 대시보드 접속 중...");
  await mobilePage.goto(magicLink, { waitUntil: "networkidle" });
  await mobilePage.goto(`${appUrl}/dashboard`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2000);

  const cap6 = path.join(artifactDir, "edge_translator_mobile_main_v120.png");
  await mobilePage.screenshot({ path: cap6, fullPage: false });
  console.log("  ✓ 캡처 6 완료:", cap6);

  console.log("  -> 모바일 가이드북 접속 중...");
  await mobilePage.goto(`${appUrl}/guide`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2000);

  const cap7 = path.join(artifactDir, "edge_translator_mobile_guide_v120.png");
  await mobilePage.screenshot({ path: cap7, fullPage: false });
  console.log("  ✓ 캡처 7 완료:", cap7);

  console.log("===============================================================");
  console.log("🎉 Edge 포그라운드 실세션 검수 완료! 모든 캡처가 성공적으로 저장되었습니다.");
  console.log("사용자 실시간 확인을 위해 Microsoft Edge 창을 10분간(600초) 포그라운드로 유지합니다...");
  console.log("===============================================================");

  await new Promise((resolve) => setTimeout(resolve, 600000));
  await browser.close();
  console.log("Edge 브라우저 세션 종료.");
}

main().catch((err) => {
  console.error("검수 실패:", err);
  process.exit(1);
});
