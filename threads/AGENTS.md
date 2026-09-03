<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AIMaster 플랫폼 공통 원칙

threads는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- threads는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "auto-threads-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect 대신 결과 객체를 반환하는 방식으로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블은 `user_id` + RLS owner-only 정책으로 격리한다 (`posts`, `threads_accounts`, `user_api_keys` 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만 사용, 앱/운영자 공용 키로 폴백하지 않음 — 2026-08-12 정책, 2026-09-03에 이 서브프로젝트에 남아있던 옛 폴백 로직 제거)을 그대로 쓴다. 본인 키가 없으면 `null`을 반환하니, 호출부는 조용히 실패시키지 말고 "API 키 등록 필요" 안내로 이어가야 한다.
