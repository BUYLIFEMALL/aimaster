# Suno 음악기획 자동화 — 인수인계

2026-10-16 v1.10: 주인님 지시("suno 싸이트 인데 수노 싸이트 느낌을 살려서 블랙배경으로 작업을 해보자", "디자인 작업할때 연동/사용매뉴얼도 비주얼화")에 따라 **사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)**로 전면 개편. 퓨어 딥 블랙(`--bg-deep: #09090b`), 다크 옵시디언 서페이스(`--surface-card: #14141b`), Suno 시그니처 앰버 오렌지(`--brand: #f97316`) 및 일렉트릭 바이올렛 네온 하이라이트, 라운드 알약형(pill-shaped) 버튼/칩 디자인 전면 적용. 사이드바에 SUNO 워드마크, Suno Create 공식 사이트 열기 앰버 네온 링크, 주황색 원형 아바타 이니셜 탑재. `UsageGuide.tsx`를 4단계 비주얼 파이프라인, 프롬프트 구조 설계도, 실사/이모티콘 그래픽, 키보드 단축키 칩으로 전면 비주얼화. Microsoft Edge 일반 회원 테스트 계정(`buylifemall@naver.com`) 데스크톱(1440px) 및 모바일(375px) 실화면 검수 완료, `npm test` 53개 100% 통과, Next.js 빌드 성공, DB `programs.version` v1.10 동기화 및 Vercel 프로덕션 배포 완료 (`dpl_CyHfNn6vNeRAGZCXwkQWcvD3LQfK`, HTTP 200). 상세: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md), [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md).

2026-10-13 주인님 지시로 실제 사용 추가 검수 6개 항목을 작업대기로 등록했습니다. 재개 지시 전에는 실행하지 않습니다. [대기 목록·담당·재개 조건](docs/WAITING_CHECKS.md). 구현·배포 v1.07 완료와 추가 실제 검수 대기는 구분합니다.

2026-10-12 v1.07: 주인님의 최종 지시대로 좌측 메뉴 코드·디자인은 유지하고 우측 앨범 작업 영역만 원본에 맞췄습니다. 설정 5 : 트랙 7 비율, 컨셉/의도 → 2×2 분류·시대·그룹·참고 프리셋 → 가져오기 → 15종 무드 → 흐름 → 가사 언어 → 생성/곡 수/초기화 순서. 저장된 앨범은 별도 하단 카드, 생성 전 안내는 62px로 축소했습니다. 모델·보컬·편곡은 접는 세부 설정에서 유지합니다. 자동 검사 53개, 기존 모의 화면 34항목 및 신규 배치·선택 13항목 통과. 실회원/유료 공급사 호출은 이번 작업에서 실행하지 않았습니다. 상세: [docs/RELEASE_V1_07.md](docs/RELEASE_V1_07.md). 구현 커밋 959a6cdb 푸시 및 프로덕션 READY, 배포 SHA 일치. DB v1.07, 운영 HTTP 14항목·로그인 JS 8개 정상 확인 완료.

이전 운영 릴리스 v1.06은 구현 커밋 df7bbfcf로 배포됐습니다. 당시 비로그인 HTTP 14항목과 로그인 페이지 JS 8개 확인. 실제 회원/공급사 검수 범위는 docs/RELEASE_V1_06.md를 따릅니다.

2026-10-12 v1.06: 빌더 빈 편집 화면·현재 선택·안전한 골격·초기화 되돌리기·명시적 제어 적용, 앨범 선택 작사·순서/메타데이터 편집·전용 JSON 복원, 검색 결과 종류·출처 연결 후보·내 Style 저장/앨범 전송을 추가했습니다. 원본 공개 옵션 769회 선택 확인(종속 선택의 숨겨진 항목은 DOM 변경 이벤트 사용), 실제 원본 유료 호출 0회. 자동 검사 53개, 실제 컴포넌트 모의 화면 34항목 통과. 신규 회원/공급사 실호출은 미검수. 상세 비교와 운영 기록: [docs/RELEASE_V1_06.md](docs/RELEASE_V1_06.md).


2026-10-12 v1.05: 원본과 같은 빌더·앨범·프리셋·검색·댄스 머신·가이드·저장됨 메뉴 순서와 좌우 배치로 개편. 흰색 화면 및 계정/로그아웃 8px 간격 유지. 빌더/앨범 설정 분리, 15종 다중 무드, 곡별 보컬/랩, 앨범 저장·초기화/되돌리기, 댄스 조합 저장, 93개 가이드 인덱스, 선택 공급사의 본인 키 웹 검색 추가. 44개 자동 검사와 23개 프런트 모의 흐름 통과, 린트/타입/빌드 통과. 신규 실제 회원 웹 검색·앨범 호출은 미검수. 상세 비교·차이·재개 순서·운영 증거: [docs/RELEASE_V1_05.md](docs/RELEASE_V1_05.md). 메뉴 번호형의 예외는 주인님의 원본 메뉴 일치 지시에 따른 이 프로그램 전용 예외입니다. 확장 프로그램 없음. 과거 릴리스의 검수 기록은 새 기능 실호출 증거로 사용하지 않습니다.

