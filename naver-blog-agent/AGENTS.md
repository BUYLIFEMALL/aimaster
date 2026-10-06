# 🤖 네이버 블로그 에이전트 — 인수인계 문서 (AGENTS.md)

이 문서는 **네이버 블로그 에이전트(naver-blog-agent)** 서브프로젝트의 인수인계 문서입니다.
루트 `CLAUDE.md`(핵심 원칙 7가지) 및 `AGENTS.md`를 기반으로 동작합니다.

---

## 📌 기본 정보

- **서브프로젝트 폴더**: `naver-blog-agent/`
- **프로그램 slug**: `naver-blog-agent`
- **프로그램명**: `네이버 블로그 에이전트`
- **현재 버전**: `v1.01` (`src/lib/version.ts` 및 DB `programs.version`)
- **라이브 URL**: `https://naver-blog-agent.vercel.app`

---

## 🛡️ 핵심 원칙

1. **일반 Chrome 브라우저 + 확장 연동 (봇 탐지 우회)**:
   - 네이버의 보안 알고리즘을 우회하기 위해 Playwright를 배제하고, 실제 사용자 Chrome 브라우저 + 확장(`extension/`) 조합으로 스마트에디터 ONE DOM을 직접 조작합니다.
2. **BYOK (연료는 회원 본인 키)**:
   - `user_api_keys` 테이블에서 사용자의 OpenAI / Gemini / Claude 키를 가져와 호출하며, 관리자 키 폴백을 두지 않습니다.
3. **5단계 멀티 AI 파이프라인**:
   - `Research -> Writer -> Humanizer -> Reviewer -> Image` 순차 오케스트레이션.
   - `Humanizer`는 17대 윤문 규칙과 숫자/팩트 보존 검증을 통과해야 합니다.
4. **캐싱 방지**:
   - 모든 권한 체크 레이아웃과 동적 라우트에 `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"` 선언 필수.
5. **버전 관리**:
   - 코드 변경 배포 시 `src/lib/version.ts`의 `APP_VERSION`과 DB `programs.version` 동시 갱신 (+0.01).
6. **사이드바 표준**:
   - `docs/SIDEBAR_LAYOUT_STANDARD.md` 준수 (상단 `← 다른 프로그램 보기`, 메뉴 바로 아래 계정 표시 및 로그아웃).

---

## 🕒 버전 히스토리

- **v1.01 (2026-10-07 신규 구축)**:
  - **네이버 블로그 에이전트 런칭**:
    1) 복사장 원본(`boksajang/naverblog-extention`) 및 유튜브 강의 심층 분석 기반 Web SaaS + Chrome Extension 하이브리드 아키텍처 수립.
    2) 복사장의 검증된 네이버 스마트에디터 ONE DOM 자동 조작 엔진(`editor.js`) 및 Manifest V3 크롬 확장 추출·연동.
    3) 5단계 멀티 AI 에이전트 파이프라인(`Research -> Writer -> Humanizer -> Reviewer -> Image`) 구축.
    4) 17대 블로그 윤문 및 팩트 보존 휴머나이저(`src/lib/humanizer`) 모듈 탑재.
    5) 다중 네이버 계정 및 카테고리/키워드 관리(`nba_accounts`), 발행 대기 큐(`nba_posts`), 크롬 확장 페어링(`nba_extension_tokens`) 구축.
    6) Next.js 16 + Tailwind CSS 흰색 베이스 대시보드 구축 및 Supabase 통합 권한(`requireProgramAccess`) 연동 완료.
