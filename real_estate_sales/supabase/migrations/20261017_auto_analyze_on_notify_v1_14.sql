-- 2026-10-17 v1.14 (주인님 승인): "예약 조회"로 새 실거래 알림을 보낼 때 AI 분석(회원 본인 키 유료 호출)을 같이 돌릴지 회원이 고른다.
-- 기본값 true = 지금까지 동작 그대로(켜 둔 회원의 알림이 갑자기 바뀌지 않게). 설정 화면에서 끌 수 있다.
alter table public.real_estate_user_preferences
  add column if not exists auto_analyze_on_notify boolean not null default true;

update public.programs set version = 'v1.14', updated_at = now() where slug = 'real-estate-sales';
