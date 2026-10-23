# AI 엑셀·텍스트 합치기 자동화 — file-merge v1.07

서비스: https://file-merge.buylife.xyz

엑셀·CSV를 머리글로 맞춰 합치고 시트/열 값/N행별로 나누며, 텍스트를 인코딩·구분자·글자/문장 기준으로 합치고 나눕니다. 파일은 브라우저 Worker/메모리에서만 처리하며 서버에 업로드·저장하지 않습니다. 본인 AIMaster 로그인·프로그램 권한이 필요하고, API 키는 필요하지 않습니다. FREE 배지는 추가하지 않습니다.

작업 전 루트 지침·ACTIVE_WORK·최신 HANDOFF와 [AGENTS](AGENTS.md), [최종 인수인계](docs/IMPROVEMENT_HANDOFF_20261017.md), [디자인/토큰 기준](docs/DESIGN_HANDOFF.md), [개선 원장](docs/IMPROVEMENTS.md)을 읽습니다.

검사: `npm test`(21개), `npm run build:verify`(기존 공통 DB 설정을 빌드 자식 프로세스에만 전달). `node tests/local.mjs start` 후 `npm run test:browser`(보이는 Edge — Claude Code는 `FM_TEST_CHANNEL=chrome`으로 크롬·실제 일반 회원·합성 파일 실제 다운로드), 운영은 FM_TEST_BASE=https://file-merge.buylife.xyz로 실행합니다. 검수용 키/세션은 출력·저장하지 않습니다. `.vercel/test-downloads/`는 Git 제외 합성 파일 결과입니다.

운영 v1.07: 검수 소스 7e6c1ced, 배포 dpl_ChZf914SSBYsuAa6TZRjQB58dbB4 READY·DB 일치. 단위21·로컬/운영 Edge 각12개 통과. 엑셀 정렬/서식·지역별 ZIP·UTF-8/CP949 텍스트·분할 원문 보존을 실제 파일로 확인했습니다. 실제 휴대폰과 대용량 재측정은 미검수입니다. 기존 처리 코드·환경변수·권한 정책 변경은 없습니다.
