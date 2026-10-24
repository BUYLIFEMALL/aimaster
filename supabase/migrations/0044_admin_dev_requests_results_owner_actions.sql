-- 2026-10-24 관리자 「수정 요청함」 — 에이전트 → 주인님 방향 2종 추가 (운영 DB esgxyikcnnvmlhygjkth)
-- 주인님 지시: 「여기엔 내가 작업요청한 내용에 대한 결과를 받아 볼수 있도록 해놔」
--             「내가 해줘야할 요청사항도 따로 카테고리별로 여기 모아서 볼수 있게 해줘」(= agent가 요청한 내용)
-- 플랜: docs/PLAN_20261024_ADMIN_REQUEST_RESULTS.md
--   work_result  : 작업 결과 보고. parent_id로 주인님 요청(같은 표의 줄)과 연결할 수 있다. 상태는 applied로 바로 기록.
--   owner_action : 에이전트가 주인님께 드리는 요청(승인·비용·로그인·DB 실행 등). category로 묶어 보여 주고,
--                  주인님이 화면에서 「완료」를 누르면 applied, 필요 없으면 rejected.
-- 기존 0043의 종류·상태·RLS(관리자 전용)는 그대로 둔다. 다시 실행해도 안전하게 작성.

alter table public.admin_dev_requests add column if not exists category text;
alter table public.admin_dev_requests add column if not exists title text;
alter table public.admin_dev_requests add column if not exists from_session text;
alter table public.admin_dev_requests add column if not exists parent_id uuid references public.admin_dev_requests(id) on delete set null;
alter table public.admin_dev_requests add column if not exists link text;
alter table public.admin_dev_requests add column if not exists cost text;

alter table public.admin_dev_requests drop constraint if exists admin_dev_requests_kind_check;
alter table public.admin_dev_requests add constraint admin_dev_requests_kind_check
  check (kind in ('doc_edit', 'doc_comment', 'role_note', 'work_result', 'owner_action'));

alter table public.admin_dev_requests drop constraint if exists admin_dev_requests_category_check;
alter table public.admin_dev_requests add constraint admin_dev_requests_category_check
  check (category is null or category in ('approval', 'cost', 'account', 'db', 'install', 'check', 'external', 'etc'));

alter table public.admin_dev_requests drop constraint if exists admin_dev_requests_target;
alter table public.admin_dev_requests add constraint admin_dev_requests_target check (
  (kind in ('doc_edit', 'doc_comment') and target_path is not null)
  or (kind = 'role_note' and target_role is not null)
  or (kind = 'work_result' and title is not null)
  or (kind = 'owner_action' and title is not null and category is not null)
);

create index if not exists admin_dev_requests_kind_idx on public.admin_dev_requests (kind, status, created_at desc);
create index if not exists admin_dev_requests_parent_idx on public.admin_dev_requests (parent_id);
