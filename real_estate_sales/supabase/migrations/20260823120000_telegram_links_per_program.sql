-- user_telegram_links(이 프로젝트가 만든 공용 테이블, docs/PLATFORM_PATTERNS.md §9)를
-- 프로그램별로 다른 텔레그램 봇을 연결할 수 있도록 (user_id, program_slug) 단위로 바꾼다.
-- 이전엔 user_id 하나로만 유니크해서, booking-reminder/crm-google-form/
-- longtail-keyword-expander가 전부 같은 봇 연결을 공유했다.
--
-- 기존 연결 2건(2026-08-10/11에 real_estate_sales에서 생성된 것으로 판단 — bot_username이
-- 부동산 관련 이름)은 전부 'real-estate-sales'로 귀속시켰다. 다른 프로그램에서 같이 쓰고
-- 있었더라도 설정 화면에서 다시 연동하면 되므로 데이터 유실 없이 안전하게 마이그레이션했다.
alter table public.user_telegram_links add column program_slug text;

update public.user_telegram_links set program_slug = 'real-estate-sales' where program_slug is null;

alter table public.user_telegram_links alter column program_slug set not null;

alter table public.user_telegram_links drop constraint user_telegram_links_user_id_key;
alter table public.user_telegram_links add constraint user_telegram_links_user_id_program_slug_key unique (user_id, program_slug);
