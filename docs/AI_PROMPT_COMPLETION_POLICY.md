# AI 프롬프트 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 담당 세션(`docbot-prompt` — `ai-prompt-studio`, 리버스 프롬프트는 담당 역할 없음)이 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「AI 프롬프트」 카테고리(`ai-prompt`, 2026-10-24 신설) — `ai-prompt-studio`(AI Prompt 자동화), `reverse-prompt`(AI 리버스 프롬프트 자동화), 병합됨 `prompt-template-studio`(이동 안내만). 앞으로 만드는 프롬프트 설계·보관·역설계 도구에도 적용한다.
- 관계 문서: [AI 프롬프트 기능 상세 비교표](AI_PROMPT_FEATURE_MATRIX.md) · [AI 프롬프트 통합 작업표](AI_PROMPT_CONSOLIDATION_TASKS.md) · [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) · [AutoGemma 참고 G-1~G-5 플랜](analysis-autogemma-starter-20261024/PLAN_G1_G5_20261024.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md).
- 카테고리 지도가 비워 둔 보강 항목 「프롬프트 템플릿 형식·당해 연도 규칙·생성 AI별 내보내기」는 이 문서 §3·§4·§5에서 정한다.

## 1. 완성 흐름 (목표)

AI 프롬프트 자동화의 완성 목표는 아래 흐름이 **회원 본인 키·본인 데이터로 끊기지 않고** 이어지는 것이다.

**아이디어·참고 파일 입력 → (설계) 모드·단계별 입력과 AI 제안 / (역설계) 파일 분해 → 회원 확인·수정 → 대상 생성 AI 규격으로 다듬기 → 복사·파일 내보내기·다른 프로그램으로 보내기 → (선택) 내 템플릿으로 저장해 변수만 바꿔 다시 실행 → 결과 정리 기록**

- 설계 쪽(`ai-prompt-studio`): 빠른 만들기 또는 5가지 전문 모드 → 4단계 입력(AI 실시간 제안) → 메타 프롬프트 완성 → 다시 쓰기 → 복사·.md 저장 → 「📁 내 템플릿 보관함」(`{{변수}}`·AI 변수 채우기·바로 실행·백업).
- 역설계 쪽(`reverse-prompt`): 이미지·영상·오디오 파일 → 비공개 임시 저장(1시간) → Gemini 분해 → 대상 도구별 프롬프트·JSON → 편집·재조합 → 복사·JSON·Markdown → 바나나 캔버스·이미지 스튜디오·스타일 분석기로 보내기 → 기록(30일 정리).
- **실제 이미지·영상·음악 생성은 이 카테고리의 범위 밖**이다. 생성은 받는 프로그램(`banana-canvas`·`ai-image-studio` 등)에서 회원이 직접 누른다. 완성 보고에 「생성: 받는 프로그램에서(범위 밖)」라고 밝힌다.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 키로 동작**: 유료 AI(Gemini, G-1의 Groq·OpenRouter·Cloudflare 등)는 회원 `user_api_keys`의 본인 값만 쓴다. 키가 없으면 실행하지 않고 등록 안내(모달·설정 링크)를 띄운다. 다른 회원·운영자 키로 폴백하지 않는다.
2. **로그인 + 공통 권한 판정**: 화면과 **모든** 쓰기·AI 호출 API가 `checkProgramAccessApi()`/`requireProgramAccess()`를 거치고, 그 파일에 `export const dynamic = "force-dynamic"`·`export const fetchCache = "force-no-store"` 두 줄을 둔다(루트 CLAUDE.md 멀티테넌시 1번). FREE 배지는 「가입·로그인한 회원 누구나」이며 로그인 없는 공개가 아니다.
3. **당해 연도·현재 시점 주입**: 프롬프트를 만드는 모든 AI 호출(설계·제안·변수 채우기·실행·역설계)에 `new Date().getFullYear()` 기반 기준 연도와 한국 시간 현재 연·월(`koreaNowRule()` 형식)을 넣는다(§4).
4. **회원 데이터 격리·30일 정리**: AI 생성 결과·분석 기록·업로드 파일은 회원 본인 소유로 저장하고(`user_id` + RLS 본인만, 서비스 롤 사용 시 코드에서 `user_id` 필터), 생성일 기준 30일 뒤 자동 삭제하며 회원별 정리 건수를 공용 `cleanup-usage-log` 사본으로 남긴다. 회원이 직접 만든 **템플릿 보관함은 설정류로 30일 대상이 아니다**(2026-10-21 병합 C 결정, `ai-prompt-studio/AGENTS.md`). 화면 안내 문구는 실제 정리 규칙과 같아야 한다(§7 「하지 않을 것」).
5. **업로드 파일 비공개**: 역설계용 원본 파일은 비공개 버킷의 회원 폴더에 두고 짧게 보관한다(현재 1시간, `reverse-prompt/src/lib/rpa/media.ts` `TEMP_TTL_MS`). 다른 프로그램으로 넘길 때는 짧은 서명 주소만 넘긴다.
6. **대상 AI 규격 결과물**: 회원이 고른 대상 도구(§3) 문법으로 결과가 나오고, 원클릭 복사와 파일 내보내기(.md 또는 JSON)가 된다.
7. **검수 증거**: 로컬 검사(tsc·시험·필요하면 build) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인을 각각 기록한다. 유료 AI 시험은 승인된 횟수만 하고, 누르지 않은 버튼은 「미검수」로 적는다.
8. **문서 갱신**: 같은 작업에서 [AI 프롬프트 기능 상세 비교표](AI_PROMPT_FEATURE_MATRIX.md) 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 값으로 생성·실행·과금하지 않는다.

