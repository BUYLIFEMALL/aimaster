-- 시험 계정(buylifemall@naver.com)에만 이 프로그램 사용 권한 30일 (2026-10-24, 주인님 승인: 「1. 시험 계정에만 개별 권한」)
-- 대상: ① AIMaster 운영 DB. 실행: 주인님(크롬 SQL 편집기 Run). 정식 공개(테스트 정상 확인 뒤 주인님 결정) 전까지 VIP 자동 부여는 하지 않는다.
insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '30 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'realty-listing-alert' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);

select u.email, x.grant_source, x.expires_at
from user_program_access x join profiles u on u.id = x.user_id join programs p on p.id = x.program_id
where p.slug = 'realty-listing-alert';
