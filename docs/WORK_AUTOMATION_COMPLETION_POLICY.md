# 업무자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 담당 세션(`workspace`·`docbot-prompt`)과 담당이 없는 프로그램은 다음 작업 세션이 확인·수정하기 전까지 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「업무자동화」 카테고리 — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「업무자동화」 줄의 `ai-work-workspace`(AI 업무 워크스페이스) · `ai-task-planner`(AI 할 일·성과 관리) · `document-translator`(AI 문서번역) · `file-merge`(엑셀·텍스트 합치기) · `ebook-studio`(eBook Studio) · `ai-doc-chatbot`(AI 문서 챗봇) · `ai-writing-editor`(AI 글쓰기 에디터) · `markdown-studio`(마크다운 문서) · `ai-slide-builder`(AI 슬라이드), 병합됨 `persona-style-studio`(→ 글쓰기 에디터 「🎚️ 문체 바꾸기」, 이동 안내만). 앞으로 만드는 문서 작성·변환·업무 관리·문서 챗봇 프로그램에도 적용한다.
- 관계 문서: [업무자동화 기능 상세 비교표](WORK_AUTOMATION_FEATURE_MATRIX.md) · [업무자동화 통합 작업표](WORK_AUTOMATION_CONSOLIDATION_TASKS.md) · [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) · [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-TL-01~07 · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md) · [회원 연동 정보](MEMBER_INTEGRATIONS.md) · [예약 기능 지침](SCHEDULER_POLICY.md).
- 담당 역할: `workspace`(`ai-work-workspace`), `docbot-prompt`(`ai-doc-chatbot`). 나머지 7개는 담당 역할이 없다(카테고리 지도 기준).

## 1. 완성 흐름 (목표)

업무자동화 프로그램은 성격이 서로 달라 하나의 흐름으로 묶지 않는다. 성격별 완성 흐름은 아래와 같고, 모두 **회원 본인 키·본인 데이터로 끊기지 않고** 이어지는 것이 목표다.

| 성격 | 완성 흐름 | 해당 프로그램 |
|---|---|---|
| 문서 작성·편집 | 자료 넣기(직접 입력·파일·웹 주소) → AI 초안(회원이 고른 형식·분량·모델) → 회원이 부분 수정·검수 → 회원이 고른 형식으로 내보내기 → 결과 보관(기간 명시) | 글쓰기 에디터, 마크다운, 전자책, 슬라이드, 워크스페이스 |
| 문서 변환·병합 | 파일 넣기(크기·형식 한도 안내) → 변환·번역·합치기 → 원문과 대조·검수 → 내려받기 → 서버에 남는 자료는 30일 안에 정리 | 문서번역, 파일 합치기 |
| 업무 관리 | 할 일·문서·데이터 기록 → 실제 수행 측정(타이머·상태) → 차트·AI 분석 → 백업·내보내기 | 할 일·성과 관리, 워크스페이스 |
| 문서 챗봇 | 회원 문서 올리기 → 조각·임베딩 저장 → 질문 → 문서 근거(+선택 웹 검색) 답변과 출처 → 채팅방·문서 30일 정리 | 문서 챗봇 |

