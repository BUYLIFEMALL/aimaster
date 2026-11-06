-- V5 「내 영상 일부 지우기」 실행 기록 넣기 정책(2026-11-06, 추가만 하는 DB 변경).
-- 표 own_content_rights_log는 ai-video-studio/supabase/migrations/0006에서 만들었다(본인 줄 읽기만 허용).
-- video-to-gif는 서버 키 없이 회원 세션으로 기록하므로, 본인 줄·이 프로그램·erase 도구·30일 안 만료만 넣을 수 있게 한다.
-- 대상: ① AIMaster 운영(ref esgxyikcnnvmlhygjkth).

drop policy if exists own_content_rights_log_insert_own_gif on public.own_content_rights_log;
create policy own_content_rights_log_insert_own_gif on public.own_content_rights_log
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and program = 'video-to-gif'
    and tool = 'erase'
    and expires_at <= now() + interval '31 days'
  );
grant insert on public.own_content_rights_log to authenticated;

select policyname, cmd from pg_policies where tablename = 'own_content_rights_log' order by policyname;
