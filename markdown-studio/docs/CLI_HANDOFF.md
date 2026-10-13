# 다른 CLI 작업 재개 인수인계

작성: 2026-10-13 / 대상: Claude Code·Codex·Gemini 등 / 프로젝트: `markdown-studio`

## 1. 지금 인수받는 작업

주인님은 참고 사이트 `https://markdown-studio-mauve.vercel.app/`의 기능·로직·동작을 분석한 뒤 AIMaster에 맞는 프로그램 개발을 요청했습니다. 분석과 개발 계획을 먼저 작성했고, 진행 지시를 받아 **1단계 공통 틀·문서 모델 및 기본 작업 화면**까지 구현했습니다. 이번 요청은 다른 CLI에 이어서 작업할 수 있도록 인수인계하는 것입니다.

현재 상태는 **v1.01 출시 후보, 기본 구현·로컬 검수 완료, 운영 연결 대기**입니다. 전체 기능 완성·운영 배포 완료 상태가 아닙니다. 가칭은 `마크다운 문서 자동화`, 프로젝트/슬러그는 `markdown-studio`, 도메인 후보는 `markdown-studio.buylife.xyz`입니다. 공식 표시명·FREE 여부·카탈로그 등록은 아직 확정하거나 적용하지 않았습니다.

| 항목 | 상태 |
|---|---|
| 작업 저장소 | `D:/Antigravity/AIMaster`, 원격 `https://github.com/BUYLIFEMALL/aimaster.git`, 브랜치 `master` |
| 프로젝트 위치 | `D:/Antigravity/AIMaster/markdown-studio` — 별도 Git 저장소를 만들지 않음 |
| 원본 분석·계획 커밋 | `a6316578` |
| 구현 커밋 | **`bd606a31`**, `origin/master` 푸시 완료 |
| 앱 표시 버전 | `src/lib/version.ts`의 `v1.01`; package 버전은 SemVer `1.1.0` |
| Vercel | 팀 `buylife`, 프로젝트 `markdown-studio` 생성·로컬 연결 완료 |
| 운영 환경변수·배포 | **미등록·미배포** |
| DB·카탈로그 | 문서용 테이블/마이그레이션 없음, 프로그램/요금제/매뉴얼 등록 미실행 |
| 도메인·썸네일 | 미연결·미등록 |

위 커밋 번호는 인수인계 시점의 기준이며 다른 CLI 커밋으로 HEAD는 바뀔 수 있습니다. 재개할 때 최신 상태를 확인하고 기존 변경을 되돌리지 않습니다.

> **업데이트 2026-10-13 (Claude Code)**: 7번 표의 **2단계는 완료**되었습니다([구현·검수 기록](PHASE2_IMPLEMENTATION.md), [플랜](PHASE2_PLAN.md)). **3단계도 완료(v1.02)**: [구현·검수 기록](PHASE3_IMPLEMENTATION.md). **4단계 코드도 완료(v1.03, 모의 Google 검수)**: [구현·검수 기록](PHASE4_IMPLEMENTATION.md). 남은 것은 실제 Google 계정 검수와 5단계(썸네일·매뉴얼 등록)입니다. **환경변수 승인·등록, 운영 배포, 도메인(markdown-studio.buylife.xyz), `programs` 등록(FREE+new, v1.01)은 완료**되었습니다([PROVISIONING_PLAN 실행 결과](PROVISIONING_PLAN.md)). 일반 회원 로그인 검수만 남았습니다.

## 2. 먼저 읽을 문서

1. [루트 AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md), [최근 작업](../../docs/HANDOFF.md).
2. [본인 계정·API 최상위 규칙](../../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md), [오류 기록](../../docs/ERROR_LESSONS.md), [공식 개발 절차](../../docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md).
3. [프로젝트 재개 안내](../AGENTS.md), [README](../README.md).
4. [원본 분석](REFERENCE_ANALYSIS.md), [전체 개발 플랜](DEVELOPMENT_PLAN.md), [1단계 구현·검수](PHASE1_IMPLEMENTATION.md), [운영 설정안](PROVISIONING_PLAN.md).
5. [사이드바 규칙](../../docs/SIDEBAR_LAYOUT_STANDARD.md), [SSO 도메인 정책](../../docs/DOMAIN_SSO_POLICY.md), [공통 패턴](../../docs/PLATFORM_PATTERNS.md), 회원/관리자/휴대폰 정책 관련 최신 루트 문서.

