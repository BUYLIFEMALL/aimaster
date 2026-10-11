-- ==============================================================================
-- 네이버 블로그 올인원 마스터 PRO (naver-blog-allinone v1.04) 프로그램 등록 및 기본 요금제
-- ==============================================================================

with new_program as (
  insert into public.programs (
    category_id,
    required_grade_id,
    name,
    slug,
    short_desc,
    description,
    is_active,
    badges,
    sort_order,
    app_url,
    version,
    extension_version,
    extension_download_url
  )
  values (
    (select id from public.categories where slug = 'naver' limit 1),
    (select id from public.member_grades where slug = 'basic' limit 1),
    '네이버 블로그 올인원 마스터 PRO',
    'naver-blog-allinone',
    'E-E-A-T 주제 기획부터 맛집/여행 비전 분석, 키워드 파이터 PRO, 스마트에디터 ONE 서식 생성까지 올인원 블로깅',
    '네이버 블로그 0.1% 상위노출을 위한 올인원 AI 마스터입니다. 5대 E-E-A-T 주제 발굴 엔진, 스마트폰 촬영 사진을 AI가 직접 보고 쓰는 맛집/카페/여행 멀티모달 비전 분석, 실시간 최신 뉴스 및 자동완성 키워드 파이터 PRO, 네이버 스마트에디터 ONE 인라인 스타일 HTML 서식 및 티스토리·워드프레스용 마크다운 동시 생성을 지원합니다. 모든 기능은 회원 본인의 Google Gemini API 키로 안전하게 구동됩니다.',
    true,
    array['new', 'best']::text[],
    (select coalesce(max(sort_order), 0) + 1 from public.programs),
    'https://naver-blog-allinone.buylife.xyz',
    'v1.04',
    'v1.04',
    'https://naver-blog-allinone.buylife.xyz/downloads/naver-blog-allinone-latest.zip'
  )
  on conflict (slug) do update set
    name = excluded.name,
    short_desc = excluded.short_desc,
    description = excluded.description,
    app_url = excluded.app_url,
    version = excluded.version,
    extension_version = excluded.extension_version,
    extension_download_url = excluded.extension_download_url,
    is_active = excluded.is_active,
    badges = excluded.badges,
    updated_at = now()
  returning id
), target_program as (
  select id from new_program
  union all
  select id from public.programs where slug = 'naver-blog-allinone'
  limit 1
)
insert into public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select t.id, plan.name, plan.billing_type, plan.price, plan.original_price, true, plan.sort_order
from target_program t
cross join (values
  ('1개월'::text, 'monthly'::text, 10000, 10000, 1),
  ('2개월'::text, 'bimonthly'::text, 20000, 20000, 2),
  ('3개월'::text, 'quarterly'::text, 30000, 30000, 3)
) as plan(name, billing_type, price, original_price, sort_order)
where not exists (
  select 1 from public.pricing_plans existing
  where existing.program_id = t.id
);
