const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

const guides = [
  { name: "replicate", id: "78a00b16-eef5-42be-810b-80c513d57ab4", title: "Replicate(FLUX)" },
  { name: "elevenlabs", id: "9457687a-75ed-40d8-bc4a-9415173eba70", title: "ElevenLabs" },
  { name: "suno", id: "0ecb9a3c-e4f7-4229-8fc3-f74fdb6dc6fd", title: "SUNO" },
  { name: "runway", id: "373bdf47-7a5b-4557-b47a-ddd15cf07c09", title: "Runway" },
  { name: "telegram", id: "f43e8ebe-a930-4933-b965-7068b38d79aa", title: "텔레그램 봇" },
  { name: "solapi", id: "eb8f5eaf-6ef7-46b8-9b05-994e944fe69a", title: "SOLAPI" },
  { name: "navermail", id: "1dbea19b-4c83-4453-ae41-0b59d7f27b5f", title: "네이버 메일(SMTP)" },
  { name: "tavily", id: "e02892df-9ac8-48ac-821f-c51e238ca1ab", title: "Tavily" },
  { name: "inoreader", id: "8eff3ebb-7c05-45b7-9494-fc8fdf17bb5f", title: "RSS/Inoreader" },
];

async function main() {
  console.log("=== Microsoft Edge 포그라운드 실세션 검수 시작 (Phase 4: 9종 가이드) ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: false, // 포그라운드 노출 필수 지침
    slowMo: 400,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  try {
    for (let i = 0; i < guides.length; i++) {
      const g = guides[i];
      const url = `https://www.buylife.xyz/guides/${g.id}`;
      console.log(`[${i + 1}/${guides.length}] ${g.title} 접속 중... (${url})`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);

      const shotPath = path.join(ARTIFACT_DIR, `edge_guide_${g.name}_detail.png`);
      await page.screenshot({ path: shotPath });
      console.log(`✅ [${g.title}] 스크린샷 캡처 완료: ${shotPath}`);
    }

    console.log("🎉 9종 가이드 전체 Edge 실세션 검수 완료!");
    await page.waitForTimeout(1000);
    await browser.close();
  } catch (err) {
    console.error("검수 중 오류 발생:", err);
    if (browser) await browser.close();
  }
}

main();
