-- 네이버 블로그 올인원 v1.16 (2026-10-12): 버전 + 확장 버전 + 소개문 갱신(4단계 본문·실제 이미지 생성·보관함).
update public.programs
set version = 'v1.16',
    extension_version = 'v1.16',
    short_desc = 'E-E-A-T 주제 기획부터 4단계 AI 본문 생성(기획·작성·윤문·검수), 실제 AI 이미지 생성·편집, 내 보관함 저장까지 올인원 블로깅',
    updated_at = now()
where slug = 'naver-blog-allinone';
