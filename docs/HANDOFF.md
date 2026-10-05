# 작업 인수인계 현황판 (HANDOFF.md)










## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.37, 2026-10-05)

- **NanoBanana 2-1K (표준 경량 모델) 네이밍 포맷 통일 및 2K 기본값 복원 (v1.37)**:
  - 주인님 피드백 반영: `NanoBanana 2-1K (표준 경량 모델)` 형식으로 전체 나노바나나 라인업 네이밍 포맷 일치 (`NanoBanana 2-2K (고화질 시네마틱 · 기본 추천)`, `NanoBanana 2-1K (표준 경량 모델)`, `NanoBanana 2-4K (울트라 HD)`, `NanoBanana Pro (프로페셔널 정밀 비주얼)`).
  - 나노바나나 기본 선택값을 `2-2K`(`nanobanana-2-2k`)로 재설정하고 드롭다운 최상단 배치.
  - 브라우저 localStorage 이전 캐시 간섭 방지 마이그레이션 플래그(`threads_post_img_default_v137`) 적용으로 NanoBanana 선택 시 2K 모델 기본 선택 보장.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.37`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.36, 2026-10-05)

- **글 생성 기본 선택 모델 GPT-4.1 설정 (v1.36)**:
  - 새 게시글 작성 화면(`/posts/new`) 진입 시 기본 선택 엔진 및 모델을 `GPT / GPT-4.1`로 항상 선택되도록 설정.
  - OpenAI 모델 목록 최상단 첫 번째 항목으로 `GPT-4.1` 배치.
  - 브라우저 localStorage 이전 캐시 간섭 방지 마이그레이션 플래그(`threads_post_ai_default_v136`) 적용.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.36`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.35, 2026-10-05)

- **실시간 프리뷰 & 검수 및 즉시 포스팅 vs 임시저장 2대 스마트 분기 프로세스 구축 (v1.35)**:
  - 사용자 프로세스 최적화 지시 완벽 반영: "생성된 그 자체로 자동 포스팅도 되고, 임시저장으로 생성된 콘텐츠와 이미지를 추가/삭제 영상 추가 후 최종 발행".
  - **안전 백업 생성**: 언제든 100% 즉시 원복할 수 있도록 `ProductPostForm.backup-v1.34.tsx` 백업 파일 생성 완료.
  - **1) 상단 실시간 원클릭 생성 액션 바**: `[ ⚡ AI 글 & 이미지 생성하기 ]` 클릭 시 페이지 이동 없이 현재 화면에 본문과 고화질 이미지를 즉시 렌더링.
  - **2) 자유로운 검수 및 편집**: 본문 `[ 🔄 AI 글만 다시 생성 ]`, 이미지 ✕ 삭제/추가/정렬, 동영상 첨부 등 화면에서 자유롭게 다듬기 지원.
  - **3) STEP 3 2대 스마트 분기 액션 버튼**:
    - 🚀 `[ ⚡ 즉시 Threads에 포스팅하기 ]`: 확인된 내용 그대로 즉시 발행 (미생성 상태 클릭 시 자동 생성 후 즉시 발행 원클릭 지원).
    - 📁 `[ 💾 임시저장하기 ]`: 보관함에 안전하게 임시저장.
    - ⏰ `[ 📅 예약 발행 접이식 영역 ]`: 특정 일시 예약 포스팅 지원.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.35`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.34, 2026-10-05)

- **글 생성 엔진 및 이미지 모델 선택 버튼 활성 주황색(Amber) 통일 (v1.34)**:
  - `색상.png` 스크린샷 피드백 반영: 모델별로 상이하던 선택 버튼 색상(검정, 보라, 파랑, 초록 등)을 배제하고, "선택된 모델은 지금 사용된 주황색으로 보여줘, 선택 안 된 건 흰색 바탕이고" 지시 완벽 구현.
  - 글 생성 엔진(GPT / Claude / Gemini) 및 이미지 모델(NanoBanana / GPT Image / FLUX 2.0 / Z-Image) 모두:
    - 선택 시: 선명한 주황색(`border-amber-500 bg-amber-500 text-white shadow-xs`)
    - 미선택 시: 깔끔한 흰색 바탕(`border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100`)
  - STEP 2 전체 영역이 통일감 있는 프리미엄 주황색 테마로 정돈.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.34`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.33, 2026-10-05)

- **AI 이미지 생성 버튼 상시 주황색 노출 및 비활성화 회색 변환 방지 (v1.33)**:
  - `주황색.png` 스크린샷 피드백 반영: 프롬프트 미입력 시 버튼이 `disabled` 상태로 인해 회색 박스로 변하여 주황색 테마가 보이지 않던 문제를 근본 해결.
  - `Button.tsx`의 `amber` variant에서 `disabled:opacity-60`을 적용하여 비활성화 시에도 주황색 톤 유지.
  - `ProductPostForm.tsx`에서 버튼 `disabled` 조건 중 `(!imagePrompt.trim() && !selectedProduct)`를 제거하여, 초기 진입 시에도 상단 Gemini 버튼과 동일한 선명한 주황색(`bg-amber-500 text-white`)으로 상시 노출.
  - 버튼 내 이모티콘을 화이트 원형 칩(`bg-white`) 내 `✨`로 구성하여 시인성 및 가독성 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.33`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.32, 2026-10-05)

- **AI 이미지 생성 버튼 상단 일치형 주황색(Amber) 테마 및 이모티콘 독립 색상 연동 (v1.32)**:
  - "위에 주황색 색상으로 맞춰줘", "이모티콘은 다른 색상으로 해야겠지" 피드백 반영: 상단의 대표 이미지 모델 선택 버튼(NanoBanana / Google Gemini)과 동일한 따뜻한 주황색(`amber-500`)으로 색상 일치.
  - `Button` 컴포넌트에 `amber` variant(`bg-amber-500 text-white hover:bg-amber-600`)를 신설 및 적용하여, 상단 영역과 완벽한 톤앤매너 일체감 및 뛰어난 가독성 구현.
  - 버튼 내 이모티콘을 반투명 화이트 칩(`bg-white/25`) 위에 화사한 골드 옐로우 `Sparkles` 아이콘(`fill-yellow-300 text-yellow-100`)으로 구성하여, 주황색 배경 위에서 이모티콘이 묻히지 않고 선명하게 돋보이도록 차별화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.32`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.31, 2026-10-05)

- **AI 이미지 생성 버튼 바탕색 및 가독성 개선 (v1.31)**:
  - 기존 흰색 바탕(secondary)으로 인해 흰색 카드 및 인풋 필드 옆에서 눈에 잘 띄지 않던 피드백 반영.
  - `Button` 컴포넌트에 `purple` variant(`bg-purple-600 text-white hover:bg-purple-700`)를 신설 및 적용하여, 선명한 보라색 배경 위의 흰색 텍스트로 시인성과 가독성을 극대화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.31`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.30, 2026-10-05)

- **프롬프트 인풋 한 줄 확장 및 생성 장수 상단 모델 옆 재배치 레이아웃 개편 (v1.30)**:
  - `이미지 프롬프트.png` 스크린샷 피드백 반영: 모델 선택 아래 좁게 몰려있던 프롬프트 입력창을 가로 전체 폭(`flex-1`)으로 시원하게 확장.
  - 생성 장수 드롭다운(`🔢 생성 장수`)은 윗줄의 세부 실행 모델 드롭다운 우측 공간에 나란히 배치(`grid-cols-1 sm:grid-cols-[1fr_auto]`).
  - 한 줄로 넓어진 프롬프트 인풋 바로 우측에 `✨ AI 이미지 생성` 버튼을 배치하여 프롬프트 작성 편의성과 시각적 균형감 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.30`으로 갱신했다.

## 쇼츠 떡상 분석·대본 자동화 신설 (shorts-viral-studio v1.01, 2026-10-04)

- 주인님이 준 유튜버 튜토리얼 소스(`D:\PDS\index.html`)를 이 플랫폼 규격으로 다시 만든 신규 서브프로젝트 `shorts-viral-studio/`를 만들어 **배포·등록까지 완료**했다. 라이브 https://shorts-viral-studio.vercel.app , 유료 기본 요금제(1·2·3개월) 등록, 카테고리 쇼츠.
- 흐름: 쇼츠 검색(떡상 등급) → 바이럴 분석(Gemini는 영상 직접 분석, GPT·Claude는 지표·댓글 기반 "추정" 표시) → 소재 6개 → 주제 확정 → 대본(씬당 한 문장) → 이미지·영상·BGM 프롬프트. 프로젝트는 `svs_projects`에 자동 저장(30일 보관), `.md` 내보내기.
- 운영 DB에 적용한 것: `svs_projects` 테이블(RLS 본인만, `pg_policies` 확인), `programs`/`pricing_plans` 3건 등록, `platform_guides`에 "YouTube Data API 키 발급받기" 매뉴얼(`72d39d06-…`) 신규 등록. SQL은 `shorts-viral-studio/supabase/migrations/0001~0002`.
- **남은 일:** ① 카탈로그 썸네일 생성(관리자 Gemini 키 필요, `programs.thumbnail_url` 비어 있음) ② 주인님이 실제 YouTube·Gemini 키를 설정 화면에 등록해 검색 1회 + 영상 1개 분석을 실검증(로그인 화면 클릭 검증과 실키 호출은 아직 못 함) ③ 이상 있으면 v1.02. 상세·변경 이유는 `shorts-viral-studio/AGENTS.md`.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.29, 2026-10-04)

- **AI 이미지 생성 버튼 명칭 직관화 및 선별/완성 워크플로우 정립 (v1.29)**:
  - `ProductPostForm.tsx`에서 오해 소지가 있던 "✨ 이미지만 다시 생성" 버튼 명칭을 **`✨ AI 이미지 생성`** (다중 선택 시 `✨ 이미지 N장 생성`)으로 명확히 통일.
  - 사용자가 AI로 원하는 만큼 이미지를 생성하고, 마음에 드는 이미지만 선별하여 남기거나(✕ 삭제), 내 PC 파일/URL로 추가 등록하고 순서를 변경(◀ ▶)하여 최종 마음에 드는 비주얼로 완성할 수 있도록 안내 가이드 동기화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.29`로 갱신했다.
## 완료 — AI 이미지 스튜디오 카탈로그·대시보드 문구 (2026-10-04)

- **운영 DB는 이미 반영됨**: `programs`의 `slug='ai-image-studio'`에 아래 값이 적용되어 있다.
  - `short_desc`: `GPT Image·Gemini·FLUX.2·Z-Image 등 다양한 AI 엔진으로 1~10장 연속 생성과 세부 옵션 설정을 지원합니다.`
  - `version`: `v1.05`
- **배포됨**: `ai-image-studio`에서 `vercel deploy --prod --yes` 실행 및 Vercel 빌드 통과. 라이브 URL: `https://ai-image-studio.vercel.app/dashboard`.
- **로컬 빌드 통과**: `ai-image-studio`에서 `npm.cmd run build` 성공. PowerShell 실행 정책상 `npm` 대신 `npm.cmd`를 사용한다.
- **반영 파일**:
  - `ai-image-studio/app/(dashboard)/dashboard/page.tsx` — 대시보드 소개를 프로그램 상세 설명과 같은 `OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image` 모델 문구로 변경.
  - `ai-image-studio/app/layout.tsx` — 동일 기준의 메타 설명 갱신.
  - `ai-image-studio/lib/version.ts` — `v1.05`.
  - `ai-image-studio/AGENTS.md`, `scripts/register_ai_image_studio.js`, `scripts/update_thumbnail.js`, `supabase/migrations/0012_register_ai_image_studio.sql`, `docs/ERROR_LESSONS.md` — 카탈로그 문구와 재등록 기준 동기화.
