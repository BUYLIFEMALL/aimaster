# Lab 0104(교환비 카드 결제) 적용 실행 자료 — 준비만, 실행 승인 아님

작성: CC-B2B-BACK-01 · 2026-11-17 · 지시: Master msg_db4fe2c6237c. **이 폴더의 파일이 있다는 것은 Lab 적용 승인이 아니다.** 적용은 Master의 별도 실행 지시가 있을 때만, 정해진 한 세션이 한 번.

## 1. 대상과 원문
- 대상: **Lab(AIMaster_dev, ref `rjjtjakljjxsgjelqgek`)만**. 운영(`esgxyik…`)에서 실행 금지 — SQL 편집기 화면의 프로젝트 이름을 먼저 눈으로 확인.
- 원문: `mall-builder/supabase/migrations/0104_exchange_fee_payments.sql`, 커밋 `37fdcabb4`, LF sha256 `739b35e9f20b45ba7c83309918da0cc099ca6a0b5715bf5514e755cb108662e6`(Mac 소스 PASS 고정). `apply.sql`의 「원문 시작/끝」 사이는 이 원문 그대로이며 `build.mjs`가 지문이 다르면 파일을 만들지 않는다.

## 2. 파일과 지문(LF sha256)
| 파일 | 하는 일 | 지문 |
|---|---|---|
| `build.mjs` | 원문 지문 확인 뒤 `apply.sql` 생성(DB 접속 0) | `c25d19458bc57394887d096cf938c215b7658a14e680da67d5bc6b28bc8fdbbc` |
| `apply.sql` | 한 트랜잭션 적용(`lock_timeout 5s`·`statement_timeout 60s`), 시작 조건 확인 → 원문 → 적용 기록 1줄(version은 UTC) | `d06b9bba18a1dd4e6610a056f8fc05bc951fbbc300e73167b47ce74b4b1a1bd3` |
| `precheck.sql` | 실행 전 읽기 전용 16항목 + 기준값 2개 | `f271c35f64b05877f1856e93d4b06f4cf72e8c9f036209447996b8de4b48c510` |
| `verify.sql` | 적용 뒤 읽기 전용 20항목 엄격 판정(줄 수 20·NULL·필수 줄 없음은 불일치). 구조 1~15는 12절 카탈로그 목록 대조, 자료 16~20 | `393c5d7de44760d9ed865b9723b4990c7bbd4cf251dd9f16f2ef9b21d08f12fb` |
| `check-local.mjs` | 로컬 격리 DB 리허설 + 반례 19개(Docker `aww-pg-test`, `qa_` DB 만들고 끝에 지움) | `b171457b7b6801c24f5776488897cd91b696fd4e7acf0dde60971a79e2b0d59d` |

## 3. 실행 순서(지시가 있을 때)
1. `node mall-builder/docs/handoff-0104-lab/build.mjs` → 두 지문이 위 표와 같은지 확인(원문 739b35e9…, apply d06b9bba…).
2. Lab SQL 편집기에서 `precheck.sql` → 1~16번 모두 OK, 17번이 `c56e3560d4f9b4d98c724cbfc93ed228`, 18번 값 기록. 하나라도 「확인 필요」면 멈추고 Master에 알림.
3. `apply.sql` 한 번. `[멈춤]`이 나오면 아무것도 바뀌지 않은 것 — 다시 돌리지 말고 Master에 알림.
4. `verify.sql` → 21번 「전체」 20/20 OK, 22번이 precheck 18번과 같음.

## 4. 시작 조건(apply.sql 안, 하나라도 어긋나면 멈춤·변경 0)
몰 `aimaster-b2b` 있음 · 0102·0103 기록 각 정확히 1줄 · 0104 기록 0 · 0104 표 2개·함수 7개·지킴 트리거가 하나도 없음(부분 적용·옛 정의 멈춤) · 교환 표와 교환비 칸 4개 · `toss_call(text,text,text,jsonb,text)`·`exchange_event(uuid,text,text)`·`lock_exchange(uuid)`·`exchange_order_status_ok(text)`·`mall_builder_staff_can(uuid,text)` · 토스 비밀 키 칸(값은 읽지 않음) · `http` 확장.

