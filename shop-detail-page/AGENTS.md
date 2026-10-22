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
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (Gemini 상품분석/나노바나나 이미지 생성 등)

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
- 상품 원본이미지/생성이미지/병합이미지는 전부 `shop-detail-images`(**v1.15부터 비공개** — 화면은 `/api/image` 서명 주소, 서버는 `lib/storageImage.ts` download) Storage 버킷의
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
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (shop-detail-page)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 UI/UX 디자인 리뉴얼 — v1.06 (shop-detail-page)

- **스타일 템플릿**: `이커머스 셀러 스튜디오 스타일 (E-commerce Seller Studio Style)`
- **테마/배경색**: Clean Pure White (`#ffffff` & `#f8fafc`) 기반 네이버 스마트스토어/쿠팡 셀러센터 감성의 화이트 커머스 스튜디오.
- **주요 작업 내용**:
  1. **비주얼 가이드북 (`CommerceUsageGuide.tsx`)**: 4단계 자동화 파이프라인(등록 ➔ 분석 ➔ 15단 생성 ➔ 병합) 시각화 및 15개 섹션 블록 맵, 셀러 꿀팁 아코디언 탑재.
  2. **셀러 사이드바 리뉴얼 (`Sidebar.tsx`)**: 브랜드 헤더, v1.06 배지, 01~03 번호 스텝퍼, 하단 Gemini 15단 엔진 배너, 모바일 햄버거 토글 메뉴 탑재.
  3. **대시보드 메인 (`products/page.tsx`)**: 비주얼 가이드북 상단 접이식 탑재, 3D 패키지 빈 화면 일러스트, 상품 카드 그리드 리뉴얼.
  4. **신규 분석/등록 폼 (`products/new/page.tsx`, `ProductAnalyzeForm.tsx`)**: 점선 드래그앤드롭 업로더, 소구점 분석 폼, 알약형 모델 선택기 개선.
  5. **15단 섹션 뷰어 (`products/[id]/page.tsx`, `SectionImageGrid.tsx`)**: 15개 섹션 넘버링 배지(`01~15`), 썸네일 히스토리 바, 개별 재생성 버튼, 하단 고정 롱 이미지 병합 다운로드 바 구축.
- **인수인계 문서**:
  - 디자인 상세 인수인계: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
  - 개선사항 목록: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- **검수 브라우저**: Microsoft Edge 전용 (`msedge.exe`) — 데스크톱 (1440x900) 및 모바일 (375x812) 반응형 정상 검수 완료.
## 2026-10-16 사이드바 밀착 배치 및 직관적 아이콘 표준화 — v1.07 (shop-detail-page)

- **주인님 지시**:
  - "좌측메뉴의 접속계정,로그아웃 부분을 메뉴 밑으로 바로 붙여줘"
  - "이모티콘을 해당메뉴를 직관적으로 이해할수 있는 이모티콘으로 사용해줘"
  - "이모티콘 색상은 해당 프로그램 스타일에 맞게 수정해도되, 디자인 지침에 관련 내용추가해줘, 인수인계 문서에도 남겨두고"
- **주요 작업 내용**:
  1. **접속 계정/로그아웃 밀착 배치**: 기존 `mt-auto` 하단 고정을 제거하고, 유틸리티 메뉴 바로 아래 `border-t border-slate-200 pt-3` 위치에 바짝 밀착.
  2. **직관적인 Lucide 아이콘 표준화 & 프로그램 스타일 맞춤 색상화**:
     - 1단계: `ScanSearch` 상품 및 상세페이지 분석 (`text-blue-600` 스마트스토어 블루)
     - 2단계: `LayoutGrid` 상세페이지 생성·관리 (`text-indigo-600` 상세 섹션 인디고)
     - 유틸리티: `KeyRound` API키등록·플랫폼연동 (`text-amber-500` 골드 키)
     - 유틸리티: `BookOpen` 사용 안내 (`text-blue-600` 가이드북 블루)
     - 계정/로그아웃: `LogOut` (`text-slate-400` -> hover 시 `text-rose-500`)
     - 브랜드: `ShoppingBag` (`bg-blue-600 text-white`)
  3. **전용 가이드 페이지 신설**: `app/(dashboard)/guide/page.tsx` 라우트 신설로 메뉴에서 `사용 안내` 클릭 시 바로 가이드북 열람 가능.
  4. **디자인 메인 지침 개정**: 루트 `DESIGN.md` 원칙 7번 및 `docs/PROGRAM_DESIGN_STANDARD.md` 목표 5번에 "이모티콘 및 아이콘의 프로그램 스타일 맞춤 색상화" 공식 지침 추가.
