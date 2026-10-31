const fs = require('fs');
const path = require('path');
const { chromium } = require('D:/Antigravity/AIMaster/thumbnail-master/node_modules/playwright');

const baseDesignDir = 'D:/Antigravity/Design';
const scratchDir = 'D:/Antigravity/AIMaster/scratch/coupang_screenshots';
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

// Common CSS & Font
const commonStyles = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Pretendard, -apple-system, sans-serif; line-height: 1.5; -webkit-font-smoothing: antialiased; }

/* 3D Embossed Buttons */
.btn-3d-coupang-red {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(180deg, #FF2E38 0%, #E31A22 100%);
  color: #ffffff; font-weight: 800; font-size: 13px;
  padding: 10px 20px; border-radius: 10px; border: 1px solid #B71118;
  box-shadow: 0 5px 0 #880B10, 0 8px 18px rgba(227,26,34,0.38);
  cursor: pointer; transition: all 0.15s ease; text-decoration: none;
}
.btn-3d-coupang-red:hover { transform: translateY(-1.5px); box-shadow: 0 6.5px 0 #880B10, 0 10px 22px rgba(227,26,34,0.48); }
.btn-3d-coupang-red:active { transform: translateY(4px); box-shadow: 0 1px 0 #880B10; }

.btn-3d-rocket-yellow {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(180deg, #FFC72C 0%, #F59E0B 100%);
  color: #5B2C04; font-weight: 900; font-size: 13px;
  padding: 10px 20px; border-radius: 10px; border: 1px solid #D97706;
  box-shadow: 0 5px 0 #92400E, 0 8px 18px rgba(245,158,11,0.4);
  cursor: pointer; transition: all 0.15s ease; text-decoration: none;
}
.btn-3d-rocket-yellow:hover { transform: translateY(-1.5px); box-shadow: 0 6.5px 0 #92400E, 0 10px 22px rgba(245,158,11,0.5); }
.btn-3d-rocket-yellow:active { transform: translateY(4px); box-shadow: 0 1px 0 #92400E; }

.btn-3d-indigo {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%);
  color: #ffffff; font-weight: 800; font-size: 13px;
  padding: 10px 20px; border-radius: 10px; border: 1px solid #1E40AF;
  box-shadow: 0 5px 0 #172554, 0 8px 18px rgba(29,78,216,0.38);
  cursor: pointer; transition: all 0.15s ease; text-decoration: none;
}
.btn-3d-indigo:hover { transform: translateY(-1.5px); box-shadow: 0 6.5px 0 #172554, 0 10px 22px rgba(29,78,216,0.48); }
.btn-3d-indigo:active { transform: translateY(4px); box-shadow: 0 1px 0 #172554; }

.badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; }
</style>
`;

// Helper: Standard Sidebar HTML matching docs/SIDEBAR_LAYOUT_STANDARD.md
function getStandardSidebar(theme, currentTab) {
  const isC1 = theme === 'c1';
  const isC2 = theme === 'c2';
  const isC3 = theme === 'c3';

  const bg = '#FFFFFF';
  const border = isC1 ? '#F1F5F9' : isC2 ? '#E2E8F0' : '#E2E8F0';
  const brandTitleColor = isC1 ? '#E31A22' : isC2 ? '#0F172A' : '#1D4ED8';
  const badgeBg = isC1 ? '#FEE2E2' : isC2 ? '#FEF3C7' : '#EFF6FF';
  const badgeBorder = isC1 ? '#FCA5A5' : isC2 ? '#FDE68A' : '#BFDBFE';
  const badgeText = isC1 ? '#B91C1C' : isC2 ? '#B45309' : '#1E40AF';
  const textColor = '#475569';
  const activeBg = isC1 ? '#FEF2F2' : isC2 ? '#FFFBEB' : '#EFF6FF';
  const activeBorder = isC1 ? '#E31A22' : isC2 ? '#F59E0B' : '#2563EB';
  const activeText = isC1 ? '#E31A22' : isC2 ? '#B45309' : '#1D4ED8';
  const iconColor = isC1 ? '#E31A22' : isC2 ? '#F59E0B' : '#2563EB';

  return `
  <aside style="width:254px; height:100vh; background:${bg}; border-right:1px solid ${border}; display:flex; flex-direction:column; flex-shrink:0; select-none;">
    <!-- 1. 프로그램명 & 버전 -->
    <div style="padding:18px 16px 14px; border-bottom:1px solid ${border};">
      <div style="display:flex; gap:10px; align-items:center;">
        <div style="width:38px; height:38px; border-radius:10px; background:${isC1 ? 'linear-gradient(135deg, #E31A22, #0073E9)' : isC2 ? 'linear-gradient(135deg, #FFB800, #0F172A)' : 'linear-gradient(135deg, #1D4ED8, #059669)'}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px; font-weight:900; box-shadow:0 0 14px ${isC1 ? 'rgba(227,26,34,0.35)' : isC2 ? 'rgba(245,158,11,0.35)' : 'rgba(29,78,216,0.35)'};">
          🚀
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:13px; font-weight:900; color:${brandTitleColor}; line-height:1.3;">쿠팡 WING 셀러 자동화</div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
            <span style="font-size:11px; font-weight:700; color:#334155; white-space:nowrap;">로켓 운영 스튜디오</span>
            <span style="padding:1px 5px; font-size:10px; font-weight:800; font-family:monospace; border-radius:4px; background:${badgeBg}; border:1px solid ${badgeBorder}; color:${badgeText};">v1.01</span>
          </div>
        </div>
      </div>
      <!-- 2. 다른 프로그램 보기 -->
      <a href="https://www.buylife.xyz/programs" style="display:inline-block; margin-top:10px; font-size:11px; color:#64748B; text-decoration:none;">
        ← 다른 프로그램 보기
      </a>
    </div>

    <!-- 메뉴 리스트 -->
    <div style="flex:1; overflow-y:auto; padding:12px 10px 0; display:flex; flex-direction:column;">
      <!-- 3. 대시보드 진입점 -->
      <div style="display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px; font-size:13px; font-weight:${currentTab==='main' ? '800':'600'}; color:${currentTab==='main' ? activeText : textColor}; background:${currentTab==='main' ? activeBg : 'transparent'}; border:1px solid ${currentTab==='main' ? activeBorder : 'transparent'}; border-left:4px solid ${currentTab==='main' ? activeBorder : 'transparent'}; margin-bottom:3px;">
        <span>🏠</span>
        <span>셀러 운영 홈 대시보드</span>
      </div>

      <!-- 4. 번호가 붙은 핵심 작업 흐름 (Step 1~4) -->
      <div style="font-size:10px; font-weight:800; color:${brandTitleColor}; letter-spacing:0.06em; margin:14px 10px 6px; text-transform:uppercase;">
        쿠팡 로켓 셀러 파이프라인
      </div>
      <div style="position:relative; padding-left:2px;">
        <!-- Step 1 -->
        <div style="display:flex; gap:10px; padding:7px 10px; border-radius:10px; margin-bottom:3px; background:${currentTab==='detail' ? activeBg : 'transparent'};">
          <div style="width:24px; height:24px; border-radius:50%; background:${isC1 ? '#FEE2E2' : isC2 ? '#FEF3C7' : '#EFF6FF'}; border:1px solid ${iconColor}; color:${iconColor}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0;">1</div>
          <div style="flex:1;">
            <div style="font-size:12px; font-weight:700; color:#1E293B;">📦 상품 대량 등록 & AI 매칭</div>
            <div style="font-size:10px; color:#64748B;">카테고리/속성 WING 1클릭 전송</div>
          </div>
        </div>
        <!-- Step 2 -->
        <div style="display:flex; gap:10px; padding:7px 10px; border-radius:10px; margin-bottom:3px;">
          <div style="width:24px; height:24px; border-radius:50%; background:#F1F5F9; border:1px solid #94A3B8; color:#64748B; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0;">2</div>
          <div style="flex:1;">
            <div style="font-size:12px; font-weight:700; color:#1E293B;">🏆 아이템위너 최저가 방어</div>
            <div style="font-size:10px; color:#64748B;">10원 단위 실시간 역마진 방어</div>
          </div>
        </div>
        <!-- Step 3 -->
        <div style="display:flex; gap:10px; padding:7px 10px; border-radius:10px; margin-bottom:3px;">
          <div style="width:24px; height:24px; border-radius:50%; background:#F1F5F9; border:1px solid #94A3B8; color:#64748B; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0;">3</div>
          <div style="flex:1;">
            <div style="font-size:12px; font-weight:700; color:#1E293B;">🚚 주문 수집 & 로켓 송장 발급</div>
            <div style="font-size:10px; color:#64748B;">미출고 방지 및 운송장 자동 회신</div>
          </div>
        </div>
        <!-- Step 4 -->
        <div style="display:flex; gap:10px; padding:7px 10px; border-radius:10px; margin-bottom:3px;">
          <div style="width:24px; height:24px; border-radius:50%; background:#F1F5F9; border:1px solid #94A3B8; color:#64748B; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0;">4</div>
          <div style="flex:1;">
            <div style="font-size:12px; font-weight:700; color:#1E293B;">📊 정산 리포트 & 반품 관리</div>
            <div style="font-size:10px; color:#64748B;">수수료 공제 순수익 캘린더</div>
          </div>
        </div>
      </div>

      <!-- 5. 부가 기능 그룹 -->
      <div style="font-size:10px; font-weight:800; color:#94A3B8; letter-spacing:0.06em; margin:14px 10px 6px; text-transform:uppercase;">
        로켓 운영 부가 도구
      </div>
      <div style="display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:8px; font-size:12px; color:#475569; margin-bottom:2px;">
        <span>🔔</span>
        <span>반려 상품 즉시 알림 & AI 수정</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:8px; font-size:12px; color:#475569; margin-bottom:2px;">
        <span>🎫</span>
        <span>다운로드 쿠폰 프로모션 봇</span>
      </div>
    </div>

    <!-- 6. 하단 고정 영역 -->
    <div style="padding:12px 14px; border-top:1px solid ${border}; display:flex; flex-direction:column; gap:8px; background:${isC1?'#FAFAFA':isC2?'#FFFDF8':'#F8FAFC'};">
      <!-- 3D 엠보싱 다운로드 링크 -->
      <a href="#" class="${isC1 ? 'btn-3d-coupang-red' : isC2 ? 'btn-3d-rocket-yellow' : 'btn-3d-indigo'}" style="padding:8px 12px; font-size:11px; border-radius:8px; width:100%;">
        📥 쿠팡 WING 자동포스팅 확장
      </a>
      <div style="display:flex; gap:6px; margin-top:2px;">
        <div style="flex:1; display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:6px; font-size:11px; font-weight:${currentTab==='guide'?'800':'600'}; color:${currentTab==='guide'?activeText:textColor}; background:${currentTab==='guide'?activeBg:'transparent'};">
          <span>📖</span>
          <span>셀러 매뉴얼</span>
        </div>
        <div style="flex:1; display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:6px; font-size:11px; font-weight:${currentTab==='settings'?'800':'600'}; color:${currentTab==='settings'?activeText:textColor}; background:${currentTab==='settings'?activeBg:'transparent'};">
          <span>⚙️</span>
          <span>WING 연동</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; padding-top:6px; border-top:1px solid ${border}; font-size:10px; color:#94A3B8;">
        <span>buylifemall@gmail.com</span>
        <span style="color:#DC2626; font-weight:700; cursor:pointer;">로그아웃</span>
      </div>
    </div>
  </aside>
  `;
}

// 12 Screens HTML Builders
function buildScreen(theme, screen) {
  const isC1 = theme === 'c1';
  const isC2 = theme === 'c2';
  const isC3 = theme === 'c3';

  // Theme-specific color palettes
  const bg = isC1 ? '#F8FAFC' : isC2 ? '#FDFBF7' : '#F8FAFC';
  const headerBg = '#FFFFFF';
  const headerBorder = isC1 ? '#F1F5F9' : isC2 ? '#E2E8F0' : '#E2E8F0';
  const primary = isC1 ? '#E31A22' : isC2 ? '#D97706' : '#1D4ED8';
  const secondary = isC1 ? '#0073E9' : isC2 ? '#0F172A' : '#059669';
  const cardBg = '#FFFFFF';
  const cardBorder = isC1 ? '#E2E8F0' : isC2 ? '#FDE68A' : '#CBD5E1';
  const textDark = '#0F172A';
  const textMuted = '#64748B';

  let mainContent = '';

  if (screen === 'main') {
    // 01_main: 셀러 운영 홈 대시보드
    mainContent = `
    <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <header style="height:60px; background:${headerBg}; border-bottom:1px solid ${headerBorder}; display:flex; align-items:center; justify-content:space-between; padding:0 24px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <h1 style="font-size:17px; font-weight:900; color:${textDark};">쿠팡 로켓 셀러 운영 관제 센터</h1>
          <span style="background:${isC1?'#FEE2E2':isC2?'#FEF3C7':'#EFF6FF'}; color:${primary}; font-size:11px; font-weight:800; padding:3px 8px; border-radius:6px; border:1px solid ${isC1?'#FCA5A5':isC2?'#FDE68A':'#BFDBFE'};">
            ● WING API 24시간 실시간 연동 중
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}">
            🚀 신규 주문 일괄 수집 & 송장 전송
          </button>
        </div>
      </header>

      <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;">
        <!-- 4대 핵심 KPI 카드 -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px;">
          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:800; color:#64748B;">
              <span>오늘의 결제 금액</span>
              <span style="color:#059669; background:#ECFDF5; padding:2px 6px; border-radius:4px;">+18.4%</span>
            </div>
            <div style="font-size:22px; font-weight:900; color:${isC1?'#E31A22':textDark}; margin-top:8px;">₩ 14,850,000</div>
            <div style="font-size:11px; color:#64748B; margin-top:4px;">주문 건수: 142건 (로켓그로스 88건)</div>
          </div>

          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:800; color:#64748B;">
              <span>배송 준비 / 미출고</span>
              <span style="color:#DC2626; background:#FEF2F2; padding:2px 6px; border-radius:4px;">당일발송 필수</span>
            </div>
            <div style="font-size:22px; font-weight:900; color:#0F172A; margin-top:8px;">34 <span style="font-size:14px; font-weight:700;">건</span></div>
            <div style="font-size:11px; color:#64748B; margin-top:4px;">출고 지연 패널티 위험 0건</div>
          </div>

          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:800; color:#64748B;">
              <span>아이템위너 매칭 점유율</span>
              <span style="color:#2563EB; background:#EFF6FF; padding:2px 6px; border-radius:4px;">방어중</span>
            </div>
            <div style="font-size:22px; font-weight:900; color:${isC1?'#0073E9':'#2563EB'}; margin-top:8px;">94.8 <span style="font-size:14px; font-weight:700;">%</span></div>
            <div style="font-size:11px; color:#64748B; margin-top:4px;">전체 420개 등록 상품 중 398개 1위</div>
          </div>

          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:800; color:#64748B;">
              <span>반려 및 소명 대기</span>
              <span style="color:#D97706; background:#FFFBEB; padding:2px 6px; border-radius:4px;">조치 필요</span>
            </div>
            <div style="font-size:22px; font-weight:900; color:#D97706; margin-top:8px;">2 <span style="font-size:14px; font-weight:700;">건</span></div>
            <div style="font-size:11px; color:#64748B; margin-top:4px;">상세페이지 금지단어 검출됨</div>
          </div>
        </div>

        <!-- 긴급 알림 & 주문 파이프라인 매트릭스 -->
        <div style="display:grid; grid-template-columns:2fr 1fr; gap:20px;">
          <!-- Left: Urgent Seller Alert Deck -->
          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <div style="font-size:14px; font-weight:900; color:${textDark}; display:flex; align-items:center; gap:8px;">
                <span>🚨</span>
                <span>쿠팡 WING 실시간 판매 위기 감지 및 즉시 조치</span>
              </div>
              <span style="font-size:11px; color:#64748B;">자동 업데이트: 1분 전</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:12px; font-weight:800; color:#991B1B;">[아이템위너 뺏김 경고] 프리미엄 무선 에어건 청소기</div>
                  <div style="font-size:11px; color:#7F1D1D; margin-top:2px;">경쟁사 'A상점'이 10원 인하(₩29,890)하여 위너가 이탈되었습니다. 자동 매칭 권고!</div>
                </div>
                <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}" style="font-size:11px; padding:6px 12px;">
                  10원 인하 위너 탈환
                </button>
              </div>

              <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:12px; font-weight:800; color:#92400E;">[상품 등록 반려] 스위스 밀리터리 캠핑 폴딩 박스</div>
                  <div style="font-size:11px; color:#78350F; margin-top:2px;">반려 사유: "최고의", "1위" 과대광고 단어 감지됨. AI 원클릭 윤문 가능.</div>
                </div>
                <button style="background:#FFFFFF; border:1px solid #CBD5E1; color:#334155; font-size:11px; font-weight:800; padding:6px 12px; border-radius:8px; cursor:pointer;">
                  AI 단어 자동 수정
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Rocket Fulfillment Status -->
          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="font-size:14px; font-weight:900; color:${textDark}; margin-bottom:12px;">
                🚀 로켓그로스 입고 센터 현황
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; font-size:11px;">
                  <span style="color:#64748B;">동탄1 풀필먼트 센터:</span>
                  <span style="font-weight:800; color:#059669;">입고 완료 (450개)</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px;">
                  <span style="color:#64748B;">인천4 메가 센터:</span>
                  <span style="font-weight:800; color:#2563EB;">배송 트럭 이동 중</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px;">
                  <span style="color:#64748B;">안성 물류 허브:</span>
                  <span style="font-weight:800; color:#D97706;">재고 14개 (보충 필요)</span>
                </div>
              </div>
            </div>
            <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}" style="margin-top:14px; width:100%; font-size:11px; padding:8px;">
              밀크런 입고 예약 신청
            </button>
          </div>
        </div>
      </div>
    </div>
    `;
  } else if (screen === 'detail') {
    // 02_detail: 상품 대량 등록 & 아이템위너 매칭 관리
    mainContent = `
    <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <header style="height:60px; background:${headerBg}; border-bottom:1px solid ${headerBorder}; display:flex; align-items:center; justify-content:space-between; padding:0 24px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <h1 style="font-size:17px; font-weight:900; color:${textDark};">상품 대량 등록 및 아이템위너 가격 방어 엔진</h1>
          <span style="background:#ECFDF5; color:#059669; font-size:11px; font-weight:800; padding:3px 8px; border-radius:6px; border:1px solid #A7F3D0;">
            ● 쿠팡 표준 카테고리 100% 매칭
          </span>
        </div>
        <div style="display:flex; gap:10px;">
          <button style="background:#FFFFFF; border:1px solid #CBD5E1; color:#334155; font-size:12px; font-weight:800; padding:8px 14px; border-radius:8px; cursor:pointer;">
            📥 엑셀 일괄 업로드
          </button>
          <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}">
            ✨ WING 상품 일괄 등록 및 위너 확정
          </button>
        </div>
      </header>

      <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;">
        <!-- Product Registration & Pricing Matrix -->
        <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px;">
          <div style="font-size:14px; font-weight:900; color:${textDark}; margin-bottom:14px;">
            🛒 신규 등록 대상 상품 목록 (AI 속성 및 마진율 분석 완료)
          </div>
          
          <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
            <thead>
              <tr style="background:#F8FAFC; border-bottom:1px solid #E2E8F0; color:#64748B;">
                <th style="padding:10px 12px;">대표 이미지</th>
                <th style="padding:10px 12px;">쿠팡 상품명</th>
                <th style="padding:10px 12px;">표준 카테고리</th>
                <th style="padding:10px 12px;">판매가</th>
                <th style="padding:10px 12px;">위너 최저가</th>
                <th style="padding:10px 12px;">예상 순마진</th>
                <th style="padding:10px 12px;">상태</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:12px;"><div style="width:40px; height:40px; background:#E2E8F0; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:18px;">📱</div></td>
                <td style="padding:12px; font-weight:800; color:#0F172A;">맥세이프 차량용 무선 충전 거치대 15W 고속충전</td>
                <td style="padding:12px; color:#475569;">휴대폰거치대 &gt; 차량용</td>
                <td style="padding:12px; font-weight:900; color:${primary};">₩ 24,900</td>
                <td style="padding:12px; font-weight:800; color:#2563EB;">₩ 24,910 (위너 탈환 가능)</td>
                <td style="padding:12px; font-weight:800; color:#059669;">₩ 7,200 (28.9%)</td>
                <td style="padding:12px;"><span style="background:#ECFDF5; color:#059669; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:800;">등록 준비</span></td>
              </tr>
              <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:12px;"><div style="width:40px; height:40px; background:#E2E8F0; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:18px;">☕</div></td>
                <td style="padding:12px; font-weight:800; color:#0F172A;">올스텐 304 보온보냉 대용량 텀블러 900ml</td>
                <td style="padding:12px; color:#475569;">주방용품 &gt; 텀블러</td>
                <td style="padding:12px; font-weight:900; color:${primary};">₩ 18,500</td>
                <td style="padding:12px; font-weight:800; color:#2563EB;">₩ 18,500 (위너 점유중)</td>
                <td style="padding:12px; font-weight:800; color:#059669;">₩ 5,100 (27.5%)</td>
                <td style="padding:12px;"><span style="background:#EFF6FF; color:#2563EB; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:800;">위너 1위</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Item Winner Auto Defense Setting -->
        <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:13px; font-weight:900; color:${primary};">⚡ 24시간 실시간 아이템위너 오토 디펜스 모드 가동</div>
            <div style="font-size:11px; color:#475569; margin-top:2px;">경쟁사가 가격을 인하할 때 최소 보장 마진율(15%) 이하로 떨어지지 않는 선에서 10원 단위로 자동 방어합니다.</div>
          </div>
          <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}" style="font-size:11px; padding:8px 14px;">
            방어 룰 저장
          </button>
        </div>
      </div>
    </div>
    `;
  } else if (screen === 'guide') {
    // 03_guide: 쿠팡 WING 공식 셀러 연동 매뉴얼
    mainContent = `
    <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <header style="height:60px; background:${headerBg}; border-bottom:1px solid ${headerBorder}; display:flex; align-items:center; justify-content:space-between; padding:0 24px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <h1 style="font-size:17px; font-weight:900; color:${textDark};">쿠팡 WING 셀러 연동 및 로켓 운영 공식 매뉴얼</h1>
          <span style="background:${isC1?'#FEE2E2':isC2?'#FEF3C7':'#EFF6FF'}; color:${primary}; font-size:11px; font-weight:800; padding:3px 8px; border-radius:6px; border:1px solid ${isC1?'#FCA5A5':isC2?'#FDE68A':'#BFDBFE'};">
            공식 연동 가이드북
          </span>
        </div>
        <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}">
          대시보드로 돌아가기
        </button>
      </header>

      <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;">
        <!-- 4단계 워크플로우 카드 -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px;">
          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px;">
            <div style="width:30px; height:30px; border-radius:8px; background:${primary}; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:14px; margin-bottom:10px;">1</div>
            <div style="font-size:13px; font-weight:900; color:#0F172A;">WING Open API 발급</div>
            <div style="font-size:11px; color:#64748B; margin-top:6px; line-height:1.5;">
              쿠팡 WING 셀러 센터 &gt; 판매자정보 &gt; 추가판매정보에서 Open API 연동 키를 발급받습니다.
            </div>
          </div>

          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px;">
            <div style="width:30px; height:30px; border-radius:8px; background:${primary}; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:14px; margin-bottom:10px;">2</div>
            <div style="font-size:13px; font-weight:900; color:#0F172A;">출하지 / 반품지 등록</div>
            <div style="font-size:11px; color:#64748B; margin-top:6px; line-height:1.5;">
              상품 등록 전 계약 택배사 코드 및 반품 배송비 계좌를 기본 출하지 설정과 동기화합니다.
            </div>
          </div>

          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px;">
            <div style="width:30px; height:30px; border-radius:8px; background:${primary}; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:14px; margin-bottom:10px;">3</div>
            <div style="font-size:13px; font-weight:900; color:#0F172A;">AI 상품 등록 & 위너 매칭</div>
            <div style="font-size:11px; color:#64748B; margin-top:6px; line-height:1.5;">
              반려 없는 완벽한 카테고리 매칭과 10원 단위 실시간 아이템위너 점유 알고리즘을 가동합니다.
            </div>
          </div>

          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; padding:18px;">
            <div style="width:30px; height:30px; border-radius:8px; background:${primary}; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:14px; margin-bottom:10px;">4</div>
            <div style="font-size:13px; font-weight:900; color:#0F172A;">주문 자동 수집 & 출고</div>
            <div style="font-size:11px; color:#64748B; margin-top:6px; line-height:1.5;">
              1일 2회 주문 자동 수집 및 운송장 자동 회신으로 출고 지연 패널티 점수를 0점으로 유지합니다.
            </div>
          </div>
        </div>

        <!-- FAQ & Seller Penalty Protection -->
        <div style="display:grid; grid-template-columns:3fr 2fr; gap:20px;">
          <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px;">
            <div style="font-size:14px; font-weight:900; color:${textDark}; margin-bottom:14px;">
              ❓ 자주 묻는 질문 (FAQ)
            </div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div style="border-bottom:1px solid #F1F5F9; padding-bottom:10px;">
                <div style="font-size:12px; font-weight:800; color:${primary};">Q. 쿠팡에서 IP 차단이나 로그인 제한이 걸리지 않나요?</div>
                <div style="font-size:11px; color:#475569; margin-top:3px;">
                  공식 Open API 서명 방식과 함께 셀러별 전용 국내 고정 프록시 IP 옵션을 제공하여 쿠팡 보안 정책에 100% 안전하게 부합합니다.
                </div>
              </div>
              <div style="border-bottom:1px solid #F1F5F9; padding-bottom:10px;">
                <div style="font-size:12px; font-weight:800; color:${primary};">Q. 아이템위너 매칭 시 역마진이 나면 어떡하나요?</div>
                <div style="font-size:11px; color:#475569; margin-top:3px;">
                  설정에서 지정한 '최소 마진 보장선(예: 15%)'에 도달하면 가격 인하를 즉시 멈추고 셀러에게 카카오톡/텔레그램 알림을 발송합니다.
                </div>
              </div>
            </div>
          </div>

          <div style="background:linear-gradient(135deg, ${isC1?'#FEF2F2':'#FFFBEB'}, #FFFFFF); border:1px solid ${isC1?'#FCA5A5':'#FDE68A'}; border-radius:16px; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="font-size:14px; font-weight:900; color:${primary}; margin-bottom:8px;">
                🛡️ 쿠팡 판매자 점수 100점 유지 비결
              </div>
              <div style="font-size:11px; color:#475569; line-height:1.6;">
                • 출고 지연율 0% (당일 발송 예약 자동화)<br>
                • 고객 문의 1시간 이내 AI 자동 답변<br>
                • 반품/교환 요청 당일 즉시 회수 접수
              </div>
            </div>
            <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}" style="margin-top:16px;">
              셀러 점수 진단 리포트 받기
            </button>
          </div>
        </div>
      </div>
    </div>
    `;
  } else if (screen === 'settings') {
    // 04_settings: 쿠팡 WING API키 및 출하지/배송비 환경설정
    mainContent = `
    <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <header style="height:60px; background:${headerBg}; border-bottom:1px solid ${headerBorder}; display:flex; align-items:center; justify-content:space-between; padding:0 24px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <h1 style="font-size:17px; font-weight:900; color:${textDark};">쿠팡 WING API 및 배송 물류 환경설정</h1>
          <span style="background:#ECFDF5; color:#059669; font-size:11px; font-weight:800; padding:3px 8px; border-radius:6px; border:1px solid #A7F3D0;">
            연동 정상 작동 중
          </span>
        </div>
        <button class="${isC1?'btn-3d-coupang-red':isC2?'btn-3d-rocket-yellow':'btn-3d-indigo'}">
          설정 저장하기
        </button>
      </header>

      <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;">
        <!-- WING API Authentication Vault -->
        <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px;">
          <div style="font-size:14px; font-weight:900; color:${textDark}; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
            <span>🔑 쿠팡 WING 공식 Open API 인증 정보 (암호화 볼트)</span>
            <span style="font-size:11px; font-weight:800; color:#059669;">인증 완료: Vendor ID A00128492</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div>
              <label style="font-size:11px; font-weight:800; color:#475569; display:block; margin-bottom:4px;">쿠팡 업체코드 (Vendor ID)</label>
              <input type="text" value="A00128492" disabled style="width:100%; background:#F8FAFC; border:1px solid #CBD5E1; padding:8px 12px; border-radius:8px; font-size:12px; font-family:monospace; color:#334155;">
            </div>
            <div>
              <label style="font-size:11px; font-weight:800; color:#475569; display:block; margin-bottom:4px;">WING Access Key</label>
              <input type="password" value="cpg_acc_892348xxxxxxxx" disabled style="width:100%; background:#F8FAFC; border:1px solid #CBD5E1; padding:8px 12px; border-radius:8px; font-size:12px; font-family:monospace; color:#334155;">
            </div>
          </div>
        </div>

        <!-- Logistics & Shipping Defaults -->
        <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px;">
          <div style="font-size:14px; font-weight:900; color:${textDark}; margin-bottom:14px;">
            🚚 기본 출하지 및 반품/교환 배송비 정책
          </div>

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:14px;">
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:12px;">
              <div style="font-size:11px; color:#64748B;">기본 출하지 주소</div>
              <div style="font-size:13px; font-weight:900; color:#0F172A; margin-top:2px;">경기 안성시 원곡면 물류로 32</div>
            </div>
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:12px;">
              <div style="font-size:11px; color:#64748B;">계약 택배사 코드</div>
              <div style="font-size:13px; font-weight:900; color:${primary}; margin-top:2px;">CJ대한통운 (04)</div>
            </div>
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:12px;">
              <div style="font-size:11px; color:#64748B;">초도 / 편도 반품 배송비</div>
              <div style="font-size:13px; font-weight:900; color:#0F172A; margin-top:2px;">₩ 3,000 / ₩ 3,000</div>
            </div>
          </div>
        </div>

        <!-- Notification Channels -->
        <div style="background:${cardBg}; border:1px solid ${cardBorder}; border-radius:16px; padding:20px;">
          <div style="font-size:14px; font-weight:900; color:${textDark}; margin-bottom:14px;">
            🔔 실시간 셀러 위기 알림 채널
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
              <div style="font-size:12px; font-weight:800; color:#1E293B;">카카오 알림톡 알림</div>
              <div style="font-size:11px; color:#64748B; margin-top:2px;">위너 뺏김 및 출고 지연 임박 시 휴대폰 즉시 발송 (활성화됨)</div>
            </div>
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
              <div style="font-size:12px; font-weight:800; color:#1E293B;">텔레그램 봇 채널</div>
              <div style="font-size:11px; color:#64748B; margin-top:2px;">실시간 신규 주문 및 긴급 고객 문의 수신 중</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  return `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <title>쿠팡 WING 셀러 자동화 - ${screen} (${theme})</title>
    ${commonStyles}
  </head>
  <body style="background:${bg}; display:flex; height:100vh; overflow:hidden;">
    ${getStandardSidebar(theme, screen)}
    ${mainContent}
  </body>
  </html>
  `;
}

