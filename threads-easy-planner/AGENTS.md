# 🤖 Threads AI 기획기 — 에이전트 인수인계 문서 (AGENTS.md)

이 문서는 **Threads AI 기획기(threads-easy-planner)** 서브프로젝트의 인수인계 문서입니다.
루트 `CLAUDE.md`(핵심 원칙 7가지) 및 `AGENTS.md`를 기반으로 동작합니다.

---

## 📌 기본 정보

- **서브프로젝트 폴더**: `threads-easy-planner/`
- **프로그램 slug**: `threads-easy-planner`
- **프로그램명**: `Threads AI 기획기`
- **현재 버전**: `v1.03` (`src/lib/version.ts` 및 DB `programs.version`)
- **라이브 URL**: `https://threads-easy-planner.vercel.app`

---

## 🛡️ 핵심 원칙

1. **초보자 맞춤형 심플 UI**: 복잡한 설정 없이 주제 입력 → 추천 → 글 생성 → 수정 버튼 흐름 유지.
2. **BYOK (연료는 회원 본인 키)**: `user_api_keys` 테이블에서 사용자의 OpenAI / Gemini / Claude 키를 가져와 호출하며, 관리자 키 폴백을 두지 않는다.
3. **캐싱 방지**: 모든 권한 체크 레이아웃과 동적 라우트에 `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"` 선언 필수.
4. **버전 관리**: 코드 변경 배포 시 `src/lib/version.ts`의 `APP_VERSION`과 DB `programs.version` 동시 갱신 (+0.01).
5. **사이드바 표준**: 21개 프로그램 공통 규격 준수 (메뉴 바로 아래 계정 표시 및 로그아웃).

---

## 📜 변경 이력

- **v1.01 (2026-10-03)**: 최초 개발 및 릴리즈.
  - "오늘 뭐 쓰지?" 업종/타깃 10개 추천, 5단 구성(주제/후킹/본문/댓글CTA/후속5선) 생성, 7종 원클릭 리라이팅 구현.
- **v1.02 (2026-10-03)**:
  - OpenAI `response_format: json_object` 사용 시 배열 대신 최상위 객체 반환으로 인한 추천 주제 렌더링 누락 버그 해결 (자동 언랩핑 보강).
  - Gemini 모델 식별자 정상화 (`gemini-2.0-flash`).
  - "오늘 뭐 쓰지?" 버튼 클릭 시 카테고리 피커 상시 토글 및 즉시 추천 트리거 동작 개선.
- **v1.03 (2026-10-03)**:
  - 🎲오늘 뭐 쓰지? / ✨글 생성하기 하단에 AI 추론 엔진(OpenAI / Gemini / Claude) 및 2026 세부 실행 모델 선택 패널 신설.
  - 공급자별 대표 모델(GPT-4.1, GPT-6 Luna/Sol/Astra, Gemini 3.8/3.7 Flash, Claude Sonnet 5 등) 옵션 제공.
  - `localStorage` 브라우저 캐싱으로 선택 모델 자동 기억.
  - 공급자별 키 미등록 시 맞춤형 안내 모달 제공 및 결과 카드에 사용 모델 라벨 표시.
