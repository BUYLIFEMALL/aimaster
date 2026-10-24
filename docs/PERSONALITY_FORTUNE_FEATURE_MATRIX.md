# 성격·운세 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 이 카테고리는 담당 역할이 없다. 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **성격 검사·심리 자기점검·운세 프로그램을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「성격·운세」 줄의 `personality-suite`·`personality-code`(폴더 `mbti/`)·`mbti-character`·`tarot-reading`(폴더 `tarot/`).
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 버전 파일) 종합 진단 v1.28 · 성격코드 v1.21 · 캐릭코드 v1.24 · 타로점 v1.27.
> - 근거: 네 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [2026-10-20 성격·타로 세션 인수인계](HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md), [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-TL-08. **운영 DB는 이번에 조회하지 않았다**(프로그램 이름·배지·공개 여부는 마이그레이션·문서 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다.
> - 관계 문서: [성격·운세 자동화 완성 기준](PERSONALITY_FORTUNE_COMPLETION_POLICY.md) · [성격·운세 통합 작업표](PERSONALITY_FORTUNE_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 「여러 검사를 모아 깊게 보는 것·마음 상태 점검」은 `personality-suite`, 「빠른 성격유형 결과 공유」는 `personality-code`, 「유형을 오리지널 캐릭터 그림으로」는 `mbti-character`, 「카드 뽑기·운세」는 `tarot-reading`. 네 프로그램은 「이어서 보기」로 연결돼 있고 합치지 않았다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/PERSONALITY_FORTUNE_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/PERSONALITY_FORTUNE_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 폴더 · 버전 · 배지) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 종합 | AI 종합 성격 진단 자동화 (`personality-suite` · `personality-suite/` · v1.28 · new·free — 마이그레이션 기록) | 여러 검사·마음 상태 점검·종합 프로필 **기준** | 검사 고르기(16종) → 한 문항씩(이어하기) → 서버 재채점·기본 해석 → (선택) AI 심층 분석 → 종합 프로필(비중) → 지난 결과 비교·추이 → PNG·PDF → 이어서 보기 | `personality_suite_results`·`_profiles`(RLS 본인만, **회원당 100개만, 30일 정리 없음**) / Gemini 3.5 Flash → 2.5 Flash / 회원 본인 Gemini 키(AI만) | 16종 검사, 민감 검사 안전 설계(기본 미저장·위기 안내·AI 제외), 상표명 금지 단위 시험, 당해 연도 주입, 구조화 JSON(HTML 주입 없음) | 30일 자동 삭제 없음, 결과 막대 등 화면은 Tailwind 없이 일반 CSS(새 화면 주의) | 독립(기준) |
| 코드 | 성격코드 측정기 (`personality-code` · `mbti/` · v1.21 · free) | 빠른 16유형 검사·공유 | 20문항/60문항 → 브라우저 채점 → 결과 주소 `/result/<유형>?지표` → OG 카드·카카오 공유 → 캐릭코드·타로점으로 | 서버 저장 없음 / AI 없음 / 키 없음 | 키 없이 바로, 결과 저장 없음(개인정보 부담 적음), 공유 카드 | 이름·로그인 제목에 「(MBTI)」, 네 프로그램 중 유일하게 밝은 테마(2026-10-20 인수인계 기준), 검사 1종 | 독립 |
| 캐릭 | 캐릭코드 측정기 (`mbti-character` · `mbti-character/` · v1.24 · free) | 유형 → 오리지널 캐릭터 그림 | 20문항 → 16유형 → 오리지널 캐릭터 → (검사 직후 자동 1회 / 그 외 버튼) Gemini 그림 → 공유 → 타로점으로 | 그림을 회원 폴더 **공개 버킷** `mbti-character-images`(30일 정리 없음) / 나노바나나(공용 사본) / 회원 본인 Gemini 키 | 오리지널 캐릭터 16종, 자동 생성 과금 안전장치(`fresh=1`), 신뢰 주소 검사 | 이름·제목·OG에 「(MBTI)」, 생성 그림 공개·무기한, 검사 1종 | 독립 |
| 타로 | AIMaster 타로점 (`tarot-reading` · `tarot/` · v1.27 · 배지 미확인) | 카드 뽑기·운세 해석 | 질문 → 스프레드(12종) → 카드 뽑기 → 카드마다 그림(화풍 선택, Gemini) → 종합 해석(OpenAI) → **보관함 자동 저장** → 공유 링크 `?rid=` | `tarot_readings`(RLS 본인만, 자동 저장, **30일 정리 없음**) + **공개 버킷** `tarot-card-images` / OpenAI(메뉴 7개 허용 목록) + Gemini 그림 / 회원 본인 키 2종 | 스프레드 12종, 매번 새 일러스트, 모델 허용 목록·옛 이름 변환, 다른 프로그램에서 질문 미리 채우기 | 결과 화면이 로그인 대상 밖, 공유 링크로 질문·해석 노출, 당해 연도 주입 없음(한 해 운세 포함), 화면 참고용 안내 미확인 | 독립 |

공통: 네 프로그램 모두 「이어서 보기」 공용 기준 코드 `personality-program-links`를 쓴다(기준 `personality-suite/src/lib/programLinks.ts`, 사본 `mbti/lib/`·`mbti-character/lib/`·`tarot/lib/`). 네 프로그램 모두 회원 가입 유도용 성격이 강하다(FREE 배지 — 운영 DB 미조회).

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드를 확인하지 못한 칸 · – 해당 없음. 경로는 각 프로그램 폴더 기준.

### 2-1. 검사·카드 진행

| 기능 | 종합 | 코드 | 캐릭 | 타로 |
|---|---|---|---|---|
| 검사·스프레드 종류 | ○ 16종 `src/lib/tests/registry.ts` | ○ 2종(20·60문항) `app/test/page.tsx`·`app/test/full/page.tsx` | ○ 1종(20문항) `lib/questions.ts` | ○ 스프레드 12종 `lib/deck.ts` `SPREAD_CONFIGS` |
| 한 문항씩·이전으로·키보드 입력 | ○ `src/components/tests/TestRunner.tsx`(v1.25 빠른 입력 버그 수정) | ○ `components/TestFlow.tsx`·`QuestionCard.tsx` | ○ `components/TestFlow.tsx` | – |
| 서버에서 점수 다시 계산 | ○ `src/lib/tests/scoring.ts` `validateAnswers`·`scoreTest`, `src/app/api/submit/route.ts` | × 브라우저 채점 `lib/scoring.ts` | × 브라우저 채점 `lib/scoring.ts` | – |
| 결과 지표 값 0~100 제한(주소로 받은 값 검증) | – | ○ v1.21 `app/result/[type]/page.tsx` | ○ v1.21 `app/result/[type]/page.tsx` | – |
| 다른 프로그램에서 질문 미리 채우기 | – | – | – | ○ v1.21 `components/DrawFlow.tsx`(`?q=`·`?spread=`·`?from=`) |
| 균형 구간(40~60%) 표시 | ○ v1.23 `ResultView.tsx` `.bar-band` | 미확인 | 미확인 | – |

### 2-2. 해석·AI

| 기능 | 종합 | 코드 | 캐릭 | 타로 |
|---|---|---|---|---|
| AI 없이 기본 해석 | ○ `src/lib/tests/report.ts` `buildReport` | ○ 유형 해설(정적) | ○ 캐릭터 소개(정적) `lib/characters.ts` | × 해석은 AI(카드 의미 참고 글은 `lib/cards.ts`) |
| AI 해석(회원이 누름) | ○ `src/app/api/analyze/route.ts` | × | – | △ 카드를 모두 뒤집으면 키가 있을 때 해석 시작(`components/ResultInteractive.tsx` 효과 훅) |
| 여러 결과 종합 프로필(비중 선택) | ○ v1.04 `src/app/api/profile/route.ts`, `ai.ts` `normalizeWeights` | × | × | × |
| AI 결과 구조화 JSON(HTML 주입 없음) | ○ `src/lib/tests/ai.ts`(스키마·정규화) | – | – | × 글 해석(서식 기호 금지 지시) |
| 당해 연도·오늘 날짜 주입 | ○ `src/lib/tests/ai.ts` `yearGuard` | – (AI 없음) | – (그림만) | × `app/api/generate-reading/route.ts`에 연도·날짜 주입 없음(「올해」 한 해 운세 포함) |
| 결과 텍스트를 데이터로 취급(지시문 주입 방지) | ○ `ai.ts` 지시문 | – | – | 미확인 |
| 해석 모델 허용 목록 | – | – | – | ○ v1.27 `generate-reading/route.ts`, `lib/deck.ts` `OPENAI_MODEL_OPTIONS`·`normalizeOpenAIModel` |
| 모델 폴백 | ○ `src/lib/gemini.ts`(3.5 Flash → 2.5 Flash, JSON 재시도, 끊김 감지) | – | – | × 고른 모델 하나 |

### 2-3. 그림 생성

| 기능 | 종합 | 코드 | 캐릭 | 타로 |
|---|---|---|---|---|
| AI 그림 생성 | × | × | ○ `app/api/generate-character-image/route.ts` | ○ `app/api/generate-card-image/route.ts` |
| 이미지 모델 공용 기준 사본 | – | – | ○ `lib/ai/geminiImage.ts`·`lib/ai/nanoBananaModels.ts`(기준 `ai-image-studio`) | ○ 같은 사본 |
| 시간 초과 자동 재시도 안 함 | – | – | ○ 공용 사본 `geminiImage.ts`(시간 초과는 바로 오류, 서버 오류·혼잡만 1회) | ○ 같은 사본 |
| 회원이 누르지 않은 그림 자동 생성 차단 | – | – | ○ v1.23 `fresh=1`일 때만 자동(`TestFlow.tsx`·`ResultInteractive.tsx`) | ○ 카드 그림은 클릭해야 생성(v1.24 기록) |
| 화풍 선택 | – | – | ○ `lib/imageStyles.ts`(코드 5개), 취향은 브라우저 저장(`StylePreferencePicker.tsx`) | ○ `lib/deck.ts` `CARD_STYLES`(코드 검색 11개 — 비교표 「12종」 확인 필요) |
| 그림 저장 위치 | – | – | △ 회원 폴더(`${user.id}/…`)지만 **공개 버킷**(`supabase/migrations/0004_character_images_storage.sql`, `getPublicUrl`) | △ 회원 폴더지만 **공개 버킷** `tarot-card-images`(`supabase/migrations/0003_card_images_storage.sql`) |
| 공유 주소의 그림이 우리 저장소 것인지 검사 | – | – | ○ `app/result/[type]/page.tsx` `getTrustedImageUrl` | ○ `app/result/page.tsx` `getTrustedImageUrl` |

### 2-4. 저장·정리·공유

| 기능 | 종합 | 코드 | 캐릭 | 타로 |
|---|---|---|---|---|
| 결과 서버 저장 | ○ RLS 본인만 `supabase/migrations/0001_results.sql`, `src/lib/results.ts`(`user_id` 필터) | × | △ 그림 파일만 | ○ 자동 저장 `components/ResultInteractive.tsx` `saveReadingHistory`, RLS 본인만 `0004_create_tarot_readings.sql` |
| 민감 검사 기본 미저장·회원 선택 저장 | ○ `src/app/api/submit/route.ts`(`save:true`), `registry.isSensitive()` | – | – | – |
| 저장 개수 한도 | ○ 회원당 100개 `src/lib/results.ts` `MAX_RESULTS` | – | × | × |
| 30일 자동 삭제(예약) | × (`vercel.json` 예약 없음, 정리 경로 없음) | – (저장 없음) | × 그림 무기한 | × 리딩·그림 무기한 |
| 정리 건수 회원별 기록 | × | – | × | × |
| 기록 목록·삭제 | ○ `/history`, `src/app/api/results/[id]/route.ts` DELETE | – | × | ○ `/history`, `lib/actions/history.ts`(`user_id` 조건) |
| 지난 결과 비교·추이 그래프 | ○ v1.02·v1.03 `report.compareResults`, `src/lib/tests/trends.ts`, `TrendChart.tsx`(민감 검사 제외) | × | × | × |
| 결과 PNG 저장(브라우저에서 생성) | ○ `src/lib/shareImage.ts`(마음 상태 점검 제외) | × | × | × |
| 인쇄·PDF | ○ `window.print` + `@media print` | × | × | × |
| 카카오·OG 공유 카드 | 미확인 | ○ `app/api/og/route.tsx`, `components/ShareButtons.tsx`·`KakaoScript.tsx` | ○ `app/api/og/route.tsx`, `ShareButtons.tsx` | ○ `app/api/og/route.tsx`, `ShareButtons.tsx` |
| 공유 링크가 회원이 공유를 눌렀을 때만 생김 | – | ○ 결과가 주소 자체(저장 없음) | △ 그림 주소가 공개 | × 저장 즉시 `rid` 링크로 열람 가능(`app/result/page.tsx` `loadReadingById` — 서비스 롤, `user_id` 조건 없음) |
| 옛 공유 링크 복원 시 회원 조건 | – | – | – | △ 그림 주소 일치로만 찾음(서비스 롤, 최근 100건, `user_id` 조건 없음 — `app/result/page.tsx` 270행 이하) |

### 2-5. 안전 안내·상표

| 기능 | 종합 | 코드 | 캐릭 | 타로 |
|---|---|---|---|---|
| 「참고용·진단 아님/재미용」 화면 안내 | ○ `src/components/tests/ResultView.tsx` 81행 | ○ `app/layout.tsx` 71행 「재미용 콘텐츠」 | ○ `app/page.tsx` 232행·`layout.tsx` 120행 | 미확인 — `app`·`components`에서 안내 문구 검색 결과 없음(지시문 `generate-reading/route.ts`에만) |
| 위기 상담 고정 안내(109·1577-0199·1388·119) | ○ `content/careTests.ts` `CRISIS_NOTICE`, `ResultView.tsx`·`TestRunner.tsx` | – | – | × |
| 진단·병명 금지 지시·시험 | ○ `ai.ts` `PERSONA`, 단위 시험 | – | – | △ 확정 예언 금지 지시(`generate-reading/route.ts`) |
| 제목·소개에 상표명 금지 + 시험 | ○ `tests/ps.test.mjs` 71행 | × 로그인 제목 「성격코드(MBTI) 측정기」(`app/(auth)/login/page.tsx` 171행) | × 로그인 제목·`<title>`·OG·매뉴얼 제목에 「(MBTI)」(`app/(auth)/login/page.tsx` 171행, `app/layout.tsx` 17·20·115행, `app/guide/page.tsx` 8행) | ○ 상업 덱 그림 미사용(비교표 카드 기록) |
| 무관 면책 문구(®) | – | ○ `app/layout.tsx` 71행, `app/guide/page.tsx` 65~66행 | ○ `app/layout.tsx` 120행, `app/page.tsx` 232행 | – |
| 자체 제작 문항·캐릭터 | ○ `content/type16Tests.ts` 머리 주석 | ○ `lib/questions.ts` 머리 주석 | ○ `lib/characters.ts`(오리지널) | ○ 카드 이름·정역방향만으로 그림 |

### 2-6. 공통·보안

| 기능 | 종합 | 코드 | 캐릭 | 타로 |
|---|---|---|---|---|
| 로그인 필요 화면 | ○ 작업 화면 전체 `src/app/(workspace)/layout.tsx` `requireProgramAccess` | ○ `/test`·`/result`(`middleware.ts` + 각 페이지 `requireProgramAccess`), 랜딩 `/` 공개 | ○ `/test`·`/result`·`/settings`(`middleware.ts` + 페이지) | △ `/draw`·`/history`·`/settings`만 — **`/result`는 로그인 확인 없음**(`middleware.ts` 7행, `app/result/page.tsx`에 `requireProgramAccess` 없음) |
| 쓰기·AI API 권한 확인 | ○ API 전부 `checkProgramAccessApi` + `force-dynamic`(AGENTS 기록, 확인한 경로 일치) | – (API는 OG뿐) | ○ `generate-character-image/route.ts` | ○ `generate-reading`·`generate-card-image` |
| 회원 본인 키만 | ○ `src/lib/apiKeys.ts`(gemini) | – | ○ `lib/apiKeys.ts`(gemini) | ○ `lib/apiKeys.ts`(gemini·openai) |
| 이어서 보기 공용 링크 | ○ **기준** `src/lib/programLinks.ts`, `src/lib/tarotLink.ts` | ○ 사본 `lib/programLinks.ts` | ○ 사본 `lib/programLinks.ts` | ○ 사본 `lib/programLinks.ts`(`FROM_LABELS`) |
| 다크 미드나잇 퍼플 테마 | ○ v1.21 | × 밝은 테마(2026-10-20 인수인계 기준, 화면 미확인) | ○ v1.22 | ○ v1.20~v1.24 |
| 브라우저 자동 시험 | ○ `tests/browser.mjs`(7개)·단위 `tests/ps.test.mjs` | × | × | × |
| Next.js 버전(`package.json`) | ^16.4.2 | 14.2.35 | 14.2.35 | 14.2.35 |

## 3. 병합 원본 기능 이관 대조 (출처)

이 카테고리에는 병합된 프로그램이 없다. 외부 참고 원본만 있다.

| 원본 | 출처 | 우리 대상 | 가져온 것 | 하지 않은 것 |
|---|---|---|---|---|
| 다기능 종합 성격 진단기(배포용) | EXT-TL-08(AI Studio 앱) | 종합 | 검사군 구조(16유형 변형·심리검사), 로컬 점수 + AI 해석 흐름 | 문항·결과 문구 복제, 상표·검사 이름 노출, 키 하나 공유, HTML 주입, 크레딧·광고 |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| 당해 연도·오늘 날짜 지시문 | `personality-suite/src/lib/tests/ai.ts` `yearGuard` | 한국 시간 `todayKst` |
| 진단 금지·경향 표현 지시문 | `personality-suite/src/lib/tests/ai.ts` `PERSONA` | 지시문 내용은 프로그램 고유 |
| 위기 상담 고정 안내 | `personality-suite/src/lib/tests/content/careTests.ts` `CRISIS_NOTICE` | 결과·첫 문항 둘 다 |
| 민감 검사 판정·미저장 | `personality-suite/src/lib/tests/registry.ts` `isSensitive`, `src/app/api/submit/route.ts` | |
| 상표명 금지 단위 시험 | `personality-suite/tests/ps.test.mjs` 71행 | 다른 프로그램에 같은 시험 추가 |
| 서버 재채점 | `personality-suite/src/lib/tests/scoring.ts` | |
| 지난 결과 비교·추이 | `personality-suite/src/lib/tests/report.ts` `compareResults`, `src/lib/tests/trends.ts` | 민감 검사 제외 |
| 결과 PNG(브라우저 생성) | `personality-suite/src/lib/shareImage.ts` | 서버 전송 없음 |
| 이어서 보기 링크 | `personality-suite/src/lib/programLinks.ts` | 공용 `personality-program-links` **기준**, 새 프로그램은 `FROM_LABELS`에 넣고 `--sync` |
| 그림 자동 생성 과금 안전장치 | `mbti-character/components/TestFlow.tsx`·`components/ResultInteractive.tsx`·`app/result/[type]/page.tsx` | `fresh=1` + 첫 렌더에서 주소에서 지움 |
| 공유 주소 그림 신뢰 검사 | `mbti-character/app/result/[type]/page.tsx` `getTrustedImageUrl` | |
| 해석 모델 허용 목록·옛 이름 변환 | `tarot/app/api/generate-reading/route.ts`, `tarot/lib/deck.ts` | 정규식 변환(점검 도구 오인 방지) |
| 이미지 생성 호출·모델 목록 | `mbti-character/lib/ai/geminiImage.ts`·`nanoBananaModels.ts`, `tarot/lib/ai/*` | 공용 **사본**(기준 `ai-image-studio/lib/providers/`) — 직접 고치지 않음 |
| 30일 정리(가져다 쓸 예) | `reverse-prompt/src/app/api/cron/cleanup/route.ts` + 공용 `cleanup-usage-log`(기준 `four-cut-comics/src/lib/cleanupUsageLog.ts`) | 이 카테고리에는 아직 없음 |
| 비공개 이미지 서명 주소 보기(가져다 쓸 예) | `shop-detail-page/app/api/image/route.ts`, `lib/storageImage.ts` | 공개 버킷 전환 때 참고 |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 프로그램 | 결정 | 상태 |
|---|---|---|---|
| 연결 | 종합 → 코드 → 캐릭 → 타로 | 합치지 않고 「이어서 보기」로 연결(유형·지표·질문만 전달, 자동 과금 없음) | ✅ v1.24~v1.27(종합)·v1.21(코드·캐릭·타로) |
| 공용화 | 네 프로그램 | 링크 코드 공용 기준 `personality-program-links` | ✅(2026-10-20, 각 프로그램 다음 배포 때 나감 — 캐릭 v1.24·타로 v1.27에 나감) |
| 카테고리 | 네 프로그램 | Tools → 「성격·운세」로 이동 | ✅ 2026-10-24(마이그레이션 0042) |

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 결과 화면 로그인 확인 + 공유 링크를 「회원이 공유 누름」 기준으로 | 타로 | §2-4·§2-6 | 빌드 1 | 확인 필요(우선 처리) |
| 1차 | 30일 자동 삭제 + 정리 기록 | 종합·캐릭·타로 | §2-4, 최상위 규칙 | 빌드 각 1 | 확인 필요(우선 처리) |
| 1차 | 한 해 운세 등 해석 지시문에 당해 연도·오늘 날짜 | 타로 | §2-2 | 빌드 1(다른 수정과 묶음) | 확인 필요(우선 처리) |
| 1차 | 그림 공개 버킷 → 비공개 + 공유 때만 공개 | 캐릭·타로 | §2-3 | 빌드·DB | 주인님 결정(카카오 미리보기 영향) |
| 1차 | 이름·제목의 「(MBTI)」 정리 + 상표명 단위 시험 | 코드·캐릭 | §2-5 | 빌드 + DB 이름 | 주인님 결정 |
| 2차 | 결과 화면 「재미용·결정 근거 아님」 안내 글 | 타로 | §2-5 | 묶음 | 대기 |
| 2차 | 타로 질문의 위기 신호 감지 → 위기 안내 먼저 | 타로 | 완성 기준 §4-3 | 없음(규칙 기반) | 후보 |
| 2차 | 성격코드 미드나잇 퍼플 테마 | 코드 | 2026-10-20 인수인계 §5-1 | 빌드 1 | 대기 |
| 3차 | 회원별 「최근 검사 유형」 공용 저장(주소 값 없이) | 공용 DB | 인수인계 §5-4 | DB 새 칸 | 주인님 승인 필요 |
| 3차 | 타로 결과 카드 뒤집힌 상태 실화면 확인 | 타로 | 인수인계 §5-5 | 없음(저장 리딩 재열기) | 대기 |

### 미배포 대기 (성격·운세)

| 프로그램 | 내용 | 나갈 때 |
|---|---|---|
| 종합 | 「이어서 보기」 공용 기준 정리(내부, 동작 같음) — 2026-10-20 기록. 이후 v1.28 보안 배포가 있어 **함께 나갔는지 확인 필요** | 확인 뒤 정리 |
| 코드 | 같은 공용 사본 반영(내부) — 2026-10-20 기록, 이후 배포 기록 미확인 | 다음 코드 배포(v1.22) |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 종합 v1.28·코드 v1.21·캐릭 v1.24·타로 v1.27 코드 기준. 문서와 코드가 다른 점: 종합 AGENTS 제목 v1.27↔코드 v1.28, 코드 AGENTS 「버전 v1.20」↔코드 v1.21, 타로 AGENTS 「현재 버전 v1.20」↔코드 v1.27, 종합 IMPROVEMENTS의 [대기] 2건(공유 PNG 색·빠른 입력 버그)은 v1.23·v1.25에서 이미 해결, 프로그램 비교표 캐릭 카드 「결과 저장 없음」↔그림 공개 저장, 타로 화풍 「12종」↔코드 검색 11개 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
