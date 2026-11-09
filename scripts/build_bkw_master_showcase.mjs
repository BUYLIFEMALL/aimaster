import fs from 'fs';
import path from 'path';

const BASE_DIR = 'D:/Antigravity/Design';

const concepts = [
  {
    num: 1,
    id: '79_naver_blog_smart_analytics',
    folder: '79_naver_blog_smart_analytics/blog-keyword',
    name: '79. 네이버 블로그 스마트 애널리틱스 대시보드 스타일',
    shortName: '1안 (스마트 애널리틱스)',
    badge: '🏆 1순위 추천 (네이버 공식 SEO & 애널리틱스 HUD)',
    color: '#10B981',
    bg: '#0B111A',
    theme: '에메랄드 민트 + 네이버 그린 + 딥 챠콜 다크 HUD',
    font: 'Pretendard Variable',
    btn: '.btn-3d-mint (네이버 스마트 그린 3D 엠보싱)',
    desc: '네이버 검색광고 API 및 블로그 스마트블록/인플루언서 탭 점유율을 실시간 HUD처럼 분석하는 네이버 블로그 전용 프로 애널리틱스 스타일'
  },
  {
    num: 2,
    id: '80_quant_seo_matrix_terminal',
    folder: '80_quant_seo_matrix_terminal/blog-keyword',
    name: '80. 퀀트 SEO 매트릭스 터미널 덱 스타일',
    shortName: '2안 (퀀트 SEO 터미널)',
    badge: '💎 2순위 대안 (하이테크 사이버 퀀트 SEO & 블룸버그 덱)',
    color: '#06B6D4',
    bg: '#070A12',
    theme: '옵시디언 블랙 + 사이버 사이안 + 일렉트릭 바이올렛',
    font: 'JetBrains Mono / Pretendard',
    btn: '.btn-3d-cyan (사이버 네온 사이안 3D 엠보싱)',
    desc: '블룸버그 터미널 감성의 초정밀 키워드 퀀트 지표(경쟁률, 문서수, 검색량, CPC, 전환잠재력)를 하이테크 사이버펑크 무드로 장악하는 퀀트 덱'
  },
  {
    num: 3,
    id: '81_minimal_blogger_atelier',
    folder: '81_minimal_blogger_atelier/blog-keyword',
    name: '81. 미니멀 블로거 인텔리전스 아틀리에 스타일',
    shortName: '3안 (블로거 아틀리에)',
    badge: '🌿 3순위 대안 (미니멀 클린 페이퍼 & 세이지 그린 아틀리에)',
    color: '#059669',
    bg: '#F8FAFC',
    theme: '소프트 크림 페이퍼 + 세이지 에메랄드 + 슬레이트 잉크',
    font: 'Pretendard Variable',
    btn: '.btn-3d-sage (소프트 세이지 3D 엠보싱)',
    desc: '화사하고 단정한 에디토리얼 무드로 블로그 초보자부터 전문 마케터까지 눈의 피로 없이 키워드를 발굴하고 글감을 기획하는 라이트 감성 아틀리에'
  }
];

const screens = [
  { id: '01_main', title: '1. 메인 대시보드 & 키워드 분석 허브', desc: '키워드 검색, 실시간 검색량/문서수/경쟁률/난이도 HUD, 12대 핵심 기능 탭, 발굴 리스트' },
  { id: '02_detail', title: '2. 경쟁도 상세 & 상위 1위 블로그 공략 뷰', desc: '상위 1~10위 블로그 글자수/이미지수/태그/백링크 분석, 황금 키워드 조합기, AI 글감 추천' },
  { id: '03_guide', title: '3. 가이드 & SEO 상위노출 공략 매뉴얼', desc: '네이버 스마트블록 C-Rank & D.I.A 로직 공략 4단계, 크롬 확장 1클릭 연동 가이드' },
  { id: '04_settings', title: '4. API 설정 & 2026-11-01 표준 로그인', desc: '네이버 검색광고 API 연동, 기본 분석 설정, 5단계 표준 레이아웃 + 1행 약관' }
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
  <title>AI 블로그 키워드 자동화 (blog-keyword) 4대 화면 3시안 쇼케이스</title>
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
      background: #10B981;
      color: #042F1E;
      box-shadow: 0 4px 14px rgba(16,185,129,0.3);
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
      border-color: #10B981;
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
      background: rgba(16,185,129,0.9);
      color: #042F1E;
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
      background: #10B981;
      color: #042F1E;
    }
    .modal-prev { left: 24px; }
    .modal-next { right: 24px; }
  </style>
