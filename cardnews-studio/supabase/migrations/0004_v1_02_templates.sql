-- CARDNEWS STUDIO v1.02 (2026-10-11): 디자인 템플릿 저장 테이블(회원별 격리, RLS owner-only) + 버전.
-- 템플릿은 디자인 스타일(화풍·구성·테마·배치·효과·폰트·글자 설정)만 담는다. 문구·이미지는 담지 않는다.

create table if not exists public.cns_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  style jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists cns_templates_user_idx on public.cns_templates (user_id, created_at desc);

alter table public.cns_templates enable row level security;

create policy "cns_templates_select_own" on public.cns_templates for select to authenticated using (auth.uid() = user_id);
create policy "cns_templates_insert_own" on public.cns_templates for insert to authenticated with check (auth.uid() = user_id);
create policy "cns_templates_delete_own" on public.cns_templates for delete to authenticated using (auth.uid() = user_id);

update public.programs
set version = 'v1.02',
    short_desc = '주제만 넣으면 AI가 페이지별 문구와 배경을 만들고, 글자가 얹힌 카드뉴스를 PNG·ZIP으로 완성하는 카드뉴스 스튜디오',
    updated_at = now()
where slug = 'cardnews-studio';
