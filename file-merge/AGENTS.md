# AI 엑셀·텍스트 합치기 자동화 (file-merge) — 작업 지침 (v1.01)

- 이어서 작업하는 CLI/계정은 먼저 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md)(현재 상태·남은 일)와 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)·[`docs/REFERENCE_ANALYSIS.md`](docs/REFERENCE_ANALYSIS.md)를 읽는다. 루트 `CLAUDE.md`·`docs/ERROR_LESSONS.md`도 함께.
- 프로그램명 "AI 엑셀·텍스트 합치기 자동화"(2026-10-15 주인님 "계속 진행해줘"로 추천안 확정), slug·폴더 `file-merge`, 주소 https://file-merge.buylife.xyz, Vercel 프로젝트 `file-merge`(buylife 팀).
- 원칙: **파일은 브라우저 안에서만 처리**(서버 전송·저장 없음) — API 라우트는 로그아웃 하나뿐, AI·API 키·회원 데이터 테이블 없음. 권한은 공용 `requireProgramAccess()`(작업 화면 레이아웃·각 페이지). 흰색 UI, 표준 사이드바(작업 흐름 1~4 + 사용 매뉴얼), 모바일 레이아웃 지침(원칙 19번) 적용.
- 엑셀 입출력은 **SheetJS 0.20.3 공식 CDN 패키지**(`package.json`의 `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`) — npm의 `xlsx`는 0.18.5에서 멈춰 공식 문서가 "registry is out of date"라고 안내. 버전을 올릴 때는 https://docs.sheetjs.com/docs/getting-started/installation/nodejs 의 tarball 주소로 바꾼다.
- 버전: `src/lib/version.ts`·`package.json`·DB `programs.version`을 수정마다 +0.01.
- 배포: `vercel deploy --cwd D:/Antigravity/AIMaster/file-merge --prod --yes --scope buylife`(먼저 `.vercel/project.json`의 projectName이 `file-merge`인지 확인 — 루트 ERROR_LESSONS 2026-10-14 사고).
- 상태(2026-10-15): v1.01 출시 — 엑셀 합치기·나누기, 텍스트 합치기·나누기, DB 등록·요금제·VIP 접근·썸네일, 운영 검수 완료. 남은 일: CLI_HANDOFF §3.
