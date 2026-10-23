-- 2026-10-14 v1.07: 컷마다 다른 비율·웹툰형 나눠 저장(가로 690/800/1080, 한 장 최대 높이, ZIP) — 스키마 변경 없음
update programs set version = 'v1.07', updated_at = now() where slug = 'four-cut-comics';
-- 카탈로그 설명 두 곳 보강(컷마다 비율·웹툰형 나눠 ZIP 저장)은 같은 날 service role 스크립트로 문자열 치환해 반영했다.
