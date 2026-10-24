# 업무자동화 프로그램 부분 통합·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 담당 세션(`workspace`·`docbot-prompt`)과 담당이 없는 프로그램의 다음 작업 세션이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 담당 역할: [`docs/roles/workspace.md`](roles/workspace.md)(`ai-work-workspace`, Claude Code 윈도우), [`docs/roles/docbot-prompt.md`](roles/docbot-prompt.md)(`ai-doc-chatbot`, Codex 윈도우). 나머지 7개 프로그램은 담당 역할이 없다.

**담당 세션이 지금 작업 중인 폴더(`ai-work-workspace/`, `ai-doc-chatbot/`)는 이 작업표를 근거로 다른 세션이 손대지 않는다.** 해당 줄은 역할 파일을 그대로 옮긴 것이다.

## 우선 처리 (회원에게 실제 피해가 갈 수 있는 것)

> **🗣 주인님(관리자) 지시 — 2026-10-24, 절대 지시: 전자책(`ebook-studio`)은 「본인 개인 API를 등록한 뒤 사용」해야 한다.** WA-U1~U3·U6을 고칠 때 아래를 완료 기준으로 삼는다.
> - 회원 Gemini 키는 브라우저 `localStorage`·요청 본문이 아니라 공용 `user_api_keys`(회원별, 서버 저장)에서만 읽는다. 키가 없으면 실행하지 말고 「API키등록·플랫폼연동」 화면으로 안내한다(운영자 키 폴백 금지). 기존 `localStorage` 키는 등록 화면으로 옮기도록 안내하고 지운다.
> - 웹 주소 가져오기·AI 장 집필·목차·표지 API 전부 `checkProgramAccessApi()`(로그인 + 프로그램 이용 권한) 통과 뒤에만 실행하고, `dynamic`·`fetchCache` 두 줄을 넣는다. 웹 주소 가져오기는 사설·내부 주소를 막는다.
> - 구형 `gemini-1.5-*` 선택지는 `ai-image-studio`·공용 모델 목록 기준으로 바꾼다.
> - 담당: 아직 없음(주인님이 나중에 지정). 구현·배포는 담당 세션이 플랜 보고 뒤 진행한다.


| ID | 프로그램 | 문제 | 근거 경로 | 영향 | 현재 상태 |
|---|---|---|---|---|---|
| WA-U1 | `ebook-studio` v1.12 | **웹 주소 가져오기 API에 로그인·권한 확인이 없고, 서버가 아무 주소나 가져온다**(내부망·사설 주소 차단 없음, 한 번에 12개) | `ebook-studio/src/app/api/scrape/route.ts`(import가 `next/server`뿐) | 비회원도 운영 서버를 남의 사이트·내부 주소 요청에 쓸 수 있음(서버 요청 위조 위험, 운영 서버 비용) | 확인 필요(담당 없음) — 수정 전 주인님 승인 |
| WA-U2 | `ebook-studio` v1.12 | **AI 장 집필·목차·표지 API가 프로그램 권한 판정 없이 `getUser`만 쓰고, 로그인하지 않아도 브라우저가 보낸 키로 실행된다** | `ebook-studio/src/app/api/ai/chapter/route.ts`·`outline/route.ts`·`cover/route.ts`(`checkProgramAccessApi`는 `src/lib/access.ts`에 있지만 API에서 안 부름), `src/app/api/user/key/route.ts` | 권한 없는 회원·비회원이 기능을 우회 사용(멀티테넌시 원칙 1번 위반) | 확인 필요(담당 없음) |
| WA-U3 | `ebook-studio` v1.12 | 회원 Gemini 키를 브라우저 `localStorage`에 저장하고 요청 본문으로 서버에 보냄 | `ebook-studio/src/components/modals/SettingsModal.tsx`(`ebook_studio_gemini_api_key`), `api/ai/chapter/route.ts`(`apiKey: clientKey`) | 공용 PC·확장 프로그램에서 키 노출 위험, 서버 저장 키와 이중 관리 | 확인 필요 |
| WA-U4 | `ai-writing-editor` v1.13 | **회원이 올린 이미지가 공개 버킷에 저장되고 공개 주소로 쓰인다** | `ai-writing-editor/supabase/migrations/0003_content_type_and_images.sql`(`public = true`), `src/lib/images.ts`(`getPublicUrl`) | 주소를 아는 누구나 회원 이미지를 볼 수 있음(생성 데이터 격리 원칙 위반) | 확인 필요 — 버킷 변경은 DB 변경 승인 필요 |
| WA-U5 | `ai-writing-editor` v1.13 | AI 초안 문서가 30일 자동 삭제가 아니라 「회원당 30개(오래된 것부터 정리)」로만 관리된다 | `ai-writing-editor/src/lib/documents.ts` 7행 주석·`deleteDocument` | 생성 데이터 30일 자동 삭제 원칙 미적용(오래 안 쓰는 회원 자료가 계속 남음) | 주인님 결정 필요(완성 기준 §8-2) |
| WA-U6 | `ebook-studio` v1.12 | 모델 선택지에 구형 `gemini-1.5-flash`·`gemini-1.5-pro`가 남아 있다 | `ebook-studio/src/components/modals/SettingsModal.tsx` 155·156행 | 고르면 생성 실패할 수 있음(회원 키 호출 실패 — 과금 여부 확인 필요) | 확인 필요 |
| WA-U7 | (공용 스테이징) | 2026-10-24 이 문서 작성 중 확인: 공용 `.git/index`에 문서 챗봇 G-2 파일 10개가 「삭제」로 올라가 있다(HEAD `07795803c`에는 있음, 작업 폴더에도 있음, 전체 인덱스 수 11,883개는 정상) | `git diff --cached --name-status`(D: `ai-doc-chatbot/src/lib/bots/core.ts`·`store.ts`, `src/app/api/bots/route.ts`, 마이그레이션 `20261024085152_g2_member_bots.sql`, 시험 3개, 문서 2개) | 누군가 경로 없이 커밋하면 G-2 코드가 저장소에서 지워짐 | **보고만**(고치지 않음 — 최상위 규칙 ④). 담당 `docbot-prompt`·주인님 확인 필요 |
| WA-U8 | `ai-work-workspace` | 코드 v1.10, 운영 DB `programs.version` v1.07, 버전 SQL 파일 v1.07까지 | `ai-work-workspace/src/lib/version.ts`, `docs/roles/workspace.md` | 회원 화면과 메인 사이트 버전 표시 불일치 | **확인 필요(담당)** — 주인님 결정 대기 |

