const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. 인스타그램 계정 연동하기 (자동포스팅)
const instaPostingContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-pink-400 font-bold text-sm mb-2">
      <span>📸</span>
      <span>인스타그램 자동포스팅 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      INSTA 포스팅 자동화, 카드뉴스 스튜디오 등에서 피드 및 캐러셀 이미지를 <strong>클릭 한 번으로 인스타그램에 자동 발행</strong>하기 위한 공식 Meta Graph API 연동 가이드입니다. <strong>본인 인스타그램 계정과 페이스북 페이지를 연결</strong>하여 100% 무료로 영구 사용하실 수 있습니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 5분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-amber-300">중급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">💳 비용: <strong class="text-emerald-400">100% 무료</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🔑 필수: <strong class="text-pink-300">프로페셔널 계정</strong></div>
    </div>
  </div>

  <!-- 연동 방식 2가지 비교 배너 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <div class="text-xs font-bold text-blue-300 mb-1">권장 경로 A. Facebook 페이지 연동 (가장 안정적)</div>
      <p class="text-xs text-white/70 leading-relaxed">인스타 계정과 연동된 페이스북 비즈니스 페이지를 통해 로그인합니다. Meta 공식 표준 방식으로 게시 성공률이 가장 높고 장기 토큰이 안정적입니다.</p>
    </div>
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <div class="text-xs font-bold text-emerald-300 mb-1">대안 경로 B. Instagram 직접 로그인 (초간편)</div>
      <p class="text-xs text-white/70 leading-relaxed">페이스북 페이지 없이 인스타그램 계정만으로 즉시 연동합니다. Meta 대시보드 내 "Instagram 앱 ID"를 활용하여 1분 만에 연결됩니다.</p>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-pink-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">인스타그램 프로페셔널 계정 전환 및 페이스북 페이지 연결</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        인스타그램 모바일 앱에서 <strong>프로필 → 우측 상단 메뉴(≡) → 설정 및 개인정보 → 계정 유형 및 도구</strong>로 이동하여 <strong>"프로페셔널(비즈니스 또는 크리에이터) 계정으로 전환"</strong>합니다. (무료 전환)
      </p>
      <div class="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-200">
        💡 <strong>페이스북 페이지 연결 팁:</strong> 인스타 앱 [프로필 편집] → [공개 비즈니스 정보] → [페이지]에서 새로운 페이스북 페이지를 하나 생성하거나 기존 페이지와 연결해 주세요.
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-pink-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">Meta for Developers에서 비즈니스 앱 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.facebook.com/apps" target="_blank" class="text-pink-400 font-semibold underline underline-offset-4 hover:text-pink-300">developers.facebook.com/apps</a>에 접속하여 <strong>[앱 만들기]</strong>를 누르고, 앱 유형으로 <strong>"비즈니스"</strong>를 선택합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1">
        <div>📌 <strong>앱 표시 이름:</strong> 본인이 식별하기 쉬운 이름 (예: <span class="font-mono text-pink-300">MyInstaPoster</span>) 입력</div>
        <div>📌 <strong>앱 목적:</strong> "자신 또는 내 비즈니스" 선택 후 완료</div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-pink-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">리디렉션 URI 등록 (콜백 주소 설정)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴 <strong>[앱 설정] → [기본 설정]</strong> 하단의 [플랫폼 추가]에서 <strong>"웹사이트"</strong>를 선택하고 사이트 URL에 <code class="text-pink-300 font-mono">https://buylife.xyz</code>를 입력합니다. 그다음 <strong>Facebook 로그인/Instagram 로그인 설정</strong>의 <strong>"유효한 OAuth 리디렉션 URI"</strong>에 아래 2개 주소를 복사하여 붙여넣고 저장합니다.
      </p>
      <div class="space-y-2 mb-3">
        <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-pink-300 select-all break-all">
          https://auto-instagram-posting.buylife.xyz/api/instagram/callback
        </div>
        <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-pink-300 select-all break-all">
          https://auto-instagram-posting.buylife.xyz/api/instagram/callback/byok
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
        ⚠️ <strong>주의:</strong> 리디렉션 URI 끝에 슬래시(/)가 들어가거나 오타가 있으면 로그인 시 "리디렉션 URI 불일치" 오류가 발생합니다. 위 주소를 그대로 복사해 주세요.
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-pink-500 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 설정에 앱 ID / 시크릿 등록 및 원클릭 연동</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        Meta 앱 대시보드의 <strong>앱 ID</strong>와 <strong>앱 시크릿 코드</strong>를 복사하여, INSTA 포스팅 자동화의 <strong>[API등록·플랫폼연동]</strong> 화면에 입력 후 저장합니다. 그 후 <strong>[Facebook 방식으로 연결하기]</strong> 또는 <strong>[Instagram 직접 로그인]</strong> 버튼을 누르면 권한 동의 창이 뜨며 즉시 연동이 완료됩니다!
      </p>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        🎉 <strong>완료:</strong> 연동이 완료되면 60일 유효한 장기 사용자 토큰이 발급되며, 만료 전 시스템이 자동으로 갱신해 드립니다.
      </div>
    </div>
  </div>

  <!-- 자주 막히는 곳 (트러블슈팅) -->
  <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
    <div class="text-amber-400 font-bold text-sm flex items-center gap-2">
      <span>💡</span>
      <span>자주 막히는 곳 & 해결법</span>
    </div>
    <div class="text-xs text-white/80 space-y-2">
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <strong class="text-pink-300">Q. "연결된 Instagram 비즈니스 계정을 찾을 수 없습니다" 오류가 떠요.</strong>
        <p class="text-subtext mt-1">인스타그램 계정이 '개인 계정'이거나 페이스북 페이지와 올바르게 연결되지 않은 상태입니다. 인스타 앱 프로필 편집에서 '페이지' 연결 상태를 다시 확인해 주세요.</p>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <strong class="text-pink-300">Q. "Invalid platform app" 오류가 발생해요.</strong>
        <p class="text-subtext mt-1">Instagram 직접 로그인 방식(경로 B)을 사용하실 때는 Meta 대시보드 맨 위의 일반 앱 ID가 아닌, 'Instagram 앱 설정'에 표시된 전용 Instagram 앱 ID를 입력하셔야 합니다.</p>
      </div>
    </div>
  </div>