- **검증**: `ai-image-studio`에서 `npm.cmd run build`를 다시 실행해 통과했다. 커밋·푸시 후 재배포는 필요 없으며, 이미 반영된 프로덕션 URL은 `https://ai-image-studio.vercel.app/dashboard`다.
- **공유 작업 주의**: `threads-affiliate-poster/`, `shorts-viral-studio/`, `debug.log`, `scratch/`는 다른 작업 영역이므로 이 작업 커밋에 포함하지 않는다.
- **배포 별칭 수정 (v1.05, 완료)**: 기본 주소 `ai-image-studio.vercel.app`가 11일 전 배포본을 가리켜 최신 배포 후에도 이전 문구가 노출됐다. 새 배포본 `ai-image-studio-kd4xg0yec-buylife.vercel.app`으로 기본 별칭을 명시적으로 다시 연결했고, 실제 응답 HTML에서 새 모델 문구·`v1.05` 및 HTTP 200을 확인했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.28, 2026-10-04)

- **생성 장수 옵션 문구 최적화 - '연속' ➔ '생성' 단어 교체 (v1.28)**:
  - `ProductPostForm.tsx`에서 생성 장수 선택 셀렉트박스 옵션의 "N장 연속" 문구를 "N장 생성"(`1장 (기본)`, `2장 생성`~`10장 생성`)으로 교체.
  - 실행 버튼 텍스트도 `✨ 이미지 N장 생성`으로 정돈하여 직관적인 UX 제공.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.28`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.27, 2026-10-04)

- **사용자 이미지 추가/삭제 및 캐러셀 순서 조정 관리 시스템 구축 (v1.27)**:
  - `ProductPostForm.tsx`에 사용자가 직접 이미지를 추가/삭제/정렬할 수 있는 전용 관리 패널 완성.
  - **추가**: PC 파일 다중 업로드, 웹 이미지 URL 직접 입력 추가(`+ URL로 추가`), 썸네일 그리드 내 `➕ 이미지 추가` 카드.
  - **삭제**: 개별 썸네일 ✕ 버튼 & 삭제 텍스트 버튼, 상단 `🗑️ 전체 이미지 삭제` 일괄 비우기 버튼.
  - **순서 변경**: 카드마다 `◀`, `▶` 화살표 버튼으로 대표 썸네일(1번) 및 캐러셀 순서 즉시 변경.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.27`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.26, 2026-10-04)

- **AI 이미지 생성 장수 선택기(1~10장, 기본 1장) 도입 및 멀티컷 토글 제거 (v1.26)**:
  - `ProductPostForm.tsx`에서 "🎨 AI 멀티컷 카드뉴스 연속 생성" 체크박스 토글을 제거.
  - 원하는 생성 장수를 1~10장(기본값: 1장) 중에서 바로 선택할 수 있는 직관적인 `생성 장수` 셀렉트박스를 프롬프트 인풋 옆에 배치.
  - 선택된 수량에 맞춰 단발(1장) 또는 2~10장 연속 생성이 동작하며, 버튼 텍스트(`✨ 이미지 N장 연속 생성`)도 실시간 연동.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.26`으로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.25, 2026-10-04)

- **STEP 2 헤더 텍스트 간소화 - 긴 부제 배지 제거 (v1.25)**:
  - `ProductPostForm.tsx`의 STEP 2 헤더에서 화면 폭에 따라 잘림 현상이 발생하던 긴 부제 배지("글 생성 모델 (GPT·Claude·Gemini) & 이미지·미디어 모델")를 삭제.
  - 메인 타이틀 `🤖 AI 생성 엔진 & 미디어 설정`만 미니멀하고 가독성 높게 표시되도록 정돈.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.25`로 갱신했다.
## AI 이미지 스튜디오 카탈로그 설명 (2026-10-04)

- 카탈로그 카드의 두 줄 한줄 설명을 `GPT Image·Gemini·FLUX.2·Z-Image 등 다양한 AI 엔진으로 1~10장 연속 생성과 세부 옵션 설정을 지원합니다.`로 갱신했다.
- 운영 DB `programs.short_desc` 및 재등록 기준 파일(`supabase/migrations/0012_register_ai_image_studio.sql`, 관련 등록 스크립트)을 함께 동기화했다.
- 대시보드 및 메타 설명을 프로그램 상세 설명과 같은 `OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image` 모델 구성으로 갱신하고 앱 버전을 `v1.05`로 올렸다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.24, 2026-10-04)

- **GPT Image 모델 라인업 최적화 - 구형 DALL-E 3 모델 삭제 (v1.24)**:
  - `src/lib/ai/imageModels.ts`에서 품질이 부족한 구형 `dall-e-3` 모델을 옵션에서 완전 제거.
  - 최신 GPT Image 고품질 라인업 6종(`gpt-image-2`, `chatgpt-image-latest`, `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`)만 엄선 유지.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.24`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.23, 2026-10-04)

- **FLUX 모델 라인업 최적화 - 저품질 FLUX.1 모델 삭제 (v1.23)**:
  - `src/lib/ai/imageModels.ts`에서 퀄리티가 떨어지는 구형 FLUX.1 계열(`black-forest-labs/flux-dev`, `black-forest-labs/flux-schnell`)을 선택 옵션에서 완전 제거.
  - 최신 극실사 플래그십인 **FLUX 2 계열 3종(`flux-2-dev`, `flux-2-pro`, `flux-2-max`)**만 엄선하여 고품질 생성 보장.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.23`으로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.22, 2026-10-04)

- **글 생성 엔진 및 이미지/미디어 설정 대형 통합 박스 개편 (v1.22)**:
  - `ProductPostForm.tsx`에서 개별 분리되어 있던 "🤖 AI 글 생성 엔진 선택"과 "🖼️ 이미지 & 미디어 설정"을 둘 다 AI 생성 모델을 선택하는 공통 영역으로 묶어, 바깥 박스를 하나의 커다란 대형 통합 컨테이너 박스(`STEP 2`)로 통합.
  - 내부에는 `[서브 카드 A] 🤖 AI 글 생성 엔진 선택 (GPT/Claude/Gemini)`과 `[서브 카드 B] 🖼️ 이미지 & 미디어 설정 (4대 이미지 AI 플랫폼, 대표이미지, 다중 업로드, 동영상)`으로 정돈.
  - 전체 화면 구조를 3단계 워크플로우(STEP 1: 콘텐츠 기획/작성 ➔ STEP 2: AI 생성 엔진 및 미디어 설정 ➔ STEP 3: 게시방식 결정 및 최종 발행)로 최적화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.22`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.21, 2026-10-04)

- **글 작성 폼 대형 테마 컨테이너 박스 및 은은한 배경색 대구분 UI 전면 개편 (v1.21)**:
  - `ProductPostForm.tsx`에서 `🤖 AI 글 생성 엔진 선택 (GPT / Claude / Gemini)`을 중간 기준으로 삼아 상단 전체(글 콘텐츠 기획/작성)와 하단 전체(이미지 & 미디어 생성/등록)를 명확히 분리되는 커다란 대형 컨테이너 박스(`border-2` 테두리 및 옅은 파스텔 배경색)로 묶어, 단계별 워크플로우를 한눈에 직관적으로 파악할 수 있도록 UI를 대폭 개선.
  - **4대 메이저 대형 섹션 구성**:
    1. **[STEP 1] 📝 게시글 작성 및 콘텐츠 설정 (상단 대형 블루 박스 - `bg-blue-50/25 border-blue-200/80`)**:
       - 내부 흰색 카드들: 🛍️ 1. 제휴 상품 선택, 🎭 2. AI 페르소나, 🏷️ 3. 키워드 & 참고 링크, ✍️ 4. Threads 본문 & 원클릭 일괄 생성.
    2. **[STEP 2] 🤖 AI 글 생성 엔진 선택 (중간 기준 대형 퍼플 박스 - `bg-purple-50/30 border-purple-200/90`)**:
       - 3대 글 생성 AI(GPT / Claude / Gemini) 탭 버튼 및 세부 모델 셀렉트박스.
    3. **[STEP 3] 🖼️ 이미지 & 미디어 설정 (하단 대형 앰버 박스 - `bg-amber-50/25 border-amber-200/90`)**:
       - 내부 흰색 카드들: 4대 이미지 생성 AI 엔진(NanoBanana / GPT Image / FLUX / Z-Image), 대표 이미지 추가, 파일 직접 업로드, 캐러셀 썸네일 그리드, 영상 등록.
    4. **[STEP 4] 🚀 게시방식 결정 및 최종 발행 (발행 대형 슬레이트 박스 - `bg-neutral-100/60 border-neutral-300`)**:
       - 즉시 게시 / 예약 발행 / 임시 저장 선택 및 최종 발행 실행 버튼.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.21`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.20, 2026-10-04)

- **4대 AI 이미지 생성 플랫폼(NanoBanana, GPT Image, FLUX, Z-Image) 및 세부 모델 선택 확장 (v1.20)**:
  - 기존 Gemini NanoBanana 단일 이미지 생성에서, `ai-image-studio`의 검증된 기술 스택을 기반으로 **NanoBanana(Google Gemini), GPT Image(OpenAI), FLUX 2.0(Black Forest Labs), Z-Image(Alibaba 6B)** 4대 플랫폼 및 16종 세부 모델 선택 기능으로 대폭 확장.
  - `src/lib/ai/imageModels.ts`: 4대 플랫폼 및 세부 모델 목록, 플랫폼별 기본 모델 정의.
  - `src/lib/ai/imageGenerator.ts`: Gemini REST API, OpenAI Image API, Replicate API(FLUX, Z-Image 동기/폴링) 통합 호출기 구현. 모든 생성 이미지는 Supabase Storage `post-images` 버킷에 영구 저장되어 절대 깨지지 않는 영구 URL 반환.
  - `src/lib/actions/ai.ts`: 선택된 플랫폼에 맞춰 `gemini`, `openai`, `replicate` API 키를 `resolveApiKey`로 자동 조회.
  - `src/app/(dashboard)/settings/page.tsx`: Replicate(FLUX) API 키 등록 필드 및 발급 매뉴얼 링크 신설.
  - `src/components/posts/ProductPostForm.tsx`: 4분할 카드 탭 버튼(아이콘, 플랫폼명, 제공사) + 세부 모델 셀렉트박스 + 프롬프트/멀티컷 연속 생성 지원. `localStorage` 선택 상태 자동 복원. 원클릭 글+이미지 일괄 생성 시에도 선택된 이미지 엔진으로 자동 생성 연동.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.20`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.19, 2026-10-04)

- **새 글 작성(/posts/new) 폼 직관적 박스 및 역할별 테마 색상 구분 개편 (v1.19)**:
  - `ProductPostForm.tsx`에서 단조롭게 뭉쳐져 있던 상단 입력 영역을 역할별 독립 카드 박스 및 직관적인 테마 색상으로 전면 개편.
  - `⚡ AI 원클릭 자동 생성 안내 배너`: 상단 안내 및 프로세스 요약.
  - `🛍️ 1. 제휴 상품 선택`: 블루 테마 (`bg-blue-50/40 border-blue-200`) + 필수 배지 + 제휴 링크 및 공정위 광고 고지 문구 안내 카드.
  - `🎭 2. AI 페르소나 스타일 선택`: 퍼플 테마 (`bg-purple-50/40 border-purple-200`) + 어조 반영 배지 + PersonaPicker.
  - `🏷️ 3. 타겟 키워드 & 참고 링크`: 에메랄드 테마 (`bg-emerald-50/40 border-emerald-200`) + 선택 배지 + 태그 칩 & URL 인풋.
  - `✍️ 4. Threads 게시글 본문`: 모던 슬레이트 테마 (`bg-neutral-50/70 border-neutral-300`) + 글자수 카운터 배지 (0/500자) + 본문 미리보기 및 직접 수정 Textarea.
  - `🤖 5. AI 글 생성 엔진 선택` 및 `🖼️ 6. 이미지 & 캐러셀`까지 번호 매김 및 카드 스타일을 통일하여 1~6단계 물 흐르듯 자연스럽고 직관적인 제작 UX 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.19`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.18, 2026-10-04)

