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

// 1. OpenAI
const openaiContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
      <span>🤖</span>
      <span>OpenAI ChatGPT API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      OpenAI API 키는 AIMaster의 <strong>AI 원고 생성, 자동 번역, 챗봇 대화, 페르소나 카피라이팅</strong> 등 핵심 생성 엔진에 사용됩니다. ChatGPT Plus(월 20달러 구독)와는 별개의 개발자용 종량제 API이므로, <strong>본인 명의의 API 키를 발급받아 충전한 만큼만 합리적으로 사용</strong>하실 수 있습니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">OpenAI 플랫폼 회원가입 및 로그인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://platform.openai.com" target="_blank" class="text-amber-300 font-semibold underline underline-offset-4 hover:text-amber-200">platform.openai.com</a>에 접속하여 Google 계정 또는 이메일로 로그인합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200">
        💡 <strong>팁:</strong> 일반 ChatGPT(chatgpt.com) 계정과 동일한 계정으로 로그인하시면 연동 관리가 수월합니다.
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">결제 수단 등록 및 Tier 1 한도 확보 (필수)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴의 <strong>Settings → Billing</strong>(결제)으로 이동하여 신용카드 또는 해외결제 카드를 등록하고 최소 5달러 이상 크레딧을 선충전합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
        <div>💳 <strong>자동 충전(Auto-recharge) 설정 권장:</strong></div>
        <div class="text-subtext">"잔여 크레딧이 5달러 미만일 때 10달러 자동 충전" 및 "월 최대 30달러 한도"를 설정해 두시면 서비스 중단 없이 안전하게 자동 제어됩니다.</div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">비밀 API 키(Secret Key) 생성 및 복사</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴의 <strong>API Keys</strong>로 이동한 후 <strong>[+ Create new secret key]</strong> 버튼을 클릭합니다. 이름(예: <code>AIMaster-Key</code>)을 입력하고 키를 생성합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
        ⚠️ <strong>주의:</strong> 생성된 키(<code>sk-proj-...</code>)는 화면에 단 1회만 표시됩니다. 창을 닫기 전에 반드시 <strong>[Copy]</strong> 버튼을 눌러 복사해 두세요!
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 플랫폼에 키 등록 완료</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster 상단 메뉴의 <strong>[API키등록·플랫폼연동]</strong> 화면으로 이동하여 OpenAI 칸에 복사한 키를 붙여넣고 <strong>[저장하기]</strong>를 클릭하면 모든 연동이 완료됩니다!
      </p>
    </div>
  </div>

  <!-- 이미지 생성 GPT Image 1 추가 안내 -->
  <div class="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 space-y-1.5">
    <div class="font-bold text-cyan-300 flex items-center gap-1.5">
      <span>🖼️</span>
      <span>DALL-E 3 / GPT Image 1 이미지 생성을 사용하시는 분:</span>
    </div>
    <div class="leading-relaxed">
      OpenAI 정책상 이미지 모델을 호출하려면 <strong>Settings → Organization → Verify Organization</strong>에서 신분증 모바일 셀카 인증을 1회 진행해야 정상 호출됩니다.
    </div>
  </div>
</div>
`;

// 2. Gemini
const geminiContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-blue-400 font-bold text-sm mb-2">
      <span>💎</span>
      <span>Google Gemini API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      Google Gemini API는 AIMaster의 <strong>가장 핵심적인 1순위 추천 엔진</strong>입니다. 뛰어난 한국어 이해도와 초고속 응답 속도를 자랑하며, <strong>Google AI Studio에서 구글 계정만 있으면 신용카드 등록 없이도 무료로 분당 15회(RPM 15)까지 넉넉하게 이용</strong>할 수 있습니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Google AI Studio 접속 및 로그인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-300 font-semibold underline underline-offset-4 hover:text-blue-200">aistudio.google.com/app/apikey</a>에 접속하여 본인의 구글 계정으로 로그인합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">새 API 키 만들기 (Create API key)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        화면 좌측 상단의 파란색 <strong>[Create API key]</strong> 버튼을 누른 후, <strong>"Create API key in new project"</strong>(새 프로젝트에 키 생성)를 선택합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
        💡 <strong>팁:</strong> 별도의 복잡한 클라우드 설정 없이 1초 만에 프로젝트와 키가 자동으로 만들어집니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">API 키 복사</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        생성된 키 팝업에서 <code>AIzaSy...</code> 형태로 시작하는 문자열 옆의 <strong>[Copy]</strong> 아이콘을 클릭하여 클립보드에 복사합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 키 저장</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면에서 <strong>"Google (Gemini)"</strong> 항목에 키를 붙여넣고 저장합니다. 이제 모든 Gemini 지원 프로그램(블로그, 챗봇, 인플루언서, 쇼츠 등)을 무료로 즉시 사용할 수 있습니다!
      </p>
    </div>
  </div>

  <!-- 유료 전환 팁 안내 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-2">
    <div class="font-bold text-amber-300 flex items-center gap-1.5">
      <span>⚡</span>
      <span>대량 생성 또는 나노바나나/Veo 고화질 미디어 생성을 원할 때:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      기본 무료 할당량으로도 일상적인 글쓰기와 기획은 충분하지만, 수백 건 이상의 대량 자동화나 최신 이미지/영상 모델을 호출하려면 Google Cloud Console(console.cloud.google.com)에서 Billing을 연동해 유료 종량제로 전환할 수 있습니다. (신규 가입 시 구글에서 300달러 무료 크레딧 제공)
    </div>
  </div>
</div>
`;

