import fs from 'fs';
import path from 'path';

const BASE_DIR = 'D:/Antigravity/Design';

const concepts = [
  {
    num: 1,
    id: '88_quant_proptech_intelligence_radar',
    folder: '88_quant_proptech_intelligence_radar/real_estate_sales',
    name: '88. 퀀트 프롭테크 인텔리전스 레이더 덱',
    shortName: '1안 (퀀트 프롭테크 레이더)',
    badge: '🏆 1순위 추천 (옵시디언 딥블랙 & 일렉트릭 사이안 & 골드 앰버 HUD)',
    color: '#06B6D4',
    bg: '#080C14',
    theme: '옵시디언 딥블랙 + 일렉트릭 사이안 + 골드 앰버 + 딥 네이비',
    font: 'Pretendard Variable / JetBrains Mono',
    btn: '.btn-3d-cyan-radar (사이버 사이안 3D 엠보싱)',
    desc: '국토교통부 실거래가 빅데이터와 네이버 부동산 호가를 초당 대조 분석하여 갭투자 기회와 급매물을 포착하는 퀀트 투자 덱'
  },
  {
    num: 2,
    id: '89_naver_realestate_smart_matrix',
    folder: '89_naver_realestate_smart_matrix/real_estate_sales',
    name: '89. 네이버 부동산 스마트 매트릭스 저널',
    shortName: '2안 (네이버 부동산 매트릭스)',
    badge: '⚡ 2순위 대안 (클린 화이트 & 네이버 스마트 그린 & 모던 그레이)',
    color: '#03C75A',
    bg: '#F8FAFC',
    theme: '소프트 화이트 + 네이버 그린 + 모던 슬레이트 잉크',
    font: 'Pretendard Variable',
    btn: '.btn-3d-naver-green (네이버 그린 3D 엠보싱)',
    desc: '국내 1위 네이버 부동산 UI 친화적 레이아웃으로 익숙하고 쾌적하게 단지별 시세, 전세가율, 실거래 내역을 탐색하는 직관적 저널'
  },
  {
    num: 3,
    id: '90_minimal_proptech_investor_atelier',
    folder: '90_minimal_proptech_investor_atelier/real_estate_sales',
    name: '90. 미니멀 프롭테크 인베스터 아틀리에',
    shortName: '3안 (미니멀 인베스터 아틀리에)',
    badge: '🌿 3순위 대안 (클린 크림 페이퍼 & 딥 로열 블루 & 웜 슬레이트)',
    color: '#2563EB',
    bg: '#FDFCFA',
    theme: '클린 크림 페이퍼 + 딥 로열 블루 + 웜 슬레이트',
    font: 'Pretendard Variable',
    btn: '.btn-3d-investor-blue (로열 블루 3D 엠보싱)',
    desc: '고급 프라이빗 뱅킹(PB) 자산관리 리포트 감성의 미니멀하고 단정한 타이포그래피 중심 투자 분석 아틀리에'
  }
];

