import fs from 'fs';
import path from 'path';

// 91, 92, 93번 템플릿 아카이브 디렉터리 준비
const BASE_DESIGN_DIR = 'D:/Antigravity/Design';
const TEMPLATES = [
  {
    id: '91_insta_neon_sunset_creator_studio',
    name: '91. 인스타 네온 선셋 크리에이터 스튜디오 스타일',
    folder: path.join(BASE_DESIGN_DIR, '91_insta_neon_sunset_creator_studio', 'insta_auto_poster'),
  },
  {
    id: '92_clean_insta_magazine_editorial_atelier',
    name: '92. 클린 인스타 매거진 에디토리얼 아틀리에 스타일',
    folder: path.join(BASE_DESIGN_DIR, '92_clean_insta_magazine_editorial_atelier', 'insta_auto_poster'),
  },
  {
    id: '93_quant_insta_algorithm_radar_console',
    name: '93. 퀀트 인스타 알고리즘 레이더 HUD 콘솔 스타일',
    folder: path.join(BASE_DESIGN_DIR, '93_quant_insta_algorithm_radar_console', 'insta_auto_poster'),
  }
];

for (const t of TEMPLATES) {
  if (!fs.existsSync(t.folder)) {
    fs.mkdirSync(t.folder, { recursive: true });
  }
}

