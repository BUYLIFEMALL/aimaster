import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '70_quant_ecommerce_intelligence_radar/trending-product-finder'),
  2: path.join(BASE_DIR, '71_naver_seller_analytics_lab/trending-product-finder'),
  3: path.join(BASE_DIR, '72_coupang_fast_sourcing_console/trending-product-finder'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 템플릿 생성 함수
function buildViewHtml(cNum, sNum) {
  // cNum: 1 (시안1), 2 (시안2), 3 (시안3)
  // sNum: 1 (Main), 2 (Detail), 3 (Guide), 4 (Settings/Login)

  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = '';
  let logoBg = '';
  let accentColor = '';
  let cardBg = '';
  let borderCol = '';

  if (cNum === 1) {
    // 70. 퀀트 이커머스 인텔리전스 레이더 덱 (다크 옵시디언 & 일렉트릭 사이안 + 불스 그린)
    themeCss = `
      --bg: #070B14;
      --card: #0F172A;
      --card2: #141E33;
      --border: #1E293B;
      --border-bright: #334155;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #06B6D4;
      --brand-hover: #0891B2;
      --accent: #10B981;
      --accent-red: #EF4444;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(6,182,212,0.15); color:#22D3EE; border:1px solid rgba(6,182,212,0.3);">⚡ QUANT RADAR INTELLIGENCE</span>`;
    btnClass = 'btn-3d-cyan';
    brandName = '퀀트 이커머스 인텔리전스 레이더';
    logoBg = 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)';
    accentColor = '#06B6D4';
    cardBg = '#0F172A';
    borderCol = '#1E293B';
  } else if (cNum === 2) {
    // 71. 네이버 스마트스토어 공식 셀러 분석실 (클린 화이트 & 네이버 그린)
    themeCss = `
      --bg: #F4F7F6;
      --card: #FFFFFF;
      --card2: #EDF3F0;
      --border: #DDE5E0;
      --border-bright: #B5CCC0;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #03C75A;
      --brand-hover: #029E47;
      --accent: #008744;
      --accent-red: #E11D48;
      --gold: #D97706;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:#E8F8EE; color:#03A84E; border:1px solid #B4E8C5;">🌿 NAVER SELLER ANALYTICS LAB</span>`;
    btnClass = 'btn-3d-green';
    brandName = '네이버 스마트스토어 공식 분석실';
    logoBg = 'linear-gradient(135deg, #03C75A 0%, #009944 100%)';
    accentColor = '#03C75A';
    cardBg = '#FFFFFF';
    borderCol = '#DDE5E0';
  } else {
    // 72. 쿠팡 아이템위너 패스트 소싱 콘솔 (쿨 그레이 화이트 & 쿠팡 로켓 레드 + 블루)
    themeCss = `
      --bg: #F8F9FA;
      --card: #FFFFFF;
      --card2: #F1F3F5;
      --border: #E9ECEF;
      --border-bright: #CED4DA;
      --text: #212529;
      --muted: #6C757D;
      --brand: #E31A22;
      --brand-hover: #B8141B;
      --accent: #0073E9;
      --accent-red: #E31A22;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:#FEE8E9; color:#D61A22; border:1px solid #FAC2C5;">🚀 COUPANG WINNER SOURCING CONSOLE</span>`;
    btnClass = 'btn-3d-red';
    brandName = '쿠팡 아이템위너 패스트 소싱 콘솔';
    logoBg = 'linear-gradient(135deg, #E31A22 0%, #0073E9 100%)';
    accentColor = '#E31A22';
    cardBg = '#FFFFFF';
    borderCol = '#E9ECEF';
  }

  // 화면 제목 및 탭
  const screenTitle = sNum === 1 ? '실시간 트렌드 레이더 메인 대시보드'
    : sNum === 2 ? '5대 마켓 최저가 소싱 & 마진 계산 상세 분석'
    : sNum === 3 ? 'AI 소싱 알고리즘 가이드 & 셀러 전략 매뉴얼'
    : '시스템 환경설정 및 5단계 표준 로그인 뷰';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${brandName} - ${screenTitle}</title>
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
    .btn-3d-cyan {
      background: linear-gradient(180deg, #06B6D4 0%, #0891B2 100%);
      color: #04101A;
      font-weight: 800;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #22D3EE;
      box-shadow: 0 4px 0 #0E7490, 0 8px 16px rgba(6,182,212,0.25);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-cyan:hover { transform: translateY(1px); box-shadow: 0 2px 0 #0E7490; }
    .btn-3d-green {
      background: linear-gradient(180deg, #03C75A 0%, #029E47 100%);
      color: #FFFFFF;
      font-weight: 800;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #34D399;
      box-shadow: 0 4px 0 #027A37, 0 8px 16px rgba(3,199,90,0.25);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-green:hover { transform: translateY(1px); box-shadow: 0 2px 0 #027A37; }
    .btn-3d-red {
      background: linear-gradient(180deg, #E31A22 0%, #C4141B 100%);
      color: #FFFFFF;
      font-weight: 800;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #F87171;
      box-shadow: 0 4px 0 #991016, 0 8px 16px rgba(227,26,34,0.25);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-red:hover { transform: translateY(1px); box-shadow: 0 2px 0 #991016; }

    .btn-secondary {
      background: var(--card2);
      color: var(--text);
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 8px;
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
      z-index: 100;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: ${logoBg};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .nav-tabs {
      display: flex;
      gap: 6px;
    }
    .nav-tab {
      padding: 7px 14px;
      border-radius: 8px;
      color: var(--muted);
      font-weight: 700;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .nav-tab.active {
      background: var(--card2);
      color: var(--brand);
      border: 1px solid var(--border-bright);
    }

    /* 본문 레이아웃 */
    main {
      flex: 1;
      padding: 24px 28px;
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
    }

    /* 카드 스타일 */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }

    /* 4단계 파이프라인 */
    .pipeline-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .pipe-step {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    .pipe-step.current {
      border-color: var(--brand);
      background: var(--card2);
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--border-bright);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 900;
    }
    .pipe-step.current .step-num {
      background: var(--brand);
      color: #000;
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

    /* 테이블 */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    table.data-table th, table.data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }
    table.data-table th {
      background: var(--card2);
      color: var(--muted);
      font-weight: 800;
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
      <div class="logo-icon">📈</div>
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <strong style="font-size:16px; font-weight:900;">실시간 급상승 소싱 트렌드 발굴기</strong>
          <span style="font-size:11px; font-weight:800; color:var(--muted); background:var(--card2); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">v1.36</span>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">AIMASTER TRENDING PRODUCT FINDER · SOURCING AUTOMATION</div>
      </div>
      <div style="margin-left:12px;">${themeBadge}</div>
    </div>

    <nav class="nav-tabs">
      <a href="#" class="nav-tab ${sNum === 1 ? 'active' : ''}">🔍 레이더 대시보드</a>
      <a href="#" class="nav-tab ${sNum === 2 ? 'active' : ''}">🌏 5대 마켓 소싱분석</a>
      <a href="#" class="nav-tab">📊 기회점수 리포트</a>
      <a href="#" class="nav-tab ${sNum === 3 ? 'active' : ''}">📖 셀러 가이드</a>
      <a href="#" class="nav-tab ${sNum === 4 ? 'active' : ''}">⚙️ 설정/계정</a>
    </nav>

    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:12px; color:var(--muted);">셀러: buylifemall (PRO)</span>
      <button class="${btnClass}" style="padding:6px 12px; font-size:12px;">+ 신규 키워드 등록</button>
    </div>
  </header>

  <!-- 메인 본문 -->
  <main>
`;
}

// 각 화면별 본문 내용 생성
function getScreenBody(cNum, sNum) {
  let btnClass = cNum === 1 ? 'btn-3d-cyan' : cNum === 2 ? 'btn-3d-green' : 'btn-3d-red';
  let accent = cNum === 1 ? '#06B6D4' : cNum === 2 ? '#03C75A' : '#E31A22';

  if (sNum === 1) {
    // 01_main: 메인 대시보드
    return `
      <!-- 4단계 소싱 파이프라인 배너 -->
      <div class="pipeline-bar">
        <div class="pipe-step current">
          <div class="step-num">1</div>
          <div>
            <div style="font-size:11px; color:var(--muted);">STEP 1</div>
            <strong style="font-size:13px;">키워드 발굴 & 감시</strong>
          </div>
        </div>
        <div class="pipe-step">
          <div class="step-num">2</div>
          <div>
            <div style="font-size:11px; color:var(--muted);">STEP 2</div>
            <strong style="font-size:13px;">트렌드·기회점수 산출</strong>
          </div>
        </div>
        <div class="pipe-step">
          <div class="step-num">3</div>
          <div>
            <div style="font-size:11px; color:var(--muted);">STEP 3</div>
            <strong style="font-size:13px;">5대 마켓 최저가 소싱</strong>
          </div>
        </div>
        <div class="pipe-step">
          <div class="step-num">4</div>
          <div>
            <div style="font-size:11px; color:var(--muted);">STEP 4</div>
            <strong style="font-size:13px;">24H 변동 자동 알림</strong>
          </div>
        </div>
      </div>

      <!-- 핵심 KPI 그리드 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">실시간 감시 키워드</span>
            <span style="font-size:16px;">🎯</span>
          </div>
          <div class="kpi-val" style="color:${accent};">48 <span style="font-size:14px; font-weight:600; color:var(--muted);">개 등록</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">네이버 데이터랩 + 쿠팡 실시간 연동</div>
        </div>

        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">금일 포착 기회상품</span>
            <span style="font-size:16px;">🚀</span>
          </div>
          <div class="kpi-val" style="color:#10B981;">128 <span style="font-size:14px; font-weight:600; color:var(--muted);">건 발굴</span></div>
          <div style="font-size:11px; color:#10B981; margin-top:4px;">▲ 전일 대비 +24.5% 급증</div>
        </div>

        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">평균 예상 순마진율</span>
            <span style="font-size:16px;">💰</span>
          </div>
          <div class="kpi-val" style="color:#F59E0B;">36.4 <span style="font-size:14px; font-weight:600; color:var(--muted);">%</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">수수료·배송비·포장비 사전 차감</div>
        </div>

        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">실시간 알림 연동</span>
            <span style="font-size:16px;">🔔</span>
          </div>
          <div class="kpi-val" style="color:${accent};">가동 중 <span style="font-size:14px; font-weight:600; color:var(--muted);">(3개 채널)</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">텔레그램 봇 + 카카오 알림톡 + 이메일</div>
        </div>
      </div>

      <!-- 메인 2단 그리드: 실시간 급상승 키워드 TOP 5 & 미니 마진 시뮬레이터 -->
      <div style="display:grid; grid-template-columns: 2fr 1.2fr; gap:20px;">
        <!-- 좌측: 실시간 급상승 키워드 레이더 -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h3 style="font-size:16px; font-weight:900;">🔥 실시간 급상승 소싱 기회 키워드 TOP 5</h3>
              <p style="font-size:12px; color:var(--muted); margin-top:2px;">최근 24시간 검색량 폭발 & 판매자 경쟁강도 낮음 분석 기준</p>
            </div>
            <button class="btn-secondary" style="font-size:12px;">전체 리포트 보기 →</button>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>급상승 키워드</th>
                <th>카테고리</th>
                <th>검색량 추이</th>
                <th>경쟁강도</th>
                <th>기회점수</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style="color:${accent};">01</strong></td>
                <td><strong>무선 저소음 키보드 마우스</strong></td>
                <td>디지털/가전</td>
                <td><span style="color:#10B981; font-weight:800;">▲ 320%</span></td>
                <td><span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">0.42 (낮음)</span></td>
                <td><strong style="color:${accent}; font-size:15px;">94점</strong></td>
                <td><button class="${btnClass}" style="padding:4px 10px; font-size:11px;">소싱 분석</button></td>
              </tr>
              <tr>
                <td><strong style="color:${accent};">02</strong></td>
                <td><strong>감성 캠핑 폴딩 체어</strong></td>
                <td>스포츠/레저</td>
                <td><span style="color:#10B981; font-weight:800;">▲ 215%</span></td>
                <td><span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">0.58 (보통)</span></td>
                <td><strong style="color:${accent}; font-size:15px;">88점</strong></td>
                <td><button class="${btnClass}" style="padding:4px 10px; font-size:11px;">소싱 분석</button></td>
              </tr>
              <tr>
                <td><strong style="color:${accent};">03</strong></td>
                <td><strong>차량용 맥세이프 거치대</strong></td>
                <td>자동차용품</td>
                <td><span style="color:#10B981; font-weight:800;">▲ 180%</span></td>
                <td><span class="badge" style="background:rgba(245,158,11,0.15); color:#F59E0B;">0.65 (경쟁)</span></td>
                <td><strong style="color:${accent}; font-size:15px;">85점</strong></td>
                <td><button class="${btnClass}" style="padding:4px 10px; font-size:11px;">소싱 분석</button></td>
              </tr>
              <tr>
                <td><strong>04</strong></td>
                <td><strong>단백질 쉐이커 자동 믹서</strong></td>
                <td>생활/건강</td>
                <td><span style="color:#10B981; font-weight:800;">▲ 140%</span></td>
                <td><span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">0.38 (낮음)</span></td>
                <td><strong style="color:${accent}; font-size:15px;">81점</strong></td>
                <td><button class="${btnClass}" style="padding:4px 10px; font-size:11px;">소싱 분석</button></td>
              </tr>
              <tr>
                <td><strong>05</strong></td>
                <td><strong>목어깨 온열 마사지기</strong></td>
                <td>건강가전</td>
                <td><span style="color:#10B981; font-weight:800;">▲ 110%</span></td>
                <td><span class="badge" style="background:rgba(245,158,11,0.15); color:#F59E0B;">0.72 (경쟁)</span></td>
                <td><strong style="color:${accent}; font-size:15px;">79점</strong></td>
                <td><button class="${btnClass}" style="padding:4px 10px; font-size:11px;">소싱 분석</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 우측: 미니 소싱 마진 시뮬레이터 -->
        <div class="card">
          <h3 style="font-size:16px; font-weight:900; margin-bottom:4px;">⚡ 미니 소싱 마진 계산기</h3>
          <p style="font-size:12px; color:var(--muted); margin-bottom:16px;">타겟 판매가와 매입원가를 넣으면 순마진 즉시 산출</p>

          <div style="margin-bottom:12px;">
            <label style="font-size:12px; font-weight:700; color:var(--muted); display:block; margin-bottom:4px;">예상 판매가 (원)</label>
            <input type="text" class="input-field" value="28,900" style="margin-bottom:0;">
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-size:12px; font-weight:700; color:var(--muted); display:block; margin-bottom:4px;">해외/도매 매입원가 (원)</label>
            <input type="text" class="input-field" value="11,500" style="margin-bottom:0;">
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
            <div>
              <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:2px;">플랫폼 수수료율</label>
              <select class="input-field" style="margin-bottom:0; padding:8px 10px; font-size:12px;">
                <option>스마트스토어 (5.8%)</option>
                <option>쿠팡 윙 (10.8%)</option>
                <option>11번가 (11.0%)</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px; color:var(--muted); display:block; margin-bottom:2px;">예상 배송비 (원)</label>
              <input type="text" class="input-field" value="3,000" style="margin-bottom:0; padding:8px 10px; font-size:12px;">
            </div>
          </div>

          <div style="background:var(--card2); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
              <span style="color:var(--muted);">예상 순수익금:</span>
              <strong style="color:#10B981; font-size:15px;">+12,723 원</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:var(--muted);">최종 순마진율:</span>
              <strong style="color:${accent}; font-size:18px;">44.0 %</strong>
            </div>
          </div>

          <button class="${btnClass}" style="width:100%; justify-content:center; padding:10px;">정밀 5대 마켓 비교분석 열기 →</button>
        </div>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: 5대 마켓 최저가 소싱 & 마진 계산 상세 분석
    return `
      <!-- 타겟 상품 헤더 카드 -->
      <div class="card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge" style="background:rgba(6,182,212,0.15); color:${accent};">TARGET KEYWORD</span>
            <h2 style="font-size:20px; font-weight:900;">무선 저소음 키보드 마우스 세트</h2>
          </div>
          <p style="font-size:13px; color:var(--muted); margin-top:4px;">
            카테고리: 디지털/가전 > PC주변기기 | 기회점수: <strong style="color:${accent};">94점</strong> (상위 1.2% 극상위 기회군)
          </p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary">🔄 실시간 시세 재조회</button>
          <button class="${btnClass}">🚀 상품 등록 프로그램으로 전송</button>
        </div>
      </div>

      <!-- 5대 소싱 마켓 최저가 실시간 비교 테이블 -->
      <div class="card" style="margin-bottom:20px;">
        <h3 style="font-size:16px; font-weight:900; margin-bottom:14px;">🌏 5대 소싱처 실시간 매입 원가 대조</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>소싱처</th>
              <th>상품명 / 공급자</th>
              <th>매입원가</th>
              <th>배송일수</th>
              <th>최소주문(MOQ)</th>
              <th>예상 순마진율</th>
              <th>공급 안전성</th>
              <th>소싱 연동</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:rgba(16,185,129,0.04);">
              <td><span class="badge" style="background:#FFEBE6; color:#FF5000;">알리익스프레스</span></td>
              <td><strong>Ultra-Slim Silent Wireless Keyboard 2.4G (KC인증 호환)</strong></td>
              <td><strong style="color:#10B981; font-size:15px;">9,800 원</strong></td>
              <td>5일 (초이스 무료배송)</td>
              <td>1개 (위탁가능)</td>
              <td><strong style="color:#10B981; font-size:16px;">54.2%</strong></td>
              <td><span style="color:#10B981;">★★★★★ (우수)</span></td>
              <td><button class="${btnClass}" style="padding:4px 10px; font-size:11px;">소싱 담기</button></td>
            </tr>
            <tr>
              <td><span class="badge" style="background:#EBF3FF; color:#0066FF;">도매매 / 도매꾹</span></td>
              <td>국내 당일발송 저소음 슬림 무선 키보드마우스 콤보</td>
              <td><strong>11,200 원</strong></td>
              <td>1~2일 (국내택배)</td>
              <td>1개 (위탁연동)</td>
              <td><strong>48.6%</strong></td>
              <td><span>★★★★☆ (안정)</span></td>
              <td><button class="btn-secondary" style="padding:4px 10px; font-size:11px;">소싱 담기</button></td>
            </tr>
            <tr>
              <td><span class="badge" style="background:#FFF0F0; color:#E31A22;">11번가 B2B</span></td>
              <td>사무용 저소음 펜타그래프 무선 키보드 세트</td>
              <td><strong>12,500 원</strong></td>
              <td>2일</td>
              <td>5개</td>
              <td><strong>42.1%</strong></td>
              <td><span>★★★★☆ (보통)</span></td>
              <td><button class="btn-secondary" style="padding:4px 10px; font-size:11px;">소싱 담기</button></td>
            </tr>
            <tr>
              <td><span class="badge" style="background:#E8F8EE; color:#03A84E;">네이버 스토어</span></td>
              <td>[시장 평균 판매가 벤치마크] 저소음 오피스 키보드</td>
              <td>24,900 원 (판매가)</td>
              <td>-</td>
              <td>-</td>
              <td>기준가</td>
              <td>리뷰 1,420개 분석</td>
              <td><a href="#" style="color:${accent}; font-weight:700; font-size:11px;">스마트에디터 분석 →</a></td>
            </tr>
            <tr>
              <td><span class="badge" style="background:#FEE8E9; color:#D61A22;">쿠팡 로켓</span></td>
              <td>[아이템위너 기준가] 슬림 무선 키보드마우스 세트</td>
              <td>23,800 원 (위너가)</td>
              <td>-</td>
              <td>-</td>
              <td>위너 점유 84%</td>
              <td>리뷰 3,890개</td>
              <td><a href="#" style="color:${accent}; font-weight:700; font-size:11px;">아이템위너 매칭 →</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 정밀 마진 분석 및 플랫폼 직결 카드 -->
      <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:20px;">
        <div class="card">
          <h3 style="font-size:16px; font-weight:900; margin-bottom:12px;">📊 단위 원가 & 정밀 공제 시뮬레이션</h3>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:16px;">
            <div style="background:var(--card2); padding:12px; border-radius:8px;">
              <div style="font-size:11px; color:var(--muted);">소비자 권장 판매가</div>
              <div style="font-size:18px; font-weight:900;">24,900 원</div>
            </div>
            <div style="background:var(--card2); padding:12px; border-radius:8px;">
              <div style="font-size:11px; color:var(--muted);">알리 직구 매입가</div>
              <div style="font-size:18px; font-weight:900; color:#EF4444;">-9,800 원</div>
            </div>
            <div style="background:var(--card2); padding:12px; border-radius:8px;">
              <div style="font-size:11px; color:var(--muted);">플랫폼 수수료(5.8%)</div>
              <div style="font-size:18px; font-weight:900; color:#EF4444;">-1,444 원</div>
            </div>
          </div>
          <div style="border-top:1px dashed var(--border); padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; color:var(--muted);">택배비·포장비·부가세 공제 후 실수령 순이익:</div>
              <div style="font-size:24px; font-weight:900; color:#10B981;">+10,656 원 <span style="font-size:15px; color:var(--muted);">(마진율 42.8%)</span></div>
            </div>
            <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; font-size:13px; padding:6px 12px;">💎 고마진 최우선 소싱 추천</span>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:16px; font-weight:900; margin-bottom:8px;">🔗 원클릭 상품등록 프로그램 연동</h3>
          <p style="font-size:12px; color:var(--muted); margin-bottom:14px;">선택한 소싱 상품 데이터를 AIMaster 등록 자동화로 즉시 내보냅니다.</p>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="${btnClass}" style="justify-content:center; padding:10px;">
              📦 smartstore-register (네이버 스마트스토어) 등록 전송
            </button>
            <button class="${btnClass}" style="justify-content:center; padding:10px; filter:hue-rotate(40deg);">
              🚀 coupang-ops (쿠팡 윙 & 로켓) 아이템 등록 전송
            </button>
            <button class="btn-secondary" style="justify-content:center; padding:10px;">
              📥 엑셀/CSV 데이터 원본 다운로드
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: AI 소싱 알고리즘 가이드 & 셀러 전략 매뉴얼
    return `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:22px; font-weight:900;">📖 실시간 급상승 소싱 트렌드 발굴 가이드북</h2>
            <p style="font-size:13px; color:var(--muted); margin-top:4px;">초보 셀러부터 파워 셀러까지 역마진 없는 퀀트 소싱 자동화 공식</p>
          </div>
          <span class="badge" style="background:rgba(6,182,212,0.15); color:${accent}; font-size:12px; padding:6px 12px;">OFFICIAL PLAYBOOK v1.36</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:24px;">
        <div class="card">
          <div style="font-size:32px; margin-bottom:10px;">🧠</div>
          <h3 style="font-size:16px; font-weight:900; margin-bottom:6px;">1. AI 기회점수 산출 공식</h3>
          <p style="font-size:13px; color:var(--muted); line-height:1.6;">
            네이버 데이터랩의 7일간 검색 급증률(40%) + 쿠팡 실시간 연관검색어 가중치(30%) + 총 등록 상품수 대비 검색량 비율(경쟁강도 30%)을 결합하여 0~100점의 기회점수를 자동 산출합니다.
          </p>
        </div>

        <div class="card">
          <div style="font-size:32px; margin-bottom:10px;">🛡️</div>
          <h3 style="font-size:16px; font-weight:900; margin-bottom:6px;">2. 역마진 제로 방어 공식</h3>
          <p style="font-size:13px; color:var(--muted); line-height:1.6;">
            플랫폼별 상이한 수수료(스마트스토어 5.8%, 쿠팡 윙 10.8%, 11번가 11%)와 배송비, 반품 충당금(3%), 부가세를 자동 반영하여 최소 목표 마진 25% 미만인 상품은 자동 필터링합니다.
          </p>
        </div>

        <div class="card">
          <div style="font-size:32px; margin-bottom:10px;">⚡</div>
          <h3 style="font-size:16px; font-weight:900; margin-bottom:6px;">3. 크롬 확장 프로그램 연동</h3>
          <p style="font-size:13px; color:var(--muted); line-height:1.6;">
            알리익스프레스나 타오바오, 쿠팡 상품 페이지 방문 시 확장 프로그램이 상품 이미지와 옵션, 가격을 원클릭으로 추출하여 본 프로그램의 소싱 후보함에 즉시 등록합니다.
          </p>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px; font-weight:900; margin-bottom:14px;">❓ 셀러 자주 묻는 질문 (FAQ)</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="background:var(--card2); padding:14px; border-radius:10px;">
            <strong style="color:${accent};">Q. 알리익스프레스 소싱 시 KC인증 대상 상품은 어떻게 구분하나요?</strong>
            <p style="font-size:13px; color:var(--muted); margin-top:4px;">
              전기용품 및 생활용품 안전관리법상 220V 직결 제품이나 유아용품은 인증이 필수입니다. 본 프로그램은 USB 5V 저전압 기기나 무선 인증 기기 등 구매대행 적합 품목에 '인증 면제 배지'를 표시합니다.
            </p>
          </div>
          <div style="background:var(--card2); padding:14px; border-radius:10px;">
            <strong style="color:${accent};">Q. 텔레그램이나 알림톡으로 알림이 오는 기준은 무엇인가요?</strong>
            <p style="font-size:13px; color:var(--muted); margin-top:4px;">
              [설정] 탭에서 지정한 임계값(기본값: 기회점수 80점 이상 & 예상 마진 30% 이상)을 충족하는 신규 트렌드 키워드가 발굴될 때 24시간 실시간 푸시가 발송됩니다.
            </p>
          </div>
        </div>
      </div>
    `;
  } else {
    // 04_settings: 환경설정 및 5단계 표준 로그인 뷰
    return `
      <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:24px;">
        <!-- 좌측: API 키 및 알림 환경설정 -->
        <div class="card">
          <h2 style="font-size:18px; font-weight:900; margin-bottom:4px;">⚙️ 소싱 및 알림 환경설정</h2>
          <p style="font-size:12px; color:var(--muted); margin-bottom:20px;">외부 마켓 API 및 실시간 모니터링 파라미터를 설정합니다.</p>

          <div style="margin-bottom:18px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">네이버 커머스 API 연동</label>
            <input type="password" class="input-field" value="naver_sec_key_9934810294819" placeholder="Client Secret">
            <span style="font-size:11px; color:#10B981;">✓ 네이버 데이터랩 및 쇼핑 카테고리 정상 연결됨</span>
          </div>

          <div style="margin-bottom:18px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">쿠팡 윙(WING) Open API</label>
            <input type="password" class="input-field" value="coupang_access_key_992140" placeholder="Access Key">
            <span style="font-size:11px; color:#10B981;">✓ 아이템위너 실시간 가격 비교 API 활성화</span>
          </div>

          <div style="margin-bottom:18px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">텔레그램 봇 실시간 푸시 연동</label>
            <div style="display:flex; gap:8px;">
              <input type="text" class="input-field" value="@trending_sourcing_bot" style="margin-bottom:0;">
              <button class="btn-secondary" style="white-space:nowrap;">테스트 발송</button>
            </div>
          </div>

          <div style="border-top:1px solid var(--border); padding-top:16px;">
            <button class="${btnClass}">설정 저장 및 즉시 반영</button>
          </div>
        </div>

        <!-- 우측: 2026-11-01 주인님 지침 5단계 표준 로그인 폼 -->
        <div class="login-container" style="margin:0;">
          <!-- 1. [맨 위] 프로그램 고유 로고 -->
          <div class="logo-icon" style="width:68px; height:68px; border-radius:18px; font-size:32px; margin:0 auto 14px; box-shadow:0 8px 24px rgba(0,0,0,0.18);">
            📈
          </div>

          <!-- 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) -->
          <div style="margin-bottom:10px;">
            <span class="badge" style="background:var(--card2); color:${accent}; border:1px solid var(--border-bright); padding:4px 14px; font-size:11px; font-weight:900;">
              AIMASTER TRENDING PRODUCT FINDER
            </span>
          </div>

          <!-- 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 -->
          <h1 style="font-size:22px; font-weight:900; margin-bottom:6px;">실시간 급상승 소싱 트렌드 발굴기</h1>
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
            <a href="#" style="color:${accent}; text-decoration:none; font-weight:700;">비밀번호 찾기?</a>
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

// 렌더링 및 캡처 메인 루틴
async function main() {
  console.log('🚀 Playwright 헤드리스 브라우저 시작...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const screens = [
    { num: 1, name: '01_main' },
    { num: 2, name: '02_detail' },
    { num: 3, name: '03_guide' },
    { num: 4, name: '04_settings' }
  ];

  for (let c = 1; c <= 3; c++) {
    const outDir = OUT_DIRS[c];
    console.log(`\n🎨 시안 ${c} 캡처 시작 (경로: ${outDir})`);

    for (const s of screens) {
      const htmlContent = buildViewHtml(c, s.num) + getScreenBody(c, s.num) + '\n  </main>\n</body>\n</html>';
      const tempHtmlPath = path.join(outDir, `${s.name}.html`);
      fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

      await page.goto('file:///' + tempHtmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
      const imgPath = path.join(outDir, `${s.name}.png`);
      await page.screenshot({ path: imgPath, fullPage: false });
      console.log(`  ✓ 캡처 완료: ${s.name}.png`);
    }

    // 각 시안별 README.md 작성
    const cDesc = c === 1 ? '70_quant_ecommerce_intelligence_radar (퀀트 이커머스 인텔리전스 레이더 덱)'
      : c === 2 ? '71_naver_seller_analytics_lab (네이버 스마트스토어 공식 셀러 분석실)'
      : '72_coupang_fast_sourcing_console (쿠팡 아이템위너 패스트 소싱 콘솔)';

    const readmeContent = `# ${cDesc}
- 프로그램명: 실시간 급상승 소싱 트렌드 발굴기 (trending-product-finder)
- 공식 도메인: https://trending-product-finder.buylife.xyz
- 버전: v1.36
- 생성일시: 2026-11-09

## 4대 화면 고화질 캡처본 목록
1. 01_main.png: 실시간 트렌드 레이더 메인 대시보드
2. 02_detail.png: 5대 마켓 최저가 소싱 & 마진 계산 상세 분석
3. 03_guide.png: AI 소싱 알고리즘 가이드 & 셀러 전략 매뉴얼
4. 04_settings.png: 시스템 환경설정 및 5단계 표준 로그인 뷰
`;
    fs.writeFileSync(path.join(outDir, 'README.md'), readmeContent, 'utf-8');
  }

  await browser.close();
  console.log('\n🎉 3개 시안 총 12개 뷰 1440px 캡처 및 영구 저장 완료!');
}

main().catch(err => {
  console.error('에러 발생:', err);
  process.exit(1);
});