## 3. 이미 구현한 것

- 회원 인증과 공통 프로그램 이용 권한 검사, 조건부 `.buylife.xyz` SSO 쿠키, 동적 페이지·캐시 차단. 환경변수가 없으면 작업 화면 대신 `/setup`, 세션 API는 JSON 503을 반환합니다.
- 흰색 작업 화면. 대시보드와 번호형 `문서 준비 → 편집·미리보기 → 변환·내보내기 → 문서 보관함`, API키등록·플랫폼연동, 사용 매뉴얼. 계정·로그아웃은 마지막 메뉴 바로 아래에 있습니다.
- 회원별 IndexedDB, 문서/폴더 UUID·부모·리비전 모델. 새 문서/폴더, 템플릿, 이름 변경, 이동, 폴더 끌어 놓기, 이름/본문 문자열 검색. 중복 이름·잘못된 부모·폴더 순환 이동을 거절합니다.
- 750ms 자동 저장, 수동 저장·Ctrl+S, 저장/설정 처리 직렬화. 두 탭의 오래된 리비전은 덮어쓰지 않습니다. 실패한 원고를 유지하고 내려받기·재시도·최신 문서 불러오기를 제공합니다.
- 문서별 최신 30개 수정 이력·본문 복원, 휴지통·같은 삭제 작업에 속한 하위 항목만 복원. 예전에 따로 삭제한 자식은 부모 복원으로 되살리지 않습니다.
- 기본 textarea 편집, Marked + DOMPurify GFM 미리보기. 표 정렬 유지·정적 체크리스트 표시, 탐색기 접기·편집 너비 기억, 모바일 편집/미리보기 탭, 현재 원문 `.md` 다운로드.

문서는 이 브라우저에 저장됩니다. 다른 기기 동기화·서버 문서 보관·Drive 연결·동일 OS 프로필 사용자에 대한 암호화를 제공한다고 설명하지 않습니다. 시험 세션 우회 코드는 운영 라우트에 없습니다.

## 4. 코드를 찾는 지도

| 경로 (`markdown-studio/` 기준) | 역할·수정 시 주의 |
|---|---|
| `src/lib/version.ts` | 프로그램명·슬러그·앱 버전 |
| `src/lib/auth.ts`, `access.ts`, `supabase/`, `src/proxy.ts` | 회원 인증·권한·쿠키 갱신. 서버 service role은 브라우저에 노출하지 않음 |
| `src/lib/programAccess.ts`, `utils/phone.ts` | 루트의 정확한 사본. 판정 규칙 변경 시 동기화, 비교 시험 존재 |
| `src/lib/documents/model.ts` | 이름·소유자·부모·검색·크기·리비전 규칙 |
| `src/lib/documents/repository.ts` | IndexedDB 트랜잭션, 충돌·30개 이력·휴지통 배치 복원 |
| `src/components/workspace/WorkspaceProvider.tsx` | 회원별 상태·세션 검증·자동 저장·충돌 원고 보존·설정 직렬화 |
| `src/components/workspace/WorkspacePage.tsx` | 5개 작업 화면. 2단계에서는 textarea를 고급 편집기로 교체 |
| `src/components/workspace/DocumentExplorer.tsx` | 문서 탐색·생성·이름·이동·검색·휴지통 |
| `src/components/workspace/MarkdownPreview.tsx` | GFM 변환 뒤 HTML 정제. 원문을 변형하지 않음 |
| `src/components/layout/Sidebar.tsx`, `StudioShell.tsx` | 공통 메뉴·회원 위치·저장 실패 복구 안내 |
| `src/app/(workspace)/`, `src/app/api/` | 실제 페이지와 세션/로그아웃 API. 인증 라우트는 dynamic/no-store 유지 |
| `tests/browser-entry.tsx` | 격리 시험 전용. Next 앱 경로에 연결하지 않음 |