2026-10-12 v1.04: v1.03 운영 검증에서 API 오류 응답 Cache-Control이 public,max-age=0임을 발견. apiGuard.ts의 모든 성공/오류 응답에 private,no-store를 적용하고 버전 규칙에 따라 후속 배포. [통합 운영 기록](docs/RELEASE_V1_03.md).

2026-10-12 v1.03: 원본 사이트 실제 옵션 전수 선택 조사 후 프리셋 461개·댄스 200개·스타일 그룹 243개·13개 시대를 공개 선택 메타데이터와 자체 레시피로 반영. 9종 팔레트·내 Style·보컬/랩 캐스팅·제목 언어·고음 억제·선택 생성·커서 구간 삽입 추가. 기존 제목/가사·이전 백업·회원별 본인 키·사이드바 지침 유지. npm test 33개, 린트·빌드 및 모의 프런트 흐름 10개 통과. 최신 비교: [docs/ORIGINAL_OPTIONS_COMPARISON.md](docs/ORIGINAL_OPTIONS_COMPARISON.md). 운영 반영/실회원 검수 상태는 [docs/RELEASE_V1_03.md](docs/RELEASE_V1_03.md)를 우선합니다. 원본 AI 호출·Suno 음악 생성·공급사 웹 검색은 미실행/미구현이므로 동등한 기능이라고 보고하지 않습니다. 변경 시 버전·DB metadata·프로덕션 배포를 함께 갱신합니다.

2026-10-12 v1.02: 계정 이메일·로그아웃을 마지막 메뉴 아래 8px 간격으로 밀착. 메뉴 flex-grow 제거, 낮은 화면은 메뉴 내부 스크롤·계정 축소 방지. 루트 AGENTS/CLAUDE·SIDEBAR_LAYOUT_STANDARD·PLATFORM_PATTERNS §27에 공통 디자인 지침 반영. 린트·빌드 및 실제 Sidebar 격리 렌더링 3가지 높이/폭 배치 검수 통과. 변경·운영 결과: [docs/RELEASE_V1_02.md](docs/RELEASE_V1_02.md). 기존 v1.01 기록은 당시 기능 검수 이력으로 유지합니다.

2026-10-12 카탈로그 실사 썸네일 등록 완료. 음악 기획자·가사 구획·스타일 칩·앨범 트랙·건반을 표현한 내장 image_gen 생성물입니다. 원본/프롬프트/등록 SQL/운영 화면 증거는 [docs/THUMBNAIL.md](docs/THUMBNAIL.md). 카탈로그 메타데이터만 등록했으므로 v1.01 유지, Storage·DB 즉시 반영(앱 재배포 불필요). 공개 이미지·Next 최적화·메인/목록/상세 참조·Headless Chrome 상세와 카테고리 실제 화면·빌드 성공 확인.

2026-10-12 주인님이 프로그램명을 **Suno 음악기획 자동화**로 확정했습니다. 화면·로그인·메타데이터는 `src/lib/version.ts`의 APP_NAME을 공유하고 DB programs.name도 일치합니다. 최초 운영 배포 전 이름 확정이므로 v1.01을 유지합니다. slug·프로젝트·주소는 `suno-music-studio`를 유지합니다.

루트 AGENTS.md·docs/HANDOFF.md·TOP_RULE_PERSONAL_ACCOUNT_API.md·ERROR_LESSONS.md·AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md를 먼저 읽습니다. v1.01 운영 배포 완료: https://suno-music-studio.buylife.xyz/. 공용 접속 설정 등록은 주인님의 후속 “진행해줘”로 승인받았습니다. Next.js 프레임워크를 vercel.json에 명시했으며 배포 ID는 `dpl_CWro2HYAYQmyGU4PPeSU7baKm5AH`입니다. 배포·검수 증거와 남은 확인은 docs/RELEASE_V1_01.md에 기록합니다.

회원 본인 계정·본인 AI API 키만 사용합니다. 회원 권한/키는 기존 플랫폼 공용 DB와 emotion-writer의 인증 골격을 재사용합니다. 새 회원 체계·공용 AI 키·게스트 우회는 금지입니다. 자료는 회원 ID별 이 브라우저에 저장하고 JSON 백업을 제공합니다. 서버는 API 키 원문을 클라이언트에 반환하지 않습니다.

