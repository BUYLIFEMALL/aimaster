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

// 1. Replicate (FLUX)
const replicateContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-sky-400 font-bold text-sm mb-2">
      <span>🎨</span>
      <span>Replicate (FLUX) API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      Replicate API는 AIMaster의 <strong>FLUX.1 [schnell] 및 [dev] 초고화질 실사 AI 이미지, 가상 인플루언서 화보, 카드뉴스 배경 생성</strong>에 사용되는 차세대 이미지 생성 플랫폼입니다. 고성능 GPU 인프라를 클라우드로 제공하여 합리적인 장당 종량제로 이용할 수 있습니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Replicate 가입 및 결제 카드 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://replicate.com" target="_blank" class="text-sky-300 font-semibold underline underline-offset-4 hover:text-sky-200">replicate.com</a>에 접속하여 GitHub 계정으로 간편 가입합니다.<br/>
        우측 상단 프로필 → <strong>[Billing]</strong>으로 이동하여 해외 결제 카드를 등록합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">API 토큰(API Token) 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        우측 상단 프로필 → <strong>[API tokens]</strong> 메뉴(<a href="https://replicate.com/account/api-tokens" target="_blank" class="text-sky-300 underline">replicate.com/account/api-tokens</a>)로 이동하여 <strong>[Create token]</strong> 버튼을 누릅니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">토큰 복사</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        생성된 토큰(<code>r8_...</code>로 시작)을 복사 아이콘을 눌러 클립보드에 복사합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 키 저장</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면에서 <strong>"Replicate"</strong> 칸에 붙여넣고 저장하면 모든 이미지 연동이 완료됩니다!
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 space-y-1.5">
    <div class="font-bold text-sky-300 flex items-center gap-1.5">
      <span>💡</span>
      <span>FLUX schnell 가성비 팁:</span>
    </div>
    <div class="leading-relaxed">
      FLUX schnell 모델은 장당 약 $0.003(약 4원)에 불과하여 $5 충전만으로도 1,000장 이상의 초고화질 이미지를 넉넉하게 생성할 수 있습니다.
    </div>
  </div>
</div>
`;

// 2. ElevenLabs
const elevenLabsContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
      <span>🎙️</span>
      <span>ElevenLabs AI 보이스 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      ElevenLabs는 AIMaster의 <strong>쇼츠 나레이션, 오디오북 더빙, 팟캐스트 제작, 목소리 복제(Voice Cloning)</strong>에 사용되는 업계 최고 수준의 AI 음성 합성 엔진입니다. 기계음 없이 실제 사람과 같은 숨소리와 자연스러운 감정을 표현합니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">ElevenLabs 가입 및 무료 크레딧 확인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://elevenlabs.io" target="_blank" class="text-indigo-300 font-semibold underline underline-offset-4 hover:text-indigo-200">elevenlabs.io</a>에 접속하여 가입합니다. 무료 계정이어도 매달 10,000자의 음성 변환 크레딧이 기본 제공됩니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">API Key 발급</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 하단 프로필 아이콘 클릭 → <strong>[Profile + API key]</strong> 메뉴로 이동하여 <strong>[Create API Key]</strong>를 클릭합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">한국어 보이스 ID 탐색 (Voice Lab)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 메뉴 <strong>[Voice Lab]</strong>에서 마음에 드는 한국어 목소리를 검색하여 내 라이브러리에 추가하고 Voice ID를 확인합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 키 저장</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 ElevenLabs 칸에 API Key를 붙여넣고 저장합니다.
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-indigo-300 flex items-center gap-1.5">
      <span>✨</span>
      <span>쇼츠 15편 무료 제작 팁:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      매달 무료로 제공되는 10,000자로도 50~60초 분량의 숏폼 나레이션을 15~20편 가량 비용 없이 무료 제작할 수 있습니다.
    </div>
  </div>
</div>
`;

