-- 2026-10-15 v1.41: AI 지시문에 한국 시간 현재 월 추가(확장 코드 변경 없음, manifest·ZIP 버전 동기화). 운영 DB에 적용 완료.
update public.programs set version = 'v1.41', extension_version = 'v1.41', updated_at = now() where slug = 'naver-blog-allinone';
