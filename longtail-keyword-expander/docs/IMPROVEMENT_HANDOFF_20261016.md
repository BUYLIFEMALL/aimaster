# v1.06 디자인 인수 후 오류 수정·검수·배포 인수인계

2026-10-16 Codex(Windows). Claude Code(맥미니)의 디자인 커밋 `770f7351`과 [디자인 인수인계](DESIGN_HANDOFF.md)를 이어받았습니다. 주인님께 [개발 플랜](VERIFICATION_PLAN_20261016.md)을 먼저 제시했습니다.

## 범위와 변경

스마트 매트릭스 디자인의 윈도우 빌드·실행 검수·오류 수정·운영 배포 작업입니다. 미출시 v1.06을 완성하며 새 제안 CSV·전체 키워드 사전·사진·테마·스트리밍은 구현하지 않습니다.

- `SeedForm.tsx`: 비동기 액션 성공 후 React 이벤트의 `currentTarget`이 null이 되어 입력 초기화·목록 갱신이 중단되는 오류 재현. await 전에 폼을 보관해 수정했습니다.
- `RunListSidebar.tsx`: 상세 실행 이력에도 삭제 확인창 추가. 취소 시 삭제 액션 0회와 터치 높이 44px를 검수했습니다. 실제 회원 데이터는 삭제하지 않았습니다.
- `CopyButton.tsx`: 실제 클립보드 복사와 실패 시 수동 복사 안내. 중복 클릭 시 타이머 갱신·언마운트 정리·상태 안내·44px 유지.
- `app/(dashboard)/runs/page.tsx`: 실행 0건이면 UUID 컬럼에 잘못된 `__none__`를 조회하지 않으며, 씨드 조회 시 회원 ID도 한정합니다.
- 검수 도구 `tests/`: 보이는 Edge 실제 회원 검사와 실제 UI·상세 컴포넌트에 합성 데이터를 공급하는 격리 검사를 구분했습니다. 테스트 의존성 playwright 1.58.2·esbuild 0.25.12를 개발용 고정 버전으로 추가했습니다.
- `tests/local.mjs`: 기존 루트 접속값을 로컬 검수 프로세스에만 전달. 이 프로그램의 Git 제외 환경 파일에는 Vercel 토큰만 있어 접속값 없이 빌드가 성공하고 실행은 500이었던 상황을 해결합니다. 환경 파일·Vercel 설정·실제 키값은 바꾸지 않습니다.

## 검수 증거

| 검사 | 결과·범위 |
|---|---|
| 타입·린트·프로덕션 빌드 | `npm run build:verify` 성공, Next.js 14.2.35 |
| Edge 실제 UI·합성 데이터 | 12/12 · 검색/필터/표·카드·복사/실패·한국 시각·삭제 취소·등록 후 초기화·375px |
| 실제 일반 회원 로컬 Next 앱 | 11/11 · 접근·대시보드 이동·5개 화면·메뉴·계정·375px·소유하지 않은 상세 차단 |
| 유료 API·텔레그램 발송 | 0회 |
| 실제 회원 데이터 변경 | 0회 · 4개 테이블 수 유지, POST 요청 없음 |
| 운영 배포·회원 화면 | READY · 코드/DB v1.06 · 일반 회원 Edge 11/11 |

[등록 오류 재현](evidence/browser-fixtures-before.json) · [수정 후 UI 검사](evidence/browser-fixtures.json) · [회원 로컬 검사](evidence/runtime-local.json). 실제 회원의 씨드·실행 결과는 모두 0건입니다. 데이터가 필요한 검색·복사·확인창은 합성 데이터 검사이고, 실제 검색·OpenAI 분석·텔레그램 전송 검수로 주장하지 않습니다. 키·세션·회원 입력 원문은 결과에 남기지 않습니다.

## 재검수 방법

프로그램 폴더에서 `npm ci` → `npm run build:verify` → `npm run test:browser`. 실제 앱은 `node tests/local.mjs start` 후 다른 터미널에서 `npm run test:runtime`. 운영은 `LK_TEST_BASE`를 실제 운영 URL로 지정합니다. 실제 회원 검사 스크립트는 기존 공용 DB 설정으로 일반 테스트 계정의 실제 인증 세션을 얻으며 메일을 발송하거나 비밀번호를 입력하지 않습니다. 운영 인증 우회 코드는 없습니다. 검수 브라우저는 `msedge`, 보이는 창만 사용합니다.

## 릴리스 기록·다음 CLI

- 코드 `APP_VERSION`은 **v1.06**, 배포 때 `supabase/release_design_v106_20261016.sql`의 버전 메타데이터 DML만 적용합니다. DB 스키마 변경은 없습니다. 전용 확장 프로그램이 없어 ZIP 갱신 대상도 없습니다.
- **완료**: 소스 `54eaee73` 커밋·푸시, 대상 Vercel `longtail-keyword-expander` 배포 **dpl_GqzpS51EDAxU6UYGCHHt8xkqEhr7** READY. 작업 중인 다른 CLI 파일이 섞이지 않도록 해당 커밋의 프로그램 폴더만 Git archive로 분리해 배포했습니다. [운영 대시보드](https://longtail-keyword-expander.vercel.app/dashboard), 코드/DB **v1.06**, 일반 회원 운영 Edge **11/11**. [배포 증거](evidence/deployment.json) · [운영 검사](evidence/runtime-live.json) · [데스크톱](evidence/live-dashboard-desktop.png) · [375px](evidence/live-dashboard-mobile.png).
- 최종 검수는 **합성 UI 12 + 회원 로컬 11 + 회원 운영 11 = 34개 통과**, 페이지 오류·회원 데이터 쓰기·유료 API·텔레그램 발송 0회입니다. 기존 키·환경변수·이용 권한·다른 프로그램 소스는 유지했습니다. 메인 설치 파일 보호 검증은 최종 푸시 후 `scripts/finalize-supabase-compat-main.cjs`의 Git 제외 `.vercel/final-main-promotion.json`에 기록합니다.
- [개선 원장](IMPROVEMENTS.md)의 #1~4·#10~14는 검수 완료로 갱신했습니다. #5 부분 구현·#6~9 후속 제안은 남깁니다. npm audit 취약점 알림 #15는 별도 호환성 조사·업데이트 플랜으로 이어갑니다. 이번 요청 범위의 남은 작업은 없습니다.
- 다음 CLI는 루트 AGENTS/ACTIVE_WORK/HANDOFF → 이 문서 → 디자인 인수인계·개선 원장을 확인합니다. 새 기능 구현 전 개발 플랜을 제시하고 기존 회원 데이터·본인 키·이용 권한을 보존합니다.
