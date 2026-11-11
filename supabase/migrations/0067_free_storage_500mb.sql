-- 일반(무료) 회원 기본 저장공간 1GB → 500MB (2026-11-11 주인님 지시:
-- 「일반회원 500M/30일보관후 삭제(포스팅여부 상관없음) 무료로 2주간 사용하는 사람들이니 그렇게 해도됨」)
-- 보관 기간 30일·발행 여부와 상관없이 삭제는 그대로. 운영 DB(esgxyikcnnvmlhygjkth)에 2026-11-11 적용함.
-- 적용 시점 측정: 500MB 초과 2명은 모두 관리자·시험 계정(열외), 일반 회원 중 80% 이상 1명(434MB).
update public.storage_plans set quota_bytes = 524288000 where slug = 'free';
select public.member_storage_refresh_exempt();
