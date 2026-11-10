import fs from 'fs';
import path from 'path';

const BASE_DIR = 'D:/Antigravity/Design';

const concepts = [
  {
    num: 1,
    id: '91_insta_neon_sunset_creator_studio',
    folder: '91_insta_neon_sunset_creator_studio/insta_auto_poster',
    name: '91. 인스타 네온 선셋 크리에이터 스튜디오 스타일',
    shortName: '1안 (인스타 선셋 스튜디오)',
    badge: '🏆 1순위 추천 (인스타 오리지널 네온 선셋 & 딥 스페이스 블랙)',
    color: '#E1306C',
    bg: '#0B0E14',
    theme: '딥 스페이스 블랙 + 네온 선셋 그라데이션 + 소프트 퍼플',
    font: 'Pretendard Variable',
    btn: '.btn-3d-insta-sunset (선셋 그라데이션 3D 엠보싱)',
    desc: '인스타그램 공식 브랜드의 역동적 선셋 그라데이션과 1:1 스마트폰 뷰파인더 덱을 완비한 1순위 추천 크리에이터 스튜디오'
  },
  {
    num: 2,
    id: '92_clean_insta_magazine_editorial_atelier',
    folder: '92_clean_insta_magazine_editorial_atelier/insta_auto_poster',
    name: '92. 클린 인스타 매거진 에디토리얼 아틀리에 스타일',
    shortName: '2안 (인스타 매거진 아틀리에)',
    badge: '⚡ 2순위 대안 (클린 화이트 & 소프트 로즈 골드 & 웜 슬레이트)',
    color: '#E06D83',
    bg: '#FAF9F6',
    theme: '소프트 크림 페이퍼 + 로즈 골드 + 모던 차콜 잉크',
    font: 'Pretendard Variable',
    btn: '.btn-3d-rose-gold (로즈 골드 3D 엠보싱)',
    desc: '감성 라이프스타일 매거진 감성의 단정하고 화사한 레이아웃으로 장시간 콘텐츠 큐레이션 피로를 줄여주는 라이트 아틀리에'
  },
  {
    num: 3,
    id: '93_quant_insta_algorithm_radar_console',
    folder: '93_quant_insta_algorithm_radar_console/insta_auto_poster',
    name: '93. 퀀트 인스타 알고리즘 레이더 HUD 콘솔 스타일',
    shortName: '3안 (퀀트 알고리즘 레이더)',
    badge: '🌿 3순위 대안 (옵시디언 딥블랙 & 일렉트릭 마젠타 & 사이버 사이안)',
    color: '#D946EF',
    bg: '#070A10',
    theme: '옵시디언 딥블랙 + 일렉트릭 마젠타 + 사이버 사이안 HUD',
    font: 'JetBrains Mono / Pretendard',
    btn: '.btn-3d-neon-magenta (네온 마젠타 3D 엠보싱)',
    desc: '탐색 탭(Explore) 도달 알고리즘, 반응률 지수, 황금 포스팅 시간대를 초당 관제하는 전문 퍼포먼스 마케터용 퀀트 콘솔'
  }
];

const screens = [
  { id: '01_main', title: '1. 메인 대시보드 & 4단계 인스타 파이프라인', desc: '연동 계정 4개, 당월 발행 86건, 예약 14건, Explore 도달률 +284%, 최근 피드 프리뷰 & 실시간 발행 로그' },
  { id: '02_detail', title: '2. AI 피드/카드뉴스 에디터 & 1:1 스마트폰 뷰파인더 덱', desc: '1:1 정방형/9:16 릴스 선택, 3단 페르소나 어투, 본문 에디터, 30개 해시태그 칩셋 & 실제 인스타 UI 뷰파인더 목업' },
  { id: '03_guide', title: '3. Meta 공식 Graph API & 쉐도우밴 안전 마스터 가이드북', desc: 'Meta for Developers 비즈니스 연동 3분 가이드, 쉐도우밴 100% 방지 5대 수칙, Explore 추천 알고리즘 3원칙' },
  { id: '04_settings', title: '4. Meta 비즈니스 연동 & 2026-11-01 5단계 표준 로그인', desc: '68px 선셋 심볼 로고 + 알약 뱃지 + 볼드 한글명 + 2단 탭 폼 + 1행 축소 약관 동의 규격 100% 준수 & Facebook 페이지 매핑' }
];

