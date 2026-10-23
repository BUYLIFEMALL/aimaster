-- v1.05 (2026-10-13): Google Drive 연동 매뉴얼을 일반 회원 눈높이로 보강
--  - platform_guides `7d473e83-e9ce-4f68-ab52-92015a98148e` 본문은 docs/guide-drive-oauth.html 이 원문이며 `node scripts/publish-drive-guide.mjs`로 게시한다(9단계 + 오류별 해결 + FAQ + 체크리스트).
--  - 설정 화면: 매뉴얼 버튼 최상단, 진행 체크리스트(브라우저에만 저장), 오류 요약.
UPDATE public.programs SET version = 'v1.05', updated_at = NOW() WHERE slug = 'markdown-studio';
