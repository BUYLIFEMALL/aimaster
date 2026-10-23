-- DML registration only. User explicitly requested catalog registration before deployment.
-- Keep the preparation notice until actual production deployment is verified.
begin;
insert into public.programs (slug,name,short_desc,description,category_id,required_grade_id,app_url,version,is_active,badges,thumbnail_url)
select 'emotion-writer','감성 글귀 이미지',
  '[운영 준비 중] 글귀와 배경을 골라 한글 이미지를 만들고 PNG·JPG로 저장하세요.',
  '현재 프로그램 등록 단계이며 운영 연결과 배포를 준비 중입니다. 명언·좋은 글, 건강·행복 기원, 카톡·밴드 공유 문구를 본인 API 키로 생성합니다. 직접 입력한 문구도 사용할 수 있습니다. 나노바나나 배경 생성 또는 Pixabay·Pexels 사진 선택, 9:16·1:1·3:4 비율, 한글 글꼴·색·배치 조절, PNG·JPG 저장을 제공합니다. 설정 변경 자체로 AI를 호출하지 않습니다.',
  c.id, reference.required_grade_id,'https://emotion-writer.buylife.xyz','v1.01',true,array['new'],reference.thumbnail_url
from public.categories c cross join public.programs reference
where c.slug='multimedia' and reference.slug='cardnews-studio'
on conflict(slug) do update set name=excluded.name,short_desc=excluded.short_desc,description=excluded.description,app_url=excluded.app_url,version=excluded.version,updated_at=now();
insert into public.pricing_plans (program_id,name,billing_type,price,original_price,is_active,sort_order)
select p.id, plan.name,plan.kind,plan.price,plan.price,true,plan.position
from public.programs p cross join (values
  ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)
) as plan(name,kind,price,position)
where p.slug='emotion-writer' and not exists (select 1 from public.pricing_plans existing where existing.program_id=p.id and existing.billing_type=plan.kind);
commit;
