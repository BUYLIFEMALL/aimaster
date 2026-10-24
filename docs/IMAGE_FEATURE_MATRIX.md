# 이미지 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션(ecommerce-image) 확인 전.** 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **이미지 프로그램(생성·편집·변환·분석·인물·만화·글귀)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「이미지」 줄 8개와 병합됨 `photo-remake-studio`·`allinone-graphic`.
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 `lib/version.ts` 또는 `src/lib/version.ts`의 `APP_VERSION`) — 변환 v1.27 · 스타일 분석기 v1.38 · 바나나 캔버스 v1.33 · 이미지 스튜디오 v1.30 · 인물사진 v1.43 · 4컷 v1.36 · 패션 v1.13 · 감성 글귀 v1.27 · (병합됨) 포토 리메이크 v1.12 · 올인원 그래픽 v1.10.
> - 근거: 각 폴더의 현재 코드(파일 검색·직접 읽기), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [이미지 통합 분석 보고서](analysis-image-consolidation-20261021/REPORT.md) §1·§6·§8·§9, [공용 모듈 등록부](SHARED_MODULES.md), [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-IMG-01~05, [미배포 목록](PENDING_DEPLOYS.md). **운영 DB는 이번에 조회하지 않았다**(권한 회원 수·공개 여부·배지·DB 버전은 보고서·커밋 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6과 [작업표](IMAGE_CONSOLIDATION_TASKS.md)에 따로 둔다. 개수(템플릿 123종·국가 규격·모델 수·화풍 수)는 보고서 기준이며 이번에 다시 세지 않았다.
> - 관계 문서: [이미지 자동화 완성 기준](IMAGE_COMPLETION_POLICY.md) · [이미지 통합 작업표](IMAGE_CONSOLIDATION_TASKS.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md) · [이미지 모델 점검](IMAGE_MODEL_AUDIT_20261017.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 여러 회사 엔진으로 새로 만들기 → `ai-image-studio` / Gemini 편집·합성·템플릿 → `banana-canvas` / 기존 이미지 분석 → 프롬프트 → `style-dna-analyzer` / AI 없는 형식·크기 → `image-convert-studio` / 규격 사진 → `portrait-photo` / 컷 만화·인스타 연재 → `four-cut-comics` / 코디·가상 피팅 → `fashion-style` / 글귀 카드 → `emotion-writer`. 병합된 원본 두 곳에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/IMAGE_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/IMAGE_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전) | 성격 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 스튜디오 | AI 이미지 스튜디오 (`ai-image-studio` v1.30) | 생성 · **이미지 모델 연동 기준** | 한국어 아이디어 → 영문 마스터 프롬프트(1단계) → 엔진·모델 골라 생성(2단계) → 갤러리(받기·바나나로·변환으로) | `usage_logs.metadata` + 비공개 버킷 `ai-image-generations`(서명 주소) · 30일 cron / OpenAI·Gemini·Replicate(어댑터 8 등록) / 회원 본인 키 | 여러 회사 엔진 비교, 모델별 옵션 자동 폼, 다른 프로그램의 모델 연동 기준 | `stability` 어댑터는 불러오기만 하고 미등록, `fal.ts` 미사용, OpenAI·Replicate 직접 입력 시 한국인 지시 없음, 사진 편집 없음 | 독립(기준) |
| 바나나 | AI 바나나 캔버스 (`banana-canvas` v1.33) | 편집·합성 작업대 (병합 A·B 기준) | 작업 14종 선택 → Gemini 나노바나나 → 결과 기록·비교 → 「이 결과로 계속」·컷만 다시·레시피 → 변환·스토리보드로 보내기 | 표 `banana_canvas_results` + 비공개 버킷 `banana-canvas-files` · 30일 cron + 30건 상한 / Gemini / 회원 본인 키 | 편집 도구가 가장 넓음, 서버 저장·RLS, sharp 확대·크로마키 투명 PNG, 동시 요청 선점(이중 과금 방지) | Gemini 하나, 무료(키 없는) 지우기·글자 찾기·일괄 ZIP 없음(ClearPic C-0~C-5 대기) | 독립(기준) |
| 분석기 | 이미지 스타일 분석기 (`style-dna-analyzer` v1.38) | 분석 → 프롬프트 | 이미지 → 픽셀 팔레트 + 3사 비전 6항목 → 영/한 마스터 프롬프트(복제·변형 강도) → 자연어 보정 → 시험 생성·일치율 → 스튜디오·바나나·리버스 프롬프트로 | 표 `sda_analyses` + 비공개 버킷 `style-dna-images` · 30일 cron / Gemini·OpenAI·Claude / 회원 본인 키 | 3사 비전 선택, 팔레트 계산, 일치율·비교 슬라이더 | 보내는 프롬프트에 자리 표시(`[INSERT SUBJECT HERE]`)가 남음, 분석 모델 목록에 `gemini-3.1-pro-preview` | 독립 |
| 변환 | 이미지 변환 스튜디오 (`image-convert-studio` v1.27) | 편집·변환 (AI 없음) | 최대 300장 → 형식·품질·배율·게시처 규격·회전·반전·자르기 → ZIP / 콜라주 / 다른 프로그램 결과 받기 → 「○○에 다시 저장」 | 저장 없음(화면 언어만) / 없음 / 키 불필요 | 비용 0, 대량, 브라우저 처리 | 작업자 스레드 없이 화면 스레드에서 처리(대량 시 느림 — `new Worker` 검색 0건), EXIF 보존 선택 미확인 | 독립 |
| 인물 | AI 인물사진 (`portrait-photo` v1.43) | 인물 · 규격 사진 | 사진 → 목적 프리셋 → 후보 → 국가 규격 자르기·머리 비율 검사·순백 배경 → 묶음 저장·ZIP → 변환·패션·바나나·스토리보드로 | IndexedDB(썸네일) + 선택형 서버 보관함(`portrait_photo_saved` + 비공개 버킷, 7·30일) · 30일 cron / Gemini + 브라우저 얼굴 인식(AI 비용 없음) / 회원 본인 키 | 규격·검사가 전문적, 브라우저 얼굴 인식 | 화면 파일이 큼(보고서: `Studio.tsx` 890줄) | 독립 |
| 패션 | AI 패션스타일 (`fashion-style` v1.13) | 인물 · 코디·가상 피팅 | 인물 사진 + 상황 → 코디 추천 → 아이템 이미지 → 옷장 → 입혀 보기 → 메이크업·헤어 | **브라우저 IndexedDB만**(옷장·룩, 30일 기한) / Gemini(`gemini-3.8-flash` 등) / 회원 본인 키 | 가상 피팅·겹쳐 입기, 웹 이미지 안전 가져오기 | 서버 저장 없음(기기 바꾸면 사라짐), 다른 프로그램으로 보내기 없음(받기만) | 독립 |
| 4컷 | AI 4컷 만화 (`four-cut-comics` v1.36) | 글귀·만화 · 연재 + 게시 | 주제 → 대본 → 캐릭터 시트 → 3·4·6컷 → 한글 말풍선 → 인스타 문구 → 즉시·예약 게시, 다음 화 | IndexedDB + 선택형 비공개 버킷 보관함(7·30일) · 게시 표 `fcc_insta_posts` · 30일 cron / Gemini / 회원 본인 키 + 공용 `insta_accounts` + 본인 cron-job.org | 캐릭터 시트 첨부로 인물 일관성, 회차 연재, 자동 게시까지 완성 | 여러 회차 묶음 예약은 창을 닫으면 멈춤(보고서), 컷 배경 무료 사진 검색 없음 | 독립 |
| 글귀 | 감성 글귀 이미지 (`emotion-writer` v1.27) | 글귀·만화 · 카드 1장 | 주제 → AI 글귀 5개(또는 직접) → 배경(AI / Pixabay·Pexels) → 캔버스 한글 합성 → 다른 크기로 받기 → INSTA로 올리기·바나나·스튜디오로 | localStorage 초안(키·이미지 없음), 결과 서버 저장 없음 / Gemini + Pixabay·Pexels / 회원 본인 키 | 한국형 글귀, AI 비용 0 배경 선택지, 채널 크기 재배치 | 결과 보관함 없음, INSTA로 넘긴 파일이 공개 버킷 바로 아래에 남음(정리 없음 — 작업표 IM-U1) | 독립 |
| 리메이크 | AI 포토 리메이크 (`photo-remake-studio` v1.12) | 병합 원본 | **이동 안내만** — `api/remake`·`api/suggest` 410 | (옛) 브라우저 IndexedDB | 복원·비교 슬라이더·사물별 합성 지시 → 바나나로 이관 | 옛 브라우저 보관함은 옛 앱에서 내려받기만 | 병합됨 → 바나나(2026-10-21, A) |
| 올인원 | AI 올인원 그래픽 (`allinone-graphic` v1.10) | 병합 원본 | **이동 안내만** — `api/generate`·`api/edit`·`api/ai-fill` 410 | (옛) 저장 없음 | 상업 템플릿·기획서 자동 입력·비율 확장 → 바나나 「템플릿 그래픽」으로 이관 | — | 병합됨 → 바나나(2026-10-21, B) |

공통: 8개 운영 앱 모두 로그인 + 공통 권한 판정(`lib/access.ts` `checkProgramAccessApi`, 스타일 분석기는 `src/lib/dna/apiGuard.ts` `authorize`가 감쌈), 회원 본인 키(`user_api_keys`), 운영자 AI 키 환경변수 읽기 0건(2026-10-24 검색). 사용 기록이 거의 없어(보고서 §8-1: 스튜디오 12건·나머지 0건) 사용량으로는 판단하지 않는다.

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · – 해당 없음 · 「미확인」은 코드를 확인하지 못한 칸. 경로는 각 프로그램 폴더 기준.

### 2-1. 생성 (텍스트·참고 이미지 → 새 이미지)

| 기능 | 스튜디오 | 바나나 | 분석기 | 4컷 | 글귀 |
|---|---|---|---|---|---|
| 텍스트로 이미지 생성 | ○ `app/api/generate/route.ts` | ○ `generate` (`src/lib/bnc/types.ts`) | △ 시험 생성만 `src/app/api/test-image/route.ts` | ○ 컷 그림 `src/app/api/panel/route.ts` | ○ 배경만 `src/lib/studio/services.ts` |
| 한국어 아이디어 → 영문 프롬프트 다듬기 | ○ `app/api/enhance-prompt/route.ts`, `components/Step1PromptEnhancer.tsx` | ○ 아이디어 추천 `src/app/api/suggest/route.ts` | ○ 마스터 프롬프트(영/한) `src/lib/ai/dnaPrompts.ts` | ○ 대본 `src/app/api/script/route.ts` | ○ 글귀 `src/app/api/copy/route.ts` |
| 여러 회사 엔진 선택 | ○ 어댑터 8 등록 `lib/providers/index.ts`(모델 수 미확인, 보고서 33종) | × Gemini만 | △ 분석은 3사, 시험 생성은 Gemini `src/lib/ai/models.ts` | × | × |
| 나노바나나 등급·화질 선택 | ○ `lib/providers/nanoBananaModels.ts`(기준) | ○ `src/lib/imageModelChain.ts` | ○ `src/lib/ai/imageModels.ts` | ○ `src/lib/comic/options.ts` | ○ `src/lib/studio/config.ts` |
| 참고 이미지 넣어 생성 | 미확인 | ○ 합성 `synthesis`(입력 여러 장) | ○ 원본을 참고로 시험 생성 `src/lib/ai/image.ts` | ○ 캐릭터 시트 첨부 `src/app/api/character/route.ts` | × |
| 화풍 프리셋 | ○ `app/api/prompts/*`(화풍 게시판) | ○ `src/lib/bnc/styles.ts` | – | ○ `src/lib/comic/options.ts` | – |
| 상업 템플릿 그래픽 | × | ○ `src/lib/bnc/graphicTemplates.ts`, 기획서 자동 입력 `src/app/api/graphic-fill/route.ts` | × | × | × |
| 인물 기본 한국인 지시 | △ Gemini 경로·1단계만 `lib/providers/adapters/gemini.ts`, `app/api/enhance-prompt/route.ts`(OpenAI·Replicate 직접 입력은 없음) | ○ `src/lib/bnc/prompts.ts` `KOREAN_PEOPLE_RULE` | ○ `src/lib/ai/dnaPrompts.ts` | ○ `src/lib/comic/prompt.ts` | ○ `src/lib/studio/services.ts` |
| 당해 연도 주입 | × (`getFullYear` 검색 0건) | ○ `src/lib/bnc/prompts.ts` | ○ `src/app/api/analyze/route.ts`·`refine/route.ts` | ○ `src/app/api/script/route.ts`·`insta/route.ts` | ○ `src/lib/studio/services.ts` |
| 비용 안내(장당 단가) | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 |

### 2-2. 편집·변환

| 기능 | 바나나 | 변환 | 스튜디오 | 분석기 |
|---|---|---|---|---|
| AI 편집(복원·컬러화·스타일 등) | ○ `edit`·`restore` `src/lib/bnc/tasks.ts` | × | × | × |
| 부분 수정(브러시 마스크, Gemini) | ○ `inpaint` + `src/components/studio/MaskEditor.tsx` | × | × | × |
| 무료 지우기(브라우저 LaMa, 키 없음) | × — ClearPic C-1~C-5 승인 대기 | × | × | × |
| 글자 자동 찾기(OCR 마스크) | × — C-2 대기 | × | × | × |
| 배경 제거(투명 PNG) | ○ `bgremove` + 크로마키 `src/lib/files.ts` `chromaKey` | × | × | × |
| 비율 확장(아웃페인팅) | ○ `expand` | × | × | × |
| 확대 | ○ sharp 2·4배 `src/lib/files.ts` | ○ 0.5~4배(AI 없음) `src/lib/imageTools/sizeChange.ts` | × | × |
| 형식 변환(WebP·AVIF·PNG·JPEG)·품질 | × (받기 확장자만) | ○ `src/lib/imageTools/formats.ts`·`engine.ts` | × | × |
| 게시처 규격 6종 | × | ○ `src/lib/imageTools/postPresets.ts`(공용 `post-presets` 기준) | × | × |
| 회전·반전·비율 자르기 | × | ○ `src/lib/imageTools/geometry.ts` | × | × |
| 콜라주 | × | ○ `src/components/tool/CollageTool.tsx` | × | × |
| 여러 장 일괄 처리 | × | ○ 최대 300장 `src/components/tool/ConvertTool.tsx` | △ 1~10장 생성 | × |
| 원본 ↔ 결과 비교 슬라이더 | ○ `src/lib/bnc/compare.ts` | ○ `src/components/tool/BeforeAfter.tsx` | × | ○ `src/components/dna/CompareSlider.tsx` |
| 컷·단계 하나만 다시(선점, 이중 과금 방지) | ○ `src/app/api/run/recut/route.ts` `busy_until` | – | × | × |
| 작업 설정 레시피 저장 | ○ `src/app/api/presets/route.ts`(DB `banana_canvas_presets`) | × | △ 개인 프롬프트 보관 `app/api/prompts/custom/route.ts` | △ 보정 이력 `src/app/api/refine/route.ts` |
| 팔레트·색감 일치율 | × | × | × | ○ `src/lib/dna/palette.ts`·`compare.ts` |

### 2-3. 인물

| 기능 | 인물 | 패션 | 바나나 |
|---|---|---|---|
| 목적 프리셋(증명·비즈니스·SNS 등) | ○ `src/lib/portrait/purposes.ts` | × | △ `idphoto` 한 종류 |
| 국가별 규격 자르기 | ○ `src/lib/portrait/post.ts`(개수 보고서 기준 21종) | × | △ 증명사진 아래 「국가 규격은 AI 인물사진」 안내(보고서 L4) |
| 머리 비율·품질 검사(브라우저 얼굴 인식, AI 없음) | ○ `src/lib/portrait/faceLocal.ts`·`validate.ts`, `src/app/api/headcheck/route.ts` | × | × |
| 규격 묶음 한 번에 저장 | ○ `src/lib/portrait/bundles.ts` | × | × |
| ZIP 받기 | ○ `src/lib/portrait/zip.ts`(공용 `store-zip` 기준) | × | × |
| 코디 추천 | × | ○ `src/app/api/ai/recommend/route.ts` | × |
| 가상 피팅(입혀 보기) | × | ○ `src/app/api/ai/tryon/route.ts` | × |
| 메이크업·헤어 | × | ○ `src/app/api/ai/beauty-apply/route.ts`·`beauty-advice/route.ts` | × |
| 웹 이미지 안전하게 가져오기(SSRF 방지) | × | ○ `src/app/api/fetch-image/route.ts`, `src/lib/fetchImage.ts`, `src/lib/look/ssrf.ts` | × |
| 확대 비교(돋보기) | ○ `src/components/studio/ZoomCompare.tsx` | × | × |

### 2-4. 글귀·만화

| 기능 | 4컷 | 글귀 |
|---|---|---|
| 대본·글귀 생성 | ○ `src/app/api/script/route.ts`, `src/lib/comic/script.ts` | ○ `src/app/api/copy/route.ts` |
| 캐릭터 시트·인물 일관성 | ○ `src/app/api/character/route.ts` + 컷에 시트 첨부 | – |
| 한글 말풍선(자동 배치·편집) | ○ `src/app/api/balloon/route.ts`, `src/lib/comic/balloon.ts`·`draw.ts` | – |
| 캔버스 한글 글꼴 합성 | ○ `src/lib/comic/draw.ts` | ○ `src/lib/studio/render.ts`, `src/components/QuoteCanvas.tsx`, 가독성 `readability.ts` |
| 무료 사진 배경(Pixabay·Pexels) | × (IMPROVEMENTS 미완료 항목) | ○ `src/app/api/photos/route.ts`, `src/lib/studio/photoSearch.ts`(공용 `free-photo-search` 사본), `photoKeywords.ts` |
| 다른 크기로 받기(AI 재호출 없음) | △ 형식 바꾸기 규격 `src/lib/comic/postPresets.ts` | ○ `src/lib/studio/channels.ts`·`postPresets.ts` |
| 여러 장 ZIP | ○ `src/lib/comic/zip.ts` | ○ `src/lib/studio/zip.ts`(공용 `store-zip` 사본) |
| 인스타 문구 | ○ `src/app/api/insta/route.ts` | △ 글귀를 캡션으로 넘김 |
| 인스타 즉시·예약 게시 | ○ `src/app/api/instagram/publish/route.ts`·`scheduler/route.ts`·`dispatch/route.ts`·`dispatch-member/route.ts` | △ INSTA 포스팅 자동화로 넘김(1:1만) `src/components/QuoteCanvas.tsx` |
| 다음 화(연재) | ○ (보고서 기준) | – |

### 2-5. 저장·정리·안전

| 기능 | 스튜디오 | 바나나 | 분석기 | 변환 | 인물 | 패션 | 4컷 | 글귀 |
|---|---|---|---|---|---|---|---|---|
| 서버 저장 | ○ `lib/imageStorage.ts` | ○ `src/lib/files.ts` | ○ `src/lib/dna/records.ts` | × | △ 선택형 `src/lib/saved.ts` | × | △ 선택형 `src/lib/saved.ts` | × |
| 비공개 버킷 + 서명 주소 | ○ | ○ | ○ | – | ○ | – | ○ (게시용은 공개 `insta-post-images`) | – (넘김은 공개 `insta-post-images`) |
| 브라우저 저장 | × | × | × | × (언어만) | ○ IndexedDB `src/lib/portrait/history.ts` | ○ IndexedDB `src/lib/look/storage.ts` | ○ IndexedDB `src/lib/comic/gallery.ts` | △ localStorage 초안 |
| 생성일 30일 매일 정리(cron) | ○ `app/api/cron/cleanup/route.ts` | ○ `src/app/api/cron/cleanup/route.ts` | ○ 같은 경로 | – | ○ 같은 경로 | – | ○ 같은 경로 | × (서버 결과 없음, 넘긴 파일은 IM-U1) |
| 브라우저 자료 30일 기한 | – | – | – | – | 미확인 | ○ `src/lib/look/retention.ts` | ○ (보고서 W5) | 미확인 |
| 보관 기간 최대 30일(7·30) | – | – | – | – | ○ `src/lib/retention.ts` | – | ○ `src/lib/comic/savedIndex.ts` | – |
| 정리 회원별 기록(`cleanup-usage-log`) | ○ v1.30 배포 | △ 코드 있음, 문서상 미배포(IM-U2) | ○ v1.37 배포 | – | △ 코드 있음, 문서상 미배포(IM-U2) | – | △ 코드 있음, 문서상 미배포(IM-U2) | – |
| 시간 초과 자동 재시도 안 함 | ○ 공용 기준 `lib/providers/geminiImage.ts` | ○ `retries: 0` `src/lib/gemini.ts` | ○ (공용 사본, 서버 오류만 1회) | – | ○ `retries: 0` | ○ `retries: 0` | ○ `retries: 0` | ○ (공용 사본, 서버 오류만 1회) |
| 서버 오류·혼잡 자동 재시도 끔 | × 기본 1회 `lib/providers/adapters/gemini.ts` | ○ | × 기본 1회 `src/lib/ai/image.ts` | – | ○ | ○ | ○ | × 기본 1회 `src/lib/studio/services.ts` |
| 키 원문을 브라우저 저장소에 두지 않음 | ○ | ○ | ○ | – | ○ | ○ | ○ | ○ |

(마지막 줄 근거: 2026-10-24 `localStorage`·`sessionStorage` 저장 코드 중 키·토큰 관련 검색 — 걸린 2건은 배경색·모델 선택값이라 해당 없음. 키 등록 API(`*/src/app/api/keys/route.ts`)의 응답 줄 검색에서 키 원문을 돌려주는 줄은 찾지 못함. 화면 전체 흐름은 미확인.)

### 2-6. 프로그램 사이 연결

| 보내는 쪽 → 받는 쪽 | 방식 | 근거 |
|---|---|---|
| 분석기·글귀·리버스 프롬프트 → 바나나 「이미지 생성」 | 아이디어 글자(600자) `&src=` | 공용 `banana-idea-link` 기준 `style-dna-analyzer/src/lib/dna/bananaIdeaLink.ts`, 받는 쪽 `banana-canvas/src/lib/bnc/bananaIdeaLink.ts` |
| 분석기·글귀 → 스튜디오 | `?prompt=` 프롬프트 글자 | `style-dna-analyzer/src/lib/dna/studioLink.ts` |
| 스튜디오 → 바나나 | 결과 보내기 | `ai-image-studio/lib/bananaLink.ts` |
| 스튜디오·바나나·인물·4컷 → 변환 | 서명 주소 `?src=`(허용 버킷 4개) | `image-convert-studio/src/lib/importSource.ts`, `ai-image-studio/lib/convertLink.ts` |
| 변환 → 바나나·인물·4컷·스튜디오 「다시 저장」 | 공용 `resave-receiver` | 기준 `four-cut-comics/src/lib/resaveReceiver.ts`, 받기 `*/api/import-result/route.ts`, 보내기 `image-convert-studio/src/lib/resave.ts` |
| 인물 → 패션·바나나 | `?src=` / `api/import` | `fashion-style/src/lib/look/importSource.ts`, `banana-canvas/src/app/api/import/route.ts` |
| 바나나·인물·4컷 → 스토리보드(디자인 카테고리) | 참고 이미지 | `portrait-photo/src/lib/linkHandoff.ts`, `four-cut-comics/src/lib/linkHandoff.ts` |
| 글귀 → INSTA 포스팅 | 공개 버킷 본인 폴더 업로드 → 새 글 화면 | `emotion-writer/src/components/QuoteCanvas.tsx` |
| 처음 받기·처음 넘김 1회 기록 | 공용 `link-mark` | 기준 `banana-canvas/src/lib/bnc/linkMark.ts` |

## 3. 병합된 원본의 옛 기능과 이관 결과

| 원본 | 옛 기능 | 이관된 곳(바나나 캔버스) | 옮기지 않은 것 |
|---|---|---|---|
| 포토 리메이크 | 옛 사진 복원·컬러화, 최대 8192px 확대, 비교 슬라이더, 사물 최대 5장 합성 지시 | `restore`·`synthesis`·`compare.ts` (v1.12) | 브라우저 보관함 자동 이전(다른 주소라 불가 — 옛 앱에서 내려받기만) |
| 올인원 그래픽 | 19개 직군 123종 템플릿, 기획서 자동 입력, 비율 확장, 1K·2K·4K | `graphic`·`expand`·`graphicTemplates.ts`·`api/graphic-fill` (v1.13) | 중복 인페인팅 화면(바나나 하나로) |

## 4. 기준 코드 위치 (재사용할 것)

| 기능 | 기준 파일 | 사본·메모 |
|---|---|---|
| Gemini 이미지 호출·대기·받기 | `ai-image-studio/lib/providers/geminiImage.ts` (공용 `gemini-image-client`) | 각 폴더 `geminiImage.ts` — 직접 고치지 않음 |
| 나노바나나 모델·화질 | `ai-image-studio/lib/providers/nanoBananaModels.ts` (공용 `gemini-image-models`) | 각 폴더 `nanoBananaModels.ts` |
| 여러 엔진 어댑터 | `ai-image-studio/lib/providers/adapters/openai.ts`·`replicate.ts`·`gemini.ts`, 등록 `lib/providers/index.ts` | 다른 프로그램이 새 엔진을 쓰면 여기를 참고(복사 시 공용 등록 검토) |
| 30일 정리 기록 | `four-cut-comics/src/lib/cleanupUsageLog.ts` (공용 `cleanup-usage-log`) | 바나나·인물·분석기·스튜디오 사본 |
| 30일 정리 예약 작업 틀 | `banana-canvas/src/app/api/cron/cleanup/route.ts`(표 + 버킷, `CRON_SECRET`) | 회원 폴더형은 `four-cut-comics/src/app/api/cron/cleanup/route.ts` |
| 동시 요청 선점(이중 과금 방지) | `banana-canvas/src/app/api/run/recut/route.ts` | 서버에 저장된 한 기록을 여러 요청이 고칠 때만 필요(보고서 §9-5) |
| 브러시 마스크 편집기 | `banana-canvas/src/components/studio/MaskEditor.tsx` | ClearPic C-3에서 확장 예정 |
| 비교 슬라이더 | `banana-canvas/src/lib/bnc/compare.ts`, `style-dna-analyzer/src/components/dna/CompareSlider.tsx`, `image-convert-studio/src/components/tool/BeforeAfter.tsx` | 공용 등록 없음(세 곳 따로) |
| 게시처 규격 6종 | `image-convert-studio/src/lib/imageTools/postPresets.ts` (공용 `post-presets`) | 글귀·4컷 사본 |
| ZIP(외부 라이브러리 없음) | `portrait-photo/src/lib/portrait/zip.ts` (공용 `store-zip`) | 글귀·상세페이지·GIF 사본 |
| 올린 사진 깨짐 검사 | `portrait-photo/src/lib/imageFileCheck.ts` (공용 `image-file-check`) | 변환·바나나·리메이크 등 사본 |
| 무료 사진 검색 | `insta_auto_poster/src/lib/cardnews/photoSearch.ts` (공용 `free-photo-search`) | `emotion-writer/src/lib/studio/photoSearch.ts` |
| 받는 쪽 허용 버킷 검사 | `image-convert-studio/src/lib/importSource.ts` | 보고서 L1: 공용화 후보(급하지 않음) |
| 브라우저 얼굴 인식(AI 비용 없음) | `portrait-photo/src/lib/portrait/faceLocal.ts` | — |
| 웹 이미지 안전 가져오기 | `fashion-style/src/lib/fetchImage.ts`, `src/lib/look/ssrf.ts` | — |
| 캐릭터 시트 참고 이미지 줄이기 | `four-cut-comics`의 `shrinkForUpload`(보고서 §9-5 작은 레퍼런스 후보) | 위치 미확인(파일 이름 검색 안 함) |

## 5. 프로그램을 독립으로 두는 이유 (요약)

보고서 §8-2·§9-2 판단 그대로다: 이미지 카테고리 안에서는 더 합칠 프로그램이 없고(9개 → 스토리보드가 디자인으로 옮겨 현재 8개), 대신 버그·규칙 수정(W) → 연결(L) → 기능 추가(F) 순서로 진행했다. 카테고리 간 후보 C1(4컷 ↔ 웹툰)·C2(감성 글귀 ↔ INSTA 카드뉴스)도 2026-10-22 주인님 결정으로 독립 유지.

## 6. 확장 로드맵 (계획 — 사실 아님)

| 항목 | 대상 | 상태 | 근거 |
|---|---|---|---|
| 무료 지우기 C-0~C-5(LaMa·PP-OCRv4, 일괄·ZIP) | 바나나 v1.34 예정 | ⏳ 주인님 범위·비용 승인 대기 | `banana-canvas/docs/IMPROVEMENT_HANDOFF_20261024_CLEARPIC.md` §6 |
| 무료 지우기 공용 엔진 → 상세페이지·썸네일·카드뉴스 사본 | 다른 카테고리 | C-1 뒤, 그 담당과 협의 | EXT-IMG-01 C4, 분석표 §2 A·I 묶음 |
| 4컷 컷 배경 무료 사진 검색 | 4컷 | 대기 | `four-cut-comics/docs/IMPROVEMENTS.md` |
| 분석기 → 스튜디오 자리 표시 처리 | 분석기 | 대기 | `style-dna-analyzer/docs/IMPROVEMENTS.md` |

**미배포 대기**(코드는 있으나 문서상 배포 전 — 칸을 아직 ○로 바꾸지 않음): 바나나·인물·4컷 정리 기록(`8ad8ea2e5`·`f53021369`·`4cafe5eb3`), 감성 글귀 사용 매뉴얼 사진 출처 문구(`1965b2c6c`). 근거: [미배포 목록](PENDING_DEPLOYS.md).

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 8개 + 병합 2개, 기능 표 6묶음(생성·편집변환·인물·글귀만화·저장정리·연결), 기준 코드 16줄 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