// 3. Claude
const claudeContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
      <span>🧠</span>
      <span>Anthropic Claude API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      Anthropic Claude는 AIMaster의 <strong>고품질 블로그 원고 작성, 장문 글쓰기, 전문 카피라이팅, 자연스러운 한국어 문맥 생성</strong>에 최적화된 최고급 LLM 엔진입니다. Claude Pro(월 $20 웹 구독)와는 별개의 개발자용 종량제 API이므로, <strong>본인 명의의 API 키를 발급받아 크레딧을 충전한 만큼 합리적으로 사용</strong>하실 수 있습니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Anthropic Console 접속 및 회원가입</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://console.anthropic.com" target="_blank" class="text-amber-300 font-semibold underline underline-offset-4 hover:text-amber-200">console.anthropic.com</a>에 접속하여 Google 계정 또는 이메일로 가입 및 로그인합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200">
        💡 <strong>팁:</strong> 가입 시 이메일 인증 및 휴대폰 번호 SMS 인증을 1회 완료해야 정상 이용이 가능합니다.
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">크레딧 충전 및 결제 카드 등록 (Plans & Billing)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴의 <strong>Settings → Plans & Billing</strong>으로 이동하여 해외 결제가 가능한 신용/체크카드를 등록하고 최소 $5 이상의 크레딧을 선충전합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
        <div>💳 <strong>자동 충전(Auto-reload) 권장:</strong></div>
        <div class="text-subtext">잔여 크레딧이 소진되면 API 응답이 일시 중단될 수 있으므로, "잔액 $5 이하 시 $10 자동 충전" 옵션을 켜두시면 안정적으로 유지됩니다.</div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">비밀 API 키(API Key) 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴의 <strong>API Keys</strong>로 이동한 후 상단의 <strong>[+ Create Key]</strong> 버튼을 클릭합니다. 키 이름(예: <code>AIMaster-Claude</code>)을 입력하고 생성합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
        ⚠️ <strong>주의:</strong> 발급된 키(<code>sk-ant-api03-...</code>)는 단 한 번만 화면에 노출됩니다. 즉시 복사하여 안전한 곳에 보관해 두세요.
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 플랫폼에 키 등록 완료</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면으로 이동하여 <strong>"Anthropic (Claude)"</strong> 입력 칸에 복사한 키를 붙여넣고 <strong>[저장하기]</strong>를 클릭하면 연동이 완료됩니다!
      </p>
    </div>
  </div>

  <!-- 추천 모델 안내 배너 -->
  <div class="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
    <div class="font-bold text-indigo-300 flex items-center gap-1.5">
      <span>✨</span>
      <span>Claude 3.5 Sonnet & Haiku 모델 활용 팁:</span>
    </div>
    <div class="leading-relaxed">
      가장 똑똑하고 세련된 한국어 문체 작성을 원하시면 <strong>Claude 3.5 Sonnet</strong>을, 빠른 속도와 가성비 높은 요약/태깅을 원하시면 <strong>Claude 3 Haiku</strong> 모델을 선택하시면 좋습니다.
    </div>
  </div>
