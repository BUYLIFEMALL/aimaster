const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SERVICE_KEY = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SERVICE_KEY = line.split('=')[1].trim();
});

const htmlContent = `<p class="mb-4 text-base font-medium text-neutral-300">
  💡 카카오 개발자 센터(Kakao Developers)에서 내 앱을 만들고, 카카오 로그인 및 카카오톡 메시지 전송(나에게 보내기/공유하기)을 연동하는 1단계~7단계 초보자용 안내 매뉴얼입니다.
</p>

<div class="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
  <p class="text-amber-400 font-semibold mb-1">⚠️ 왜 개인별로 카카오 앱을 직접 등록해야 하나요?</p>
  <p class="text-sm text-neutral-300">
    카카오 정책상 "비즈니스 앱" 정식 심사를 거치지 않은 개발 앱은 <strong>테스터로 등록된 계정만</strong> 로그인 및 메시지 발송이 가능합니다. 
    따라서 각자 본인 명의의 카카오 앱(REST API 키)을 등록해서 연결하셔야 정상 작동합니다.
  </p>
</div>

<h3 class="text-lg font-bold text-white mt-6 mb-3">1단계: 카카오 개발자 센터 접속 및 내 앱 생성</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li><a href="https://developers.kakao.com" target="_blank" class="text-sky-400 underline font-semibold">카카오 디벨로퍼스(developers.kakao.com)</a> 접속 ➔ 로그인</li>
  <li>상단 메뉴 <strong>[내 애플리케이션]</strong> ➔ <strong>[애플리케이션 추가하기]</strong> 클릭</li>
  <li><strong>앱 이름</strong>과 <strong>사업자명</strong> 입력 (본인이 구분하기 쉬운 이름으로 자유롭게 입력) ➔ <strong>[저장]</strong> 클릭</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">2단계: 앱 키 (REST API 키) 확인 및 복사</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>생성된 앱 선택 ➔ 왼쪽 메뉴 <strong>[앱 설정]</strong> ➔ <strong>[앱 키]</strong> 이동</li>
  <li>목록 중 <strong>REST API 키</strong> (알파벳+숫자 조합)를 복사해 둡니다. (이 키를 웹 서비스 설정 페이지에 입력하게 됩니다)</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">3단계: 카카오 로그인 활성화 &amp; Redirect URI 설정</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>왼쪽 메뉴 <strong>[제품 설정]</strong> ➔ <strong>[카카오 로그인]</strong> 클릭</li>
  <li>맨 위 <strong>카카오 로그인 활성화 설정</strong> 스위치를 <strong>ON</strong>으로 켜줍니다.</li>
  <li>하단 <strong>Redirect URI</strong> 섹션 ➔ <strong>[Redirect URI 추가]</strong> 버튼 클릭</li>
  <li>연동할 웹 서비스의 리디렉션 주소를 입력하고 <strong>[저장]</strong>을 클릭합니다:
    <div class="my-2 rounded bg-neutral-800 p-2.5 font-mono text-sm text-sky-300 border border-neutral-700 select-all">https://kakaoautoposter.vercel.app/api/kakao/callback</div>
  </li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">4단계: 동의항목 설정 (카카오톡 메시지 전송 권한)</h3>
<ol class="list-decimal list-inside space-y-2 mb-3 text-neutral-300">
  <li>왼쪽 메뉴 <strong>[제품 설정]</strong> ➔ <strong>[카카오 로그인]</strong> ➔ <strong>[동의항목]</strong> 클릭</li>
  <li>항목 중 <strong>[카카오톡 메시지 전송] (talk_message)</strong> 우측의 <strong>[설정]</strong> 클릭</li>
  <li>동의 단계를 <strong>[선택 동의]</strong>로 지정 ➔ 동의 목적 입력 (예: "뉴스레터 및 알림 메시지 발송") ➔ <strong>[저장]</strong></li>
  <li>(선택) <strong>[프로필 정보(닉네임/프로필 사진)]</strong> 항목도 <strong>[동의]</strong>로 설정해 두면 편리합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">5단계: 웹 플랫폼 도메인 등록</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>왼쪽 메뉴 <strong>[앱 설정]</strong> ➔ <strong>[플랫폼]</strong> 클릭</li>
  <li><strong>Web 플랫폼 등록</strong> 버튼 클릭</li>
  <li><strong>사이트 도메인</strong> 입력란에 사용하실 웹 서비스 주소를 입력 후 <strong>[저장]</strong>:
    <div class="my-2 rounded bg-neutral-800 p-2.5 font-mono text-sm text-sky-300 border border-neutral-700 select-all">https://kakaoautoposter.vercel.app</div>
  </li>
</ol>

<div class="my-6 p-4 rounded-xl bg-sky-950/60 border border-sky-800/80">
  <h4 class="text-md font-bold text-sky-300 mb-2">📌 카카오톡 공유하기(SDK) 사용 시 필수 꿀팁!</h4>
  <p class="text-sm text-neutral-300">
    카카오톡 "공유하기" 버튼을 이용하는 프로그램(MBTI 측정기 등)의 경우, 
    <strong>[앱 설정 > 플랫폼 > Web]</strong> 뿐만 아니라 <strong>[제품 설정 > 제품 링크 관리]</strong> 화면의 웹 도메인 목록에도 똑같이 도메인을 등록해주셔야 공유 링크 클릭 시 다른 사이트로 튕기는 현상이 방지됩니다.
  </p>
</div>

<h3 class="text-lg font-bold text-white mt-6 mb-3">6단계: 테스터 계정 등록 (앱 검수 없이 즉시 사용)</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>왼쪽 메뉴 <strong>[앱 설정]</strong> ➔ <strong>[앱 권한]</strong> (또는 <strong>[역할]</strong>) 클릭</li>
  <li><strong>테스터 추가</strong> 클릭 후 본인의 카카오 계정 이메일/ID를 등록합니다.</li>
</ol>

<h3 class="text-lg font-bold text-white mt-6 mb-3">7단계: 웹 서비스 로그인 및 카카오 계정 연결 완료</h3>
<ol class="list-decimal list-inside space-y-2 mb-6 text-neutral-300">
  <li>사용하려는 웹 서비스(예: <code class="text-sky-300">https://kakaoautoposter.vercel.app/settings</code>) 접속 후 로그인</li>
  <li><strong>[🔑 카카오 앱 등록]</strong> 섹션에 2단계에서 복사한 <strong>REST API 키</strong>를 입력하고 저장</li>
  <li><strong>[💛 카카오 로그인으로 받기]</strong> 버튼 클릭 ➔ 카카오 로그인 및 메시지 전송 동의 허용 완료! 🎉</li>
</ol>

<div class="mt-8 p-4 rounded-xl bg-neutral-800/80 border border-neutral-700">
  <h4 class="text-md font-bold text-amber-400 mb-2">💡 핵심 요약 정리</h4>
  <ul class="list-disc list-inside space-y-1 text-sm text-neutral-300">
    <li><strong>1~2단계</strong>: 카카오 앱 생성 후 <code>REST API 키</code> 복사</li>
    <li><strong>3단계</strong>: 카카오 로그인 <code>ON</code> ➔ <code>Redirect URI</code> 등록</li>
    <li><strong>4~5단계</strong>: <code>카카오톡 메시지 전송</code> 동의 설정 ➔ <code>Web 도메인</code> 등록</li>
    <li><strong>7단계</strong>: 웹 서비스 설정 페이지에 REST API 키 입력 후 <code>카카오 로그인</code> 연동</li>
  </ul>
</div>`;

async function insertKakaoGuide() {
  const payload = {
    category: 'SNS',
    title: '카카오 플랫폼 계정 연동하기 (로그인·나에게 보내기·공유하기)',
    content: htmlContent,
    sort_order: 12,
    is_active: true
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_guides`, {
    method: 'POST',
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
    console.error('Insert kakao guide failed:', response.status, errText);
  } else {
    const data = await response.json();
    console.log('Insert kakao guide successful:', data[0]?.id);
  }
}

insertKakaoGuide();
