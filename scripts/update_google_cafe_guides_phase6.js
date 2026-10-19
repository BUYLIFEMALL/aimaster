const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Google OAuth 클라이언트 만들기 (Gmail·Drive 등)
const googleOauthCommonContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-sky-400 font-bold text-sm mb-2">
      <span>🔑</span>
      <span>Google Workspace 공용 OAuth 2.0 클라이언트 발급 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      Gmail 자동 발송, Google Drive 파일 백업, Google Sheets 실시간 데이터 동기화 등 <strong>AIMaster의 모든 구글 워크스페이스 연동 프로그램에서 공용으로 사용할 수 있는 OAuth 2.0 클라이언트 ID/Secret</strong> 발급 가이드입니다. 구글 클라우드는 무료 계정으로 영구 사용 가능합니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 4분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-amber-300">중급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">💳 비용: <strong class="text-emerald-400">100% 무료</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🔒 보안: <strong class="text-sky-300">공식 OAuth 2.0</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Google Cloud Console 접속 및 새 프로젝트 생성</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://console.cloud.google.com" target="_blank" class="text-sky-400 font-semibold underline underline-offset-4 hover:text-sky-300">console.cloud.google.com</a>에 구글 계정으로 로그인한 뒤, 상단 프로젝트 선택 드롭다운에서 <strong>[새 프로젝트]</strong>를 클릭하고 프로젝트 이름(예: <span class="font-mono text-sky-300">AIMaster-Workspace</span>)을 입력하여 생성합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1">
        <div>💡 <strong>필요한 API 라이브러리 활성화:</strong> 좌측 메뉴 <strong>[API 및 서비스] → [라이브러리]</strong>에서 본인이 사용할 API(Gmail API, Google Drive API, Google Sheets API)를 검색하여 <strong>[사용]</strong> 버튼을 각각 눌러주세요.</div>
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">OAuth 동의 화면 구성 (User Type: 외부)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 <strong>[API 및 서비스] → [OAuth 동의 화면]</strong>으로 이동하여 User Type으로 <strong>"외부(External)"</strong>를 선택하고 [만들기]를 누릅니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1">
        <div>• <strong>앱 이름:</strong> 본인이 알아보기 쉬운 이름 (예: <span class="font-mono text-sky-300">MyWorkBot</span>)</div>
        <div>• <strong>사용자 지원 이메일 / 개발자 연락처 이메일:</strong> 본인 구글 이메일 주소 입력</div>
        <div>• [저장 후 계속]을 눌러 스코프 단계는 기본값으로 넘깁니다.</div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">테스트 사용자 등록 (심사 없이 즉시 사용)</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <strong>[테스트 사용자]</strong> 섹션에서 <strong>[+ ADD USERS]</strong>를 클릭하고, 본인 구글 이메일을 입력하여 추가합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200">
        💡 <strong>핵심 팁:</strong> Google의 복잡한 외부 검수 심사를 받지 않아도, 테스트 사용자에 등록된 본인 계정은 모든 기능을 영구적으로 무료 사용하실 수 있습니다.
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-sky-500 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">OAuth 클라이언트 ID 발급 및 리디렉션 URI 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 <strong>[사용자 인증 정보] → [+ 사용자 인증 정보 만들기] → [OAuth 클라이언트 ID]</strong>를 클릭합니다. 애플리케이션 유형으로 <strong>"웹 애플리케이션"</strong>을 선택하고 아래 주소를 등록합니다:
      </p>
      <div class="space-y-2 mb-3">
        <div>
          <span class="text-xs text-subtext block mb-1">승인된 JavaScript 원본:</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-sky-300 select-all break-all">
            https://www.buylife.xyz
          </div>
        </div>
        <div>
          <span class="text-xs text-subtext block mb-1">승인된 리디렉션 URI:</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-sky-300 select-all break-all">
            https://www.buylife.xyz/api/auth/callback/google
          </div>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        🎉 <strong>완료:</strong> 화면에 표시되는 <strong>클라이언트 ID</strong>와 <strong>클라이언트 보안 비밀번호</strong>를 복사하여 AIMaster 설정에 등록하시면 구글 워크스페이스 연동이 완료됩니다!
      </div>
    </div>
  </div>

  <!-- 트러블슈팅 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
    <div class="text-amber-400 font-bold text-sm flex items-center gap-2">
      <span>💡</span>
      <span>자주 막히는 곳 & 해결법</span>
    </div>
    <div class="text-xs text-white/80 space-y-2">
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <strong class="text-sky-300">Q. 로그인 창에서 "Google에서 확인하지 않은 앱" 경고가 떠요.</strong>
        <p class="text-subtext mt-1">내가 직접 만든 개인용 앱이므로 정상적인 화면입니다. 좌측 하단 <strong>[고급] → [앱 이름(으)로 이동(안전하지 않음)]</strong>을 클릭하여 권한을 승인하시면 정상 연결됩니다.</p>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <strong class="text-sky-300">Q. "오류 400: redirect_uri_mismatch"가 나와요.</strong>
        <p class="text-subtext mt-1">Google Cloud 콘솔의 [승인된 리디렉션 URI]에 등록된 주소와 실제 요청 주소가 다른 경우입니다. 끝의 슬래시(/)나 오타가 없는지 확인해 주세요.</p>
      </div>
    </div>
  </div>
