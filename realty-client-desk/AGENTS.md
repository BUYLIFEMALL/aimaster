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
| DB | `supabase/migrations/20261103010000_client_desk_init.sql`(표 2개·RLS), `20261103010100_register_program.sql`(준비중 등록·요금제·시험 계정 14일) |
- 지킬 것: 수기 입력은 「동의 받음」 체크 + 방법·날짜 없으면 저장 안 함(결정 1). 광고 문자는 2단계에서 광고 동의자만·21~8시 막음·「(광고)」·무료 수신거부(결정 2). 공개는 주인님 확인 뒤(결정 3). 고객 명부 1년(관리자 지정) — 정리 작업은 3단계에 추가.

## 4. 버전
- v1.01 (2026-11-03): 1단계 — 고객 접수 링크·관심고객 명부·동의 기록·대시보드·매뉴얼. 배포 `dpl_4TzHGSg7Rrps1Cft4M1H2yCj5nq1`.
- v1.02 (2026-11-03): 직접 입력 동의·방법·날짜·휴대폰 형식을 브라우저에서 먼저 검사(서버가 거절하면 React가 폼을 비워 적은 내용이 사라지던 문제).

## 5. 남은 일
2단계 내 매물·조건 매칭·문자(회원 SOLAPI) → 3단계 일정 알림·1년 정리 → 4단계 AI 초안·광고 항목 점검. 정보통신망법 시행령 원문 대조(「(광고)」 방식·2년 재확인) 2단계 전.