</div>
`;

// 2. 인스타그램 계정 연동하기 (댓글·DM 자동화)
const instaDmContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
      <span>💬</span>
      <span>인스타그램 댓글·DM 자동화 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      내 피드나 릴스에 <strong>특정 키워드(예: "링크", "자료") 댓글이 달리면 1초 만에 자동으로 맞춤 답글을 달고 다이렉트 메시지(DM)로 링크를 발송</strong>하는 인터랙티브 자동화 연동 가이드입니다. Meta 공식 Webhooks와 Instagram Messaging API를 활용합니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 5분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-amber-300">중급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⚡ 반응속도: <strong class="text-emerald-400">1초 즉시 발송</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🛡️ 보안: <strong class="text-purple-300">Meta 공식 인증</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">인스타그램 모바일 앱에서 "메시지 연결 도구" 활성화</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        인스타그램 모바일 앱에서 외부 봇이 메시지를 수신/발송할 수 있도록 권한을 열어주어야 합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1">
        <div>1. 인스타그램 앱 → <strong>설정 및 개인정보</strong> 접속</div>
        <div>2. <strong>메시지 및 스토리 답장</strong> 메뉴 선택</div>
        <div>3. <strong>메시지 연결 도구</strong>로 들어가 <strong>"메시지 접근 허용"</strong> 토글을 켭니다.</div>
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">Meta 개발자 센터에서 Webhooks 제품 추가</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.facebook.com/apps" target="_blank" class="text-purple-400 font-semibold underline underline-offset-4 hover:text-purple-300">developers.facebook.com/apps</a>의 본인 앱 대시보드 좌측 메뉴에서 <strong>[제품 추가]</strong>를 누르고 <strong>Webhooks</strong>를 선택합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
        <div>📌 드롭다운에서 <strong>"Instagram"</strong>을 선택한 후 [이 객체 구독]을 누릅니다.</div>
        <div>📌 콜백 URL과 검증 토큰(Verify Token)을 입력하는 창이 열립니다.</div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">Webhook 콜백 주소 및 검증 토큰 입력</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 실시간 댓글/DM 수신용 Webhook 주소와 검증 토큰을 복사하여 Meta 창에 붙여넣고 [확인 및 저장]을 누릅니다.
      </p>
      <div class="space-y-2 mb-3">
        <div>
          <span class="text-xs text-subtext block mb-1">콜백 URL (Callback URL):</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-purple-300 select-all break-all">
            https://www.buylife.xyz/api/webhooks/instagram
          </div>
        </div>
        <div>
          <span class="text-xs text-subtext block mb-1">검증 토큰 (Verify Token):</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-emerald-300 select-all">
            aimaster_insta_webhook_secure
          </div>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
        💡 <strong>필드 구독:</strong> 저장이 완료되면 필드 목록에서 <strong>comments(댓글)</strong>와 <strong>messages(메시지)</strong> 항목을 찾아 [구독(Subscribe)]을 클릭해 주세요.
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 인스타 DM 자동화 프로그램에서 키워드 규칙 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        이제 AIMaster 인스타 DM 자동화 프로그램 대시보드로 돌아와 <strong>[자동응답 규칙 추가]</strong>를 누르고, 감지할 댓글 키워드(예: "신청", "PDF")와 자동 발송할 DM 내용(구매 링크, 다운로드 링크 등)을 등록하시면 모든 세팅이 완료됩니다!
      </p>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        🎉 <strong>작동 확인:</strong> 본인 인스타그램 게시물에 다른 계정으로 키워드 댓글을 남겨보시면 1초 만에 공개 답글과 함께 개인 DM이 발송되는 것을 확인하실 수 있습니다.
      </div>
    </div>
  </div>

  <!-- 자주 막히는 곳 -->
  <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
    <div class="text-amber-400 font-bold text-sm flex items-center gap-2">
      <span>💡</span>
      <span>자주 막히는 곳 & 해결법</span>
    </div>
    <div class="text-xs text-white/80 space-y-2">
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <strong class="text-purple-300">Q. 댓글은 달리는데 DM이 자동으로 발송되지 않아요.</strong>
        <p class="text-subtext mt-1">인스타그램 앱 설정에서 1단계의 "메시지 접근 허용"이 꺼져 있거나, Meta 개발자 센터가 [개발 중(Development)] 모드인 경우 앱 관리자/테스터로 등록된 계정에게만 DM이 전송됩니다. Meta 앱을 [라이브(Live)]로 전환하거나 테스터로 계정을 등록해 주세요.</p>
      </div>
    </div>
  </div>
</div>
`;

