# 마크다운 문서 자동화 — 인수인계

**다른 CLI가 새로 인수받으면 [작업 재개 인수인계](docs/CLI_HANDOFF.md)부터 읽으세요.** 완료 커밋, 코드 지도, 검수 구분, 승인 대기와 독립적으로 진행할 2단계, 바로 전달할 시작 문구를 정리했습니다. 2026-10-13 문서 인계 요청은 환경변수 등록 승인으로 해석하지 않습니다.

## 현재 상태

- **2026-10-17 v1.11 (로그인·회원가입 표준 2탭 레이아웃 전면 리뉴얼, Antigravity)**:
  - 2026-10-17 주인님 지시 표준 레이아웃 적용: 은은한 24px 모눈 격자 배경(`linear-gradient(...)` 24px x 24px), 상단 브랜드 헤더, 둥근 모서리 카드, 상단 2버튼 알약 탭 토글 바(`[로그인]` / `[회원가입]`) 전면 구현 (`src/app/login/page.tsx`).
  - **로그인 탭**: 이메일 주소(메일 아이콘), 비밀번호(자물쇠 아이콘 + "비밀번호 찾기?"), 풀 위드 딥 인디고 `로그인 ->` 액션 버튼.
  - **회원가입 탭**: "이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다..." 안내 문구 및 풀 위드 `AIMaster 회원가입 하러가기` 버튼 탑재.
  - **하단 푸터**: 이용약관 및 개인정보 처리방침 링크 탑재.
  - Next.js 16.4.0 Turbopack 로컬 빌드 검증 성공 및 Supabase DB `programs.version = 'v1.11'` 갱신 완료.
  - Microsoft Edge(엣지) 전용 브라우저로 데스크톱(1440px) 및 모바일(390px) 로그인/회원가입 실세션 화면 검수 완료.
  - Vercel 프로덕션 배포 완료 (`https://markdown-studio.buylife.xyz`, Deployment ID: `dpl_GwJxYpdd1uMdRiSqwZaTicehNmci`).
  - **관련 문서**: [docs/PLAN_20261017_LOGIN_RENEWAL.md](docs/PLAN_20261017_LOGIN_RENEWAL.md), [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md), [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md).

- **2026-10-16 v1.10 (포커스 스튜디오 템플릿 적용, 연동/사용 매뉴얼 비주얼화, Antigravity)**:
  - 포커스 스튜디오(Focus Studio) 템플릿 스타일 시스템 구축 (`src/app/globals.css`).
  - 대시보드 히어로 배너, 현대적 통계 카드 3종, 본문 발췌 최근 문서 카드 그리드, 빈 상태 일러스트 카드 구현 (`WorkspacePage.tsx`).
  - 연동 & 사용 매뉴얼(/guide)을 프로세스 다이어그램, 4대 포맷 쇼케이스, 단축키 칩, 팁/보안 인포박스가 포함된 비주얼 가이드북으로 전면 개편 (`src/app/(workspace)/guide/page.tsx`).
  - Next.js 16.4.0 Turbopack 로컬 빌드 검증 및 Supabase DB programs.version 1.10 갱신 완료.
  - Microsoft Edge(엣지) 전용 브라우저로 일반 회원 테스트 계정(buylifemall@naver.com) 데스크톱(1440px) 및 모바일(375px) 화면 검수 완료.
  - Vercel 프로덕션 배포 완료 (https://markdown-studio.buylife.xyz).
  - **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style)** ([PROGRAM_DESIGN_STANDARD.md §3](../docs/PROGRAM_DESIGN_STANDARD.md))
  - **디자인 개발완료 및 주요 유의사항 인수인계 보고서**: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) 참고.
  - **프로그램 검토 중 발굴된 로직·기능·편의성 개선 과제**: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) 참고.

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


## 2026-10-16 신규 DB 변수 등록 후속 검수 — 최종 v1.10 유지

