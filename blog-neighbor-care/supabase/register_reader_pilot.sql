-- Review only. Run only with explicit rollout approval after the reader migration.
-- New program registration; existing programs/members/keys are not rewritten.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$
declare c uuid; g uuid;
begin
  select id into strict c from public.categories where slug='blog';
  select id into strict g from public.member_grades where sort_order=3;
  if exists(select 1 from public.programs where slug='blog-neighbor-care') then
    raise exception 'Program already exists: inspect its current state before registration';
  end if;
  insert into public.programs(category_id,name,slug,short_desc,description,required_grade_id,app_url,badges,
    version,extension_version,extension_download_url,is_active)
  values(c,'AI 블로그 이웃 소통 자동화','blog-neighbor-care',
    '본인 글 읽기 연결 시험 · 전체 이웃 소통 기능은 준비 중',
    '현재는 회원 계정과 확장을 연결해 직접 선택한 본인 글의 제목·본문을 확인 후 전달하는 시험 단계입니다. AI 분석·이웃 신청·공감·댓글·예약 소통은 제공하지 않습니다.',
    g,'https://blog-neighbor-care.buylife.xyz','{coming}', 'v1.01','v1.01',
    'https://blog-neighbor-care.buylife.xyz/downloads/blog-neighbor-care-extension-latest.zip',true);
end $$;
commit;
-- Existing VIP/grade grant triggers may create access rows; inspect their actual results.
