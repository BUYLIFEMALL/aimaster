import fs from 'fs';
import path from 'path';

const BASE_DIR = 'D:/Antigravity/Design';

const concepts = [
  {
    num: 1,
    id: '85_naver_cafe_pro_community_studio',
    folder: '85_naver_cafe_pro_community_studio/naver-cafe-poster',
    name: '85. 네이버 카페 프로 커뮤니티 스튜디오 스타일',
    shortName: '1안 (카페 프로 스튜디오)',
    badge: '🏆 1순위 추천 (네이버 공식 카페 시그니처 그린 & 딥 슬레이트 잉크)',
    color: '#03C75A',
    bg: '#0C131F',
    theme: '네이버 시그니처 그린 + 딥 슬레이트 잉크 + 소프트 민트',
    font: 'Pretendard Variable',
    btn: '.btn-3d-cafe-green (카페 그린 3D 엠보싱)',
    desc: '네이버 공식 카페 감성을 계승하여 4단계 커뮤니티 파이프라인, 실시간 글감 수집 스트림, 모바일 네이버 카페 뷰파인더를 완벽 지원하는 1순위 추천 스타일'
  },
  {
    num: 2,
    id: '86_quant_viral_cafe_radar_console',
    folder: '86_quant_viral_cafe_radar_console/naver-cafe-poster',
    name: '86. 퀀트 바이럴 카페 레이더 딥 차콜 콘솔 스타일',
    shortName: '2안 (퀀트 바이럴 레이더)',
    badge: '⚡ 2순위 대안 (옵시디언 딥블랙 & 네온 에메랄드 HUD)',
    color: '#10B981',
    bg: '#070A12',
    theme: '옵시디언 딥블랙 + 네온 에메랄드 + 사이버 사이안',
    font: 'JetBrains Mono / Pretendard',
    btn: '.btn-3d-neon-emerald (네온 에메랄드 3D 엠보싱)',
    desc: '실시간 트렌드 키워드와 RSS 급상승 이슈를 초당 감지하여 타깃 카페별 침투 마케팅 성과와 바이럴 지수를 하이테크 사이버 무드로 관제하는 퀀트 콘솔'
  },
  {
    num: 3,
    id: '87_minimal_cafe_editorial_atelier',
    folder: '87_minimal_cafe_editorial_atelier/naver-cafe-poster',
    name: '87. 미니멀 카페 에디토리얼 아틀리에 스타일',
    shortName: '3안 (카페 에디토리얼 아틀리에)',
    badge: '🌿 3순위 대안 (클린 아이보리 페이퍼 & 소프트 올리브 세이지)',
    color: '#15803D',
    bg: '#FAF9F6',
    theme: '클린 아이보리 페이퍼 + 소프트 올리브 세이지 + 모던 차콜',
    font: 'Pretendard Variable',
    btn: '.btn-3d-sage-soft (소프트 세이지 3D 엠보싱)',
    desc: '화사하고 단정한 에디토리얼 무드로 장시간 글쓰기 및 커뮤니티 소통 피로도를 극소화하는 무소음 집중형(Zen) 라이트 아틀리에'
  }
];

