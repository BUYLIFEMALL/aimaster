# 마크다운 문서 자동화 — 인수인계

**다른 CLI가 새로 인수받으면 [작업 재개 인수인계](docs/CLI_HANDOFF.md)부터 읽으세요.** 완료 커밋, 코드 지도, 검수 구분, 승인 대기와 독립적으로 진행할 2단계, 바로 전달할 시작 문구를 정리했습니다. 2026-10-13 문서 인계 요청은 환경변수 등록 승인으로 해석하지 않습니다.

## 현재 상태

- 2026-10-13: 참고 사이트 공개 소스 조사, 독립 Chrome 기능 실험, 개발 계획 작성 완료.
- 같은 날 사용자 진행 지시로 **1단계 공통 틀·문서 모델 및 기본 작업 화면 구현**. 버전은 `src/lib/version.ts`의 **v1.01 출시 후보**, 운영 버전은 아직 없습니다.
- Next 16.4.0/React 19.3.0, Supabase 공통 로그인·권한, 회원별 IndexedDB, 문서/폴더 관리, 자동 저장·충돌 방지·30개 이력·휴지통, 정제 GFM 미리보기·모바일·원문 다운로드까지 구현했습니다.
- 빌드 정상, 자동 검사 14/14, 격리 Chrome UI 11/11, 실제 프로덕션 빌드의 설정 미등록 차단 검사 9/9, 패키지 취약점 0건. **실제 일반 회원 로그인·운영 배포 검수는 미실행**입니다.
- Vercel `buylife/markdown-studio` 생성·연결 완료. 환경변수 등록, DB 쓰기/스키마 변경, 카탈로그·도메인·썸네일·운영 배포는 하지 않았습니다. 표시명·FREE 정책도 출시 전 확정해야 합니다.
- `vercel link`가 자동 생성한 로컬 OIDC 전용 `.env.local`은 삭제했습니다. 토큰을 출력하거나 Git에 넣지 않았습니다. `.vercel/`, 환경변수, 시험 아티팩트는 Git 제외입니다.

- **2026-10-13 운영 연결 완료**: 인증 환경변수 3개 등록(승인), Vercel 프로덕션 배포, 도메인 `https://markdown-studio.buylife.xyz`, 프로그램 등록(마크다운 문서 자동화·FREE+new·v1.01). 관리자 계정 운영 검수 통과, 일반 회원(naver, VIP 등급) 운영 검수 통과(문서 격리·생성·입력·복원). 등급 없는 가입자·휴대폰 미등록 차단은 미확인. 상세: [docs/PROVISIONING_PLAN.md](docs/PROVISIONING_PLAN.md).

- **2026-10-13 v1.02 (3단계 완료)**: `.md/.txt` 파일·폴더 가져오기, 백업(JSON)·새 폴더 복원, HTML·PDF(한글 텍스트 PDF)·Word(표준 DOCX)·ZIP 내보내기. 단위 45·화면 11+13+10·런타임 9·취약점 0, 운영 배포·DB v1.02. 기록: [docs/PHASE3_IMPLEMENTATION.md](docs/PHASE3_IMPLEMENTATION.md). 남은 것: 4단계 본인 Google Drive, 5단계 썸네일·매뉴얼 등록, Word/Docs 표시·운영 실파일 다운로드 미확인.

- **2026-10-13 v1.03 (4단계 코드·모의 검수 완료)**: 회원 본인 Google Cloud 앱(Client ID)·본인 계정(drive.file)으로 Drive에 올리기·가져오기(ID 연결·충돌 보호·계정별 분리·재시도). 단위 56·화면 11+13+10+11·런타임 9·취약점 0, 운영 배포. **실제 Google/Drive 검증은 아직 없음(모의 Google 기준)** — [docs/PHASE4_IMPLEMENTATION.md](docs/PHASE4_IMPLEMENTATION.md)의 "실제 검수 절차" 참고.

- **2026-10-13 5단계(출시 정리) 완료**: 카탈로그 썸네일 등록, 카탈로그→앱 이동 확인(v1.03 유지). 남은 것은 실제 Google 검수·운영 실파일 다운로드·Word/Docs 표시 확인 등 — [docs/PHASE5_RELEASE.md](docs/PHASE5_RELEASE.md).

- **결정(2026-10-13)**: Google Drive는 **회원 각자 본인 Google Cloud 앱(Client ID) 등록 방식 유지, 운영자 공용 앱 사용 금지**(AIMaster 기본 정책). v1.04에서 전용 매뉴얼로 교체 — [docs/PHASE4_IMPLEMENTATION.md](docs/PHASE4_IMPLEMENTATION.md) "결정 기록".

## 읽는 순서

