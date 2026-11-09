import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '76_naver_commerce_pro_seller_studio/smartstore-register'),
  2: path.join(BASE_DIR, '77_quant_marketplace_intelligence_deck/smartstore-register'),
  3: path.join(BASE_DIR, '78_minimal_smartstore_atelier/smartstore-register'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 템플릿 생성 함수
function buildViewHtml(cNum, sNum) {
  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = '';
  let logoBg = '';
  let accentColor = '';

  if (cNum === 1) {
    // 76. 네이버 커머스 프로 셀러 스튜디오 스타일 (네이버 스마트 그린 & 모던 옵시디언 다크)
    themeCss = `
      --bg: #0B1015;
      --card: #131B24;
      --card2: #1B2430;
      --border: #263545;
      --border-bright: #384C62;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #03C75A;
      --brand-hover: #00B04F;
      --accent: #10B981;
      --accent-sub: #06B6D4;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(3,199,90,0.15); color:#03C75A; border:1px solid rgba(3,199,90,0.3);">🟢 NAVER COMMERCE PRO HUD</span>`;
    btnClass = 'btn-3d-naver';
    brandName = 'AI 스마트스토어 상품 자동등록기';
    logoBg = 'linear-gradient(135deg, #03C75A 0%, #009944 100%)';
    accentColor = '#03C75A';
  } else if (cNum === 2) {
    // 77. 퀀트 마켓플레이스 인텔리전스 덱 스타일 (옵시디언 블랙 & 사이버 사이안/바이올렛)
    themeCss = `
      --bg: #070A12;
      --card: #0F1523;
      --card2: #151D30;
      --border: #1E293B;
      --border-bright: #334155;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #06B6D4;
      --brand-hover: #0284C7;
      --accent: #8B5CF6;
      --accent-sub: #10B981;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, monospace, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(6,182,212,0.15); color:#06B6D4; border:1px solid rgba(6,182,212,0.3);">⚡ QUANT MARKET INTELLIGENCE</span>`;
    btnClass = 'btn-3d-cyan';
    brandName = 'AI 스마트스토어 상품 자동등록기';
    logoBg = 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)';
    accentColor = '#06B6D4';
  } else {
    // 78. 미니멀 스마트스토어 아틀리에 스타일 (클린 크림 페이퍼 & 세이지 그린)
    themeCss = `
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card2: #F1F5F9;
      --border: #E2E8F0;
      --border-bright: #CBD5E1;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #10B981;
      --brand-hover: #059669;
      --accent: #6366F1;
      --accent-sub: #EA580C;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.25);">🌿 MINIMAL SELLER ATELIER</span>`;
    btnClass = 'btn-3d-sage';
    brandName = 'AI 스마트스토어 상품 자동등록기';
    logoBg = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    accentColor = '#10B981';
  }

  // 공통 뷰 헤더 및 본문 작성
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${brandName} - 시안 ${cNum} 화면 ${sNum}</title>
  <style>
    :root {
      ${themeCss}
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    /* 3D 엠보싱 버튼 3종 */
    .btn-3d-naver {
      background: linear-gradient(180deg, #03C75A 0%, #009944 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #22C55E;
      box-shadow: 0 4px 0 #01682F, 0 8px 16px rgba(3,199,90,0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-naver:hover { transform: translateY(1px); box-shadow: 0 2px 0 #01682F; }

    .btn-3d-cyan {
      background: linear-gradient(180deg, #06B6D4 0%, #0284C7 100%);
      color: #04141A;
      font-weight: 900;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #38BDF8;
      box-shadow: 0 4px 0 #0369A1, 0 8px 16px rgba(6,182,212,0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-cyan:hover { transform: translateY(1px); box-shadow: 0 2px 0 #0369A1; }

    .btn-3d-sage {
      background: linear-gradient(180deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #34D399;
      box-shadow: 0 4px 0 #065F46, 0 8px 16px rgba(16,185,129,0.25);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-sage:hover { transform: translateY(1px); box-shadow: 0 2px 0 #065F46; }

    .btn-secondary {
      background: var(--card2);
      color: var(--text);
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid var(--border-bright);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }

    /* 상단 헤더 */
    header {
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 12px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      background: ${logoBg};
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .nav-tabs {
      display: flex;
      gap: 6px;
      background: var(--card2);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .nav-tab {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--muted);
      text-decoration: none;
      transition: all 0.15s;
    }
    .nav-tab.active {
      background: var(--card);
      color: var(--brand);
      border: 1px solid var(--border-bright);
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }

    /* 본문 레이아웃 */
    main {
      flex: 1;
      padding: 24px 28px;
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
    }

    /* 4단계 파이프라인 인디케이터 배너 */
    .pipeline-banner {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .pipeline-step {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 10px;
      background: var(--card2);
      border: 1px solid var(--border);
    }
    .pipeline-step.active {
      border-color: var(--brand);
      background: var(--card);
      box-shadow: 0 0 0 1px var(--brand);
    }
    .step-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--border-bright);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
    }
    .pipeline-step.active .step-num {
      background: var(--brand);
      color: #0B1015;
    }

    /* 카드 */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }

    /* KPI 그리드 */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
    }
    .kpi-val {
      font-size: 26px;
      font-weight: 900;
      margin-top: 6px;
      letter-spacing: -0.5px;
    }

    /* 상품 테이블 */
    .product-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .product-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 12px;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      font-weight: 700;
    }
    .product-table td {
      padding: 14px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .product-table tr:hover td {
      background: var(--card2);
    }

    /* 5단계 표준 로그인 카드 */
    .login-container {
      max-width: 440px;
      margin: 40px auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    .input-field {
      width: 100%;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-bright);
      background: var(--card2);
      color: var(--text);
      font-size: 14px;
      margin-bottom: 12px;
      outline: none;
    }
    .input-field:focus {
      border-color: var(--brand);
    }
  </style>
</head>
<body>

  <!-- 글로벌 헤더 -->
  <header>
    <div class="brand-box">
      <div class="logo-icon">🛒</div>
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <strong style="font-size:16px; font-weight:900;">AI 스마트스토어 상품 자동등록기</strong>
          <span style="font-size:11px; font-weight:800; color:var(--muted); background:var(--card2); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">v1.25</span>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">AIMASTER SMARTSTORE REGISTER · EXTENSION RUNNER</div>
      </div>
      <div style="margin-left:12px;">${themeBadge}</div>
    </div>

    <nav class="nav-tabs">
      <a href="#" class="nav-tab ${sNum === 1 ? 'active' : ''}">📦 등록할 상품</a>
      <a href="#" class="nav-tab ${sNum === 2 ? 'active' : ''}">✨ 속성 AI 추천</a>
      <a href="#" class="nav-tab ${sNum === 3 ? 'active' : ''}">🧩 확장 가이드</a>
      <a href="#" class="nav-tab ${sNum === 4 ? 'active' : ''}">⚙️ 스토어 기본값 / 로그인</a>
    </nav>

    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:12px; color:var(--muted);">셀러 계정: buylifemall</span>
      <button class="${btnClass}" style="padding:6px 12px; font-size:12px;">+ 상세페이지 상품 불러오기</button>
    </div>
  </header>

  <!-- 메인 본문 -->
  <main>
    ${renderViewContent(cNum, sNum, btnClass, accentColor)}
  </main>
</body>
</html>`;
}

function renderViewContent(cNum, sNum, btnClass, accentColor) {
  if (sNum === 1) {
    // 01_main: 메인 뷰 (상품 등록 워크스페이스 & 마켓 등록 덱)
    return `
      <!-- 4단계 파이프라인 인디케이터 배너 -->
      <div class="pipeline-banner">
        <div class="pipeline-step">
          <div class="step-num">1</div>
          <div>
            <div style="font-weight:800; font-size:12px;">스토어 기본값</div>
            <div style="font-size:10px; color:var(--muted);">원산지·A/S·배송템플릿</div>
          </div>
        </div>
        <div class="pipeline-step">
          <div class="step-num">2</div>
          <div>
            <div style="font-weight:800; font-size:12px;">크롬 확장 연결</div>
            <div style="font-size:10px; color:var(--muted);">토큰 페어링 1회</div>
          </div>
        </div>
        <div class="pipeline-step active">
          <div class="step-num">3</div>
          <div>
            <div style="font-weight:800; font-size:12px; color:var(--brand);">상품 및 AI 속성 확인</div>
            <div style="font-size:10px; color:var(--muted);">상세페이지 데이터 연동</div>
          </div>
        </div>
        <div class="pipeline-step">
          <div class="step-num">4</div>
          <div>
            <div style="font-weight:800; font-size:12px;">스마트스토어 등록</div>
            <div style="font-size:10px; color:var(--muted);">1초 폼 자동입력 완료</div>
          </div>
        </div>
      </div>

      <!-- KPI 지표 요약 카드 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">등록 대기 상품</div>
          <div class="kpi-val" style="color:var(--brand);">14<span style="font-size:14px; font-weight:500; margin-left:4px;">개</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">상세페이지 자동화 연동</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">스마트스토어 등록 완료</div>
          <div class="kpi-val" style="color:var(--accent);">48<span style="font-size:14px; font-weight:500; margin-left:4px;">건</span></div>
          <div style="font-size:11px; color:#10B981; margin-top:4px;">✓ 판매자센터 실등록 성공률 100%</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">Claude 속성 AI 매핑률</div>
          <div class="kpi-val" style="color:var(--gold);">98.5<span style="font-size:14px; font-weight:500; margin-left:4px;">%</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">카테고리·태그 자동 추천</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">크롬 확장 세션 상태</div>
          <div class="kpi-val" style="font-size:20px; color:#10B981; margin-top:10px;">🟢 정상 연결됨</div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">sell.smartstore.naver.com 대기</div>
        </div>
      </div>

      <!-- 상품 등록 관리 카드 -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h2 style="font-size:18px; font-weight:900;">📦 스마트스토어 등록 대기 상품 목록</h2>
            <p style="font-size:12px; color:var(--muted); margin-top:2px;">AI 상세페이지 자동화에서 완성된 상품을 크롬 확장을 통해 네이버 판매자센터에 1초 만에 자동 기입합니다.</p>
          </div>
          <div style="display:flex; gap:8px;">
            <input type="text" placeholder="상품명 또는 카테고리 검색..." style="padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:var(--card2); color:var(--text); font-size:12px; width:220px;">
            <button class="btn-secondary" style="font-size:12px; padding:6px 12px;">선택 항목 일괄 등록</button>
          </div>
        </div>

        <table class="product-table">
          <thead>
            <tr>
              <th style="width:40px;"><input type="checkbox"></th>
              <th style="width:80px;">썸네일</th>
              <th>상품 정보 및 권장 카테고리</th>
              <th style="width:120px;">판매가 / 할인가</th>
              <th style="width:140px;">AI 속성 매핑</th>
              <th style="width:130px;">등록 상태</th>
              <th style="width:170px; text-align:right;">실행 액션</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="checkbox" checked></td>
              <td><div style="width:54px; height:54px; border-radius:8px; background:var(--card2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:24px;">💨</div></td>
              <td>
                <div style="font-weight:800; font-size:14px; margin-bottom:4px;">[단독특가] 프리미엄 무소음 탁상용 미니 무선 가습기 500ml</div>
                <div style="font-size:11px; color:var(--muted); display:flex; gap:8px;">
                  <span>가전/디지털 &gt; 계절가전 &gt; 가습기 &gt; 초음파식가습기</span>
                  <span style="color:var(--brand); font-weight:700;">#무선 #대용량 #무드등</span>
                </div>
              </td>
              <td>
                <div style="font-weight:900; font-size:14px; color:var(--brand);">34,900원</div>
                <div style="font-size:11px; color:var(--muted); text-decoration:line-through;">49,000원 (-28%)</div>
              </td>
              <td>
                <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">✓ 속성 4건 매핑</span>
                <div style="font-size:10px; color:var(--muted); margin-top:2px;">Claude 속성 추천 완료</div>
              </td>
              <td>
                <span class="badge" style="background:rgba(245,158,11,0.15); color:#F59E0B; border:1px solid rgba(245,158,11,0.3);">⏳ 등록 대기중</span>
              </td>
              <td style="text-align:right;">
                <button class="${btnClass}" style="font-size:12px; padding:6px 12px;">스토어 즉시 등록 🚀</button>
              </td>
            </tr>
            <tr>
              <td><input type="checkbox"></td>
              <td><div style="width:54px; height:54px; border-radius:8px; background:var(--card2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:24px;">☕</div></td>
              <td>
                <div style="font-weight:800; font-size:14px; margin-bottom:4px;">[감성홈카페] 북유럽 세라믹 머그잔 & 코스터 기프트 세트</div>
                <div style="font-size:11px; color:var(--muted); display:flex; gap:8px;">
                  <span>주방/생활 &gt; 식기 &gt; 컵/잔 &gt; 머그잔</span>
                  <span style="color:var(--brand); font-weight:700;">#세라믹 #집들이선물 #홈카페</span>
                </div>
              </td>
              <td>
                <div style="font-weight:900; font-size:14px; color:var(--brand);">28,500원</div>
                <div style="font-size:11px; color:var(--muted); text-decoration:line-through;">35,000원 (-18%)</div>
              </td>
              <td>
                <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">✓ 속성 3건 매핑</span>
                <div style="font-size:10px; color:var(--muted); margin-top:2px;">Claude 속성 추천 완료</div>
              </td>
              <td>
                <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">✓ 어제 등록완료</span>
              </td>
              <td style="text-align:right;">
                <button class="btn-secondary" style="font-size:12px; padding:6px 12px;">다시 등록 ↻</button>
              </td>
            </tr>
            <tr>
              <td><input type="checkbox"></td>
              <td><div style="width:54px; height:54px; border-radius:8px; background:var(--card2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:24px;">🧘</div></td>
              <td>
                <div style="font-weight:800; font-size:14px; margin-bottom:4px;">[체형보정] 에어라이트 쿨링 심리스 하이웨이스트 레깅스 9부</div>
                <div style="font-size:11px; color:var(--muted); display:flex; gap:8px;">
                  <span>패션의류 &gt; 여성의류 &gt; 레깅스 &gt; 스포츠레깅스</span>
                  <span style="color:var(--brand); font-weight:700;">#심리스 #하이웨이스트 #쿨링</span>
                </div>
              </td>
              <td>
                <div style="font-weight:900; font-size:14px; color:var(--brand);">22,000원</div>
                <div style="font-size:11px; color:var(--muted); text-decoration:line-through;">39,000원 (-43%)</div>
              </td>
              <td>
                <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">✓ 속성 5건 매핑</span>
                <div style="font-size:10px; color:var(--muted); margin-top:2px;">Claude 속성 추천 완료</div>
              </td>
              <td>
                <span class="badge" style="background:rgba(245,158,11,0.15); color:#F59E0B; border:1px solid rgba(245,158,11,0.3);">⏳ 등록 대기중</span>
              </td>
              <td style="text-align:right;">
                <button class="${btnClass}" style="font-size:12px; padding:6px 12px;">스토어 즉시 등록 🚀</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: 상세 뷰 (Claude API 상품 속성 AI 추천 & 스마트스토어 폼 매핑 분석 뷰)
    return `
      <div style="display:grid; grid-template-columns: 1.1fr 1fr; gap:24px;">
        <!-- 좌측: 상품 정보 및 Claude 속성 AI 매핑 덱 -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
            <div>
              <span class="badge" style="background:rgba(3,199,90,0.15); color:#03C75A; margin-bottom:8px;">📦 상품 ID: PRD_20261109_001</span>
              <h2 style="font-size:18px; font-weight:900;">[단독특가] 프리미엄 무소음 탁상용 미니 무선 가습기 500ml</h2>
              <p style="font-size:12px; color:var(--muted); margin-top:2px;">AI 상세페이지 자동화에서 추출된 데이터와 스마트스토어 입력 폼 필드 매핑 상태입니다.</p>
            </div>
            <button class="${btnClass}" style="font-size:13px; padding:8px 16px;">판매자센터 자동기입 🚀</button>
          </div>

          <!-- Claude API 추천 카테고리 & 태그 -->
          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <strong style="font-size:13px; color:var(--brand); display:flex; align-items:center; gap:6px;">
                🤖 Claude 속성 AI 분석 추천 (매칭 정확도 99.2%)
              </strong>
              <span style="font-size:11px; color:var(--muted);">운영자 Claude API 월 $200 크레딧 구동</span>
            </div>
            
            <div style="margin-bottom:12px;">
              <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">권장 네이버 스마트스토어 카테고리</label>
              <div style="font-weight:800; font-size:13px; padding:8px 12px; background:var(--card); border:1px solid var(--border-bright); border-radius:8px;">
                가전/디지털 &gt; 계절가전 &gt; 가습기 &gt; 초음파식가습기 (카테고리 번호: 50002548)
              </div>
            </div>

            <div>
              <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:4px;">스마트스토어 노출 최적화 검색 태그 (최대 10개)</label>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#무선가습기</span>
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#탁상용가습기</span>
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#미니가습기</span>
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#사무실가습기</span>
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#원룸가습기</span>
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#USB가습기</span>
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#초음파가습기</span>
                <span class="badge" style="background:var(--card); color:var(--text); border:1px solid var(--border-bright);">#무드등가습기</span>
              </div>
            </div>
          </div>

          <!-- 필수 속성 매핑 테이블 -->
          <div style="margin-bottom:18px;">
            <strong style="font-size:13px; display:block; margin-bottom:8px;">📋 스마트스토어 필수 속성 항목</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div style="padding:10px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">전원 방식</div>
                <div style="font-weight:800; font-size:13px; margin-top:2px;">USB 충전식 (무선 내장배터리)</div>
              </div>
              <div style="padding:10px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">물탱크 용량</div>
                <div style="font-weight:800; font-size:13px; margin-top:2px;">500ml (대용량 수조)</div>
              </div>
              <div style="padding:10px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">부가 기능</div>
                <div style="font-weight:800; font-size:13px; margin-top:2px;">7색 LED 무드등 / 자동 전원차단</div>
              </div>
              <div style="padding:10px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">연속 분사 시간</div>
                <div style="font-weight:800; font-size:13px; margin-top:2px;">최대 8시간 지속</div>
              </div>
            </div>
          </div>

          <!-- 판매 가격 및 배송 템플릿 매핑 -->
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
            <div style="padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
              <div style="font-size:11px; color:var(--muted);">정상 판매가</div>
              <div style="font-size:16px; font-weight:900; margin-top:2px;">49,000원</div>
            </div>
            <div style="padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
              <div style="font-size:11px; color:var(--muted);">스토어 할인가</div>
              <div style="font-size:16px; font-weight:900; color:var(--brand); margin-top:2px;">34,900원 (-28%)</div>
            </div>
            <div style="padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
              <div style="font-size:11px; color:var(--muted);">배송비 템플릿</div>
              <div style="font-size:14px; font-weight:800; margin-top:2px;">기본 무료배송 (CJ대한통운)</div>
            </div>
          </div>
        </div>

        <!-- 우측: 옵션 목록 및 스마트스토어 폼 매핑 시뮬레이터 -->
        <div class="card">
          <h2 style="font-size:18px; font-weight:900; margin-bottom:6px;">⚡ 스마트스토어 폼 자동 입력 시뮬레이터</h2>
          <p style="font-size:12px; color:var(--muted); margin-bottom:16px;">크롬 확장이 네이버 판매자센터 탭에 즉시 채워넣을 필드 데이터셋입니다.</p>

          <!-- 옵션 테이블 -->
          <div style="margin-bottom:20px;">
            <strong style="font-size:13px; display:block; margin-bottom:8px;">선택형 옵션 (색상 3종)</strong>
            <table class="product-table" style="margin-top:0;">
              <thead>
                <tr>
                  <th>옵션명</th>
                  <th>옵션값</th>
                  <th>추가금</th>
                  <th>재고수량</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>색상</td>
                  <td style="font-weight:800;">스노우 화이트</td>
                  <td>+0원</td>
                  <td>150개</td>
                  <td><span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">판매중</span></td>
                </tr>
                <tr>
                  <td>색상</td>
                  <td style="font-weight:800;">베이비 핑크</td>
                  <td>+0원</td>
                  <td>80개</td>
                  <td><span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">판매중</span></td>
                </tr>
                <tr>
                  <td>색상</td>
                  <td style="font-weight:800;">포레스트 민트</td>
                  <td>+1,000원</td>
                  <td>50개</td>
                  <td><span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">판매중</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 상세설명 HTML 및 이미지 갤러리 프리뷰 -->
          <div style="margin-bottom:20px;">
            <strong style="font-size:13px; display:block; margin-bottom:8px;">대표 썸네일 & 스마트에디터 ONE 본문</strong>
            <div style="display:flex; gap:10px; align-items:center; background:var(--card2); padding:10px; border-radius:8px; border:1px solid var(--border);">
              <div style="width:60px; height:60px; border-radius:6px; background:#fff; display:flex; align-items:center; justify-content:center; font-size:28px;">💨</div>
              <div style="flex:1;">
                <div style="font-weight:800; font-size:12px;">대표이미지: main_500ml_white.jpg (1000×1000px)</div>
                <div style="font-size:11px; color:var(--muted); margin-top:2px;">스마트에디터 ONE HTML 본문: 12단락 및 이미지 8장 완전 렌더링 완료</div>
              </div>
              <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">✓ 준비완료</span>
            </div>
          </div>

          <!-- 하단 실행 버튼 -->
          <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:11px; color:var(--muted);">네이버 판매자센터 탭 열림 감지 대기중</div>
            <button class="${btnClass}" style="padding:10px 20px; font-size:14px;">판매자센터 폼으로 1초 자동등록 시작 🚀</button>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: 가이드 뷰 (크롬 확장 원클릭 스마트스토어 자동 기입 파이프라인 매뉴얼)
    return `
      <div style="max-width:1100px; margin:0 auto;">
        <!-- 상단 히어로 배너 -->
        <div class="card" style="margin-bottom:24px; background:linear-gradient(135deg, var(--card) 0%, var(--card2) 100%);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="badge" style="background:rgba(3,199,90,0.15); color:#03C75A; margin-bottom:8px;">🧩 CHROME EXTENSION RUNNER</span>
              <h2 style="font-size:22px; font-weight:900;">네이버 스마트스토어 1초 자동등록 확장 가이드</h2>
              <p style="font-size:13px; color:var(--muted); margin-top:4px;">
                복잡한 수동 타이핑 없이, 상세페이지 데이터를 네이버 판매자센터 상품 등록 화면에 번개처럼 기입하는 공식 매뉴얼입니다.
              </p>
            </div>
            <button class="${btnClass}" style="padding:10px 20px; font-size:13px;">최신 확장 프로그램 다운로드 (.ZIP)</button>
          </div>
        </div>

        <!-- 3단계 실행 파이프라인 카드 -->
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:28px;">
          <div class="card">
            <div style="width:36px; height:36px; border-radius:10px; background:var(--card2); border:1px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--brand); margin-bottom:12px;">1</div>
            <h3 style="font-size:15px; font-weight:800; margin-bottom:6px;">크롬 확장 설치 및 페어링</h3>
            <p style="font-size:12px; color:var(--muted); line-height:1.6;">
              다운로드한 ZIP 압축을 해제하고, 크롬 <code>chrome://extensions</code>에서 '압축해제된 확장프로그램 로드'를 클릭합니다. 비밀번호 없이 안전한 토큰 페어링 1회로 연결됩니다.
            </p>
          </div>
          <div class="card">
            <div style="width:36px; height:36px; border-radius:10px; background:var(--card2); border:1px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--brand); margin-bottom:12px;">2</div>
            <h3 style="font-size:15px; font-weight:800; margin-bottom:6px;">판매자센터 등록화면 이동</h3>
            <p style="font-size:12px; color:var(--muted); line-height:1.6;">
              네이버 스마트스토어 판매자센터(<code>sell.smartstore.naver.com</code>)의 [상품관리 &gt; 상품 등록] 메뉴로 이동합니다. 확장 플로팅 위젯이 자동으로 감지됩니다.
            </p>
          </div>
          <div class="card">
            <div style="width:36px; height:36px; border-radius:10px; background:var(--card2); border:1px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--brand); margin-bottom:12px;">3</div>
            <h3 style="font-size:15px; font-weight:800; margin-bottom:6px;">[1초 자동등록] 원클릭 실행</h3>
            <p style="font-size:12px; color:var(--muted); line-height:1.6;">
              확장 팝업의 [스토어 자동기입] 버튼을 누르면 상품명, 카테고리, 판매가, 상세설명, 썸네일, 옵션, 필수 속성, 배송비 템플릿까지 1초 만에 자동 완성됩니다.
            </p>
          </div>
        </div>

        <!-- 판매자센터 화면 시뮬레이터 목업 -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <strong style="font-size:14px; font-weight:800;">🖥️ 네이버 스마트스토어 판매자센터 연동 화면 뷰파인더</strong>
            <span class="badge" style="background:rgba(3,199,90,0.15); color:#03C75A;">🟢 자동 감지 레이어 ACTIVE</span>
          </div>

          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:20px; font-family:monospace; font-size:12px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:10px; margin-bottom:12px;">
              <span>[TARGET URL] https://sell.smartstore.naver.com/#/products/create</span>
              <span style="color:#10B981;">STATUS: READY TO INJECT</span>
            </div>
            <div style="display:grid; grid-template-columns: 180px 1fr; gap:8px; line-height:1.8;">
              <span style="color:var(--muted);">✓ 카테고리 선택:</span>
              <span style="color:var(--text); font-weight:700;">가전/디지털 &gt; 계절가전 &gt; 가습기 &gt; 초음파식가습기 (자동선택 완료)</span>
              <span style="color:var(--muted);">✓ 상품명 기입:</span>
              <span style="color:var(--text); font-weight:700;">[단독특가] 프리미엄 무소음 탁상용 미니 무선 가습기 500ml</span>
              <span style="color:var(--muted);">✓ 판매가 & 할인가:</span>
              <span style="color:var(--text); font-weight:700;">정상가 49,000원 / 즉시할인가 34,900원 (28% 할인 세팅)</span>
              <span style="color:var(--muted);">✓ 옵션 테이블:</span>
              <span style="color:var(--text); font-weight:700;">단독형 3컬러 (화이트, 핑크, 민트) 수량 및 추가금 매핑</span>
              <span style="color:var(--muted);">✓ 상세에디터 주입:</span>
              <span style="color:var(--text); font-weight:700;">스마트에디터 ONE 블록 컴포넌트 8개 이미지 및 본문 자동 주입</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // 04_settings: 설정 뷰 (스토어 기본값 환경설정 및 2026-11-01 5단계 표준 로그인 뷰)
    return `
      <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:24px;">
        <!-- 좌측: 스토어 기본값 환경설정 -->
        <div class="card">
          <h2 style="font-size:18px; font-weight:900; margin-bottom:4px;">⚙️ 스마트스토어 판매 기본값 세팅</h2>
          <p style="font-size:12px; color:var(--muted); margin-bottom:20px;">상품마다 반복되는 원산지, A/S 정보, 배송/반품 템플릿을 한 번만 등록해 두면 자동 입력 시 그대로 적용됩니다.</p>

          <div style="margin-bottom:16px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">원산지 기본값</label>
            <select class="input-field">
              <option selected>국산 (대한민국) - 제조사 자체제작</option>
              <option>수입산 (아시아/중국 OEM)</option>
              <option>상세설명 별도 표기</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
            <div>
              <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">A/S 담당자 전화번호</label>
              <input type="text" class="input-field" value="070-8095-2459">
            </div>
            <div>
              <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">A/S 안내 문구</label>
              <input type="text" class="input-field" value="구매 후 1년 무상 A/S 지원">
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">배송비 묶음 템플릿 코드</label>
            <input type="text" class="input-field" value="DELIV_CJ_FREE_001 (기본 무료배송 템플릿)">
          </div>

          <div style="margin-bottom:20px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">반품/교환 배송비 및 회수 주소</label>
            <input type="text" class="input-field" value="편도 3,000원 / 왕복 6,000원 (CJ대한통운 계약 택배)">
          </div>

          <div style="border-top:1px solid var(--border); padding-top:16px;">
            <button class="${btnClass}">기본값 설정 저장 및 템플릿 반영</button>
          </div>
        </div>

        <!-- 우측: 2026-11-01 주인님 지침 5단계 표준 로그인 폼 -->
        <div class="login-container" style="margin:0;">
          <!-- 1. [맨 위] 프로그램 고유 로고 -->
          <div class="logo-icon" style="width:68px; height:68px; border-radius:18px; font-size:32px; margin:0 auto 14px; box-shadow:0 8px 24px rgba(0,0,0,0.18);">
            🛒
          </div>

          <!-- 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) -->
          <div style="margin-bottom:10px;">
            <span class="badge" style="background:var(--card2); color:var(--brand); border:1px solid var(--border-bright); padding:4px 14px; font-size:11px; font-weight:900;">
              AIMASTER SMARTSTORE REGISTER
            </span>
          </div>

          <!-- 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 -->
          <h1 style="font-size:22px; font-weight:900; margin-bottom:6px;">AI 스마트스토어 상품 자동등록기</h1>
          <p style="font-size:13px; color:var(--muted); margin-bottom:20px;">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>

          <!-- 4. [중앙] 로그인/회원가입 폼 카드 + 2단 탭 + 3D 엠보싱 버튼 -->
          <div style="display:flex; background:var(--card2); border-radius:8px; padding:3px; margin-bottom:16px;">
            <button style="flex:1; padding:7px; border-radius:6px; background:var(--card); color:var(--text); font-weight:800; font-size:12px; border:none; cursor:pointer;">로그인</button>
            <button style="flex:1; padding:7px; border-radius:6px; background:transparent; color:var(--muted); font-weight:700; font-size:12px; border:none; cursor:pointer;">회원가입</button>
          </div>

          <input type="email" class="input-field" placeholder="아이디 (이메일 주소)" value="buylifemall@gmail.com">
          <input type="password" class="input-field" placeholder="비밀번호" value="••••••••••••">

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; font-size:12px;">
            <label style="color:var(--muted); display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" checked> 로그인 유지
            </label>
            <a href="#" style="color:var(--brand); text-decoration:none; font-weight:700;">비밀번호 찾기?</a>
          </div>

          <button class="${btnClass}" style="width:100%; justify-content:center; padding:12px; font-size:15px; margin-bottom:16px;">
            로그인 시작 →
          </button>

          <!-- 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 지침) -->
          <div style="font-size:11px; color:var(--muted); white-space:nowrap;">
            진행 시 <a href="/terms" style="color:var(--text); text-decoration:underline;">이용약관</a> 및 <a href="/privacy" style="color:var(--text); text-decoration:underline;">개인정보 처리방침</a>에 동의합니다.
          </div>
        </div>
      </div>
    `;
  }
}

// 메인 실행
async function run() {
  console.log("=== AI 스마트스토어 상품 자동등록기 (smartstore-register) 4대 화면 3시안 생성 시작 ===");
  const browser = await chromium.launch({ headless: true });

  const viewNames = {
    1: '01_main',
    2: '02_detail',
    3: '03_guide',
    4: '04_settings'
  };

  for (let c = 1; c <= 3; c++) {
    const dir = OUT_DIRS[c];
    for (let s = 1; s <= 4; s++) {
      const vName = viewNames[s];
      const htmlContent = buildViewHtml(c, s);
      const htmlPath = path.join(dir, `${vName}.html`);
      fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

      // 1440px 고화질 캡처
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.setContent(htmlContent, { waitUntil: 'networkidle' });
      const pngPath = path.join(dir, `${vName}.png`);
      await page.screenshot({ path: pngPath, fullPage: true });
      await page.close();
      console.log(`[시안 ${c} 화면 ${s}] ${vName}.png 캡처 완료`);
    }

    // README.md 생성
    const cNames = {
      1: '76_naver_commerce_pro_seller_studio (네이버 커머스 프로 셀러 스튜디오 스타일)',
      2: '77_quant_marketplace_intelligence_deck (퀀트 마켓플레이스 인텔리전스 덱 스타일)',
      3: '78_minimal_smartstore_atelier (미니멀 스마트스토어 아틀리에 스타일)'
    };
    const readmeContent = `# ${cNames[c]}
- 프로그램명: AI 스마트스토어 상품 자동등록기 (smartstore-register)
- 공식 도메인: https://smartstore-register.buylife.xyz
- 버전: v1.25
- 생성일시: 2026-11-09

## 4대 화면 고화질 캡처본 목록
1. 01_main.png: 상품 등록 대시보드 & 마켓 등록 덱 메인 뷰
2. 02_detail.png: Claude 속성 AI 분석 추천 & 스마트스토어 폼 매핑 심층 뷰
3. 03_guide.png: 크롬 확장 원클릭 스마트스토어 자동기입 가이드 뷰
4. 04_settings.png: 스토어 기본값 환경설정 및 5단계 표준 로그인 뷰
`;
    fs.writeFileSync(path.join(dir, 'README.md'), readmeContent, 'utf-8');
  }

  await browser.close();
  console.log("=== 12개 뷰 HTML 및 1440px 고화질 스크린샷 캡처 완료 ===");
}

run().catch(console.error);
