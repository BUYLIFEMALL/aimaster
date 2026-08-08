# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AIMaster Shorts (유튜브 롱폼 ➔ 숏폼 콘텐츠 자동화 & Content Factory)** 프로젝트에서 AI Agent(Antigravity, Claude Code, Codex 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm`, `pip` 등)
- 로컬 테스트 및 빌드 실행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 6가지 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포**
4. **데이터베이스 마이그레이션 또는 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출**

---

## 🎯 프로젝트 목적
AI로 유튜브 쇼츠(세로형 숏폼)를 처음부터 끝까지 자동 생성·게시하는 마케팅 자동화 모듈입니다. 주제 수집부터 유튜브/인스타그램 게시까지 사람이 검토·수정하며 순서대로 진행하는 파이프라인 구조입니다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `shots/`
* 모든 쇼츠 자동화 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `shots/` 폴더 내에서 개발 및 관리합니다.

---

## 🏗️ 실제 파이프라인 (좌측 메뉴 순서와 동일, 1~5단계)

| 단계 | 화면 | 주요 기능 |
| :--- | :--- | :--- |
| **1** | **최신 쇼츠 주제 수집** (`/candidates`) | HTTP(특정 URL) / RSS(NewsBlur) / Perplexity(트렌드 검색) 중 하나로 쇼츠 주제 후보(제목·본문·키워드) 자동 수집 |
| **2** | **영상스크립트 생성** (`/scripts`, `/scripts/[id]`) | 후보로 전체 스토리(쇼츠 스토리) + 6장면 대사·이미지 프롬프트 + BGM 프롬프트를 AI로 생성, 화면에서 검토·수정 |
| **3** | **이미지 생성** (`/images`) | 장면별 이미지 프롬프트로 나노바나나(Gemini 이미지) 9:16 이미지 생성, 장면당 이력 관리 후 선택 |
| **4** | **음악 생성** (`/music`) | Suno로 배경음악 생성 (Style Description/Exclude Styles는 영어로 작성해야 함), 생성 이력 중 선택 |
| **5** | **영상 포스팅** (`/videos`) | JSON2Video로 이미지+내레이션(ElevenLabs)+BGM+자막을 합쳐 최종 영상 렌더링 → 유튜브 쇼츠/인스타그램 릴스에 업로드 |

인스타그램은 buylife 소유의 Meta 앱 하나로 모든 사용자를 받고(threads와 동일 방식), 유튜브는 Google이 민감 스코프에 앱별 등록을 요구하므로 사용자가 본인 Google OAuth Client ID/Secret을 설정 페이지에 직접 등록하는 방식이다 (두 플랫폼이 서로 다른 이유는 실제 플랫폼 정책 차이).

---

## 🔗 AIMaster 플랫폼 공통 원칙

shots는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- shots는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "auto-shorts-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect 대신 결과 객체를 반환하는 방식으로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블은 `user_id` + RLS owner-only 정책으로 격리한다 (`shorts_candidates`, `shorts_videos`, `newsblur_accounts`, `youtube_accounts`, `instagram_accounts`, `user_api_keys` 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키 우선, 없으면 앱 기본 키)을 그대로 쓴다.