- 다른 프로그램으로 넘기는 연계(예: 글쓰기 에디터가 AI Prompt 보관함 템플릿을 읽음)는 **읽기만** 하고, 받는 프로그램에서 회원이 확인한 뒤 저장한다.
- 팀 공유·초대·실시간 동시 편집은 현재 범위 밖이다(워크스페이스 원본 기능 중 닫혀 있음). 없다고 「미완성」으로 보지는 않지만 완성 보고에 「공유: 범위 밖」이라고 밝힌다.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **로그인 + 공통 권한 판정이 모든 쓰기·유료 호출 API에 있다**: 페이지만 막지 않고, AI 호출·저장·외부 주소 가져오기 API마다 `checkProgramAccessApi()`(또는 이를 부르는 도우미: `ai-task-planner/src/lib/planner/api.ts`, `document-translator/src/lib/translation/api.ts`, `ai-writing-editor/src/lib/aiRoute.ts`, `ai-doc-chatbot/src/lib/chat/apiGuard.ts`)를 거친다. 로그아웃 경로만 예외다.
2. **회원 본인 키로 동작**: 유료 AI(Gemini·OpenAI·Claude·Upstage·Groq·OpenRouter 등)와 웹 검색(Tavily)은 회원 `user_api_keys`(또는 [회원 연동 정보](MEMBER_INTEGRATIONS.md) 공용 구조)의 본인 값만 쓴다. 키가 없으면 실행하지 않고 등록 안내를 띄운다. 브라우저가 보낸 키를 서버가 받아 쓰는 방식은 새로 만들지 않는다.
3. **회원 데이터 격리·비공개**: 서버에 저장하는 문서·업로드·생성 결과는 `user_id` + RLS 소유자 정책 또는 서비스 키 사용 시 코드의 `user_id` 필터로 격리하고, 저장소 파일은 회원 본인 폴더의 **비공개 버킷**에 둔다(기준: `ai-doc-chatbot` `dcb-uploads` 비공개 버킷, `ai-doc-chatbot/supabase/migrations/0006_uploads_bucket_v1_05.sql`). 공개 버킷·공개 주소로 회원 파일을 두지 않는다.
4. **30일 자동 정리**: AI가 만든 결과·분석·채팅 기록·업로드 원본처럼 생성일이 있는 회원 생성 데이터는 생성일 기준 30일 뒤 자동 삭제된다(기준: `document-translator/supabase/migrations/20261014094000_document_translator_retention.sql` pg_cron, `ai-doc-chatbot/supabase/migrations/0001_dcb_init.sql` pg_cron, `ai-work-workspace/src/app/api/cron/jobs/route.ts` + `src/server/aiRetention.ts`). 회원이 직접 쓴 문서(워크스페이스 페이지·할 일 기록 등)를 30일 정리 대상으로 볼지는 **주인님 결정 대기**다(§8).
5. **당해 연도 기준 프롬프트**: AI 프롬프트에 `new Date().getFullYear()`를 넣어 당해 연도 지시를 붙인다(기준: `ai-doc-chatbot/src/lib/chat/core.ts` 「기준 날짜 엄수」, `ai-task-planner/src/lib/planner/ai.ts`, `document-translator/src/lib/translation/gemini.ts` — 원문 날짜는 바꾸지 않는다고 함께 지시).
6. **문서를 지시가 아닌 데이터로 다룬다**: 회원이 올린 문서·웹 내용 안의 지시문을 따르지 않도록 프롬프트에 명시한다(기준: `document-translator/src/lib/translation/gemini.ts`, `ai-task-planner/src/lib/planner/ai.ts`, `ai-writing-editor/src/lib/we/prompts.ts`).
7. **크기·형식 한도를 화면과 서버 양쪽에서 지킨다**: 파일 크기·쪽수·글자 수·문서 개수 한도를 화면에 안내하고 서버에서도 거른다. 한도를 넘으면 조용히 잘라내지 않고 알려 준다.
8. **검수 증거**: 로컬 검사(tsc·시험) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인을 각각 기록한다. 유료 AI 시험은 승인된 횟수만 하고, 누르지 않은 버튼은 「미검수」로 적는다.
9. **문서 갱신**: 같은 작업에서 [업무자동화 기능 상세 비교표](WORK_AUTOMATION_FEATURE_MATRIX.md) 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전, 담당 역할 파일을 고친다. 버전은 코드 `APP_VERSION`과 DB `programs.version`을 같은 작업에서 맞춘다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 값으로 생성·과금·외부 저장하지 않는다. 아래 「근거」는 지금 코드에서 찾은 위치이며, 담당 확인 전 초안이다.