주인님 승인으로 Production에 새 공개/서버 변수 이름을 추가했고 기존 변수는 유지했습니다. Antigravity 디자인 작업 종료 및 v1.09 배포 완료를 확인한 뒤, 새 변수 등록 이후 생성된 최신 배포 `dpl_AhURmG83LJQ8kkvVLYLLGAFjG9Zx`를 보존했습니다. 과거 v1.08을 다시 배포하지 않았습니다. 신규 이름만 사용한 로컬 빌드와 Microsoft Edge 일반 회원 접근·v1.09 표시·모바일 검수를 통과했습니다. 코드·DB 버전·디자인을 바꾸지 않았고 유료 AI 호출은 0회입니다. 전체 결과는 [DB 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)와 [후속 배포 증거](../docs/supabase-compat-rollout-20261016/markdown-studio-followup.json)를 확인합니다. 기존 변수 삭제는 안정화 후 주인님과 시점을 확정한 다음 별도로 처리합니다.

- 최종 확인: Antigravity의 가이드 개편 v1.10 완료 뒤 **v1.10 / dpl_FBiuRpYxQT1BJDHH4Rc6LSNcSvpJ**로 신규 이름 전용 빌드·Edge 일반 회원 검수를 추가 통과했습니다. v1.09→v1.10 후속 배포를 보존했고 프로그램 코드·버전을 변경하지 않았습니다.

## 2026-10-17 v1.12 — 편의 기능 6가지 (Claude Code 윈도우, 작업리스트 5번)
- **복사 토스트**: `src/components/ui/Toast.tsx`(`showToast()` + `<Toaster/>`를 `(workspace)/layout.tsx`에 장착). 미리보기 [MD 복사]·[HTML 복사], 편집기 원문 복사 결과를 오른쪽 아래 2.4초 알림으로.
- **예상 읽기 시간**: `src/lib/documents/readingTime.ts`(공백 제외 500자/분, 1분 미만 1분). 미리보기 툴바·편집기 제목 아래 "약 N분 소요 · X자".
- **단축키 안내 창**: `src/components/editor/HotkeysModal.tsx` — 편집기 상단 [⌨️ 단축키] 버튼, 입력 중이 아닐 때 `?` 키, Esc로 닫기. 실제 편집기 단축키(`MarkdownEditor.tsx` keymap) 기준 목록.
- **목차 미니맵**: 기존 [목차]를 미리보기 위에 고정(sticky)하고 스크롤 위치에 맞는 제목을 강조, 클릭 시 부드럽게 이동.
- **템플릿 미리보기**: `src/lib/documents/templatePreview.ts` — 문서 준비 화면 템플릿 카드에 앞부분 6줄을 제목·목록·체크·표·코드·인용 모양의 미니어처로.
- **문서 고정·검색**: 대시보드 최근 문서에 이름 검색창 + 📌 고정 버튼(고정 문서가 맨 앞). 고정 목록은 기기 IndexedDB 설정 `WorkspacePreferences.pinnedIds`(선택 항목, 옛 설정 호환).
- 테스트: `tests/conveniences.test.mjs` 포함 단위 58개 통과, 빌드·배포. 서버·DB 스키마 변경 없음.
## 2026-10-17 v1.13 — v1.12 화면 검수에서 찾은 3건 수정 (Claude Code 윈도우)
- 문서 고정이 새로고침 후 사라짐: `repository.savePreferences`가 정해진 3개 항목만 저장 → `pinnedIds`(문자열, 최대 50개)도 저장(테스트 추가, 59개 통과).
- 템플릿 미니어처: 빈 목록 항목("-", "1.")이 일반 글로, 빈 표 줄이 빈칸으로 보임 → 목록 모양 "항목"·표 "· · ·"로.
- 복사 알림 문구 "원문을(를)" → "마크다운 원문 복사 완료 — 클립보드에 담았습니다.".
- v1.12 실화면 확인: 읽기 시간("약 1분 소요 · 23자"), ? 키 단축키 창(11개)·Esc 닫기, 목차 미니맵 sticky·현재 제목 강조, MD 복사 토스트, 대시보드 검색창·고정 버튼.
- v1.13 실화면 재검수: 고정 → 새로고침 후 📌 유지·해제(원상복구), 검색(없는 이름 안내·있는 이름 1건), 템플릿 미니어처 빈 항목 "항목"·빈 표 "· · ·" 표시 확인.
## 2026-10-17 v1.14 — 다크 모드·닫을 때 바로 저장·단축키 창 서식 넣기·고정 색 꼬리표 (Claude Code 윈도우)
- **다크 모드**: 상단 배너 오른쪽 [🌙 다크 모드 / ☀ 라이트 모드] 버튼(`src/components/ui/ThemeToggle.tsx`). 선택은 기기 localStorage `md-studio-theme`, `<html data-theme="dark">`로 적용. 깜빡임 방지 스크립트 `src/lib/theme.ts`의 `THEME_INIT_SCRIPT`를 `(workspace)/layout.tsx`에서 넣음(로그인 화면은 그대로 밝은 화면). 색은 `globals.css` 끝 「v1.14 다크 모드」 블록(딥 차콜 네이비 `#0b0f17`·카드 `#111827`). 루트 layout `<html suppressHydrationWarning>`.
  - 주의: 버튼 기본색은 `:where(button,.button)`로 약하게 두어 `.primary`·`.download`·투명 버튼이 이기게 했다. 새 화면을 만들면 하드코딩 색 대신 `:root` 변수(`--text-1`·`--text-2`·`--brand-text`·`--soft`·`--soft-line`·`--soft-accent`…)를 쓰면 다크 모드가 자동 적용된다.
  - 편집기: `classHighlighter`(`@lezer/highlight` 1.2.5 직접 의존성으로 고정)로 `tok-*` 고정 클래스를 붙여 다크에서 `##`·`1.` 표식 색을 바꿈. `defaultHighlightStyle`의 `fallback: true`는 제거해야 두 강조가 함께 적용된다(밝은 화면 모양 동일 확인).