function buildMasterShowcaseHtml() {
  let cardsHtml = '';
  let viewIndex = 0;

  for (let sIdx = 0; sIdx < screens.length; sIdx++) {
    const s = screens[sIdx];
    cardsHtml += `
      <div class="row-header">
        <h2>화면 ${s.title}</h2>
        <p>${s.desc}</p>
      </div>
      <div class="views-grid">
    `;

    for (let cIdx = 0; cIdx < concepts.length; cIdx++) {
      const c = concepts[cIdx];
      const imgRelative = `${c.folder}/${s.id}.png`;
      const currentIdx = viewIndex++;

      cardsHtml += `
        <div class="view-card" data-idx="${currentIdx}" data-concept="${c.name}" data-screen="${s.title}" data-src="${imgRelative}">
          <div class="card-top">
            <span class="badge" style="background:${c.color}22; color:${c.color}; border:1px solid ${c.color}44;">${c.shortName}</span>
            <span class="view-num">View #${currentIdx + 1}</span>
          </div>
          <div class="img-wrap">
            <img src="${imgRelative}" alt="${c.name} - ${s.title}" loading="lazy">
            <div class="zoom-overlay">
              <span class="zoom-btn">🔍 1440px 고화질 팝업 확대</span>
            </div>
          </div>
          <div class="card-bottom">
            <div class="card-title">${c.name}</div>
            <div class="card-meta">${s.title}</div>
          </div>
        </div>
      `;
    }

    cardsHtml += `</div>`;
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INSTA 포스팅 자동화 4대 화면 3시안 쇼케이스</title>
  <style>
    :root {
      --bg: #0B0E14;
      --card: #131822;
      --card2: #1C2333;
      --border: #232E42;
      --border-bright: #384A6B;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #E1306C;
      --accent: #FD1D1D;
      --gold: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
      padding: 30px 40px 100px;
      line-height: 1.5;
    }
    header {
      text-align: center;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .header-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 20px;
      background: rgba(225,48,108,0.15);
      color: var(--brand);
      border: 1px solid rgba(225,48,108,0.3);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #FFF 50%, var(--brand) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: var(--muted);
      font-size: 14px;
      max-width: 850px;
      margin: 0 auto 16px;
    }
    .quick-links {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 14px;
    }
    .quick-links a {
      color: var(--brand);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 14px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      transition: all 0.2s;
    }
    .quick-links a:hover {
      border-color: var(--brand);
      background: var(--card2);
    }

    /* 상단 종합 비교 매트릭스 표 (Table) 필수 탑재 */
    .comparison-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .comparison-title {
      font-size: 18px;
      font-weight: 900;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .comp-table th {
      background: var(--card2);
      padding: 12px 14px;
      text-align: left;
      font-weight: 800;
      border-bottom: 2px solid var(--border-bright);
      color: var(--text);
    }
    .comp-table td {
      padding: 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .comp-table tr:hover td {
      background: rgba(255,255,255,0.02);
    }
    .badge-recommend {
      background: rgba(225,48,108,0.2);
      color: #E1306C;
      border: 1px solid #E1306C;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      display: inline-block;
    }
    .badge-sub {
      background: rgba(224,109,131,0.15);
      color: #E06D83;
      border: 1px solid rgba(224,109,131,0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      display: inline-block;
    }

    /* 4대 화면 그룹 */
    .row-header {
      margin-top: 40px;
      margin-bottom: 18px;
      padding-left: 6px;
      border-left: 4px solid var(--brand);
    }
    .row-header h2 {
      font-size: 20px;
      font-weight: 900;
      color: #FFF;
      margin-bottom: 4px;
    }
    .row-header p {
      font-size: 13px;
      color: var(--muted);
    }

    /* 3열 그리드 */
    .views-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      margin-bottom: 30px;
    }
    @media (max-width: 1200px) {
      .views-grid { grid-template-columns: 1fr; }
    }

    .view-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .view-card:hover {
      transform: translateY(-4px);
      border-color: var(--brand);
      box-shadow: 0 12px 30px rgba(225,48,108,0.25);
    }
    .card-top {
      padding: 12px 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-top .badge {
      font-size: 11px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .card-top .view-num {
      font-size: 11px;
      color: var(--muted);
      font-family: monospace;
      font-weight: 700;
    }
    .img-wrap {
      position: relative;
      background: #000;
      aspect-ratio: 16/9.8;
      overflow: hidden;
    }
    .img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      display: block;
      transition: transform 0.3s;
    }
    .view-card:hover .img-wrap img {
      transform: scale(1.02);
    }
    .zoom-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .view-card:hover .zoom-overlay {
      opacity: 1;
    }
    .zoom-btn {
      background: var(--brand);
      color: #FFF;
      padding: 10px 18px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    }
    .card-bottom {
      padding: 14px 16px;
      background: var(--card);
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 4px;
    }
    .card-meta {
      font-size: 12px;
      color: var(--muted);
    }

    /* 라이트박스 모달 */
    .lightbox-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      backdrop-filter: blur(8px);
      z-index: 99999;
      flex-direction: column;
    }
    .lightbox-modal.active {
      display: flex;
    }
    .lb-header {
      padding: 16px 24px;
      background: rgba(19,24,34,0.9);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .lb-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .lb-title {
      font-size: 16px;
      font-weight: 900;
      color: #FFF;
    }
    .lb-screen {
      font-size: 13px;
      color: var(--muted);
    }
    .lb-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .lb-btn {
      background: var(--card2);
      border: 1px solid var(--border-bright);
      color: #FFF;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
    }
    .lb-btn:hover {
      background: var(--brand);
      color: #FFF;
      border-color: var(--brand);
    }
    .lb-close {
      background: #EF4444;
      border: none;
      color: #FFF;
      font-weight: 900;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .lb-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: auto;
      padding: 20px 0;
    }
    .lb-img {
      max-width: 95%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      border: 1px solid var(--border);
    }
    .lb-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(19,24,34,0.8);
      border: 1px solid var(--border-bright);
      color: #FFF;
      font-size: 24px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .lb-nav-btn:hover {
      background: var(--brand);
      color: #FFF;
      border-color: var(--brand);
    }
    .lb-prev { left: 20px; }
    .lb-next { right: 20px; }
  </style>
</head>
<body>

  <header>
    <div class="header-badge">🎨 AIMaster DESIGN PROPOSAL • PORT 3800</div>
    <h1>INSTA 포스팅 자동화 4대 화면 3시안 쇼케이스</h1>
    <p class="subtitle">
      Meta 공식 Graph API(v21.0) 100% 무결성 파이프라인 • 1:1 스마트폰 뷰파인더 덱 • 2026-11-01 5단계 표준 로그인 규격 • 3D 엠보싱 버튼 탑재
    </p>
    <div class="quick-links">
      <a href="http://localhost:3800/comparison.html">📊 종합 비교표 단독 뷰어 (comparison.html)</a>
      <a href="https://insta-auto-poster.buylife.xyz" target="_blank">🌐 공식 운영 도메인</a>
    </div>
  </header>

  <!-- 상단 종합 비교 매트릭스 표 필수 탑재 -->
  <section class="comparison-section">
    <div class="comparison-title">
      <span>📊 4대 화면 3시안 한눈에 보는 종합 비교 매트릭스 표 (Comparison Matrix)</span>
      <span class="badge-recommend">주인님 선택안 확정 대기</span>
    </div>
    <table class="comp-table">
      <thead>
        <tr>
          <th>구분</th>
          <th>시안 1 (91. 인스타 선셋 스튜디오) 🏆</th>
          <th>시안 2 (92. 인스타 매거진 아틀리에) ⚡</th>
          <th>시안 3 (93. 퀀트 알고리즘 레이더) 🌿</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>인스타 오리지널 네온 선셋 & 딥 스페이스 블랙 크리에이터 스튜디오</td>
          <td>소프트 크림 페이퍼 & 로즈 골드 & 웜 슬레이트 감성 매거진 아틀리에</td>
          <td>옵시디언 딥블랙 & 일렉트릭 마젠타 & 사이버 사이안 알고리즘 콘솔</td>
        </tr>
        <tr>
          <td><strong>배색 시스템</strong></td>
          <td>배경: <code>#0B0E14</code><br>브랜드: <code>#E1306C</code> (선셋 핑크)<br>서브: <code>#FD1D1D</code> (선셋 레드)</td>
          <td>배경: <code>#FAF9F6</code><br>브랜드: <code>#E06D83</code> (로즈 골드)<br>서브: <code>#D48B99</code> (소프트 로즈)</td>
          <td>배경: <code>#070A10</code><br>브랜드: <code>#D946EF</code> (네온 마젠타)<br>서브: <code>#06B6D4</code> (사이안)</td>
        </tr>
        <tr>
          <td><strong>타이포그래피</strong></td>
          <td>Pretendard Variable</td>
          <td>Pretendard Variable</td>
          <td>JetBrains Mono + Pretendard</td>
        </tr>
        <tr>
          <td><strong>3D 엠보싱 버튼</strong></td>
          <td><code>.btn-3d-insta-sunset</code> (선셋 그라데이션)</td>
          <td><code>.btn-3d-rose-gold</code> (로즈 골드)</td>
          <td><code>.btn-3d-neon-magenta</code> (네온 마젠타)</td>
        </tr>
        <tr>
          <td><strong>핵심 컴포넌트</strong></td>
          <td>1:1 스마트폰 뷰파인더 덱 목업, 30개 해시태그 최적화 칩셋, 4단계 파이프라인</td>
          <td>감성 매거진 컷아웃 카드, 카드뉴스 멀티 슬라이더 프리뷰, 단정한 텍스트 덱</td>
          <td>Explore 도달 알고리즘 계측기, 24H 골든타임 히트맵, 다계정 침투 관제 HUD</td>
        </tr>
        <tr>
          <td><strong>추천 여부</strong></td>
          <td><span class="badge-recommend">⭐️ 1순위 강력 추천 (인스타 시그니처 감성)</span></td>
          <td><span class="badge-sub">⚡ 2순위 대안 (우아한 라이프스타일 톤)</span></td>
          <td><span class="badge-sub">🌿 3순위 대안 (알고리즘 퀀트 분석 톤)</span></td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- 4대 화면 12개 뷰 카드 섹션 -->
  <main>
    ${cardsHtml}
  </main>

  <!-- 라이트박스 모달 -->
  <div id="lightbox" class="lightbox-modal">
    <div class="lb-header">
      <div class="lb-info">
        <span id="lb-title" class="lb-title"></span>
        <span id="lb-screen" class="lb-screen"></span>
      </div>
      <div class="lb-controls">
        <button id="lb-orig-btn" class="lb-btn">🔍 100% 원본 크기 토글</button>
        <button id="lb-close-btn" class="lb-close">✕</button>
      </div>
    </div>
    <div class="lb-body" id="lb-body">
      <button id="lb-prev" class="lb-nav-btn lb-prev">❮</button>
      <img id="lb-img" class="lb-img" src="" alt="확대 뷰">
      <button id="lb-next" class="lb-nav-btn lb-next">❯</button>
    </div>
  </div>

  <script>
    const cards = document.querySelectorAll('.view-card');
    const modal = document.getElementById('lightbox');
    const lbImg = document.getElementById('lb-img');
    const lbTitle = document.getElementById('lb-title');
    const lbScreen = document.getElementById('lb-screen');
    const lbClose = document.getElementById('lb-close-btn');
    const lbPrev = document.getElementById('lb-prev');
    const lbNext = document.getElementById('lb-next');
    const lbOrig = document.getElementById('lb-orig-btn');

    let currentIndex = 0;
    const viewsData = [];

    cards.forEach((c, idx) => {
      viewsData.push({
        idx: parseInt(c.dataset.idx, 10),
        concept: c.dataset.concept,
        screen: c.dataset.screen,
        src: c.dataset.src
      });

      c.addEventListener('click', () => {
        openLightbox(idx);
      });
    });

    function openLightbox(index) {
      currentIndex = index;
      const data = viewsData[currentIndex];
      lbImg.src = data.src;
      lbTitle.textContent = data.concept;
      lbScreen.textContent = data.screen;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      resetZoom();
    }

    function closeLightbox() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    function prevView() {
      currentIndex = (currentIndex - 1 + viewsData.length) % viewsData.length;
      openLightbox(currentIndex);
    }

    function nextView() {
      currentIndex = (currentIndex + 1) % viewsData.length;
      openLightbox(currentIndex);
    }

    let isOrigZoom = false;
    function resetZoom() {
      isOrigZoom = false;
      lbImg.style.maxWidth = '95%';
      lbImg.style.maxHeight = '85vh';
      lbOrig.textContent = '🔍 100% 원본 크기 토글';
    }

    lbOrig.addEventListener('click', () => {
      isOrigZoom = !isOrigZoom;
      if (isOrigZoom) {
        lbImg.style.maxWidth = 'none';
        lbImg.style.maxHeight = 'none';
        lbOrig.textContent = '📐 화면 맞춤 토글';
      } else {
        resetZoom();
      }
    });

    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); prevView(); });
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); nextView(); });

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.id === 'lb-body') {
        closeLightbox();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevView();
      if (e.key === 'ArrowRight') nextView();
    });
  </script>
