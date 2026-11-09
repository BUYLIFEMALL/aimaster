import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '79_naver_blog_smart_analytics/blog-keyword'),
  2: path.join(BASE_DIR, '80_quant_seo_matrix_terminal/blog-keyword'),
  3: path.join(BASE_DIR, '81_minimal_blogger_atelier/blog-keyword'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 템플릿 생성 함수
function buildViewHtml(cNum, sNum) {
  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = 'AI 블로그 키워드 자동화';
  let logoBg = '';
  let accentColor = '';

  if (cNum === 1) {
    // 79. 네이버 블로그 스마트 애널리틱스 대시보드 스타일 (에메랄드 민트 & 네이버 그린 & 딥 챠콜)
    themeCss = `
      --bg: #0B111A;
      --card: #121A26;
      --card2: #192333;
      --border: #233247;
      --border-bright: #354A68;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #10B981;
      --brand-naver: #03C75A;
      --brand-hover: #059669;
      --accent: #06B6D4;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">🟢 NAVER BLOG ANALYTICS HUD</span>`;
    btnClass = 'btn-3d-mint';
    logoBg = 'linear-gradient(135deg, #10B981 0%, #03C75A 100%)';
    accentColor = '#10B981';
  } else if (cNum === 2) {
    // 80. 퀀트 SEO 매트릭스 터미널 덱 스타일 (옵시디언 블랙 & 사이버 사이안/바이올렛)
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
      --brand-naver: #10B981;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, monospace, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(6,182,212,0.15); color:#06B6D4; border:1px solid rgba(6,182,212,0.3);">⚡ QUANT SEO MATRIX DECK</span>`;
    btnClass = 'btn-3d-cyan';
    logoBg = 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)';
    accentColor = '#06B6D4';
  } else {
    // 81. 미니멀 블로거 인텔리전스 아틀리에 스타일 (클린 크림 페이퍼 & 소프트 세이지)
    themeCss = `
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card2: #F1F5F9;
      --border: #E2E8F0;
      --border-bright: #CBD5E1;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #059669;
      --brand-hover: #047857;
      --accent: #6366F1;
      --brand-naver: #10B981;
      --gold: #D97706;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(5,150,105,0.12); color:#059669; border:1px solid rgba(5,150,105,0.25);">🌿 MINIMAL BLOGGER ATELIER</span>`;
    btnClass = 'btn-3d-sage';
    logoBg = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    accentColor = '#059669';
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
    .btn-3d-mint {
      background: linear-gradient(180deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #34D399;
      box-shadow: 0 4px 0 #065F46, 0 8px 16px rgba(16,185,129,0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-mint:hover { transform: translateY(1px); box-shadow: 0 2px 0 #065F46; }

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

    /* 12대 기능 세그먼트 칩 */
    .feature-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
    }
    .feature-chip {
      padding: 7px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      background: var(--card2);
      border: 1px solid var(--border);
      color: var(--muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .feature-chip:hover {
      border-color: var(--brand);
      color: var(--text);
    }
    .feature-chip.active {
      background: var(--brand);
      color: #04160A;
      border-color: var(--brand);
      font-weight: 900;
    }

    /* 키워드 테이블 */
    .kw-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .kw-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 12px;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      font-weight: 700;
    }
    .kw-table td {
      padding: 14px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .kw-table tr:hover td {
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
      <div class="logo-icon">🔍</div>
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <strong style="font-size:16px; font-weight:900;">AI 블로그 키워드 자동화</strong>
          <span style="font-size:11px; font-weight:800; color:var(--muted); background:var(--card2); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">v1.12</span>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">AIMASTER NAVER BLOG KEYWORD · INTELLIGENCE DECK</div>
      </div>
      <div style="margin-left:12px;">${themeBadge}</div>
    </div>

    <nav class="nav-tabs">
      <a href="#" class="nav-tab ${sNum === 1 ? 'active' : ''}">📊 대시보드 워크벤치</a>
      <a href="#" class="nav-tab ${sNum === 2 ? 'active' : ''}">⚡ 경쟁력 &amp; 상위분석</a>
      <a href="#" class="nav-tab ${sNum === 3 ? 'active' : ''}">📖 SEO 공략 가이드</a>
      <a href="#" class="nav-tab ${sNum === 4 ? 'active' : ''}">⚙️ API 설정 / 로그인</a>
    </nav>

    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:12px; color:var(--muted);">분석 계정: buylifemall</span>
      <button class="${btnClass}" style="padding:6px 12px; font-size:12px;">+ 새 키워드 발굴</button>
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
    // 01_main: 메인 뷰 (키워드 다각도 분석 대시보드 & 12대 기능 워크벤치)
    return `
      <!-- KPI 요약 카드 그리드 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">누적 발굴 키워드</div>
          <div class="kpi-val" style="color:var(--brand);">184<span style="font-size:14px; font-weight:500; margin-left:4px;">개</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">네이버/구글 검색엔진 연동</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">골드 등급 황금 키워드</div>
          <div class="kpi-val" style="color:var(--gold);">32<span style="font-size:14px; font-weight:500; margin-left:4px;">개</span></div>
          <div style="font-size:11px; color:#10B981; margin-top:4px;">✓ 검색량 高 문서수 低 상위노출 유력</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">상위 1위 탈환 전략 리포트</div>
          <div class="kpi-val" style="color:var(--accent);">56<span style="font-size:14px; font-weight:500; margin-left:4px;">건</span></div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">본문 구조 및 콘텐츠 갭 분석</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:12px; font-weight:700; color:var(--muted);">검색광고 API 연동 상태</div>
          <div class="kpi-val" style="font-size:20px; color:#10B981; margin-top:10px;">🟢 실측 데이터 연동됨</div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">PC/모바일 실시간 쿼리 유효</div>
        </div>
      </div>

      <!-- 메인 키워드 워크벤치 카드 -->
      <div class="card" style="margin-bottom:24px;">
        <h2 style="font-size:18px; font-weight:900; margin-bottom:12px;">🎯 키워드 다각도 분석 워크벤치</h2>

        <!-- 12대 분석 기능 칩 세그먼트 -->
        <div class="feature-chips">
          <span class="feature-chip active">🔍 자동완성 롱테일 (20)</span>
          <span class="feature-chip">🔗 AI 연관검색어</span>
          <span class="feature-chip">🏆 상위 블로그 1위 분석</span>
          <span class="feature-chip">⚡ 키워드 경쟁력 점수</span>
          <span class="feature-chip">💡 오늘의 전략 키워드</span>
          <span class="feature-chip">🧭 40개 다각도 주제</span>
          <span class="feature-chip">📰 실시간 뉴스 전략</span>
          <span class="feature-chip">📈 카테고리 트렌드</span>
          <span class="feature-chip">⭐ 골드/실버 등급 탐색</span>
          <span class="feature-chip">🚀 데이터랩 급상승</span>
          <span class="feature-chip">🎯 블로그 벤치마킹</span>
          <span class="feature-chip">📚 50대 프롬프트</span>
        </div>

        <!-- 키워드 검색창 컨트롤 바 -->
        <div style="display:flex; gap:10px; align-items:center; background:var(--card2); padding:12px; border-radius:12px; border:1px solid var(--border);">
          <input type="text" value="제주도 3박4일 여행코스" style="flex:1; padding:12px 16px; border-radius:8px; border:1px solid var(--border-bright); background:var(--card); color:var(--text); font-size:15px; font-weight:800; outline:none;" placeholder="분석할 키워드를 입력하세요 (예: 캠핑 의자, 제주 여행)">
          <select style="padding:12px 14px; border-radius:8px; border:1px solid var(--border-bright); background:var(--card); color:var(--text); font-size:13px; font-weight:700;">
            <option selected>네이버 (검색광고 실측)</option>
            <option>구글 (SerpApi)</option>
          </select>
          <button class="${btnClass}" style="padding:12px 24px; font-size:14px;">키워드 정밀 분석 시작 🚀</button>
        </div>
      </div>

      <!-- 최근 분석 결과 및 황금 키워드 테이블 -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div>
            <h3 style="font-size:16px; font-weight:900;">📋 자동완성 롱테일 &amp; 등급 분석 결과 리스트 (20건)</h3>
            <p style="font-size:12px; color:var(--muted); margin-top:2px;">월간 검색량 대비 발행 문서수가 적어 상위 노출 기회가 높은 황금 키워드 목록입니다.</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-secondary" style="font-size:12px; padding:6px 12px;">CSV 다운로드</button>
            <button class="btn-secondary" style="font-size:12px; padding:6px 12px;">마크다운 복사</button>
            <button class="${btnClass}" style="font-size:12px; padding:6px 14px;">워크스페이스로 보내기 📨</button>
          </div>
        </div>

        <table class="kw-table">
          <thead>
            <tr>
              <th style="width:40px;"><input type="checkbox" checked></th>
              <th>키워드 명</th>
              <th style="width:110px;">키워드 등급</th>
              <th style="width:130px;">월간 검색량</th>
              <th style="width:130px;">누적 문서수</th>
              <th style="width:120px;">경쟁 난이도</th>
              <th style="width:180px; text-align:right;">상위 노출 액션</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="checkbox" checked></td>
              <td>
                <div style="font-weight:900; font-size:14px;">제주도 3박4일 여행코스 5월</div>
                <div style="font-size:11px; color:var(--muted);">검색의도: 5월 날씨별 동선 최적화 코스 탐색</div>
              </td>
              <td><span class="badge" style="background:rgba(245,158,11,0.18); color:#F59E0B; border:1px solid rgba(245,158,11,0.35);">⭐ GOLD (추천)</span></td>
              <td><strong style="color:var(--brand); font-size:14px;">32,700회</strong> (모바일 88%)</td>
              <td>12,400건</td>
              <td><span style="color:#10B981; font-weight:800;">낮음 (기회 92점)</span></td>
              <td style="text-align:right;"><button class="${btnClass}" style="font-size:12px; padding:6px 12px;">1위 분석 보기 🔍</button></td>
            </tr>
            <tr>
              <td><input type="checkbox" checked></td>
              <td>
                <div style="font-weight:900; font-size:14px;">제주도 3박4일 동쪽 코스 맛집</div>
                <div style="font-size:11px; color:var(--muted);">검색의도: 성산/함덕/월정리 중심 맛집 투어</div>
              </td>
              <td><span class="badge" style="background:rgba(245,158,11,0.18); color:#F59E0B; border:1px solid rgba(245,158,11,0.35);">⭐ GOLD (추천)</span></td>
              <td><strong style="color:var(--brand); font-size:14px;">18,500회</strong> (모바일 92%)</td>
              <td>8,100건</td>
              <td><span style="color:#10B981; font-weight:800;">낮음 (기회 88점)</span></td>
              <td style="text-align:right;"><button class="${btnClass}" style="font-size:12px; padding:6px 12px;">1위 분석 보기 🔍</button></td>
            </tr>
            <tr>
              <td><input type="checkbox"></td>
              <td>
                <div style="font-weight:900; font-size:14px;">제주도 3박4일 렌트카 비용 경비</div>
                <div style="font-size:11px; color:var(--muted);">검색의도: 2인/가족 기준 실제 지출 예산 총정리</div>
              </td>
              <td><span class="badge" style="background:rgba(148,163,184,0.15); color:var(--muted); border:1px solid var(--border);">SILVER (보통)</span></td>
              <td><strong>14,200회</strong></td>
              <td>24,800건</td>
              <td><span style="color:var(--gold); font-weight:800;">보통 (경쟁 65점)</span></td>
              <td style="text-align:right;"><button class="btn-secondary" style="font-size:12px; padding:6px 12px;">분석 보기</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: 심층 분석 뷰 (키워드 경쟁력 & 상위 블로그 1위 공략 뷰)
    return `
      <div style="display:grid; grid-template-columns: 1.15fr 1fr; gap:24px;">
        <!-- 좌측: 키워드 경쟁력 및 실측 검색량 HUD -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
            <div>
              <span class="badge" style="background:rgba(245,158,11,0.18); color:#F59E0B; margin-bottom:8px;">⭐ GOLD 황금 키워드 (기회 점수 92/100)</span>
              <h2 style="font-size:20px; font-weight:900;">제주도 3박4일 여행코스 5월</h2>
              <p style="font-size:12px; color:var(--muted); margin-top:2px;">네이버 검색광고 실측 검색량 및 상위 랭킹 블로그 10개 글 심층 역기획 분석</p>
            </div>
            <button class="${btnClass}" style="font-size:13px; padding:8px 16px;">블로그 글쓰기로 전달 🚀</button>
          </div>

          <!-- 실측 검색량 및 경쟁 지표 카드 3열 -->
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:20px;">
            <div style="padding:14px; background:var(--card2); border:1px solid var(--border); border-radius:10px;">
              <div style="font-size:11px; color:var(--muted);">월간 총 검색수</div>
              <div style="font-size:22px; font-weight:900; color:var(--brand); margin-top:4px;">32,700<span style="font-size:13px; font-weight:500;">회</span></div>
              <div style="font-size:10px; color:var(--muted); margin-top:2px;">PC 4,200 / 모바일 28,500</div>
            </div>
            <div style="padding:14px; background:var(--card2); border:1px solid var(--border); border-radius:10px;">
              <div style="font-size:11px; color:var(--muted);">발행 블로그 문서수</div>
              <div style="font-size:22px; font-weight:900; color:var(--text); margin-top:4px;">12,400<span style="font-size:13px; font-weight:500;">건</span></div>
              <div style="font-size:10px; color:#10B981; margin-top:2px;">경쟁 강도 0.38 (매우 낮음)</div>
            </div>
            <div style="padding:14px; background:var(--card2); border:1px solid var(--border); border-radius:10px;">
              <div style="font-size:11px; color:var(--muted);">예상 유입 잠재력</div>
              <div style="font-size:22px; font-weight:900; color:var(--gold); margin-top:4px;">상위 1위<span style="font-size:13px; font-weight:500;">권</span></div>
              <div style="font-size:10px; color:var(--muted); margin-top:2px;">일평균 800~1,200명 유입</div>
            </div>
          </div>

          <!-- 상위 10개 블로그 본문 구조 분석 -->
          <div style="margin-bottom:20px;">
            <strong style="font-size:14px; display:block; margin-bottom:8px;">📊 네이버 1페이지 상위 10개 블로그 본문 스펙 평균</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div style="padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">평균 본문 글자수</div>
                <div style="font-weight:900; font-size:15px; margin-top:2px;">2,450자 <small style="font-weight:500; color:var(--muted);">(공백 제외)</small></div>
              </div>
              <div style="padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">평균 포함 사진 수</div>
                <div style="font-weight:900; font-size:15px; margin-top:2px;">18.4장 <small style="font-weight:500; color:var(--muted);">(고화질 실사 위주)</small></div>
              </div>
              <div style="padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">평균 소제목 수</div>
                <div style="font-weight:900; font-size:15px; margin-top:2px;">5~6개 <small style="font-weight:500; color:var(--muted);">(일자별 코스 구분)</small></div>
              </div>
              <div style="padding:12px; background:var(--card2); border:1px solid var(--border); border-radius:8px;">
                <div style="font-size:11px; color:var(--muted);">스마트플레이스 지도 첨부</div>
                <div style="font-weight:900; font-size:15px; margin-top:2px;">평균 4.2개 <small style="font-weight:500; color:#10B981;">(필수 가점 요인)</small></div>
              </div>
            </div>
          </div>

          <!-- 공통 포함 키워드 뱃지 -->
          <div>
            <strong style="font-size:13px; display:block; margin-bottom:6px;">상위 블로그 공통 핵심 연관 키워드</strong>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              <span class="badge" style="background:var(--card2); color:var(--text); border:1px solid var(--border-bright);">#제주동쪽코스</span>
              <span class="badge" style="background:var(--card2); color:var(--text); border:1px solid var(--border-bright);">#함덕해수욕장</span>
              <span class="badge" style="background:var(--card2); color:var(--text); border:1px solid var(--border-bright);">#성산일출봉</span>
              <span class="badge" style="background:var(--card2); color:var(--text); border:1px solid var(--border-bright);">#렌트카비용</span>
              <span class="badge" style="background:var(--card2); color:var(--text); border:1px solid var(--border-bright);">#가족여행경비</span>
              <span class="badge" style="background:var(--card2); color:var(--text); border:1px solid var(--border-bright);">#5월제주날씨</span>
            </div>
          </div>
        </div>

        <!-- 우측: AI 1위 공략 전략 가이드 & 콘텐츠 갭 제안 -->
        <div class="card">
          <h2 style="font-size:18px; font-weight:900; margin-bottom:6px;">🚀 AI 1위 탈환 콘텐츠 설계서</h2>
          <p style="font-size:12px; color:var(--muted); margin-bottom:16px;">네이버 C-Rank &amp; D.I.A 알고리즘에 가점을 받는 추천 글 구조입니다.</p>

          <div style="background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px;">
            <div style="font-size:12px; font-weight:800; color:var(--brand); margin-bottom:4px;">추천 포스팅 제목 구조 (CTR 극대화)</div>
            <div style="font-weight:900; font-size:14px; line-height:1.4; color:var(--text);">
              5월 제주도 3박4일 여행코스 추천 동선 총정리 (렌트카 경비 &amp; 맛집 지도 포함)
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <strong style="font-size:13px; display:block; margin-bottom:8px;">상위 노출 핵심 체크포인트</strong>
            <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:8px; font-size:12px;">
              <li style="display:flex; gap:8px; align-items:flex-start;">
                <span style="color:#10B981; font-weight:900;">✓</span>
                <span><strong>도입부 키워드 배치</strong>: 첫 2단락 안에 '제주도 3박4일 여행코스'를 자연스럽게 2회 기입</span>
              </li>
              <li style="display:flex; gap:8px; align-items:flex-start;">
                <span style="color:#10B981; font-weight:900;">✓</span>
                <span><strong>플레이스 지도 필수</strong>: 방문한 맛집/카페 4곳의 네이버 지도를 본문에 첨부</span>
              </li>
              <li style="display:flex; gap:8px; align-items:flex-start;">
                <span style="color:#10B981; font-weight:900;">✓</span>
                <span><strong>콘텐츠 갭 공략</strong>: 경쟁 글들이 빠뜨린 '실제 렌트카 주유비 &amp; 주차 팁'을 표로 제시</span>
              </li>
              <li style="display:flex; gap:8px; align-items:flex-start;">
                <span style="color:#10B981; font-weight:900;">✓</span>
                <span><strong>체류시간 확보</strong>: 1일차~3일차 요약 타임라인 인포그래픽을 상단에 배치</span>
              </li>
            </ul>
          </div>

          <!-- 하단 액션 버튼 그룹 -->
          <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:space-between; align-items:center;">
            <button class="btn-secondary" style="font-size:12px;">지시문 복사</button>
            <button class="${btnClass}" style="padding:10px 20px; font-size:13px;">블로그 글쓰기 자동화로 바로 넘기기 🚀</button>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: 공략 가이드 뷰 (황금 키워드 발굴 파이프라인 & 상위 노출 매뉴얼)
    return `
      <div style="max-width:1100px; margin:0 auto;">
        <!-- 상단 헤더 배너 -->
        <div class="card" style="margin-bottom:24px; background:linear-gradient(135deg, var(--card) 0%, var(--card2) 100%);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; margin-bottom:8px;">📖 SEO MASTER PLAYBOOK</span>
              <h2 style="font-size:22px; font-weight:900;">네이버 블로그 황금 키워드 발굴 &amp; 1위 노출 공식 매뉴얼</h2>
              <p style="font-size:13px; color:var(--muted); margin-top:4px;">
                검색량은 높고 문서수는 적은 블루오션 키워드를 선별하여 블로그 방문자를 폭발적으로 늘리는 전략 가이드입니다.
              </p>
            </div>
            <button class="${btnClass}" style="padding:10px 20px; font-size:13px;">실전 키워드 발굴 시작하기 🚀</button>
          </div>
        </div>

        <!-- 4단계 파이프라인 카드 -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; margin-bottom:28px;">
          <div class="card">
            <div style="width:36px; height:36px; border-radius:10px; background:var(--card2); border:1px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--brand); margin-bottom:12px;">1</div>
            <h3 style="font-size:14px; font-weight:800; margin-bottom:6px;">시드 키워드 탐색</h3>
            <p style="font-size:12px; color:var(--muted); line-height:1.5;">
              내 블로그 주제에 맞는 핵심 단어를 입력하고 자동완성 롱테일 20개 후보를 1차 추출합니다.
            </p>
          </div>
          <div class="card">
            <div style="width:36px; height:36px; border-radius:10px; background:var(--card2); border:1px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--brand); margin-bottom:12px;">2</div>
            <h3 style="font-size:14px; font-weight:800; margin-bottom:6px;">실측 검색량 대조</h3>
            <p style="font-size:12px; color:var(--muted); line-height:1.5;">
              네이버 검색광고 공식 API로 PC/모바일 실측 쿼리수와 누적 발행 문서수를 자동 대조합니다.
            </p>
          </div>
          <div class="card">
            <div style="width:36px; height:36px; border-radius:10px; background:var(--card2); border:1px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--brand); margin-bottom:12px;">3</div>
            <h3 style="font-size:14px; font-weight:800; margin-bottom:6px;">골드 등급 선별</h3>
            <p style="font-size:12px; color:var(--muted); line-height:1.5;">
              경쟁률 0.5 이하이면서 월간 검색수 1만 이상의 '골드 등급' 황금 키워드만 자동으로 필터링합니다.
            </p>
          </div>
          <div class="card">
            <div style="width:36px; height:36px; border-radius:10px; background:var(--card2); border:1px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--brand); margin-bottom:12px;">4</div>
            <h3 style="font-size:14px; font-weight:800; margin-bottom:6px;">원클릭 글쓰기 연동</h3>
            <p style="font-size:12px; color:var(--muted); line-height:1.5;">
              AI 블로그 포스팅 프로그램으로 클릭 한 번에 전달하여 1위 타겟 원문과 이미지를 즉시 생성합니다.
            </p>
          </div>
        </div>

        <!-- FAQ 아코디언 카드 -->
        <div class="card">
          <h3 style="font-size:16px; font-weight:900; margin-bottom:14px;">자주 묻는 질문 (FAQ)</h3>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="padding:14px; background:var(--card2); border-radius:10px; border:1px solid var(--border);">
              <strong style="font-size:13px; color:var(--brand); display:block; margin-bottom:4px;">Q. 네이버 검색광고 API 키가 꼭 필요한가요?</strong>
              <p style="font-size:12px; color:var(--muted); margin:0;">기본 자동완성, AI 연관검색어, 카테고리 트렌드는 API 키 없이 무료로 동작합니다. 정확한 PC/모바일 월간 검색량과 골드/실버 등급 판정 기능만 회원 본인의 네이버 검색광고 무료 API 키를 사용합니다.</p>
            </div>
            <div style="padding:14px; background:var(--card2); border-radius:10px; border:1px solid var(--border);">
              <strong style="font-size:13px; color:var(--brand); display:block; margin-bottom:4px;">Q. 발굴한 키워드는 어떻게 글쓰기로 이어지나요?</strong>
              <p style="font-size:12px; color:var(--muted); margin:0;">결과 화면 우측의 [블로그 글쓰기로 전달] 버튼을 누르시면, AIMaster 생태계의 블로그 포스팅 자동화 도구로 키워드와 추천 목차가 즉시 전달되어 원고 작성이 시작됩니다.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // 04_settings: 설정 뷰 (API 연동 설정 및 2026-11-01 5단계 표준 로그인 뷰)
    return `
      <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:24px;">
        <!-- 좌측: API 연동 설정 -->
        <div class="card">
          <h2 style="font-size:18px; font-weight:900; margin-bottom:4px;">⚙️ 네이버 검색 &amp; 검색광고 API 설정</h2>
          <p style="font-size:12px; color:var(--muted); margin-bottom:20px;">네이버 공식 개발자센터 및 검색광고 시스템에서 발급받은 본인 API 키를 안전하게 등록합니다.</p>

          <div style="margin-bottom:16px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">네이버 오픈API Client ID (뉴스/블로그 검색용)</label>
            <input type="text" class="input-field" value="na_client_id_buylife_2026">
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">네이버 오픈API Client Secret</label>
            <input type="password" class="input-field" value="••••••••••••••••••••">
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">네이버 검색광고 API 라이선스 키 (실측 검색량용)</label>
            <input type="text" class="input-field" value="01000000005a7b8c9d0e1f2a3b4c">
          </div>

          <div style="margin-bottom:20px;">
            <label style="font-weight:800; font-size:13px; display:block; margin-bottom:6px;">네이버 검색광고 비밀키 (Secret Key)</label>
            <input type="password" class="input-field" value="••••••••••••••••••••">
          </div>

          <div style="border-top:1px solid var(--border); padding-top:16px;">
            <button class="${btnClass}">API 키 저장 및 정상 연동 테스트</button>
          </div>
        </div>

        <!-- 우측: 2026-11-01 주인님 지침 5단계 표준 로그인 폼 -->
        <div class="login-container" style="margin:0;">
          <!-- 1. [맨 위] 프로그램 고유 로고 -->
          <div class="logo-icon" style="width:68px; height:68px; border-radius:18px; font-size:32px; margin:0 auto 14px; box-shadow:0 8px 24px rgba(0,0,0,0.18);">
            🔍
          </div>

          <!-- 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) -->
          <div style="margin-bottom:10px;">
            <span class="badge" style="background:var(--card2); color:var(--brand); border:1px solid var(--border-bright); padding:4px 14px; font-size:11px; font-weight:900;">
              AIMASTER BLOG KEYWORD
            </span>
          </div>

          <!-- 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 -->
          <h1 style="font-size:22px; font-weight:900; margin-bottom:6px;">AI 블로그 키워드 자동화</h1>
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

// 메인 실행 함수
async function run() {
  console.log("=== AI 블로그 키워드 자동화 (blog-keyword) 4대 화면 3시안 생성 시작 ===");
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
      1: '79_naver_blog_smart_analytics (네이버 블로그 스마트 애널리틱스 대시보드 스타일)',
      2: '80_quant_seo_matrix_terminal (퀀트 SEO 매트릭스 터미널 덱 스타일)',
      3: '81_minimal_blogger_atelier (미니멀 블로거 인텔리전스 아틀리에 스타일)'
    };
    const readmeContent = `# ${cNames[c]}
- 프로그램명: AI 블로그 키워드 자동화 (blog-keyword)
- 공식 도메인: https://blog-keyword.buylife.xyz
- 버전: v1.12
- 생성일시: 2026-11-09

## 4대 화면 고화질 캡처본 목록
1. 01_main.png: 키워드 다각도 분석 대시보드 & 12대 기능 워크벤치 메인 뷰
2. 02_detail.png: 키워드 경쟁력 및 상위 블로그 1위 공략 심층 분석 뷰
3. 03_guide.png: 황금 키워드 발굴 파이프라인 & SEO 상위 노출 매뉴얼
4. 04_settings.png: 네이버 검색광고 API 설정 및 5단계 표준 로그인 뷰
`;
    fs.writeFileSync(path.join(dir, 'README.md'), readmeContent, 'utf-8');
  }

  await browser.close();
  console.log("=== 12개 뷰 HTML 및 1440px 고화질 스크린샷 캡처 완료 ===");
}

run().catch(console.error);
