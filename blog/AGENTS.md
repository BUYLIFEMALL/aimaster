<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AIMaster 플랫폼 공통 원칙

blog는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- blog는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "ai-auto-blog"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), **쓰기 작업을 하는 모든 API route(`/api/auto-post`, `/api/posts/[id]` PUT·DELETE 등)는 반드시 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인**한다 (`getSessionUser()`만으로 로그인 여부만 확인하고 끝내지 말 것 — 2026-08-06 감사에서 이 부분이 빠져 있던 것을 발견해 수정함).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키 우선, 없으면 앱 기본 키)을 그대로 쓴다.
- `blog_posts`/`blog_categories`/`blog_authors`는 현재 사용자별로 격리되어 있지 않고 하나의 공유 블로그로 설계돼 있다 (누가 작성하든 같은 게시판에 게시됨). 이 설계를 바꾸려면(사용자별 개인 블로그로 전환) 먼저 사용자와 상의할 것 — 스키마/RLS 전면 변경이 필요한 큰 결정이다.