- **새 글 작성(/posts/new) 3대 AI 엔진 선택 섹션 내 불필요한 API 키 수동 등록 입력창 제거 (v1.18)**:
  - 사용자가 환경설정(`/settings`)에서 이미 API 키를 등록하여 사용하므로, 글 작성 폼 내에 남아있던 불필요한 API 키 입력창(`customApiKey`)을 완전 제거.
  - 회원의 DB 저장 키(`user_api_keys`) 자동 연동으로 깔끔하고 미니멀한 UI 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.18`로 갱신했다.

## Codex 자율 실행 위임 명문화 (2026-10-03)

- 루트 `AGENTS.md`와 `CLAUDE.md`에 기능 요청의 기본 범위를 조사부터 수정·검수·문서화·커밋·푸시·배포까지로 명시했다.
- 파괴적 삭제/force-push, 비밀값·환경변수·DB 스키마 변경, 유료 API 대량 호출, 회원 대신 최종 발행·결제·외부 공개만 사전 승인 대상이다. 도구 자체 승인이 필요한 경우에만 단 한 번 요청한다.

## 티스토리 자동화 운영 기준서 정리 (tistory-auto-blog v1.53, 2026-10-03)

- 다음 작업자는 `tistory-auto-blog/AGENTS.md`에서 연결한 `tistory-auto-blog/docs/OPERATIONS_HANDOFF.md`를 먼저 확인한다.
- 실제 티스토리 장애 이력(서식 평문화, 이미지 컨테이너 평탄화, 제목 중복, 태그 칩 오탐, 부분 본문 중단, 장식 따옴표)을 증상·원인·조치·재검수 순서로 정리했다.
- 빈 새 글만 입력하고, 부분 입력 초안은 발행하지 않으며, 최종 저장·발행은 회원이 직접 수행한다는 안전 기준을 명시했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.18, 2026-10-03 ~ 2026-10-04)

- **보관함(/saved) 본문 간략히 보기 접힘 제거 및 항상 콘텐츠 전체 노출 (v1.18)**:
  - '간략히 보기 / 전체 펼치기' 접힘 토글 기능 및 `line-clamp-4` 제거.
  - 보관함에 들어온 사용자가 별도의 클릭 없이 저장된 스레드 본문 및 첫 댓글 CTA 전문을 즉시 온전히 확인할 수 있도록 가시성 최적화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.18`로 갱신했다.
- **프로그램 공식 카탈로그 썸네일 생성 및 DB 등록 완료 (2026-10-04)**:
  - `docs/PLATFORM_PATTERNS.md` §13 실사(포토리얼) 16:9 무문구 원칙 준수 썸네일 생성 (`scripts/generate-program-thumbnail.mjs` → `gemini-3-pro-image-preview`).
  - Supabase Storage `program-images/catalog/threads-easy-planner-thumbnail.jpg` 업로드 및 `programs.thumbnail_url` 갱신 완료 (`https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/threads-easy-planner-thumbnail.jpg?v=1791076543712`).
  - 마이그레이션 SQL(`0002_update_thumbnail.sql`) 및 로컬 백업(`public/threads-easy-planner-thumbnail.jpg`) 완비.

## Threads AI 기획 자동화 (threads-easy-planner v1.17, 2026-10-03)

- **생성 데이터 30일 보관 후 자동 삭제 (TTL Sweep) 정책 완벽 적용 (v1.17)**:
  - DB 레벨: 보관함 목록 조회 시점 30일 경과 생성 데이터 자동 영구 삭제(TTL Sweep) 쿼리 적용.
  - 클라이언트 레벨: 로컬 스토리지에 캐시된 항목도 30일 경과 시 자동 감지 및 정리(Prune) 로직 적용.
  - UI 시각화: 보관함 각 카드에 `🕒 N일 후 자동삭제` 실시간 카운트다운 배지 및 상단 30일 보관 정책 안내 배너 전면 노출.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.17`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.16, 2026-10-03)

- **좌측 사이드바 '내 콘텐츠 보관함' 메뉴 및 결과물 저장·불러와서 수정하기 올인원 연동 (v1.16)**:
  - 좌측 사이드바에 `📁 내 콘텐츠 보관함` (`/saved`) 메뉴 신설.
  - 생성 결과물 카드 상단에 `💾 보관함에 저장` 버튼 추가 및 즉시 보관 피드백 지원.
  - 본문 박스에 `✏️ 직접 수정` 인라인 textarea 에디터 지원 (사용자가 다듬은 후 그대로 저장/복사).
  - 보관함(`/saved`) 페이지에서 저장된 글 목록 실시간 검색, 전체 복사, 삭제, `✏️ 에디터로 불러와 수정하기` 원클릭 로드 연동 완비.
  - `tep_saved_plans` DB 테이블 마이그레이션 SQL(`0001_tep_saved_plans.sql`) 및 DB-로컬 이중 안전 스토리지 아키텍처 완비.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.16`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.15, 2026-10-03)

- **실전 떡상 템플릿 프리셋 3선 섹션 완전 삭제 및 핵심 동선 최적화 (v1.15)**:
  - 사용자 지시에 따라 상황별 페르소나 밑에 위치하던 '실전 떡상 템플릿 프리셋 3선' 카드 영역을 완전 삭제.
  - 페르소나 6선 → 내 실제 경험담 상세 폼 → `🔥 아무런 아이디어가 없을 때!!!` 업종 10선 추천 카드로 이어지는 핵심 흐름 최적화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.15`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.14, 2026-10-03)

- **'🔥 아무런 아이디어가 없을 때!!!' 배지 및 타이틀을 '업종/타깃별 추천 주제 10선' 영역으로 정확히 재배치 (v1.14)**:
  - '업종/타깃별 추천 주제 10선 (원하는 업종을 누르거나 추천 카드를 클릭해보세요)' 섹션에 `🔥 아무런 아이디어가 없을 때!!!` 펄스 배지와 굵은 타이틀(`text-sm md:text-base font-extrabold`)을 적용하여 사용자의 시선과 동선 최적화.
  - 상단 실전 떡상 템플릿 프리셋 3선은 깔끔하고 직관적인 전용 타이틀 구조로 정돈.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.14`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.13, 2026-10-03)

- **템플릿 폼 타이틀 시인성 확대 및 '아무런 아이디어가 없을 때' 강조 섹션 적용 (v1.13)**:
  - 실전 떡상 템플릿 프리셋 3선 상단에 `🔥 아무런 아이디어가 없을 때!!!` 레드 펄스 배지 및 타이틀 가시성 극대화.
  - 상황별 페르소나 및 프리셋 영역 상위 헤더 폰트 크기 확대 (`text-sm md:text-base font-extrabold`)로 전체 구조 시인성 강화.
  - `내 실제 경험담 · 상품명 · 타깃 직접 입력하기 (상세 템플릿 폼)` 토글 영역을 눈에 확 띄는 전용 배너 아코디언 스타일로 개편하여 사용자가 맞춤 썰/상품을 언제든 쉽게 작성하도록 개선.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.13`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.12, 2026-10-03)

- **상황별 페르소나 하단 기능 일체 복원 및 올인원 통합 완결 (v1.12)**:
  - 상황별 페르소나 버튼 바로 아래에 실전 떡상 프리셋 3선(🧺 52만 뷰 세탁조 썰, ✨ 1.6만 뷰 섀도 종결템, 🍲 설거지 탈출 찜기 썰) 전면 배치.
  - 내 실제 경험담 · 상품명 · 타깃 상세 지정 접이식 템플릿 폼 완벽 복원.
  - 10대 인기 업종 카테고리 칩 및 10선 추천 주제 카드 상시 노출로 원클릭 기획 편의 극대화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.12`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.11, 2026-10-03)

- **상황별 6대 페르소나 원클릭 글 생성 엔진 안정화 및 전체 문서화 완결 (v1.11)**:
  - 6대 핵심 페르소나(`👩‍🍳 가전·살림 주부형`, `🏠 독신·자취생형`, `💼 워킹맘·직장인형`, `💄 20대 쇼핑·뷰티 에디터형`, `⚡ IT·테크 리뷰어형`, `💰 N잡러·재테크 부업형`) 원클릭 글 생성 버튼 그리드 안정화.
  - 키워드 유무와 무관하게 버튼 클릭 즉시 피드를 멈추는 5대 훅(자책/부정명령/썰/논쟁/반전) + 4단계 공감 본문 + 자댓글 CTA 완결.
  - 서브프로젝트 README.md 전체 명세 갱신, docs/ERROR_LESSONS.md 교훈 등록, PROGRESS.md 갱신 완료.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.11`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.10, 2026-10-03)

- **가전 주부형·독신형 등 6대 상황별 페르소나 원클릭 글 생성 버튼 그리드 전면 탑재 (v1.10)**:
  - 사용자가 가장 만족했던 "버튼 하나로 다양한 상황/페르소나에 맞는 버전의 스레드 글이 완성되던 기능"을 완벽하게 부활하여 메인 인터랙션 전면에 배치했다.
  - 6대 핵심 페르소나 버튼 지원:
    1. 👩‍🍳 **가전·살림 주부형** (살림 9단 꼼꼼 비교, 가전/살림 필수템 가성비·실용성 톤)
    2. 🏠 **독신·자취생형** (2030 자취 찐현실 썰, 퇴근 후 설거지 귀차니즘 톤)
    3. 💼 **워킹맘·직장인형** (퇴근길 지친 30대 공감, 시간 절약 친한 언니 톤)
    4. 💄 **20대 쇼핑·뷰티 에디터형** (비싼 건 줄 알았는데 가성비 종결템 톤)
    5. ⚡ **IT·테크 리뷰어형** (팩트 분석, 스펙 비교, 모르면 손해 보는 논리 톤)
    6. 💰 **N잡러·재테크 부업형** (월 100 파이프라인 자본주의 현실 톤)
  - 입력창에 키워드/소재(예: 전자레인지 찜기, 세탁조 클리너 등)를 적고 페르소나 버튼을 누르면 해당 페르소나 버전으로 즉시 글이 생성된다 (비워두고 눌러도 대표 떡상 소재 자동 생성).
  - 5대 훅(자책/부정명령/썰/논쟁/반전) 대안, 4단계 공감 본문, 자댓글 CTA, 7종 리라이팅, OpenAI/Claude/Gemini 엔진 선택 완비.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.10`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.07, 2026-10-03)

