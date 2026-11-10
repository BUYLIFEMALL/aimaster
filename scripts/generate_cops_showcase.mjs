import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '82_coupang_rocket_seller_studio/coupang-ops'),
  2: path.join(BASE_DIR, '83_quant_ecommerce_terminal/coupang-ops'),
  3: path.join(BASE_DIR, '84_minimal_commerce_atelier/coupang-ops'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 템플릿 생성 함수
function buildViewHtml(cNum, sNum) {
  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = 'AI 쿠팡 운영 자동화';
  let logoBg = '';
  let accentColor = '';

  if (cNum === 1) {
    // 82. 쿠팡 로켓 셀러 인디고 랩 스타일 (로켓 레드 & 딥 인디고 & 다크 HUD)
    themeCss = `
      --bg: #0B111A;
      --card: #141D2B;
      --card2: #1B2638;
      --border: #24344D;
      --border-bright: #374E73;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #EA3323;
      --brand-hover: #DC2626;
      --brand-blue: #2563EB;
      --accent: #F59E0B;
      --gold: #F59E0B;
      --success: #10B981;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(234,51,35,0.15); color:#EA3323; border:1px solid rgba(234,51,35,0.3);">🚀 COUPANG ROCKET SELLER HUD</span>`;
    btnClass = 'btn-3d-rocket';
    logoBg = 'linear-gradient(135deg, #EA3323 0%, #B91C1C 100%)';
    accentColor = '#EA3323';
  } else if (cNum === 2) {
    // 83. 퀀트 이커머스 터미널 덱 스타일 (옵시디언 블랙 & 사이버 사이안 & 앰버 골드)
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
      --brand-blue: #3B82F6;
      --accent: #8B5CF6;
      --gold: #F59E0B;
      --success: #10B981;
      font-family: "JetBrains Mono", -apple-system, BlinkMacSystemFont, monospace, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(6,182,212,0.15); color:#06B6D4; border:1px solid rgba(6,182,212,0.3);">⚡ QUANT ECOMMERCE TERMINAL DECK</span>`;
    btnClass = 'btn-3d-cyan';
    logoBg = 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)';
    accentColor = '#06B6D4';
  } else {
    // 84. 미니멀 커머스 아틀리에 스타일 (클린 크림 페이퍼 & 로열 코발트 블루)
    themeCss = `
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card2: #F1F5F9;
      --border: #E2E8F0;
      --border-bright: #CBD5E1;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #2563EB;
      --brand-hover: #1D4ED8;
      --brand-blue: #1E40AF;
      --accent: #EA3323;
      --gold: #D97706;
      --success: #059669;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(37,99,235,0.12); color:#2563EB; border:1px solid rgba(37,99,235,0.25);">🌿 MINIMAL COMMERCE ATELIER</span>`;
    btnClass = 'btn-3d-blue';
    logoBg = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
    accentColor = '#2563EB';
  }

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
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }

    /* 3D 엠보싱 버튼 규격 */
    .btn-3d-rocket {
      background: linear-gradient(180deg, #EA3323 0%, #C81E1E 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #F87171;
      box-shadow: 0 4px 0 #991B1B, 0 8px 16px rgba(234,51,35,0.35);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-rocket:hover { transform: translateY(1px); box-shadow: 0 2px 0 #991B1B; }

    .btn-3d-cyan {
      background: linear-gradient(180deg, #06B6D4 0%, #0284C7 100%);
      color: #04141A;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #38BDF8;
      box-shadow: 0 4px 0 #0369A1, 0 8px 16px rgba(6,182,212,0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-cyan:hover { transform: translateY(1px); box-shadow: 0 2px 0 #0369A1; }

    .btn-3d-blue {
      background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #60A5FA;
      box-shadow: 0 4px 0 #1D4ED8, 0 8px 16px rgba(37,99,235,0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-blue:hover { transform: translateY(1px); box-shadow: 0 2px 0 #1D4ED8; }

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

    /* 상단 헤더 바 */
    .top-navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .brand-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo-icon {
      width: 40px;
      height: 40px;
      border-radius: 11px;
      background: ${logoBg};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #FFF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    }
    .brand-name {
      font-size: 16px;
      font-weight: 900;
    }
    .brand-sub {
      font-size: 11px;
      color: var(--muted);
      margin-top: 1px;
    }

    /* 4단계 파이프라인 배너 */
    .pipeline-banner {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .pipe-step {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--card2);
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .pipe-step.active {
      border-color: var(--brand);
      box-shadow: 0 0 12px rgba(234,51,35,0.15);
    }
    .pipe-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--brand);
      color: #FFF;
      font-size: 12px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pipe-info strong {
      display: block;
      font-size: 12.5px;
      font-weight: 800;
    }
    .pipe-info small {
      font-size: 10.5px;
      color: var(--muted);
    }

    /* 메인 그리드 레이아웃 */
    .main-grid {
      display: grid;
      grid-template-columns: 280px 1fr 340px;
      gap: 20px;
    }
    .main-grid-2col {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 20px;
    }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .panel-header h3 {
      font-size: 14px;
      font-weight: 850;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* KPI 통계 카드 그리드 */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }
    .kpi-card {
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--brand);
    }
    .kpi-title {
      font-size: 11px;
      color: var(--muted);
      font-weight: 700;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .kpi-sub {
      font-size: 10.5px;
      color: var(--success);
      margin-top: 4px;
      font-weight: 700;
    }

    /* 테이블 스타일 */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin-top: 10px;
    }
    .data-table th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11.5px;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      font-weight: 800;
      background: var(--card2);
    }
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    .data-table tr:hover td {
      background: var(--card2);
    }

    /* 뱃지 */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 800;
    }
    .badge-winner {
      background: rgba(16,185,129,0.15);
      color: #10B981;
      border: 1px solid rgba(16,185,129,0.3);
    }
    .badge-lost {
      background: rgba(239,68,68,0.15);
      color: #EF4444;
      border: 1px solid rgba(239,68,68,0.3);
    }
    .badge-urgent {
      background: rgba(245,158,11,0.15);
      color: #F59E0B;
      border: 1px solid rgba(245,158,11,0.3);
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

  <!-- 상단 네비게이션 바 -->
  <div class="top-navbar">
    <div class="brand-title">
      <div class="brand-logo-icon">🚀</div>
      <div>
        <div class="brand-name">${brandName} <span style="font-size:11px; opacity:0.7;">v1.18</span></div>
        <div class="brand-sub">쿠팡 WING Open API 자동화 & 실시간 주문·정산·아이템위너 관제</div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      ${themeBadge}
      <button class="${btnClass}">+ 빠른 상품 WING 등록</button>
    </div>
  </div>

  <!-- 4단계 운영 파이프라인 배너 -->
  <div class="pipeline-banner">
    <div class="pipe-step ${sNum === 1 ? 'active' : ''}">
      <span class="pipe-num">1</span>
      <div class="pipe-info">
        <strong>주문 & 배송 관제</strong>
        <small>미결제·결제완료·출고지연 알림</small>
      </div>
    </div>
    <div class="pipe-step ${sNum === 2 ? 'active' : ''}">
      <span class="pipe-num">2</span>
      <div class="pipe-info">
        <strong>아이템위너 & 가격</strong>
        <small>최저가 실시간 매칭·마진 시뮬레이션</small>
      </div>
    </div>
    <div class="pipe-step ${sNum === 3 ? 'active' : ''}">
      <span class="pipe-num">3</span>
      <div class="pipe-info">
        <strong>WING API 연동 가이드</strong>
        <small>발급 3분 매뉴얼 & 자동 발송 세팅</small>
      </div>
    </div>
    <div class="pipe-step ${sNum === 4 ? 'active' : ''}">
      <span class="pipe-num">4</span>
      <div class="pipe-info">
        <strong>API 설정 & 로그인</strong>
        <small>인증키 보관 & 5단계 표준 로그인</small>
      </div>
    </div>
  </div>
`;
}

function buildScreenSpecificContent(cNum, sNum) {
  let btnClass = cNum === 1 ? 'btn-3d-rocket' : cNum === 2 ? 'btn-3d-cyan' : 'btn-3d-blue';
  let logoBg = cNum === 1
    ? 'linear-gradient(135deg, #EA3323 0%, #B91C1C 100%)'
    : cNum === 2
    ? 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)'
    : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
  let brandName = 'AI 쿠팡 운영 자동화';

  if (sNum === 1) {
    // 01_main: 주문·배송·매출 실시간 모니터링 대시보드 HUD
    return `
      <!-- KPI 핵심 지표 4선 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">오늘 신규 결제 주문</div>
          <div class="kpi-value">148건</div>
          <div class="kpi-sub">▲ 전일 대비 +24.5% 상승</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">오늘 실시간 결제 매출</div>
          <div class="kpi-value">₩4,820,000</div>
          <div class="kpi-sub">순마진율 31.8% 기록</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">긴급 출고 대기 / 배송지연</div>
          <div class="kpi-value" style="color:#F59E0B;">3건</div>
          <div class="kpi-sub" style="color:#F59E0B;">⚠ 오늘 17:00 마감 전 발송 필요</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">아이템위너 매칭 점유율</div>
          <div class="kpi-value" style="color:#10B981;">94.2%</div>
          <div class="kpi-sub">총 62개 SKU 중 58개 1위 획득</div>
        </div>
      </div>

      <!-- 메인 3컬럼 레이아웃 -->
      <div class="main-grid">
        <!-- 좌측: 빠른 메뉴 & WING 상태 -->
        <div class="panel">
          <div class="panel-header">
            <h3>⚡ 쿠팡 WING 실시간 연동</h3>
            <span class="badge badge-winner">정상 연동 중</span>
          </div>
          <div style="font-size:12.5px; line-height:1.7;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="color:var(--muted);">업체코드 (Vendor ID)</span>
              <strong>A01234567</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="color:var(--muted);">WING 로그인 계정</span>
              <strong>buylife_seller</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="color:var(--muted);">자동 동기화 주기</span>
              <strong>15분마다 감지</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:14px;">
              <span style="color:var(--muted);">카카오 알림톡</span>
              <strong style="color:#10B981;">수신 ON</strong>
            </div>
            <button class="${btnClass}" style="width:100%; justify-content:center; margin-bottom:8px;">🔄 실시간 주문 즉시 동기화</button>
            <button class="btn-secondary" style="width:100%; justify-content:center;">📦 WING 배송 송장 일괄 등록</button>
          </div>
        </div>

        <!-- 중앙: 실시간 주문 & 배송 관리 테이블 -->
        <div class="panel">
          <div class="panel-header">
            <h3>📦 실시간 주문 & 출고 대기 목록 (최근 5건)</h3>
            <span style="font-size:11.5px; color:var(--muted);">자동 갱신됨</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>주문 상품명 (SKU)</th>
                <th>수량</th>
                <th>결제금액</th>
                <th>배송 상태</th>
                <th>조치</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>#CP-98214</strong></td>
                <td>초경량 에어 서포트 무선 충전기 (블랙)</td>
                <td>1개</td>
                <td>₩28,900</td>
                <td><span class="badge badge-urgent">결제완료 (출고대기)</span></td>
                <td><button class="btn-secondary" style="padding:4px 8px; font-size:11px;">송장입력</button></td>
              </tr>
              <tr>
                <td><strong>#CP-98213</strong></td>
                <td>스마트 온도표시 보온보냉 텀블러 500ml</td>
                <td>2개</td>
                <td>₩43,800</td>
                <td><span class="badge badge-winner">배송중 (CJ대한통운)</span></td>
                <td><button class="btn-secondary" style="padding:4px 8px; font-size:11px;">추적확인</button></td>
              </tr>
              <tr>
                <td><strong>#CP-98212</strong></td>
                <td>마그네틱 차량용 거치대 고속 맥세이프</td>
                <td>1개</td>
                <td>₩19,500</td>
                <td><span class="badge badge-winner">배송완료</span></td>
                <td><button class="btn-secondary" style="padding:4px 8px; font-size:11px;">정산확인</button></td>
              </tr>
              <tr>
                <td><strong>#CP-98211</strong></td>
                <td>무소음 블루투스 듀얼 무선 마우스</td>
                <td>1개</td>
                <td>₩15,900</td>
                <td><span class="badge badge-urgent">배송지연 위험</span></td>
                <td><button class="${btnClass}" style="padding:4px 8px; font-size:11px;">긴급발송</button></td>
              </tr>
              <tr>
                <td><strong>#CP-98210</strong></td>
                <td>고탄력 실리콘 에어팟 프로 2세대 케이스</td>
                <td>3개</td>
                <td>₩26,700</td>
                <td><span class="badge badge-winner">배송중 (한진택배)</span></td>
                <td><button class="btn-secondary" style="padding:4px 8px; font-size:11px;">추적확인</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 우측: 아이템위너 실시간 랭킹 레이더 -->
        <div class="panel">
          <div class="panel-header">
            <h3>🎯 아이템위너 최저가 레이더</h3>
            <span class="badge badge-winner">LIVE</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="background:var(--card2); padding:10px; border-radius:10px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <strong>무선 고속 충전기</strong>
                <span class="badge badge-winner">위너 1위 유지</span>
              </div>
              <div style="font-size:11px; color:var(--muted);">현재가 ₩28,900 (2위 경쟁사: ₩29,000)</div>
            </div>
            <div style="background:var(--card2); padding:10px; border-radius:10px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <strong>보온보냉 텀블러</strong>
                <span class="badge badge-winner">위너 1위 유지</span>
              </div>
              <div style="font-size:11px; color:var(--muted);">현재가 ₩21,900 (로켓배송 단독 배지)</div>
            </div>
            <div style="background:var(--card2); padding:10px; border-radius:10px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <strong>차량용 맥세이프</strong>
                <span class="badge badge-lost">위너 이탈 (-₩100)</span>
              </div>
              <div style="font-size:11px; color:var(--muted);">경쟁사 ₩19,400 침투 / 즉시 10원 인하 추천</div>
            </div>
            <button class="${btnClass}" style="width:100%; justify-content:center; margin-top:6px;">⚡ 아이템위너 자동 최저가 방어 켜기</button>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: 상품 등록 & 아이템위너 가격 추적 심층 분석 뷰
    return `
      <div class="main-grid-2col">
        <!-- 좌측: 가격 추천 & 마진 시뮬레이션 상세 -->
        <div class="panel">
          <div class="panel-header">
            <h3>📊 아이템위너 가격 제안 (Price Suggest) & 마진 계산기</h3>
            <span class="badge badge-winner">AI 알고리즘 분석</span>
          </div>

          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
            <div style="font-size:14px; font-weight:800; margin-bottom:6px;">대상 상품: 초경량 듀얼 고속 맥세이프 보조배터리 10000mAh</div>
            <div style="font-size:12px; color:var(--muted);">쿠팡 상품 ID: 7892104921 | 노출 카테고리: 가전디지털 > 휴대폰액세서리 > 보조배터리</div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px;">
            <div style="background:var(--card2); padding:14px; border-radius:10px; border:1px solid var(--border);">
              <div style="font-size:11.5px; color:var(--muted); font-weight:700;">현재 판매가</div>
              <div style="font-size:24px; font-weight:900; color:var(--text); margin:4px 0;">₩32,900</div>
              <div style="font-size:11px; color:var(--muted);">매출 원가: ₩16,500 (배송비 포함)</div>
            </div>
            <div style="background:rgba(16,185,129,0.08); padding:14px; border-radius:10px; border:1px solid rgba(16,185,129,0.3);">
              <div style="font-size:11.5px; color:#10B981; font-weight:800;">AI 추천 최적 위너 가격</div>
              <div style="font-size:24px; font-weight:900; color:#10B981; margin:4px 0;">₩31,890</div>
              <div style="font-size:11px; color:#10B981;">경쟁사 최저가(₩31,900) 대비 10원 우위</div>
            </div>
          </div>

          <!-- 마진 분해 테이블 -->
          <div style="font-size:13px; font-weight:800; margin-bottom:8px;">💰 정산 마진 및 쿠팡 수수료 정밀 분해</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>금액</th>
                <th>비율</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>판매가</td>
                <td><strong>₩31,890</strong></td>
                <td>100.0%</td>
                <td>소비자 최종 결제 금액</td>
              </tr>
              <tr>
                <td>매입 원가</td>
                <td>₩14,000</td>
                <td>43.9%</td>
                <td>제조/사입 공급단가</td>
              </tr>
              <tr>
                <td>쿠팡 카테고리 수수료</td>
                <td>₩3,508</td>
                <td>11.0%</td>
                <td>디지털/가전 기본 수수료율</td>
              </tr>
              <tr>
                <td>택배 배송비</td>
                <td>₩2,800</td>
                <td>8.8%</td>
                <td>계약 택배사 출고 운임</td>
              </tr>
              <tr style="background:rgba(16,185,129,0.05); font-weight:800;">
                <td style="color:#10B981;">최종 판매자 순마진</td>
                <td style="color:#10B981; font-size:15px;">₩11,582</td>
                <td style="color:#10B981;">36.3%</td>
                <td>개당 예상 순이익</td>
              </tr>
            </tbody>
          </table>

          <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="${btnClass}">⚡ 즉시 쿠팡 WING 판매가 반영 (₩31,890)</button>
            <button class="btn-secondary">엑셀 리포트 다운로드</button>
          </div>
        </div>

        <!-- 우측: 경쟁사 아이템위너 분석 리스트 -->
        <div class="panel">
          <div class="panel-header">
            <h3>🏆 경쟁 판매자 아이템위너 현황</h3>
            <span style="font-size:11px; color:var(--muted);">총 4개사 매칭</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:var(--card2); border:2px solid var(--brand); border-radius:12px; padding:14px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <strong style="color:var(--brand);">1위 (현재 내 스토어)</strong>
                <span class="badge badge-winner">아이템위너 획득</span>
              </div>
              <div style="font-size:18px; font-weight:900;">₩32,900 <span style="font-size:11px; font-weight:normal; color:var(--muted);">(무료배송)</span></div>
              <div style="font-size:11px; color:var(--muted); margin-top:4px;">구매후기: 482개 (평점 4.9) · 내일 도착 보장</div>
            </div>

            <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:14px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <strong>2위 (A상사)</strong>
                <span class="badge badge-lost">가격 근접 (-₩1,000)</span>
              </div>
              <div style="font-size:18px; font-weight:900;">₩31,900 <span style="font-size:11px; font-weight:normal; color:var(--muted);">(배송비 ₩3,000)</span></div>
              <div style="font-size:11px; color:var(--muted); margin-top:4px;">구매후기: 94개 (평점 4.5) · 일반택배 발송</div>
            </div>

            <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:14px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <strong>3위 (B커머스)</strong>
                <span class="badge badge-lost">위협도 낮음</span>
              </div>
              <div style="font-size:18px; font-weight:900;">₩34,500 <span style="font-size:11px; font-weight:normal; color:var(--muted);">(무료배송)</span></div>
              <div style="font-size:11px; color:var(--muted); margin-top:4px;">구매후기: 31개 (평점 4.2)</div>
            </div>

            <div style="padding:12px; background:var(--card2); border-radius:10px; font-size:12px; color:var(--muted); line-height:1.6;">
              💡 <strong>아이템위너 방어 팁:</strong> 쿠팡 알고리즘은 총 결제금액(판매가+배송비), 배송속도, 고객만족도, 반품률을 종합하여 위너를 지정합니다.
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: 쿠팡 WING Open API 발급 & 로켓배송 입점 전략 매뉴얼
    return `
      <div class="panel" style="max-width:1100px; margin:0 auto;">
        <div class="panel-header">
          <h3>📖 쿠팡 WING Open API 발급 & 아이템위너 공략 마스터 가이드</h3>
          <span class="badge badge-winner">공식 가이드</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; margin-bottom:24px;">
          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:18px; text-align:center;">
            <div style="font-size:28px; margin-bottom:8px;">🔑</div>
            <strong style="display:block; font-size:14px; margin-bottom:4px;">1단계: API 키 발급</strong>
            <small style="color:var(--muted); font-size:11.5px;">쿠팡 WING 셀러센터 접속 후 개발자센터에서 Access Key 발급</small>
          </div>
          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:18px; text-align:center;">
            <div style="font-size:28px; margin-bottom:8px;">⚡</div>
            <strong style="display:block; font-size:14px; margin-bottom:4px;">2단계: 연동 & 검증</strong>
            <small style="color:var(--muted); font-size:11.5px;">AIMaster 쿠팡 운영 자동화에 1클릭 키 등록 및 유효성 통과</small>
          </div>
          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:18px; text-align:center;">
            <div style="font-size:28px; margin-bottom:8px;">📦</div>
            <strong style="display:block; font-size:14px; margin-bottom:4px;">3단계: 주문/출고 자동화</strong>
            <small style="color:var(--muted); font-size:11.5px;">매일 신규 주문 실시간 수집 및 원클릭 송장 전송 세팅</small>
          </div>
          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:18px; text-align:center;">
            <div style="font-size:28px; margin-bottom:8px;">🎯</div>
            <strong style="display:block; font-size:14px; margin-bottom:4px;">4단계: 위너 가격 방어</strong>
            <small style="color:var(--muted); font-size:11.5px;">최저가 변동 감지 시 마진 한도 내 10원 단위 자동 방어 실행</small>
          </div>
        </div>

        <div style="background:var(--card2); border:1px solid var(--border); border-radius:14px; padding:22px; margin-bottom:20px;">
          <h4 style="font-size:15px; font-weight:850; margin-bottom:10px; color:var(--brand);">🚀 로켓배송 vs 판매자 로켓 (그로스) 입점 비교 전략</h4>
          <p style="font-size:13px; line-height:1.7; color:var(--muted);">
            초기 셀러는 일반 택배 배송으로 시작한 뒤, 회전율이 검증된 핵심 베스트셀러 SKU는 **판매자 로켓(쿠팡 로켓그로스)**으로 전환하는 것이 가장 높은 ROI를 보장합니다. 쿠팡 풀필먼트 센터에 재고를 선입고하면 고객에게 로켓배송 배지가 노출되어 구매 전환율이 최대 350% 상승합니다.
          </p>
        </div>

        <div style="display:flex; justify-content:center; gap:12px;">
          <button class="${btnClass}">쿠팡 WING 개발자센터 바로가기 ↗</button>
          <button class="btn-secondary">초보자용 3분 셋업 동영상 시청</button>
        </div>
      </div>
    `;
  } else {
    // 04_settings: WING API 연동 & 2026-11-01 5단계 표준 로그인 뷰
    return `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; max-width:1100px; margin:0 auto;">
        <!-- 좌측: 쿠팡 WING API 연동 패널 -->
        <div class="panel">
          <div class="panel-header">
            <h3>🔐 쿠팡 WING Open API 연동 설정</h3>
            <span class="badge badge-winner">보안 저장소</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">
                업체코드 (Vendor ID)
              </label>
              <input type="text" class="input-field" value="A01234567" style="margin-bottom:0;" />
            </div>

            <div>
              <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">
                쿠팡 WING Access Key
              </label>
              <input type="password" class="input-field" value="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="margin-bottom:0;" />
            </div>

            <div>
              <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:4px;">
                쿠팡 WING Secret Key
              </label>
              <input type="password" class="input-field" value="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style="margin-bottom:0;" />
            </div>

            <div style="padding:10px 14px; background:var(--card2); border-radius:10px; font-size:11.5px; color:var(--muted);">
              🔒 <strong>최상위 보안 준수:</strong> 회원의 모든 API 키는 회원 본인 브라우저/암호화 세션에만 격리 보관되며 서버 간 임의 공유되지 않습니다.
            </div>

            <button class="${btnClass}" style="width:100%; justify-content:center;">API 연결 테스트 및 즉시 저장</button>
          </div>
        </div>

        <!-- 우측: 2026-11-01 5단계 수직 레이아웃 표준 로그인 골격 (필수 준수) -->
        <div>
          <div class="login-container" style="margin:0 auto;">
            <!-- 1. [맨 위] 프로그램 고유 로고 (64~68px 라운드 스퀘어 아이콘) -->
            <div style="display:flex; justify-content:center; margin-bottom:12px;">
              <div style="width:68px; height:68px; border-radius:18px; background:${logoBg}; color:#FFF; display:flex; align-items:center; justify-content:center; font-size:32px; box-shadow:0 10px 25px -4px rgba(234,51,35,0.4); border:1px solid rgba(255,255,255,0.2);">
                🚀
              </div>
            </div>

            <!-- 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) -->
            <div style="display:flex; justify-content:center; margin-bottom:10px;">
              <span class="badge" style="background:rgba(234,51,35,0.12); color:#EA3323; border:1px solid rgba(234,51,35,0.25); padding:4px 14px; font-size:11px; font-weight:900; letter-spacing:0.06em;">
                AIMASTER COUPANG OPS
              </span>
            </div>

            <!-- 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 -->
            <div style="margin-bottom:20px;">
              <h1 style="font-size:24px; font-weight:900; letter-spacing:-0.5px; margin-bottom:4px;">${brandName}</h1>
              <p style="font-size:12px; color:var(--muted);">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
            </div>

            <!-- 4. [중앙] 로그인/회원가입 폼 카드 -->
            <div style="background:var(--card2); border:1px solid var(--border); border-radius:14px; padding:20px; text-align:left;">
              <div style="display:flex; background:var(--card); border-radius:10px; padding:3px; margin-bottom:16px; border:1px solid var(--border);">
                <button type="button" style="flex:1; border:none; background:var(--card2); color:var(--brand); border-radius:8px; padding:7px 0; font-weight:800; font-size:12px; cursor:pointer;">로그인</button>
                <button type="button" style="flex:1; border:none; background:transparent; color:var(--muted); border-radius:8px; padding:7px 0; font-weight:800; font-size:12px; cursor:pointer;">회원가입</button>
              </div>

              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:var(--muted);">이메일 주소</label>
              <input type="email" class="input-field" placeholder="name@example.com" value="seller@buylife.xyz" />

              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <label style="font-size:12px; font-weight:700; color:var(--muted);">비밀번호</label>
                <a href="#" style="font-size:11px; color:var(--brand); text-decoration:underline;">비밀번호 찾기?</a>
              </div>
              <input type="password" class="input-field" placeholder="••••••••" value="password123!" />

              <button class="${btnClass}" style="width:100%; justify-content:center; padding:12px 0; font-size:13.5px; margin-top:4px;">로그인 →</button>
            </div>

            <!-- 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 준수) -->
            <div style="margin-top:16px; font-size:11px; color:var(--muted); white-space:nowrap;">
              진행 시 <a href="#" style="color:var(--text); text-decoration:underline; font-weight:700;">이용약관</a> 및 <a href="#" style="color:var(--text); text-decoration:underline; font-weight:700;">개인정보 처리방침</a>에 동의합니다.
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

async function run() {
  console.log("=== AI 쿠팡 운영 자동화 (coupang-ops) 4대 화면 3시안 생성 시작 ===");
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
      const headerHtml = buildViewHtml(c, s);
      const contentHtml = buildScreenSpecificContent(c, s);
      const fullHtml = `${headerHtml}${contentHtml}</body></html>`;

      const htmlPath = path.join(dir, `${vName}.html`);
      fs.writeFileSync(htmlPath, fullHtml, 'utf-8');

      // 1440px 고화질 캡처
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.setContent(fullHtml, { waitUntil: 'networkidle' });
      const pngPath = path.join(dir, `${vName}.png`);
      await page.screenshot({ path: pngPath, fullPage: true });
      await page.close();
      console.log(`[시안 ${c} 화면 ${s}] ${vName}.png 캡처 완료`);
    }

    // README.md 생성
    const cNames = {
      1: '82_coupang_rocket_seller_studio (쿠팡 로켓 셀러 인디고 랩 스타일)',
      2: '83_quant_ecommerce_terminal (퀀트 이커머스 터미널 덱 스타일)',
      3: '84_minimal_commerce_atelier (미니멀 커머스 인텔리전스 아틀리에 스타일)'
    };
    const readmeContent = `# ${cNames[c]}
- 프로그램명: AI 쿠팡 운영 자동화 (coupang-ops)
- 공식 도메인: https://coupang-ops.buylife.xyz
- 버전: v1.18
- 생성일시: 2026-11-10

## 4대 화면 고화질 캡처본 목록
1. 01_main.png: 실시간 주문·배송·매출 대시보드 & WING 연동 HUD 메인 뷰
2. 02_detail.png: 아이템위너 최저가 레이더 & 마진 분해 시뮬레이션 심층 분석 뷰
3. 03_guide.png: 쿠팡 WING Open API 발급 & 로켓배송 입점 전략 가이드 뷰
4. 04_settings.png: WING API 인증키 연동 & 2026-11-01 5단계 표준 로그인 뷰
`;
    fs.writeFileSync(path.join(dir, 'README.md'), readmeContent, 'utf-8');
  }

  await browser.close();
  console.log("=== 12개 뷰 HTML 및 1440px 고화질 스크린샷 캡처 완료 ===");
}

run().catch(console.error);