</head>
<body>

  <div class="header-section">
    <h1>🚀 AI 블로그 키워드 자동화 (blog-keyword) 4대 화면 3시안 쇼케이스</h1>
    <p>네이버 스마트블록 C-Rank & D.I.A 알고리즘 완벽 대응 · 1440px 고화질 캡처본 클릭 시 100% 라이트박스 팝업 확대</p>
    <div class="nav-links">
      <a href="http://localhost:3800/comparison.html" class="nav-btn nav-btn-primary">📊 4대 화면 3시안 종합 비교표 보기</a>
      <a href="https://blog-keyword.buylife.xyz/dashboard" target="_blank" class="nav-btn nav-btn-secondary">🌐 현재 프로덕션 대시보드 바로가기</a>
    </div>
  </div>

  <div class="matrix-section">
    <h3>📌 4대 화면 3시안 한눈에 보는 종합 비교 매트릭스</h3>
    <table class="matrix-table">
      <thead>
        <tr>
          <th>구분</th>
          <th style="color:#10B981;">시안 1: 79. 네이버 블로그 스마트 애널리틱스 (추천)</th>
          <th style="color:#06B6D4;">시안 2: 80. 퀀트 SEO 매트릭스 터미널</th>
          <th style="color:#059669;">시안 3: 81. 미니멀 블로거 인텔리전스 아틀리에</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>네이버 블로그 맞춤형 프로페셔널 애널리틱스 HUD</td>
          <td>블룸버그 터미널 스타일의 하이테크 사이버 퀀트 덱</td>
          <td>눈이 편안한 라이트 에디토리얼 아틀리에 & 워크스페이스</td>
        </tr>
        <tr>
          <td><strong>메인 컬러 & 톤</strong></td>
          <td>에메랄드 민트(#10B981) + 네이버 그린 + 딥 챠콜(#0B111A)</td>
          <td>옵시디언 블랙(#070A12) + 사이안 네온(#06B6D4) + 퍼플</td>
          <td>소프트 크림 페이퍼(#F8FAFC) + 세이지 그린(#059669) + 잉크</td>
        </tr>
        <tr>
          <td><strong>버튼 & UI 특징</strong></td>
          <td>3D 엠보싱 스마트 그린 버튼 (.btn-3d-mint), HUD 통계 뱃지</td>
          <td>3D 엠보싱 사이버 사이안 버튼 (.btn-3d-cyan), 모노 터미널</td>
          <td>3D 엠보싱 소프트 세이지 버튼 (.btn-3d-sage), 부드러운 카드</td>
        </tr>
        <tr>
          <td><strong>4대 화면 구성</strong></td>
          <td>1.메인 대시보드 / 2.경쟁도 상세 / 3.SEO 가이드 / 4.표준 로그인</td>
          <td>1.메인 대시보드 / 2.경쟁도 상세 / 3.SEO 가이드 / 4.표준 로그인</td>
          <td>1.메인 대시보드 / 2.경쟁도 상세 / 3.SEO 가이드 / 4.표준 로그인</td>
        </tr>
        <tr>
          <td><strong>추천 순위</strong></td>
          <td><strong style="color:#10B981;">🥇 1순위 (적극 추천 채택안)</strong></td>
          <td>🥈 2순위 (대안 - 퀀트/데이터 매니아)</td>
          <td>🥉 3순위 (대안 - 라이트 감성 유저)</td>
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
  <title>AI 블로그 키워드 자동화 (blog-keyword) 4대 화면 3시안 종합 비교표</title>
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
    .btn-main { background: #10B981; color: #042F1E; }
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
    .pros-list li::before { content: "✔"; position: absolute; left: 0; color: #10B981; }

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
    <h1>📊 AI 블로그 키워드 자동화 (blog-keyword) 4대 화면 3시안 종합 비교표</h1>
    <p class="sub">3가지 차별화된 디자인 컨셉의 배색, 테마, 컴포넌트 특성 및 추천 여부 정밀 대조</p>

    <div class="nav-bar">
      <a href="http://localhost:3800/showcase.html" class="btn btn-main">🖼️ 12개 뷰 통합 쇼케이스 (라이트박스 팝업)</a>
      <a href="https://blog-keyword.buylife.xyz/dashboard" target="_blank" class="btn btn-outline">🌐 공식 프로덕션 대시보드 바로가기</a>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 16%;">비교 항목</th>
          <th style="width: 28%; color: #10B981;">🥇 시안 1: 79. 네이버 블로그 스마트 애널리틱스</th>
          <th style="width: 28%; color: #06B6D4;">🥈 시안 2: 80. 퀀트 SEO 매트릭스 터미널</th>
          <th style="width: 28%; color: #059669;">🥉 시안 3: 81. 미니멀 블로거 인텔리전스 아틀리에</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>네이버 블로그 검색광고 및 스마트블록 점유율을 실시간 HUD로 분석하는 프로 애널리틱스</td>
          <td>블룸버그 터미널 감성의 초정밀 키워드 퀀트 지표를 사이버펑크 무드로 장악하는 퀀트 덱</td>
          <td>눈이 편안한 에디토리얼 무드로 초보자부터 마케터까지 글감을 발굴하는 라이트 아틀리에</td>
        </tr>
        <tr>
          <td><strong>컬러 시스템</strong></td>
          <td>
            <div class="color-pill"><span class="color-dot" style="background:#10B981;"></span>#10B981 에메랄드</div>
            <div class="color-pill"><span class="color-dot" style="background:#03C75A;"></span>#03C75A 네이버 그린</div>
            <div class="color-pill"><span class="color-dot" style="background:#0B111A;"></span>#0B111A 딥 챠콜</div>
          </td>
          <td>
            <div class="color-pill"><span class="color-dot" style="background:#06B6D4;"></span>#06B6D4 사이버 사이안</div>
            <div class="color-pill"><span class="color-dot" style="background:#8B5CF6;"></span>#8B5CF6 일렉트릭 퍼플</div>
            <div class="color-pill"><span class="color-dot" style="background:#070A12;"></span>#070A12 옵시디언</div>
          </td>
          <td>
            <div class="color-pill"><span class="color-dot" style="background:#059669;"></span>#059669 세이지 에메랄드</div>
            <div class="color-pill"><span class="color-dot" style="background:#F8FAFC;"></span>#F8FAFC 클린 페이퍼</div>
            <div class="color-pill"><span class="color-dot" style="background:#0F172A;"></span>#0F172A 잉크 슬레이트</div>
          </td>
        </tr>
        <tr>
          <td><strong>UI 인터랙션 & 버튼</strong></td>
          <td>
            • 입체 3D 엠보싱 스마트 그린 버튼 (<code>.btn-3d-mint</code>)<br>
            • 실시간 검색량/경쟁률 HUD 상태 뱃지<br>
            • 2026-11-01 5단계 표준 로그인 폼
          </td>
          <td>
            • 입체 3D 엠보싱 사이버 사이안 버튼 (<code>.btn-3d-cyan</code>)<br>
            • 퀀트 매트릭스 모노스페이스 데이터 테이블<br>
            • 사이버펑크 네온 글로우 테두리
          </td>
          <td>
            • 입체 3D 엠보싱 소프트 세이지 버튼 (<code>.btn-3d-sage</code>)<br>
            • 편안한 소프트 섀도우 카드 그리드<br>
            • 감성적인 에디토리얼 워크스페이스
          </td>
        </tr>
        <tr>
          <td><strong>장점 & 추천 이유</strong></td>
          <td>
            <ul class="pros-list">
              <li>네이버 블로그 도메인에 가장 직관적이고 친숙한 색상 조합</li>
              <li>키워드 발굴, C-Rank 점수, 문서수 대조가 한눈에 들어오는 가독성</li>
              <li>장시간 분석 시에도 집중도를 유지해주는 다크 HUD 무드</li>
            </ul>
          </td>
          <td>
            <ul class="pros-list">
              <li>데이터 중심의 퀀트 분석가/전문 마케터에게 압도적인 전문성 어필</li>
              <li>화려한 네온 액센트와 미래지향적인 터미널 감성</li>
            </ul>
          </td>
          <td>
            <ul class="pros-list">
              <li>다크 모드를 선호하지 않는 일반 블로거에게 편안한 가독성 제공</li>
              <li>화사하고 단정한 에디토리얼 잡지 스타일</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td><strong>추천 순위</strong></td>
          <td><strong style="color:#10B981; font-size:14px;">🥇 1순위 (적극 추천 채택안)</strong></td>
          <td><strong style="color:#06B6D4; font-size:14px;">🥈 2순위 (대안 추천)</strong></td>
          <td><strong style="color:#059669; font-size:14px;">🥉 3순위 (대안 추천)</strong></td>
        </tr>
      </tbody>
    </table>

    <h2 style="font-size: 20px; font-weight: 900; margin-bottom: 16px; text-align: center;">메인 화면(01_main) 대표 프리뷰 비교</h2>
    <div class="screen-preview-grid">
      <div class="preview-card">
        <h3 style="color:#10B981;">시안 1: 79. 네이버 블로그 스마트 애널리틱스</h3>
        <img src="79_naver_blog_smart_analytics/blog-keyword/01_main.png" alt="시안 1 메인">
        <a href="http://localhost:3800/showcase.html" class="btn btn-main" style="width:100%; display:inline-block;">🔍 라이트박스로 보기</a>
      </div>
      <div class="preview-card">
        <h3 style="color:#06B6D4;">시안 2: 80. 퀀트 SEO 매트릭스 터미널</h3>
        <img src="80_quant_seo_matrix_terminal/blog-keyword/01_main.png" alt="시안 2 메인">
        <a href="http://localhost:3800/showcase.html" class="btn btn-outline" style="width:100%; display:inline-block;">🔍 라이트박스로 보기</a>
      </div>
      <div class="preview-card">
        <h3 style="color:#059669;">시안 3: 81. 미니멀 블로거 인텔리전스 아틀리에</h3>
        <img src="81_minimal_blogger_atelier/blog-keyword/01_main.png" alt="시안 3 메인">
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

console.log('=== 쇼케이스 및 비교표 생성 완벽 완료 ===');
