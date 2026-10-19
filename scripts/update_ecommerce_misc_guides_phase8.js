const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const guidesData = [
  // 1. 토스쇼핑 쉐어링크 API
  {
    id: 'de6e2878-1615-455a-a219-c9b0b3d0795a',
    title: '토스쇼핑 쉐어링크 API 키 발급받기',
    content: `<div class="space-y-6">
  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">🔵</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #dbeafe; margin: 0;">토스쇼핑 크리에이터 쉐어링크 Open API 연동 개요</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #bfdbfe; margin-bottom: 16px;">
      토스쇼핑 쉐어링크는 토스 앱 내 베스트 상품, 카테고리별 인기 상품, 오늘의 특가 상품 정보를 자동으로 실시간 조회하고 <strong>회원님 전용 수익 쉐어링크</strong>를 발급하는 이커머스 제휴 API입니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 3분</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 난이도: <strong style="color: #fbbf24;">중급 (고정 IP 등록 필요)</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        💰 비용: <strong style="color: #60a5fa;">100% 무료 발급</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🔑 필요값: <strong style="color: #f8fafc;">API 연동 키</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #2563eb; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">토스 쉐어링크 크리에이터 가입</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://sharelink.toss.im" target="_blank" rel="noreferrer" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">sharelink.toss.im</a>에 접속하여 토스 앱 인증을 통해 크리에이터로 가입합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #2563eb; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">연동 → API 키 발급 메뉴 이동</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        좌측 메뉴에서 <strong>[연동] → [API 키 발급]</strong> 메뉴를 클릭합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #2563eb; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">출발지 고정 IP 2개 필수 등록 (매우 중요)</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        "API 연동 키 만들기"를 누르면 출발지 IP를 등록하라는 팝업이 뜹니다. AIMaster 서버가 사용하는 <strong>고정 IP 2개</strong>를 반드시 입력하여 추가해 주세요:
      </p>
      <div style="background: #030712; padding: 12px 16px; border-radius: 8px; border: 1px solid #374151; font-family: monospace; font-size: 13px; color: #60a5fa; margin-bottom: 12px;">
        52.87.82.133<br />
        52.5.155.132
      </div>
      <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #fca5a5;">
        ⚠️ <strong>주의:</strong> 출발지 IP를 등록하지 않거나 오타가 있을 경우, 상품 조회 시 토스 서버에서 <code>403 Forbidden</code> 에러를 반환합니다. 위 2개 IP를 반드시 모두 등록하세요.
      </div>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">API 연동 키 생성 및 AIMaster 저장</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        IP 등록 후 생성된 <strong>API 연동 키</strong>를 복사하여, AIMaster <strong>[API키등록·플랫폼연동]</strong> 화면의 토스쇼핑 항목에 붙여넣고 저장합니다. 이제 블로그나 피드 자동화 프로그램에서 토스쇼핑 인기 상품을 자동으로 불러올 수 있습니다!
      </p>
    </div>
  </div>
</div>`
  },

  // 2. 네이버 브랜드커넥트 링크 등록하기
  {
    id: 'e39a02e3-2b00-45a1-92ed-2e33d0d331d2',
    title: '네이버 브랜드커넥트 링크 등록하기',
    content: `<div class="space-y-6">
  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">💼</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #d1fae5; margin: 0;">네이버 브랜드커넥트(쇼핑 커넥트) 제휴 링크 연동 개요</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #a7f3d0; margin-bottom: 16px;">
      네이버 브랜드커넥트는 별도의 복잡한 개발자 API 키가 없습니다. 브랜드커넥트 사이트에서 본인이 마케팅할 상품의 <strong>제휴 링크(숏링크)를 직접 발급받아 복사</strong>한 뒤, AIMaster 상품 등록 또는 자동 포스팅 화면에 그대로 붙여넣어 사용하는 직관적인 방식입니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 3분</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 난이도: <strong style="color: #34d399;">초급 (API 키 불필요)</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        💰 비용: <strong style="color: #34d399;">100% 무료</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🔗 연동 방식: <strong style="color: #f8fafc;">직접 링크 복사 & 붙여넣기</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #059669; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">네이버 브랜드커넥트 시작하기</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://brandconnect.naver.com" target="_blank" rel="noreferrer" style="color: #34d399; text-decoration: underline; font-weight: 600;">brandconnect.naver.com</a>에 접속한 후 <strong>[브랜드 커넥트 시작하기]</strong>를 클릭하여 크리에이터 약관에 동의합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #059669; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">스페이스 개설 및 본인 SNS 채널 연동</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <strong>[스페이스 개설하기]</strong> 메뉴에서 본인 소유의 네이버 블로그(또는 인스타그램, 유튜브 채널)를 최소 1개 이상 연결하고 스페이스 프로필을 완성합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #059669; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">제휴 상품 검색 및 숏링크 복사</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        상단 <strong>[쇼핑 커넥트] → [제휴 상품]</strong> 메뉴로 이동하여 본인이 홍보하고자 하는 상품을 검색한 뒤, <strong>[제휴 링크 복사]</strong> 버튼을 누르면 고유 수익 숏링크가 복사됩니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">AIMaster 자동 발행 화면에 링크 붙여넣기</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        AIMaster 포스팅 자동화 프로그램(블로그, 인스타, 쓰레드 등)의 <strong>'제휴 링크 입력'</strong> 또는 상품 등록 칸에 복사한 링크를 그대로 붙여넣습니다. AI가 해당 상품의 특장점을 분석하여 고수익 전환형 글을 자동으로 생성합니다!
      </p>
    </div>
  </div>
</div>`
  },

  // 3. AI 12단 상세페이지 자동화 완벽 가이드
  {
    id: '3255b41b-0ddd-414b-9e45-309b7072cbef',
    title: 'AI 12단 상세페이지 자동화 - 쿠팡 12단 & 스마트스토어 상세페이지 제작 완벽 가이드',
    content: `<div class="space-y-6">
  <!-- 발급 개요 카드 -->
  <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">📄</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #e0e7ff; margin: 0;">AI 12단 상세페이지 자동화 완벽 활용 가이드</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #c7d2fe; margin-bottom: 16px;">
      쿠팡(12장+)과 네이버 스마트스토어(9장+)의 최신 상위노출 알고리즘 규격에 맞추어, 상품명 입력만으로 <strong>전문 기획서 작성 → 섹션별 비주얼 렌더링 → 가로 860px 통상세페이지 다운로드</strong>까지 원클릭으로 완성하는 방법입니다.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 13px;">
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        ⏱️ 소요시간: <strong style="color: #f8fafc;">약 5분 완성</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🎯 규격 지원: <strong style="color: #818cf8;">쿠팡 12단 / 네이버 9단 (860px)</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        🤖 기반 엔진: <strong style="color: #38bdf8;">Google Gemini 2.5 Flash / Pro</strong>
      </div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
        💾 출력 포맷: <strong style="color: #f8fafc;">고화질 WebP / PNG / JPG</strong>
      </div>
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #6366f1; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">사전 준비: Google Gemini API 키 연동</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        프로그램 상단 또는 좌측의 <strong>[API키등록·플랫폼연동]</strong> 화면에서 본인의 Google Gemini API 키를 등록합니다. (Google AI Studio에서 100% 무료로 1초 만에 발급 가능)
      </p>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #6366f1; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">제품 정보 입력 및 1초 기획서 생성</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        상품명(예: '무소음 초음파 가습기')과 타깃 고객, 주요 셀링 포인트를 입력하고 <strong>[기획서 자동 생성]</strong>을 클릭합니다. AI가 후킹 헤드카피, 문제 제기, 솔루션 제시, 디테일 12단 구성을 즉시 완성합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #6366f1; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">섹션별 비주얼 렌더링 및 카피 편집</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        생성된 12단 섹션의 프리뷰를 확인하면서 마음에 드는 비주얼 스타일(미니멀, 프리미엄, 감성, 테크)을 선택하고, 필요시 텍스트나 강조 배너를 클릭하여 자유롭게 수정합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">860px 통상세페이지 다운로드 및 마켓 등록</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <strong>[860px 통이미지 다운로드]</strong> 또는 <strong>[섹션별 개별 이미지 분할 다운로드]</strong>를 클릭하여 저장한 후, 스마트스토어 에디터나 쿠팡 윙(WING) 상세페이지 에디터에 그대로 업로드하시면 끝납니다!
      </p>
    </div>
  </div>
</div>`
  },

  // 4. 프로그램 주소 변경(buylife.xyz) 통합 가이드
  {
    id: 'cffe0d83-1e7f-494c-947d-75dcfcaee01e',
    title: '프로그램 주소 변경(buylife.xyz) — 새 콜백 주소 추가·웹훅 교체·확장 재설치 방법',
    content: `<div class="space-y-6">
  <!-- 중요 안내 공지 카드 -->
  <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 16px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 24px;">🔄</span>
      <h3 style="font-size: 18px; font-weight: 700; color: #fef3c7; margin: 0;">AI Master 통합 도메인(buylife.xyz) 콜백 갱신 안내</h3>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #fde68a; margin-bottom: 16px;">
      AI Master의 모든 서브 프로그램이 <strong><code>프로그램이름.buylife.xyz</code></strong> 공식 서브도메인으로 통합 개편되었습니다! 이제 한 번 로그인하면 모든 프로그램이 자동으로 연동되는 싱글사인온(SSO)이 지원됩니다. 기존 등록된 외부 플랫폼(Meta, Google, 네이버, 카카오)의 콜백 URL을 아래 단계에 따라 갱신해 주세요.
    </p>
    <div style="background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; color: #e2e8f0;">
      💡 <strong>기존 주소 보존:</strong> 이전 주소를 지우지 마시고, <strong>[추가 등록]</strong> 방식으로 새 주소를 넣어두시면 기존 연동과 새 연동이 모두 끊김 없이 안전하게 유지됩니다.
    </div>
  </div>

  <!-- 단계별 가이드 (Step 1~4) -->
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Step 1 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #f59e0b; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">1</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">Meta 개발자 센터: 인스타그램 & 쓰레드 콜백 추가</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style="color: #fbbf24; text-decoration: underline; font-weight: 600;">Meta 개발자 센터</a>에서 본인 앱의 [Instagram 기본 디스플레이] 또는 [Threads API] 설정으로 이동하여 '유효한 OAuth 리디렉션 URI'에 아래 주소를 <strong>추가</strong>합니다:
      </p>
      <div style="background: #030712; padding: 12px 16px; border-radius: 8px; border: 1px solid #374151; font-family: monospace; font-size: 13px; color: #fde68a;">
        https://auto-instagram-posting.buylife.xyz/api/instagram/callback<br />
        https://auto-threads-posting.buylife.xyz/api/threads/callback
      </div>
    </div>

    <!-- Step 2 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #f59e0b; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">2</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">Google Cloud 콘솔: 승인된 리디렉션 URI 추가</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style="color: #fbbf24; text-decoration: underline; font-weight: 600;">Google Cloud 콘솔</a>의 [사용자 인증 정보]에서 OAuth 클라이언트 ID를 클릭하고, [승인된 리디렉션 URI] 및 [승인된 JavaScript 원본]에 각각 아래 주소를 추가합니다:
      </p>
      <div style="background: #030712; padding: 12px 16px; border-radius: 8px; border: 1px solid #374151; font-family: monospace; font-size: 13px; color: #fde68a;">
        [승인된 원본] https://www.buylife.xyz<br />
        [승인된 리디렉션] https://www.buylife.xyz/api/auth/callback/google
      </div>
    </div>

    <!-- Step 3 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #f59e0b; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">3</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">네이버 개발자 센터: Callback URL 추가</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        <a href="https://developers.naver.com/apps/#/register" target="_blank" rel="noreferrer" style="color: #fbbf24; text-decoration: underline; font-weight: 600;">네이버 개발자 센터</a>의 [내 애플리케이션] → [API 설정]에서 서비스 URL 및 네이버 로그인 Callback URL을 추가합니다:
      </p>
      <div style="background: #030712; padding: 12px 16px; border-radius: 8px; border: 1px solid #374151; font-family: monospace; font-size: 13px; color: #fde68a;">
        https://naver-cafe-poster.buylife.xyz/api/auth/callback/naver<br />
        https://www.buylife.xyz/api/auth/callback/naver
      </div>
    </div>

    <!-- Step 4 -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">4</span>
        <h4 style="font-size: 16px; font-weight: 600; color: #f9fafb; margin: 0;">프로그램 설정 화면에서 [연결 테스트] 확인</h4>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 12px 0;">
        새로운 <code>buylife.xyz</code> 주소로 각 프로그램에 접속한 후, [설정] 메뉴의 계정 연결 버튼을 눌러 정상적으로 승인 팝업이 뜨고 연결 상태가 '초록색(정상)'으로 바뀌는지 확인합니다.
      </p>
    </div>
  </div>
</div>`
  }
];

async function updateGuides() {
  console.log(`총 ${guidesData.length}개 이커머스 & 통합 안내 가이드 본문 업데이트 시작...`);
  for (const item of guidesData) {
    const { error } = await supabase
      .from('platform_guides')
      .update({ content: item.content })
      .eq('id', item.id);
    if (error) {
      console.error(`- 업데이트 실패 [${item.title}]:`, error);
    } else {
      console.log(`- 업데이트 성공: [${item.title}] (${item.id})`);
    }
  }
  console.log('4개 이커머스 & 통합 안내 가이드 본문 업데이트 완료!');
}

updateGuides();
