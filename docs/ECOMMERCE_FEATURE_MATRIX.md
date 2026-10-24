# 이커머스 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션(ecommerce-image) 확인 전.** 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **이커머스 프로그램(상세페이지·상품 분석·소싱)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「이커머스」 줄의 `shop-detail-page`·`trending-product-finder`와 병합됨 `detail-page-12p`·`auto-detail-page`.
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 버전 파일) 상세페이지 v1.30 · 상품소싱 v1.24 · 12단 v1.11 · 자동생성기 v1.21.
> - 근거: 네 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`, [이커머스 통합 분석 보고서](analysis-ecommerce-consolidation-20261021/REPORT.md) §1·§6·§8, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드. **운영 DB는 이번에 조회하지 않았다**(권한 회원 수·공개 여부·배지는 보고서·커밋 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다.
> - 관계 문서: [이커머스 자동화 완성 기준](ECOMMERCE_COMPLETION_POLICY.md) · [이커머스 통합 작업표](ECOMMERCE_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 「팔 상품을 어떻게 보여줄지」(상세페이지 제작)는 `shop-detail-page`, 「무엇을 팔지」(데이터 분석·소싱·알림)는 `trending-product-finder`. 병합된 원본 두 곳에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/ECOMMERCE_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/ECOMMERCE_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전 · 배지) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 상세 | AI 상세페이지 자동화 (`shop-detail-page` v1.30 · BEST) | 상세페이지 제작 **기준**(병합 기준 앱) | 사진·사양서·상품명 → Gemini 분석 → 규격(15·12단·9단) 섹션 이미지 → 섹션 수정(재생성·문구·순서·GIF) → 긴 PNG·섹션 ZIP·HTML → 쓰레드·인스타 넘기기 | 비공개 버킷 + 서명 주소·30일 정리 / Gemini 3.5 Flash 분석 + 나노바나나 2.1·3 Pro(공용 사본) / 회원 본인 Gemini 키 | 유일한 실제 회원 데이터, 서버 저장, 섹션 단위 수정·버전, 규격 3종, 이미지형·HTML형 둘 다, SNS·GIF·소싱 연계 | Next 14.2.35, 이미지 속 문구 고치기는 단색 배경용(복잡한 배경은 티 남), 마켓 직접 등록 없음, 다국어·로고 합성(n8n Phase 3·4) 보류 | 독립(기준) |
| 소싱 | 상품소싱 자동화 (`trending-product-finder` v1.24 · BEST) | 상품 발굴·소싱 **기준** | 관심 키워드 등록 → 쇼핑인사이트·검색광고·YouTube·11번가 신호로 기회 점수 → AI 추천 사유 → 알리·도매매·11번가 원가로 마진 계산 → 정기 리포트·예약 소싱 알림·가격 알림 → 「📄 상세페이지」 넘기기 | 서버 다수 표·30일 정리 / gpt-4o-mini 또는 gemini-3.5-flash / 회원 본인 키 다수 | 실측 데이터 근거, 알림 채널 4종, 회원 cron-job.org 방식, 일괄 마진 CSV, 수수료 참고표 | 필요한 키가 많음(온보딩 무거움), 쿠팡파트너스 경쟁도는 승인 대기, 마켓 등록(커머스 API·Wing) 없음 | 독립 |
| 12단 | AI 12단 상세페이지 자동화 (`detail-page-12p` v1.11) | 병합 원본 | **현재 이동 안내만** — 생성 API 3개 모두 410(`src/app/api/*/route.ts`) | (옛) 브라우저 `localStorage` / (옛) Gemini | (옛) 상품명만으로 사양 채우기·장면 카피·860px 통이미지 → 상세로 이관(장면 카피 제외) | 원본 엔진 파일(`src/lib/detailEngine.ts`)은 남았지만 API가 막혀 쓰이지 않음 | 병합됨 → 상세(2026-10-21) |
| 생성기 | 상세페이지 자동생성기 v1 (`auto-detail-page` v1.21) | 병합 원본 | **현재 이동 안내만** — 생성·이미지·내보내기·페이지 API 4개 모두 410(`app/api/*/route.ts`) | (옛) DB `detail_pages`(0건) / (옛) Claude + 이미지 3사 | (옛) HTML 상세페이지 템플릿 3종 → 상세로 이관(Gemini로 통일) | OpenAI 이미지 공급자 선택은 이관 보류(F2) | 병합됨 → 상세(2026-10-21) |

공통: 두 운영 앱 모두 로그인 + 공통 권한 판정(`lib/access.ts`), 회원 본인 키(`user_api_keys`), 회원별 저장, 30일 자동 정리(`app/api/cron/cleanup-generated/route.ts`)를 갖췄다. 사용 기록이 거의 없어(보고서 §8-1: 상세 1건·소싱 6건) 사용량으로는 판단하지 않는다.

참고: `video-to-gif`(상세페이지 GIF 자동화)는 카테고리 지도에서 「영상」 줄로 옮겨져 이 표에서 뺐다. 상세와의 연결(GIF 받기)만 §2-5에 적는다.

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드를 확인하지 못한 칸. 12단·생성기 칸은 **지금 회원이 쓸 수 있는지**를 적는다(옛 기능은 §3).

### 2-1. 상품 정보 입력·분석

| 기능 | 상세 | 소싱 | 12단 | 생성기 |
|---|---|---|---|---|
| 상품 사진 업로드 → AI 분석으로 입력칸 채우기 | ○ `lib/actions/products.ts` `analyzeProductAction` | × | × (410) | × (410) |
| 상품명만으로 입력칸 채우기(이미지 생성은 안 함) | ○ v1.23 `analyzeByNameAction` | × | × (410) | × |
| 사양서 PDF 분석(Gemini 문서 입력) | ○ v1.16 `lib/actions/products.ts`(`application/pdf`) | × | × | × |
| 사양서 TXT·MD 붙이기 | ○ v1.16 `components/products/ProductAnalyzeForm.tsx` | × | × | × |
| AI 추정값 「확인 필요」 표시 | ○ v1.16·v1.23 `ProductAnalyzeForm.tsx`, `lib/ai/productAnalysisPrompt.ts` | △ 추천 사유만 AI 문장 | × | × |
| 당해 연도 기준 프롬프트(`getFullYear` 주입) | ○ `lib/ai/productAnalysisPrompt.ts`, `lib/ai/htmlDetailPrompt.ts` | × `lib/ai/`에 연도 주입 없음(추천 사유 프롬프트 — 필요성 확인 필요) | × | × |
| 소싱 결과에서 상품명·원본 정보·정상가 받아오기 | ○ v1.19 `/products/new?from=sourcing` | ○ 보내는 쪽 `lib/shopDetailLink.ts` | × | × |
| 옛 12단 JSON 백업 가져오기 | ○ v1.16 `components/products/LegacyImportForm.tsx`, `importLegacyProductAction` | × | △ 백업 내려받기 안내(`MovedNotice.tsx`) | × |

### 2-2. 상세페이지 이미지 생성·수정

| 기능 | 상세 | 소싱 | 12단 | 생성기 |
|---|---|---|---|---|
| 규격 선택(15섹션·쿠팡 12단·스마트스토어 9단) | ○ v1.16 `lib/layoutPresets.ts` | × | × | × |
| 섹션 구성이 DB 템플릿 행(`shop_prompt_templates`) | ○ `lib/ai/promptTemplates.ts`, 마이그레이션 `20261021_layout_presets_v1_16.sql` | × | × | × |
| 남은 섹션만 생성·전체 다시 생성 두 번 확인 | ○ v1.29 `lib/generatePlan.ts` | × | × | × |
| 섹션 하나만 생성·재생성 | ○ v1.18 `components/products/SectionImageGrid.tsx` | × | × | × |
| 섹션별 이미지 버전 목록·선택(원자적 추가) | ○ v1.19 DB 함수 `shop_append_section_image`, `lib/actions/images.ts` | × | × | × |
| 직접 만든 이미지 올리기 | ○ `SectionImageGrid.tsx` `saveCustomFile` | × | × | × |
| 섹션 순서 바꾸기(↑↓·기본 순서로) | ○ v1.24 `lib/sectionOrder.ts`, `saveSectionSequenceAction` | × | × | × |
| 이미지 위 문구 고치기(덮는 색·💧 찍기·되돌리기) | ○ v1.25~v1.27 `components/products/ImageTextEditor.tsx`, `lib/dominantColor.ts` | × | × | × |
| 섹션에 GIF 넣기 | ○ v1.28 `/products/gif-inbox`, `components/products/GifInbox.tsx`, `lib/gifHandoff.ts` | × | × | × |
| 참고 이미지·생성 메모·라벨 | ○ 마이그레이션 `0004`·`0005`·`0006` | × | × | × |
| 할인가 없으면 가격·혜택 문구 금지 | ○ v1.18 `lib/actions/images.ts` `NO_PRICE_PROMOTION_GUIDE` | × | × | × |
| 인물 기본 한국인 묘사 | ○ `lib/actions/images.ts` `KOREAN_DEFAULT_PEOPLE_GUIDE` + 12단·9단 템플릿 지시 | – (이미지 없음) | × | × |
| 비용 안내(장당 단가·남은 장수 합계) | ○ v1.29 `ProductAnalyzeForm.tsx`, `lib/ai/imageModels.ts` | △ 리포트 1회당 키워드 수만큼 호출 안내(AGENTS) | × | × |
| 이미지 모델 공용 기준 사본 | ○ `lib/ai/geminiImage.ts`·`lib/ai/nanoBananaModels.ts`(기준 `ai-image-studio`) | – | △ 사본 파일 남음(410으로 미사용) | × |
| 이미지 시간 초과 자동 재시도 안 함 | ○ v1.13 `retries: 0`(`lib/ai/gemini.ts`) | – | × | × |
| 다국어 상세페이지(n8n Phase 3) | × 보류 | × | × | × |
| 로고 합성·자유 생성(n8n Phase 4) | × 보류 | × | × | × |
| 사진 없이 상품 이미지 생성 | × (정책상 하지 않음) | × | × | × |

### 2-3. 내보내기·미리보기

| 기능 | 상세 | 소싱 | 12단 | 생성기 |
|---|---|---|---|---|
| 세로 긴 PNG(서명 주소 내려받기, 4.5MB 한도 회피) | ○ v1.21 `app/api/products/[id]/export/route.ts`, `lib/exportDownload.ts` | × | × | × |
| 섹션별 860px ZIP(GIF는 원본 그대로) | ○ v1.21·v1.28 `app/api/products/[id]/export-zip/route.ts`, `lib/zip.ts`(공용 `store-zip` 사본) | × | × | × |
| HTML 상세페이지(쿠팡·스마트스토어·프리미엄) | ○ v1.17 `app/api/products/[id]/export-html/route.ts`, `components/products/HtmlExportPanel.tsx` | × | × | × (410) |
| HTML 스크립트·이벤트 속성 제거 | ○ `lib/ai/htmlDetailPrompt.ts` `sanitizeGeneratedHtml` | × | × | × |
| 한글 내려받기 파일 이름 | ○ v1.22 `lib/exportDownload.ts` | ○ CSV(Phase 11, 파일 확인은 미확인) | × | × |
| 모바일 미리보기(휴대폰 틀) | ○ v1.16 `SectionImageGrid.tsx` | × | × | × |
| 서버 렌더링 PNG(Puppeteer) | × (옮기지 않음 — 긴 PNG로 대체) | × | × | × (410) |
| 일괄 마진 CSV 내보내기 | × | ○ `components/sourcing/BatchMarginCalculator.tsx`, `lib/actions/batchMargin.ts` | × | × |

### 2-4. 상품 발굴·시장 데이터

| 기능 | 상세 | 소싱 |
|---|---|---|
| 쇼핑인사이트 관심도 추이(회원 NCP 키) | × | ○ `lib/naver/datalab.ts` |
| 검색광고 연관 키워드·검색수·경쟁 → 후보 상품군 | × | ○ `lib/naver/searchAd.ts`, `lib/actions/candidates.ts`, `components/watchlist/CandidateFinder.tsx` |
| 기회 점수 + AI 추천 사유 | × | ○ `lib/ai/opportunity.ts`, `lib/reportEngine.ts` |
| YouTube 영상 신호 | × | ○ `lib/youtube/youtubeData.ts`(공용 `youtube-data-client` 사본), `lib/youtube/client.ts` |
| 11번가 경쟁 상품 수·가격대 | × | ○ `lib/elevenst/client.ts` |
| 쿠팡파트너스 경쟁도 | × | × (승인 대기, Phase 2) |
| 키워드별 점수 추이·리포트 페이지 | × | ○ v1.09 `lib/reportTrend.ts`, `app/(dashboard)/reports/page.tsx`, `components/ui/Sparkline.tsx` |
| 알리익스프레스 원가 비교 | × | ○ `lib/aliexpress/client.ts`, `components/sourcing/sourcingFetchers.ts` |
| 도매매 원가 비교 | × | ○ `lib/domeggook/client.ts` |
| 키워드 번역(해외 검색용) | × | ○ `lib/ai/translateKeyword.ts` |
| 마진 계산(수수료·관세·운송) | × | ○ `lib/margin.ts` `calcMargin`, `components/sourcing/MarginCalculatorPanel.tsx` |
| 플랫폼·카테고리 수수료 참고표 | × | ○ `app/(dashboard)/fees/page.tsx`(2026년 9월 조사 자료) |
| 프로모션 문구 상품 필터 | × | ○ `lib/promoKeywords.ts` |
| 소싱 후보 저장 | × | ○ `lib/actions/savedProducts.ts`, `components/sourcing/SavedProductsPanel.tsx` |
| 환율 자동 갱신(수출입은행) | × | × (Phase 12 대기) |
| 관세율 참고표 | × | × (Phase 13 대기) |

### 2-5. 알림·예약·연계

| 기능 | 상세 | 소싱 |
|---|---|---|
| 매일 자동 리포트 | × | ○ `app/api/cron/generate-reports/route.ts` |
| 예약 소싱 알림(주기 선택) | × | ○ `lib/sourcingAlert.ts`, `app/api/cron/dispatch-sourcing-alerts/route.ts` |
| 저장 후보 가격·품절 알림 | × | ○ `lib/priceAlert.ts`, `app/api/cron/dispatch-price-alerts/route.ts` |
| 회원 SMTP 메일 | × | ○ `lib/email/transport.ts`, `components/settings/SmtpAccountForm.tsx` |
| 텔레그램 | × | ○ `lib/telegram/client.ts`(공용 `telegram-bot-client` 사본) |
| 문자·카카오 알림톡(회원 SOLAPI) | × | ○ `lib/solapi/client.ts`(공용 `solapi-client` 사본), `components/settings/KakaoTemplateSection.tsx` |
| 회원 cron-job.org 실행 방식 | × | ○ `lib/schedulerMember/`, `app/api/cron/dispatch-member/route.ts`, `components/settings/SchedulerModePicker.tsx` |
| 쓰레드 홍보글로 넘기기(이미지 위치·초안) | ○ v1.19 `lib/threadsLink.ts` `threadsPostUrl` | × (Phase 9 보류) |
| 인스타 홍보글로 넘기기 | ○ v1.20 `lib/threadsLink.ts` `instaPostUrl` | × |
| 넘긴 초안의 광고·제휴 표기 | 미확인(보내는 쪽 초안에 없음, 받는 쪽 확인 필요) | – |
| GIF 자동화에서 GIF 받기 | ○ v1.28 `lib/gifHandoff.ts`(공용 `gif-handoff` 기준) | × |
| 상세페이지로 넘기기 | – (받는 쪽) | ○ v1.23 `lib/shopDetailLink.ts` |
| 스마트스토어·쿠팡 상품 직접 등록 | × | × (Phase 16·17 대기) |

### 2-6. 공통·보안

| 기능 | 상세 | 소싱 |
|---|---|---|
| 로그인 + 공통 권한 판정 | ○ `lib/access.ts` | ○ `lib/access.ts` |
| 회원 본인 키만(폴백 없음) | ○ `lib/apiKeys.ts`(gemini 하나) | ○ `lib/apiKeys.ts`, 이름표 `lib/apiKeyLabels.ts`(15종) |
| 키를 주소 대신 머리글로 | ○ v1.15 `lib/ai/gemini.ts` `x-goog-api-key` | △ Gemini 호출은 머리글(`lib/ai/opportunity.ts`·`translateKeyword.ts`), 외부 데이터 API는 미확인 |
| 회원 이미지 비공개 버킷·서명 주소 | ○ v1.15 `app/api/image/route.ts`, `lib/imageSrc.ts`, `lib/storageImage.ts` | – (이미지 없음) |
| 우리 버킷 밖 주소를 서버가 받아오지 않음 | ○ v1.15 `lib/storageImage.ts` | – |
| 30일 자동 정리 | ○ `app/api/cron/cleanup-generated/route.ts`, `lib/retention.ts`(유예 2026-11-21) | ○ `app/api/cron/cleanup-generated/route.ts`, `lib/retention.ts` |
| 정리 건수 회원별 기록 | △ 코드 반영 `34094c954`·**미배포(v1.31 대기)** `lib/cleanupUsageLog.ts` | ○ v1.24 배포 `lib/cleanupUsageLog.ts` |
| DB 조회 장애와 「자료 없음」 구분 | 미확인 | ○ v1.11 `lib/loadErrors.ts`, `components/ui/LoadErrorNotice.tsx` |
| 휴대폰 폭 메뉴·하단 버튼 | ○ v1.30 `components/layout/Sidebar.tsx`, `SectionImageGrid.tsx` | ○ v1.08 `components/layout/Sidebar.tsx` |
| 사용 안내(/guide) | ○ `components/guide/CommerceUsageGuide.tsx` | ○ `app/(dashboard)/guide/page.tsx` |
| Next.js 버전 | 14.2.35 | 15.5.x(v1.24 보안 업데이트) |

## 3. 병합 원본 기능 이관 대조 (출처)

| 원본 기능 | 출처 | 상세로 이관 | 상태 |
|---|---|---|---|
| 쿠팡 12단·스마트스토어 9단 규격 | 12단 | ○ v1.16 템플릿 21행 | ✅ |
| 상품명만으로 사양·특징·타겟 채우기 | 12단 `detailEngine.ts` `autoSearchProductInfo` | ○ v1.23(입력칸만, 할인율·긴급 문구 제외) | ✅ |
| 사양서 분석 | 12단(PDF를 글로 읽어 사실상 안 됨) | ○ v1.16 PDF를 문서로 분석 | ✅(보강) |
| 모바일 미리보기 | 12단 | ○ v1.16 | ✅ |
| 860px 통이미지 | 12단(브라우저 Canvas) | ○ 긴 PNG·860px ZIP | ✅ |
| 장면별 카피 기획 | 12단 `generateDetailPageScenes` | × | 보류(섹션 생성 메모와 겹침, 효과 확인 뒤) |
| HTML 상세페이지 템플릿 3종 | 생성기 | ○ v1.17(Gemini, 지어낸 후기·스크립트 제거) | ✅ |
| 이미지 공급자 선택(OpenAI·Replicate) | 생성기 | × | 보류(F2, 회원 요청 없음) |
| 서버 렌더링 PNG(Puppeteer) | 생성기 | × | 하지 않음(긴 PNG로 대체) |
| 결과 목록·다시 찾기 | 생성기(없었음) | ○ 상품 목록 | ✅ |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| 회원 이미지 비공개 보기(서명 주소 302) | `shop-detail-page/app/api/image/route.ts`, `lib/imageSrc.ts` | 본인 폴더 확인 후 1시간 서명 주소 |
| 서버에서 회원 이미지 읽기 | `shop-detail-page/lib/storageImage.ts` `downloadImageAsBase64` | 우리 버킷 밖 주소 거부 |
| 큰 결과 파일 내려받기(4.5MB 회피·한글 이름) | `shop-detail-page/lib/exportDownload.ts` `redirectToDownload` | storage-js 이중 인코딩 주의(`docs/ERROR_LESSONS.md` 2026-10-22) |
| 상세페이지 규격 정의 | `shop-detail-page/lib/layoutPresets.ts` | 새 규격은 템플릿 행 + 이 파일 |
| 섹션 순서 적용 | `shop-detail-page/lib/sectionOrder.ts` `applySectionSequence` | |
| 생성 범위·완료 상태 판단 | `shop-detail-page/lib/generatePlan.ts` | |
| 섹션 이력 원자적 추가 | DB 함수 `shop_append_section_image`(`supabase/migrations/20261022_append_section_image_v1_19.sql`) | security invoker |
| 이미지 위 문구 고치기 | `shop-detail-page/components/products/ImageTextEditor.tsx`, `lib/dominantColor.ts` | 브라우저만, AI 0 |
| 근거 없는 가격·혜택 차단, 한국인 묘사 | `shop-detail-page/lib/actions/images.ts` | 프롬프트 내용은 공유하지 않음 |
| HTML 상세페이지 작성·정리 | `shop-detail-page/lib/ai/htmlDetailPrompt.ts` | |
| 상품명 기반 분석 프롬프트 | `shop-detail-page/lib/ai/productAnalysisPrompt.ts` | 당해 연도·확인 필요 |
| 30일 정리 + 유예 | `shop-detail-page/app/api/cron/cleanup-generated/route.ts`, `lib/retention.ts` | 상품소싱 같은 이름 파일과 비교해 쓸 것 |
| GIF 주고받기 약속 | `shop-detail-page/lib/gifHandoff.ts` | 공용 `gif-handoff` **기준**, 사본 `video-to-gif/lib/gifHandoff.ts` |
| ZIP 만들기 | `shop-detail-page/lib/zip.ts` | 공용 `store-zip` **사본**(기준 `portrait-photo/src/lib/portrait/zip.ts`) — 직접 고치지 않음 |
| 이미지 생성 호출·모델 목록 | `shop-detail-page/lib/ai/geminiImage.ts`, `lib/ai/nanoBananaModels.ts` | 공용 사본(기준 `ai-image-studio/lib/providers/`) |
| 다른 프로그램으로 초안 넘기기 | `shop-detail-page/lib/threadsLink.ts` | 이미지 위치만 넘기고 받는 쪽이 본인 폴더 확인 |
| 소싱 → 상세 넘기기 | `trending-product-finder/lib/shopDetailLink.ts` | 가격은 정상가 칸만 |
| 마진 계산 | `trending-product-finder/lib/margin.ts` `calcMargin` | |
| 기회 점수·AI 사유 | `trending-product-finder/lib/ai/opportunity.ts`, `lib/reportEngine.ts` | |
| 회원 예약 실행 방식 | `trending-product-finder/lib/schedulerMember/` | 공용 `member-scheduler` 사본 |
| 알림 발송 | `trending-product-finder/lib/telegram/client.ts`, `lib/solapi/client.ts`, `lib/email/transport.ts` | 텔레그램·SOLAPI는 공용 사본 |
| DB 장애와 빈 자료 구분 | `trending-product-finder/lib/loadErrors.ts` | |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 합칠 프로그램 → 기준 | 가져온 기능 | 상태 |
|---|---|---|---|
| E0 기준 앱 안전 보강 | — (상세 자체) | 비공개 버킷·서명 주소·30일 정리·키 머리글·고아 파일 정리 | ✅ v1.15 (`0eba4e0f3`) |
| E1 이미지형 | 12단 → 상세 | 규격 3종·PDF 분석·모바일 미리보기·12단 자료 가져오기 | ✅ v1.16 (`6961fc0ac`) |
| E2 HTML형 | 생성기 → 상세 | HTML 내보내기 3종 | ✅ v1.17 (`b0d03c110`, 이름 변경 `1f4d7ce90`) |
| F1 남은 12단 장점 | 12단 → 상세 | 상품명으로 먼저 채우기 | ✅ v1.23 (`a88c0e186`) |
| F2 OpenAI 이미지 | 생성기 → 상세 | – | 보류 |
| 독립 | 상세·소싱 | 연결(넘기기)만 | – |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다. 원본 두 앱은 비공개·이동 안내로 두고 주소는 지우지 않는다.

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 30일 정리 회원별 기록 배포 | 상세 | `34094c954` | 빌드 1 | 미배포 대기(v1.31) |
| 1차 | 2026-11-21 유예 종료 뒤 첫 정리 확인 | 상세 | `IMPROVEMENT_BACKLOG.md` | 없음 | 대기 |
| 2차 | 넘기는 홍보글 초안에 광고·제휴 표기 확인 | 상세 → 쓰레드·인스타 | 카테고리 지도 「광고 표기」 | 없음 | 후보(확인 필요) |
| 2차 | 기회 점수 임계값 즉시 알림 | 소싱 | Phase 15 | 없음 | 대기 |
| 2차 | 환율 자동 갱신·관세율 참고표 | 소싱 | Phase 12·13 | 무료 공공 API | 대기 |
| 2차 | 장면별 카피를 섹션 생성 메모로 | 상세 | 12단 `generateDetailPageScenes` | 회원 키 1회 | 보류 |
| 3차 | 다국어 상세페이지·로고 합성 | 상세 | n8n Phase 3·4 | 이미지 생성 | 보류(회원 요청 시) |
| 3차 | 스마트스토어·쿠팡 상품 등록 | 소싱 → 상세 | Phase 16·17 | 회원 판매자 계정 | 대기(신중 검토) |
| 3차 | 공장 견적 비교 메뉴 | 소싱 | 기획 `sourcing/` | – | 주인님 지시 전 |
| 3차 | 판매 후 운영 분석(ROAS·재고) | 새 독립 프로그램 | 기획 `coupang/` | – | 주인님 지시 전 |
| 보류 | OpenAI 이미지 공급자 | 상세 | 생성기 F2 | – | 회원 요청 시 |
| 보류 | Next 15 이상 올리기 | 상세 | Next 14.2.35 | 빌드 | 담당 판단 |

### 미배포 대기 (이커머스)

| 프로그램 | 내용 | 나갈 때 |
|---|---|---|
| 상세 | 30일 정리 회원별 `usage_logs` 기록 `34094c954` | v1.31 |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 상세 v1.30·소싱 v1.24·12단 v1.11·생성기 v1.21 코드 기준, 병합 E0~E2·F1 반영 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