## 5. 적용이 하는 일 / 하지 않는 일
**「표·함수 정의만이라 영향이 없다」고 보지 않는다** — 적용 즉시 로그인 회원에게 결제 준비·승인·다시 확인 함수가 열리므로 결제 기능이 켜지는 변경이다(6절).
- 한다: 결제 기록 표·시도 이력 표(RLS 켬, 결제 키·멱등키 칸은 회원 읽기 불가, 시도 이력은 회원·직원 권한 0), 내부 함수 4개(회원 실행 0), 교환 표 지킴 트리거 1개, 공개 함수 3개(`prepare`·`confirm`·`recheck`, 로그인 회원 실행 가능·비로그인 0), 적용 기록 1줄.
- 하지 않는다: 실제 토스 호출, 시험 자료(fixture) 넣기, 키 읽기, 준비·승인 함수 호출, 실제 결제, 기존 자료 변경. verify 4번이 결제 기록 0·시도 이력 0을 확인한다.

## 6. ⚠ 적용 전에 알아야 할 위험(전제)
- 적용하면 **로그인 회원이 준비·승인·다시 확인 함수를 부를 수 있게 된다.** 몰에 실제 토스 비밀 키가 이미 저장돼 있으면, 그 몰은 실제 교환비 결제 승인이 가능해진다(이 자료는 키가 있는지 읽지 않는다).
- **교환비만 따로 끄는 완전 중단 스위치는 없다.** `card_enabled`는 주문 카드 결제와 공유하고 새 결제 진입만 막으며, 이미 열린 결제창·콜백·DB 함수는 막지 못할 수 있다(RELEASE_PREREQ 5절). 임의로 바꾸지 않는다.
- 앱 화면은 지금 Lab 배포(11-11)에 없다. DB만 먼저 적용하면 함수는 열리지만 화면 진입점은 다음 Lab 빌드 전까지 없다(직접 rpc 호출은 가능).

## 7. 되돌리기 — 결제 기록 지우기 금지, 앞으로 고치기
- 0104 표를 DROP하는 되돌리기 파일은 만들지 않는다(결제·시도 이력이 사라짐). 문제가 생기면 다음 번호로 앞으로 고친다.
- **0102 전체 정리(`handoff-0102-lab/rollback.sql`, b5c3613c…)와의 순서(읽기 조사)**: 그 파일은 교환 표를 `drop table`(연쇄 삭제 없음)로 지운다. 0104를 적용한 뒤에는 결제 기록·시도 이력 표가 교환 표를 외래 키로 참조하므로 **그 단계에서 오류로 멈추고 트랜잭션 전체가 취소된다**. 또 그 파일은 먼저 시험 교환 줄을 지우는데, 0104 결제 기록은 `on delete cascade`라 같은 트랜잭션 안에서는 함께 지워지려다 취소된다. 그리고 0104 함수는 0102 함수(`exchange_event`·`lock_exchange`)를 본문에서 부르므로 의존 관계가 기록되지 않는다. 결론: **0104 적용 뒤에는 0102 정리 파일을 그대로 쓰지 않는다.** 0102 정리가 필요하면 0104 적용 전에 하거나, 0104 이후용 정리 자료를 따로 승인받아 만든다(이번에 만들지 않음).

