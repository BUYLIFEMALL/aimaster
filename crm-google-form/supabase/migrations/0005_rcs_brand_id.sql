-- RCS(3세대 문자) 발송에 필요한 SOLAPI 브랜드 인증 ID. 카카오 채널(kakao_pf_id)과 마찬가지로
-- 선택 사항 — RCS 프로모션 메시지를 쓸 사용자만 등록하면 된다. SOLAPI 콘솔에서 브랜드 인증을
-- 받아야 발급된다.
alter table public.user_solapi_accounts add column rcs_brand_id text;
