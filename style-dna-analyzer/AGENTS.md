# STYLE DNA ANALYZER (style-dna-analyzer) — AI 에이전트 인수인계 문서

> **공식 서비스 URL**: https://style-dna-analyzer.buylife.xyz  
> **현재 버전**: `v1.22` (크리에이티브 아틀리에 스타일 — 스타일 DNA 랩 에디션)  
> **프로젝트 위치**: `D:\Antigravity\AIMaster\style-dna-analyzer`  
> **Vercel 프로젝트**: `buylife/style-dna-analyzer` (Aliased: `style-dna-analyzer.vercel.app`)

---

## 1. 프로그램의 사용목적 및 대상
- **사용목적**:
  - 임의의 레퍼런스 이미지를 업로드하면 시각적 유전자(카메라 렌즈·구도, 조명 환경, 지배적 색상 HEX 팔레트, 텍스처 질감, 아티스틱 사조)를 역공학으로 분해·추출하여 동일하거나 변형된 스타일의 고품질 이미지를 재현할 수 있는 마스터 프롬프트를 자동 생성.
  - 스타일을 100% 흡사하게 복제하는 「클론(Clone) 모드」와 0~100% 강도로 원하는 요소만 선택 변형하는 「변이(Mutation) 모드」를 제공.
- **주요 대상**:
  - 일관된 비주얼 톤앤매너의 상품 썸네일, 광고 이미지, 카드뉴스, 유튜브 아트워크를 기획·제작하고자 하는 크리에이터, 이커머스 셀러, AI 아트 디자이너.
  - 미드저니, FLUX, 스테이블 디퓨전, DALL-E 3, 바나나 캔버스 등 다양한 AI 이미지 생성 도구를 사용하는 파워 유저.

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 기술 스택
- **프레임워크 및 코어**: Next.js 16.2.11 (Turbopack App Router), React 19.2.4, TypeScript 5.x
- **이미지 프로세싱 및 비주얼 연산**: Sharp 0.35.5 (서버 픽셀 버퍼 스캔, 팔레트 추출, WebP 변환), HTML5 Canvas 픽셀 처리
- **스타일링 & UI 시스템**: Tailwind CSS v4, Lucide React 1.48.0, 크리에이티브 아틀리에 다크 네이비 테마 (`#0c0f17`, `#131824`, `#222d42`, 시안 `#06b6d4`, 바이올렛 `#8b5cf6`)
- **데이터베이스 & 스토리지**: Supabase (`sda_analyses` 테이블, `style-dna-images` 프라이빗/공개 버킷)
- **인증 및 보안**: Supabase SSR 쿠키 세션 기반 회원 인증, BYOK (회원 본인 API 키 직접 연동 및 암호화 보관, 타 회원 및 관리자 키 공유 금지)
- **검수 환경**: Microsoft Edge 브라우저 최전면 포그라운드 (`headless: false`, 10분 창 화면 유지), Playwright 기반 자동화 검수

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점

### 3-1. 핵심 기능 및 3단계 파이프라인
1. **보관함 대시보드 (`/dashboard`)**:
   - 회원이 분석한 스타일 DNA 카드 리스트, 대표 썸네일 및 색상 팔레트 띠, 모드별 배지, 삭제 및 복원 관리.
2. **1단계 이미지 분석 스튜디오 (`/analyze`)**:
   - 이미지 업로드 (최대 1600px 클라이언트 축소) → Sharp 기반 HEX 팔레트 산출 + Gemini 멀티모달 Vision AI 분석.
   - 6대 유전자 파라미터(카메라, 조명, 색상, 질감, 무드, 네거티브) 역공학 및 마스터 프롬프트(EN/KO) 자동 생성.
   - SVG 도넛 차트 팔레트, 실시간 스캔 빔 애니메이션, DNA 파라미터 매칭 스코어(AI 추정치) 시각화.
3. **2단계 프롬프트 보정 (`/refine`)**:
   - 추출된 DNA를 바탕으로 피드백(자연어 또는 빠른 선택 칩) 입력 시 프롬프트 미세 조정 및 최대 20개 보정 이력 관리.
4. **3단계 결과 테스트 (`/test`)**:
   - 피사체(Subject)를 입력하여 회원 본인 Gemini 키 기반으로 새 이미지를 렌더링하고, 원본 이미지와의 1:1 색감 일치율(히스토그램 교차 검증)을 실시간 비교.
5. **독립 비주얼 가이드북 (`/guide`)**:
   - 신설된 단계별 파이프라인 안내, 6대 DNA 아키텍처 카드, FAQ 5종 아코디언, 본인 API 키 발급 가이드.

