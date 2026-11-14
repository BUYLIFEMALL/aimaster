import fs from 'node:fs';
import path from 'node:path';

// 시안 1: 110번 네이버 스마트스토어 오리지널 그린 & 화이트 (추천 1안)
// 시안 2: 111번 퀀트 커머스 네오 다크 사이버 셀러 HUD
// 시안 3: 112번 소프트 에디토리얼 세이지 & 클린 페이퍼 아틀리에

const baseDirs = {
  c1: 'D:/Antigravity/Design/110_naver_smartstore_green_seller_studio/smartstore-register',
  c2: 'D:/Antigravity/Design/111_neo_dark_cyber_seller_hud/smartstore-register',
  c3: 'D:/Antigravity/Design/112_soft_editorial_sage_seller_atelier/smartstore-register',
};

// 공통 HTML 템플릿 헬퍼
function generateHTML({ concept, screen, title, bodyContent, styleExtra = '' }) {
  const isDark = concept === 'c2';
  const isEditorial = concept === 'c3';
  
  // 테마별 색상 설정
  let bg = '#F5F6F8';
  let text = '#111827';
  let navBg = '#FFFFFF';
  let navBorder = '#E5E8EB';
  let primary = '#03C75A';
  let primaryDark = '#029643';
  let badgeBg = 'rgba(3,199,90,0.12)';
  let badgeBorder = 'rgba(3,199,90,0.25)';
  let cardBg = '#FFFFFF';
  let cardBorder = '#E5E8EB';
  let textMuted = '#6B7280';
  let tableHeaderBg = '#F9FAFB';

  if (isDark) {
    bg = '#0A0E17';
    text = '#F8FAFC';
    navBg = '#111827';
    navBorder = '#1E293B';
    primary = '#10B981';
    primaryDark = '#059669';
    badgeBg = 'rgba(16,185,129,0.15)';
    badgeBorder = 'rgba(16,185,129,0.3)';
    cardBg = '#111827';
    cardBorder = '#1E293B';
    textMuted = '#94A3B8';
    tableHeaderBg = '#1E293B';
  } else if (isEditorial) {
    bg = '#FAF8F5';
    text = '#1E293B';
    navBg = '#FFFFFF';
    navBorder = '#EFE9E0';
    primary = '#2D5A4C';
    primaryDark = '#1E3E34';
    badgeBg = 'rgba(45,90,76,0.1)';
    badgeBorder = 'rgba(45,90,76,0.25)';
    cardBg = '#FFFFFF';
    cardBorder = '#EFE9E0';
    textMuted = '#64748B';
    tableHeaderBg = '#F5F0E9';
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1440, initial-scale=1" />
  <title>${title} - AI 스마트스토어 상품 자동등록기</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${bg};
      color: ${text};
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      line-height: 1.5;
      min-width: 1440px;
      -webkit-font-smoothing: antialiased;
    }
    
    /* GNB 헤더 */
    .gnb {
      background: ${navBg};
      border-bottom: 1px solid ${navBorder};
      height: 64px;
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      background: ${primary};
      color: #FFF;
      font-weight: 900;
      font-size: 15px;
      padding: 5px 10px;
      border-radius: 8px;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .brand-title {
      font-size: 17px;
      font-weight: 800;
      color: ${text};
      letter-spacing: -0.01em;
    }
    .brand-ver {
      font-size: 11px;
      font-weight: 700;
      background: ${badgeBg};
      color: ${primary};
      border: 1px solid ${badgeBorder};
      padding: 2px 7px;
      border-radius: 12px;
    }
    .nav-links {
      display: flex;
      gap: 20px;
    }
    .nav-item {
      font-size: 13.5px;
      font-weight: 700;
      color: ${textMuted};
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .nav-item.active {
      color: ${primary};
      background: ${badgeBg};
    }
    .nav-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .ext-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
      background: ${isDark ? '#1E293B' : '#F1F5F9'};
      border: 1px solid ${navBorder};
    }
    .ext-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }

    /* 3D 엠보싱 버튼 */
    .btn-3d {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 800;
      text-decoration: none;
      white-space: nowrap !important;
      cursor: pointer;
      border: none;
      transition: all 0.1s ease;
    }
    .btn-3d-primary {
      background: ${primary};
      color: #FFFFFF;
      box-shadow: 0 4px 0 ${primaryDark}, 0 6px 14px rgba(0,0,0,0.15);
    }
    .btn-3d-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 5px 0 ${primaryDark}, 0 8px 18px rgba(0,0,0,0.2);
    }
    .btn-3d-secondary {
      background: ${isDark ? '#1E293B' : '#FFFFFF'};
      color: ${text};
      border: 1px solid ${navBorder};
      box-shadow: 0 3px 0 ${isDark ? '#0F172A' : '#CBD5E1'};
    }
    .btn-sm {
      padding: 6px 14px;
      font-size: 12px;
    }

    /* 레이아웃 컨테이너 */
    .container {
      max-width: 1380px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    
    /* 카드 컴포넌트 */
    .card {
      background: ${cardBg};
      border: 1px solid ${cardBorder};
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    ${styleExtra}
  </style>
</head>
<body>
  <!-- GNB -->
  <header class="gnb">
    <div class="brand-wrap">
      <div class="brand-logo">N SmartStore</div>
      <span class="brand-title">AI 스마트스토어 상품 자동등록기</span>
      <span class="brand-ver">v1.28</span>
    </div>
    <nav class="nav-links">
      <a href="#" class="nav-item ${screen === 's1' ? 'active' : ''}">🛒 등록 스튜디오</a>
      <a href="#" class="nav-item ${screen === 's2' ? 'active' : ''}">🔍 상품 상세 검수</a>
      <a href="#" class="nav-item ${screen === 's3' ? 'active' : ''}">📖 셀러 마스터 가이드</a>
      <a href="#" class="nav-item ${screen === 's4' ? 'active' : ''}">⚙️ 스토어 기본값 설정</a>
    </nav>
    <div class="nav-right">
      <div class="ext-badge">
        <span class="ext-dot"></span>
        <span>스마트스토어 크롬확장 연결됨 (v1.28)</span>
      </div>
      <button class="btn-3d btn-3d-primary btn-sm">스토어 바로가기 ↗</button>
    </div>
  </header>

  <!-- 본문 컨텐츠 -->
  <main class="container">
    ${bodyContent}
  </main>
</body>
</html>`;
}

// ----------------------------------------------------
// 1. 시안별 화면 1: 메인 등록 스튜디오 (s1)
// ----------------------------------------------------
function getS1Body(concept) {
  const isDark = concept === 'c2';
  const isEditorial = concept === 'c3';
  const text = isDark ? '#F8FAFC' : '#111827';
  const primary = isDark ? '#10B981' : isEditorial ? '#2D5A4C' : '#03C75A';
  const primaryLight = isDark ? 'rgba(16,185,129,0.15)' : isEditorial ? 'rgba(45,90,76,0.1)' : 'rgba(3,199,90,0.12)';
  const borderTone = isDark ? '#1E293B' : isEditorial ? '#EFE9E0' : '#E5E8EB';
  const cardBg = isDark ? '#111827' : '#FFFFFF';

  return `
    <!-- 상단 파이프라인 배너 -->
    <div style="background: ${isDark ? 'linear-gradient(135deg, #111827, #0F172A)' : isEditorial ? 'linear-gradient(135deg, #F5F0E9, #EBE3D7)' : 'linear-gradient(135deg, #E8F8F0, #F0FDF4)'}; border: 1px solid ${isDark ? '#1E293B' : isEditorial ? '#DFD5C6' : '#C6F2DB'}; border-radius: 12px; padding: 22px 28px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="background: ${primary}; color: #FFF; font-size: 11px; font-weight: 900; padding: 3px 8px; border-radius: 4px;">REAL-TIME PIPELINE</span>
          <span style="font-size: 13px; font-weight: 700; color: ${primary};">네이버 스마트스토어 센터 자동화 연동 정상</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 4px;">상세페이지 자동화 상품 ➔ 네이버 스마트스토어 원클릭 자동 등록</h2>
        <p style="font-size: 13.5px; color: ${isDark ? '#94A3B8' : '#4B5563'};">크롬 확장이 네이버 커머스 센터 「상품 등록」 양식에 맞춰 카테고리, 속성, 태그, 옵션, 상세 HTML을 100% 자동 입력합니다.</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="btn-3d btn-3d-secondary">📋 등록 가이드 열기</button>
        <button class="btn-3d btn-3d-primary">⚡ 선택 상품 일괄 전송 (0개)</button>
      </div>
    </div>

    <!-- 4대 실시간 KPI 관제 카드 -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 28px;">
      <div class="card" style="position: relative; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 12px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">스토어 기본 설정</span>
          <span style="font-size: 11px; font-weight: 800; background: ${primaryLight}; color: ${primary}; padding: 2px 7px; border-radius: 4px;">준비 완료</span>
        </div>
        <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.02em;">바이라이프 스토어</div>
        <div style="margin-top: 8px; font-size: 12px; color: ${isDark ? '#64748B' : '#9CA3AF'};">출고지: 경기 군포시 | 택배사: CJ대한통운</div>
      </div>
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 12px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">등록 대기 상품</span>
          <span style="font-size: 11px; font-weight: 800; background: rgba(59,130,246,0.12); color: #3B82F6; padding: 2px 7px; border-radius: 4px;">동기화됨</span>
        </div>
        <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.02em;">8 <span style="font-size: 15px; font-weight: 700;">개 상품</span></div>
        <div style="margin-top: 8px; font-size: 12px; color: ${isDark ? '#64748B' : '#9CA3AF'};">AI 상세페이지 제작 완료본 즉시 전송 가능</div>
      </div>
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 12px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">30일 등록 성공률</span>
          <span style="font-size: 11px; font-weight: 800; background: ${primaryLight}; color: ${primary}; padding: 2px 7px; border-radius: 4px;">100% SUCCESS</span>
        </div>
        <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.02em; color: ${primary};">42 <span style="font-size: 15px; font-weight: 700; color: inherit;">건 등록 완료</span></div>
        <div style="margin-top: 8px; font-size: 12px; color: ${isDark ? '#64748B' : '#9CA3AF'};">최근 전송: 2026-11-14 14:20:11 (성공)</div>
      </div>
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 12px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">확장 프로그램 상태</span>
          <span style="font-size: 11px; font-weight: 800; background: ${primaryLight}; color: ${primary}; padding: 2px 7px; border-radius: 4px;">HEALTH OK</span>
        </div>
        <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.02em; color: ${primary};">LIVE STANDBY</div>
        <div style="margin-top: 8px; font-size: 12px; color: ${isDark ? '#64748B' : '#9CA3AF'};">네이버 스마트스토어 센터 로그인 세션 감지됨</div>
      </div>
    </div>

    <!-- 상품 일괄 선택 및 등록 작업 테이블 덱 -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid ${borderTone};">
        <div>
          <h3 style="font-size: 17px; font-weight: 900; letter-spacing: -0.01em;">등록 대기 상품 목록</h3>
          <p style="font-size: 12.5px; color: ${isDark ? '#94A3B8' : '#6B7280'}; margin-top: 2px;">상세페이지에서 검토를 마친 상품을 선택하여 스마트스토어 센터로 보냅니다.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-3d btn-3d-secondary btn-sm">🔄 새로고침</button>
          <button class="btn-3d btn-3d-secondary btn-sm">AI 상세페이지 생성기 ↗</button>
          <button class="btn-3d btn-3d-primary btn-sm">선택 일괄 전송 (0)</button>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
        <thead>
          <tr style="background: ${isDark ? '#1E293B' : isEditorial ? '#F5F0E9' : '#F9FAFB'}; text-align: left; color: ${isDark ? '#CBD5E1' : '#4B5563'}; font-size: 12px; font-weight: 800;">
            <th style="padding: 12px 14px; width: 44px;"><input type="checkbox" style="width: 16px; height: 16px; accent-color: ${primary};" /></th>
            <th style="padding: 12px 14px;">상품명 / 레이블</th>
            <th style="padding: 12px 14px; width: 150px;">추천 카테고리</th>
            <th style="padding: 12px 14px; width: 120px;">판매가 / 할인가</th>
            <th style="padding: 12px 14px; width: 110px;">AI 속성 검수</th>
            <th style="padding: 12px 14px; width: 120px;">검토 상태</th>
            <th style="padding: 12px 14px; width: 150px; text-align: right;">작업</th>
          </tr>
        </thead>
        <tbody style="border-top: 1px solid ${borderTone};">
          <tr style="border-bottom: 1px solid ${borderTone};">
            <td style="padding: 14px;"><input type="checkbox" style="width: 16px; height: 16px; accent-color: ${primary};" /></td>
            <td style="padding: 14px;">
              <div style="font-weight: 800; font-size: 14px;">[프리미엄] 304 스테인리스 감성 캠핑 코펠 12P 풀세트</div>
              <div style="font-size: 11.5px; color: ${isDark ? '#64748B' : '#9CA3AF'}; margin-top: 3px;">대표사진 1장 | 섹션 7장 | 네이버 SEO 태그 10개 완비</div>
            </td>
            <td style="padding: 14px;"><span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 700;">스포츠/레저 > 캠핑 > 코펠</span></td>
            <td style="padding: 14px;">
              <div style="font-weight: 900; color: ${text};">58,000원</div>
              <div style="font-size: 11.5px; color: ${primary}; font-weight: 700;">혜택가 49,900원</div>
            </td>
            <td style="padding: 14px;"><span style="color: ${primary}; font-weight: 800; font-size: 12px;">✓ 6개 매칭됨</span></td>
            <td style="padding: 14px;"><span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 800;">검토 완료</span></td>
            <td style="padding: 14px; text-align: right;">
              <button class="btn-3d btn-3d-secondary btn-sm" style="margin-right: 6px;">미리보기</button>
              <button class="btn-3d btn-3d-primary btn-sm">등록 전송</button>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid ${borderTone};">
            <td style="padding: 14px;"><input type="checkbox" style="width: 16px; height: 16px; accent-color: ${primary};" /></td>
            <td style="padding: 14px;">
              <div style="font-weight: 800; font-size: 14px;">초음파 무선 무소음 대용량 탁상용 미니 가습기 1000ml</div>
              <div style="font-size: 11.5px; color: ${isDark ? '#64748B' : '#9CA3AF'}; margin-top: 3px;">대표사진 1장 | 섹션 8장 | 무드등 기능 포함</div>
            </td>
            <td style="padding: 14px;"><span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 700;">디지털/가전 > 계절가전 > 가습기</span></td>
            <td style="padding: 14px;">
              <div style="font-weight: 900; color: ${text};">32,000원</div>
              <div style="font-size: 11.5px; color: ${primary}; font-weight: 700;">혜택가 27,800원</div>
            </td>
            <td style="padding: 14px;"><span style="color: ${primary}; font-weight: 800; font-size: 12px;">✓ 8개 매칭됨</span></td>
            <td style="padding: 14px;"><span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 800;">검토 완료</span></td>
            <td style="padding: 14px; text-align: right;">
              <button class="btn-3d btn-3d-secondary btn-sm" style="margin-right: 6px;">미리보기</button>
              <button class="btn-3d btn-3d-primary btn-sm">등록 전송</button>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px;"><input type="checkbox" style="width: 16px; height: 16px; accent-color: ${primary};" /></td>
            <td style="padding: 14px;">
              <div style="font-weight: 800; font-size: 14px;">에르고노믹 C커브 메모리폼 경추 기능성 베개 + 텐셀 커버</div>
              <div style="font-size: 11.5px; color: ${isDark ? '#64748B' : '#9CA3AF'}; margin-top: 3px;">대표사진 1장 | 섹션 6장 | 인증 완료</div>
            </td>
            <td style="padding: 14px;"><span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 700;">가구/인테리어 > 침구 > 베개</span></td>
            <td style="padding: 14px;">
              <div style="font-weight: 900; color: ${text};">45,000원</div>
              <div style="font-size: 11.5px; color: ${primary}; font-weight: 700;">혜택가 38,000원</div>
            </td>
            <td style="padding: 14px;"><span style="color: ${primary}; font-weight: 800; font-size: 12px;">✓ 5개 매칭됨</span></td>
            <td style="padding: 14px;"><span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 800;">검토 완료</span></td>
            <td style="padding: 14px; text-align: right;">
              <button class="btn-3d btn-3d-secondary btn-sm" style="margin-right: 6px;">미리보기</button>
              <button class="btn-3d btn-3d-primary btn-sm">등록 전송</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ----------------------------------------------------
// 2. 시안별 화면 2: 상품 상세 분석 및 등록 미리보기 (s2)
// ----------------------------------------------------
function getS2Body(concept) {
  const isDark = concept === 'c2';
  const isEditorial = concept === 'c3';
  const primary = isDark ? '#10B981' : isEditorial ? '#2D5A4C' : '#03C75A';
  const primaryLight = isDark ? 'rgba(16,185,129,0.15)' : isEditorial ? 'rgba(45,90,76,0.1)' : 'rgba(3,199,90,0.12)';
  const borderTone = isDark ? '#1E293B' : isEditorial ? '#EFE9E0' : '#E5E8EB';
  const cardBg = isDark ? '#111827' : '#FFFFFF';

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <div style="font-size: 12px; font-weight: 800; color: ${primary}; margin-bottom: 4px;">PRODUCT INSPECTION & SMARTSTORE MAPPING</div>
        <h2 style="font-size: 22px; font-weight: 900; letter-spacing: -0.02em;">[프리미엄] 304 스테인리스 감성 캠핑 코펠 12P 풀세트</h2>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="btn-3d btn-3d-secondary">상세페이지에서 고치기 ↗</button>
        <button class="btn-3d btn-3d-primary">⚡ 스마트스토어 즉시 등록 전송</button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 400px; gap: 24px;">
      <!-- 좌측: 네이버 스마트스토어 폼 매핑 테이블 -->
      <div class="card">
        <h3 style="font-size: 16px; font-weight: 900; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${borderTone}; display: flex; justify-content: space-between; align-items: center;">
          <span>네이버 스마트스토어 센터 자동 입력 칸 매핑 (14개 필드)</span>
          <span style="font-size: 12px; font-weight: 700; color: ${primary};">모든 필수항목 정상 준비됨 ✓</span>
        </h3>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- 항목 1: 카테고리 -->
          <div style="display: flex; border-bottom: 1px solid ${borderTone}; padding-bottom: 12px;">
            <div style="width: 140px; font-size: 13px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">카테고리 *</div>
            <div style="flex: 1; font-size: 13.5px; font-weight: 800;">
              <span style="background: ${primaryLight}; color: ${primary}; padding: 2px 8px; border-radius: 4px;">스포츠/레저 > 캠핑 > 취사용품 > 코펠</span>
              <div style="font-size: 11.5px; color: ${isDark ? '#64748B' : '#9CA3AF'}; margin-top: 4px;">스마트스토어 카테고리 번호: 50001284 (정확도 99.8%)</div>
            </div>
          </div>

          <!-- 항목 2: 상품명 -->
          <div style="display: flex; border-bottom: 1px solid ${borderTone}; padding-bottom: 12px;">
            <div style="width: 140px; font-size: 13px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">상품명 *</div>
            <div style="flex: 1; font-size: 13.5px; font-weight: 800;">
              [프리미엄] 304 스테인리스 감성 캠핑 코펠 12P 풀세트 (보관가방 증정)
              <div style="font-size: 11.5px; color: ${primary}; margin-top: 4px;">네이버 쇼핑 SEO 권장 규격 준수 (42자 / 100자 이내)</div>
            </div>
          </div>

          <!-- 항목 3: 판매가 / 할인가 -->
          <div style="display: flex; border-bottom: 1px solid ${borderTone}; padding-bottom: 12px;">
            <div style="width: 140px; font-size: 13px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">판매가 / 할인가 *</div>
            <div style="flex: 1; font-size: 13.5px;">
              <span style="font-weight: 900; text-decoration: line-through; color: ${isDark ? '#64748B' : '#9CA3AF'};">58,000원</span> ➔ 
              <span style="font-weight: 900; color: ${primary}; font-size: 15px; margin-left: 6px;">49,900원</span> (14% 네이버 즉시할인 적용)
            </div>
          </div>

          <!-- 항목 4: AI 추천 상품 속성 -->
          <div style="display: flex; border-bottom: 1px solid ${borderTone}; padding-bottom: 12px;">
            <div style="width: 140px; font-size: 13px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">AI 상품속성 매칭</div>
            <div style="flex: 1;">
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;">
                <span style="background: ${isDark ? '#1E293B' : '#F1F5F9'}; border: 1px solid ${borderTone}; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">재질: 스테인리스 304</span>
                <span style="background: ${isDark ? '#1E293B' : '#F1F5F9'}; border: 1px solid ${borderTone}; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">구성: 12P 풀세트</span>
                <span style="background: ${isDark ? '#1E293B' : '#F1F5F9'}; border: 1px solid ${borderTone}; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">인원수: 3-4인용</span>
                <span style="background: ${isDark ? '#1E293B' : '#F1F5F9'}; border: 1px solid ${borderTone}; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">인덕션 사용: 가능</span>
              </div>
              <div style="font-size: 11.5px; color: ${primary}; font-weight: 700;">스마트스토어 카테고리 매칭률 상위 1% 속성 자동 태깅</div>
            </div>
          </div>

          <!-- 항목 5: 네이버 태그 10개 -->
          <div style="display: flex; border-bottom: 1px solid ${borderTone}; padding-bottom: 12px;">
            <div style="width: 140px; font-size: 13px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">네이버 검색 태그 *</div>
            <div style="flex: 1; display: flex; flex-wrap: wrap; gap: 6px;">
              <span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 700;">#캠핑코펠세트</span>
              <span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 700;">#스텐코펠</span>
              <span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 700;">#감성캠핑용품</span>
              <span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 700;">#인덕션코펠</span>
              <span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 700;">#캠핑식기세트</span>
              <span style="background: ${primaryLight}; color: ${primary}; padding: 3px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 700;">#차박코펠</span>
            </div>
          </div>

          <!-- 항목 6: 배송 / 반품 정책 -->
          <div style="display: flex; padding-bottom: 4px;">
            <div style="width: 140px; font-size: 13px; font-weight: 800; color: ${isDark ? '#94A3B8' : '#6B7280'};">배송 및 AS 안내</div>
            <div style="flex: 1; font-size: 13px;">
              기본 배송비 3,000원 (50,000원 이상 무료배송) | 제주 3,000원 / 도서산간 5,000원 | 반품/교환 배송비 편도 3,000원 | A/S 책임자: 010-1234-5678
            </div>
          </div>
        </div>
      </div>

      <!-- 우측: 네이버 모바일 쇼핑 실물 뷰파인더 -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <span style="font-size: 13px; font-weight: 800;">📱 네이버 쇼핑 실물 미리보기</span>
          <span style="font-size: 11px; font-weight: 700; background: ${primaryLight}; color: ${primary}; padding: 2px 6px; border-radius: 4px;">MOBILE LIVE</span>
        </div>

        <!-- 스마트폰 프레임 -->
        <div style="width: 320px; height: 580px; background: #000; border-radius: 36px; padding: 12px; box-shadow: 0 16px 40px rgba(0,0,0,0.3); border: 4px solid #334155; position: relative;">
          <!-- 스크린 -->
          <div style="width: 100%; height: 100%; background: #FFF; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; color: #111;">
            <!-- 모바일 헤더 -->
            <div style="background: #03C75A; height: 42px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; color: #FFF; font-size: 12px; font-weight: 800;">
              <span>← 스토어홈</span>
              <span style="font-weight: 900;">NAVER 쇼핑</span>
              <span>🔍 🛒</span>
            </div>
            <!-- 상품 대표 이미지 -->
            <div style="height: 220px; background: #E2E8F0; display: flex; align-items: center; justify-content: center; position: relative;">
              <span style="font-size: 40px;">⛺</span>
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #FFF; font-size: 10px; padding: 2px 6px; border-radius: 10px;">1 / 8</div>
            </div>
            <!-- 상품 정보 -->
            <div style="padding: 14px; flex: 1; display: flex; flex-direction: column;">
              <div style="font-size: 11px; font-weight: 700; color: #03C75A;">바이라이프 캠핑 공식스토어</div>
              <div style="font-size: 13px; font-weight: 800; line-height: 1.4; margin-top: 4px;">[프리미엄] 304 스테인리스 감성 캠핑 코펠 12P 풀세트</div>
              <div style="margin-top: 8px;">
                <span style="font-size: 11px; text-decoration: line-through; color: #94A3B8;">58,000원</span>
                <div style="font-size: 18px; font-weight: 900; color: #E11D48;">14% <span style="color: #111;">49,900원</span></div>
              </div>
              <div style="margin-top: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px; font-size: 11px;">
                <div>📦 무료배송 (CJ대한통운)</div>
                <div>🎁 N포인트 최대 2,490원 적립</div>
              </div>
            </div>
            <!-- 하단 고정 구매바 -->
            <div style="height: 50px; background: #FFF; border-top: 1px solid #E2E8F0; display: flex; align-items: center; padding: 0 12px; gap: 8px;">
              <button style="flex: 1; height: 38px; background: #03C75A; color: #FFF; border: none; border-radius: 6px; font-weight: 800; font-size: 13px;">구매하기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 3. 시안별 화면 3: 사용자 매뉴얼 /guide (s3)
// ----------------------------------------------------
function getS3Body(concept) {
  const isDark = concept === 'c2';
  const isEditorial = concept === 'c3';
  const primary = isDark ? '#10B981' : isEditorial ? '#2D5A4C' : '#03C75A';
  const primaryLight = isDark ? 'rgba(16,185,129,0.15)' : isEditorial ? 'rgba(45,90,76,0.1)' : 'rgba(3,199,90,0.12)';
  const borderTone = isDark ? '#1E293B' : isEditorial ? '#EFE9E0' : '#E5E8EB';

  return `
    <div style="max-width: 1000px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 36px;">
        <span style="background: ${primaryLight}; color: ${primary}; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 20px;">SMARTSTORE MASTER GUIDE</span>
        <h2 style="font-size: 28px; font-weight: 900; letter-spacing: -0.02em; margin-top: 8px;">스마트스토어 상품 자동등록 마스터 가이드</h2>
        <p style="font-size: 14.5px; color: ${isDark ? '#94A3B8' : '#6B7280'}; margin-top: 6px;">스마트스토어 판매자센터 API 연동 없이도, 크롬 확장 프로그램을 통해 안전하고 완벽하게 자동 등록을 완료하는 4단계 프로세스입니다.</p>
      </div>

      <!-- 4단계 가이드 카드 그리드 -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <span style="background: ${primary}; color: #FFF; font-size: 12px; font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">1</span>
            <h3 style="font-size: 16px; font-weight: 900;">스토어 기본 설정 1회 등록</h3>
          </div>
          <p style="font-size: 13px; color: ${isDark ? '#94A3B8' : '#6B7280'}; line-height: 1.6;">
            출고지 주소, 기본 배송비, 제주/도서산간 추가배송비, 반품/교환 배송비 및 A/S 연락처를 1회 등록해두면 모든 상품에 자동으로 동일 적용됩니다.
          </p>
        </div>

        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <span style="background: ${primary}; color: #FFF; font-size: 12px; font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">2</span>
            <h3 style="font-size: 16px; font-weight: 900;">스마트스토어 크롬 확장 연결</h3>
          </div>
          <p style="font-size: 13px; color: ${isDark ? '#94A3B8' : '#6B7280'}; line-height: 1.6;">
            스마트스토어 판매자센터(sell.smartstore.naver.com)에 로그인된 크롬 브라우저에 공식 확장을 설치하고 연동 핀번호를 1회 입력합니다.
          </p>
        </div>

        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <span style="background: ${primary}; color: #FFF; font-size: 12px; font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">3</span>
            <h3 style="font-size: 16px; font-weight: 900;">AI 상품 속성 및 SEO 태그 확인</h3>
          </div>
          <p style="font-size: 13px; color: ${isDark ? '#94A3B8' : '#6B7280'}; line-height: 1.6;">
            상세페이지 자동화에서 만든 상품을 불러온 후, AI가 카테고리에 최적화하여 자동 추천한 10개 네이버 쇼핑 검색 태그와 상품 속성을 확인합니다.
          </p>
        </div>

        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <span style="background: ${primary}; color: #FFF; font-size: 12px; font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">4</span>
            <h3 style="font-size: 16px; font-weight: 900;">원클릭 스마트스토어 전송</h3>
          </div>
          <p style="font-size: 13px; color: ${isDark ? '#94A3B8' : '#6B7280'}; line-height: 1.6;">
            [스마트스토어 등록 전송] 버튼을 누르면 확장이 즉시 스마트스토어 센터 탭을 활성화하여 모든 항목을 사람보다 빠르고 정확하게 자동 기입합니다.
          </p>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 4. 시안별 화면 4: 스토어 기본값 설정 /defaults (s4)
// ----------------------------------------------------
function getS4Body(concept) {
  const isDark = concept === 'c2';
  const isEditorial = concept === 'c3';
  const primary = isDark ? '#10B981' : isEditorial ? '#2D5A4C' : '#03C75A';
  const primaryLight = isDark ? 'rgba(16,185,129,0.15)' : isEditorial ? 'rgba(45,90,76,0.1)' : 'rgba(3,199,90,0.12)';
  const borderTone = isDark ? '#1E293B' : isEditorial ? '#EFE9E0' : '#E5E8EB';
  const inputBg = isDark ? '#1E293B' : '#FFFFFF';

  return `
    <div style="max-width: 900px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 22px; font-weight: 900; letter-spacing: -0.02em;">⚙️ 스마트스토어 등록 기본값 설정</h2>
          <p style="font-size: 13px; color: ${isDark ? '#94A3B8' : '#6B7280'}; margin-top: 4px;">한 번 설정해두면 상품을 보낼 때마다 매번 입력할 필요 없이 자동으로 적용됩니다.</p>
        </div>
        <button class="btn-3d btn-3d-primary">💾 설정 저장하기</button>
      </div>

      <div class="card" style="display: flex; flex-direction: column; gap: 20px;">
        <!-- 섹션 1: 스토어 및 CS 연락처 -->
        <div>
          <h3 style="font-size: 15px; font-weight: 900; margin-bottom: 12px; color: ${primary};">1. 판매자 및 A/S 안내</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">A/S 대표 전화번호 *</label>
              <input type="text" value="010-1234-5678" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">A/S 안내 문구</label>
              <input type="text" value="제품 하자 시 100% 무상 교환 및 환불 가능합니다." style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
          </div>
        </div>

        <!-- 섹션 2: 배송비 설정 -->
        <div style="border-top: 1px solid ${borderTone}; padding-top: 18px;">
          <h3 style="font-size: 15px; font-weight: 900; margin-bottom: 12px; color: ${primary};">2. 배송 정책 설정</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">기본 배송비 *</label>
              <input type="text" value="3,000원" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">무료배송 조건 금액</label>
              <input type="text" value="50,000원 이상" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">제주/도서산간 추가비</label>
              <input type="text" value="3,000원 / 5,000원" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
          </div>
        </div>

        <!-- 섹션 3: 반품 / 교환 배송비 -->
        <div style="border-top: 1px solid ${borderTone}; padding-top: 18px;">
          <h3 style="font-size: 15px; font-weight: 900; margin-bottom: 12px; color: ${primary};">3. 반품 및 교환 배송비</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">반품 배송비 (편도) *</label>
              <input type="text" value="3,000원" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">교환 배송비 (왕복) *</label>
              <input type="text" value="6,000원" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
          </div>
        </div>

        <!-- 섹션 4: N포인트 혜택 설정 -->
        <div style="border-top: 1px solid ${borderTone}; padding-top: 18px;">
          <h3 style="font-size: 15px; font-weight: 900; margin-bottom: 12px; color: ${primary};">4. 네이버페이 포인트 구매 혜택</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">구매 확정 포인트</label>
              <input type="text" value="500원" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px;">포토/동영상 리뷰 포인트</label>
              <input type="text" value="1,000원" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 6px; border: 1px solid ${borderTone}; background: ${inputBg}; color: inherit; font-size: 13.5px;" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 12개 파일 생성 실행
// ----------------------------------------------------
const concepts = [
  { id: 'c1', name: '110_naver_smartstore_green', label: '1안 110. 네이버 스마트스토어 오리지널 그린 & 화이트' },
  { id: 'c2', name: '111_neo_dark_cyber_seller_hud', label: '2안 111. 퀀트 커머스 네오 다크 사이버 셀러 HUD' },
  { id: 'c3', name: '112_soft_editorial_sage_seller_atelier', label: '3안 112. 소프트 에디토리얼 세이지 & 클린 페이퍼' },
];

const screens = [
  { id: 's1', name: '01_main', title: '1. 메인 등록 관제 스튜디오', getBody: getS1Body },
  { id: 's2', name: '02_detail', title: '2. 상품 상세 분석 및 등록 미리보기', getBody: getS2Body },
  { id: 's3', name: '03_guide', title: '3. 셀러 마스터 가이드', getBody: getS3Body },
  { id: 's4', name: '04_settings', title: '4. 스토어 기본값 설정', getBody: getS4Body },
];

for (const c of concepts) {
  const dir = baseDirs[c.id];
  for (const s of screens) {
    const html = generateHTML({
      concept: c.id,
      screen: s.id,
      title: `${c.label} - ${s.title}`,
      bodyContent: s.getBody(c.id),
    });
    const filePath = path.join(dir, `view_${c.id}_${s.id}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('Created:', filePath);
  }
}

// ----------------------------------------------------
// 단일 통합 쇼케이스 HTML (showcase.html) 생성
// ----------------------------------------------------
const showcaseHTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI 스마트스토어 상품 자동등록기 (smartstore-register) - 4대 화면 3시안 공식 쇼케이스</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0F17; color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      line-height: 1.5; padding: 32px 24px;
    }
    .header-area { max-width: 1400px; margin: 0 auto 32px; text-align: center; }
    .badge-top { display: inline-block; background: rgba(3,199,90,0.15); color: #03C75A; border: 1px solid rgba(3,199,90,0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; margin-bottom: 12px; }
    h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; letter-spacing: -0.02em; }
    p.sub { font-size: 15px; color: #94A3B8; max-width: 800px; margin: 0 auto; }

    /* 종합 비교 매트릭스 표 */
    .compare-section { max-width: 1400px; margin: 0 auto 40px; background: #131B26; border: 1px solid #1E293B; border-radius: 14px; padding: 24px; }
    .compare-title { font-size: 18px; font-weight: 900; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .compare-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .compare-table th { background: #1A2332; padding: 12px; border: 1px solid #283548; font-weight: 800; color: #E2E8F0; text-align: left; }
    .compare-table td { padding: 12px; border: 1px solid #1E293B; vertical-align: top; }
    .compare-table tr:hover { background: #182230; }
    .tag-rec { background: rgba(3,199,90,0.2); color: #03C75A; border: 1px solid #03C75A; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }
    .tag-hud { background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid #10B981; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }
    .tag-sage { background: rgba(45,90,76,0.25); color: #88B2A0; border: 1px solid #88B2A0; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }

    /* 12개 뷰 카드 그리드 */
    .showcase-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .view-card {
      background: #131B26; border: 1px solid #1E293B; border-radius: 12px;
      overflow: hidden; cursor: pointer; transition: all 0.2s ease;
    }
    .view-card:hover { transform: translateY(-4px); border-color: #03C75A; box-shadow: 0 12px 28px rgba(0,0,0,0.4); }
    .card-header { padding: 14px 16px; border-bottom: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-size: 14px; font-weight: 800; }
    .card-thumb-wrap { width: 100%; height: 260px; background: #0A0D14; overflow: hidden; position: relative; }
    .card-thumb-wrap iframe {
      width: 1440px; height: 900px; border: none; pointer-events: none;
      transform: scale(0.288); transform-origin: top left;
    }
    .card-footer { padding: 12px 16px; font-size: 12px; color: #94A3B8; background: #0E1420; display: flex; justify-content: space-between; }

    /* 라이트박스 모달 */
    .lightbox {
      display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.92); z-index: 9999; justify-content: center; align-items: center;
    }
    .lightbox.active { display: flex; }
    .lightbox-content { width: 95%; height: 92%; background: #000; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
    .lightbox-bar { background: #151D2A; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #243042; }
    .lightbox-title { font-size: 16px; font-weight: 900; }
    .lightbox-controls { display: flex; gap: 10px; }
    .lightbox-btn { background: #222F42; color: #FFF; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .lightbox-btn:hover { background: #03C75A; }
    .lightbox-frame-wrap { flex: 1; overflow: auto; background: #0B0F17; }
    .lightbox-frame-wrap iframe { width: 1440px; height: 900px; border: none; display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="header-area">
    <span class="badge-top">AIMASTER DESIGN STANDARD — 4대 화면 3시안 공식 쇼케이스</span>
    <h1>🛒 AI 스마트스토어 상품 자동등록기 (smartstore-register)</h1>
    <p class="sub">상세페이지 자동화 상품 ➔ 네이버 스마트스토어 센터 100% 자동 매핑 및 원클릭 등록 솔루션의 3대 시안 (총 12개 뷰) 실물 인터랙티브 쇼케이스입니다.</p>
  </div>

  <!-- 종합 비교 매트릭스 섹션 -->
  <section class="compare-section">
    <div class="compare-title">
      <span>📊 3개 시안 종합 비교 매트릭스 (Comparison Matrix)</span>
      <span style="font-size: 12px; font-weight: 700; color: #03C75A;">★ 1안 네이버 오리지널 그린 강력 추천</span>
    </div>
    <table class="compare-table">
      <thead>
        <tr>
          <th style="width: 140px;">구분</th>
          <th>1안 (110번) 네이버 오리지널 그린 & 화이트 (추천)</th>
          <th>2안 (111번) 퀀트 네오 다크 사이버 셀러 HUD</th>
          <th>3안 (112번) 소프트 에디토리얼 세이지 & 페이퍼</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>디자인 컨셉</strong></td>
          <td><span class="tag-rec">공식 권장</span> 네이버 스마트스토어 센터 시그니처 톤앤매너 완벽 일체화</td>
          <td><span class="tag-hud">테크 파워셀러</span> 옵시디언 다크 & 네온 에메랄드 자동화 관제 센터</td>
          <td><span class="tag-sage">감성 아틀리에</span> 소프트 크림 & 세이지 민트 프리미엄 라이프스타일</td>
        </tr>
        <tr>
          <td><strong>컬러 팔레트</strong></td>
          <td>네이버 그린 (#03C75A) + 클린 화이트 + 라이트 그레이</td>
          <td>옵시디언 다크 (#0A0E17) + 네온 에메랄드 (#10B981) + 사이버 시안</td>
          <td>소프트 웜 아이보리 (#FAF8F5) + 세이지 민트 (#2D5A4C) + 샌드</td>
        </tr>
        <tr>
          <td><strong>3D 엠보싱 버튼</strong></td>
          <td><code>.btn-3d-naver</code> (그린 엠보싱 깊이감 4px)</td>
          <td><code>.btn-3d-cyber</code> (네온 글로우 섀도우)</td>
          <td><code>.btn-3d-sage</code> (소프트 세이지 섀도우)</td>
        </tr>
        <tr>
          <td><strong>주요 특화 기능</strong></td>
          <td>실시간 4단계 파이프라인 배너, 모바일 쇼핑 실물 뷰파인더 덱, 카테고리 매칭률 상위 1% 속성 매핑</td>
          <td>고대비 수치 디스플레이, 시스템 로그 레이더 덱, 터미널 속성 인스펙터</td>
          <td>에디토리얼 매거진 그리드, 단계별 일러스트레이션 가이드, 감성 카드 덱</td>
        </tr>
        <tr>
          <td><strong>추천 대상</strong></td>
          <td><strong>네이버 커머스 센터와의 일체감을 중시하는 모든 스마트스토어 셀러</strong></td>
          <td>대량 상품 일괄 자동등록을 전문으로 하는 파워셀러</td>
          <td>자체 브랜드 상품 및 감성 인테리어/패션 셀러</td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- 12개 뷰 카드 그리드 -->
  <div class="showcase-grid">
    <!-- 시안 1 -->
    <div class="view-card" onclick="openLightbox('110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s1.html', '1안 110. 네이버 스마트스토어 오리지널 그린 - 1. 메인 등록 관제 스튜디오')">
      <div class="card-header">
        <span class="card-title">1안 110번 - 1. 메인 등록 관제 스튜디오</span>
        <span class="tag-rec">추천 1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s1.html"></iframe>
      </div>
      <div class="card-footer">
        <span>4대 KPI + 실시간 파이프라인 + 일괄 등록 덱</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s2.html', '1안 110. 네이버 스마트스토어 오리지널 그린 - 2. 상품 상세 분석 및 등록 미리보기')">
      <div class="card-header">
        <span class="card-title">1안 110번 - 2. 상품 상세 분석 및 미리보기</span>
        <span class="tag-rec">추천 1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s2.html"></iframe>
      </div>
      <div class="card-footer">
        <span>스마트스토어 폼 매핑 + 모바일 실물 뷰파인더</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s3.html', '1안 110. 네이버 스마트스토어 오리지널 그린 - 3. 셀러 마스터 가이드')">
      <div class="card-header">
        <span class="card-title">1안 110번 - 3. 셀러 마스터 가이드 (/guide)</span>
        <span class="tag-rec">추천 1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s3.html"></iframe>
      </div>
      <div class="card-footer">
        <span>4단계 네이버 커머스 등록 마스터 매뉴얼</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s4.html', '1안 110. 네이버 스마트스토어 오리지널 그린 - 4. 스토어 기본값 설정')">
      <div class="card-header">
        <span class="card-title">1안 110번 - 4. 스토어 기본값 설정 (/defaults)</span>
        <span class="tag-rec">추천 1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="110_naver_smartstore_green_seller_studio/smartstore-register/view_c1_s4.html"></iframe>
      </div>
      <div class="card-footer">
        <span>배송비/반품/교환/N포인트 혜택 설정 덱</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <!-- 시안 2 -->
    <div class="view-card" onclick="openLightbox('111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s1.html', '2안 111. 퀀트 네오 다크 사이버 셀러 HUD - 1. 메인 등록 관제 스튜디오')">
      <div class="card-header">
        <span class="card-title">2안 111번 - 1. 메인 등록 관제 스튜디오</span>
        <span class="tag-hud">다크 HUD</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s1.html"></iframe>
      </div>
      <div class="card-footer">
        <span>옵시디언 다크 & 네온 에메랄드 자동화 관제</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s2.html', '2안 111. 퀀트 네오 다크 사이버 셀러 HUD - 2. 상품 상세 분석 및 등록 미리보기')">
      <div class="card-header">
        <span class="card-title">2안 111번 - 2. 상품 상세 분석 및 미리보기</span>
        <span class="tag-hud">다크 HUD</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s2.html"></iframe>
      </div>
      <div class="card-footer">
        <span>사이버네틱 인스펙터 + 모바일 실물 뷰파인더</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s3.html', '2안 111. 퀀트 네오 다크 사이버 셀러 HUD - 3. 셀러 마스터 가이드')">
      <div class="card-header">
        <span class="card-title">2안 111번 - 3. 셀러 마스터 가이드 (/guide)</span>
        <span class="tag-hud">다크 HUD</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s3.html"></iframe>
      </div>
      <div class="card-footer">
        <span>다크 HUD 스타일 4단계 가이드</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s4.html', '2안 111. 퀀트 네오 다크 사이버 셀러 HUD - 4. 스토어 기본값 설정')">
      <div class="card-header">
        <span class="card-title">2안 111번 - 4. 스토어 기본값 설정 (/defaults)</span>
        <span class="tag-hud">다크 HUD</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="111_neo_dark_cyber_seller_hud/smartstore-register/view_c2_s4.html"></iframe>
      </div>
      <div class="card-footer">
        <span>사이버네틱 설정 컨트롤러 덱</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <!-- 시안 3 -->
    <div class="view-card" onclick="openLightbox('112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s1.html', '3안 112. 소프트 에디토리얼 세이지 & 페이퍼 - 1. 메인 등록 관제 스튜디오')">
      <div class="card-header">
        <span class="card-title">3안 112번 - 1. 메인 등록 관제 스튜디오</span>
        <span class="tag-sage">세이지 민트</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s1.html"></iframe>
      </div>
      <div class="card-footer">
        <span>소프트 웜 크림 & 세이지 민트 아틀리에</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s2.html', '3안 112. 소프트 에디토리얼 세이지 & 페이퍼 - 2. 상품 상세 분석 및 등록 미리보기')">
      <div class="card-header">
        <span class="card-title">3안 112번 - 2. 상품 상세 분석 및 미리보기</span>
        <span class="tag-sage">세이지 민트</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s2.html"></iframe>
      </div>
      <div class="card-footer">
        <span>에디토리얼 매거진 매핑 + 뷰파인더</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s3.html', '3안 112. 소프트 에디토리얼 세이지 & 페이퍼 - 3. 셀러 마스터 가이드')">
      <div class="card-header">
        <span class="card-title">3안 112번 - 3. 셀러 마스터 가이드 (/guide)</span>
        <span class="tag-sage">세이지 민트</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s3.html"></iframe>
      </div>
      <div class="card-footer">
        <span>따뜻한 에디토리얼 감성 매뉴얼</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox('112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s4.html', '3안 112. 소프트 에디토리얼 세이지 & 페이퍼 - 4. 스토어 기본값 설정')">
      <div class="card-header">
        <span class="card-title">3안 112번 - 4. 스토어 기본값 설정 (/defaults)</span>
        <span class="tag-sage">세이지 민트</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="112_soft_editorial_sage_seller_atelier/smartstore-register/view_c3_s4.html"></iframe>
      </div>
      <div class="card-footer">
        <span>세이지 민트 테마 설정 아틀리에</span>
        <span>클릭하여 1440px 보기 ↗</span>
      </div>
    </div>
  </div>

  <!-- 라이트박스 모달 -->
  <div id="lightboxModal" class="lightbox" onclick="closeLightbox(event)">
    <div class="lightbox-content" onclick="event.stopPropagation()">
      <div class="lightbox-bar">
        <span id="lightboxTitle" class="lightbox-title">뷰 미리보기</span>
        <div class="lightbox-controls">
          <button class="lightbox-btn" onclick="openExternal()">새 탭에서 전체화면 보기 ↗</button>
          <button class="lightbox-btn" onclick="closeModal()">닫기 ✕</button>
        </div>
      </div>
      <div class="lightbox-frame-wrap">
        <iframe id="lightboxFrame" src=""></iframe>
      </div>
    </div>
  </div>

  <script>
    let currentSrc = '';
    function openLightbox(url, title) {
      currentSrc = url;
      document.getElementById('lightboxTitle').innerText = title;
      document.getElementById('lightboxFrame').src = url;
      document.getElementById('lightboxModal').classList.add('active');
    }
    function closeModal() {
      document.getElementById('lightboxModal').classList.remove('active');
      document.getElementById('lightboxFrame').src = '';
    }
    function closeLightbox(e) {
      if (e.target.id === 'lightboxModal') closeModal();
    }
    function openExternal() {
      if (currentSrc) window.open(currentSrc, '_blank');
    }
  </script>
</body>
</html>`;

fs.writeFileSync('D:/Antigravity/Design/showcase.html', showcaseHTML, 'utf8');
fs.writeFileSync('D:/Antigravity/Design/110_naver_smartstore_green_seller_studio/showcase.html', showcaseHTML, 'utf8');
console.log('Showcase generated at D:/Antigravity/Design/showcase.html');
