-- v2.00 (2026-10-22): 편집기 글 블록 문단 단위, 통짜 본문 수정 시 이미지 위치 유지(reflowBlocks), 블록 상한 150, 확장 — 연달아 오는 글 블록 사이 문단 나눔·본문 이미지 칸 content-1~6 허용. 버전·확장 버전 갱신(확장 코드 변경 있음).
update public.programs set version = 'v2.00', extension_version = 'v2.00', updated_at = now() where slug = 'naver-blog-seo-studio';