// Interactive 12-View Showcase HTML Builder with 1440px Lightbox Modal
function buildShowcaseHtml(imageUrls) {
  return `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>coupang-ops (쿠팡 WING 셀러 자동화 스튜디오) 디자인 4대 화면 3시안 한눈에 보기</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Pretendard, -apple-system, sans-serif; background: #0A0D14; color: #F1F5F9; padding: 32px 24px; line-height: 1.5; }
      
      header { text-align: center; max-width: 1200px; margin: 0 auto 36px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); }
      h1 { font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #E31A22, #FFB800, #0073E9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
      p.desc { font-size: 14px; color: #94A3B8; max-width: 800px; margin: 0 auto; line-height: 1.6; }
      
      .links-box { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
      .links-box a { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 800; text-decoration: none; transition: all 0.2s; }
      .link-primary { background: #E31A22; color: #fff; border: 1px solid #B71118; }
      .link-secondary { background: #1E293B; color: #94A3B8; border: 1px solid #334155; }
      .links-box a:hover { transform: translateY(-2px); }

      /* Comparison Table Grid */
      .matrix-container { max-width: 1680px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; }
      .screen-section { background: #111622; border: 1px solid #1E293B; border-radius: 20px; padding: 24px; }
      .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .section-title { font-size: 18px; font-weight: 900; display: flex; align-items: center; gap: 10px; color: #FFFFFF; }
      .section-badge { background: #1E293B; color: #FFB800; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,184,0,0.3); }

      .grid-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
      .card { background: #0B0E17; border: 1px solid #1E293B; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s; cursor: pointer; }
      .card:hover { border-color: #E31A22; transform: translateY(-4px); box-shadow: 0 12px 30px rgba(227,26,34,0.3); }
      
      .card-header { padding: 14px 16px; background: #161D2B; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .card-title { font-size: 13px; font-weight: 800; color: #E2E8F0; }
      .card-tag { font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px; }
      .tag-c1 { background: rgba(227,26,34,0.2); color: #FF4D55; border: 1px solid rgba(227,26,34,0.4); }
      .tag-c2 { background: rgba(245,158,11,0.2); color: #FBBF24; border: 1px solid rgba(245,158,11,0.4); }
      .tag-c3 { background: rgba(29,78,216,0.2); color: #60A5FA; border: 1px solid rgba(29,78,216,0.4); }

      .card-img-wrap { position: relative; width: 100%; aspect-ratio: 16/10; overflow: hidden; background: #000; }
      .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: top; transition: transform 0.3s; }
      .card:hover .card-img-wrap img { transform: scale(1.03); }
      .zoom-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 800; color: #fff; transition: opacity 0.2s; }
      .card:hover .zoom-overlay { opacity: 1; }

      .card-body { padding: 14px 16px; font-size: 11px; color: #94A3B8; line-height: 1.5; background: #0F1420; flex: 1; }
      .card-body strong { color: #F1F5F9; }

      /* Lightbox Modal */
      #lightboxModal { position: fixed; inset: 0; background: rgba(0,0,0,0.88); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; z-index: 9999; padding: 30px; }
      #lightboxContent { position: relative; max-width: 95vw; max-height: 92vh; display: flex; flex-direction: column; align-items: center; }
      #lightboxImg { max-width: 100%; max-height: 84vh; border-radius: 12px; box-shadow: 0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.15); object-fit: contain; }
      #lightboxCaption { margin-top: 14px; font-size: 14px; font-weight: 800; color: #FFFFFF; display: flex; gap: 14px; align-items: center; }
      .lightbox-close { position: absolute; top: -20px; right: -20px; width: 40px; height: 40px; border-radius: 50%; background: #E31A22; color: #fff; border: none; font-size: 20px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(227,26,34,0.4); }
      .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .lightbox-nav:hover { background: #E31A22; border-color: #E31A22; }
      .lightbox-prev { left: -70px; }
      .lightbox-next { right: -70px; }
    </style>
  </head>
  <body>
    <header>
      <h1>쿠팡 WING 셀러 자동화 (coupang-ops)</h1>
      <p class="desc">
        쿠팡 특유의 감성을 완벽히 살린 <strong>39. 로켓 셀러 윙 레드·블루 스타일 (추천안)</strong>, <strong>40. 로켓 배송 옐로우·네이비 물류 스타일</strong>, <strong>41. 아이템위너 인텔리전스 랩 스타일</strong> 4대 핵심 화면 3시안 한눈에 보기 비교 쇼케이스입니다.
      </p>
      <div class="links-box">
        <a href="https://coupang-ops.buylife.xyz" target="_blank" class="link-primary">🌐 공식 운영 사이트</a>
        <a href="https://coupang-ops.vercel.app" target="_blank" class="link-secondary">🚀 Vercel 배포 프리뷰</a>
        <a href="https://www.buylife.xyz/admin/dev-docs/requests" target="_blank" class="link-secondary">📑 dev-docs 결과함</a>
      </div>
    </header>

    <div class="matrix-container">
      <!-- Section 1: Main Dashboard -->
      <div class="screen-section">
        <div class="section-header">
          <div class="section-title">
            <span>🏠 01. 셀러 운영 관제 홈 (01_main)</span>
          </div>
          <div class="section-badge">결제금액/주문건수 KPI + 위너 매칭률 + 반려 상품 긴급 조치 덱</div>
        </div>
        <div class="grid-3col">
          <div class="card" onclick="openLightbox(0)">
            <div class="card-header">
              <span class="card-title">시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 (추천안)</span>
              <span class="card-tag tag-c1">★ 1순위 추천</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[0]}" alt="01_main_c1">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>컨셉:</strong> 쿠팡 공식 WING 셀러 센터 톤앤매너 완벽 재현. 퓨어 화이트 & 라이트 쿨그레이(#F8FAFC)에 로켓 레드(#E31A22) & 로켓 블루(#0073E9). 3D 레드 엠보싱 버튼 탑재.
            </div>
          </div>

          <div class="card" onclick="openLightbox(1)">
            <div class="card-header">
              <span class="card-title">시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비</span>
              <span class="card-tag tag-c2">로켓 배송 물류 룩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[1]}" alt="01_main_c2">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>컨셉:</strong> 로켓배송 특유의 활력과 스피드를 상징하는 볼드 옐로우(#FFB800) & 딥 네이비(#0F172A). 풀필먼트 입고 현황 및 배송 파이프라인.
            </div>
          </div>

          <div class="card" onclick="openLightbox(2)">
            <div class="card-header">
              <span class="card-title">시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩</span>
              <span class="card-tag tag-c3">위너 데이터 랩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[2]}" alt="01_main_c3">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>컨셉:</strong> 클린 슬레이트 화이트에 인디고 블루(#1D4ED8) & 위너 에메랄드(#059669). 실시간 최저가 매칭 및 위너 뺏김 방어 알고리즘 특화 덱.
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Products & Item Winner Detail -->
      <div class="screen-section">
        <div class="section-header">
          <div class="section-title">
            <span>📦 02. 상품 대량 등록 & 아이템위너 매칭 (02_detail)</span>
          </div>
          <div class="section-badge">카테고리 AI 매칭 + 실시간 10원 단위 최저가 방어 + 예상 순마진율</div>
        </div>
        <div class="grid-3col">
          <div class="card" onclick="openLightbox(3)">
            <div class="card-header">
              <span class="card-title">시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 (추천안)</span>
              <span class="card-tag tag-c1">★ 1순위 추천</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[3]}" alt="02_detail_c1">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> WING 표준 상품 테이블, 위너 최저가 10원 단위 추적, 순마진 보장 룰 3D 엠보싱 저장 버튼.
            </div>
          </div>

          <div class="card" onclick="openLightbox(4)">
            <div class="card-header">
              <span class="card-title">시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비</span>
              <span class="card-tag tag-c2">로켓 배송 물류 룩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[4]}" alt="02_detail_c2">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> 로켓그로스 입고 수량 및 재고 위험도 알림 연동 상품 덱.
            </div>
          </div>

          <div class="card" onclick="openLightbox(5)">
            <div class="card-header">
              <span class="card-title">시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩</span>
              <span class="card-tag tag-c3">위너 데이터 랩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[5]}" alt="02_detail_c3">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> 경쟁사 가격 변동 타임라인 분석 및 마진 하한선 실시간 수식 제어 콘솔.
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Guide -->
      <div class="screen-section">
        <div class="section-header">
          <div class="section-title">
            <span>📖 03. WING 셀러 연동 & 운영 공식 가이드 (03_guide)</span>
          </div>
          <div class="section-badge">4단계 연동 로드맵 + 판매자 점수 100점 관리 + FAQ</div>
        </div>
        <div class="grid-3col">
          <div class="card" onclick="openLightbox(6)">
            <div class="card-header">
              <span class="card-title">시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 (추천안)</span>
              <span class="card-tag tag-c1">★ 1순위 추천</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[6]}" alt="03_guide_c1">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> WING Open API 발급부터 당일 출고까지 4단계 카드 및 판매 정지 방어 체크리스트.
            </div>
          </div>

          <div class="card" onclick="openLightbox(7)">
            <div class="card-header">
              <span class="card-title">시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비</span>
              <span class="card-tag tag-c2">로켓 배송 물류 룩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[7]}" alt="03_guide_c2">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> 밀크런 화물 입고 프로세스 및 로켓배송 라벨 규격 가이드북.
            </div>
          </div>

          <div class="card" onclick="openLightbox(8)">
            <div class="card-header">
              <span class="card-title">시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩</span>
              <span class="card-tag tag-c3">위너 데이터 랩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[8]}" alt="03_guide_c3">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> 아이템위너 산정 알고리즘 공식 분해 및 검색 노출 최적화(SEO) 핸드북.
            </div>
          </div>
        </div>
      </div>

      <!-- Section 4: Settings -->
      <div class="screen-section">
        <div class="section-header">
          <div class="section-title">
            <span>⚙️ 04. WING API 키 및 배송 물류 환경설정 (04_settings)</span>
          </div>
          <div class="section-badge">Vendor ID/Access Key 암호화 볼트 + 출하지/반품지 + 알림 채널</div>
        </div>
        <div class="grid-3col">
          <div class="card" onclick="openLightbox(9)">
            <div class="card-header">
              <span class="card-title">시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 (추천안)</span>
              <span class="card-tag tag-c1">★ 1순위 추천</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[9]}" alt="04_settings_c1">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> 쿠팡 WING 공식 API 키 안전 보관 볼트, 택배사 계약 배송비 설정, 카카오톡 위기 알림 봇.
            </div>
          </div>

          <div class="card" onclick="openLightbox(10)">
            <div class="card-header">
              <span class="card-title">시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비</span>
              <span class="card-tag tag-c2">로켓 배송 물류 룩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[10]}" alt="04_settings_c2">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> 물류 센터별 출고지 다중 매핑 및 자동 반품 수거 스케줄러.
            </div>
          </div>

          <div class="card" onclick="openLightbox(11)">
            <div class="card-header">
              <span class="card-title">시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩</span>
              <span class="card-tag tag-c3">위너 데이터 랩</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imageUrls[11]}" alt="04_settings_c3">
              <div class="zoom-overlay">🔍 1440px 고화질 원본 확대 보기</div>
            </div>
            <div class="card-body">
              <strong>특징:</strong> 프록시 고정 IP 할당 상태 및 실시간 레이턴시 모니터링 콘솔.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="lightboxModal" onclick="closeLightbox(event)">
      <div id="lightboxContent" onclick="event.stopPropagation()">
        <button class="lightbox-close" onclick="closeLightbox()">✕</button>
        <button class="lightbox-nav lightbox-prev" onclick="changeLightbox(-1)">❮</button>
        <button class="lightbox-nav lightbox-next" onclick="changeLightbox(1)">❯</button>
        <img id="lightboxImg" src="" alt="확대 보기">
        <div id="lightboxCaption">
          <span id="captionText"></span>
          <span style="font-size:11px; opacity:0.7;">(ESC 또는 배경 클릭 시 닫힘 / 좌우 화살표로 이동)</span>
        </div>
      </div>
    </div>

    <script>
      const gallery = [
        { src: "${imageUrls[0]}", title: "01_main (시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일)" },
        { src: "${imageUrls[1]}", title: "01_main (시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일)" },
        { src: "${imageUrls[2]}", title: "01_main (시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩 스타일)" },
        { src: "${imageUrls[3]}", title: "02_detail (시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일)" },
        { src: "${imageUrls[4]}", title: "02_detail (시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일)" },
        { src: "${imageUrls[5]}", title: "02_detail (시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩 스타일)" },
        { src: "${imageUrls[6]}", title: "03_guide (시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일)" },
        { src: "${imageUrls[7]}", title: "03_guide (시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일)" },
        { src: "${imageUrls[8]}", title: "03_guide (시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩 스타일)" },
        { src: "${imageUrls[9]}", title: "04_settings (시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일)" },
        { src: "${imageUrls[10]}", title: "04_settings (시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일)" },
        { src: "${imageUrls[11]}", title: "04_settings (시안 3: 41. 쿠팡 아이템위너 인텔리전스 랩 스타일)" }
      ];

      let currentIndex = 0;
      function openLightbox(index) {
        currentIndex = index;
        updateLightbox();
        document.getElementById('lightboxModal').style.display = 'flex';
      }

      function closeLightbox(e) {
        if (!e || e.target.id === 'lightboxModal' || e.target.className === 'lightbox-close') {
          document.getElementById('lightboxModal').style.display = 'none';
        }
      }

      function changeLightbox(delta) {
        currentIndex = (currentIndex + delta + gallery.length) % gallery.length;
        updateLightbox();
      }

      function updateLightbox() {
        const item = gallery[currentIndex];
        document.getElementById('lightboxImg').src = item.src;
        document.getElementById('captionText').textContent = item.title;
      }

      window.addEventListener('keydown', (e) => {
        const modal = document.getElementById('lightboxModal');
        if (modal.style.display === 'flex') {
          if (e.key === 'Escape') closeLightbox();
          if (e.key === 'ArrowLeft') changeLightbox(-1);
          if (e.key === 'ArrowRight') changeLightbox(1);
        }
      });
    </script>
  </body>
  </html>
  `;
}