## 5. 검수 결과와 재실행

이전 구현 턴에서 빌드·TypeScript 정상, 자동 검사 **14/14**, Chrome 컴포넌트 검사 **11/11**, 실제 프로덕션 빌드의 설정 미등록 차단 검사 **9/9**, `npm audit` 취약점 **0건**을 확인했습니다. **이 인수인계 문서 작성 턴에서는 앱 검사를 다시 실행하지 않았습니다.**

```powershell
Set-Location D:/Antigravity/AIMaster
git status --short
git log --oneline -10
git rev-list --left-right --count HEAD...origin/master
Set-Location ./markdown-studio
npm ci
npm run build
npm test
npm run test:browser
npm run test:runtime
npm audit
```

- `test:browser`: 독립 Chrome에서 실제 작업 컴포넌트 검사, **세션 응답만 시험값**. 폴더/문서/저장/새로고침/검색·GFM·XSS·다운로드, 충돌·503 원고 보존·재시도, 390px 모바일·회원 메뉴 간격 8px, 이력·휴지통·계정 전환·401을 확인했습니다.
- `test:runtime`: 실제 Next 프로덕션 서버에서 설정 미등록 시 접근 차단·503/no-store·타 출처 로그아웃 403·Chrome 준비 화면을 확인합니다. 환경변수를 삭제한 자식 프로세스로 실행하므로 플랫폼 설정이 없는 검사용 작업 폴더에서 수행합니다. 해당 폴더에 실제 `.env.local`이 있으면 별도 폴더를 사용해야 합니다.
- 실제 일반 회원 SSO, 운영 Supabase 이용 권한, 실제 Google OAuth/Drive, PDF/DOCX 대상 앱 호환성은 **아직 미검수**입니다.
- Git 증거: [원본 실험](evidence/review-results.json), [UI 검사](evidence/phase1-browser-results.json), [차단 검사](evidence/phase1-runtime-results.json).
- 로컬 스크린샷/원본 수집물: `D:/PDS/markdown-review-20261013/`, 특히 `phase1/`. 재생성 아티팩트는 `markdown-studio/test-artifacts/`. 다른 PC에 이 파일이 없어도 Git 분석 문서·JSON·시험 코드로 이어갈 수 있습니다.

## 6. 승인 대기와 독립적으로 진행 가능한 일

이전 답변에서 주인님께 **기존 AIMaster 인증 환경변수 3개를 새 프로젝트에 등록할 수 있는지** 요청했습니다. 현재까지 승인 답변은 없으며 **이번 “인수인계 문서 만들어줘” 요청은 환경변수 등록 승인으로 해석하지 않습니다.** 같은 승인을 받은 것으로 꾸며 등록하거나 DB 스키마를 먼저 바꾸지 않습니다.

등록 대상: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. 새 프로젝트 Production·Development 및 실제 회원 로컬 검수 연결이며 자세한 범위는 [설정안](PROVISIONING_PLAN.md)에 있습니다. 루트 현재 Supabase 설정을 기준으로 하고 비밀 값을 문서/로그/Git에 넣지 않습니다.

승인 여부와 무관하게 **2단계 편집기, 3단계 브라우저 문서 변환·백업**은 독립적으로 진행할 수 있습니다. 운영 설정 승인 대기를 모든 개발 작업 중단으로 취급하지 않습니다. 실제 회원 운영 검수는 설정 및 프로그램 등록 후 진행해야 합니다. 카탈로그가 없으면 공통 권한의 `program_not_found` 거절이 정상이며 게스트 우회를 추가하지 않습니다.

## 7. 다음 작업 순서·완료 기준

