-- AI 음악 스튜디오(ai-music-studio) 프로그램 등록 — 2026-10-23 v1.01 (Claude Code 윈도우)
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. 주인님 결정(2026-10-23): 이름 「AI 음악 스튜디오」, 음악(SUNO)자동화는 Suno 전용 독립 프로그램으로 유지.
-- 카테고리·최소 등급은 음악(SUNO)자동화(music-automation)와 같게, FREE 배지 없음(권한 부여 방식).
-- 상세 소개 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md (굵은 한 줄 소개 + 기능 단락 + 본인 키·주의 단락)
insert into public.programs(name,slug,short_desc,description,category_id,required_grade_id,is_active,sort_order,app_url,badges,version,detail_sections)
select 'AI 음악 스튜디오','ai-music-studio',
'Lyria·ElevenLabs·Suno 등 여러 AI로 노래·배경음악을 만들고 나란히 들어 비교하는 음악 스튜디오입니다.',
$desc$<p>🎧 <strong>Google Lyria·ElevenLabs·Suno·MiniMax·Stable Audio 같은 여러 음악 AI를 한 화면에서 골라 노래와 배경음악을 만들고, 같은 설명으로 만든 결과를 나란히 들어 비교하는 음악 스튜디오입니다.</strong></p><p>🎼 곡 설명과 장르·분위기를 적고 보컬곡·연주곡, 언어, 길이를 고르면 됩니다. 가사는 직접 쓰거나 AI 가사 쓰기로 [Verse]·[Chorus] 구조까지 갖춘 가사를 받아 고쳐 쓸 수 있습니다.</p><p>⚖️ 모델 비교에서는 같은 설명을 최대 3개 모델에 한 번에 보내 결과를 나란히 듣고 마음에 드는 곡을 고릅니다. 모델 카드마다 보컬 지원·최대 길이·대략 비용·상업 이용 조건을 보여 주고, 만들기 전에 예상 비용을 알려 줍니다.</p><p>📁 완성된 곡은 내 보관함에 모여 바로 듣고 MP3로 내려받을 수 있고, 가사 영상·플레이리스트 영상 프로그램으로 이어서 쓸 수 있습니다.</p><p>🔑 음악 생성은 회원 본인의 Gemini·ElevenLabs·sunoapi.org·fal·Replicate API 키로 동작하며 비용은 본인 계정에 청구됩니다. 곡은 만든 지 30일 뒤 자동 삭제되니 오래 둘 곡은 내려받아 주세요. 만든 음악의 이용 조건은 각 플랫폼 정책을 따릅니다.</p>$desc$,
m.category_id, m.required_grade_id, true, (select coalesce(max(sort_order),0)+1 from public.programs),
'https://ai-music-studio.buylife.xyz', array['new'], 'v1.01',
$json${
 "features":[
  {"icon":"🎛️","title":"여러 음악 AI 한곳에","desc":"Lyria·ElevenLabs·Suno·MiniMax·Stable Audio·ACE-Step을 모델 카드에서 골라 씁니다."},
  {"icon":"⚖️","title":"나란히 듣고 비교","desc":"같은 설명을 최대 3개 모델에 보내 결과를 나란히 듣고 고릅니다."},
  {"icon":"✍️","title":"AI 가사 쓰기","desc":"곡 설명으로 [Verse]·[Chorus] 구조의 가사를 받아 직접 고쳐 씁니다."},
  {"icon":"💰","title":"만들기 전 예상 비용","desc":"모델별 대략 비용과 상업 이용 조건을 보고 고릅니다."}
 ],
 "steps":[
  {"title":"API 키 연결","desc":"쓰려는 음악 AI의 본인 API 키를 한 번 등록합니다."},
  {"title":"곡 설명·가사","desc":"분위기·장르·보컬 여부를 적고 가사를 쓰거나 AI로 받습니다."},
  {"title":"모델 고르고 만들기","desc":"모델 하나로 만들거나 최대 3개 모델로 비교 생성합니다."},
  {"title":"보관함에서 듣기","desc":"완성된 곡을 듣고 내려받거나 영상 프로그램으로 넘깁니다."}
 ],
 "audiences":[
  {"icon":"🎬","title":"영상 배경음악이 필요한 크리에이터","desc":"연주곡 전용 모델로 영상 분위기에 맞는 배경음악을 길이에 맞춰 바로 만듭니다.","points":["연주곡 길이 지정","모델별 비용 비교"]},
  {"icon":"🎤","title":"AI로 노래를 만드는 분","desc":"Suno 하나에 묶이지 않고 Lyria·ElevenLabs·MiniMax 보컬곡까지 같은 가사로 들어 보고 고릅니다.","points":["같은 가사로 여러 모델","가사 구조 자동 작성"]},
  {"icon":"🧪","title":"음악 AI를 비교해 보려는 분","desc":"모델마다 보컬·길이·상업 조건이 정리돼 있어 프로젝트에 맞는 모델을 빠르게 정합니다.","points":["모델 카드 한눈에","결과 나란히 재생"]}
 ]
}$json$::jsonb
from public.programs m
where m.slug='music-automation'
  and not exists (select 1 from public.programs where slug='ai-music-studio');

-- 기본 요금제 3종(1·2·3개월 1만/2만/3만원)
insert into public.pricing_plans(program_id,name,billing_type,price,original_price,is_active,sort_order)
select p.id,v.name,v.billing_type,v.price,v.price,true,v.sort_order
from public.programs p cross join (values('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2))v(name,billing_type,price,sort_order)
where p.slug='ai-music-studio'
  and not exists (select 1 from public.pricing_plans pp where pp.program_id=p.id);

-- VIP(드림AI팀) 등급 자동 부여 체크 — 트리거 grade_program_access_sync가 VIP 회원에게 사용기간을 넣는다. 다른 등급은 주인님이 직접 부여.
insert into public.grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from public.member_grades g, public.programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'ai-music-studio'
on conflict (grade_id, program_id) do update set can_access = true;

-- 시험 계정(일반 회원 권한) 사용기간: music-automation에 부여된 기간을 그대로 복사
insert into public.user_program_access(user_id,program_id,expires_at)
select a.user_id,p.id,a.expires_at
from public.user_program_access a
join public.programs old on old.id=a.program_id
join auth.users u on u.id=a.user_id
cross join public.programs p
where old.slug='music-automation' and p.slug='ai-music-studio' and u.email='buylifemall@naver.com'
  and (a.expires_at is null or a.expires_at>now())
on conflict(user_id,program_id) do nothing;