| 항목 | 선택지(코드 기준) | 프로그램 | 근거 |
|---|---|---|---|
| AI 공급자·모델 | 자동(Claude→OpenAI→Gemini) 또는 회원이 고른 회사 모델 | 워크스페이스 | `ai-work-workspace/src/litpage/server/ai/providers/config.ts`, `src/server/memberAiKeys.ts` |
| 답변 공급자·모델 | Upstage(기본) + G-1 호환 공급자(미배포) | 문서 챗봇 | `ai-doc-chatbot/src/lib/compatibleChat/config.ts`, `ProviderSelect.tsx` |
| 채팅방 봇 | 회원이 만든 봇 선택(G-2, 미배포) | 문서 챗봇 | `ai-doc-chatbot/src/lib/bots/core.ts`, `src/app/(dashboard)/bots/page.tsx` |
| 웹 검색 사용 | Tavily 키 등록 시(선택) | 문서 챗봇 | `ai-doc-chatbot/src/lib/chat/tavily.ts` |
| 글 형식·톤·분량 | 형식 9종·톤·분량 | 글쓰기 에디터 | `ai-writing-editor/src/lib/we/types.ts`(`isFormat`·`isTone`·`isLength`) |
| 문체 바꾸기 | 슬라이더 5개·프리셋·페르소나 | 글쓰기 에디터 | `ai-writing-editor/src/components/editor/StylePanel.tsx`, `src/lib/persona/` |
| 번역 언어·분야·격식 | 10개 언어, 분야·어조 옵션 | 문서번역 | `document-translator/src/lib/translation/model.ts` |
| 정리 수준 | 상세 정리·핵심 요약·원문 그대로 | 전자책 | `ebook-studio/src/app/api/ai/chapter/route.ts`(`mode`) |
| 전자책 모델 | 화면 목록에서 선택(구형 1.5 포함 — 확인 필요) | 전자책 | `ebook-studio/src/components/modals/SettingsModal.tsx` |
| 슬라이드 형식 | 22개 형식·3가지 기획 틀 | 슬라이드 | `ai-slide-builder/src/lib/constants.ts` |
| 내보내기 형식 | 프로그램별(아래 비교표 §2) | 전체 | 비교표 §2 |
| 합치기 방식 | 남길 열·순서·중복 제거·서식 유지 켜기 | 파일 합치기 | `file-merge/src/components/files/ExcelMerge.tsx`, `src/lib/files/styled.ts` |
| Drive 동기화 | 회원 본인 Google Cloud 앱 연결 시(선택) | 마크다운 | `markdown-studio/src/lib/drive/` |
| AI 분석 범위 | 날짜·분류·검색 범위 | 할 일·성과 관리 | `ai-task-planner/src/lib/planner/ai.ts`(`analysisInputSchema`) |

## 4. 하지 않을 것

- **운영자·다른 회원의 키나 계정으로 대신 처리하지 않는다.** 운영 환경변수 AI 키를 읽지 않는다(워크스페이스는 명시적으로 읽지 않음 — 프로그램 비교표 카드).
- **로그인·권한 확인 없이 외부 웹 주소를 서버가 대신 가져오지 않는다.** 서버가 주소를 가져올 때는 내부망·사설 주소를 막는다(워크스페이스 `src/litpage/server/safefetch.ts`가 있는지 확인된 예; 전자책 `src/app/api/scrape/route.ts`는 현재 없음 — 작업표 우선 처리).
- **브라우저 저장소(`localStorage`)에 AI 키를 두는 방식을 새로 만들지 않는다.** 키는 서버의 `user_api_keys`에만 둔다.
- **문서 내용에 없는 사실·수치·출처를 지어내지 않는다.** 번역·요약·슬라이드는 원문 수치를 바꾸지 않고, AI 평가·분석은 「참고용」으로 표시한다.
- **유료 AI 생성을 시간 초과로 자동 재시도하지 않는다**(이중 과금 방지).
- **회원 확인 없이 외부 공개·공유하지 않는다.** 공개 페이지·초대 기능은 열기 전에 주인님 승인을 받는다.
- **스캔 PDF·HWP처럼 지원하지 않는 형식을 지원한다고 안내하지 않는다**(프로그램마다 지원 형식이 다르다 — 비교표 §2-2).
- 병합된 원본(`persona-style-studio`)에 새 기능을 넣지 않는다. 옛 주소는 지우지 않고 이동 안내(API 410)로 둔다.

## 5. 회원 본인 키 규칙 (업무자동화 적용)

