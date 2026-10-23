const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const lines = env.split('\n');
let url = '', serviceRoleKey = '';
for (const line of lines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
}

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY가 없습니다!');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

// 1. 쿠팡 파트너스
const coupangContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2">
      <span>🛍️</span>
      <span>쿠팡 파트너스(Coupang Partners) Open API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      쿠팡 파트너스 Open API는 AIMaster의 <strong>쿠팡 핫딜 키워드 수집, 실시간 상품 가격 및 썸네일 크롤링, 본인 고유의 제휴 수익 링크(딥링크) 자동 생성</strong>에 사용됩니다. 사업자 등록증 없이 개인도 누구나 가입하여 쇼핑 자동화 수익을 창출할 수 있습니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">쿠팡 파트너스 가입 및 활동 채널 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://partners.coupang.com" target="_blank" class="text-rose-300 font-semibold underline underline-offset-4 hover:text-rose-200">partners.coupang.com</a>에 접속하여 회원가입을 진행합니다.<br/>
        가입 후 <strong>[내 정보 관리]</strong> 메뉴에서 제휴 링크를 게시할 활동 페이지(네이버 블로그, 인스타그램, 쓰레드, 유튜브 채널 등) URL을 등록합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">누적 판매금액 15만원 달성 (API 발급 조건)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        쿠팡 공식 정책상 파트너스 가입 후 <strong>누적 판매금액 150,000원(판매액 기준)을 달성</strong>하면 API 키 발급 메뉴가 자동으로 활성화됩니다.
      </p>
      <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
        💡 <strong>초보자 팁:</strong> 15만원 달성 전에는 쿠팡 파트너스 웹사이트에서 직접 링크를 복사해 프로그램에 입력하는 '수동 딥링크 모드'로 시작하시면 빠르게 매출 조건을 달성하실 수 있습니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">Open API 키 생성 (Access Key & Secret Key)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        상단 메뉴의 <strong>추가기능 → [API 키 발급]</strong>으로 이동한 후 <strong>[API 키 생성]</strong> 버튼을 클릭합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
        <div>🔑 <strong>생성되는 2가지 키:</strong></div>
        <ul class="list-disc list-inside text-subtext space-y-1 pl-1">
          <li><strong>Access Key:</strong> 오픈 API 공개 식별 키</li>
          <li><strong>Secret Key:</strong> 서명 생성용 비밀 키 (유출 주의)</li>
        </ul>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 플랫폼에 키 등록 완료</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면으로 이동하여 <strong>"쿠팡 파트너스"</strong> 항목에 Access Key와 Secret Key를 각각 붙여넣고 저장합니다. 이제 쇼핑 자동화 솔루션에서 원클릭으로 제휴 상품 포스팅이 가능합니다!
      </p>
    </div>
  </div>

  <!-- 공정위 필수 문구 안내 배너 -->
  <div class="p-5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 space-y-1.5">
    <div class="font-bold text-amber-300 flex items-center gap-1.5">
      <span>⚖️</span>
      <span>공정거래위원회 경제적 이해관계 표시 필수 안내:</span>
    </div>
    <div class="leading-relaxed">
      쿠팡 제휴 링크가 포함된 글이나 캡션을 게시할 때는 반드시 <em>"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."</em> 문구를 명시해야 계정이 정지되지 않습니다. (AIMaster 자동 포스팅 프로그램은 이 문구를 본문 하단에 자동으로 삽입해 드립니다.)
    </div>
  </div>
</div>
`;

// 2. 카카오 플랫폼 연동
const kakaoContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-2">
      <span>💬</span>
      <span>카카오 플랫폼 (Kakao Developers) 계정 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      카카오 연동은 AIMaster의 <strong>카카오톡 나에게 보내기(발행 완료 알림·일일 리포트 수신), 카카오스토리 자동화, 카카오톡 메시지 공유</strong>에 사용되는 공식 개발자 API입니다. 카카오 계정만 있으면 누구나 무료로 앱을 생성하여 연동할 수 있습니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Kakao Developers 로그인 및 앱 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.kakao.com" target="_blank" class="text-yellow-300 font-semibold underline underline-offset-4 hover:text-yellow-200">developers.kakao.com</a>에 카카오 계정으로 로그인합니다.<br/>
        상단 메뉴의 <strong>[내 애플리케이션] → [+ 애플리케이션 추가하기]</strong>를 클릭하고, 앱 이름(예: <code>AIMaster-알림</code>)과 사업자명을 입력하여 앱을 생성합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">앱 키(REST API 키) 확인 및 복사</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        생성된 애플리케이션의 <strong>[앱 설정] → [요약 정보]</strong> 화면에서 <strong>REST API 키</strong>를 확인하고 복사합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">카카오 로그인 활성화 & Redirect URI 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴 <strong>[제품 설정] → [카카오 로그인]</strong>으로 이동하여 상태를 <strong>활성화(ON)</strong>로 켭니다.<br/>
        하단의 <strong>[Redirect URI 등록]</strong> 버튼을 누르고 <code>https://www.buylife.xyz/api/auth/callback/kakao</code>를 입력한 뒤 저장합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-xs text-yellow-200">
        💡 <strong>팁:</strong> Redirect URI가 정확하게 일치해야 토큰 발급 및 나에게 보내기 기능이 정상 동작합니다.
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">동의항목 설정(메시지 전송) 및 AIMaster 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴 <strong>[카카오 로그인] → [동의항목]</strong>으로 이동합니다.<br/>
        <strong>"카카오톡 메시지 전송(나에게 보내기)"</strong> 항목의 [설정]을 눌러 <strong>"이용 중 동의"</strong>로 변경합니다.<br/>
        이제 AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면에서 REST API 키를 입력하고 카카오 계정을 연결하면 모든 세팅이 완료됩니다!
      </p>
    </div>
  </div>

  <!-- 나에게 보내기 알림 활용 팁 배너 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-yellow-300 flex items-center gap-1.5">
      <span>🔔</span>
      <span>카카오톡 나에게 보내기 알림 활용 팁:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      연동을 완료해 두시면 인스타그램·쓰레드·네이버 카페 등의 자동 예약 발행이 성공했을 때 본인 카카오톡으로 실시간 확인 알림을 즉시 받아보실 수 있습니다.
    </div>
  </div>
</div>
`;