const screens = [
  { id: '01_main', title: '1. 메인 대시보드 & 4단계 커뮤니티 파이프라인', desc: '연동 카페 8개, 수집 글감 42건, 당일 발행 16건, 예약 5건, 실시간 글감 수집 스트림 & 최근 발행 로그' },
  { id: '02_detail', title: '2. AI 카페 글쓰기 & 3대 소스 에디터 및 모바일 뷰파인더', desc: 'URL/RSS/Perplexity 3대 글감 선택, 카페 친근체 3단 어투, 스마트에디터 서식 에디터 & 네이버 카페 모바일 폰 뷰파인더 목업' },
  { id: '03_guide', title: '3. 4단계 올인원 카페 포스팅 마스터 가이드북', desc: '네이버 공식 OAuth 2.0 연동 가이드, 카페 club_id & menu_id 30초 추출 매트릭스, 네이버 카페 안전 운영 5대 수칙' },
  { id: '04_settings', title: '4. 네이버 공식 OAuth 연동 & 2026-11-01 5단계 표준 로그인', desc: '68px 카페 심볼 로고 + 알약 뱃지 + 볼드 한글명 + 2단 탭 폼 + 1행 축소 약관 동의 규격 100% 준수 & 네이버 계정 매핑' }
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
  <title>네이버 카페 포스팅 자동화 4대 화면 3시안 쇼케이스</title>
  <style>
    :root {
      --bg: #0B0F17;
      --card: #131B2B;
      --card2: #1A2538;
      --border: #23344D;
      --border-bright: #364F73;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #03C75A;
      --brand-hover: #00B050;
      --accent: #38BDF8;
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
      background: rgba(3,199,90,0.15);
      color: var(--brand);
      border: 1px solid rgba(3,199,90,0.3);
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
      max-width: 800px;
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
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
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
      background: rgba(3,199,90,0.2);
      color: #03C75A;
      border: 1px solid #03C75A;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      display: inline-block;
    }
    .badge-sub {
      background: rgba(56,189,248,0.15);
      color: #38BDF8;
      border: 1px solid rgba(56,189,248,0.3);
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
      letter-spacing: -0.01em;
      margin-bottom: 4px;
    }
    .row-header p {
      font-size: 13px;
      color: var(--muted);
    }
    .views-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 30px;
    }
    .view-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
    }
    .view-card:hover {
      transform: translateY(-5px);
      border-color: var(--brand);
      box-shadow: 0 16px 36px rgba(0,0,0,0.4);
    }
    .card-top {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--card2);
      border-bottom: 1px solid var(--border);
    }
    .badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .view-num {
      font-size: 11px;
      color: var(--muted);
      font-weight: 700;
    }
    .img-wrap {
      position: relative;
      width: 100%;
      background: #000;
      overflow: hidden;
      aspect-ratio: 16 / 10;
    }
    .img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s;
    }
    .view-card:hover .img-wrap img {
      transform: scale(1.02);
    }
    .zoom-overlay {
      position: absolute;
      inset: 0;
      background: rgba(11,15,23,0.7);
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
      font-weight: 800;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .card-bottom {
      padding: 14px 16px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .card-meta {
      font-size: 12px;
      color: var(--muted);
    }

    /* 1440px 고화질 원본 라이트박스 모달 팝업 */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(4,7,12,0.92);
      backdrop-filter: blur(8px);
      z-index: 9999;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px 30px;
    }
    .lightbox.active {
      display: flex;
    }
    .lb-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #FFF;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .lb-title-group h3 {
      font-size: 18px;
      font-weight: 900;
    }
    .lb-title-group p {
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
      background: rgba(19,27,43,0.8);
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
      border-color: var(--brand);
    }
    .lb-prev { left: 20px; }
    .lb-next { right: 20px; }
  </style>
