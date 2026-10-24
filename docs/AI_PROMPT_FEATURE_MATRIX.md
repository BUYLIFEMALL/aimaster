# AI 프롬프트 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **프롬프트 프로그램(설계·보관·역설계)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「AI 프롬프트」 줄의 `ai-prompt-studio`·`reverse-prompt`와 병합됨 `prompt-template-studio`.
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 `src/lib/version.ts`) AI Prompt v1.09 · 리버스 v1.14 · 템플릿 v1.07.
> - 근거: 세 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [AutoGemma 참고 G-1~G-5 플랜](analysis-autogemma-starter-20261024/PLAN_G1_G5_20261024.md)·[G-1 결과](analysis-autogemma-starter-20261024/G1_IMPLEMENTATION_20261024.md), [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-TL-09. **운영 DB는 이번에 조회하지 않았다**(배지·공개 여부는 문서·마이그레이션 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다. **G-1(여러 공급자)은 코드에 있지만 미배포**라 칸에 「미배포」로 표시한다.
> - 관계 문서: [AI 프롬프트 자동화 완성 기준](AI_PROMPT_COMPLETION_POLICY.md) · [AI 프롬프트 통합 작업표](AI_PROMPT_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md) · 담당 역할 [`roles/docbot-prompt.md`](roles/docbot-prompt.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 「글로 된 아이디어 → 대화형 AI용 프롬프트 설계·보관·실행」은 `ai-prompt-studio`, 「이미지·영상·음악 파일 → 생성 AI용 프롬프트 역설계」는 `reverse-prompt`. 병합된 `prompt-template-studio`에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸에 「미배포」를 붙이고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/AI_PROMPT_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/AI_PROMPT_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전 · 배지) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 설계 | AI Prompt 자동화 (`ai-prompt-studio` v1.09 · FREE·NEW — 문서 기록) | 대화형 AI용 프롬프트 설계·보관·실행 **기준** | 빠른 만들기 / 5가지 모드 → 4단계 입력(AI 제안) → 메타 프롬프트 → 다시 쓰기 → 복사·.md → 📁 내 템플릿(`{{변수}}`·AI 채우기·바로 실행·백업) | 설계 결과는 저장 안 함, 템플릿만 `ai_prompt_templates` / Gemini 2.5 Flash(+G-1 미배포: Groq·OpenRouter·Cloudflare) / 회원 본인 키 | 모드 5종, 단계별 AI 제안, 템플릿 보관함 병합 완료, `{{변수}}` 자동 제안, 다른 앱(AI 글쓰기 에디터)이 템플릿 재사용 | 대화형 AI별 형식 변환 없음, 실행 모델이 지금은 Gemini 하나(G-1 미배포), 팀 공유 없음, Gemini 2.5 Flash 고정(모델 교체 대비 없음) | 독립(기준) |
| 리버스 | AI 리버스 프롬프트 자동화 (`reverse-prompt` v1.14) | 파일 → 생성 AI 프롬프트 역설계 **기준** | 파일 업로드(비공개 임시 1시간) → Gemini 분해 → 대상 도구 9종 프롬프트·JSON → 편집·재조합 → 복사·JSON·Markdown → 바나나·이미지 스튜디오·스타일 분석기로 보내기 → 기록 | `reverse_prompt_history`(30일 정리) + 비공개 버킷 `reverse-prompt-tmp` / Gemini 3.5 Flash·3.1 Pro 체인 / 회원 본인 키 | 매체 3종·도구 9종, 구조화 JSON, 원본 비공개·짧은 보관, 이미지 프로그램들과 양방향 연결 | 결과 품질이 원본 파일에 좌우, 영상·오디오 50MB 한도, 다른 AI 공급자 선택 없음 | 독립(기준) |
| 템플릿 | AI 프롬프트 템플릿 자동화 (`prompt-template-studio` v1.07 — 문서 v1.06) | 병합 원본 | **현재 이동 안내만** — 옛 AI API 3개 410, 「AI Prompt로 옮기기」(`/api/migrate-templates`) | (옛) 브라우저 저장 → 옮기기로 `ai_prompt_templates` | (옛) 보관·변수·AI 채우기 → 설계로 이관 완료 | 카탈로그 숨김·FREE 해제(2026-10-21 기록) | 병합됨 → 설계(2026-10-21, 병합 C) |

공통: 두 운영 앱 모두 로그인 + 공통 권한 판정(`src/lib/access.ts`·`src/lib/programAccess.ts`, 정지 → 관리자 → 핸드폰 → FREE → …), 회원 본인 키(`user_api_keys`), 당해 연도·현재 월 주입을 갖췄다. 두 앱은 같은 카테고리지만 입력이 다르다(글 vs 파일). 합치지 않고 연결만 검토한다(§5).

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드를 확인하지 못한 칸. 템플릿 칸은 **지금 회원이 쓸 수 있는지**를 적는다(옛 기능은 §3). 경로는 각 프로그램 폴더 기준.

### 2-1. 입력·설계

| 기능 | 설계 | 리버스 | 템플릿 |
|---|---|---|---|
| 아이디어 한 줄 → 빠른 만들기(역질문·페르소나·비판적 개선) | ○ `src/components/IntroSection.tsx`, `src/lib/prompt-engine.ts` | × | × |
| 전문 모드 선택(5종) | ○ `src/data/presets.ts`(RTSC·BUSINESS·ARCHITECT·VERTEX_XML·COT_REASONING) | × | × |
| 예제 프리셋 | ○ `src/data/presets.ts`(코드 기준 20개 — 문서는 「50종」, §7 참고) | × | × |
| 단계별 입력 + AI 실시간 제안 | ○ `src/components/StepBuilder.tsx`, `src/app/api/ai-suggest/route.ts` | × | × |
| 결과 다시 쓰기(추가 요구·어조) | ○ `src/lib/prompt-engine.ts`(`wrapFeedback`), `src/app/api/generate-prompt/route.ts` | △ 편집 칸 수정 후 「수정 저장·명령어 재조합」(`src/components/studio/Analyzer.tsx`) | × |
| 이미지·영상·오디오 파일 업로드 분석 | × | ○ `src/app/api/upload/route.ts`, `src/lib/rpa/media.ts`, `src/lib/gemini.ts` | × |
| 붙여넣기(클립보드 파일)로 올리기 | × | ○ `src/components/studio/Analyzer.tsx`(`clipboardData.files`) | × |
| 다른 프로그램에서 원본 받아오기 | × | ○ 스타일 분석기 서명 주소만 받음(`Analyzer.tsx` `style-dna-images` 경로 검사) | × |
| AI 응답 JSON 구조 강제 | ○ `src/lib/prompt-engine.ts`(`responseSchema`·`responseMimeType`) | ○ `src/lib/rpa/schemas.ts`, `src/lib/rpa/validate.ts` | × |

### 2-2. 당해 연도·시점

| 기능 | 설계 | 리버스 | 템플릿 |
|---|---|---|---|
| 기준 연도 `getFullYear` 주입 | ○ `src/lib/prompt-engine.ts`, `src/app/api/templates/{execute,auto-fill,suggest-field}/route.ts` | ○ `src/lib/rpa/prompts.ts` 6~8행 | × (410) |
| 한국 시간 현재 연·월 주입 | ○ `src/lib/koreaNowRule.ts`(실행 경로), `prompt-engine.ts` 안 같은 이름 함수(설계 경로) | ○ `src/lib/rpa/prompts.ts` | △ 사본 `src/lib/koreaNowRule.ts` 남음(API 410) |

### 2-3. 결과·내보내기

| 기능 | 설계 | 리버스 | 템플릿 |
|---|---|---|---|
| 원클릭 복사 | ○ `src/components/ResultSection.tsx`(`navigator.clipboard`) | ○ `Analyzer.tsx` | × |
| .md 파일 저장 | ○ `ResultSection.tsx`(`meta-prompt-<시각>.md`) | △ 「Markdown 요약 복사」(파일 저장 아님, `Analyzer.tsx` `toMarkdown`) | × |
| JSON 파일 저장 | × | ○ `Analyzer.tsx` 「JSON 파일 저장」 | × |
| 대상 생성 AI별 문법 | △ 「ChatGPT·Claude·Gemini 등에 붙여 넣기」 한 형식(`ResultSection.tsx`) — AI별 변환 없음 | ○ 9종 `src/lib/rpa/types.ts` `TARGETS` | × |
| 대화형 AI별 형식 변환 토글(Claude XML·ChatGPT 마크다운) | × (IMPROVEMENTS 5번 대기) | – | × |
| 토큰·글자 수 계산기 | × (IMPROVEMENTS 6번 대기) | 미확인 | × |
| 바나나 캔버스로 보내기(600자) | × | ○ v1.12 `src/lib/rpa/bananaLink.ts`, 공용 사본 `src/lib/rpa/bananaIdeaLink.ts` | × |
| 이미지 스튜디오에서 생성(6000자) | × | ○ v1.13 `bananaLink.ts` `studioLink` | × |
| 스타일 정밀 분석으로 보내기(서명 주소) | × | ○ v1.11 `Analyzer.tsx`, `GET /api/upload?path=` | × |
| 썸네일 마스터·패션 스타일로 보내기 | × | × (`docs/IMPROVEMENT_BACKLOG.md` 대기) | × |

### 2-4. 템플릿 보관함

| 기능 | 설계 | 리버스 | 템플릿 |
|---|---|---|---|
| 회원 계정 DB 보관(300개·20,000자) | ○ v1.07 `src/lib/templates.ts`, 마이그레이션 `supabase/migrations/20261021230000_merge_c_prompt_templates.sql` | × | × (옮기기만) |
| `{{변수}}` 자동 인식 | ○ v1.07 `src/components/templates/PromptFormModal.tsx` | × | × |
| 저장 때 AI 변수 제안(체크한 것만 적용) | ○ v1.08 `src/app/api/templates/suggest-field/route.ts`(`field:"variables"`), `PromptFormModal.tsx` `applyVariables` | × | × |
| AI 변수 채우기 | ○ v1.07 `src/app/api/templates/auto-fill/route.ts` | × | × (410) |
| 템플릿 바로 실행(Gemini) | ○ v1.07 `src/app/api/templates/execute/route.ts` | × | × (410) |
| 템플릿 실행 공급자 선택(Groq·OpenRouter·Cloudflare) | △ **미배포**(G-1) `src/lib/compatibleChat/`(`config.ts`·`transport.ts`·`keyStore.ts`), `execute/route.ts` | × | × |
| 백업 JSON 내보내기·가져오기 | ○ `src/components/templates/BackupModal.tsx`, `templates.ts` `importTemplates` | × | × |
| 비었을 때 예제 보여 주기 | ○ `src/data/templatePresets.ts`(9개) | × | × |
| 옛 앱 → AI Prompt 옮기기 | – (받는 쪽) | × | ○ `src/app/api/migrate-templates/route.ts`, `src/components/MovedNotice.tsx` |
| 다른 프로그램이 템플릿 읽기 | ○ 받는 쪽 `ai-writing-editor/src/app/api/prompt-templates/route.ts`(읽기 전용) | × | × |
| 회원 간 공유 | × (정책상 하지 않음) | × | × |

### 2-5. 기록·정리·저장

| 기능 | 설계 | 리버스 | 템플릿 |
|---|---|---|---|
| 생성 결과 서버 기록 | × (설계 결과는 저장 안 함) | ○ `reverse_prompt_history`(`supabase/migrations/0001_history_and_temp_bucket.sql`, RLS 본인만) | × |
| 기록 즐겨찾기·필터 | × | ○ `src/components/workspace/HistoryList.tsx`, `src/app/api/history/[id]/route.ts`(PATCH) | × |
| 30일 자동 삭제(예약) | – (저장 결과 없음, 템플릿은 대상 아님) | ○ v1.11 `src/app/api/cron/cleanup/route.ts`, `vercel.json` 매일 03:00 KST | × |
| 정리 건수 회원별 기록 | – | △ 코드 반영 `src/lib/cleanupUsageLog.ts`(공용 사본) — IMPROVEMENTS·`PENDING_DEPLOYS.md`는 「미배포」, 이후 v1.14 배포가 있었음(**배포 포함 여부 확인 필요**) | – |
| 화면 보관 안내와 실제 정리 규칙 일치 | – | × `HistoryList.tsx` 48행 「최근 100건까지 보관합니다(즐겨찾기는 유지)」 ↔ 정리는 즐겨찾기 포함 30일 삭제 | – |
| 업로드 원본 비공개 버킷·1시간 정리 | – | ○ `src/lib/rpa/media.ts` `TEMP_TTL_MS`, cron에서 회원 폴더 전체 정리 | – |
| 영상·오디오 원격 파일 분석 후 삭제 | – | ○ `src/lib/gemini.ts`(Files API) | – |
| 크기 제한(이미지 20MB·영상/오디오 50MB) | – | ○ `src/lib/rpa/media.ts` `SIZE_LIMIT` | – |

### 2-6. 공통·보안

| 기능 | 설계 | 리버스 | 템플릿 |
|---|---|---|---|
| 로그인 + 공통 권한 판정(FREE 먼저) | ○ `src/lib/access.ts`, `src/lib/programAccess.ts` | ○ `src/lib/access.ts`, `src/lib/programAccess.ts` | ○ `src/lib/access.ts`(옮기기는 `ai-prompt-studio` 권한 확인) |
| 핸드폰 번호 필수 | ○ `programAccess.ts` `phone_required` | ○ `src/lib/utils/phone.ts`, `programAccess.ts` | 미확인 |
| 모든 쓰기·AI API에 권한 확인 | ○ API 8곳 `checkProgramAccessApi` | ○ `src/app/api/*`(예: `analyze/route.ts`) | 미확인(옛 API 410) |
| API 파일에 캐시 방지 두 줄 | △ `templates/*`·`settings/compatible-keys`는 있음, **`ai-suggest`·`generate-prompt`·`user-key` 세 곳은 없음** | ○ 확인한 API 모두 있음(예: `analyze/route.ts`·`cron/cleanup/route.ts`) | 미확인 |
| 회원 본인 키만(폴백 없음) | ○ `src/lib/apiKeys.ts`(gemini), G-1 `compatibleChat/keyStore.ts`(미배포) | ○ `src/lib/apiKeys.ts`(gemini) | – |
| 키 원문을 브라우저에 주지 않음 | ○ `src/app/api/user-key/route.ts`(등록 여부·마스킹 값만) | ○ `src/app/api/keys/route.ts` | – |
| 유료 모델로 자동 변경 안 함 | ○(G-1 미배포) `compatibleChat/config.ts` `selectCompatible` | – | – |
| 모델 폴백 체인(구형 모델 종료 대비) | × `gemini-2.5-flash` 고정(`prompt-engine.ts`·templates API) | ○ `src/lib/gemini.ts` `MODEL_CHAIN` | – |
| 휴대폰 폭 메뉴(767px) | ○ `src/components/Sidebar.tsx`(v1.05·v1.09 줄바꿈 수정) | ○ `src/components/layout/Shell.tsx`·`Sidebar.tsx`(v1.03) | 미확인 |
| 사용 안내(/guide) | ○ `src/app/guide/page.tsx`, `src/components/PromptGuideView.tsx` | ○ `src/app/(workspace)/guide/page.tsx` | ○ `src/app/guide/page.tsx` |
| Next.js 버전 | 16(문서 기록) | 16.4(문서), 2026-10-23 보안 업데이트 v1.14 | 16(문서) |

## 3. 병합 원본 기능 이관 대조 (출처)

| 원본 기능 | 출처 | 설계로 이관 | 상태 |
|---|---|---|---|
| 템플릿 보관(카테고리·검색) | 템플릿 | ○ v1.07 `src/components/templates/PromptLibrary.tsx` | ✅ |
| `{{변수}}` 자동 인식 | 템플릿 | ○ v1.07 | ✅ |
| AI 변수 채우기·필드 제안 | 템플릿 | ○ v1.07(2026-10-21 일반 회원 실호출 1회씩 확인) | ✅ |
| 바로 실행 + 마크다운 결과·.md | 템플릿 | ○ v1.07 `PromptExecuteModal.tsx` | ✅ |
| 백업·동기화 | 템플릿 | ○ 백업 JSON(동기화는 회원 DB 저장으로 대체) | ✅ |
| 브라우저 저장 → 계정 저장 | 템플릿(localStorage) | ○ `ai_prompt_templates` + 옮기기 API | ✅ |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| 한국 시간 현재 연·월 지시문 | `ai-prompt-studio/src/lib/koreaNowRule.ts` | 연도 하드코딩 금지, `Asia/Seoul` |
| 기준 연도 + 현재 시점 한 줄(역설계용) | `reverse-prompt/src/lib/rpa/prompts.ts` 6~8행 | 연도 엄수 + 기준 시점 두 문장 |
| 메타 프롬프트 설계 엔진(JSON 구조 응답) | `ai-prompt-studio/src/lib/prompt-engine.ts` | 지시문 내용은 프로그램 고유 |
| 템플릿 저장·한도·가져오기 | `ai-prompt-studio/src/lib/templates.ts` | 서비스 롤 + 모든 쿼리 `user_id` 필터 |
| 템플릿 표 구조 | `ai-prompt-studio/supabase/migrations/20261021230000_merge_c_prompt_templates.sql` | 열 바꾸면 `ai-writing-editor` 함께 |
| AI 변수 제안 → 정확히 바꾸기 | `ai-prompt-studio/src/components/templates/PromptFormModal.tsx` `applyVariables` | AI는 `[{name, original}]`만, 본문 재작성 금지 |
| OpenAI 호환 공급자 공용 호출(G-1, 미배포) | 기준 `ai-doc-chatbot/src/lib/compatibleChat/`, 사본 `ai-prompt-studio/src/lib/compatibleChat/` | 사본 직접 수정 금지 — 기준을 먼저 고친다(G-1 인수인계) |
| 공용 키 등록 화면(G-1, 미배포) | `ai-prompt-studio/src/lib/compatibleChat/ProviderKeys.tsx`, `src/app/api/settings/compatible-keys/route.ts` | 같은 회원 값을 두 앱이 재사용 |
| 파일 종류·크기·임시 경로 검사 | `reverse-prompt/src/lib/rpa/media.ts` | `isOwnTempPath`로 본인 폴더만 |
| Gemini 모델 체인·Files API 정리 | `reverse-prompt/src/lib/gemini.ts` | 없는 모델이면 다음 모델로 |
| 대상 도구 목록 | `reverse-prompt/src/lib/rpa/types.ts` `TARGETS` | 늘리면 지시문·매뉴얼 도구 수 함께 |
| 30일 정리 + 임시 파일 정리 | `reverse-prompt/src/app/api/cron/cleanup/route.ts` | `CRON_SECRET` 비면 거부 |
| 정리 건수 기록 | `reverse-prompt/src/lib/cleanupUsageLog.ts` | 공용 `cleanup-usage-log` **사본**(기준 `four-cut-comics/src/lib/cleanupUsageLog.ts`) — 직접 고치지 않음 |
| 바나나 캔버스로 글자 넘기기 | `reverse-prompt/src/lib/rpa/bananaIdeaLink.ts` | 공용 사본(기준 `style-dna-analyzer`) — 직접 고치지 않음 |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 합칠 프로그램 → 기준 | 가져온 기능 | 상태 |
|---|---|---|---|
| 병합 C | 템플릿 → 설계 | 보관함·변수·AI 채우기·바로 실행·백업 | ✅ v1.07 (`f0a3f529`) |
| 병합 C 보강 | — (설계 자체) | 저장 때 `{{변수}}` 자동 제안 | ✅ v1.08 (`b1687b6d`) |
| G-1 | (문서 챗봇 기준 공용 사본) → 설계 | 템플릿 실행 공급자 선택·공용 키 | ⏸ 미배포(v1.09 유지, 코드 `2d56a117b`) |
| 독립 | 설계·리버스 | 입력이 달라(글 vs 파일) 합치지 않음 | – |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다. 원본 앱은 비공개·이동 안내로 두고 주소는 지우지 않는다.

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | G-1 새 공급자 실검수(키 등록 후) + 배포 | 설계 | 역할 파일 「대기 중」 | 빌드 1 + 회원 키 소량 | 대기(주인님 키 등록 나중) |
| 1차 | 캐시 방지 두 줄 보강(`ai-suggest`·`generate-prompt`·`user-key`) | 설계 | §2-6 | G-1 배포에 묶음 | 확인 필요 |
| 1차 | 기록 화면 보관 안내 문구 정정 | 리버스 | §2-5 | 다음 배포에 묶음 | 확인 필요 |
| 1차 | 정리 기록 배포 포함 여부 확인·문서 정리 | 리버스 | `PENDING_DEPLOYS.md` | 없음(라이브 확인) | 확인 필요 |
| 2차 | 대화형 AI별 형식 변환 토글 | 설계 | IMPROVEMENTS 5번 | 없음(AI 0) | 대기 |
| 2차 | 토큰·글자 수 계산기 | 설계 | IMPROVEMENTS 6번 | 없음 | 대기 |
| 2차 | 설계 엔진 모델 폴백 체인(2.5 Flash 고정 해소) | 설계 | 리버스 `MODEL_CHAIN` 패턴 | 없음 | 후보 |
| 2차 | 리버스 결과 → AI Prompt 템플릿으로 저장 | 리버스 → 설계 | 프로그램 비교표 §3 「프롬프트」 묶음 | 없음 | 후보(일방향만) |
| 2차 | 썸네일 마스터·패션 스타일로 보내기 | 리버스 | `docs/IMPROVEMENT_BACKLOG.md` | 없음 | 대기 |
| 3차 | G-5 로컬 Ollama(사전 검증 페이지부터) | 설계 | G-1~G-5 플랜 §G-5 | 외부 AI 0, 빌드 0(사전 검증) | 주인님 결정 대기 |
| 3차 | 리버스 다른 AI 공급자(회원 키) | 리버스 | 백로그 「멀티 LLM」 | 회원 키 | 대기 |
| 보류 | 회원 간 템플릿 공유 | – | 데이터 격리 원칙 | – | 하지 않음(백업 파일로) |

### 미배포 대기 (AI 프롬프트)

| 프로그램 | 내용 | 나갈 때 |
|---|---|---|
| 설계 | G-1 템플릿 실행 공급자·공용 키(`2d56a117b`), Edge 관리자 모달만 확인 | v1.10 후보(G-2~G-4 묶음 배포 계획, 역할 파일·플랜 §6) |
| 리버스 | 30일 정리 회원별 기록(`8ad8ea2e5`·`f53021369`) — 문서상 미배포, v1.14 배포 순서상 포함됐을 수 있음 | 확인 뒤 정리 |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 설계 v1.09·리버스 v1.14·템플릿 v1.07 코드 기준, 병합 C·G-1(미배포) 반영. 문서와 코드가 다른 점: 설계 예제 「50종」↔코드 20개, 리버스 「10대 도구」↔코드 9종, 리버스 AGENTS 상단 「최신 v1.10」↔코드 v1.14, 템플릿 AGENTS v1.06↔코드 v1.07 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
