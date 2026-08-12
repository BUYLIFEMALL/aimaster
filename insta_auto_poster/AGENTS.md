# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **인스타그램 자동 포스팅 관리 웹(insta_auto_poster)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제** (스키마 추가/마이그레이션은 기존 threads/real_estate_sales와
   동일하게 자율 진행 가능 — README "설계 배경" 참고)
5. **환경변수와 API 키 변경**
6. **유료 API 호출**

---

## 🎯 프로젝트 목적
threads(`threads/`)와 동일한 구조로, 인스타그램 **피드 게시물**을 대상으로 한 AI 기반 자동 포스팅 웹입니다.
게시글 주제 수집(HTTP/RSS/Perplexity) → AI 캡션+해시태그+이미지 생성 → 즉시/예약 게시까지의 파이프라인을
threads와 동일한 패턴으로 제공하되, 인스타그램 피드는 이미지가 필수라는 차이를 반영했습니다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `insta_auto_poster/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `insta_auto_poster/` 폴더 내에서
  개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

insta_auto_poster는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조",
"멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- insta_auto_poster는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "auto-instagram-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect
  대신 결과 객체를 반환하는 방식으로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블은 `user_id` + RLS owner-only 정책으로 격리한다
  (`insta_posts`, `insta_accounts`, `insta_candidates` 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키 우선, 없으면 앱 기본 키)을 그대로 쓴다.