</head>
<body>

  <header>
    <div class="header-badge">🎨 AIMaster DESIGN PROPOSAL • PORT 3800</div>
    <h1>네이버 카페 포스팅 자동화 4대 화면 3시안 쇼케이스</h1>
    <p class="subtitle">
      네이버 공식 Cafe API(OAuth 2.0) 100% 무결성 포스팅 파이프라인 • 2026-11-01 5단계 표준 로그인 규격 • 3D 엠보싱 버튼 탑재
    </p>
    <div class="quick-links">
      <a href="http://localhost:3800/comparison.html">📊 종합 비교표 단독 뷰어 (comparison.html)</a>
      <a href="https://naver-cafe-poster.buylife.xyz" target="_blank">🌐 공식 운영 도메인</a>
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
          <th>시안 1 (85. 카페 프로 스튜디오) 🏆</th>
          <th>시안 2 (86. 퀀트 바이럴 레이더) ⚡</th>
          <th>시안 3 (87. 카페 에디토리얼 아틀리에) 🌿</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td>네이버 공식 카페 시그니처 그린 + 딥 슬레이트 잉크 커뮤니티 스튜디오</td>
          <td>옵시디언 딥블랙 + 네온 에메랄드 + 사이버 사이안 퀀트 레이더 콘솔</td>
          <td>클린 아이보리 페이퍼 + 소프트 올리브 세이지 + 모던 차콜 아틀리에</td>
        </tr>
        <tr>
          <td><strong>배색 시스템</strong></td>
          <td>배경: <code>#0C131F</code><br>브랜드: <code>#03C75A</code> (네이버 그린)<br>서브: <code>#38BDF8</code> (스카이)</td>
          <td>배경: <code>#070A12</code><br>브랜드: <code>#10B981</code> (네온 에메랄드)<br>서브: <code>#06B6D4</code> (사이안)</td>
          <td>배경: <code>#FAF9F6</code><br>브랜드: <code>#15803D</code> (소프트 올리브)<br>서브: <code>#0284C7</code> (블루)</td>
        </tr>
        <tr>
          <td><strong>타이포그래피</strong></td>
          <td>Pretendard Variable (모던 산세리프)</td>
          <td>JetBrains Mono / Pretendard (하이테크 모노)</td>
          <td>Pretendard Variable (에디토리얼 산세리프)</td>
        </tr>
        <tr>
          <td><strong>3D 엠보싱 버튼</strong></td>
          <td><code>.btn-3d-cafe-green</code><br>(네이버 그린 2단 그라데이션 + 4px 입체 섀도우)</td>
          <td><code>.btn-3d-neon-emerald</code><br>(네온 에메랄드 2단 그라데이션 + 4px 다크 섀도우)</td>
          <td><code>.btn-3d-sage-soft</code><br>(소프트 세이지 2단 그라데이션 + 4px 세이지 섀도우)</td>
        </tr>
        <tr>
          <td><strong>핵심 차별화 컴포넌트</strong></td>
          <td>• 4단계 커뮤니티 파이프라인 인디케이터 배너<br>• 4대 핵심 KPI 카드 (연동카페, 글감, 발행, 예약)<br>• 3대 글감 스트림 (URL/RSS/Perplexity)<br>• 네이버 카페 모바일 폰 뷰파인더 덱 목업</td>
          <td>• 초당 트렌드 키워드 실시간 감지 HUD<br>• 카페 침투 성공률 & 바이럴 스코어(Viral Score)<br>• A/B 스플릿 글감 생성 터미널<br>• 고밀도 퀀트 모니터링 데스크</td>
          <td>• 일일 카페 브리핑 요약 데스크<br>• 무소음 집중형(Zen) 듀얼 에디터<br>• 카드 그리드형 글감 큐레이션<br>• 초보자 친화형 튜토리얼 매뉴얼</td>
        </tr>
        <tr>
          <td><strong>5단계 로그인 규격</strong></td>
          <td>68px 카페 심볼 로고 + 1행 축소 약관 완비</td>
          <td>68px 사이버 로고 + 1행 축소 약관 완비</td>
          <td>68px 세이지 로고 + 1행 축소 약관 완비</td>
        </tr>
        <tr>
          <td><strong>추천 여부</strong></td>
          <td><span class="badge-recommend">🏆 1순위 강력 추천 (네이버 공식 감성 완벽 일치)</span></td>
          <td><span class="badge-sub">⚡ 2순위 대안 (전문 마케터 침투용)</span></td>
          <td><span class="badge-sub">🌿 3순위 대안 (장시간 글쓰기 집중용)</span></td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- 12개 뷰 카드 그리드 -->
  ${cardsHtml}

  <!-- 1440px 고화질 원본 라이트박스 모달 -->
  <div id="lightbox" class="lightbox">
    <div class="lb-header">
      <div class="lb-title-group">
        <h3 id="lb-title">시안 제목</h3>
        <p id="lb-meta">화면 정보</p>
      </div>
      <div class="lb-controls">
        <button class="lb-btn" id="lb-orig-btn">100% 원본 크기 토글</button>
        <button class="lb-close" id="lb-close">✕</button>
      </div>
    </div>
    <div class="lb-body">
      <button class="lb-nav-btn lb-prev" id="lb-prev">‹</button>
      <img id="lb-img" class="lb-img" src="" alt="확대 뷰">
      <button class="lb-nav-btn lb-next" id="lb-next">›</button>
    </div>
  </div>

  <script>
    const cards = document.querySelectorAll('.view-card');
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lb-img');
    const lbTitle = document.getElementById('lb-title');
    const lbMeta = document.getElementById('lb-meta');
    const lbClose = document.getElementById('lb-close');
    const lbPrev = document.getElementById('lb-prev');
    const lbNext = document.getElementById('lb-next');
    const lbOrigBtn = document.getElementById('lb-orig-btn');

    let currentIndex = 0;
    const viewList = [];

    cards.forEach((card, idx) => {
      viewList.push({
        idx: idx,
        src: card.getAttribute('data-src'),
        concept: card.getAttribute('data-concept'),
        screen: card.getAttribute('data-screen')
      });

      card.addEventListener('click', () => {
        openLightbox(idx);
      });
    });

    function openLightbox(idx) {
      currentIndex = idx;
      const v = viewList[currentIndex];
      lbImg.src = v.src;
      lbTitle.innerText = v.concept;
      lbMeta.innerText = v.screen + ' (View #' + (currentIndex + 1) + ' / 12)';
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lb.classList.remove('active');
      document.body.style.overflow = '';
      lbImg.style.maxHeight = '85vh';
      lbImg.style.maxWidth = '95%';
    }

    lbClose.addEventListener('click', closeLightbox);
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.classList.contains('lb-body')) {
        closeLightbox();
      }
    });

    lbPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + viewList.length) % viewList.length;
      openLightbox(currentIndex);
    });

    lbNext.addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % viewList.length;
      openLightbox(currentIndex);
    });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lbPrev.click();
      if (e.key === 'ArrowRight') lbNext.click();
    });

    let isOrig = false;
    lbOrigBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isOrig = !isOrig;
      if (isOrig) {
        lbImg.style.maxHeight = 'none';
        lbImg.style.maxWidth = 'none';
        lbOrigBtn.innerText = '화면 맞춤 토글';
      } else {
        lbImg.style.maxHeight = '85vh';
        lbImg.style.maxWidth = '95%';
        lbOrigBtn.innerText = '100% 원본 크기 토글';
      }
    });
  </script>
