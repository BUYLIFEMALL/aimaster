-- v1.81 (2026-10-22): AI 상세페이지 자동화의 섹션 이미지를 새 글 첨부로 가져오기(구조 변경 없음).
-- 적용 대상: 운영 ① AIMaster, ref esgxyikcnnvmlhygjkth.
update public.programs set version = 'v1.81', updated_at = now() where slug = 'threads-affiliate-poster';
select slug, version from public.programs where slug = 'threads-affiliate-poster';