</div>
`;

// 2. Google Drive 연동용 OAuth 클라이언트 만들기 (초보자용 단계별 안내)
const googleDriveContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-blue-400 font-bold text-sm mb-2">
      <span>📁</span>
      <span>Google Drive 문서 동기화 OAuth 클라이언트 설정 가이드</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      마크다운 문서 자동화(markdown-studio)에서 작성된 <strong>문서를 본인 Google Drive로 직접 자동 업로드하고 언제든 불러와 양방향 동기화</strong>하기 위한 전용 OAuth 연동 가이드입니다. <strong>클라이언트 비밀번호(Secret) 없이 클라이언트 ID 하나만으로 안전하게 연결</strong>됩니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 5분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-emerald-400">초급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">📂 폴더: <strong class="text-blue-300">마크다운 문서 자동화</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🔑 필요값: <strong class="text-amber-300">Client ID만 (Secret 불필요)</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">Google Cloud Console 접속 및 Google Drive API 사용 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://console.cloud.google.com" target="_blank" class="text-blue-400 font-semibold underline underline-offset-4 hover:text-blue-300">console.cloud.google.com</a>에 접속하여 프로젝트를 선택하거나 새로 만든 후, <strong>[API 및 서비스] → [라이브러리]</strong>에서 <strong>"Google Drive API"</strong>를 검색하여 <strong>[사용]</strong>을 누릅니다.
      </p>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">OAuth 동의 화면 구성 및 테스트 사용자에 내 이메일 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 <strong>[OAuth 동의 화면]</strong>에서 User Type으로 <strong>"외부(External)"</strong>를 선택하고 앱 이름을 입력하여 생성합니다. 그 후 <strong>[테스트 사용자]</strong> 단계에서 본인 구글 이메일을 반드시 추가합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
        💡 <strong>내 계정 전용 앱:</strong> 테스트 사용자에 내 이메일을 등록해 두면 구글 본사의 유료 심사나 복잡한 검증 없이 평생 무료로 개인 드라이브에 안전하게 파일을 올릴 수 있습니다.
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">웹 애플리케이션 클라이언트 생성 및 승인된 JavaScript 원본 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        좌측 <strong>[사용자 인증 정보] → [+ 사용자 인증 정보 만들기] → [OAuth 클라이언트 ID]</strong>를 클릭하고 유형을 <strong>"웹 애플리케이션"</strong>으로 선택합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 mb-3">
        ⚠️ <strong>매우 중요 (리디렉션 URI가 아님!):</strong><br>
        구글 드라이브 연동은 팝업 브라우저 창 방식이므로 <strong>"승인된 리디렉션 URI" 칸은 비워두시고</strong>, 반드시 <strong>"승인된 JavaScript 원본"</strong> 칸에 아래 주소를 입력하셔야 합니다!
      </div>
      <div class="space-y-2 mb-3">
        <span class="text-xs text-subtext block mb-1">승인된 JavaScript 원본 (Origin):</span>
        <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-blue-300 select-all break-all">
          https://www.buylife.xyz
        </div>
        <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-blue-300 select-all break-all">
          https://markdown-studio.buylife.xyz
        </div>
      </div>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">Client ID 저장 및 보관함에서 Google 드라이브 연결</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        생성된 <code class="text-blue-300 font-mono">.apps.googleusercontent.com</code>으로 끝나는 <strong>클라이언트 ID 한 줄 전체</strong>를 복사하여 프로그램의 <strong>[API키등록·플랫폼연동]</strong> 화면의 Google Client ID 칸에 넣고 저장합니다. (비밀번호/Secret은 넣지 않습니다!)
      </p>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 space-y-1">
        <div>🎉 <strong>사용 방법:</strong> 프로그램 좌측 메뉴 <strong>[4. 문서 보관함]</strong> 하단의 Google Drive 카드에서 <strong>[Google에 연결]</strong>을 누른 뒤, 계정을 선택하고 드라이브 접근 체크박스에 체크하시면 <strong>"현재 문서 올리기"</strong> 및 <strong>"Drive 목록 불러오기"</strong>가 자유롭게 가동됩니다!</div>
      </div>
    </div>
  </div>

  <!-- 설정 체크리스트 -->
  <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
    <div class="text-emerald-400 font-bold text-sm flex items-center gap-2">
      <span>✅</span>
      <span>설정 완료 최종 체크리스트</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
      <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">☑️ Google Drive API가 "사용" 상태인가?</div>
      <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">☑️ 테스트 사용자에 내 Gmail이 추가되었는가?</div>
      <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">☑️ <strong>JavaScript 원본</strong>에 주소를 넣었는가?</div>
      <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">☑️ Secret 없이 Client ID만 저장했는가?</div>
    </div>
  </div>
</div>
`;

