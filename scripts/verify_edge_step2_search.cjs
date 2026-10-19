const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

async function main() {
  console.log("=== Microsoft Edge 포그라운드 실세션 검수 시작 (2단계: 초고속 검색 & 다차원 필터링) ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("1. https://www.buylife.xyz 메인 사이트 접속...");
  await page.goto("https://www.buylife.xyz", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 검색창 위치로 스크롤
  console.log("2. 검색 & 스마트 필터 바 스크롤 및 기본 상태 캡처...");
  await page.evaluate(() => window.scrollTo(0, 920));
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step2_search_bar_default.png"),
    fullPage: false,
  });

  // 검색어 '쓰레드' 입력 테스트
  console.log("3. 검색어 '쓰레드' 실시간 입력 및 결과 캡처...");
  const searchInput = await page.locator("input[placeholder*='84개 자동화 솔루션 검색']").first();
  await searchInput.fill("쓰레드");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step2_search_threads_results.png"),
    fullPage: false,
  });

  // 검색어 초기화 후 '🔥 추천' 필터 칩 클릭 테스트
  console.log("4. '🔥 추천' 스마트 필터 클릭 및 결과 캡처...");
  await searchInput.fill("");
  const recFilter = await page.locator("button:has-text('🔥 추천')").first();
  await recFilter.click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step2_filter_recommended_results.png"),
    fullPage: false,
  });

  // '🎁 무료' 스마트 필터 클릭 테스트
  console.log("5. '🎁 무료' 스마트 필터 클릭 및 결과 캡처...");
  const freeFilter = await page.locator("button:has-text('🎁 무료')").first();
  await freeFilter.click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step2_filter_free_results.png"),
    fullPage: false,
  });

  // '전체보기로 복원' 클릭 테스트
  console.log("6. '전체보기로 복원' 클릭 테스트...");
  const resetBtn = await page.locator("button:has-text('전체보기로 복원')").first();
  if (await resetBtn.isVisible()) {
    await resetBtn.click();
    await page.waitForTimeout(800);
  }

  console.log("=== Edge 포그라운드 실세션 검수 완료 ===");
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch((err) => {
  console.error("검수 실패:", err);
  process.exit(1);
});