// 3. SUNO
const sunoContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
      <span>🎵</span>
      <span>SUNO AI 음악 생성 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      SUNO는 AIMaster의 <strong>유튜브 쇼츠 BGM, 릴스 배경음악, 맞춤형 가사 작곡 및 LP 턴테이블 음원 제작</strong>에 사용되는 세계 최고의 생성형 AI 음악 엔진입니다. 가사와 장르 스타일만 입력하면 완성도 높은 보컬 곡을 단 1분 만에 작곡합니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">SUNO 공식 사이트 가입 (매일 50크레딧 무료)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://suno.com" target="_blank" class="text-purple-300 font-semibold underline underline-offset-4 hover:text-purple-200">suno.com</a>에 접속하여 Google, Discord 또는 Microsoft 계정으로 로그인합니다. 매일 50크레딧(노래 10곡 분량)이 무료로 리셋됩니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">계정 연동 토큰 또는 API 키 확인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        계정 프로필 또는 안내에 따라 본인 계정의 연동 토큰을 확인합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-purple-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">토큰 복사</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        확인한 토큰 문자열을 복사합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 등록 및 쇼츠 음악 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 SUNO 항목에 붙여넣고 저장하면 모든 세팅이 완료됩니다!
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 space-y-1.5">
    <div class="font-bold text-purple-300 flex items-center gap-1.5">
      <span>🎼</span>
      <span>저작권 걱정 없는 상업적 음원 제작:</span>
    </div>
    <div class="leading-relaxed">
      K-Pop, Lo-Fi, 힙합, 재즈, 시네마틱 오케스트라 등 원하는 장르 키워드를 지정하여 유튜브 영상의 저작권 위반 경고 없이 안전한 배경음악을 무제한 작곡할 수 있습니다.
    </div>
  </div>
</div>
`;

// 4. Runway
const runwayContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-violet-400 font-bold text-sm mb-2">
      <span>🎬</span>
      <span>Runway Gen-2 / Gen-3 Alpha 비디오 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      Runway API는 AIMaster의 <strong>시네마틱 숏폼 영상 제작, 이미지 투 비디오(Image-to-Video) 모션 부여, 무한 루프 배경 영상 자동 생성</strong>에 사용되는 차세대 AI 비디오 엔진입니다. 카메라 무빙과 특수 효과를 자유롭게 조절할 수 있습니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-violet-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Runway 회원가입 및 개발자 포털 접속</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://app.runwayml.com" target="_blank" class="text-violet-300 font-semibold underline underline-offset-4 hover:text-violet-200">app.runwayml.com</a>에 접속하여 회원가입합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-violet-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">개발자 포털 이동 및 API Key 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        설정 메뉴의 <strong>Developer Portal / API Access</strong>로 이동하여 <strong>[+ Create New Key]</strong>를 클릭합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-violet-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">키 복사 및 보안 보관</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        생성된 비밀 키를 복사합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 등록 완료</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 Runway 항목에 키를 입력하고 저장합니다.
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-violet-300 flex items-center gap-1.5">
      <span>🎥</span>
      <span>이미지 모션 부여 팁:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      AI로 생성한 이미지 화보를 Runway에 전달하여 줌인/팬 모션을 부여하면 클릭률이 높은 고품질 쇼츠 인트로 영상이 완성됩니다.
    </div>
  </div>
</div>
`;

