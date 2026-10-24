-- 블로그 병합 묶음 C (2026-10-24, 주인님 승인): 작업실에서 옮긴 분석 3종을 기록에 저장할 수 있게 허용 값만 추가.
-- 표·RLS·30일 정리·기존 행은 그대로. 운영 DB ref esgxyikcnnvmlhygjkth.
alter table public.blog_keyword_reports drop constraint if exists blog_keyword_reports_feature_check;
alter table public.blog_keyword_reports add constraint blog_keyword_reports_feature_check
  check (feature in ('autocomplete','related','blogs','competition','recommend','sustainable','news','trend','prompt','discover','surge','benchmark'));