// 3. 알리익스프레스 어필리에이트 API
const aliexpressContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-orange-400 font-bold text-sm mb-2">
      <span>📦</span>
      <span>알리익스프레스(AliExpress Portals) API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      알리익스프레스 어필리에이트 API는 AIMaster의 <strong>글로벌 직구 핫딜 상품 검색, 가성비 아이템 최저가 크롤링, 본인 고유의 수익 추적 제휴 링크(Tracking ID) 자동 변환</strong>에 사용되는 공식 글로벌 API입니다. 전 세계 직구 상품에 대한 제휴 수수료를 달러(USD)로 정산받을 수 있습니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">AliExpress Portals 어필리에이트 가입</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://portals.aliexpress.com" target="_blank" class="text-orange-300 font-semibold underline underline-offset-4 hover:text-orange-200">portals.aliexpress.com</a>에 접속하여 어필리에이트 계정으로 가입하거나 기존 알리익스프레스 계정으로 로그인합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">API 사용 신청서 제출 (Tools → API)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴의 <strong>Tools → [API]</strong>로 이동하여 <strong>[Apply Now]</strong> 버튼을 클릭합니다.<br/>
        신청 양식(이름, 이메일, 홍보할 웹사이트/SNS URL, 사용 목적 등)을 작성하여 제출합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200">
        💡 <strong>팁:</strong> 사용 목적에는 <em>"Personal affiliate automation website for product promotion"</em>처럼 간단한 영문 설명을 적어주시면 원활하게 승인됩니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">AppKey, AppSecret 및 Tracking ID 발급 확인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        심사 승인 후 <strong>Tools → API</strong> 페이지에서 생성된 <strong>AppKey</strong>와 <strong>AppSecret</strong>을 확인합니다.<br/>
        또한 <strong>Ad Center → [Tracking ID]</strong>에서 본인 고유의 추적 ID(예: <code>aimaster_channel</code>)를 생성하거나 기본값을 확인합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 플랫폼에 키 등록 완료</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면으로 이동하여 <strong>"알리익스프레스"</strong> 칸에 AppKey, AppSecret, Tracking ID 3종을 입력하고 저장하면 글로벌 제휴 자동화 연동이 완료됩니다!
      </p>
    </div>
  </div>

  <!-- 심사 소요시간 안내 배너 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-orange-300 flex items-center gap-1.5">
      <span>⏳</span>
      <span>API 심사 소요 시간 안내:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      알리익스프레스 글로벌 본사 정책상 API 사용 신청 후 최종 승인까지 통상 영업일 기준 약 1~3일이 소요될 수 있습니다. 승인 메일을 받으신 후 키를 등록해 주시면 됩니다.
    </div>
  </div>
</div>
`;

async function updatePhase3() {
  console.log('=== Service Role 기반 Phase 3 (쿠팡·카카오·알리) 가이드 DB 업데이트 시작 ===');

  const updates = [
    { id: '117ffedb-c554-458a-9b92-e9ed6ee33988', title: '쿠팡 파트너스', content: coupangContent },
    { id: '4042a4b3-e573-4baa-8f70-103f52b1cbbd', title: '카카오 플랫폼', content: kakaoContent },
    { id: '0eb4180e-a076-4ee6-b75e-6b3c3c9ec442', title: '알리익스프레스', content: aliexpressContent },
  ];

  for (const item of updates) {
    const { data, error } = await supabase
      .from('platform_guides')
      .update({ content: item.content })
      .eq('id', item.id)
      .select('id, title');

    if (error) {
      console.error(`❌ [${item.title}] 업데이트 실패:`, error);
    } else {
      console.log(`✅ [${item.title}] 업데이트 성공 (반영된 행: ${data.length}개)`);
    }
  }

  console.log('🎉 Phase 3 가이드 3종 DB 업데이트 완료!');
}

updatePhase3();
