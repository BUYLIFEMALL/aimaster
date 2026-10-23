-- 텔레그램 연동을 "공용 봇"이 아니라 "사용자 각자의 봇"으로 변경 (API 키와 동일한 철학)
alter table user_telegram_links add column if not exists bot_token text;
alter table user_telegram_links add column if not exists bot_username text;
