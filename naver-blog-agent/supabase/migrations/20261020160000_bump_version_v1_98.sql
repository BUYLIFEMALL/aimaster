-- 2026-10-20 v1.98: 글감에 요약 전 원문(source_text) 보관해 생성 근거로 사용, 원문 대조를 사실 주장 문장으로 한정, 브라우저 alert/confirm 40곳을 화면 안 알림·확인 창으로 교체, 발행 설정 안내 조사 수정. 확장 코드 변경 없음, manifest·ZIP 버전 동기화.
update public.programs set version = 'v1.98', extension_version = 'v1.98', updated_at = now() where slug = 'naver-blog-agent';
