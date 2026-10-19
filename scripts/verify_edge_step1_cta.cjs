const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

async function main() {
  console.log("=== Microsoft Edge 포그라운드 실세션 검수 시작 (1단계: Hero 쇼케이스 CTA 실행 버튼) ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    slowMo: 400,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("1. https://www.buylife.xyz 메인 사이트 접속...");
  await page.goto("https://www.buylife.xyz", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 쇼케이스가 화면 중앙에 오도록 스크롤
  await page.evaluate(() => window.scrollTo(0, 280));
  await page.waitForTimeout(500);

  // Focus Studio 탭 캡처
  console.log("2. Focus Studio 탭 및 CTA 버튼 캡처...");
  const focusBtn = await page.locator("text=Focus Studio").first();
  await focusBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step1_showcase_focus_cta.png"),
    fullPage: false,
  });

  // Neon Console 탭 캡처
  console.log("3. Neon Console 탭 및 CTA 버튼 캡처...");
  const neonBtn = await page.locator("text=Neon Console").first();
  await neonBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step1_showcase_neon_cta.png"),
    fullPage: false,
  });

  // Step Wizard 탭 캡처
  console.log("4. Step Wizard 탭 및 CTA 버튼 캡처...");
  const wizardBtn = await page.locator("text=Step Wizard").first();
  await wizardBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "edge_step1_showcase_wizard_cta.png"),
    fullPage: false,
  });

  console.log("5. 카탈로그 스크롤 버튼 테스트...");
  const catalogLink = await page.locator("text=프로그램 카드의 템플릿 태그를 확인해보세요").first();
  if (await catalogLink.isVisible()) {
    await catalogLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "edge_step1_scroll_to_catalog.png"),
      fullPage: false,
    });
  }

  console.log("=== Edge 포그라운드 실세션 검수 완료 ===");
  // 주인님이 화면을 확인하실 수 있도록 2초 후 닫기
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch((err) => {
  console.error("검수 실패:", err);
  process.exit(1);
});
