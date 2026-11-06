const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

// 12개 뷰 HTML 템플릿 생성기
function getHtml(conceptIndex, viewIndex) {
  // 테마별 팔레트 및 배색
  const themes = [
    {
      id: 57,
      name: "헐리우드 9컷 시네마틱 디렉터스 뷰파인더 스타일",
      bg: "#090D13",
      surface: "#141A23",
      border: "#283342",
      accent: "#EF4444",
      accentSub: "#F59E0B",
      btnClass: "btn-3d-red",
      badgeColor: "bg-red-500/10 text-red-400 border-red-500/30",
      tag: "DIRECTOR'S VIEWFINDER",
      glow: "rgba(239, 68, 68, 0.4)"
    },
    {
      id: 58,
      name: "네오 NLE 스토리보드 프로덕션 타임라인 스타일",
      bg: "#14171F",
      surface: "#1A202C",
      border: "#2D3748",
      accent: "#F59E0B",
      accentSub: "#06B6D4",
      btnClass: "btn-3d-gold",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      tag: "PRO NLE TIMELINE",
      glow: "rgba(245, 158, 11, 0.4)"
    },
    {
      id: 59,
      name: "하이퍼 애니메이틱 씬 디퓨전 콘솔 스타일",
      bg: "#070A12",
      surface: "#0E1424",
      border: "#1E293B",
      accent: "#10B981",
      accentSub: "#00F2FE",
      btnClass: "btn-3d-emerald",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      tag: "NEURAL DIFFUSION HUD",
      glow: "rgba(16, 185, 129, 0.4)"
    }
  ];

  const t = themes[conceptIndex];

  // 공통 헤더 스타일
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", sans-serif; }
    body { background: ${t.bg}; color: #F0F6FC; width: 1440px; height: 900px; overflow: hidden; position: relative; }
    .btn-3d-red {
      background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 4px 0 #991b1b, 0 8px 20px rgba(239, 68, 68, 0.4);
      color: #fff; font-weight: 800; border: 1px solid #f87171; border-radius: 12px;
    }
    .btn-3d-gold {
      background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 0 #92400e, 0 8px 20px rgba(245, 158, 11, 0.35);
      color: #090d13; font-weight: 800; border: 1px solid #fbbf24; border-radius: 12px;
    }
    .btn-3d-emerald {
      background: linear-gradient(180deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 0 #065f46, 0 8px 20px rgba(16, 185, 129, 0.35);
      color: #fff; font-weight: 800; border: 1px solid #34d399; border-radius: 12px;
    }
    .card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 16px; }
    .viewfinder { position: relative; border: 1.5px solid ${t.accent}66; }
    .corner-tl { position: absolute; top: 6px; left: 6px; width: 12px; height: 12px; border-top: 2px solid ${t.accent}; border-left: 2px solid ${t.accent}; }
    .corner-tr { position: absolute; top: 6px; right: 6px; width: 12px; height: 12px; border-top: 2px solid ${t.accent}; border-right: 2px solid ${t.accent}; }
    .corner-bl { position: absolute; bottom: 6px; left: 6px; width: 12px; height: 12px; border-bottom: 2px solid ${t.accent}; border-left: 2px solid ${t.accent}; }
    .corner-br { position: absolute; bottom: 6px; right: 6px; width: 12px; height: 12px; border-bottom: 2px solid ${t.accent}; border-right: 2px solid ${t.accent}; }
  `;

  // 1. 메인 화면 (01_main)
  if (viewIndex === 0) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="padding: 24px 32px;">
      <!-- 상단 네비게이션 -->
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.border}; padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 0 15px ${t.glow};">🎬</div>
          <div>
            <div style="font-size: 16px; font-weight: 900; letter-spacing: -0.5px;">AI 시네마틱 <span style="color: ${t.accent};">스토리보드</span></div>
            <div style="font-size: 10px; color: #8B949E; font-family: monospace;">CINEMATIC STORYBOARD v1.10</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; font-family: monospace; padding: 4px 10px; border-radius: 20px; border: 1px solid ${t.border}; background: #000; color: ${t.accent};">● LIVE 🔴 REC 00:01:24:18</span>
          <span style="font-size: 11px; font-family: monospace; padding: 4px 10px; border-radius: 20px; border: 1px solid ${t.border}; color: #8B949E;">4K DCI · 2.39:1 ANAMORPHIC</span>
          <button class="${t.btnClass}" style="padding: 8px 16px; font-size: 12px; cursor: pointer;">+ 새 시나리오 콘티 생성</button>
        </div>
      </header>

      <!-- 본문: 좌측 시나리오 기획창 / 우측 9컷 뷰파인더 덱 -->
      <div style="display: grid; grid-template-columns: 360px 1fr; gap: 20px; margin-top: 20px; height: calc(100% - 80px);">
        <!-- 좌측 패널 -->
        <div class="card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <span style="font-size: 13px; font-weight: 800; color: ${t.accentSub};">시네마틱 프로젝트 설정</span>
              <span style="font-size: 10px; background: ${t.border}; padding: 2px 8px; border-radius: 6px;">SCENE 01~09</span>
            </div>
            <div style="margin-bottom: 12px;">
              <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 4px;">작품/광고 제목</label>
              <input value="네오 사이버펑크 2088 : 오리진 티저" style="width: 100%; background: #090D13; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; color: #fff; font-size: 12px; font-weight: 700;" readonly />
            </div>
            <div style="margin-bottom: 12px;">
              <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 4px;">시놉시스 & 핵심 소구점</label>
              <div style="width: 100%; height: 90px; background: #090D13; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; color: #C9D1D9; font-size: 11px; line-height: 1.5;">비 내리는 네온 네오 서울, 사이보그 탐정 'K'가 뒷골목 홀로그램 단서를 추적하며 비밀 연구소로 잠입하는 긴박한 오프닝 시퀀스.</div>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 6px;">시네마틱 톤앤매너 프리셋</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px;">
                <div style="padding: 8px; background: ${t.border}; border: 1px solid ${t.accent}; border-radius: 8px; font-weight: 800; color: ${t.accent}; text-align: center;">헐리우드 블록버스터</div>
                <div style="padding: 8px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px; color: #8B949E; text-align: center;">네오 사이버펑크</div>
                <div style="padding: 8px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px; color: #8B949E; text-align: center;">미니멀 감성 무비</div>
                <div style="padding: 8px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px; color: #8B949E; text-align: center;">애니메이틱 웹툰 콘티</div>
              </div>
            </div>
          </div>
          <button class="${t.btnClass}" style="width: 100%; padding: 14px; font-size: 13px; cursor: pointer;">🎬 9컷 시네마틱 콘티 일괄 렌더링</button>
        </div>

        <!-- 우측 9컷 스토리보드 그리드 뷰파인더 덱 -->
        <div class="card" style="padding: 20px; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid ${t.border}; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px; font-weight: 900; color: #fff;">9-SHOT STORYBOARD SEQUENCER</span>
              <span style="font-size: 10px; background: ${t.accent}22; color: ${t.accent}; padding: 2px 8px; border-radius: 12px; font-weight: 800; border: 1px solid ${t.accent}44;">완성도 100% (9/9)</span>
            </div>
            <div style="font-size: 11px; color: #8B949E;">16:9 와이드 DCI · 총 예상 분량: 00:45s</div>
          </div>

          <!-- 9컷 그리드 -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 12px; flex: 1;">
            ${[
              { num: "01", shot: "EXT. WIDE", desc: "네온 빌딩 숲 위로 번개가 치는 네오 서울 전경", dur: "04s", color: "#1E293B" },
              { num: "02", shot: "MED. TRACKING", desc: "비를 맞으며 젖은 아스팔트를 걷는 탐정 K", dur: "05s", color: "#334155" },
              { num: "03", shot: "CU. OVER SHOULDER", desc: "K의 홀로그램 렌즈에 스캔되는 비밀 코드", dur: "03s", color: "#475569" },
              { num: "04", shot: "LOW ANGLE", desc: "거대한 철문 앞, 권총을 장전하는 역광 실루엣", dur: "04s", color: "#1E293B" },
              { num: "05", shot: "HIGH BIRD-EYE", desc: "연구소 통제실 내부, 붉은 경보등 점멸", dur: "06s", color: "#334155" },
              { num: "06", shot: "DUTCH TILT", desc: "도난당한 큐브 컨테이너가 열려있는 현장", dur: "05s", color: "#475569" },
              { num: "07", shot: "EXTREME CU", desc: "동공이 확장되며 뒤를 돌아보는 K의 눈빛", dur: "03s", color: "#1E293B" },
              { num: "08", shot: "ACTION PAN", desc: "그림자 속에서 덮쳐오는 안드로이드 경비병", dur: "05s", color: "#334155" },
              { num: "09", shot: "ESTABLISHING OUTRO", desc: "폭발과 함께 어둠 속으로 질주하는 실루엣 & 타이틀", dur: "10s", color: "#475569" }
            ].map(s => `
              <div class="viewfinder" style="background: ${s.color}; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
                <div class="corner-tl"></div><div class="corner-tr"></div><div class="corner-bl"></div><div class="corner-br"></div>
                <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2;">
                  <span style="font-size: 11px; font-weight: 900; background: #000; padding: 2px 6px; border-radius: 4px; color: ${t.accent}; font-family: monospace;">SCENE ${s.num}</span>
                  <span style="font-size: 9px; font-weight: 700; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; color: ${t.accentSub};">${s.shot} · ${s.dur}</span>
                </div>
                <div style="z-index: 2; background: rgba(9, 13, 19, 0.85); padding: 6px 8px; border-radius: 6px; backdrop-filter: blur(4px);">
                  <div style="font-size: 10px; color: #E2E8F0; line-height: 1.3; font-weight: 600;">${s.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </body></html>`;
  }

  // 2. 상세 화면 (02_detail)
  if (viewIndex === 1) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="padding: 24px 32px;">
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.border}; padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; font-size: 18px;">🎯</div>
          <div>
            <div style="font-size: 16px; font-weight: 900;">씬 03 인스펙터 콘솔 <span style="color: ${t.accent};">[CU. OVER SHOULDER]</span></div>
            <div style="font-size: 10px; color: #8B949E; font-family: monospace;">SCENE 03 INSPECTOR · 00:09 ~ 00:12 (3.0s)</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button style="padding: 8px 14px; border-radius: 10px; background: #090D13; border: 1px solid ${t.border}; color: #8B949E; font-size: 11px; font-weight: 700;">◀ 이전 씬 (02)</button>
          <button style="padding: 8px 14px; border-radius: 10px; background: #090D13; border: 1px solid ${t.border}; color: #8B949E; font-size: 11px; font-weight: 700;">다음 씬 (04) ▶</button>
          <button class="${t.btnClass}" style="padding: 8px 18px; font-size: 12px;">💾 씬 변경사항 저장</button>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 1fr 420px; gap: 20px; margin-top: 20px; height: calc(100% - 80px);">
        <!-- 좌측: 대형 16:9 와이드 시네마틱 뷰파인더 덱 -->
        <div class="card viewfinder" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; background: #080C14;">
          <div class="corner-tl"></div><div class="corner-tr"></div><div class="corner-bl"></div><div class="corner-br"></div>
          <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 11px; z-index: 2;">
            <span style="color: ${t.accent}; font-weight: 900;">🔴 LIVE MONITOR [SCENE 03]</span>
            <span style="color: #8B949E;">50mm ANAMORPHIC · F1.4 · ISO 800</span>
          </div>

          <!-- 메인 뷰파인더 중앙 그래픽 -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 380px; border: 1px dashed ${t.border}; border-radius: 12px; background: radial-gradient(circle, #1E293B 0%, #090D13 80%);">
            <div style="font-size: 48px; margin-bottom: 12px;">👁️</div>
            <div style="font-size: 15px; font-weight: 800; color: #fff;">K의 홀로그램 사이버 렌즈 클로즈업 프리뷰</div>
            <div style="font-size: 11px; color: ${t.accentSub}; margin-top: 4px;">프롬프트 렌더링 완료 · 2K UHD 해상도 (2048 x 1152)</div>
          </div>

          <!-- 하단 재생 컨트롤 바 -->
          <div style="background: rgba(14, 20, 36, 0.9); padding: 12px 18px; border-radius: 10px; border: 1px solid ${t.border}; display: flex; justify-content: space-between; align-items: center; z-index: 2;">
            <div style="font-size: 11px; font-weight: 700; color: #fff;">00:09:12 / 00:12:00</div>
            <div style="display: flex; gap: 10px;">
              <span style="padding: 4px 10px; border-radius: 6px; background: #000; font-size: 10px; color: ${t.accent}; font-weight: 800;">RE-ROLL SEED</span>
              <span style="padding: 4px 10px; border-radius: 6px; background: #000; font-size: 10px; color: ${t.accentSub}; font-weight: 800;">4K UPSCALE</span>
            </div>
          </div>
        </div>

        <!-- 우측: 카메라 & 조명 & 프롬프트 연출 파라미터 -->
        <div class="card" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: ${t.accent}; border-bottom: 1px solid ${t.border}; padding-bottom: 8px;">🎬 디렉터스 씬 연출 파라미터</div>
          
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 4px;">카메라 앵글 & 샷 사이즈</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10px; font-weight: 700;">
              <div style="padding: 8px; background: ${t.accent}22; border: 1px solid ${t.accent}; border-radius: 8px; color: ${t.accent}; text-align: center;">Close-Up (클로즈업)</div>
              <div style="padding: 8px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px; color: #8B949E; text-align: center;">Over Shoulder</div>
              <div style="padding: 8px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px; color: #8B949E; text-align: center;">Eye Level</div>
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 4px;">조명 및 컬러 무드</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px; font-weight: 700;">
              <div style="padding: 8px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px; color: #38BDF8; text-align: center;">네온 블루 & 마젠타 림라이트</div>
              <div style="padding: 8px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px; color: #F59E0B; text-align: center;">필름 그레인 & 볼류메트릭 안개</div>
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 4px;">생성형 비주얼 프롬프트 (자동 번역 연동)</label>
            <textarea style="width: 100%; height: 90px; background: #090D13; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; color: #E2E8F0; font-size: 11px; line-height: 1.4; resize: none;" readonly>Extreme close-up of a futuristic cybernetic eye with glowing blue data streams reflected on the pupil, cinematic moody lighting, neon rain reflections, 8k resolution, octane render, masterclass framing.</textarea>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 4px;">대사 / 사운드 효과음 (Foley & SFX)</label>
            <input value="[SFX: 기계식 줌 소리 및 디지털 락온 비프음] K: '찾았다... 놈들의 본거지야.'" style="width: 100%; background: #090D13; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; color: #FCD34D; font-size: 11px; font-weight: 600;" readonly />
          </div>

          <button class="${t.btnClass}" style="margin-top: auto; padding: 12px; font-size: 12px; cursor: pointer;">✨ 이 씬 프레임 다시 생성하기 (Re-Generate)</button>
        </div>
      </div>
    </body></html>`;
  }

  // 3. 매뉴얼/가이드 화면 (03_guide)
  if (viewIndex === 2) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="padding: 24px 32px;">
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.border}; padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; font-size: 18px;">📖</div>
          <div>
            <div style="font-size: 16px; font-weight: 900;">시네마틱 스토리보드 <span style="color: ${t.accent};">공식 연출 가이드북</span></div>
            <div style="font-size: 10px; color: #8B949E; font-family: monospace;">DIRECTOR'S PRODUCTION HANDBOOK & SHOT CHEATSHEET</div>
          </div>
        </div>
        <button class="${t.btnClass}" style="padding: 8px 16px; font-size: 12px;">스튜디오로 돌아가기</button>
      </header>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; height: calc(100% - 80px);">
        <!-- 좌측: 9컷 황금 시퀀스 연출 공식 -->
        <div class="card" style="padding: 24px; overflow-y: auto;">
          <div style="font-size: 14px; font-weight: 800; color: ${t.accent}; margin-bottom: 16px;">🎬 헐리우드 9컷 황금 시퀀스 법칙</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${[
              { step: "01~02", title: "세계관 설정 및 도입 (Establishing)", desc: "와이드 샷으로 공간, 계절, 시대를 한눈에 제시하고 주인공의 등장 동선을 확립합니다." },
              { step: "03~04", title: "갈등 발생 및 목표 포착 (Inciting Incident)", desc: "클로즈업 및 로우 앵글을 통해 사건의 단서나 극적 위기 상황을 시각적으로 각인시킵니다." },
              { step: "05~06", title: "위기 고조 및 액션 전개 (Rising Action)", desc: "더치 틸트와 하이 앵글의 대비로 인물의 심리적 압박감과 대치 상황을 극대화합니다." },
              { step: "07~08", title: "클라이맥스 격돌 (Climax)", desc: "익스트림 클로즈업과 역동적인 패닝 샷으로 감정의 최고점 및 액션 하이라이트를 연출합니다." },
              { step: "09", title: "여운과 결말 (Resolution / Hook)", desc: "다음 편을 기대하게 만드는 반전 엔딩 또는 인상적인 타이틀 로고 실루엣을 배치합니다." }
            ].map(g => `
              <div style="padding: 12px; background: #090D13; border: 1px solid ${t.border}; border-radius: 10px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 900; background: ${t.accent}22; color: ${t.accent}; padding: 2px 6px; border-radius: 4px; font-family: monospace;">SCENE ${g.step}</span>
                  <span style="font-size: 12px; font-weight: 800; color: #fff;">${g.title}</span>
                </div>
                <div style="font-size: 11px; color: #8B949E; line-height: 1.4;">${g.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 우측: 카메라 샷 사이즈 규격 & FAQ -->
        <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
          <div style="font-size: 14px; font-weight: 800; color: ${t.accentSub};">📐 카메라 샷 사이즈 & 앵글 치트시트</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
            <div style="padding: 10px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">EXTREME WIDE (EWS)</div>
              <div style="color: #8B949E; font-size: 10px; margin-top: 2px;">도시 전체, 광활한 대자연 배경</div>
            </div>
            <div style="padding: 10px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">MEDIUM SHOT (MS)</div>
              <div style="color: #8B949E; font-size: 10px; margin-top: 2px;">허리부터 머리까지, 자연스런 대화</div>
            </div>
            <div style="padding: 10px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">CLOSE-UP (CU)</div>
              <div style="color: #8B949E; font-size: 10px; margin-top: 2px;">얼굴 표정, 손동작 등 결정적 감정</div>
            </div>
            <div style="padding: 10px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 800; color: ${t.accent};">DUTCH ANGLE</div>
              <div style="color: #8B949E; font-size: 10px; margin-top: 2px;">카메라를 기울여 심리적 불안 연출</div>
            </div>
          </div>

          <div style="font-size: 14px; font-weight: 800; color: #fff; margin-top: 8px;">❓ 자주 묻는 질문 (FAQ)</div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div style="padding: 10px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 700; color: #fff;">Q. 생성된 9컷 콘티를 PDF나 ZIP으로 받을 수 있나요?</div>
              <div style="color: #8B949E; margin-top: 2px;">네, 씬별 고해상도 2K 이미지와 대본이 정리된 PDF 콘티북 및 ZIP 압축 파일로 즉시 내려받으실 수 있습니다.</div>
            </div>
            <div style="padding: 10px; background: #090D13; border: 1px solid ${t.border}; border-radius: 8px;">
              <div style="font-weight: 700; color: #fff;">Q. AI 영상 스튜디오(SVD/Runway)와 연동되나요?</div>
              <div style="color: #8B949E; margin-top: 2px;">각 씬의 이미지와 프롬프트는 AIMaster 영상 제작 툴('ai-video-studio', 'shorts-onestop-studio')로 1클릭 다이렉트 전송됩니다.</div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`;
  }

  // 4. 설정/로그인 화면 (04_settings) - 2026-11-01 5단계 수직 레이아웃 표준 규격 준수
  if (viewIndex === 3) {
    return `<!DOCTYPE html><html><head><style>${css}</style></head>
    <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
      <!-- 앰비언트 글로우 -->
      <div style="position: absolute; top: 15%; left: 35%; width: 450px; height: 450px; background: ${t.glow}; filter: blur(140px); pointer-events: none; border-radius: 50%;"></div>

      <div style="width: 440px; position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center;">
        <!-- 1단계: 64px 라운드 스퀘어 심볼 로고 -->
        <div style="width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 10px 25px ${t.glow}; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 14px;">🎬</div>

        <!-- 2단계: 영문명 알약 캡슐 뱃지 -->
        <div style="padding: 4px 16px; border-radius: 9999px; font-size: 11px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 10px; border: 1px solid ${t.border}; background: rgba(0,0,0,0.5); color: ${t.accent};">
          AIMASTER CINEMATIC STORYBOARD
        </div>

        <!-- 3단계: 한글 프로그램 타이틀 및 서브 카피 -->
        <h1 style="font-size: 26px; font-weight: 900; margin-bottom: 6px; text-align: center; color: #fff;">
          AI 시네마틱 <span style="color: ${t.accent};">스토리보드</span>
        </h1>
        <p style="font-size: 12px; color: #8B949E; margin-bottom: 24px; text-align: center;">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>

        <!-- 4단계: 로그인 카드 & 3D 엠보싱 버튼 -->
        <div class="card" style="width: 100%; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <div style="display: flex; background: #090D13; padding: 4px; border-radius: 12px; border: 1px solid ${t.border}; margin-bottom: 20px;">
            <div style="flex: 1; text-align: center; padding: 10px; font-size: 12px; font-weight: 800; background: ${t.accent}; color: #fff; border-radius: 8px; box-shadow: 0 2px 8px ${t.glow};">로그인</div>
            <div style="flex: 1; text-align: center; padding: 10px; font-size: 12px; font-weight: 800; color: #8B949E;">회원가입</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #8B949E; display: block; margin-bottom: 6px;">이메일 주소</label>
              <input value="director@buylife.xyz" style="width: 100%; background: #090D13; border: 1px solid ${t.border}; padding: 12px 14px; border-radius: 10px; color: #fff; font-size: 12px;" readonly />
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <label style="font-size: 11px; font-weight: 700; color: #8B949E;">비밀번호</label>
                <span style="font-size: 11px; color: ${t.accent}; font-weight: 600;">비밀번호 찾기?</span>
              </div>
              <input type="password" value="••••••••••••" style="width: 100%; background: #090D13; border: 1px solid ${t.border}; padding: 12px 14px; border-radius: 10px; color: #fff; font-size: 12px;" readonly />
            </div>

            <button class="${t.btnClass}" style="width: 100%; padding: 14px; font-size: 14px; margin-top: 8px; cursor: pointer;">로그인 →</button>
          </div>

          <!-- 5단계: 약관 문구 1행 축소 처리 -->
          <div style="margin-top: 24px; text-align: center; border-top: 1px solid ${t.border}; padding-top: 14px;">
            <p style="white-space: nowrap; font-size: 11px; color: #8B949E;">진행 시 <span style="text-decoration: underline; color: #C9D1D9; font-weight: 700;">이용약관</span> 및 <span style="text-decoration: underline; color: #C9D1D9; font-weight: 700;">개인정보 처리방침</span>에 동의합니다.</p>
          </div>
        </div>
      </div>
    </body></html>`;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const concepts = [
    { dir: '57_hollywood_9cut_directors_viewfinder', prefix: 'css_c1' },
    { dir: '58_neo_nle_storyboard_timeline', prefix: 'css_c2' },
    { dir: '59_hyper_animatic_scene_diffusion', prefix: 'css_c3' }
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