// 5. 텔레그램 봇
const telegramContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-sky-400 font-bold text-sm mb-2">
      <span>✈️</span>
      <span>텔레그램(Telegram) 알림 봇 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      텔레그램 봇 연동은 AIMaster의 <strong>인스타그램·쓰레드 예약 포스팅 완료 알림, 핫딜 키워드 모니터링 속보, 시스템 오류 및 정기 리포트</strong>를 100% 무료로 수신할 수 있는 가장 신속한 메신저 채널입니다. 발송 비용이나 건수 제한이 전혀 없습니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">@BotFather 검색 및 봇 생성 시작</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        텔레그램 앱 검색창에 <a href="https://t.me/BotFather" target="_blank" class="text-sky-300 font-semibold underline underline-offset-4 hover:text-sky-200">@BotFather</a>를 검색하고 대화를 시작합니다.<br/>
        대화창에 <code>/newbot</code> 명령어를 입력합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">봇 이름 및 유저네임 지정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        1) 봇의 표시 이름(예: <code>AIMaster 알리미</code>)을 입력합니다.<br/>
        2) 봇의 고유 아이디(반드시 끝에 <code>bot</code> 또는 <code>_bot</code>으로 끝나야 함, 예: <code>my_aimaster_bot</code>)를 입력합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">HTTP API 토큰 및 Chat ID 확인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        BotFather가 발급해 준 <strong>HTTP API 토큰</strong>(예: <code>123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>)을 복사합니다.<br/>
        방금 만든 본인의 봇 링크(<code>t.me/봇아이디</code>)를 눌러 <strong>[시작]</strong> 또는 아무 메시지를 1회 보냅니다.
      </p>
      <div class="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200">
        💡 <strong>Chat ID 확인 팁:</strong> 봇에게 메시지를 보낸 후 <code>@userinfobot</code>을 검색해 대화를 시작하면 본인의 고유 숫자 Chat ID(예: <code>987654321</code>)를 1초 만에 확인할 수 있습니다.
      </div>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 봇 토큰 및 Chat ID 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 텔레그램 칸에 <strong>봇 토큰</strong>과 <strong>Chat ID</strong>를 입력하고 저장하면 실시간 무료 알림 세팅이 완료됩니다!
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-sky-300 flex items-center gap-1.5">
      <span>⚡</span>
      <span>건수 제한 없는 평생 무료 알림:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      텔레그램 알림은 문자(SMS) 비용이나 알림톡 충전금 없이 평생 완전 무료로 전송되므로 모든 모니터링 알림의 1순위로 추천합니다.
    </div>
  </div>
</div>
`;

// 6. SOLAPI
const solapiContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-blue-400 font-bold text-sm mb-2">
      <span>📩</span>
      <span>SOLAPI (카카오 알림톡/문자) 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      SOLAPI는 AIMaster의 <strong>카카오톡 알림톡, 친구톡, SMS/LMS 고객 문자 메시지 자동 발송</strong>에 사용되는 공식 B2B 메시징 게이트웨이입니다. 고객 예약 확인, 결제 안내, 주문 알림을 신뢰도 높은 카카오톡 브랜드 채널로 자동 발송합니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">SOLAPI 가입 및 로그인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://solapi.com" target="_blank" class="text-blue-300 font-semibold underline underline-offset-4 hover:text-blue-200">solapi.com</a>에 접속하여 회원가입을 완료합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">발신번호 및 카카오톡 채널 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        전기통신사업법에 따라 문자 발송용 <strong>[발신번호 등록]</strong>(통신서비스 가입증명원 또는 ARS 인증)을 1회 진행합니다.<br/>
        알림톡을 발송할 경우 카카오톡 비즈니스 채널을 연동합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">API Key 및 API Secret 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        상단 메뉴의 <strong>[개발지원] → [API Key 관리]</strong>로 이동하여 <strong>[+ 새 API Key 생성]</strong>을 클릭합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1">
        <div>🔑 <strong>확인할 2가지 키:</strong></div>
        <ul class="list-disc list-inside text-subtext pl-1">
          <li><strong>API Key:</strong> <code>NCS...</code> 형태의 고유 키</li>
          <li><strong>API Secret:</strong> 비밀 서명 키</li>
        </ul>
      </div>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 키 및 발신번호 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 SOLAPI 항목에 API Key, API Secret, 등록한 발신번호(또는 카카오 채널 ID)를 입력하고 저장합니다.
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 space-y-1.5">
    <div class="font-bold text-blue-300 flex items-center gap-1.5">
      <span>💰</span>
      <span>알림톡 건당 비용 혜택:</span>
    </div>
    <div class="leading-relaxed">
      카카오 알림톡은 건당 약 8~9원대로 일반 SMS 문자(15~20원) 대비 50% 이상 저렴하며, 카카오 공식 인증 마크가 표시되어 고객 확인율이 월등히 높습니다.
    </div>
  </div>
</div>
`;