### 3-2. 장점 및 단점
- **장점**:
  - 팔레트는 AI 추측이 아닌 서버 Sharp의 픽셀 실측치로 산출되어 매우 정밀함.
  - 마스터 프롬프트가 영문/한글 쌍으로 생성되어 글로벌 생성 AI 도구(Midjourney, FLUX 등)에 즉시 복사 사용 가능.
  - 다크 아틀리에 테마로 전문 랩(Lab) 연구실 분위기의 높은 시각적 몰입도 제공.
- **단점**:
  - Vercel Serverless Function 환경에서 Sharp 리눅스 바이너리 종속성 주의 필요 (`next.config.ts`에 `outputFileTracingIncludes` 명시 필수).
  - 결과 테스트 이미지 생성 시 Gemini 이미지 생성 쿼터 필요 (회원 본인 키 필수).

---

## 4. 현재 버전 및 버전별 변경 히스토리

### [v1.22] - 2026-10-19 (현재)
- **크리에이티브 아틀리에 스타일 DNA 랩 에디션 UI/UX 전면 리뉴얼**:
  - 딥 미드나잇 다크 네이비(`#0c0f17`), 서피스(`#131824`), 보더(`#222d42`), 시안 블루(`#06b6d4`), 일렉트릭 바이올렛(`#8b5cf6`) 토큰 구축.
  - 사이드바 네비게이션 표준화: 브랜드 로고 배지, `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설, 사용자 계정 세션 배지.
  - `/dashboard`, `/analyze`, `/refine`, `/settings`, `/test` 전 화면 다크 아틀리에 테마 무결성 토큰화.
- **독립 비주얼 에디토리얼 가이드북 (`/guide`) 신설**:
  - 히어로 배너, 3단계 파이프라인 카드, 6대 DNA 파라미터 분석 안내, 회원 본인 API 키 연동 원칙 배너, FAQ 5종 아코디언, 빠른 시작 CTA.
- **버전 3중 동기화**: `package.json` (1.22.0), `src/lib/version.ts` (v1.22), Supabase DB `programs` (v1.22).
- **검수 완료**: 단위 테스트 23개 전건 통과, `npx tsc --noEmit` 에러 0건, Next.js 프로덕션 빌드 성공, Vercel 프로덕션 배포 완료, Microsoft Edge 최전면 포그라운드 실세션 검수 6종 캡처 완료 및 10분 창 유지.

### [v1.06] - 2026-10-12
- 화이트 베이스 고가독성 클린 테마 적용, 스튜디오 레이아웃 튜닝.

### [v1.03] - 2026-10-12
- 원본 `style-dna-3.vercel.app` 번들 역분석 기반 변이 강도 슬라이더(0~100%), 원본 참조 이미지 태그 주입 토글, 12종 화면 비율 풀 지원, 리치 구조 청사진 렌더러 도입.

### [v1.00] - 2026-10-11
- 프로그램 최초 출시: 3단계 파이프라인, Sharp 팔레트 계산, Gemini Vision 분석, 히스토그램 색감 일치율 측정.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내용은 `docs/IMPROVEMENT_BACKLOG.md` 참조.
  1. 분석된 스타일 DNA를 JSON 파일 및 프리셋 카드로 내보내기/가져오기 기능.
  2. 다중 이미지(2~3장) 업로드 시 스타일 융합(DNA Blend) 모드 추가.
  3. 실시간 프롬프트 토큰 하이라이팅 및 키워드 가중치(::1.5) 시각적 편집 인터페이스.

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안
1. **`ai-image-studio` (AI 이미지 자동화) 및 `banana-canvas` 연계**:
   - `style-dna-analyzer`에서 역공학한 마스터 프롬프트와 팔레트 HEX 코드를 클릭 한 번으로 `ai-image-studio`의 캔버스 템플릿에 전송하여 즉각적인 파생 아트워크 생성 워크플로우 구축.
2. **`seo-thumbnail-pro` (22번) 및 `thumbnail-master` 연계**:
   - 잘 팔리는 인기 유튜브 썸네일의 조명과 텍스처 DNA를 추출하여 썸네일 제작 도구의 기본 조명 프리셋으로 공급.
3. **`cardnews-studio` 연계**:
   - 인스타그램 인기 카드뉴스 표지 이미지를 분석하여 톤앤매너 프롬프트를 카드뉴스 템플릿 색상으로 동기화.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI 개선안
1. **인터랙티브 컬러 팔레트 클립보드 복사 원클릭 피드백**:
   - 팔레트 바의 각 색상 칩을 클릭했을 때 미세한 진동 애니메이션과 함께 HEX 코드가 즉시 복사되는 마이크로 인터랙션 강화.
2. **스플릿 비교 뷰어 (Before & After 슬라이더)**:
   - 3단계 결과 테스트에서 원본 이미지와 생성 이미지를 세로 분할 슬라이더를 마우스로 좌우 드래그하며 비교할 수 있는 인터랙티브 뷰어 도입.
3. **프롬프트 템플릿 원터치 번역 토글**:
   - 영문 프롬프트의 각 토큰을 마우스 호버 시 한국어 툴팁으로 실시간 매핑 표시.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 — OpenAI 요청 규칙 공용 기준 코드 사본 적용 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `style-dna-analyzer/src/lib/ai/openaiRequestParams.ts`는 공용 기준 코드 `openai-request-params` 사본(기준 `naver-blog-seo-studio/lib/ai/openaiRequestParams.ts`) — **직접 고치지 않는다**. 「GPT-4 계열일 때만 온도」 분기를 `openAIGenerationParams(model, { temperature })`로 바꿈(동작 같음, 추론 모델 규칙은 기준 한 곳에서 관리).
- 검수: tsc 0, 기존 테스트 통과. 급하지 않은 정리라 배포하지 않음(빌드 비용 규칙). **다음에 이 프로그램을 배포하는 CLI는 버전 +0.01(코드·DB)하고 버전 기록에 이 항목을 적을 것.** 목록: 루트 `docs/SHARED_MODULES.md` 「미배포 사본」.
- **다음에 이 프로그램을 고칠 때 함께(주인님 결정 2026-10-20)**: 글 모델 선택 칸(`src/app/(dashboard)/analyze/page.tsx · test/page.tsx`) 아래에 모델 성격·상대 비용·GPT-5 지연 안내 붙이기 — 사본에 이미 `openAIModelBadge`·`openAIModelTierHint`·`openAIModelNotice`가 있어 화면 한두 줄만 추가. 기준 구현·방법: 루트 `docs/SHARED_FEATURE_MAP.md` §8.

## 2026-10-21 v1.23 — 원본 이미지 저장소 비공개 + 30일 정리 cron (Claude Code 윈도우)
- 배경: 이미지 카테고리 병합 분석([보고서](../docs/analysis-image-consolidation-20261021/REPORT.md))에서 원본 버킷 `style-dna-images`가 공개(주소만 알면 누구나 열림)이고 30일 삭제가 없다는 점 발견 → 주인님 결정으로 병합보다 먼저 보강.
- 코드: `src/lib/dna/records.ts` 공개 주소 함수 제거 → `signImagePaths`(서명 6시간)·`toSignedRecord`. 화면으로 나가는 응답 4곳(목록·상세·분석·보정)만 서명 주소를 붙이고, 서버 안에서만 쓰는 `toRecord`(보정 전 읽기·시험 생성)는 주소 없이. 정리 `src/app/api/cron/cleanup`(Vercel cron 매일 03:00 KST, `Bearer CRON_SECRET`, 비밀값 비면 거부, 생성일 30일 지난 분석 → 원본 파일 먼저 삭제 후 행 삭제).
- 환경변수 추가(승인): `CRON_SECRET`(Production, Sensitive, 임의값·출력 안 함). `vercel.json`에 crons 추가.
- 운영 DB: 버킷 `public=false`, `programs.version='v1.23'`(기록 `supabase/migrations/20261021_v1_23_private_bucket.sql`).
- 검수: tsc·`npm test` 23개·build, 배포 Ready, 정리 주소 비밀값 없음 401, 옛 공개 주소 400·서명 주소 200, 크롬 일반 회원 보관함 2건 서명 주소 표시·상세 API 200. 새 분석(유료 AI)은 실행하지 않음.
- 참고: `node --test tests/*.test.mjs`로 직접 돌리면 `@/lib` 별칭을 못 풀어 dna 시험이 실패한다 — 반드시 `npm test`(tsx 로더).

## 2026-10-21 v1.24 — 저장된 기록으로 「다시 분석」 실패 버그 수정 (Claude Code 윈도우)
- 원인: 새 이미지 없이 다시 분석하면 화면이 원본 **주소**(`record.imageUrl`)를 보내는데 `api/analyze`는 data URL만 받아 항상 실패했다(v1.23 이전부터).
- 수정: 화면은 새 이미지가 없으면 `sourceId`(기록 id)를 보내고, 서버는 본인 기록인지 확인한 뒤 비공개 저장소에서 원본을 읽어 분석(새 기록으로 저장 — 기존 동작과 같음). 원본이 30일 정리로 지워졌으면 「다시 올려 주세요」 안내.
- 검수: tsc·`npm test` 23개·build, 배포 Ready, DB v1.24. 크롬(관리자 계정 — 그때 크롬이 관리자로 로그인돼 있었음, 본인 키) 시험 이미지 분석 1회 → 그 기록으로 변형 모드 다시 분석 1회 성공(`gemini-3.5-flash-lite`, 팔레트 5색·서명 주소), 시험 기록 2개 삭제.
