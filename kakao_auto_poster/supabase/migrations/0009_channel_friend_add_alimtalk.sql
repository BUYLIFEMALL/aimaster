-- 브랜드메시지(구 친구톡)는 기본적으로 "카카오톡 채널을 친구 추가한 사람"에게만 도달한다
-- (SOLAPI 공식 문서 재확인, 2026-09-09 — targeting='I'가 기본값이고, 비친구 대상(M/N)은
-- 채널 구독자 5만 명 이상 + 카카오 별도 인허가가 있어야만 가능하다). 그래서 수신자에게
-- "먼저 채널을 친구 추가해달라"고 안내할 공개 링크를 저장할 컬럼을 추가한다 — kakao_pf_id는
-- API 인증용 내부 비즈니스 채널 ID라 카카오톡 "채널 추가" 공개 URL(pf.kakao.com/_xxxx)과
-- 다르므로 별도로 받아야 한다.
--
-- alimtalk_template_id는 채널 친구 여부와 무관하게 전화번호만으로 도달 가능한 알림톡을
-- 쓰고 싶은 회원을 위한 선택 필드다 — 알림톡은 사전 승인된 템플릿(변수명 #{title}/#{url}로
-- 등록 필요, lib/kakaoSend.ts 참고)으로만 발송 가능해 회원이 직접 SOLAPI/카카오에서 템플릿
-- 승인을 받아야 한다.
alter table public.user_solapi_accounts
  add column if not exists channel_friend_url text,
  add column if not exists alimtalk_template_id text;