// 4대 화면 HTML 템플릿 생성기
function renderScreen(templateId, screenId) {
  // 시안별 테마 토큰
  let theme = {
    bg: '#0B0E14',
    card: '#131822',
    card2: '#1C2333',
    border: '#232E42',
    borderBright: '#384A6B',
    text: '#F8FAFC',
    muted: '#94A3B8',
    brand: '#E1306C',
    brandGrad: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)',
    btnClass: 'btn-3d-insta-sunset',
    btnBg: 'linear-gradient(135deg, #E1306C, #FD1D1D)',
    btnBorder: '#9E1045',
    btnShadow: 'rgba(225, 48, 108, 0.4)',
    fontFamily: '"Pretendard Variable", Pretendard, -apple-system, sans-serif'
  };

  if (templateId === '92_clean_insta_magazine_editorial_atelier') {
    theme = {
      bg: '#FAF9F6',
      card: '#FFFFFF',
      card2: '#F4F1EA',
      border: '#E7E2D8',
      borderBright: '#D5CEC0',
      text: '#1E1B18',
      muted: '#78716C',
      brand: '#E06D83',
      brandGrad: 'linear-gradient(135deg, #E06D83 0%, #D48B99 100%)',
      btnClass: 'btn-3d-rose-gold',
      btnBg: '#E06D83',
      btnBorder: '#B84E64',
      btnShadow: 'rgba(224, 109, 131, 0.3)',
      fontFamily: '"Pretendard Variable", Pretendard, -apple-system, sans-serif'
    };
  } else if (templateId === '93_quant_insta_algorithm_radar_console') {
    theme = {
      bg: '#070A10',
      card: '#0F1420',
      card2: '#161D2E',
      border: '#1E2738',
      borderBright: '#2D3A54',
      text: '#F8FAFC',
      muted: '#64748B',
      brand: '#D946EF',
      brandGrad: 'linear-gradient(135deg, #D946EF 0%, #06B6D4 100%)',
      btnClass: 'btn-3d-neon-magenta',
      btnBg: '#D946EF',
      btnBorder: '#A21CAF',
      btnShadow: 'rgba(217, 70, 239, 0.35)',
      fontFamily: '"JetBrains Mono", "Pretendard Variable", monospace'
    };
  }

  let bodyContent = '';

  // 1. 메인 대시보드 (01_main)
  if (screenId === '01_main') {
    bodyContent = `
      <div class="header-hero">
        <div class="badge-pill">📸 INSTA AUTO POSTER • v1.72</div>
        <h1 class="hero-title">인스타그램 공식 Graph API 무결성 자동 발행 & 바이럴 엔진</h1>
        <p class="hero-desc">Meta 공식 비즈니스 연동으로 쉐도우밴 걱정 없이 피드·카드뉴스·릴스를 365일 정시 예약 발행하고 도달률을 300% 극대화합니다.</p>
        <div class="hero-actions">
          <button class="${theme.btnClass}">⚡ AI 피드/카드뉴스 제작하기 →</button>
          <button class="btn-ghost">📖 쉐도우밴 방지 가이드</button>
        </div>
      </div>

      <!-- 4대 핵심 KPI 카드 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">🔗 연동 계정</div>
          <div class="kpi-val">4<span class="kpi-unit">개</span></div>
          <div class="kpi-sub green">● Meta Graph API 정상 연결</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">📮 당월 누적 발행</div>
          <div class="kpi-val">86<span class="kpi-unit">건</span></div>
          <div class="kpi-sub">성공률 100% (실패 0건)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">⏳ 예약 대기 피드</div>
          <div class="kpi-val">14<span class="kpi-unit">건</span></div>
          <div class="kpi-sub accent">골든타임(20:30~22:00) 대기</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">📈 Explore 도달률</div>
          <div class="kpi-val">+284<span class="kpi-unit">%</span></div>
          <div class="kpi-sub green">▲ 지난 30일 대비 급증</div>
        </div>
      </div>

      <!-- 4단계 인스타 파이프라인 -->
      <div class="card-section">
        <div class="section-title">🚀 4단계 인스타 바이럴 자동화 파이프라인</div>
        <div class="pipeline-grid">
          <div class="pipe-step active">
            <div class="step-num">STEP 1</div>
            <div class="step-icon">🔗</div>
            <div class="step-title">Meta 계정 연동</div>
            <div class="step-desc">Instagram 프로 비즈니스 계정 & FB 페이지 30초 매핑</div>
          </div>
          <div class="pipe-step">
            <div class="step-num">STEP 2</div>
            <div class="step-icon">🎨</div>
            <div class="step-title">AI 카드뉴스·피드 제작</div>
            <div class="step-desc">주제 한 줄로 5장 카드뉴스 및 감성 본문 10초 완성</div>
          </div>
          <div class="pipe-step">
            <div class="step-num">STEP 3</div>
            <div class="step-icon">🏷️</div>
            <div class="step-title">30개 해시태그 최적화</div>
            <div class="step-desc">대형/중형/소형 태그 3단계 황금비율 자동 조합</div>
          </div>
          <div class="pipe-step">
            <div class="step-num">STEP 4</div>
            <div class="step-icon">🚀</div>
            <div class="step-title">골든타임 예약 발행</div>
            <div class="step-desc">팔로워 활동 피크 시간대 무중단 자동 포스팅</div>
          </div>
        </div>
      </div>

      <!-- 최근 발행 피드 & 실시간 피드 스트림 -->
      <div class="grid-2col">
        <div class="card-box">
          <div class="box-header">
            <span class="box-title">📱 최근 발행 피드 프리뷰</span>
            <span class="tag-status">최근 4건</span>
          </div>
          <div class="feed-thumbs-grid">
            <div class="thumb-item">
              <div class="thumb-img p1"></div>
              <div class="thumb-meta">
                <span class="t-badge">카드뉴스 5P</span>
                <p class="t-caption">2026 부동산 절세 전략 핵심 3가지...</p>
                <span class="t-stats">❤️ 482 💬 68</span>
              </div>
            </div>
            <div class="thumb-item">
              <div class="thumb-img p2"></div>
              <div class="thumb-meta">
                <span class="t-badge">릴스 9:16</span>
                <p class="t-caption">30초 만에 끝내는 인스타 도달 해킹...</p>
                <span class="t-stats">❤️ 1,290 💬 142</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-box">
          <div class="box-header">
            <span class="box-title">⚡ 실시간 인스타 발행 로그</span>
            <span class="tag-live">LIVE REC</span>
          </div>
          <div class="log-list">
            <div class="log-item ok">
              <span class="log-time">22:00:14</span>
              <span class="log-tag">발행성공</span>
              <span class="log-text">@realestate_master 피드 #1084 발행 완료 (ID: 1802938...)</span>
            </div>
            <div class="log-item ok">
              <span class="log-time">19:30:00</span>
              <span class="log-tag">발행성공</span>
              <span class="log-text">@lifestyle_creator 릴스 #204 발행 완료</span>
            </div>
            <div class="log-item wait">
              <span class="log-time">내일 08:30</span>
              <span class="log-tag wait">예약대기</span>
              <span class="log-text">@tech_trends_kr '모닝 인사이트' 예약 대기 중</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. AI 피드 제작 & 1:1 모바일 뷰파인더 덱 (02_detail)
  else if (screenId === '02_detail') {
    bodyContent = `
      <div class="detail-container">
        <!-- 좌측: AI 피드 에디터 & 해시태그 패널 -->
        <div class="editor-pane">
          <div class="card-box">
            <div class="box-header">
              <span class="box-title">✍️ AI 인스타그램 콘텐츠 스튜디오</span>
              <span class="tag-status">Meta Graph API v21.0</span>
            </div>

            <div class="form-group">
              <label>1. 포스팅 유형 선택</label>
              <div class="type-selector">
                <div class="type-card active">
                  <span class="t-icon">🖼️</span>
                  <div class="t-info">
                    <strong>1:1 정방형 카드뉴스</strong>
                    <p>1080×1080px (최대 10장 캐러셀)</p>
                  </div>
                </div>
                <div class="type-card">
                  <span class="t-icon">🎬</span>
                  <div class="t-info">
                    <strong>9:16 모바일 릴스</strong>
                    <p>1080×1920px (숏폼 비디오)</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>2. 주제 및 핵심 키워드 입력</label>
              <input type="text" class="inp-box" value="2026 직장인 부동산 소액 갭투자 핵심 가이드 & 3대 주의사항" />
            </div>

            <div class="form-group">
              <label>3. 캡션 어투 및 AI 페르소나</label>
              <div class="tone-chips">
                <span class="chip active">🔥 강렬한 후킹 & 인사이트</span>
                <span class="chip">☕ 친근한 일상 소통형</span>
                <span class="chip">📊 전문가 퀀트 리포트형</span>
              </div>
            </div>

            <div class="form-group">
              <label>4. AI 생성 캡션 및 본문 에디터</label>
              <textarea class="textarea-box" rows="5">
"지금 수도권 갭투자, 정말 끝났을까요?" 💡

실제로 2026년 국토교통부 실거래가를 전수 분석해보면 전세가율 78%를 넘어서는 저평가 단지들이 속속 포착되고 있습니다.

오늘 3분 만에 핵심만 짚어드립니다:
1. 전세가율 75% 이상 급매 단지 스크리닝
2. 역세권 도보 7분 이내 500세대 이상 기준
3. 깡통전세 리스크 방어 5대 체크리스트

📌 저장해두고 주말 임장 갈 때 꼭 확인하세요!
              </textarea>
            </div>

            <div class="form-group">
              <div class="box-header" style="margin-bottom:6px;">
                <label style="margin:0;">5. 30개 황금비율 해시태그 칩셋</label>
                <span class="kpi-unit" style="color:${theme.brand}; font-weight:800;">30 / 30개 최적화</span>
              </div>
              <div class="tag-cloud">
                <span class="h-tag heavy">#부동산투자</span>
                <span class="h-tag heavy">#갭투자</span>
                <span class="h-tag heavy">#재테크그램</span>
                <span class="h-tag mid">#아파트실거래가</span>
                <span class="h-tag mid">#수도권부동산</span>
                <span class="h-tag mid">#임장노트</span>
                <span class="h-tag mid">#내집마련</span>
                <span class="h-tag small">#부린이탈출</span>
                <span class="h-tag small">#2026부동산</span>
                <span class="h-tag small">#경제적자유</span>
              </div>
            </div>

            <div class="action-footer">
              <button class="${theme.btnClass}" style="width:100%; justify-content:center; padding:14px;">
                🚀 인스타그램 즉시 포스팅 / 예약 발행 실행 →
              </button>
            </div>
          </div>
        </div>

        <!-- 우측: 1:1 정방형 실시간 스마트폰 뷰파인더 덱 목업 -->
        <div class="phone-pane">
          <div class="phone-mockup">
            <div class="phone-top-bar">
              <span class="time">09:41</span>
              <div class="notch"></div>
              <span class="icons">📶 🔋</span>
            </div>

            <div class="insta-app-header">
              <span class="app-logo">Instagram</span>
              <div class="app-actions">❤️ 💬 ➕</div>
            </div>

            <!-- 피드 헤더 -->
            <div class="insta-feed-header">
              <div class="user-meta">
                <div class="story-ring">
                  <div class="avatar">🏢</div>
                </div>
                <div class="user-name-box">
                  <span class="u-name">realestate_master</span>
                  <span class="u-loc">Seoul, Korea</span>
                </div>
              </div>
              <span class="more-dots">•••</span>
            </div>

            <!-- 1:1 정방형 이미지 뷰파인더 -->
            <div class="insta-media-viewport">
              <div class="slide-indicator">1/5</div>
              <div class="canvas-art">
                <div class="art-tag">2026 PROPTECH GUIDE</div>
                <div class="art-headline">직장인을 위한<br><span style="color:#FFF; background:rgba(0,0,0,0.6); padding:2px 8px; border-radius:4px;">소액 갭투자</span><br>완벽 실전 로드맵</div>
                <div class="art-badge">국토부 실거래가 빅데이터 기반</div>
              </div>
            </div>

            <!-- 하단 인터랙션 아이콘 -->
            <div class="insta-actions-bar">
              <div class="left-icons">❤️ 💬 ✈️</div>
              <div class="right-icon">🔖</div>
            </div>

            <!-- 캡션 미리보기 -->
            <div class="insta-caption-box">
              <p><strong>realestate_master</strong> "지금 수도권 갭투자, 정말 끝났을까요?" 💡 실제로 2026년 국토부 실거래가를 전수 분석해보면...</p>
              <span class="comments-link">댓글 48개 모두 보기</span>
              <span class="time-ago">2분 전 • 원본 오디오</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. 4단계 마스터 가이드북 (03_guide)
  else if (screenId === '03_guide') {
    bodyContent = `
      <div class="guide-container">
        <div class="header-hero">
          <div class="badge-pill">📖 META GRAPH API & VIRAL MASTERBOOK</div>
          <h1 class="hero-title">인스타그램 공식 Graph API 연동 & 쉐도우밴 안전 마스터 가이드북</h1>
          <p class="hero-desc">Meta 공식 API 보안 표준 및 인스타그램 알고리즘 최신 정책(v21.0)을 기반으로 계정 정지 없는 100% 안전 포스팅 노하우를 제공합니다.</p>
        </div>

        <div class="guide-grid">
          <div class="guide-card">
            <div class="g-num">STEP 1</div>
            <h2 class="g-title">Meta for Developers 비즈니스 연동 3분 컷</h2>
            <p class="g-desc">개인 계정에서 프로페셔널(비즈니스/크리에이터) 계정으로 무료 전환 후 Facebook 페이지와 1:1 연결하는 공식 표준 절차입니다.</p>
            <ul class="g-list">
              <li>인스타그램 앱 > 설정 및 개인정보 > 계정 유형 > 프로페셔널 계정 전환</li>
              <li>Facebook 페이지 신규 생성 후 인스타그램 비즈니스 계정과 상호 연동</li>
              <li>Meta Graph API Explorer에서 <code>instagram_basic</code>, <code>instagram_content_publish</code> 권한 획득</li>
            </ul>
          </div>

          <div class="guide-card">
            <div class="g-num">STEP 2</div>
            <h2 class="g-title">쉐도우밴(Shadowban) 100% 방지 5대 수칙</h2>
            <p class="g-desc">무차별 자동화나 금지 해시태그로 인한 검색 누락 및 계정 정지를 원천 차단하는 안전 알고리즘 규칙입니다.</p>
            <ul class="g-list">
              <li><strong>시간당 발행 상한:</strong> 시간당 최대 2건, 일일 8건 이하 권장</li>
              <li><strong>금지 해시태그 필터:</strong> 스팸으로 분류된 1,200개 금지 태그 자동 차단</li>
              <li><strong>인간 모사 지연:</strong> 연속 발행 시 15~45분의 난수 딜레이 적용</li>
              <li><strong>중복 이미지 해시 변경:</strong> 메타데이터 자동 재인코딩으로 중복 감지 방지</li>
            </ul>
          </div>

          <div class="guide-card">
            <div class="g-num">STEP 3</div>
            <h2 class="g-title">릴스 & 피드 Explore 추천 알고리즘 공식</h2>
            <p class="g-desc">인스타 탐색 탭(Explore)에 강제 노출되어 팔로워가 폭발적으로 증가하는 3대 뇌파 후킹 메커니즘입니다.</p>
            <ul class="g-list">
              <li><strong>첫 3초 후킹:</strong> 1페이지 표지 고대비 볼드 타이틀 & 궁금증 유발 질문</li>
              <li><strong>체류 시간 극대화:</strong> 5~8장의 카드뉴스 캐러셀로 끝까지 넘겨보게 유도</li>
              <li><strong>저장(Save) 유도:</strong> "나중에 다시 보려면 저장하세요" CTA 문구 필수</li>
            </ul>
          </div>

          <div class="guide-card">
            <div class="g-num">STEP 4</div>
            <h2 class="g-title">인스타그램 Graph API 오류코드 30초 응급복구</h2>
            <p class="g-desc">토큰 만료나 이미지 규격 불일치로 인한 발행 실패 시 자가 진단 및 원클릭 복구 가이드입니다.</p>
            <ul class="g-list">
              <li><strong>Error 190 (토큰 만료):</strong> 장기 액세스 토큰(60일) 자동 갱신 실행</li>
              <li><strong>Error 2207001 (이미지 규격):</strong> 1080×1080px 자동 리사이징 & RGB 변환</li>
              <li><strong>Error 36003 (미디어 업로드 지연):</strong> 3단계 상태 폴링 대기 후 자동 재시도</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // 4. 설정 & 2026-11-01 5단계 표준 로그인 (04_settings)
  else if (screenId === '04_settings') {
    bodyContent = `
      <div class="auth-wrapper">
        <div class="auth-container">
          <!-- 1단계: 프로그램 고유 로고 (68px 라운드 스퀘어 심볼) -->
          <div class="brand-logo-box">
            <div class="logo-symbol">📸</div>
          </div>

          <!-- 2단계: 프로그램 영문명 알약 뱃지 -->
          <div class="badge-capsule">AIMASTER INSTA POSTER</div>

          <!-- 3단계: 볼드 한글명 타이틀 & 서브 안내 카피 -->
          <h1 class="auth-title">INSTA 포스팅 자동화</h1>
          <p class="auth-subtitle">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>

          <!-- 4단계: 로그인/회원가입 폼 카드 -->
          <div class="auth-card">
            <div class="auth-tabs">
              <button class="tab-btn active">로그인</button>
              <button class="tab-btn">회원가입</button>
            </div>

            <form class="auth-form" onsubmit="event.preventDefault();">
              <div class="input-group">
                <label>이메일 주소</label>
                <div class="input-wrapper">
                  <span class="input-icon">✉️</span>
                  <input type="email" value="developer@example.com" placeholder="name@domain.com" />
                </div>
              </div>

              <div class="input-group">
                <div class="label-row">
                  <label>비밀번호</label>
                  <a href="#forgot" class="link-forgot">비밀번호 찾기?</a>
                </div>
                <div class="input-wrapper">
                  <span class="input-icon">🔒</span>
                  <input type="password" value="••••••••••••" placeholder="비밀번호 입력" />
                </div>
              </div>

              <button class="${theme.btnClass} w-full" style="padding:14px; width:100%; justify-content:center; margin-top:10px;">
                로그인 →
              </button>
            </form>

            <!-- 5단계: 약관 문구 1행 축소 처리 (2026-11-01 지침 준수) -->
            <p class="terms-single-line">
              진행 시 <a href="https://www.buylife.xyz/terms">이용약관</a> 및 <a href="https://www.buylife.xyz/privacy">개인정보 처리방침</a>에 동의합니다.
            </p>
          </div>

          <!-- 하단 Meta Graph API 및 페이스북 페이지 연동 콘솔 -->
          <div class="meta-integration-card">
            <div class="meta-header">
              <span>🔗 Meta Graph API 계정 연동 상태</span>
              <span class="tag-status">연결됨</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Instagram Business ID</span>
              <span class="meta-val">17841400293847291</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Facebook Page 매핑</span>
              <span class="meta-val">부동산마스터 공식 채널 (@realestate_master)</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Access Token 유효기간</span>
              <span class="meta-val">D-54일 (자동 연장 활성)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${templateId} - ${screenId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${theme.bg};
      color: ${theme.text};
      font-family: ${theme.fontFamily};
      padding: 30px;
      line-height: 1.5;
    }

    /* 공통 3D 버튼 규격 */
    .btn-3d-insta-sunset {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${theme.btnBg};
      color: #FFF !important;
      font-weight: 800;
      font-size: 14px;
      border: none;
      border-radius: 12px;
      border-bottom: 4px solid ${theme.btnBorder};
      box-shadow: 0 4px 15px ${theme.btnShadow};
      cursor: pointer;
      padding: 10px 18px;
    }
    .btn-3d-rose-gold {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${theme.btnBg};
      color: #FFF !important;
      font-weight: 800;
      font-size: 14px;
      border: none;
      border-radius: 12px;
      border-bottom: 4px solid ${theme.btnBorder};
      box-shadow: 0 4px 15px ${theme.btnShadow};
      cursor: pointer;
      padding: 10px 18px;
    }
    .btn-3d-neon-magenta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${theme.btnBg};
      color: #FFF !important;
      font-weight: 800;
      font-size: 14px;
      border: none;
      border-radius: 12px;
      border-bottom: 4px solid ${theme.btnBorder};
      box-shadow: 0 4px 15px ${theme.btnShadow};
      cursor: pointer;
      padding: 10px 18px;
    }
    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${theme.card};
      border: 1px solid ${theme.border};
      color: ${theme.text};
      font-weight: 700;
      font-size: 14px;
      border-radius: 12px;
      cursor: pointer;
      padding: 10px 18px;
    }

    /* 헤더 히어로 */
    .header-hero {
      background: ${theme.card};
      border: 1px solid ${theme.border};
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .badge-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 900;
      padding: 4px 12px;
      border-radius: 20px;
      background: rgba(225,48,108,0.15);
      color: ${theme.brand};
      border: 1px solid rgba(225,48,108,0.3);
      margin-bottom: 12px;
    }
    .hero-title {
      font-size: 26px;
      font-weight: 900;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .hero-desc {
      font-size: 14px;
      color: ${theme.muted};
      max-width: 800px;
      line-height: 1.6;
      margin-bottom: 18px;
    }
    .hero-actions {
      display: flex;
      gap: 12px;
    }

    /* KPI 카드 그리드 */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: ${theme.card};
      border: 1px solid ${theme.border};
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .kpi-label { font-size: 12px; color: ${theme.muted}; font-weight: 700; margin-bottom: 6px; }
    .kpi-val { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 4px; }
    .kpi-unit { font-size: 16px; font-weight: 700; margin-left: 2px; }
    .kpi-sub { font-size: 12px; color: ${theme.muted}; font-weight: 600; }
    .kpi-sub.green { color: #10B981; }
    .kpi-sub.accent { color: #F59E0B; }

    /* 4단계 파이프라인 */
    .card-section {
      background: ${theme.card};
      border: 1px solid ${theme.border};
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .section-title { font-size: 17px; font-weight: 900; margin-bottom: 16px; }
    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .pipe-step {
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      border-radius: 14px;
      padding: 16px;
      position: relative;
    }
    .pipe-step.active {
      border-color: ${theme.brand};
      box-shadow: 0 4px 15px rgba(225,48,108,0.15);
    }
    .step-num { font-size: 10px; font-weight: 900; color: ${theme.brand}; margin-bottom: 6px; }
    .step-icon { font-size: 22px; margin-bottom: 8px; }
    .step-title { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
    .step-desc { font-size: 12px; color: ${theme.muted}; line-height: 1.4; }

    /* 2열 그리드 */
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .card-box {
      background: ${theme.card};
      border: 1px solid ${theme.border};
      border-radius: 18px;
      padding: 20px;
    }
    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .box-title { font-size: 15px; font-weight: 800; }
    .tag-status {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(225,48,108,0.15);
      color: ${theme.brand};
    }
    .tag-live {
      font-size: 11px;
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 6px;
      background: #EF4444;
      color: #FFF;
      letter-spacing: 0.05em;
    }

    /* 썸네일 그리드 */
    .feed-thumbs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .thumb-item {
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      border-radius: 12px;
      overflow: hidden;
    }
    .thumb-img {
      height: 100px;
      background-size: cover;
      background-position: center;
    }
    .thumb-img.p1 {
      background: linear-gradient(135deg, #1E3A8A, #3B82F6);
    }
    .thumb-img.p2 {
      background: linear-gradient(135deg, #833AB4, #FD1D1D);
    }
    .thumb-meta { padding: 10px; }
    .t-badge { font-size: 10px; font-weight: 800; color: ${theme.brand}; }
    .t-caption { font-size: 12px; font-weight: 700; margin: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t-stats { font-size: 11px; color: ${theme.muted}; }

    /* 로그 리스트 */
    .log-list { display: flex; flex-direction: column; gap: 8px; }
    .log-item {
      padding: 10px 12px;
      border-radius: 10px;
      background: ${theme.card2};
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .log-time { color: ${theme.muted}; font-family: monospace; }
    .log-tag { font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: rgba(16,185,129,0.2); color: #10B981; }
    .log-tag.wait { background: rgba(245,158,11,0.2); color: #F59E0B; }
    .log-text { font-weight: 600; flex: 1; }

    /* 화면 2 (상세 에디터) */
    .detail-container {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
    }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 12px; font-weight: 800; color: ${theme.muted}; margin-bottom: 6px; }
    .type-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .type-card {
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .type-card.active { border-color: ${theme.brand}; background: rgba(225,48,108,0.06); }
    .t-icon { font-size: 20px; }
    .t-info strong { display: block; font-size: 13px; font-weight: 800; }
    .t-info p { font-size: 11px; color: ${theme.muted}; }
    .inp-box {
      width: 100%;
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      color: ${theme.text};
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .textarea-box {
      width: 100%;
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      color: ${theme.text};
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.6;
    }
    .tone-chips { display: flex; gap: 8px; }
    .chip {
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      cursor: pointer;
    }
    .chip.active {
      background: ${theme.brand};
      color: #FFF;
      border-color: ${theme.brand};
    }
    .tag-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      padding: 10px;
      border-radius: 10px;
    }
    .h-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(225,48,108,0.12);
      color: ${theme.brand};
    }
    .h-tag.heavy { border: 1px solid ${theme.brand}; }

    /* 스마트폰 뷰파인더 덱 목업 */
    .phone-pane {
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .phone-mockup {
      width: 360px;
      background: #000;
      border: 10px solid #2B2F38;
      border-radius: 36px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
      overflow: hidden;
      color: #FFF;
      font-family: -apple-system, sans-serif;
    }
    .phone-top-bar {
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 800;
    }
    .notch {
      width: 100px;
      height: 16px;
      background: #2B2F38;
      border-radius: 10px;
    }
    .insta-app-header {
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1E232F;
    }
    .app-logo { font-size: 18px; font-weight: 900; font-family: serif; font-style: italic; }
    .app-actions { font-size: 14px; letter-spacing: 6px; }

    .insta-feed-header {
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .user-meta { display: flex; align-items: center; gap: 8px; }
    .story-ring {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045);
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar {
      width: 100%;
      height: 100%;
      background: #111;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .user-name-box .u-name { font-size: 12px; font-weight: 800; display: block; }
    .user-name-box .u-loc { font-size: 10px; color: #8E8E8E; }

    .insta-media-viewport {
      width: 100%;
      aspect-ratio: 1/1;
      background: linear-gradient(135deg, #0F172A, #1E1B4B);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .slide-indicator {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: #FFF;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .canvas-art {
      border: 2px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.03);
      padding: 20px;
      border-radius: 16px;
      width: 100%;
    }
    .art-tag { font-size: 10px; font-weight: 900; color: #F59E0B; letter-spacing: 0.1em; margin-bottom: 8px; }
    .art-headline { font-size: 20px; font-weight: 900; line-height: 1.35; margin-bottom: 12px; }
    .art-badge { font-size: 10px; color: #94A3B8; font-weight: 600; }

    .insta-actions-bar {
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
    }
    .left-icons { letter-spacing: 8px; }

    .insta-caption-box {
      padding: 0 14px 14px;
      font-size: 12px;
      line-height: 1.4;
    }
    .insta-caption-box strong { font-weight: 800; margin-right: 4px; }
    .comments-link { display: block; font-size: 11px; color: #8E8E8E; margin-top: 4px; }
    .time-ago { display: block; font-size: 9px; color: #6E6E6E; margin-top: 2px; }

    /* 화면 3 (가이드북) */
    .guide-container { max-width: 1200px; margin: 0 auto; }
    .guide-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .guide-card {
      background: ${theme.card};
      border: 1px solid ${theme.border};
      border-radius: 18px;
      padding: 24px;
    }
    .g-num { font-size: 11px; font-weight: 900; color: ${theme.brand}; margin-bottom: 6px; }
    .g-title { font-size: 17px; font-weight: 900; margin-bottom: 10px; }
    .g-desc { font-size: 13px; color: ${theme.muted}; line-height: 1.5; margin-bottom: 14px; }
    .g-list { list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    .g-list li {
      position: relative;
      padding-left: 18px;
      line-height: 1.5;
    }
    .g-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: ${theme.brand};
      font-weight: 900;
      font-size: 16px;
      line-height: 1;
    }

    /* 화면 4 (5단계 표준 로그인) */
    .auth-wrapper {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${theme.bg};
    }
    .auth-container {
      width: 100%;
      max-w: 440px;
      max-width: 440px;
      text-align: center;
    }
    .brand-logo-box {
      margin-bottom: 14px;
      display: flex;
      justify-content: center;
    }
    .logo-symbol {
      width: 68px;
      height: 68px;
      border-radius: 20px;
      background: ${theme.brandGrad};
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(225,48,108,0.3);
    }
    .badge-capsule {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.05em;
      background: rgba(225,48,108,0.12);
      color: ${theme.brand};
      border: 1px solid rgba(225,48,108,0.3);
      margin-bottom: 10px;
    }
    .auth-title {
      font-size: 26px;
      font-weight: 900;
      margin-bottom: 6px;
    }
    .auth-subtitle {
      font-size: 13px;
      color: ${theme.muted};
      margin-bottom: 24px;
    }
    .auth-card {
      background: ${theme.card};
      border: 1px solid ${theme.border};
      border-radius: 22px;
      padding: 30px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.2);
    }
    .auth-tabs {
      display: flex;
      background: ${theme.card2};
      border-radius: 12px;
      padding: 4px;
      margin-bottom: 22px;
    }
    .tab-btn {
      flex: 1;
      padding: 10px;
      font-size: 12px;
      font-weight: 800;
      border: none;
      background: transparent;
      color: ${theme.muted};
      border-radius: 8px;
      cursor: pointer;
    }
    .tab-btn.active {
      background: ${theme.brand};
      color: #FFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .input-group { text-align: left; margin-bottom: 16px; }
    .input-group label { display: block; font-size: 12px; font-weight: 800; color: ${theme.muted}; margin-bottom: 6px; }
    .label-row { display: flex; justify-content: space-between; align-items: center; }
    .link-forgot { font-size: 11px; font-weight: 700; color: ${theme.brand}; text-decoration: none; }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 12px;
      font-size: 14px;
    }
    .input-wrapper input {
      width: 100%;
      background: ${theme.card2};
      border: 1px solid ${theme.border};
      color: ${theme.text};
      padding: 12px 14px 12px 38px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    .terms-single-line {
      margin-top: 24px;
      font-size: 11px;
      color: ${theme.muted};
      white-space: nowrap;
    }
    .terms-single-line a {
      color: ${theme.text};
      font-weight: 700;
      text-decoration: underline;
    }

    .meta-integration-card {
      margin-top: 20px;
      background: ${theme.card};
      border: 1px solid ${theme.border};
      border-radius: 16px;
      padding: 16px;
      text-align: left;
    }
    .meta-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${theme.border};
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 4px 0;
    }
    .meta-label { color: ${theme.muted}; font-weight: 600; }
    .meta-val { font-weight: 700; font-family: monospace; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

// 템플릿별 README.md 마크다운 생성기
function renderReadme(template) {
  return `# ${template.name}

## 1. 컨셉 개요
- **도메인**: 인스타그램 공식 Graph API 무결성 자동 포스팅 & 바이럴 마케팅
- **핵심 무드**: 인스타그램 특유의 네온 선셋 감성 및 1:1 모바일 뷰파인더 덱 목업
- **타이포그래피**: Pretendard Variable / JetBrains Mono

## 2. 4대 화면 구성
1. **01_main.png**: 메인 대시보드 & 4단계 인스타 바이럴 파이프라인 (연동 계정, 발행 통계, Explore 도달 지수, 실시간 스트림)
2. **02_detail.png**: AI 인스타 피드/카드뉴스 에디터 & 1:1 실시간 스마트폰 뷰파인더 덱 (30개 해시태그 칩셋 탑재)
3. **03_guide.png**: 인스타그램 공식 Graph API 연동 & 쉐도우밴 100% 방지 5대 안전수칙 마스터 가이드북
4. **04_settings.png**: Meta 공식 비즈니스 연동 & 2026-11-01 5단계 표준 로그인 폼 (68px 선셋 심볼 로고 + 1행 축소 약관)

## 3. 영구 자산 보존
- 본 자산은 100% 독립 보존되며 AIMaster 플랫폼의 디자인 라이브러리로 활용됩니다.
`;
}

// Playwright로 12개 뷰 1440px 고화질 캡처 실행
async function run() {
  console.log('🚀 INSTA 포스팅 자동화 4대 화면 3시안(12개 뷰) 렌더링 및 캡처 시작...');
  const { chromium } = await import('../real_estate_sales/node_modules/playwright/index.mjs');
  const browser = await chromium.launch();

  const screens = ['01_main', '02_detail', '03_guide', '04_settings'];

  for (let cIdx = 0; cIdx < TEMPLATES.length; cIdx++) {
    const t = TEMPLATES[cIdx];
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    for (let sIdx = 0; sIdx < screens.length; sIdx++) {
      const s = screens[sIdx];
      const htmlContent = renderScreen(t.id, s);
      await page.setContent(htmlContent, { waitUntil: 'networkidle' });

      const imgPath = path.join(t.folder, `${s}.png`);
      await page.screenshot({ path: imgPath, fullPage: true });
      console.log(`✅ [시안 ${cIdx + 1}] 화면 ${sIdx + 1} 캡처 완료: ${imgPath}`);
    }

    // README.md 저장
    const readmeContent = renderReadme(t);
    fs.writeFileSync(path.join(t.folder, 'README.md'), readmeContent, 'utf8');
    console.log(`📄 [시안 ${cIdx + 1}] README.md 작성 완료`);

    await page.close();
  }

  await browser.close();
  console.log('🎉 12개 뷰 고해상도 캡처 및 아카이빙 100% 완료!');
}

run().catch(err => {
  console.error('❌ 에러 발생:', err);
  process.exit(1);
});
