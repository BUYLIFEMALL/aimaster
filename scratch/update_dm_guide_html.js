const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SERVICE_KEY = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SERVICE_KEY = line.split('=')[1].trim();
});

const htmlContent = `<p class="mb-4 text-base font-medium text-neutral-300">
  💡 Meta 앱 검수(App Review) 없이 본인 인스타그램 계정에서 댓글 및 DM 자동 응답 시스템을 구축하는 1단계~6단계 전체 매뉴얼입니다.
</p>

<h3 class="text-lg font-bold text-white mt-6 mb-3">📋 [사전 준비] 인스타그램 계정 상태 확인</h3>
<p class="text-amber-400 font-semibold mb-2">⚠️ 개인 계정은 인스타그램 API 정책상 DM 및 댓글 자동화가 불가능합니다.</p>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><strong>프로페셔널 계정 전환</strong>: 본인 스마트폰 인스타그램 앱 ➔ <code>프로필</code> ➔ <code>설정 및 개인정보</code> ➔ <code>계정 유형 및 도구</code> 이동 ➔ <strong>프로페셔널 계정(비즈니스 또는 크리에이터)</strong>으로 전환합니다.</li>
  <li><strong>Facebook 페이지 연결</strong>: 인스타그램 계정을 본인의 <strong>Facebook 페이지(Page)</strong>와 연결해 둡니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">1단계: Meta 개발자 센터에서 Instagram API 추가</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><a href="https://developers.facebook.com/" target="_blank" class="text-sky-400 underline">Meta Developer Portal</a> 접속 ➔ 로그인 ➔ <strong>[내 앱]</strong> 클릭 ➔ 대상 앱(www.buylife.xyz 등) 선택</li>
  <li>왼쪽 메뉴 ➔ <strong>[이용 사례]</strong> (또는 제품 추가) 클릭</li>
  <li><strong>Instagram API</strong> 이용 사례를 추가합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">2단계: 필수 권한(Permissions) 추가 확인</h3>
<ol class="list-decimal list-inside space-y-2 mb-3 text-neutral-300">
  <li>왼쪽 메뉴 ➔ <strong>[이용 사례]</strong> ➔ <strong>[Instagram API]</strong> ➔ <strong>[권한 및 기능]</strong> 클릭</li>
  <li>목록에서 아래 2가지 필수 권한이 추가되어 있는지 확인하고 등록합니다:</li>
</ol>
<ul class="list-disc list-inside space-y-1 mb-6 pl-4 text-neutral-300">
  <li>🟢 <code>instagram_business_basic</code> (기본 비즈니스 정보 액세스)</li>
  <li>🟢 <code>instagram_business_manage_messages</code> (⭐ <strong>DM 관리 핵심 권한!</strong>)</li>
</ul>

<h3 class="text-lg font-bold text-white mt-6 mb-3">3단계: 리다이렉트 URI (OAuth) 설정</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>왼쪽 메뉴 ➔ <strong>[이용 사례]</strong> ➔ <strong>[Instagram API]</strong> ➔ <strong>[설정]</strong> 클릭</li>
  <li><strong>유효한 OAuth 리디렉션 URI</strong> 칸에 아래 주소를 입력하고 저장합니다:
    <div class="my-2 rounded bg-neutral-800 p-2.5 font-mono text-sm text-sky-300 border border-neutral-700 select-all">https://instagram-dm-reply.vercel.app/api/instagram/callback</div>
  </li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">4단계: Webhooks (웹훅) 실시간 알림 설정 (핵심!)</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>같은 <strong>Instagram API ➔ 권한 및 기능</strong> 화면 하단의 <strong>3. Webhooks 구성</strong>으로 이동합니다.</li>
  <li><strong>콜백 URL</strong>: 아래 주소를 정확히 입력합니다.
    <div class="my-2 rounded bg-neutral-800 p-2.5 font-mono text-sm text-sky-300 border border-neutral-700 select-all">https://instagram-dm-reply.vercel.app/api/instagram/dm-webhook/168ac841-2223-4a24-930d-c789cd79c8c9</div>
  </li>
  <li><strong>인증 토큰 (Verify Token)</strong>: <code>instagram-dm-reply</code> Vercel 환경변수에 지정된 <code>INSTAGRAM_VERIFY_TOKEN</code> (보안 비밀키)을 입력 후 <strong>[확인 및 저장]</strong>을 클릭합니다.</li>
  <li><strong>웹훅 필드 구독</strong>: 저장 후 아래 나타나는 Webhook 필드 목록에서 <code>messages</code> (DM 메시지 수신) 항목 우측의 <strong>[구독 (Subscribe)]</strong> 버튼을 클릭합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">5단계: 내 계정을 테스터(Tester)로 등록 (앱 검수 없이 바로 쓰기!)</h3>
<p class="mb-3 text-neutral-300">💡 Meta의 앱 검수(App Review) 절차 없이 본인 인스타 계정에서 즉시 DM 자동화를 쓰기 위한 필수 단계입니다.</p>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>Meta 개발자 센터 왼쪽 메뉴 맨 아래 ➔ <strong>[앱 역할]</strong> ➔ <strong>[역할]</strong> 클릭</li>
  <li><strong>Instagram 테스터</strong> 섹션의 <strong>[Instagram 테스터 추가]</strong> 버튼 클릭 ➔ 본인의 인스타그램 아이디를 검색하여 추가합니다.</li>
  <li><strong>스마트폰 인스타그램 앱 승인 (필수)</strong>:
    <br>본인 스마트폰의 인스타그램 앱 ➔ <code>설정</code> ➔ <code>웹사이트 권한</code> ➔ <code>앱 및 웹사이트</code> ➔ <code>테스터 초대</code> 탭으로 가서 <strong>[승인]</strong>을 누릅니다.
  </li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">6단계: 웹 프로그램에서 로그인 및 봇 켜기</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><strong>[Instagram DM Reply 웹사이트]</strong> 접속 ➔ 로그인</li>
  <li><strong>[인스타그램 계정 연결]</strong> 버튼 클릭 ➔ 로그인 및 권한 승인 완료</li>
  <li>설정 메뉴 ➔ <strong>DM 봇 활성화 (bot_enabled)</strong> 스위치를 <strong>ON(파란색)</strong>으로 켜면 완성입니다! 🎉</li>
</ol>

<div class="mt-8 p-4 rounded-xl bg-neutral-800/80 border border-neutral-700">
  <h4 class="text-md font-bold text-amber-400 mb-2">💡 핵심 요약 정리</h4>
  <ul class="list-disc list-inside space-y-1 text-sm text-neutral-300">
    <li><strong>3단계</strong>: OAuth 리디렉트 URL 입력 (<code class="text-sky-300">/api/instagram/callback</code>)</li>
    <li><strong>4단계</strong>: Webhooks 콜백 URL 및 토큰 입력 ➔ <code>messages</code> 구독</li>
    <li><strong>5단계</strong>: <strong>Instagram 테스터</strong>에 내 인스타 아이디 추가 ➔ 인스타 앱에서 테스터 승인</li>
  </ul>
</div>`;

async function updateDmGuide() {
  const payload = {
    content: htmlContent,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_guides?id=eq.4115e455-1585-4304-89b4-d29859fd7a5a`, {
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
    console.error('Update DM guide failed:', response.status, errText);
  } else {
    const data = await response.json();
    console.log('Update DM guide successful:', data[0]?.id);
  }
}

updateDmGuide();
