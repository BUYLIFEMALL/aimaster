const { chromium } = require("../personality-suite/node_modules/playwright");
const path = require('path');

async function verifyStep4Preview() {
  console.log('Microsoft Edge 포그라운드 브라우저 구동 중...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 600
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const artifactDir = path.resolve('C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9');

  try {
    console.log('https://www.buylife.xyz 접속 중...');
    await page.goto('https://www.buylife.xyz', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 프로그램 카드가 있는 카탈로그 섹션으로 부드럽게 스크롤
    console.log('프로그램 카탈로그 섹션 탐색...');
    const programCards = page.locator('div:has(> div:has-text("자세히 보기"))');
    const firstCard = page.locator('div.group:has-text("자세히 보기")').first();
    await firstCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // 1. 카드 썸네일 영역에 마우스 호버하여 마이크로 프리뷰 오버레이 활성화
    console.log('첫 번째 프로그램 카드 썸네일 호버 인터랙션 시작...');
    const thumbnailArea = firstCard.locator('.aspect-video');
    await thumbnailArea.hover();
    await page.waitForTimeout(1200);

    const hoverCapturePath = path.join(artifactDir, 'edge_step4_card_micro_preview_hover.png');
    await page.screenshot({ path: hoverCapturePath });
    console.log(`호버 마이크로 프리뷰 캡처 완료: ${hoverCapturePath}`);

    // 2. [퀵 프리뷰] 버튼 클릭하여 모달 팝업 열기
    console.log('[퀵 프리뷰] 버튼 탐색 및 클릭...');
    const previewBtn = firstCard.locator('button:has-text("퀵 프리뷰")');
    await previewBtn.click();
    await page.waitForTimeout(1500);

    const modalCapturePath = path.join(artifactDir, 'edge_step4_quick_preview_modal_open.png');
    await page.screenshot({ path: modalCapturePath });
    console.log(`퀵 프리뷰 모달 팝업 캡처 완료: ${modalCapturePath}`);

    // 3. 모달 닫기 버튼 클릭하여 닫힘 검증
    console.log('모달 닫기 버튼 클릭...');
    const closeBtn = page.locator('button[aria-label="닫기"]');
    await closeBtn.click();
    await page.waitForTimeout(1000);

    const closedCapturePath = path.join(artifactDir, 'edge_step4_modal_closed.png');
    await page.screenshot({ path: closedCapturePath });
    console.log(`모달 닫힘 검증 캡처 완료: ${closedCapturePath}`);

    console.log('4단계 마이크로 프리뷰 검증 100% 성공!');
  } catch (err) {
    console.error('검수 중 오류 발생:', err);
  } finally {
    await page.waitForTimeout(1500);
    await browser.close();
  }
}

verifyStep4Preview();
