import fs from 'fs';
import path from 'path';

const BASE_DIR = 'D:/Antigravity/Design';

const concepts = [
  {
    num: 1,
    id: '82_coupang_rocket_seller_studio',
    folder: '82_coupang_rocket_seller_studio/coupang-ops',
    name: '82. 쿠팡 로켓 셀러 인디고 랩 스타일',
    shortName: '1안 (로켓 인디고 랩)',
    badge: '🏆 1순위 추천 (쿠팡 공식 WING 로켓 레드 & 인디고 다크 HUD)',
    color: '#EA3323',
    bg: '#0B111A',
    theme: '쿠팡 로켓 레드 + 딥 인디고 블루 + 다크 HUD 콘솔',
    font: 'Pretendard Variable',
    btn: '.btn-3d-rocket (로켓 레드 3D 엠보싱)',
    desc: '쿠팡 WING 셀러 센터 공식 아이덴티티를 계승하여 실시간 주문·배송·아이템위너를 강렬하고 신뢰감 있게 관제하는 1순위 추천 스타일'
  },
  {
    num: 2,
    id: '83_quant_ecommerce_terminal',
    folder: '83_quant_ecommerce_terminal/coupang-ops',
    name: '83. 퀀트 이커머스 터미널 덱 스타일',
    shortName: '2안 (퀀트 터미널 덱)',
    badge: '💎 2순위 대안 (하이테크 사이버 퀀트 & 블룸버그 덱)',
    color: '#06B6D4',
    bg: '#070A12',
    theme: '옵시디언 블랙 + 사이버 사이안 + 앰버 골드',
    font: 'JetBrains Mono / Pretendard',
    btn: '.btn-3d-cyan (사이버 사이안 3D 엠보싱)',
    desc: '블룸버그 터미널 감성의 초정밀 아이템위너 최저가 레이더, 정산 마진 분해율, 카테고리 수수료율을 하이테크 사이버펑크 무드로 장악하는 퀀트 덱'
  },
  {
    num: 3,
    id: '84_minimal_commerce_atelier',
    folder: '84_minimal_commerce_atelier/coupang-ops',
    name: '84. 미니멀 커머스 인텔리전스 아틀리에 스타일',
    shortName: '3안 (커머스 아틀리에)',
    badge: '🌿 3순위 대안 (미니멀 클린 페이퍼 & 로열 코발트 블루)',
    color: '#2563EB',
    bg: '#F8FAFC',
    theme: '소프트 크림 페이퍼 + 로열 코발트 블루 + 슬레이트 잉크',
    font: 'Pretendard Variable',
    btn: '.btn-3d-blue (로열 블루 3D 엠보싱)',
    desc: '화사하고 단정한 에디토리얼 무드로 일일 주문·출고·정산 리포트를 눈의 피로 없이 쾌적하게 분석하는 라이트 감성 아틀리에'
  }
];

