import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '62_nano_neural_art_canvas_lab/banana-canvas'),
  2: path.join(BASE_DIR, '68_creative_atelier_paper_pop/banana-canvas'),
  3: path.join(BASE_DIR, '69_cyberpunk_neon_pixel_studio/banana-canvas'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 템플릿 생성
function buildViewHtml(cNum, sNum) {
  // cNum: 1 (시안1), 2 (시안2), 3 (시안3)
  // sNum: 1 (Main), 2 (Detail), 3 (Guide), 4 (Settings/Login)

  // 시안별 CSS 테마 변수 및 클래스
  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = '';

  if (cNum === 1) {
    // 62. 나노 뉴럴 아트 캔버스 랩 스타일
    themeCss = `
      --bg: #0B0E14;
      --card: #121722;
      --card2: #1A2130;
      --border: #232D42;
      --text: #F1F5F9;
      --muted: #94A3B8;
      --brand: #F59E0B;
      --brand-hover: #D97706;
      --accent: #10B981;
      --cyan: #06B6D4;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(245,158,11,0.15); color:#F59E0B; border:1px solid rgba(245,158,11,0.3);">⚡ NANO NEURAL ART LAB</span>`;
    btnClass = 'btn-3d-gold';
    brandName = '나노 뉴럴 아트 캔버스 랩';
  } else if (cNum === 2) {
    // 68. 크리에이티브 아뜰리에 페이퍼 팝 스타일
    themeCss = `
      --bg: #FAF8F5;
      --card: #FFFFFF;
      --card2: #F3EFEA;
      --border: #E5DFD7;
      --text: #1C1917;
      --muted: #78716C;
      --brand: #EAB308;
      --brand-hover: #CA8A04;
      --accent: #F43F5E;
      --cyan: #0284C7;
      font-family: "Pretendard Variable", -apple-system, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:#FEF3C7; color:#B45309; border:1px solid #FDE68A;">🎨 PAPER POP ATELIER</span>`;
    btnClass = 'btn-3d-pop';
    brandName = '크리에이티브 아뜰리에 페이퍼 팝';
  } else {
    // 69. 사이버펑크 네온 픽셀 스튜디오 스타일
    themeCss = `
      --bg: #050508;
      --card: #0D0D14;
      --card2: #151522;
      --border: #222238;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #FACC15;
      --brand-hover: #EAB308;
      --accent: #EC4899;
      --cyan: #06B6D4;
      font-family: "Pretendard Variable", monospace, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(250,204,21,0.15); color:#FACC15; border:1px solid rgba(250,204,21,0.3); font-family:monospace;">👾 CYBERPUNK NEON PIXEL</span>`;
    btnClass = 'btn-3d-neon';
    brandName = '사이버펑크 네온 픽셀 스튜디오';
  }

  // 화면별 본문 구성
  let contentHtml = '';

  if (sNum === 1) {
    // 01_main: 스튜디오 작업실
    contentHtml = `
      <!-- 4단계 파이프라인 배너 -->
      <div class="pipeline-banner">
        <div class="step done"><span>✔</span> 01. 캔버스 프롬프트 기획</div>
        <div class="arrow">➔</div>
        <div class="step active"><span>02</span> 02. 뉴럴 마스크 인페인팅</div>
        <div class="arrow">➔</div>
        <div class="step"><span>03</span> 03. 4K LoRA 디퓨전</div>
        <div class="arrow">➔</div>
        <div class="step"><span>04</span> 04. 무손실 마스터 출력</div>
      </div>

      <!-- 퀵 칩 띠 -->
      <div class="nav-chips">
        <span class="chip on">🖼️ 원본 캔버스</span>
        <span class="chip">✨ AI 신규 생성</span>
        <span class="chip">⚡ 빠른 인페인팅</span>
        <span class="chip">🎞️ 8컷 스토리보드</span>
        <span class="chip">🛠️ 정밀 복원·업스케일</span>
        <span class="chip">🧩 5장 멀티 합성</span>
        <span class="chip">🌟 4K 렌더 뷰어</span>
      </div>

      <!-- 메인 3열 작업 덱 -->
      <div class="studio-grid">
        <!-- 1열: 원본 업로드 & 모델 설정 -->
        <div class="panel">
          <div class="panel-head">
            <h3>📥 01. 원본 & 프롬프트 덱</h3>
            ${themeBadge}
          </div>
          <div class="dropzone">
            <div class="drop-icon">🍌</div>
            <strong style="font-size:14px; margin-bottom:4px;">사진 또는 스케치를 드래그하세요</strong>
            <p style="font-size:11px; color:var(--muted); margin:0;">JPG, PNG, WEBP 최대 15MB 지원 (ChromaKey 자동 누끼)</p>
          </div>
          <div style="margin-top:14px;">
            <label style="font-size:12px; font-weight:700; color:var(--text); display:block; margin-bottom:6px;">✨ 멀티모달 AI 엔진 선택</label>
            <select class="styled-select">
              <option>Gemini Nano Banana 2.1 (초고속 멀티모달 디퓨전 · 추천)</option>
              <option>Gemini 3 Pro Image (4K 초고해상도 전문가용)</option>
              <option>Gemini 2.5 Flash Image (실시간 스케치 렌더링)</option>
            </select>
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:12px; font-weight:700; color:var(--text); display:block; margin-bottom:6px;">💬 생성 및 변환 프롬프트</label>
            <textarea class="styled-textarea" placeholder="생성하거나 수정할 이미지의 분위기, 화풍, 조명, 디테일을 입력하세요... (예: 사이버펑크 네온 거리에서 우주복을 입은 귀여운 바나나 마스코트)"></textarea>
          </div>
        </div>

        <!-- 2열: 캔버스 작업대 & 마스크 에디터 -->
        <div class="panel">
          <div class="panel-head">
            <h3>🎨 02. 인터랙티브 캔버스 워크벤치</h3>
            <span class="tag" style="background:rgba(16,185,129,0.15); color:var(--accent); border:1px solid var(--accent); padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">LIVE 60 FPS</span>
          </div>
          <div class="canvas-viewport">
            <div class="canvas-mockup">
              <div class="canvas-img-box">
                <div class="art-layer">
                  <div class="banana-hero-art"></div>
                  <div class="mask-selection-box"></div>
                </div>
              </div>
              <div class="canvas-hud-overlay">
                <div class="hud-item">📐 1024 × 1024 PX</div>
                <div class="hud-item">🔍 100% 뷰</div>
                <div class="hud-item">🖌 브러시 45px</div>
                <div class="hud-item">⚡ GPU 가속 활성</div>
              </div>
            </div>
          </div>
          <div class="toolbar-row">
            <button class="tool-btn on">🖌 브러시</button>
            <button class="tool-btn">🧽 마스크 지우개</button>
            <button class="tool-btn">✂ 지능형 누끼</button>
            <button class="tool-btn">🪄 매직 원드</button>
            <button class="tool-btn">🔄 영역 반전</button>
            <button class="tool-btn">✨ 4K 업스케일</button>
          </div>
        </div>

        <!-- 3열: 20종 스타일 프리셋 & 최종 렌더링 덱 -->
        <div class="panel">
          <div class="panel-head">
            <h3>🌟 03. 스타일 프리셋 & 실행</h3>
            <span style="font-size:11px; color:var(--muted);">20종 탑재</span>
          </div>
          <div class="preset-grid">
            <div class="p-card on"><b>🍌 바나나 팝</b><small>비비드 네온 팝아트</small></div>
            <div class="p-card"><b>🎞 시네마틱 4K</b><small>35mm 아나모픽 룩</small></div>
            <div class="p-card"><b>🎨 수채화 아틀리에</b><small>부드러운 워터컬러</small></div>
            <div class="p-card"><b>👾 픽셀 레트로</b><small>16비트 레트로 콘솔</small></div>
            <div class="p-card"><b>🏢 3D 평면도</b><small>아이소메트릭 렌더</small></div>
            <div class="p-card"><b>📸 비즈니스 프로필</b><small>스튜디오 증명인화</small></div>
          </div>

          <div style="margin-top:20px; padding:14px; background:var(--card2); border:1px solid var(--border); border-radius:12px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:8px;">
              <span style="color:var(--muted);">연산 소요 예상</span>
              <strong style="color:var(--text);">약 3.8초 (Flash 2.1)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px;">
              <span style="color:var(--muted);">출력 해상도</span>
              <strong style="color:var(--brand);">2048 × 2048 UHD</strong>
            </div>
          </div>

          <button class="btn-3d ${btnClass}" style="width:100%; height:52px; font-size:15px; margin-top:16px;">
            ⚡ 나노바나나 고화질 캔버스 생성 (1클릭) ➔
          </button>
        </div>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: 인페인팅 정밀 마스크 & 무료 도구 덱
    contentHtml = `
      <div class="page-header-row">
        <div>
          <span style="font-size:11px; font-weight:800; color:var(--brand); text-transform:uppercase; letter-spacing:0.5px;">PRECISION INPAINTING & TOOLS</span>
          <h2 style="font-size:22px; font-weight:900; color:var(--text); margin:4px 0;">정밀 인페인팅 & 무료 이미지 도구 콘솔</h2>
          <p style="font-size:13px; color:var(--muted); margin:0;">브러시 마스킹 영역만 정밀하게 재합성하거나 U²-Net 초경량 누끼·얼굴가리기를 실행합니다.</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-outline">↩ 이전 결과 되돌리기</button>
          <button class="btn-3d ${btnClass}" style="height:40px; padding:0 20px;">⚡ 부분 수정 즉시 렌더링 ➔</button>
        </div>
      </div>

      <div class="detail-grid">
        <!-- 좌측: 정밀 뷰파인더 덱 -->
        <div class="panel" style="flex:1.4;">
          <div class="panel-head">
            <h3>🔬 고정밀 듀얼 뷰파인더 덱 (Before vs After)</h3>
            <div class="ratio-chips">
              <span class="r-chip on">1:1 정사각형</span>
              <span class="r-chip">16:9 가로 화보</span>
              <span class="r-chip">9:16 모바일 숏폼</span>
              <span class="r-chip">4:5 인스타 피드</span>
            </div>
          </div>

          <div class="compare-viewport">
            <div class="compare-box">
              <div class="compare-before">
                <div class="watermark-tag">ORIGINAL SOURCE</div>
              </div>
              <div class="compare-divider" style="left:54%;">
                <div class="divider-handle">↔</div>
              </div>
              <div class="compare-after">
                <div class="watermark-tag right">AI NEURAL INPAINTED (UHD)</div>
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding:0 6px;">
            <div style="font-size:12px; color:var(--muted);">
              좌우 슬라이더를 드래그하여 원본과 AI 인페인팅 결과를 1:1 픽셀 매칭으로 정밀 비교하세요.
            </div>
            <div style="display:flex; gap:8px;">
              <button class="small-tool-btn">🔍 200% 확대</button>
              <button class="small-tool-btn">📐 피팅 가이드</button>
              <button class="small-tool-btn">💾 4K 무손실 PNG 저장</button>
            </div>
          </div>
        </div>

        <!-- 우측: 브러시 & 지능형 편집 파라미터 -->
        <div class="panel" style="flex:1;">
          <div class="panel-head">
            <h3>🧰 브러시 & 지능형 툴셋</h3>
            ${themeBadge}
          </div>

          <div class="control-box">
            <label>🖌 마스크 브러시 반경 (Radius)</label>
            <div class="range-row">
              <input type="range" min="5" max="150" value="45" style="flex:1; accent-color:var(--brand);" />
              <span class="val-badge">45 px</span>
            </div>
          </div>

          <div class="control-box">
            <label>🌫 페더링 및 경계 부드러움 (Feathering)</label>
            <div class="range-row">
              <input type="range" min="0" max="50" value="12" style="flex:1; accent-color:var(--brand);" />
              <span class="val-badge">12 px</span>
            </div>
          </div>

          <div class="control-box">
            <label>🎯 인페인팅 디테일 강도 (Denoising Strength)</label>
            <div class="range-row">
              <input type="range" min="0.1" max="1.0" step="0.05" value="0.75" style="flex:1; accent-color:var(--brand);" />
              <span class="val-badge">0.75</span>
            </div>
          </div>

          <div style="margin-top:18px;">
            <h4 style="font-size:13px; font-weight:800; color:var(--text); margin-bottom:8px;">✂ 무료 고속 도구 (서버 전송 없음 · 100% 로컬)</h4>
            <div class="free-tools-list">
              <div class="ft-card">
                <div><strong>✂ U²-Net 원클릭 배경 제거</strong><small style="display:block; color:var(--muted);">투명 알파 크로마키 자동 추출</small></div>
                <button class="mini-btn">실행</button>
              </div>
              <div class="ft-card">
                <div><strong>🙈 UltraFace 안면 자동 가리기</strong><small style="display:block; color:var(--muted);">모자이크/블러/블랙 프레임</small></div>
                <button class="mini-btn">실행</button>
              </div>
              <div class="ft-card">
                <div><strong>▦ 2~16분할 사진 조각 나누기</strong><small style="display:block; color:var(--muted);">인스타 캐러셀용 그리드 분할</small></div>
                <button class="mini-btn">실행</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: 비주얼 연동 & 사용 매뉴얼
    contentHtml = `
      <div class="guide-hero-card">
        <div class="mascot-avatar">🍌</div>
        <div class="hero-bubble">
          <strong>반가워요! AI 바나나 캔버스 작업실에 오신 것을 환영합니다!</strong>
          단 한 장의 사진이나 텍스트 아이디어만으로 고화질 이미지 생성, 정밀 부분 수정(인페인팅), 배경 제거, 8컷 스토리까지 브라우저 한 화면에서 완성할 수 있습니다. 처음 이용하신다면 아래 3단계 안내를 확인해 주세요!
        </div>
      </div>

      <!-- 목차 바로가기 -->
      <div class="toc-bar">
        <strong>빠른 바로가기:</strong>
        <a href="#step1">① Gemini API 키 등록 (최초 1회)</a>
        <a href="#step2">② 3분 캔버스 워크플로우</a>
        <a href="#step3">③ 20종 화풍 프리셋 가이드</a>
        <a href="#step4">④ 자주 묻는 질문 (FAQ)</a>
      </div>

      <!-- 본문 섹션 -->
      <div class="guide-sections-grid">
        <div class="panel">
          <h3 style="font-size:16px; font-weight:800; color:var(--text); margin-bottom:12px;">🚀 3분 캔버스 퀵 스타트 파이프라인</h3>
          <div class="guide-steps-list">
            <div class="g-step">
              <div class="g-num">1</div>
              <div>
                <strong>원본 이미지 업로드 또는 프롬프트 입력</strong>
                <p>작업대에 사진을 올리거나, 원하는 장면을 텍스트로 자유롭게 묘사합니다. 스케치 원본도 지원됩니다.</p>
              </div>
            </div>
            <div class="g-step">
              <div class="g-num">2</div>
              <div>
                <strong>마스크 브러시로 수정할 영역 지정 (선택)</strong>
                <p>배경을 바꾸거나 특정 사물, 옷, 헤어스타일만 변경하고 싶다면 캔버스 위에서 브러시로 쓱 칠해줍니다.</p>
              </div>
            </div>
            <div class="g-step">
              <div class="g-num">3</div>
              <div>
                <strong>20종 화풍 프리셋 선택 후 [생성] 클릭</strong>
                <p>바나나 팝, 시네마틱 4K, 수채화, 픽셀아트 등 원하는 프리셋을 선택하고 3D 엠보싱 버튼을 누르면 3.8초 만에 완성!</p>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3 style="font-size:16px; font-weight:800; color:var(--text); margin-bottom:12px;">💡 잘 나오는 프롬프트 & 사진 팁</h3>
          <div class="dodont-grid">
            <div class="do-box">
              <h4 style="color:#10B981; margin:0 0 8px;">⭕ 추천하는 방법</h4>
              <ul>
                <li>선명하고 조명이 밝은 원본 사진을 사용하세요.</li>
                <li>원하는 스타일(예: 35mm 영화 필름 톤, 광각 렌즈)을 명시하세요.</li>
                <li>바꾸고 싶은 영역만 브러시로 정확히 칠하면 성공률 100%!</li>
              </ul>
            </div>
            <div class="dont-box">
              <h4 style="color:#EF4444; margin:0 0 8px;">❌ 피해야 할 방법</h4>
              <ul>
                <li>너무 어둡거나 흔들려 형태가 뭉개진 사진</li>
                <li>상반된 프롬프트 동시 입력 (예: '수채화이면서 실사 사진')</li>
                <li>브러시 영역을 너무 작게 점만 찍는 경우</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // 04_settings: API 키 등록 & 5단계 표준 로그인 폼
    contentHtml = `
      <div class="settings-auth-grid">
        <!-- 좌측: 2026-11-01 5단계 수직 레이아웃 표준 규격 로그인 폼 -->
        <div class="auth-standard-card">
          <!-- 1단계: 64px 프로그램 고유 심볼 로고 -->
          <div class="auth-logo-badge">🍌</div>

          <!-- 2단계: 프로그램 영문명 알약 캡슐 뱃지 -->
          <div class="auth-capsule-chip">• AIMASTER BANANA CANVAS</div>

          <!-- 3단계: 프로그램 한글명 볼드 메인 타이틀 & 서브 카피 -->
          <h2 class="auth-title">AI 바나나 캔버스 <span style="color:var(--brand); font-size:14px; font-weight:800;">v1.44</span></h2>
          <p class="auth-sub">AIMaster 통합 계정(이메일·비밀번호)으로 로그인하세요.</p>

          <!-- 4단계: max-w-[440px] 2단 탭 폼 카드 & 3D 엠보싱 실행 버튼 -->
          <div class="auth-tabs">
            <button class="tab-btn on">로그인</button>
            <button class="tab-btn">회원가입</button>
          </div>

          <div style="width:100%; text-align:left; margin-bottom:12px;">
            <label style="font-size:12px; font-weight:700; color:var(--text); display:block; margin-bottom:4px;">이메일 주소</label>
            <input type="email" class="styled-input" value="buylifemall@naver.com" />
          </div>

          <div style="width:100%; text-align:left; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label style="font-size:12px; font-weight:700; color:var(--text);">비밀번호</label>
              <a href="#" style="font-size:11px; color:var(--muted); text-decoration:underline;">비밀번호 찾기?</a>
            </div>
            <input type="password" class="styled-input" value="••••••••••••" />
          </div>

          <button class="btn-3d ${btnClass}" style="width:100%; height:46px; font-size:14px;">
            바나나 캔버스 스튜디오 입장 ➔
          </button>

          <!-- 5단계: 약관 문구 1행 축소 처리 (필수 규격) -->
          <div class="auth-1line-terms">
            진행 시 <a href="#">이용약관</a> 및 <a href="#">개인정보 처리방침</a>에 동의합니다.
          </div>
        </div>

        <!-- 우측: Gemini API 키 안전 등록 및 계정 관리 카드 -->
        <div class="panel" style="flex:1;">
          <div class="panel-head">
            <h3>🔑 Google Gemini API 키 등록 (본인 키 전용)</h3>
            <span class="tag" style="background:rgba(16,185,129,0.15); color:var(--accent); border:1px solid var(--accent); padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">연결 완료</span>
          </div>

          <div style="padding:16px; background:var(--card2); border:1px solid var(--border); border-radius:12px; margin-bottom:16px;">
            <p style="font-size:13px; color:var(--text); line-height:1.6; margin:0 0 10px;">
              AI 바나나 캔버스는 <b>회원님 본인의 Google Gemini API 키</b>로 안전하게 구동됩니다.<br />
              운영자나 타인의 키로 대신 호출되지 않으며, 브라우저와 Supabase Vault를 통해 안전하게 암호화 보관됩니다.
            </p>
            <div style="display:flex; gap:10px; align-items:center;">
              <input type="password" class="styled-input" value="AIzaSyD-sample-encrypted-key-xxxxxxxxxxxx" style="flex:1;" />
              <button class="btn-outline">연결 검증</button>
            </div>
          </div>

          <h4 style="font-size:13px; font-weight:800; color:var(--text); margin-bottom:8px;">📊 모델별 생성 비용 및 쿼터 안내</h4>
          <div class="quota-table">
            <div class="q-row head">
              <span>모델명</span>
              <span>특징 & 용도</span>
              <span>비용 (본인 키 기준)</span>
            </div>
            <div class="q-row">
              <strong>Gemini Nano Banana 2.1</strong>
              <span>초고속 멀티모달 디퓨전 · 캔버스 인페인팅</span>
              <span style="color:#10B981;">무료 쿼터 적용</span>
            </div>
            <div class="q-row">
              <strong>Gemini 3 Pro Image</strong>
              <span>4K 초고해상도 전문가용 렌더링</span>
              <span style="color:var(--brand);">Pro 표준 단가</span>
            </div>
            <div class="q-row">
              <strong>Gemini 2.5 Flash Image</strong>
              <span>빠른 프로토타이핑 & 스케치 프리뷰</span>
              <span style="color:#10B981;">초경량 단가</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 1440px 고해상도 독립 카드 레이아웃
  return `
    <div id="view-${cNum}-${sNum}" class="preview-canvas-wrapper theme-${cNum}">
      <style>
        .theme-${cNum} {
          ${themeCss}
        }
        .theme-${cNum} {
          width: 1440px;
          min-height: 900px;
          background: var(--bg);
          color: var(--text);
          box-sizing: border-box;
          padding: 24px 32px;
          position: relative;
        }
        .theme-${cNum} * { box-sizing: border-box; }
        
        /* 공통 헤더 */
        .theme-${cNum} .app-nav-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }
        .theme-${cNum} .app-brand-lockup {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .theme-${cNum} .app-logo-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--brand), #D97706);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 12px rgba(245,158,11,0.25);
        }
        .theme-${cNum} .app-title-group h1 {
          font-size: 17px;
          font-weight: 900;
          color: var(--text);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .theme-${cNum} .app-title-group small {
          font-size: 11px;
          color: var(--muted);
          font-weight: 500;
        }

        /* 4단계 파이프라인 배너 */
        .theme-${cNum} .pipeline-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .theme-${cNum} .pipeline-banner .step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          padding: 4px 10px;
          border-radius: 8px;
        }
        .theme-${cNum} .pipeline-banner .step.active {
          color: var(--text);
          background: var(--card2);
          border: 1px solid var(--border);
        }
        .theme-${cNum} .pipeline-banner .step.done {
          color: var(--accent);
        }
        .theme-${cNum} .pipeline-banner .step span {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }
        .theme-${cNum} .pipeline-banner .step.done span {
          background: var(--accent);
          color: #000;
        }
        .theme-${cNum} .pipeline-banner .arrow {
          color: var(--muted);
          font-size: 12px;
        }

        /* 칩 띠 */
        .theme-${cNum} .nav-chips {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
          overflow-x: auto;
        }
        .theme-${cNum} .nav-chips .chip {
          padding: 6px 14px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          white-space: nowrap;
        }
        .theme-${cNum} .nav-chips .chip.on {
          background: rgba(245,158,11,0.15);
          color: var(--brand);
          border-color: var(--brand);
        }

        /* 3열 그리드 */
        .theme-${cNum} .studio-grid {
          display: grid;
          grid-template-columns: 340px 1fr 340px;
          gap: 18px;
          align-items: start;
        }
        .theme-${cNum} .panel {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          min-width: 0;
        }
        .theme-${cNum} .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .theme-${cNum} .panel-head h3 {
          font-size: 14px;
          font-weight: 800;
          color: var(--text);
          margin: 0;
        }

        /* 드롭존 */
        .theme-${cNum} .dropzone {
          border: 2px dashed var(--border);
          border-radius: 12px;
          padding: 28px 16px;
          text-align: center;
          background: var(--card2);
          cursor: pointer;
        }
        .theme-${cNum} .drop-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        /* 인풋들 */
        .theme-${cNum} .styled-select, .theme-${cNum} .styled-input, .theme-${cNum} .styled-textarea {
          width: 100%;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          padding: 10px 12px;
          font-size: 13px;
        }
        .theme-${cNum} .styled-textarea {
          height: 110px;
          resize: none;
          line-height: 1.5;
        }

        /* 캔버스 뷰포트 */
        .theme-${cNum} .canvas-viewport {
          background: #000;
          border: 1px solid var(--border);
          border-radius: 12px;
          height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .theme-${cNum} .canvas-mockup {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .theme-${cNum} .art-layer {
          width: 380px;
          height: 380px;
          background: radial-gradient(circle at 40% 40%, #F59E0B 0%, #1A1D24 70%);
          border-radius: 8px;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          overflow: hidden;
        }
        .theme-${cNum} .banana-hero-art {
          width: 100%;
          height: 100%;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 100 100"><text x="50" y="60" font-size="50" text-anchor="middle">🍌</text></svg>');
          background-repeat: no-repeat;
          background-position: center;
        }
        .theme-${cNum} .mask-selection-box {
          position: absolute;
          top: 30%;
          left: 30%;
          width: 40%;
          height: 40%;
          border: 2px dashed #06B6D4;
          background: rgba(6,182,212,0.25);
          border-radius: 8px;
        }
        .theme-${cNum} .canvas-hud-overlay {
          position: absolute;
          bottom: 12px;
          left: 14px;
          display: flex;
          gap: 8px;
        }
        .theme-${cNum} .hud-item {
          padding: 4px 10px;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #FFF;
        }
        .theme-${cNum} .toolbar-row {
          display: flex;
          gap: 6px;
          margin-top: 12px;
        }
        .theme-${cNum} .tool-btn {
          flex: 1;
          padding: 8px 6px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
          cursor: pointer;
        }
        .theme-${cNum} .tool-btn.on {
          background: rgba(245,158,11,0.2);
          border-color: var(--brand);
          color: var(--brand);
        }

        /* 프리셋 그리드 */
        .theme-${cNum} .preset-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .theme-${cNum} .p-card {
          padding: 10px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
        }
        .theme-${cNum} .p-card.on {
          border-color: var(--brand);
          background: rgba(245,158,11,0.12);
        }
        .theme-${cNum} .p-card b {
          display: block;
          font-size: 12px;
          color: var(--text);
        }
        .theme-${cNum} .p-card small {
          font-size: 10px;
          color: var(--muted);
        }

        /* 3D 엠보싱 버튼 표준 */
        .theme-${cNum} .btn-3d {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          cursor: pointer;
          border-radius: 12px;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .theme-${cNum} .btn-3d-gold {
          background: linear-gradient(180deg, #F59E0B 0%, #D97706 100%);
          color: #000;
          border: 1px solid #FCD34D;
          box-shadow: 0 4px 0 #92400E, 0 8px 16px rgba(245,158,11,0.35);
        }
        .theme-${cNum} .btn-3d-pop {
          background: linear-gradient(180deg, #FACC15 0%, #EAB308 100%);
          color: #1C1917;
          border: 2px solid #1C1917;
          box-shadow: 0 4px 0 #1C1917, 0 6px 12px rgba(0,0,0,0.1);
        }
        .theme-${cNum} .btn-3d-neon {
          background: linear-gradient(180deg, #FACC15 0%, #CA8A04 100%);
          color: #000;
          border: 1px solid #FEF08A;
          box-shadow: 0 4px 0 #713F12, 0 0 20px rgba(250,204,21,0.5);
        }
        .theme-${cNum} .btn-3d:hover {
          transform: translateY(-1.5px);
        }
        .theme-${cNum} .btn-3d:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 rgba(0,0,0,0.5);
        }

        /* Detail 화면 요소 */
        .theme-${cNum} .page-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 20px;
        }
        .theme-${cNum} .detail-grid {
          display: flex;
          gap: 18px;
        }
        .theme-${cNum} .compare-viewport {
          background: #000;
          border: 1px solid var(--border);
          border-radius: 14px;
          height: 520px;
          position: relative;
          overflow: hidden;
        }
        .theme-${cNum} .compare-box {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .theme-${cNum} .compare-before {
          position: absolute;
          inset: 0;
          background: #111 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 100 100"><text x="50" y="55" font-size="40" text-anchor="middle" opacity="0.6">🍌</text></svg>') center no-repeat;
        }
        .theme-${cNum} .compare-after {
          position: absolute;
          inset: 0;
          left: 54%;
          background: radial-gradient(circle at center, #F59E0B22 0%, #000 80%) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 100 100"><text x="50" y="55" font-size="40" text-anchor="middle">✨🍌✨</text></svg>') center no-repeat;
          border-left: 2px solid var(--brand);
        }
        .theme-${cNum} .watermark-tag {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 10px;
          background: rgba(0,0,0,0.7);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          color: #FFF;
        }
        .theme-${cNum} .watermark-tag.right {
          left: auto;
          right: 12px;
          color: var(--brand);
        }
        .theme-${cNum} .compare-divider {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--brand);
          z-index: 10;
        }
        .theme-${cNum} .divider-handle {
          position: absolute;
          top: 50%;
          left: -14px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--brand);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .theme-${cNum} .ratio-chips {
          display: flex;
          gap: 6px;
        }
        .theme-${cNum} .r-chip {
          padding: 3px 8px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 11px;
          color: var(--muted);
        }
        .theme-${cNum} .r-chip.on {
          color: var(--brand);
          border-color: var(--brand);
        }
        .theme-${cNum} .small-tool-btn {
          padding: 6px 12px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .theme-${cNum} .btn-outline {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .theme-${cNum} .control-box {
          margin-bottom: 14px;
        }
        .theme-${cNum} .control-box label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
        }
        .theme-${cNum} .range-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .theme-${cNum} .val-badge {
          font-size: 12px;
          font-weight: 800;
          color: var(--brand);
          min-width: 44px;
          text-align: right;
        }
        .theme-${cNum} .free-tools-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .theme-${cNum} .ft-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .theme-${cNum} .ft-card strong {
          font-size: 12px;
          color: var(--text);
        }
        .theme-${cNum} .mini-btn {
          padding: 4px 10px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 11px;
          color: var(--text);
          cursor: pointer;
        }

        /* Guide 화면 요소 */
        .theme-${cNum} .guide-hero-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .theme-${cNum} .mascot-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand), #D97706);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          box-shadow: 0 6px 16px rgba(245,158,11,0.3);
          flex-shrink: 0;
        }
        .theme-${cNum} .hero-bubble {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text);
        }
        .theme-${cNum} .hero-bubble strong {
          display: block;
          font-size: 16px;
          color: var(--brand);
          margin-bottom: 4px;
        }
        .theme-${cNum} .toc-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 12px;
          margin-bottom: 20px;
        }
        .theme-${cNum} .toc-bar a {
          color: var(--brand);
          text-decoration: underline;
        }
        .theme-${cNum} .guide-sections-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .theme-${cNum} .guide-steps-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .theme-${cNum} .g-step {
          display: flex;
          gap: 12px;
        }
        .theme-${cNum} .g-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--brand);
          color: #000;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
        }
        .theme-${cNum} .g-step strong {
          display: block;
          font-size: 13px;
          color: var(--text);
        }
        .theme-${cNum} .g-step p {
          font-size: 12px;
          color: var(--muted);
          margin: 2px 0 0;
        }
        .theme-${cNum} .dodont-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .theme-${cNum} .do-box, .theme-${cNum} .dont-box {
          padding: 14px;
          background: var(--card2);
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .theme-${cNum} .do-box ul, .theme-${cNum} .dont-box ul {
          margin: 0;
          padding-left: 18px;
          font-size: 11px;
          line-height: 1.6;
          color: var(--text);
        }

        /* Settings & 5단계 표준 로그인 요소 */
        .theme-${cNum} .settings-auth-grid {
          display: flex;
          gap: 24px;
          align-items: start;
        }
        .theme-${cNum} .auth-standard-card {
          width: 440px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px 28px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .theme-${cNum} .auth-logo-badge {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--brand), #D97706);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 8px 20px rgba(245,158,11,0.35);
          margin-bottom: 12px;
        }
        .theme-${cNum} .auth-capsule-chip {
          padding: 4px 12px;
          border-radius: 9999px;
          background: rgba(245,158,11,0.15);
          border: 1px solid var(--brand);
          color: var(--brand);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .theme-${cNum} .auth-title {
          font-size: 22px;
          font-weight: 900;
          color: var(--text);
          margin: 0 0 4px;
        }
        .theme-${cNum} .auth-sub {
          font-size: 12px;
          color: var(--muted);
          margin: 0 0 20px;
        }
        .theme-${cNum} .auth-tabs {
          display: flex;
          width: 100%;
          background: var(--card2);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 18px;
        }
        .theme-${cNum} .tab-btn {
          flex: 1;
          padding: 8px 0;
          border: 0;
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
        }
        .theme-${cNum} .tab-btn.on {
          background: var(--card);
          color: var(--text);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .theme-${cNum} .auth-1line-terms {
          margin-top: 18px;
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
        }
        .theme-${cNum} .auth-1line-terms a {
          color: var(--text);
          text-decoration: underline;
        }
        .theme-${cNum} .quota-table {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .theme-${cNum} .q-row {
          display: grid;
          grid-template-columns: 180px 1fr 140px;
          gap: 12px;
          padding: 10px 14px;
          background: var(--card2);
          border-bottom: 1px solid var(--border);
          font-size: 12px;
          align-items: center;
        }
        .theme-${cNum} .q-row.head {
          background: var(--card);
          font-weight: 800;
          color: var(--muted);
        }
        .theme-${cNum} .q-row:last-child {
          border-bottom: 0;
        }
      </style>

      <!-- 앱 헤더 네비게이션 -->
      <header class="app-nav-bar">
        <div class="app-brand-lockup">
          <div class="app-logo-box">🍌</div>
          <div class="app-title-group">
            <h1>AI 바나나 캔버스 <small>v1.44</small></h1>
            <small>차세대 멀티모달 나노바나나 고화질 이미지 창작 & 인페인팅 작업실</small>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${themeBadge}
          <span style="font-size:12px; color:var(--muted); font-weight:700;">👤 buylifemall@naver.com</span>
        </div>
      </header>

      <!-- 화면 본문 -->
      <main>
        ${contentHtml}
      </main>
    </div>
  `;
}

// 전체 통합 쇼케이스 HTML 생성
function buildMasterShowcaseHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 바나나 캔버스 (banana-canvas) 4대 화면 3시안 쇼케이스</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090B10;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      padding: 30px;
      line-height: 1.5;
    }
    .header-section {
      text-align: center;
      margin-bottom: 30px;
    }
    .header-section h1 {
      font-size: 28px;
      font-weight: 900;
      color: #F8FAFC;
      margin-bottom: 8px;
    }
    .header-section p {
      color: #94A3B8;
      font-size: 14px;
    }
    .nav-links {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 14px;
    }
    .nav-link-btn {
      padding: 8px 16px;
      background: #1E293B;
      border: 1px solid #334155;
      color: #F8FAFC;
      border-radius: 8px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }
    .nav-link-btn.primary {
      background: #F59E0B;
      color: #000;
      border-color: #FBBF24;
    }

    /* 종합 비교표 */
    .comparison-table-wrapper {
      background: #0F172A;
      border: 1px solid #1E293B;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 40px;
      overflow-x: auto;
    }
    .comparison-table-wrapper h2 {
      font-size: 18px;
      font-weight: 900;
      color: #F8FAFC;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    table.comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    table.comp-table th, table.comp-table td {
      padding: 12px 14px;
      border: 1px solid #1E293B;
    }
    table.comp-table th {
      background: #1E293B;
      color: #F1F5F9;
      font-weight: 800;
    }
    table.comp-table tr:hover {
      background: rgba(255,255,255,0.02);
    }

    /* 3열 그리드 쇼케이스 */
    .grid-12views {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .col-header {
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 14px 18px;
      text-align: center;
      margin-bottom: 16px;
    }
    .col-header h3 {
      font-size: 16px;
      font-weight: 800;
      color: #F8FAFC;
      margin-bottom: 4px;
    }
    .col-header p {
      font-size: 12px;
      color: #94A3B8;
    }
    .view-card {
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 24px;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .view-card:hover {
      transform: translateY(-4px);
      border-color: #F59E0B;
      box-shadow: 0 12px 24px rgba(245,158,11,0.15);
    }
    .view-card-img-wrap {
      width: 100%;
      aspect-ratio: 16/10;
      background: #000;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .view-card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .view-card-info {
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .view-card-info strong {
      font-size: 13px;
      color: #F1F5F9;
    }
    .view-card-info span {
      font-size: 11px;
      color: #F59E0B;
      font-weight: 700;
    }

    /* 라이트박스 모달 */
    .lightbox-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      backdrop-filter: blur(10px);
      z-index: 1000;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .lightbox-modal.active {
      display: flex;
    }
    .lightbox-content {
      max-width: 95vw;
      max-height: 85vh;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.2);
      box-shadow: 0 25px 50px rgba(0,0,0,0.8);
      object-fit: contain;
    }
    .lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #FFF;
      font-size: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .lightbox-nav.prev { left: 30px; }
    .lightbox-nav.next { right: 30px; }
    .lightbox-close {
      position: absolute;
      top: 24px;
      right: 30px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #FFF;
      font-size: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .lightbox-title {
      color: #FFF;
      font-size: 15px;
      font-weight: 800;
      margin-top: 14px;
    }
  </style>
</head>
<body>

  <header class="header-section">
    <h1>🍌 AI 바나나 캔버스 (banana-canvas) 4대 화면 3시안 인터랙티브 쇼케이스</h1>
    <p>2026-11-06 규격 완비: 4대 핵심 화면(메인/상세/가이드/설정) × 3대 시안 = 총 12개 뷰 고해상도(1440px) 실세션 캡처 및 영구 자산화</p>
    <div class="nav-links">
      <a href="comparison.html" class="nav-link-btn primary">📊 4대 화면 3시안 종합 비교표 보기</a>
      <a href="http://localhost:3800/showcase.html" class="nav-link-btn">🔄 쇼케이스 새로고침</a>
      <a href="https://banana-canvas.buylife.xyz" target="_blank" class="nav-link-btn">🌐 공식 운영 사이트</a>
    </div>
  </header>

  <!-- 상단 종합 비교표 필수 탑재 -->
  <section class="comparison-table-wrapper">
    <h2>📊 4대 화면 3시안 한눈에 보는 종합 비교표 (Design Matrix)</h2>
    <table class="comp-table">
      <thead>
        <tr>
          <th>구분</th>
          <th>시안 1 (⭐ 적극 추천 채택)</th>
          <th>시안 2 (자산화 보존)</th>
          <th>시안 3 (자산화 보존)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>템플릿 번호 & 명칭</strong></td>
          <td><strong style="color:#F59E0B;">62. 나노 뉴럴 아트 캔버스 랩 스타일</strong></td>
          <td><strong>68. 크리에이티브 아뜰리에 페이퍼 팝 스타일</strong></td>
          <td><strong>69. 사이버펑크 네온 픽셀 스튜디오 스타일</strong></td>
        </tr>
        <tr>
          <td><strong>핵심 컨셉 & 메타포</strong></td>
          <td>차세대 Gemini Nano / Banana 멀티모달 비전 신경망 아트 랩. 4단계 신경망 파이프라인 배너 및 3D 엠보싱 골든 바나나 버튼</td>
          <td>감각적인 아트 매거진 & 팝 아티스트의 현대적인 아틀리에. 웜 페이퍼 소프트 크림과 경쾌한 옐로우/코랄 팝 감성</td>
          <td>미래지향적 사이버펑크 네오 도쿄 픽셀 아트 스튜디오. 고대비 CRT 네온 옐로우 & 사이버 시안 콘솔</td>
        </tr>
        <tr>
          <td><strong>컬러 시스템</strong></td>
          <td>딥 옵시디언 나이트 ('#0B0E14') & 바나나 골드 앰버 ('#F59E0B') & 일렉트릭 에메랄드 ('#10B981')</td>
          <td>웜 페이퍼 크림 ('#FAF8F5') & 바나나 옐로우 ('#EAB308') & 볼드 잉크 차콜 ('#1C1917') & 코랄</td>
          <td>퓨어 딥 스페이스 블랙 ('#050508') & 네온 일렉트릭 옐로우 ('#FACC15') & 사이버 시안 ('#06B6D4')</td>
        </tr>
        <tr>
          <td><strong>시그니처 컴포넌트</strong></td>
          <td>4단계 나노 신경망 파이프라인 배너, 듀얼 뷰파인더 덱, 3D 엠보싱 골든 바나나 버튼('.btn-3d-gold'), 5단계 표준 로그인</td>
          <td>팝 아트 매거진 컷아웃 카드 그리드, 모눈 페이퍼 텍스처, 3D 엠보싱 팝 옐로우 잉크 버튼('.btn-3d-pop')</td>
          <td>레트로 CRT 주사선 & 픽셀 그리드 HUD, GPU 연산 스트림 뷰파인더, 3D 엠보싱 사이버 네온 버튼('.btn-3d-neon')</td>
        </tr>
        <tr>
          <td><strong>01. 메인 스튜디오</strong></td>
          <td>인터랙티브 3열 워크벤치 + 20종 프리셋 그리드</td>
          <td>팝 매거진 캔버스 + 스티커 툴 팔레트</td>
          <td>사이버 픽셀 콘솔 + 레트로 HUD 스트림</td>
        </tr>
        <tr>
          <td><strong>02. 정밀 인페인팅</strong></td>
          <td>Before vs After 1:1 픽셀 매칭 슬라이더 덱</td>
          <td>아날로그 마운트 프레임 전후 비교 뷰</td>
          <td>네온 홀로그램 스플릿 스캐너 HUD</td>
        </tr>
        <tr>
          <td><strong>03. 사용 매뉴얼</strong></td>
          <td>바나나 엠블럼 히어로 배너 + 3단계 퀵 파이프라인</td>
          <td>팝 일러스트 카드 가이드북 + DO & DON'T</td>
          <td>사이버펑크 네온 튜토리얼 터미널</td>
        </tr>
        <tr>
          <td><strong>04. 설정 & 로그인</strong></td>
          <td>2026-11-01 5단계 수직 레이아웃 표준 규격 탑재</td>
          <td>5단계 표준 골격 + 웜 페이퍼 카드 테마</td>
          <td>5단계 표준 골격 + 네온 사이버 카드 테마</td>
        </tr>
        <tr>
          <td><strong>추천 여부 & 영구 자산</strong></td>
          <td><strong style="color:#F59E0B;">⭐ 적극 추천 (1안 채택)</strong><br><small><code>D:/Antigravity/Design/62_nano_neural_art_canvas_lab</code></small></td>
          <td><strong>영구 자산화 보존</strong><br><small><code>D:/Antigravity/Design/68_creative_atelier_paper_pop</code></small></td>
          <td><strong>영구 자산화 보존</strong><br><small><code>D:/Antigravity/Design/69_cyberpunk_neon_pixel_studio</code></small></td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- 3열 그리드 12개 뷰 쇼케이스 -->
  <main class="grid-12views">

    <!-- 1열: 시안 1 -->
    <div class="col">
      <div class="col-header">
        <h3>시안 1. 나노 뉴럴 아트 캔버스 랩</h3>
        <p>⭐ 적극 추천 (62번 템플릿 연계 · 딥 옵시디언 & 앰버 골드)</p>
      </div>

      <div class="view-card" onclick="openLightbox('62_nano_neural_art_canvas_lab/banana-canvas/01_main.png', '시안 1: 01. 캔버스 메인 스튜디오 작업실')">
        <div class="view-card-img-wrap"><img src="62_nano_neural_art_canvas_lab/banana-canvas/01_main.png" alt="시안 1 메인"></div>
        <div class="view-card-info"><strong>01. 캔버스 메인 스튜디오</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('62_nano_neural_art_canvas_lab/banana-canvas/02_detail.png', '시안 1: 02. 정밀 인페인팅 & 무료 도구 덱')">
        <div class="view-card-img-wrap"><img src="62_nano_neural_art_canvas_lab/banana-canvas/02_detail.png" alt="시안 1 상세"></div>
        <div class="view-card-info"><strong>02. 정밀 인페인팅 뷰파인더</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('62_nano_neural_art_canvas_lab/banana-canvas/03_guide.png', '시안 1: 03. 비주얼 연동 & 사용 매뉴얼')">
        <div class="view-card-img-wrap"><img src="62_nano_neural_art_canvas_lab/banana-canvas/03_guide.png" alt="시안 1 매뉴얼"></div>
        <div class="view-card-info"><strong>03. 비주얼 사용 매뉴얼</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('62_nano_neural_art_canvas_lab/banana-canvas/04_settings.png', '시안 1: 04. API 키 설정 & 5단계 표준 로그인')">
        <div class="view-card-img-wrap"><img src="62_nano_neural_art_canvas_lab/banana-canvas/04_settings.png" alt="시안 1 설정"></div>
        <div class="view-card-info"><strong>04. 5단계 표준 로그인 & 설정</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>
    </div>

    <!-- 2열: 시안 2 -->
    <div class="col">
      <div class="col-header">
        <h3>시안 2. 크리에이티브 아뜰리에 페이퍼 팝</h3>
        <p>영구 자산화 (68번 · 웜 페이퍼 소프트 크림 & 팝 옐로우)</p>
      </div>

      <div class="view-card" onclick="openLightbox('68_creative_atelier_paper_pop/banana-canvas/01_main.png', '시안 2: 01. 캔버스 메인 스튜디오 작업실')">
        <div class="view-card-img-wrap"><img src="68_creative_atelier_paper_pop/banana-canvas/01_main.png" alt="시안 2 메인"></div>
        <div class="view-card-info"><strong>01. 캔버스 메인 스튜디오</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('68_creative_atelier_paper_pop/banana-canvas/02_detail.png', '시안 2: 02. 정밀 인페인팅 & 무료 도구 덱')">
        <div class="view-card-img-wrap"><img src="68_creative_atelier_paper_pop/banana-canvas/02_detail.png" alt="시안 2 상세"></div>
        <div class="view-card-info"><strong>02. 정밀 인페인팅 뷰파인더</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('68_creative_atelier_paper_pop/banana-canvas/03_guide.png', '시안 2: 03. 비주얼 연동 & 사용 매뉴얼')">
        <div class="view-card-img-wrap"><img src="68_creative_atelier_paper_pop/banana-canvas/03_guide.png" alt="시안 2 매뉴얼"></div>
        <div class="view-card-info"><strong>03. 비주얼 사용 매뉴얼</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('68_creative_atelier_paper_pop/banana-canvas/04_settings.png', '시안 2: 04. API 키 설정 & 5단계 표준 로그인')">
        <div class="view-card-img-wrap"><img src="68_creative_atelier_paper_pop/banana-canvas/04_settings.png" alt="시안 2 설정"></div>
        <div class="view-card-info"><strong>04. 5단계 표준 로그인 & 설정</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>
    </div>

    <!-- 3열: 시안 3 -->
    <div class="col">
      <div class="col-header">
        <h3>시안 3. 사이버펑크 네온 픽셀 스튜디오</h3>
        <p>영구 자산화 (69번 · 퓨어 딥 스페이스 블랙 & 네온 옐로우)</p>
      </div>

      <div class="view-card" onclick="openLightbox('69_cyberpunk_neon_pixel_studio/banana-canvas/01_main.png', '시안 3: 01. 캔버스 메인 스튜디오 작업실')">
        <div class="view-card-img-wrap"><img src="69_cyberpunk_neon_pixel_studio/banana-canvas/01_main.png" alt="시안 3 메인"></div>
        <div class="view-card-info"><strong>01. 캔버스 메인 스튜디오</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('69_cyberpunk_neon_pixel_studio/banana-canvas/02_detail.png', '시안 3: 02. 정밀 인페인팅 & 무료 도구 덱')">
        <div class="view-card-img-wrap"><img src="69_cyberpunk_neon_pixel_studio/banana-canvas/02_detail.png" alt="시안 3 상세"></div>
        <div class="view-card-info"><strong>02. 정밀 인페인팅 뷰파인더</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('69_cyberpunk_neon_pixel_studio/banana-canvas/03_guide.png', '시안 3: 03. 비주얼 연동 & 사용 매뉴얼')">
        <div class="view-card-img-wrap"><img src="69_cyberpunk_neon_pixel_studio/banana-canvas/03_guide.png" alt="시안 3 매뉴얼"></div>
        <div class="view-card-info"><strong>03. 비주얼 사용 매뉴얼</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>

      <div class="view-card" onclick="openLightbox('69_cyberpunk_neon_pixel_studio/banana-canvas/04_settings.png', '시안 3: 04. API 키 설정 & 5단계 표준 로그인')">
        <div class="view-card-img-wrap"><img src="69_cyberpunk_neon_pixel_studio/banana-canvas/04_settings.png" alt="시안 3 설정"></div>
        <div class="view-card-info"><strong>04. 5단계 표준 로그인 & 설정</strong><span>클릭하여 1440px 확대 🔍</span></div>
      </div>
    </div>

  </main>

  <!-- 1440px 고화질 원본 라이트박스 모달 -->
  <div id="lightbox" class="lightbox-modal" onclick="closeLightbox(event)">
    <div class="lightbox-close" onclick="closeLightbox(event)">✕</div>
    <div class="lightbox-nav prev" onclick="prevLightbox(event)">❮</div>
    <img id="lightbox-img" class="lightbox-content" src="" alt="확대 보기" />
    <div class="lightbox-nav next" onclick="nextLightbox(event)">❯</div>
    <div id="lightbox-title" class="lightbox-title"></div>
  </div>

  <script>
    const images = [
      { src: '62_nano_neural_art_canvas_lab/banana-canvas/01_main.png', title: '시안 1: 01. 캔버스 메인 스튜디오 작업실' },
      { src: '62_nano_neural_art_canvas_lab/banana-canvas/02_detail.png', title: '시안 1: 02. 정밀 인페인팅 & 무료 도구 덱' },
      { src: '62_nano_neural_art_canvas_lab/banana-canvas/03_guide.png', title: '시안 1: 03. 비주얼 연동 & 사용 매뉴얼' },
      { src: '62_nano_neural_art_canvas_lab/banana-canvas/04_settings.png', title: '시안 1: 04. API 키 설정 & 5단계 표준 로그인' },
      { src: '68_creative_atelier_paper_pop/banana-canvas/01_main.png', title: '시안 2: 01. 캔버스 메인 스튜디오 작업실' },
      { src: '68_creative_atelier_paper_pop/banana-canvas/02_detail.png', title: '시안 2: 02. 정밀 인페인팅 & 무료 도구 덱' },
      { src: '68_creative_atelier_paper_pop/banana-canvas/03_guide.png', title: '시안 2: 03. 비주얼 연동 & 사용 매뉴얼' },
      { src: '68_creative_atelier_paper_pop/banana-canvas/04_settings.png', title: '시안 2: 04. API 키 설정 & 5단계 표준 로그인' },
      { src: '69_cyberpunk_neon_pixel_studio/banana-canvas/01_main.png', title: '시안 3: 01. 캔버스 메인 스튜디오 작업실' },
      { src: '69_cyberpunk_neon_pixel_studio/banana-canvas/02_detail.png', title: '시안 3: 02. 정밀 인페인팅 & 무료 도구 덱' },
      { src: '69_cyberpunk_neon_pixel_studio/banana-canvas/03_guide.png', title: '시안 3: 03. 비주얼 연동 & 사용 매뉴얼' },
      { src: '69_cyberpunk_neon_pixel_studio/banana-canvas/04_settings.png', title: '시안 3: 04. API 키 설정 & 5단계 표준 로그인' },
    ];
    let currentIndex = 0;

    function openLightbox(src, title) {
      currentIndex = images.findIndex(item => item.src === src);
      if (currentIndex === -1) currentIndex = 0;
      updateLightbox();
      document.getElementById('lightbox').classList.add('active');
    }

    function closeLightbox(e) {
      if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
        document.getElementById('lightbox').classList.remove('active');
      }
    }

    function updateLightbox() {
      const item = images[currentIndex];
      document.getElementById('lightbox-img').src = item.src;
      document.getElementById('lightbox-title').textContent = item.title;
    }

    function prevLightbox(e) {
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      updateLightbox();
    }

    function nextLightbox(e) {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % images.length;
      updateLightbox();
    }

    document.addEventListener('keydown', (e) => {
      const lb = document.getElementById('lightbox');
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') lb.classList.remove('active');
      if (e.key === 'ArrowLeft') prevLightbox(e);
      if (e.key === 'ArrowRight') nextLightbox(e);
    });
  </script>
</body>
</html>`;
}

// 종합 비교표 독립 HTML
function buildComparisonPageHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 바나나 캔버스 (banana-canvas) 4대 화면 3시안 종합 비교표</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090B10;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      padding: 40px;
      line-height: 1.6;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    h1 { font-size: 26px; font-weight: 900; color: #FFF; margin-bottom: 8px; text-align: center; }
    p.sub { text-align: center; color: #94A3B8; font-size: 14px; margin-bottom: 30px; }
    .nav-bar { display: flex; justify-content: center; gap: 14px; margin-bottom: 30px; }
    .btn { padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; }
    .btn-main { background: #F59E0B; color: #000; }
    .btn-outline { background: #1E293B; color: #FFF; border: 1px solid #334155; }
    table { width: 100%; border-collapse: collapse; background: #0F172A; border-radius: 14px; overflow: hidden; border: 1px solid #1E293B; }
    th, td { padding: 14px 18px; border: 1px solid #1E293B; font-size: 13px; text-align: left; }
    th { background: #1E293B; color: #FFF; font-weight: 800; }
    tr:hover { background: rgba(255,255,255,0.02); }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 AI 바나나 캔버스 (banana-canvas) 4대 화면 3시안 종합 비교표</h1>
    <p class="sub">2026-11-06 규격 완비: 4대 핵심 화면(메인/상세/가이드/설정)과 3대 시안의 시각적·기능적 스펙 대조 매트릭스</p>
    <div class="nav-bar">
      <a href="showcase.html" class="btn btn-main">🖼 12뷰 라이트박스 쇼케이스 보기</a>
      <a href="https://banana-canvas.buylife.xyz" target="_blank" class="btn btn-outline">🌐 공식 운영 사이트</a>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:160px;">비교 항목</th>
          <th>시안 1 (⭐ 적극 추천 채택안)</th>
          <th>시안 2 (자산화 보존)</th>
          <th>시안 3 (자산화 보존)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>템플릿 번호 & 명칭</strong></td>
          <td><strong style="color:#F59E0B; font-size:14px;">62. 나노 뉴럴 아트 캔버스 랩 스타일</strong></td>
          <td><strong style="font-size:14px;">68. 크리에이티브 아뜰리에 페이퍼 팝 스타일</strong></td>
          <td><strong style="font-size:14px;">69. 사이버펑크 네온 픽셀 스튜디오 스타일</strong></td>
        </tr>
        <tr>
          <td><strong>디자인 컨셉 & 메타포</strong></td>
          <td>차세대 Gemini Nano / Banana 멀티모달 AI 비전 신경망 아트 랩. 4단계 신경망 파이프라인 배너 및 3D 엠보싱 골든 바나나 버튼</td>
          <td>경쾌하고 감각적인 아트 매거진 & 팝 아티스트의 현대적인 아틀리에. 웜 페이퍼 소프트 크림과 팝 옐로우/코랄 감성</td>
          <td>미래지향적 사이버펑크 네오 도쿄 픽셀 아트 스튜디오. 고대비 CRT 네온 옐로우 & 사이버 시안 콘솔</td>
        </tr>
        <tr>
          <td><strong>컬러 시스템</strong></td>
          <td>딥 옵시디언 나이트 ('#0B0E14' / '#121722')<br>• 바나나 골드 앰버 ('#F59E0B')<br>• 일렉트릭 에메랄드 ('#10B981')</td>
          <td>웜 페이퍼 소프트 크림 ('#FAF8F5' / '#F3EFEA')<br>• 바나나 옐로우 ('#EAB308')<br>• 볼드 차콜 잉크 ('#1C1917')</td>
          <td>퓨어 딥 스페이스 블랙 ('#050508' / '#0D0D14')<br>• 네온 일렉트릭 옐로우 ('#FACC15')<br>• 사이버 시안 ('#06B6D4')</td>
        </tr>
        <tr>
          <td><strong>시그니처 버튼</strong></td>
          <td><strong>3D 엠보싱 골든 바나나 버튼</strong><br><code>.btn-3d-gold</code> (수직 2단 골드 그라데이션 + 4px 앰버 섀도우)</td>
          <td><strong>3D 엠보싱 팝 옐로우 잉크 버튼</strong><br><code>.btn-3d-pop</code> (2px 볼드 잉크 보더 + 4px 솔리드 블랙 섀도우)</td>
          <td><strong>3D 엠보싱 사이버 네온 버튼</strong><br><code>.btn-3d-neon</code> (일렉트릭 옐로우 네온 글로우 섀도우)</td>
        </tr>
        <tr>
          <td><strong>01. 메인 스튜디오</strong></td>
          <td>4단계 파이프라인 배너 + 인터랙티브 3열 캔버스 워크벤치 + 20종 프리셋 그리드 + LIVE 60FPS 가속 뷰어</td>
          <td>팝 매거진 컷아웃 카드 그리드 + 모눈 페이퍼 캔버스 프레임 + 스티커 툴 팔레트</td>
          <td>레트로 CRT 주사선 & 픽셀 그리드 HUD + GPU 연산 스트림 뷰파인더 + 픽셀 브러시</td>
        </tr>
        <tr>
          <td><strong>02. 정밀 인페인팅</strong></td>
          <td>Before vs After 1:1 픽셀 매칭 슬라이더 덱 + U²-Net 초경량 누끼 / UltraFace 가리기 툴셋</td>
          <td>아날로그 화보 마운트 액자형 전후 비교 뷰 + 팝 컬러 브러시 팔레트</td>
          <td>사이버 홀로그램 스플릿 스캐너 HUD + 네온 레이어 채널 컨트롤러</td>
        </tr>
        <tr>
          <td><strong>03. 사용 매뉴얼</strong></td>
          <td>바나나 캐릭터 엠블럼 히어로 배너 + 3단계 퀵 파이프라인 + DO & DON'T 비교 카드</td>
          <td>매거진 에디토리얼 비주얼 가이드북 + 일러스트레이션 팁 카드</td>
          <td>사이버펑크 네온 터미널 튜토리얼 + 아스키/픽셀 가이드</td>
        </tr>
        <tr>
          <td><strong>04. 설정 & 로그인</strong></td>
          <td>2026-11-01 5단계 수직 레이아웃 표준 규격 탑재<br>(64px 골든 로고 + 알약 캡슐 뱃지 + 볼드 타이틀 + 2단 탭 + 1행 축소 약관)</td>
          <td>5단계 표준 골격 + 웜 페이퍼 소프트 카드 테마</td>
          <td>5단계 표준 골격 + 네온 사이버 카드 테마</td>
        </tr>
        <tr>
          <td><strong>추천/선정 이유</strong></td>
          <td>⭐ <strong>적극 추천 (1순위 채택)</strong>: 61번(어도비 다크)과 완벽한 짝을 이루는 62번 템플릿. 멀티모달 생성형 AI 캔버스의 전문성과 생산성 극대화</td>
          <td><strong>영구 자산화 보존</strong>: 밝고 경쾌한 팝 감성 선호 사용자를 위한 완벽한 대안 템플릿</td>
          <td><strong>영구 자산화 보존</strong>: 픽셀아트/게임/사이버펑크 특화 크리에이터를 위한 유니크 테마</td>
        </tr>
        <tr>
          <td><strong>영구 자산 보존 경로</strong></td>
          <td><code>D:/Antigravity/Design/62_nano_neural_art_canvas_lab/banana-canvas</code></td>
          <td><code>D:/Antigravity/Design/68_creative_atelier_paper_pop/banana-canvas</code></td>
          <td><code>D:/Antigravity/Design/69_cyberpunk_neon_pixel_studio/banana-canvas</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('1. 개별 뷰 렌더링용 임시 HTML 생성 중...');
  const scratchDir = 'D:/Antigravity/AIMaster/scratch';
  fs.mkdirSync(scratchDir, { recursive: true });

  const tempHtmlPath = path.join(scratchDir, 'banana_canvas_views_render.html');
  let fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Render</title></head><body style="margin:0; background:#000;">`;
  
  for (let c = 1; c <= 3; c++) {
    for (let s = 1; s <= 4; s++) {
      fullHtml += buildViewHtml(c, s);
    }
  }
  fullHtml += `</body></html>`;
  fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');
  console.log('✔ 임시 HTML 작성 완료:', tempHtmlPath);

  console.log('2. Playwright 1440px 고화질 렌더링 및 캡처 시작...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  await page.goto('file:///' + tempHtmlPath.replace(/\\\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const screenNames = { 1: '01_main.png', 2: '02_detail.png', 3: '03_guide.png', 4: '04_settings.png' };

  for (let c = 1; c <= 3; c++) {
    for (let s = 1; s <= 4; s++) {
      const selector = `#view-${c}-${s}`;
      const element = await page.$(selector);
      if (element) {
        const outPath = path.join(OUT_DIRS[c], screenNames[s]);
        await element.screenshot({ path: outPath });
        console.log(`✔ 캡처 완료 [시안 ${c} 화면 ${s}]:`, outPath);
      }
    }
  }

  await browser.close();
  console.log('✔ 12개 뷰 1440px 고해상도 캡처 완료!');

  console.log('3. 쇼케이스 및 비교표 HTML 배포...');
  fs.writeFileSync(path.join(BASE_DIR, 'showcase.html'), buildMasterShowcaseHtml(), 'utf8');
  fs.writeFileSync(path.join(BASE_DIR, 'comparison.html'), buildComparisonPageHtml(), 'utf8');
  console.log('✔ D:/Antigravity/Design/showcase.html & comparison.html 갱신 완료');

  // 각 폴더에 README.md 작성
  const readme1 = `# 62. 나노 뉴럴 아트 캔버스 랩 스타일 (Nano Neural Art Canvas Lab Style)

- **대상 프로그램**: AI 바나나 캔버스 (\`banana-canvas\` v1.44)
- **추천 순위**: ⭐ **1안 (적극 추천 채택안)**
- **도메인**: 이미지 / 멀티모달 캔버스 AI
- **컨셉**: 차세대 Gemini Nano / Banana 멀티모달 비전 신경망 아트 랩. 4단계 신경망 파이프라인 배너, 3D 엠보싱 골든 바나나 버튼, 2026-11-01 5단계 표준 로그인 폼
- **배색**: 딥 옵시디언 나이트 (\`#0B0E14\`) + 바나나 골드 앰버 (\`#F59E0B\`) + 일렉트릭 에메랄드 (\`#10B981\`)
- **보존 자산**:
  - \`01_main.png\`: 캔버스 메인 스튜디오 작업실 (1440px)
  - \`02_detail.png\`: 정밀 인페인팅 & 무료 도구 뷰파인더 (1440px)
  - \`03_guide.png\`: 비주얼 연동 & 사용 매뉴얼 (1440px)
  - \`04_settings.png\`: API 키 설정 & 5단계 표준 로그인 폼 (1440px)
`;
  fs.writeFileSync(path.join(OUT_DIRS[1], 'README.md'), readme1, 'utf8');

  const readme2 = `# 68. 크리에이티브 아뜰리에 페이퍼 팝 스타일 (Creative Atelier Paper Pop Style)

- **대상 프로그램**: AI 바나나 캔버스 (\`banana-canvas\` v1.44)
- **추천 순위**: 2안 (영구 자산화 보존)
- **도메인**: 이미지 / 팝 아트 매거진
- **컨셉**: 감각적인 아트 매거진 & 팝 아티스트의 현대적인 아틀리에. 웜 페이퍼 소프트 크림, 팝 아트 컷아웃 카드, 3D 엠보싱 팝 옐로우 잉크 버튼
- **배색**: 웜 페이퍼 소프트 크림 (\`#FAF8F5\`) + 바나나 옐로우 (\`#EAB308\`) + 볼드 차콜 잉크 (\`#1C1917\`)
- **보존 자산**:
  - \`01_main.png\`: 캔버스 메인 스튜디오 작업실 (1440px)
  - \`02_detail.png\`: 정밀 인페인팅 & 무료 도구 뷰파인더 (1440px)
  - \`03_guide.png\`: 비주얼 연동 & 사용 매뉴얼 (1440px)
  - \`04_settings.png\`: API 키 설정 & 5단계 표준 로그인 폼 (1440px)
`;
  fs.writeFileSync(path.join(OUT_DIRS[2], 'README.md'), readme2, 'utf8');

  const readme3 = `# 69. 사이버펑크 네온 픽셀 스튜디오 스타일 (Cyberpunk Neon Pixel Studio Style)

- **대상 프로그램**: AI 바나나 캔버스 (\`banana-canvas\` v1.44)
- **추천 순위**: 3안 (영구 자산화 보존)
- **도메인**: 이미지 / 레트로-퓨처리즘 픽셀 아트
- **컨셉**: 미래지향적 사이버펑크 네오 도쿄 픽셀 아트 스튜디오. 고대비 CRT 네온 옐로우 & 사이버 시안 콘솔, 3D 엠보싱 사이버 네온 버튼
- **배색**: 퓨어 딥 스페이스 블랙 (\`#050508\`) + 네온 일렉트릭 옐로우 (\`#FACC15\`) + 사이버 시안 (\`#06B6D4\`)
- **보존 자산**:
  - \`01_main.png\`: 캔버스 메인 스튜디오 작업실 (1440px)
  - \`02_detail.png\`: 정밀 인페인팅 & 무료 도구 뷰파인더 (1440px)
  - \`03_guide.png\`: 비주얼 연동 & 사용 매뉴얼 (1440px)
  - \`04_settings.png\`: API 키 설정 & 5단계 표준 로그인 폼 (1440px)
`;
  fs.writeFileSync(path.join(OUT_DIRS[3], 'README.md'), readme3, 'utf8');

  console.log('✔ 전체 자산화 및 README.md 작성 완료!');
}

main().catch(console.error);
