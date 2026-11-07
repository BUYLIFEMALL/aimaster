const fs = require('fs');
const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

// 테마 정의
const themes = [
  {
    id: 63,
    num: "63",
    folderName: "63_사이버_DAW_네온_스튜디오_덱_스타일",
    name: "사이버 DAW 네온 스튜디오 덱 스타일",
    enName: "Cyber DAW Neon Studio Deck Style",
    bg: "#060911",
    surface: "#0C101D",
    cardBg: "#0A0F1D",
    border: "rgba(16, 185, 129, 0.2)",
    borderHighlight: "#10B981",
    text: "#F8FAFC",
    textSub: "#94A3B8",
    accent: "#10B981", // Cyber Emerald
    accentSub: "#06B6D4", // Neon Cyan
    accentWarm: "#F59E0B", // Amber Gold
    btnClass: "btn-3d-emerald",
    badgeColor: "background: rgba(16, 185, 129, 0.12); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.35);",
    tag: "CYBER DAW PRO DECK",
    glow: "rgba(16, 185, 129, 0.3)",
    isDark: true
  },
  {
    id: 64,
    num: "64",
    folderName: "64_어도비_사운드_아키텍트_다크_그래파이트_콘솔_스타일",
    name: "어도비 사운드 아키텍트 다크 그래파이트 콘솔 스타일",
    enName: "Adobe Sound Architect Dark Graphite Console Style",
    bg: "#111318",
    surface: "#1A1D24",
    cardBg: "#151820",
    border: "rgba(14, 165, 233, 0.25)",
    borderHighlight: "#0EA5E9",
    text: "#F1F5F9",
    textSub: "#94A3B8",
    accent: "#0EA5E9", // Adobe Cyan Blue
    accentSub: "#EC4899", // Magenta Pink
    accentWarm: "#10B981", // Level Emerald
    btnClass: "btn-3d-cyan",
    badgeColor: "background: rgba(14, 165, 233, 0.12); color: #38BDF8; border: 1px solid rgba(14, 165, 233, 0.35);",
    tag: "ADOBE MASTERING CONSOLE",
    glow: "rgba(14, 165, 233, 0.3)",
    isDark: true
  },
  {
    id: 65,
    num: "65",
    folderName: "65_나노_제너레이티브_AI_뉴럴_사운드_랩_스타일",
    name: "나노 제너레이티브 AI 뉴럴 사운드 랩 스타일",
    enName: "Nano Generative AI Neural Sound Lab Style",
    bg: "#08070D",
    surface: "#131120",
    cardBg: "#0E0C18",
    border: "rgba(245, 158, 11, 0.25)",
    borderHighlight: "#F59E0B",
    text: "#EDE9FE",
    textSub: "#A78BFA",
    accent: "#F59E0B", // Generative Amber Gold
    accentSub: "#8B5CF6", // Hyper Violet
    accentWarm: "#06B6D4", // Quantum Cyan
    btnClass: "btn-3d-gold",
    badgeColor: "background: rgba(245, 158, 11, 0.12); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.35);",
    tag: "AI NEURAL SOUND LAB",
    glow: "rgba(245, 158, 11, 0.3)",
    isDark: true
  }
];

