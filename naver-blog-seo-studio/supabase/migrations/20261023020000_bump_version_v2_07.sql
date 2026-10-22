-- v2.07 (2026-10-23): 확장 Enter 키에 줄바꿈 문자를 넣어 문단 나눔 복구, 입력 확인에 문단 수 비교, 입력 완료 문구에 걸린 시간 표시,
-- 20분 넘게 「입력 중」인 자동 포스팅 실행은 「실패」로 정리(발행 결과 확인 때)하고 그런 원고도 「편집기로 입력만」 결과를 기록. 확장 코드 변경.
update public.programs set version = 'v2.07', extension_version = 'v2.07', updated_at = now() where slug = 'naver-blog-seo-studio';
