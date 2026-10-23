const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

async function main() {
  console.log("=== Microsoft Edge 포그라운드 실세션 검수 시작 (핵심 API 가이드 Phase 2) ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false, // 포그라운드 노출 필수 원칙
    slowMo: 600,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  try {
    // 1. Claude 가이드 상세 검수
    console.log("1. Anthropic Claude 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/d03f65c2-efbb-421f-a041-a075562e3b7a", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const claudePath = path.join(ARTIFACT_DIR, "edge_guide_claude_detail.png");
    await page.screenshot({ path: claudePath });
    console.log(`[검증 1] Claude 가이드 스텝 뷰어 캡처: ${claudePath}`);

    // 2. 네이버 검색·데이터랩 가이드 상세 검수
    console.log("2. 네이버 검색·데이터랩 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/8f201233-b2f6-4da0-851c-f045bdb5f9c7", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const naverSearchPath = path.join(ARTIFACT_DIR, "edge_guide_naver_search_detail.png");
    await page.screenshot({ path: naverSearchPath });
    console.log(`[검증 2] 네이버 검색/데이터랩 가이드 스텝 뷰어 캡처: ${naverSearchPath}`);

    // 3. 네이버 검색광고 가이드 상세 검수
    console.log("3. 네이버 검색광고 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/8be38787-dacf-4921-9800-83159c9001be", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const naverAdPath = path.join(ARTIFACT_DIR, "edge_guide_naver_ad_detail.png");
    await page.screenshot({ path: naverAdPath });
    console.log(`[검증 3] 네이버 검색광고 가이드 스텝 뷰어 캡처: ${naverAdPath}`);

    // 4. YouTube Data API 가이드 상세 검수
    console.log("4. YouTube Data API 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/72d39d06-a7ca-4ab0-8327-f9bb085ac394", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const ytPath = path.join(ARTIFACT_DIR, "edge_guide_youtube_detail.png");
    await page.screenshot({ path: ytPath });
    console.log(`[검증 4] YouTube Data API 가이드 스텝 뷰어 캡처: ${ytPath}`);

    console.log("🎉 모든 가이드 페이지 검수 완료! 스크린샷 저장 완료.");
    await page.waitForTimeout(1000);
    await browser.close();
  } catch (err) {
    console.error("검수 중 오류 발생:", err);
    if (browser) await browser.close();
  }
}

main();
