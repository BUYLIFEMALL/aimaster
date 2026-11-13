import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '107_elevenst_red_seller_studio/elevenst-register'),
  2: path.join(BASE_DIR, '108_quant_openmarket_radar_hud/elevenst-register'),
  3: path.join(BASE_DIR, '109_clean_nordic_ecommerce_atelier/elevenst-register'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 뷰 생성 함수
function buildViewHtml(cNum, sNum) {
  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = 'AI 11번가 상품 자동등록기';
  let logoBg = '';
  let accentColor = '';

  if (cNum === 1) {
    // 107. 11번가 오리지널 레드 & 화이트 셀러 스튜디오 스타일
    themeCss = `
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card2: #F1F5F9;
      --border: #E2E8F0;
      --border-bright: #CBD5E1;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #FA0050;
      --brand-hover: #E60045;
      --brand-light: #FFF0F4;
      --accent: #FF4D79;
      --accent-sub: #2563EB;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(250,0,80,0.12); color:#FA0050; border:1px solid rgba(250,0,80,0.25);">🔴 11ST ORIGINAL RED STUDIO</span>`;
    btnClass = 'btn-3d-red';
    logoBg = 'linear-gradient(135deg, #FA0050 0%, #E60045 100%)';
    accentColor = '#FA0050';
  } else if (cNum === 2) {
    // 108. 퀀트 오픈마켓 셀러 인텔리전스 레이더 HUD 콘솔 스타일
    themeCss = `
      --bg: #090D16;
      --card: #0F172A;
      --card2: #151F36;
      --border: #1E293B;
      --border-bright: #334155;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #00F2FE;
      --brand-hover: #0284C7;
      --brand-light: rgba(0,242,254,0.1);
      --accent: #F59E0B;
      --accent-sub: #10B981;
      --gold: #F59E0B;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, monospace, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(0,242,254,0.12); color:#00F2FE; border:1px solid rgba(0,242,254,0.3);">⚡ QUANT 11ST RADAR HUD</span>`;
    btnClass = 'btn-3d-cyan';
    logoBg = 'linear-gradient(135deg, #00F2FE 0%, #0284C7 100%)';
    accentColor = '#00F2FE';
  } else {
    // 109. 클린 노르딕 이커머스 페이퍼 아틀리에 스타일
    themeCss = `
      --bg: #FAF9F6;
      --card: #FFFFFF;
      --card2: #F4F1EA;
      --border: #E5E1D8;
      --border-bright: #D3CDC1;
      --text: #1E293B;
      --muted: #64748B;
      --brand: #EA580C;
      --brand-hover: #C2410C;
      --brand-light: #FFF7ED;
      --accent: #0D9488;
      --accent-sub: #3B82F6;
      --gold: #D97706;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", serif, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(234,88,12,0.12); color:#EA580C; border:1px solid rgba(234,88,12,0.25);">🌿 NORDIC COMMERCE ATELIER</span>`;
    btnClass = 'btn-3d-terracotta';
    logoBg = 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
    accentColor = '#EA580C';
  }

  // 4대 핵심 화면 본문 구성
  let contentHtml = '';

  if (sNum === 1) {
    // 화면 1: 메인 대시보드 (/home)
    contentHtml = `
      <!-- 4단계 파이프라인 배너 -->
      <div class="pipeline-banner">
        <div class="pipeline-step active">
          <span class="step-num">1</span>
          <div class="step-txt"><b>11번가 API 연동</b><span>OPEN API Key 등록됨</span></div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step active">
          <span class="step-num">2</span>
          <div class="step-txt"><b>상품 정보 불러오기</b><span>상세페이지 연계 12건</span></div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step active">
          <span class="step-num">3</span>
          <div class="step-txt"><b>XML 스펙 검사</b><span>10원단위·고시40종</span></div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step">
          <span class="step-num">4</span>
          <div class="step-txt"><b>11번가 전송 & 전시중지</b><span>안전 전송 대기</span></div>
        </div>
      </div>

      <!-- 핵심 상태 4대 KPI 카드 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">API 통신 상태</div>
          <div class="kpi-val text-green">200 OK</div>
          <div class="kpi-sub">서울 리전(icn1) 다이렉트 통신</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">등록 대기 상품</div>
          <div class="kpi-val">12건</div>
          <div class="kpi-sub">상세페이지 완료 상품 연계</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">누적 등록 성공</div>
          <div class="kpi-val text-brand">53건</div>
          <div class="kpi-sub">최근: 스위스톤 여행백팩 (#9752929791)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">보관 연장(사진상세)</div>
          <div class="kpi-val text-blue">적용 중</div>
          <div class="kpi-sub">관리자 권한: 사진 20장 지원</div>
        </div>
      </div>

      <!-- 최근 상품 등록 작업 목록 테이블 -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">📦 최근 11번가 등록 작업 및 대기 목록</div>
          <button class="${btnClass} btn-sm">+ 새 상품 검사 & 등록</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>상품명</th>
              <th>11번가 카테고리</th>
              <th>판매가</th>
              <th>배송비</th>
              <th>상세설명</th>
              <th>상태 / 번호</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="font-bold">스위스톤 확장형 여행백팩 (ST4D18)</div>
                <div class="text-xs text-muted">SKU: SWISS-BP-001 · 재고 99개</div>
              </td>
              <td><span class="badge badge-sub">남성가방 › 백팩 › 백팩 (#1011552)</span></td>
              <td><b>56,000원</b> <span class="text-xs text-muted">(정가 79,000)</span></td>
              <td>무료 (기본)</td>
              <td><span class="badge badge-accent">사진 12장 (보관연장)</span></td>
              <td><span class="badge badge-green">전시중지 (#9752929791)</span></td>
              <td><button class="btn-outline btn-xs">결과 확인</button></td>
            </tr>
            <tr>
              <td>
                <div class="font-bold">초경량 티타늄 캠핑 코펠 4종 세트</div>
                <div class="text-xs text-muted">SKU: CAMP-COOK-04 · 재고 45개</div>
              </td>
              <td><span class="badge badge-sub">스포츠/레저 › 캠핑 › 취사용품</span></td>
              <td><b>42,800원</b> <span class="text-xs text-muted">(10원 단위 정상)</span></td>
              <td>3,000원 (선결제)</td>
              <td><span class="badge badge-accent">사진 8장</span></td>
              <td><span class="badge badge-amber">검사 통과 · 전송 대기</span></td>
              <td><button class="${btnClass} btn-xs">11번가 전송</button></td>
            </tr>
            <tr>
              <td>
                <div class="font-bold">프리미엄 세라믹 무선 디퓨저 가습기</div>
                <div class="text-xs text-muted">SKU: DIFF-AIR-02 · 재고 120개</div>
              </td>
              <td><span class="badge badge-sub">가전 › 계절가전 › 가습기</span></td>
              <td><b>38,900원</b></td>
              <td>무료 (3만원이상)</td>
              <td><span class="badge badge-muted">텍스트 정보 고시</span></td>
              <td><span class="badge badge-blue">상세페이지 연계됨</span></td>
              <td><button class="btn-outline btn-xs">스펙 검사</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } else if (sNum === 2) {
    // 화면 2: 상품 등록 상세 (/products/[id])
    contentHtml = `
      <div class="split-layout">
        <!-- 좌측: 등록 파라미터 & 11번가 매핑 폼 -->
        <div class="split-main">
          <!-- 1. 기본 정보 & 카테고리 -->
          <div class="panel">
            <div class="panel-header">
              <div class="panel-title">1. 상품명 및 11번가 카테고리 매핑</div>
              <span class="badge badge-green">AI 자동 추천 일치 (99.4%)</span>
            </div>
            <div class="form-group">
              <label class="form-label">등록 상품명</label>
              <input type="text" class="input-text" value="스위스톤 확장형 여행백팩 대용량 방수 비즈니스 노트북 가방 (ST4D18)" />
            </div>
            <div class="form-group">
              <label class="form-label">11번가 표준 카테고리</label>
              <div class="flex-row">
                <input type="text" class="input-text" value="남성가방 › 백팩 › 백팩 [코드: 1011552]" readonly />
                <button class="btn-outline btn-sm">카테고리 변경</button>
              </div>
              <div class="chips-row">
                <span class="chip-item active">추천 1: 남성가방 › 백팩 › 백팩 (1011552)</span>
                <span class="chip-item">후보 2: 여행/레저 › 캐리어/여행가방 › 백팩 (1004128)</span>
              </div>
            </div>
          </div>

          <!-- 2. 판매가, 옵션 및 10원 단위 절사 -->
          <div class="panel">
            <div class="panel-header">
              <div class="panel-title">2. 판매 가격 & 10원 단위 검사 (11st 규격)</div>
              <span class="badge badge-brand">10원 단위 정합성 통과</span>
            </div>
            <div class="grid-3">
              <div class="form-group">
                <label class="form-label">정상가(정가)</label>
                <input type="text" class="input-text" value="79,000원" />
              </div>
              <div class="form-group">
                <label class="form-label">11번가 판매가 (10원 단위 필수)</label>
                <input type="text" class="input-text font-bold" value="56,000원" />
              </div>
              <div class="form-group">
                <label class="form-label">재고 수량</label>
                <input type="text" class="input-text" value="99개" />
              </div>
            </div>
            <div class="info-alert">
              💡 11번가 정책: 판매가는 반드시 10원 단위여야 하며, 1원 단위 끝전은 자동 절사되어 전송됩니다.
            </div>
          </div>

          <!-- 3. 배송 및 출고지/반품지 템플릿 -->
          <div class="panel">
            <div class="panel-header">
              <div class="panel-title">3. 배송 정책 & 출고/반품지 (11번가 셀러 템플릿)</div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">출고지 템플릿</label>
                <select class="input-select">
                  <option selected>[기본출고지] 경기 고양시 일산동구 백석동 물류센터 #2</option>
                  <option>[제2물류] 인천 서구 원창동 쿠팡 밀크런 센터</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">반품/교환지 템플릿</label>
                <select class="input-select">
                  <option selected>[기본반품지] 경기 고양시 일산동구 마두동 반품데스크 #3</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">배송비 정책</label>
                <select class="input-select">
                  <option selected>무료배송</option>
                  <option>유료 3,000원</option>
                  <option>조건부 무료 (50,000원 이상)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">발송 마감 시간 템플릿</label>
                <select class="input-select">
                  <option selected>평일 14:00 마감 당일 발송 (CJ대한통운)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 4. 상품고시 40개 유형 자동 매핑 -->
          <div class="panel">
            <div class="panel-header">
              <div class="panel-title">4. 상품정보제공고시 (40종 자동 매핑)</div>
              <span class="badge badge-sub">유형: 가방 (37종)</span>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">종류/소재</label>
                <input type="text" class="input-text" value="방수 고밀도 옥스포드 나일론 + PU 코팅" />
              </div>
              <div class="form-group">
                <label class="form-label">색상</label>
                <input type="text" class="input-text" value="매트 블랙 / 다크 그레이" />
              </div>
              <div class="form-group">
                <label class="form-label">크기 / 무게</label>
                <input type="text" class="input-text" value="32 x 48 x 18~24cm (확장형) / 1.1kg" />
              </div>
              <div class="form-group">
                <label class="form-label">제조자 / 수입자</label>
                <input type="text" class="input-text" value="스위스톤 OEM / 바이라이프 협력사" />
              </div>
            </div>
          </div>
        </div>

        <!-- 우측: 11번가 등록 프리뷰 & 전송 제어 덱 -->
        <div class="split-side">
          <div class="panel sticky-panel">
            <div class="panel-title mb-3">🚀 11번가 등록 관제 덱</div>
            <div class="preview-box">
              <div class="preview-badge">11st Live Simulator</div>
              <div class="preview-img-box">
                <div class="preview-placeholder">🎒 대표 사진: 1000x1000 JPG<br><span class="text-xs text-muted">11st CDN 자동 최적화 규격</span></div>
              </div>
              <div class="p-3">
                <div class="text-xs text-muted">11번가 카테고리 #1011552</div>
                <div class="font-bold text-sm mt-1">스위스톤 확장형 여행백팩 (ST4D18)</div>
                <div class="mt-2 flex-between">
                  <span class="text-brand font-black text-lg">56,000원</span>
                  <span class="badge badge-green">무료배송</span>
                </div>
              </div>
            </div>

            <!-- 스펙 검사 결과 요약 -->
            <div class="spec-check-list">
              <div class="spec-check-item pass">
                <span>✔ 11st OPEN API 인증키</span>
                <span class="text-xs">정상 연결</span>
              </div>
              <div class="spec-check-item pass">
                <span>✔ XML EUC-KR 유효성</span>
                <span class="text-xs">4,198 Bytes</span>
              </div>
              <div class="spec-check-item pass">
                <span>✔ 10원 단위 가격 규격</span>
                <span class="text-xs">절사 완료</span>
              </div>
              <div class="spec-check-item pass">
                <span>✔ 상세사진 호스팅 링크</span>
                <span class="text-xs">12장 (유료구독)</span>
              </div>
            </div>

            <div class="action-box mt-4">
              <button class="${btnClass} w-full py-3 text-base font-black">
                🟠 11번가에 전송하기 (즉시 등록 & 전시중지)
              </button>
              <p class="text-center text-xs text-muted mt-2">
                ※ 전송 후 11번가 셀러오피스에 '전시중지' 상태로 안전하게 보관됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 화면 3: 연동 & 사용 매뉴얼 (/guide)
    contentHtml = `
      <div class="panel">
        <div class="guide-hero">
          <div class="guide-tag">📖 OFFICIAL SELLER MANUAL</div>
          <h2 class="guide-title">11번가 OPEN API 연동 & 대량 상품 등록 완벽 가이드</h2>
          <p class="guide-desc">
            11번가 오픈마켓 공식 API 키 발급부터 출고지/반품지 템플릿 연동, 상품고시 40종 매핑, 안전한 전시중지 전송까지 초보 셀러도 5분 안에 완료할 수 있습니다.
          </p>
        </div>

        <!-- 4단계 연동 시각화 카드 그리드 -->
        <div class="grid-4 mt-6">
          <div class="guide-card">
            <div class="guide-step-num">Step 1</div>
            <h4 class="guide-card-title">11번가 OPEN API 가입</h4>
            <p class="guide-card-txt">
              11번가 셀러오피스 로그인 후 <b class="text-brand">OPEN API 개발자 센터</b>에서 판매자 회원 가입을 진행합니다.
            </p>
            <div class="guide-card-tip">💡 사업자 셀러 회원 필수</div>
          </div>
          <div class="guide-card">
            <div class="guide-step-num">Step 2</div>
            <h4 class="guide-card-title">API 인증키 발급</h4>
            <p class="guide-card-txt">
              개발자 센터에서 <b class="text-brand">OPEN API 인증키 발급</b>을 신청하고 발급된 32자리 고유 키를 복사합니다.
            </p>
            <div class="guide-card-tip">🔑 [API키 등록] 메뉴에 입력</div>
          </div>
          <div class="guide-card">
            <div class="guide-step-num">Step 3</div>
            <h4 class="guide-card-title">서울 리전 다이렉트 통신</h4>
            <p class="guide-card-txt">
              AIMaster 전용 서울 리전(icn1) 서버에서 11번가로 직접 통신하므로 별도 고정 IP 프록시 설정이 필요 없습니다.
            </p>
            <div class="guide-card-tip">⚡ 지연 없는 실시간 등록</div>
          </div>
          <div class="guide-card">
            <div class="guide-step-num">Step 4</div>
            <h4 class="guide-card-title">원클릭 검사 & 안전 전송</h4>
            <p class="guide-card-txt">
              10원 단위 절사 및 XML 바이트 검사 통과 후 11번가로 전송되며, 기본 전시중지 상태로 안전하게 보관됩니다.
            </p>
            <div class="guide-card-tip">🛡️ 미검수 노출 사고 방지</div>
          </div>
        </div>

        <!-- 상세 설명 및 주의사항 FAQ -->
        <div class="faq-section mt-8">
          <h3 class="font-bold text-lg mb-4">자주 묻는 질문 & 핵심 운영 정책 (FAQ)</h3>
          <div class="faq-item">
            <div class="faq-q">Q. 11번가 등록 시 왜 판매가가 10원 단위여야 하나요?</div>
            <div class="faq-a">
              11번가 오픈마켓 정책상 1원 단위의 끝전 가격은 API 오류(ERR_PRICE_UNIT)를 유발합니다. AI 11번가 자동등록기는 상품 가격을 자동으로 계산하고 10원 단위로 안전하게 절사하여 전송합니다.
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-q">Q. 등록 직후 상품이 바로 일반 고객에게 노출되어 판매되나요?</div>
            <div class="faq-a">
              아닙니다! 11번가는 임시저장 API가 없기 때문에 등록 즉시 자동으로 [전시중지(STAT: 105)] 상태로 전환하도록 설계되어 있습니다. 셀러오피스에서 최종 확인 후 안전하게 판매 상태로 전환하실 수 있습니다.
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-q">Q. 상세페이지 내 상세사진(최대 20장)은 어떻게 보관되고 전송되나요?</div>
            <div class="faq-a">
              11번가는 상세사진을 자체 서버에 복사하지 않고 당사 호스팅 URL을 직접 호출합니다. 따라서 30일 보관 연장(저장 구독) 회원에게만 고화질 상세사진 호스팅 주소가 부여되며, 일반 회원은 텍스트 정보 고시 중심의 상세설명으로 안전 전송됩니다.
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // 화면 4: 플랫폼 연동 및 설정 (/connect)
    contentHtml = `
      <div class="panel max-w-3xl mx-auto">
        <div class="panel-header">
          <div>
            <div class="panel-title">11번가 OPEN API 인증키 & 플랫폼 연동 설정</div>
            <p class="text-xs text-muted mt-1">11번가 셀러오피스 OPEN API 센터에서 발급받은 인증키를 안전하게 보관합니다.</p>
          </div>
          <span class="badge badge-green">✔ 정상 연동됨</span>
        </div>

        <div class="form-section mt-4">
          <div class="form-group">
            <label class="form-label">11번가 OPEN API 인증키 (openapikey)</label>
            <div class="flex-row">
              <input type="password" class="input-text font-mono" value="7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c" />
              <button class="${btnClass} btn-sm">저장하기</button>
            </div>
            <p class="text-xs text-muted mt-1.5">
              ※ 암호화되어 안전하게 공용 키 저장소에 보관되며, 당사 타 11번가 연동 프로그램과 자동 공유됩니다.
            </p>
          </div>

          <!-- 실시간 연결 시험 (Test Ping) 콘솔 -->
          <div class="sub-panel mt-6">
            <div class="flex-between mb-2">
              <span class="font-bold text-sm">📡 11번가 셀러 서버 통신 진단 (Live Ping)</span>
              <button class="btn-outline btn-xs">지금 연결 시험 실행</button>
            </div>
            <div class="terminal-box">
              <div class="term-line text-green">[icn1-seoul-edge] Initiating handshake to https://api.11st.co.kr...</div>
              <div class="term-line">[200 OK] GET /rest/areaservice/outboundarea (출고지 2곳 수신 완료)</div>
              <div class="term-line">[200 OK] GET /rest/areaservice/inboundarea (반품지 1곳 수신 완료)</div>
              <div class="term-line text-brand">✔ 11번가 셀러오피스 인증 검증 성공 — 준비 완료 (Latency: 28ms)</div>
            </div>
          </div>

          <!-- 출고지 / 반품지 템플릿 현황 -->
          <div class="sub-panel mt-4">
            <div class="font-bold text-sm mb-2">🏢 수신된 셀러 템플릿 정보</div>
            <div class="grid-2 text-xs">
              <div class="p-2 border rounded bg-card2">
                <div class="font-bold">출고지 목록 (2건)</div>
                <div class="text-muted mt-1">• [기본] 경기 고양시 일산동구 백석동 물류센터 #2</div>
                <div class="text-muted">• [보조] 인천 서구 원창동 쿠팡 밀크런 센터</div>
              </div>
              <div class="p-2 border rounded bg-card2">
                <div class="font-bold">반품/교환지 목록 (1건)</div>
                <div class="text-muted mt-1">• [기본] 경기 고양시 일산동구 마두동 반품데스크 #3</div>
              </div>
            </div>
          </div>

          <!-- 회원 저장공간 정책 안내 -->
          <div class="info-alert mt-6">
            <div class="flex-between">
              <div>
                <b class="text-sm">💾 회원 저장공간 & 상세사진 보관 상태</b>
                <p class="text-xs text-muted mt-0.5">상세사진 외부 호스팅을 위한 보관 연장 혜택이 적용 중입니다.</p>
              </div>
              <span class="badge badge-accent">관리자 프리패스</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 전체 프레임 마크업 조립
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1440, initial-scale=1" />
  <title>${brandName} - 시안 ${cNum} 화면 ${sNum}</title>
  <style>
    :root {
      ${themeCss}
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      width: 1440px;
      min-height: 900px;
      overflow-x: hidden;
    }
    /* 3D 엠보싱 버튼 규격 */
    button, .btn-3d-red, .btn-3d-cyan, .btn-3d-terracotta, .btn-outline {
      white-space: nowrap !important;
      min-width: max-content;
      flex-shrink: 0;
    }
    .btn-3d-red {
      background: linear-gradient(180deg, #FA0050 0%, #E60045 100%);
      color: #FFFFFF;
      border: 1px solid #FF4D79;
      border-radius: 8px;
      padding: 8px 18px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 0 #B80036, 0 6px 12px rgba(250,0,80,0.3);
      transition: all 0.1s ease;
      white-space: nowrap !important;
      min-width: max-content;
      flex-shrink: 0;
    }
    .btn-3d-cyan {
      background: linear-gradient(180deg, #00F2FE 0%, #0284C7 100%);
      color: #04101A;
      border: 1px solid #38BDF8;
      border-radius: 8px;
      padding: 8px 18px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 4px 0 #0369A1, 0 6px 14px rgba(0,242,254,0.35);
      transition: all 0.1s ease;
      white-space: nowrap !important;
      min-width: max-content;
      flex-shrink: 0;
    }
    .btn-3d-terracotta {
      background: linear-gradient(180deg, #EA580C 0%, #C2410C 100%);
      color: #FFFFFF;
      border: 1px solid #FB923C;
      border-radius: 8px;
      padding: 8px 18px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 0 #9A3412, 0 6px 12px rgba(234,88,12,0.25);
      transition: all 0.1s ease;
      white-space: nowrap !important;
      min-width: max-content;
      flex-shrink: 0;
    }
    .btn-outline {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border-bright);
      border-radius: 8px;
      padding: 6px 14px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap !important;
      min-width: max-content;
      flex-shrink: 0;
    }
    .btn-sm { padding: 6px 14px; font-size: 13px; white-space: nowrap !important; min-width: max-content; }
    .btn-xs { padding: 6px 14px; font-size: 12px; font-weight: 800; white-space: nowrap !important; min-width: max-content; }

    /* 레이아웃 골격 */
    .app-shell { display: flex; min-height: 900px; }
    .app-sidebar {
      width: 270px;
      background: var(--card);
      border-right: 1px solid var(--border);
      padding: 20px 16px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .app-logo-area { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .app-logo-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: ${logoBg};
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 900; font-size: 18px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .app-logo-text { font-size: 14px; font-weight: 900; line-height: 1.2; }
    .app-logo-text span { font-size: 10px; font-weight: 700; color: var(--muted); display: block; }

    .menu-group { margin-bottom: 20px; }
    .menu-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; padding-left: 8px; }
    .menu-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 700;
      color: var(--text); text-decoration: none; margin-bottom: 4px;
      transition: all 0.15s;
      white-space: nowrap !important;
    }
    .menu-item:hover, .menu-item.active {
      background: var(--brand-light);
      color: var(--brand);
      border-left: 3px solid var(--brand);
    }

    .app-main { flex: 1; padding: 24px 32px; background: var(--bg); }
    .top-header {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px;
    }
    .top-title h1 { font-size: 22px; font-weight: 900; }
    .top-title p { font-size: 12.5px; color: var(--muted); margin-top: 2px; }

    /* 파이프라인 배너 */
    .pipeline-banner {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--card); border: 1px solid var(--border);
      border-radius: 12px; padding: 14px 24px; margin-bottom: 24px;
    }
    .pipeline-step { display: flex; align-items: center; gap: 10px; }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--card2); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 900; color: var(--muted);
    }
    .pipeline-step.active .step-num { background: var(--brand); color: white; border-color: var(--brand); }
    .step-txt b { font-size: 13px; display: block; white-space: nowrap; }
    .step-txt span { font-size: 11px; color: var(--muted); white-space: nowrap; }
    .pipeline-arrow { color: var(--muted); font-size: 14px; }

    /* KPI 카드 */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: 12px; padding: 16px 20px;
    }
    .kpi-label { font-size: 11.5px; font-weight: 700; color: var(--muted); white-space: nowrap; }
    .kpi-val { font-size: 24px; font-weight: 900; margin: 4px 0; white-space: nowrap; }
    .kpi-sub { font-size: 11px; color: var(--muted); white-space: nowrap; }

    /* 패널 및 테이블 */
    .panel {
      background: var(--card); border: 1px solid var(--border);
      border-radius: 12px; padding: 22px 24px; margin-bottom: 20px;
    }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .panel-title { font-size: 15px; font-weight: 900; display: flex; align-items: center; gap: 8px; white-space: nowrap; }

    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 11.5px; font-weight: 800; white-space: nowrap; }
    .data-table td { padding: 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .data-table th:last-child, .data-table td:last-child { white-space: nowrap !important; width: 1%; text-align: center; }

    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800;
    }
    .badge-green { background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); }
    .badge-amber { background: rgba(245,158,11,0.15); color: #F59E0B; border: 1px solid rgba(245,158,11,0.3); }
    .badge-blue { background: rgba(37,99,235,0.15); color: #2563EB; border: 1px solid rgba(37,99,235,0.3); }
    .badge-accent { background: rgba(250,0,80,0.12); color: #FA0050; border: 1px solid rgba(250,0,80,0.25); }
    .badge-sub { background: var(--card2); border: 1px solid var(--border); color: var(--text); }
    .badge-muted { background: var(--card2); color: var(--muted); }

    /* 폼 스타일 */
    .split-layout { display: flex; gap: 24px; }
    .split-main { flex: 2.2; }
    .split-side { flex: 1; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .form-group { margin-bottom: 14px; }
    .form-label { font-size: 12px; font-weight: 800; color: var(--muted); margin-bottom: 6px; display: block; }
    .input-text, .input-select {
      width: 100%; padding: 9px 12px; border-radius: 8px;
      background: var(--card2); border: 1px solid var(--border);
      color: var(--text); font-size: 13px; font-weight: 600;
    }
    .input-text:focus, .input-select:focus { border-color: var(--brand); outline: none; }
    .flex-row { display: flex; gap: 8px; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .chips-row { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .chip-item {
      font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;
      background: var(--card2); border: 1px solid var(--border); cursor: pointer;
    }
    .chip-item.active { background: var(--brand-light); border-color: var(--brand); color: var(--brand); }
    .info-alert {
      background: var(--brand-light); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 14px; font-size: 12px; font-weight: 600; color: var(--text); margin-top: 10px;
    }

    /* 프리뷰 덱 */
    .preview-box { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--card); }
    .preview-badge { background: var(--card2); padding: 6px 12px; font-size: 11px; font-weight: 800; border-bottom: 1px solid var(--border); }
    .preview-img-box { height: 160px; background: var(--card2); display: flex; align-items: center; justify-content: center; text-align: center; }
    .preview-placeholder { font-size: 12px; font-weight: 800; color: var(--muted); }
    .spec-check-list { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
    .spec-check-item {
      display: flex; justify-content: space-between; padding: 8px 12px;
      border-radius: 6px; background: var(--card2); font-size: 12px; font-weight: 700;
    }
    .spec-check-item.pass { border-left: 3px solid #10B981; }

    /* 가이드 스타일 */
    .guide-hero { text-align: center; padding: 24px 0 12px; }
    .guide-tag { display: inline-block; font-size: 11px; font-weight: 900; color: var(--brand); letter-spacing: 0.1em; margin-bottom: 6px; }
    .guide-title { font-size: 24px; font-weight: 900; margin-bottom: 8px; }
    .guide-desc { font-size: 13.5px; color: var(--muted); max-width: 680px; margin: 0 auto; }
    .guide-card { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 18px; }
    .guide-step-num { font-size: 11px; font-weight: 900; color: var(--brand); text-transform: uppercase; margin-bottom: 6px; }
    .guide-card-title { font-size: 14px; font-weight: 900; margin-bottom: 6px; }
    .guide-card-txt { font-size: 12px; color: var(--muted); line-height: 1.4; }
    .guide-card-tip { font-size: 11px; font-weight: 800; color: var(--brand); margin-top: 10px; }
    .faq-item { border-bottom: 1px solid var(--border); padding: 14px 0; }
    .faq-q { font-size: 13.5px; font-weight: 800; margin-bottom: 4px; }
    .faq-a { font-size: 12.5px; color: var(--muted); line-height: 1.5; }

    /* 터미널 스타일 */
    .terminal-box {
      background: #040810; border: 1px solid #1E293B; border-radius: 8px;
      padding: 12px 14px; font-family: monospace; font-size: 11.5px; line-height: 1.6;
    }
    .term-line { color: #94A3B8; }
    .text-green { color: #10B981 !important; }
    .text-brand { color: var(--brand) !important; }
    .text-blue { color: #3B82F6 !important; }
    .text-xs { font-size: 11px; }
    .text-muted { color: var(--muted); }
    .font-bold { font-weight: 800; }
    .font-black { font-weight: 900; }
    .w-full { width: 100%; }
    .py-3 { padding-top: 12px; padding-bottom: 12px; }
    .mt-4 { margin-top: 16px; }
    .mt-6 { margin-top: 24px; }
    .mb-3 { margin-bottom: 12px; }
    .p-3 { padding: 12px; }
    .p-2 { padding: 8px; }
  </style>
</head>
<body>
  <div class="app-shell">
    <!-- 사이드바 -->
    <aside class="app-sidebar">
      <div>
        <div class="app-logo-area">
          <div class="app-logo-icon">11</div>
          <div class="app-logo-text">
            ${brandName}
            <span>OFFICIAL SELLER API v1.07</span>
          </div>
        </div>

        <div class="menu-group">
          <div class="menu-title">오픈마켓 작업</div>
          <a href="#" class="menu-item ${sNum === 1 ? 'active' : ''}">📊 대시보드</a>
          <a href="#" class="menu-item ${sNum === 2 ? 'active' : ''}">📦 상품 등록 & 검사</a>
        </div>

        <div class="menu-group">
          <div class="menu-title">설정 & 안내</div>
          <a href="#" class="menu-item ${sNum === 4 ? 'active' : ''}">🔑 API 키 & 연동 설정</a>
          <a href="#" class="menu-item ${sNum === 3 ? 'active' : ''}">📖 셀러 사용 매뉴얼</a>
        </div>
      </div>

      <div class="sidebar-footer" style="font-size:11.5px; color:var(--muted); border-top:1px solid var(--border); padding-top:12px;">
        <div style="font-weight:800; color:var(--text); margin-bottom:2px;">buylifemall (관리자)</div>
        <div>11st OPEN API: Connected</div>
      </div>
    </aside>

    <!-- 메인 콘텐츠 영역 -->
    <main class="app-main">
      <div class="top-header">
        <div class="top-title">
          <div style="margin-bottom:4px;">${themeBadge}</div>
          <h1>${sNum === 1 ? '11번가 상품 등록 관제 대시보드' : sNum === 2 ? '상품 상세 등록 & XML 스펙 검사' : sNum === 3 ? '11번가 OPEN API 연동 매뉴얼' : '플랫폼 연동 & API 키 관리'}</h1>
          <p>${sNum === 1 ? '11번가 공식 Seller API 연동 현황 및 최근 상품 등록 작업 모니터링' : sNum === 2 ? 'EUC-KR XML 규격 자동 변환, 10원 단위 절사 검사 및 안전한 전시중지 전송' : sNum === 3 ? '공식 셀러오피스 API 키 발급 및 서울 리전 다이렉트 통신 가이드' : '11번가 OPEN API 인증키 등록 및 실시간 셀러 서버 핑(Ping) 진단'}</p>
        </div>
        <div>
          <button class="${btnClass} btn-sm">11st 셀러오피스 바로가기 ↗</button>
        </div>
      </div>

      <!-- 본문 -->
      ${contentHtml}
    </main>
  </div>
</body>
</html>`;
}

// 12개 개별 뷰 HTML 파일 생성
console.log('Building 12 views HTML files...');
for (let c = 1; c <= 3; c++) {
  for (let s = 1; s <= 4; s++) {
    const html = buildViewHtml(c, s);
    const fileName = `view_c${c}_s${s}.html`;
    fs.writeFileSync(path.join(OUT_DIRS[c], fileName), html, 'utf8');
  }
}

// 단일 쇼케이스 HTML 생성 (D:/Antigravity/Design/showcase.html)
console.log('Building unified showcase.html...');
const showcaseHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI 11번가 상품 자동등록기 (elevenst-register) - 4대 화면 3시안 공식 쇼케이스</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0F17; color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      line-height: 1.5; padding: 32px 24px;
    }
    .header-area { max-width: 1400px; margin: 0 auto 32px; text-align: center; }
    .badge-top { display: inline-block; background: rgba(250,0,80,0.15); color: #FA0050; border: 1px solid rgba(250,0,80,0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; margin-bottom: 12px; }
    h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; letter-spacing: -0.02em; }
    p.sub { font-size: 15px; color: #94A3B8; max-width: 800px; margin: 0 auto; }

    /* 종합 비교 매트릭스 표 */
    .compare-section { max-width: 1400px; margin: 0 auto 40px; background: #131B26; border: 1px solid #1E293B; border-radius: 14px; padding: 24px; }
    .compare-title { font-size: 18px; font-weight: 900; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .compare-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .compare-table th { background: #1A2332; padding: 12px; border: 1px solid #283548; font-weight: 800; color: #E2E8F0; text-align: left; }
    .compare-table td { padding: 12px; border: 1px solid #1E293B; vertical-align: top; }
    .compare-table tr:hover { background: #182230; }
    .tag-rec { background: rgba(250,0,80,0.2); color: #FA0050; border: 1px solid #FA0050; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }
    .tag-hud { background: rgba(0,242,254,0.15); color: #00F2FE; border: 1px solid #00F2FE; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }
    .tag-nordic { background: rgba(234,88,12,0.15); color: #EA580C; border: 1px solid #EA580C; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }

    /* 12개 뷰 카드 그리드 */
    .showcase-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .view-card {
      background: #131B26; border: 1px solid #1E293B; border-radius: 12px;
      overflow: hidden; cursor: pointer; transition: all 0.2s ease;
    }
    .view-card:hover { transform: translateY(-4px); border-color: #FA0050; box-shadow: 0 12px 28px rgba(0,0,0,0.4); }
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
    .lightbox-btn:hover { background: #FA0050; }
    .lightbox-frame-wrap { flex: 1; overflow: auto; background: #0B0F17; }
    .lightbox-frame-wrap iframe { width: 1440px; height: 900px; border: none; display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="header-area">
    <div class="badge-top">AIMASTER DESIGN STANDARD — 4 SCREENS × 3 CONCEPTS</div>
    <h1>AI 11번가 상품 자동등록기 (elevenst-register)</h1>
    <p class="sub">
      스마트스토어(78번 아틀리에), 쿠팡(84번 아틀리에)에 이은 3대 오픈마켓 자동등록 도구의 공식 디자인 리뉴얼 쇼케이스입니다. 카드를 클릭하면 1440px 원본 화면을 쨍하게 확인하실 수 있습니다.
    </p>
  </div>

  <!-- 최상단 종합 비교표 -->
  <div class="compare-section">
    <div class="compare-title">
      <span>📊 4대 화면 3시안 한눈에 보는 종합 비교 매트릭스 표</span>
      <a href="comparison.html" style="font-size:13px; color:#FA0050; text-decoration:none;">독립 비교표 전체화면 보기 ↗</a>
    </div>
    <table class="compare-table">
      <thead>
        <tr>
          <th>시안 번호 & 템플릿 명칭</th>
          <th>시그니처 컬러 & 표면 텍스처</th>
          <th>버튼 & 시각 컴포넌트</th>
          <th>11번가 기능 정합성 & 추천 이유</th>
          <th>추천 여부</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="font-bold text-white">1안. 107. 11번가 오리지널 레드 & 화이트 셀러 스튜디오</div>
            <div class="text-xs text-muted">11st Iconic Vibrant Red Studio</div>
          </td>
          <td>
            • 아이코닉 레드 (#FA0050)<br>
            • 클린 소프트 화이트 (#F8FAFC)<br>
            • 딥 슬레이트 잉크 (#0F172A)
          </td>
          <td>
            • 3D 엠보싱 11st 레드 버튼 (.btn-3d-red)<br>
            • 4단계 오픈마켓 파이프라인 배너<br>
            • 10원 단위 절사 계산기 & 안전 전시중지 뱃지
          </td>
          <td>
            11번가 공식 브랜드 아이덴티티(레드)를 완벽하게 구현하여 사용자 신뢰감을 극대화하고, 스마트스토어(그린)·쿠팡(블루)과 완벽한 3대 커머스 트리오를 완성함.
          </td>
          <td><span class="tag-rec">⭐ 1순위 추천 (공식 대표안)</span></td>
        </tr>
        <tr>
          <td>
            <div class="font-bold text-white">2안. 108. 퀀트 오픈마켓 셀러 인텔리전스 레이더 HUD</div>
            <div class="text-xs text-muted">Quant 11st Marketplace Radar HUD</div>
          </td>
          <td>
            • 매트 옵시디언 딥블랙 (#090D16)<br>
            • 일렉트릭 하이퍼 사이안 (#00F2FE)<br>
            • 네온 골드 앰버 (#F59E0B)
          </td>
          <td>
            • 3D 엠보싱 하이퍼 사이안 버튼 (.btn-3d-cyan)<br>
            • 서울 리전(icn1) 다이렉트 핑 HUD<br>
            • 40종 상품고시 XML 바이트 실시간 인스펙터
          </td>
          <td>
            다계정 파워셀러 및 대량 등록 전문 퀀트 셀러를 위한 데이터 밀도 중심의 하이테크 관제 덱.
          </td>
          <td><span class="tag-hud">⚡ 2순위 대안 (자산화)</span></td>
        </tr>
        <tr>
          <td>
            <div class="font-bold text-white">3안. 109. 클린 노르딕 이커머스 페이퍼 아틀리에</div>
            <div class="text-xs text-muted">Clean Nordic Commerce Paper Atelier</div>
          </td>
          <td>
            • 소프트 아이보리 크림 (#FAF9F6)<br>
            • 웜 테라코타 오렌지 (#EA580C)<br>
            • 딥 차콜 슬레이트 (#1E293B)
          </td>
          <td>
            • 3D 엠보싱 테라코타 버튼 (.btn-3d-terracotta)<br>
            • 모눈 페이퍼 질감의 정갈한 2단 카드 그리드<br>
            • 초보자 친화적 1초 툴팁 & 친절한 안내 박스
          </td>
          <td>
            장시간 상품 등록과 고시 정보 작성에 눈의 피로를 최소화하는 북유럽 감성의 무소음 집중형(Zen) 라이트 아틀리에.
          </td>
          <td><span class="tag-nordic">🌿 3순위 대안 (자산화)</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 12개 뷰 카드 그리드 (화면별 3시안 나란히 대조) -->
  <div class="showcase-grid">
    <!-- 화면 1: 대시보드 3시안 -->
    <div class="view-card" onclick="openLightbox(1, 1)">
      <div class="card-header">
        <span class="card-title">1안 대시보드 (11st 레드 스튜디오)</span>
        <span class="tag-rec">1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="107_elevenst_red_seller_studio/elevenst-register/view_c1_s1.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 1: 메인 대시보드 (/home)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(2, 1)">
      <div class="card-header">
        <span class="card-title">2안 대시보드 (퀀트 레이더 HUD)</span>
        <span class="tag-hud">2안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="108_quant_openmarket_radar_hud/elevenst-register/view_c2_s1.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 1: 메인 대시보드 (/home)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(3, 1)">
      <div class="card-header">
        <span class="card-title">3안 대시보드 (노르딕 아틀리에)</span>
        <span class="tag-nordic">3안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="109_clean_nordic_ecommerce_atelier/elevenst-register/view_c3_s1.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 1: 메인 대시보드 (/home)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <!-- 화면 2: 상품 등록 상세 3시안 -->
    <div class="view-card" onclick="openLightbox(1, 2)">
      <div class="card-header">
        <span class="card-title">1안 상품 등록 (11st 레드 스튜디오)</span>
        <span class="tag-rec">1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="107_elevenst_red_seller_studio/elevenst-register/view_c1_s2.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 2: 상품 등록 상세 (/products)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(2, 2)">
      <div class="card-header">
        <span class="card-title">2안 상품 등록 (퀀트 레이더 HUD)</span>
        <span class="tag-hud">2안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="108_quant_openmarket_radar_hud/elevenst-register/view_c2_s2.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 2: 상품 등록 상세 (/products)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(3, 2)">
      <div class="card-header">
        <span class="card-title">3안 상품 등록 (노르딕 아틀리에)</span>
        <span class="tag-nordic">3안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="109_clean_nordic_ecommerce_atelier/elevenst-register/view_c3_s2.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 2: 상품 등록 상세 (/products)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <!-- 화면 3: 셀러 매뉴얼 3시안 -->
    <div class="view-card" onclick="openLightbox(1, 3)">
      <div class="card-header">
        <span class="card-title">1안 셀러 매뉴얼 (11st 레드 스튜디오)</span>
        <span class="tag-rec">1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="107_elevenst_red_seller_studio/elevenst-register/view_c1_s3.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 3: 사용 매뉴얼 (/guide)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(2, 3)">
      <div class="card-header">
        <span class="card-title">2안 셀러 매뉴얼 (퀀트 레이더 HUD)</span>
        <span class="tag-hud">2안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="108_quant_openmarket_radar_hud/elevenst-register/view_c2_s3.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 3: 사용 매뉴얼 (/guide)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(3, 3)">
      <div class="card-header">
        <span class="card-title">3안 셀러 매뉴얼 (노르딕 아틀리에)</span>
        <span class="tag-nordic">3안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="109_clean_nordic_ecommerce_atelier/elevenst-register/view_c3_s3.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 3: 사용 매뉴얼 (/guide)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <!-- 화면 4: API 키 설정 3시안 -->
    <div class="view-card" onclick="openLightbox(1, 4)">
      <div class="card-header">
        <span class="card-title">1안 API 키 설정 (11st 레드 스튜디오)</span>
        <span class="tag-rec">1안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="107_elevenst_red_seller_studio/elevenst-register/view_c1_s4.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 4: 플랫폼 연동 (/connect)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(2, 4)">
      <div class="card-header">
        <span class="card-title">2안 API 키 설정 (퀀트 레이더 HUD)</span>
        <span class="tag-hud">2안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="108_quant_openmarket_radar_hud/elevenst-register/view_c2_s4.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 4: 플랫폼 연동 (/connect)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>

    <div class="view-card" onclick="openLightbox(3, 4)">
      <div class="card-header">
        <span class="card-title">3안 API 키 설정 (노르딕 아틀리에)</span>
        <span class="tag-nordic">3안</span>
      </div>
      <div class="card-thumb-wrap">
        <iframe src="109_clean_nordic_ecommerce_atelier/elevenst-register/view_c3_s4.html"></iframe>
      </div>
      <div class="card-footer">
        <span>화면 4: 플랫폼 연동 (/connect)</span>
        <span>클릭하여 1440px 확대 🔍</span>
      </div>
    </div>
  </div>

  <!-- 라이트박스 모달 -->
  <div id="lightbox" class="lightbox" onclick="if(event.target===this) closeLightbox()">
    <div class="lightbox-content">
      <div class="lightbox-bar">
        <span id="lb-title" class="lightbox-title">미리보기</span>
        <div class="lightbox-controls">
          <button class="lightbox-btn" onclick="prevView()">◀ 이전</button>
          <button class="lightbox-btn" onclick="nextView()">다음 ▶</button>
          <button class="lightbox-btn" onclick="openDirect()">새 탭 원본 ↗</button>
          <button class="lightbox-btn" style="background:#FA0050;" onclick="closeLightbox()">✕ 닫기</button>
        </div>
      </div>
      <div class="lightbox-frame-wrap">
        <iframe id="lb-frame" src=""></iframe>
      </div>
    </div>
  </div>

  <script>
    let curC = 1;
    let curS = 1;
    const paths = {
      1: '107_elevenst_red_seller_studio/elevenst-register',
      2: '108_quant_openmarket_radar_hud/elevenst-register',
      3: '109_clean_nordic_ecommerce_atelier/elevenst-register'
    };
    const cNames = {
      1: '1안. 11번가 오리지널 레드 & 화이트 셀러 스튜디오',
      2: '2안. 퀀트 오픈마켓 셀러 인텔리전스 레이더 HUD',
      3: '3안. 클린 노르딕 이커머스 페이퍼 아틀리에'
    };
    const sNames = {
      1: '화면 1: 메인 대시보드 (/home)',
      2: '화면 2: 상품 등록 상세 (/products)',
      3: '화면 3: 사용 매뉴얼 (/guide)',
      4: '화면 4: 플랫폼 연동 및 API키 (/connect)'
    };

    function openLightbox(c, s) {
      curC = c;
      curS = s;
      updateLightbox();
      document.getElementById('lightbox').classList.add('active');
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
      document.getElementById('lb-frame').src = '';
    }

    function updateLightbox() {
      const url = paths[curC] + '/view_c' + curC + '_s' + curS + '.html';
      document.getElementById('lb-frame').src = url;
      document.getElementById('lb-title').innerText = cNames[curC] + ' — ' + sNames[curS];
    }

    function prevView() {
      curC--;
      if (curC < 1) curC = 3;
      updateLightbox();
    }

    function nextView() {
      curC++;
      if (curC > 3) curC = 1;
      updateLightbox();
    }

    function openDirect() {
      const url = paths[curC] + '/view_c' + curC + '_s' + curS + '.html';
      window.open(url, '_blank');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevView();
      if (e.key === 'ArrowRight') nextView();
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(BASE_DIR, 'showcase.html'), showcaseHtml, 'utf8');

// comparison.html 생성
console.log('Building comparison.html...');
const comparisonHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI 11번가 상품 자동등록기 (elevenst-register) - 4대 화면 3시안 종합 비교 매트릭스 표</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0F17; color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      line-height: 1.5; padding: 40px 24px;
    }
    .wrap { max-width: 1400px; margin: 0 auto; }
    .badge-top { display: inline-block; background: rgba(250,0,80,0.15); color: #FA0050; border: 1px solid rgba(250,0,80,0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; margin-bottom: 12px; }
    h1 { font-size: 30px; font-weight: 900; margin-bottom: 6px; }
    p.sub { font-size: 14px; color: #94A3B8; margin-bottom: 24px; }
    .compare-card { background: #131B26; border: 1px solid #1E293B; border-radius: 14px; padding: 24px; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th { background: #1A2332; padding: 14px; border: 1px solid #283548; font-weight: 800; color: #E2E8F0; text-align: left; }
    td { padding: 14px; border: 1px solid #1E293B; vertical-align: top; line-height: 1.6; }
    tr:hover { background: #182230; }
    .tag-rec { background: rgba(250,0,80,0.2); color: #FA0050; border: 1px solid #FA0050; padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 900; }
    .tag-hud { background: rgba(0,242,254,0.15); color: #00F2FE; border: 1px solid #00F2FE; padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 900; }
    .tag-nordic { background: rgba(234,88,12,0.15); color: #EA580C; border: 1px solid #EA580C; padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 900; }
    .btn-link { display: inline-block; background: #222F42; color: #FFF; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 700; margin-top: 10px; }
    .btn-link:hover { background: #FA0050; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge-top">AIMASTER COMPREHENSIVE MATRIX</div>
    <h1>AI 11번가 상품 자동등록기 — 4대 화면 3시안 종합 비교 매트릭스 표</h1>
    <p class="sub">3대 템플릿의 배색, 시그니처 컴포넌트, 4대 화면별 적용점 및 추천 사유를 한눈에 대조할 수 있습니다.</p>

    <div class="compare-card">
      <table>
        <thead>
          <tr>
            <th style="width:20%;">템플릿 명칭 & 컨셉</th>
            <th style="width:22%;">배색 팔레트 & 타이포그래피</th>
            <th style="width:24%;">시그니처 버튼 & 핵심 컴포넌트</th>
            <th style="width:24%;">4대 화면(메인/상세/가이드/연동) 구성 특징</th>
            <th style="width:10%;">추천 판정</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <b style="color:#FA0050; font-size:15px;">107. 11번가 오리지널 레드 & 화이트 셀러 스튜디오</b><br>
              <span style="font-size:12px; color:#94A3B8;">11st Iconic Vibrant Red Studio</span>
              <p style="font-size:12px; margin-top:6px; color:#CBD5E1;">11번가 공식 브랜드의 비비드 레드를 완벽히 살려 사용자 신뢰도와 구매/등록 전환율을 극대화한 스튜디오</p>
              <a href="showcase.html" class="btn-link">쇼케이스에서 보기 ↗</a>
            </td>
            <td>
              • 메인 시그니처: #FA0050 (11st Red)<br>
              • 서피스 배경: #F8FAFC (Clean White)<br>
              • 텍스트: #0F172A (Deep Slate 900)<br>
              • 폰트: Pretendard Variable 고선명 산세리프
            </td>
            <td>
              • 3D 엠보싱 11st 레드 버튼 (.btn-3d-red)<br>
              • 4단계 오픈마켓 등록 파이프라인 인디케이터<br>
              • 10원 단위 절사 계산기 & 11st CDN 이미지 칩<br>
              • 안전한 자동 전시중지(STAT: 105) 뱃지
            </td>
            <td>
              • 메인: 실시간 200 OK 핑 & 4대 KPI & 최근 등록 표<br>
              • 등록: 11st 카테고리 추천 + 2단 스펙 검사 관제 덱<br>
              • 가이드: 4단계 시각화 카드 & FAQ 아코디언<br>
              • 연동: 11st OPEN API 인증키 & 출고/반품지 템플릿
            </td>
            <td><span class="tag-rec">⭐ 1순위 추천 (공식 대표안)</span></td>
          </tr>
          <tr>
            <td>
              <b style="color:#00F2FE; font-size:15px;">108. 퀀트 오픈마켓 셀러 인텔리전스 레이더 HUD</b><br>
              <span style="font-size:12px; color:#94A3B8;">Quant 11st Marketplace Radar HUD</span>
              <p style="font-size:12px; margin-top:6px; color:#CBD5E1;">대량 상품 등록과 초당 XML 유효성 관제에 최적화된 전문 파워셀러용 다크 HUD 콘솔</p>
              <a href="showcase.html" class="btn-link">쇼케이스에서 보기 ↗</a>
            </td>
            <td>
              • 메인 시그니처: #00F2FE (Hyper Cyan)<br>
              • 서피스 배경: #090D16 (Obsidian Black)<br>
              • 포인트: #F59E0B (Neon Amber)<br>
              • 폰트: JetBrains Mono & Pretendard
            </td>
            <td>
              • 3D 엠보싱 하이퍼 사이안 버튼 (.btn-3d-cyan)<br>
              • 서울 리전(icn1) 다이렉트 통신 레이더 핑<br>
              • 40종 상품고시 XML 바이트 유효성 실시간 스캐너<br>
              • 다크 콘솔 터미널 로그 뷰
            </td>
            <td>
              • 메인: 실시간 레이더 KPI 4종 & 고밀도 매트릭스 표<br>
              • 등록: XML 바이트 카운터 & 실시간 파라미터 뷰<br>
              • 가이드: API 아키텍처 다이어그램 & 전문 디버그 FAQ<br>
              • 연동: Live Ping 터미널 콘솔 & 템플릿 JSON 뷰
            </td>
            <td><span class="tag-hud">⚡ 2순위 대안 (자산화)</span></td>
          </tr>
          <tr>
            <td>
              <b style="color:#EA580C; font-size:15px;">109. 클린 노르딕 이커머스 페이퍼 아틀리에</b><br>
              <span style="font-size:12px; color:#94A3B8;">Clean Nordic Commerce Paper Atelier</span>
              <p style="font-size:12px; margin-top:6px; color:#CBD5E1;">장시간 수작업 등록과 고시 정보 작성에 눈의 피로를 최소화하는 북유럽 감성의 무소음 집중형(Zen) 아틀리에</p>
              <a href="showcase.html" class="btn-link">쇼케이스에서 보기 ↗</a>
            </td>
            <td>
              • 메인 시그니처: #EA580C (Terracotta Orange)<br>
              • 서피스 배경: #FAF9F6 (Warm Ivory Cream)<br>
              • 텍스트: #1E293B (Deep Slate Charcoal)<br>
              • 폰트: Pretendard & Noto Serif 감성 서체
            </td>
            <td>
              • 3D 엠보싱 테라코타 버튼 (.btn-3d-terracotta)<br>
              • 모눈 페이퍼 질감의 정갈한 2단 카드 그리드<br>
              • 초보자 친화적 1초 툴팁 & 친절한 안내 박스<br>
              • 편안한 파스텔 뱃지 시스템
            </td>
            <td>
              • 메인: 정갈한 4대 작업 카드 & 직관적인 최근 등록 표<br>
              • 등록: 여백이 넉넉한 폼 & 실시간 미리보기 카드<br>
              • 가이드: 친절한 4단계 그림 가이드 & 초보자 가이드<br>
              • 연동: 심플한 키 입력 폼 & 템플릿 요약 카드
            </td>
            <td><span class="tag-nordic">🌿 3순위 대안 (자산화)</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(BASE_DIR, 'comparison.html'), comparisonHtml, 'utf8');

// Playwright 브라우저를 띄워 12개 뷰 1440px 고화질 캡처 및 조감도 캡처 실행
async function captureViews() {
  console.log('Launching Playwright Chromium for 1440px high-res captures...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const artifactDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/b5b1197f-da04-4063-a323-c566719f77d3';
  const prefixMap = { 1: 'elr_107', 2: 'elr_108', 3: 'elr_109' };
  const sNames = { 1: '01_main', 2: '02_detail', 3: '03_guide', 4: '04_settings' };

  for (let c = 1; c <= 3; c++) {
    for (let s = 1; s <= 4; s++) {
      const viewUrl = `http://localhost:3800/${Object.keys(OUT_DIRS)[c - 1] === '1' ? '107_elevenst_red_seller_studio' : Object.keys(OUT_DIRS)[c - 1] === '2' ? '108_quant_openmarket_radar_hud' : '109_clean_nordic_ecommerce_atelier'}/elevenst-register/view_c${c}_s${s}.html`;
      console.log(`Capturing: C${c} S${s} -> ${viewUrl}`);
      await page.goto(viewUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      // 로컬 아카이브 경로 저장
      const localFile = path.join(OUT_DIRS[c], `${sNames[s]}.png`);
      await page.screenshot({ path: localFile, fullPage: true });

      // 아티팩트 디렉터리 복사
      const artifactFile = path.join(artifactDir, `${prefixMap[c]}_${sNames[s]}.png`);
      await page.screenshot({ path: artifactFile, fullPage: true });
    }
  }

  // 전체 조감도 캡처 (showcase.html)
  console.log('Capturing full showcase page...');
  await page.setViewportSize({ width: 1440, height: 1600 });
  await page.goto('http://localhost:3800/showcase.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const showcaseCap = path.join(artifactDir, 'elevenst_register_showcase_full_12views.png');
  await page.screenshot({ path: showcaseCap, fullPage: true });
  fs.copyFileSync(showcaseCap, path.join(BASE_DIR, 'elevenst_register_showcase_full_12views.png'));

  await browser.close();
  console.log('All 12 high-res captures and full showcase completed successfully!');
}

captureViews().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
