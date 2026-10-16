# 개선 인수인계 — AI 엑셀·텍스트 합치기 자동화 (2026-10-17, Claude Code 맥미니)

> **Windows 마무리 완료(v1.07):** 테스트21·타입/빌드·배포·DB·실제 회원 Edge 로컬/운영 각12개가 모두 통과했습니다. 아래 처음의 대기 목록은 맥미니 전달 당시 상태입니다. 이 문서 마지막 「Windows 최종 인수·운영 검수 완료」를 먼저 읽습니다.

## 한 일 (v1.07)
스마트 매트릭스 **라이트 변형** 디자인. 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md), 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md), 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 바뀐 파일
- 수정: `src/app/globals.css`, `src/app/page.tsx`(`/` → `/dashboard`), `src/components/layout/Sidebar.tsx`(대시보드 메뉴), `src/app/(workspace)/{excel-merge,excel-split,text-merge,text-split,guide}/page.tsx`, `src/lib/version.ts`(v1.07), `package.json`(1.0.7)
- 신규: `src/app/(workspace)/dashboard/page.tsx`, `src/components/ui/PageHero.tsx`, `docs/*`
- 파일 처리 로직·Worker·테스트 대상 코드 변경 없음.

## 확인한 것 / 못 한 것
- 확인: 정적 검토, 라이트 토큰 대비 계산(전부 4.5:1 이상), 히어로로 옮긴 설명 문구에 따옴표 없음.
- **못 한 것**: `npm test`·`npm run build`·배포·화면 검수(맥미니 빌드 금지).

## 맥미니 전달 당시 다음 첫 단계 (Windows 처리 완료 — 과거 기록)
1. `docs/ACTIVE_WORK.md` 줄 추가 → `cd file-merge && npm test && npm run build`.
2. `vercel deploy --cwd <file-merge> --prod --yes --scope buylife`(먼저 `.vercel/project.json` projectName이 `file-merge`인지) → DB `update programs set version='v1.07', updated_at=now() where slug='file-merge';`
3. `buylifemall@naver.com` 1440px·375px: `/`→`/dashboard`, 도구 카드 4개, 각 도구 히어로·파일 끌어놓기 영역·미리보기 표·칩 눌림 색, 매뉴얼 흐름 그림, ☰ 메뉴. 샘플 엑셀 2개로 합치기 1회(브라우저 안 처리, 비용 없음).
4. 루트 `DESIGN.md` 65번 「✅ 1차 작업완료 (`v1.07`, …)」, `DESIGN_HANDOFF.md` 기록, ACTIVE_WORK 줄 삭제.

## 2026-10-17 Codex(Windows) — 배포 전 검수

- 맥미니 c8ee93a7 인수, [Windows 검수 플랜](VERIFICATION_PLAN_20261017_WINDOWS.md). 기존 처리 코드 변경 없음. `npm test` 21/21, Next 16.4.0 빌드·TypeScript 검사 통과, npm 설치 audit 0건.
- 실제 일반 회원·보이는 Edge 로컬 1440px/375px 검수 12개 통과: 대시보드/6개 화면/매뉴얼/메뉴, 실제 Worker, 엑셀 두 파일 머리글 정렬·실제 다운로드 값/서식, 지역별 ZIP 3개, CP949/UTF-8 합치기, 텍스트 80자 분할·원문 복구, 파일 전송/쓰기·유료 API·페이지 오류 0회. 라이트 대비 8쌍 4.5:1 이상.
- 환경 파일/운영 설정은 변경하지 않았습니다. 로컬 파일에는 Vercel OIDC 항목만 있어 최초 검사는 setup으로 이동했으며, 기존 루트 DB 설정을 빌드/서버 자식 프로세스에만 전달하는 `tests/local.mjs`로 해결했습니다. 서버는 127.0.0.1:3032에만 바인딩합니다.
- 테스트 도구의 감싸는 label+select 정확 일치와 CSS 축약색 해석을 보완했으며 제품 오류가 아니었습니다. 캡처는 맨 위로 스크롤한 뒤 찍어 고정 메뉴가 중간에 보이는 오판을 방지합니다.
- 실행: `npm run build:verify`; `node tests/local.mjs start` 후 `npm run test:browser`. 운영은 FM_TEST_BASE=https://file-merge.buylife.xyz. 키/회원 세션/비밀번호는 기록하지 않습니다. 실제 다운로드 검증용 합성 파일은 Git 제외 `.vercel/test-downloads/`에 저장합니다.
- 새 검수 의존성 playwright 1.58.2(Edge 사용)와 테스트 스크립트만 추가했습니다. 앱 인증·파일 처리에는 모의 코드를 연결하지 않습니다. 다음: 고정 소스 커밋/푸시 → 운영 배포 → DB v1.07 → 운영 동일 검사 → 문서/현황판 마무리.

## 2026-10-17 Codex(Windows) — Windows 최종 인수·운영 검수 완료 (이 절이 대기 기록을 대체)

