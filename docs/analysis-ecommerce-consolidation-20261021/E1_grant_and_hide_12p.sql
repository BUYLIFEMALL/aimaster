-- 이커머스 병합 E1 — 윈도우 CLI가 적용 (운영 ① AIMaster, ref esgxyikcnnvmlhygjkth)
-- 순서: shop-detail-page v1.16·detail-page-12p v1.10 배포 Ready 뒤에 실행한다.
-- 백업: docs/analysis-ecommerce-consolidation-20261021/backup-programs-before-merge-e.json

-- 0) 미리 보기 — 15p 권한이 없는(또는 만료된) 12단 유효 권한자. 2026-10-21 조회 기준 4명.
select a.user_id, a.expires_at as p12_expires_at, b.expires_at as p15_expires_at
from user_program_access a
left join user_program_access b
  on b.user_id = a.user_id and b.program_id = '134a3d00-36cd-4875-a009-32628206bc2a'
where a.program_id = 'bb770cbb-c4f1-4bdd-8581-1ff08979e873'
  and (a.expires_at is null or a.expires_at > now())
  and (b.user_id is null or (b.expires_at is not null and b.expires_at <= now()));

-- 1) 15p 행이 아예 없는 회원: 12단과 같은 기간으로 수동 부여(grant_source null = 기존 수동 부여와 같음)
insert into user_program_access (user_id, program_id, granted_at, expires_at)
select a.user_id, '134a3d00-36cd-4875-a009-32628206bc2a', now(), a.expires_at
from user_program_access a
where a.program_id = 'bb770cbb-c4f1-4bdd-8581-1ff08979e873'
  and (a.expires_at is null or a.expires_at > now())
  and not exists (
    select 1 from user_program_access b
    where b.user_id = a.user_id and b.program_id = '134a3d00-36cd-4875-a009-32628206bc2a'
  );

-- 2) 15p 행이 있지만 만료된 회원: 12단 만료일로 늘림(긴 쪽 유지)
update user_program_access b
set expires_at = a.expires_at
from user_program_access a
where a.program_id = 'bb770cbb-c4f1-4bdd-8581-1ff08979e873'
  and b.program_id = '134a3d00-36cd-4875-a009-32628206bc2a'
  and b.user_id = a.user_id
  and (a.expires_at is null or a.expires_at > now())
  and b.expires_at is not null and b.expires_at <= now();

-- 3) 미리 보기(0)를 다시 실행해 0행인지 확인한다.

-- 4) 카탈로그에서 12단 숨김 + 버전(코드와 같은 값)
update programs set is_active = false, version = 'v1.10', updated_at = now() where slug = 'detail-page-12p';
update programs set version = 'v1.16', updated_at = now() where slug = 'shop-detail-page';
