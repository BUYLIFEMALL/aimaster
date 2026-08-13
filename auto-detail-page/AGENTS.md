# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AI 상세페이지 자동생성기(auto-detail-page)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션 (기존 threads/insta_auto_poster와 동일하게 자율 진행 가능)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출** (Claude 상세페이지 생성, 나노바나나/Replicate/GPT Image 1 이미지 생성 등)

---

## 🎯 프로젝트 목적

제품 이미지/정보를 입력하면 Claude가 쿠팡/스마트스토어/프리미엄 스타일의 완성된 HTML
상세페이지를 생성해주는 웹. 이미지가 필요하면 나노바나나/Replicate/GPT Image 1로 추가 생성할
수 있고, 완성된 페이지는 HTML 또는 Puppeteer로 렌더링한 긴 이미지(PNG)로 내려받을 수 있다.

---

## 📂 프로젝트 작업 디렉토리

- **메인 모듈 경로**: `auto-detail-page/`
- 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `auto-detail-page/` 폴더 내에서
  개발 및 관리합니다.
- 이 프로젝트는 원래 별도 위치(다른 로컬 클론, 별도 GitHub 저장소 `BUYLIFEMALL/ShopPage`)에서
  독립적으로 개발되다가 2026-08-13 AIMaster 서브프로젝트로 편입됐다. **지금부터는 이 폴더가
  유일한 소스**이고, 옛 저장소는 더 이상 반영하지 않는다 (README.md "설계 배경" 참고).

---

## 🔗 AIMaster 플랫폼 공통 원칙

auto-detail-page는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조",
"멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- auto-detail-page는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "auto-detail-page"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route(`app/api/*/route.ts`)는
  반드시 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블(`detail_pages`)은 `user_id` + RLS owner-only 정책으로 격리한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 본인 키가 없으면 `/settings`로 안내하고 생성을 막는다 — 절대 조용히 관리자 키로
  대체하지 않는다.
- 새 provider(`replicate`)를 추가할 때처럼 공용 `user_api_keys_provider_check` 제약을 넓히는 건
  괜찮지만, 이 프로그램만 쓰는 새 테이블을 `user_api_keys`와 별도로 만들지 않는다.