// 3. 쓰레드(Threads) 계정 연동하기
const threadsAccountContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
      <span>🧵</span>
      <span>쓰레드(Threads) 계정 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      쓰레드 포스팅 자동화, 쓰레드 쇼핑제휴, 쓰레드 콘텐츠 운영 프로그램에서 <strong>작성한 원고와 이미지를 Threads 계정에 원클릭 및 예약 자동 게시</strong>하기 위한 Meta 공식 API 연동 가이드입니다. 본인 Threads 계정으로 100% 무료 연동이 가능합니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 3분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-emerald-400">초급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🔄 토큰 수명: <strong class="text-blue-300">60일 자동 갱신</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">💳 비용: <strong class="text-emerald-400">100% 무료</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Meta for Developers에서 앱 만들기</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.facebook.com/apps" target="_blank" class="text-amber-300 font-semibold underline underline-offset-4 hover:text-amber-200">developers.facebook.com/apps</a>에 접속하여 <strong>[앱 만들기]</strong>를 클릭합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1">
        <div>📌 <strong>사용 사례 선택:</strong> "기타" 선택 후 [다음] 클릭</div>
        <div>📌 <strong>앱 유형:</strong> "비즈니스" 선택 후 앱 이름(예: <span class="font-mono text-amber-300">MyThreadsApp</span>) 입력</div>
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">Threads API 제품 추가 및 리디렉션 URI 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        앱 대시보드 좌측 <strong>[제품 추가]</strong>에서 <strong>"Threads"</strong>를 찾아 [설정]을 누릅니다. 그 후 Threads 설정 페이지의 <strong>"유효한 OAuth 리디렉션 URI"</strong>에 아래 주소를 복사하여 붙여넣고 저장합니다.
      </p>
      <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-amber-300 select-all break-all mb-3">
        https://auto-threads-posting.buylife.xyz/api/threads/callback
      </div>
      <div class="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200">
        💡 <strong>다른 쓰레드 프로그램 사용 시:</strong> 쇼핑제휴는 <code class="text-white font-mono">https://threads-affiliate-poster.buylife.xyz/api/threads/callback</code>, 콘텐츠운영은 <code class="text-white font-mono">https://threads-content-ops.buylife.xyz/api/threads/callback</code>를 추가로 등록해 주시면 하나의 메타 앱으로 모든 프로그램을 쓰실 수 있습니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">Threads 테스터 계정 등록 및 승인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        앱이 개발 모드일 때 본인 쓰레드 계정으로 발행하려면 테스터 등록이 필요합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
        <div>1. Meta 대시보드 좌측 <strong>[역할] → [역할]</strong> 메뉴로 이동</div>
        <div>2. <strong>Threads 테스터</strong> 섹션에서 [Threads 테스터 추가] 클릭 후 본인 Threads 아이디 검색 및 추가</div>
        <div>3. PC 브라우저로 <a href="https://www.threads.net/settings/privacy" target="_blank" class="text-amber-300 underline">threads.net/settings/privacy</a> 접속 → [웹사이트 권한] → [초대]에서 초대 <strong>[수락]</strong> 클릭</div>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 프로그램에서 원클릭 계정 연동</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        Threads 설정 하단에 표시된 <strong>Threads 앱 ID</strong>와 <strong>Threads 앱 시크릿 코드</strong>를 복사하여 AIMaster 쓰레드 프로그램 설정에 넣고 <strong>[Threads 계정 연결하기]</strong>를 누르면 팝업창에서 권한 승인 후 즉시 연동 완료됩니다!
      </p>
      <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
        ⚠️ <strong>핵심 주의 (4476002 에러 방지):</strong> Meta 화면 맨 위에 있는 일반 앱 ID가 아니라, <strong>좌측 메뉴 [Threads] → [설정] 화면에 나오는 'Threads 앱 ID'</strong>를 넣으셔야 정상 연결됩니다.
      </div>
    </div>
  </div>
