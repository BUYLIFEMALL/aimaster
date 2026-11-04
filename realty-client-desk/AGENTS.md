# AI 중개사무소 고객관리 자동화 (`realty-client-desk`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`를 함께 읽는다. 담당 역할 `realty`(Claude Code 윈도우 `claude-win-realty-docs`). 플랜 [`docs/PLAN_20261103_CLIENT_DESK.md`](docs/PLAN_20261103_CLIENT_DESK.md) · 동의 문구 [`docs/CONSENT_DRAFT_20261103.md`](docs/CONSENT_DRAFT_20261103.md).
> 주소: https://realty-client-desk.buylife.xyz (Vercel 프로젝트 `realty-client-desk`, 팀 `buylife`) · 운영 DB ① AIMaster `esgxyikcnnvmlhygjkth`.

## 1. 사용 목적·대상
개업공인중개사가 매수·임대 관심고객을 **개인정보 동의 기록과 함께** 모으고(접수 링크·직접 입력), 다음 단계에서 내 매물과 조건으로 연결·문자 안내·일정 알림까지 한다.

## 2. 기술
Next.js 16(App Router, `src/proxy.ts`) · React 19 · Tailwind 4 · Supabase 공용 DB. 뼈대는 `commercial-land-trade-alert` 복사(로그인·권한·사이드바·`mx-*` 스타일, 부동산 시리즈 디자인). 시험 `npm test`(node:test, `.mjs`).

## 3. 구조
| 부분 | 파일 |
|---|---|
| 동의 문구·판(`consent-v1`)·번호·예산 읽기 | `src/lib/desk/consent.ts` |
| 접수 링크 토큰(sha256 해시만 저장) | `src/lib/desk/token.ts` |
| 서버 동작(링크·고객·접수) | `src/lib/actions/desk.ts` — 모두 `requireProgramAccess()` + `user_id`, 접수는 링크 해시 확인 뒤 service role로 그 회원 줄만, 링크당 하루 50건, 숨은 칸으로 봇 거르기 |
| 화면 | `/dashboard` `/intake` `/clients` `/guide`, 고객 접수 `/i/[token]`(로그인 없음, 검색 제외) |
| DB | `supabase/migrations/20261103010000_client_desk_init.sql`(표 2개·RLS), `20261103010100_register_program.sql`(준비중 등록·요금제·시험 계정 14일), `20261103020000_listings_ad_sends.sql`(사무소·매물·발송 기록 표 3개·RLS, 고객 `optout_token`) |
| 2단계 규칙(순수 함수·시험) | `src/lib/desk/adRules.ts` — 매칭(거래·종류·동 이름·예산 5% 여유·면적), 광고 머리 「(광고)명칭 전화」·꼬리 「무료수신거부 링크(080 선택)」, 밤 9시~아침 8시(KST), 광고 동의 2년 / `tests/adRules.test.mjs` |
| 2단계 서버 동작 | `src/lib/actions/listings.ts`(사무소·매물·발송·수신거부 — 발송은 회원 SOLAPI, 기록 먼저 넣고 보냄, (고객, 매물) 한 번), `solapiAccount.ts`(공용 `user_solapi_accounts`), SOLAPI 공용 사본 `src/lib/solapi/client.ts`(직접 고치지 말 것 — 기준 `crm-google-form/lib/solapi/client.ts`) |
| 2단계 화면 | `/settings`(API키등록·플랫폼연동), `/listings`, `/listings/[id]`(맞는 고객 고르기·미리보기·발송 기록), 수신거부 `/u/[token]`(로그인 없음, 버튼 한 번, 처리 결과 표시) |
- 지킬 것: 수기 입력은 「동의 받음」 체크 + 방법·날짜 없으면 저장 안 함(결정 1). 광고 문자는 2단계에서 광고 동의자만·21~8시 막음·「(광고)」·무료 수신거부(결정 2). 공개는 주인님 확인 뒤(결정 3). 고객 명부 1년(관리자 지정) — 정리 작업은 3단계에 추가.

## 4. 버전
- v1.01 (2026-11-03): 1단계 — 고객 접수 링크·관심고객 명부·동의 기록·대시보드·매뉴얼. 배포 `dpl_4TzHGSg7Rrps1Cft4M1H2yCj5nq1`.
- v1.02 (2026-11-03): 직접 입력 동의·방법·날짜·휴대폰 형식을 브라우저에서 먼저 검사(서버가 거절하면 React가 폼을 비워 적은 내용이 사라지던 문제).

