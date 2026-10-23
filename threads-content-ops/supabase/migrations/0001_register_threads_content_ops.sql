-- Threads 콘텐츠 운영 자동화(PC 앱) 프로그램·기본 요금제 등록
-- 2026-10-05 운영 DB 반영 완료. 출시 전까지 is_active=false를 유지한다.

with registered_program as (
  insert into public.programs (
    category_id,
    name,
    slug,
    short_desc,
    description,
    thumbnail_url,
    video_url,
    images,
    is_active,
    sort_order,
    required_grade_id,
    app_url,
    badges,
    version
  )
  values (
    'c188201d-6e04-4887-b4f9-e60936386bd1',
    'Threads 콘텐츠 운영 자동화 (PC 앱)',
    'threads-content-ops',
    '여러 Threads 계정의 콘텐츠 초안, 검토, 예약과 발행 이력을 Windows 앱에서 안전하게 운영합니다.',
    'AIMaster 계정과 연결한 Windows 데스크톱 앱에서 여러 Threads 계정의 콘텐츠 초안을 만들고 검토하며, 명시적으로 설정한 예약과 발행 이력을 관리합니다. AI API 키와 Meta Developers Threads 앱 자격증명은 회원 본인의 것만 연결해 사용합니다.',
    null,
    'https://www.youtube.com/watch?v=MGm4M3eEQWA&t=3714s',
    '{}',
    false,
    5,
    '861b7a37-d056-4404-80f5-85edb2e2ebff',
    'https://www.buylife.xyz/threads-content-ops',
    '{new}',
    'v1.01'
  )
  on conflict (slug) do update set
    name = excluded.name,
    short_desc = excluded.short_desc,
    description = excluded.description,
    video_url = excluded.video_url,
    app_url = excluded.app_url,
    badges = excluded.badges,
    version = excluded.version,
    updated_at = now()
  returning id
)
insert into public.pricing_plans (
  program_id,
  name,
  billing_type,
  price,
  original_price,
  is_active,
  sort_order
)
select registered_program.id, plans.name, plans.billing_type, plans.price, plans.original_price, true, plans.sort_order
from registered_program
cross join (
  values
    ('1개월', 'monthly', 10000, 10000, 1),
    ('2개월', 'bimonthly', 20000, 20000, 2),
    ('3개월', 'quarterly', 30000, 30000, 3)
) as plans(name, billing_type, price, original_price, sort_order)
where not exists (
  select 1
  from public.pricing_plans existing
  where existing.program_id = registered_program.id
    and existing.billing_type = plans.billing_type
);
