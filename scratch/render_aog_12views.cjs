const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

// 12개 뷰 HTML 템플릿 생성기
function getHtml(conceptIndex, viewIndex) {
  const themes = [
    {
      id: 60,
      name: "피그마 프로 비주얼 그래픽 캔버스 아틀리에 스타일",
      enName: "Figma Pro Visual Graphic Canvas Atelier Style",
      bg: "#F8FAFC",
      surface: "#FFFFFF",
      cardBg: "#FFFFFF",
      border: "#E2E8F0",
      borderSub: "#CBD5E1",
      text: "#0F172A",
      textSub: "#64748B",
      accent: "#6366F1", // Indigo Purple
      accentSub: "#EC4899", // Figma Magenta
      btnClass: "btn-3d-indigo",
      badgeColor: "background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE;",
      tag: "FIGMA PRO CANVAS",
      glow: "rgba(99, 102, 241, 0.25)",
      isDark: false
    },
    {
      id: 61,
      name: "어도비 하이퍼 크리에이티브 스튜디오 다크 데스크 스타일",
      enName: "Adobe Hyper Creative Studio Dark Desk Style",
      bg: "#111318",
      surface: "#1A1D24",
      cardBg: "#161920",
      border: "#2E333D",
      borderSub: "#3D4452",
      text: "#F1F5F9",
      textSub: "#94A3B8",
      accent: "#0EA5E9", // Adobe Cyan
      accentSub: "#10B981", // Neon Emerald
      btnClass: "btn-3d-cyan",
      badgeColor: "background: rgba(14, 165, 233, 0.1); color: #38BDF8; border: 1px solid rgba(14, 165, 233, 0.3);",
      tag: "ADOBE PRO WORKSTATION",
      glow: "rgba(14, 165, 233, 0.3)",
      isDark: true
    },
    {
      id: 62,
      name: "나노 제너레이티브 AI 뉴럴 아트 콘솔 스타일",
      enName: "Nano Generative AI Neural Art Console Style",
      bg: "#0A0B10",
      surface: "#161324",
      cardBg: "#120F1D",
      border: "#292242",
      borderSub: "#3D325E",
      text: "#EDE9FE",
      textSub: "#A78BFA",
      accent: "#F59E0B", // Generative Gold
      accentSub: "#8B5CF6", // Hyper Violet
      btnClass: "btn-3d-gold",
      badgeColor: "background: rgba(245, 158, 11, 0.1); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3);",
      tag: "NEURAL MULTIMODAL HUD",
      glow: "rgba(245, 158, 11, 0.3)",
      isDark: true
    }
  ];

  const t = themes[conceptIndex];

  // 공통 버튼 및 인터랙티브 CSS
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif; }
    body { background: ${t.bg}; color: ${t.text}; width: 1440px; height: 900px; overflow: hidden; position: relative; }
    .btn-3d-indigo {
      background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
      box-shadow: 0 4px 0 #3730a3, 0 8px 20px rgba(99, 102, 241, 0.35);
      color: #fff; font-weight: 800; border: 1px solid #818cf8; border-radius: 12px;
      transition: all 0.15s ease;
    }
    .btn-3d-cyan {
      background: linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%);
      box-shadow: 0 4px 0 #0369a1, 0 8px 20px rgba(14, 165, 233, 0.35);
      color: #fff; font-weight: 800; border: 1px solid #38bdf8; border-radius: 12px;
      transition: all 0.15s ease;
    }
    .btn-3d-gold {
      background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 0 #92400e, 0 8px 20px rgba(245, 158, 11, 0.35);
      color: #090d13; font-weight: 800; border: 1px solid #fbbf24; border-radius: 12px;
      transition: all 0.15s ease;
    }
    .card { background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 16px; box-shadow: ${t.isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.04)'}; }
    .chip { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
  `;

  // 1. 메인 화면 (01_main)
  if (viewIndex === 0) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="padding: 16px 24px; display: flex; flex-direction: column; gap: 14px;">
      <!-- 상단 글로벌 헤더 & 4단계 파이프라인 인디케이터 배너 -->
      <header style="display: flex; justify-content: space-between; align-items: center; background: ${t.surface}; padding: 12px 20px; border-radius: 14px; border: 1px solid ${t.border};">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; box-shadow: 0 4px 12px ${t.glow};">🎨</div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px; font-weight: 900; letter-spacing: -0.3px;">AI 올인원 그래픽 자동화</span>
              <span style="font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; ${t.badgeColor}">v1.0.5 PRO</span>
            </div>
            <div style="font-size: 11px; color: ${t.textSub};">123종 전문 디자인 템플릿 · 실시간 캔버스 인페인팅 렌더러</div>
          </div>
        </div>

        <!-- 4단계 파이프라인 배너 -->
        <div style="display: flex; align-items: center; gap: 6px; background: ${t.bg}; padding: 6px 14px; border-radius: 10px; border: 1px solid ${t.border};">
          <span style="font-size: 11px; font-weight: 800; color: ${t.accent};">1. 123종 프리셋 탐색</span>
          <span style="color: ${t.textSub}; font-size: 10px;">→</span>
          <span style="font-size: 11px; font-weight: 700; color: ${t.textSub};">2. 변수 튜닝</span>
          <span style="color: ${t.textSub}; font-size: 10px;">→</span>
          <span style="font-size: 11px; font-weight: 700; color: ${t.textSub};">3. AI 인페인팅</span>
          <span style="color: ${t.textSub}; font-size: 10px;">→</span>
          <span style="font-size: 11px; font-weight: 700; color: ${t.textSub};">4. HD 추출</span>
        </div>

        <!-- 우측 상태 뱃지 & 액션 -->
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="chip" style="${t.badgeColor}">⚡ GPU ACCEL ACTIVE</span>
          <span style="font-size: 12px; font-weight: 700; color: ${t.textSub};">Claude & Gemini 3.8 연동</span>
          <div style="width: 32px; height: 32px; border-radius: 50%; background: ${t.accent}22; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; color: ${t.accent};">BL</div>
        </div>
      </header>

      <!-- 본문: 좌측 123종 프리셋 갤러리 (360px) + 중앙/우측 비주얼 캔버스 덱 (1030px) -->
      <div style="display: grid; grid-template-columns: 360px 1fr; gap: 16px; flex: 1; height: calc(100% - 80px);">
        <!-- 좌측: 123종 프리셋 탐색 및 카테고리 필터 -->
        <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              <span>📚 123종 그래픽 템플릿</span>
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${t.accent}; color: #fff;">ALL</span>
            </div>
            <span style="font-size: 11px; color: ${t.textSub}; font-weight: 600;">총 123개 등록</span>
          </div>

          <!-- 검색창 -->
          <div style="position: relative;">
            <input placeholder="템플릿 명칭, 태그 검색 (예: UI/UX, 랜딩 배너, 목업)..." style="width: 100%; background: ${t.bg}; border: 1px solid ${t.border}; padding: 8px 12px; border-radius: 8px; font-size: 11px; color: ${t.text}; outline: none;" />
          </div>

          <!-- 카테고리 칩 탭 -->
          <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <span style="padding: 4px 9px; border-radius: 6px; background: ${t.accent}; color: #fff; font-size: 10px; font-weight: 800;">전체 (123)</span>
            <span style="padding: 4px 9px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 700; color: ${t.textSub};">개발/UI (24)</span>
            <span style="padding: 4px 9px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 700; color: ${t.textSub};">마케팅 (32)</span>
            <span style="padding: 4px 9px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 700; color: ${t.textSub};">SNS/쇼츠 (28)</span>
            <span style="padding: 4px 9px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 700; color: ${t.textSub};">이커머스 (21)</span>
            <span style="padding: 4px 9px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 700; color: ${t.textSub};">브랜딩 (18)</span>
          </div>

          <!-- 템플릿 카드 리스트 -->
          <div style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; padding-right: 4px;">
            <div style="padding: 12px; border-radius: 10px; background: ${t.accent}12; border: 1.5px solid ${t.accent}; cursor: pointer;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 800; color: ${t.accent};">📱 UI/UX 플레이스홀더</span>
                <span style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; background: ${t.accent}; color: #fff;">DEV</span>
              </div>
              <div style="font-size: 10px; color: ${t.textSub}; line-height: 1.3;">스마트폰 & 태블릿 대시보드 더미 화면, 드리블 스타일 모던 벡터 인터페이스</div>
            </div>

            <div style="padding: 12px; border-radius: 10px; background: ${t.bg}; border: 1px solid ${t.border}; cursor: pointer;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 800; color: ${t.text};">🚀 랜딩 페이지 헤더 이미지</span>
                <span style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; background: ${t.bg}; border: 1px solid ${t.border}; color: ${t.textSub};">MKT</span>
              </div>
              <div style="font-size: 10px; color: ${t.textSub}; line-height: 1.3;">SaaS 솔루션용 3D 글래스모피즘 아이콘 & 역동적인 그라데이션 메쉬 히어로</div>
            </div>

            <div style="padding: 12px; border-radius: 10px; background: ${t.bg}; border: 1px solid ${t.border}; cursor: pointer;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 800; color: ${t.text};">📦 3D 상품 목업 쇼케이스</span>
                <span style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; background: ${t.bg}; border: 1px solid ${t.border}; color: ${t.textSub};">COMMERCE</span>
              </div>
              <div style="font-size: 10px; color: ${t.textSub}; line-height: 1.3;">화장품/패키지 미니멀리즘 3D 포토그래피 스튜디오 렌더링 세트</div>
            </div>

            <div style="padding: 12px; border-radius: 10px; background: ${t.bg}; border: 1px solid ${t.border}; cursor: pointer;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 800; color: ${t.text};">✨ 인스타그램 캐러셀 카드뉴스</span>
                <span style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; background: ${t.bg}; border: 1px solid ${t.border}; color: ${t.textSub};">SNS</span>
              </div>
              <div style="font-size: 10px; color: ${t.textSub}; line-height: 1.3;">1:1 비율 바이럴 정보성 피드, 시선 집중 텍스트 배치 및 볼드 컬러</div>
            </div>
          </div>
        </div>

        <!-- 우측: 메인 비주얼 캔버스 작업 덱 (툴바 + 룰러 + 프리뷰 + 3D 생성 버튼) -->
        <div class="card" style="padding: 18px; display: flex; flex-direction: column; gap: 14px; position: relative;">
          <!-- 캔버스 상단 조작 바 -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.border}; padding-bottom: 10px;">
            <!-- 도구 모음 (선택, 브러시, 지우개, AI 채우기) -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="padding: 6px 12px; border-radius: 8px; background: ${t.accent}; color: #fff; font-size: 11px; font-weight: 800; cursor: pointer;">↖ 선택 도구</span>
              <span style="padding: 6px 12px; border-radius: 8px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 11px; font-weight: 700; color: ${t.textSub}; cursor: pointer;">🖌 마스킹 브러시 (24px)</span>
              <span style="padding: 6px 12px; border-radius: 8px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 11px; font-weight: 700; color: ${t.textSub}; cursor: pointer;">🧹 지우개</span>
              <span style="padding: 6px 12px; border-radius: 8px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 11px; font-weight: 700; color: ${t.accentSub}; cursor: pointer;">✨ AI 부분 채우기</span>
            </div>

            <!-- 해상도 및 비율 선택기 -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; color: ${t.textSub}; font-weight: 700;">비율:</span>
              <span style="padding: 4px 8px; border-radius: 6px; background: ${t.accent}22; color: ${t.accent}; font-size: 10px; font-weight: 800;">1:1 (정사각형)</span>
              <span style="padding: 4px 8px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 700; color: ${t.textSub};">16:9 (와이드)</span>
              <span style="padding: 4px 8px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 700; color: ${t.textSub};">9:16 (쇼츠/릴스)</span>
              <span style="font-size: 11px; color: ${t.accentSub}; font-weight: 800; margin-left: 8px;">2048 x 2048 HD</span>
            </div>
          </div>

          <!-- 실물 캔버스 무대 (디자인 프리뷰 & 룰러 그리드) -->
          <div style="flex: 1; background: ${t.isDark ? '#080A0F' : '#F1F5F9'}; border: 1.5px dashed ${t.borderSub}; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
            <!-- 모눈 그리드 배경 효과 -->
            <div style="position: absolute; inset: 0; background-image: radial-gradient(${t.isDark ? '#1E293B' : '#CBD5E1'} 1px, transparent 1px); background-size: 20px 20px; opacity: 0.6;"></div>

            <!-- 캔버스 실물 목업 카드 (UI/UX 대시보드 그래픽 렌더 결과) -->
            <div style="width: 540px; height: 380px; background: ${t.surface}; border: 2px solid ${t.accent}; border-radius: 20px; box-shadow: 0 20px 50px ${t.glow}; position: relative; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; z-index: 2;">
              <!-- 헤더 레이어 칩 -->
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #EF4444;"></div>
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #F59E0B;"></div>
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></div>
                  <span style="font-size: 11px; font-weight: 800; color: ${t.accent}; margin-left: 6px;">FINTECH DASHBOARD PRO</span>
                </div>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; background: ${t.accent}15; color: ${t.accent}; font-weight: 800;">UI/UX PLACEHOLDER</span>
              </div>

              <!-- 중앙 데이터 비주얼 그래픽 -->
              <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 14px; margin: 10px 0;">
                <div style="background: ${t.bg}; padding: 14px; border-radius: 12px; border: 1px solid ${t.border};">
                  <div style="font-size: 10px; color: ${t.textSub}; font-weight: 700;">TOTAL REVENUE ANALYTICS</div>
                  <div style="font-size: 20px; font-weight: 900; color: ${t.text}; margin: 4px 0;">$148,290.00 <span style="font-size: 11px; color: #10B981;">+24.8%</span></div>
                  <!-- 그래프 라인 모사 -->
                  <div style="height: 50px; display: flex; align-items: flex-end; gap: 8px; margin-top: 10px;">
                    <div style="flex: 1; height: 40%; background: ${t.accent}44; border-radius: 4px;"></div>
                    <div style="flex: 1; height: 60%; background: ${t.accent}66; border-radius: 4px;"></div>
                    <div style="flex: 1; height: 85%; background: ${t.accent}; border-radius: 4px;"></div>
                    <div style="flex: 1; height: 100%; background: linear-gradient(180deg, ${t.accentSub}, ${t.accent}); border-radius: 4px;"></div>
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="background: ${t.bg}; padding: 12px; border-radius: 10px; border: 1px solid ${t.border};">
                    <div style="font-size: 9px; color: ${t.textSub}; font-weight: 700;">ACTIVE USERS</div>
                    <div style="font-size: 14px; font-weight: 800; color: ${t.accentSub};">18,420 DAU</div>
                  </div>
                  <div style="background: ${t.bg}; padding: 12px; border-radius: 10px; border: 1px solid ${t.border};">
                    <div style="font-size: 9px; color: ${t.textSub}; font-weight: 700;">TRANSACTION SPEED</div>
                    <div style="font-size: 14px; font-weight: 800; color: #10B981;">0.04s Instant</div>
                  </div>
                </div>
              </div>

              <!-- 하단 플로팅 레이어 태그 바 -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid ${t.border}; padding-top: 10px;">
                <div style="font-size: 10px; color: ${t.textSub};">렌더 파이프라인: Gemini Imagen 3.0 + Vector Mesh Engine</div>
                <div style="display: flex; gap: 6px;">
                  <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: ${t.bg}; border: 1px solid ${t.border};">Dribbble Style</span>
                  <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: ${t.bg}; border: 1px solid ${t.border};">Glassmorphic</span>
                </div>
              </div>
            </div>

            <!-- 플로팅 캔버스 줌 & 치수 배지 -->
            <div style="position: absolute; bottom: 12px; right: 14px; padding: 4px 10px; border-radius: 6px; background: ${t.surface}; border: 1px solid ${t.border}; font-size: 10px; font-weight: 800; color: ${t.textSub};">
              🔍 100% (2048 x 2048) · X: 720 Y: 450
            </div>
          </div>

          <!-- 하단 프롬프트 주입기 & 3D 실행 버튼 -->
          <div style="display: flex; gap: 12px; align-items: center;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700;">
                <span style="color: ${t.text};">조립된 자동 프롬프트 템플릿:</span>
                <span style="color: ${t.accent}; font-weight: 800;">변수 3개 자동 치환 완료</span>
              </div>
              <input value="Smartphone 환경을 위한 피트니스 & 핀테크 대시보드 UI. 드리블 미적 감각, 인디고 & 마젠타 색상 테마, 클린 벡터 일러스트레이션." style="background: ${t.bg}; border: 1px solid ${t.border}; padding: 10px 14px; border-radius: 10px; font-size: 11px; color: ${t.text}; font-weight: 600;" readonly />
            </div>
            <button class="${t.btnClass}" style="padding: 14px 28px; font-size: 13px; cursor: pointer; white-space: nowrap; height: 52px; margin-top: 16px;">
              🎨 AI 그래픽 즉시 생성 (Generate HD)
            </button>
          </div>
        </div>
      </div>
    </body></html>`;
  }

  // 2. 상세 편집 및 인페인팅 뷰 (02_detail)
  if (viewIndex === 1) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="padding: 16px 24px; display: flex; flex-direction: column; gap: 14px;">
      <!-- 상단 내비게이션 바 -->
      <header style="display: flex; justify-content: space-between; align-items: center; background: ${t.surface}; padding: 12px 20px; border-radius: 14px; border: 1px solid ${t.border};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button style="padding: 6px 12px; border-radius: 8px; background: ${t.bg}; border: 1px solid ${t.border}; color: ${t.text}; font-size: 11px; font-weight: 700; cursor: pointer;">← 템플릿 목록</button>
          <div>
            <div style="font-size: 15px; font-weight: 900;">정밀 AI 마스킹 인페인팅 & 벡터 에디터</div>
            <div style="font-size: 11px; color: ${t.accent}; font-weight: 700;">UI/UX 플레이스홀더 > 스마트폰 피트니스 차트 영역 편집 중</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 11px; color: ${t.textSub}; font-weight: 700;">내보내기 포맷:</span>
          <span style="padding: 4px 10px; border-radius: 6px; background: ${t.accent}; color: #fff; font-size: 11px; font-weight: 800;">4K PNG</span>
          <span style="padding: 4px 10px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 11px; font-weight: 700; color: ${t.textSub};">SVG 벡터</span>
          <span style="padding: 4px 10px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 11px; font-weight: 700; color: ${t.textSub};">WebP</span>
          <button class="${t.btnClass}" style="padding: 8px 16px; font-size: 12px; cursor: pointer;">💾 최종 에셋 저장</button>
        </div>
      </header>

      <!-- 본문: 좌측 대형 마스킹 캔버스 (980px) + 우측 정밀 인스펙터 패널 (410px) -->
      <div style="display: grid; grid-template-columns: 1fr 410px; gap: 16px; flex: 1; height: calc(100% - 80px);">
        <!-- 좌측: 실물 인페인팅 캔버스 뷰 -->
        <div class="card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; background: ${t.isDark ? '#080A0F' : '#F8FAFC'};">
          <!-- 캔버스 모눈 배경 -->
          <div style="position: absolute; inset: 0; background-image: radial-gradient(${t.isDark ? '#1E293B' : '#CBD5E1'} 1px, transparent 1px); background-size: 24px 24px; opacity: 0.5;"></div>

          <!-- 상단 툴 상태 바 -->
          <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="padding: 6px 12px; border-radius: 8px; background: ${t.accent}; color: #fff; font-size: 11px; font-weight: 800;">🖌 마스크 브러시 ON</span>
              <span style="font-size: 11px; color: ${t.textSub}; font-weight: 700;">반경: 32px · 페더: 4px</span>
            </div>
            <div style="padding: 4px 12px; border-radius: 9999px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #EF4444; font-size: 11px; font-weight: 800;">
              🔴 인페인팅 수정 영역 1개 지정됨 (240 x 180px)
            </div>
          </div>

          <!-- 중앙 마스킹된 이미지 렌더 영역 -->
          <div style="align-self: center; width: 640px; height: 420px; background: ${t.surface}; border-radius: 18px; border: 2px solid ${t.border}; box-shadow: 0 15px 40px ${t.glow}; position: relative; overflow: hidden; padding: 24px; z-index: 2;">
            <div style="font-size: 13px; font-weight: 800; color: ${t.text}; margin-bottom: 12px;">피트니스 트래커 모바일 화면</div>
            
            <!-- 인페인팅 선택 영역 하이라이트 (반투명 네온 오버레이) -->
            <div style="position: absolute; top: 70px; left: 160px; width: 320px; height: 220px; border: 2px dashed ${t.accentSub}; background: ${t.accentSub}22; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
              <div style="padding: 4px 10px; border-radius: 6px; background: ${t.accentSub}; color: #fff; font-size: 11px; font-weight: 900; margin-bottom: 6px;">
                ✨ AI RE-FILL TARGET ZONE
              </div>
              <div style="font-size: 10px; color: #fff; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                "심박수 펄스 웨이브와 3D 네온 링 차트로 변경"
              </div>
            </div>

            <!-- 주변 UI 배경 -->
            <div style="width: 100%; height: 100%; opacity: 0.35; filter: grayscale(0.4); display: flex; flex-direction: column; justify-content: space-around;">
              <div style="height: 40px; background: ${t.bg}; border-radius: 8px;"></div>
              <div style="height: 120px; background: ${t.bg}; border-radius: 8px;"></div>
              <div style="height: 60px; background: ${t.bg}; border-radius: 8px;"></div>
            </div>
          </div>

          <!-- 하단 상태 바 -->
          <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2;">
            <div style="font-size: 11px; color: ${t.textSub};">실시간 텐서 VRAM: 4.2GB / 16GB · 레이턴시 0.8s 초고속 인페인팅</div>
            <div style="display: flex; gap: 8px;">
              <button style="padding: 6px 12px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 11px; color: ${t.text}; font-weight: 700;">마스크 되돌리기 (Undo)</button>
              <button style="padding: 6px 12px; border-radius: 6px; background: ${t.bg}; border: 1px solid ${t.border}; font-size: 11px; color: ${t.text}; font-weight: 700;">마스크 전체 지우기</button>
            </div>
          </div>
        </div>

        <!-- 우측: AI 인페인팅 파라미터 인스펙터 -->
        <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <div style="font-size: 14px; font-weight: 800; color: ${t.accent}; border-bottom: 1px solid ${t.border}; padding-bottom: 8px;">
            ⚙️ AI 인페인팅 수정 설정
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: ${t.textSub}; display: block; margin-bottom: 6px;">선택 영역 대체 프롬프트 (Prompt Fill)</label>
            <textarea style="width: 100%; height: 80px; background: ${t.bg}; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; color: ${t.text}; font-size: 11px; line-height: 1.4; resize: none;" readonly>A futuristic 3D biometric heart-rate pulse wave with neon pink glowing ring chart, clean modern fintech style, high-gloss glass reflection, transparent backdrop.</textarea>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: ${t.textSub}; display: block; margin-bottom: 6px;">스타일 DNA 일치도 (Style Consistency)</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10px; font-weight: 700;">
              <div style="padding: 8px; background: ${t.accent}22; border: 1px solid ${t.accent}; border-radius: 8px; color: ${t.accent}; text-align: center;">원본 100% 동기화</div>
              <div style="padding: 8px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px; color: ${t.textSub}; text-align: center;">스타일 변주 50%</div>
              <div style="padding: 8px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px; color: ${t.textSub}; text-align: center;">하이퍼 크리에이티브</div>
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: ${t.textSub}; display: block; margin-bottom: 6px;">브러시 두께 & 경계 페더링</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="range" value="32" min="8" max="64" style="flex: 1;" />
              <span style="font-size: 11px; font-weight: 800; color: ${t.accent}; width: 40px;">32 px</span>
            </div>
          </div>

          <div style="background: ${t.bg}; padding: 12px; border-radius: 10px; border: 1px solid ${t.border};">
            <div style="font-size: 10px; font-weight: 800; color: ${t.text}; margin-bottom: 4px;">💡 프로 디자이너 팁</div>
            <div style="font-size: 10px; color: ${t.textSub}; line-height: 1.4;">
              수정할 영역만 좁게 브러시로 칠하고 주변 배경 스타일(색상, 조명)을 프롬프트 끝에 덧붙이면 경계선 이질감 없이 완벽하게 블렌딩됩니다.
            </div>
          </div>

          <button class="${t.btnClass}" style="margin-top: auto; padding: 14px; font-size: 13px; cursor: pointer;">
            ✨ 선택 영역 AI 재생성 (Inpaint Fill)
          </button>
        </div>
      </div>
    </body></html>`;
  }

  // 3. 사용자 매뉴얼/가이드 화면 (03_guide)
  if (viewIndex === 2) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="padding: 24px 32px; display: flex; flex-direction: column; gap: 16px;">
      <!-- 상단 가이드 헤더 -->
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.border}; padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; box-shadow: 0 4px 12px ${t.glow};">📖</div>
          <div>
            <h1 style="font-size: 20px; font-weight: 900; letter-spacing: -0.3px;">AI 올인원 그래픽 자동화 사용자 가이드북</h1>
            <p style="font-size: 12px; color: ${t.textSub};">123종 전문 디자인 템플릿 완벽 정복 & AI 인페인팅 캔버스 활용 공식</p>
          </div>
        </div>
        <button class="${t.btnClass}" style="padding: 10px 20px; font-size: 12px; cursor: pointer;">← 그래픽 스튜디오로 돌아가기</button>
      </header>

      <!-- 본문: 좌측 4단계 황금 파이프라인 (1fr) + 우측 템플릿 치트시트 & FAQ (1fr) -->
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; flex: 1; height: calc(100% - 80px);">
        <!-- 좌측: 4단계 그래픽 제작 워크플로우 -->
        <div class="card" style="padding: 24px; overflow-y: auto;">
          <div style="font-size: 15px; font-weight: 800; color: ${t.accent}; margin-bottom: 16px;">
            🚀 4단계 올인원 그래픽 제작 황금 공식
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${[
              { step: "01", title: "123종 템플릿 라이브러리 선택", desc: "DEV, 마케팅, SNS, 이커머스 등 제작 목적에 부합하는 전문 템플릿을 좌측 갤러리에서 즉시 탐색합니다." },
              { step: "02", title: "필드 변수 튜닝 (3~5개 최소 설정)", desc: "디바이스 종류, 메인 컬러 팔레트, 브랜드 핵심 키워드만 입력하면 Gemini/Claude가 고도화된 프롬프트를 자동 조립합니다." },
              { step: "03", title: "스마트 캔버스 마스킹 & 인페인팅", desc: "결과물 중 변경하고 싶은 부분(텍스트, 메인 오브젝트, 배경)을 브러시로 지정하고 AI Fill로 자연스럽게 교체합니다." },
              { step: "04", title: "다채널 규격 4K PNG / 벡터 SVG 내보내기", desc: "1:1 인스타, 9:16 쇼츠, 16:9 웹 랜딩 등 목적에 맞는 종횡비로 손실 없이 고해상도 그래픽 에셋을 즉시 다운로드합니다." }
            ].map(g => `
              <div style="padding: 14px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 12px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <span style="font-size: 11px; font-weight: 900; background: ${t.accent}; color: #fff; padding: 2px 8px; border-radius: 6px;">STEP ${g.step}</span>
                  <span style="font-size: 13px; font-weight: 800; color: ${t.text};">${g.title}</span>
                </div>
                <div style="font-size: 11px; color: ${t.textSub}; line-height: 1.5; margin-left: 2px;">${g.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 우측: 123종 규격 카테고리 매트릭스 & FAQ -->
        <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
          <div style="font-size: 15px; font-weight: 800; color: ${t.accentSub};">
            📐 목적별 종횡비 & 해상도 최적화 치트시트
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
            <div style="padding: 10px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">1:1 SQUARE (2048x2048)</div>
              <div style="color: ${t.textSub}; font-size: 10px; margin-top: 2px;">인스타그램 피드, 스마트스토어 대표 이미지</div>
            </div>
            <div style="padding: 10px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">16:9 WIDE (3840x2160)</div>
              <div style="color: ${t.textSub}; font-size: 10px; margin-top: 2px;">유튜브 썸네일, 웹사이트 히어로 배너</div>
            </div>
            <div style="padding: 10px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">9:16 VERTICAL (2160x3840)</div>
              <div style="color: ${t.textSub}; font-size: 10px; margin-top: 2px;">유튜브 쇼츠, 인스타 릴스 배경, 틱톡 스토리</div>
            </div>
            <div style="padding: 10px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">VECTOR SVG / PDF</div>
              <div style="color: ${t.textSub}; font-size: 10px; margin-top: 2px;">무손실 무한 확대 로고, 아이콘, 인쇄 패키지</div>
            </div>
          </div>

          <div style="font-size: 14px; font-weight: 800; color: ${t.text}; margin-top: 4px;">❓ 자주 묻는 질문 (FAQ)</div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div style="padding: 10px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 700; color: ${t.text};">Q. 생성된 그래픽을 상업적 판매용으로 사용할 수 있나요?</div>
              <div style="color: ${t.textSub}; margin-top: 2px;">네, 회원 본인의 API 키로 생성된 모든 그래픽 에셋은 라이선스 제약 없이 상업적 용도로 100% 자유롭게 활용하실 수 있습니다.</div>
            </div>
            <div style="padding: 10px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 700; color: ${t.text};">Q. 손으로 그린 스케치나 로고 이미지를 참조할 수 있나요?</div>
              <div style="color: ${t.textSub}; margin-top: 2px;">네, '레퍼런스 이미지 업로드'를 통해 와이어프레임이나 로고를 올리시면 AI가 해당 형태와 구도를 유지하면서 고화질 그래픽으로 재창조합니다.</div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`;
  }

  // 4. 환경설정 및 로그인 화면 (04_settings) - 2026-11-01 5단계 수직 레이아웃 표준 규격 준수
  if (viewIndex === 3) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
      <!-- 앰비언트 글로우 -->
      <div style="position: absolute; top: 15%; left: 35%; width: 450px; height: 450px; background: ${t.glow}; filter: blur(140px); pointer-events: none; border-radius: 50%;"></div>

      <div style="width: 440px; position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center;">
        <!-- 1단계: 64px 라운드 스퀘어 심볼 로고 -->
        <div style="width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 10px 25px ${t.glow}; border: 1px solid rgba(255,255,255,0.4); margin-bottom: 14px; color: #fff;">🎨</div>

        <!-- 2단계: 영문명 알약 캡슐 뱃지 -->
        <div style="padding: 4px 16px; border-radius: 9999px; font-size: 11px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 10px; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.accent};">
          AIMASTER ALL-IN-ONE GRAPHIC
        </div>

        <!-- 3단계: 한글 프로그램 타이틀 및 서브 카피 -->
        <h1 style="font-size: 26px; font-weight: 900; margin-bottom: 6px; text-align: center; color: ${t.text};">
          AI 올인원 <span style="color: ${t.accent};">그래픽 자동화</span>
        </h1>
        <p style="font-size: 12px; color: ${t.textSub}; margin-bottom: 24px; text-align: center;">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>

        <!-- 4단계: 로그인 카드 & 3D 엠보싱 버튼 -->
        <div class="card" style="width: 100%; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          <div style="display: flex; background: ${t.bg}; padding: 4px; border-radius: 12px; border: 1px solid ${t.border}; margin-bottom: 20px;">
            <div style="flex: 1; text-align: center; padding: 10px; font-size: 12px; font-weight: 800; background: ${t.accent}; color: #fff; border-radius: 8px; box-shadow: 0 2px 8px ${t.glow};">로그인</div>
            <div style="flex: 1; text-align: center; padding: 10px; font-size: 12px; font-weight: 800; color: ${t.textSub};">회원가입</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: ${t.textSub}; display: block; margin-bottom: 6px;">이메일 주소</label>
              <input value="designer@buylife.xyz" style="width: 100%; background: ${t.bg}; border: 1px solid ${t.border}; padding: 12px 14px; border-radius: 10px; color: ${t.text}; font-size: 12px;" readonly />
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <label style="font-size: 11px; font-weight: 700; color: ${t.textSub};">비밀번호</label>
                <span style="font-size: 11px; color: ${t.accent}; font-weight: 600;">비밀번호 찾기?</span>
              </div>
              <input type="password" value="••••••••••••" style="width: 100%; background: ${t.bg}; border: 1px solid ${t.border}; padding: 12px 14px; border-radius: 10px; color: ${t.text}; font-size: 12px;" readonly />
            </div>

            <button class="${t.btnClass}" style="width: 100%; padding: 14px; font-size: 14px; margin-top: 8px; cursor: pointer;">로그인 →</button>
          </div>

          <!-- 5단계: 약관 문구 1행 축소 처리 -->
          <div style="margin-top: 24px; text-align: center; border-top: 1px solid ${t.border}; padding-top: 14px;">
            <p style="white-space: nowrap; font-size: 11px; color: ${t.textSub};">진행 시 <span style="text-decoration: underline; color: ${t.text}; font-weight: 700;">이용약관</span> 및 <span style="text-decoration: underline; color: ${t.text}; font-weight: 700;">개인정보 처리방침</span>에 동의합니다.</p>
          </div>
        </div>
      </div>
    </body></html>`;
  }
}

