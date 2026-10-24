# AI 프롬프트 프로그램 부분 통합·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 담당 세션이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 담당 역할: `ai-prompt-studio`는 [`docs/roles/docbot-prompt.md`](roles/docbot-prompt.md)(Codex 윈도우 `codex-win-20261024-docbot-g2`, 지금 `ai-doc-chatbot` G-2 작업 중), `reverse-prompt`는 **담당 역할 없음**(최근 작업은 이미지 묶음 Claude Code 윈도우). **담당 세션이 `ai-prompt-studio/` 작업 중이므로 이 표를 근거로 그 폴더를 다른 세션이 고치지 않는다.**

## 현재 위치와 읽는 순서

1. [AI 프롬프트 자동화 완성 기준](AI_PROMPT_COMPLETION_POLICY.md) — 끝났다고 말할 조건·회원 선택 항목·당해 연도·템플릿 형식·생성 AI별 내보내기·하지 않을 것.
2. [AI 프롬프트 기능 상세 비교표](AI_PROMPT_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치. 항목을 시작하기 전에 읽고, 배포한 기능은 그 표의 칸을 고친다.
3. [AutoGemma 참고 G-1~G-5 플랜](analysis-autogemma-starter-20261024/PLAN_G1_G5_20261024.md) · [G-1 결과](analysis-autogemma-starter-20261024/G1_IMPLEMENTATION_20261024.md) · [담당 인수인계](analysis-autogemma-starter-20261024/HANDOFF_20261024_DOCBOT_PROMPT.md).
4. 프로그램별 기록: `ai-prompt-studio/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_HANDOFF_20261024_G1.md`·`docs/PLAN_20261021_MERGE_C_PROMPT_TEMPLATES.md`, `reverse-prompt/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`.

**2026-10-24 요약:** 병합 C(템플릿 → AI Prompt)는 완료됐다(v1.07·v1.08). G-1(여러 공급자)은 코드·운영 DB 준비까지 끝났지만 **미배포**(v1.09 유지)이고, 새 공급자 실검수는 주인님이 키를 나중에 등록하기로 해 멈춰 있다. G-2~G-4는 문서 챗봇 쪽 작업이며 AI Prompt는 G-2 「봇을 Prompt에 두는 안」이 채택되지 않아(추천안 = 문서 챗봇 채팅방) 영향이 작다. G-5는 주인님 결정 대기다.

## 우선 처리 (회원에게 실제 영향이 갈 수 있는 것 — 담당 확인 필요)

| ID | 대상 | 문제 | 근거 | 영향 | 추천 처리 |
|---|---|---|---|---|---|
| AP-U1 | 리버스 | 기록 화면이 「최근 100건까지 보관합니다(즐겨찾기는 유지)」라고 안내하지만, 30일 정리는 즐겨찾기를 포함해 생성일 30일이 지난 기록을 모두 지운다 | `reverse-prompt/src/components/workspace/HistoryList.tsx` 48행, `src/app/api/cron/cleanup/route.ts`(v1.11 주석 「즐겨찾기 포함」) | 회원이 즐겨찾기가 남는다고 믿고 30일 뒤 기록을 잃음 | 문구를 「생성일로부터 30일 뒤 자동 삭제(즐겨찾기 포함) · 최근 100건 표시」로 정정, 다음 리버스 배포에 묶음 |
| AP-U2 | 설계 | API 세 곳에 캐시 방지 두 줄(`dynamic`·`fetchCache`)이 없다 — 루트 규칙상 필수 | `ai-prompt-studio/src/app/api/ai-suggest/route.ts`, `generate-prompt/route.ts`, `user-key/route.ts` | 실제 위험은 낮음(앞 두 곳은 POST, `user-key` GET은 로그인 쿠키를 읽어 동적으로 동작할 가능성이 큼). 규칙 위반이라 확인 필요 | 담당(docbot-prompt)이 G-1 배포 때 두 줄 추가, 배포 뒤 `X-Vercel-Cache` 확인 |
| AP-U3 | 리버스 | 30일 정리 회원별 기록이 문서에는 「미배포 대기」인데, 그 커밋(`f53021369`) 뒤에 v1.14 보안 배포(`d55f4d281`)가 있었다 | `reverse-prompt/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」, `docs/PENDING_DEPLOYS.md` 35행 | 배포됐는데 표시만 남았거나, 실제로 안 나갔을 수 있음(관리자 정리 기록 진행률이 틀림) | 다음 정리 시각 뒤 관리자 「30일 자동 정리」 표에 `reverse-prompt` 줄이 생기는지 확인 → 문서 정리 |

당해 연도 누락·로그인 없이 열림·다른 회원 결과 공유는 이 카테고리 코드에서 **발견하지 못했다**(§2-2·§2-6 근거).

## 유지할 역할과 이관 방향

| 유지할 프로그램 | 담당 역할 | 흡수한 장점 | 원본 도구 처리 |
|---|---|---|---|
| AI Prompt 자동화 (`ai-prompt-studio`) | 글 아이디어 → 대화형 AI용 프롬프트 설계·보관·실행 | 템플릿 앱의 보관·`{{변수}}`·AI 채우기·바로 실행·백업 | `prompt-template-studio`는 비공개·이동 안내(주소 유지, 옛 AI API 410) |
| AI 리버스 프롬프트 자동화 (`reverse-prompt`) | 파일 → 생성 AI용 프롬프트 역설계 | 독립 유지, 이미지 프로그램들과 연결 | 독립 유지 |

## 순차 작업 표 — 병합 C (2026-10-21)

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**로 구분한다.

| ID / 순서 | 대상과 구현 범위 | 근거 커밋·버전 | 현재 상태 |
|---|---|---|---|
| AP-C1 | 템플릿 → 설계: 「📁 내 템플릿 보관함」, 표 `ai_prompt_templates`(RLS 본인만), API 4종, 옛 앱 옮기기·옛 AI API 410, 옛 앱 숨김·FREE 해제 | `f0a3f529e` · 설계 v1.07 · 템플릿 v1.06 | ✅ 완료(크롬 관리자 검수, 2026-10-21 일반 회원 실호출 확인) |
| AP-C2 | 설계: 결과 저장 때 `{{변수}}` 자동 제안(체크한 것만) | `b1687b6d` · v1.08 | ✅ 완료(일반 회원 크롬 검수) |
| AP-C3 | 설계: 좁은 칸 버튼 줄바꿈 수정 | v1.09 | ✅ 완료 |

## 순차 작업 표 — AutoGemma 참고 G-1~G-5 (담당: docbot-prompt)

| ID | 대상과 구현 범위 | AI Prompt 영향 | 근거 | 현재 상태 |
|---|---|---|---|---|
| AP-G1 | 여러 공급자 공용 호출(Groq·OpenRouter·Cloudflare, NVIDIA 비활성) + 회원 공용 키(`integration_catalog`·`user_api_keys`) | 템플릿 실행에 공급자·모델 선택(설계·제안·자동 채우기는 Gemini 유지), 공용 키 등록 화면 | `2d56a117b`, `ai-prompt-studio/docs/IMPROVEMENT_HANDOFF_20261024_G1.md` | ⏸ **미배포**(v1.09 유지). 65개 시험·타입·로컬 빌드 통과, 운영 DB 준비, Edge 관리자 모달 확인. 남음: 일반 회원·키 재사용·실제 실행·좁은 화면. **주인님: 새 키는 나중에 등록** |
| AP-G2 | 커스텀 봇·내장 봇 | 추천안은 문서 챗봇 채팅방(진행 중). Prompt 쪽 저장은 없음 — 연계 시 `ai_prompt_templates`·AI 글쓰기 에디터 계약 유지, 일방향 가져오기부터 | `ai-doc-chatbot/docs/PLAN_20261024_G2_BOTS.md` | 문서 챗봇 구현·미배포(역할 파일) |
| AP-G3 | 역할 유지·입력 처리 지침 | 템플릿 실행에 같은 원칙(자료 속 지시를 시스템 명령으로 보지 않음)을 쓸지 검토 | 플랜 §G-3 | 대기(G-2 검수 뒤) |
| AP-G4 | 문서 근거 보강 | 없음(문서 챗봇 전용) | 플랜 §G-4 | 대기 |
| AP-G5 | 회원 PC 로컬 Ollama | 두 프로그램 공통 후보, 사전 검증 페이지부터 | 플랜 §G-5 | 주인님 결정 대기(보류/사전 검증 페이지/정식) |
| AP-G6 | 묶음 배포 | 설계 v1.10 후보(G-1~ 묶음 1회) — 배포 직전 다른 세션 변경·최신 버전 재확인, 코드+DB 함께 +0.01 | 플랜 §6 | 대기 |

## 리버스 프롬프트 완료 기록

| ID | 내용 | 근거 커밋·버전 | 현재 상태 |
|---|---|---|---|
| AP-R1 | 스타일 분석기와 양방향 연결 + 30일 자동 삭제 + 버전 맞추기 | v1.11 | ✅ 완료 |
| AP-R2 | 바나나 캔버스로 보내기(공용 사본 `bananaIdeaLink.ts`) | v1.12 | ✅ 완료 |
| AP-R3 | 이미지 스튜디오에서 생성 링크 | v1.13 | ✅ 완료 |
| AP-R4 | Next.js 보안 업데이트 | `d55f4d281` · v1.14 | ✅ 완료 |
| AP-R5 | 30일 정리 회원별 기록 | `8ad8ea2e5`·`f53021369` | ⏳ 배포 여부 확인 필요(AP-U3) |

## 대기·후속 (다음에 할 일 후보)

| ID | 대상과 범위 | 선행·기다리는 것 | 현재 상태 |
|---|---|---|---|
| AP-W1 | 설계: 대화형 AI별 형식 변환 토글(Claude XML·ChatGPT 마크다운) | 담당 판단 | 대기(IMPROVEMENTS 5번) |
| AP-W2 | 설계: 토큰·글자 수 계산기 | 담당 판단 | 대기(IMPROVEMENTS 6번) |
| AP-W3 | 설계: 메타 프롬프트 설계·템플릿 API의 `gemini-2.5-flash` 고정 → 리버스식 모델 폴백 체인 | 구형 모델 종료 공지 확인 | 후보 |
| AP-W4 | 리버스 → 설계: 역설계 결과를 「내 템플릿」으로 저장(일방향) | 두 담당 합의 | 후보 |
| AP-W5 | 리버스: 썸네일 마스터·패션 스타일로 보내기 | 받는 쪽 주소 형식 | 대기(`IMPROVEMENT_BACKLOG.md`) |
| AP-W6 | 리버스: 원본·프롬프트 나란히 보기, 단어 가중치 슬라이더, 기록 검색·필터 | 담당 지정 | 대기(`IMPROVEMENT_BACKLOG.md`) |
| AP-W7 | 리버스: 다른 AI 공급자(회원 키) 선택 | G-1 공용 모듈 재사용 검토 | 대기 |
| AP-W8 | 리버스 담당 역할 지정 | 주인님 지정 | 확인 필요 |
| AP-W9 | 문서 정리: 설계 AGENTS 「현재 버전 v1.08」·「50종 프리셋」, 리버스 AGENTS 「최신 v1.10」·「10대 도구」, 템플릿 AGENTS v1.06을 코드와 맞춤 | 각 담당 다음 작업 때 | 확인 필요 |

## 항목마다 지킬 완료 조건

1. 착수 직전 `node scripts/dev-requests.mjs list --role <역할>`·`docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다. `ai-prompt-studio/`는 지금 담당(docbot-prompt)만 고친다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](AI_PROMPT_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. 무료·모의 검사부터 하고, 실제 AI 시험은 시험 계정 본인 키로 승인된 횟수만 한다(가장 저렴한 모델).
4. 회원 본인 키만, 회원별 저장·RLS, 생성 결과 30일 정리, 당해 연도 주입을 지킨다. 공용 사본(`compatibleChat/`·`cleanupUsageLog.ts`·`bananaIdeaLink.ts`)은 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.
5. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 `src/lib/version.ts` + DB `programs.version`).
6. 완료 시 이 표의 상태·근거 커밋, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 역할 파일, 루트 `docs/HANDOFF.md`(제목에 `[역할: <ID>]`)를 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서 「대기·후속」에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md))에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다(리버스 원본은 EXT-TL-09).

## 프로그램 주소

https://ai-prompt.buylife.xyz

https://reverse-prompt.buylife.xyz

https://prompt-template.buylife.xyz (이동 안내)

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 병합 C 3줄, G-1~G-5·묶음 배포 6줄, 리버스 완료 5줄, 우선 처리 3줄, 대기 9줄 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