- **상단 실전 기획 템플릿 입력 폼 및 원클릭 떡상 프리셋 3선 전면 배치 (v1.07)**:
  - 주제 입력 박스 바로 상단에 `[📋 실전 기획 템플릿 입력 (추천)]` 및 `[⚡ 간편 한 줄 입력]` 모드 전환 탭 신설.
  - 실전 떡상 템플릿 프리셋 3선(🧺 52만 뷰 세탁조 청소 썰, ✨ 1.6만 뷰 섀도 종결템, 🍲 설거지 탈출 찜기 썰) 원클릭 자동 입력 지원.
  - 4대 핵심 템플릿 항목(연결할 상품/소재, 내 실제 경험/상황, 타깃 독자, 나의 역할/페르소나) 및 선택적 벤치마킹 터진 글 원문 입력 필드 제공.
  - AI 생성 엔진에 템플릿 데이터를 완벽 연동하여 프롬프트 뼈대 및 소재가 정확히 반영되도록 구현.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.07`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.06, 2026-10-03)

- **실전 떡상글(52만/1.6만 조회수 실제 사례) 스타일 전면 반영 (v1.06)**:
  - 실제 스레드에서 터진 콘텐츠 2건(52만 뷰 세탁기 관리제, 1.6만 뷰 섀도 종결템)을 분석하여 프롬프트와 UI에 완벽 이식.
  - 4~6줄 극압축 호흡 및 1~2줄 단위 가독성 빈 줄(`\n\n`) 단락 구분.
  - 리얼한 스레드 감정 부호(`;;`, `...`, `??`, `ㅠㅠ`, `땅땅!`) 및 커뮤니티 호칭(`스치니`, `치니`, `치니들`) 적극 활용.
  - 본문 내 상업적 제품명/브랜드명 100% 배제 (호기심 극대화).
  - 본문에서 제품명을 숨기고, 첫 번째 댓글(자댓글)에서 제품명/쇼핑 제휴링크/사용팁을 연결하는 스레드 실전 떡상 공식 안내 및 CTA 가이드 강화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.06`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.05, 2026-10-03)

- **스레드 실전 프롬프트 노하우 전면 반영 (v1.05)**:
  - 4단계 황금 구조 (멈추게 하기 → 공감 쌓기 → 반전 한 방 → 질문 던지기) 프레임워크 적용.
  - 4~6줄 친근한 반말(친구/언니 카톡 톤), AI 티 100% 제거, 제품명 노출 금지.
  - 5대 바이럴 훅 유형(자책형, 부정 명령형, 리얼 썰형, 논쟁형, 반전형) 5개 글 세트 동시 생성.
  - 첫 줄이 멈추게 하는 이유(공감·손해회피·호기심·반전) 설명 제공.
  - 결과 화면에서 5대 훅 유형별 버전 펼쳐보기, 개별 복사, 원클릭 본문 전환 기능 추가.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.05`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.04, 2026-10-03)

- **AI 엔진 선택 통일화 (OpenAI (GPT) / Claude / Gemini 3가지 선택, v1.04)**:
  - 타 서브프로그램(`threads-affiliate-poster`, `ai-auto-blog`, `naver-blog-seo-studio`)과 동일하게 AI 엔진 선택 라벨 및 순서를 **OpenAI (GPT) / Claude / Gemini 3가지**로 통일화했다.
  - 선택 탭 버튼 및 세부 실행 모델 드롭다운의 반응형 정렬을 보강했다.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.04`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.03, 2026-10-03)

- **AI 추론 엔진 및 세부 모델 선택 기능 추가 (v1.03)**:
  - 🎲오늘 뭐 쓰지? / ✨글 생성하기 버튼 바로 하단에 OpenAI / Google Gemini / Anthropic Claude 3대 AI 엔진 및 2026 최신 세부 모델 선택 패널을 구현했다.
  - 지원 모델군: GPT-4.1(기본), GPT-6 Luna/Sol/Astra, GPT-5.6 시리즈, GPT-4o, Gemini 3.7/3.8 Flash, Gemini 3.5 Flash Lite, Gemini 2.0 Flash, Claude Sonnet 5, Claude Opus 5, Claude Haiku 4.5 등.
  - 선택한 엔진 및 모델은 `localStorage`에 자동 저장되어 재접속 시에도 그대로 유지된다.
  - 공급자별 API 키 미등록 시 "선택하신 {공급자} API 키가 등록되어 있지 않습니다" 안내 모달을 노출한다.
  - 글 기획 완료 카드 헤더에 생성에 사용된 모델명을 배지로 표시한다.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.03`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.02, 2026-10-03)

- **버그 해결 및 안정화 (v1.02)**:
  - "오늘 뭐 쓰지?" 버튼 클릭 시 추천 주제 10선이 화면에 렌더링되지 않던 문제 해결.
  - 원인: OpenAI `response_format: json_object` 사용 시 최상위가 배열이 아닌 `{ "topics": [...] }` 객체로 반환되어 `Array.isArray` 검증 및 `length > 0` 검사가 실패했던 오류.
  - 조치: 시스템 프롬프트를 `{ "topics": [...] }` 객체 구조로 명시하고, 백엔드(`src/lib/ai/generator.ts`)에서 객체 내 배열 키(`topics`, `response`, `data` 등)를 자동 언랩핑하여 100% 배열 반환 보장.
  - Gemini 모델 ID 오기(`gemini-2.5-flash` → `gemini-2.0-flash`) 정상화.
  - `PlannerApp.tsx`에서 "오늘 뭐 쓰지?" 클릭 시 카테고리 피커 상시 토글 및 즉시 추천 트리거 동작 개선.
  - 버전 `v1.02` 판올림 (`src/lib/version.ts` 및 DB `programs.version`).

## Threads AI 기획 자동화 신설 (2026-10-03, threads-easy-planner v1.01)

- 초보자 맞춤형 스레드(Threads) AI 기획기 서브프로젝트(`threads-easy-planner/`)를 신설했다.
- 복잡한 쇼핑/제휴/링크 크롭/포스팅 설정 없이, 주제 입력 또는 "🎲 오늘 뭐 쓰지?" 10개 업종/타깃 추천 → 5단 구성(주제, 첫 문장 후킹, 전체 글, 댓글/CTA, 후속 아이디어 5선) 자동 생성 → 7종 원클릭 리라이팅(더 자극적으로, 더 자연스럽게 등) 기능을 원클릭 UI로 구현했다.
- 공용 DB `programs`에 slug `threads-easy-planner` (Threads 카테고리, `v1.01`, FREE 배지) 및 기본 3단계 요금제(`pricing_plans`) 등록 완료.
- `npm run build` 검증 완료 (TypeScript/컴파일 100% 정상).


- 원인/조치: 실제 원문 미리보기와 게시 결과에 같은 따옴표가 있어 확장 입력 문제가 아니라 AI 생성 결과 문제로 확정했다. 프롬프트 지시만으로 재발해 `utils/news/generator.ts`에서 문장 양끝을 감싼 장식용 따옴표를 Markdown→HTML 변환 전에 제거한다.

## 티스토리 본문 입력 회귀 복구 (2026-10-03, v1.52)

- 증상/원인: 새 글에서 29개 본문 블록 중 7개만 입력된 상태로 멈췄고, 재개는 부분 본문을 발행하지 않도록 저장 원본 검증에서 중단됐다. v1.51의 공백만 정리한 문장 전체 일치 검증이 티스토리의 정상 HTML 재구성에도 실패해, 이후 블록 입력을 중단시킨 회귀였다.
- 조치/검수: AI 생성 단계의 장식용 따옴표 금지는 유지하고, 확장 입력 단계의 완전일치 검사를 제거했다. 기존 텍스트 존재·서식 구조 검증은 그대로 유지한다. 멈춘 실제 초안에서 제목과 첫 7개 본문 블록만 존재하고 전체 미리보기에는 29개 블록이 있는 것을 직접 대조했다.

## 티스토리 본문 불필요한 따옴표 방지 (2026-10-03, v1.51)

- 증상/원인: 실제 게시글과 확장 전체 미리보기를 대조한 결과, 확장이 따옴표를 새로 넣은 것이 아니라 AI 본문 생성 단계가 강조용 작은따옴표를 생성한 것이었다. 기존 입력 검증은 문장부호를 제거하고 비교해 변형도 놓칠 수 있었다.
- 조치/검수: 생성 프롬프트에서 일반 표현의 작은따옴표·큰따옴표 강조를 금지했다. 확장은 공백만 정리한 정확한 원문 대조를 추가해 문장부호가 달라지면 저장·발행 전에 중단한다. 실제 티스토리 게시 결과와 확장 전체 미리보기의 같은 Q&A 문장을 직접 대조했다.

## 티스토리 원문 태그의 실제 등록 확인 수정 (2026-10-03, v1.48)

- 증상/원인: 원문에는 태그가 있어도 글 선택 시 자동 반영하지 않았고, 티스토리 태그 UI를 찾지 못하면 본문 끝 `#태그`로 대체하면서 실제 태그 등록 성공처럼 처리했다. 또한 본문에 `#태그` 문구가 있으면 티스토리 태그 칩이 없더라도 이미 등록된 것으로 오인했다.
- 조치: 선택한 글의 원문 태그로 확장 태그 입력칸을 매번 덮어써 이전 글 값이 남지 않게 했다. 본문 해시태그는 중복 판정에서 제거하고, `.editor_tag > .txt_tag` 실제 칩으로 각 태그 등록을 확인한다. 태그 UI를 찾지 못하면 본문 대체 없이 중단한다.

## 티스토리 TinyMCE 격리 세계 입력 평문화 수정 (2026-10-03, v1.47)

- 증상/근거: 새 게시글도 제목·목록·인용이 평문처럼 저장됐다. 확장 `전체 미리보기`는 같은 원문을 제목·목록·인용·링크로 정상 렌더링했으므로 서버 HTML 변환이 아닌 티스토리 입력 단계 문제로 확정했다.
- 원인/조치: `chrome.scripting.executeScript()` 기본 격리 세계에서 `window.parent.tinymce`/`window.tinymce`를 읽어 실제 페이지 TinyMCE 인스턴스를 찾지 못했다. `sidepanel.js`의 본문 삽입과 저장 동기화를 `world: "MAIN"`으로 실행해 `insertContent()`·`save()`가 실제 모델을 갱신하도록 변경했다. 서식 태그가 사라지면 텍스트만 남은 상태로 진행하지 않고 중단한다.
- 검수: `npm run build` 성공, v1.47 ZIP 생성. 로컬 Chrome의 압축해제 확장은 별도 복사본(v1.46)으로 확인돼 기존 사용자 토큰을 보존하기 위해 제거·재설치하지 않았다. 배포 ZIP 설치 후 빈 새 글에서 실입력 검수가 필요하다.

## 티스토리 이미지 포함 컨테이너의 본문 평탄화 수정 (2026-10-03, v1.46)

- 증상: v1.45에서도 실제 발행 글의 이미지 뒤 본문이 소제목·목록·문단 간격 없이 한 덩어리 텍스트로 표시됐다.
- 원인/조치: `htmlToInputBlocks()`가 이미지가 포함된 부모 컨테이너를 만나면 모든 자식 HTML을 `textWithLinks()`로 합쳐 평문 블록 하나로 만들었다. v1.46은 컨테이너를 재귀 순회해 이미지·문단·제목·목록을 원래 순서의 별도 입력 블록으로 보낸다.

## 티스토리 컨테이너 정렬 상속 차단 (2026-10-03, v1.45)

- 증상: v1.44를 적용한 글에서 원문과 달리 본문 문단이 가운데 정렬되는 등 서식이 변형됐다(`서식깨짐.png`).
- 원인/조치: v1.44의 안전 스타일 보존기가 레이아웃용 `div`/`span`의 `text-align`도 전달해 자식 문단에 상속했다. v1.45는 문단·제목·목록·인용·표 셀처럼 의미가 분명한 콘텐츠 블록의 정렬만 보존하고, 컨테이너의 정렬은 버린다. 글자 크기·굵기·색상·줄간격·인용/목록/테두리 서식 보존은 유지한다.

## 티스토리 원본 텍스트 서식 변환 보존 (2026-10-02, v1.44)

