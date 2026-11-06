-- V2·V5 본인 사용판 공통 장치 ③ 실행 기록(2026-11-06 주인님 결정: 새 표, 추가만 하는 DB 변경).
-- 「내가 만든(권리를 가진) 콘텐츠입니다」 체크 뒤 실행할 때마다 파일 이름·시각·도구를 회원별로 남긴다.
-- 쓰는 곳: ai-video-studio(V2 언어판·해설 교차편집), video-to-gif(V5 내 영상 일부 지우기). 서버가 서비스 롤 + user_id 조건으로 넣는다.
-- 30일 뒤 ai-video-studio /api/cron/cleanup이 지운다(보관 예외 회원 profiles.retention_exempt는 건너뜀).
-- 대상: ① AIMaster 운영(ref esgxyikcnnvmlhygjkth).

create table if not exists public.own_content_rights_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program text not null check (program in ('ai-video-studio', 'video-to-gif')),
  tool text not null check (tool in ('lang', 'narration-cut', 'rewrite', 'erase')),
  file_name text not null check (char_length(file_name) between 1 and 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists own_content_rights_log_user_idx on public.own_content_rights_log (user_id, created_at desc);
create index if not exists own_content_rights_log_expires_idx on public.own_content_rights_log (expires_at);
alter table public.own_content_rights_log enable row level security;
drop policy if exists own_content_rights_log_select_own on public.own_content_rights_log;
create policy own_content_rights_log_select_own on public.own_content_rights_log for select to authenticated using (auth.uid() = user_id);
revoke all on public.own_content_rights_log from anon;

select count(*) as rows from public.own_content_rights_log;
