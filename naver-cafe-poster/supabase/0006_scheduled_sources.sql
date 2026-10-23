-- 회원이 글감 수집 방식(HTTP/RSS/Perplexity)과 게시할 카페 게시판을 미리 등록해두면, 정해둔
-- 주기마다 AI가 콘텐츠를 자동으로 만들고, "자동 포스팅"을 켜뒀으면 검토 없이 바로 카페에
-- 게시하고, 꺼뒀으면 초안(status='draft')으로만 저장해 /drafts에서 사람이 검수 후 배포하게
-- 한다(사용자 지시, 2026-09-15: "콘텐츠 생성후 자동 포스팅 기능을 구현해주고, 예약 기능도
-- 같이 추가해줘, 사용자는 자동 포스팅할지[말지 선택할 수 있게]"). kakao_auto_poster의
-- kakao_topics(schedule_enabled/interval_minutes/last_run_at) 패턴을 그대로 가져왔다.
create table if not exists public.ncafe_scheduled_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('http', 'rss', 'perplexity')),
  source_input text not null, -- http: URL, rss: NewsBlur feedId, perplexity: 시드 주제
  source_label text not null, -- 화면 표시용(http: URL 그대로, rss: 피드 제목, perplexity: 시드 주제)
  target_id uuid not null references public.ncafe_targets (id) on delete cascade,
  auto_post boolean not null default false,
  schedule_enabled boolean not null default false,
  interval_minutes integer,
  last_run_at timestamptz,
  is_active boolean not null default true,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists ncafe_scheduled_sources_user_idx
  on public.ncafe_scheduled_sources (user_id, created_at desc);

alter table public.ncafe_scheduled_sources enable row level security;

create policy "ncafe_scheduled_sources_select_own"
  on public.ncafe_scheduled_sources for select
  using (auth.uid() = user_id);

create policy "ncafe_scheduled_sources_insert_own"
  on public.ncafe_scheduled_sources for insert
  with check (auth.uid() = user_id);

create policy "ncafe_scheduled_sources_update_own"
  on public.ncafe_scheduled_sources for update
  using (auth.uid() = user_id);

create policy "ncafe_scheduled_sources_delete_own"
  on public.ncafe_scheduled_sources for delete
  using (auth.uid() = user_id);