// 7. 네이버 메일 (SMTP)
const naverMailContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-green-400 font-bold text-sm mb-2">
      <span>📧</span>
      <span>네이버 메일(SMTP) 자동 발송 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      네이버 메일 SMTP 연동은 AIMaster의 <strong>고객 문의 자동 답변, 정기 뉴스레터 발송, 주문 내역 이메일 통보</strong> 시 별도의 유료 메일 서버 없이 본인의 네이버 메일 주소(<code>@naver.com</code>)로 안전하게 메일을 자동 발송하는 연동입니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-green-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">네이버 메일 환경설정 이동</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://mail.naver.com" target="_blank" class="text-green-300 font-semibold underline underline-offset-4 hover:text-green-200">mail.naver.com</a>에 로그인한 후, 좌측 메뉴 맨 아래의 <strong>[환경설정 ⚙️]</strong>을 클릭합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-green-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">POP3/IMAP 설정에서 SMTP 사용함 체크</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        상단 탭에서 <strong>[POP3/IMAP 설정]</strong>으로 이동하여 <strong>"IMAP/SMTP 사용"</strong>을 <strong>[사용함]</strong>으로 변경하고 저장합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-green-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">애플리케이션 비밀번호 생성 (2단계 인증 계정 필수)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        네이버 내정보 → <strong>[보안설정] → [2단계 인증 관리]</strong> 메뉴로 이동합니다.<br/>
        하단의 <strong>"애플리케이션 비밀번호 생성"</strong>에서 종류를 <em>"직접 입력 (AIMaster)"</em>으로 선택하고 생성 버튼을 누릅니다.
      </p>
      <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
        ⚠️ <strong>주의:</strong> 일반 네이버 로그인 비밀번호를 입력하면 2단계 인증 보안으로 인해 발송이 차단됩니다. 반드시 여기서 생성된 <strong>16자리 영문 전용 비밀번호</strong>를 복사하세요!
      </div>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 메일 계정 등록 완료</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 네이버 메일 항목에 본인의 <strong>네이버 메일 주소</strong>와 방금 발급한 <strong>애플리케이션 비밀번호</strong>를 입력하고 저장합니다.
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-green-300 flex items-center gap-1.5">
      <span>⚙️</span>
      <span>SMTP 기본 서버 정보:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      SMTP 서버: <code>smtp.naver.com</code> · 포트: <code>465</code> (SSL/TLS 보안 연결) — AIMaster 시스템이 위 규격으로 자동 최적화 발송합니다.
    </div>
  </div>
</div>
`;

// 8. Tavily
const tavilyContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-teal-400 font-bold text-sm mb-2">
      <span>🔍</span>
      <span>Tavily AI 실시간 웹 검색 API 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      Tavily는 LLM 인공지능에 최적화된 <strong>차세대 실시간 웹 리서치 검색 엔진</strong>입니다. 광고나 불필요한 스팸 웹문서를 배제하고, 질문에 가장 부합하는 신뢰도 높은 최신 뉴스, 통계, 기술 문서를 정확하게 수집하여 AI 블로그 및 리포트 작성 시 할루시네이션(허위 생성)을 원천 차단합니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Tavily 사이트 접속 및 회원가입 (매월 1,000회 무료)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://tavily.com" target="_blank" class="text-teal-300 font-semibold underline underline-offset-4 hover:text-teal-200">tavily.com</a>에 접속하여 Google 또는 GitHub 계정으로 가입합니다. 매월 1,000회의 검색 크레딧이 무료로 제공됩니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">대시보드 메인에서 API Key 확인</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        로그인 후 대시보드(Dashboard) 메인 화면 중앙에 표시된 <strong>API Key</strong>를 확인합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">키 복사</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <code>tvly-...</code> 형태로 시작하는 API 키 옆의 <strong>[Copy]</strong> 버튼을 클릭합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 키 저장</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 Tavily 항목에 키를 붙여넣고 저장합니다. 이제 모든 AI 자동 리서치 프로그램에서 최신 웹 검색 데이터를 기반으로 한 신뢰성 높은 원고가 작성됩니다!
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-200 space-y-1.5">
    <div class="font-bold text-teal-300 flex items-center gap-1.5">
      <span>💡</span>
      <span>일일 30건 이상 무료 리서치:</span>
    </div>
    <div class="leading-relaxed">
      매월 제공되는 1,000회의 무료 검색량은 일일 30편 이상의 전문 뉴스 및 시사 블로그 포스팅을 비용 없이 발행하기에 충분한 할당량입니다.
    </div>
  </div>
</div>
`;

