-- v2.16 (2026-10-24): 블로그 병합 B-5 서식 포함 복사 · B-7 TXT·MD·HTML 내보내기 · B-6 수정본 이력·비교·되돌리기 · B-8 SNS 공유 문구. DB 구조 변경 없음(seo_report JSON). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.16', extension_version = 'v2.16', updated_at = now() where slug = 'naver-blog-seo-studio';