## 8. 확인한 것과 못 한 것
- 2026-11-17 Lab에서 `precheck.sql` 1~16번 실제 실행(읽기): 16/16 OK, 17번 `c56e3560d4f9b4d98c724cbfc93ed228`, 18번 `ec616aef65e7059c3c4c7dbc7a38ec5e`.
- 로컬 리허설(`check-local.mjs`, 0001~0103만 적용한 새 `qa_` DB, 2026-11-17 실행 24/24 통과): 원본 `apply.sql`은 로컬에 `http` 확장이 없어 `[멈춤]`·기록 0(멈춤 조건 확인). 그 한 줄만 뺀 **사본**으로 적용 → 새 `verify` 구조 1~15 모두 OK → 반례 19개 모두 해당 항목 「확인 필요」(13절) → 두 번째 적용 `[멈춤] 0104 적용 기록이 이미 있습니다`·기록 1줄 유지 → DB 삭제.
  - 구분: 사본 리허설은 **흐름·문법·구조 항목 확인**이지 원본 `apply.sql` 그대로의 완전 실행 증거가 아니다. 원본의 완전성은 `build.mjs` 지문(원문 739b35e9…, apply d06b9bba…)으로만 보장한다.
  - **verify 16~20번(결제 기록 0줄·기존 자료 보존)은 빈 시험 DB라 미검증**이다(16번 0줄은 사본 적용 뒤 0이었으나 기준 자료가 없어 판정 제외) — Lab 실제 적용 뒤 verify에서만 확인된다.
- 못 한 것: Lab 실제 적용·verify, 실제 토스, 실제 화면. EXQA-1이 11-18 03:31(KST) 이후 자동 확정되면 precheck 15·16번 기준값이 바뀌므로 그때는 Master에 새 기준값을 받는다.

## 9. 최종 대조표 — 점검 항목별 기대값과 실제 조회값
기대값은 2026-11-17 Lab 읽기 기준. 「Lab 실조회」는 precheck를 Lab에서 실제 읽기로 실행한 값(같은 날), verify는 적용 전이라 Lab 실조회 없음.

| 파일·번호 | 항목 | 기대값 | Lab 실조회(2026-11-17) | 로컬 리허설 |
|---|---|---|---|---|
| precheck 1 | 몰 aimaster-b2b | 1 | 1 OK | 1 OK |
| precheck 2 | 0102·0103 기록 | 1/1 | 1/1 OK | 1/1 OK |
| precheck 3 | 0104 기록 | 0 | 0 OK | 0 OK |
| precheck 4 | 0104 표 2개 없음 | true/true | OK | OK |
| precheck 5 | 0104 함수·트리거 없음 | 0/0 | OK | OK |
| precheck 6 | 교환 표·교환비 칸 | true/4 | OK | OK |
| precheck 7 | 선행 함수 5개 | true×5 | OK | OK |
| precheck 8 | 토스 키 칸(값 미조회) | 1 | 1 OK | 1 OK |
| precheck 9 | http 확장 | 1 | 1 OK | 0 확인 필요(로컬에 확장 없음) |
| precheck 10 | 시간대 | UTC | OK | OK |
| precheck 11 | 교환 1행 | 1/rejected:none:0 | OK | 0/ (빈 DB) |
| precheck 12 | 교환 표 트리거 | 0 | 0 OK | 0 OK |
| precheck 13 | 시험 아닌 주문 | 17/1 | OK | 0/0 (빈 DB) |
| precheck 14 | 알림 | 44 | OK | 0 (빈 DB) |
| precheck 15 | EXQA-1/EXQA-2 | delivered/confirmed | OK | (없음) |
| precheck 16 | 장부·리워드 | 7203b416…:500 \| paid:500,pending:2300 | OK | 없음 |
| precheck 17 | 주문 지문(기록) | c56e3560d4f9b4d98c724cbfc93ed228 | c56e3560d4f9b4d98c724cbfc93ed228 | - |
| precheck 18 | 교환 행 지문(기록) | (적용 전 값 기록) | ec616aef65e7059c3c4c7dbc7a38ec5e | - |
| verify 1~3 | 0104 기록 1·0102/0103 그대로·표 2개 RLS | 1 · 1/1 · true/true | 미실행 | OK(사본) |
| verify 4~8 | 칸 형식·NOT NULL·기본값(needs_review 포함)·제약·정책 = 12절 목록 | 12절 | 미실행 | OK(사본) |
| verify 9~11 | 회원 읽기 칸 16개(키 2개 제외)·그 밖 권한 0·시도 이력 권한 0(효력+직접 부여) | 12절 | 미실행 | OK(사본) |
| verify 12~15 | 공개·내부 함수 서명·권한·search_path, 지킴 트리거 이름·켜짐·BEFORE UPDATE·연결 함수 | 12절 | 미실행 | OK(사본) |
| verify 16~20 | 결제 0줄·기존 교환·주문 지문·알림·EXQA·장부 보존 | precheck와 같음 | 미실행 | 미검증(빈 DB) |
| verify 21 | 전체 | 20/20 | 미실행 | 구조 15/15 OK, 자료 16~20은 판정 제외 |
| verify 22 | 교환 행 지문 | precheck 18과 같음(ec616aef…) | 미실행 | - |