</body>
</html>`;
}

function buildComparisonPageHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INSTA 포스팅 자동화 4대 화면 3시안 종합 비교 매트릭스</title>
  <style>
    :root {
      --bg: #0B0E14;
      --card: #131822;
      --card2: #1C2333;
      --border: #232E42;
      --border-bright: #384A6B;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #E1306C;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
      padding: 40px;
      line-height: 1.6;
    }
    header {
      text-align: center;
      margin-bottom: 30px;
    }
    h1 {
      font-size: 26px;
      font-weight: 900;
      margin-bottom: 8px;
      color: #FFF;
    }
    .links {
      margin-top: 14px;
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .links a {
      color: var(--brand);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 14px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .matrix-box {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      background: var(--card2);
      padding: 14px;
      text-align: left;
      font-weight: 800;
      border-bottom: 2px solid var(--border-bright);
    }
    td {
      padding: 16px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .badge {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      display: inline-block;
    }
    .badge-rec {
      background: rgba(225,48,108,0.2);
      color: #E1306C;
      border: 1px solid #E1306C;
    }
    .badge-sub {
      background: rgba(224,109,131,0.15);
      color: #E06D83;
      border: 1px solid rgba(224,109,131,0.3);
    }
  </style>
</head>
<body>
  <header>
    <h1>📊 INSTA 포스팅 자동화 4대 화면 3시안 종합 비교 매트릭스</h1>
    <div class="links">
      <a href="http://localhost:3800/showcase.html">🖼️ 단일 통합 쇼케이스 (showcase.html)</a>
      <a href="https://insta-auto-poster.buylife.xyz" target="_blank">🌐 공식 운영 도메인</a>
    </div>
  </header>
  <div class="matrix-box">
    <table>
      <thead>
        <tr>
          <th>비교 항목</th>
          <th>시안 1 (91. 인스타 선셋 스튜디오) 🏆</th>
          <th>시안 2 (92. 인스타 매거진 아틀리에) ⚡</th>
          <th>시안 3 (93. 퀀트 알고리즘 레이더) 🌿</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>인스타 오리지널 네온 선셋 & 딥 스페이스 블랙 크리에이터 스튜디오</td>
          <td>소프트 크림 페이퍼 & 로즈 골드 & 웜 슬레이트 감성 매거진 아틀리에</td>
          <td>옵시디언 딥블랙 & 일렉트릭 마젠타 & 사이버 사이안 알고리즘 콘솔</td>
        </tr>
        <tr>
          <td><strong>배색 시스템</strong></td>
          <td>배경: <code>#0B0E14</code><br>브랜드: <code>#E1306C</code> (선셋 핑크)<br>서브: <code>#FD1D1D</code> (선셋 레드)</td>
          <td>배경: <code>#FAF9F6</code><br>브랜드: <code>#E06D83</code> (로즈 골드)<br>서브: <code>#D48B99</code> (소프트 로즈)</td>
          <td>배경: <code>#070A10</code><br>브랜드: <code>#D946EF</code> (네온 마젠타)<br>서브: <code>#06B6D4</code> (사이안)</td>
        </tr>
        <tr>
          <td><strong>타이포그래피</strong></td>
          <td>Pretendard Variable</td>
          <td>Pretendard Variable</td>
          <td>JetBrains Mono + Pretendard</td>
        </tr>
        <tr>
          <td><strong>3D 엠보싱 버튼</strong></td>
          <td><code>.btn-3d-insta-sunset</code> (선셋 그라데이션)</td>
          <td><code>.btn-3d-rose-gold</code> (로즈 골드)</td>
          <td><code>.btn-3d-neon-magenta</code> (네온 마젠타)</td>
        </tr>
        <tr>
          <td><strong>화면 1 (메인)</strong></td>
          <td>4단계 파이프라인 (연동/제작/태그/예약) + 4대 KPI + 최근 피드 프리뷰</td>
          <td>매거진 큐레이션 그리드 + 감성 피드 스트림 리포트</td>
          <td>알고리즘 관제 대시보드 + 도달 피크 시간대 모니터링</td>
        </tr>
        <tr>
          <td><strong>화면 2 (상세)</strong></td>
          <td>AI 카드뉴스 에디터 + 1:1 스마트폰 뷰파인더 덱 + 30개 해시태그 칩셋</td>
          <td>카드뉴스 멀티 슬라이더 에디터 + 에디토리얼 타이포 덱</td>
          <td>바이럴 도달 지수 계측기 + Explore 추천 확률 시뮬레이터</td>
        </tr>
        <tr>
          <td><strong>화면 3 (매뉴얼)</strong></td>
          <td>Meta Graph API 비즈니스 연동 가이드 & 쉐도우밴 100% 방지 5대 수칙</td>
          <td>인스타 감성 브랜딩 바이블 & 매거진 스타일 폰트/레이아웃 가이드</td>
          <td>알고리즘 해킹 3대 원칙 & API 오류 코드 응급복구 매뉴얼</td>
        </tr>
        <tr>
          <td><strong>화면 4 (설정/로그인)</strong></td>
          <td>2026-11-01 5단계 표준 로그인 & Meta Graph API 계정 매핑 콘솔</td>
          <td>2026-11-01 5단계 표준 로그인 & 페이스북 페이지/인스타 프로필 설정</td>
          <td>2026-11-01 5단계 표준 로그인 & 토큰 자동 갱신 데몬 콘솔</td>
        </tr>
        <tr>
          <td><strong>추천 및 평결</strong></td>
          <td><span class="badge badge-rec">⭐️ 1순위 강력 추천 (인스타 시그니처 감성)</span></td>
          <td><span class="badge badge-sub">⚡ 2순위 대안 (우아한 라이프스타일 톤)</span></td>
          <td><span class="badge badge-sub">🌿 3순위 대안 (알고리즘 퀀트 분석 톤)</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

// 1. 단일 쇼케이스 HTML 생성
const masterShowcaseHtml = buildMasterShowcaseHtml();
fs.writeFileSync(path.join(BASE_DIR, 'showcase.html'), masterShowcaseHtml, 'utf8');
console.log('✅ D:/Antigravity/Design/showcase.html 생성 완료');

// 2. 종합 비교표 단독 뷰어 HTML 생성
const comparisonHtml = buildComparisonPageHtml();
fs.writeFileSync(path.join(BASE_DIR, 'comparison.html'), comparisonHtml, 'utf8');
console.log('✅ D:/Antigravity/Design/comparison.html 생성 완료');