- 증상: v1.43의 입력·저장 경로 보완 뒤에도 텍스트 서식이 원본과 다르게 깨져 보였다.
- 원인/조치: `utils/extensionContent.ts`의 `tistorySafeHtml()`가 Tailwind class와 inline style을 삭제하고 정렬만 남겼다. v1.44는 레이아웃/이벤트 속성은 계속 제거하되, 생성기에서 사용하는 글자 크기·굵기·줄간격·색상·인용·목록·테두리 클래스를 안전한 인라인 CSS로 변환하고 안전한 기존 style 속성도 보존한다.

## 티스토리 원본 서식 보존 입력 경로 (2026-10-02, v1.43)

- 증상: 본문 텍스트는 입력되었지만 원본의 제목·목록·인용·표 등 서식이 최종 입력 결과에서 깨졌다.
- 원인/조치: v1.41의 발행 직전 `setContent()`가 전체 HTML을 TinyMCE가 다시 해석하게 해 티스토리 고유 서식을 정리했다. v1.43은 각 서식 블록을 입력할 때 TinyMCE `insertContent()` API로 모델에 기록하고, 발행 전에는 내용 재입력 없이 save만 한다. API 미노출 시에만 native 입력 fallback을 사용한다.

## 티스토리 발행 원본 HTML 엔티티 검증 오판 보완 (2026-10-02, v1.42)

- v1.41에서도 발행 원본 검증이 `37/45개 문단`으로 중단됐다. `#editor-tistory`의 HTML 원문에 포함된 `&nbsp;`·`&amp;`를 정규화 문자열로 직접 비교해, 브라우저 화면의 실제 문자와 다르게 계산한 것이 원인이었다. v1.42는 저장 원본 HTML을 detached DOM으로 해석한 `textContent`로 비교한다. TinyMCE `setContent()`·save 동기화와 전체 문단 검증은 계속 적용한다.

## 티스토리 TinyMCE 내부 모델 동기화 (2026-10-02, v1.41)

- v1.40의 발행 전 검증에서 `37/45개 문단`만 숨김 원본에 남는 실제 오류가 확인됐다. iframe 화면 DOM·textarea 동기화만으로는 TinyMCE 내부 모델이 갱신되지 않아 `save()`가 일부 문단을 직렬화하지 않을 수 있었다. v1.41은 iframe의 전체 HTML을 `setContent()`로 모델에 확정한 뒤 undo/change/save를 실행하고, 원본 검증을 계속 유지한다.

## 티스토리 발행용 본문 원본 동기화 (2026-10-02, v1.40)

- 증상: 확장 입력 직후에는 iframe 편집기에 텍스트와 이미지가 정상 표시되지만, 티스토리 최종 발행 뒤에는 이미지들만 남고 텍스트가 사라졌다.
- 원인/조치: `execCommand` 기반 서식 삽입 결과가 화면 iframe에는 남아도 TinyMCE가 발행 때 읽는 숨김 `#editor-tistory` 원본에 저장되지 않을 수 있었다. 발행 설정 전 TinyMCE `save()`·input/change 이벤트와 숨김 원본 동기화를 실행하고, 원본의 모든 텍스트 블록을 검증한다. 본문 태그 대체 삽입 뒤에도 같은 동기화를 반복한다.

## 티스토리 본문 제목 중복 제거 (2026-10-02, v1.39)

- 증상: 생성된 본문에서 티스토리 제목과 같은 문구가 독립 문단/소제목으로 다시 출력되어 제목이 두 번 보였다.
- 원인/조치: 확장 입력기는 제목을 본문에 합치지 않았으며, AI가 반환한 문단 또는 소제목이 제목과 같아 저장된 것이 원인이었다. 생성 결과의 제목과 정확히 같은 마크다운 줄을 제거하고, 확장 HTML 블록 변환에서도 같은 제목 블록을 제외한다. 기존 저장 글에도 전송 시 적용된다.

## 티스토리 본문 연속 서식 입력 보존 (2026-10-02, v1.38)

- 증상: 티스토리 새 글 입력에서 본문 맨 앞 텍스트만 남고 이미지 4장만 입력되는 사례가 확인됐다.
- 원인/조치: TinyMCE가 HTML 삽입 뒤 DOM을 비동기로 재구성하면서 기존 Selection이 유효해 보이지만 오래된 위치를 가리켜 다음 블록이 앞 문단을 덮어쓸 수 있었다. `extension/sidepanel.js`가 매 서식 블록을 본문 끝에 명시적으로 붙이고, 모든 텍스트·서식 블록의 실제 잔존을 확인하도록 보강했다. 서식이 제거된 경우에만 키보드 입력으로 텍스트를 복구한다.

## 티스토리 홈주제 기본 목록 + 실제 목록 갱신 (2026-10-02, v1.30)

- 빈 새 글에서는 티스토리가 발행창을 열지 않아 홈주제 동적 수집이 불가능했다. 확장에 공통 홈주제 기본 목록을 넣어 즉시 선택 가능하게 하고, 제목·본문 입력 후에는 `목록 갱신`이 실제 티스토리 메뉴를 읽어 기본 목록을 대체·캐시하도록 했다. 빈 글에서 갱신을 눌러도 오류를 표시하지 않고 기본 목록 사용 안내를 보여 준다. 적용 시 선택값이 실제 메뉴에 없으면 갱신을 안내하고 중단한다.

## 티스토리 발행 버튼 신뢰된 포인터 클릭 (2026-10-02, v1.29)

- v1.28은 실제 `button.click()`을 사용했지만 해당 이벤트의 `isTrusted`는 false라 티스토리 React가 무시할 수 있었다. `openPublishSettings()`를 Chrome Debugger `Input.dispatchMouseEvent`로 버튼 중앙 좌표에 실제 포인터 입력을 보내도록 교체했다. 열림 확인은 role 기반 dialog와 열린 ReactModal 클래스를 모두 가시성 검사한다.

## 티스토리 발행 설정창 열기 재시도 보완 (2026-10-02, v1.28)

- `홈주제 불러오기`가 `openPublishSettings()`를 호출할 때 발행 버튼에 합성 이벤트만 한 번 보내고 300ms 뒤 레이어 존재를 확인했다. React 클릭 처리·동적 렌더링이 늦으면 `발행 설정창을 열지 못했습니다.`로 실패했다. 이제 가시성 있는 기존 창을 먼저 인식하고, 실제 `button.click()` 뒤 레이어를 최대 4.5초 폴링하며 최대 3회 재시도한다.

## 티스토리 본문 요약 라벨 제거 (2026-10-02, v1.27)

- `tistory-auto-blog/utils/news/generator.ts`가 본문 첫 요약 문단을 `> **요약**: ...`로 조립해 `요약:`이 실제 글에 표시됐다. 요약 내용은 유지하고 인용 문단의 라벨만 제거했다. 이미 생성·저장된 글은 자동 변경하지 않으며, 새로 생성하는 글부터 적용된다.

## 티스토리 홈주제 실제 선택지 드롭다운 (2026-10-02, v1.26)

- 확장 발행 설정의 자유 입력형 `홈주제`를 드롭다운으로 바꿨다. `홈주제 불러오기`는 티스토리 발행 창의 두 번째 선택 메뉴를 열어 실제 선택지를 읽고, 그 목록을 확장 로컬 저장소에 캐시한다. 이후에는 직접 입력이 아니라 목록에서 정확한 홈주제를 선택하며, 발행 설정 적용도 동일한 선택값으로 검증한다.

## 티스토리 본문 의미 서식 보존 입력 (2026-10-02, v1.25)

- 실제 포스팅 화면에서 본문 서식이 평문처럼 사라진 원인은 `utils/extensionContent.ts`가 원문 HTML을 텍스트 블록으로 평탄화하고 `extension/sidepanel.js`가 이를 한 글자씩 입력한 구조였다. 이제 제목 단계·굵게·목록·인용·표·링크를 안전한 의미 HTML 블록으로 보존해 TinyMCE에 입력한다. 이미지 URL은 외부 이미지 태그로 넣지 않고 기존 PNG 붙여넣기 업로드 경로를 유지한다. Tailwind class·inline style·복사 버튼·이벤트 속성은 티스토리에 보내지 않는다.

## 티스토리 카테고리 목록 동적 생성 보완 (2026-10-02, v1.24)

- `tistory-auto-blog/extension/sidepanel.js`의 카테고리 열기 코드가 클릭 전 `#category-list` 존재를 필수 조건으로 검사해, 티스토리가 버튼 클릭 뒤 목록을 React로 생성하는 화면에서 클릭조차 하지 않고 `카테고리 목록을 열지 못했습니다.`로 중단했다. 이제 `#category-btn`만 확인해 실제 클릭을 수행하고, `aria-expanded=true` 또는 목록 가시성으로 열림을 판정하며 최대 3회 재시도한다.

## 티스토리 확장 입력 안내 축약 (2026-10-02, v1.23)

- 입력 진행 상태 아래의 안내를 “입력 중에는 티스토리 탭을 닫거나 다른 곳을 클릭하지 마세요.”와 “제목·본문·이미지 입력 뒤 중단된 경우에는 ‘설정 이어서 적용’ 버튼을 누르세요.” 두 줄로 변경했다.

## 티스토리 확장 입력 버튼 배열 개선 (2026-10-02, v1.22)

- `tistory-auto-blog/extension/sidepanel.html`의 입력 진행 상태 오른쪽 버튼을 공용 `.draft-actions`에서 분리해 전용 `.content-input-actions`로 변경했다. `styles.css`는 버튼 폭을 확보해 세로 두 줄로 배치하고, 버튼 문구가 줄바꿈되지 않도록 했다. 너비 420px 이하에서만 한 줄 2열로 반응형 전환한다.

## 티스토리 본문 확인 오탐 보완 (2026-10-02, v1.21)

- `tistory-auto-blog` 확장 프로그램에서 제목·본문·이미지 입력 뒤 본문 전체 문자열과 티스토리 `innerText`를 완전 비교하던 검증을 문단 문맥 검증으로 교체했다. 티스토리의 자동 링크화·줄바꿈/figure 재구성은 정상 동작이므로, 이것이 본문이 정상 입력된 뒤에도 “입력된 본문을 다시 확인하지 못했습니다”로 멈춘 직접 원인이었다. 이어서 적용은 제목·본문 존재·이미지 수를 보존 검증하고, 문단 60% 이상 확인 시 카테고리·태그·발행 설정만 계속 적용한다. 오류 메시지에는 원문을 기록하지 않고 확인 문단 수만 표시한다. 프로그램/확장/ZIP 버전은 `v1.21`.

## 티스토리 갱신 (2026-10-02, v1.20)

- `tistory-auto-blog` 확장은 제목·본문·카테고리·태그와 이미지를 사람 속도로 입력합니다. v1.20은 일반 버튼인 `#category-btn`을 입력칸 포커스 함수로 처리해 정상적으로 목록을 연 뒤에도 실패로 오인하던 문제를 카테고리 전용 열기·가시성 검증으로 고쳤다. 중단된 기존 글은 내용을 덧쓰지 않고 카테고리·태그·발행 설정만 이어서 적용할 수 있으며 기존 태그도 중복 입력하지 않는다. 수정 화면의 기존 본문 서식 보존도 유지한다. 카테고리·태그 전용 저장은 발행 설정을 건드리지 않고 해당 두 값만 저장하며, 홈주제·예약 등은 별도 발행 설정 저장으로 관리한다. 보호 비밀번호는 저장하지 않는다.

> **다른 CLI(Codex, Gemini, 다른 Claude 세션)가 이어서 작업할 때 가장 먼저 읽는 "지금 상태" 요약본이다.**
> 규칙·원칙은 루트 `AGENTS.md`/`CLAUDE.md`, 프로그램별 상세는 각 `<프로그램>/AGENTS.md`·`README.md`에 있다.
> 이 문서는 "최근에 무엇을 했고, 무엇이 멈춰 있고, 다음에 무엇을 하면 되는지"만 모은다.
> 작업을 끝낼 때마다 아래 1·2·3번 표를 갱신하고 같은 커밋에 포함할 것.

