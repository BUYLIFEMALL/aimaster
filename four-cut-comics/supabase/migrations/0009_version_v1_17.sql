-- 2026-10-20 v1.17: 인스타그램에 바로 게시(바둑판 1장·컷별 캐러셀, 회원 본인 인스타 계정) — 스키마 변경 없음. 임시 사진은 INSTA 공개 저장소 회원 폴더 fourcut-insta/에 게시 직후까지만.
update programs set version = 'v1.17', updated_at = now() where slug = 'four-cut-comics';