## 10. 기준값이 바뀌었을 때의 규칙
- **EXQA-1(e0102000-…-031)은 11-18 03:31(KST) 이후 자동 구매 확정이 예정**돼 있다. 확정되면 precheck 15번(상태), 16번(장부 EXQA-1 1,400원·리워드 2줄 추가), 경우에 따라 14번(알림)과 18번(교환 행은 그대로여야 함)이 달라진다.
- 이때 **기대값만 새 값으로 바꿔 통과시키지 않는다.** 순서: 첫째 precheck 결과를 그대로 Master에 보고 → 둘째 바뀐 원인이 자동 구매 확정인지 이력(주문 이벤트·장부 줄 id·주문·리셀러·금액)으로 확인 → 셋째 0102/0103 정리 manifest 원칙(정확한 시험 주문·OWNER1·몰·earn·금액·출금 없음 결합, 기존 대기 리워드 2,300원 보존)으로 새 기준을 다시 검토 → 넷째 Master 승인 뒤 기대값을 바꾸고, 바꾼 이유·이전값·새 값·근거 조회를 이 파일과 precheck/verify 머리말에 기록하며, 파일 지문을 다시 계산해 2절 표를 고친다.
- 원인이 자동 확정이 아니거나 설명되지 않는 변화면 적용하지 않고 멈춘다.

## 11. 상태
자료 동결(커밋 이후 변경은 Master 지시가 있을 때만). **실제 적용 허가는 아직 없음.** 0102 정리(b5c3613c…) 실행 0, 새 기능 끄기 스위치·키 삭제·임시 권한 변경 같은 우회 0.