- **배포 및 검수**:
  - Vercel 프로덕션 배포 완료 (`dpl_4qSahV4g5yfHH9mZbECzhUKMPotv`).
  - Microsoft Edge 전용 실세션(`buylifemall@naver.com`) 데스크톱/모바일 검수 완료 (`edge_shop_detail_sidebar_v107.png`, `edge_shop_detail_mobile_v107.png`).
- **라이브 URL**: `https://shop-detail-page.vercel.app`

## 2026-10-16 가이드북(/guide) 전면 고도화 및 5단계 실전 매뉴얼 구축 — v1.08 (shop-detail-page)

- **주인님 지시**:
  - "프로그램 사용방법을 더 자세하고 디테일하게 각 스텝마다 해야 하는것을 프로그램 로직 파악 후 매뉴얼 작업페이지를 보강해줘"
- **주요 작업 내용**:
  1. **실제 소스코드 기반 3대 인터랙티브 탭 구축 (`CommerceUsageGuide.tsx`)**:
     - `📋 5단계 완벽 실전 가이드`: STEP 00 (API키 등록) ~ STEP 04 (세로 롱 이미지 병합) 스텝별 필수/선택 입력값, 주의사항, 권장 이미지 사양(정방형 누끼) 반영.
     - `🧱 15대 필수 섹션 상세 가이드`: 01. 인트로 헤더부터 15. 구매전환 CTA까지 15개 섹션별 추천 구성 및 기획 의도 아코디언 탑재.
     - `💡 셀러 성공 꿀팁 & FAQ`: 고화질 정방형 누끼 촬영 팁, 섹션별 개별 재생성 & 히스토리 롤백, 사용자 직접 이미지 교체, 과대광고 심의 안내를 포함한 4대 실전 꿀팁 및 5대 트러블슈팅 FAQ 아코디언 탑재.
  2. **모바일 반응형 최적화**: 375px 모바일 뷰에서도 탭 버튼과 단계별 카드, 15개 섹션 아코디언이 가로 잘림 없이 1열 카드 구조로 매끄럽게 반응하도록 설계.
  3. **버전 및 DB 동기화**: 코드 `lib/version.ts` `APP_VERSION = "v1.08"` 및 Supabase DB `programs.version = 'v1.08'` 동기화 완료.
- **배포 및 검수**:
  - Vercel 프로덕션 배포 완료 (`dpl_35BMWwMcKgnYyQ27Bn6fTMAdaMFx`).
  - Microsoft Edge 전용 실세션(`buylifemall@naver.com`) 검수 완료:
    - `edge_shop_detail_guide_steps_v108.png` (5단계 가이드)
    - `edge_shop_detail_guide_sections_v108.png` (15대 섹션 가이드)
    - `edge_shop_detail_guide_faq_v108.png` (셀러 꿀팁 & FAQ)
    - `edge_shop_detail_guide_mobile_v108.png` (모바일 375px)
- **라이브 URL**: `https://shop-detail-page.vercel.app/guide`