- **운영**: v1.07, https://file-merge.buylife.xyz . 맥미니 c8ee93a7 → Windows 검수 소스 **7e6c1cedcab6cffc73c19724fa3995ceb049837c** 커밋·푸시 → **dpl_ChZf914SSBYsuAa6TZRjQB58dbB4 READY**. [고정 배포](https://file-merge-8to2pg4at-buylife.vercel.app). Vercel 실제 production target·sourceCommit 일치 확인.
- **DB·버전**: APP_VERSION v1.07·package.json 1.0.7·programs.version v1.07 일치. 주소·기존 new 배지 유지, FREE 배지를 추가하지 않았습니다. 회원 등급/권한·키·환경변수·스키마·회원 데이터 변경 없음. 버전 갱신 SQL은 `supabase/releases/20261017_v107.sql`.
- **빌드·검사**: 기존 파일/서식/큰 행 수 단위 **21/21**, Next16 프로덕션 빌드·TypeScript 통과. 실제 일반 회원 **buylifemall@naver.com**·보이는 Microsoft Edge **로컬 12개/운영 12개 모두 통과**, 1440px·375px 6개 화면·접는 메뉴·매뉴얼·실제 Worker·라이트 대비 8쌍(4.5 이상).
- **파일 결과를 실제로 확인**: 두 .xlsx의 다른 열 순서를 머리글로 맞춘 결과(데이터 3행·머리글 1번·원본 파일/시트 열), 각 원본의 머리글 배경/굵기·데이터 기울임/빨강·금액 표시 형식·열 너비를 **실제 Edge 다운로드 파일을 ExcelJS로 다시 열어 확인**. 지역별 분할 ZIP의 서울/부산/대구 3파일·머리글/서식 확인. UTF-8/CP949 한글 텍스트·구분선·[파일명] 합치기, 80자 분할 ZIP을 다시 이어 원문과 동일 확인. Blob/저장 액션을 모의하지 않았습니다.
- **처리 위치**: 네트워크에서 실제 `turbopack-worker-*.js` 실행, 브라우저 파일 전송/서버 쓰기 요청 0회·브라우저 오류/실패 HTTP 0회, 유료 AI/검색 호출 0회. 이 결과를 전체 보안 감사 완료로 확대하지 않습니다.
- **변경 범위**: 기존 파일 처리·Worker·화면 코드 수정 없이 인수. playwright 1.58.2·실제 회원/파일 브라우저 검수 도구·로컬 설정 전달 도구와 문서/증거 추가. 루트 공용 문서는 내 절/65번만 갱신하며 다른 CLI의 스테이징·작업은 보존합니다. 커밋 직전 짧게 공유 index 잠금을 확보하고 내 커밋/합친 index를 한 번에 반영하는 방식으로 오래된 스테이징 사고를 방지했습니다.
- **현황판**: DESIGN 65번 ✅ 1차 작업완료(v1.07, 스마트 매트릭스 라이트 변형), ACTIVE_WORK 내 줄 제거. AGENTS/README·CLI_HANDOFF·DESIGN_HANDOFF·IMPROVEMENTS·루트 HANDOFF도 반영했습니다.

### 증거와 재현

- [단위·빌드 기록](evidence/windows-checks-v107.json), [로컬 Edge](evidence/local-browser-v107.json), [운영 Edge](evidence/live-browser-v107.json), [운영 배포](evidence/deployment-v107.json), [DB 버전](evidence/database-v107.json).
- [운영 1440px](evidence/live-dashboard-1440.png), [375px](evidence/live-dashboard-375.png), [실제 합치기 1440px](evidence/live-excel-merge-1440.png), [합치기 375px](evidence/live-excel-merge-375.png), [매뉴얼](evidence/live-guide-1440.png), [매뉴얼 375px](evidence/live-guide-375.png).
- `npm test`; `npm run build:verify`; `node tests/local.mjs start` 후 `npm run test:browser`. 운영은 `FM_TEST_BASE=https://file-merge.buylife.xyz npm run test:browser`(PowerShell은 `$env:FM_TEST_BASE='https://file-merge.buylife.xyz'` 다음 실행). 테스트용 실제 다운로드 파일은 Git 제외 `.vercel/test-downloads/local|live/`에 있습니다.
- 최종 문서 푸시 뒤 root Git 자동배포의 설치 파일 누락을 `node scripts/finalize-supabase-compat-main.cjs`로 확인/복구합니다. root 런타임이 바뀌면 오래된 배포로 승격하지 말고 최신 소스+설치 파일 배포 절차를 따릅니다. 실제 결과는 Git 제외 `.vercel/final-main-promotion.json`에 남습니다.

### 남은 일·다음 첫 단계

이번 v1.07 디자인 인수 범위의 남은 일은 없습니다. 실제 휴대폰 기기의 파일 선택/저장, 대용량 성능 재측정, .xls/.xlsm/CSV의 실제 브라우저 전체 조합은 이번 범위에서 검수하지 않았습니다(기존 단위/이전 릴리스 기록과 구분). 이후에는 [개선 원장](IMPROVEMENTS.md) #3 설정 재사용·#4 미리보기 검색·#6 품질 요약 중 요청된 항목의 플랜부터 시작합니다. 파일 내용은 localStorage/DB에 저장하지 않습니다. #5 다크 테마는 아이디어만이며 현재 라이트 정책을 바꿀 승인으로 해석하지 않습니다. 경쟁사 v1.08 데이터 격리·30일 삭제 승인은 이 작업과 별개로 대기입니다.