</div>
`;

// 4. 쓰레드 댓글자동화 - 메타 앱 만들기
const threadsReplyAppContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-2">
      <span>💬</span>
      <span>쓰레드 댓글자동화 메타 앱 구축 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      쓰레드 게시물에 달리는 <strong>방문자들의 댓글에 AI가 24시간 실시간 맞춤 답글을 작성</strong>해 주는 자동 답글 파이프라인 구축 가이드입니다. Threads Webhook 실시간 이벤트 수신과 <code class="text-cyan-300 font-mono">threads_manage_replies</code> 권한을 활용합니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 5분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-amber-300">중급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🤖 엔진: <strong class="text-cyan-300">Gemini/Claude AI</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🛡️ 보안: <strong class="text-emerald-400">Meta Webhooks</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Meta 개발자 센터에서 Threads 비즈니스 앱 구성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.facebook.com/apps" target="_blank" class="text-cyan-300 font-semibold underline underline-offset-4 hover:text-cyan-200">developers.facebook.com/apps</a>에서 앱 만들기 → 비즈니스 유형을 선택하고, 제품에서 <strong>Threads</strong>를 추가합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80">
        💡 이미 쓰레드 자동포스팅용으로 만든 앱이 있다면, 새 앱을 만들지 않고 기존 앱에 Webhook 설정을 추가하여 그대로 재사용하실 수 있습니다.
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">Webhooks 제품 추가 및 실시간 댓글 필드 구독</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴 [제품 추가]에서 <strong>Webhooks</strong>를 추가하고, 객체 드롭다운에서 <strong>"Threads"</strong>를 선택한 뒤 [이 객체 구독]을 누릅니다.
      </p>
      <div class="space-y-2 mb-3">
        <div>
          <span class="text-xs text-subtext block mb-1">콜백 URL (Callback URL):</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-cyan-300 select-all break-all">
            https://www.buylife.xyz/api/webhooks/threads
          </div>
        </div>
        <div>
          <span class="text-xs text-subtext block mb-1">확인 토큰 (Verify Token):</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-emerald-300 select-all">
            aimaster_threads_webhook_secure
          </div>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-xs text-cyan-200">
        📌 <strong>필드 구독:</strong> 저장 후 필드 테이블에서 <strong>threads_reply</strong> 필드를 찾아 [구독(Subscribe)]을 클릭합니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">필수 권한 활성화 및 계정 연결</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        Threads API 설정에서 댓글 읽기 및 답글 작성을 위한 권한(<code class="text-cyan-300 font-mono">threads_manage_replies</code>, <code class="text-cyan-300 font-mono">threads_read_replies</code>)이 포함되어 있는지 확인하고, AIMaster 프로그램 설정에서 Threads 계정을 연결합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AI 프롬프트 톤앤매너 및 안전 딜레이 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        프로그램 대시보드에서 AI 답글 어투(친근한 어조, 전문가 톤, 유머러스 등)를 지정하고, Meta 알고리즘의 도배 방지 안전 규정에 맞춰 <strong>"30~60초 랜덤 지연 발송"</strong> 옵션을 켜두시면 완벽한 자동 소통 파이프라인이 완성됩니다!
      </p>
    </div>
  </div>
</div>
`;

