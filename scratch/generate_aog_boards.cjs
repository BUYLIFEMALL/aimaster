const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../reverse-prompt/package.json'));
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

  // 1. 1안(60번) 4대 화면 한눈에 보는 1장짜리 보드 (2x2 그리드, 1600x1100)
  console.log('Generating 1-page board for Concept 1 (4 views)...');
  const c1_main = toBase64(path.join(designDir, '60_figma_pro_visual_canvas/01_main.png'));
  const c1_detail = toBase64(path.join(designDir, '60_figma_pro_visual_canvas/02_detail.png'));
  const c1_guide = toBase64(path.join(designDir, '60_figma_pro_visual_canvas/03_guide.png'));
  const c1_settings = toBase64(path.join(designDir, '60_figma_pro_visual_canvas/04_settings.png'));

  const c1BoardHtml = `<!DOCTYPE html><html><head><style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", sans-serif; }
    body { background: #0F172A; color: #fff; width: 1600px; height: 1100px; padding: 24px; }
    .header { text-align: center; margin-bottom: 18px; }
    .title { font-size: 24px; font-weight: 900; }
    .sub { font-size: 13px; color: #94A3B8; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; height: 980px; }
    .card { background: #1E293B; border: 1.5px solid #334155; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
    .card-head { padding: 8px 14px; background: #0F172A; border-bottom: 1px solid #334155; font-size: 13px; font-weight: 800; color: #818CF8; display: flex; justify-content: space-between; }
    .card-img { width: 100%; flex: 1; object-fit: contain; background: #000; }
  </style></head><body>
    <div class="header">
      <div class="title">🎨 [1안 채택 추천] 60. 피그마 프로 비주얼 그래픽 캔버스 아틀리에 스타일 (4대 핵심 화면)</div>
      <div class="sub">AI 올인원 그래픽 자동화 (allinone-graphic) · 1440px 고화질 4개 뷰 한눈에 보기</div>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-head"><span>[뷰 01] 메인 그래픽 캔버스 덱</span><span style="color:#EC4899">123종 프리셋 갤러리 & 조립기</span></div>
        <img class="card-img" src="${c1_main}">
      </div>
      <div class="card">
        <div class="card-head"><span>[뷰 02] 정밀 AI 마스킹 인페인팅 뷰</span><span style="color:#EC4899">선택 영역 스마트 리필 (Inpaint)</span></div>
        <img class="card-img" src="${c1_detail}">
      </div>
      <div class="card">
        <div class="card-head"><span>[뷰 03] 올인원 그래픽 사용자 가이드북</span><span style="color:#818CF8">4단계 황금 파이프라인 & 치트시트</span></div>
        <img class="card-img" src="${c1_guide}">
      </div>
      <div class="card">
        <div class="card-head"><span>[뷰 04] 5단계 표준 로그인 & 키 설정</span><span style="color:#6366F1">2026-11-01 표준 5단계 준수</span></div>
        <img class="card-img" src="${c1_settings}">
      </div>
    </div>
  </body></html>`;

  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.setContent(c1BoardHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(brainDir, 'aog_c1_4views_onepage_board.png'), fullPage: true });
  console.log('Saved: aog_c1_4views_onepage_board.png');

  // 2. 3대 시안 메인 화면 비교 보드 (3열 배치, 1800x680)
  console.log('Generating Main 3-Views comparison board...');
  const c2_main = toBase64(path.join(designDir, '61_adobe_hyper_creative_dark_desk/01_main.png'));
  const c3_main = toBase64(path.join(designDir, '62_nano_generative_ai_art_console/01_main.png'));

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
      <div class="title">🎨 AI 올인원 그래픽 자동화 3대 시안 메인화면 한눈에 보는 비교 보드</div>
      <div class="sub">1안 (60. 피그마 프로 캔버스) vs 2안 (61. 어도비 다크 데스크) vs 3안 (62. 나노 뉴럴 아트 콘솔)</div>
    </div>
    <div class="grid">
      <div class="card" style="border-color: #6366F1;">
        <div class="card-head" style="color: #818CF8;">
          <span>1안. 60번 피그마 프로 캔버스 (추천)</span>
          <span style="background:#6366F1; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px;">⭐ 1순위 추천</span>
        </div>
        <img class="card-img" src="${c1_main}">
      </div>
      <div class="card" style="border-color: #0EA5E9;">
        <div class="card-head" style="color: #38BDF8;">
          <span>2안. 61번 어도비 다크 데스크</span>
          <span style="color:#94A3B8; font-size:11px;">포토샵 웍스테이션 감성</span>
        </div>
        <img class="card-img" src="${c2_main}">
      </div>
      <div class="card" style="border-color: #F59E0B;">
        <div class="card-head" style="color: #FBBF24;">
          <span>3안. 62번 나노 뉴럴 아트 콘솔</span>
          <span style="color:#94A3B8; font-size:11px;">차세대 멀티모달 HUD</span>
        </div>
        <img class="card-img" src="${c3_main}">
      </div>
    </div>
  </body></html>`;

  await page.setViewportSize({ width: 1800, height: 680 });
  await page.setContent(main3BoardHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(brainDir, 'aog_main_3views_onepage_board.png'), fullPage: true });
  console.log('Saved: aog_main_3views_onepage_board.png');

  // 3. 각 3대 폴더별 README.md 및 showcase_12views.html 영구 아카이빙
  console.log('Writing README.md and showcase_12views.html for each template folder...');
  const templateMeta = [
    {
      dir: '60_figma_pro_visual_canvas',
      id: 60,
      title: '60. 피그마 프로 비주얼 그래픽 캔버스 아틀리에 스타일',
      palette: '라이트 퓨어 슬레이트 (#F8FAFC) & 캔버스 화이트 (#FFFFFF) | 포인트: 피그마 인디고 (#6366F1) & 마젠타 (#EC4899)',
      btn: '.btn-3d-indigo (피그마 인디고 3D 엠보싱)',
      rec: '추천 (1순위 채택안)',
      desc: '모던 피그마/캔바 감성의 고속 비주얼 디자인 캔버스. 123종 프리셋 갤러리와 4단계 파이프라인 인디케이터 배너, 캔버스 툴바(선택, 브러시, 지우개, AI 채우기), 실시간 가이드선 및 3D 엠보싱 인디고 버튼 탑재.'
    },
    {
      dir: '61_adobe_hyper_creative_dark_desk',
      id: 61,
      title: '61. 어도비 하이퍼 크리에이티브 스튜디오 다크 데스크 스타일',
      palette: '옵시디언 다크 그레이 (#111318) & 서피스 쿨 슬레이트 (#1A1D24) | 포인트: 어도비 시안 (#0EA5E9) & 네온 에메랄드 (#10B981)',
      btn: '.btn-3d-cyan (어도비 시안 3D 엠보싱)',
      rec: '비선택 100% 템플릿 자산화',
      desc: '어도비 포토샵/일러스트레이터 전문가용 다크 그레이 워크스테이션. 1440px 와이드 다크 HUD, 123종 그리드 카드 매트릭스, 레이어 히스토리 및 정밀 브러시 피더 노브 탑재.'
    },
    {
      dir: '62_nano_generative_ai_art_console',
      id: 62,
      title: '62. 나노 제너레이티브 AI 뉴럴 아트 콘솔 스타일',
      palette: '퓨어 딥 블랙 (#0A0B10) & 사이버네틱 바이올렛 (#161324) | 포인트: 제너레이티브 골드 (#F59E0B) & 하이퍼 바이올렛 (#8B5CF6)',
      btn: '.btn-3d-gold (제너레이티브 골드 3D 엠보싱)',
      rec: '비선택 100% 템플릿 자산화',
      desc: '차세대 제미나이 3.8 / 나노바나나 제너레이티브 멀티모달 아트 HUD. 실시간 GPU 연산 VRAM 게이지, 프롬프트 시드 락커 및 LoRA 가중치 슬라이더 탑재.'
    }
  ];

  for (const tm of templateMeta) {
    const fullDir = path.join(designDir, tm.dir);
    const readme = `# ${tm.title}