const screens = [
  { id: '01_main', title: '1. 메인 대시보드 & 4단계 프롭테크 파이프라인', desc: '타깃 지역 12개, 실거래 분석 1,480건, 급매 포착 28건, 갭투자 유망 9건, 실시간 실거래가 피드 & 최근 AI 분석 보고서' },
  { id: '02_detail', title: '2. 아파트 단지별 갭투자 매트릭스 HUD & AI 정밀 진단', desc: '단지 실거래 추이 10년 차트, 전세가율·갭가격·투자 매력도 지수, AI 입지·호재·리스크 3단 진단 & 매물 레이더' },
  { id: '03_guide', title: '3. 국토부 실거래가 & 네이버 부동산 퀀트 분석 마스터 가이드북', desc: '국토부 OpenAPI 실거래가 수집 원리, 네이버 부동산 호가 괴리율 분석법, 갭투자 리스크 5대 안전 점검표' },
  { id: '04_settings', title: '4. 공공데이터포털 API 연동 & 2026-11-01 5단계 표준 로그인', desc: '68px 프롭테크 심볼 로고 + 알약 뱃지 + 볼드 한글명 + 2단 탭 폼 + 1행 축소 약관 동의 규격 100% 준수 & 국토부 인증키 매핑' }
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
  <title>부동산 실거래 투자분석 자동화 4대 화면 3시안 쇼케이스</title>
  <style>
    :root {
      --bg: #080C14;
      --card: #111827;
      --card2: #1E293B;
      --border: #1F2937;
      --border-bright: #374151;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #06B6D4;
      --brand-hover: #0891B2;
      --accent: #F59E0B;
      --green: #10B981;
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
      background: rgba(6,182,212,0.15);
      color: var(--brand);
      border: 1px solid rgba(6,182,212,0.3);
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
      background: linear-gradient(135deg, #FFF 60%, var(--brand) 100%);
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
      background: rgba(6,182,212,0.2);
      color: #06B6D4;
      border: 1px solid #06B6D4;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      display: inline-block;
    }
    .badge-sub {
      background: rgba(16,185,129,0.15);
      color: #10B981;
      border: 1px solid rgba(16,185,129,0.3);
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
      box-shadow: 0 12px 30px rgba(6,182,212,0.2);
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
      color: #000;
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
      background: rgba(17,24,39,0.9);
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
      color: #000;
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
      background: rgba(17,24,39,0.8);
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
      color: #000;
      border-color: var(--brand);
    }
    .lb-prev { left: 20px; }
    .lb-next { right: 20px; }
  </style>
</head>
<body>

  <header>
    <div class="header-badge">🎨 AIMaster DESIGN PROPOSAL • PORT 3800</div>
    <h1>부동산 실거래 투자분석 자동화 4대 화면 3시안 쇼케이스</h1>
    <p class="subtitle">
      국토교통부 실거래가 빅데이터 & 네이버 부동산 매트릭스 100% 무결성 파이프라인 • 2026-11-01 5단계 표준 로그인 규격 • 3D 엠보싱 버튼 탑재
    </p>
    <div class="quick-links">
      <a href="http://localhost:3800/comparison.html">📊 종합 비교표 단독 뷰어 (comparison.html)</a>
      <a href="https://real-estate-sales.buylife.xyz" target="_blank">🌐 공식 운영 도메인</a>
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
          <th>시안 1 (88. 퀀트 프롭테크 레이더) 🏆</th>
          <th>시안 2 (89. 네이버 부동산 매트릭스) ⚡</th>
          <th>시안 3 (90. 미니멀 인베스터 아틀리에) 🌿</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>옵시디언 딥블랙 + 일렉트릭 사이안 + 골드 앰버 퀀트 프롭테크 레이더 덱</td>
          <td>소프트 화이트 + 네이버 그린 + 모던 슬레이트 잉크 스마트 매트릭스 저널</td>
          <td>클린 크림 페이퍼 + 딥 로열 블루 + 웜 슬레이트 프라이빗 아틀리에</td>
        </tr>
        <tr>
          <td><strong>배색 시스템</strong></td>
          <td>배경: <code>#080C14</code><br>브랜드: <code>#06B6D4</code> (사이안)<br>서브: <code>#F59E0B</code> (앰버)</td>
          <td>배경: <code>#F8FAFC</code><br>브랜드: <code>#03C75A</code> (네이버 그린)<br>서브: <code>#0284C7</code> (블루)</td>
          <td>배경: <code>#FDFCFA</code><br>브랜드: <code>#2563EB</code> (로열 블루)<br>서브: <code>#D97706</code> (골드)</td>
        </tr>
        <tr>
          <td><strong>타이포그래피</strong></td>
          <td>JetBrains Mono + Pretendard</td>
          <td>Pretendard Variable</td>
          <td>Pretendard Variable</td>
        </tr>
        <tr>
          <td><strong>3D 엠보싱 버튼</strong></td>
          <td><code>.btn-3d-cyan-radar</code> (일렉트릭 사이안)</td>
          <td><code>.btn-3d-naver-green</code> (네이버 그린)</td>
          <td><code>.btn-3d-investor-blue</code> (로열 블루)</td>
        </tr>
        <tr>
          <td><strong>핵심 컴포넌트</strong></td>
          <td>4단계 프롭테크 파이프라인, 급매/갭투자 레이더, 10년 실거래가 차트</td>
          <td>네이버 부동산 호가 대조표, 단지별 매트릭스 테이블, 갭투자 HUD</td>
          <td>자산관리 리포트 카드, 미니멀 투자 체크리스트, PB 스타일 인텔리전스</td>
        </tr>
        <tr>
          <td><strong>추천 여부</strong></td>
          <td><span class="badge-recommend">⭐️ 1순위 강력 추천 (퀀트 전문성)</span></td>
          <td><span class="badge-sub">⚡ 2순위 대안 (친숙한 네이버 감성)</span></td>
          <td><span class="badge-sub">🌿 3순위 대안 (단정한 PB 아틀리에)</span></td>
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
  <title>부동산 실거래 투자분석 자동화 4대 화면 3시안 종합 비교 매트릭스</title>
  <style>
    :root {
      --bg: #080C14;
      --card: #111827;
      --card2: #1E293B;
      --border: #1F2937;
      --border-bright: #374151;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #06B6D4;
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
      background: rgba(6,182,212,0.2);
      color: #06B6D4;
      border: 1px solid #06B6D4;
    }
    .badge-sub {
      background: rgba(16,185,129,0.15);
      color: #10B981;
      border: 1px solid rgba(16,185,129,0.3);
    }
  </style>
</head>
<body>
  <header>
    <h1>📊 부동산 실거래 투자분석 자동화 4대 화면 3시안 종합 비교 매트릭스</h1>
    <div class="links">
      <a href="http://localhost:3800/showcase.html">🖼️ 단일 통합 쇼케이스 (showcase.html)</a>
      <a href="https://real-estate-sales.buylife.xyz" target="_blank">🌐 공식 운영 도메인</a>
    </div>
  </header>
  <div class="matrix-box">
    <table>
      <thead>
        <tr>
          <th>비교 항목</th>
          <th>시안 1 (88. 퀀트 프롭테크 레이더) 🏆</th>
          <th>시안 2 (89. 네이버 부동산 매트릭스) ⚡</th>
          <th>시안 3 (90. 미니멀 인베스터 아틀리에) 🌿</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>옵시디언 딥블랙 + 일렉트릭 사이안 + 골드 앰버 퀀트 프롭테크 레이더 덱</td>
          <td>소프트 화이트 + 네이버 그린 + 모던 슬레이트 잉크 스마트 매트릭스 저널</td>
          <td>클린 크림 페이퍼 + 딥 로열 블루 + 웜 슬레이트 프라이빗 아틀리에</td>
        </tr>
        <tr>
          <td><strong>배색 시스템</strong></td>
          <td>배경: <code>#080C14</code><br>브랜드: <code>#06B6D4</code> (사이안)<br>서브: <code>#F59E0B</code> (앰버)</td>
          <td>배경: <code>#F8FAFC</code><br>브랜드: <code>#03C75A</code> (네이버 그린)<br>서브: <code>#0284C7</code> (블루)</td>
          <td>배경: <code>#FDFCFA</code><br>브랜드: <code>#2563EB</code> (로열 블루)<br>서브: <code>#D97706</code> (골드)</td>
        </tr>
        <tr>
          <td><strong>타이포그래피</strong></td>
          <td>JetBrains Mono + Pretendard</td>
          <td>Pretendard Variable</td>
          <td>Pretendard Variable</td>
        </tr>
        <tr>
          <td><strong>3D 엠보싱 버튼</strong></td>
          <td><code>.btn-3d-cyan-radar</code> (일렉트릭 사이안)</td>
          <td><code>.btn-3d-naver-green</code> (네이버 그린)</td>
          <td><code>.btn-3d-investor-blue</code> (로열 블루)</td>
        </tr>
        <tr>
          <td><strong>화면 1 (메인)</strong></td>
          <td>4단계 프롭테크 파이프라인 (연동/수집/분석/보고서) + 실시간 실거래가 피드</td>
          <td>지역별 실거래 매트릭스 그리드 + 상승/하락 단지 브리핑</td>
          <td>단정한 지표 카드 + 실시간 거래 스트림 리포트</td>
        </tr>
        <tr>
          <td><strong>화면 2 (상세)</strong></td>
          <td>10년 실거래가/전세가 추이 인터랙티브 차트 + 갭투자 매력도 지수 & AI 진단</td>
          <td>네이버 부동산 호가 대조표 + 단지별 매트릭스 테이블 + 갭투자 HUD</td>
          <td>아파트 단지 종합 투자 분석 리포트 + 입지/호재/리스크 3단 분석</td>
        </tr>
        <tr>
          <td><strong>화면 3 (매뉴얼)</strong></td>
          <td>국토부 OpenAPI 실거래가 수집 원리 & 갭투자 리스크 5대 안전 점검표</td>
          <td>네이버 부동산 호가 괴리율 분석법 & 단지 매트릭스 활용 가이드</td>
          <td>프라이빗 자산관리 퀀트 투자 바이블 & 체크리스트</td>
        </tr>
        <tr>
          <td><strong>화면 4 (설정/로그인)</strong></td>
          <td>2026-11-01 5단계 표준 로그인 & 공공데이터포털 API 연동 콘솔</td>
          <td>2026-11-01 5단계 표준 로그인 & 네이버 계정/알림 설정</td>
          <td>2026-11-01 5단계 표준 로그인 & 분석 환경 설정</td>
        </tr>
        <tr>
          <td><strong>추천 및 평결</strong></td>
          <td><span class="badge badge-rec">⭐️ 1순위 강력 추천 (퀀트 전문성)</span></td>
          <td><span class="badge badge-sub">⚡ 2순위 대안 (친숙한 네이버 감성)</span></td>
          <td><span class="badge badge-sub">🌿 3순위 대안 (단정한 PB 아틀리에)</span></td>
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
