import fs from 'fs';
import path from 'path';

// 94, 95, 96번 템플릿 아카이브 디렉터리 준비
const BASE_DESIGN_DIR = 'D:/Antigravity/Design';
const TEMPLATES = [
  {
    id: '94_threads_mono_viral_blue_deck',
    name: '94. 쓰레드 오리지널 모노 바이럴 & 일렉트릭 블루 제휴 덱 스타일',
    num: '94',
    folder: path.join(BASE_DESIGN_DIR, '94_threads_mono_viral_blue_deck', 'threads_affiliate_poster'),
  },
  {
    id: '95_clean_smart_commerce_atelier',
    name: '95. 클린 스마트 커머스 인플루언서 아틀리에 스타일',
    num: '95',
    folder: path.join(BASE_DESIGN_DIR, '95_clean_smart_commerce_atelier', 'threads_affiliate_poster'),
  },
  {
    id: '96_quant_affiliate_roi_radar_console',
    name: '96. 퀀트 어필리에이트 트래픽 & ROI 레이더 HUD 콘솔 스타일',
    num: '96',
    folder: path.join(BASE_DESIGN_DIR, '96_quant_affiliate_roi_radar_console', 'threads_affiliate_poster'),
  }
];

for (const t of TEMPLATES) {
  if (!fs.existsSync(t.folder)) {
    fs.mkdirSync(t.folder, { recursive: true });
  }
}

