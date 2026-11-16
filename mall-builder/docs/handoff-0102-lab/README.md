# Lab 0102(교환) 적용·동작 검수 실행 자료 — B2B-20261117-06 · 실행 전(Master 실행 지시 대기)

> Master msg_bd8a08d8f380: Lab 0102는 아직 적용하지 않고 실행 자료만 구체화. MacTester 정적 판정 → Master 실행 지시 뒤에만 실행. 운영에서는 절대 실행하지 않음.

## 대상(2026-11-17 Lab 읽기로 재확인)
- **Lab = AIMaster_dev, ref `rjjtjakljjxsgjelqgek`** (주소 `https://supabase.com/dashboard/project/rjjtjakljjxsgjelqgek/sql/new`) — 운영 `esgxyik…` 아님.
- 몰 `aimaster-b2b`(store id `0489b458-d71b-4268-9b5f-94fd7da50382`, 주인 = 관리자 계정)
- 시험 회원(일반 회원 권한) user id `6fbce7f8-b54e-462e-8e4b-4391b2603f65` — 이 몰 유저로 등록됨, 몰 주인 아님
- 지금: 교환 표 없음·0102 기록 0, 0101 기록 있음, 이 몰 주문 일련번호 최대 18, `EXQA-` 주문 0

## 파일과 지문(LF sha256)
| 파일 | 하는 일 | 쓰기 | sha256 |
|---|---|---|---|
| `precheck.sql` | 실행 전 확인 8줄 | 읽기만 | `414ada927b6062b99346760f3db3f7df5061528bc51c1c274641352c1f19a61c` |
| `apply.sql` | 한 트랜잭션: 사전 점검 → **0102 원문 그대로** → 적용 기록(version UTC 14자리, name `mall_builder_0102_exchanges`) | 씀 | `633450bea1c5d05df2fbb352c18819c7acf0f9923aa281031b847aae266a5b11` |
| `fixture.sql` | 한 트랜잭션: 합성 시험 자료(아래) | 씀 | `d9af7b2f374eec2d532e53f435e288c5aa3c3efa23c63b5d692ab990beda39b2` |
| `verify.sql` | 적용·자료 확인 13줄 + 「전체」 | 읽기만 | `79e83564401fca9e5caf6d22c0fb3b5f73fed3af22862e9a4f302536439ffea5` |
| `rollback.sql` | 한 트랜잭션: 시험 자료 → 트리거 → 함수 11개 → 교환 표 → 기록 | 씀 | `cba401783a12ef14d5534f18cbf1552ac22cdb9840ae61109fc636f6cd834891` |
| `check-local.mjs` | 위 순서를 로컬 qa_ DB에서 끝까지 돌려 판정 | 로컬만 | `8024b4af7f748dcb853155a0ec596ebdb48c45159785651b21b921cf751ea5bb` |
| `build.mjs` | apply.sql 생성(원문 그대로 삽입) | — | `54305cc4f5e576e7c319287c002140bc316a6852bf8ec29c15ce741f85e488c6` |
- apply.sql 안 원문 = `supabase/migrations/0102_exchanges.sql` LF sha256 `14780f43e6c5daf5bf9ce14736e1c757596828c2c0a522fc9b39355adb8a33e1`(커밋 `a86c53dc1`). 원문 앞 사전 점검: 교환 표·0102 기록이 이미 있으면 [멈춤], 0101 기록·몰 aimaster-b2b가 없으면 [멈춤](Lab이 아닐 가능성).

## 합성 시험 자료(fixture.sql — 기존 유저 주문·기존 상품 접촉 0)
| 구분 | 내용 | id(고정, `e0102000-…`) |
|---|---|---|
| 교환비 정책 | `[교환QA] 교환비` 무료배송·교환비 3,000원(기본 정책 아님) | …001 |
| 상품 | `[교환QA] 티셔츠` 옵션 S 5·M 5·L 0, 재고 관리, **hidden**(손님 화면 비공개) | …011 / 옵션 …021·022·023 |
| 상품 | `[교환QA] 머그컵` 옵션 없음, 본체 재고 10, 재고 관리, hidden | …012 |
| 주문 EXQA-1 | 시험 회원 소유, 배송 완료 2일 전, 티셔츠 S 2개 + 머그컵 1개, 무통장 28,000원, seq 900001 | …031 / 줄 …041·042 |
| 주문 EXQA-2 | 시험 회원 소유, 배송 완료 10일 전, 티셔츠 S 1개, seq 900002 | …032 / 줄 …043 |
- 이력은 `shipping → delivered`만(배송 완료 시각). 알림 트리거 대상(입금 대기·입금·발송·취소·반품·환불 완료) 아님 → 알림 0(verify 12번). 교환 기록도 같은 상태라 알림 없음.
- 받는 사람·연락처는 가짜 값(`교환QA`·`010-0000-0000`) — 실발송 0, 실결제 0.

## 실행 순서(Master 지시 뒤, Lab SQL 편집기)
1. 주소의 ref가 `rjjtjakljjxsgjelqgek`인지 확인 → `precheck.sql` → 8줄 모두 OK
2. `apply.sql` 한 번(확인 창은 사람이 승인) → Success
3. `fixture.sql` 한 번 → Success
4. `verify.sql` → 「전체 13/13 OK」
5. 화면 검수(MacTester): 유저 = 시험 회원으로 `/s/aimaster-b2b/orders/e0102000-0000-4000-8000-000000000031` 교환 신청(티셔츠 S→M 사이즈 사유 → 교환비 3,000원 대기, 머그컵은 옵션 고르기 없음), EXQA-2는 「7일 지남」 안내 / 운영사 = 관리자로 `/s/aimaster-b2b/admin/orders/…031` 회수 중 → 회수 완료(S +1) → 입금 확인 → 새 상품 발송(M −1) → 완료, `…032` 대리 접수(기간 제한 없음). L(재고 0)로 바꾸면 재발송 막힘.
6. 끝나면 `rollback.sql` → 교환 표·함수·트리거·기록·시험 자료 모두 없어짐, 기존 주문 그대로

## 되돌리기 범위
- 시험 주문이 아닌 교환이 하나라도 있으면 [멈춤](사람 판단). 지우는 것은 고정 id 시험 자료와 0102가 만든 것(트리거 1·공개 함수 4·내부 함수 7·교환 표·기록)뿐. 기존 표 drop 없음.
- 주문 삭제로 상품 줄·이력은 따라 지워짐(외래 키 cascade). 시험 자료로 생긴 알림이 없음을 verify가 확인.

## 로컬 검사 결과(2026-11-17, `node mall-builder/docs/handoff-0102-lab/check-local.mjs`, 종료 0)
precheck 8/8 → apply → fixture → verify 13/13 → 두 번째 apply·fixture [멈춤] → 시험 회원 교환 신청(3000/waiting) → EXQA-2 유저 막힘(7일) → rollback → 표 없음·함수 0·트리거 0·기록 0·시험 주문 0·시험 상품 0·기존 주문 그대로 → precheck 다시 8/8. **전체 통과**.
