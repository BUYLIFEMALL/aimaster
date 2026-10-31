const fs = require('fs');
const path = require('path');
const { chromium } = require('D:/Antigravity/AIMaster/thumbnail-master/node_modules/playwright');

async function renderThumbnail() {
  const aiImagePath = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/coupang_wing_automation_thumbnail_1793455122445.jpg';
  const aiBase64 = fs.existsSync(aiImagePath)
    ? `data:image/jpeg;base64,${fs.readFileSync(aiImagePath).toString('base64')}`
    : '';

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1280px;
      height: 720px;
      font-family: Pretendard, -apple-system, sans-serif;
      background: #080B14;
      color: #FFFFFF;
      overflow: hidden;
      position: relative;
      display: flex;
    }

    /* 3D AI 일러스트 배경 (우측 페이드) */
    .ai-bg {
      position: absolute;
      top: 0;
      right: 0;
      width: 820px;
      height: 720px;
      background-image: url('${aiBase64}');
      background-size: cover;
      background-position: center;
      mask-image: linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%);
      -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0) 100%);
      z-index: 1;
      opacity: 0.92;
    }

    /* 좌측 딥 다크 그라디언트 오버레이 */
    .left-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, #070A12 0%, #070A12 40%, rgba(7, 10, 18, 0.85) 60%, rgba(7, 10, 18, 0.2) 100%);
      z-index: 2;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
      background-size: 40px 40px;
      z-index: 3;
    }

    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      height: 100%;
      display: flex;
      padding: 60px 75px;
      align-items: center;
      justify-content: space-between;
    }

    /* 좌측 정보 영역 */
    .left-content {
      width: 650px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .badge-wrap {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 9999px;
      padding: 6px 16px;
      width: fit-content;
    }

    .rocket-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      font-weight: 900;
      color: #E31A22;
      background: #FFFFFF;
      padding: 2.5px 9px;
      border-radius: 9999px;
      letter-spacing: -0.3px;
    }

    .badge-text {
      font-size: 12.5px;
      font-weight: 700;
      color: #93C5FD;
      letter-spacing: 0.3px;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      background: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10B981;
    }

    .main-title {
      font-size: 56px;
      font-weight: 950;
      line-height: 1.15;
      letter-spacing: -2px;
      color: #FFFFFF;
      text-shadow: 0 4px 28px rgba(0, 0, 0, 0.8);
    }

    .highlight-text {
      background: linear-gradient(90deg, #38BDF8 0%, #34D399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sub-title {
      font-size: 19.5px;
      font-weight: 600;
      line-height: 1.5;
      color: #94A3B8;
      letter-spacing: -0.5px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 8px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 11px 16px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .feature-icon {
      font-size: 17px;
    }

    .feature-text {
      font-size: 14px;
      font-weight: 700;
      color: #E2E8F0;
      letter-spacing: -0.3px;
    }

    /* 우측 HUD 오버레이 카드 */
    .right-deck {
      width: 440px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
    }

    .glass-deck {
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(96, 165, 250, 0.3);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(29, 78, 216, 0.35);
      backdrop-filter: blur(20px);
      position: relative;
    }

    .deck-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 14px;
      margin-bottom: 16px;
    }

    .deck-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .deck-badge {
      background: #1D4ED8;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 900;
      padding: 2.5px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .deck-title {
      font-size: 14.5px;
      font-weight: 800;
      color: #F8FAFC;
    }

    .deck-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #34D399;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 3px 9px;
      border-radius: 9999px;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .kpi-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px 14px;
    }

    .kpi-label {
      font-size: 11.5px;
      color: #94A3B8;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .kpi-val {
      font-size: 24px;
      font-weight: 950;
      color: #FFFFFF;
      letter-spacing: -0.5px;
    }

    .kpi-up {
      font-size: 11px;
      color: #34D399;
      font-weight: 800;
      margin-left: 4px;
    }

    .btn-3d-indigo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      background: linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%);
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 900;
      padding: 13px 20px;
      border-radius: 12px;
      border: 1px solid #2563EB;
      box-shadow: 0 5px 0 #1E3A8A, 0 10px 24px rgba(29, 78, 216, 0.5);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }

    .float-tag {
      position: absolute;
      top: -13px;
      right: 20px;
      background: linear-gradient(90deg, #E31A22 0%, #ED1C24 100%);
      color: #FFFFFF;
      font-size: 11.5px;
      font-weight: 950;
      padding: 5px 14px;
      border-radius: 9999px;
      box-shadow: 0 4px 14px rgba(227, 26, 34, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.35);
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 20;
    }
  </style>
</head>
<body>
  <div class="ai-bg"></div>
  <div class="left-overlay"></div>
  <div class="bg-grid"></div>

  <div class="container">
    <!-- 좌측 정보 -->
    <div class="left-content">
      <div class="badge-wrap">
        <span class="rocket-badge">🚀 WING OPEN API</span>
        <span class="badge-text">공식 인증 연동 스튜디오</span>
        <span class="pulse-dot"></span>
      </div>

      <h1 class="main-title">
        AI 쿠팡<br>
        <span class="highlight-text">운영 자동화</span>
      </h1>

      <p class="sub-title">
        10원 최저가 아이템위너 실시간 방어 &amp;<br>
        상품 대량 등록부터 주문·송장 원클릭 올인원 관제
      </p>

      <div class="feature-grid">
        <div class="feature-item">
          <span class="feature-icon">🏆</span>
          <span class="feature-text">10원 단위 최저가 위너 탈환</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📦</span>
          <span class="feature-text">스마트스토어 상품 대량 등록</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🚚</span>
          <span class="feature-text">주문·송장·반품 원스톱 처리</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔒</span>
          <span class="feature-text">Fixie 고정 IP 프록시 100% 보안</span>
        </div>
      </div>
    </div>

    <!-- 우측 인터랙티브 관제 데크 -->
    <div class="right-deck">
      <div class="float-tag">
        <span>⚡ 10원 단위 자동 방어</span>
      </div>

      <div class="glass-deck">
        <div class="deck-header">
          <div class="deck-title-wrap">
            <span class="deck-badge">LIVE LAB</span>
            <span class="deck-title">아이템위너 알고리즘 엔진</span>
          </div>
          <div class="deck-status">
            <span class="pulse-dot"></span>
            <span>실시간 가동중</span>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <p class="kpi-label">아이템위너 사수율</p>
            <p class="kpi-val">94.2%<span class="kpi-up">▲ 2.4%</span></p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">실시간 위너 상태</p>
            <p class="kpi-val" style="color: #60A5FA;">17<span style="font-size: 14px; color: #94A3B8;"> / 18개 사수</span></p>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #94A3B8; margin-bottom: 8px;">
            <span>24시간 최저가 매칭 트렌드</span>
            <span style="color: #34D399; font-weight: 800;">마진 15% 하한선 안전</span>
          </div>
          <svg style="width: 100%; height: 44px; display: block;" viewBox="0 0 300 44" fill="none">
            <path d="M0 32 Q 40 22, 80 25 T 160 16 T 240 10 T 300 6" stroke="#34D399" stroke-width="3" fill="none" />
            <path d="M0 32 Q 40 22, 80 25 T 160 16 T 240 10 T 300 6 L 300 44 L 0 44 Z" fill="url(#em-grad)" opacity="0.25" />
            <path d="M0 38 L 300 38" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4 4" />
            <defs>
              <linearGradient id="em-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34D399" />
                <stop offset="100%" stop-color="#34D399" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div class="btn-3d-indigo">
          <span>⚡ 아이템위너 최저가 방어 엔진 가동</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });

  const scratchDir = 'D:/Antigravity/AIMaster/scratch';
  const outPng = path.join(scratchDir, 'coupang-ops-thumbnail.png');
  const outJpg = path.join(scratchDir, 'coupang-ops-thumbnail.jpg');

  // PNG로 캡처
  await page.screenshot({ path: outPng, type: 'png' });
  console.log('High-res PNG rendered:', outPng);

  // Sharp로 최적화된 1280x720 JPG로 변환
  const sharp = require('D:/Antigravity/AIMaster/coupang-ops/node_modules/sharp');
  await sharp(outPng)
    .resize(1280, 720)
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outJpg);

  console.log('Optimized JPG rendered:', outJpg);

  // 아티팩트 디렉토리 및 coupang-ops/public 복사
  const artDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\07fcc352-f8eb-42d2-b89d-e045a6909967';
  const pubDir = 'D:/Antigravity/AIMaster/coupang-ops/public';
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

  fs.copyFileSync(outJpg, path.join(artDir, 'coupang_ops_thumbnail.jpg'));
  fs.copyFileSync(outPng, path.join(artDir, 'coupang_ops_thumbnail.png'));
  fs.copyFileSync(outJpg, path.join(pubDir, 'coupang-ops-thumbnail.jpg'));
  console.log('Saved to artifact dir & coupang-ops/public successfully!');

  await browser.close();
  return outJpg;
}

renderThumbnail().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
