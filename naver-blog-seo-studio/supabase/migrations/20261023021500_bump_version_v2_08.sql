-- v2.08 (2026-10-23): 확장 입력 묶음 1~3글자(속도 한 단계 낮춤, 모아 둔 수정), 원고를 불러오는 동안 입력 버튼 막기,
-- claim API가 실패·멈춘 자동 포스팅 실행이 남은 원고도 불러오기 허용(입력 결과 API와 같은 기준). 확장 코드 변경.
update public.programs set version = 'v2.08', extension_version = 'v2.08', updated_at = now() where slug = 'naver-blog-seo-studio';