// 4대 화면 HTML 템플릿 생성기
function renderScreen(templateId, screenId) {
  let theme = {
    bg: '#000000',
    card: '#101010',
    card2: '#181818',
    border: '#262626',
    borderBright: '#404040',
    text: '#FFFFFF',
    muted: '#8E8E8E',
    brand: '#0095F6',
    brandGrad: 'linear-gradient(135deg, #0095F6 0%, #00BAF2 100%)',
    btnClass: 'btn-3d-threads-blue',
    btnBg: 'linear-gradient(135deg, #0095F6, #0077E6)',
    btnBorder: '#005BB5',
    btnShadow: 'rgba(0, 149, 246, 0.4)',
    fontFamily: '"Pretendard Variable", Pretendard, -apple-system, sans-serif'
  };

  if (templateId === '95_clean_smart_commerce_atelier') {
    theme = {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      card2: '#F1F5F9',
      border: '#E2E8F0',
      borderBright: '#CBD5E1',
      text: '#0F172A',
      muted: '#64748B',
      brand: '#7C3AED',
      brandGrad: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
      btnClass: 'btn-3d-royal-purple',
      btnBg: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
      btnBorder: '#5B21B6',
      btnShadow: 'rgba(124, 58, 237, 0.35)',
      fontFamily: '"Pretendard Variable", Pretendard, -apple-system, sans-serif'
    };
  } else if (templateId === '96_quant_affiliate_roi_radar_console') {
    theme = {
      bg: '#0B101B',
      card: '#111827',
      card2: '#1F2937',
      border: '#1F2937',
      borderBright: '#374151',
      text: '#F9FAFB',
      muted: '#9CA3AF',
      brand: '#10B981',
      brandGrad: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      btnClass: 'btn-3d-neon-emerald',
      btnBg: 'linear-gradient(135deg, #10B981, #059669)',
      btnBorder: '#047857',
      btnShadow: 'rgba(16, 185, 129, 0.4)',
      fontFamily: '"JetBrains Mono", "Pretendard Variable", monospace'
    };
  }

  let screenContent = '';

  if (screenId === 'main') {
    screenContent = `
      <!-- 1. 헤더 & 빠른 액션 바 -->
      <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 20px; padding: 24px 28px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.15); position: relative; overflow: hidden;">
        <div style="position: absolute; top:0; left:0; right:0; height: 3px; background: ${theme.brandGrad};"></div>
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: ${theme.brandGrad}; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; font-weight: 900; box-shadow: 0 4px 14px ${theme.btnShadow};">
              @
            </div>
            <h1 style="font-size: 22px; font-weight: 900; color: ${theme.text}; letter-spacing: -0.5px;">쓰레드 쇼핑제휴 대시보드</h1>
            <span style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; background: ${theme.card2}; border: 1px solid ${theme.borderBright}; color: ${theme.brand};">v1.86</span>
          </div>
          <p style="font-size: 13px; color: ${theme.muted};">쿠팡 파트너스·스마트스토어·알리익스프레스 제휴 링크 자동 큐레이션 및 Threads 공식 바이럴 발행 파이프라인</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button style="background: ${theme.btnBg}; border: none; border-bottom: 4px solid ${theme.btnBorder}; color: #fff; padding: 10px 18px; border-radius: 12px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 15px ${theme.btnShadow}; cursor: pointer;">
            + 새 제휴 포스팅 기획
          </button>
          <button style="background: ${theme.card2}; border: 1px solid ${theme.borderBright}; color: ${theme.text}; padding: 10px 16px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer;">
            ⚡ 제휴 링크 일괄 변환
          </button>
        </div>
      </div>

      <!-- 2. 4단계 제휴 자동화 파이프라인 인디케이터 배너 -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;">
        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 18px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; color: ${theme.brand}; letter-spacing: 1px;">STEP 01</span>
            <span style="font-size: 16px;">🛒</span>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: ${theme.text};">상품 소싱 & 수집</div>
          <div style="font-size: 11px; color: ${theme.muted}; margin-top: 4px;">쿠팡 핫딜·알리 베스트셀러</div>
        </div>

        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 18px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; color: ${theme.brand}; letter-spacing: 1px;">STEP 02</span>
            <span style="font-size: 16px;">✍️</span>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: ${theme.text};">AI 바이럴 후킹 카피</div>
          <div style="font-size: 11px; color: ${theme.muted}; margin-top: 4px;">솔직 후기·500자 최적화</div>
        </div>

        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 18px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; color: ${theme.brand}; letter-spacing: 1px;">STEP 03</span>
            <span style="font-size: 16px;">📱</span>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: ${theme.text};">쓰레드 뷰파인더 덱</div>
          <div style="font-size: 11px; color: ${theme.muted}; margin-top: 4px;">링크 카드·인앱 프리뷰</div>
        </div>

        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 18px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; color: ${theme.brand}; letter-spacing: 1px;">STEP 04</span>
            <span style="font-size: 16px;">💰</span>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: ${theme.text};">전환 & 수익 리포트</div>
          <div style="font-size: 11px; color: ${theme.muted}; margin-top: 4px;">클릭 추적·예상 커미션</div>
        </div>
      </div>

      <!-- 3. 4대 핵심 제휴 KPI 카드 -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;">
        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: ${theme.brand};">
            <span>누적 링크 클릭수</span>
            <span>🖱️</span>
          </div>
          <div style="font-size: 28px; font-weight: 900; color: ${theme.text}; margin-top: 8px;">24,850<span style="font-size: 13px; font-weight: 500; color: ${theme.muted}; margin-left: 4px;">회</span></div>
          <div style="font-size: 11px; color: #10B981; margin-top: 4px;">▲ 전주 대비 18.4% 상승</div>
        </div>

        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #F59E0B;">
            <span>이번 달 예상 커미션</span>
            <span>💵</span>
          </div>
          <div style="font-size: 28px; font-weight: 900; color: ${theme.text}; margin-top: 8px;">₩1,482,000</div>
          <div style="font-size: 11px; color: ${theme.muted}; margin-top: 4px;">쿠팡 파트너스 + 알리 합산</div>
        </div>

        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #10B981;">
            <span>생성된 제휴 포스트</span>
            <span>📌</span>
          </div>
          <div style="font-size: 28px; font-weight: 900; color: ${theme.text}; margin-top: 8px;">142<span style="font-size: 13px; font-weight: 500; color: ${theme.muted}; margin-left: 4px;">건</span></div>
          <div style="font-size: 11px; color: ${theme.muted}; margin-top: 4px;">발행 성공률 100% (오류 0)</div>
        </div>

        <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #8B5CF6;">
            <span>구매 전환율 (CVR)</span>
            <span>🎯</span>
          </div>
          <div style="font-size: 28px; font-weight: 900; color: ${theme.text}; margin-top: 8px;">6.42<span style="font-size: 13px; font-weight: 500; color: ${theme.muted}; margin-left: 4px;">%</span></div>
          <div style="font-size: 11px; color: #10B981; margin-top: 4px;">업계 평균(2.1%) 대비 3배</div>
        </div>
      </div>

      <!-- 4. 1:1 모바일 쓰레드 뷰파인더 덱 목업 UI & 핫딜 상품 큐레이션 -->
      <div style="display: grid; grid-template-columns: 5fr 7fr; gap: 20px; background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <!-- 좌측: 모바일 쓰레드 인앱 피드 뷰파인더 목업 -->
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 100%; max-width: 360px; border-radius: 36px; border: 4px solid ${theme.borderBright}; background: #000; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <!-- 스피커 & 노치 -->
            <div style="width: 110px; height: 14px; background: #1a1a1a; border-radius: 10px; margin: 0 auto 14px; border: 1px solid #333;"></div>

            <!-- 쓰레드 피드 본문 -->
            <div style="display: flex; gap: 12px;">
              <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="width: 38px; height: 38px; border-radius: 50%; background: ${theme.brandGrad}; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; font-weight: 900;">
                  @
                </div>
                <div style="width: 2px; flex: 1; background: #262626; margin: 8px 0;"></div>
              </div>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 13px; font-weight: 800; color: #fff;">buylife_curator</span>
                  <span style="font-size: 11px; color: #666;">24분 전</span>
                </div>
                <p style="font-size: 12.5px; color: #e5e5e5; line-height: 1.5; margin-bottom: 10px;">
                  이거 진짜 삶의 질 수직 상승템... 🔥<br>
                  책상 위 케이블 지옥이었는데 3in1 고속 맥세이프 거치대 하나로 종결됐습니다.<br>
                  지금 쿠팡 로켓배송 특가 29% 할인 중이네요!
                </p>

                <!-- 제휴 링크 카드 칩셋 목업 -->
                <div style="border: 1px solid #333; border-radius: 12px; overflow: hidden; background: #141414; margin-bottom: 10px;">
                  <div style="height: 120px; background: linear-gradient(135deg, #1f2937, #111827); display: flex; align-items: center; justify-content: center; font-size: 32px;">
                    ⚡📱
                  </div>
                  <div style="padding: 10px 12px;">
                    <div style="font-size: 10px; color: ${theme.brand}; font-weight: 800;">coupang.com • 로켓와우 29% 특가</div>
                    <div style="font-size: 12px; font-weight: 700; color: #fff; margin-top: 2px;">앤커 3-in-1 큐브 맥세이프 15W 고속 충전기</div>
                  </div>
                </div>

                <!-- 쓰레드 피드 리액션 아이콘 (좋아요, 답글, 리포스트, 공유) -->
                <div style="display: flex; gap: 16px; font-size: 14px; color: #a3a3a3; padding-top: 4px;">
                  <span>🤍 342</span>
                  <span>💬 48</span>
                  <span>🔁 29</span>
                  <span>✈️</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 우측: AI 바이럴 카피 생성 & 핫딜 소싱 매트릭스 -->
        <div style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11px; font-weight: 800; color: ${theme.brand}; letter-spacing: 1px;">AFFILIATE MATRIX</span>
                <h3 style="font-size: 18px; font-weight: 900; color: ${theme.text}; margin-top: 2px;">AI 바이럴 후킹 5종 엔진 & 단축 링크</h3>
              </div>
              <span style="font-size: 11px; padding: 3px 10px; border-radius: 9999px; background: ${theme.card2}; border: 1px solid ${theme.borderBright}; color: #10B981; font-weight: 800;">
                LIVE 🔴 AI CONNECTED
              </span>
            </div>
            <p style="font-size: 12px; color: ${theme.muted}; margin-top: 6px; line-height: 1.5;">
              쿠팡 파트너스·알리익스프레스 상품 링크를 넣으면 AI가 Threads 알고리즘에 최적화된 5종 바이럴 문구와 단축 추적 링크를 3초 만에 생성합니다.
            </p>

            <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
              <div style="background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 10px; font-weight: 800; color: ${theme.brand};">TYPE A</span>
                  <span style="font-size: 13px; font-weight: 700; color: ${theme.text}; margin-left: 8px;">내돈내산 솔직 후기형 ("이거 3주 쓰고 광명 찾음")</span>
                </div>
                <span style="font-size: 11px; color: #10B981; font-weight: 700;">전환율 8.2%</span>
              </div>

              <div style="background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 10px; font-weight: 800; color: #F59E0B;">TYPE B</span>
                  <span style="font-size: 13px; font-weight: 700; color: ${theme.text}; margin-left: 8px;">타임세일 긴급 품절형 ("역대 최저가 풀렸습니다 지금")</span>
                </div>
                <span style="font-size: 11px; color: #10B981; font-weight: 700;">전환율 7.6%</span>
              </div>

              <div style="background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 10px; font-weight: 800; color: #8B5CF6;">TYPE C</span>
                  <span style="font-size: 13px; font-weight: 700; color: ${theme.text}; margin-left: 8px;">비교 분석 가성비 종결형 ("A사 vs B사 스펙 총정리")</span>
                </div>
                <span style="font-size: 11px; color: #10B981; font-weight: 700;">전환율 6.9%</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid ${theme.border}; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 12px; color: ${theme.muted};">💡 상품 URL 하나만 입력하면 즉시 큐레이션 완료</div>
            <button style="background: ${theme.btnBg}; border: none; border-bottom: 4px solid ${theme.btnBorder}; color: #fff; padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 15px ${theme.btnShadow}; cursor: pointer;">
              새 상품으로 카피 생성하기 →
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (screenId === 'detail') {
    screenContent = `
      <!-- 상품 수집 & 바이럴 카피 상세 화면 -->
      <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 20px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <span style="font-size: 11px; font-weight: 800; color: ${theme.brand}; letter-spacing: 1px;">PRODUCT CURATION</span>
            <h2 style="font-size: 20px; font-weight: 900; color: ${theme.text}; margin-top: 2px;">상품 분석 & 바이럴 카피 스튜디오</h2>
          </div>
          <span style="font-size: 11px; font-weight: 700; color: ${theme.muted};">쿠팡/알리 공식 API 연결됨</span>
        </div>

        <!-- URL 입력 바 -->
        <div style="display: flex; gap: 10px; margin-bottom: 24px;">
          <input type="text" value="https://link.coupang.com/a/bXYZ123 (애플 에어팟 프로 2세대 특가)" readonly style="flex: 1; background: ${theme.card2}; border: 1px solid ${theme.borderBright}; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: ${theme.text}; outline: none;">
          <button style="background: ${theme.btnBg}; border: none; border-bottom: 4px solid ${theme.btnBorder}; color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 15px ${theme.btnShadow}; cursor: pointer;">
            AI 카피 즉시 추출 ⚡
          </button>
        </div>

        <!-- 상품 스펙 카드 & 카피 생성기 -->
        <div style="display: grid; grid-template-columns: 4fr 8fr; gap: 20px;">
          <!-- 상품 정보 카드 -->
          <div style="background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 18px;">
            <div style="height: 180px; background: #000; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 14px;">
              🎧
            </div>
            <div style="font-size: 11px; font-weight: 800; color: #10B981;">쿠팡 로켓배송 • 당일도착</div>
            <div style="font-size: 15px; font-weight: 800; color: ${theme.text}; margin-top: 4px;">Apple 에어팟 프로 2세대 MagSafe USB-C</div>
            <div style="margin-top: 10px; display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 20px; font-weight: 900; color: #EF4444;">21% 할인</span>
              <span style="font-size: 20px; font-weight: 900; color: ${theme.text};">₩279,000</span>
              <span style="font-size: 12px; color: ${theme.muted}; text-decoration: line-through;">₩359,000</span>
            </div>
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid ${theme.borderBright}; font-size: 12px; color: ${theme.muted}; display: flex; justify-content: space-between;">
              <span>예상 커미션 (3%)</span>
              <span style="color: #10B981; font-weight: 800;">건당 ₩8,370원</span>
            </div>
          </div>

          <!-- 바이럴 카피 에디터 -->
          <div style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 800; color: ${theme.text};">Threads 바이럴 본문 (AI 추천안)</span>
                <span style="font-size: 11px; font-weight: 700; color: ${theme.brand};">182 / 500자</span>
              </div>
              <textarea readonly style="width: 100%; height: 160px; background: ${theme.card2}; border: 1px solid ${theme.borderBright}; border-radius: 12px; padding: 14px; font-size: 13px; color: ${theme.text}; line-height: 1.6; resize: none; outline: none; box-sizing: border-box;">
에어팟 프로 1세대 쓰다가 노캔 먹통되서 2세대로 넘어왔는데... 음질이랑 노캔 체감이 미쳤네요 🤯
C타입 충전되는 거 하나만으로도 케이블 다 버릴 수 있어서 너무 쾌적합니다.

지금 쿠팡에서 21% 깜짝 쿠폰 풀려서 역대가 나왔습니다. 프로 필요하셨던 분들은 지금 타세요! 👇</textarea>
            </div>

            <div style="margin-top: 16px; background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 10px; font-weight: 800; color: ${theme.muted};">단축 제휴 추적 링크</span>
                <div style="font-size: 12px; font-weight: 700; color: ${theme.brand}; font-family: monospace; margin-top: 2px;">https://threads.buylife.xyz/r/ap2891</div>
              </div>
              <button style="background: ${theme.card}; border: 1px solid ${theme.borderBright}; color: ${theme.text}; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                복사
              </button>
            </div>

            <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px;">
              <button style="background: ${theme.card2}; border: 1px solid ${theme.borderBright}; color: ${theme.text}; padding: 10px 18px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">
                임시 저장
              </button>
              <button style="background: ${theme.btnBg}; border: none; border-bottom: 4px solid ${theme.btnBorder}; color: #fff; padding: 10px 22px; border-radius: 10px; font-size: 12px; font-weight: 800; box-shadow: 0 4px 15px ${theme.btnShadow}; cursor: pointer;">
                Threads 즉시 발행하기 🚀
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (screenId === 'guide') {
    screenContent = `
      <!-- 연동 & 사용 매뉴얼 화면 -->
      <div style="background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 20px; padding: 28px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: ${theme.brandGrad}; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff;">
            📖
          </div>
          <div>
            <h2 style="font-size: 20px; font-weight: 900; color: ${theme.text};">쓰레드 쇼핑제휴 공식 매뉴얼</h2>
            <p style="font-size: 12px; color: ${theme.muted};">Meta Graph API 공식 연동부터 제휴 링크 어뷰징 방지 및 수익 극대화 전략</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 14px; padding: 20px;">
            <div style="font-size: 11px; font-weight: 800; color: ${theme.brand}; margin-bottom: 6px;">GUIDE 01</div>
            <h3 style="font-size: 15px; font-weight: 800; color: ${theme.text}; margin-bottom: 8px;">Threads API 연동 3단계</h3>
            <p style="font-size: 12px; color: ${theme.muted}; line-height: 1.5;">
              1. developers.facebook.com 가입<br>
              2. Threads 앱 등록 및 스코프 승인<br>
              3. 토큰 발급 및 AIMaster 바인딩
            </p>
          </div>

          <div style="background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 14px; padding: 20px;">
            <div style="font-size: 11px; font-weight: 800; color: #10B981; margin-bottom: 6px;">GUIDE 02</div>
            <h3 style="font-size: 15px; font-weight: 800; color: ${theme.text}; margin-bottom: 8px;">쿠팡·알리 키 등록 가이드</h3>
            <p style="font-size: 12px; color: ${theme.muted}; line-height: 1.5;">
              • 쿠팡 파트너스 API Access Key<br>
              • 알리익스프레스 어필리에이트 App Key<br>
              • 회원 본인 키 100% 안전 보관
            </p>
          </div>

          <div style="background: ${theme.card2}; border: 1px solid ${theme.border}; border-radius: 14px; padding: 20px;">
            <div style="font-size: 11px; font-weight: 800; color: #F59E0B; margin-bottom: 6px;">GUIDE 03</div>
            <h3 style="font-size: 15px; font-weight: 800; color: ${theme.text}; margin-bottom: 8px;">계정 보호 & 어뷰징 방지</h3>
            <p style="font-size: 12px; color: ${theme.muted}; line-height: 1.5;">
              • 하루 최대 5~8개 발행 간격 유지<br>
              • 리디렉션 브릿지 도메인 자동 적용<br>
              • 공정위 문구("수수료 제공") 자동 삽입
            </p>
          </div>
        </div>
      </div>
    `;
  } else if (screenId === 'settings') {
    screenContent = `
      <!-- 2026-11-01 5단계 표준 로그인 규격 화면 -->
      <div style="min-height: 600px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0;">
        <!-- [1단계] 68px 고유 로고 -->
        <div style="width: 68px; height: 68px; border-radius: 20px; background: ${theme.brandGrad}; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff; font-weight: 900; box-shadow: 0 10px 25px ${theme.btnShadow}; ring: 4px solid rgba(0,149,246,0.2); margin-bottom: 14px;">
          @
        </div>

        <!-- [2단계] 영문 알약 뱃지 -->
        <div style="display: inline-block; padding: 4px 16px; border-radius: 9999px; background: ${theme.card2}; border: 1px solid ${theme.borderBright}; color: ${theme.brand}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
          AIMASTER THREADS AFFILIATE
        </div>

        <!-- [3단계] 한글명 볼드 메인 타이틀 + 부드러운 서브 카피 -->
        <h2 style="font-size: 26px; font-weight: 900; color: ${theme.text}; letter-spacing: -0.5px; margin-bottom: 4px;">쓰레드 쇼핑제휴 포스터</h2>
        <p style="font-size: 13px; color: ${theme.muted}; margin-bottom: 24px;">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>

        <!-- [4단계] 폼 카드 & 3D 엠보싱 실행 버튼 -->
        <div style="width: 100%; max-width: 440px; background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 24px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <!-- 2단 탭 세그먼트 -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; background: ${theme.card2}; border-radius: 12px; padding: 4px; margin-bottom: 20px;">
            <button style="background: ${theme.card}; color: ${theme.text}; border: none; padding: 8px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer;">로그인</button>
            <button style="background: transparent; color: ${theme.muted}; border: none; padding: 8px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer;">회원가입</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 12px; font-weight: 700; color: ${theme.muted}; display: block; margin-bottom: 6px;">이메일</label>
              <input type="email" value="buylifemall@gmail.com" readonly style="width: 100%; background: ${theme.card2}; border: 1px solid ${theme.borderBright}; border-radius: 12px; padding: 12px 16px; font-size: 13px; color: ${theme.text}; outline: none; box-sizing: border-box;">
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <label style="font-size: 12px; font-weight: 700; color: ${theme.muted};">비밀번호</label>
                <span style="font-size: 11px; color: ${theme.brand}; cursor: pointer;">비밀번호 찾기?</span>
              </div>
              <input type="password" value="••••••••••••" readonly style="width: 100%; background: ${theme.card2}; border: 1px solid ${theme.borderBright}; border-radius: 12px; padding: 12px 16px; font-size: 13px; color: ${theme.text}; outline: none; box-sizing: border-box;">
            </div>

            <button style="width: 100%; background: ${theme.btnBg}; border: none; border-bottom: 4px solid ${theme.btnBorder}; color: #fff; padding: 14px; border-radius: 14px; font-weight: 900; font-size: 14px; box-shadow: 0 4px 15px ${theme.btnShadow}; cursor: pointer; margin-top: 10px;">
              로그인 →
            </button>
          </div>
        </div>

        <!-- [5단계] 1행 축소 약관 -->
        <p style="margin-top: 20px; font-size: 12px; color: ${theme.muted}; white-space: nowrap;">
          진행 시 <a href="#" style="color: ${theme.brand}; text-decoration: none;">이용약관</a> 및 <a href="#" style="color: ${theme.brand}; text-decoration: none;">개인정보 처리방침</a>에 동의합니다.
        </p>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateId} - ${screenId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${theme.bg};
      color: ${theme.text};
      font-family: ${theme.fontFamily};
      padding: 32px;
      min-height: 900px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  ${screenContent}
</body>
</html>
  `;
}

// 12개 화면을 캡처하는 메인 실행부
async function run() {
  console.log('Starting Playwright for 12 views rendering...');
  const { chromium } = await import('../real_estate_sales/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const screens = [
    { id: 'main', filePrefix: '01_main' },
    { id: 'detail', filePrefix: '02_detail' },
    { id: 'guide', filePrefix: '03_guide' },
    { id: 'settings', filePrefix: '04_settings' }
  ];

  for (const t of TEMPLATES) {
    console.log('Rendering template ' + t.id + '...');
    for (const s of screens) {
      const html = renderScreen(t.id, s.id);
      await page.setContent(html, { waitUntil: 'load' });
      await page.waitForTimeout(300);

      const fileName = s.filePrefix + '_' + t.id.split('_')[1] + '.png';
      const outPath = path.join(t.folder, fileName);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log('Saved: ' + outPath);
    }
  }

  await browser.close();
  console.log('All 12 views captured successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