function getHtml(cIdx, vIdx) {
  const t = themes[cIdx];
  const viewTitles = ["메인 스튜디오 (Main Studio)", "정밀 믹싱 & 마스터링 (Detail)", "사용자 가이드 (Guide)", "설정 & 로그인 (Settings)"];

  // 3D 엠보싱 버튼 스타일
  const cssButtons = `
    .btn-3d-emerald {
      background: linear-gradient(180deg, #10B981 0%, #059669 100%);
      border: 1px solid #047857;
      box-shadow: 0 4px 0 #064E3B, 0 6px 14px rgba(16, 185, 129, 0.35);
      color: #ffffff;
      font-weight: 800;
      transition: all 0.15s ease;
    }
    .btn-3d-emerald:hover {
      transform: translateY(-1.5px);
      box-shadow: 0 5.5px 0 #064E3B, 0 8px 18px rgba(16, 185, 129, 0.45);
    }
    .btn-3d-cyan {
      background: linear-gradient(180deg, #0EA5E9 0%, #0284C7 100%);
      border: 1px solid #0369A1;
      box-shadow: 0 4px 0 #075985, 0 6px 14px rgba(14, 165, 233, 0.35);
      color: #ffffff;
      font-weight: 800;
      transition: all 0.15s ease;
    }
    .btn-3d-cyan:hover {
      transform: translateY(-1.5px);
      box-shadow: 0 5.5px 0 #075985, 0 8px 18px rgba(14, 165, 233, 0.45);
    }
    .btn-3d-gold {
      background: linear-gradient(180deg, #F59E0B 0%, #D97706 100%);
      border: 1px solid #B45309;
      box-shadow: 0 4px 0 #92400E, 0 6px 14px rgba(245, 158, 11, 0.35);
      color: #ffffff;
      font-weight: 800;
      transition: all 0.15s ease;
    }
    .btn-3d-gold:hover {
      transform: translateY(-1.5px);
      box-shadow: 0 5.5px 0 #92400E, 0 8px 18px rgba(245, 158, 11, 0.45);
    }
  `;

  // 헤더 컴포넌트
  const headerHtml = `
    <header style="background: ${t.surface}; border-bottom: 1px solid ${t.border}; padding: 14px 28px; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px ${t.glow};">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; font-weight: 900; color: ${t.text}; letter-spacing: -0.3px;">AI 무료음악 자동화</span>
            <span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; ${t.badgeColor}">${t.tag}</span>
            <span style="font-size: 11px; font-weight: 800; color: ${t.textSub}; background: ${t.surface}; padding: 2px 7px; border-radius: 6px; border: 1px solid ${t.border};">v1.28</span>
          </div>
          <div style="font-size: 12px; color: ${t.textSub}; margin-top: 2px;">내 PC 로컬 GPU 100% 무료 무제한 음악 & 24트랙 DAW 스튜디오</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 6px; background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; color: ${t.text};">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px #10B981;"></span>
          내 PC 엔진: <span style="color: ${t.accent}; font-weight: 800;">NVIDIA RTX 4090 (연결됨)</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button style="padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; border: 1px solid ${t.border}; background: ${t.cardBg}; color: ${t.text};">곡 만들기</button>
          <button style="padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; border: 1px solid ${t.border}; background: ${t.cardBg}; color: ${t.text};">작업 대기열 (0)</button>
          <button class="${t.btnClass}" style="padding: 7px 16px; border-radius: 8px; font-size: 12px; cursor: pointer;">새 곡 생성 ➔</button>
        </div>
      </div>
    </header>
  `;

  // 6단계 파이프라인 배너
  const pipelineBanner = `
    <div style="background: ${t.surface}; border-bottom: 1px solid ${t.border}; padding: 10px 28px; display: flex; align-items: center; justify-content: space-between; overflow-x: auto;">
      <div style="display: flex; align-items: center; gap: 24px; font-size: 12px; font-weight: 800;">
        <div style="display: flex; align-items: center; gap: 8px; color: ${t.accent}; border-bottom: 2px solid ${t.accent}; padding-bottom: 4px;">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: ${t.accent}; color: #000; display: flex; align-items: center; justify-content: center; font-size: 11px;">1</span>
          <span>곡 기획 & 스타일</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; color: ${t.textSub};">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: ${t.cardBg}; border: 1px solid ${t.border}; display: flex; align-items: center; justify-content: center; font-size: 11px;">2</span>
          <span>내 PC 로컬 엔진</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; color: ${t.textSub};">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: ${t.cardBg}; border: 1px solid ${t.border}; display: flex; align-items: center; justify-content: center; font-size: 11px;">3</span>
          <span>작업 대기열 (GPU)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; color: ${t.textSub};">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: ${t.cardBg}; border: 1px solid ${t.border}; display: flex; align-items: center; justify-content: center; font-size: 11px;">4</span>
          <span>24트랙 스템 믹싱</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; color: ${t.textSub};">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: ${t.cardBg}; border: 1px solid ${t.border}; display: flex; align-items: center; justify-content: center; font-size: 11px;">5</span>
          <span>AI 가사 & 마스터링</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; color: ${t.textSub};">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: ${t.cardBg}; border: 1px solid ${t.border}; display: flex; align-items: center; justify-content: center; font-size: 11px;">6</span>
          <span>4K 비주얼 비디오</span>
        </div>
      </div>
      <div style="font-size: 11px; color: ${t.textSub}; display: flex; align-items: center; gap: 10px;">
        <span style="background: rgba(16, 185, 129, 0.1); color: #10B981; padding: 3px 8px; border-radius: 4px; font-weight: 800;">GPU VRAM 24GB</span>
        <span style="background: rgba(245, 158, 11, 0.1); color: #F59E0B; padding: 3px 8px; border-radius: 4px; font-weight: 800;">무손실 FLAC 지원</span>
      </div>
    </div>
  `;

  // 뷰별 컨텐츠 생성
  let contentHtml = "";

  if (vIdx === 0) {
    // 01_main: 메인 스튜디오 대시보드
    contentHtml = `
      <div style="display: grid; grid-template-columns: 280px 1fr 340px; gap: 20px; padding: 24px; min-height: calc(100vh - 180px);">
        <!-- 좌측: 트랙 & 프리셋 패널 -->
        <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px; font-weight: 900; color: ${t.text};">음악 장르 프리셋 (43)</span>
            <span style="font-size: 11px; color: ${t.accent}; font-weight: 800;">전체보기 ➔</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: ${t.cardBg}; border: 1px solid ${t.borderHighlight}; padding: 10px; border-radius: 8px; cursor: pointer;">
              <div style="font-size: 11px; font-weight: 800; color: ${t.accent};">K-POP IDOL</div>
              <div style="font-size: 10px; color: ${t.textSub}; margin-top: 2px;">128 BPM · 청량 댄스</div>
            </div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; cursor: pointer;">
              <div style="font-size: 11px; font-weight: 800; color: ${t.text};">LO-FI CHILL</div>
              <div style="font-size: 10px; color: ${t.textSub}; margin-top: 2px;">82 BPM · 빈티지 비트</div>
            </div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; cursor: pointer;">
              <div style="font-size: 11px; font-weight: 800; color: ${t.text};">CINEMATIC</div>
              <div style="font-size: 10px; color: ${t.textSub}; margin-top: 2px;">90 BPM · 오케스트라</div>
            </div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; cursor: pointer;">
              <div style="font-size: 11px; font-weight: 800; color: ${t.text};">SYNTHWAVE</div>
              <div style="font-size: 10px; color: ${t.textSub}; margin-top: 2px;">115 BPM · 네온 레트로</div>
            </div>
          </div>

          <div style="border-top: 1px solid ${t.border}; padding-top: 14px;">
            <div style="font-size: 13px; font-weight: 900; color: ${t.text}; margin-bottom: 10px;">분위기 무드 태그 (최대 3개)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <span style="background: ${t.accent}; color: #000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px;">#에너제틱</span>
              <span style="background: ${t.accent}; color: #000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px;">#청량한</span>
              <span style="background: ${t.cardBg}; border: 1px solid ${t.border}; color: ${t.textSub}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">#몽환적</span>
              <span style="background: ${t.cardBg}; border: 1px solid ${t.border}; color: ${t.textSub}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">#어두운</span>
              <span style="background: ${t.cardBg}; border: 1px solid ${t.border}; color: ${t.textSub}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">#감성적인</span>
            </div>
          </div>

          <div style="border-top: 1px solid ${t.border}; padding-top: 14px;">
            <div style="font-size: 13px; font-weight: 900; color: ${t.text}; margin-bottom: 10px;">내 PC 로컬 사운드 엔진</div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 12px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; font-weight: 800; color: ${t.text};">
                <span>DiffRhythm 2.0 (상업용)</span>
                <span style="color: ${t.accent};">준비완료</span>
              </div>
              <div style="font-size: 11px; color: ${t.textSub}; margin-top: 4px;">한국어 보컬 완벽 발음 · 고속 가속</div>
            </div>
          </div>
        </div>

        <!-- 중앙: 곡 기획 & 실시간 파형 타임라인 -->
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <!-- 곡 기획 카드 -->
          <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 16px; padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <span style="font-size: 16px; font-weight: 900; color: ${t.text};">🎵 새 음악 작사 & 스타일 기획</span>
              <div style="display: flex; gap: 6px;">
                <button style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; color: ${t.accent};">AI 자동 작사</button>
                <button style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; color: ${t.text};">연주곡 모드 (Inst)</button>
              </div>
            </div>
            
            <div style="margin-bottom: 14px;">
              <label style="font-size: 12px; font-weight: 800; color: ${t.textSub}; display: block; margin-bottom: 6px;">곡 제목</label>
              <input type="text" value="Neon Summer High (여름밤의 질주)" style="width: 100%; background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 10px 14px; font-size: 14px; font-weight: 800; color: ${t.text}; outline: none;">
            </div>

            <div style="margin-bottom: 14px;">
              <label style="font-size: 12px; font-weight: 800; color: ${t.textSub}; display: block; margin-bottom: 6px;">사운드 스타일 & 프롬프트</label>
              <div style="width: 100%; background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: ${t.text}; line-height: 1.5;">
                k-pop idol energetic dance, sparkling synth lead, driving 808 bass, crisp percussion, euphoric female vocals, summer night highway drive vibe, 128 bpm, polished stereo master
              </div>
            </div>

            <!-- 파형 뷰파인더 덱 -->
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 12px; padding: 16px; margin-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: ${t.accent};"></span>
                  <span style="font-size: 12px; font-weight: 900; color: ${t.text};">실시간 24트랙 스테레오 오디오 파형</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: ${t.accent};">00:03:42 · 48kHz 24bit FLAC</div>
              </div>
              <div style="height: 64px; display: flex; align-items: center; gap: 2px;">
                ${Array.from({length: 80}).map((_, i) => {
                  const h = 15 + Math.sin(i * 0.3) * 35 + Math.cos(i * 0.7) * 15;
                  const isCurrent = i >= 30 && i <= 32;
                  return `<div style="flex: 1; height: ${Math.max(8, h)}%; background: ${isCurrent ? '#ffffff' : t.accent}; opacity: ${i < 30 ? '0.9' : '0.4'}; border-radius: 2px;"></div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- 우측: 생성 파라미터 & 3D 실행 버튼 -->
        <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 18px;">
          <div>
            <div style="font-size: 15px; font-weight: 900; color: ${t.text}; margin-bottom: 4px;">출력 음질 & 포맷</div>
            <div style="font-size: 12px; color: ${t.textSub};">스튜디오 스펙 마스터링 설정</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="background: ${t.cardBg}; border: 1px solid ${t.borderHighlight}; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; font-weight: 800; color: ${t.text};">무손실 FLAC (24bit)</div>
                <div style="font-size: 11px; color: ${t.textSub};">스튜디오 원음 규격</div>
              </div>
              <input type="radio" checked style="accent-color: ${t.accent};">
            </div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; font-weight: 800; color: ${t.text};">고음질 MP3 (320kbps)</div>
                <div style="font-size: 11px; color: ${t.textSub};">유튜브/웹 업로드 최적화</div>
              </div>
              <input type="radio" style="accent-color: ${t.accent};">
            </div>
          </div>

          <div style="border-top: 1px solid ${t.border}; padding-top: 14px;">
            <div style="font-size: 13px; font-weight: 900; color: ${t.text}; margin-bottom: 8px;">트랙 길이 설정</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              <button style="padding: 8px; background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 6px; font-size: 11px; font-weight: 800; color: ${t.textSub};">1분 (쇼츠)</button>
              <button style="padding: 8px; background: ${t.accent}; border: 1px solid ${t.accent}; border-radius: 6px; font-size: 11px; font-weight: 800; color: #000;">3분 (완곡)</button>
              <button style="padding: 8px; background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 6px; font-size: 11px; font-weight: 800; color: ${t.textSub};">5분 (확장)</button>
            </div>
          </div>

          <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
            <button class="${t.btnClass}" style="width: 100%; padding: 16px; border-radius: 12px; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>⚡ 내 PC에서 100% 무료 생성 시작</span>
            </button>
            <div style="font-size: 11px; text-align: center; color: ${t.textSub};">로컬 GPU 연산 · 서버 비용 0원 · 상업용 이용 가능</div>
          </div>
        </div>
      </div>
    `;
  } else if (vIdx === 1) {
    // 02_detail: 24트랙 믹싱 & 마스터링
    contentHtml = `
      <div style="padding: 24px; min-height: calc(100vh - 180px); display: flex; flex-direction: column; gap: 20px;">
        <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 16px; padding: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px; font-weight: 900; color: ${t.text};">Neon Summer High — 24트랙 멀티 스템(Stem) 분리</span>
                <span style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">STEMS ACTIVE</span>
              </div>
              <div style="font-size: 12px; color: ${t.textSub}; margin-top: 4px;">보컬, 드럼, 베이스, 신디사이저 개별 분리 편집 및 프로페셔널 EQ 조절</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button style="padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 800; border: 1px solid ${t.border}; background: ${t.cardBg}; color: ${t.text};">전체 솔로 (Solo)</button>
              <button class="${t.btnClass}" style="padding: 8px 18px; border-radius: 8px; font-size: 12px; cursor: pointer;">마스터링 음원 내보내기 ➔</button>
            </div>
          </div>

          <!-- 4대 스템 트랙 그리드 -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${[
              { name: "Vocal (메인 보컬 & 코러스)", vol: "85%", pan: "C", color: t.accent, mute: false },
              { name: "Drums (킥 & 스네어 & 하이햇)", vol: "92%", pan: "C", color: t.accentSub, mute: false },
              { name: "Bass (808 서브베이스)", vol: "88%", pan: "C", color: t.accentWarm, mute: false },
              { name: "Instruments (신스 리드 & 기타)", vol: "78%", pan: "L15", color: "#EC4899", mute: false }
            ].map((trk, idx) => `
              <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 10px; padding: 14px; display: grid; grid-template-columns: 220px 1fr 140px; align-items: center; gap: 16px;">
                <div>
                  <div style="font-size: 13px; font-weight: 900; color: ${t.text}; display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${trk.color};"></span>
                    ${trk.name}
                  </div>
                  <div style="font-size: 11px; color: ${t.textSub}; margin-top: 2px;">트랙 볼륨: ${trk.vol} · Pan: ${trk.pan}</div>
                </div>
                <!-- 트랙 파형 -->
                <div style="height: 38px; display: flex; align-items: center; gap: 2px; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 0 8px;">
                  ${Array.from({length: 60}).map((_, i) => {
                    const h = 20 + Math.sin(i * (0.2 + idx * 0.1)) * 30;
                    return `<div style="flex: 1; height: ${Math.max(10, h)}%; background: ${trk.color}; opacity: 0.8; border-radius: 1px;"></div>`;
                  }).join('')}
                </div>
                <!-- 조절 버튼 -->
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                  <button style="padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.text};">Mute</button>
                  <button style="padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; border: 1px solid ${trk.color}; background: rgba(0,0,0,0.3); color: ${trk.color};">Solo</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 하단 마스터링 인스펙터 -->
        <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 16px; padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="font-size: 14px; font-weight: 900; color: ${t.text}; margin-bottom: 6px;">스튜디오 라우드니스 (LUFS) 모니터링</div>
            <div style="font-size: 12px; color: ${t.textSub}; margin-bottom: 12px;">유튜브 & 스포티파이 스트리밍 최적 음압 (-14.0 LUFS) 자동 보정</div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11px; color: ${t.textSub};">현재 마스터 음압</span>
                <div style="font-size: 20px; font-weight: 900; color: ${t.accent};">-14.2 LUFS (이상적)</div>
              </div>
              <span style="background: rgba(16, 185, 129, 0.1); color: #10B981; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 4px;">NO CLIPPING</span>
            </div>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 900; color: ${t.text}; margin-bottom: 6px;">AI 가사 음소 타이밍 (LRC) 싱크</div>
            <div style="font-size: 12px; color: ${t.textSub}; margin-bottom: 12px;">음절 단위 정밀 타임코드 추출 및 자막 동기화</div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11px; color: ${t.textSub};">동기화 상태</span>
                <div style="font-size: 14px; font-weight: 900; color: ${t.text};">총 38개 소절 100% 일치</div>
              </div>
              <button style="padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.accent};">LRC 편집기 ➔</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (vIdx === 2) {
    // 03_guide: 연동 & 사용 가이드북
    contentHtml = `
      <div style="padding: 24px; min-height: calc(100vh - 180px); max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
        <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 16px; padding: 28px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span style="font-size: 20px; font-weight: 900; color: ${t.text};">📖 AI 무료음악 초보자 3단계 시작 가이드</span>
            <span style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px; ${t.badgeColor}">초보자 친화적 연동</span>
          </div>
          <div style="font-size: 13px; color: ${t.textSub};">외부 유료 API 결제 없이, 내 PC의 그래픽카드(NVIDIA/Apple)를 활용해 100% 무료로 무제한 음악을 생성하는 공식 가이드입니다.</div>
        </div>

        <!-- 3단계 가이드 카드 -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 14px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: ${t.accent}; color: #000; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center;">1</span>
              <span style="font-size: 15px; font-weight: 900; color: ${t.text};">PC 사양 자동 진단</span>
            </div>
            <div style="font-size: 12px; color: ${t.textSub}; line-height: 1.5; margin-bottom: 12px;">
              프로그램이 사용자의 그래픽카드(VRAM 8GB 이상 권장)를 1초 만에 감지하고 최적의 DiffRhythm / YuE 엔진을 지정합니다.
            </div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; font-size: 11px; font-weight: 800; color: ${t.accent};">
              ✓ NVIDIA RTX 또는 M1/M2/M3 맥 지원
            </div>
          </div>

          <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 14px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: ${t.accent}; color: #000; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center;">2</span>
              <span style="font-size: 15px; font-weight: 900; color: ${t.text};">원클릭 엔진 인스톨러</span>
            </div>
            <div style="font-size: 12px; color: ${t.textSub}; line-height: 1.5; margin-bottom: 12px;">
              복잡한 파이썬이나 모델 다운로드 필요 없이, 「원클릭 엔진 설치」 버튼 하나로 모든 구동 파일이 자동 세팅됩니다.
            </div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; font-size: 11px; font-weight: 800; color: ${t.accent};">
              ✓ 원클릭 백그라운드 무인 설치
            </div>
          </div>

          <div style="background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 14px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: ${t.accent}; color: #000; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center;">3</span>
              <span style="font-size: 15px; font-weight: 900; color: ${t.text};">무제한 무료 생성 & 발행</span>
            </div>
            <div style="font-size: 12px; color: ${t.textSub}; line-height: 1.5; margin-bottom: 12px;">
              원하는 장르와 가사를 넣고 생성 버튼을 누르면 내 PC에서 1~2분 만에 최고음질 음원이 완성되어 즉시 내려받을 수 있습니다.
            </div>
            <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; padding: 10px; border-radius: 8px; font-size: 11px; font-weight: 800; color: ${t.accent};">
              ✓ 비용 0원 · 상업용 음원 자유 배포
            </div>
          </div>
        </div>

        <!-- 주의사항 및 라이선스 고지 -->
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 18px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 900; color: #F59E0B; margin-bottom: 6px;">
            <span>⚠️ 상업용 / 비상업용 엔진 구분 안내</span>
          </div>
          <div style="font-size: 12px; color: ${t.text}; line-height: 1.6;">
            • <b>DiffRhythm 2.0 엔진</b>: 완전 상업용 라이선스로 유튜브 수익 창출, 광고, 음원 발매가 모두 자유롭습니다.<br>
            • <b>YuE 2.0 비상업용 엔진</b>: 학술·개인 청취용으로 분류되어 상업적 배포가 제한되므로 생성 시 뱃지를 확인하시기 바랍니다.
          </div>
        </div>
      </div>
    `;
  } else if (vIdx === 3) {
    // 04_settings: 설정 및 2026-11-01 5단계 로그인 폼
    contentHtml = `
      <div style="padding: 24px; min-height: calc(100vh - 180px); display: flex; align-items: center; justify-content: center;">
        <div style="width: 100%; max-width: 440px; display: flex; flex-direction: column; align-items: center;">
          <!-- 1. [맨 위] 프로그램 고유 로고 -->
          <div style="width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, ${t.accent}, ${t.accentSub}); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 24px ${t.glow}; margin-bottom: 14px;">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          </div>

          <!-- 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) -->
          <div style="padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; ${t.badgeColor}">
            • AIMASTER FREE MUSIC OPS
          </div>

          <!-- 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 -->
          <div style="font-size: 24px; font-weight: 900; color: ${t.text}; margin-bottom: 4px; text-align: center;">
            AI 무료음악 자동화 <span style="font-size: 13px; font-weight: 800; color: ${t.accent};">v1.28</span>
          </div>
          <div style="font-size: 13px; color: ${t.textSub}; margin-bottom: 24px; text-align: center;">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </div>

          <!-- 4. [중앙] 로그인/회원가입 폼 카드 -->
          <div style="width: 100%; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
            <!-- 2단 탭 세그먼트 -->
            <div style="display: flex; background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 10px; padding: 4px; margin-bottom: 18px;">
              <button style="flex: 1; padding: 8px; border-radius: 7px; font-size: 12px; font-weight: 800; border: none; background: ${t.accent}; color: #000000; cursor: pointer;">➔] 로그인</button>
              <button style="flex: 1; padding: 8px; border-radius: 7px; font-size: 12px; font-weight: 700; border: none; background: transparent; color: ${t.textSub}; cursor: pointer;">👤+ 회원가입</button>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="font-size: 12px; font-weight: 800; color: ${t.text}; display: block; margin-bottom: 6px;">이메일 주소</label>
              <input type="email" value="producer@buylife.xyz" style="width: 100%; background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: ${t.text}; outline: none;">
            </div>

            <div style="margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 12px; font-weight: 800; color: ${t.text};">비밀번호</label>
                <span style="font-size: 11px; color: ${t.accent}; font-weight: 700; cursor: pointer;">비밀번호 찾기?</span>
              </div>
              <input type="password" value="••••••••••••" style="width: 100%; background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: ${t.text}; outline: none;">
            </div>

            <!-- 3D 엠보싱 실행 버튼 -->
            <button class="${t.btnClass}" style="width: 100%; padding: 14px; border-radius: 10px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>로그인 ➔</span>
            </button>
          </div>

          <!-- 5. [맨 아래] 약관 문구 1행 축소 처리 -->
          <div style="font-size: 11px; color: ${t.textSub}; margin-top: 18px; text-align: center; white-space: nowrap;">
            진행 시 <a href="#" style="color: ${t.text}; text-decoration: underline;">이용약관</a> 및 <a href="#" style="color: ${t.text}; text-decoration: underline;">개인정보 처리방침</a>에 동의합니다.
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
      <title>${t.name} - ${viewTitles[vIdx]}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif; }
        body { background: ${t.bg}; color: ${t.text}; min-height: 100vh; overflow-x: hidden; }
        ${cssButtons}
      </style>
    </head>
    <body>
      ${headerHtml}
      ${vIdx === 0 ? pipelineBanner : ''}
      ${contentHtml}
    </body>
    </html>
  `;
}

async function main() {
  console.log("Starting 12-views render for free-music-studio...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const viewNames = ["01_main", "02_detail", "03_guide", "04_settings"];
  const baseDesignDir = "D:/Antigravity/Design";

  for (let c = 0; c < 3; c++) {
    const t = themes[c];
    const targetFolder = path.join(baseDesignDir, t.folderName);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    console.log(`\nRendering Concept ${c + 1}: ${t.name} (${targetFolder})`);

    for (let v = 0; v < 4; v++) {
      const vName = viewNames[v];
      const htmlContent = getHtml(c, v);
      const tempHtmlPath = path.join(__dirname, `temp_fms_${c}_${v}.html`);
      fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

      await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const outPng = path.join(targetFolder, `${vName}.png`);
      await page.screenshot({ path: outPng, fullPage: false });
      console.log(`  ✓ Saved ${vName}.png`);

      fs.unlinkSync(tempHtmlPath);
    }

    // 템플릿별 독립 README.md 작성
    const readmeContent = `# ${t.name} (${t.enName})

> **템플릿 번호**: ${t.id}번  
> **공식 명칭**: ${t.name}  
> **영문 명칭**: ${t.enName}  
> **적용/후보 프로그램**: \`free-music-studio\` (AI 무료음악 자동화)

---

## 1. 톤앤매너 및 디자인 철학

- **배경색**: \`${t.bg}\` (다크 옵시디언 톤)
- **카드/서피스**: \`${t.surface}\` & \`${t.cardBg}\`
- **시그니처 포인트 컬러**: \`${t.accent}\` (메인 액센트), \`${t.accentSub}\` (보조 네온), \`${t.accentWarm}\` (앰버 골드)
- **3D 엠보싱 버튼**: \`.${t.btnClass}\`

---

## 2. 4대 핵심 화면 캡처

1. \`01_main.png\`: 6단계 파이프라인 인디케이터 배너, 24트랙 스테레오 파형 뷰파인더 덱, 실시간 로컬 PC GPU 연결
2. \`02_detail.png\`: 24트랙 멀티 스템(Stem) 분리 믹서, 음절 단위 LRC 타이밍 싱크, -14.0 LUFS 마스터링
3. \`03_guide.png\`: 내 PC 로컬 엔진 원클릭 설치 3단계 가이드북, 상업용/비상업용 라이선스 고지
4. \`04_settings.png\`: 2026-11-01 5단계 수직 레이아웃 표준 규격 로그인 폼 & 1행 축소 약관

---

## 3. 검증 상태
- 1440px 고해상도 캡처 4종 생성 및 영구 아카이빙 완료
`;
    fs.writeFileSync(path.join(targetFolder, 'README.md'), readmeContent, 'utf8');
    console.log(`  ✓ Saved README.md for ${t.folderName}`);
  }

  await browser.close();
  console.log("\nALL 12 VIEWS AND ASSETS CAPTURED SUCCESSFULLY!");
}

main().catch(err => {
  console.error("Error during rendering:", err);
  process.exit(1);
});