// 3. 네이버 카페 자동화 - 본인 앱 등록·계정 연동 및 게시판 등록하기
const naverCafeContent = `
<div class="space-y-6">
  <!-- 개요 카드 -->
  <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10">
    <div class="flex items-center gap-2 text-green-400 font-bold text-sm mb-2">
      <span>☕</span>
      <span>네이버 카페 글쓰기 자동화 연동 개요</span>
    </div>
    <p class="text-white/80 text-sm leading-relaxed">
      네이버 카페 자동화(naver-cafe-poster)에서 <strong>내가 가입한 카페나 직접 운영 중인 카페 게시판에 고품질 정보성 글과 이미지를 자동으로 작성 및 예약 발행</strong>하기 위한 네이버 공식 개발자 센터 앱 등록 가이드입니다. <strong>네이버 공식 아이디 로그인 방식으로 100% 무료 연동</strong>됩니다.
    </p>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">⏱ 소요시간: <strong class="text-white">약 4분</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">🎯 난이도: <strong class="text-amber-300">중급</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">☕ 필수 권한: <strong class="text-green-300">카페 글쓰기 (cafe)</strong></div>
      <div class="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-subtext">💳 비용: <strong class="text-emerald-400">100% 무료</strong></div>
    </div>
  </div>

  <!-- 단계별 스텝 가이드 -->
  <div class="space-y-4">
    <!-- Step 1 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-green-500 text-white font-black text-xs flex items-center justify-center shadow-md">1</span>
        <h3 class="text-white font-bold text-base">네이버 개발자 센터 접속 및 애플리케이션 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <a href="https://developers.naver.com/apps/#/register" target="_blank" class="text-green-400 font-semibold underline underline-offset-4 hover:text-green-300">developers.naver.com/apps/#/register</a>에 네이버 계정으로 로그인한 뒤, <strong>[Application 등록]</strong>을 클릭합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 space-y-1">
        <div>📌 <strong>애플리케이션 이름:</strong> 식별하기 쉬운 이름 (예: <span class="font-mono text-green-300">MyCafePoster</span>) 입력</div>
      </div>
    </div>

    <!-- Step 2 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-green-500 text-white font-black text-xs flex items-center justify-center shadow-md">2</span>
        <h3 class="text-white font-bold text-base">사용 API로 "네이버 로그인" 선택 및 카페 글쓰기 권한 설정</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        <strong>사용 API</strong> 드롭다운에서 <strong>"네이버 로그인"</strong>을 선택한 후, 아래 권한 항목을 필수로 체크합니다:
      </p>
      <div class="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-200 space-y-1.5 font-sans">
        <div>• <strong>카페(Cafe) 글쓰기:</strong> <strong class="text-white">[필수]</strong> 체크 (자동 글 작성을 위한 핵심 권한)</div>
        <div>• <strong>회원 이름 / 이메일 주소:</strong> [필수] 체크 (로그인 식별용)</div>
      </div>
    </div>

    <!-- Step 3 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-green-500 text-white font-black text-xs flex items-center justify-center shadow-md">3</span>
        <h3 class="text-white font-bold text-base">서비스 환경(WEB) 추가 및 서비스 URL / Callback URL 등록</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        하단 <strong>로그인 오픈 API 서비스 환경</strong>에서 <strong>"PC웹"</strong> 또는 <strong>"WEB"</strong> 환경을 추가하고 아래 주소를 복사하여 붙여넣습니다:
      </p>
      <div class="space-y-2 mb-3">
        <div>
          <span class="text-xs text-subtext block mb-1">서비스 URL:</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-green-300 select-all break-all">
            https://www.buylife.xyz
          </div>
        </div>
        <div>
          <span class="text-xs text-subtext block mb-1">네이버 로그인 Callback URL:</span>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-green-300 select-all break-all">
            https://naver-cafe-poster.buylife.xyz/api/auth/callback/naver
          </div>
          <div class="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-green-300 select-all break-all mt-1">
            https://www.buylife.xyz/api/auth/callback/naver
          </div>
        </div>
      </div>
      <p class="text-xs text-subtext">입력 후 맨 아래 [등록하기] 버튼을 누르면 Client ID와 Client Secret이 발급됩니다.</p>
    </div>

    <!-- Step 4 -->
    <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-400/30 transition-all">
      <div class="flex items-center gap-2.5 mb-3">
        <span class="w-7 h-7 rounded-lg bg-green-500 text-white font-black text-xs flex items-center justify-center shadow-md">4</span>
        <h3 class="text-white font-bold text-base">AIMaster 설정에 Client ID/Secret 저장 및 계정 연결</h3>
      </div>
      <p class="text-subtext text-sm leading-relaxed mb-3">
        발급된 <strong>Client ID</strong>와 <strong>Client Secret</strong>을 네이버 카페 자동화 프로그램 설정에 입력하고 저장한 뒤, <strong>[네이버 계정 연결하기]</strong> 버튼을 눌러 권한을 승인합니다.
      </p>
      <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        🎉 <strong>동기화 완료:</strong> 연동이 완료되면 내가 가입된 네이버 카페 목록과 글쓰기 가능한 게시판 목록이 실시간으로 자동 불러와지며, 글 작성 및 예약 등록이 가능해집니다!
      </div>
    </div>
  </div>

  <!-- 주의사항 & 팁 -->
  <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
    <div class="text-amber-400 font-bold text-sm flex items-center gap-2">
      <span>💡</span>
      <span>카페 자동화 필수 확인 사항</span>
    </div>
    <div class="text-xs text-white/80 space-y-2">
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <strong class="text-green-300">Q. 특정 카페의 게시판이 목록에 안 나와요.</strong>
        <p class="text-subtext mt-1">해당 카페에 본인 네이버 계정으로 가입되어 있는지, 그리고 해당 게시판의 글쓰기 등급 권한(가입인사 완료, 등업 여부 등)을 충족했는지 확인해 주세요. 네이버 API 정책상 등급 미달 게시판은 조회가 제한됩니다.</p>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <strong class="text-green-300">Q. 네이버 캡차(CAPTCHA) 방지 팁</strong>
        <p class="text-subtext mt-1">너무 짧은 시간에 연속으로 글을 발행하면 네이버 보안 시스템에 의해 캡차가 발생할 수 있습니다. 프로그램 설정에서 게시 간격을 최소 2~5분 이상의 랜덤 인터벌로 설정해 주시는 것을 권장합니다.</p>
      </div>
    </div>
  </div>
</div>
`;

async function updateGuides() {
  const updates = [
    { id: '523e7401-7393-44f5-ba45-dd437e10fa2d', content: googleOauthCommonContent },
    { id: '7d473e83-e9ce-4f68-ab52-92015a98148e', content: googleDriveContent },
    { id: 'ec45e4bd-fccc-4f14-92e8-3e2df3ced50b', content: naverCafeContent }
  ];

  console.log('총 3개 구글 워크스페이스 & 네이버 카페 가이드 본문 업데이트 시작...');
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
  console.log('3개 가이드 본문 업데이트 완료!');
}

updateGuides();
