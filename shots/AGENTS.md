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
촬영된 원본 영상(Raw Clips) 또는 롱폼 완성본을 AI 기반으로 분석하여 **자동 컷편집, STT 자막 생성, 5대 평가 지표 기반 숏폼(Shorts) 3종 자동 생성, YouTube Analytics 데이터 피드백 루프, Content Factory(Threads, Instagram, Blog) 연동**을 수행하는 엔드투엔드 마케팅 자동화 모듈입니다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `shots/`
* 모든 쇼츠 자동화 관련 소스 코드, 스크립트, 문서, API 라우트는 `shots/` 폴더 내에서 개발 및 관리합니다.

---

## 🏗️ 4단계 개발 파이프라인 개요

| 단계 | 서브 프로젝트명 | 주요 기능 |
| :--- | :--- | :--- |
| **Phase 1** | **Shorts Extraction MVP** | 롱폼 완성본 ➔ STT ➔ 5대 지표 스코어링 ➔ 9:16 인물 추적 세로 크롭 ➔ 자막 오버레이 ➔ 숏폼 3종 생성 |
| **Phase 2** | **Long-Form Auto Edit** | 원본 멀티클립 업로드 ➔ STT ➔ 무음/NG 자동 제거 ➔ LLM 스토리라인 ➔ 무손실 자동 컷편집 |
| **Phase 3** | **Analytics Feedback Loop** | YouTube Analytics API 연결 ➔ CTR/시청지속율/완주율 데이터 수집 ➔ LLM 프롬프트/가중치 튜닝 |
| **Phase 4** | **Content Factory OSMU** | Threads(`threads/`), Blog(`blog/`), Instagram 연동 ➔ 롱폼 1개당 다채널 콘텐츠 자동 재가공 |

---

## 🔗 AIMaster 플랫폼 공통 원칙

shots는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 반드시 함께 읽을 것 — 특히 "Platform-hub 구조"와 "멀티테넌시 원칙" 섹션. 핵심 요약:

- shots는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "auto-shorts-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect 대신 결과 객체를 반환하는 방식으로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블은 `user_id` + RLS owner-only 정책으로 격리한다 (`shorts_candidates`, `user_rss_sources`, `user_api_keys` 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키 우선, 없으면 앱 기본 키)을 그대로 쓴다.