const screens = [
  { id: '01_main', title: '1. 메인 대시보드 & WING 실시간 관제 HUD', desc: '일일 주문 148건, 실시간 결제 매출 ₩4.82M, 출고 대기 3건, 아이템위너 94.2% 점유율 HUD' },
  { id: '02_detail', title: '2. 아이템위너 가격 추천 & 마진 시뮬레이션', desc: 'Price Suggest 최저가 10원 우위 추천, 매입원가/수수료/배송비 정밀 분해, 경쟁 4개사 실시간 대조' },
  { id: '03_guide', title: '3. WING API 발급 & 로켓배송 입점 가이드', desc: 'Access Key 발급 3분 매뉴얼, 판매자 로켓 vs 일반 배송 ROI 전략, 아이템위너 4단계 공략' },
  { id: '04_settings', title: '4. WING API 연동 & 2026-11-01 표준 로그인', desc: 'Vendor ID/Access Key/Secret Key 보안 저장, 68px 로고 + 1행 약관 규격 100% 준수' }
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
            <span class="screen-tag">${s.id}</span>
          </div>
          <div class="thumb-wrap">
            <img src="${imgRelative}" alt="${c.name} - ${s.title}" loading="lazy">
            <div class="zoom-overlay">
              <span class="zoom-btn">🔍 1440px 고화질 원본 확대보기</span>
            </div>
          </div>
          <div class="card-meta">
            <h4>${c.name}</h4>
            <p>${s.desc}</p>
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
  <title>AI 쿠팡 운영 자동화 (coupang-ops) 4대 화면 3시안 쇼케이스</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090D16;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      padding: 30px;
      line-height: 1.5;
    }
    .header-section {
      text-align: center;
      margin-bottom: 30px;
    }
    .header-section h1 {
      font-size: 28px;
      font-weight: 900;
      color: #F8FAFC;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .header-section p {
      color: #94A3B8;
      font-size: 14px;
    }
    .nav-links {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 16px;
    }
    .nav-btn {
      padding: 8px 18px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 800;
      transition: all 0.2s;
    }
    .nav-btn-primary {
      background: #EA3323;
      color: #FFFFFF;
      box-shadow: 0 4px 14px rgba(234,51,35,0.35);
    }
    .nav-btn-secondary {
      background: #1E293B;
      color: #F1F5F9;
      border: 1px solid #334155;
    }
    .nav-btn:hover {
      transform: translateY(-2px);
    }

    /* 상단 종합 비교표 */
    .matrix-section {
      max-width: 1400px;
      margin: 0 auto 40px auto;
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 14px;
      padding: 24px;
    }
    .matrix-section h3 {
      font-size: 17px;
      font-weight: 800;
      color: #F9FAFB;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .matrix-table th, .matrix-table td {
      padding: 12px 14px;
      border: 1px solid #1F2937;
      text-align: left;
    }
    .matrix-table th {
      background: #1E293B;
      color: #F1F5F9;
      font-weight: 800;
    }
    .matrix-table tr:hover {
      background: rgba(255,255,255,0.02);
    }

    /* 3열 그리드 */
    .row-header {
      max-width: 1400px;
      margin: 30px auto 12px auto;
      border-bottom: 1px solid #1E293B;
      padding-bottom: 8px;
    }
    .row-header h2 {
      font-size: 18px;
      font-weight: 900;
      color: #F1F5F9;
    }
    .row-header p {
      font-size: 13px;
      color: #64748B;
    }
    .views-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto 20px auto;
    }
    .view-card {
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
    }
    .view-card:hover {
      border-color: #EA3323;
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(0,0,0,0.4);
    }
    .card-top {
      padding: 10px 14px;
      background: #0F172A;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1E293B;
    }
    .badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .screen-tag {
      font-size: 11px;
      color: #94A3B8;
      font-weight: 700;
    }
    .thumb-wrap {
      position: relative;
      width: 100%;
      height: 230px;
      background: #000;
      overflow: hidden;
    }
    .thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      transition: transform 0.3s;
    }
    .view-card:hover .thumb-wrap img {
      transform: scale(1.03);
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
      background: rgba(234,51,35,0.9);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 6px;
    }
    .card-meta {
      padding: 12px 14px;
    }
    .card-meta h4 {
      font-size: 13px;
      font-weight: 800;
      color: #F8FAFC;
      margin-bottom: 4px;
    }
    .card-meta p {
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.4;
    }

    /* 라이트박스 모달 */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 99999;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .modal.active {
      display: flex;
    }
    .modal-header {
      position: absolute;
      top: 16px;
      left: 24px;
      right: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #FFF;
      z-index: 100000;
    }
    .modal-title {
      font-size: 16px;
      font-weight: 800;
      color: #F8FAFC;
    }
    .modal-close {
      background: #334155;
      color: #FFF;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
    .modal-close:hover {
      background: #EF4444;
    }
    .modal-body {
      max-width: 92vw;
      max-height: 85vh;
      overflow: auto;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8);
      border-radius: 8px;
      background: #000;
    }
    .modal-body img {
      width: 1440px;
      max-width: 100%;
      height: auto;
      display: block;
    }
    .modal-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(30,41,59,0.8);
      color: #FFF;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 16px 20px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
      font-weight: 900;
      user-select: none;
      transition: all 0.2s;
    }
    .modal-nav:hover {
      background: #EA3323;
      color: #FFF;
    }
    .modal-prev { left: 24px; }
    .modal-next { right: 24px; }
  </style>
