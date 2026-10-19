const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const lines = env.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);

// 1. OpenAI 가이드 고도화 본문
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

// 2. Google Gemini 가이드 고도화 본문
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

async function updateGuides() {
  console.log('가이드 본문 고도화 업데이트 중...');

  const { error: e1 } = await supabase
    .from('platform_guides')
    .update({ content: openaiContent })
    .eq('id', '1c5c24e2-15d4-49b8-b907-0ac6843dee3a');
  if (e1) console.error('OpenAI 업데이트 실패:', e1);
  else console.log('✅ OpenAI 가이드 고도화 완료');

  const { error: e2 } = await supabase
    .from('platform_guides')
    .update({ content: geminiContent })
    .eq('id', 'f442cd37-f1e0-42a7-a3de-f9a9acf47cc4');
  if (e2) console.error('Gemini 업데이트 실패:', e2);
  else console.log('✅ Gemini 가이드 고도화 완료');

  console.log('가이드 업데이트 완료!');
}

updateGuides();
