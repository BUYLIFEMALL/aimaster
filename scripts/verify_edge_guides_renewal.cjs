const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

async function main() {
  console.log("=== Microsoft Edge 포그라운드 실세션 검수 시작 (이용 가이드 리뉴얼) ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    slowMo: 600,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. /guides 접속 및 초기 렌더링 확인
    console.log("1. https://www.buylife.xyz/guides 접속 중...");
    await page.goto("https://www.buylife.xyz/guides", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const apiTabPath = path.join(ARTIFACT_DIR, "edge_guides_api_tab.png");
    await page.screenshot({ path: apiTabPath });
    console.log(`[검증 1] API 가이드 탭 기본 화면 캡처: ${apiTabPath}`);

    // 2. 카테고리 칩셋 클릭 (SNS)
    console.log("2. '📸 SNS · 쓰레드 · 인스타' 카테고리 칩셋 클릭...");
    const snsChip = page.locator('button:has-text("📸 SNS")');
    if (await snsChip.isVisible()) {
      await snsChip.click();
      await page.waitForTimeout(1000);
      const snsFilterPath = path.join(ARTIFACT_DIR, "edge_guides_sns_filter.png");
      await page.screenshot({ path: snsFilterPath });
      console.log(`[검증 2] SNS 카테고리 필터링 캡처: ${snsFilterPath}`);
    }

    // 3. 실시간 검색창 키워드 입력
    console.log("3. 실시간 검색창에 'gemini' 입력...");
    const searchInput = page.locator('input[placeholder*="검색"]');
    await searchInput.fill("gemini");
    await page.waitForTimeout(1000);
    const searchPath = path.join(ARTIFACT_DIR, "edge_guides_search.png");
    await page.screenshot({ path: searchPath });
    console.log(`[검증 3] 실시간 검색 결과 캡처: ${searchPath}`);

    // 검색어 초기화
    await searchInput.fill("");
    await page.locator('button:has-text("전체")').first().click();
    await page.waitForTimeout(1000);

    // 4. 서브프로그램 실전 매뉴얼 탭 전환
    console.log("4. '🚀 서브프로그램 실전 매뉴얼' 탭 클릭...");
    const progTab = page.locator('button:has-text("서브프로그램 실전 매뉴얼")');
    await progTab.click();
    await page.waitForTimeout(1500);

    const progTabPath = path.join(ARTIFACT_DIR, "edge_guides_programs_tab.png");
    await page.screenshot({ path: progTabPath });
    console.log(`[검증 4] 서브프로그램 매뉴얼 탭 캡처: ${progTabPath}`);

    // 5. 고도화된 OpenAI 가이드 상세 페이지 접속
    console.log("5. OpenAI 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/1c5c24e2-15d4-49b8-b907-0ac6843dee3a", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    const detailPath = path.join(ARTIFACT_DIR, "edge_guide_detail_step_by_step.png");
    await page.screenshot({ path: detailPath });
    console.log(`[검증 5] 단계별 상세 가이드 화면 캡처: ${detailPath}`);

    console.log("=== Edge 포그라운드 실세션 검수 100% 완료 ===");
  } catch (err) {
    console.error("검수 중 오류 발생:", err);
  } finally {
    await page.waitForTimeout(1500);
    await browser.close();
  }
}

main();
