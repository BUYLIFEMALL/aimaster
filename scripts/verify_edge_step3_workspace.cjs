const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

async function main() {
  console.log("=== Microsoft Edge 포그라운드 실세션 검수 시작 (3단계: 나만의 작업대 & 즐겨찾기) ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("1. https://www.buylife.xyz 접속...");
  await page.goto("https://www.buylife.xyz", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 나만의 작업대 기본 상태 스크롤 및 캡처
  console.log("2. 나만의 작업대 (기본 상태) 스크롤 및 캡처...");
  await page.evaluate(() => window.scrollTo(0, 750));
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step3_workspace_empty.png"),
    fullPage: false,
  });

  // 프로그램 카드 영역으로 스크롤하여 별표(⭐) 2개 클릭
  console.log("3. 프로그램 카드의 별표(⭐) 핀 버튼 2개 클릭...");
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(800);

  const starBtns = await page.locator("button[title*='즐겨찾기']").all();
  console.log(`  -> 발견된 별표 핀 버튼 개수: ${starBtns.length}`);
  if (starBtns.length >= 4) {
    await starBtns[0].scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await starBtns[0].click({ force: true });
    console.log("  -> 첫 번째 프로그램(index 0) 즐겨찾기 클릭 완료");
    await page.waitForTimeout(500);

    // 서로 다른 프로그램이 확실하도록 index 3 클릭
    await starBtns[3].scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await starBtns[3].click({ force: true });
    console.log("  -> 두 번째 프로그램(index 3) 즐겨찾기 클릭 완료");
    await page.waitForTimeout(800);

    const favInStorage = await page.evaluate(() => localStorage.getItem("aimaster_favorites"));
    console.log(`  -> localStorage aimaster_favorites 값: ${favInStorage}`);
  }

  // 상단 나만의 작업대로 다시 스크롤하여 2개 핀 고정된 결과 캡처
  console.log("4. 상단 나만의 작업대로 스크롤하여 즐겨찾기 등록 결과 캡처...");
  await page.evaluate(() => window.scrollTo(0, 750));
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step3_workspace_favorites_active.png"),
    fullPage: false,
  });

  // 최근 실행 탭 클릭
  console.log("5. 최근 실행 탭 클릭 및 캡처...");
  const recentTabBtn = await page.locator("button:has-text('최근 실행')").first();
  await recentTabBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step3_workspace_recent_tab.png"),
    fullPage: false,
  });

  console.log("=== Edge 포그라운드 실세션 검수 완료 ===");
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch((err) => {
  console.error("검수 실패:", err);
  process.exit(1);
});
