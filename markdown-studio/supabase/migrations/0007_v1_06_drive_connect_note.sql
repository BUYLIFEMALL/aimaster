-- v1.06 (2026-10-13): Drive 연결은 화면 이동·새로고침 시 풀린다는 점을 매뉴얼·설정 화면에 정확히 안내(이전 안내의 오류 정정)
--  - 사이드바 이동은 저장 후 페이지 전체를 새로 불러오고, 접근 토큰은 메모리에만 두므로 연결이 풀린다(설계). 연결은 `4. 문서 보관함`의 Drive 카드에서 한다.
--  - 매뉴얼 원문 docs/guide-drive-oauth.html → node scripts/publish-drive-guide.mjs 로 재게시.
UPDATE public.programs SET version = 'v1.06', updated_at = NOW() WHERE slug = 'markdown-studio';