</div>
`;

// 4. Naver Search/Datalab
const naverDevContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
      <span>🟢</span>
      <span>네이버 검색 & 데이터랩 API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      네이버 검색·데이터랩 API는 AIMaster의 <strong>AI 블로그 키워드 자동화, 상위 블로그 본문 및 랭킹 분석, 실시간 뉴스 수집, 검색어 트렌드 분석</strong>에 사용되는 공식 무료 API입니다. 네이버 아이디만 있으면 <strong>일일 25,000건까지 완전 무료로 제공</strong>됩니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">네이버 개발자 센터 로그인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.naver.com" target="_blank" class="text-emerald-300 font-semibold underline underline-offset-4 hover:text-emerald-200">developers.naver.com</a>에 접속하여 본인의 네이버 아이디로 로그인합니다. (처음 방문 시 개발자 등록 1회 진행)
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">애플리케이션 등록 (Application 등록)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        상단 메뉴의 <strong>Application → 애플리케이션 등록</strong>을 클릭합니다. 애플리케이션 이름에 <code>AIMaster-블로그</code> 등 구별하기 쉬운 이름을 적습니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">사용 API 선택 및 환경 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <strong>사용 API</strong> 목록에서 <strong>[검색]</strong>과 <strong>[데이터랩 (검색어트렌드)]</strong>를 체크합니다.<br/>
        하단 <strong>환경 추가</strong>에서 <strong>[WEB 설정]</strong>을 선택하고, 웹 서비스 URL에 <code>https://www.buylife.xyz</code>를 입력한 뒤 <strong>[등록하기]</strong>를 클릭합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        💡 <strong>팁:</strong> 웹 서비스 URL은 네이버의 형식상 검증 절차이므로 <code>https://www.buylife.xyz</code>를 적어주시면 됩니다.
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">Client ID 및 Client Secret 복사 후 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        등록 완료 후 <strong>내 애플리케이션 → 개요</strong> 탭에서 생성된 <strong>Client ID</strong>와 <strong>Client Secret</strong>(보기 버튼 클릭)을 확인합니다.
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 네이버 검색 API 항목에 각각 붙여넣고 저장합니다.
      </p>
    </div>
  </div>

  <!-- 무료 할당량 안내 배너 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-emerald-300 flex items-center gap-1.5">
      <span>📊</span>
      <span>호출 한도 및 정책 안내:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      검색 API는 계정당 매일 25,000건의 넉넉한 무료 한도를 제공합니다. 일일 할당량은 매일 자정(00:00)에 자동 충전되므로 상용 블로그 운영에도 비용 부담 없이 자유롭게 활용하실 수 있습니다.
    </div>
  </div>
</div>
`;

// 5. Naver SearchAd
const naverSearchAdContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
      <span>📈</span>
      <span>네이버 검색광고(SearchAd) API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      네이버 검색광고 API는 키워드의 <strong>실제 월간 PC/모바일 검색량, 월평균 클릭수, 광고 경쟁도</strong>를 실시간으로 조회하는 핵심 분석 엔진입니다. 실제 광고를 집행하거나 비즈머니를 충전하지 않아도, <strong>네이버 개인 광고주 계정만 만들면 완전 무료로 키를 발급</strong>받을 수 있습니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">네이버 검색광고 접속 및 광고주 가입</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://searchad.naver.com" target="_blank" class="text-emerald-300 font-semibold underline underline-offset-4 hover:text-emerald-200">searchad.naver.com</a>에 접속하여 네이버 아이디로 로그인한 후 광고주 회원가입을 완료합니다. (개인/사업자 모두 가능, 광고비 충전 불필요)
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">도구 → API 사용 관리 메뉴 이동</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        상단 메뉴 바에서 <strong>도구 → [API 사용 관리]</strong> 메뉴를 클릭합니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">API 서비스 신청 및 라이선스 키 발급</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <strong>[API 서비스 신청]</strong> 버튼을 클릭하여 이용 약관에 동의하면 즉시 라이선스 키가 발급됩니다.
      </p>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        💡 <strong>팁:</strong> 별도의 심사나 대기 시간 없이 즉시 실시간으로 발급됩니다.
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">3종 키 정보(액세스라이선스, 비밀키, 고객ID) 복사 및 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        화면에 표시된 아래 3가지 정보를 각각 복사합니다:
      </p>
      <ul class="list-disc list-inside space-y-1.5 text-xs text-subtext mb-3 pl-2">
        <li><strong>액세스라이선스 (Access License)</strong>: 영문·숫자 조합 문자열</li>
        <li><strong>비밀키 (Secret Key)</strong>: 비밀키 보기 클릭 후 복사</li>
        <li><strong>고객 ID (CUSTOMER_ID)</strong>: 화면 우측 상단 또는 본인 계정 번호 (숫자)</li>
      </ul>
      <p class="text-subtext text-sm leading-relaxed">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 네이버 검색광고 칸에 3가지 항목을 입력하고 저장하시면 실제 월간 검색수 조회가 활성화됩니다!
      </p>
    </div>
  </div>

  <!-- 비즈머니 무과금 강조 배너 -->
  <div class="p-5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 space-y-1.5">
    <div class="font-bold text-amber-300 flex items-center gap-1.5">
      <span>💰</span>
      <span>광고비 충전 없이 평생 무료 사용:</span>
    </div>
    <div class="leading-relaxed">
      네이버 검색광고 API는 키워드 검색량 조회의 경우 비즈머니를 0원으로 두어도 비용이 전혀 청구되지 않으며 차단되지 않습니다. 안심하고 연동해 두세요!
    </div>
  </div>