- **닫을 때 바로 저장**: `WorkspaceProvider`의 `flushDraft(quick)` — 창을 닫거나(pagehide·beforeunload) 다른 탭·앱으로 넘어갈 때(visibilitychange hidden) 0.75초 자동 저장을 기다리지 않고 로그인 확인(네트워크)을 건너뛰어 이 회원 IndexedDB에 바로 쓴다. 브라우저 "나가시겠습니까?" 확인 창은 안전을 위해 유지. 일반 저장(`save`)은 기존대로 로그인 확인 후 저장.
- **단축키 창에서 눌러 적용**: `HotkeysModal.tsx` 항목 9개(굵게·기울임·링크·들여쓰기·내어쓰기·실행 취소·다시 실행·찾기·저장)를 누르면(또는 Enter·Space) `md-studio:hotkey` 이벤트 → `EditorPane`이 받아 커서 위치에 적용. 문서가 열려 있지 않으면 "먼저 문서를 열어 주세요" 알림. Enter·Esc→Tab·? 항목은 안내만.
- **고정 문서 색깔 꼬리표**: 고정한 카드에만 🏷 버튼, 누를 때마다 없음→빨강→노랑→초록→파랑→보라→없음, 카드 왼쪽에 색 띠. `WorkspacePreferences.pinColors`(문서 id→색), `model.ts`의 `PIN_COLORS`·`nextPinColor`·`sanitizePinColors`, `repository.savePreferences`가 고정된 문서·정해진 색만 저장. 저장(로그인 확인 약 1.7초)을 기다리지 않게 화면은 즉시 반영(`colorDraft`).
- 테스트: 단위 62개 통과(꼬리표 순환·정리·저장 3개 추가). 빌드·배포·DB `programs.version='v1.14'`. 서버·DB 스키마 변경 없음, 유료 API 호출 없음.
- 실화면(크롬, 시험 계정 `buylifemall@naver.com`): 고정→꼬리표 빨강·노랑·초록 순환·새로고침 후 유지, 빠른 연속 클릭 한 칸씩; 다크 모드 대시보드·준비·편집·내보내기·보관함·설정·매뉴얼 7화면과 400px 폭; 단축키 창에서 굵게(`****` 삽입)·실행 취소(원래대로)·찾기 창·링크 입력칸; 글자 입력 직후 창 닫힘 신호 21ms 만에 "이 기기에 저장됨" + IndexedDB 본문 일치. 시험 뒤 원상복구(본문 원래대로·고정 해제·라이트 모드, 문서 수정 횟수만 늘어남).
- 남은 제안: `docs/IMPROVEMENTS.md` 「v1.14 처리 현황」.
## 2026-10-17 v1.15 — 테마 자동·로그인 화면 다크·설정 저장 속도·꼬리표 거르기 (Claude Code 윈도우)
- **테마 3가지**: 배너 오른쪽 [☀ 라이트 | 🌙 다크 | 🖥 자동] (`ThemeToggle.tsx`). 자동은 컴퓨터의 밝게·어둡게 설정을 따라가고, 설정이 바뀌면 바로 반영. 로직은 `src/lib/theme.ts`(`THEME_INIT_SCRIPT`·`readThemeMode`·`applyThemeMode`). 휴대폰 폭에서는 아이콘만(글자는 화면 읽기용으로 숨김).
- **로그인 화면 다크**: 깜빡임 방지 스크립트를 `(workspace)/layout.tsx`에서 **루트 `src/app/layout.tsx`**로 옮겨 로그인·설치 화면까지 적용. `login/page.tsx`의 인라인 색은 `var(--lg-*, 기존색)`으로 바꿔 밝은 화면은 그대로, 다크 값은 `globals.css` 다크 블록의 `--lg-*`.
- **설정 저장 속도**: `WorkspaceProvider.setPreferences`가 매번 하던 로그인 확인(약 1.7초)을 빼고 회원 전용 IndexedDB에 바로 저장(고정·꼬리표·탐색기·편집 너비, 고정 반영 6ms 실측). 계정 확인은 화면 열 때·1분마다·창으로 돌아올 때·문서 저장 때 그대로.
- **꼬리표 거르기**: 대시보드 검색창 아래 [전체 | ●빨강 N | …] — 지금 쓰는 색만 버튼으로, 그 색 꼬리표 문서만 보임(최대 12개). 거르던 색이 없어지면 자동으로 전체.
- **배포 사고(3분)**: 첫 배포에서 `usedColors`가 `liveDocs` 선언보다 위에 있어 대시보드가 "This page couldn't load"(TDZ). 화살표 함수 안 사용이라 `tsc`가 못 잡음 → 선언 순서 수정 후 재배포. `docs/ERROR_LESSONS.md` 기록.
- 테스트: 단위 63개(테마 스크립트 라이트·다크·자동·설정 변경 추가). 실화면(크롬 시험 계정): 고정 6ms, 꼬리표 빨강→거르기 버튼 "빨강 1"·눌림·노랑으로 바꾸면 자동 전체, 자동 모드(이 PC는 다크 설정 → 다크), 로그인 화면 다크·라이트(기존과 동일), 400px는 창이 최대화라 400px iframe으로 확인(아이콘만·가로 넘침 없음). 원상복구(고정 해제·라이트).
## 2026-10-17 v1.16 — 최근 문서 더 보기·백업에 고정/꼬리표 포함·꼬리표 이름 (Claude Code 윈도우)
- **더 보기**: 대시보드 최근 문서 6개씩, [더 보기 (6개 / 전체 N개)]로 6개씩 추가. 검색·색 거르기를 바꾸면 다시 6개부터(`WorkspacePage.tsx`의 `matchedDocs`·`docLimit`).
- **백업**: `buildBackup(nodes, now, prefs)`가 `pins: { pinnedIds, pinColors, pinNames }`를 담음(살아 있는 문서만, 백업 형식 버전 1 그대로 — 옛 프로그램은 이 칸을 무시). 복원은 `parseBackupPins`(백업 안 문서만·깨진 값은 버림) → `importTree`가 돌려준 옛 id→새 id로 `mergeRestoredPins`(지금 고정 먼저·최대 50개, 이미 붙인 이름은 덮어쓰지 않음) → `setPreferences`. 옛 백업은 문서만 그대로 복원.
- **꼬리표 이름**: `WorkspacePreferences.pinNames`(색→이름, 10자), `sanitizePinNames`·`pinLabel`(`model.ts`). 거르기 줄 오른쪽 [✏ 꼬리표 이름]으로 5색 이름 입력. 거르기 버튼·카드 아래쪽(● 급함 · 날짜)·꼬리표 버튼 설명에 이름 표시.
- 테스트: 단위 67개(이름 정리·백업 왕복·옛/깨진 백업·저장 4개 추가). 실화면(크롬 시험 계정): 7문서 백업 JSON을 화면 안에서 만들어 복원(파일 내려받기 없음) → "고정 2개와 색깔 꼬리표도 되살렸습니다", 대시보드 6개 + [더 보기 (6개 / 전체 8개)] → 8개, 거르기 "급함 1·파랑 1", 카드 아래 이름 표시, 이름 바꾸기·공백/10자 정리, 전체 백업 내용 가로채 확인(문서 9·고정 2·색 2·이름 2, 실제 내려받기 막음).
- 고친 것(검수 중): 이름을 입력칸 제한을 넘겨 넣으면 저장값(10자)과 화면이 달랐음 → 저장 전 `sanitizePinNames`.
- 시험 정리: 고정 해제·이름 비움, 복원 폴더 '복원 20261017 1053'(시험 문서 7개)은 휴지통으로 이동(이 프로그램은 영구 삭제가 없어 휴지통에 남음, 필요하면 [복원]).
## 2026-10-17 v1.17 — 휴지통 비우기·탐색기 꼬리표 색 점·Drive 동기화에 고정 정보 (Claude Code 윈도우)
- **휴지통 비우기**: 보관함 휴지통 아래 [휴지통 비우기 (N개)](빨간 테두리) → 확인 창("되돌릴 수 없습니다 · Drive 파일은 그대로") → `repository.purgeTrash()`가 한 트랜잭션으로 휴지통 항목·수정 이력·Drive 연결 기록을 이 기기에서 영구 삭제, 지운 폴더를 가리키던 남은 항목은 최상위로. 지운 문서의 고정은 정리. **회원이 직접 누를 때만** 동작(자동 삭제 없음). Google Drive 파일은 지우지 않는다.
- **탐색기 색 점**: `DocumentExplorer.tsx` — 고정+꼬리표 문서 이름 옆에 색 점(설명에 꼬리표 이름).
- **Drive 고정 정보**: `src/lib/drive/pins.ts` — Drive 전용 폴더에 `.markdown-studio-pins.json`(문서는 Drive 파일 id로 가리킴). [Drive에 올리기] 뒤 이 기기의 고정·꼬리표·이름으로 파일 갱신(마지막에 올린 기기 기준), [Drive에서 가져오기] 뒤 읽어서 연결된 내 문서에 더함(`mergeRestoredPins` — 지금 고정·색·이름이 먼저). 파일은 Drive 목록·건너뜀 수에서 제외(`sync.ts`). 저장·읽기 실패는 문서 동기화 결과를 막지 않고 안내 문구만. `api.ts`에 `findFile`, `createFile(…, mimeType)` 추가.
- `mergeRestoredPins` 변경: 이미 색이 있는 문서는 색을 덮어쓰지 않음, `restoredPins`는 새로 고정된 수만 셈.
- 테스트: 단위 70개(Drive 고정 왕복·파일 하나 유지·목록 제외·지금 설정 우선, 깨진/없는 파일, 휴지통 비우기 3개 추가 — Drive는 `tests/drive-mock.mjs`). 실화면(크롬 시험 계정): 탐색기 빨간 점·"꼬리표: 빨강", 휴지통에 시험 폴더(v1.16 검수 때 만든 '복원 20261017 1053' + 문서 7개)만 있는 것을 확인 후 비우기 → "8개 영구 삭제", IndexedDB에 원래 문서 1개만·수정 이력도 그 문서 것만. 원상복구(고정 해제), 콘솔 오류 없음.
- **못 한 것**: 실제 Google Drive 연결 상태의 고정 정보 올리기·가져오기 화면 검수(연결은 Google 로그인·동의 화면이 필요해 주인님 직접 — 모의 Drive 단위 테스트로만 확인).
## 2026-10-17 v1.18 — 휴지통 항목별 영구 삭제·30일 안내 표시 (Claude Code 윈도우)
- **항목별 영구 삭제**: 휴지통 각 줄 [복원] 옆 [🗑 영구 삭제] → 확인 창 → `repository.purgeTrashItem(id, revision)`: 그 항목과 **함께 휴지통에 넣은 안쪽 항목(같은 trashBatchId)만** 지움(수정 이력·Drive 연결 기록 포함). 따로 먼저 휴지통에 넣은 안쪽 항목은 남고 복원하면 최상위로. `purgeTrash`와 같은 내부 `purge()` 사용. 다른 탭에서 바뀌었으면 거절(`CONFLICT`).
- **경과 안내**: 휴지통 줄에 "오늘 삭제 / N일 전 삭제", 30일 이상이면 노란 "30일 지남" 표시(`model.ts`의 `trashAgeDays`·`TRASH_OLD_DAYS`). 자동 삭제 없음.
- 테스트: 단위 72개(항목별 삭제 배치 범위·거절, 경과일 계산 추가). 실화면(크롬 시험 계정): 시험 백업으로 만든 폴더·문서 2개 → 문서 1을 먼저 휴지통, 폴더를 나중에 휴지통 → 문서 1의 삭제 시각을 31일 전으로 바꿔 "31일 전 삭제 · 30일 지남" 확인 → 폴더 영구 삭제("외 1개", 문서 1은 남음) → 문서 1 영구 삭제 → 휴지통 비어 있음·IndexedDB 원래 문서 1개. 확인 창 문구 확인.
## 2026-10-17 v1.19 — Google 연결 "액세스 차단됨: 승인 오류(400 invalid_request)" 수정 (Claude Code 윈도우)
- 증상: 시험 계정 보관함 [Google에 연결] → Google 창에 "This request contains scopes that cannot be requested together: drive.file, youtube.force-ssl".
- 원인: 우리 코드는 `drive.file`만 요청하지만 Google Identity Services 토큰 클라이언트의 `include_granted_scopes` 기본값(true)이 **같은 Client ID로 예전에 허용한 권한**(유튜브 자동화의 `youtube.force-ssl`)을 합쳐 요청 → Google이 두 권한 동시 요청을 거절.
- 해결: `src/lib/drive/auth.ts` `initTokenClient`에 `include_granted_scopes: false`. 라이브 번들에서 `include_granted_scopes:!1` 확인. 단위 72개 통과.
- 남은 것: 주인님이 다시 [Google에 연결] → 실제 Drive 고정 정보 올리기·가져오기 화면 검수.
## 2026-10-17 실제 Google Drive 화면 검수 — v1.17 고정 정보 동기화 확인 완료 (Claude Code 윈도우, 코드 변경 없음)
- 시험 계정(buylifemall@naver.com) 크롬, Google 계정 buylifemall@gmail.com 연결(주인님 동의), v1.19.
- 올리기: 고정+빨강+이름 "급함" 문서를 만든 뒤 [전체 문서 올리기 (2)] → "올림 2개 · 고정·꼬리표 정보도 저장". [Drive 목록 불러오기]에 마크다운 3개만 보이고 고정 정보 파일은 목록에 없음.
- 다른 기기 흉내: 이 기기의 Drive 연결 기록(map:* 3개)과 고정·꼬리표·이름을 지우고 새로고침 → 재연결 → 목록이 모두 "새 파일" → `Drive 고정 시험.md`만 가져오기 → "성공 1개 · 고정·꼬리표 1개 반영". IndexedDB 대조: Drive와 연결된 **가져온 문서**(`Drive에서 가져옴 20261017/…`)에 고정·red·이름 급함, 원래 로컬 문서는 고정 없음. 대시보드에 📌·● 급함 표시.
- 주의(검수에서 확인): Drive 연결 토큰은 페이지 메모리에만 있어 **다른 메뉴로 이동(새로고침)하면 다시 연결**해야 한다(설계상 의도 — 토큰 저장 안 함). 회원 안내 문구 보강 후보.
- 정리: 고정 해제·이름 비움, 시험 폴더 2개 휴지통 → 항목별 영구 삭제, 기기 저장소에는 원래 문서 1개. Drive 쪽 시험 파일(`복원 20261017 1122/Drive 고정 시험.md`, `.markdown-studio-pins.json`)은 Drive 파일 삭제 금지 원칙에 따라 남겨 둠. 이 기기의 `회원 검수(Drive 시험).md` Drive 연결 기록도 지웠으므로 다음에 올리면 Drive에 새 파일로 올라감.
## 2026-10-17 v1.20 — Drive 칸 재연결 안내 문구 (Claude Code 윈도우)
- `DriveCard.tsx`: "🔐 다른 메뉴로 이동하거나 새로고침하면 다시 [Google에 연결]을 눌러야 합니다. 보안을 위해 Google 연결 정보를 이 기기에 저장하지 않습니다." 한 줄(`.drive-reconnect-note`, 라이트·다크 공용 변수 색).
- 검수: 단위 72개, 빌드·배포·DB v1.20, 크롬 시험 계정 보관함에서 문구·라이트/다크 색 확인.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
