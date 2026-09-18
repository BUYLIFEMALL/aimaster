const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SERVICE_KEY = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SERVICE_KEY = line.split('=')[1].trim();
});

const htmlContent = `<p class="mb-4 text-base font-medium text-neutral-300">
  💡 Meta 앱 검수(App Review) 없이 본인 계정에서 인스타그램 피드/릴스 자동 포스팅 시스템을 구축하는 1단계~8단계 전체 매뉴얼입니다.
</p>

<h3 class="text-lg font-bold text-white mt-6 mb-3">📋 [사전 준비] 인스타그램 계정 상태 확인</h3>
<p class="text-amber-400 font-semibold mb-2">⚠️ 개인 계정은 인스타그램 API 정책상 자동 포스팅이 불가능합니다.</p>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><strong>프로페셔널 계정 전환</strong>: 본인 스마트폰 인스타그램 앱 ➔ <code>프로필</code> ➔ <code>설정 및 개인정보</code> ➔ <code>계정 유형 및 도구</code> 이동 ➔ <strong>프로페셔널 계정(비즈니스 또는 크리에이터)</strong>으로 전환합니다.</li>
  <li><strong>Facebook 페이지 연결</strong>: 인스타그램 계정을 본인의 <strong>Facebook 페이지(Page)</strong>와 연결해 둡니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">1단계: 내 앱 추가 (Meta Developer Portal)</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><a href="https://developers.facebook.com/" target="_blank" class="text-sky-400 underline">Meta Developer Portal</a> 접속 ➔ 로그인</li>
  <li>우측 상단 <strong>[내 앱]</strong> ➔ <strong>[앱 만들기]</strong> (또는 기존 연동할 앱 선택) 클릭</li>
  <li>앱 유형을 <strong>비즈니스(Business)</strong>용으로 선택 후 앱 생성을 완료합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">2단계: 필수 권한(Permissions) 추가</h3>
<ol class="list-decimal list-inside space-y-2 mb-3 text-neutral-300">
  <li>앱 대시보드 ➔ 왼쪽 메뉴 <strong>[이용 사례]</strong> (또는 제품) ➔ <strong>비즈니스용 Facebook / Instagram API</strong> 선택</li>
  <li><strong>[권한 및 기능]</strong> 탭에서 아래 자동 포스팅 필수 권한들이 추가되어 있는지 확인하고 클릭하여 추가합니다:</li>
</ol>
<ul class="list-disc list-inside space-y-1 mb-6 pl-4 text-neutral-300">
  <li>🟢 <code>instagram_basic</code> 또는 <code>instagram_business_basic</code> (기본 비즈니스 정보 액세스)</li>
  <li>🟢 <code>instagram_content_publish</code> (⭐ <strong>인스타 자동 포스팅 핵심 권한!</strong>)</li>
  <li>🟢 <code>pages_read_engagement</code> (연결된 Facebook 페이지 권한 확인)</li>
  <li>🟢 <code>pages_show_list</code> (Facebook 페이지 목록 표시)</li>
</ul>

<h3 class="text-lg font-bold text-white mt-6 mb-3">3단계: 앱 역할 및 테스터 추가 (앱 검수 없이 바로 쓰기!)</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>앱 대시보드 ➔ <strong>[앱 역할]</strong> ➔ <strong>[역할]</strong> 메뉴로 이동합니다.</li>
  <li><strong>Instagram 테스터</strong> 및 <strong>Facebook 테스터</strong> 세션에서 <strong>[테스터 추가]</strong> 버튼을 클릭합니다.</li>
  <li>연동하여 사용할 본인의 계정 아이디를 등록합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">4단계: 웹훅(Webhook) 설정</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>앱 대시보드 ➔ <strong>[웹훅]</strong> 메뉴로 이동합니다.</li>
  <li><strong>콜백 URL (Callback URL)</strong> 입력란에 아래 자동 포스팅 웹훅 주소를 입력합니다:
    <div class="my-2 rounded bg-neutral-800 p-2.5 font-mono text-sm text-sky-300 border border-neutral-700 select-all">https://insta-auto-poster-red.vercel.app/api/instagram/callback</div>
  </li>
  <li><strong>인증 토큰 (Verify Token)</strong>: <code>insta-auto-poster</code> Vercel 환경변수에 지정된 <code>INSTAGRAM_VERIFY_TOKEN</code> (보안 비밀키)을 입력 후 <strong>[확인 및 저장]</strong>을 클릭합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">5단계: 비즈니스 로그인 설정</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>왼쪽 메뉴 <strong>[비즈니스용 Facebook]</strong> ➔ <strong>[설정]</strong>으로 이동합니다.</li>
  <li><strong>유효한 OAuth 리디렉션 URI</strong> 칸에 아래 주소를 입력합니다:
    <div class="my-2 rounded bg-neutral-800 p-2.5 font-mono text-sm text-sky-300 border border-neutral-700 select-all">https://insta-auto-poster-red.vercel.app/api/instagram/callback</div>
  </li>
  <li>하단의 <strong>[변경사항 저장]</strong>을 클릭합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">6단계: 리다이렉트 URL 설정 (프로그램별 3가지 구분)</h3>
<p class="mb-3 text-neutral-300">💡 <strong>사용하는 프로그램 종류에 따라 올바른 메뉴 위치에 URL을 등록해 주어야 합니다.</strong></p>
<div class="overflow-x-auto mb-6">
  <table class="w-full text-left text-sm text-neutral-300 border border-neutral-700 rounded-lg overflow-hidden border-collapse">
    <thead class="bg-neutral-800 text-white font-bold border-b border-neutral-700">
      <tr>
        <th class="p-3 border-r border-neutral-700">기능 / 연동 종류</th>
        <th class="p-3 border-r border-neutral-700">설정 메뉴 경로</th>
        <th class="p-3">사용 프로그램 예시 및 리디렉션 URL</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-neutral-800">
      <tr class="bg-neutral-900/50">
        <td class="p-3 font-semibold text-white border-r border-neutral-800">비즈니스용 Facebook 로그인</td>
        <td class="p-3 border-r border-neutral-800">비즈니스용 Facebook ➔ 설정 ➔ 유효한 OAuth 리디렉션 URI</td>
        <td class="p-3"><strong>insta_auto_poster (인스타 자동 포스팅)</strong><br><code class="text-sky-300">https://insta-auto-poster-red.vercel.app/api/instagram/callback</code></td>
      </tr>
      <tr>
        <td class="p-3 font-semibold text-white border-r border-neutral-800">Instagram 로그인 (Instagram API)</td>
        <td class="p-3 border-r border-neutral-800">이용 사례 ➔ Instagram API ➔ 설정 ➔ 유효한 OAuth 리디렉션 URI</td>
        <td class="p-3"><strong>instagram-dm-reply (DM 자동 답변)</strong><br><strong>instagram-comment-reply (댓글 자동 답글)</strong></td>
      </tr>
      <tr class="bg-neutral-900/50">
        <td class="p-3 font-semibold text-white border-r border-neutral-800">Threads API 액세스</td>
        <td class="p-3 border-r border-neutral-800">이용 사례 ➔ Threads API 액세스 ➔ 설정 ➔ 리디렉션 클릭 URL</td>
        <td class="p-3"><strong>threads (쓰레드 자동 포스팅)</strong><br><strong>threads-comment-reply (쓰레드 댓글)</strong><br><strong>threads-affiliate-poster (쓰레드 제휴)</strong></td>
      </tr>
    </tbody>
  </table>
</div>

<h3 class="text-lg font-bold text-white mt-6 mb-3">7단계: 인스타그램 앱 내 테스터 승인 (📱 스마트폰 설정)</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>스마트폰에서 <strong>Instagram 앱</strong> 실행 ➔ <code>프로필</code> ➔ 우측 상단 <strong>[ ☰ 메뉴 ]</strong> 클릭</li>
  <li><strong>[설정 및 개인정보]</strong> ➔ <strong>[웹사이트 권한]</strong> ➔ <strong>[앱 및 웹사이트]</strong> 이동</li>
  <li><strong>테스터 초대</strong> 탭으로 가서 <strong>[승인]</strong>을 클릭합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">8단계: 플랫폼 웹 서비스 로그인 &amp; 최종 연동 완료</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><strong>[인스타그램 자동 포스팅 웹사이트 (https://insta-auto-poster-red.vercel.app)]</strong> 접속 ➔ 로그인</li>
  <li><strong>[Facebook으로 로그인]** 버튼 클릭</li>
  <li>포스팅을 게시할 <strong>Facebook 페이지</strong> 및 연결된 <strong>Instagram 비즈니스 계정</strong> 선택</li>
  <li>요청하는 모든 미디어 게시 권한(<code>instagram_content_publish</code>) 허용 동의 후 완료!</li>
  <li>웹 프로그램 대시보드에서 <strong>[자동 포스팅 봇 활성화]</strong> 스위치를 ON으로 켜면 완료됩니다. 🎉</li>
</ol>

<div class="mt-8 p-4 rounded-xl bg-neutral-800/80 border border-neutral-700">
  <h4 class="text-md font-bold text-amber-400 mb-2">💡 핵심 요약 정리</h4>
  <ul class="list-disc list-inside space-y-1 text-sm text-neutral-300">
    <li><strong>3단계 &amp; 5단계</strong>: OAuth 리디렉트 URL 입력 (<code class="text-sky-300">https://insta-auto-poster-red.vercel.app/api/instagram/callback</code>)</li>
    <li><strong>4단계</strong>: Webhooks 콜백 URL 및 인증 토큰 입력</li>
    <li><strong>5단계 &amp; 7단계</strong>: <strong>Instagram 테스터</strong>에 내 인스타 아이디 추가 ➔ 인스타 앱에서 테스터 승인</li>
  </ul>
</div>`;

async function updateGuideHTML() {
  const payload = {
    content: htmlContent,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_guides?id=eq.6cdae259-b9d2-45ae-9c21-e5f498f78956`, {
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
    console.error('Update failed:', response.status, errText);
  } else {
    const data = await response.json();
    console.log('Update successful:', data[0]?.id);
  }
}

updateGuideHTML();
