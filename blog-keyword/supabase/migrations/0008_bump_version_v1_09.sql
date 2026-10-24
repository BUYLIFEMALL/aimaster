-- v1.09 (2026-10-24): v1.08 실검수 수정 — 벤치마킹 새 글만 분석이 지난번에 본 글을 만나면 멈춤, 급상승 이유 문구 인용 번호. DB 구조 변경 없음.
update public.programs set version = 'v1.09', updated_at = now() where slug = 'blog-keyword';
