const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

function toBase64(filePath) {
  const fileData = fs.readFileSync(filePath);
  return 'data:image/png;base64,' + fileData.toString('base64');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const brainDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';
  const designDir = 'D:/Antigravity/Design';

  // 1. 1안(57번) 4대 화면 한눈에 보는 1장짜리 보드 (2x2 그리드, 1600x1100)
  console.log('Generating 1-page board for Concept 1 (4 views)...');
  const c1_main = toBase64(path.join(designDir, '57_hollywood_9cut_directors_viewfinder/01_main.png'));
  const c1_detail = toBase64(path.join(designDir, '57_hollywood_9cut_directors_viewfinder/02_detail.png'));
  const c1_guide = toBase64(path.join(designDir, '57_hollywood_9cut_directors_viewfinder/03_guide.png'));
  const c1_settings = toBase64(path.join(designDir, '57_hollywood_9cut_directors_viewfinder/04_settings.png'));

  const c1BoardHtml = `<!DOCTYPE html><html><head><style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", sans-serif; }
    body { background: #07090E; color: #fff; width: 1600px; height: 1100px; padding: 24px; }
    .header { text-align: center; margin-bottom: 18px; }
    .title { font-size: 24px; font-weight: 900; }
    .sub { font-size: 13px; color: #8B949E; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 980px; }
    .card { background: #0E131F; border: 1.5px solid #283342; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
    .card-head { padding: 8px 14px; background: #141B2D; border-bottom: 1px solid #283342; font-size: 13px; font-weight: 800; color: #EF4444; display: flex; justify-content: space-between; }
    .card-img { width: 100%; flex: 1; object-fit: contain; background: #000; }
  </style></head><body>
    <div class="header">
      <div class="title">🎬 [1안 채택 추천] 57. 헐리우드 9컷 시네마틱 디렉터스 뷰파인더 스타일 (4대 핵심 화면)</div>
      <div class="sub">AI 시네마틱 스토리보드 자동화 (cinematic-storyboard-studio) · 1440px 고화질 4개 뷰 한눈에 보기</div>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-head"><span>[뷰 01] 메인 9컷 뷰파인더 콘솔</span><span style="color:#F59E0B">REC 🔴 LIVE 타임코드</span></div>
        <img class="card-img" src="${c1_main}">
      </div>
      <div class="card">
        <div class="card-head"><span>[뷰 02] 씬 03 상세 인스펙터 콘솔</span><span style="color:#F59E0B">카메라 앵글 & 프롬프트 연출</span></div>
        <img class="card-img" src="${c1_detail}">
      </div>
      <div class="card">
        <div class="card-head"><span>[뷰 03] 헐리우드 9컷 연출 가이드북</span><span style="color:#F59E0B">카메라 샷 치트시트 & FAQ</span></div>
        <img class="card-img" src="${c1_guide}">
      </div>
      <div class="card">
        <div class="card-head"><span>[뷰 04] 5단계 표준 로그인 & 설정</span><span style="color:#EF4444">2026-11-01 표준 5단계 준수</span></div>
        <img class="card-img" src="${c1_settings}">
      </div>
    </div>
  </body></html>`;

  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.setContent(c1BoardHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(brainDir, 'css_c1_4views_onepage_board.png'), fullPage: true });
  console.log('Saved: css_c1_4views_onepage_board.png');

  // 2. 3대 시안 메인 화면 비교 보드 (3열 배치, 1800x650)
  console.log('Generating Main 3-Views comparison board...');
  const c2_main = toBase64(path.join(designDir, '58_neo_nle_storyboard_timeline/01_main.png'));
  const c3_main = toBase64(path.join(designDir, '59_hyper_animatic_scene_diffusion/01_main.png'));

  const main3BoardHtml = `<!DOCTYPE html><html><head><style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", sans-serif; }
    body { background: #07090E; color: #fff; width: 1800px; height: 680px; padding: 24px; }
    .header { text-align: center; margin-bottom: 18px; }
    .title { font-size: 24px; font-weight: 900; }
    .sub { font-size: 13px; color: #8B949E; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; height: 560px; }
    .card { background: #0E131F; border: 1.5px solid #283342; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
    .card-head { padding: 10px 14px; background: #141B2D; border-bottom: 1px solid #283342; font-size: 13px; font-weight: 800; display: flex; justify-content: space-between; }
    .card-img { width: 100%; flex: 1; object-fit: contain; background: #000; }
  </style></head><body>
    <div class="header">
      <div class="title">🎬 AI 시네마틱 스토리보드 3대 시안 메인화면 한눈에 보는 비교 보드</div>
      <div class="sub">1안 (57. 헐리우드 뷰파인더) vs 2안 (58. NLE 타임라인) vs 3안 (59. 뉴럴 디퓨전 HUD)</div>
    </div>
    <div class="grid">
      <div class="card" style="border-color: #EF4444;">
        <div class="card-head" style="color: #EF4444;">
          <span>1안. 57번 헐리우드 뷰파인더 (추천)</span>
          <span style="background:#EF4444; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px;">⭐ 1순위 추천</span>
        </div>
        <img class="card-img" src="${c1_main}">
      </div>
      <div class="card">
        <div class="card-head" style="color: #F59E0B;">
          <span>2안. 58번 네오 NLE 타임라인</span>
          <span style="color:#8B949E; font-size:11px;">다빈치 리졸브 감성</span>
        </div>
        <img class="card-img" src="${c2_main}">
      </div>
      <div class="card">
        <div class="card-head" style="color: #10B981;">
          <span>3안. 59번 뉴럴 디퓨전 콘솔</span>
          <span style="color:#8B949E; font-size:11px;">AI 애니메이틱 감성</span>
        </div>
        <img class="card-img" src="${c3_main}">
      </div>
    </div>
  </body></html>`;

  await page.setViewportSize({ width: 1800, height: 680 });
  await page.setContent(main3BoardHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(brainDir, 'css_main_3views_onepage_board.png'), fullPage: true });
  console.log('Saved: css_main_3views_onepage_board.png');

  // 3. 쇼케이스 라이브 웹페이지 캡처 (상단 비교표 포함 검증)
  console.log('Capturing live showcase on port 3800...');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3800/showcase.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(brainDir, 'css_showcase_live_verified.png'), fullPage: false });
  console.log('Saved: css_showcase_live_verified.png');

  // 4. 독립 비교표 라이브 웹페이지 캡처
  await page.goto('http://localhost:3800/comparison.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(brainDir, 'css_comparison_live_verified.png'), fullPage: false });
  console.log('Saved: css_comparison_live_verified.png');

  await browser.close();
  console.log('ALL BOARDS & VERIFICATION SCREENSHOTS CREATED!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
