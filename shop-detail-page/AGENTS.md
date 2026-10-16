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