</head>
<body>

  <div class="header-section">
    <h1>🚀 AI 쿠팡 운영 자동화 (coupang-ops) 4대 화면 3시안 쇼케이스</h1>
    <p>쿠팡 WING Open API 자동화 & 실시간 주문·정산·아이템위너 관제 · 1440px 고화질 캡처본 클릭 시 라이트박스 확대</p>
    <div class="nav-links">
      <a href="http://localhost:3800/comparison.html" class="nav-btn nav-btn-primary">📊 4대 화면 3시안 종합 비교표 보기</a>
      <a href="https://coupang-ops.buylife.xyz" target="_blank" class="nav-btn nav-btn-secondary">🌐 현재 프로덕션 대시보드 바로가기</a>
    </div>
  </div>

  <div class="matrix-section">
    <h3>📌 4대 화면 3시안 한눈에 보는 종합 비교 매트릭스</h3>
    <table class="matrix-table">
      <thead>
        <tr>
          <th>구분</th>
          <th style="color:#EA3323;">시안 1: 82. 쿠팡 로켓 셀러 인디고 랩 (추천)</th>
          <th style="color:#06B6D4;">시안 2: 83. 퀀트 이커머스 터미널 덱</th>
          <th style="color:#2563EB;">시안 3: 84. 미니멀 커머스 아틀리에</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>쿠팡 WING 셀러 센터 공식 로켓 레드 & 인디고 다크 HUD</td>
          <td>블룸버그 터미널 스타일의 초정밀 퀀트 이커머스 덱</td>
          <td>눈이 편안한 라이트 에디토리얼 아틀리에 & 워크스페이스</td>
        </tr>
        <tr>
          <td><strong>메인 컬러 & 톤</strong></td>
          <td>쿠팡 로켓 레드(#EA3323) + 딥 인디고(#141D2B) + 화이트</td>
          <td>옵시디언 블랙(#070A12) + 사이안 네온(#06B6D4) + 앰버</td>
          <td>소프트 크림 페이퍼(#F8FAFC) + 로열 블루(#2563EB) + 잉크</td>
        </tr>
        <tr>
          <td><strong>버튼 & UI 특징</strong></td>
          <td>3D 엠보싱 로켓 레드 버튼 (.btn-3d-rocket), 실시간 상태 뱃지</td>
          <td>3D 엠보싱 사이버 사이안 버튼 (.btn-3d-cyan), 모노 터미널</td>
          <td>3D 엠보싱 로열 블루 버튼 (.btn-3d-blue), 부드러운 카드</td>
        </tr>
        <tr>
          <td><strong>4대 화면 구성</strong></td>
          <td>1.주문·배송 관제 / 2.아이템위너 마진 / 3.WING 가이드 / 4.표준 로그인</td>
          <td>1.주문·배송 관제 / 2.아이템위너 마진 / 3.WING 가이드 / 4.표준 로그인</td>
          <td>1.주문·배송 관제 / 2.아이템위너 마진 / 3.WING 가이드 / 4.표준 로그인</td>
        </tr>
        <tr>
          <td><strong>추천 순위</strong></td>
          <td><strong style="color:#EA3323;">🥇 1순위 (공식 권장 채택안)</strong></td>
          <td>🥈 2순위 (대안 - 퀀트 데이터 매니아)</td>
          <td>🥉 3순위 (대안 - 미니멀 라이트 감성)</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${cardsHtml}

  <!-- 라이트박스 모달 -->
  <div class="modal" id="lightboxModal">
    <div class="modal-header">
      <div class="modal-title" id="modalTitle">뷰 확대보기</div>
      <button class="modal-close" id="modalClose">닫기 (ESC)</button>
    </div>
    <div class="modal-nav modal-prev" id="modalPrev">‹</div>
    <div class="modal-nav modal-next" id="modalNext">›</div>
    <div class="modal-body">
      <img src="" id="modalImg" alt="확대 뷰">
    </div>
  </div>

  <script>
    const cards = Array.from(document.querySelectorAll('.view-card'));
    const modal = document.getElementById('lightboxModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalImg = document.getElementById('modalImg');
    const modalClose = document.getElementById('modalClose');
    const modalPrev = document.getElementById('modalPrev');
    const modalNext = document.getElementById('modalNext');

    let currentIdx = 0;

    function openModal(idx) {
      currentIdx = idx;
      const card = cards[currentIdx];
      const src = card.getAttribute('data-src');
      const concept = card.getAttribute('data-concept');
      const screen = card.getAttribute('data-screen');

      modalTitle.textContent = '[' + (currentIdx + 1) + '/12] ' + concept + ' - ' + screen;
      modalImg.src = src;
      modal.classList.add('active');
    }

    function closeModal() {
      modal.classList.remove('active');
    }

    cards.forEach((card, idx) => {
      card.addEventListener('click', () => openModal(idx));
    });

    modalClose.addEventListener('click', closeModal);
    modalPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal((currentIdx - 1 + cards.length) % cards.length);
    });
    modalNext.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal((currentIdx + 1) % cards.length);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') modalPrev.click();
      if (e.key === 'ArrowRight') modalNext.click();
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
  <title>AI 쿠팡 운영 자동화 (coupang-ops) 4대 화면 3시안 종합 비교표</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090D16;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      padding: 40px;
      line-height: 1.6;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    h1 { font-size: 26px; font-weight: 900; color: #FFF; margin-bottom: 8px; text-align: center; }
    p.sub { text-align: center; color: #94A3B8; font-size: 14px; margin-bottom: 30px; }
    .nav-bar { display: flex; justify-content: center; gap: 14px; margin-bottom: 30px; }
    .btn { padding: 8px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 800; transition: all 0.2s; }
    .btn-main { background: #EA3323; color: #FFFFFF; }
    .btn-outline { background: #1E293B; color: #FFF; border: 1px solid #334155; }
    .btn:hover { transform: translateY(-2px); }

    table { width: 100%; border-collapse: collapse; background: #111827; border-radius: 14px; overflow: hidden; border: 1px solid #1F2937; margin-bottom: 40px; }
    th, td { padding: 16px 20px; border: 1px solid #1F2937; font-size: 13px; text-align: left; }
    th { background: #1E293B; color: #FFF; font-weight: 800; }
    tr:hover { background: rgba(255,255,255,0.02); }

    .color-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      background: #0B111A;
      border: 1px solid #334155;
    }
    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .pros-list { list-style: none; padding-left: 0; }
    .pros-list li { margin-bottom: 6px; position: relative; padding-left: 16px; font-size: 12px; }
    .pros-list li::before { content: "✔"; position: absolute; left: 0; color: #EA3323; }

    .screen-preview-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 30px;
    }
    .preview-card {
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .preview-card h3 {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .preview-card img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      object-position: top;
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid #334155;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 AI 쿠팡 운영 자동화 (coupang-ops) 4대 화면 3시안 종합 비교표</h1>
    <p class="sub">3가지 차별화된 디자인 컨셉의 배색, 테마, 컴포넌트 특성 및 추천 여부 정밀 대조</p>

    <div class="nav-bar">
      <a href="http://localhost:3800/showcase.html" class="btn btn-main">🖼️ 12개 뷰 통합 쇼케이스 (라이트박스 팝업)</a>
      <a href="https://coupang-ops.buylife.xyz" target="_blank" class="btn btn-outline">🌐 공식 프로덕션 대시보드 바로가기</a>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 16%;">비교 항목</th>
          <th style="width: 28%; color: #EA3323;">🥇 시안 1: 82. 쿠팡 로켓 셀러 인디고 랩</th>
          <th style="width: 28%; color: #06B6D4;">🥈 시안 2: 83. 퀀트 이커머스 터미널 덱</th>
          <th style="width: 28%; color: #2563EB;">🥉 시안 3: 84. 미니멀 커머스 아틀리에</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>쿠팡 WING 셀러 센터 공식 로켓 레드 & 인디고 블루 다크 관제 HUD</td>
          <td>블룸버그 터미널 스타일의 초정밀 퀀트 이커머스 데이터 매트릭스 덱</td>
          <td>눈이 편안한 에디토리얼 무드로 주문/정산을 확인하는 라이트 아틀리에</td>
        </tr>
        <tr>
          <td><strong>컬러 시스템</strong></td>
          <td>
            <div class="color-pill"><span class="color-dot" style="background:#EA3323;"></span>#EA3323 로켓 레드</div>
            <div class="color-pill"><span class="color-dot" style="background:#141D2B;"></span>#141D2B 딥 인디고</div>
            <div class="color-pill"><span class="color-dot" style="background:#2563EB;"></span>#2563EB 블루</div>
          </td>
          <td>
            <div class="color-pill"><span class="color-dot" style="background:#06B6D4;"></span>#06B6D4 사이버 사이안</div>
            <div class="color-pill"><span class="color-dot" style="background:#8B5CF6;"></span>#8B5CF6 바이올렛</div>
            <div class="color-pill"><span class="color-dot" style="background:#070A12;"></span>#070A12 옵시디언</div>
          </td>
          <td>
            <div class="color-pill"><span class="color-dot" style="background:#2563EB;"></span>#2563EB 로열 블루</div>
            <div class="color-pill"><span class="color-dot" style="background:#EA3323;"></span>#EA3323 로켓 레드</div>
            <div class="color-pill"><span class="color-dot" style="background:#F8FAFC;"></span>#F8FAFC 클린 페이퍼</div>
          </td>
        </tr>
        <tr>
          <td><strong>UI 인터랙션 & 버튼</strong></td>
          <td>
            • 입체 3D 엠보싱 로켓 레드 버튼 (<code>.btn-3d-rocket</code>)<br>
            • 실시간 WING API 동기화 및 송장 전송<br>
            • 2026-11-01 5단계 표준 로그인 폼
          </td>
          <td>
            • 입체 3D 엠보싱 사이버 사이안 버튼 (<code>.btn-3d-cyan</code>)<br>
            • 모노스페이스 데이터 테이블 & 네온 글로우<br>
            • 초 단위 실시간 최저가 감지 덱
          </td>
          <td>
            • 입체 3D 엠보싱 로열 블루 버튼 (<code>.btn-3d-blue</code>)<br>
            • 편안한 소프트 섀도우 카드 그리드<br>
            • 감성적인 에디토리얼 워크스페이스
          </td>
        </tr>
        <tr>
          <td><strong>장점 & 추천 이유</strong></td>
          <td>
            <ul class="pros-list">
              <li>쿠팡 공식 브랜드 톤앤매너와 가장 일치하여 직관적 신뢰감 극대화</li>
              <li>긴급 출고 지연 경고와 아이템위너 점유율이 한눈에 파악되는 가독성</li>
              <li>주문 처리 및 정산 모니터링 시 탁월한 시인성 제공</li>
            </ul>
          </td>
          <td>
            <ul class="pros-list">
              <li>초단타 가격 경쟁 및 수수료 퀀트 분석가에게 압도적 전문성 제공</li>
              <li>화려한 네온 액센트와 하이테크 터미널 감성</li>
            </ul>
          </td>
          <td>
            <ul class="pros-list">
              <li>다크 모드를 선호하지 않는 셀러에게 쾌적한 화이트 라이트 환경 제공</li>
              <li>깔끔하고 정돈된 주문/매출 에디토리얼 뷰</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td><strong>추천 순위</strong></td>
          <td><strong style="color:#EA3323; font-size:14px;">🥇 1순위 (공식 권장 채택안)</strong></td>
          <td><strong style="color:#06B6D4; font-size:14px;">🥈 2순위 (대안 추천)</strong></td>
          <td><strong style="color:#2563EB; font-size:14px;">🥉 3순위 (대안 추천)</strong></td>
        </tr>
      </tbody>
    </table>

    <h2 style="font-size: 20px; font-weight: 900; margin-bottom: 16px; text-align: center;">메인 화면(01_main) 대표 프리뷰 비교</h2>
    <div class="screen-preview-grid">
      <div class="preview-card">
        <h3 style="color:#EA3323;">시안 1: 82. 쿠팡 로켓 셀러 인디고 랩</h3>
        <img src="82_coupang_rocket_seller_studio/coupang-ops/01_main.png" alt="시안 1 메인">
        <a href="http://localhost:3800/showcase.html" class="btn btn-main" style="width:100%; display:inline-block;">🔍 라이트박스로 보기</a>
      </div>
      <div class="preview-card">
        <h3 style="color:#06B6D4;">시안 2: 83. 퀀트 이커머스 터미널 덱</h3>
        <img src="83_quant_ecommerce_terminal/coupang-ops/01_main.png" alt="시안 2 메인">
        <a href="http://localhost:3800/showcase.html" class="btn btn-outline" style="width:100%; display:inline-block;">🔍 라이트박스로 보기</a>
      </div>
      <div class="preview-card">
        <h3 style="color:#2563EB;">시안 3: 84. 미니멀 커머스 아틀리에</h3>
        <img src="84_minimal_commerce_atelier/coupang-ops/01_main.png" alt="시안 3 메인">
        <a href="http://localhost:3800/showcase.html" class="btn btn-outline" style="width:100%; display:inline-block;">🔍 라이트박스로 보기</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// 1. D:/Antigravity/Design/showcase.html 및 comparison.html 저장
fs.writeFileSync(path.join(BASE_DIR, 'showcase.html'), buildMasterShowcaseHtml(), 'utf-8');
fs.writeFileSync(path.join(BASE_DIR, 'comparison.html'), buildComparisonPageHtml(), 'utf-8');
console.log('✔ D:/Antigravity/Design/showcase.html & comparison.html 갱신 완료');

// 2. 각 템플릿 폴더에 showcase_12views.html 독립 보존
concepts.forEach(c => {
  const independentPath = path.join(BASE_DIR, c.folder, 'showcase_12views.html');
  fs.writeFileSync(independentPath, buildMasterShowcaseHtml(), 'utf-8');
  console.log(`✔ [${c.name}] 독립 showcase_12views.html 보존 완료`);
});

console.log('=== coupang-ops 쇼케이스 및 비교표 생성 완료 ===');
