# AI 할 일·성과 관리 — 인수인계

## 현재 상태

- 2026-10-13: 주인님의 일괄 진행 지시로 v1.02 핵심 기록 기능과 운영 DB·공통 인증·카탈로그·요금제·도메인을 연결했습니다. 같은 승인을 재요청하지 않습니다.
- 빌드 정상, 단위/SQL14·보이는 격리 Chrome17·설정 미등록 프로덕션 차단12 검사 통과, 취약점0. 실제 운영 관리자 SSO·저장·타이머·완료·노트·JSON 다운로드 검수 완료. [구현 및 운영 결과](docs/PHASE1_IMPLEMENTATION.md).
- 프로그램: AI 할 일·성과 관리, https://ai-task-planner.buylife.xyz, v1.02, Tools·최소 일반·NEW(FREE 아님), 1/2/3개월 1/2/3만원. 기존 VIP 전체 프로그램 정책 연결. 시험 회원 buylifemall@naver.com은 비관리자이며 현재 VIP입니다.
- 회원별 JSONB 한행+revision+원자적RPC. 운영 SQL은 supabase/migrations/20261013065950_planner_workspace.sql 및 20261013075903_planner_catalog.sql. RLS 활성, 직접 회원 쓰기/RPC 불허, 이용 권한 확인한 서버 API만 저장합니다.
- 노트는 명시적 저장. AI 분석·모델선택·전용 키 등록 매뉴얼·전체백업 복원·CSV는 후속 구현입니다. 두 실제 기기·본인 Gemini 호출은 미검증입니다.
- 핵심 코드 f07031b5·운영 연결7fae5ee0·v1.02 수정7034debf 원격 푸시 성공. Vercel 프로덕션 `dpl_SsC7MPefdangHBA8dPLc4GemaaHb` READY, 운영 도메인 연결 완료. 검수 증거는 docs/evidence/release에 있습니다.
- 아래는 이전 분석 세션 기록이며 현재 상태와 구분합니다.

## 이전 분석 세션

- 2026-10-13: 주인님이 참고 URL의 전체 로직·옵션·결과 분석과 개발 계획을 요청했습니다. 구현 지시까지 받은 것으로 확대 해석하지 않습니다.
- 작업용 폴더 `ai-task-planner/`를 만들고 분석·계획·증거를 보관했습니다. 프로그램명·도메인·FREE/요금 정책은 미확정입니다. 현재 APP_VERSION·package.json·운영 등록은 없습니다. 첫 출시 버전 계획은 v1.01입니다.
- Drive 원본 ZIP 20개 파일 전수 열람. 실제 Chrome 원본 소스 재현 33개 관측 시나리오. **모의 Gemini만 사용**했습니다.
- 원본 AI Studio 화면 접근은 일반 웹 조회 실패·Aside 미실행·Orca computer 런타임 메타데이터 읽기 제한으로 미완료입니다. 로컬 Chrome 재현은 성공했습니다. 운영 미리보기 성공으로 보고하지 않습니다.
- `git fetch`는 `.git/FETCH_HEAD` 쓰기 권한 제한, `git ls-remote`는 GitHub 네트워크 제한으로 실패했습니다. 시작 시 로컬 HEAD와 기존 origin/master 참조는 `ac332a89`, 비교 `0 0`이지만 현재 원격 최신 확인은 아닙니다.
- 최종 문서 링크·증거 JSON·파일20개/시나리오33개·변경 공백 검사는 정상입니다. 이번 문서를 지정해 `git add`를 시도했으나 `.git/index.lock: Permission denied`로 실패해 커밋·푸시는 미완료입니다. 프로그램 구현·운영 배포는 이번 계획 요청 범위에서 실행하지 않았습니다.
- 원본은 `scratch/today-todo-reference/`에 로컬 보관했습니다. ZIP·소스·재현 번들을 Git에 포함하지 않습니다. 다른 PC에서 재개하면 동일 Drive 파일을 다시 읽고 manifest 해시와 대조합니다.

## 읽는 순서

1. 루트 AGENTS.md·CLAUDE.md, docs/HANDOFF.md.
2. docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, ERROR_LESSONS.md, AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md.
3. 이 README와 docs/REFERENCE_ANALYSIS.md·DEVELOPMENT_PLAN.md·evidence JSON.
4. 공통 SIDEBAR_LAYOUT_STANDARD.md, DOMAIN_SSO_POLICY.md, ADMIN_POLICY_GUIDELINES.md 및 대상 도구 스킬.

## 반드시 지킬 결정

- 엔진을 운영자 키로 구동하지 않습니다. 회원 본인 Gemini 키가 없으면 등록 안내합니다. 기본 할 일·타이머·수치 집계에 AI 호출이 필요하지 않습니다.
- 별도 회원가입/DB를 만들지 않습니다. AIMaster 공통 회원·프로그램 권한·핸드폰 등록 정책·SSO를 재사용합니다.
- 원본의 환경변수 `process.env.API_KEY`를 브라우저에서 사용하는 구조는 복제하지 않습니다. 회원별 키 조회와 Gemini 호출은 서버에서 처리합니다.
- 원본의 다크 작업 화면은 흰색 작업 화면으로 바꿉니다. 표준 공통 사이드바·마지막 메뉴 바로 아래 계정/로그아웃을 유지합니다.
- 첫 출시 목표는 날짜별 할 일·정확한 집중 기록·성과 노트·집계·Gemini 분석·JSON/CSV 백업입니다. 반복 일정·외부 캘린더·팀 공유·Chrome 확장은 별도입니다.
- 원본 데모 작업 3개를 실제 회원의 기록으로 자동 생성하지 않습니다.
- 서버 기록 보존을 구현하고 승인 범위의 스키마/공통 인증 설정을 적용했습니다. 새로운 스키마·비밀 변경은 별도 승인 대상입니다.
- 원본 기능과 신규 개선안, 소스 판단과 실제 관측, 모의 응답과 유료 공급사 실제 응답을 구분합니다.

## 다음 작업

비관리자 시험 회원의 실제 로그인 세션과 두 실제 기기 검수는 남아 있습니다. 현재 실제 Chrome 세션은 관리자이므로 비관리자 검수를 완료했다고 쓰지 않습니다. 비밀번호 입력·인증 우회 없이 시험 계정 세션이 제공되면 검수합니다. AI 분석/모델선택·연동 매뉴얼·전체백업 복원/CSV는 DEVELOPMENT_PLAN의 후속 단계입니다. 회원 본인 Gemini 키 등록·실제 호출은 AI 기능 구현 단계에서 확인합니다.

원본의 주요 재현 오류: 헤더 PAUSE 초기화, 카드 Pause 재시작, 시작 후 미완료 유지, 완료/삭제 후 계속 실행, 수정 저장 시 실제 시간 역행, 기본 카테고리 삭제 후 표시/실제 저장값 불일치, 전체 예약어 중복, 무저장 자동 저장 문구, 불완전 AI JSON 화면 소실. 수정 코드와 의미 있는 검수는 같은 단계에서 함께 만듭니다.