- **템플릿 번호**: ${tm.id}
- **프로그램**: AI 올인원 그래픽 자동화 (\`allinone-graphic\`)
- **버전**: \`v1.0.5\`
- **배색 테마**: ${tm.palette}
- **3D 엠보싱 버튼 규격**: \`${tm.btn}\`
- **추천 여부**: **${tm.rec}**
- **상세 설명**: ${tm.desc}

## 4대 핵심 화면 캡처 목록 (1440px 고해상도)
1. \`01_main.png\` - 메인 123종 프리셋 갤러리 및 실물 비주얼 캔버스 덱
2. \`02_detail.png\` - 정밀 AI 마스킹 인페인팅 & 벡터 에디터 뷰
3. \`03_guide.png\` - 4단계 파이프라인 및 종횡비 치트시트 가이드북
4. \`04_settings.png\` - 2026-11-01 표준 5단계 수직 레이아웃 로그인 & 키 설정
`;
    fs.writeFileSync(path.join(fullDir, 'README.md'), readme, 'utf8');

    const standaloneHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${tm.title} - 독립 쇼케이스</title>
    <style>
      body { background: #0F172A; color: #fff; font-family: sans-serif; padding: 30px; }
      h1 { font-size: 24px; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .card { background: #1E293B; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
      .card-title { padding: 12px; font-weight: bold; background: #0F172A; }
      img { width: 100%; display: block; }
    </style></head><body>
      <h1>🎨 ${tm.title} (독립 4개 뷰)</h1>
      <div class="grid">
        <div class="card"><div class="card-title">01_main.png (메인 캔버스)</div><img src="01_main.png"></div>
        <div class="card"><div class="card-title">02_detail.png (상세 인페인팅)</div><img src="02_detail.png"></div>
        <div class="card"><div class="card-title">03_guide.png (가이드북)</div><img src="03_guide.png"></div>
        <div class="card"><div class="card-title">04_settings.png (5단계 로그인)</div><img src="04_settings.png"></div>
      </div>
    </body></html>`;
    fs.writeFileSync(path.join(fullDir, 'showcase_12views.html'), standaloneHtml, 'utf8');
  }

  // 4. D:\Antigravity\Design\showcase.html 업데이트 (상단 종합 비교표 + 12뷰 3열 그리드 + 1440px 라이트박스 팝업)
  console.log('Updating D:/Antigravity/Design/showcase.html and comparison.html...');

  const showcaseHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 올인원 그래픽 자동화 - 4대 화면 3시안 쇼케이스</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif; }
    body { background: #07090E; color: #F0F6FC; padding: 32px; }
    .header { text-align: center; margin-bottom: 32px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 9999px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); color: #818CF8; font-size: 12px; font-weight: 800; margin-bottom: 12px; }
    h1 { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; }
    h1 span { color: #818CF8; }
    p.sub { font-size: 14px; color: #8B949E; margin-top: 6px; }

    /* 종합 비교표 */
    .comparison-section { background: #0E131F; border: 1px solid #1E293B; border-radius: 20px; padding: 24px; margin-bottom: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .section-title { font-size: 18px; font-weight: 900; color: #fff; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .comparison-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    .comparison-table th { background: #141B2D; color: #8B949E; padding: 14px 16px; font-weight: 800; border-bottom: 2px solid #283342; }
    .comparison-table td { padding: 14px 16px; border-bottom: 1px solid #1E293B; vertical-align: middle; line-height: 1.5; }
    .comparison-table tr:hover { background: rgba(255,255,255,0.02); }
    .rec-badge { background: #6366F1; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; }
    .save-badge { background: #1E293B; color: #8B949E; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #283342; }

    /* 12개 뷰 쇼케이스 그리드 (3열) */
    .views-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .view-card { background: #0E131F; border: 1.5px solid #1E293B; border-radius: 16px; overflow: hidden; transition: all 0.2s ease; cursor: pointer; display: flex; flex-direction: column; }
    .view-card:hover { transform: translateY(-4px); border-color: #6366F1; box-shadow: 0 12px 30px rgba(99, 102, 241, 0.25); }
    .card-head { padding: 12px 18px; background: #141B2D; border-bottom: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-size: 14px; font-weight: 800; color: #fff; }
    .card-tag { font-size: 11px; font-weight: 800; }
    .card-preview { width: 100%; aspect-ratio: 16/10; object-fit: cover; background: #000; display: block; border-bottom: 1px solid #1E293B; }
    .card-desc { padding: 12px 18px; font-size: 12px; color: #8B949E; line-height: 1.4; flex: 1; }

    /* 라이트박스 팝업 모달 */
    .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999; justify-content: center; align-items: center; padding: 24px; backdrop-filter: blur(8px); }
    .lightbox.active { display: flex; }
    .lightbox-content { max-width: 95vw; max-height: 92vh; position: relative; display: flex; flex-direction: column; align-items: center; }
    .lightbox-img { max-width: 100%; max-height: 85vh; border-radius: 12px; border: 2px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); }
    .lightbox-title { margin-top: 12px; font-size: 16px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 12px; }
    .lightbox-close { position: absolute; top: -40px; right: 0; background: #334155; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer; }
    .lightbox-close:hover { background: #6366F1; }
    .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(30, 41, 59, 0.8); color: #fff; border: 1px solid #475569; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; cursor: pointer; }
    .lightbox-nav:hover { background: #6366F1; border-color: #818CF8; }
    .nav-prev { left: -70px; }
    .nav-next { right: -70px; }
  </style>
</head>
<body>

  <!-- 헤더 -->
  <header class="header">
    <div class="badge">🎨 AIMASTER ALL-IN-ONE GRAPHIC STUDIO · 4대 핵심 화면 3시안 쇼케이스</div>
    <h1>AI 올인원 <span>그래픽 자동화</span> 디자인 시안 종합 보고</h1>
    <p class="sub">123종 전문 디자인 템플릿 · 실시간 캔버스 마스킹 & 인페인팅 · 4대 핵심 화면(메인/상세/가이드/설정) 1440px 고화질 비교</p>
  </header>

  <!-- 1. 상단 「4대 화면 3시안 한눈에 보는 종합 비교표」 필수 탑재 -->
  <section class="comparison-section">
    <div class="section-title">
      <span>📊 4대 화면 3시안 한눈에 보는 종합 비교 매트릭스</span>
      <a href="/comparison.html" style="font-size: 12px; color: #818CF8; text-decoration: none; font-weight: 700;">독립 비교표 페이지 열기 →</a>
    </div>
    <table class="comparison-table">
      <thead>
        <tr>
          <th style="width: 14%;">구분 / 템플릿</th>
          <th style="width: 22%;">핵심 테마 & 배색 규격</th>
          <th style="width: 22%;">메인 & 상세 캔버스 인터랙션</th>
          <th style="width: 22%;">가이드 & 5단계 표준 로그인</th>
          <th style="width: 12%;">3D 버튼 규격</th>
          <th style="width: 8%;">추천 여부</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: rgba(99, 102, 241, 0.05); border-left: 3px solid #6366F1;">
          <td>
            <div style="font-weight: 900; font-size: 14px; color: #818CF8;">1안 (60번)</div>
            <div style="font-size: 11px; color: #fff; font-weight: 700; margin-top: 2px;">피그마 프로 캔버스</div>
          </td>
          <td>
            <strong style="color: #fff;">피그마 프로 비주얼 아틀리에</strong><br>
            <span style="font-size: 11px; color: #94A3B8;">라이트 퓨어 슬레이트 (#F8FAFC) & 캔버스 화이트 (#FFFFFF) | 피그마 인디고 (#6366F1) & 마젠타 (#EC4899)</span>
          </td>
          <td>
            • 4단계 파이프라인 인디케이터 배너<br>
            • 123종 프리셋 갤러리 & 카테고리 칩<br>
            • 모눈 룰러 캔버스 & 24px 마스킹 인페인팅<br>
            • 1:1, 16:9, 9:16 종횡비 즉시 전환
          </td>
          <td>
            • 4단계 황금 제작 파이프라인 가이드<br>
            • 64px 다이아몬드 로고 + 영문 뱃지<br>
            • 볼드 한글 타이틀 + 3D 인디고 버튼<br>
            • 1행 약관 축소 표준 규격 준수
          </td>
          <td>
            <code style="color: #818CF8; font-weight: 800;">.btn-3d-indigo</code><br>
            <span style="font-size: 10px; color: #64748B;">인디고 3D 엠보싱</span>
          </td>
          <td>
            <span class="rec-badge">⭐ 1순위 추천</span>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-weight: 900; font-size: 14px; color: #38BDF8;">2안 (61번)</div>
            <div style="font-size: 11px; color: #fff; font-weight: 700; margin-top: 2px;">어도비 다크 데스크</div>
          </td>
          <td>
            <strong style="color: #fff;">어도비 하이퍼 크리에이티브</strong><br>
            <span style="font-size: 11px; color: #94A3B8;">옵시디언 다크 그레이 (#111318) & 서피스 쿨 슬레이트 (#1A1D24) | 어도비 시안 (#0EA5E9) & 에메랄드 (#10B981)</span>
          </td>
          <td>
            • 1440px 와이드 전문가용 다크 HUD<br>
            • 123종 그리드 카드 매트릭스<br>
            • 레이어 히스토리 및 정밀 브러시 노브<br>
            • 포토샵 감성 다크 캔버스
          </td>
          <td>
            • 어도비 전문가 작업 수칙 가이드<br>
            • 다크 64px 심볼 + 시안 뱃지<br>
            • 3D 시안 로그인 버튼<br>
            • 1행 약관 축소 표준 규격 준수
          </td>
          <td>
            <code style="color: #38BDF8; font-weight: 800;">.btn-3d-cyan</code><br>
            <span style="font-size: 10px; color: #64748B;">시안 블루 3D</span>
          </td>
          <td>
            <span class="save-badge">자산화</span>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-weight: 900; font-size: 14px; color: #FBBF24;">3안 (62번)</div>
            <div style="font-size: 11px; color: #fff; font-weight: 700; margin-top: 2px;">나노 뉴럴 아트 콘솔</div>
          </td>
          <td>
            <strong style="color: #fff;">나노 제너레이티브 AI 아트</strong><br>
            <span style="font-size: 11px; color: #94A3B8;">퓨어 딥 블랙 (#0A0B10) & 사이버 바이올렛 (#161324) | 제너레이티브 골드 (#F59E0B) & 바이올렛 (#8B5CF6)</span>
          </td>
          <td>
            • 실시간 AI GPU VRAM & 텐서 게이지<br>
            • 프롬프트 시드 락커 & LoRA 슬라이더<br>
            • 제미나이 3.8 나노바나나 엔진 HUD<br>
            • 사이버네틱 멀티모달 콘솔
          </td>
          <td>
            • AI 뉴럴 디퓨전 프롬프트 바이블<br>
            • 사이버 64px 골드 로고<br>
            • 3D 골드 엠보싱 로그인 버튼<br>
            • 1행 약관 축소 표준 규격 준수
          </td>
          <td>
            <code style="color: #FBBF24; font-weight: 800;">.btn-3d-gold</code><br>
            <span style="font-size: 10px; color: #64748B;">골드 3D 엠보싱</span>
          </td>
          <td>
            <span class="save-badge">자산화</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- 2. 12개 뷰 쇼케이스 그리드 (3열) -->
  <section>
    <div style="font-size: 18px; font-weight: 900; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
      <span>🖼️ 4대 화면 × 3대 시안 = 12개 뷰 인터랙티브 쇼케이스 (카드 클릭 시 1440px 원본 확대)</span>
      <span style="font-size: 12px; color: #8B949E;">💡 좌우 방향키 및 ESC 지원</span>
    </div>

    <div class="views-grid" id="galleryGrid">
      ${[
        { concept: '1안. 60번 피그마 프로 캔버스 (추천)', view: '01_main (메인 캔버스 덱)', img: '60_figma_pro_visual_canvas/01_main.png', tag: '1순위 추천안', color: '#6366F1', desc: '123종 프리셋 갤러리와 4단계 파이프라인 인디케이터 배너, 모눈 룰러 캔버스, .btn-3d-indigo 버튼 탑재' },
        { concept: '2안. 61번 어도비 다크 데스크', view: '01_main (메인 다크 HUD)', img: '61_adobe_hyper_creative_dark_desk/01_main.png', tag: '포토샵 감성', color: '#0EA5E9', desc: '옵시디언 다크 그레이 1440px 와이드 전문가용 HUD, 123종 카드 매트릭스, .btn-3d-cyan 버튼' },
        { concept: '3안. 62번 나노 뉴럴 콘솔', view: '01_main (뉴럴 디퓨전 HUD)', img: '62_nano_generative_ai_art_console/01_main.png', tag: '멀티모달 감성', color: '#F59E0B', desc: '실시간 AI GPU VRAM & 텐서 게이지, 프롬프트 시드 락커 및 LoRA 슬라이더, .btn-3d-gold 버튼' },

        { concept: '1안. 60번 피그마 프로 캔버스 (추천)', view: '02_detail (정밀 AI 인페인팅)', img: '60_figma_pro_visual_canvas/02_detail.png', tag: '1순위 추천안', color: '#6366F1', desc: '선택 영역 마스킹 브러시, AI Prompt Re-Fill 타겟존, 4K PNG / 벡터 SVG 원클릭 내보내기' },
        { concept: '2안. 61번 어도비 다크 데스크', view: '02_detail (상세 인스펙터 콘솔)', img: '61_adobe_hyper_creative_dark_desk/02_detail.png', tag: '포토샵 감성', color: '#0EA5E9', desc: '다크 워크스테이션 인페인팅 뷰, 레이어 마스크 히스토리 및 정밀 브러시 피더' },
        { concept: '3안. 62번 나노 뉴럴 콘솔', view: '02_detail (뉴럴 인페인팅 HUD)', img: '62_nano_generative_ai_art_console/02_detail.png', tag: '멀티모달 감성', color: '#F59E0B', desc: '제미나이 3.8 나노바나나 엔진 연동, 실시간 VRAM 텐서 연산 및 블렌딩 제어' },

        { concept: '1안. 60번 피그마 프로 캔버스 (추천)', view: '03_guide (사용자 가이드북)', img: '60_figma_pro_visual_canvas/03_guide.png', tag: '1순위 추천안', color: '#6366F1', desc: '4단계 황금 제작 파이프라인 공식, 목적별 종횡비 최적화 치트시트 및 상업용 라이선스 FAQ' },
        { concept: '2안. 61번 어도비 다크 데스크', view: '03_guide (전문가 워크플로우)', img: '61_adobe_hyper_creative_dark_desk/03_guide.png', tag: '포토샵 감성', color: '#0EA5E9', desc: '디자이너를 위한 벡터 에셋 활용 수칙 및 대형 인쇄물 규격 가이드' },
        { concept: '3안. 62번 나노 뉴럴 콘솔', view: '03_guide (AI 프롬프트 바이블)', img: '62_nano_generative_ai_art_console/03_guide.png', tag: '멀티모달 감성', color: '#F59E0B', desc: '생성형 비주얼 프롬프트 파라미터 조합 공식 및 LoRA 가중치 튜닝 팁' },

        { concept: '1안. 60번 피그마 프로 캔버스 (추천)', view: '04_settings (5단계 표준 로그인)', img: '60_figma_pro_visual_canvas/04_settings.png', tag: '2026-11-01 표준', color: '#6366F1', desc: '64px 다이아몬드 로고 + 영문 뱃지 + 한글명 + 폼 카드 2단 탭 + .btn-3d-indigo + 1행 축소 약관' },
        { concept: '2안. 61번 어도비 다크 데스크', view: '04_settings (5단계 다크 로그인)', img: '61_adobe_hyper_creative_dark_desk/04_settings.png', tag: '2026-11-01 표준', color: '#0EA5E9', desc: '다크 워크스테이션 감성 64px 심볼 + 시안 뱃지 + .btn-3d-cyan + 1행 축소 약관' },
        { concept: '3안. 62번 나노 뉴럴 콘솔', view: '04_settings (5단계 사이버 로그인)', img: '62_nano_generative_ai_art_console/04_settings.png', tag: '2026-11-01 표준', color: '#F59E0B', desc: '사이버네틱 64px 골드 로고 + 바이올렛 뱃지 + .btn-3d-gold + 1행 축소 약관' }
      ].map((item, idx) => `
        <div class="view-card" onclick="openLightbox(${idx})">
          <div class="card-head">
            <span class="card-title">${item.view}</span>
            <span class="card-tag" style="color: ${item.color};">${item.tag}</span>
          </div>
          <img class="card-preview" src="${item.img}" alt="${item.view}" loading="lazy">
          <div class="card-desc">
            <div style="font-weight: 800; color: #fff; margin-bottom: 4px;">${item.concept}</div>
            <div>${item.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </section>

  <!-- 라이트박스 모달 -->
  <div class="lightbox" id="lightboxModal" onclick="closeLightbox(event)">
    <div class="lightbox-content" onclick="event.stopPropagation()">
      <button class="lightbox-close" onclick="closeLightbox()">✕ 닫기 (ESC)</button>
      <div class="lightbox-nav nav-prev" onclick="changeImage(-1)">‹</div>
      <img class="lightbox-img" id="lightboxImg" src="" alt="확대 뷰">
      <div class="lightbox-nav nav-next" onclick="changeImage(1)">›</div>
      <div class="lightbox-title" id="lightboxTitle"></div>
    </div>
  </div>

  <script>
    const images = ${JSON.stringify([
      { title: '1안. 60번 피그마 프로 캔버스 - 01_main (메인 캔버스 덱)', src: '60_figma_pro_visual_canvas/01_main.png' },
      { title: '2안. 61번 어도비 다크 데스크 - 01_main (메인 다크 HUD)', src: '61_adobe_hyper_creative_dark_desk/01_main.png' },
      { title: '3안. 62번 나노 뉴럴 콘솔 - 01_main (뉴럴 디퓨전 HUD)', src: '62_nano_generative_ai_art_console/01_main.png' },
      { title: '1안. 60번 피그마 프로 캔버스 - 02_detail (정밀 AI 인페인팅)', src: '60_figma_pro_visual_canvas/02_detail.png' },
      { title: '2안. 61번 어도비 다크 데스크 - 02_detail (상세 인스펙터 콘솔)', src: '61_adobe_hyper_creative_dark_desk/02_detail.png' },
      { title: '3안. 62번 나노 뉴럴 콘솔 - 02_detail (뉴럴 인페인팅 HUD)', src: '62_nano_generative_ai_art_console/02_detail.png' },
      { title: '1안. 60번 피그마 프로 캔버스 - 03_guide (사용자 가이드북)', src: '60_figma_pro_visual_canvas/03_guide.png' },
      { title: '2안. 61번 어도비 다크 데스크 - 03_guide (전문가 워크플로우)', src: '61_adobe_hyper_creative_dark_desk/03_guide.png' },
      { title: '3안. 62번 나노 뉴럴 콘솔 - 03_guide (AI 프롬프트 바이블)', src: '62_nano_generative_ai_art_console/03_guide.png' },
      { title: '1안. 60번 피그마 프로 캔버스 - 04_settings (5단계 표준 로그인)', src: '60_figma_pro_visual_canvas/04_settings.png' },
      { title: '2안. 61번 어도비 다크 데스크 - 04_settings (5단계 다크 로그인)', src: '61_adobe_hyper_creative_dark_desk/04_settings.png' },
      { title: '3안. 62번 나노 뉴럴 콘솔 - 04_settings (5단계 사이버 로그인)', src: '62_nano_generative_ai_art_console/04_settings.png' }
    ])};

    let currentIndex = 0;

    function openLightbox(index) {
      currentIndex = index;
      updateLightbox();
      document.getElementById('lightboxModal').classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox(event) {
      document.getElementById('lightboxModal').classList.remove('active');
      document.body.style.overflow = 'auto';
    }

    function changeImage(direction) {
      currentIndex = (currentIndex + direction + images.length) % images.length;
      updateLightbox();
    }

    function updateLightbox() {
      const item = images[currentIndex];
      document.getElementById('lightboxImg').src = item.src;
      document.getElementById('lightboxTitle').innerHTML = '<span>' + item.title + '</span><span style="color:#818CF8; font-size:12px;">(' + (currentIndex + 1) + ' / ' + images.length + ')</span>';
    }

    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('lightboxModal');
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') changeImage(-1);
      if (e.key === 'ArrowRight') changeImage(1);
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(designDir, 'showcase.html'), showcaseHtml, 'utf8');

  // 독립 비교표 페이지 comparison.html 생성
  const comparisonOnlyHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 올인원 그래픽 자동화 - 4대 화면 3시안 종합 비교표</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif; }
    body { background: #07090E; color: #F0F6FC; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 900; }
    h1 span { color: #818CF8; }
    .comparison-section { background: #0E131F; border: 1px solid #1E293B; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .comparison-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    .comparison-table th { background: #141B2D; color: #8B949E; padding: 14px 16px; font-weight: 800; border-bottom: 2px solid #283342; }
    .comparison-table td { padding: 14px 16px; border-bottom: 1px solid #1E293B; vertical-align: middle; line-height: 1.5; }
    .rec-badge { background: #6366F1; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; }
    .save-badge { background: #1E293B; color: #8B949E; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #283342; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 AI 올인원 <span>그래픽 자동화</span> 4대 화면 3시안 종합 비교표</h1>
    <p style="font-size: 13px; color: #8B949E; margin-top: 6px;"><a href="/showcase.html" style="color: #818CF8; text-decoration: none;">← 전체 12뷰 인터랙티브 쇼케이스로 돌아가기</a></p>
  </div>
  <section class="comparison-section">
    <table class="comparison-table">
      <thead>
        <tr>
          <th style="width: 14%;">구분 / 템플릿</th>
          <th style="width: 22%;">핵심 테마 & 배색 규격</th>
          <th style="width: 22%;">메인 & 상세 캔버스 인터랙션</th>
          <th style="width: 22%;">가이드 & 5단계 표준 로그인</th>
          <th style="width: 12%;">3D 버튼 규격</th>
          <th style="width: 8%;">추천 여부</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: rgba(99, 102, 241, 0.05); border-left: 3px solid #6366F1;">
          <td>
            <div style="font-weight: 900; font-size: 14px; color: #818CF8;">1안 (60번)</div>
            <div style="font-size: 11px; color: #fff; font-weight: 700; margin-top: 2px;">피그마 프로 캔버스</div>
          </td>
          <td>
            <strong style="color: #fff;">피그마 프로 비주얼 아틀리에</strong><br>
            <span style="font-size: 11px; color: #94A3B8;">라이트 퓨어 슬레이트 (#F8FAFC) & 캔버스 화이트 (#FFFFFF) | 피그마 인디고 (#6366F1) & 마젠타 (#EC4899)</span>
          </td>
          <td>
            • 4단계 파이프라인 인디케이터 배너<br>
            • 123종 프리셋 갤러리 & 카테고리 칩<br>
            • 모눈 룰러 캔버스 & 24px 마스킹 인페인팅<br>
            • 1:1, 16:9, 9:16 종횡비 즉시 전환
          </td>
          <td>
            • 4단계 황금 제작 파이프라인 가이드<br>
            • 64px 다이아몬드 로고 + 영문 뱃지<br>
            • 볼드 한글 타이틀 + 3D 인디고 버튼<br>
            • 1행 약관 축소 표준 규격 준수
          </td>
          <td>
            <code style="color: #818CF8; font-weight: 800;">.btn-3d-indigo</code><br>
            <span style="font-size: 10px; color: #64748B;">인디고 3D 엠보싱</span>
          </td>
          <td>
            <span class="rec-badge">⭐ 1순위 추천</span>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-weight: 900; font-size: 14px; color: #38BDF8;">2안 (61번)</div>
            <div style="font-size: 11px; color: #fff; font-weight: 700; margin-top: 2px;">어도비 다크 데스크</div>
          </td>
          <td>
            <strong style="color: #fff;">어도비 하이퍼 크리에이티브</strong><br>
            <span style="font-size: 11px; color: #94A3B8;">옵시디언 다크 그레이 (#111318) & 서피스 쿨 슬레이트 (#1A1D24) | 어도비 시안 (#0EA5E9) & 에메랄드 (#10B981)</span>
          </td>
          <td>
            • 1440px 와이드 전문가용 다크 HUD<br>
            • 123종 그리드 카드 매트릭스<br>
            • 레이어 히스토리 및 정밀 브러시 노브<br>
            • 포토샵 감성 다크 캔버스
          </td>
          <td>
            • 어도비 전문가 작업 수칙 가이드<br>
            • 다크 64px 심볼 + 시안 뱃지<br>
            • 3D 시안 로그인 버튼<br>
            • 1행 약관 축소 표준 규격 준수
          </td>
          <td>
            <code style="color: #38BDF8; font-weight: 800;">.btn-3d-cyan</code><br>
            <span style="font-size: 10px; color: #64748B;">시안 블루 3D</span>
          </td>
          <td>
            <span class="save-badge">자산화</span>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-weight: 900; font-size: 14px; color: #FBBF24;">3안 (62번)</div>
            <div style="font-size: 11px; color: #fff; font-weight: 700; margin-top: 2px;">나노 뉴럴 아트 콘솔</div>
          </td>
          <td>
            <strong style="color: #fff;">나노 제너레이티브 AI 아트</strong><br>
            <span style="font-size: 11px; color: #94A3B8;">퓨어 딥 블랙 (#0A0B10) & 사이버 바이올렛 (#161324) | 제너레이티브 골드 (#F59E0B) & 바이올렛 (#8B5CF6)</span>
          </td>
          <td>
            • 실시간 AI GPU VRAM & 텐서 게이지<br>
            • 프롬프트 시드 락커 & LoRA 슬라이더<br>
            • 제미나이 3.8 나노바나나 엔진 HUD<br>
            • 사이버네틱 멀티모달 콘솔
          </td>
          <td>
            • AI 뉴럴 디퓨전 프롬프트 바이블<br>
            • 사이버 64px 골드 로고<br>
            • 3D 골드 엠보싱 로그인 버튼<br>
            • 1행 약관 축소 표준 규격 준수
          </td>
          <td>
            <code style="color: #FBBF24; font-weight: 800;">.btn-3d-gold</code><br>
            <span style="font-size: 10px; color: #64748B;">골드 3D 엠보싱</span>
          </td>
          <td>
            <span class="save-badge">자산화</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</body>
</html>`;

  fs.writeFileSync(path.join(designDir, 'comparison.html'), comparisonOnlyHtml, 'utf8');

  // 5. 쇼케이스 라이브 웹페이지 캡처 (포트 3800 검증)
  console.log('Capturing live showcase on port 3800...');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('http://localhost:3800/showcase.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(brainDir, 'aog_showcase_live_verified.png'), fullPage: false });
  console.log('Saved: aog_showcase_live_verified.png');

  // 6. 독립 비교표 라이브 웹페이지 캡처
  await page.goto('http://localhost:3800/comparison.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(brainDir, 'aog_comparison_live_verified.png'), fullPage: false });
  console.log('Saved: aog_comparison_live_verified.png');

  // 7. 라이트박스 팝업 클릭 검증 캡처
  await page.goto('http://localhost:3800/showcase.html', { waitUntil: 'networkidle' });
  await page.click('.view-card'); // 첫번째 카드 클릭
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(brainDir, 'aog_lightbox_verified.png'), fullPage: false });
  console.log('Saved: aog_lightbox_verified.png');

  await browser.close();
  console.log('ALL BOARDS, SHOWCASE & VERIFICATION COMPLETED!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