- v1.03 (2026-11-03): 2단계 — 내 매물·맞는 고객·광고 문자(회원 SOLAPI)·무료 수신거부 화면·광고 동의 2년 표시. 시행령 별표 6·제62조의2·제62조의3 원문 대조. 커밋 `8a022ffcc`, 배포 `realty-client-desk-qztxwj8fc`.

- v1.04 (2026-11-03): 3단계 — 일정·아침 8시 알림(회원 SOLAPI→본인 핸드폰), 회원 실행 방식(Vercel 기본/내 cron-job.org, 공용 `member-scheduler` 사본 — `memberScheduler.ts` 직접 수정 금지, 값은 `schedulerConfig.ts`), 운영 `/api/cron/daily`(일정 알림 + 1년 정리, `CRON_SECRET`). 커밋 `e43a37bae`, 배포 `realty-client-desk-ffflmwj64`.
- v1.05 (2026-11-03): 4단계 — 광고 명시 항목 점검(src/lib/desk/adCheck.ts)·AI 광고 글/문자 초안(src/lib/ai/listingDraft.ts, 회원 본인 Claude 키, claude-sonnet-5-5, 재시도 0, 1분 잠금, 저장 안 함)·사무소 등록번호/성명·Claude 키 칸. 커밋 `4be6ba487`, 배포 `realty-client-desk-hsthsm95m`.
- v1.06 (2026-11-03): D5 중개보수 계산기 /fee(src/lib/desk/fee.ts, 시행규칙 제20조 별표 1·2), 매물 화면 값 채움 링크. 커밋 `047e0dc42`, 배포 `realty-client-desk-mdyg9kbm3`.
- v1.07 (2026-11-03): 중개보수 계산기 지역 선택(17개 시·도, REGION_CHECKED 대조 3곳). 「내 cron-job.org」 실검수 완료(코드 변경 없음). 배포 `realty-client-desk-nf5kq3r0m`.
- v1.08 (2026-11-03): 일정 알림 = 회원 cron-job.org 기본·유일(schedulerConfig.ts 키트 스위치), 가입하기 버튼, AI 초안 플랫폼 3개·모델 선택(src/lib/ai/engines.ts). 커밋 `dffad1a6a`, 배포 `realty-client-desk-21gyn8g6j`. DB SQL `20261103060000_cronjob_default_ai_engines.sql` 적용함(주인님 승인).
- v1.09 (2026-11-04, **코드 완료·DB 적용 완료(주인님 지시, 기존 고객 1명 월세 임차)·배포 대기**): 현장 공인중개사 피드백 반영 — 고객 거래 입장 `deal_side`(매매 = 매수/매도, 전세·월세 = 임차/임대, 칸 문구도 입장에 맞게), 매도·임대 고객은 광고 문자 대상에서 제외(`matchReasons`), 고객 목록 입장 거르기, 유형 「빌라·주택」 → 다세대/빌라·다가구/주택 + 건물·분양권 추가(유형 버튼 2열/5열 정렬), 중개보수 과세 유형(일반 10%·간이 4%·없음, 이 브라우저에 기억)·분양권 주택 요율 안내(`feeKindOf`), 동의 판 `consent-v2`(수집 항목에 입장 추가). 시험 24개·tsc·로컬 빌드 통과. **반드시 DB SQL `20261104010000_deal_side_property_types.sql`을 먼저 적용한 뒤 배포**(새 코드가 `deal_side`를 저장함 — 순서가 바뀌면 고객 저장이 실패).

## 5. 남은 일
플랜 1~4단계 끝, **2026-11-03 회원 공개**(배지 NEW, VIP 자동 부여, 썸네일 — `supabase/migrations/20261103050000_publish.sql`). D5 중개보수 계산기 v1.06·지역 선택 v1.07 완료. 실제 아침 알림 문자 미확인(「내 cron-job.org」 실행은 v1.07 때 확인). 실제 문자 발송 시험(SOLAPI 있는 계정, 본인 번호 1건) 미실시. 지역 맞춤은 동 이름 글자 포함만 봄(인접 동·좌표는 나중 검토).
