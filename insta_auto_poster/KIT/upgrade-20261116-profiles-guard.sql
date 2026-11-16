-- INSTA 포스팅 자동화 — 예전 배포판(v1.10 이하) 설치자가 한 번 실행합니다. (2026-11-16 v1.11)
-- 내용: 회원이 자기 프로필의 관리자·정지·핸드폰·등급 칸을 직접 바꾸지 못하게 막습니다(이름 칸만 수정 허용).
-- Supabase → SQL Editor → New query → 붙여넣고 Run. 다시 실행해도 같은 결과입니다. 데이터는 바꾸지 않습니다.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;