## 12. 구조 기대 목록(verify 4~15의 기대값 출처)
고정 0104 원문(739b35e9…)을 0001~0103만 적용한 격리 DB(Postgres 17.11, Lab은 17.6 — 같은 주 판)에 적용해 카탈로그에서 뽑은 값이다. verify는 `search_path`를 `"$user", public, extensions`로 고정한 뒤 비교한다(제약·정책 글자의 스키마 표기가 경로에 따라 달라짐). 소유자 이름·부여자 이름은 비교하지 않는다.
- 결제 기록 칸: `id uuid NN D=gen_random_uuid()` … `needs_review boolean NN D=false` … `updated_at timestamptz NN D=now()` — 18칸 전체 문자열은 verify 4번 기대값.
- 시도 이력 칸: 19칸 — verify 5번 기대값.
- 제약: 결제 기록 9개(금액>0, 상태 6종 prepared·requested·done·failed·unknown·canceled, 토스 주문 번호 `^exfee-[0-9a-f-]{36}$`, 교환·토스 주문 번호 유일, 외래 키 3개 cascade, 기본 키) / 시도 이력 6개(사유 3종, 외래 키 4개 cascade, 기본 키) — verify 6·7번.
- 정책: 결제 기록 정책 **개수 정확히 1**(모든 명령·역할) + `mall_builder_exchange_fee_payments_read`·SELECT(r)·허용형·authenticated·조건식 md5 `be5456c1963d9d605fc4e16d3f384b8e`(직원 orders 권한 또는 본인 주문)·쓰기 조건 없음(-) / 시도 이력 0개 — verify 8번. 조건식·쓰기 조건이 비어 있는(NULL) 정책도 「-」로 남겨 집계에서 빠지지 않게 했다(QA015 잔여 P2).
- 권한: 회원 읽기 칸 16개(결제 키·멱등키 제외), 직접 부여는 회원 칸 SELECT뿐, 비로그인 0, 쓰기 0 / 시도 이력은 PUBLIC·anon·authenticated 부여 0 — verify 9~11번.
- 함수: 공개 3개 security definer·`search_path=""`·회원 실행만 / 내부 4개(지킴 함수만 security definer)·회원·비로그인 실행 0 — verify 12~14번.
- 트리거: `mall_builder_exchanges_fee_card_guard`·켜짐(O)·BEFORE UPDATE·FOR EACH ROW·`mall_builder_private.exchanges_fee_card_guard()`, 교환 표 트리거는 이것 하나 — verify 15번.
- 범위: 인덱스는 제약에 딸린 것(기본 키·유일)만 제약 목록으로 확인하고, 일반 인덱스 `mall_builder_exchange_fee_payments_order`·`…_attempts_payment`는 이름·정의를 비교하지 않는다. 함수 본문(prosrc)은 비교하지 않는다(원문 완전성은 build.mjs 지문).

## 13. 반례 확인(QA015, 로컬 격리 DB 트랜잭션 안에서 흔들고 되돌림 — 0104 원문 자체는 바꾸지 않음)
| 반례 | 새 verify | 이전 verify(ee9c725ca) |
|---|---|---|
| 회원 needs_review 읽기 회수 | 9번 막음 | 거짓 통과 |
| 회원 receipt_url 읽기 회수 | 9번 막음 | 거짓 통과 |
| 비로그인 payment_key 칸 읽기 부여 | 10번 막음 | 거짓 통과 |
| 회원 status 칸 쓰기 부여 | 10번 막음 | 거짓 통과 |
| 시도 이력 회원 INSERT / UPDATE / 칸 SELECT / PUBLIC DELETE 부여 | 11번 막음(4건) | 거짓 통과(4건) |
| needs_review 기본값 제거 / NOT NULL 제거 | 4번 막음(2건) | 거짓 통과(2건) |
| 결제 상태 제약 제거 | 6번 막음 | 거짓 통과 |
| 시도 이력 사유 제약 제거 | 7번 막음 | 거짓 통과 |
| 조건 없는 INSERT 정책 추가(조건식 NULL·쓰기 조건 true) | 8번 막음 | 거짓 통과(ee9c725ca·5dca84102 모두) |
| 결제 기록 읽기 정책 조건 바꿈 | 8번 막음 | 거짓 통과 |
| 지킴 트리거 꺼짐 / 잘못 연결(AFTER·다른 함수) | 15번 막음(2건) | 거짓 통과(2건) |
| 내부 함수 회원 실행 부여 | 14번 막음 | 막음 |
| 공개 함수 search_path 바뀜 | 12번 막음 | 막음 |
| 공개 함수 비로그인 실행 부여 | 13번 막음 | 막음 |
합계 19건: 새 verify 19건 모두 막음, 이전 verify(ee9c725ca) 16건 거짓 통과. 마지막 반례(조건 없는 INSERT 정책)는 직전 판 verify(5dca84102)도 거짓 통과했음을 같은 리허설로 확인. 실행: `node mall-builder/docs/handoff-0104-lab/check-local.mjs` → 「합계 통과 24 / 실패 0」.