| 항목 | 선택지 | 프로그램 | 근거 |
|---|---|---|---|
| 설계 모드 | RTSC 마스터 / 비즈니스 프레임워크 / 바로 실행형 아키텍트 / XML 구조화 / 단계별 논리 추론 | AI Prompt | `ai-prompt-studio/src/data/presets.ts` |
| 예제 프리셋 | 모드별 예제(코드 기준 20개) | AI Prompt | `src/data/presets.ts`, `src/components/IntroSection.tsx` |
| 단계별 AI 제안 받기 | 목표·역할·작업·출력 형식·제약을 단계마다 회원이 눌러 요청 | AI Prompt | `src/app/api/ai-suggest/route.ts`, `src/components/StepBuilder.tsx` |
| 다시 쓰기 | 추가 요구·어조를 넣어 회원이 요청 | AI Prompt | `src/lib/prompt-engine.ts`(`wrapFeedback`) |
| 템플릿 저장 때 변수 제안 | AI가 제안한 `{{변수}}` 중 회원이 체크한 것만 바꿈 | AI Prompt | `src/components/templates/PromptFormModal.tsx` `applyVariables` |
| 템플릿 실행 공급자·모델(G-1, **미배포**) | Gemini(기본) / Groq / OpenRouter / Cloudflare Workers AI — 고정 무료 모델 목록 안에서만, NVIDIA는 비활성 | AI Prompt | `src/lib/compatibleChat/config.ts`, `src/app/api/templates/execute/route.ts` |
| 매체 | 이미지 / 동영상 / 오디오(파일 종류로 자동 판별) | 리버스 | `reverse-prompt/src/lib/rpa/media.ts` |
| 대상 도구 | 이미지 3(Midjourney·DALL·E/GPT Image·Flux/SD) · 영상 4(Sora·Veo·Runway·Kling) · 오디오 2(Suno·Udio) = 9종 | 리버스 | `src/lib/rpa/types.ts` `TARGETS` |
| 분석 모델 | 빠름(3.5 Flash → 2.5 Flash) / 정밀(3.1 Pro → 3.5 Flash → 2.5 Flash) | 리버스 | `src/lib/gemini.ts` `MODEL_CHAIN` |
| 다른 프로그램으로 보내기 | 바나나 캔버스(600자 이하) / 이미지 스튜디오(6000자 이하) / 스타일 정밀 분석 — 글자·서명 주소만 넘기고 자동 생성 없음 | 리버스 | `src/lib/rpa/bananaLink.ts`, `src/components/studio/Analyzer.tsx` |

## 4. 당해 연도 규칙 (프롬프트 카테고리 적용)

- 프롬프트를 **만드는** AI 호출과 템플릿을 **실행하는** AI 호출 모두에 기준 연도를 넣는다. 기준 문장은 두 가지를 함께 쓴다.
  - 기준 연도: `const currentYear = new Date().getFullYear();` → 「현재 기준 연도: ${currentYear}년」(현재 구현: `ai-prompt-studio/src/lib/prompt-engine.ts`, `src/app/api/templates/*/route.ts`).
  - 현재 시점: 한국 시간 연·월(`koreaNowRule()` — `ai-prompt-studio/src/lib/koreaNowRule.ts`, 리버스 `reverse-prompt/src/lib/rpa/prompts.ts` 6~8행). 계절·시기 표현은 현재 월에 맞추고, 불필요한 연도·계절은 덧붙이지 않는다.