- 최종 갱신: 2026-10-01 (Claude 세션 — 로그인 폼 통일 배포 후 남은 일 정리)
- 기준 커밋: `7179bab` 이후 (master, origin과 동기화됨)

---

## 1. 지금 멈춰 있거나 남은 일

| # | 할 일 | 상태 / 막힌 이유 | 담당 | 자세한 위치 |
|---|---|---|---|---|
| 1 | Meta 앱 심사 (`threads_keyword_search` 고급 액세스) | ⏸ **비즈니스 인증 재제출 후 결과 대기**. 결과가 나오면 → 액세스 인증 → 데이터 처리 질문 → 앱 검수 제출 순서로 재개. 제출에는 심사관 테스트 계정과 시연 영상이 필요 | 주인님(Meta 화면) + 개발 | `threads-affiliate-poster/docs/META_APP_REVIEW.md` §0 |
| 3 | 회원 계정으로 실제 동작 확인 | 쇼핑제휴 `/trends`(직접 가져오기·검색 필터·AI 모델별 캡션·내 페르소나), 댓글자동화 `threads_read_replies` 재연동 후 댓글 테스트, 20개 프로그램 사이드바 하단 계정 표시 | 주인님(테스트) | 각 서브프로젝트 `AGENTS.md` |
| 4 | 티스토리 블로그 자동화 (`tistory-auto-blog/`, BLOG 방식 = 웹 + 크롬 확장) | 🟡 **확장 계정 연동 배포 완료(v1.02)**: 전용 DB·owner-only RLS, 프로그램·기본 3단계 요금제, `https://tistory-auto-blog-pearl.vercel.app` 배포. 확장은 설정의 연동 토큰을 서버에서 검증한 뒤 저장한다. 편집기 조작은 티스토리 권한만 쓰는 읽기 전용 조사 모드다. **다음: 주인님 PC에서 `extension/`을 압축 해제 로드 → 설정에서 토큰 발급·연결 → JSON 전달 → 서버 변환기·실제 입력 코드.** 복제 원본 ESLint 오류 53개는 별도 정리 필요 | 주인님(조사 실행) + 개발 | `tistory-auto-blog/docs/TISTORY_PLAN.md` §6, `tistory-auto-blog/AGENTS.md` |
| 6 | BLOG(ai-auto-blog v1.33) 실제 사용 확인 | ① 이미지 1~5장 선택 시 제목용·문단 이미지 배치 ② 확장으로 네이버 입력 시 추천 링크가 **실제 링크 1개만** 들어가는지(v1.27 수정 후) ③ 추천테그 추출 결과 ④ 회원 계정으로 로그인→글 생성. 실제 생성은 회원 키 유료 호출이라 **에이전트가 임의 실행 금지** | 주인님(테스트) | `ai-auto-blog/AGENTS.md` |
| 7 | GPT-6 계열 본문 생성 1회 검증 (BLOG) | 유료 — 주인님 승인 후 실행 | 개발 | `ai-auto-blog/AGENTS.md` v1.09 |
| 8 | BLOG 30일 자동 삭제 첫 실행 결과 확인 | 📅 **2026-11-01 03:00 KST** 첫 실행(기존 데이터 10/1부터 유예). 다음 날 삭제 건수·Storage 정리 확인 | 개발 | `ai-auto-blog/app/api/cron/cleanup-images` |
| 9 | (Codex 담당) SEO 스튜디오 남은 3가지 | ① `naver-blog-seo-studio/components/StudioPage.tsx`의 "다른 프로그램 보기" 링크 `/blog/dashboard` → `https://www.buylife.xyz/dashboard`(다른 프로그램은 2026-10-01 교체 완료) ② 로그인 화면을 `docs/PLATFORM_PATTERNS.md` §29 레이아웃으로 ③ 확장 타이핑 속도 24~52ms → §20 기준 70~170ms. 고친 뒤 버전 +0.01(코드·DB) | Codex | `docs/ERROR_LESSONS.md` D, §29 |
| 10 | (선택) BLOG 해시태그에도 본문 필터 적용 | SEO 규칙을 그대로 복사해 "위한·주목해야" 같은 말이 남을 수 있음 | 주인님 결정 대기 | `ai-auto-blog/AGENTS.md` v1.29 |
| 11 | 로그인 폼 통일 실사용 확인 (24개 프로그램) | 모든 라이브 `/login` 200·새 문구 확인 완료. 남은 것: 회원 계정으로 아무 프로그램 1~2개 로그인 → `?redirect` 경로로 돌아가는지, 좌측 "다른 프로그램 보기"가 메인 대시보드로 가는지 | 주인님(테스트) | `docs/PLATFORM_PATTERNS.md` §29 |
| 5 | ⚠️ ai-auto-blog 운영 DB 정책·API 점검 | `blog_*` 테이블이 anon 읽기·모든 회원의 카테고리 변경 등으로 열려 있고 `GET /api/posts/[id]`가 인증 없음(읽기 조회로 확인, **미수정**). 영향 범위 확인 후 정책 교체·API 인증 추가(버전 +0.01, 주인님 승인) | 로컬 + 주인님 | `docs/ERROR_LESSONS.md` C 섹션 2026-10-01(cloud) 항목 |

**주의**: `naver-blog-seo-studio/`는 주로 Codex가 작업하는 폴더다. 2026-09-30 주인님 지시로 Claude가 권한 규칙만 적용했다(v1.03).
손대기 전에 `git status --porcelain -- naver-blog-seo-studio`로 Codex의 커밋 안 된 변경이 없는지 먼저 확인하고, 있으면 건드리지 않는다.

---

## 2. 최근 완료한 작업 (2026-09-28 ~ 09-29)