async function run() {
  console.log('🚀 [1/5] 4대 화면 × 3대 시안 = 총 12개 뷰 HTML 생성 중...');
  const themes = ['c1', 'c2', 'c3'];
  const screens = ['main', 'detail', 'guide', 'settings'];

  const views = [];
  for (const s of screens) {
    for (const t of themes) {
      views.push({ screen: s, theme: t });
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  const generatedFiles = [];
  const imageUrlsForShowcase = [];

  for (let i = 0; i < views.length; i++) {
    const v = views[i];
    const htmlContent = buildScreen(v.theme, v.screen);
    const htmlFileName = `cpg_${v.screen}_${v.theme}.html`;
    const htmlFilePath = path.join(scratchDir, htmlFileName);
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');

    const pngFileName = `cpg_${v.screen}_${v.theme}.png`;
    const pngFilePath = path.join(scratchDir, pngFileName);

    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    await page.screenshot({ path: pngFilePath, fullPage: false });
    console.log(`✅ [캡처 완료 ${i + 1}/12] ${pngFileName}`);

    generatedFiles.push({
      screen: v.screen,
      theme: v.theme,
      htmlPath: htmlFilePath,
      pngPath: pngFilePath,
      fileName: pngFileName
    });

    imageUrlsForShowcase.push(`/screenshots/${pngFileName}`);
  }

  // Generate Showcase HTML
  console.log('🎨 [2/5] 단일 통합 12뷰 쇼케이스 HTML 빌드 및 저장 중...');
  const showcaseHtml = buildShowcaseHtml(imageUrlsForShowcase);
  const showcasePath = 'D:/Antigravity/Design/showcase.html';
  fs.writeFileSync(showcasePath, showcaseHtml, 'utf8');
  fs.writeFileSync('D:/Antigravity/AIMaster/scratch/coupang_ops_showcase_12views.html', showcaseHtml, 'utf8');

  // Copy screenshots to Design/screenshots dir for webserver serving
  const designScreenshotsDir = 'D:/Antigravity/Design/screenshots';
  if (!fs.existsSync(designScreenshotsDir)) fs.mkdirSync(designScreenshotsDir, { recursive: true });

  for (const f of generatedFiles) {
    fs.copyFileSync(f.pngPath, path.join(designScreenshotsDir, f.fileName));
  }

  // Capture Full Showcase Page and Lightbox verification
  console.log('📸 [3/5] 쇼케이스 풀페이지 및 1440px 라이트박스 팝업 동작 캡처 중...');
  await page.goto('http://localhost:3800/showcase.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scratch/cpg_showcase_fullview.png', fullPage: true });

  // Open first card lightbox
  await page.click('.card');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scratch/cpg_verified_lightbox.png' });

  await browser.close();
  console.log('🎉 [4/5] 캡처 완료! 영구 자산 폴더 저장 준비...');
}

run().catch(err => {
  console.error('❌ 실행 중 오류 발생:', err);
  process.exit(1);
});
