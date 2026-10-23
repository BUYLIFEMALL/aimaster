-- v1.06 (2026-10-22): BLC-11 결과 화면에 「SEO 스튜디오로 보내기」(기록 번호만 주소에 실음, AI 호출 없음).
update public.programs set version = 'v1.06', updated_at = now() where slug = 'blog-keyword';
