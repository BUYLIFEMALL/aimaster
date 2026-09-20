const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SERVICE_KEY = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SERVICE_KEY = line.split('=')[1].trim();
});

const htmlContent = `<p class="mb-4 text-base font-medium text-neutral-300">
  💡 Meta 앱 검수(App Review) 없이 본인 계정에서 쓰레드(Threads) 자동 포스팅 및 댓글 관리 시스템을 구축하는 1단계~7단계 연동 매뉴얼입니다.
</p>

<div class="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
  <p class="text-amber-400 font-semibold mb-1">⚠️ 앱 ID 입력 시 필수 확인 사항!</p>
  <p class="text-sm text-neutral-300">
    Meta 개발자 대시보드의 메인 [앱 ID]가 아니라, 대시보드 하단 <strong>[Threads API 액세스]</strong> 이용 사례 섹션에 표시된 
    <strong class="text-amber-300">Threads 앱 ID</strong> 및 <strong class="text-amber-300">Threads 앱 시크릿 코드</strong>를 입력해주셔야 쓰레드 계정 연동 오류가 나지 않습니다.
  </p>
</div>

<h3 class="text-lg font-bold text-white mt-6 mb-3">1단계: Meta 개발자 센터에서 앱 만들기</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><a href="https://developers.facebook.com/" target="_blank" class="text-sky-400 underline font-semibold">Meta Developer Portal</a> 접속 ➔ 로그인</li>
  <li>우측 상단 <strong>[내 앱]</strong> ➔ <strong>[앱 만들기]</strong> 클릭</li>
  <li>앱 유형을 <strong>비즈니스(Business)</strong>로 선택하고 생성 완료</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">2단계: Threads API 액세스 이용 사례 추가</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>앱 대시보드 ➔ 왼쪽 메뉴 <strong>[이용 사례]</strong> (또는 제품 추가) 클릭</li>
  <li><strong>Threads API 액세스</strong> 이용 사례를 선택하고 추가합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">3단계: Threads 앱 ID &amp; Threads 앱 시크릿 코드 확인 및 등록</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>왼쪽 메뉴 <strong>[앱 설정] ➔ [기본 설정]</strong>으로 이동합니다.</li>
  <li>화면을 아래로 내려 <strong>Threads 앱 ID</strong> 및 <strong>Threads 앱 시크릿 코드</strong>를 복사합니다.</li>
  <li>복사한 두 값을 본인 사용 프로그램의 설정 페이지(API키등록·플랫폼연동)에 입력하고 저장합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">4단계: 리다이렉트 (OAuth Callback) URL 설정</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>왼쪽 메뉴 <strong>[이용 사례] ➔ [Threads API 액세스] ➔ [설정]</strong>으로 이동합니다.</li>
  <li><strong>리디렉션 클릭 URL</strong> 칸에 사용하는 쓰레드 프로그램의 콜백 주소를 추가하고 저장합니다:
    <div class="my-2 rounded bg-neutral-800 p-2.5 font-mono text-sm text-sky-300 border border-neutral-700 select-all">https://threads-affiliate-poster.vercel.app/api/threads/callback</div>
  </li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">5단계: 필수 권한(Permissions) 확인</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><strong>[Threads API 액세스] ➔ [권한 및 기능]</strong> 이동</li>
  <li>필수 권한 동의 여부 확인: <code>threads_basic</code>, <code>threads_content_publish</code> (포스팅용) 및 <code>threads_read_replies</code>, <code>threads_manage_replies</code> (댓글용)</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">6단계: 테스터 계정 추가 (스마트폰 초대 승인)</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>Meta 대시보드 ➔ <strong>[앱 역할] ➔ [역할]</strong> ➔ <strong>Instagram 테스터</strong> 추가 ➔ 본인 쓰레드/인스타 계정 등록</li>
  <li>스마트폰 인스타그램 앱 ➔ <code>설정</code> ➔ <code>웹사이트 권한</code> ➔ <code>앱 및 웹사이트</code> ➔ <code>테스터 초대</code> ➔ <strong>[승인]</strong></li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">7단계: 웹 서비스 접속 &amp; Threads 계정 연결 완료</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>쓰레드 자동화 웹사이트 접속 ➔ <strong>[Threads 계정 연결]</strong> 클릭</li>
  <li>로그인 및 모든 게시/관리 권한 동의 허용 완료! 🎉</li>
</ol>

<div class="mt-8 p-4 rounded-xl bg-neutral-800/80 border border-neutral-700">
  <h4 class="text-md font-bold text-amber-400 mb-2">💡 핵심 요약 정리</h4>
  <ul class="list-disc list-inside space-y-1 text-sm text-neutral-300">
    <li><strong>앱 ID 구별</strong>: 메인 앱 ID가 아닌 <code class="text-sky-300">Threads 앱 ID</code>와 <code class="text-sky-300">Threads 앱 시크릿 코드</code>를 입력하셔야 합니다.</li>
    <li><strong>리다이렉트 URL</strong>: Threads API 액세스 설정 메뉴의 <code class="text-sky-300">리디렉션 클릭 URL</code>에 주소를 입력해야 합니다.</li>
    <li><strong>테스터 승인</strong>: 내 계정을 테스터로 추가 후 스마트폰 인스타그램 앱에서 초대를 승인해야 검수 없이 즉시 동작합니다.</li>
  </ul>
</div>`;

async function updateThreadsGuideDb() {
  const payload = {
    content: htmlContent,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_guides?id=eq.343996d3-8c77-455d-9bd4-54bcd47a34cd`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Update threads guide failed:', response.status, errText);
  } else {
    const data = await response.json();
    console.log('Update threads guide successful:', data[0]?.id);
  }
}

updateThreadsGuideDb();
