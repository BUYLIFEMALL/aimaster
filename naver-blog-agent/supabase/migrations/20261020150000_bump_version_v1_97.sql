-- 2026-10-20 v1.97: 글감 전체 내용을 사실 근거로 전달·검수에서 원문 대조, 보관함 단건 예약 입력, 랭킹 상태 점검(화면 점·매일 정리 호출), 홈판형으로 바로 쓰기, 생성 화면 블로그 목록 서버 연동. 확장 코드 변경 없음, manifest·ZIP 버전 동기화.
update public.programs set version = 'v1.97', extension_version = 'v1.97', updated_at = now() where slug = 'naver-blog-agent';