</div>
`;

// 6. YouTube Data API v3
const youtubeDataApiContent = `
<div class="space-y-6">
  <!-- 개요 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-rose-500 font-bold text-sm mb-2">
      <span>▶️</span>
      <span>YouTube Data API v3 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      YouTube Data API v3는 AIMaster의 <strong>쇼츠 떡상 분석기, 유튜브 황금 키워드 발굴, 실시간 인기 쇼츠 탐색, 채널 및 영상 통계 분석</strong>에 필수적인 공식 구글 API입니다. 구글 계정만 있으면 <strong>매일 10,000 유닛의 무료 할당량(검색 약 100회 분량)이 자동으로 무료 제공</strong>됩니다.
    </p>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Google Cloud Console 접속 및 새 프로젝트 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://console.cloud.google.com" target="_blank" class="text-rose-400 font-semibold underline underline-offset-4 hover:text-rose-300">console.cloud.google.com</a>에 구글 계정으로 로그인합니다.
        상단 프로젝트 선택 바를 누르고 <strong>[새 프로젝트]</strong>를 클릭하여 프로젝트 이름(예: <code>AIMaster-YouTube</code>)을 입력하고 생성합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">YouTube Data API v3 라이브러리 사용 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴의 <strong>API 및 서비스 → [라이브러리]</strong>로 이동합니다.
        검색창에 <code>YouTube Data API v3</code>를 입력하고, 검색 결과에서 해당 항목을 클릭한 뒤 파란색 <strong>[사용]</strong> 버튼을 누릅니다.
      </p>
      <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
        💡 <strong>팁:</strong> [사용] 버튼을 누른 후 약 5~10초 정도 기다리시면 API가 활성화됩니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">사용자 인증 정보(API 키) 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴의 <strong>API 및 서비스 → [사용자 인증 정보]</strong>로 이동합니다.
        상단의 <strong>[+ 사용자 인증 정보 만들기]</strong>를 클릭하고 <strong>[API 키]</strong>를 선택합니다.
      </p>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">API 키 복사 및 AIMaster에 저장</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        생성된 팝업에서 <code>AIzaSy...</code>로 시작하는 API 키 문자열 옆의 <strong>[복사]</strong> 아이콘을 클릭합니다.
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면으로 돌아와 <strong>"YouTube Data API"</strong> 입력 칸에 붙여넣고 저장하면 모든 세팅이 완료됩니다!
      </p>
    </div>
  </div>

  <!-- 무료 할당량 리셋 안내 배너 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-rose-400 flex items-center gap-1.5">
      <span>⏰</span>
      <span>일일 무료 할당량 리셋 시각 안내:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      YouTube Data API는 구글 정책상 매일 태평양 표준시(PST) 자정(한국 시각 오후 4시 또는 서머타임 시 오후 5시)에 10,000 유닛이 100% 무료 재충전됩니다.
    </div>
  </div>
</div>
`;

async function updateAll() {
  console.log('=== Service Role 기반 6대 핵심 API 가이드 DB 전면 업데이트 시작 ===');

  const updates = [
    { id: '1c5c24e2-15d4-49b8-b907-0ac6843dee3a', title: 'OpenAI', content: openaiContent },
    { id: 'f442cd37-f1e0-42a7-a3de-f9a9acf47cc4', title: 'Gemini', content: geminiContent },
    { id: 'd03f65c2-efbb-421f-a041-a075562e3b7a', title: 'Claude', content: claudeContent },
    { id: '8f201233-b2f6-4da0-851c-f045bdb5f9c7', title: '네이버 검색·데이터랩', content: naverDevContent },
    { id: '8be38787-dacf-4921-9800-83159c9001be', title: '네이버 검색광고', content: naverSearchAdContent },
    { id: '72d39d06-a7ca-4ab0-8327-f9bb085ac394', title: 'YouTube Data API', content: youtubeDataApiContent },
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

  console.log('🎉 6대 핵심 가이드 DB 업데이트 완료!');
}

updateAll();