// 5. 쓰레드(Threads) 공개 글 검색 권한 받기 — Meta 비즈니스 앱 승인 절차
const threadsSearchApprovalContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
      <span>🔍</span>
      <span>쓰레드 공개 글 검색 권한(threads_keyword_search) 승인 가이드</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      쓰레드 쇼핑제휴 및 트렌드 탐지기에서 <strong>다른 사람의 공개 글과 실시간 바이럴 떡상 콘텐츠를 검색</strong>하기 위해 Meta 본사의 공식 승인을 받는 단계별 절차 가이드입니다. <strong>실제 통과된 영문 사유서와 시연 동영상 양식</strong>을 그대로 제공합니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 심사 소요: <strong class="text-white">약 3~7일</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-rose-400">고급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">📄 준비물: <strong class="text-indigo-300">사업자등록증</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">✅ 혜택: <strong class="text-emerald-400">전체 공개글 검색</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">권한 추가 및 테스트 API 호출 1회 실행</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        Meta 개발자 센터 앱 대시보드 <strong>[사용 사례] → [Threads API] → [권한 및 기능]</strong>에서 <code class="text-indigo-300 font-mono">threads_keyword_search</code> 권한 줄의 [앱 검수에 추가]를 누릅니다.
      </p>
      <div class="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
        💡 <strong>필수 사전 조건:</strong> Meta 심사관은 앱 검수 제출 전 해당 권한으로 실제 API 호출이 1회 이상 발생했는지를 검사합니다. AIMaster 트렌드 탐지기 화면에서 본인 계정으로 아무 단어나 <strong>검색을 1회 실행</strong>하여 "API 호출: 1" 상태를 만드세요.
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">비즈니스 인증 (사업자등록증 제출)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://business.facebook.com" target="_blank" class="text-indigo-300 font-semibold underline underline-offset-4 hover:text-indigo-200">business.facebook.com</a> → <strong>비즈니스 설정 → 보안 센터</strong>로 이동하여 비즈니스 인증을 진행합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
        <div>⚠️ <strong>상호 및 주소 일치 필수:</strong> 입력하는 법적 상호와 도로명 주소, 전화번호는 사업자등록증 및 웹사이트 푸터 정보와 글자 토씨 하나까지 일치해야 반려되지 않습니다.</div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">데이터 처리 및 보안 정책 답변 작성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        [검수] → [액세스 인증] 및 데이터 보호 질문에서 아래 모범 답안을 그대로 선택합니다:
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5 font-sans">
        <div>• <strong>데이터 접근 서비스 제공업체:</strong> "예" 선택 → <code class="text-indigo-300">Supabase (Database), Vercel (Cloud Hosting)</code> 입력</div>
        <div>• <strong>데이터 책임 주체:</strong> 사업자등록증 상의 정식 상호명 입력</div>
        <div>• <strong>국가안보 목적 공공기관 제공 이력:</strong> "아니요" 선택</div>
        <div>• <strong>요청에 대한 정책:</strong> "적법성 검토", "필요 최소한만 제공", "문서화" 체크</div>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">영문 사용 설명서 및 시연 영상 제출</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        [앱 검수] → <code class="text-indigo-300">threads_keyword_search</code> 요청서의 <strong>"사용 방법 설명(영문)"</strong> 칸에 아래 문장을 복사하여 붙여넣습니다:
      </p>
      <div class="p-3.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-indigo-300 select-all whitespace-pre-line mb-3">