- Gemini: 할 일·성과 관리, 문서번역, 전자책, 글쓰기 에디터, 슬라이드, 워크스페이스(선택). 키 원문은 브라우저로 돌려보내지 않는다.
- Upstage(필수)·Tavily(선택): 문서 챗봇(`ai-doc-chatbot/src/lib/apiKeys.ts`, 마이그레이션 `0003_user_api_keys_upstage_tavily.sql`). G-1 호환 공급자 키는 공용 키 저장(`ai-doc-chatbot/src/lib/compatibleChat/keyStore.ts`)으로 다른 프로그램과 재사용한다.
- Claude·OpenAI·Gemini: 워크스페이스 AI 비서(공용 `user_api_keys`, `ai-work-workspace/src/server/memberAiKeys.ts`).
- Google OAuth 앱: 마크다운 Drive 동기화는 회원 본인이 만든 Google Cloud 앱(OAuth Client ID)을 쓴다(공용 앱 금지 원칙).
- 키가 필요 없는 프로그램: 파일 합치기·마크다운(AI 없음). 키 없는 기능(할 일·타이머·차트, 워크스페이스 문서·DB)은 키 없이 쓰게 둔다.
- 키가 없거나 한도가 소진되면 다른 키로 폴백하지 않고 「본인 키를 등록해 주세요」로 안내한다. 새 공급자 키는 프로그램 전용 저장소를 만들지 않고 공용 구조에 항목을 추가한다.

## 6. 생성 데이터 보관 원칙 (업무자동화 적용)

| 데이터 | 원칙 | 현재 상태(코드) |
|---|---|---|
| AI 생성 결과·분석·채팅 기록 | 생성일 기준 30일 자동 삭제 | 문서 챗봇 ○(pg_cron) · 문서번역 ○(pg_cron, `expires_at` 기본 30일) · 워크스페이스 AI 채팅 ○ · 글쓰기 에디터 × (문서 30개 개수 제한만, `ai-writing-editor/src/lib/documents.ts`) |
| 업로드 원본 | 처리 뒤 바로 삭제 또는 30일 | 문서 챗봇 ○(읽고 바로 지움, `src/lib/chat/uploads.ts`) · 워크스페이스 첨부 미확인 |
| 생성·첨부 이미지 | 비공개 버킷 + 서명 주소 | 글쓰기 에디터 × 공개 버킷(`supabase/migrations/0003_content_type_and_images.sql`, `getPublicUrl`) |
| 브라우저에만 남는 자료 | 서버 보관 대상 아님, 화면에 「이 기기에만 저장」 안내 | 마크다운(IndexedDB)·전자책(`localStorage`)·슬라이드·파일 합치기(서버 저장 없음) |
| 회원이 직접 쓴 문서·기록 | 주인님 결정 대기(§8) | 워크스페이스 페이지·할 일 기록은 기간 제한 없음, 휴지통만 30일 |

## 7. 완성 보고 양식(업무자동화)

완성 보고에는 아래를 따로 적는다: 권한 판정이 들어간 API 목록 / 회원 본인 키 확인(키 없을 때 안내 화면 포함) / 저장 위치(서버·브라우저)와 30일 정리 영향 / 당해 연도·문서는 데이터 지시 확인 / 크기·형식 한도 안내 확인 / 내보내기 형식별 실제 파일 열어 보기 여부 / 연계(AI Prompt 템플릿 읽기 등) 확인 여부 / 공유: 범위 밖 / 비용 리포트(빌드·AI 호출·누구 키).

## 8. 주인님 결정이 필요한 것 (초안 작성 중 발견)

1. 「회원이 직접 쓴 문서」(워크스페이스 페이지·할 일 기록·마크다운 원고)를 「생성 데이터 30일 자동 삭제」 대상으로 볼지, 문서 도구는 회원이 지울 때까지 보관하는 예외로 둘지.
2. 글쓰기 에디터의 AI 초안 문서(최대 30개, 기간 제한 없음)를 30일 자동 삭제로 바꿀지.
3. 전자책·마크다운처럼 브라우저에만 저장하는 프로그램에 서버 보관을 추가할지(지금은 기기를 바꾸면 자료가 없음).

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 9개 운영 프로그램 + 병합 1개 코드 기준 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
