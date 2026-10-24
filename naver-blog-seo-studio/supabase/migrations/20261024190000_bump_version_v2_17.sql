-- v2.17 (2026-10-24): 도톨이 v1.3 기능 참고 D-1 어조 강도 · D-2 전개 구조 8가지 · D-3 검수 지적 반영(지적별·한 번에+다시 검수 비교, 검수 8영역) · D-4 자료 읽기(텍스트 PDF·유튜브(회원 Gemini)·원문 붙여넣기). DB 구조 변경 없음(seo_report·sources JSON). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.17', extension_version = 'v2.17', updated_at = now() where slug = 'naver-blog-seo-studio';
