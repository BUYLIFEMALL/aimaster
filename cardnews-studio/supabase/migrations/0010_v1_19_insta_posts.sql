-- CARDNEWS STUDIO v1.19 (2026-10-19, 주인님 승인): 인스타그램 게시 기록 + 예약 게시.
-- 즉시 게시·예약 게시를 한 표에 남겨 「게시 기록(시각·게시물 주소)」을 보여 주고 같은 카드뉴스 중복 게시를 경고한다.
-- 회원별 완전 격리(RLS owner-only: 읽기·취소만), 쓰기·예약 실행은 서버(서비스 키)만. 생성 30일 뒤 자동 삭제는 예약 실행 경로가 처리.
-- 인스타 연결값은 이 표에 두지 않는다(공용 insta_accounts 재사용 — 루트 최상위 지침 「회원 연동 정보 공용 저장·재사용 규칙」).

create table if not exists public.cns_insta_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.cns_projects(id) on delete set null,
  title text not null default '',
  image_paths text[] not null default '{}',
  page_count int not null default 0,
  caption text not null default '',
  status text not null check (status in ('scheduled', 'publishing', 'published', 'failed', 'canceled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  permalink text,
  ig_username text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cns_insta_posts_user_created_idx on public.cns_insta_posts (user_id, created_at desc);
create index if not exists cns_insta_posts_due_idx on public.cns_insta_posts (scheduled_at) where status = 'scheduled';
create index if not exists cns_insta_posts_project_idx on public.cns_insta_posts (project_id);

alter table public.cns_insta_posts enable row level security;

create policy "cns_insta_posts_select_own" on public.cns_insta_posts for select to authenticated using (auth.uid() = user_id);

-- 버전 갱신(v1.19)
update public.programs set version = 'v1.19', updated_at = now() where slug = 'cardnews-studio';
