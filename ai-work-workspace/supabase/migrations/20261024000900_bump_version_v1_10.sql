-- ai-work-workspace v1.10 (2026-10-24): 운영 DB 버전 표시를 실제 배포 버전에 맞춤
-- 코드(src/lib/version.ts)는 디자인 리뉴얼 배포로 v1.10인데 programs.version이 v1.07에 멈춰 있었음(v1.08·v1.09 SQL 파일 없음).
-- 주인님 승인(2026-10-24), 크롬 SQL 편집기로 적용.
update public.programs set version = 'v1.10', updated_at = now() where slug = 'ai-work-workspace' and version = 'v1.07';
select slug, version, updated_at from public.programs where slug = 'ai-work-workspace';