1. 루트 `AGENTS.md`·`CLAUDE.md`, `docs/HANDOFF.md`.
2. `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`, `docs/ERROR_LESSONS.md`, `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md`.
3. 이 프로젝트 `README.md`, `docs/REFERENCE_ANALYSIS.md`, `docs/DEVELOPMENT_PLAN.md`.
4. 공통 사이드바·SSO·과금·관리자 정책 지침.

## 반드시 이어받을 판단

- 원본은 브라우저에서 Markdown 편집·변환하는 도구입니다. AI 생성 API나 자체 문서 서버는 공개 번들에서 확인되지 않았습니다. 기본 기능에 불필요한 AI 호출을 넣지 않습니다.
- 기본 편집·변환은 로그인한 회원에게 제공하고, Google Drive는 **회원 본인 OAuth 앱과 계정**으로 연결합니다. 운영자 앱·키로 폴백하지 않습니다.
- 원본 그대로 가져오면 안 되는 문제: 검색 정규식 오류, Drive 실패 후 성공 알림, 이름 기반 덮어쓰기, 실제 양방향 읽기 미구현, 이미지 PDF, altChunk DOCX, 안내만 있고 없는 단축키, 강제 가운데 표 정렬, 모바일 폭 문제.
- `Marked + DOMPurify`의 변환·정제 구조는 유지할 수 있습니다. 원본의 고유 코드·가이드·브랜딩을 통째로 복제하지 않고 공개 동작을 참고하여 새로 구현합니다.
- 원본의 폴더 탐색기는 **문서 작업 영역 안**에 배치합니다. AIMaster 좌측 공통 메뉴와 회원·로그아웃 위치를 바꾸지 않습니다.
- 원본 수집물은 `D:/PDS/markdown-review-20261013/`에 있습니다. 다른 PC에서도 재개할 수 있도록 핵심 사실과 실험 결과는 이 폴더의 문서·JSON에 저장했습니다. 원본 번들 원문은 Git에 넣지 않았습니다.
- 실제 Google OAuth 성공·Drive 업로드/복원·Word/Google Docs에서의 시각 검수는 아직 하지 않았습니다. 모의 응답을 실제 외부 연동 성공으로 취급하지 않습니다.

## 다음 작업

0. **2단계 상세 플랜·인계 보완점은 [docs/PHASE2_PLAN.md](docs/PHASE2_PLAN.md)** (2026-10-13 Claude Code 작성, 구현 전).

1. [구현·검수 기록](docs/PHASE1_IMPLEMENTATION.md)과 [운영 설정안](docs/PROVISIONING_PLAN.md)을 읽습니다. AIMaster 인증 환경변수 3개의 새 프로젝트 등록 승인을 받은 뒤 실제 회원 검수·운영 배포를 진행합니다. 승인 없이 다른 프로젝트 설정을 복사해 등록하지 않습니다.
2. ~~고급 편집기~~ **완료(2026-10-13, Claude Code)**: CodeMirror 6, 서식 명령 20개·목록 3종+체크·기호 32종·표 편집·찾기/바꾸기·단축키·HTML 소스/목차/글자 수. 자동 검사 단위 31·화면 11+13·런타임 9·취약점 0. 기록: [docs/PHASE2_IMPLEMENTATION.md](docs/PHASE2_IMPLEMENTATION.md). 실제 회원 로그인·직접 한글 키보드 입력은 미검수.
3. ~~가져오기·백업·변환~~ **완료(v1.02)**: [PHASE3_IMPLEMENTATION](docs/PHASE3_IMPLEMENTATION.md) 참고.
4. 본인 Drive OAuth와 업로드/가져오기/충돌 처리. 별도 스키마가 필요하면 SQL을 준비하고 승인을 받습니다.
5. 일반 회원 SSO·본인 데이터·출력 결과를 검수한 뒤 카탈로그/기본 요금제 3개/썸네일/도메인/매뉴얼을 등록하고 운영 검증합니다.

`src/lib/programAccess.ts`·`src/lib/utils/phone.ts`는 루트 판정의 정확한 사본입니다. 루트가 변경되면 함께 동기화해야 하며 `tests/access.test.mjs`가 불일치를 감지합니다. 회원 세션은 작업 전·화면 재집중·60초마다 서버에서 확인합니다. 문서 저장은 리비전 비교를 포함한 IndexedDB 트랜잭션, 설정 저장은 순서대로 처리합니다. 실패 시 원고를 유지하고 저장 완료로 표시하지 않습니다.

검사 실행은 README 참고. `tests/browser-entry.tsx`는 시험 전용 진입점으로 실제 Next 라우트와 연결되지 않습니다. 시험용 회원 응답/쿠키를 운영 API에 넣지 않습니다. 저장소는 로컬 계정 분리이며 서버 RLS 또는 공유 OS 프로필에 대한 암호화라고 보고하지 않습니다.

다른 CLI가 수정하는 프로젝트·공용 스테이징을 건드리지 않습니다. Suno 검수는 사용자가 나중에 하기로 했으므로 재개하지 않습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.08 (markdown-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
