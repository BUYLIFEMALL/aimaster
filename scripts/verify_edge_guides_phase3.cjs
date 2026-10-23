const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

async function main() {
  console.log("=== Microsoft Edge 포그라운드 실세션 검수 시작 (이커머스 & 메신저 Phase 3) ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false, // 포그라운드 노출 필수 지침
    slowMo: 600,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  try {
    // 1. 쿠팡 파트너스 가이드 검수
    console.log("1. 쿠팡 파트너스 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/117ffedb-c554-458a-9b92-e9ed6ee33988", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const coupangPath = path.join(ARTIFACT_DIR, "edge_guide_coupang_detail.png");
    await page.screenshot({ path: coupangPath });
    console.log(`[검증 1] 쿠팡 파트너스 가이드 스텝 뷰어 캡처: ${coupangPath}`);

    // 2. 카카오 플랫폼 연동 가이드 검수
    console.log("2. 카카오 플랫폼 연동 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/4042a4b3-e573-4baa-8f70-103f52b1cbbd", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const kakaoPath = path.join(ARTIFACT_DIR, "edge_guide_kakao_detail.png");
    await page.screenshot({ path: kakaoPath });
    console.log(`[검증 2] 카카오 플랫폼 연동 가이드 스텝 뷰어 캡처: ${kakaoPath}`);

    // 3. 알리익스프레스 가이드 검수
    console.log("3. 알리익스프레스 가이드 상세 페이지 접속...");
    await page.goto("https://www.buylife.xyz/guides/0eb4180e-a076-4ee6-b75e-6b3c3c9ec442", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const aliPath = path.join(ARTIFACT_DIR, "edge_guide_aliexpress_detail.png");
    await page.screenshot({ path: aliPath });
    console.log(`[검증 3] 알리익스프레스 가이드 스텝 뷰어 캡처: ${aliPath}`);

    console.log("🎉 Phase 3 모든 가이드 검수 완료! 스크린샷 저장 완료.");
    await page.waitForTimeout(1000);
    await browser.close();
  } catch (err) {
    console.error("검수 중 오류 발생:", err);
    if (browser) await browser.close();
  }
}

main();
