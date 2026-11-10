import fs from 'fs';
import path from 'path';
import { chromium } from '../portrait-photo/node_modules/playwright/index.mjs';

const BASE_DIR = 'D:/Antigravity/Design';
const OUT_DIRS = {
  1: path.join(BASE_DIR, '88_quant_proptech_intelligence_radar/real_estate_sales'),
  2: path.join(BASE_DIR, '89_naver_realestate_smart_matrix/real_estate_sales'),
  3: path.join(BASE_DIR, '90_minimal_proptech_investor_atelier/real_estate_sales'),
};

Object.values(OUT_DIRS).forEach(d => fs.mkdirSync(d, { recursive: true }));

// HTML 템플릿 생성 함수
function buildViewHtml(cNum, sNum) {
  let themeCss = '';
  let themeBadge = '';
  let btnClass = '';
  let brandName = '부동산 실거래 투자분석 자동화';
  let logoBg = '';
  let accentColor = '';

  if (cNum === 1) {
    // 88. 퀀트 프롭테크 인텔리전스 레이더 덱 스타일 (옵시디언 딥블랙 & 네온 사이안 & 골드 앰버)
    themeCss = `
      --bg: #060A12;
      --card: #0D1322;
      --card2: #141D33;
      --border: #1E293B;
      --border-bright: #334155;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --brand: #06B6D4;
      --brand-hover: #0891B2;
      --brand-accent: #10B981;
      --accent: #F59E0B;
      --gold: #F59E0B;
      --success: #10B981;
      font-family: "JetBrains Mono", -apple-system, BlinkMacSystemFont, "Pretendard Variable", sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(6,182,212,0.15); color:#06B6D4; border:1px solid rgba(6,182,212,0.3);">⚡ QUANT PROPTECH RADAR DECK</span>`;
    btnClass = 'btn-3d-cyan';
    logoBg = 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)';
    accentColor = '#06B6D4';
  } else if (cNum === 2) {
    // 89. 네이버 부동산 스마트 매트릭스 저널 스타일 (소프트 아이스 화이트 & 네이버 시그니처 그린)
    themeCss = `
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card2: #F1F5F9;
      --border: #E2E8F0;
      --border-bright: #CBD5E1;
      --text: #0F172A;
      --muted: #64748B;
      --brand: #03C75A;
      --brand-hover: #00B050;
      --brand-accent: #10B981;
      --accent: #2563EB;
      --gold: #D97706;
      --success: #03C75A;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(3,199,90,0.15); color:#03C75A; border:1px solid rgba(3,199,90,0.3);">🌿 NAVER REAL ESTATE SMART MATRIX</span>`;
    btnClass = 'btn-3d-naver-green';
    logoBg = 'linear-gradient(135deg, #03C75A 0%, #009E44 100%)';
    accentColor = '#03C75A';
  } else {
    // 90. 미니멀 프롭테크 인베스터 아틀리에 스타일 (클린 크림 페이퍼 & 로열 코발트 블루)
    themeCss = `
      --bg: #FAF8F5;
      --card: #FFFFFF;
      --card2: #F3EFEA;
      --border: #E5E0D8;
      --border-bright: #D1C9BE;
      --text: #1E293B;
      --muted: #64748B;
      --brand: #2563EB;
      --brand-hover: #1D4ED8;
      --brand-accent: #3B82F6;
      --accent: #D97706;
      --gold: #D97706;
      --success: #10B981;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Segoe UI", Roboto, sans-serif;
    `;
    themeBadge = `<span class="badge" style="background:rgba(37,99,235,0.12); color:#2563EB; border:1px solid rgba(37,99,235,0.25);">🏢 MINIMAL PROPTECH INVESTOR ATELIER</span>`;
    btnClass = 'btn-3d-blue';
    logoBg = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
    accentColor = '#2563EB';
  }

  // 화면별 본문 내용 렌더링
  let contentHtml = '';

  if (sNum === 1) {
    // 01_main: 대시보드 & 실시간 국토부 실거래가 레이더
    contentHtml = `
      <!-- 4단계 분석 파이프라인 배너 -->
      <div class="pipeline-banner">
        <div class="pipeline-step active">
          <div class="step-num">01</div>
          <div class="step-info">
            <span class="step-title">1단계: 국토부 실거래가 수집</span>
            <span class="step-sub">공공데이터포털 실시간 API 연동</span>
          </div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step active">
          <div class="step-num">02</div>
          <div class="step-info">
            <span class="step-title">2단계: 25개 자치구 시세 분석</span>
            <span class="step-sub">전용면적별 평당가 & 거래량 탐색</span>
          </div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step">
          <div class="step-num">03</div>
          <div class="step-info">
            <span class="step-title">3단계: 갭투자 매력도 산출</span>
            <span class="step-sub">매매-전세 갭 & 안전마진 퀀트 분석</span>
          </div>
        </div>
        <div class="pipeline-arrow">➔</div>
        <div class="pipeline-step">
          <div class="step-num">04</div>
          <div class="step-info">
            <span class="step-title">4단계: 급매물 텔레그램 알림</span>
            <span class="step-sub">최저가 신고가 자동 감지 즉시 전송</span>
          </div>
        </div>
      </div>

      <!-- 상단 핵심 KPI 카드 4종 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">당월 서울 아파트 실거래</div>
          <div class="kpi-value" style="color:var(--brand);">3,842<span class="unit">건</span></div>
          <div class="kpi-foot"><span class="badge-tag success">전월비 +12.4%</span> 국토부 실시간 동기화</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">서울 평균 매매 평당가</div>
          <div class="kpi-value">4,280<span class="unit">만원/평</span></div>
          <div class="kpi-foot"><span class="badge-tag info">전용 84㎡ 기준</span> 서초·강남·송파 주도</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">평균 전세가율</div>
          <div class="kpi-value" style="color:var(--accent);">54.8<span class="unit">%</span></div>
          <div class="kpi-foot"><span class="badge-tag warn">갭 3.2억</span> 강북·노원 갭투자 유효 구간</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">급매 감지 알림</div>
          <div class="kpi-value" style="color:var(--gold);">18<span class="unit">건/오늘</span></div>
          <div class="kpi-foot"><span class="badge-tag success">텔레그램 봇</span> 최고가 대비 -15% 이상</div>
        </div>
      </div>

      <!-- 2열 그리드: 자치구별 실거래 현황 + 갭투자 추천 매물 레이더 -->
      <div class="grid-2col">
        <!-- 좌측: 자치구별 평당가 & 거래량 순위 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">🏢</span> 서울 25개 자치구 실시간 평당가 레이더
            </div>
            <button class="${btnClass}">+ 상세 분석</button>
          </div>
          <div class="table-box">
            <table class="data-table">
              <thead>
                <tr>
                  <th>자치구</th>
                  <th>평균 평당가</th>
                  <th>당월 거래량</th>
                  <th>전세가율</th>
                  <th>흐름</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>서초구</strong></td>
                  <td>8,920 만원</td>
                  <td>218 건</td>
                  <td>48.2%</td>
                  <td><span class="badge-tag success">상승세 ▲</span></td>
                </tr>
                <tr>
                  <td><strong>강남구</strong></td>
                  <td>8,640 만원</td>
                  <td>245 건</td>
                  <td>46.9%</td>
                  <td><span class="badge-tag success">신고가 ▲</span></td>
                </tr>
                <tr>
                  <td><strong>송파구</strong></td>
                  <td>6,180 만원</td>
                  <td>312 건</td>
                  <td>51.4%</td>
                  <td><span class="badge-tag success">거래급증 ▲</span></td>
                </tr>
                <tr>
                  <td><strong>마포구</strong></td>
                  <td>4,850 만원</td>
                  <td>184 건</td>
                  <td>58.6%</td>
                  <td><span class="badge-tag info">보합세 ━</span></td>
                </tr>
                <tr>
                  <td><strong>노원구</strong></td>
                  <td>2,640 만원</td>
                  <td>296 건</td>
                  <td>64.2%</td>
                  <td><span class="badge-tag warn">소액갭투자 🔥</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 우측: 갭투자 매력도 순위 덱 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">🎯</span> 퀀트 갭투자 안전마진 추천 매물 TOP 4
            </div>
            <span class="badge-tag success">API 자동 검증</span>
          </div>
          <div class="candidate-list">
            <div class="candidate-item">
              <div class="cand-tag" style="background:rgba(16,185,129,0.15); color:var(--brand);">갭 1.2억</div>
              <div class="cand-body">
                <div class="cand-title">노원구 상계주공 7단지 전용 59㎡ (12층)</div>
                <div class="cand-meta">매매 5.4억 / 전세 4.2억 (전세가율 77.7%) · 전월비 갭 2,000만 축소</div>
              </div>
              <button class="btn-secondary">단지 분석 ➔</button>
            </div>
            <div class="candidate-item">
              <div class="cand-tag" style="background:rgba(6,182,212,0.15); color:#06B6D4;">갭 1.8억</div>
              <div class="cand-body">
                <div class="cand-title">성북구 길음뉴타운 8단지 래미안 59㎡</div>
                <div class="cand-meta">매매 7.8억 / 전세 6.0억 (전세가율 76.9%) · 역세권 도보 4분 초품아</div>
              </div>
              <button class="btn-secondary">단지 분석 ➔</button>
            </div>
            <div class="candidate-item">
              <div class="cand-tag" style="background:rgba(245,158,11,0.15); color:#F59E0B;">갭 2.3억</div>
              <div class="cand-body">
                <div class="cand-title">영등포구 당산동 유원제일 84㎡ 재건축</div>
                <div class="cand-meta">매매 12.5억 / 전세 10.2억 · 시공사 선정 완료 사업시행인가 단계</div>
              </div>
              <button class="btn-secondary">단지 분석 ➔</button>
            </div>
            <div class="candidate-item">
              <div class="cand-tag" style="background:rgba(139,92,246,0.15); color:#8B5CF6;">급매 감지</div>
              <div class="cand-body">
                <div class="cand-title">마포구 마포래미안푸르지오 84㎡ 14층</div>
                <div class="cand-meta">매매 17.2억 (직전 최고가 19.5억 대비 -2.3억 급매 출현)</div>
              </div>
              <button class="btn-secondary">단지 분석 ➔</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 2) {
    // 02_detail: 단지별 상세 실거래 내역 & 갭투자 마진 시뮬레이터
    contentHtml = `
      <div class="grid-editor">
        <!-- 좌측: 단지 제원 및 투자 필터 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">📍</span> 단지 제원 & 시세 분석</div>
            <span class="badge-tag success">정상 연동</span>
          </div>
          <div class="form-group">
            <label class="form-label">분석 대상 단지</label>
            <input type="text" class="form-input" value="마포래미안푸르지오 (마포구 아현동)" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">세대수 / 준공년도</label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <input type="text" class="form-input" value="3,885 세대" readonly>
              <input type="text" class="form-input" value="2014년 (13년차)" readonly>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">전용 면적 타입</label>
            <div class="chip-group">
              <span class="chip active">전용 84㎡ (34평형) - 최근 실거래 18.2억</span>
              <span class="chip">전용 59㎡ (24평형) - 최근 실거래 14.8억</span>
              <span class="chip">전용 114㎡ (45평형) - 최근 실거래 23.5억</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">갭투자 시뮬레이션 산출</label>
            <div class="source-card">
              <div class="source-badge">실시간 갭투자 수익률 모델</div>
              <div class="source-title">매매가 18.2억 / 전세가 10.5억 ➔ 필요 갭: 7.7억원</div>
              <div class="source-snippet">취득세(3.5%): 6,370만원 · 복비: 1,638만원 · 실투자금: 8억 5,008만원</div>
            </div>
          </div>
          <button class="${btnClass}" style="width:100%; justify-content:center; margin-top:8px;">📊 AI 시장 심리 & 미래 가치 분석</button>
        </div>

        <!-- 중앙: 실거래가 변동 차트 및 거래 히스토리 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">📈</span> 최근 3개년 실거래가 및 전세가 궤적</div>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary">엑셀 다운로드</button>
              <button class="${btnClass}">+ 텔레그램 알림 등록</button>
            </div>
          </div>
          
          <!-- 가상 차트 박스 -->
          <div class="chart-box">
            <div class="chart-header">
              <span>최고가 19.5억 (2021.09)</span>
              <span>현재가 18.2억 (회복률 93.3%)</span>
              <span>최저가 15.2억 (2022.12)</span>
            </div>
            <div class="chart-mock">
              <div class="chart-line-trading">매매 실거래가 추세선 ━━━━━━━━━▲ 18.2억</div>
              <div class="chart-line-lease">전세 실거래가 추세선 ╌╌╌╌╌╌╌╌╌▲ 10.5억 (전세가율 57.6%)</div>
            </div>
          </div>

          <!-- 실거래 테이블 -->
          <div class="table-box" style="margin-top:16px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>계약일자</th>
                  <th>층수</th>
                  <th>거래금액</th>
                  <th>직전가 대비</th>
                  <th>거래유형</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026.11.04</td>
                  <td>14층</td>
                  <td><strong>18억 2,000만원</strong></td>
                  <td><span class="badge-tag success">+3,000만원 ▲</span></td>
                  <td>중개거래</td>
                </tr>
                <tr>
                  <td>2026.10.28</td>
                  <td>9층</td>
                  <td><strong>17억 9,000만원</strong></td>
                  <td><span class="badge-tag info">동일 ━</span></td>
                  <td>중개거래</td>
                </tr>
                <tr>
                  <td>2026.10.15</td>
                  <td>21층</td>
                  <td><strong>18억 1,000만원</strong></td>
                  <td><span class="badge-tag success">+2,000만원 ▲</span></td>
                  <td>중개거래</td>
                </tr>
                <tr>
                  <td>2026.09.22</td>
                  <td>4층</td>
                  <td><strong>17억 5,000만원</strong></td>
                  <td><span class="badge-tag warn">-4,000만원 ▼</span></td>
                  <td>직거래</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 우측: AI 시장 분석 보고서 뷰파인더 -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">🤖</span> AI 시장 투자 분석 HUD</div>
            <span class="badge-tag info">Perplexity & GPT-4o</span>
          </div>
          <div class="ai-report-box">
            <div class="air-score-box">
              <div class="air-label">투자 매력도 스코어</div>
              <div class="air-value" style="color:var(--brand);">88<span style="font-size:14px; color:var(--muted);">/100pt</span></div>
              <div class="badge-tag success">적극 매수 검토 구간</div>
            </div>

            <div class="air-section">
              <div class="air-sec-title">💡 퀀트 투자 분석 종합 의견</div>
              <p class="air-sec-text">
                마포구 대장주로서 강남/여의도 출퇴근 수요가 탄탄하며, 최근 3개월간 전세가율이 52%에서 57.6%로 빠르게 상승하고 있어 매매가 하방 경직성이 매우 강력합니다.
              </p>
            </div>

            <div class="air-section">
              <div class="air-sec-title">⚠️ 리스크 및 유의 사항</div>
              <p class="air-sec-text">
                최근 18억 초반대 실거래가 체결되면서 매도자 호가가 18.8억 이상으로 상향 조정 중이므로, 무리한 추격 매수보다는 18억 이하 급매물 출현 시 선진입을 권장합니다.
              </p>
            </div>

            <div class="air-section">
              <div class="air-sec-title">📱 실시간 텔레그램 봇 알림 상태</div>
              <div class="badge-tag warn" style="width:100%; text-align:center; padding:6px;">
                🔔 17.5억 이하 출현 시 1초 만에 알림
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (sNum === 3) {
    // 03_guide: 4단계 가이드북 & 국토부 API 연동 매뉴얼
    contentHtml = `
      <div class="panel" style="margin-bottom:24px;">
        <div class="panel-header">
          <div class="panel-title">
            <span class="icon">📖</span> 부동산 실거래 투자분석 자동화 마스터 가이드북 (/guide)
          </div>
          <span class="badge-tag success">공식 API 100% 무결성 가이드</span>
        </div>
        <p style="color:var(--muted); font-size:14px; margin-bottom:20px;">
          공공데이터포털(data.go.kr) 국토교통부 아파트매매 실거래가 API 발급부터 자치구별 시세 퀀트 분석, 갭투자 마진 시뮬레이션 및 텔레그램 급매 알림 연동까지 4단계로 완벽 가이드합니다.
        </p>

        <!-- 4단계 가이드 카드 그리드 -->
        <div class="guide-cards-grid">
          <div class="guide-card">
            <div class="gc-step">STEP 1</div>
            <div class="gc-title">국토교통부 실거래 API 발급</div>
            <p class="gc-desc">공공데이터포털에서 [국토교통부_아파트매매 실거래 상세 자료] 오픈API를 신청하여 일반 인증키(Encoding/Decoding)를 발급받습니다.</p>
            <div class="gc-badge">소요시간: 2분 (자동승인)</div>
          </div>
          <div class="guide-card">
            <div class="gc-step">STEP 2</div>
            <div class="gc-title">서울 25개 자치구 법정동 코드 연동</div>
            <p class="gc-desc">강남(11680), 서초(11650), 송파(11710), 마포(11440) 등 관심 자치구의 5자리 법정동 코드를 시스템에 등록합니다.</p>
            <div class="gc-badge">25개 구 원클릭 프리셋</div>
          </div>
          <div class="guide-card">
            <div class="gc-step">STEP 3</div>
            <div class="gc-title">AI 시장 심리 & 갭투자 분석 실행</div>
            <p class="gc-desc">Perplexity 실시간 웹 검색 및 GPT-4o를 연동하여 특정 단지의 뉴스 호재, 전세가율 추이, 적정 매수가를 자동 산출합니다.</p>
            <div class="gc-badge">100% 본인 키 BYOK</div>
          </div>
          <div class="guide-card">
            <div class="gc-step">STEP 4</div>
            <div class="gc-title">텔레그램 급매 알림 봇 연동</div>
            <p class="gc-desc">내가 설정한 타깃 단지나 목표 가격대(직전가 대비 -10% 이상 등)의 급매물이 국토부에 신고되면 텔레그램으로 즉시 알림을 받습니다.</p>
            <div class="gc-badge">초당 실시간 감지</div>
          </div>
        </div>
      </div>

      <!-- 공공데이터 API 발급 및 법정동 코드 안내 테이블 -->
      <div class="grid-2col">
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">🔍</span> 주요 자치구 법정동 코드 매트릭스 (LAWD_CD)</div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>자치구명</th>
                <th>법정동 코드 (5자리)</th>
                <th>대표 대장 아파트 단지</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>강남구</strong></td>
                <td><code>11680</code></td>
                <td>압구정현대, 대치은마, 래미안대치팰리스</td>
              </tr>
              <tr>
                <td><strong>서초구</strong></td>
                <td><code>11650</code></td>
                <td>아크로리버파크, 래미안원베일리, 반포자이</td>
              </tr>
              <tr>
                <td><strong>송파구</strong></td>
                <td><code>11710</code></td>
                <td>잠실엘스, 리센츠, 헬리오시티, 올림픽선수촌</td>
              </tr>
              <tr>
                <td><strong>마포구</strong></td>
                <td><code>11440</code></td>
                <td>마포래미안푸르지오, 마포프레스티지자이</td>
              </tr>
              <tr>
                <td><strong>성동구</strong></td>
                <td><code>11200</code></td>
                <td>트리마제, 아크로서울포레스트, 옥수파크힐스</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">🛡️</span> 성공적인 갭투자를 위한 5대 안전 수칙</div>
            <span class="badge-tag warn">필독 안전 수칙</span>
          </div>
          <ul class="rule-list">
            <li><strong>1. 전세가율 60% 이상 집중</strong>: 매매가와 전세가의 차이가 적어 실투자금을 최소화할 수 있는 단지를 선별합니다.</li>
            <li><strong>2. 역세권 대단지 우선</strong>: 최소 500세대 이상, 지하철역 도보 10분 이내 단지가 불황기 전세 보증금 방어에 탁월합니다.</li>
            <li><strong>3. 취득세 및 부대비용 사전 계산</strong>: 다주택자 취득세 중과 및 중개수수료를 사전에 정밀 분해해야 역마진을 방지합니다.</li>
            <li><strong>4. 갱신 계약 vs 신규 계약 대조</strong>: 실거래가 신고 데이터 중 갱신권 청구 계약과 신규 전세 계약을 분리하여 왜곡을 방지합니다.</li>
            <li><strong>5. 서울 리전 IP 서버 필수</strong>: 국토부 공공 API는 해외 IP를 차단하므로 Vercel 서울 리전(icn1) 연동이 필수입니다.</li>
          </ul>
        </div>
      </div>
    `;
  } else {
    // 04_settings: API 연동 & 2026-11-01 5단계 표준 로그인/설정
    contentHtml = `
      <div class="login-wrapper">
        <!-- 2026-11-01 5단계 표준 로그인 폼 카드 -->
        <div class="login-card">
          <!-- 1단계: 프로그램 고유 로고 (68px 라운드 스퀘어) -->
          <div class="login-logo-box" style="background:${logoBg};">
            🏢
          </div>

          <!-- 2단계: 프로그램 영문명 (알약 캡슐 뱃지) -->
          <div class="login-pill-badge">
            AIMASTER REAL ESTATE SALES
          </div>

          <!-- 3단계: 프로그램 한글명 & 서브 타이틀 -->
          <h1 class="login-title">부동산 실거래 투자분석</h1>
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

        <!-- 우측: 국토부 API 키 & 텔레그램 알림 설정 카드 -->
        <div class="settings-card">
          <div class="panel-header">
            <div class="panel-title"><span class="icon">⚙️</span> 공공데이터 API 연동 및 알림 채널 설정</div>
            <span class="badge-tag success">공공데이터 키 연결됨</span>
          </div>

          <div class="connected-account-box">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="api-status-badge">API</div>
              <div>
                <div style="font-weight:700; font-size:15px;">국토교통부 아파트 실거래가 API 정상 연동</div>
                <div style="color:var(--muted); font-size:12px;">일일 허용 트래픽: 10,000건 중 248건 사용 (잔여 9,752건)</div>
              </div>
            </div>
            <span class="badge-tag success">Active</span>
          </div>

          <div class="form-group" style="margin-top:20px;">
            <label class="form-label">관심 타깃 자치구 등록 (다중 선택)</label>
            <div class="chip-group" style="flex-direction:row; flex-wrap:wrap;">
              <span class="chip active">강남구 (11680) ✕</span>
              <span class="chip active">서초구 (11650) ✕</span>
              <span class="chip active">송파구 (11710) ✕</span>
              <span class="chip active">마포구 (11440) ✕</span>
              <span class="chip active">노원구 (11350) ✕</span>
              <span class="chip">+ 자치구 추가</span>
            </div>
          </div>

          <div class="form-group" style="margin-top:16px;">
            <label class="form-label">텔레그램 급매 감지 봇 연동</label>
            <input type="text" class="form-input" value="봇 토큰: 7129482910:AAH... · Chat ID: 819238120" readonly>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
            <button class="btn-secondary">연결 테스트</button>
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
    .btn-3d-cyan {
      background: linear-gradient(180deg, #06B6D4 0%, #0284C7 100%);
      color: #04141A;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #38BDF8;
      box-shadow: 0 4px 0 #0369A1, 0 8px 16px rgba(6,182,212,0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-cyan:hover { transform: translateY(1px); box-shadow: 0 2px 0 #0369A1; }

    .btn-3d-naver-green {
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
    .btn-3d-naver-green:hover { transform: translateY(1px); box-shadow: 0 2px 0 #007A34; }

    .btn-3d-blue {
      background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
      color: #FFFFFF;
      font-weight: 900;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid #60A5FA;
      box-shadow: 0 4px 0 #1D4ED8, 0 8px 16px rgba(37,99,235,0.3);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-3d-blue:hover { transform: translateY(1px); box-shadow: 0 2px 0 #1D4ED8; }

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
    .badge-tag.info { background: rgba(6,182,212,0.15); color: #06B6D4; }
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

    /* 후보 리스트 */
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
      background: rgba(6,182,212,0.12);
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

    /* 차트 박스 */
    .chart-box {
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      margin-bottom: 14px;
    }
    .chart-mock {
      background: var(--card);
      border-radius: 8px;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 13px;
      font-weight: 800;
    }
    .chart-line-trading {
      color: var(--brand);
    }
    .chart-line-lease {
      color: var(--accent);
    }

    /* AI 리포트 박스 */
    .ai-report-box {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .air-score-box {
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .air-label {
      font-size: 11px;
      color: var(--muted);
      font-weight: 700;
      margin-bottom: 4px;
    }
    .air-value {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .air-section {
      background: var(--card2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
    }
    .air-sec-title {
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 4px;
      color: var(--text);
    }
    .air-sec-text {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.5;
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
      background: rgba(6,182,212,0.12);
      color: var(--brand);
      border: 1px solid rgba(6,182,212,0.25);
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
    .api-status-badge {
      width: 36px;
      height: 36px;
      background: #06B6D4;
      color: #FFF;
      font-weight: 900;
      font-size: 14px;
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
      <div class="brand-logo" style="background:${logoBg};">🏢</div>
      <div class="brand-text">
        <h2>${brandName}</h2>
        <p>국토교통부 공식 실거래가 API 100% 무결성 투자 분석 퀀트 파이프라인</p>
      </div>
    </div>
    <div>${themeBadge}</div>
  </div>

  ${contentHtml}
</body>
</html>`;
}

async function run() {
  console.log('🚀 부동산 실거래 투자분석 자동화 4대 화면 3시안(12개 뷰) 렌더링 및 캡처 시작...');
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

      // D:\Antigravity\Design 루트에도 복사
      const rootPngName = `res_${sName}_c${c}.png`;
      fs.copyFileSync(pngPath, path.join(BASE_DIR, rootPngName));
    }

    // 각 시안별 README.md 작성
    let readmeContent = '';
    if (c === 1) {
      readmeContent = `# 88. 퀀트 프롭테크 인텔리전스 레이더 덱 스타일 (Quant PropTech Intelligence Radar Deck)

- **컨셉**: 옵시디언 딥블랙(#060A12) 배경에 네온 사이안(#06B6D4)과 골드 앰버(#F59E0B) HUD를 결합한 블룸버그 터미널 감성의 1순위 추천 스타일.
- **핵심 특징**:
  - 초정밀 국토부 실거래가 실시간 수집 및 25개 자치구 평당가 레이더
  - 갭투자 안전마진 및 필요 자금 자동 시뮬레이션
  - 3D 엠보싱 사이안 버튼 (\`.btn-3d-cyan\`)
  - AI 시장 심리 스코어(88pt) 및 텔레그램 급매 알림 봇 연동
  - 2026-11-01 5단계 표준 로그인 레이아웃 & 1행 약관 완비
- **화면 구성**:
  - \`01_main.png\`: 대시보드 및 4단계 파이프라인 배너, 4대 핵심 KPI 카드, 자치구 레이더
  - \`02_detail.png\`: 단지별 상세 실거래 히스토리 & 갭투자 마진 시뮬레이터
  - \`03_guide.png\`: 공공데이터포털 국토부 API 발급 & 법정동 코드 매트릭스
  - \`04_settings.png\`: API 키 설정 & 2026-11-01 5단계 표준 로그인/설정
`;
    } else if (c === 2) {
      readmeContent = `# 89. 네이버 부동산 스마트 매트릭스 저널 스타일 (Naver Real Estate Smart Matrix Journal)

- **컨셉**: 소프트 아이스 화이트(#F8FAFC)에 네이버 시그니처 그린(#03C75A)을 결합하여 친숙하고 가독성 높은 네이버 부동산 감성 저널.
- **핵심 특징**:
  - 네이버 부동산 공식 컬러 시스템 계승
  - 3D 엠보싱 네이버 그린 버튼 (\`.btn-3d-naver-green\`)
  - 깔끔한 데이터 테이블 및 전월세 전환율 대조 매트릭스
  - 초보자도 한눈에 파악하는 직관적인 매물 가이드북
  - 2026-11-01 5단계 표준 로그인 레이아웃 & 1행 약관 완비
- **화면 구성**:
  - \`01_main.png\`: 클린 화이트 대시보드 & 25개 구 실거래 매트릭스
  - \`02_detail.png\`: 단지 상세 시세 추이 & 전세가율 차트
  - \`03_guide.png\`: 4단계 올인원 부동산 분석 매뉴얼
  - \`04_settings.png\`: 네이버 그린 테마 설정 & 5단계 표준 로그인
`;
    } else {
      readmeContent = `# 90. 미니멀 프롭테크 인베스터 아틀리에 스타일 (Minimal PropTech Investor Atelier)

- **컨셉**: 장시간 분석 작업 시 눈의 피로를 최소화하는 클린 크림 페이퍼(#FAF8F5) & 로열 코발트 블루(#2563EB) 투자 자문서 감성 아틀리에.
- **핵심 특징**:
  - 품격 있는 매거진 에디토리얼 레이아웃
  - 3D 엠보싱 로열 블루 버튼 (\`.btn-3d-blue\`)
  - 무소음 집중형 시세 리포트 데스크
  - 군더더기 없는 타이포그래피와 단정한 카드 여백
  - 2026-11-01 5단계 표준 로그인 레이아웃 & 1행 약관 완비
- **화면 구성**:
  - \`01_main.png\`: 에디토리얼 브리핑 데스크 & 핵심 투자 지표
  - \`02_detail.png\`: 단지별 심층 분석 리포트 & 투자 수익률 모델
  - \`03_guide.png\`: 초보자 친화형 법정동 코드 튜토리얼
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
