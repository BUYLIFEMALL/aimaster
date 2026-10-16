# AI 엑셀·텍스트 합치기 자동화 (file-merge) — 작업 지침 (v1.07)

- 이어서 작업하는 CLI/계정은 먼저 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md)(현재 상태·남은 일)와 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)·[`docs/REFERENCE_ANALYSIS.md`](docs/REFERENCE_ANALYSIS.md)를 읽는다. 루트 `CLAUDE.md`·`docs/ERROR_LESSONS.md`도 함께.
- 프로그램명 "AI 엑셀·텍스트 합치기 자동화"(2026-10-15 주인님 "계속 진행해줘"로 추천안 확정), slug·폴더 `file-merge`, 주소 https://file-merge.buylife.xyz, Vercel 프로젝트 `file-merge`(buylife 팀).
- 원칙: **파일은 브라우저 안에서만 처리**(서버 전송·저장 없음) — API 라우트는 로그아웃 하나뿐, AI·API 키·회원 데이터 테이블 없음. 권한은 공용 `requireProgramAccess()`(작업 화면 레이아웃·각 페이지). 흰색 UI, 표준 사이드바(작업 흐름 1~4 + 사용 매뉴얼), 모바일 레이아웃 지침(원칙 19번) 적용.
- 엑셀 입출력은 **SheetJS 0.20.3 공식 CDN 패키지**(`package.json`의 `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`) — npm의 `xlsx`는 0.18.5에서 멈춰 공식 문서가 "registry is out of date"라고 안내. 버전을 올릴 때는 https://docs.sheetjs.com/docs/getting-started/installation/nodejs 의 tarball 주소로 바꾼다.
- 버전: `src/lib/version.ts`·`package.json`·DB `programs.version`을 수정마다 +0.01.
- 적용 디자인 템플릿: **스마트 매트릭스 스타일 — 라이트 변형**(v1.07) — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)
- 배포: `vercel deploy --cwd D:/Antigravity/AIMaster/file-merge --prod --yes --scope buylife`(먼저 `.vercel/project.json`의 projectName이 `file-merge`인지 확인 — 루트 ERROR_LESSONS 2026-10-14 사고).
- 상태(2026-10-15): v1.05 — 엑셀 나누기에도 원본 서식 유지. v1.04 — 원본 서식 유지 저장(ExcelJS, 결과 100만 칸까지), 큰 파일 메모리 실측(`scripts/measure-memory.mjs`). v1.03 — 엑셀 합치기 결과 다듬기(남길 열·순서, 같은 행 제거), 원본 바이트 보관 중단(메모리). v1.02 — 엑셀 처리 백그라운드(Worker)·큰 행 수 스택 넘침 수정, FREE 배지 없음(주인님 결정). v1.01 출시 — 엑셀 합치기·나누기, 텍스트 합치기·나누기, DB 등록·요금제·VIP 접근·썸네일, 운영 검수 완료. 남은 일: CLI_HANDOFF §3.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (file-merge)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## 2026-10-17 v1.07 — 스마트 매트릭스 라이트 변형 디자인 (Claude Code 맥미니)
- `globals.css`에 라이트 토큰(`--mx-*`, 대비 계산 확인)을 넣고 밝은 하드코딩 색을 토큰으로, 클래스 이름 유지. `/dashboard` 신설(`/` → `/dashboard`, 특징 지표 4종 + 도구 카드 4개), 사이드바 대시보드, 도구 4화면 STEP 히어로, 매뉴얼 캐릭터·4단계 흐름. 파일 처리 로직 변경 없음.
- **Windows 완료: 테스트21·빌드/타입·배포/DB·Edge 로컬/운영 각12개 통과** — [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md).

## 2026-10-17 Windows 최종 인수 완료 — v1.07

소스 7e6c1ced 푸시, dpl_ChZf914SSBYsuAa6TZRjQB58dbB4 READY, DB/APP v1.07 일치. 테스트21·빌드/타입 통과, 실제 일반 회원 Edge 1440px/375px 로컬/운영 각12개 성공. 실제 다운로드를 다시 읽어 엑셀 정렬·서식·ZIP 분할 및 텍스트 인코딩/원문 보존 검증. 파일 전송·유료 API 0회, 파일 처리/권한 정책 변경 없음. [최종 인수인계](docs/IMPROVEMENT_HANDOFF_20261017.md), 서비스 https://file-merge.buylife.xyz . 다음 CLI는 최신 지침·ACTIVE_WORK 확인 후 개선 원장 #3/#4/#6의 요청 항목 플랜부터 시작합니다. 로컬 서버는 tests/local.mjs start(127.0.0.1:3032), 기존 루트 DB 설정을 자식 프로세스에만 사용하며 환경 파일/키를 고치지 않습니다.
