# 🤖 Threads AI 기획기 — 에이전트 인수인계 문서 (AGENTS.md)

이 문서는 **Threads AI 기획기(threads-easy-planner)** 서브프로젝트의 인수인계 문서입니다.
루트 `CLAUDE.md`(핵심 원칙 7가지) 및 `AGENTS.md`를 기반으로 동작합니다.

---

## 📌 기본 정보

- **서브프로젝트 폴더**: `threads-easy-planner/`
- **프로그램 slug**: `threads-easy-planner`
- **프로그램명**: `Threads AI 기획기`
- **시작 버전**: `v1.01` (`src/lib/version.ts`)

---

## 🛡️ 핵심 원칙

1. **초보자 맞춤형 심플 UI**: 복잡한 설정 없이 주제 입력 → 추천 → 글 생성 → 수정 버튼 흐름 유지.
2. **BYOK (연료는 회원 본인 키)**: `user_api_keys` 테이블에서 사용자의 OpenAI / Gemini / Claude 키를 가져와 호출하며, 관리자 키 폴백을 두지 않는다.
3. **캐싱 방지**: 모든 권한 체크 레이아웃과 동적 라우트에 `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"` 선언 필수.
4. **버전 관리**: 코드 변경 배포 시 `src/lib/version.ts`의 `APP_VERSION`과 DB `programs.version` 동시 갱신 (+0.01).
5. **사이드바 표준**: 21개 프로그램 공통 규격 준수 (메뉴 바로 아래 계정 표시 및 로그아웃).
