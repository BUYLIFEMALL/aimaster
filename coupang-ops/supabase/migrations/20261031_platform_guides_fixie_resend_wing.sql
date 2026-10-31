-- 공개 연동 매뉴얼 3건(2026-10-31 주인님 승인). 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 같은 제목이 있으면 넣지 않는다.
insert into platform_guides (title, category, content, sort_order, is_active)
select v.title, v.category, v.content, v.sort_order, true
from (values
('Fixie 고정 IP 만들기 (쿠팡 WING 연동용)', '이커머스', $g$<div class="space-y-4">
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">왜 필요한가요?</h3><p class="text-subtext text-sm leading-relaxed">쿠팡 WING은 등록한 IP에서 온 요청만 받습니다. 프로그램 서버는 나가는 IP가 바뀌므로, 항상 같은 IP로 내보내 주는 Fixie를 회원 본인 계정으로 씁니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">1. 가입하고 프록시 만들기</h3><p class="text-subtext text-sm leading-relaxed"><a href="https://usefixie.com/" target="_blank" class="text-sky-300 font-semibold underline">Fixie 사이트</a>에서 가입하고 HTTP/HTTPS용 프록시를 만듭니다. 무료 요금은 월 500회입니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">2. 주소와 고정 IP 확인</h3><p class="text-subtext text-sm leading-relaxed"><a href="https://app.usefixie.com/" target="_blank" class="text-sky-300 font-semibold underline">Fixie 대시보드</a>에서 프록시 주소와 고정 IP 2개를 확인합니다. 주소 모양: <code>http://fixie:토큰@내주소.usefixie.com:80</code></p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">3. 프로그램에 등록</h3><p class="text-subtext text-sm leading-relaxed">프로그램의 「API키등록·플랫폼연동」 고정 IP 칸에 주소를 넣고 저장합니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">4. WING에 IP 등록 후 연결 시험</h3><p class="text-subtext text-sm leading-relaxed">WING 「판매자정보 → 추가판매정보 → OPEN API 키 발급 → 연동 정보 수정」에서 연동 방식 「자체개발」을 고르고 IP 2개를 하나씩 추가합니다. 반영까지 30분~1시간 걸릴 수 있습니다.</p></div>
<div class="p-4 rounded-xl border border-amber-400/30 bg-amber-400/10 text-sm text-amber-100">⚠️ 프록시 주소에는 비밀 토큰이 들어 있습니다. 다른 사람에게 보여 주지 마세요. 호출이 월 500회를 넘으면 Fixie에서 요금제를 올려야 합니다.</div>
</div>$g$, 'x', 90),
('Resend 메일 API 키 발급받기', '메신저 | 알림', $g$<div class="space-y-4">
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">1. Resend 가입</h3><p class="text-subtext text-sm leading-relaxed"><a href="https://resend.com/signup" target="_blank" class="text-sky-300 font-semibold underline">Resend 가입 화면</a>에서 가입합니다. 가입한 메일이 받는 주소가 됩니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">2. API 키 만들기</h3><p class="text-subtext text-sm leading-relaxed"><a href="https://resend.com/api-keys" target="_blank" class="text-sky-300 font-semibold underline">API Keys 화면</a>에서 Create API Key를 누르고 권한을 Sending access로 고릅니다. <code>re_</code>로 시작하는 키를 복사합니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">3. 프로그램에 등록</h3><p class="text-subtext text-sm leading-relaxed">프로그램의 메일 칸에 키와 받는 주소를 넣고 저장합니다. 한 번 등록한 키는 같은 키를 쓰는 다른 프로그램에서도 그대로 쓰입니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">4. 시험 메일 보내기</h3><p class="text-subtext text-sm leading-relaxed">시험 메일을 보내 받은편지함과 스팸함을 확인합니다.</p></div>
<div class="p-4 rounded-xl border border-amber-400/30 bg-amber-400/10 text-sm text-amber-100">⚠️ 무료 요금은 하루 100통이고, Resend에 가입한 본인 메일로만 받을 수 있습니다. 다른 주소로 받으려면 Resend에서 도메인을 인증해야 합니다.</div>
</div>$g$, 'x', 91),
('쿠팡 WING Open API 키 발급받기', '이커머스', $g$<div class="space-y-4">
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">1. 키 발급 화면 열기</h3><p class="text-subtext text-sm leading-relaxed"><a href="https://wing.coupang.com" target="_blank" class="text-sky-300 font-semibold underline">쿠팡 WING</a>에 로그인하고 「판매자정보 → 추가판매정보 → OPEN API 키 발급」으로 갑니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">2. 값 4개 확인</h3><p class="text-subtext text-sm leading-relaxed">업체코드(A로 시작), Access Key, Secret Key, WING 로그인 ID를 확인합니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">3. 연동 방식과 IP 등록</h3><p class="text-subtext text-sm leading-relaxed">「연동 정보 → 수정」에서 연동 방식을 「자체개발」로 고르고, 내 Fixie 고정 IP 2개를 하나씩 추가합니다.</p></div>
<div class="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><h3 class="text-white font-bold text-base mb-2">4. 프로그램에 등록하고 연결 시험</h3><p class="text-subtext text-sm leading-relaxed">프로그램의 「API키등록·플랫폼연동」에 값 4개를 저장하고 연결 시험을 누릅니다. 출고지·반품지 목록이 나오면 성공입니다.</p></div>
<div class="p-4 rounded-xl border border-amber-400/30 bg-amber-400/10 text-sm text-amber-100">⚠️ 키는 최대 6개월 쓸 수 있어 만료 전에 재발급해야 합니다. 쿠팡은 키 하나에 연동을 한 곳만 허용하므로 다른 셀러툴에 쓰던 키라면 확인해 주세요. 쿠팡 파트너스 키와는 다른 키입니다.</div>
</div>$g$, 'x', 92)
) as v(title, category, content, note, sort_order)
where not exists (select 1 from platform_guides g where g.title = v.title);

select id, title from platform_guides where title in ('Fixie 고정 IP 만들기 (쿠팡 WING 연동용)', 'Resend 메일 API 키 발급받기', '쿠팡 WING Open API 키 발급받기') or title like '카카오 플랫폼 계정 연동%';
