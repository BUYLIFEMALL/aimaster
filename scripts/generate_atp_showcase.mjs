import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '73_notion_linear_productivity_canvas/ai-task-planner'),
  2: path.join(BASE_DIR, '74_quant_time_tracker_dark_terminal/ai-task-planner'),
  3: path.join(BASE_DIR, '75_minimal_zen_planner_atelier/ai-task-planner'),
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
    // 73. 노션 & 리니어 모던 프로덕티비티 캔버스 스타일 (오프화이트 & 딥 슬레이트 + 인디고 바이올렛)
    themeCss = `
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card2: #F1F5F9;
      --border: #E2E8F0;
      --border-bright: #CBD5E1;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #6366F1;
      --brand-hover: #4F46E5;
      --accent: #10B981;
      --accent-red: #EF4444;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:#EEF2FF; color:#4F46E5; border:1px solid #C7D2FE;">⚡ NOTION & LINEAR CANVAS</span>`;
    btnClass = 'btn-3d-indigo';
    brandName = '노션 & 리니어 프로덕티비티 캔버스';
    logoBg = 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)';
    accentColor = '#6366F1';
  } else if (cNum === 2) {
    // 74. 퀀트 타임트래커 다크 터미널 스타일 (옵시디언 블랙 & 네온 에메랄드)
    themeCss = `
      --bg: #070A12;
      --card: #0F1523;
      --card2: #151D30;
      --border: #1E293B;
      --border-bright: #334155;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #10B981;
      --brand-hover: #059669;
      --accent: #06B6D4;
      --accent-red: #F43F5E;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, monospace, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">🟢 QUANT TERMINAL HUD</span>`;
    btnClass = 'btn-3d-emerald';
    brandName = '퀀트 타임트래커 다크 터미널';
    logoBg = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    accentColor = '#10B981';
  } else {
    // 75. 미니멀 젠 플래너 아틀리에 스타일 (내추럴 크림 베이지 & 소프트 테라코타)
    themeCss = `
      --bg: #FAF7F2;
      --card: #FFFFFF;
      --card2: #F4EFE6;
      --border: #E8E2D8;
      --border-bright: #D8CEBE;
      --text: #292524;
      --muted: #78716C;
      --brand: #EA580C;
      --brand-hover: #C2410C;
      --accent: #0D9488;
      --accent-red: #E11D48;
      --gold: #D97706;
      font-family: "Pretendard Variable", -apple-system, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:#FFF7ED; color:#C2410C; border:1px solid #FFEDD5;">🌿 MINIMAL ZEN ATELIER</span>`;
    btnClass = 'btn-3d-terracotta';
    brandName = '미니멀 젠 플래너 아틀리에';
    logoBg = 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
    accentColor = '#EA580C';
  }

  const screenTitle = sNum === 1 ? '오늘의 집중 할 일 & 뽀모도로 타이머 메인 뷰'
    : sNum === 2 ? '성과 차트 & 주간 집중 통계 심층 분석 뷰'
    : sNum === 3 ? 'AI 몰입 플래닝 가이드 & 시간 관리 매뉴얼'
    : '타이머 환경설정 및 5단계 표준 로그인 뷰';

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

    /* 3D 엠보싱 버튼 3종 */
    .btn-3d-indigo {
      background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%);
      color: #FFFFFF;
      font-weight: 800;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #818CF8;
      box-shadow: 0 4px 0 #3730A3, 0 8px 16px rgba(99,102,241,0.25);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-indigo:hover { transform: translateY(1px); box-shadow: 0 2px 0 #3730A3; }

    .btn-3d-emerald {
      background: linear-gradient(180deg, #10B981 0%, #059669 100%);
      color: #04140D;
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
    .btn-3d-emerald:hover { transform: translateY(1px); box-shadow: 0 2px 0 #065F46; }

    .btn-3d-terracotta {
      background: linear-gradient(180deg, #EA580C 0%, #C2410C 100%);
      color: #FFFFFF;
      font-weight: 800;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #FB923C;
      box-shadow: 0 4px 0 #9A3412, 0 8px 16px rgba(234,88,12,0.25);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-terracotta:hover { transform: translateY(1px); box-shadow: 0 2px 0 #9A3412; }

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
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
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

    /* 태스크 아이템 */
    .task-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--card2);
      border: 1px solid var(--border);
      margin-bottom: 8px;
      transition: all 0.15s;
    }
    .task-item:hover {
      border-color: var(--brand);
    }
    .task-item.done {
      opacity: 0.6;
      text-decoration: line-through;
    }

    /* 타이머 다이얼 */
    .timer-ring-box {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      border: 6px solid var(--border);
      border-top-color: var(--brand);
      border-right-color: var(--brand);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 20px auto;
      position: relative;
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
      <div class="logo-icon">⏱️</div>
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <strong style="font-size:16px; font-weight:900;">AI 할 일·성과 관리 플래너</strong>
          <span style="font-size:11px; font-weight:800; color:var(--muted); background:var(--card2); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">v1.12</span>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">AIMASTER TASK & PRODUCTIVITY PLANNER · WORKSPACE</div>
      </div>
      <div style="margin-left:12px;">${themeBadge}</div>
    </div>

    <nav class="nav-tabs">
      <a href="#" class="nav-tab ${sNum === 1 ? 'active' : ''}">✅ 오늘의 할 일 & 타이머</a>
      <a href="#" class="nav-tab ${sNum === 2 ? 'active' : ''}">📊 성과 차트 & AI 회고</a>
      <a href="#" class="nav-tab">📥 받은 할 일 (워크스페이스)</a>
      <a href="#" class="nav-tab ${sNum === 3 ? 'active' : ''}">📖 몰입 가이드</a>
      <a href="#" class="nav-tab ${sNum === 4 ? 'active' : ''}">⚙️ 설정 / 계정</a>
    </nav>

    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:12px; color:var(--muted);">사용자: buylifemall</span>
      <button class="${btnClass}" style="padding:6px 12px; font-size:12px;">+ 새 할 일 추가</button>
    </div>
  </header>

  <!-- 메인 본문 -->
  <main>
`;
}

// 각 화면별 본문 내용 생성
function getScreenBody(cNum, sNum) {
  let btnClass = cNum === 1 ? 'btn-3d-indigo' : cNum === 2 ? 'btn-3d-emerald' : 'btn-3d-terracotta';
  let accent = cNum === 1 ? '#6366F1' : cNum === 2 ? '#10B981' : '#EA580C';

  if (sNum === 1) {
    // 01_main: 오늘의 집중 할 일 & 뽀모도로 타이머 메인 뷰
    return `
      <!-- 핵심 KPI 그리드 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">오늘 완료율</span>
            <span style="font-size:16px;">🎯</span>
          </div>
          <div class="kpi-val" style="color:${accent};">66.7 <span style="font-size:14px; font-weight:600; color:var(--muted);">%</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">12개 중 8개 완료 (남은 4개)</div>
        </div>

        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">오늘 순수 집중 시간</span>
            <span style="font-size:16px;">⏱️</span>
          </div>
          <div class="kpi-val" style="color:#10B981;">4시간 35분</div>
          <div style="font-size:11px; color:#10B981; margin-top:4px;">▲ 전일 대비 +45분 몰입 증가</div>
        </div>

        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">완료된 뽀모도로 세션</span>
            <span style="font-size:16px;">🍅</span>
          </div>
          <div class="kpi-val" style="color:#F59E0B;">11 <span style="font-size:14px; font-weight:600; color:var(--muted);">세션</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">목표 12세션 중 91% 달성</div>
        </div>

        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--muted); font-size:12px; font-weight:700;">워크스페이스 연동</span>
            <span style="font-size:16px;">📨</span>
          </div>
          <div class="kpi-val" style="color:${accent};">3건 수신 <span style="font-size:14px; font-weight:600; color:var(--muted);">대기</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">ai-work-workspace 양방향 동기화</div>
        </div>
      </div>

      <!-- 2단 메인 레이아웃: 태스크 스트림 & 뽀모도로 다이얼 -->
      <div style="display:grid; grid-template-columns: 1.8fr 1.2fr; gap:20px;">
        <!-- 좌측: 할 일 목록 (태스크 덱) -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-size:16px; font-weight:900;">📋 오늘의 집중 할 일 (2026-11-09)</h2>
              <p style="font-size:12px; color:var(--muted); margin-top:2px;">우선순위(P1~P3)와 예상 소요시간 기준으로 정렬되었습니다.</p>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-secondary" style="font-size:11px; padding:4px 8px;">전체</button>
              <button class="btn-secondary" style="font-size:11px; padding:4px 8px;">진행중 (4)</button>
              <button class="btn-secondary" style="font-size:11px; padding:4px 8px;">완료 (8)</button>
            </div>
          </div>

          <div class="task-item" style="border-left:4px solid #EF4444;">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" style="width:16px; height:16px; cursor:pointer;">
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="badge" style="background:#FEE2E2; color:#DC2626;">P1 긴급</span>
                  <span class="badge" style="background:var(--card); color:var(--muted); border:1px solid var(--border);">디자인 리뉴얼</span>
                  <strong style="font-size:13px;">AI 할 일 플래너 4대 화면 3시안 쇼케이스 제작</strong>
                </div>
                <div style="font-size:11px; color:var(--muted); margin-top:3px;">
                  예상 1시간 30분 | 실제 몰입: 50분 (진행 중)
                </div>
              </div>
            </div>
            <button class="${btnClass}" style="padding:4px 10px; font-size:11px;">▶ 집중 시작</button>
          </div>

          <div class="task-item" style="border-left:4px solid #F59E0B;">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" style="width:16px; height:16px; cursor:pointer;">
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="badge" style="background:#FEF3C7; color:#D97706;">P2 중요</span>
                  <span class="badge" style="background:var(--card); color:var(--muted); border:1px solid var(--border);">소싱 자동화</span>
                  <strong style="font-size:13px;">trending-product-finder 실시간 시세 알림 연동 검증</strong>
                </div>
                <div style="font-size:11px; color:var(--muted); margin-top:3px;">
                  예상 45분 | 대기 중
                </div>
              </div>
            </div>
            <button class="btn-secondary" style="padding:4px 10px; font-size:11px;">대기</button>
          </div>

          <div class="task-item" style="border-left:4px solid #10B981;">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" style="width:16px; height:16px; cursor:pointer;">
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="badge" style="background:#D1FAE5; color:#059669;">P3 일반</span>
                  <span class="badge" style="background:var(--card); color:var(--muted); border:1px solid var(--border);">고객 응대</span>
                  <strong style="font-size:13px;">AI 고객센터 FAQ 신규 질문 5건 데이터셋 추가</strong>
                </div>
                <div style="font-size:11px; color:var(--muted); margin-top:3px;">
                  예상 30분 | 대기 중
                </div>
              </div>
            </div>
            <button class="btn-secondary" style="padding:4px 10px; font-size:11px;">대기</button>
          </div>

          <div class="task-item done">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" checked style="width:16px; height:16px; cursor:pointer;">
              <div>
                <span class="badge" style="background:var(--card); color:var(--muted);">완료</span>
                <strong style="font-size:13px;">free-music-studio 카탈로그 썸네일 생성 및 DB 갱신</strong>
                <div style="font-size:11px; color:var(--muted); margin-top:3px;">소요 시간: 35분 완료</div>
              </div>
            </div>
            <span style="font-size:11px; color:#10B981; font-weight:700;">✓ 완료됨</span>
          </div>

          <div class="task-item done">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" checked style="width:16px; height:16px; cursor:pointer;">
              <div>
                <span class="badge" style="background:var(--card); color:var(--muted);">완료</span>
                <strong style="font-size:13px;">banana-canvas v1.45 프로덕션 배포 및 라이브 검증</strong>
                <div style="font-size:11px; color:var(--muted); margin-top:3px;">소요 시간: 40분 완료</div>
              </div>
            </div>
            <span style="font-size:11px; color:#10B981; font-weight:700;">✓ 완료됨</span>
          </div>
        </div>

        <!-- 우측: 뽀모도로 몰입 타이머 다이얼 -->
        <div class="card" style="text-align:center;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:16px; font-weight:900;">🍅 뽀모도로 몰입 타이머</h2>
            <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981;">FOCUS SESSION #12</span>
          </div>

          <p style="font-size:12px; color:var(--muted); margin-top:6px;">현재 진행 중: <strong>AI 할 일 플래너 4대 화면 3시안 제작</strong></p>

          <div class="timer-ring-box">
            <div style="font-size:38px; font-weight:900; font-family:monospace; letter-spacing:-1px;">18:24</div>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;">남은 집중 시간 (총 25분)</div>
          </div>

          <div style="display:flex; justify-content:center; gap:10px; margin-bottom:16px;">
            <button class="${btnClass}" style="padding:10px 24px; font-size:14px;">⏸️ 일시정지</button>
            <button class="btn-secondary" style="padding:10px 18px; font-size:14px;">✅ 세션 완료</button>
            <button class="btn-secondary" style="padding:10px 14px; font-size:14px;">🔄 리셋</button>
          </div>

          <div style="background:var(--card2); border-radius:10px; padding:12px; font-size:12px; text-align:left;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--muted);">다음 휴식:</span>
              <strong>5분 짧은 휴식</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--muted);">연속 집중:</span>
              <strong style="color:${accent};">3세션 연속 몰입 중 🔥</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: 성과 차트 & 주간 집중 통계 심층 분석 뷰
    return `
      <!-- 성과 헤더 카드 -->
      <div class="card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge" style="background:rgba(99,102,241,0.15); color:${accent};">WEEKLY PERFORMANCE REPORT</span>
            <h2 style="font-size:20px; font-weight:900;">주간 집중 및 성과 심층 분석 리포트</h2>
          </div>
          <p style="font-size:13px; color:var(--muted); margin-top:4px;">
            분석 기간: 2026-11-03 ~ 2026-11-09 | 총 누적 집중 시간: <strong style="color:${accent};">28시간 40분</strong> (목표 초과 달성 114%)
          </p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary">📥 CSV 내보내기</button>
          <button class="${btnClass}">📨 AI 업무 워크스페이스로 전송</button>
        </div>
      </div>

      <!-- 2단 차트 그리드: 시간대별 집중 히트맵 & 프로젝트별 시간 점유율 -->
      <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:20px; margin-bottom:20px;">
        <div class="card">
          <h3 style="font-size:15px; font-weight:900; margin-bottom:12px;">📈 7일간 일일 집중 시간 추이 (시간/분)</h3>
          <div style="display:flex; align-items:flex-end; gap:16px; height:180px; padding-top:20px; border-bottom:1px solid var(--border); margin-bottom:12px;">
            <div style="flex:1; text-align:center;">
              <div style="background:${accent}; height:110px; border-radius:6px 6px 0 0; opacity:0.7;"></div>
              <span style="font-size:11px; color:var(--muted); margin-top:6px; display:block;">11/03 (월)<br><strong>3.6h</strong></span>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="background:${accent}; height:140px; border-radius:6px 6px 0 0; opacity:0.8;"></div>
              <span style="font-size:11px; color:var(--muted); margin-top:6px; display:block;">11/04 (화)<br><strong>4.4h</strong></span>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="background:${accent}; height:125px; border-radius:6px 6px 0 0; opacity:0.75;"></div>
              <span style="font-size:11px; color:var(--muted); margin-top:6px; display:block;">11/05 (수)<br><strong>4.0h</strong></span>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="background:${accent}; height:160px; border-radius:6px 6px 0 0; opacity:0.9;"></div>
              <span style="font-size:11px; color:var(--muted); margin-top:6px; display:block;">11/06 (목)<br><strong>5.1h</strong></span>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="background:${accent}; height:150px; border-radius:6px 6px 0 0; opacity:0.85;"></div>
              <span style="font-size:11px; color:var(--muted); margin-top:6px; display:block;">11/07 (금)<br><strong>4.8h</strong></span>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="background:${accent}; height:80px; border-radius:6px 6px 0 0; opacity:0.5;"></div>
              <span style="font-size:11px; color:var(--muted); margin-top:6px; display:block;">11/08 (토)<br><strong>2.5h</strong></span>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="background:${accent}; height:145px; border-radius:6px 6px 0 0; opacity:1.0; box-shadow:0 0 12px ${accent}40;"></div>
              <span style="font-size:11px; color:${accent}; font-weight:800; margin-top:6px; display:block;">오늘 (일)<br><strong>4.6h</strong></span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--muted);">
            <span>주간 일평균: <strong>4.1시간</strong></span>
            <span>최대 몰입 요일: <strong style="color:${accent};">목요일 (5.1시간)</strong></span>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:15px; font-weight:900; margin-bottom:12px;">🍩 프로젝트 카테고리별 몰입 점유율</h3>
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:14px;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span>💻 시스템 개발 & 리팩토링</span>
                <strong>52% (14.9시간)</strong>
              </div>
              <div style="background:var(--card2); height:8px; border-radius:999px; overflow:hidden;">
                <div style="background:${accent}; width:52%; height:100%;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span>🎨 UI/UX 디자인 시안 작업</span>
                <strong>24% (6.9시간)</strong>
              </div>
              <div style="background:var(--card2); height:8px; border-radius:999px; overflow:hidden;">
                <div style="background:#10B981; width:24%; height:100%;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span>🛒 이커머스 소싱 & 키워드 분석</span>
                <strong>14% (4.0시간)</strong>
              </div>
              <div style="background:var(--card2); height:8px; border-radius:999px; overflow:hidden;">
                <div style="background:#F59E0B; width:14%; height:100%;"></div>
              </div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span>📝 기획서 & 인수인계 문서화</span>
                <strong>10% (2.8시간)</strong>
              </div>
              <div style="background:var(--card2); height:8px; border-radius:999px; overflow:hidden;">
                <div style="background:#06B6D4; width:10%; height:100%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 생산성 종합 진단 & 회고 코멘트 카드 -->
      <div class="card" style="background:var(--card2); border:1px solid var(--border-bright);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:18px;">🧠</span>
          <h3 style="font-size:15px; font-weight:900; color:${accent};">AI 생산성 코치 분석 및 회고 피드백</h3>
        </div>
        <p style="font-size:13px; line-height:1.7; color:var(--text);">
          "이번 주 사용자님의 황금 집중 시간대는 <strong>오후 2시 ~ 5시</strong> 사이로 나타났으며, 뽀모도로 세션 중단율이 지난주 18%에서 <strong>6%로 급감</strong>하여 높은 몰입 밀도를 유지했습니다. 특히 시스템 개발과 디자인 작업에서 1회 세션당 평균 28분 지속 집중을 달성했습니다. 다만 오전 10시 이전의 초기 착수 시간이 다소 지연되는 경향이 있으므로, 내일은 전날 밤 작성한 P1 태스크 1개를 모닝 루틴으로 즉시 실행하는 것을 제안합니다."
        </p>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: AI 몰입 플래닝 가이드 & 시간 관리 매뉴얼
    return `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:22px; font-weight:900;">📖 AI 몰입 플래닝 & 시간 관리 매뉴얼</h2>
            <p style="font-size:13px; color:var(--muted); margin-top:4px;">뽀모도로 타이머와 WBS 태스크 분해를 통한 극대화된 1인 생산성 공식</p>
          </div>
          <span class="badge" style="background:rgba(99,102,241,0.15); color:${accent}; font-size:12px; padding:6px 12px;">OFFICIAL PLAYBOOK v1.12</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:24px;">
        <div class="card">
          <div style="font-size:32px; margin-bottom:10px;">🍅</div>
          <h3 style="font-size:16px; font-weight:900; margin-bottom:6px;">1. 뽀모도로 25:5 황금 리듬</h3>
          <p style="font-size:13px; color:var(--muted); line-height:1.6;">
            25분 동안 단 하나의 태스크에만 전력 몰입하고, 5분간 완전한 휴식을 취합니다. 4개 세션이 끝나면 15~30분의 긴 휴식을 취해 뇌의 피로를 예방하고 집중력을 온종일 유지합니다.
          </p>
        </div>

        <div class="card">
          <div style="font-size:32px; margin-bottom:10px;">🌲</div>
          <h3 style="font-size:16px; font-weight:900; margin-bottom:6px;">2. WBS 3단계 태스크 분해 룰</h3>
          <p style="font-size:13px; color:var(--muted); line-height:1.6;">
            1시간 이상의 거대한 업무는 시작하기 어렵습니다. 하나의 할 일을 최대 45분 이내에 완료할 수 있는 세부 액션 단위(P1 긴급, P2 중요, P3 일반)로 쪼개어 저항감을 없앱니다.
          </p>
        </div>

        <div class="card">
          <div style="font-size:32px; margin-bottom:10px;">📨</div>
          <h3 style="font-size:16px; font-weight:900; margin-bottom:6px;">3. 워크스페이스 양방향 연동</h3>
          <p style="font-size:13px; color:var(--muted); line-height:1.6;">
            AI 업무 워크스페이스(ai-work-workspace)에서 기획된 업무를 플래너의 「📥 받은 할 일」로 원클릭 수신하고, 완료된 오늘의 집중 성과는 워크스페이스의 업무 보고서로 자동 전송합니다.
          </p>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px; font-weight:900; margin-bottom:14px;">❓ 사용자 자주 묻는 질문 (FAQ)</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="background:var(--card2); padding:14px; border-radius:10px;">
            <strong style="color:${accent};">Q. 타이머가 작동 중에 다른 화면으로 넘어가면 타이머가 멈추나요?</strong>
            <p style="font-size:13px; color:var(--muted); margin-top:4px;">
              아닙니다! 백그라운드 웹 워커 및 로컬스토리지 타임스탬프 동기화로 브라우저 탭을 전환하거나 다른 페이지를 이동해도 타이머는 초 단위까지 정확하게 유지됩니다.
            </p>
          </div>
          <div style="background:var(--card2); padding:14px; border-radius:10px;">
            <strong style="color:${accent};">Q. AI 피드백 분석 시 어떤 API 키가 사용되나요?</strong>
            <p style="font-size:13px; color:var(--muted); margin-top:4px;">
              회원 본인이 등록한 OpenAI 또는 Google Gemini API 키를 기반으로 회원님의 로컬 데이터만 분석하여 개인정보 유출 없이 안전하게 성과 코칭을 제공합니다.
            </p>
          </div>
        </div>
      </div>
    `;
  } else {
    // 04_settings: 타이머 환경설정 및 5단계 표준 로그인 뷰
    return `
      <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:24px;">
        <!-- 좌측: 타이머 및 워크스페이스 환경설정 -->
        <div class="card">
          <h2 style="font-size:18px; font-weight:900; margin-bottom:4px;">⚙️ 몰입 타이머 & 워크스페이스 설정</h2>
          <p style="font-size:12px; color:var(--muted); margin-bottom:20px;">집중 세션 시간 및 외부 워크스페이스 동기화를 설정합니다.</p>

          <div style="margin-bottom:18px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">집중 몰입 시간 (기본 25분)</label>
            <input type="number" class="input-field" value="25" style="width:120px;">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:18px;">
            <div>
              <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">짧은 휴식 (분)</label>
              <input type="number" class="input-field" value="5">
            </div>
            <div>
              <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">긴 휴식 (분)</label>
              <input type="number" class="input-field" value="15">
            </div>
          </div>

          <div style="margin-bottom:18px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">AI 워크스페이스 연동 (ai-work-workspace)</label>
            <input type="text" class="input-field" value="linked_workspace_user_buylifemall" readonly>
            <span style="font-size:11px; color:#10B981;">✓ 업무 워크스페이스 양방향 수발신 활성화됨</span>
          </div>

          <div style="border-top:1px solid var(--border); padding-top:16px;">
            <button class="${btnClass}">설정 저장 및 타이머 반영</button>
          </div>
        </div>

        <!-- 우측: 2026-11-01 주인님 지침 5단계 표준 로그인 폼 -->
        <div class="login-container" style="margin:0;">
          <!-- 1. [맨 위] 프로그램 고유 로고 -->
          <div class="logo-icon" style="width:68px; height:68px; border-radius:18px; font-size:32px; margin:0 auto 14px; box-shadow:0 8px 24px rgba(0,0,0,0.18);">
            ⏱️
          </div>

          <!-- 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) -->
          <div style="margin-bottom:10px;">
            <span class="badge" style="background:var(--card2); color:${accent}; border:1px solid var(--border-bright); padding:4px 14px; font-size:11px; font-weight:900;">
              AIMASTER AI TASK PLANNER
            </span>
          </div>

          <!-- 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 -->
          <h1 style="font-size:22px; font-weight:900; margin-bottom:6px;">AI 할 일·성과 관리 플래너</h1>
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

    const cDesc = c === 1 ? '73_notion_linear_productivity_canvas (노션 & 리니어 모던 프로덕티비티 캔버스 스타일)'
      : c === 2 ? '74_quant_time_tracker_dark_terminal (퀀트 타임트래커 다크 터미널 스타일)'
      : '75_minimal_zen_planner_atelier (미니멀 젠 플래너 아틀리에 스타일)';

    const readmeContent = `# ${cDesc}
- 프로그램명: AI 할 일·성과 관리 플래너 (ai-task-planner)
- 공식 도메인: https://ai-task-planner.buylife.xyz
- 버전: v1.12
- 생성일시: 2026-11-09

## 4대 화면 고화질 캡처본 목록
1. 01_main.png: 오늘의 집중 할 일 & 뽀모도로 타이머 메인 뷰
2. 02_detail.png: 성과 차트 & 주간 집중 통계 심층 분석 뷰
3. 03_guide.png: AI 몰입 플래닝 가이드 & 시간 관리 매뉴얼
4. 04_settings.png: 타이머 환경설정 및 5단계 표준 로그인 뷰
`;
    fs.writeFileSync(path.join(outDir, 'README.md'), readmeContent, 'utf-8');
  }

  await browser.close();
  console.log('\n🎉 ai-task-planner 3개 시안 총 12개 뷰 1440px 캡처 및 영구 저장 완료!');
}

main().catch(err => {
  console.error('에러 발생:', err);
  process.exit(1);
});