async function main() {
  console.log('Rendering 12 views for AI All-in-One Graphic Studio...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const concepts = [
    { dir: '60_figma_pro_visual_canvas', prefix: 'aog_c1' },
    { dir: '61_adobe_hyper_creative_dark_desk', prefix: 'aog_c2' },
    { dir: '62_nano_generative_ai_art_console', prefix: 'aog_c3' }
  ];

  const views = ['01_main', '02_detail', '03_guide', '04_settings'];
  const viewNames = ['main', 'detail', 'guide', 'settings'];

  const outBrain = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';

  for (let c = 0; c < 3; c++) {
    const cInfo = concepts[c];
    const targetDir = path.join('D:/Antigravity/Design', cInfo.dir);

    for (let v = 0; v < 4; v++) {
      const html = getHtml(c, v);
      await page.setContent(html, { waitUntil: 'load' });
      await page.waitForTimeout(300);

      // 1. D:\Antigravity\Design 영구 저장
      const targetPath = path.join(targetDir, `${views[v]}.png`);
      await page.screenshot({ path: targetPath, fullPage: false });

      // 2. 아티팩트 디렉터리 저장
      const brainPath = path.join(outBrain, `${cInfo.prefix}_${viewNames[v]}.png`);
      await page.screenshot({ path: brainPath, fullPage: false });

      console.log(`Rendered: ${cInfo.dir}/${views[v]}.png`);
    }
  }

  await browser.close();
  console.log('ALL 12 VIEWS RENDERED SUCCESSFULLY!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
