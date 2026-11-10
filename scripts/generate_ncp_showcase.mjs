import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '85_naver_cafe_pro_community_studio/naver-cafe-poster'),
  2: path.join(BASE_DIR, '86_quant_viral_cafe_radar_console/naver-cafe-poster'),
  3: path.join(BASE_DIR, '87_minimal_cafe_editorial_atelier/naver-cafe-poster'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 템플릿 생성 함수
function buildViewHtml(cNum, sNum) {
  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = 'AI 네이버 카페 포스팅 자동화';
  let logoBg = '';
  let accentColor = '';

  if (cNum === 1) {
    // 85. 네이버 카페 프로 커뮤니티 스튜디오 스타일 (네이버 시그니처 그린 & 딥 슬레이트 & 소프트 민트)
    themeCss = `
      --bg: #0C131F;
      --card: #131E2F;
      --card2: #1A283D;
      --border: #23354E;
      --border-bright: #324C6E;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #03C75A;
      --brand-hover: #00B050;
      --brand-accent: #00E676;
      --accent: #38BDF8;
      --gold: #F59E0B;
      --success: #10B981;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(3,199,90,0.15); color:#03C75A; border:1px solid rgba(3,199,90,0.3);">☕ NAVER CAFE PRO COMMUNITY STUDIO</span>`;
    btnClass = 'btn-3d-cafe-green';
    logoBg = 'linear-gradient(135deg, #03C75A 0%, #009E44 100%)';
    accentColor = '#03C75A';
  } else if (cNum === 2) {
    // 86. 퀀트 바이럴 카페 레이더 딥 차콜 콘솔 스타일 (옵시디언 딥블랙 & 네온 에메랄드 & 사이버 사이안)
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
      --brand-accent: #06B6D4;
      --accent: #8B5CF6;
      --gold: #F59E0B;
      --success: #10B981;
      font-family: "JetBrains Mono", -apple-system, BlinkMacSystemFont, monospace, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">⚡ QUANT VIRAL CAFE RADAR CONSOLE</span>`;
    btnClass = 'btn-3d-neon-emerald';
    logoBg = 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)';
    accentColor = '#10B981';
  } else {
    // 87. 미니멀 카페 에디토리얼 아틀리에 스타일 (클린 크림 페이퍼 & 소프트 올리브 세이지)
    themeCss = `
      --bg: #FAF9F6;
      --card: #FFFFFF;
      --card2: #F1F5F9;
      --border: #E2E8F0;
      --border-bright: #CBD5E1;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #15803D;
      --brand-hover: #166534;
      --brand-accent: #10B981;
      --accent: #0284C7;
      --gold: #D97706;
      --success: #15803D;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(21,128,61,0.1); color:#15803D; border:1px solid rgba(21,128,61,0.25);">🌿 MINIMAL CAFE EDITORIAL ATELIER</span>`;
    btnClass = 'btn-3d-sage-soft';
    logoBg = 'linear-gradient(135deg, #15803D 0%, #166534 100%)';
    accentColor = '#15803D';
  }

  // 화면별 본문 내용 렌더링
  let contentHtml = '';

  if (sNum === 1) {
    // 01_main: 대시보드 & 4단계 커뮤니티 파이프라인
    contentHtml = `
      <!-- 4단계 파이프라인 배너 -->
      <div class="pipeline-banner">
        <div class="pipeline-step active">
          <div class="step-num">01</div>
          <div class="step-info">
            <span class="step-title">1단계: 카페·게시판 연동</span>
            <span class="step-sub">네이버 OAuth & club_id 8개 매핑</span>
          </div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step active">
          <div class="step-num">02</div>
          <div class="step-info">
            <span class="step-title">2단계: 3대 글감 자동수집</span>
            <span class="step-sub">URL · RSS · Perplexity 팩트 실시간</span>
          </div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step">
          <div class="step-num">03</div>
          <div class="step-info">
            <span class="step-title">3단계: AI 초안 작성·검수</span>
            <span class="step-sub">카페 친근체 & 스마트에디터 서식</span>
          </div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step">
          <div class="step-num">04</div>
          <div class="step-info">
            <span class="step-title">4단계: 즉시·예약 자동발행</span>
            <span class="step-sub">네이버 공식 Cafe API 100% 무결성</span>
          </div>
        </div>
      </div>

      <!-- 상단 핵심 KPI 카드 4종 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">연동된 네이버 카페</div>
          <div class="kpi-value" style="color:var(--brand);">8<span class="unit">개 카페</span></div>
          <div class="kpi-foot"><span class="badge-tag success">정상 연동</span> 총 24개 타깃 게시판 활성</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">오늘 자동 수집 글감</div>
          <div class="kpi-value">42<span class="unit">건</span></div>
          <div class="kpi-foot"><span class="badge-tag info">실시간 탐색</span> RSS 28건 · 검색 14건</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">당일 발행 완료 게시글</div>
          <div class="kpi-value" style="color:var(--accent);">16<span class="unit">건</span></div>
          <div class="kpi-foot"><span class="badge-tag success">성공률 100%</span> 네이버 공식 API 송출</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">예약 대기 파이프라인</div>
          <div class="kpi-value" style="color:var(--gold);">5<span class="unit">건</span></div>
          <div class="kpi-foot"><span class="badge-tag warn">스케줄러 가동</span> 다음 발행 14:30 KST</div>
        </div>
      </div>

      <!-- 메인 2열 그리드: 수집 글감 레이더 + 최근 발행 현황 -->
      <div class="grid-2col">
        <!-- 좌측: 실시간 글감 수집 스트림 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">📡</span> 실시간 3대 글감 수집 스트림 (Candidates Feed)
            </div>
            <button class="${btnClass}">+ 새 글감 수집</button>
          </div>
          <div class="candidate-list">
            <div class="candidate-item">
              <div class="cand-tag" style="background:rgba(3,199,90,0.15); color:var(--brand);">RSS 뉴스</div>
              <div class="cand-body">
                <div class="cand-title">2026 하반기 신축 아파트 청약 가점 커트라인 분석 및 실전 전략</div>
                <div class="cand-meta">출처: 매일경제 부동산 · 수집 시각: 10분 전 · 신뢰도: 98%</div>
              </div>
              <button class="btn-secondary">초안 생성 ➔</button>
            </div>
            <div class="candidate-item">
              <div class="cand-tag" style="background:rgba(56,189,248,0.15); color:#38BDF8;">Perplexity</div>
              <div class="cand-body">
                <div class="cand-title">맥미니 M4 vs 고성능 윈도우 PC 가성비 실측 벤치마크 총정리</div>
                <div class="cand-meta">출처: 실시간 웹 검색 합성 · 수집 시각: 28분 전 · 키워드: AI 워크스테이션</div>
              </div>
              <button class="btn-secondary">초안 생성 ➔</button>
            </div>
            <div class="candidate-item">
              <div class="cand-tag" style="background:rgba(245,158,11,0.15); color:#F59E0B;">HTTP 크롤러</div>
              <div class="cand-body">
                <div class="cand-title">스마트스토어 초보 셀러를 위한 10단 상세페이지 작성 공식 및 주의사항</div>
                <div class="cand-meta">출처: 이커머스 트렌드랩 · 수집 시각: 1시간 전 · 요약 완료 (1,240자)</div>
              </div>
              <button class="btn-secondary">초안 생성 ➔</button>
            </div>
          </div>
        </div>

        <!-- 우측: 최근 발행 및 예약 현황 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">☕</span> 최근 카페 포스팅 실행 현황 (Publishing Logs)
            </div>
            <span class="badge-tag success">API 상태 정상</span>
          </div>
          <div class="table-box">
            <table class="data-table">
              <thead>
                <tr>
                  <th>대상 카페 / 게시판</th>
                  <th>게시글 제목</th>
                  <th>발행 방식</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>[부동산 스터디]</strong><br><small>자유토론방</small></td>
                  <td>2026 서울 역세권 재건축 유망 단지 임장기 공유합니다</td>
                  <td><span class="badge-tag info">즉시 발행</span></td>
                  <td><span class="badge-tag success">발행 완료</span></td>
                </tr>
                <tr>
                  <td><strong>[맥을 사랑하는 모임]</strong><br><small>IT 정보나눔</small></td>
                  <td>M4 맥미니 서브머신으로 3일간 굴려본 솔직 후기</td>
                  <td><span class="badge-tag warn">예약 발행</span></td>
                  <td><span class="badge-tag success">발행 완료</span></td>
                </tr>
                <tr>
                  <td><strong>[셀러들의 쉼터]</strong><br><small>마케팅 노하우</small></td>
                  <td>상세페이지 GIF 하나로 클릭 전환율 3배 올린 꿀팁</td>
                  <td><span class="badge-tag purple">스케줄러</span></td>
                  <td><span class="badge-tag warn">14:30 대기</span></td>
                </tr>
                <tr>
                  <td><strong>[스마트 재테크 포럼]</strong><br><small>칼럼방</small></td>
                  <td>월배당 ETF 5종 포트폴리오 수익률 직접 검증해봤습니다</td>
                  <td><span class="badge-tag info">즉시 발행</span></td>
                  <td><span class="badge-tag success">발행 완료</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: AI 카페 글쓰기 & 3대 소스 에디터 및 모바일 카페 뷰파인더
    contentHtml = `
      <div class="grid-editor">
        <!-- 좌측: 글감 선택 및 AI 어투 파라미터 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">⚙️</span> 글감 설정 & 페르소나</div>
            <span class="badge-tag success">GPT-4o / Claude 3.8</span>
          </div>
          <div class="form-group">
            <label class="form-label">발행 대상 카페 선택</label>
            <select class="form-select">
              <option>[부동산 스터디 공식] (club_id: 10293841) - 자유게시판 (menu_id: 12)</option>
              <option>[맥을 사랑하는 모임] (club_id: 20491823) - IT 기기 정보 (menu_id: 45)</option>
              <option>[스마트스토어 셀러 연합] (club_id: 39481726) - 실전 마케팅 노하우 (menu_id: 8)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">카페 회원 친근체 어투 (Tone & Voice)</label>
            <div class="chip-group">
              <span class="chip active">☕ 친근한 선배 회원체 (~했네요, 공유드려요)</span>
              <span class="chip">📊 팩트 중심 전문 칼럼체 (~합니다, 분석결과)</span>
              <span class="chip">💬 Q&A 소통 유도체 (~어떠신가요? 의견 나눠요)</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">선택된 글감 소스 (Source)</label>
            <div class="source-card">
              <div class="source-badge">Perplexity 팩트 검색</div>
              <div class="source-title">2026 수도권 GTX-A 노선 개통 역세권 실거래가 동향 보고서</div>
              <div class="source-snippet">수서-동탄 구간 개통 이후 주요 단지 매매가 및 전세가율 변동 추이 팩트 데이터 추출 완료.</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">포스팅 모드 선택 (3종)</label>
            <div class="chip-group">
              <span class="chip active">🚀 즉시 발행 (공식 API)</span>
              <span class="chip">⏰ 예약 발행 (스케줄러)</span>
              <span class="chip">📝 초안 보관 (발행 전 검수)</span>
            </div>
          </div>
          <button class="${btnClass}" style="width:100%; justify-content:center; margin-top:12px;">✨ AI 카페 글 원클릭 자동 생성</button>
        </div>

        <!-- 중앙: 스마트에디터 스타일 본문 에디터 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">✏️</span> 네이버 카페 본문 에디터</div>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary">임시저장</button>
              <button class="${btnClass}">카페 게시글 발행 ➔</button>
            </div>
          </div>
          <div class="form-group">
            <input type="text" class="form-input title-input" value="[임장기] GTX-A 개통 후 동탄역 인근 대장 아파트 주말 임장 다녀왔습니다!">
          </div>
          <div class="editor-toolbar">
            <button class="tb-btn">B</button>
            <button class="tb-btn">I</button>
            <button class="tb-btn">U</button>
            <button class="tb-btn">소제목</button>
            <button class="tb-btn">인용구</button>
            <button class="tb-btn">구분선</button>
            <button class="tb-btn">📷 사진첨부</button>
            <button class="tb-btn">🔗 링크</button>
          </div>
          <div class="editor-content">
            <p>안녕하세요 카페 회원님들! 주말 동안 날씨가 너무 좋아서 예전부터 눈여겨보던 <strong>GTX-A 동탄역 주변 주요 단지들</strong> 발품 팔고 왔습니다 ㅎㅎ</p>
            <br>
            <p>개통 전에는 반신반의하는 분위기도 있었는데, 실제로 수서역까지 20분 만에 꽂히는 걸 직접 타보니 체감이 완전히 다르더라구요!</p>
            <br>
            <div class="quote-box">
              "교통 혁명이 가져온 동탄역세권 대장 아파트의 최근 실거래가 변화와 현장 부동산 소장님들의 생생한 분위기 브리핑!"
            </div>
            <br>
            <p><strong>1. 역세권 도보권 대장단지 현장 분위기</strong></p>
            <p>호가 방어가 굉장히 딴딴하고 급매물은 이미 3월에 거의 다 소진된 상태였습니다. 특히 30대 신혼부부 및 판교/강남 출퇴근 실거주자 매수 문의가 꾸준하다고 하네요.</p>
            <br>
            <p>회원님들은 이번 GTX 개통 이후 수도권 남부권 가격 흐름 어떻게 보시나요? 댓글로 다양한 의견 편하게 남겨주세요~!</p>
          </div>
        </div>

        <!-- 우측: 모바일 네이버 카페 뷰파인더 덱 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">📱</span> 모바일 카페 실시간 뷰파인더</div>
            <span class="badge-tag info">Live Preview</span>
          </div>
          <div class="phone-mockup">
            <div class="phone-header">
              <span class="ph-back">‹</span>
              <span class="ph-cafe">부동산 스터디</span>
              <span class="ph-share">⠇</span>
            </div>
            <div class="phone-body">
              <div class="ph-menu">[자유게시판]</div>
              <div class="ph-title">[임장기] GTX-A 개통 후 동탄역 인근 대장 아파트 주말 임장 다녀왔습니다!</div>
              <div class="ph-author">
                <div class="ph-avatar">☕</div>
                <div>
                  <div class="ph-name">스마트임장러 <span class="badge-tag" style="padding:1px 4px; font-size:10px;">열심회원</span></div>
                  <div class="ph-date">2026.11.10. 14:15 · 조회 142 · 댓글 18</div>
                </div>
              </div>
              <div class="ph-text">
                안녕하세요 카페 회원님들! 주말 동안 날씨가 너무 좋아서 동탄역 주변 단지들 발품 팔고 왔습니다 ㅎㅎ<br><br>
                수서역까지 20분 만에 주파하는 걸 직접 타보니 체감이 확 다르네요...
              </div>
              <div class="ph-bottom-bar">
                <span>❤️ 좋아요 34</span>
                <span>💬 댓글 18</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: 4단계 올인원 카페 포스팅 마스터 가이드북 & 매핑 테이블
    contentHtml = `
      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header">
          <div class="panel-title">
            <span class="icon">📖</span> 네이버 카페 포스팅 자동화 4단계 마스터 가이드북 (/guide)
          </div>
          <span class="badge-tag success">초보자 5분 완벽 가이드</span>
        </div>
        <p style="color:var(--muted); font-size:14px; margin-bottom:20px;">
          네이버 공식 Cafe API(OAuth 2.0)를 통해 안전하게 글을 발행하기 위한 필수 설정 단계와 카페 고유 ID(club_id) 및 게시판 번호(menu_id) 추출법을 상세히 안내합니다.
        </p>

        <!-- 4단계 가이드 카드 그리드 -->
        <div class="guide-cards-grid">
          <div class="guide-card">
            <div class="gc-step">STEP 1</div>
            <div class="gc-title">네이버 개발자센터 API 등록</div>
            <p class="gc-desc">네이버 오픈API 센터에서 애플리케이션을 등록하고 [네이버 카페] 글쓰기 권한(OAuth)을 활성화하여 Client ID와 Secret을 발급받습니다.</p>
            <div class="gc-badge">소요시간: 2분</div>
          </div>
          <div class="guide-card">
            <div class="gc-step">STEP 2</div>
            <div class="gc-title">카페 club_id & menu_id 추출</div>
            <p class="gc-desc">글을 발행할 네이버 카페 주소의 웹 브라우저 URL 또는 소스 보기에서 clubid 파라미터와 게시판 번호를 확인해 시스템에 등록합니다.</p>
            <div class="gc-badge">원클릭 자동 감지 지원</div>
          </div>
          <div class="guide-card">
            <div class="gc-step">STEP 3</div>
            <div class="gc-title">3대 글감 소스 연결 & AI 톤 설정</div>
            <p class="gc-desc">RSS 뉴스 피드, 특정 웹 URL 기사, 또는 Perplexity 실시간 검색 키워드를 등록하고 카페 특성에 맞는 친근한 구어체 어투를 지정합니다.</p>
            <div class="gc-badge">3종 페르소나 프리셋</div>
          </div>
          <div class="guide-card">
            <div class="gc-step">STEP 4</div>
            <div class="gc-title">즉시 · 예약 · 정기 자동 발행</div>
            <p class="gc-desc">검수된 초안을 네이버 공식 API로 즉시 발행하거나, cron-job.org 회원 본인 키 스케줄러를 통해 지정된 요일/시간대에 분산 발행합니다.</p>
            <div class="gc-badge">계정 안전 100% 보장</div>
          </div>
        </div>
      </div>

      <!-- 카페 ID 및 게시판 매핑 안내 테이블 -->
      <div class="grid-2col">
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">🔍</span> 카페 club_id & 게시판 menu_id 확인 매트릭스</div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>카페 화면</th>
                <th>URL 패턴 / 추출 방법</th>
                <th>예시 값</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>카페 고유 ID</strong></td>
                <td>카페 홈 URL 또는 페이지 소스 내 <code>g_sClubId</code></td>
                <td><code>10293841</code></td>
              </tr>
              <tr>
                <td><strong>게시판 번호</strong></td>
                <td>게시판 클릭 시 URL 내 <code>search.clubid=...&search.menuid=...</code></td>
                <td><code>menu_id=12</code></td>
              </tr>
              <tr>
                <td><strong>말머리 번호</strong></td>
                <td>글쓰기 시 말머리 셀렉트박스 옵션 번호 (선택)</td>
                <td><code>headid=3</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">🛡️</span> 네이버 카페 안전 운영 5대 수칙</div>
            <span class="badge-tag warn">필독 수칙</span>
          </div>
          <ul class="rule-list">
            <li><strong>1. 공식 API 연동</strong>: 비인가 매크로/셀레니움 방식이 아니므로 캡차 차단 위험이 없습니다.</li>
            <li><strong>2. 과도한 연속 도배 금지</strong>: 동일 카페 내 포스팅은 최소 30분~1시간 이상의 간격을 권장합니다.</li>
            <li><strong>3. 카페별 성격 맞춤</strong>: 카페마다 규정된 홍보/자유게시판 규칙을 준수하여 작성합니다.</li>
            <li><strong>4. 친근한 구어체 권장</strong>: 지나친 광고성 문구 대신 경험 공유형 톤을 유지합니다.</li>
            <li><strong>5. 토큰 만료 시 재연동</strong>: 네이버 로그인 갱신 토큰으로 안전하게 유지 관리됩니다.</li>
          </ul>
        </div>
      </div>
    `;
  } else {
    // 04_settings: 네이버 공식 Cafe API 연동 & 2026-11-01 5단계 표준 로그인/설정
    contentHtml = `
      <div class="login-wrapper">
        <!-- 2026-11-01 5단계 표준 로그인 폼 카드 -->
        <div class="login-card">
          <!-- 1단계: 프로그램 고유 로고 (68px 라운드 스퀘어) -->
          <div class="login-logo-box" style="background:${logoBg};">
            ☕
          </div>

          <!-- 2단계: 프로그램 영문명 (알약 캡슐 뱃지) -->
          <div class="login-pill-badge">
            AIMASTER NAVER CAFE POSTER
          </div>

          <!-- 3단계: 프로그램 한글명 & 서브 타이틀 -->
          <h1 class="login-title">네이버 카페 포스팅 자동화</h1>
          <p class="login-subtitle">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>

          <!-- 4단계: 로그인/회원가입 폼 카드 -->
          <div class="login-form-box">
            <div class="tab-segments">
              <button class="tab-seg active">로그인</button>
              <button class="tab-seg">회원가입</button>
            </div>
            <div class="form-group">
              <label class="form-label">이메일 주소</label>
              <input type="email" class="form-input" value="buylifemall@gmail.com" placeholder="name@example.com">
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <label class="form-label">비밀번호</label>
                <a href="#" class="forgot-link">비밀번호 찾기?</a>
              </div>
              <input type="password" class="form-input" value="••••••••••••" placeholder="비밀번호 입력">
            </div>
            <button class="${btnClass}" style="width:100%; justify-content:center; padding:12px; font-size:15px; margin-top:10px;">
              로그인 ➔
            </button>
          </div>

          <!-- 5단계: 약관 문구 1행 축소 처리 (필수) -->
          <div class="terms-single-line">
            진행 시 <a href="/terms">이용약관</a> 및 <a href="/privacy">개인정보 처리방침</a>에 동의합니다.
          </div>
        </div>

        <!-- 우측: 네이버 공식 OAuth 및 카페 매핑 설정 카드 -->
        <div class="settings-card">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">🔐</span> 네이버 공식 계정 연동 및 카페 매핑</div>
            <span class="badge-tag success">OAuth 2.0 연결됨</span>
          </div>

          <div class="connected-account-box">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="naver-n-logo">N</div>
              <div>
                <div style="font-weight:700; font-size:15px;">네이버 연동 계정: buy***@naver.com</div>
                <div style="color:var(--muted); font-size:12px;">카페 글쓰기 권한(Cafe Write API) 정상 승인됨</div>
              </div>
            </div>
            <button class="btn-secondary" style="font-size:12px;">재연동</button>
          </div>

          <div class="form-group" style="margin-top:20px;">
            <label class="form-label">등록된 타깃 카페 및 게시판 매핑 목록 (8개 활성)</label>
            <div class="table-box">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>카페명</th>
                    <th>club_id</th>
                    <th>기본 게시판</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>부동산 스터디</strong></td>
                    <td><code>10293841</code></td>
                    <td>자유토론방 (menu_id: 12)</td>
                    <td><button class="btn-secondary" style="padding:4px 8px; font-size:11px;">수정</button></td>
                  </tr>
                  <tr>
                    <td><strong>맥을 사랑하는 모임</strong></td>
                    <td><code>20491823</code></td>
                    <td>IT 정보나눔 (menu_id: 45)</td>
                    <td><button class="btn-secondary" style="padding:4px 8px; font-size:11px;">수정</button></td>
                  </tr>
                  <tr>
                    <td><strong>스마트스토어 셀러 연합</strong></td>
                    <td><code>39481726</code></td>
                    <td>마케팅 노하우 (menu_id: 8)</td>
                    <td><button class="btn-secondary" style="padding:4px 8px; font-size:11px;">수정</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
            <button class="btn-secondary">+ 새 카페 추가 등록</button>
            <button class="${btnClass}">설정 저장 완료</button>
          </div>
        </div>
      </div>
    `;
  }

  // 전체 HTML 골격 조합
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>시안 ${cNum} - 화면 ${sNum}</title>
  <style>
    ${themeCss}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }

    /* 3D 엠보싱 버튼 규격 */
    .btn-3d-cafe-green {
      background: linear-gradient(180deg, #03C75A 0%, #00A84B 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #34D399;
      box-shadow: 0 4px 0 #007A34, 0 8px 16px rgba(3,199,90,0.35);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-cafe-green:hover { transform: translateY(1px); box-shadow: 0 2px 0 #007A34; }

    .btn-3d-neon-emerald {
      background: linear-gradient(180deg, #10B981 0%, #059669 100%);
      color: #04141A;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #34D399;
      box-shadow: 0 4px 0 #047857, 0 8px 16px rgba(16,185,129,0.35);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-neon-emerald:hover { transform: translateY(1px); box-shadow: 0 2px 0 #047857; }

    .btn-3d-sage-soft {
      background: linear-gradient(180deg, #15803D 0%, #166534 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #22C55E;
      box-shadow: 0 4px 0 #14532D, 0 8px 16px rgba(21,128,61,0.25);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-sage-soft:hover { transform: translateY(1px); box-shadow: 0 2px 0 #14532D; }

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
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #FFF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .brand-text h2 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .brand-text p {
      font-size: 11px;
      color: var(--muted);
    }
    .badge {
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 20px;
      letter-spacing: 0.04em;
    }

    /* 4단계 파이프라인 배너 */
    .pipeline-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 24px;
      margin-bottom: 20px;
    }
    .pipeline-step {
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0.5;
    }
    .pipeline-step.active {
      opacity: 1;
    }
    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--brand);
      color: #FFF;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .pipeline-step:not(.active) .step-num {
      background: var(--card2);
      color: var(--muted);
      border: 1px solid var(--border);
    }
    .step-info {
      display: flex;
      flex-direction: column;
    }
    .step-title {
      font-size: 13px;
      font-weight: 800;
    }
    .step-sub {
      font-size: 11px;
      color: var(--muted);
    }
    .pipeline-arrow {
      color: var(--border-bright);
      font-weight: 900;
      font-size: 14px;
    }

    /* KPI 카드 그리드 */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .kpi-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .kpi-value .unit {
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      margin-left: 4px;
    }
    .kpi-foot {
      font-size: 11px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* 뱃지 태그 */
    .badge-tag {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 6px;
      display: inline-block;
    }
    .badge-tag.success { background: rgba(16,185,129,0.15); color: #10B981; }
    .badge-tag.info { background: rgba(56,189,248,0.15); color: #38BDF8; }
    .badge-tag.warn { background: rgba(245,158,11,0.15); color: #F59E0B; }
    .badge-tag.purple { background: rgba(139,92,246,0.15); color: #8B5CF6; }

    /* 패널 및 박스 */
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .panel-title {
      font-size: 15px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* 2열 그리드 */
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    /* 글감 리스트 */
    .candidate-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .candidate-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .cand-tag {
      font-size: 11px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .cand-body {
      flex: 1;
    }
    .cand-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .cand-meta {
      font-size: 11px;
      color: var(--muted);
    }

    /* 테이블 */
    .table-box {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th {
      text-align: left;
      padding: 10px;
      background: var(--card2);
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      font-weight: 700;
    }
    .data-table td {
      padding: 12px 10px;
      border-bottom: 1px solid var(--border);
    }

    /* 에디터 3열 그리드 */
    .grid-editor {
      display: grid;
      grid-template-columns: 320px 1fr 340px;
      gap: 18px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
      display: block;
      color: var(--muted);
    }
    .form-select, .form-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-bright);
      background: var(--card2);
      color: var(--text);
      font-size: 13px;
    }
    .title-input {
      font-size: 16px;
      font-weight: 800;
      padding: 12px 14px;
    }
    .chip-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .chip {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--card2);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .chip.active {
      border-color: var(--brand);
      background: rgba(3,199,90,0.1);
      color: var(--brand);
      font-weight: 800;
    }

    /* 소스 카드 */
    .source-card {
      padding: 12px;
      border-radius: 8px;
      background: var(--card2);
      border: 1px solid var(--border);
    }
    .source-badge {
      font-size: 10px;
      font-weight: 800;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .source-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .source-snippet {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.4;
    }

    /* 에디터 툴바 & 콘텐츠 */
    .editor-toolbar {
      display: flex;
      gap: 6px;
      padding: 8px 10px;
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 8px 8px 0 0;
      border-bottom: none;
    }
    .tb-btn {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 4px;
      cursor: pointer;
    }
    .editor-content {
      border: 1px solid var(--border);
      border-radius: 0 0 8px 8px;
      padding: 16px;
      background: var(--card2);
      min-height: 380px;
      font-size: 13px;
      line-height: 1.7;
    }
    .quote-box {
      border-left: 3px solid var(--brand);
      padding: 8px 14px;
      background: rgba(3,199,90,0.06);
      margin: 10px 0;
      font-style: italic;
    }

    /* 모바일 폰 목업 */
    .phone-mockup {
      width: 100%;
      border-radius: 24px;
      border: 2px solid var(--border-bright);
      background: var(--card2);
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .phone-header {
      background: var(--card);
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      font-weight: 800;
    }
    .phone-body {
      padding: 14px;
      font-size: 12px;
    }
    .ph-menu {
      font-size: 10px;
      color: var(--brand);
      font-weight: 800;
      margin-bottom: 4px;
    }
    .ph-title {
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .ph-author {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .ph-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--brand);
      color: #FFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .ph-name {
      font-size: 11px;
      font-weight: 700;
    }
    .ph-date {
      font-size: 10px;
      color: var(--muted);
    }
    .ph-text {
      color: var(--text);
      line-height: 1.6;
      margin-bottom: 14px;
    }
    .ph-bottom-bar {
      display: flex;
      gap: 14px;
      font-size: 11px;
      color: var(--muted);
      padding-top: 10px;
      border-top: 1px solid var(--border);
    }

    /* 가이드 카드 그리드 */
    .guide-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 16px;
    }
    .guide-card {
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .gc-step {
      font-size: 11px;
      font-weight: 900;
      color: var(--brand);
      margin-bottom: 6px;
    }
    .gc-title {
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .gc-desc {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .gc-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      background: var(--card);
      border-radius: 6px;
      display: inline-block;
      color: var(--muted);
    }
    .rule-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 12px;
    }
    .rule-list li {
      padding: 8px 12px;
      background: var(--card2);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    /* 5단계 표준 로그인 규격 레이아웃 */
    .login-wrapper {
      display: grid;
      grid-template-columns: 440px 1fr;
      gap: 28px;
      align-items: start;
    }
    .login-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 32px 28px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .login-logo-box {
      width: 68px;
      height: 68px;
      border-radius: 18px;
      margin: 0 auto 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: #FFF;
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    }
    .login-pill-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(3,199,90,0.12);
      color: var(--brand);
      border: 1px solid rgba(3,199,90,0.25);
      margin-bottom: 12px;
    }
    .login-title {
      font-size: 22px;
      font-weight: 900;
      margin-bottom: 6px;
      letter-spacing: -0.02em;
    }
    .login-subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 22px;
    }
    .login-form-box {
      text-align: left;
    }
    .tab-segments {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: var(--card2);
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 16px;
    }
    .tab-seg {
      padding: 8px;
      font-size: 12px;
      font-weight: 700;
      border: none;
      background: transparent;
      color: var(--muted);
      border-radius: 8px;
      cursor: pointer;
    }
    .tab-seg.active {
      background: var(--card);
      color: var(--text);
      font-weight: 800;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .forgot-link {
      font-size: 11px;
      color: var(--muted);
      text-decoration: none;
    }
    .terms-single-line {
      font-size: 11px;
      color: var(--muted);
      margin-top: 20px;
      white-space: nowrap;
    }
    .terms-single-line a {
      color: var(--brand);
      text-decoration: none;
      font-weight: 700;
    }
    .settings-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .connected-account-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .naver-n-logo {
      width: 36px;
      height: 36px;
      background: #03C75A;
      color: #FFF;
      font-weight: 900;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="top-navbar">
    <div class="brand-left">
      <div class="brand-logo" style="background:${logoBg};">☕</div>
      <div class="brand-text">
        <h2>${brandName}</h2>
        <p>네이버 공식 Cafe API 100% 무결성 포스팅 파이프라인</p>
      </div>
    </div>
    <div>${themeBadge}</div>
  </div>

  ${contentHtml}
</body>
</html>`;
}

async function run() {
  console.log('🚀 네이버 카페 포스팅 자동화 4대 화면 3시안(12개 뷰) 렌더링 및 캡처 시작...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const screenNames = ['01_main', '02_detail', '03_guide', '04_settings'];

  for (let c = 1; c <= 3; c++) {
    const outDir = OUT_DIRS[c];
    for (let s = 1; s <= 4; s++) {
      const sName = screenNames[s - 1];
      const html = buildViewHtml(c, s);
      const tempHtmlPath = path.join(outDir, `${sName}.html`);
      fs.writeFileSync(tempHtmlPath, html, 'utf-8');

      await page.goto(`file://${tempHtmlPath}`);
      await page.waitForTimeout(300);

      const pngPath = path.join(outDir, `${sName}.png`);
      await page.screenshot({ path: pngPath, fullPage: true });
      console.log(`✅ [시안 ${c}] 화면 ${s} 캡처 완료: ${pngPath}`);

      // D:\Antigravity\Design 루트에도 복사 (라이트박스 뷰어용)
      const rootPngName = `ncp_${sName}_c${c}.png`;
      fs.copyFileSync(pngPath, path.join(BASE_DIR, rootPngName));
    }

    // 각 시안별 README.md 작성
    let readmeContent = '';
    if (c === 1) {
      readmeContent = `# 85. 네이버 카페 프로 커뮤니티 스튜디오 스타일 (Naver Cafe Pro Community Studio)

- **컨셉**: 네이버 공식 카페 시그니처 그린(#03C75A)과 딥 슬레이트 잉크(#0F172A), 소프트 민트 서피스를 조화롭게 배색한 1순위 추천 스타일.
- **핵심 특징**:
  - 전문 카페 매니저/운영진의 스마트 퍼블리싱 덱
  - 4단계 커뮤니티 파이프라인 인디케이터 배너
  - 3D 엠보싱 카페 그린 버튼 (\`.btn-3d-cafe-green\`)
  - 실시간 글감 수집 스트림(URL/RSS/Perplexity) & 모바일 네이버 카페 뷰파인더 덱
  - 2026-11-01 5단계 표준 로그인 레이아웃 & 1행 약관 완비
- **화면 구성**:
  - \`01_main.png\`: 대시보드 및 4단계 파이프라인 배너, 4대 핵심 KPI 카드
  - \`02_detail.png\`: AI 카페 글쓰기 & 3대 소스 에디터 및 모바일 카페 뷰파인더
  - \`03_guide.png\`: 올인원 카페 포스팅 마스터 가이드북 & 매핑 테이블
  - \`04_settings.png\`: 네이버 공식 Cafe API 연동 & 5단계 표준 로그인/설정
`;
    } else if (c === 2) {
      readmeContent = `# 86. 퀀트 바이럴 카페 레이더 딥 차콜 콘솔 스타일 (Quant Viral Cafe Radar Console)

- **컨셉**: 옵시디언 딥블랙(#070A12) 배경에 네온 에메랄드(#10B981)와 사이버 사이안(#06B6D4) HUD를 결합한 하이테크 퀀트 콘솔.
- **핵심 특징**:
  - 초정밀 카페 침투 마케팅 및 실시간 트렌드 키워드 감지 HUD
  - 3D 엠보싱 네온 에메랄드 버튼 (\`.btn-3d-neon-emerald\`)
  - JetBrains Mono 폰트 기반의 고밀도 데이터 관제 인터페이스
  - 바이럴 점수(Viral Score) 및 A/B 스플릿 생성기
  - 2026-11-01 5단계 표준 로그인 레이아웃 & 1행 약관 완비
- **화면 구성**:
  - \`01_main.png\`: 사이버 퀀트 레이더 대시보드 & 실시간 트렌드 피드
  - \`02_detail.png\`: 퀀트 바이럴 대본 & 초안 터미널 및 모바일 실시간 프리뷰
  - \`03_guide.png\`: 퀀트 카페 침투 전략 가이드북 & 계정 안전 5대 수칙
  - \`04_settings.png\`: 보안 키 관리 & 5단계 다크 로그인/설정
`;
    } else {
      readmeContent = `# 87. 미니멀 카페 에디토리얼 아틀리에 스타일 (Minimal Cafe Editorial Atelier)

- **컨셉**: 장시간 글쓰기 및 커뮤니티 관리 시 눈의 피로를 최소화하는 클린 아이보리 페이퍼(#FAF9F6) & 소프트 올리브 세이지(#15803D) 아틀리에.
- **핵심 특징**:
  - 매거진 스타일의 정갈하고 우아한 카드 레이아웃
  - 3D 엠보싱 소프트 세이지 버튼 (\`.btn-3d-sage-soft\`)
  - 무소음 집중형(Zen) 듀얼 에디터
  - 초보자 친화형 일러스트레이션 가이드북
  - 2026-11-01 5단계 표준 로그인 레이아웃 & 1행 약관 완비
- **화면 구성**:
  - \`01_main.png\`: 클린 에디토리얼 브리핑 데스크 & 카드형 글감 큐레이션
  - \`02_detail.png\`: 무소음 집중형(Zen) 카페 에디터 & 모바일 뷰파인더
  - \`03_guide.png\`: 초보자 친화형 카페 ID/게시판 번호 추출 매뉴얼
  - \`04_settings.png\`: 미니멀 페이퍼 설정 & 5단계 표준 로그인
`;
    }

    fs.writeFileSync(path.join(outDir, 'README.md'), readmeContent, 'utf-8');
    console.log(`📄 [시안 ${c}] README.md 작성 완료`);
  }

  await browser.close();
  console.log('🎉 12개 뷰 고해상도 캡처 및 아카이빙 100% 완료!');
}

run().catch(err => {
  console.error('❌ 에러 발생:', err);
  process.exit(1);
});
