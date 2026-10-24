-- 2026-10-24 관리자 「개발 문서 관리」 — 수정안·관리자 지시(의견)·역할 메모 저장 (운영 DB esgxyikcnnvmlhygjkth)
-- 주인님 지시: 「수정 기능도 추가해」「내가 직접 내용을 수정할 수도 있어」「각각의 문서에 내 관리자로서의 의견을 추가할 수 있도록」
--             「내가 다는 코멘트 지시사항은 관리자로서 절대적이고 따라야 할 지시사항이자 요청사항이야」
-- 흐름: 관리자 화면에서 저장(status=open) → 담당 CLI가 `node scripts/dev-requests.mjs`로 확인·반영(applied) 또는 반려(rejected)
--   doc_edit    : 문서 전체 수정본(proposed_content). 반영 때 base_content와 3-way 병합.
--   doc_comment : 그 문서에 대한 관리자 지시. 반영 때 문서 맨 위 「🗣 주인님(관리자) 지시」 칸에 옮겨 적는다(절대 지시).
--   role_note   : 역할(docs/roles/<target_role>.md) 담당 세션에게 남기는 지시·메모.
-- 회원 데이터가 아니라 운영 기록이므로 30일 자동 삭제 대상이 아니다(반영 기록은 이력으로 남긴다).

create table if not exists public.admin_dev_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('doc_edit', 'doc_comment', 'role_note')),
  target_path text,
  target_role text,
  base_content text,
  base_hash text,
  proposed_content text,
  note text,
  status text not null default 'open' check (status in ('open', 'applied', 'rejected')),
  handled_by text,
  commit_sha text,
  reject_reason text,
  handled_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_dev_requests_target check (
    (kind in ('doc_edit', 'doc_comment') and target_path is not null) or (kind = 'role_note' and target_role is not null)
  )
);

create index if not exists admin_dev_requests_status_idx on public.admin_dev_requests (status, created_at desc);
create index if not exists admin_dev_requests_path_idx on public.admin_dev_requests (target_path);

alter table public.admin_dev_requests enable row level security;

drop policy if exists "admin_dev_requests admin all" on public.admin_dev_requests;
create policy "admin_dev_requests admin all" on public.admin_dev_requests
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
