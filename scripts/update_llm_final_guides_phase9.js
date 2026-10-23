const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
});

if (!supabaseUrl || !serviceRoleKey) {
  console.error('.env.local에서 Supabase 접속 정보(SERVICE_ROLE_KEY)를 찾을 수 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const guidesData = [
  // 1. AI 블로그 콘텐츠 제작 자동화 · 본인 AI 키와 Chrome 확장 연결
  {
    id: 'db4a10cb-36aa-4432-9b5f-880c98b0230b',
    title: 'AI 블로그 콘텐츠 제작 자동화 · 본인 AI 키와 Chrome 확장 연결',
    category: 'LLM AI',
    content: `<!-- [AI 블로그 콘텐츠 제작 자동화 완벽 가이드] -->
<div class="space-y-8">

  <!-- 상단 요약 카드 -->
  <div class="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 backdrop-blur-sm">
    <div class="flex items-start gap-4">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl border border-emerald-500/30">
        ✍️
      </div>
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">블로그 자동화 핵심</span>
          <span class="rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-medium text-blue-300 border border-blue-500/30">안전한 Chrome 확장 연동</span>
          <span class="text-xs text-neutral-400">⏱️ 약 3분 소요</span>
        </div>
        <h2 class="text-lg font-bold text-white">AI 고품질 원고 작성부터 네이버 스마트에디터 ONE 자동 타이핑까지</h2>
        <p class="text-sm leading-relaxed text-neutral-300">
          본인 AI 키(Gemini / OpenAI)로 SEO 최적화 블로그 원고를 생성하고, 보안성이 검증된 전용 Chrome 확장을 통해 네이버 블로그에 인간적인 타이핑 모드로 안전하게 자동 입력하는 전체 과정을 안내합니다.
        </p>
      </div>
    </div>
  </div>

  <!-- 핵심 4단계 시각화 뷰어 -->
  <div class="space-y-4">
    <h3 class="text-base font-bold text-white flex items-center gap-2">
      <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black">!</span>
      블로그 자동화 완성 핵심 4단계 (Step-by-Step)
    </h3>
    
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-emerald-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-emerald-400">STEP 1</span>
          <span class="text-lg">🤖</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">본인 AI 키 등록</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">Google Gemini 또는 OpenAI 본인 API 키 등록 및 글쓰기 모델 지정</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-emerald-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-emerald-400">STEP 2</span>
          <span class="text-lg">🧩</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">Chrome 확장 설치</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">ZIP 다운로드 후 chrome://extensions에서 개발자 모드로 원클릭 로드</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-emerald-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-emerald-400">STEP 3</span>
          <span class="text-lg">🔐</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">7일 보안 페어링</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">웹 설정에서 발급된 6자리 보안 연결 코드를 확장에 입력하여 안전 연결</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-emerald-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-emerald-400">STEP 4</span>
          <span class="text-lg">🚀</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">원클릭 타이핑 입력</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">원고와 네이버 글쓰기 탭 선택 후 자동 타이핑 시작, 최종 검토 후 수동 발행</p>
      </div>
    </div>
  </div>

  <!-- 단계별 상세 안내 -->
  <div class="space-y-6">

    <!-- Step 1 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400 border border-emerald-500/30">1</span>
        <h3 class="text-sm font-bold text-white">본인 AI 키 등록 및 글쓰기 모델 선택</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        AIMaster는 회원 본인의 API 키를 직접 사용하여 안전하게 구동됩니다. 프로그램의 [API키등록·플랫폼연동] 메뉴에서 본인 키를 설정하세요.
      </p>
      <div class="space-y-2 rounded-lg bg-neutral-950 p-4 border border-neutral-800 text-xs text-neutral-300">
        <div class="flex items-start gap-2">
          <span class="text-emerald-400 font-bold">•</span>
          <span><b>글 작성 AI 모델</b>: Google AI Studio(Gemini 2.5 Flash 권장 — 무료 분당 15회/고품질) 또는 OpenAI(GPT-4o mini) 키를 등록합니다.</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-emerald-400 font-bold">•</span>
          <span><b>본문 이미지 생성</b>: 블로그 본문에 들어갈 맞춤 일러스트/사진 자동 생성을 위해 본인 Gemini 키가 필요합니다.</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-emerald-400 font-bold">•</span>
          <span>키 저장 시점에 비용이 과금되지 않으며, 실제 원고 작성 시에만 본인 계정의 요율에 따라 극소액(편당 수원~수십원)만 소진됩니다.</span>
        </div>
      </div>
    </div>

    <!-- Step 2 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400 border border-emerald-500/30">2</span>
        <h3 class="text-sm font-bold text-white">Chrome 브라우저 확장 프로그램 로드하기</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        네이버의 비정상 접근 탐지를 완벽히 우회하기 위해 본인 브라우저에서 직접 동작하는 전용 Chrome 확장을 설치합니다.
      </p>
      <ol class="space-y-2 list-decimal list-inside text-xs text-neutral-300">
        <li>프로그램 설정 화면 상단에서 <b>[최신 Chrome 확장 프로그램 ZIP 다운로드]</b>를 클릭하여 압축을 풉니다.</li>
        <li>Chrome 주소창에 <code class="text-amber-300 font-mono bg-neutral-800 px-1.5 py-0.5 rounded">chrome://extensions</code> 를 입력하고 이동합니다.</li>
        <li>우측 상단의 <b>[개발자 모드 (Developer mode)]</b> 토글 스위치를 켭니다.</li>
        <li>좌측 상단의 <b>[압축해제된 확장 프로그램을 로드합니다]</b> 버튼을 누르고, 압축을 푼 폴더를 선택합니다.</li>
      </ol>
    </div>

    <!-- Step 3 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400 border border-emerald-500/30">3</span>
        <h3 class="text-sm font-bold text-white">7일 보안 연결 코드 발급 및 확장 페어링</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        아이디/비밀번호 입력 없이 안전하게 웹 프로그램과 브라우저 확장을 연결하는 보안 페어링 시스템입니다.
      </p>
      <div class="rounded-lg bg-neutral-950 p-4 border border-neutral-800 space-y-2 text-xs text-neutral-300">
        <p>① 프로그램 웹 설정 화면의 <b>[Chrome 확장 연결]</b> 섹션에서 <b>[새 연결 코드 발급]</b>을 클릭합니다.</p>
        <p>② 생성된 6자리 연결 코드(예: <span class="font-mono text-emerald-300 font-bold bg-neutral-900 px-2 py-0.5 rounded">839201</span>)를 복사합니다.</p>
        <p>③ Chrome 브라우저 우측 상단 퍼즐 조각 아이콘 › <b>AIMaster 블로그 확장</b>을 누르고 복사한 코드를 붙여넣습니다.</p>
        <p class="text-neutral-400">※ 연결 코드는 발급일로부터 <b>7일간 유효</b>하며, 필요 시 웹 설정에서 [전체 연결 즉시 해제]가 가능합니다.</p>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400 border border-emerald-500/30">4</span>
        <h3 class="text-sm font-bold text-white">스마트에디터 ONE 자동 타이핑 및 최종 안전 발행</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        네이버 블로그 글쓰기 창에 제목, 소제목(H2/H3), 본문 문단 및 이미지가 자연스러운 딜레이로 자동 입력됩니다.
      </p>
      <div class="space-y-2 rounded-lg bg-neutral-950 p-4 border border-neutral-800 text-xs text-neutral-300">
        <p>① 네이버 블로그에 로그인한 후 새 탭에서 <b>스마트에디터 ONE 글쓰기 창</b>을 열어둡니다.</p>
        <p>② Chrome 확장에서 <b>[작성한 AI 원고]</b>와 <b>[네이버 글쓰기 탭]</b>을 지정한 후 <b>[본문 자동 입력 시작]</b>을 클릭합니다.</p>
        <p>③ 타이핑이 완료되면 본문 내용과 맞춤법을 최종 확인한 후, 우측 상단의 <b>[발행]</b> 버튼을 직접 눌러 안전하게 등록합니다.</p>
      </div>
    </div>

  </div>

  <!-- 💡 팁 배너 -->
  <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
    <div class="flex items-start gap-3">
      <span class="text-xl">💡</span>
      <div class="space-y-1">
        <h4 class="text-sm font-bold text-amber-300">블로그 지수 상승 및 확장 프로그램 업데이트 팁</h4>
        <ul class="text-xs text-neutral-300 space-y-1 list-disc list-inside leading-relaxed">
          <li><b>확장 프로그램 업데이트 요령</b>: 새 버전 배포 시 새 ZIP을 받아 기존 폴더에 덮어쓴 뒤, <code class="font-mono text-amber-200">chrome://extensions</code>에서 새로고침(🔄) 아이콘만 누르면 기존 연결이 유지된 채 즉시 업데이트됩니다.</li>
          <li><b>DIA & C-Rank 지수 상승 비법</b>: AI가 작성한 고품질 원고에 본인만의 직접 경험 1~2문장과 직접 찍은 일상 사진을 한 장 덧붙여 발행하면 네이버 검색 알고리즘에서 최상위 독창성 점수를 부여받습니다.</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- ⚠️ 계정 안전 수칙 배너 -->
  <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5">
    <div class="flex items-start gap-3">
      <span class="text-xl">⚠️</span>
      <div class="space-y-1">
        <h4 class="text-sm font-bold text-rose-300">네이버 계정 보안 및 안전 발행 수칙</h4>
        <p class="text-xs text-neutral-300 leading-relaxed">
          AIMaster는 네이버 계정 비밀번호를 절대 수집하거나 서버로 전송하지 않습니다. 회원 본인 브라우저의 정상 로그인 세션 안에서 직접 발행하는 방식이므로 계정 정지 위험이 없습니다. 발급된 연결 코드와 AI 키는 타인과 공유하지 마세요.
        </p>
      </div>
    </div>
  </div>

</div>`
  },

  // 2. Upstage(업스테이지) API 키 발급받기
  {
    id: '38d1ac20-15f8-47d9-877b-bbaca2f88dd7',
    title: 'Upstage(업스테이지) API 키 발급받기',
    category: 'LLM AI',
    content: `<!-- [Upstage API 키 발급 완벽 가이드] -->
<div class="space-y-8">

  <!-- 상단 요약 카드 -->
  <div class="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-6 backdrop-blur-sm">
    <div class="flex items-start gap-4">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-2xl border border-purple-500/30">
        📄
      </div>
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-purple-500/20 px-3 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">한국어 특화 LLM & 문서 파싱</span>
          <span class="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">무료 체험 크레딧 제공</span>
          <span class="text-xs text-neutral-400">⏱️ 약 3분 소요</span>
        </div>
        <h2 class="text-lg font-bold text-white">Solar LLM 및 Document Parse(PDF/문서 읽기) API 연동 가이드</h2>
        <p class="text-sm leading-relaxed text-neutral-300">
          한국어 문맥 이해와 지침 추론에 세계 최고 수준을 자랑하는 <b>Solar LLM</b>과 복잡한 표/도표가 포함된 PDF 문서를 완벽한 마크다운으로 추출하는 <b>Document Parse</b> API 키 발급 및 연동 절차를 안내합니다.
        </p>
      </div>
    </div>
  </div>

  <!-- 핵심 4단계 시각화 뷰어 -->
  <div class="space-y-4">
    <h3 class="text-base font-bold text-white flex items-center gap-2">
      <span class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">!</span>
      Upstage API 키 발급 핵심 4단계 (Step-by-Step)
    </h3>
    
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-purple-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-purple-400">STEP 1</span>
          <span class="text-lg">🌐</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">Upstage 콘솔 접속</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">console.upstage.ai 접속 후 Google 또는 이메일로 1초 간편 가입</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-purple-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-purple-400">STEP 2</span>
          <span class="text-lg">🔑</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">API Keys 메뉴 이동</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">좌측 사이드바에서 [API Keys] 선택 후 [+ Create new key] 클릭</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-purple-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-purple-400">STEP 3</span>
          <span class="text-lg">📋</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">키 이름 지정 및 복사</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">키 이름 입력 후 생성된 up_... 문자열을 즉시 복사하여 안전 보관</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-purple-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-purple-400">STEP 4</span>
          <span class="text-lg">⚙️</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">AIMaster 등록 저장</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">[API키등록·플랫폼연동] 메뉴의 Upstage 항목에 붙여넣고 저장 완료</p>
      </div>
    </div>
  </div>

  <!-- 단계별 상세 안내 -->
  <div class="space-y-6">

    <!-- Step 1 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400 border border-purple-500/30">1</span>
        <h3 class="text-sm font-bold text-white">Upstage 공식 개발자 콘솔 가입 및 로그인</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        Upstage 공식 콘솔(<a href="https://console.upstage.ai" target="_blank" rel="noopener noreferrer" class="text-purple-400 hover:underline">console.upstage.ai</a>)에 접속합니다. Google 계정 또는 GitHub로 로그인하면 별도의 복잡한 서류 절차 없이 즉시 개발자 계정이 활성화됩니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400 border border-purple-500/30">2</span>
        <h3 class="text-sm font-bold text-white">API Keys 메뉴에서 새 키 생성</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        대시보드 좌측 내비게이션 바에서 <b>[API Keys]</b>를 클릭합니다. 화면 우측 상단의 <b>[+ Create new key]</b> 버튼을 누르면 새 키 발급 팝업창이 나타납니다.
      </p>
    </div>

    <!-- Step 3 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400 border border-purple-500/30">3</span>
        <h3 class="text-sm font-bold text-white">키 이름 설정 및 생성된 API 키 복사</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        어떤 용도로 사용하는지 알 수 있도록 Key Name(예: <code class="text-purple-300 bg-neutral-800 px-1.5 py-0.5 rounded font-mono">aimaster-solar-bot</code>)을 입력하고 확인을 누릅니다.
      </p>
      <div class="rounded-lg bg-neutral-950 p-4 border border-neutral-800 space-y-2 text-xs text-neutral-300">
        <p class="text-emerald-400 font-semibold">✓ 발급된 API 키 형식 예시:</p>
        <code class="block font-mono text-purple-300 bg-neutral-900 px-3 py-2 rounded border border-neutral-800">up_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5...</code>
        <p class="text-neutral-400">발급된 키는 보안상 생성 직후 한 번만 전체가 표시되므로 즉시 복사 버튼을 눌러 메모장에 백업하세요.</p>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400 border border-purple-500/30">4</span>
        <h3 class="text-sm font-bold text-white">AIMaster 프로그램에 본인 키 등록</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        AIMaster 메인 사이트 또는 각 자동화 프로그램의 <b>[API키등록·플랫폼연동]</b> 설정 화면으로 이동합니다. <b>Upstage API Key</b> 입력칸에 복사한 키를 붙여넣고 <b>[저장]</b>을 완료합니다.
      </p>
    </div>

  </div>

  <!-- 💡 팁 배너 -->
  <div class="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5">
    <div class="flex items-start gap-3">
      <span class="text-xl">💡</span>
      <div class="space-y-1">
        <h4 class="text-sm font-bold text-purple-300">Upstage Solar & Document Parse 활용 팁</h4>
        <ul class="text-xs text-neutral-300 space-y-1 list-disc list-inside leading-relaxed">
          <li><b>신규 회원 무료 크레딧</b>: 가입 시 기본 무료 테스트 크레딧이 계정에 자동 적립되어 즉시 문서 챗봇과 파싱을 테스트할 수 있습니다.</li>
          <li><b>Document Parse의 강점</b>: 텍스트뿐만 아니라 표(Table), 캡션, 헤더 계층 구조를 인식하여 원본 서식을 그대로 유지한 채 분석해 냅니다.</li>
          <li><b>Solar-Pro vs Solar-Mini</b>: 일상적인 응답 생성에는 가성비가 높은 <code class="font-mono text-purple-200">solar-mini</code>를, 정밀 법률/금융 문서 심층 분석에는 <code class="font-mono text-purple-200">solar-pro</code>를 추천합니다.</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- ⚠️ 요금 및 키 보안 배너 -->
  <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
    <div class="flex items-start gap-3">
      <span class="text-xl">⚠️</span>
      <div class="space-y-1">
        <h4 class="text-sm font-bold text-amber-300">무료 크레딧 소진 및 결제 수단 등록 안내</h4>
        <p class="text-xs text-neutral-300 leading-relaxed">
          무료 체험 크레딧이 모두 소진되면 API 호출이 일시 차단됩니다. 콘솔의 <b>Billing(결제)</b> 메뉴에서 결제 카드를 미리 등록해 두시면 끊김 없이 안정적으로 문서를 자동 처리할 수 있습니다.
        </p>
      </div>
    </div>
  </div>

  <!-- 하단 공식 사이트 이동 버튼 -->
  <div class="pt-2">
    <a href="https://console.upstage.ai/api-keys" target="_blank" rel="noopener noreferrer" 
       class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-purple-500 shadow-lg shadow-purple-600/30">
      <span>Upstage 콘솔 API Keys 바로가기</span>
      <span>→</span>
    </a>
  </div>

</div>`
  },

  // 3. Perplexity API 키 발급받기
  {
    id: '1df95d8b-6a27-4de0-b1d9-8bbc218534ad',
    title: 'Perplexity API 키 발급받기',
    category: 'LLM AI',
    content: `<!-- [Perplexity API 키 발급 완벽 가이드] -->
<div class="space-y-8">

  <!-- 상단 요약 카드 -->
  <div class="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6 backdrop-blur-sm">
    <div class="flex items-start gap-4">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-2xl border border-cyan-500/30">
        ⚡
      </div>
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-cyan-500/20 px-3 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30">실시간 웹 검색 & 팩트체크</span>
          <span class="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">★Pro 구독과 API 별개</span>
          <span class="text-xs text-neutral-400">⏱️ 약 2분 소요</span>
        </div>
        <h2 class="text-lg font-bold text-white">최신 웹 검색 기반 Sonar AI 리서치 API 연동 가이드</h2>
        <p class="text-sm leading-relaxed text-neutral-300">
          지식 컷오프(환각 현상) 없이 전 세계 최신 웹 정보를 실시간 검색하고 출처 링크를 인용하여 정밀 요약해 주는 <b>Perplexity Sonar API</b> 키 발급 및 크레딧 충전 절차를 완벽하게 안내합니다.
        </p>
      </div>
    </div>
  </div>

  <!-- 핵심 4단계 시각화 뷰어 -->
  <div class="space-y-4">
    <h3 class="text-base font-bold text-white flex items-center gap-2">
      <span class="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-black">!</span>
      Perplexity API 연동 핵심 4단계 (Step-by-Step)
    </h3>
    
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-cyan-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-cyan-400">STEP 1</span>
          <span class="text-lg">🌐</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">Perplexity 가입</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">perplexity.ai 공식 사이트에서 Google 계정으로 간편 가입 완료</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-cyan-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-cyan-400">STEP 2</span>
          <span class="text-lg">💳</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">API 크레딧 충전</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">Settings › API 이동 후 카드 등록 및 최소 $5 크레딧 사전 충전 (필수!)</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-cyan-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-cyan-400">STEP 3</span>
          <span class="text-lg">🔑</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">API Key 생성·복사</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">[+ Generate API Key] 클릭 후 발급된 pplx-... 문자열 즉시 복사</p>
      </div>

      <div class="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-cyan-500/40">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-cyan-400">STEP 4</span>
          <span class="text-lg">⚙️</span>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">AIMaster 등록 저장</h4>
        <p class="text-xs text-neutral-400 leading-relaxed">[API키등록·플랫폼연동] 메뉴의 Perplexity 항목에 붙여넣고 저장</p>
      </div>
    </div>
  </div>

  <!-- 단계별 상세 안내 -->
  <div class="space-y-6">

    <!-- Step 1 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400 border border-cyan-500/30">1</span>
        <h3 class="text-sm font-bold text-white">Perplexity 공식 사이트 가입 및 로그인</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        <a href="https://www.perplexity.ai" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline">perplexity.ai</a>에 접속하여 Google, Microsoft 또는 개인 이메일 계정으로 가입을 완료합니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400 border border-cyan-500/30">2</span>
        <h3 class="text-sm font-bold text-white">Settings › API 이동 및 크레딧 사전 충전 (★필수 확인)</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        좌측 하단 프로필 설정 아이콘 › <b>[Settings]</b> › 상단 탭 <b>[API]</b>로 이동합니다.
      </p>
      <div class="rounded-lg bg-neutral-950 p-4 border border-rose-500/30 space-y-2 text-xs text-neutral-300">
        <p class="text-rose-400 font-bold">⚠️ 가장 많은 회원이 겪는 중요 주의사항:</p>
        <p><b>Perplexity Pro 구독($20/월)과 API 요금은 완전히 별개입니다!</b></p>
        <p class="text-neutral-400 leading-relaxed">
          Pro 멤버십에 가입되어 있어도 API를 사용하려면 별도로 API 전용 크레딧을 충전해야 합니다. 충전된 잔액(Balance)이 $0이면 키를 발급받아도 프로그램에서 <code class="text-rose-300 font-mono">401 Insufficient Balance</code> 오류가 발생합니다.
        </p>
        <p class="pt-1 text-emerald-400">화면의 <b>[Add payment method]</b>를 눌러 카드를 등록하고, 최소 $5~$10를 먼저 충전하세요.</p>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400 border border-cyan-500/30">3</span>
        <h3 class="text-sm font-bold text-white">API Key 생성 및 즉시 복사</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        결제 수단 등록 및 크레딧 충전이 완료되면 화면의 <b>[+ Generate API Key]</b> 버튼을 클릭합니다.
      </p>
      <div class="rounded-lg bg-neutral-950 p-4 border border-neutral-800 space-y-2 text-xs text-neutral-300">
        <p class="text-cyan-400 font-semibold">✓ 발급된 API 키 형식 예시:</p>
        <code class="block font-mono text-cyan-300 bg-neutral-900 px-3 py-2 rounded border border-neutral-800">pplx-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...</code>
        <p class="text-neutral-400">발급된 키는 보안상 생성 순간에만 전체가 노출되므로, 즉시 <b>[Copy]</b>를 눌러 보관하세요.</p>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <div class="flex items-center gap-3">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-400 border border-cyan-500/30">4</span>
        <h3 class="text-sm font-bold text-white">AIMaster 공용 설정에 키 등록 및 연동</h3>
      </div>
      <p class="text-xs text-neutral-300 leading-relaxed">
        AIMaster 메인 사이트 또는 자동화 프로그램의 <b>[API키등록·플랫폼연동]</b> 메뉴로 이동합니다. <b>Perplexity API Key</b> 입력칸에 복사한 키를 붙여넣고 <b>[저장]</b>을 누르면 모든 준비가 완료됩니다.
      </p>
    </div>

  </div>

  <!-- 💡 팁 배너 -->
  <div class="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5">
    <div class="flex items-start gap-3">
      <span class="text-xl">💡</span>
      <div class="space-y-1">
        <h4 class="text-sm font-bold text-cyan-300">Perplexity Sonar 활용 및 비용 절감 팁</h4>
        <ul class="text-xs text-neutral-300 space-y-1 list-disc list-inside leading-relaxed">
          <li><b>Sonar 모델의 뛰어난 경제성</b>: 실시간 웹 검색 및 뉴스 요약에는 초경량 고속 모델인 <code class="font-mono text-cyan-200">sonar</code> 모델이 호출당 0.005달러(약 7원) 미만으로 매우 저렴합니다.</li>
          <li><b>Auto Reload(자동 충전) 권장</b>: 결제 설정에서 <code class="font-mono text-cyan-200">Auto reload</code>를 켜두시면 잔액이 $2 이하로 떨어질 때 자동으로 충전되어 대량 리서치 자동화가 끊김 없이 지속됩니다.</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- 하단 공식 콘솔 바로가기 버튼 -->
  <div class="pt-2">
    <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" 
       class="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-cyan-500 shadow-lg shadow-cyan-600/30">
      <span>Perplexity API 설정 콘솔 바로가기</span>
      <span>→</span>
    </a>
  </div>

</div>`
  }
];

async function updateGuides() {
  console.log('총 ' + guidesData.length + '개 Phase 9 가이드 본문 업데이트 시작...');
  for (const g of guidesData) {
    const { data, error } = await supabase
      .from('platform_guides')
      .update({
        content: g.content,
        updated_at: new Date().toISOString()
      })
      .eq('id', g.id);

    if (error) {
      console.error('❌ 업데이트 실패 (' + g.title + '):', error);
    } else {
      console.log('✅ 업데이트 완료: [' + g.id + '] ' + g.title);
    }
  }
  console.log('🎉 Phase 9 모든 가이드 업데이트 완료!');
}

updateGuides();