기능 분석과 구현 범위: docs/ANALYSIS_AND_PLAN.md. 검수 npm test(17/17), npm run lint(0), npm run build 성공. 공용 DB 스키마 변경과 새 환경변수 변경은 사전 승인 필요합니다. 프로그램·3요금제 등록과 is_active=true 확인. 일반 등급 이상 + 사용기간 또는 구독이 필요하며 FREE 배지를 임의 부여하지 않습니다. 기존 music 앱은 수정하지 않으며 준비된 제목/스타일/가사 복사와 기존 앱 열기를 제공합니다. 확장 없음. 일반 테스트 회원 실제 Chrome SSO·프리셋·초안 복원·JSON 다운로드·본인 Gemini 모델 조회와 곡 1개 생성·최종 확인·보관·제작 설명 복사를 확인했습니다. Suno 실제 음악 생성과 다른 공급사 생성·앨범 일괄 생성은 미실행. TXT 연속 다운로드는 Chrome 허용창 처리 미확인, JSON 가져오기는 Windows 별도 파일 선택창 제어 제한으로 실제 UI 재검수가 남았습니다. 자동 검증에서 가져오기·큐는 통과했습니다. 테스트 회원만 2026-10-13 15:09:50 KST까지 기간을 등록했으며 연장/일반 회원 권한은 관리자가 결정합니다.

## v1.08 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/studio/prompt.ts 작사 시스템 지시(영어)에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.08. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.09 (suno-music-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.11 (2026-10-16) — 플로팅 빠른 복사 바 (Claude Code 윈도우)
- `docs/PROGRAM_WORK_LIST.md` 2번 / `docs/IMPROVEMENTS.md` TASK #1. 곡 편집 카드(`src/components/TrackEditor.tsx`) 하단에 화면 아래 고정 `quick-copy-bar`: Title·Style·Lyrics·Exclude(있을 때만) 복사 + `Suno 열기 ↗`(https://suno.com/create, 새 창). 제목·스타일·가사 중 하나라도 있을 때만 보임. 스타일 `src/app/globals.css`(`.quick-copy-bar`, 좁은 폭은 줄바꿈).
- 검수: 빌드 통과, 프로덕션 배포, DB `programs.version` v1.11(`supabase/migrations/20261016_quick_copy_bar_v111.sql`). 시험 계정 크롬 실화면에서 바 표시·Title 복사 → "복사했습니다" 안내 확인. 390px 폭 iframe에서 두 줄로 접혀 가로 넘침 없음. VIP 138/138 유효. 유료 AI 호출 없음.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 v1.12 — 음악(SUNO)자동화로 병합(음악 병합 M1 4단계, Claude Code 윈도우)
- **이 앱은 더 이상 개발하지 않는다.** 기획 엔진(`src/lib/studio/*`)·화면 부품·테스트는 `music/`(음악(SUNO)자동화, slug `music-automation`)의 「정밀 기획 스튜디오」(`/studio`)로 옮겼다(v1.17~v1.19). 분석 [`../docs/analysis-music-consolidation-20261021/REPORT.md`](../docs/analysis-music-consolidation-20261021/REPORT.md), 플랜 [`../music/docs/PLAN_20261021_MERGE_M1_SUNO_STUDIO.md`](../music/docs/PLAN_20261021_MERGE_M1_SUNO_STUDIO.md).
- 이 주소(https://suno-music-studio.buylife.xyz)는 지우지 않고 **이동 안내 화면**만 남김: 로그인만 확인(카탈로그에서 내려 권한 판정이 막히므로), 이 브라우저에 남은 기획(보관함·내 Style 개수)을 보여 주고 「내 기획 JSON 내려받기」 → 새 화면 「JSON 가져오기」로 계정에 저장(`src/components/MovedNotice.tsx`). `/settings`는 안내 화면으로, 옛 API(`/api/generate`·`search`·`keys`)는 410 + 새 주소 안내.
- DB: `is_active=false`, `version v1.12`(`supabase/migrations/20261021_merged_into_music_automation_v1_12.sql`), 권한 회원 144명은 전원 이미 음악(SUNO) 권한 보유, 1명은 사용기간이 더 길어 음악(SUNO) 기간을 늘림. 메인 `/programs/suno-music-studio` → `/programs/music-automation`.
- 옛 화면 코드(`src/components/*`, `src/lib/studio/*`)는 남겨 둠. 지울 때는 메모리 규칙대로 `D:\Antigravity\AIMaster_backup\retired-programs\` 백업 + git 태그 뒤에(삭제는 주인님 승인).
- **2026-10-21 코드 정리(주인님 승인 「삭제」)**: 백업 `D:\Antigravity\AIMaster_backup\retired-programs\suno-music-studio\`(git 추적 140개 + 로컬 참고 파일 1개) + git 태그 `backup/suno-music-studio-20261021`(원격). 지운 것: 옛 화면 부품 17개(`src/components/*` 중 `MovedNotice`·`LoginForm` 제외), 기획 엔진 `src/lib/studio/`(음악(SUNO) `music/lib/studio/`로 옮겨진 원본), `apiGuard`·`apiKeys`·`access`·`programAccess`, `tests/`, `package.json` test 스크립트. 남긴 것: 이동 안내(`/`)·로그인·`/settings`→`/`·옛 API 410·문서·DB 기록. `MovedNotice`의 저장 키는 파일 안으로 옮김. tsc·build 통과. **동작이 같아 재배포하지 않음** — 다음 배포 때 함께 반영(현재 운영본 v1.12도 같은 화면).