- **완성된 프롬프트 결과물 안에도** 시기가 필요한 내용(정책·트렌드·통계 등)이면 당해 연도를 쓰게 한다. 회원이 템플릿에 과거 연도를 직접 적었으면 그 값은 바꾸지 않는다(회원 입력 우선).
- 역설계 결과는 원본 파일을 묘사하므로 연도가 꼭 필요하지 않다. 다만 트렌드·시대 표현을 쓸 때는 당해 연도 기준으로 쓴다(현재 지시문 유지).
- 연도를 하드코딩(예: 「2026년」 글자 고정)하지 않는다. 해가 바뀌어도 자동으로 따라가야 한다.

## 5. 프롬프트 템플릿 형식 (보관함 표준)

- 저장 위치: 공용 DB 표 `ai_prompt_templates`(회원별 `user_id` + RLS 본인만, 회원당 300개, 본문 20,000자 — `ai-prompt-studio/src/lib/templates.ts` `MAX_TEMPLATES`·`LIMITS`). 새 프로그램이 템플릿을 저장해야 하면 새 표를 만들지 않고 이 표를 쓴다.
- 변수 표기: 본문 안 `{{변수명}}`. 변수 이름은 본문에서 자동 추출하고, 저장 때 `variables` 목록으로도 둔다. 실행 때 회원이 변수 칸을 채우거나 「AI 변수 채우기」를 눌러 예시를 받는다.
- 칸: 제목(120자)·설명(500자)·본문(20,000자)·카테고리(40자)·시스템 지침(선택).
- 백업: JSON 파일로 내보내기·가져오기(같은 제목+본문은 건너뛰고 300개 한도 지킴 — `importTemplates`). 회원 간 공유는 데이터 격리 원칙 때문에 기능으로 만들지 않고 백업 파일로만 한다(`ai-prompt-studio/docs/IMPROVEMENTS.md` 검토 대기 항목).
- **표 구조 계약**: `ai-writing-editor`가 이 표를 읽기 전용으로 불러 쓴다(`ai-writing-editor/src/app/api/prompt-templates/route.ts`). 열 이름을 바꾸면 그쪽도 같은 작업에서 고친다.
- 템플릿 본문은 회원 소유 설정이므로 다른 회원·운영자 예제로 덮어쓰지 않는다. 보관함이 비었을 때 보여 주는 예제 9개(`src/data/templatePresets.ts`)는 회원이 저장하기 전까지 DB에 넣지 않는다.

## 6. 생성 AI별 내보내기 규칙

| 대상 | 내보내는 모양 | 지금 상태 |
|---|---|---|
| ChatGPT·Claude·Gemini 등 대화형 AI(설계 결과) | 마크다운 메타 프롬프트 한 덩어리, 원클릭 복사·.md 저장 | 구현(`ai-prompt-studio/src/components/ResultSection.tsx`). AI별 형식 변환(Claude용 XML·ChatGPT용 마크다운 토글)은 **미구현**(IMPROVEMENTS 5번 대기) |
| Midjourney | 영어 문장 + 파라미터(`--ar`·`--stylize` 등) 명령어 | 구현(리버스 `TARGETS.image`) |
| DALL·E / GPT Image | 자연어 문장형 | 구현 |
| Flux / Stable Diffusion | 쉼표로 잇는 태그형 | 구현 |
| Sora·Veo·Runway·Kling | 장면 서술 영어 문단(카메라·동작·오디오) | 구현 |
| Suno·Udio | 장르·분위기·악기 스타일 프롬프트 / 태그 | 구현 |
| 기계가 읽는 형식 | 구조화 JSON 파일 저장 | 구현(리버스 `Analyzer.tsx` 「JSON 파일 저장」) |