| 영역 | 무엇을 했나 | 왜 | 커밋/기록 |
| SEO 스튜디오 추천 태그 정제 (v1.59) | 한글 조사를 문자 단위로 잘라 `메시지`가 `메시`가 되고 `합니다.`·`있습니다.` 금칙어가 우회되던 로직을 실제 조사·문장부호 처리로 교체. 이미 구체 태그에 포함된 `서울`·`여행` 같은 구성 단어와 본문 일반어(`시간`·`여행지` 등)를 제외하고, 주제·사용자 핵심 키워드는 보존. 두 사용자 화면 사례 회귀 테스트 추가 | 불필요한 추천 태그가 발행 설정에 섞임 | `naver-blog-seo-studio/AGENTS.md`, `CLI_HANDOFF_2026-10-01.md` |
|---|---|---|---|
| 쇼핑제휴 `/trends` 떡상 탐지기 | 가짜 샘플 데이터(지어낸 조회수·반응도)를 걷어내고 Meta 공식 `keyword_search` + "떡상글 직접 가져오기" + 출처 배지로 재구현 | 실제로는 동작하지 않는 기능이 "실시간 분석"처럼 보이고 있었음 | `docs/PLATFORM_PATTERNS.md` §24 |
| 쇼핑제휴 검색 확장 | 앱 검수 승인 회원: 키워드/해시태그 방식·미디어 유형·작성자 필터로 타인 공개 글 검색. 미승인 회원: 직접 가져오기 안내. 화면 맨 위 A/B 안내 박스 + "비즈니스 앱 승인 절차" 매뉴얼 팝업(`platform_guides` `ae85d991-...`) | 승인 여부에 따라 쓸 수 있는 기능이 다름 | `3975b29`, `4257527` / TAP `AGENTS.md` |
| 쇼핑제휴 AI 캡션 | 화면에서 고른 모델(GPT-6/5.6/4.1, Gemini 3.x, Claude Sonnet 5/Opus 5/Haiku 4.5)을 몰래 다른 모델로 바꿔 부르던 코드 제거, 종료된 모델 목록 정리 | 종료 모델 호출로 실패하고 있었음 | TAP `AGENTS.md` |
| 쇼핑제휴 내 페르소나 | 커스텀 말투를 저장해 트렌드 벤치마킹·새 글 작성에서 재사용(`tap_personas`, 공용 `PersonaPicker`) | 테이블만 있고 연결이 안 돼 있었음 | `25113ca` |
| 쓰레드 3개 프로그램 앱 정보 분리 | 인스타용 `meta_app_id/secret`과 쓰레드용 `threads_app_id/secret`을 따로 저장. Meta 제거·삭제 콜백은 쇼핑제휴 한 곳에서 3개 프로그램을 함께 처리 | 인스타·쓰레드 앱 ID 칸을 같이 써서 잘못된 ID로 인증 실패(4476002) | 루트 마이그레이션 `0017` |
| threads(자동포스팅) 카테고리 버그 | 카테고리 JSON을 API 키 칸에 덮어쓰던 코드 제거·데이터 복원 | 회원 API 키가 망가지고 있었음 | `threads/AGENTS.md` |
| 운영 DB 미적용 마이그레이션 | `tap_saved_posts`, `tap_personas`, `program_prompts`, `style_preset_prompts`, `user_image_generations`, `affiliate_clicks`, `threads_categories` 적용 | 코드만 있고 운영 DB에 테이블이 없었음 | 각 `supabase/migrations/` |
| 법적 페이지 | 개인정보처리방침 제12조(Meta 연동 정보, 10/5 시행 공지), `https://www.buylife.xyz/data-deletion` 신설 | Meta 앱 심사 필수 항목 | `META_APP_REVIEW.md` §1 |
| 카탈로그 썸네일 | 30개 전부 실사 원칙으로 정리(seo-studio·tarot 교체), 업로드 도구 `scripts/upload-program-thumbnail.mjs` | 썸네일은 실사가 원칙 | `docs/PLATFORM_PATTERNS.md` §13·§14 |
| 사이드바 통일 | 21개 프로그램 좌측 메뉴 바로 밑에 로그인 계정·로그아웃을 붙이고, 사이드바를 화면에 고정해 항상 보이게 함(기준: TAP `Sidebar.tsx`). 처음엔 화면 맨 아래에 붙였다가 "메뉴와 너무 멀다"는 지시로 메뉴 밑으로 옮김 | 긴 페이지에서 계정 표시가 화면 밖으로 밀려남 | `7b09f63`, `eb0b072`, 이번 커밋 / 루트 `AGENTS.md` §10 |
| 쇼핑제휴 알리 상품 이미지 누락 재발 수정 (v1.05) | 원인: 알리 API 호출 빈도 제한(`ApiCallLimit`)이 조용히 삼켜짐(09-27 지침은 단축 URL만 다뤘음). 재시도·경고·"이미지 다시 가져오기" 버튼 추가, 누락 1건 복구 | 주인님 신고 | `threads-affiliate-poster/docs/ALIEXPRESS_IMAGE_TROUBLESHOOTING.md` |
| 로그인 폼 통일 + "다른 프로그램 보기" 링크 (24개 프로그램 + ai-image-studio + ai-auto-blog v1.33) | 모든 프로그램 로그인 화면을 BLOG 로그인 폼 레이아웃으로(`docs/PLATFORM_PATTERNS.md` §29). 좌측 메뉴 "← 다른 프로그램 보기"를 `/blog/dashboard` → **`https://www.buylife.xyz/dashboard`**(주인님 결정). web-crawler 버전 파일·표시 추가, music·shop-detail-page 빌드 막던 미사용 변수 제거. 버전: insta_auto_poster(v1.03), kakao_auto_poster(v1.03), naver-cafe-poster(v1.03), shots(v1.03), threads(v1.03), threads-affiliate-poster(v1.14), real_estate_sales(v1.03), web-crawler/webapp(v1.03), mbti-character(v1.04), tarot(v1.04), video-to-gif(v1.03), auto-detail-page(v1.04), booking-reminder(v1.03), competitor-analysis(v1.03), crm-google-form(v1.03), instagram-comment-reply(v1.03), instagram-dm-reply(v1.03), longtail-keyword-expander(v1.03), music(v1.03), shop-detail-page(v1.03), stepmail(v1.03), threads-comment-reply(v1.03), trending-product-finder(v1.03), youtube-auto-reply(v1.03), ai-image-studio(v1.03). 예외: SEO 스튜디오(Codex — 같은 링크가 `components/StudioPage.tsx`에 남아 있음, Codex가 고칠 것) | 주인님 지시 | `docs/PLATFORM_PATTERNS.md` §29, `docs/SIDEBAR_LAYOUT_STANDARD.md` |
| BLOG 문단 이미지 고르게 배치 (ai-auto-blog v1.32) | 2~4장일 때 문단 이미지가 문단 4개를 묶음으로 나눠 맡음(3장=[1~2][3~4] 등), 앞쪽 쏠림 해소 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "2~4장일 때 문단 4개를 나눠 맡기" |
| BLOG 이미지 장수 선택 (ai-auto-blog v1.31) | 이미지 1~5장 선택(1번 제목용=전체 대표, 2번부터 문단 1~4 순서), 본문 문단 3→4개. **남은 일: 실제 생성으로 배치 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 장수 선택" |
| BLOG 삭제 예정 배지 문구 (ai-auto-blog v1.30) | "N일 후 삭제" → "N일 후 자동삭제" | 주인님 지시 | `ai-auto-blog/AGENTS.md` "삭제 예정 배지 문구" |
| BLOG 추천테그 추출 SEO와 동일화 (ai-auto-blog v1.29) | SEO 스튜디오 v1.59 태그 추천 코드·스타일을 그대로 복사(함수 diff 동일). SEO 규칙이 바뀌면 같이 맞출 것 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "추천테그 추출을 SEO 스튜디오 v1.59와 똑같이" |
| BLOG 확장 추천태그 추출 (ai-auto-blog v1.28) | SEO 스튜디오 v1.57 태그 추천을 BLOG 확장에 적용(버튼을 눌렀을 때만, 해시태그·제목·본문 빈도, 최대 10개) + 해시태그 조사 처리 보완 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 추천태그 추출" |
| BLOG 추천 링크 중복 입력 수정 (ai-auto-blog v1.27) | 링크 붙여넣기가 모든 프레임에서 돌아 3번 + 글자 1번 들어가던 것 → 커서가 있는 프레임 하나에서만 1번 붙여넣기, 실패 시에만 글자. 이미지 설명 줄 제거. 실제 링크가 걸리는 것은 주인님 화면으로 확인됨. **남은 일: 새 버전으로 1개만 들어가는지 재확인** | 주인님 신고(확장.png) | `ai-auto-blog/AGENTS.md` "추천 링크가 4번 들어가던 문제" |
| BLOG 확장 부제 문구 (ai-auto-blog v1.26) | 확장 제목 밑 문구를 주인님 문안으로 교체 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 부제 문구" |
| BLOG 확장 제목 한 줄 (ai-auto-blog v1.25) | 확장 제목 "BLOG(원문) 네이버 입력기" 한 줄, 확장 이름·툴팁 통일 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 제목" |
| BLOG 버튼 이름 변경 (ai-auto-blog v1.24) | "네이버로 보내기" → "네이버 입력기로 보내기"(버튼·안내·오류 문구 전체) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "버튼 이름" |
| BLOG 확장 미리보기 문구 정리 (ai-auto-blog v1.23) | 미리보기 링크 뒤 "(실제 링크로 입력)" 문구 삭제 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 미리보기 링크 문구 정리" |
| BLOG 추천 링크 한 줄 + 실제 링크 입력 (ai-auto-blog v1.22) | 추천 링크를 "👉 {문구} 바로가기" 한 줄로(예전 글도 보낼 때 정리), 확장이 링크 줄을 링크 걸린 HTML 붙여넣기로 입력 후 실제 링크 생성 확인(실패 시 글자로). **남은 일: 실제 네이버 화면에서 링크 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "추천 링크 한 줄 + 네이버에 실제 링크로 입력" |
| BLOG 네이버 입력 링크 (ai-auto-blog v1.21) | 확장 입력 시 추천 링크가 글자로만 들어가던 것 → 링크를 `글자: 주소 `(괄호 없음, 뒤에 띄어쓰기)로 바꿔 네이버 자동 링크 유도. **남은 일: 실제 포스팅으로 링크 확인, 안 되면 링크 도구 방식(구조 분석 필요)** | 주인님 요청(추천링크.png) | `ai-auto-blog/AGENTS.md` "네이버 입력 시 링크가 걸리게" |
| BLOG 확장 아이콘·이름 구분 (ai-auto-blog v1.20) | SEO 확장과 똑같은 회색 "A" 아이콘이라 헷갈리던 것을 초록 "B" 아이콘·"BLOG(원문) 네이버 입력" 이름으로 구분 | 주인님 신고 | `ai-auto-blog/AGENTS.md` "확장 아이콘·이름 구분" |
| BLOG 확장 버전 자동 동기화 (ai-auto-blog v1.19) | SEO 스튜디오 방식(프로그램 버전 = 확장 버전 = ZIP 버전)을 `prebuild`로 자동화 — 버전 올리고 빌드하면 manifest·ZIP 자동 갱신(예전 ZIP 삭제). 설정 화면 "업데이트 필요" 표시, 확장 안 "새 버전" 안내 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 버전 자동 동기화" |
| BLOG 서브폴더 이름 변경 (ai-auto-blog v1.18) | `blog/` → `ai-auto-blog/`(폴더=slug=Vercel 프로젝트 규칙). 작업·빌드·배포는 이제 `ai-auto-blog/`에서. 같은 Vercel 프로젝트·주소로 배포 확인 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "서브폴더 이름 변경" |
| BLOG 네이버 입력 크롬 확장 (ai-auto-blog v1.17) | BLOG 전용 확장(A안): 글 보기 "네이버로 보내기" → 확장이 네이버 글쓰기 화면에 제목·본문·이미지를 §20 속도(70~170ms)로 한 글자씩 입력, 카테고리·태그까지, 마지막 발행은 사람. 설정 화면 토큰·ZIP, `blog_posts` 칸 4개 추가. 서버 흐름 운영 검증 완료. **남은 일: 주인님 PC 실제 네이버 화면에서 끝까지 입력 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "네이버 블로그 입력 크롬 확장", `docs/PLATFORM_PATTERNS.md` §28 |
| BLOG 글쓰기 고급 설정 삭제 (ai-auto-blog v1.16) | "이번 글에만 쓸 Gemini 키·커스텀 엔드포인트" 입력칸 삭제, 서버도 요청 키를 받지 않고 등록된 본인 키만 사용 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "고급 설정 삭제" |
| BLOG 보관 안내 문구 정리 (ai-auto-blog v1.15) | 설정 화면 안내에서 "Cloudinary 연결 불필요"·"기존 콘텐츠 10/31부터 삭제" 문장 삭제(규칙·배지는 유지) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "보관 기간 안내 문구 정리" |
| BLOG 콘텐츠 일체 30일 보관 (ai-auto-blog v1.14) | 글(본문)·이미지·글감 수집 결과를 건별로 만든 날 기준 30일 뒤 자동 삭제(매일 03시 KST). 기존 데이터는 10/1부터 30일 유예 → 첫 삭제 11/01에 현재 글 14·글감 25개 삭제 예정. 설정·글쓰기·게시글 관리·글감 수집 화면 안내, 글마다 "N일 후 삭제" 배지 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "콘텐츠 일체 30일 보관" |
| BLOG 이미지 보관 기간 30일 (ai-auto-blog v1.13) | Storage의 BLOG 이미지(`<회원id>/ai-auto-blog/`만)를 만든 지 30일 지나면 매일 03시(KST) 자동 삭제(Vercel Cron + `CRON_SECRET`). 설정 화면·AI 글쓰기 화면에 보관 기간·다른 블로그로 옮길 때 주의사항 안내 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 보관 기간 30일" |
| BLOG 이미지 저장소 전환 (ai-auto-blog v1.12) | 모든 회원·모든 이미지(자동 생성·편집기 AI·첨부)를 Supabase Storage `post-images/<회원id>/ai-auto-blog/`에 저장, Cloudinary 연동 삭제. 기존 base64 글 3개(각 12MB) 이미지 9장 이전 → 20~25KB | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 저장소 전환" |
| BLOG 이미지 프롬프트 섹션 숨김 (ai-auto-blog v1.11) | 글 아래 "🎨 생성 이미지 AI 프롬프트" 섹션을 새 글에서 만들지 않고, 기존 글은 보기·편집 화면에서 걷어냄 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 프롬프트 섹션 숨김" |
| BLOG 주소 입력 자동 보정 (ai-auto-blog v1.10) | 추천 링크·참고 링크에 `buylife.blog`처럼 넣어도 `https://`를 자동으로 붙임(브라우저 "URL을 입력하세요" 차단 해제) | 주인님 요청(ur.png) | `ai-auto-blog/AGENTS.md` "주소 입력 자동 보정" |
| BLOG 모델 목록 정리 (ai-auto-blog v1.08~v1.09) | 본문 기본 OpenAI GPT-4.1, 모델 표준 문서 기준 레지스트리로 정리(GPT-6 Luna·6.1 Sol, Claude Fable 5, Gemini 3.5/3.6/3.8 Flash 추가, Haiku 4.5 정확한 ID로 수정), 이미지 1K를 2K 위로·기본 2K, 제목에 선택 모델명 표시. 남은 일: GPT-6 계열 실제 생성 1회 검증(유료, 승인 필요) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "모델 기본값·목록 정리" |
| BLOG 로그인 "fetch failed" 수정 (ai-auto-blog v1.07) | 단독 배포 환경변수에 옛(없어진) Supabase 주소가 들어가 있던 것을 공용 DB 값으로 교체, 로그인 화면 문구("세션 인증"→"로그인") 정리 | 주인님 신고(에러.png) | `ai-auto-blog/AGENTS.md` "로그인 fetch failed 수정" |
| BLOG 독립 배포 분리 (ai-auto-blog v1.06) | 루트 내장(www.buylife.xyz/blog)을 자체 Vercel 프로젝트 `ai-auto-blog`(https://ai-auto-blog-one.vercel.app)로 분리, 메인 카탈로그 `app_url` 교체, 예전 /blog/* 주소는 새 주소로 넘김. 회원 전용 화면 서버 권한 확인·설정 저장 권한 확인 추가. 남은 일: 회원 계정으로 로그인→글 생성 실사용 확인 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "독립 배포 분리" |
| BLOG 버전 표시 (ai-auto-blog v1.05) | 버전 규칙이 DB에만 있던 것을 `ai-auto-blog/utils/version.ts` + 사이드바 제목 밑 표시로 보완 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "버전 표시" |
| BLOG 본문·이미지 모델 분리 선택 (ai-auto-blog v1.04) | 글 작성 화면에 SEO 스튜디오와 같은 "본문 생성 설정(OpenAI/Claude/Gemini+모델)"·"이미지 생성 설정(나노바나나 모델)" 카드. 키는 본문용/이미지용 각각 확인, 생성 실패 시 틀 글 대체 없이 오류 표시. 세 플랫폼 짧은 요청 검증 완료 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "본문 생성 모델·이미지 생성 모델 분리 선택" |
| BLOG(원문) 이미지 로직 개편 (ai-auto-blog v1.03) | SEO 스튜디오 방식 반영: 섹션마다 핵심 문장 1개를 원문 그대로 골라 그 문장만 그리는 짧은 장면 설명, 이미지 응답에서 inlineData part 탐색. **운영자 GEMINI_API_KEY 폴백으로 키 없는 회원 글이 운영자 비용으로 생성되던 문제 차단**(API_KEY_REQUIRED 안내), pollinations 대체 이미지 제거. 실측 검증 완료(내용 일치·가짜 글자 제거·설명 잘림 수정), 운영 GEMINI_API_KEY 삭제. 남은 일: 이미지 저장 Supabase 전환 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 생성 로직" |
| 관리자(gmail) API 키 재등록 확인 (09-30) | 쓰레드 자동포스팅용 OpenAI·Perplexity 키를 주인님이 재등록 → OpenAI 모델 목록 조회 200, Perplexity 무과금 검증(빈 요청 400 vs 가짜 키 401)으로 유효 확인 | 주인님 | — |
| SEO 스튜디오 권한 규칙 적용 (v1.03) | Codex가 버전 표시(v1.02)는 이미 적용해 둠. 웹 `lib/access.ts`·확장 `lib/extensionAuth.ts`를 핵심 원칙 6번 순서로 정리(정지 차단·FREE 추가, 등급만/사용기간만 허용 제거). 막히는 회원 0명 | 주인님 지시 | `naver-blog-seo-studio/AGENTS.md` |
| 이용 권한 기본규칙 확정 (09-30) | FREE 배지 = 가입만 하면 등급과 무관하게 사용 / 그 외 = 구독 또는 일반 이상 + 사용기간. 핵심 원칙 6번으로 등록. 타로·캐릭코드에 FREE 배지 + 같은 규칙 판정 코드 적용(v1.03) | 주인님 지시 | 루트 `CLAUDE.md` 핵심 원칙 6번 |
| 이용 권한 베타테스트 정책 | 무료 배지 → 가입만 하면 사용 / 그 외 → 결제 구독 또는 일반 이상 + 사용기간. 등급만으로 열리던 예외 삭제. 루트 + 서브프로젝트 24곳 적용, 해당 프로그램 버전 +0.01 | 주인님 지시 | 루트 `CLAUDE.md` "이용 권한 판정 정책" |
| 🔒 `user_program_access` 보안 구멍 수정 | 모든 역할에 `using (true)`로 열려 있던 RLS 정책 "Service role full access" 삭제 → 회원은 본인 행 조회만, 쓰기는 service role(관리자 API)만. 적용 전 기존 4,702건 전부 관리자가 부여한 것 확인(악용 흔적 없음). 적용 후 회원 권한으로 검증: 본인 29건만 조회, 추가 시도 거부 | 주인님 승인 | 루트 마이그레이션 `0019` |
| 쇼핑제휴 복제 키트 (v1.02) | 다른 GitHub·Vercel·Supabase 계정으로 통째 복제하는 키트 `threads-affiliate-poster/clone-kit/`(설치 매뉴얼·기본지침·DB 설계·전체 스키마 SQL·환경변수·연동 매뉴얼 8종·복제 스크립트). 코드에 독립 운영 모드(`NEXT_PUBLIC_STANDALONE_MODE`, `src/lib/deployment.ts`) 추가 — 값이 없으면 기존과 동일. 스키마는 빈 PostgreSQL에서 실행 검증, 실제 새 계정 설치는 아직 | 주인님 요청 | TAP `README.md` "별도 서버로 통째 복제하기" |
| 프로그램 버전 관리 시작 | 30개 프로그램 전부 `v1.01`. DB `programs.version` 칸 추가(루트 마이그레이션 `0018`) → 메인 사이트 목록·상세·관리자 편집 화면에 표시. 21개 프로그램은 `lib/version.ts`의 `APP_VERSION`을 좌측 메뉴 제목 밑에 표시, auto-detail-page·mbti·mbti-character·tarot은 화면 제목 옆(또는 밑)에 표시(09-29 후반 추가). **이후 수정할 때마다 +0.01, 큰 변경은 주인님 지시 시 v2.01** | 주인님 지시 | 루트 `CLAUDE.md` 핵심 원칙 5번 |
| 작업 규칙 | 매 작업 5단계(빌드→커밋→푸시→배포→**인수인계 문서 반영**), 여러 CLI가 같은 폴더·스테이징을 공유한다는 주의 추가 | 다른 CLI가 이어받을 수 있게 | `79cc7e5` |

---

## 티스토리 기본 발행 모달 우회 및 본문 정렬 보존 (2026-10-02, v1.31)

- 기본 발행값(공개·댓글 허용·현재 발행)만 쓰는 경우 `applyRemainingTistorySettings()`가 티스토리 React 발행 모달을 열지 않고 카테고리·태그 적용 뒤 완료한다. 불필요한 모달 열기 실패가 제목·본문·이미지 입력 완료 후 전체를 중단시키지 않는다.
- `tistorySafeHtml()`은 원문의 안전한 `text-align` 값과 Tailwind 정렬 클래스를 티스토리용 인라인 스타일로 보존하며, 정렬 없는 본문 블록은 명시적으로 왼쪽 정렬한다. 이미지 삽입 뒤 남은 가운데 정렬 상태가 다음 문단에 번지는 문제를 막는다.

## 티스토리 홈주제 실제 포인터 선택 (2026-10-02, v1.32)

- 홈주제가 있는 기본 발행 설정은 `applyTistoryTopicWithTrustedClicks()`가 드롭다운과 정확히 일치하는 항목을 Chrome Debugger 포인터 클릭으로 선택하고, 선택 버튼 문구로 완료를 확인한다. 발행창 내부의 합성 클릭 결과가 반환되지 않아 생기던 일반 오류를 없앴다.

## 티스토리 재개 시 태그 입력칸 부재를 전체 중단으로 처리하지 않음 (2026-10-02, v1.33)

- `#tagText`는 모든 티스토리 상태에 존재하는 selector가 아니다. 재개 흐름은 남아 있는 발행 모달을 닫고 실제 태그 입력 후보를 찾으며, 입력칸이 없으면 태그만 건너뛰고 제목·본문·카테고리·홈주제 설정을 계속 적용한다. 완료 문구에 건너뛴 태그 개수를 표시한다.

## 3. 이어받는 도구가 꼭 알아야 할 것

- **클라우드 세션은 `cloud-work` 브랜치에서만 작업**한다(`docs/CLOUD_SESSION.md`). 로컬은 `master` 유지, 클라우드 작업은 로컬에서 병합 후 배포.
- **작업 전에 `docs/ERROR_LESSONS.md`(작업 중요 지침)를 꼭 읽고, 에러를 해결했거나 점검 사항을 찾으면 같은 커밋에 추가한다**(핵심 원칙 7번, 모든 CLI 공통).

- **여러 CLI가 같은 작업 폴더를 동시에 쓴다.** `git add`는 커밋 직전에만, 그리고 `git commit -m "..." -- <경로들>`처럼
  경로를 지정해 커밋한다. 남의 변경이 섞여 들어간 사례가 실제로 있었다.
- **배포는 서브프로젝트 폴더에서 `vercel deploy --prod --yes --scope buylife`.** Vercel과 GitHub는 연결돼 있지 않은 게 정상이다(CLI 업로드 방식).
- **테스트 계정**: `buylifemall@naver.com` = 일반 회원 테스트용(회원 기능 문제는 이 계정부터 확인), `buylifemall@gmail.com` = 관리자.
- **비용이 드는 작업은 매번 승인받는다**: 관리자 Gemini 키로 이미지 생성 같은 유료 호출, DB 스키마·환경변수 변경, 데이터 삭제.
- **비밀값 노출 금지**: 스크린샷 등에 앱 시크릿이 보여도 문서·커밋·답변에 옮겨 적지 않는다.
- **브라우저로 비밀번호 로그인을 대신하지 않는다.** 로그인이 필요한 화면 확인은 주인님께 요청한다.
- **데이터를 지어내서 화면을 채우지 않는다.** 실제 API가 주지 않는 수치(조회수 등)는 표시하지 않고 원문 링크를 준다.
- 로컬 빌드만 타입 에러가 나면 먼저 `node_modules` 버전이 `package.json`과 맞는지 확인한다(`npm install`로 해결된 사례: longtail).
- 사용자 호칭은 "주인님", 답변은 정중한 존댓말과 쉬운 한글.
# 티스토리 본문 끝 해시태그 복구 (2026-10-02, v1.34)

- 티스토리의 현재 글쓰기 화면에는 태그 전용 입력칸이 노출되지 않는 상태가 있다. v1.33은 이 경우 설정 적용을 계속하기 위해 태그를 건너뛰었지만, v1.34부터는 전용 입력칸이 없을 때 본문 끝에 왼쪽 정렬 `#태그` 줄을 넣고 삽입 결과를 확인한다. 이미 본문 또는 티스토리 전용 태그에 있는 값은 중복 입력하지 않는다.
# 티스토리 홈주제 적용 시 공개 범위 강제 확인 (2026-10-02, v1.35)

- 티스토리가 직전 글의 비공개 선택을 발행창에 유지할 수 있는데, 홈주제만 적용하는 빠른 경로는 공개 범위를 기본값으로 가정했다. 이제 홈주제를 적용할 때도 `공개` 라디오를 실제 포인터 클릭으로 확정하고 체크 상태를 검증한다.
# 티스토리 공개 라디오 식별 보강 (2026-10-02, v1.36)

- 실제 발행창에서 공개 라디오의 라벨 문구가 단독 `공개`가 아니어서 v1.35의 공개 선택 확인이 멈췄다. 구조 조사로 확인된 `#open20`을 우선 쓰고, 연결 라벨·형제·부모 중 화면에 보이는 대상을 실제 클릭하도록 보강했다.
# 티스토리 공개 라디오 일반 클릭 우선 적용 (2026-10-02, v1.37)

- v1.36의 포인터 클릭만으로는 현재 발행창의 공개 범위 React 상태가 체크로 확정되지 않았다. 공개 라디오는 먼저 티스토리 일반 클릭 경로로 선택하고, 체크되지 않은 경우에만 실제 포인터 클릭으로 재시도하며 확인 대기 시간을 4.5초로 늘렸다.
## 티스토리 본문 제목 중복 재발 차단 (2026-10-03, v1.49)

- 원인: v1.39의 제거기는 제목과 완전히 같은 Markdown 한 줄만 처리했다. 생성 프롬프트에 본문 제목 재출력 금지가 없었고, HTML/굵게 서식 제목 및 수정 저장 경로는 통과할 수 있었다.
- 조치: 프롬프트에 제목을 JSON `제목`에만 넣도록 명시했다. 공용 정규화기로 Markdown·HTML 독립 제목 블록을 생성, 수정 저장, 확장 전송 단계에서 모두 제거한다. 내용이 이어지는 컨테이너는 삭제하지 않는다.
## 티스토리 태그 첫 건 등록 뒤 오탐 중단 수정 (2026-10-03, v1.50)

- 증상/원인: 실제 글쓰기 화면에는 `업무` 태그 칩이 생성됐지만, v1.48 검증기는 예전 `.editor_tag > .txt_tag` 직계 구조만 조회해 현재의 “업무 태그 수정/삭제” 링크 구조를 찾지 못했다.
- 조치: `extension/sidepanel.js`가 `.txt_tag`, `.tag_link`, 태그 링크를 함께 수집하고, Enter 후 최대 4.5초 동안 실제 칩 생성을 확인하도록 변경했다. 최종 저장·발행은 자동으로 누르지 않는다.









