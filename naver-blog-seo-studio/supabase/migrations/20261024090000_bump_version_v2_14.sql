-- v2.14 (2026-10-24): 블로그 병합 묶음 B-1~B-3 — ① AI 검수 6영역(선택)·필수 지적이 남으면 발행 입구 3곳 차단 ② 문체 영구 보관(30일 뒤 글 원문만 비움, 주인님 A안) ③ 분량 선택(짧게·보통·길게). DB 구조 변경 없음. 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.14', extension_version = 'v2.14', updated_at = now() where slug = 'naver-blog-seo-studio';