// 9. RSS / Inoreader
const rssContent = `
<div class="space-y-6">
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
      <span>📡</span>
      <span>RSS / Inoreader 콘텐츠 자동 수집 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      RSS 및 Inoreader 연동은 AIMaster의 <strong>국내외 주요 뉴스 속보, 인기 IT/재테크 블로그, 유튜브 채널의 신규 콘텐츠를 24시간 실시간 감지</strong>하여 AI가 자동으로 요약하고 새로운 글을 발행할 수 있도록 소재를 공급하는 핵심 자동화 파이프라인입니다.
    </p>
  </div>

  <div class="space-y-4">
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">수집할 웹사이트의 RSS 피드 주소 확보</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        정기적으로 모니터링할 언론사 또는 블로그의 RSS 주소를 확인합니다.<br/>
        예: 네이버 블로그의 경우 <code>https://rss.blog.naver.com/블로그아이디.xml</code> 형태로 손쉽게 RSS 주소를 얻을 수 있습니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">Inoreader 가입 및 피드 구독</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://www.inoreader.com" target="_blank" class="text-amber-300 font-semibold underline underline-offset-4 hover:text-amber-200">inoreader.com</a>에 접속하여 가입한 후, 관심 있는 RSS 피드들을 등록하고 폴더별로 분류합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">개발자 App 등록 (App ID & App Key)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        Inoreader 환경설정(Preferences) → <strong>[Developer]</strong> 메뉴로 이동하여 <strong>[New Application]</strong>을 등록하고 발급된 <strong>App ID</strong>와 <strong>App Key</strong>를 확인합니다.
      </p>
    </div>

    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster에 피드 및 API 키 등록 완료</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        AIMaster의 <strong>[API키등록·플랫폼연동]</strong> 화면의 RSS/Inoreader 항목에 키를 등록하면 실시간 콘텐츠 수집 및 2차 창작 자동화가 가동됩니다!
      </p>
    </div>
  </div>

  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1.5">
    <div class="font-bold text-amber-300 flex items-center gap-1.5">
      <span>⚡</span>
      <span>24시간 자동 큐레이션 파이프라인:</span>
    </div>
    <div class="leading-relaxed text-subtext">
      원문 링크가 새로 감지되는 즉시 AI가 핵심 요약을 추출하고 새로운 문체로 재가공하여 블로그나 쓰레드 초안으로 자동 적재해 줍니다.
    </div>
  </div>
</div>
`;

async function updateAll9() {
  console.log('=== Service Role 기반 9종 가이드 DB 전면 업데이트 시작 ===');

  const updates = [
    { id: '78a00b16-eef5-42be-810b-80c513d57ab4', title: 'Replicate(FLUX)', content: replicateContent },
    { id: '9457687a-75ed-40d8-bc4a-9415173eba70', title: 'ElevenLabs', content: elevenLabsContent },
    { id: '0ecb9a3c-e4f7-4229-8fc3-f74fdb6dc6fd', title: 'SUNO', content: sunoContent },
    { id: '373bdf47-7a5b-4557-b47a-ddd15cf07c09', title: 'Runway', content: runwayContent },
    { id: 'f43e8ebe-a930-4933-b965-7068b38d79aa', title: '텔레그램 봇', content: telegramContent },
    { id: 'eb8f5eaf-6ef7-46b8-9b05-994e944fe69a', title: 'SOLAPI', content: solapiContent },
    { id: '1dbea19b-4c83-4453-ae41-0b59d7f27b5f', title: '네이버 메일(SMTP)', content: naverMailContent },
    { id: 'e02892df-9ac8-48ac-821f-c51e238ca1ab', title: 'Tavily', content: tavilyContent },
    { id: '8eff3ebb-7c05-45b7-9494-fc8fdf17bb5f', title: 'RSS | Inoreader', content: rssContent },
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

  console.log('🎉 9종 가이드 전체 DB 업데이트 완료!');
}

updateAll9();