</body>
</html>`;
}

function buildComparisonHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>네이버 카페 포스팅 자동화 4대 화면 3시안 종합 비교표</title>
  <style>
    :root {
      --bg: #0B0F17;
      --card: #131B2B;
      --card2: #1A2538;
      --border: #23344D;
      --border-bright: #364F73;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #03C75A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
      padding: 40px;
      line-height: 1.5;
    }
    .container {
      max-width: 1280px;
      margin: 0 auto;
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
    .sub {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 20px;
    }
    .back-btn {
      display: inline-block;
      padding: 8px 16px;
      background: var(--card2);
      border: 1px solid var(--border-bright);
      color: var(--brand);
      text-decoration: none;
      font-weight: 800;
      border-radius: 8px;
    }
    .card-box {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
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
    .badge-recommend {
      background: rgba(3,199,90,0.2);
      color: #03C75A;
      border: 1px solid #03C75A;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
    }
    .badge-sub {
      background: rgba(56,189,248,0.15);
      color: #38BDF8;
      border: 1px solid rgba(56,189,248,0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 네이버 카페 포스팅 자동화 4대 화면 3시안 종합 비교표</h1>
      <p class="sub">4대 화면(메인/상세/가이드/설정)과 3대 시안의 배색, 핵심 테마, 컴포넌트 특징 종합 대조</p>
      <a href="http://localhost:3800/showcase.html" class="back-btn">➔ 12개 뷰 인터랙티브 쇼케이스 열기 (showcase.html)</a>
    </header>

    <div class="card-box">
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>시안 1 (85. 카페 프로 스튜디오) 🏆</th>
            <th>시안 2 (86. 퀀트 바이럴 레이더) ⚡</th>
            <th>시안 3 (87. 카페 에디토리얼 아틀리에) 🌿</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>디자인 컨셉</strong></td>
            <td>네이버 공식 카페 시그니처 그린 + 딥 슬레이트 잉크 커뮤니티 스튜디오</td>
            <td>옵시디언 딥블랙 + 네온 에메랄드 + 사이버 사이안 퀀트 레이더 콘솔</td>
            <td>클린 아이보리 페이퍼 + 소프트 올리브 세이지 + 모던 차콜 아틀리에</td>
          </tr>
          <tr>
            <td><strong>배색 시스템</strong></td>
            <td>배경: <code>#0C131F</code><br>브랜드: <code>#03C75A</code> (네이버 그린)<br>서브: <code>#38BDF8</code> (스카이)</td>
            <td>배경: <code>#070A12</code><br>브랜드: <code>#10B981</code> (네온 에메랄드)<br>서브: <code>#06B6D4</code> (사이안)</td>
            <td>배경: <code>#FAF9F6</code><br>브랜드: <code>#15803D</code> (소프트 올리브)<br>서브: <code>#0284C7</code> (블루)</td>
          </tr>
          <tr>
            <td><strong>타이포그래피</strong></td>
            <td>Pretendard Variable (모던 산세리프)</td>
            <td>JetBrains Mono / Pretendard (하이테크 모노)</td>
            <td>Pretendard Variable (에디토리얼 산세리프)</td>
          </tr>
          <tr>
            <td><strong>3D 엠보싱 버튼</strong></td>
            <td><code>.btn-3d-cafe-green</code><br>(네이버 그린 2단 그라데이션 + 4px 입체 섀도우)</td>
            <td><code>.btn-3d-neon-emerald</code><br>(네온 에메랄드 2단 그라데이션 + 4px 다크 섀도우)</td>
            <td><code>.btn-3d-sage-soft</code><br>(소프트 세이지 2단 그라데이션 + 4px 세이지 섀도우)</td>
          </tr>
          <tr>
            <td><strong>핵심 차별화 컴포넌트</strong></td>
            <td>• 4단계 커뮤니티 파이프라인 인디케이터 배너<br>• 4대 핵심 KPI 카드 (연동카페, 글감, 발행, 예약)<br>• 3대 글감 스트림 (URL/RSS/Perplexity)<br>• 네이버 카페 모바일 폰 뷰파인더 덱 목업</td>
            <td>• 초당 트렌드 키워드 실시간 감지 HUD<br>• 카페 침투 성공률 & 바이럴 스코어(Viral Score)<br>• A/B 스플릿 글감 생성 터미널<br>• 고밀도 퀀트 모니터링 데스크</td>
            <td>• 일일 카페 브리핑 요약 데스크<br>• 무소음 집중형(Zen) 듀얼 에디터<br>• 카드 그리드형 글감 큐레이션<br>• 초보자 친화형 튜토리얼 매뉴얼</td>
          </tr>
          <tr>
            <td><strong>5단계 로그인 규격</strong></td>
            <td>68px 카페 심볼 로고 + 1행 축소 약관 완비</td>
            <td>68px 사이버 로고 + 1행 축소 약관 완비</td>
            <td>68px 세이지 로고 + 1행 축소 약관 완비</td>
          </tr>
          <tr>
            <td><strong>추천 여부</strong></td>
            <td><span class="badge-recommend">🏆 1순위 강력 추천 (네이버 공식 감성 완벽 일치)</span></td>
            <td><span class="badge-sub">⚡ 2순위 대안 (전문 마케터 침투용)</span></td>
            <td><span class="badge-sub">🌿 3순위 대안 (장시간 글쓰기 집중용)</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function run() {
  console.log('🏗️ 단일 통합 쇼케이스 HTML 및 종합 비교표 빌드 시작...');

  const masterShowcaseHtml = buildMasterShowcaseHtml();
  const comparisonHtml = buildComparisonHtml();

  // D:\Antigravity\Design\showcase.html
  fs.writeFileSync(path.join(BASE_DIR, 'showcase.html'), masterShowcaseHtml, 'utf-8');
  console.log('✅ showcase.html 생성 완료');

  // D:\Antigravity\Design\comparison.html
  fs.writeFileSync(path.join(BASE_DIR, 'comparison.html'), comparisonHtml, 'utf-8');
  console.log('✅ comparison.html 생성 완료');

  // 각 시안별 독립 폴더에도 showcase_12views.html 복사
  concepts.forEach(c => {
    const targetDir = path.join(BASE_DIR, c.folder);
    fs.writeFileSync(path.join(targetDir, 'showcase_12views.html'), masterShowcaseHtml, 'utf-8');
    console.log(`✅ ${c.folder}/showcase_12views.html 생성 완료`);
  });

  console.log('🎉 쇼케이스 및 종합 비교표 구축 100% 완료!');
}

run();
