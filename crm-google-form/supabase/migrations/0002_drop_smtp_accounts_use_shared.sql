-- crm_smtp_accounts(등록된 계정 0건)를 stepmail이 소유한 공용 테이블 user_smtp_accounts로
-- 대체한다. 텔레그램(user_telegram_links)과 동일한 철학 — 사용자 본인 이메일 계정은
-- 프로그램마다 따로 등록할 이유가 없다. 실제 rename/이전은 stepmail/supabase/migrations/
-- 0006_promote_smtp_accounts_to_shared.sql에서 수행했고(그 쪽에 실 데이터 3건이 있었음),
-- 여기서는 이 프로젝트가 막 만들었던 빈 테이블만 제거한다.
drop table if exists public.crm_smtp_accounts;