Our app helps a Threads creator plan posts for products they promote. On the "Trends" page, the signed-in user types a keyword and we call the Threads keyword search endpoint with the user's own access token to show recent and top public posts about that topic. Each result shows the post text, author username, time and a link to the original post on Threads. The user can bookmark a post as a reference and then write their own new post with AI assistance, referencing the style of the saved post. We do not republish or modify other people's posts and do not store engagement metrics. Search results are shown only to the user who searched and are never shared, sold, or used for advertising. Saved references and the access token are deleted when the user disconnects, removes the app, or requests data deletion (https://www.buylife.xyz/data-deletion).
      </div>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        🎥 <strong>시연 영상 팁:</strong> 1분 안팎으로 [로그인] → [트렌드 검색] → [원문 보기] 과정을 화면 녹화하여 업로드하고 제출하시면 심사가 완료됩니다!
      </div>
    </div>
  </div>
</div>
`;

// 6. 숏츠 자동포스팅 - 인스타그램 릴스 연동 (메타 앱 만들기)
const shortsReelsContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2">
      <span>🎬</span>
      <span>숏츠-릴스 동시 자동발행 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      쇼츠 자동제작기에서 완성된 <strong>9:16 세로형 숏폼 비디오를 유튜브 쇼츠뿐만 아니라 인스타그램 릴스(Reels)로도 동시에 원클릭 자동 발행</strong>하기 위한 메타 비디오 컨테이너 API 연동 가이드입니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 4분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 규격: <strong class="text-rose-300">9:16 (1080x1920)</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🚀 연동효과: <strong class="text-emerald-400">조회수 2배 확장</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">💳 비용: <strong class="text-emerald-400">100% 무료</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Meta for Developers에서 비즈니스 앱 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.facebook.com/apps" target="_blank" class="text-rose-400 font-semibold underline underline-offset-4 hover:text-rose-300">developers.facebook.com/apps</a>에 로그인하여 [앱 만들기] → [비즈니스] 유형을 선택하고 앱을 생성합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">Instagram Graph API 추가 및 릴스 발행 권한 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        대시보드 좌측에서 <strong>Instagram Graph API</strong> 제품을 추가하고, 릴스 비디오 업로드에 필요한 필수 권한(<code class="text-rose-300 font-mono">instagram_content_publish</code>, <code class="text-rose-300 font-mono">instagram_basic</code>)이 활성화되어 있는지 확인합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">리디렉션 URI 등록 (숏츠 자동발행 전용 콜백)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        Facebook 로그인 설정의 "유효한 OAuth 리디렉션 URI"에 아래 주소를 복사하여 붙여넣고 저장합니다:
      </p>
      <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-rose-300 select-all break-all mb-3">
        https://auto-shorts-poster.buylife.xyz/api/instagram/callback
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 숏츠 프로그램에서 릴스 발행 스위치 ON</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster 숏츠 자동제작기 설정에서 Instagram 계정을 연결하고, <strong>"제작 완료 시 릴스 동시 발행"</strong> 체크박스를 켜두시면 렌더링된 쇼츠 영상이 인스타그램 릴스로도 즉시 업로드됩니다!
      </p>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        💡 <strong>비디오 인코딩 팁:</strong> 인스타그램 릴스는 동영상 업로드 후 Meta 서버에서 트랜스코딩을 거치므로, 발행 요청 후 1~2분 뒤 인스타그램 피드에 최종 게시됩니다.
      </div>
    </div>
  </div>
</div>
`;

// 7. 유튜브 채널 연동하기
const youtubeChannelContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-red-500 font-bold text-sm mb-2">
      <span>▶️</span>
      <span>유튜브(YouTube) 채널 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      쇼츠 떡상 분석기, 유튜브 쇼츠 자동 업로더, 채널 컨설턴트 등에서 <strong>본인 유튜브 채널의 동영상을 자동 업로드하고 통계 지표를 실시간 분석</strong>하기 위한 Google Cloud 공식 OAuth 2.0 연동 가이드입니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 4분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-amber-300">중급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">📊 할당량: <strong class="text-emerald-400">매일 10,000 유닛 무료</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🔐 보안: <strong class="text-red-400">Google OAuth 2.0</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-red-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Google Cloud Console 접속 및 YouTube Data API 활성화</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://console.cloud.google.com" target="_blank" class="text-red-400 font-semibold underline underline-offset-4 hover:text-red-300">console.cloud.google.com</a>에 접속하여 새 프로젝트를 만들고, <strong>[API 및 서비스] → [라이브러리]</strong>에서 <strong>"YouTube Data API v3"</strong>를 검색하여 <strong>[사용]</strong>을 클릭합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-red-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">OAuth 동의 화면 구성 (User Type: 외부)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 <strong>[OAuth 동의 화면]</strong>으로 이동하여 User Type으로 <strong>"외부(External)"</strong>를 선택하고 [만들기]를 누릅니다. 앱 이름(예: <span class="font-mono text-red-300">MyYouTubeBot</span>)과 이메일을 입력한 후 저장합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">
        💡 <strong>테스트 사용자 등록 필수:</strong> [테스트 사용자] 단계에서 본인 유튜브 채널의 구글 계정 이메일을 반드시 추가해 주세요. 앱을 외부에 공개 심사받지 않고도 본인 채널은 100% 무료로 자유롭게 연동하실 수 있습니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-red-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">OAuth 클라이언트 ID 생성 및 리디렉션 URI 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 <strong>[사용자 인증 정보] → [+ 사용자 인증 정보 만들기] → [OAuth 클라이언트 ID]</strong>를 클릭합니다. 애플리케이션 유형으로 <strong>"웹 애플리케이션"</strong>을 선택하고, <strong>"승인된 리디렉션 URI"</strong>에 아래 주소를 입력합니다:
      </p>
      <div class="space-y-2 mb-3">
        <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-red-300 select-all break-all">
          https://www.buylife.xyz/api/auth/callback/google
        </div>
        <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-red-300 select-all break-all">
          https://shorts-auto-poster.buylife.xyz/api/auth/callback/google
        </div>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-red-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 설정에서 유튜브 채널 원클릭 로그인 승인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        생성된 <strong>클라이언트 ID</strong>와 <strong>클라이언트 보안 비밀번호</strong>를 복사하여 AIMaster 프로그램 설정에 넣고 <strong>[Google로 유튜브 채널 연동]</strong>을 누르면 구글 로그인 창이 뜹니다.
      </p>
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
        ⚠️ <strong>"Google에서 확인하지 않은 앱" 경고가 뜨는 경우:</strong> 좌측 하단의 <strong>[고급] → [MyYouTubeBot(으)로 이동(안전하지 않음)]</strong>을 클릭하여 권한을 허용하시면 정상적으로 연동이 완료됩니다. (본인 전용 앱이므로 안전합니다)
      </div>
    </div>
  </div>
</div>
`;

async function updateGuides() {
  const updates = [
    { id: '6cdae259-b9d2-45ae-9c21-e5f498f78956', content: instaPostingContent },
    { id: '4115e455-1585-4304-89b4-d29859fd7a5a', content: instaDmContent },
    { id: '343996d3-8c77-455d-9bd4-54bcd47a34cd', content: threadsAccountContent },
    { id: '0f5cd337-1231-48c0-a9a1-63297686a97e', content: threadsReplyAppContent },
    { id: 'ae85d991-d907-4349-809e-818a6b3a2f54', content: threadsSearchApprovalContent },
    { id: 'c3ed7fe3-00d8-466b-b4ce-9c115accb273', content: shortsReelsContent },
    { id: '1c4181ac-a8c4-4b11-80f4-b29f3318c39b', content: youtubeChannelContent }
  ];

  console.log('총 7개 Meta & SNS 가이드 본문 업데이트 시작...');
  for (const item of updates) {
    const { data, error } = await supabase
      .from('platform_guides')
      .update({ content: item.content, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select('id, title');

    if (error) {
      console.error(`- 업데이트 실패 [${item.id}]:`, error);
    } else {
      console.log(`- 업데이트 성공: [${data[0]?.title}] (${item.id})`);
    }
  }
  console.log('7개 가이드 본문 업데이트 완료!');
}

updateGuides();
