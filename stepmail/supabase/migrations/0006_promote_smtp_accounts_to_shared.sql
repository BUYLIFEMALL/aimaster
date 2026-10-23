-- SMTP 이메일 계정을 텔레그램(user_telegram_links, real_estate_sales가 만든 공용 테이블,
-- docs/PLATFORM_PATTERNS.md §9)과 동일한 철학으로 프로그램 접두어 없는 공용 테이블로
-- 승격한다. crm-google-form 서브프로젝트를 만들면서, 이미 stepmail에 등록된 본인 이메일
-- 계정(구글/네이버 등)을 다른 프로그램에서 또 등록해야 하는 불편함을 사용자가 지적해서
-- 결정함(2026-08-18).
--
-- RENAME은 기존 id/인덱스/트리거/RLS 정책 및 FK 관계(stepmail_campaign_smtp_accounts,
-- stepmail_send_log가 참조 중)를 전부 그대로 보존하면서 테이블명만 바꾼다 — Postgres가
-- 제약조건을 OID로 추적하므로 데이터 이전이나 FK 재매핑이 전혀 필요 없다.
alter table public.stepmail_smtp_accounts rename to user_smtp_accounts;

alter index stepmail_smtp_accounts_pkey rename to user_smtp_accounts_pkey;
alter index stepmail_smtp_accounts_user_id_idx rename to user_smtp_accounts_user_id_idx;

alter trigger stepmail_smtp_accounts_set_updated_at on public.user_smtp_accounts
  rename to user_smtp_accounts_set_updated_at;

alter policy "stepmail_smtp_accounts_owner_select" on public.user_smtp_accounts rename to "user_smtp_accounts_owner_select";
alter policy "stepmail_smtp_accounts_owner_insert" on public.user_smtp_accounts rename to "user_smtp_accounts_owner_insert";
alter policy "stepmail_smtp_accounts_owner_update" on public.user_smtp_accounts rename to "user_smtp_accounts_owner_update";
alter policy "stepmail_smtp_accounts_owner_delete" on public.user_smtp_accounts rename to "user_smtp_accounts_owner_delete";
