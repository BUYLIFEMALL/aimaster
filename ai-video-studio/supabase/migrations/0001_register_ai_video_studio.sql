-- AI 영상 스튜디오(ai-video-studio) 프로그램 등록 — 2026-10-23 v1.01 (Claude Code 윈도우)
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. 주인님 결정(2026-10-23): 이름 「AI 영상 스튜디오」, 영상 연동 레퍼런스 프로그램(ai-image-studio의 영상판).
-- 카테고리·최소 등급은 AI 쇼츠 원스톱(shorts-onestop-studio)과 같게, FREE 배지 없음(권한 부여 방식).
-- 상세 소개 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md (굵은 한 줄 소개 + 기능 단락 + 본인 키·주의 단락)
insert into public.programs(name,slug,short_desc,description,category_id,required_grade_id,is_active,sort_order,app_url,badges,version,detail_sections)
select 'AI 영상 스튜디오','ai-video-studio',
'Gemini·Kling·Seedance 등 여러 AI 영상 모델을 본인 키로 골라 영상을 만들고 보관하는 영상 작업실입니다.',
$desc$<p>🎬 <strong>Google Gemini Omni Flash·Kling·Seedance 같은 여러 AI 영상 모델을 한 화면에서 골라, 글만으로 또는 장면 사진으로 짧은 영상을 만드는 영상 작업실입니다.</strong></p><p>✍️ 만들 장면을 한국어로 적고 시네마틱 실사·애니메이션·제품 광고 같은 화풍과 카메라 움직임을 고르면, AI에 보낼 영상 설명이 자동으로 정리됩니다.</p><p>🎛️ 플랫폼과 모델을 고르면 그 모델이 받는 옵션만 나옵니다. 길이와 가로·세로 비율을 정하고, 시작 장면 사진과 끝 장면 사진을 넣으면 두 장면을 잇는 영상이나 루프 영상도 만들 수 있습니다. 만들기 전에 예상 비용을 먼저 보여 줍니다.</p><p>🎞️ 완성 영상은 작업 결과 갤러리에 모여 바로 보고 MP4로 내려받을 수 있습니다. 창을 닫아도 서버가 결과를 받아 저장합니다.</p><p>🔑 영상 생성은 회원 본인의 Gemini·fal·Replicate API 키로 동작하며 비용은 본인 계정에 청구됩니다. 영상은 만든 지 30일 뒤 자동 삭제되니 오래 둘 영상은 내려받아 주세요. 만든 영상의 이용 조건은 각 플랫폼 정책을 따릅니다.</p>$desc$,
m.category_id, m.required_grade_id, true, (select coalesce(max(sort_order),0)+1 from public.programs),
'https://ai-video-studio.buylife.xyz', array['new'], 'v1.01',
$json${
 "features":[
  {"icon":"🎛️","title":"여러 영상 AI 한곳에","desc":"Gemini Omni Flash·Kling·Seedance를 플랫폼과 모델 카드에서 골라 씁니다."},
  {"icon":"🖼️","title":"시작·끝 장면 사진","desc":"사진 한 장을 움직이게 하거나 두 장면을 잇는 영상, 루프 영상을 만듭니다."},
  {"icon":"🎥","title":"화풍·카메라 프리셋","desc":"화풍과 카메라 움직임을 고르면 영상 설명이 자동으로 정리됩니다."},
  {"icon":"💰","title":"만들기 전 예상 비용","desc":"모델·길이에 맞춘 대략 비용을 보고 확인한 뒤 만듭니다."}
 ],
 "steps":[
  {"title":"API 키 연결","desc":"쓰려는 영상 AI의 본인 API 키를 한 번 등록합니다."},
  {"title":"영상 설명","desc":"만들 장면을 적고 화풍·카메라 움직임을 고릅니다."},
  {"title":"모델·옵션 고르고 만들기","desc":"모델과 길이·비율·장면 사진을 정하고 예상 비용을 확인해 만듭니다."},
  {"title":"갤러리에서 보기","desc":"완성 영상을 보고 MP4로 내려받습니다."}
 ],
 "audiences":[
  {"icon":"📱","title":"쇼츠·릴스 영상이 필요한 크리에이터","desc":"세로 9:16 짧은 장면을 글이나 사진 한 장으로 바로 만들어 편집에 씁니다.","points":["세로·가로 비율 선택","글만으로도 생성"]},
  {"icon":"🛍️","title":"제품 홍보 영상을 만드는 판매자","desc":"제품 사진을 시작 장면으로 넣고 제품 광고 화풍으로 움직이는 홍보 컷을 만듭니다.","points":["제품 사진 → 영상","제품 광고 프리셋"]},
  {"icon":"🧪","title":"영상 AI를 써 보려는 분","desc":"모델마다 필요한 사진·길이·대략 비용이 정리돼 있어 내 작업에 맞는 모델을 빠르게 고릅니다.","points":["모델 비교표","만들기 전 비용 확인"]}
 ]
}$json$::jsonb
from public.programs m
where m.slug='shorts-onestop-studio'
  and not exists (select 1 from public.programs where slug='ai-video-studio');

-- 기본 요금제 3종(1·2·3개월 1만/2만/3만원)
insert into public.pricing_plans(program_id,name,billing_type,price,original_price,is_active,sort_order)
select p.id,v.name,v.billing_type,v.price,v.price,true,v.sort_order
from public.programs p cross join (values('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2))v(name,billing_type,price,sort_order)
where p.slug='ai-video-studio'
  and not exists (select 1 from public.pricing_plans pp where pp.program_id=p.id);

-- VIP(드림AI팀) 등급 자동 부여 체크 — 트리거 grade_program_access_sync가 VIP 회원에게 사용기간을 넣는다. 다른 등급은 주인님이 직접 부여.
insert into public.grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from public.member_grades g, public.programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'ai-video-studio'
on conflict (grade_id, program_id) do update set can_access = true;

-- 시험 계정(일반 회원 권한) 사용기간: shorts-onestop-studio에 부여된 기간을 그대로 복사
insert into public.user_program_access(user_id,program_id,expires_at)
select a.user_id,p.id,a.expires_at
from public.user_program_access a
join public.programs old on old.id=a.program_id
join auth.users u on u.id=a.user_id
cross join public.programs p
where old.slug='shorts-onestop-studio' and p.slug='ai-video-studio' and u.email='buylifemall@naver.com'
  and (a.expires_at is null or a.expires_at>now())
on conflict(user_id,program_id) do nothing;