| 순서 | 해야 할 일 | 반드시 확인할 결과 |
|---|---|---|
| **다음: 2단계** | CodeMirror, 원본 20개 서식 명령·목록 3종·기호 32종, 선택 영역·실행 취소/다시 실행·찾기/바꾸기, 실제 단축키·한글 IME, 탐색기 편의 | 분석 문서와 기능 비교표, 한글 입력·선택·연속 서식·중첩·특수문자 검색·모바일 동작. 기존 자동 저장·충돌 복구가 유지됨 |
| **3단계** | `.md`/`.txt`/JSON 가져오기·검증, JSON 백업/복원, HTML·텍스트 PDF·표준 DOCX·ZIP/폴더 묶음 | 원문 보존·악성/과대 JSON 차단·복원 결과 일치. 한글 PDF 텍스트 추출, 표준 DOCX 문단/표 XML·대상 앱 표시, 부분 실패 알림 |
| **4단계** | 회원 본인 Google OAuth 앱·계정, 업로드/갱신/가져오기, 계정별 Drive ID 연결·충돌·재시도 | 실제 본인 Drive 읽기/쓰기/변경/재연결, 401/403/429/5xx와 부분 실패를 성공으로 알리지 않음. 스키마 필요 시 SQL 준비·사전 승인 |
| **5단계** | 일반 회원 검수, 표시명·FREE 정책 확정, 카탈로그·기본 요금제 3개·버전·매뉴얼·실사 썸네일·도메인 | 본인 세션·권한·회원 전환·실제 출력·SSO 확인, 커밋→푸시→프로덕션 배포→운영 검증·라이브 링크 보고 |

2단계 명령/옵션의 정확한 항목은 [원본 분석](REFERENCE_ANALYSIS.md)을 기준으로 비교합니다. AI 글 생성은 후속 선택 기능이며 기본 편집·변환보다 먼저 추가하지 않습니다.

## 8. 반복하지 말아야 할 실수

- 원본의 `[` 검색 정규식 충돌, HTTP 실패 뒤 Drive 성공 알림, 이름만으로 덮어쓰기, 이미지 PDF·altChunk DOCX, 작동하지 않는 단축키를 복제하지 않습니다.
- 미리보기는 정제하고 내려받는 원문은 보존합니다. 표 align·체크리스트가 정제/CSS로 사라지지 않는지 같이 확인합니다.
- 기존 앱의 오래된 의존성을 그대로 복사하지 않습니다. 현재 Next 16.4.0/React 19.3.0/PostCSS 8.5.29 등은 빌드와 전체 보안 검사를 거쳐 고정했습니다.
- `vercel link` CLI 59.1.4는 로컬 OIDC `.env.local`을 자동 생성할 수 있습니다. 연결 후 생성 파일·승인 범위를 확인하고 값은 출력하지 않습니다. 현재 자동 생성 파일은 제거한 상태입니다.
- `.vercel/`, 환경변수, node_modules, `.next/`, 시험 아티팩트는 Git 제외입니다. 다른 PC에서는 Vercel 팀·프로젝트를 정확히 다시 연결해야 합니다.
- 여러 CLI가 같은 저장소·스테이징을 공유합니다. 작업 시작 전 상태 확인, 본인 경로만 커밋 직전에 스테이징, 다른 CLI 변경 섞지 않기. `reset --hard`·force-push·전체 파일 청소로 복구하지 않습니다.
- **Suno 검수는 주인님이 나중에 하기로 한 작업**입니다. 이번 Markdown 재개에 섞지 않습니다.

## 9. 다음 CLI에 그대로 전달할 시작 문구

```text
D:\Antigravity\AIMaster\markdown-studio\docs\CLI_HANDOFF.md를 먼저 읽고,
루트와 프로젝트 AGENTS.md의 최신 지침을 확인해 마크다운 문서 자동화를 이어서 작업해줘.
1단계 구현 커밋은 bd606a31이고 전체 완성·운영 배포 상태는 아니야.
환경변수 등록은 아직 승인되지 않았으니 우회하지 말고,
독립적으로 진행 가능한 2단계 고급 편집 기능부터 개발 플랜 순서대로 진행해줘.
검사 증거와 실제 회원 검수를 구분하고 인수인계 문서도 갱신해줘.
Suno 보류 검수와 다른 CLI 프로젝트는 건드리지 마.
```