당해 연도 프롬프트는 AI를 쓰는 7개 프로그램 모두 코드에서 확인됐다(비교표 §2-6). 다른 회원 데이터 공유는 이번 점검에서 발견하지 못했다(서비스 키 사용 코드의 `user_id` 필터는 표본만 확인 — 전수 점검은 아님).

## 현재 위치와 읽는 순서

1. [업무자동화 완성 기준](WORK_AUTOMATION_COMPLETION_POLICY.md) — 끝났다고 말할 조건·회원 선택 항목·하지 않을 것·보관 원칙.
2. [업무자동화 기능 상세 비교표](WORK_AUTOMATION_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치.
3. [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-TL-01~07 — 원본 분석 결과.
4. 프로그램별 기록: 각 폴더 `AGENTS.md`·`docs/IMPROVEMENTS.md`, 워크스페이스 로드맵 `ai-work-workspace/docs/PLAN_20261024_EXPANSION_ROADMAP.md`, 챗봇 플랜 `docs/analysis-autogemma-starter-20261024/PLAN_G1_G5_20261024.md`.

**2026-10-24 요약:** 카탈로그 업무자동화는 운영 9개 + 병합된 원본 1개(`persona-style-studio`, 이동 안내·API 410)다. 병합은 B 하나(페르소나 → 글쓰기)만 끝났고, 나머지는 독립 유지다. 진행 중인 큰 작업은 워크스페이스 로드맵(U1~U14)과 챗봇 G-1~G-5 두 줄이다.

## 유지할 역할

| 프로그램 | 맡는 일 | 담당 역할 |
|---|---|---|
| `ai-work-workspace` | 문서·데이터베이스·AI 비서를 한곳에(노션형) | `workspace` |
| `ai-task-planner` | 개인 할 일·집중 시간·성과 | 없음 |
| `document-translator` | 문서 번역·검수 | 없음 |
| `file-merge` | 엑셀·텍스트 합치기·나누기(AI 없음) | 없음 |
| `ebook-studio` | 여러 자료를 전자책으로 | 없음 |
| `ai-doc-chatbot` | 내 문서 근거 답변 | `docbot-prompt` |
| `ai-writing-editor` | 범용 AI 글쓰기·문체 바꾸기(병합 기준) | 없음 |
| `markdown-studio` | 마크다운 작업실·Drive 동기화(AI 없음) | 없음 |
| `ai-slide-builder` | 문서 → 발표 슬라이드 PPTX | 없음 |

## 순차 작업 표 — 끝난 병합·주요 작업

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**로 구분한다.

| ID | 대상과 범위 | 근거 커밋·버전 | 현재 상태 |
|---|---|---|---|
| WA-M1 | 병합 B: 페르소나 문체 → 글쓰기 「🎚️ 문체 바꾸기」, 페르소나 이동 안내·API 410 | `85020e791` · 글쓰기 v1.11 · 페르소나 v1.09~v1.10 | ✅ 완료(초안 저장·영어 화면 이관 여부는 확인 필요 — 비교표 §3) |
| WA-M2 | 글쓰기: AI Prompt 보관함 템플릿 불러오기(읽기만) | 글쓰기 v1.12 — 코드 커밋 **확인 필요**(인수인계 `fb77a965f`) | ✅ 완료(인수인계 기록 기준) |
| WA-M3 | 워크스페이스 U1·U2(1단계 신규) | 워크 v1.01~v1.04 — 커밋 **확인 필요** | ✅ 완료(역할 파일) |
| WA-M4 | 워크스페이스 U3: 회원 본인 OpenAI·Claude 키로 AI 비서 | `24c8602ba` · 워크 v1.05 | ✅ 완료(역할 파일) |
| WA-M5 | 워크스페이스 U4: 회원 Gemini 키·모델 목록·AI 채팅 30일 삭제·`AQ.` 키 형식 | `304f2ccb1`·`8dd6398e5`·`8c269894a` · 워크 v1.06 | ✅ 배포(유료 시험은 대기 — 아래) |
| WA-M6 | 워크스페이스: 표준 로그인·가입 2탭, 가입 링크 404 수정 | `4e717d888`·`72ad69198` · 워크 v1.07 | ✅ 완료 |
| WA-M7 | 워크스페이스: 디자인 리뉴얼(디자인 역할 작업) | `d9b975c95` · 워크 v1.10 | 배포됨 — 화면 검수 대기(아래) |
| WA-M8 | 7개 프로그램 Next.js 보안 업데이트 | 할일 `47d4069b7` v1.10 · 번역 `b54d50c97` v1.22 · 합치기 `f068726bb` v1.08 · 전자책 `be64bc2ce` v1.12 · 글쓰기 `8945c86b7` v1.13 · 마크다운 `a2be5de6b` v1.21 · 슬라이드 `0aac6f993` v1.11 · 페르소나 `94a099d10` v1.10 | ✅ 완료(커밋 기록 기준, 운영 Ready 여부는 각 인수인계 확인) |

## 담당 세션 진행 중 (역할 파일 그대로)

| ID | 프로그램 | 작업 | 기다리는 것 | 근거 |
|---|---|---|---|---|
| WA-W1 | `ai-work-workspace` | 운영 DB 버전 v1.10 맞추기 + 버전 SQL 파일 추가 | 주인님 결정 | `docs/roles/workspace.md` |
| WA-W2 | `ai-work-workspace` | U4 Gemini 유료 시험(시험 계정 본인 키, 가장 싼 모델 10~20회) | 주인님 「진행해」 | `ai-work-workspace/docs/PLAN_20261024_U4_GEMINI_RETENTION.md` §4 |
| WA-W3 | `ai-work-workspace` | 폴더 인수인계 문서에 U4·로그인 표준화 반영 | 다음 작업 때 | 루트 HANDOFF |
| WA-W4 | `ai-work-workspace` | OpenAI 모델 목록 캐시를 회원 키별로 나누기(원본은 모든 회원 공용 목록) | 다음 작업 때, 배포는 다음 배포 때 | 역할 파일 |
| WA-W5 | `ai-work-workspace` | v1.10 디자인 리뉴얼 화면 검수(로그인·온보딩·사이드바·가이드·휴대폰 폭) | 다음 작업 때 | `ai-work-workspace/docs/DESIGN_HANDOFF.md` |
| WA-W6 | `ai-work-workspace` | AI 화면 원본 영어 문구 한국어화 | 디자인 역할과 조율 | `docs/roles/design.md` |
| WA-W7 | `ai-work-workspace` | U6 AI 회의록 → U7 업무 받은편지함(DB 변경 승인 필요) → U8~U12 | 앞 단계 운영 확인 뒤 | 로드맵 §5 |
| WA-C1 | `ai-doc-chatbot` | G-1 여러 답변 공급자·회원 공용 키·중단 | **미배포**, 새 공급자 키는 주인님이 나중에 등록 | `2d56a117b`, `docs/PENDING_DEPLOYS.md` |
| WA-C2 | `ai-doc-chatbot` | G-2 회원별 봇·방 선택·당시 답변 설정 보존 — 일반 회원 Edge 봇 CRUD/재열기/선택/삭제된 봇·키 미등록 안내 확인·시험 봇 정리 | **미배포**, 실제 방/답변/당시 설정·좁은 화면 검수 남음 | `07795803c`, [G-3 후속](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G3.md) |
| WA-C3 | `ai-doc-chatbot` | G-3 역할·입력/자료 경계·과거 날짜 보존·기본 번역/요약 자동 검색 생략. 기존 혼합 검색 보존 | **미배포**, G-4와 함께108개 시험·타입·로컬 빌드 통과. 실제 AI는 본인 키 준비 후 | `d7dd0d367`, [G-4 후속](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G4.md) |
| WA-C4 | `ai-doc-chatbot`·`ai-prompt-studio` | G-5 로컬 Ollama | 보류 / 사전 검증 페이지 / 정식 결정 | 담당 플랜 |
| WA-C5 | (관리자 요청함) | 결과·필요 요청을 `report`/`ask`와 채팅 양쪽에 기록 | 2026-10-24 23:55부터 정상 조회·등록 확인, 로그인도 확인됨 | 역할 파일·[당시 결과](HANDOFF.md) |
| WA-C6 | `ai-doc-chatbot` | G-4 여러 문서/분류/미리보기/PDF 경고, 운영 DB/RLS·일반 회원 무료 조작 확인 | **미배포** `952417454`, 108개 검사·타입·로컬 빌드. 실제 AI/업로드·파싱·좁은 화면 검수 후 묶음 배포 | [인수인계](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G4.md) |

## 대기·후속 (담당 없는 프로그램, 다음에 할 일 후보)

| ID | 대상과 범위 | 선행·기다리는 것 | 현재 상태 |
|---|---|---|---|
| WA-F1 | 전자책 WA-U1~U3·U6 한 번에 고치기(API 권한 판정·스크랩 로그인·사설 주소 차단·키 서버 저장만·구형 모델 정리) | 주인님 승인·플랜 | 후보 |
| WA-F2 | 글쓰기 WA-U4·U5(비공개 버킷·서명 주소·문서 30일 정리) | 주인님 결정(DB 변경) | 후보 |
| WA-F3 | 슬라이드 `api/keys` 저장에도 프로그램 권한 판정 넣기(지금은 로그인만) | 다음 슬라이드 배포 때 | 확인 필요 |
| WA-F4 | 슬라이드 미배포 대기분 배포(좌측 메뉴 계정 위치, `22c6cda35`) | 다음 슬라이드 배포 | 미배포 대기 |
| WA-F5 | 할 일·성과 관리 기록 보관 기간(회원 직접 기록을 30일 대상으로 볼지) | 주인님 결정(완성 기준 §8-1) | 확인 필요 |
| WA-F6 | 페르소나 옛 DB 자료(페르소나·초안 표) 정리 여부 | 주인님 결정(삭제는 승인 필요) | 확인 필요 |
| WA-F7 | 번역·글쓰기·슬라이드·전자책에 G-1 공용 공급자 재사용 | G-1 배포·검수 뒤 | 후보 |
| WA-F8 | 전자책·마크다운·슬라이드 브라우저 저장 자료의 서버 보관 여부 | 주인님 결정(완성 기준 §8-3) | 후보 |
| WA-F9 | 「문서 워크스페이스」로 묶기 검토(개발분석표 J 묶음) | 주인님 지시 | 미검토 |
| WA-F10 | 번역 숫자·URL 대조, 워크스페이스 첨부 저장 위치·알림 기능 열림 여부 등 비교표 「미확인」 칸 확정 | 다음 작업 세션 | 확인 필요 |

## 항목마다 지킬 완료 조건

1. 착수 직전 `node scripts/dev-requests.mjs list`, `docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다. 담당 역할이 있는 폴더는 담당 세션만 고친다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](WORK_AUTOMATION_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. 무료·모의 검사부터 하고, 실제 AI 시험은 시험 계정 본인 키로 승인된 횟수만 한다(가장 저렴한 모델).
4. 회원 본인 키만, 회원별 비공개 저장, 생성일 기준 30일 정리, 당해 연도 프롬프트를 지킨다.
5. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 `src/lib/version.ts` + DB `programs.version`).
6. 커밋은 항상 경로를 지정한다(`git commit -m "…" -- <경로>`, 공용 문서는 `node scripts/safe-commit.mjs`). 커밋 뒤 `git show --stat HEAD | tail -1`을 확인한다.
7. 완료 시 이 표의 상태·근거 커밋, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 역할 파일, 루트 `docs/HANDOFF.md`(제목에 `[역할: <ID>]`)를 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서 「대기·후속」에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md))에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다.

## 프로그램 주소

주소는 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드 기준이며, 이번에 운영 DB `programs.app_url`과 대조하지 않았다(확인 필요).

https://ai-task-planner.buylife.xyz

https://ai-work-workspace.buylife.xyz

https://document-translator.buylife.xyz

https://file-merge.buylife.xyz

https://ebook-studio.buylife.xyz

https://ai-doc-chatbot.buylife.xyz

https://ai-writing-editor.buylife.xyz

https://markdown-studio.buylife.xyz

https://ai-slide-builder.buylife.xyz

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 우선 처리 8줄·끝난 작업 8줄·담당 진행 12줄·대기 10줄 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