## 2026-10-16 도메인 통일(SSO) — v1.09 (Claude Code 윈도우)
- 새 주소 `https://shop-detail-page.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 옛 주소 → 새 주소 /products 재로그인 없이 열림(시험 계정 표시)
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## v1.10 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `lib/ai/imageModels.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.11 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (4묶음 A 직접 호출형, Claude Code 윈도우)
- `lib/ai/gemini.ts` `generateSectionImageWithGemini()`가 공용 사본으로 위임(원본 이미지 조각·비율·화질 그대로, 온도는 원래처럼 미지정). `imageModels.ts`의 두 모델 이름을 공용 등급표 2K·Pro 등급에서 가져옴(값 동일). 키가 주소(`?key=`)에서 머리글로 바뀜. 시간 제한 240초·**재시도 없음**(재시도하면 함수 한도 300초 초과). 첫 조각만 보던 문제 수정.
- 공용 사본이 주는 것: 키 머리글 전송, 시간 제한, 응답의 모든 조각에서 **최종** 이미지 선택(gemini-3-pro-image의 중간 초안 `thought` 조각 제외), 안전 차단·한도·키 오류 구분, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc 0·기존 테스트 통과, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()`/`NANO_BANANA_MODEL_CONFIGS` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.12 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.13 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 이 프로그램은 이미 `retries: 0`이라 동작 변화 없음(버전만 맞춤).
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.14 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 v1.15 — 이커머스 병합 E0: 비공개 저장소 + 30일 자동 정리 (Claude Code 맥미니, 보조 계정 · 배포 대기)
- 근거: 이커머스 병합 분석 [`../docs/analysis-ecommerce-consolidation-20261021/REPORT.md`](../docs/analysis-ecommerce-consolidation-20261021/REPORT.md) E0(주인님 승인 「E0부터 E2까지 순서대로」). 이 앱이 E1(12단)·E2(자동생성기)를 받아들일 기준 앱이라 먼저 최상위 규칙 위반을 없앰.
- **비공개 저장소**: 마이그레이션 `supabase/migrations/20261021_private_bucket_v1_15.sql`(버킷 `public=false`, 전체 읽기 정책 → 본인 폴더 읽기). DB에 저장된 기존 공개 주소 문자열은 그대로 두고 **경로 식별자**로만 씀(데이터 이전 없음, 저장 주소 117개 전부 본인 폴더 경로로 해석됨을 확인).
  - 화면: `lib/imageSrc.ts` `imageSrc()` → `/api/image?p=<경로>`(`app/api/image/route.ts`: 로그인 + 본인 폴더 확인 후 1시간 서명 주소로 302, 브라우저 캐시 50분). `<img>` 6곳 교체.
  - 서버: `lib/storageImage.ts` `downloadImageAsBase64()` — 세션 클라이언트 `download()`(RLS 본인 폴더). 상품 분석·섹션 생성·긴 PNG 합치기 3곳 교체. **우리 버킷 밖 주소는 거부**(화면에서 넘어온 임의 주소를 서버가 대신 받아오던 빈틈 제거). 옛 `fetchImageAsBase64()` 삭제.
- **30일 자동 정리**: `app/api/cron/cleanup-generated/route.ts` + `vercel.json`(매일 UTC 19:10 = 한국 04:10, `CRON_SECRET`). 30일 지난 상품의 폴더 파일·대표/참고 이미지 → 상품 행 삭제(섹션 이미지·내보내기 행은 cascade), 상품 없이 30일 지난 업로드 파일 정리. 회원 프롬프트 템플릿은 대상 아님. **유예**: 2026-10-21 이전 자료(상품 4·파일 103, 9월 작성)는 바로 지우지 않고 `RETENTION_GRACE_END` 2026-11-21 KST까지 아무것도 지우지 않음(주인님 결정). 목록 화면에 30일·유예 안내.
- 그 밖: `lib/ai/gemini.ts` 키를 주소(`?key=`) 대신 `x-goog-api-key` 머리글로. 섹션 이미지 DB 저장 실패 시 방금 올린 파일 삭제(D-48-01 고아 파일 일부 해결 — 동시 생성 이력 덮어쓰기는 남음).
- 검수(맥미니): tsc 0. 저장 주소 해석 무료 시험(117/117). 정리 대상 읽기 전용 모의 집계(파일 106 중 30일 지난 103, 상품 4/4 — 유예로 지금은 0건 삭제). 빌드·배포·실제 화면은 윈도우. AI 호출 0.
- **윈도우 CLI 다음 첫 단계**: [`docs/IMPROVEMENT_HANDOFF_20261021.md`](docs/IMPROVEMENT_HANDOFF_20261021.md).

## 2026-10-21 v1.16 — 이커머스 병합 E1: AI 12단 상세페이지 기능 이관 (Claude Code 맥미니, 보조 계정 · 배포 대기)
- **상세페이지 규격**: 상품마다 `기본 15섹션 / 쿠팡 로켓배송형 12단 / 스마트스토어 감성 후기형 9단` 선택(`lib/layoutPresets.ts`, 저장 후 변경 불가). 마이그레이션 `supabase/migrations/20261021_layout_presets_v1_16.sql` — `shop_prompt_templates.layout_preset`·`shop_products.layout_preset`(기본 `shop15`, 기존 행 영향 없음) + 시스템 템플릿 12단 12행·9단 9행(장면 구성은 12단 `detailEngine.ts` 시퀀스, 프롬프트는 이 앱 `{{변수}}` 형식으로 새로 씀 — 근거 없는 가격·인증·수치 금지 지침 포함). 상품 화면은 상품 규격의 템플릿만 불러옴. 화면의 「15」 고정 문구를 실제 섹션 수로.
- **사양서 분석**: 「📄 사양서 불러오기」 — TXT·MD는 원본 정보 칸에 내용을 붙이고, **PDF는 본인 폴더(`<회원id>/products/docs/`)에 올려 분석 때 Gemini에 문서(`application/pdf`)로 넘김**(12단은 PDF를 `readAsText`로 읽어 사실상 분석이 안 됐음). 관리용 상품명을 이름 힌트로 함께 보냄. 분석 프롬프트에 「확인할 수 없는 인증·수치는 지어내지 말고 확인 필요」 추가, 분석 결과 위에 「AI 추정 — 실제와 맞춰 고치기」 안내(D-50-01 대응).
- **모바일 미리보기**: 상품 화면 「📱 모바일 미리보기」 — 휴대폰 틀 안에서 선택된 섹션 이미지를 세로로 스크롤(긴 PNG 폭은 원래 860px이라 그대로).
- **12단 자료 가져오기**: `/products/import`(`components/products/LegacyImportForm.tsx` + `importLegacyProductAction`). 12단 화면에서 받은 JSON 백업을 올리면 실제 이미지(data: 주소의 PNG·JPEG·WEBP)만 본인 폴더에 올려 상품(쿠팡 12단/스토어 9단 규격) + 장면 이미지(장면 순번 = 섹션 순서)로 저장. SVG 대체 그림·기본 예시 프로젝트·외부 주소는 건너뜀. AI 호출 없음. 12단의 장면 카피 문구는 이미지 밖에 얹던 방식이라 옮기지 않음(화면에 안내). 목록에 「📦 12단 자료 가져오기」 버튼.
- 검수(맥미니): tsc 0. 가져오기 판단 로직 무료 시험(기본 예시 제외·실제 장면 1·SVG/외부 주소 null). AI 호출 0.
- 하지 않은 것: 사진 없이 상품명만으로 상품 만들기(12단은 가능했으나 이 앱은 실제 상품 사진을 기준으로 이미지를 만드는 구조라 유지), 12단 장면 카피 이관.

## 2026-10-21 v1.17 — 이커머스 병합 E2: HTML 상세페이지 내보내기 (자동생성기 v1에서 이관, Claude Code 맥미니 · 배포 대기)

- **이름 변경(2026-10-22 주인님 확정)**: 「상세페이지 자동화(15p)」 → **「AI 상세페이지 자동화」**. 화면(사이드바·로그인·탭 제목·사용 안내·권한 오류 문구)과 12단·자동생성기 이동 안내 문구를 함께 바꿨고, 같은 v1.17 배포에 포함한다(버전 추가 상승 없음). DB `programs.name`은 `E2_hide_auto_detail_and_catalog.sql`에 들어 있다.
- 상품 화면 아래 `components/products/HtmlExportPanel.tsx` 「🧾 HTML 상세페이지로 내보내기」: 쿠팡·스마트스토어·프리미엄 스타일 중 고르면 `POST /api/products/[id]/export-html`이 이미 만든 섹션 이미지 + 상품 정보로 HTML을 작성(**Gemini 텍스트 1회** `gemini-3.5-flash`, 이미지 생성 없음, `lib/ai/htmlDetailPrompt.ts`).
- 서버는 `[IMAGE_N]` 자리와 `/api/image` 주소만 돌려주고(응답 한도 4.5MB), 브라우저가 `/api/image?…&w=860`(서버가 sharp로 860px JPEG로 줄여 같은 주소에서 보냄 — 교차 출처 제한 회피)을 받아 HTML 안에 넣은 뒤 파일로 내려받음. 결과는 서버에 저장하지 않음. 미리보기는 `sandbox` iframe(스크립트 실행 안 함, D-49-01).
- 자동생성기 프롬프트에서 **버린 것**: 판매량·만족도·후기·재구매율을 「AI 추정값」으로 채우고 후기를 「자동 생성」하던 지시(허위 광고 위험) → 정보가 없으면 그 블록을 빼도록. 카운트다운·카운트업 JavaScript → 정적 HTML/CSS만(모델이 넣어도 `sanitizeGeneratedHtml`이 `<script>`·`on*` 속성 제거). Claude 키 필수 → 이 앱의 Gemini 키. Puppeteer 서버 PNG는 옮기지 않음(이 앱의 긴 PNG 내보내기가 있음).
- 검수(맥미니): tsc 0. 정리 함수 무료 시험(스크립트·on 속성 제거, `[IMAGE_1]` 치환이 `[IMAGE_10]`을 건드리지 않음). AI 호출 0.
- 카탈로그 설명 갱신안: `../docs/analysis-ecommerce-consolidation-20261021/E2_hide_auto_detail_and_catalog.sql`(표준 형식, 보이는 글자 478자).

## 2026-10-22 v1.18 — 실제 생성 시험 후속: 개별 섹션 생성·규격 중립 문구·근거 없는 혜택 문구 차단 (Claude Code 맥미니 · 배포 대기)
- **개별 생성 버튼(S-22-01)**: `SectionImageGrid.tsx` — 아직 만들지 않았거나 실패한 섹션 헤더에 「✨ 생성 · 약 $0.10」(선택 모델 단가) 버튼. 전에는 처음 만들 때 「N개 섹션 전체 자동 생성」뿐이라 한 장만 만들 수 없었다. 전체 생성 중에는 비활성.
- **규격 중립 문구(S-22-02)**: 좌측 메뉴 「15단 섹션 생성」「15-Section Commerce Studio」「Gemini 15단 생성 엔진」·새 상품 화면 「15개 섹션 이미지」 → 12단·9단에도 맞는 문구.
- **근거 없는 혜택 문구 차단(S-22-03)**: `lib/actions/images.ts` `NO_PRICE_PROMOTION_GUIDE` — 할인가가 비어 있으면 모든 템플릿(시스템·회원, 전 규격)에 「가격·할인·특가·한정·이벤트·사은품 문구 금지」를 붙임. 마이그레이션 `supabase/migrations/20261022_promo_templates_v1_18.sql` — 쿠팡 12단 `cp_promotion`·9단 `ss_hook_promo` 시스템 행의 「한정 혜택 강조」「런칭 특가 허용」 지시 제거 + `programs.version` v1.18.
- 검수(맥미니): tsc 0. AI 호출 0.
- **윈도우 CLI 다음 첫 단계**: ① `20261022_promo_templates_v1_18.sql` 적용(옛 코드 영향 없음) → ② `shop-detail-page` 배포 → ③ 크롬에서 상품 화면 대기 섹션의 「✨ 생성」 버튼·좌측 메뉴 문구 확인(생성 버튼은 누르지 않음).

## 2026-10-22 v1.19 — 이력 원자적 추가·사용 안내 3규격 기준·상품소싱 연결 (Claude Code 맥미니 · 배포 대기, v1.18 미배포분 포함)
- **이력 덮어쓰기 방지(D-48-01 남은 부분)**: 새 DB 함수 `shop_append_section_image`(`supabase/migrations/20261022_append_section_image_v1_19.sql`, `security invoker` — 회원 본인 RLS 그대로, `user_id = auth.uid()` 고정)가 `insert … on conflict do update set image_urls = 기존 || 새것` 한 문장으로 붙인다. 전에는 읽은 뒤 upsert라 같은 섹션을 두 창에서 동시에 만들면 한쪽 이력(비용 낸 이미지)이 사라질 수 있었다. `lib/actions/images.ts` `appendSectionImage()`를 AI 생성·직접등록 두 곳이 같이 쓰고, 함수가 아직 없는 DB(`PGRST202`·`42883`)에서는 예전 방식으로 동작(배포 순서가 바뀌어도 생성이 멈추지 않음). `types/database.types.ts` `Functions`에 타입 추가.
- **사용 안내(/guide)**: 15섹션 고정 문구 → 15섹션·쿠팡 12단·스마트스토어 9단 기준. 규격 탭 맨 위에 규격 3종 카드(`lib/layoutPresets.ts` 값 그대로), 모델 단가는 `IMAGE_MODEL_COST_USD`에서 읽어 규격별 합계 표시(예전 「Gemini 2.5 Flash 장당 $0.038」 등 옛 값 제거), 「✨ 생성」 버튼·모바일 미리보기·HTML 내보내기(비용 10원 안팎·저장 안 됨) 설명, FAQ 2개(규격 고르기·롱 이미지와 HTML 차이) 추가.
- **상품소싱 연결**: `/products/new?from=sourcing&name=…&source=…`이면 상품명(≤100자)·원본 정보(≤1000자)를 채우고 안내 띠를 보여 준다(`ProductAnalyzeForm` `initialLabel`·`initialSourceText`). 가격은 받지 않음(도매가가 할인가로 오해되면 혜택 문구가 생김), 사진은 회원이 직접. 보내는 쪽: `trending-product-finder` v1.23 `lib/shopDetailLink.ts`.
- **추가(같은 v1.19)**: ① 상품소싱 마진 계산기의 추천판매가를 `price`(1~9자리 숫자)로 받으면 **「정상가」 칸에만** 채운다 — 「할인가 / 판매가」는 비워 두므로 `NO_PRICE_PROMOTION_GUIDE`가 붙어 이미지에 가격·특가 문구가 생기지 않는다. 분석 결과가 가격 칸을 덮어쓰지 않음을 확인. ② 사용 안내 규격 탭: 규격 카드를 누르면 그 규격의 섹션별 전략 카드(쿠팡 12단 12개·스마트스토어 9단 9개, 이름·순서는 DB 시스템 템플릿과 같음)로 바뀐다. 15섹션 #15 CTA 안내의 「오늘만 한정 혜택·사은품·한정 수량」 권장을 「실제 진행 중인 혜택만」으로 바로잡음.
- 검수(맥미니): tsc 0, `next lint`(바뀐 파일) 0. AI 호출 0, 비용 0.
- **추가 2(같은 v1.19, S-22-10 1단계)**: 섹션 카드 버전 줄 오른쪽 「🧵 쓰레드 홍보글」(완료된 섹션만) — 선택한 이미지 1장의 **비공개 버킷 안 위치**와 본문 초안(상품명·핵심 특징 최대 3줄·할인가가 있을 때만 가격, `lib/threadsLink.ts`)을 쓰레드 쇼핑제휴 `/posts/new`로 새 창에 넘긴다. 서명 주소는 넘기지 않고, 받는 쪽(threads-affiliate-poster v1.81 `src/lib/shopDetailImport.ts`)이 본인 폴더인지 확인한 뒤 자기 공개 저장소로 복사한다. AI 호출 없음. 인스타는 받는 화면이 없어 2단계로 남김.
- **윈도우 CLI 다음 첫 단계**: v1.18이 아직 배포 전이면 한 번에 — ① SQL `20261022_promo_templates_v1_18.sql`(이미 적용했으면 건너뜀) → ② SQL `20261022_append_section_image_v1_19.sql` → ③ `shop-detail-page` 배포 1회(v1.19) → ④ 크롬 확인(생성 버튼은 누르지 않음): `/guide` 규격 카드·단가, `/products/new?from=sourcing&name=시험상품&source=원본 링크: https://example.com` 미리 채움, 대기 섹션 「✨ 생성」 버튼.
