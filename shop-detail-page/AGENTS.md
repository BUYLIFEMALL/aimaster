# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AI 상세페이지 이미지 자동생성기(shop-detail-page)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션 (기존 threads/insta_auto_poster/auto-detail-page와 동일하게 자율 진행 가능)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출** (Gemini 상품분석/나노바나나 이미지 생성 등)

---

## 🎯 프로젝트 목적

상품 이미지와 정보를 입력하면 AI가 분석 후, 헤더/핵심특징/스펙/사용법/후기 등 커머스 상세페이지에
필요한 섹션별 이미지 15장을 자동 생성하고, 한 장의 긴 상세페이지 이미지로 병합해주는 프로그램.

**기존에 n8n + Airtable로 운영하던 자동화 파이프라인(`D:\PDS\#0~#6 상세페이지 자동화*.json`)을
AIMaster 서브프로젝트로 이식한 것**이다 — 자세한 배경은 README.md "설계 배경" 참고.

이 프로젝트는 `auto-detail-page`(Claude로 상세페이지 *HTML*을 생성하는 도구)와는 **완전히 별개의
독립 프로젝트**다(2026-08-13 사용자 확정). 다만 멀티테넌시 스캐폴딩(로그인/API 키 정책/Supabase
클라이언트 등)은 auto-detail-page의 검증된 패턴을 그대로 재사용했다.

---

## 📂 프로젝트 작업 디렉토리

- **메인 모듈 경로**: `shop-detail-page/`
- 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `shop-detail-page/` 폴더 내에서
  개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

shop-detail-page는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조",
"멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- shop-detail-page는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "shop-detail-page"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route(`app/api/*/route.ts`)는
  반드시 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블(`shop_products`, `shop_product_images`, `shop_page_exports`,
  `shop_prompt_templates`)은 `user_id` + RLS owner-only 정책으로 격리한다. `shop_prompt_templates`만
  예외적으로 `user_id is null`인 시스템 기본 템플릿을 전체 공개 읽기로 허용한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `gemini` provider만 사용한다(상품분석 + 나노바나나 이미지 생성).
  본인 키가 없으면 `/settings`로 안내하고 생성을 막는다.
- 상품 원본이미지/생성이미지/병합이미지는 전부 `shop-detail-images`(public) Storage 버킷의
  `{user_id}/products/{productId}/...` 경로에 저장한다. 클라이언트에서 Storage로 직접 업로드하는
  패턴(`lib/uploadImageClient.ts`)을 쓰는데, 이는 Vercel 서버리스 함수 요청 본문 크기 제한을
  우회하기 위함이다(insta_auto_poster/threads에서 검증된 패턴, 2026-08-13).

## 📦 n8n 파이프라인 이식 현황 (Phase 진행 상태)

| Phase | n8n 대응 | 상태 |
|-------|---------|------|
| 1 | #0 상품분석, #1 이미지생성(템플릿), #6 이미지병합 | ✅ 구현 완료 |
| 2 | #2 커스텀 이미지생성(섹션별 재생성) | ⏳ 예정 |
| 3 | #3 다국어생성 | ⏳ 예정 |
| 4 | #4 자유생성, #5 로고합성 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 사용자와 합의함(2026-08-13). 새 Phase를
시작할 때는 이 표를 갱신할 것.