- 대상 도구 목록을 늘릴 때는 `reverse-prompt/src/lib/rpa/types.ts` `TARGETS`와 지시문(`src/lib/rpa/prompts.ts`)을 함께 고치고, 화면 문구·매뉴얼의 도구 수를 같은 작업에서 맞춘다(지금 문서 일부는 「10대」, 코드는 9종).
- 다른 생성 프로그램으로 넘길 때는 **글자만** 넘기고 받는 쪽에서 회원이 생성 버튼을 누르게 한다(자동 생성·자동 과금 금지). 길이 한도를 넘으면 잘라서 보내지 말고 「복사해서 줄여 쓰세요」로 안내한다.
- 이미지 생성 프롬프트의 **내용·스타일은 프로그램마다 고유**다. 이 카테고리의 지시문을 다른 프로그램에 복사하지 않고, 다른 프로그램의 지시문을 가져오지도 않는다([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md)). 사람이 나오는 이미지 프롬프트를 만들 때 원본에 근거가 없으면 한국인 묘사를 기본으로 한다(루트 CLAUDE.md 핵심 원칙 3). 단, 역설계는 원본 파일에 보이는 인물을 그대로 묘사한다.

## 7. 하지 않을 것

- **운영자·다른 회원의 키로 대신 실행하지 않는다.** 무료 공급자(Groq·OpenRouter 무료 모델·Cloudflare 무료 한도)도 회원 본인 계정 키를 쓴다(계정당 한도가 있음).
- **유료 모델로 자동 변경하지 않는다.** 고정한 무료 모델 목록 밖의 모델을 받으면 거부한다(`selectCompatible` 메시지 「유료 모델로 자동 변경하지 않습니다」).
- **임의 API 주소를 서버가 요청하게 하지 않는다**(공급자 주소는 코드에 고정, G-1 플랜).
- **AI 생성 결과를 「설정」으로 바꿔 30일 정리를 피하지 않는다.** 템플릿은 회원이 직접 저장한 것만 설정류다.
- **화면에 실제와 다른 보관 안내를 쓰지 않는다**(예: 「즐겨찾기는 유지」라고 쓰면서 30일 뒤 즐겨찾기도 지우는 것).
- **업로드 원본을 공개 버킷·공개 주소로 두지 않는다.** 권리가 없는 파일 분석을 권하지 않는다(매뉴얼에 「권리가 있는 파일만」 안내 유지).
- **회원 간 템플릿 공유·공용 템플릿 마켓을 만들지 않는다**(데이터 격리). 필요하면 백업 파일로.
- 병합된 원본(`prompt-template-studio`)에 새 기능을 넣지 않는다. 옛 주소는 지우지 않고 이동 안내·「AI Prompt로 옮기기」로 둔다.
- 상표·서비스 이름(Midjourney·Sora 등)은 대상 도구를 가리키는 용도로만 쓰고, 그 회사의 공식 도구처럼 보이게 하지 않는다.

## 8. 회원 본인 키 규칙 (AI 프롬프트 적용)

- AI Prompt: 설계·제안·변수 채우기·Gemini 실행은 `gemini` provider 하나(`ai-prompt-studio/src/lib/apiKeys.ts`). G-1(미배포)은 `groq`·`openrouter`·`cloudflare_workers_ai_token`·`cloudflare_account_id`를 공용 `user_api_keys`·`integration_catalog`에 추가해 문서 챗봇과 같은 값을 재사용한다(새 전용 저장소 금지, 화면에는 마스킹 값만).
- 리버스 프롬프트: `gemini` 하나. 영상·오디오는 Gemini Files API로 올린 뒤 분석이 끝나면 원격 파일을 바로 지운다(`reverse-prompt/src/lib/gemini.ts`).
- 키 원문은 브라우저로 보내지 않는다. 키 조회 API는 등록 여부와 마스킹 값만 돌려준다(`ai-prompt-studio/src/app/api/user-key/route.ts`).

## 9. 완성 보고 양식 (AI 프롬프트)

완성 보고에는 아래를 따로 적는다: 설계 모드·대상 도구별 확인 여부 / 내보내기(복사·.md·JSON·보내기 링크) 확인 여부 / 당해 연도 주입 확인(어느 호출) / 30일 정리·업로드 비공개 영향 / 회원 본인 키 확인(공급자별) / 연계(AI Prompt 템플릿 → AI 글쓰기 에디터, 리버스 → 바나나·이미지 스튜디오·스타일 분석기) 확인 여부 / 생성: 받는 프로그램에서(범위 밖) / 비용 리포트(빌드·AI 호출·누구 키).
