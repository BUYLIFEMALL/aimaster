-- v2.18 (2026-10-24): v2.17 실검수에서 찾은 수정 — 검수 반영 때 소제목 줄을 인용한 지적은 소제목을 두고 아래 문단 앞에 넣음, 원문 붙여넣기 칸 배치, 유튜브 제목을 공개 oEmbed로. DB 구조 변경 없음. 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.18', extension_version = 'v2.18', updated_at = now() where slug = 'naver-blog-seo-studio';
