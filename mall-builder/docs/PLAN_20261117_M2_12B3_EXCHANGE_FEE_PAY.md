# M2-12b b3 교환비 개인결제창(토스) 플랜 — 2026-11-17 · 상태: 계획(구현 전, Master 승인·결정 대기)

> 근거: [PLAN_20261116_M2_12_MESSAGING_EXCHANGE.md](PLAN_20261116_M2_12_MESSAGING_EXCHANGE.md) b3, 주인님 결정 D5(교환비 = 개인결제창(토스) + 무통장, 결제 확인 전 재발송 없음). 담당 Claude(B2BBackend) CC-B2B-BACK-01.
> 선행: 0102 교환(미배포·Lab 미적용, QA004 통과)·교환 화면(ab3150c0f·4985bf6ab). 무통장 입금 확인(`mall_builder_exchange_fee_paid`)은 이미 있음 — 이번은 **카드(토스) 결제**만 추가.

## 1. 지금 있는 것(재사용)
| 것 | 위치 | 이번에 쓰는 방법 |
|---|---|---|
| 토스 승인 호출(비밀 키는 DB 안에서만) | `mall_builder_private.toss_call`(0028) | 그대로 호출 |
| 주문 카드 결제 승인 틀(한 번만 승인·불확실이면 unknown·금액 대조) | `mall_builder_card_confirm`(0028) | 같은 틀로 교환비용 함수 새로 |
| 결과 다시 확인(불확실 → 토스 조회) | `mall_builder_card_recheck`(0028) | 같은 틀로 교환비용 |
| 결제창 위젯·성공/실패 주소 | `(shop)/orders/[id]/pay/*`, `lib/payment.ts` `parseSuccessParams` | 위젯 컴포넌트 재사용, 교환비 전용 경로 |
| 주문 단위 메시지 보내기 | `mall_builder_message_send(..., p_order_id)`(0101) | 결제 링크를 문자·메일로 |
| 몰 토스 키 | `mall_builder_store_scheduler_secrets.toss_secret_key`, `store_payment_settings.client_key` | 그대로(몰이 카드 결제를 켠 경우만 카드 단추) |

## 2. 만들 것(초안)
| 구분 | 파일 | 내용 |
|---|---|---|
| DB | `supabase/migrations/0103_exchange_fee_payments.sql` | 표 `mall_builder_exchange_fee_payments`(교환당 1개: exchange_id 고유, store_id, order_id, toss 주문 번호 `exfee-<교환 id>`, payment_key, amount, status requested·done·failed·unknown·canceled, method, approved_at, receipt_url, error). RLS 읽기 = 주문 권한 직원 또는 그 주문 유저, 쓰기 함수만. 함수: `mall_builder_exchange_fee_card_confirm(교환 id, payment_key, amount)` — 주문 유저만, 잠금 주문→교환, fee_status waiting·금액 = 교환비·키 있음 확인, 토스 승인 → done이면 교환 fee_status paid + 이력. `mall_builder_exchange_fee_card_recheck(교환 id)` 직원. 0102 `exchange_fee`(금액 변경)는 카드 결제 요청·불확실·완료가 있으면 막음(0103에서 함수 다시 정의). |
| 화면(유저) | `(shop)/orders/[id]/exchange-pay/[exchangeId]/{page,success/page,fail/page}.tsx` | 교환비 결제창(위젯 재사용) → 성공 주소가 승인 함수 호출 |
| 화면(교환 칸) | `app/exchange-panels.tsx` | 유저: 교환비 대기면 「카드로 결제」 단추(몰이 카드 결제를 켠 경우)·무통장 안내. 직원: 「결제 링크 보내기」(문자/메일, 0101 메시지), 결제 상태·불확실이면 「다시 확인」 |
| 서버 동작 | `lib/exchange-actions.ts` | 링크 보내기·다시 확인(소속 확인·고정 돌아갈 주소 규칙 그대로) |
| 시험 | `scripts/scenario-0103-*.sql`(토스 호출을 모의 함수로 바꿔 끼움 — 0100 볼타 시험과 같은 방식), `scripts/qa/run-0103-*.mjs`(빨강/초록·종료 코드), `tests/exchanges.test.mjs` 보강 |

## 3. 결정이 필요한 것(주인님·Master)
| # | 질문 | 추천 | 이유 |
|---|---|---|---|
| E1 | 카드로 교환비를 낸 뒤 교환이 **거절**되면? | **교환비 카드 결제 뒤에는 거절을 막음**(회수 완료 전이라도) — 거절이 필요하면 운영사가 「카드 결제 취소」를 먼저(다음 단위에서 버튼, 이번엔 막기만) | 자동 환불은 토스 취소 호출·부분 실패 처리가 더 필요. 돈이 나간 채 거절되는 일을 먼저 막는 것이 안전 |
| E2 | 결제 링크는 로그인 필요? | **로그인 필요(회원 주문만)** — 비회원 주문 교환비 결제는 다음 단위 | 교환 신청 자체가 회원 본인 주문만(비회원은 직원 대리 접수만). 비회원용 토큰 결제는 별도 보안 설계 |
| E3 | 몰이 카드 결제를 안 켰으면? | 카드 단추 숨기고 무통장 안내만 | 기존 주문 결제와 같음 |
| E4 | 새 유저 화면 경로 `(shop)/orders/[id]/exchange-pay/**` | Backend가 새 폴더로 만들고 기존 `(shop)` 파일은 안 고침(교환 칸 연결은 이미 있음) | Front/AGY 영역과 겹침 최소화 — Master 조정 요청 |

## 4. 지키는 것
- 회원 본인 키 규칙: 토스 키는 그 몰 운영사 본인 키(기존 설정). 운영자·다른 몰 키 사용 없음.
- 실결제 0: 로컬 시험은 토스 호출 모의. Lab 실제 결제 시험은 **토스 테스트 키(test_…)로만**, 실행 전 별도 승인.
- 운영 DB·빌드 0(미배포 묶음). 0103은 0102 뒤에만 적용 가능.

## 5. 순서(승인 뒤)
1. 0103 + 로컬 시나리오(모의 토스: 성공·실패·불확실·금액 다름·남의 교환·두 번 승인·결제 뒤 금액 변경·결제 뒤 거절) 빨강→초록
2. 서버 동작·화면 + 순수 시험·전체 시험·tsc
3. MacTester 검수 → Lab 실행 자료(0102 자료에 이어서)

## 6. 단계2(화면) 계획 — Master msg_5bfc18be54e9 「계획만」, 구현은 QA012 판정·추가 경로 예약 뒤
### 6-1. 정확한 경로
| 구분 | 경로 | 하는 일 |
|---|---|---|
| 새 | `src/app/s/[store]/(shop)/orders/[id]/exchange-pay/[exchangeId]/page.tsx` | 서버: 로그인(requireUser) → 몰 → 주문 주인 = 나 → 교환이 이 주문 것 → 교환비 대기·단계 회수 완료 이하·주문 delivered → 결제 기록 상태 읽기(결제 키 칸 제외). 카드 미설정 몰이면 무통장 안내만(E3). 결제 기록이 requested·unknown이면 위젯 대신 「확인 중」 안내, done이면 「결제 완료」 |
| 새 | `.../exchange-pay/[exchangeId]/success/page.tsx` | `parseSuccessParams('exfee-<교환 id>', 쿼리)` → rpc `mall_builder_exchange_fee_card_confirm` → **결제 키 없는 깨끗한 주소**(주문 상세 `?ok=1&msg=` / `?error=`)로 바로 이동. 결과 불확실(unknown)이면 「쇼핑몰이 확인 뒤 안내」 |
| 새 | `.../exchange-pay/[exchangeId]/fail/page.tsx` | 토스 실패 코드·문구만 표시, 주문 상세로 돌아가기(카드 돈 안 나감 안내) |
| 재사용(수정 없음) | `(shop)/orders/[id]/pay/pay-widget.tsx` | import만 — 금액·`exfee-<교환 id>`·`교환비 · <상품명>`·성공/실패 경로 전달. 위젯이 이미 결제 중 단추 비활성(중복 클릭 막음) |
| 고침 | `src/app/exchange-panels.tsx` | 유저: 교환비 대기 + 카드 설정 몰 + 진행 중 카드 결제 없음이면 「카드로 결제」 링크, requested·unknown이면 「카드 결제 확인 중」, failed면 「다시 결제」. 직원: 카드 결제 상태·영수증 링크, unknown·requested면 「카드 결제 다시 확인」, 「결제 링크 보내기」(아래) |
| 고침 | `src/lib/exchanges-server.ts` | 결제 기록(결제 키 칸 제외 열만 select)·몰 카드 설정(`store_payment_settings.card_enabled`·client key 있음 여부) 함께 읽기. 표 없음(0103 전 DB)은 결제 기능만 숨김 |
| 고침 | `src/lib/exchange-actions.ts` | `exchangeFeeCardRecheckAction`(직원, 소속 확인 → rpc recheck), `exchangeFeePayLinkAction`(직원, 문자/메일 — 0101 `mall_builder_message_send(…, p_order_id, dry_run)`: 먼저 미리보기(dry_run=true)로 받는 사람·요금 표시 → 「보내기 확인」 체크해야 실제 발송, 이번 검수는 미리보기까지만·실발송 0) |
| 고침 | `src/lib/exchanges.ts` | 순수: `feePayState(교환, 결제 기록, 카드 설정)` → 유저 단추/직원 단추/안내 문구, `exchangePayPath(slug, orderId, exchangeId)`(형식 검사 — 4985bf6ab 주소 규칙과 같음) |
| 고침 | `tests/exchanges.test.mjs` | 순수 상태 판단 + 소스 경계(아래) |

### 6-2. 오류·불확실·중복
- 결과 불확실(unknown): 유저는 위젯을 다시 띄우지 않음(서버가 이미 「확인 중」 반환·자동 재결제 0), 직원만 「다시 확인」.
- 실패(failed): 유저에게 「다시 결제」 노출(새 결제 키로만, 서버가 허용).
- 중복 클릭: 위젯 단추 비활성(기존) + 성공 주소 새로고침해도 서버가 already 반환 + 직원 단추는 제출 중 비활성(useFormStatus).
- 단계 경합: 결제 화면을 연 뒤 무통장 확인·거절이 되면 서버 승인이 거절(토스 안 부름) → 「이미 처리됨」 안내.

### 6-3. 결제 키 비노출
- 결제 키는 성공 주소 쿼리로만 들어와 서버 rpc 인자로 쓰고, 화면·이력·서버 로그(console 없음)·돌아가는 주소에 넣지 않음. 성공 페이지는 결과만 보고 바로 redirect.
- 읽기는 칸 권한으로 결제 키 제외(0103) — 화면 코드도 그 열을 select하지 않음(소스 시험으로 확인: `payment_key` 문자열이 화면·서버 읽기 코드에 없음).

### 6-4. 시험(구현 때)
순수 상태 판단(대기/진행 중/불확실/실패/완료 × 카드 설정 유무 × 단계), 결제 주소 형식, 소스 경계(성공 페이지가 rpc 전 parseSuccessParams·결제 키 미출력·redirect, 서버 동작 소속 확인 먼저·서버 키 없음, 링크 보내기는 dry_run 먼저), 전체 tests·tsc. 실토스·실발송·빌드 0.

### 6-5. 두 단계 반영(2026-11-17, Master msg_6d05eff9a1bc — 계획만, 코드 연결은 QA012 독립 검수 판정 뒤)
- **기존 한 단계 호출 앱 코드 0**: `grep -rn "exchange_fee_card" mall-builder/src mall-builder/tests` 결과 없음(f1938ec12 시점) — 바뀐 함수 모양(`card_confirm(교환, 결제 키)`, 금액 인자 없음)으로 깨질 화면 코드가 없음. 6-1 표의 성공 주소 행은 아래 순서로 대체.
- **성공 주소 처리 순서**(`.../exchange-pay/[exchangeId]/success/page.tsx`, 서버 컴포넌트, 렌더 전에 처리):
  1. `parseSuccessParams('exfee-<교환 id>', 쿼리)`로 결제 키·주문 번호·금액 형식 확인(아니면 결제 키 없는 주문 상세 `?error=`로 이동).
  2. rpc `mall_builder_exchange_fee_card_prepare(교환, 결제 키, 금액)` — **이 요청이 끝나 커밋된 뒤**.
  3. 별도 rpc `mall_builder_exchange_fee_card_confirm(교환, 결제 키)` — 2가 `prepared: true`일 때만. `already`면 완료, `unknown`·`expired`면 확인 중 안내.
  4. 결과만 들고 **결제 키 없는 주문 상세 주소로 즉시 redirect**(`?ok=1` / `?pay=checking` / `?error=<우리 코드>`). 토스가 처음 돌려보내는 성공 주소에는 결제 키가 쿼리로 **잠깐 들어오는 것을 피할 수 없다**(결제 대행사 방식) — 그 첫 콜백에서 서버가 처리한 뒤 키 없는 주소로 바로 옮긴다. 결제 키는 rpc 인자로만 쓰고 우리 console·이력·문서·오류 값·화면에 남기지 않는다. 실패·오류로 옮길 때도 토스 원문 메시지·원래 쿼리·결제 키를 복사하지 않고 우리 오류 코드만 넘긴다.
- **처음 성공 처리와 불확실 뒤 재진입은 다르다**:
  - 처음 성공 처리(위 1~4)는 토스 첫 콜백 1회의 흐름이다.
  - 불확실 뒤 재진입(응답 유실 뒤 같은 성공 주소 재방문 등)은 **현재 상태 확인이 먼저**다. 준비를 같은 결제 키로 다시 부르면 서버가 기록을 바꾸지 않고 현재 상태만 돌려준다. `done` → 완료, `requested`·`unknown`·처음 준비 30분 초과 → **토스 POST 0**, 「확인 중」 안내와 직원 다시 확인(GET)으로만 복구.
  - 승인 POST를 다시 보낼 수 있는 경우는 **`prepared`로 남은 강제 중단 경계뿐**이다. 이때도 서버가 준비 때 고정한 같은 결제 키·같은 본문·같은 멱등키로, **처음 준비 시각 기준 30분 안**에서만 보내는 통제된 재시도다(이미 승인된 범위).
  - 처음 준비 시각을 다시 정하지 않는다. 새 결제 키·새 결제창으로 유도하지 않는다. 화면이 스스로 다시 보내는 자동 반복도 없다(페이지 요청 1번에 서버 호출 1번). 확인 중 화면 문구는 「다시 결제하지 마세요, 쇼핑몰이 확인합니다」뿐이다.
  - 한계: 실제 토스가 같은 요청에 첫 응답을 돌려주는지, 실제 키 흐름은 시험하지 않았다(모의로만 확인).
- **30분 상한과 복구 안내**: 처음 준비 뒤 30분이 지나면 서버가 승인을 보내지 않고 `expired`를 돌려줌 → 유저 화면 「결제 확인 중(쇼핑몰이 확인)」, 직원 패널에 「카드 결제 다시 확인」(GET — 토스가 DONE·주문 번호·금액 일치일 때만 완료, 404·연결 실패는 상태 그대로).
- **실패 뒤 다시 결제**: 서버는 새 결제 키로만 준비를 허용(같은 키는 막힘). 실제 토스에서 실패한 결제 뒤 새 결제창이 고정 토스 주문 번호 `exfee-<교환 id>`를 다시 받아 주는지는 **미확인**(실키 시험 때 확인) — 화면 「다시 결제」 단추는 그 확인 전까지 정상 동작으로 표기하지 않는다.
- **오래 남은 「확인 중」(404·모름)**: 이번 범위에서 **해제 기능 미구현** — 유저·직원 화면 모두 「쇼핑몰 관리자(대표 운영사)에게 문의」 안내로 닫는다. 해제 권한을 새로 주지 않는다.
- 시험(구현 때, 6-4에 더함): 성공 페이지 소스 경계 — prepare 호출이 confirm 호출보다 먼저·별도 await, prepared일 때만 confirm, 결제 키 미출력·redirect, unknown/expired에 위젯·새 결제 링크 없음.

### 6-6. 확인 필요·취소 보류 화면 표시(2026-11-17, Master msg_e79ef2c5e6f2 — 계획만, 코드 연결은 QA 판정 뒤)
- **읽는 칸**(`src/lib/exchanges-server.ts`, 6-1의 결제 기록 읽기): `status`·`error`·`amount`·`approved_at`·`receipt_url`·`prepared_at`·`requested_at`만(결제 키·멱등키 칸은 권한 없음, select에도 넣지 않음). **시도 이력 표(`mall_builder_exchange_fee_payment_attempts`)는 화면·서버 읽기 코드에서 다루지 않는다**(권한 0, 소스 시험으로 문자열 없음 확인).
- **상태별 표시**(`src/lib/exchanges.ts` `feePayState` → `src/app/exchange-panels.tsx`):
  | 결제 기록 | 유저 | 직원 |
  |---|---|---|
  | prepared·requested·unknown | 「카드 결제 확인 중 — 다시 결제하지 마세요, 쇼핑몰이 확인합니다」 | 「카드 결제 확인 필요」 + 「다시 확인」 단추, 재발송 단추 **비활성**(이유 표시) |
  | canceled(토스 취소 보류) | 「결제가 취소되어 교환비가 결제되지 않은 상태입니다 — 쇼핑몰에 문의해 주세요」 | 「토스에서 취소된 결제 — 쇼핑몰 관리자(대표 운영사) 확인 필요」, 다시 결제·입금 확인·금액 변경·거절·재발송 단추 **비활성**, 다시 확인 단추 없음(끝난 상태) |
  | done + `needs_review = true`(7-9, 6-7) | 「결제 확인 중 — 쇼핑몰이 확인합니다」(완료로 보이지 않게) | 「결제 승인 기록 있음 · **지금 확인 필요(재발송 잠김)**」 + 다시 확인 단추, 재발송 단추 **비활성** |
  | done(사유 없음) | 「결제 완료」(영수증 링크) | 「카드 결제 완료」(영수증 링크) |
  | failed | 「결제가 되지 않았습니다 — 다시 결제」(단, 실패 뒤 같은 토스 주문 번호 재사용은 미확인이라 정상 표기 금지 — 6-5) | 「카드 결제 실패」 |
- **사유 문구**: 결제 기록 `error`는 우리 문구·토스 코드만 담음(원문 메시지 0, 결제 키 값 0) — 화면은 그대로 보여도 되지만 유저 화면에는 상세 사유 대신 위 고정 문구만.
- **화면 비활성은 보조**: 실제 잠금은 DB(0104 지킴 트리거) — 버튼을 우회해도 서버가 막는다.

#### 검토 의견(코드 변경 없음) — done 기록의 불일치 사유와 재발송 잠금은 지금 **함께 성립하지 않는다**
- 근거(`supabase/migrations/0104_exchange_fee_payments.sql`, 45c2c3a15): 다시 확인이 done 기록에서 ① 응답 결제 키·주문 번호 불일치(340행 `status = case when p.status = 'done' then 'done' …`) ② 토스 상태가 DONE 아님(349~351행, 사유만) ③ 응답 처리 중 오류(367행) 일 때 **status는 done 그대로, error 사유만** 적는다 → 원래 paid 증거(done·승인 시각·교환비 paid)는 보존됨.
- 그러나 재발송 잠금(122행)은 `v_pending`(102행 = prepared·requested·unknown·canceled)만 보므로 **done + 사유 상태에서는 재발송이 잠기지 않는다**. 또 done 기록의 다시 확인은 금액을 다시 대조하지 않는다(349행에서 바로 반환).
- 선택지(결정 필요, 구현 0): (가) 결제 기록에 「확인 필요」 표시 칸(예: `needs_review boolean`)을 두고 위 ①~③에서 켜며, 지킴 트리거 재발송 잠금 조건에 포함 — 사유 글자(`error`)에 의존하지 않음. (나) 지금처럼 사유만 두고 화면에서만 경고(DB 잠금 없음 — 권하지 않음). (다) done + 불일치를 unknown으로 내리기(원래 승인 증거는 이력 스냅샷으로 남김) — 지금 0104는 done을 내리지 않는 설계라 변경 폭이 큼.

#### 보관 근거 — 시도 이력은 기존 결제 기록과 같은 수명(새 보관 기간 아님)
- 쇼핑몰 마이그레이션에 주문·결제 기록을 일정 기간 뒤 자동 삭제하는 코드 없음(자동 정리는 `0066_expired_photos.sql` 사진뿐; 0028·0104의 `interval '30 …'`은 30분 결제 시한).
- 주문 카드 결제 `mall_builder_card_payments.order_id … on delete cascade`(`0028_card_payment.sql` 27행), 교환 `order_id … on delete cascade`(`0102_exchanges.sql` 10행), 교환비 결제 기록 `exchange_id … on delete cascade`·`order_id … on delete cascade`(0104), 시도 이력 `payment_id`·`exchange_id`·`order_id … on delete cascade`(0104) → **주문이 지워질 때 함께 지워지는 같은 범위**. 결제 기록은 생성 콘텐츠 30일 규칙과 구분되는 거래 기록(루트 지침 「결제·환경설정은 생성 콘텐츠와 구분」). 새 보존 기간·운영 DDL 허가를 뜻하지 않음.

### 6-7. needs_review 화면 반영(2026-11-17, Master msg_d3cb2f4f539c — 계획만, 새 화면 코드 0)
- **상태 판정 입력은 칸 값만**: `status`와 `needs_review`(참/거짓) 두 칸으로 화면 상태를 정한다. `error` 글자는 직원 화면에 사유로 **보여 주기만** 하고, 상태 판정·단추 활성 판단에 쓰지 않는다(`src/lib/exchanges.ts` `feePayState` 입력에 `error` 없음 — 소스 시험으로 확인).
- **승인 증거와 지금 잠금을 나눠 표시**(직원): 「승인 기록」 줄 = `status = done`·`approved_at`·영수증 링크(원래 증거, `needs_review`와 상관없이 그대로) / 「지금 상태」 줄 = `needs_review`가 참이면 「확인 필요 — 재발송 잠김」, 거짓이면 「정상」. 취소 보류(`canceled`)는 승인 기록 줄 대신 「토스에서 취소됨 — 유효한 결제 아님」(원래 승인 증거는 비공개 이력에만 있고 화면에 다루지 않음).
- **유저**: `needs_review`가 참인 done은 「결제 완료」로 보이지 않게 「결제 확인 중 — 쇼핑몰이 확인합니다」. 다시 결제·새 결제창 유도 0.
- **응답 계약 읽기 확인**(`supabase/migrations/0104_exchange_fee_payments.sql`, 5fb0245f0):
  - `card_prepare`(189행)·`card_confirm`(245행)은 done이면 `{ok: true, already: true}`만 돌려주고 **`needs_review`를 담지 않는다** → 함수 응답만으로는 「완료」와 「완료지만 확인 필요」를 구분할 수 없다(**현 계약 부족**).
  - 대신 결제 기록 읽기로는 구분된다: 회원 읽기 권한 칸에 `needs_review` 포함(52행 grant), 주문 주인·주문 권한 직원 읽기 정책(45행).
  - 그래서 화면 규칙: 성공 주소는 `already`를 받아도 「완료」라고 단정하지 않고, 결제 키 없는 주문 상세로 옮긴 뒤 **주문 상세가 결제 기록(`status`·`needs_review`)을 다시 읽어** 표시를 정한다(6-5 순서 그대로, `?ok=1` 대신 중립 `?pay=returned`).
  - 선택 보강(미승인, 구현 0): `already` 응답에 `needs_review`를 함께 담는 0104 소변경 — 화면은 위 다시 읽기로 충분하므로 필수 아님.
- 시험(구현 때, 6-4에 더함): `feePayState` — done+needs_review(유저 확인 중·직원 확인 필요·재발송 비활성), done 정상, canceled, error 글자만 다르고 칸 값이 같으면 결과 같음(글자 비의존), 성공 주소가 `already`에서 `?ok=1`을 쓰지 않음.

## 7. 두 단계(준비 기록 확정 → 승인) 설계 — Master msg_b96fa60fd0cf 채택 방향, 코드 전 보고(실서비스 해제 아님)
### 7-1. 상태 전이(교환비 결제 기록 1개/교환)
| 상태 | 들어오는 길 | 의미 | 나가는 길 |
|---|---|---|---|
| (없음) | — | 결제 시도 전 | prepare → **prepared** |
| **prepared**(새) | prepare RPC가 **커밋** | 결제 키·금액·토스 주문 번호 고정 저장. 토스 승인은 아직이거나, 승인 호출 도중 강제 중단으로 되돌아온 상태(구분 불가 — 7-3) | confirm → requested → done/failed/unknown, 직원 다시 확인 |
| requested | confirm 안(같은 트랜잭션) | 승인 호출 중. 커밋되면 「승인 결과 처리 중 멈춤」 흔적 | 직원 다시 확인 |
| done | confirm·다시 확인 | 결제 완료 → 교환비 paid | (취소는 다음 단위) |
| failed | 4xx·토스 ABORTED/EXPIRED/CANCELED | 돈 안 나감 확인됨 | 새 prepare(새 결제 키) 허용 |
| unknown | 5xx·연결 끊김·응답 처리 오류·응답 불일치 | 결과 모름 | 직원 다시 확인만 |
- 지킴 트리거의 「진행 중」에 **prepared 추가**(prepared·requested·unknown·done이면 금액 변경·거절 금지, prepared·requested·unknown이면 무통장 paid 금지).

### 7-2. 함수와 화면 호출
- `mall_builder_exchange_fee_card_prepare(교환 id, 결제 키, 금액)` — 그 주문 유저만, 주문 → 교환 → 결제 잠금, 주문 delivered·단계·교환비 waiting·금액 = 교환비·몰 키 있음 확인 뒤 기록을 prepared로 넣고 끝(외부 호출 없음). **같은 결제 키로 다시 부르면 그대로 성공(재진입)**, 다른 결제 키는 기존 기록이 failed일 때만 교체 — prepared·requested·unknown·done이면 거절(「앞 결제를 확인 중」).
- `mall_builder_exchange_fee_card_confirm(교환 id, 결제 키)` — 금액 인자 없음(prepare에 고정된 값만 사용). 기록이 prepared이고 결제 키가 같을 때만 토스 승인(멱등 헤더 `exfee-confirm-<결제 키>`, 본문은 prepare에 고정된 주문 번호·금액 → 같은 요청). requested·unknown이면 토스 호출 0(「확인 중」), done이면 already, failed면 「다시 결제」 안내.
- 성공 주소 화면: `parseSuccessParams` → rpc prepare(커밋됨) → rpc confirm → 결제 키 없는 주소로 redirect. 두 RPC는 **별개의 HTTP 요청 = 별개의 트랜잭션**이라 prepare 커밋이 confirm의 되돌림에 휩쓸리지 않는다.

### 7-3. 강제 중단·재진입 구분(핵심 질문)
| 경우 | DB에 남는 것 | 다음 confirm(같은 결제 키) | 근거·한계 |
|---|---|---|---|
| prepare 뒤, confirm 전 중단 | prepared | 토스 **최초** 승인 호출(정상) | — |
| confirm이 토스 호출 **전** 중단 | prepared(requested 갱신이 되돌려짐) | 최초 승인 호출 | — |
| confirm이 토스 호출 **도중·뒤** 중단(DONE일 수 있음) | prepared(되돌려짐) — 위와 **구분 불가** | 같은 멱등 키·같은 본문으로 다시 호출 → 문서상 「첫 요청과 같은 응답」(15일) → DONE이면 그대로 반영, 이중 청구 없음이 기대 | 근거: 토스 문서 「같은 요청은 첫 응답 반환」. **「이중 과금 없음」 명시 문구는 없음**, 판단 기준은 키·주소·메서드(본문 변경 동작은 문서에 없음 — 본문을 바꿀 길을 아예 막음). 15일 경계: confirm은 prepare 뒤 **30분 안에서만**(그 뒤 prepared는 직원 다시 확인만) — 15일보다 훨씬 짧게 |
| confirm 응답 처리 중 함수 안 오류 | unknown(안쪽 예외 블록, 커밋) | 토스 호출 0 | 기존 QA012 수정 |
- 정리: 「prepared로 되돌아간 뒤 다시 승인」은 **같은 결제 키·같은 본문·같은 멱등 키·30분 안**에서만 일어나도록 묶어, 문서가 말하는 「같은 요청 재전송」 범위에 둔다. 외부 원자성을 보장하는 것은 아니다(멱등 응답이 문서대로 동작한다는 전제).

### 7-4. 복구(직원 다시 확인 = GET /v1/payments/{결제 키}, 위젯 키 사용 가능)
- prepared·requested·unknown 모두 대상(결제 키가 커밋돼 있으므로 하드 중단 뒤에도 조회 가능).
- DONE + 주문 번호·금액 일치 → done·paid. DONE 불일치 → unknown 유지(관리자).
- ABORTED·EXPIRED·CANCELED → failed(새 결제 허용).
- READY·IN_PROGRESS·WAITING → 그대로(아직 진행 중).
- **404·응답 모름·연결 실패 → 상태 그대로**(재결제 허용으로 풀지 않음). 오래 남으면 화면에 「장기 확인 필요」 표시.
- 결정 필요(Master·주인님): 404/모름이 오래 남을 때 **대표 운영사 수동 해제**(사유 입력·시각 조건·이력)를 둘지 — 이번 설계엔 넣지 않음.

### 7-5. 시험 계획(구현 때, 모의)
prepare 재진입·다른 키 교체 거절·failed 뒤 교체 허용 / prepare 뒤 confirm 전 중단(prepared 남음 → confirm 최초 호출 1회) / confirm 토스 호출 뒤 강제 되돌림 흉내(prepared 복귀 → 같은 키 재confirm은 같은 멱등 키·같은 본문으로 1회 더 호출, 모의가 첫 응답을 돌려줌 → done 1건) / 30분 지난 prepared는 confirm 거절·다시 확인만 / GET 404·모름은 상태 유지 / 지킴(prepared 중 무통장·거절·금액 변경 막힘) / 기존 F1~F21 회귀. 외부 원자성 없음·장기 unknown 안내는 문서·화면에 유지.

### 7-6. 구현 결과(2026-11-17, Master msg_e4cc90983f45 — 0104 원래 범위, 미적용 원문 직접 수정)
- 0104: 결제 기록에 `prepared` 상태·`prepared_at`(처음 준비 시각, 다시 준비해도 안 바뀜)·`requested_at`·`idempotency_key`(준비 때 `exfee-confirm-<결제 키>`로 고정, 읽기 권한 없음) 추가. 새 함수 `mall_builder_exchange_fee_card_prepare(교환, 결제 키, 금액)`(외부 호출 0), `card_confirm(교환, 결제 키)`(금액 인자 없음 — 준비 고정값만). 지킴 트리거 「진행 중」에 prepared 포함. 다시 확인은 prepared·requested·unknown만 조회(실패·완료·취소는 그대로), 404·연결 실패는 상태 유지. 공용 toss_call·0032·0102·0103 변경 0.
- 시험 `scripts/qa/run-0104-feepay.mjs` **33/33**(두 번 같음): 기존 F1~F21(도우미가 준비 → 승인 두 요청으로) + P1~P11 + P6 빨강. 외부 효과는 모의 토스가 `dblink` 별도 연결로 남기는 `qa_toss_ext`(트랜잭션 밖)로, DB 안 기록 `qa_toss_calls`(되돌려짐)와 분리.
  - P6a 승인 도중 서버가 세션 종료 → prepared·결제 키 남음·requested 되돌려짐·DB 안 기록 0·외부 요청 1 / P6b 다시 승인 → 같은 멱등키·같은 본문으로 1회 더(외부 2회, 본문 1종) → done / **P6 빨강**: 이전 한 단계(0edda8666)는 같은 중단에서 외부 1회 나갔는데 결제 기록·키 0.
  - P7 다른 작업자 동시 승인 → 뒤 요청은 잠금 대기 초과로 외부 0. P8 처음 준비 31분 뒤 승인 → 외부 0·prepared 유지, 다시 확인 GET → done / 29분은 승인. P9 GET 404 → prepared·unknown 그대로. P10 requested → 외부 0. P11 실패 뒤 같은 키 막힘·새 키는 새 시각·새 멱등키.
  - `--no-guard` 빨강: F6·F17·F18·P4(준비 중 무통장·거절·금액 변경)·P5 실패(27/5).
- 한계(문서 유지): 같은 요청 재전송이 첫 응답을 돌려준다는 토스 문서에 기댐(외부 원자성 아님). 토스 주문 번호는 교환마다 `exfee-<교환 id>` 고정 — 실패 뒤 새 결제창에서 같은 주문 번호를 다시 쓸 수 있는지는 실키 시험 때 확인 필요. 404·모름이 오래 남을 때 해제는 이번 범위 미구현 — 화면에서 「쇼핑몰 관리자(대표 운영사)에게 문의」로 닫음(해제 권한 새로 주지 않음, 6-5).

### 7-7. 응답 결제 키 검증(구현) · 시도 이력 보존안 · CANCELED 처리안(제안, 범위 확정 전 구현 0) — Master msg_23331b0fe85e
- **구현(0104 미적용 원문)**: 승인 POST·다시 확인 GET 모두 DONE 판정에 `jsonb_typeof(응답.paymentKey) = 'string'` 그리고 `응답.paymentKey = 준비 때 고정 키`를 더함(주문 번호·금액 검증 유지). 없거나·글자가 아니거나·다르면 완료·교환비 paid 0, unknown·waiting 유지, 결제 키 보존, 자동 재POST·새 키 0. 모의 응답은 실제 계약대로 paymentKey 포함. 시험 K1~K5(POST 빠짐·다른 키·숫자 / GET 빠짐·다른 키) — 새 판 38/38, 이전 판(`--mig0104-from f1938ec12`)은 K1~K5만 실패(33/5). 모의 시험이라 실제 멱등·이중 과금 0을 증명한 것은 아님.
- **시도 이력 보존 — 조사**: 기존 감사 기록 중 쓸 만한 것 없음. 주문 이력(`mall_builder_order_events`, 교환 이력도 여기)은 유저·직원에게 보이는 표라 결제 키·멱등키를 넣을 수 없음. 직원 접속 기록(`mall_builder_staff_access_logs`, 0043)은 법정 열람 기록 용도라 맞지 않음. 지금 0104는 실패한 결제를 새 키로 교체할 때 이전 키·오류·시각·멱등키를 덮어써 사라짐.
- **보존안(제안)**: 0104 안에 추가만 되는 표 `mall_builder_exchange_fee_payment_attempts`(결제 기록 id·교환·몰·주문·이전 결제 키·멱등키·상태·오류·처음 준비 시각·요청 시각·보관 시각). RLS 켜고 정책·권한 0(로그인 회원·직원 직접 읽기·수정·삭제 0, 함수만 쓰기) — 외부 공개 grant 없음. `card_prepare`가 failed 기록을 새 키로 바꾸기 **직전에** 그 행을 그대로 한 줄 추가, 주문 이력에는 키 없는 메모(「교환비 카드 결제 실패 기록 보관」)만. 바뀌는 경로: `supabase/migrations/0104_exchange_fee_payments.sql`(표·prepare 교체 부분), `scripts/qa/run-0104-feepay.mjs`(교체 뒤 이전 시도 1줄·키·오류·시각 보존, 회원 역할 select·update·delete 거부). 직원 화면 노출은 이번 범위 아님.
- **CANCELED(제안)**: 지금 0104 다시 확인은 ABORTED·EXPIRED·CANCELED를 모두 failed로 바꿔 새 키 결제를 허용함 → CANCELED는 「승인 뒤 취소」라 돈 흐름이 있었으므로 failed로 두지 않는다. 주문 카드 결제(0029 `card_recheck`)도 CANCELED는 실패로 바꾸지 않고 불일치만 표시함.
  - ABORTED·EXPIRED → failed(돈 안 나감, 새 결제 허용) 유지.
  - CANCELED·PARTIAL_CANCELED → 결제 기록이 prepared·requested·unknown이면 unknown 유지 + 사유 「승인 뒤 취소됨 — 관리자 확인」(같은 키 준비·새 키 교체 모두 막힘). done이면 done 유지 + 사유 표시(0029처럼 숫자 안 바꿈).
  - 잠금: 0104 교환 지킴 트리거에 「확인 필요(unknown·requested·prepared) 카드 결제가 있으면 재발송(reshipped) 전이 금지」를 더하고, done 기록에 취소 사유가 붙으면 같은 잠금 → 재발송·paid 0 유지, 화면 「관리자(대표 운영사) 문의」. 자동 환불·수동 해제 추가 0. 공용 0032·toss_call·0102·0103 변경 0.

### 7-8. 시도 이력·취소 보류 구현(2026-11-17, Master msg_4ffc6cca7adb 최소 범위 — 0104 미적용 원문)
- **이력 표** `mall_builder_exchange_fee_payment_attempts`(추가만): RLS 켬·정책 0·`public, anon, authenticated` 권한 회수, 소유자 권한 함수(`exchange_fee_attempt_archive`)만 쓴다. 남기는 때는 두 번뿐 — 실패한 결제를 새 결제 키로 바꾸기 직전(`replaced_failed`), 토스 취소로 보류할 때(`toss_canceled`·`toss_partial_canceled`). 같은 키 재준비·재승인은 남기지 않음. 지우는 범위는 결제 기록과 같음(교환·주문 삭제 시 함께).
- **취소 보류**: 다시 확인이 같은 결제(응답 결제 키 글자·준비 키 일치 + 주문 번호 일치)의 CANCELED·PARTIAL_CANCELED를 확인하면 → 그 순간 기록을 이력에 남기고 결제 기록 `canceled`, 교환비 `paid`였으면 `waiting`·입금 시각 비움, 주문 이력에 키 없는 메모. 교환 단계·재고는 자동으로 되돌리지 않음. 보류 중에는 같은 키·새 키 준비·승인·무통장 확인·금액 변경·거절·재발송이 모두 막힘(지킴 트리거에 canceled·재발송 잠금 추가). 자동 환불·수동 해제 0, 화면은 관리자 문의.
- **다시 확인 경로**: 예전엔 done이면 바로 돌아가 취소를 볼 수 없었음 → 이제 done도 실제 조회(직원 주문 권한·주문 → 교환 → 결제 잠금 그대로). DONE이면 변화 0(이력 중복 0). failed·canceled는 끝난 상태라 조회 안 함. 다른 결제 키·주문 번호 응답이면 어떤 상태로도 안 풀림(done이면 그대로+사유, 그 밖은 unknown). ABORTED·EXPIRED는 같은 결제일 때만 failed.
- **원문 비노출**: 승인 실패 기록은 토스 HTTP 상태·오류 코드·상태 이름만(영문 대문자·숫자·밑줄), 유저 문구는 우리 문구. 다시 확인 오류도 HTTP 상태만. 「결제 키」는 항목 이름으로만 쓰고 값은 남기지 않음.
- 시험 50/50(두 번 같음): C1 done 다시 확인 = 실제 GET·변화 0·이력 0 / C2 done+CANCELED → 보류·waiting·이력 1(승인 증거)·다시 확인 조회 0 / C3 보류 잠금 7가지·외부 POST 0 / C4 PARTIAL / C5 unknown+CANCELED / C6 다른 키 CANCELED(done 유지) / C7 다른 주문 번호 CANCELED(unknown 유지) / C8 다른 키 ABORTED(failed 아님) / C9 실패→새 키 교체 직전 1줄·같은 키 재시도 이력 0 / C10 원문 메시지 없음 / C11 회원·직원·비로그인 읽기·쓰기·수정·삭제 거부 / C12 교환 삭제 시 함께 삭제. 직전 판(`--mig0104-from e0dfdbf19`)은 C1~C12만 실패(38/12). 모의 시험이라 실제 멱등·이중 과금 0 증명 아님.

### 7-9. needs_review 구현(2026-11-17, Master msg_42474143b949 — QA012 P1, 6-6 검토 의견 (가) 채택, 0104 미적용 원문)
- 결제 기록 `needs_review boolean not null default false`(회원 읽기 칸 포함, 값만 참/거짓). 지킴 트리거의 대기 판정에 `status = 'done' and needs_review` 추가 → 재발송 막힘. 무통장 확인(이미 paid라 「대기 없음」)·거절·금액 변경(done은 진행 중 결제로 이미 잠김)·새 키 준비(done이면 already)로도 우회 안 됨.
- 다시 확인(done): 같은 결제 대조 실패·DONE 아님·금액 다름·연결 실패·HTTP 200 아님·응답 처리 오류 → `needs_review = true`(status·승인 시각·교환비 paid 그대로). 해제는 같은 결제 키·주문 번호 + 정확한 `DONE` + 금액 일치를 실제 조회로 확인했을 때만. 404·잘못된 응답으로는 해제 0. done 정상 재조회도 금액 대조 뒤에만 반환. 취소 보류(canceled)는 조회하지 않고 그대로(자동 해제 0).
- 판정은 응답 원래 글자 그대로(`v_raw = 'DONE'`, `in ('CANCELED','PARTIAL_CANCELED')`), 기호를 걸러 낸 값(`v_disp`)은 표시·반환용만. 소문자 `canceled`·끝 공백 `CANCELED `는 취소로 보지 않음.
- 원문 비노출: 모든 POST·GET 예외 처리에서 `SQLERRM`·응답 값을 기록·반환·이력에 넣지 않음 — 고정 문구 + `SQLSTATE`·HTTP 상태만(0104 안 `sqlerrm` 0건).
- 시험 60/60(두 번 같음): D1~D7 실제 흐름(완료 → 직원 입고 → 재발송 RPC)에서 다른 키·다른 주문 번호·금액 다름·READY·연결 예외·HTTP 500·가짜 취소 글자 → 확인 필요·재발송 막힘 → 정확한 DONE 재확인으로 해제·재발송 됨, D1은 우회 4종 막힘·404/소문자 done으로 해제 0 / D8 취소 보류는 정상 DONE 조회로 안 풀림 / D9 approvedAt 자리에 결제 키가 든 POST·GET 응답 → 기록·반환에 키 원문 0·SQLSTATE만 / D10 모든 오류 칸 키 원문 0. 직전 판(`--mig0104-from 45c2c3a15`)은 D1~D7·D9 실패(52/8), D8·D10은 회귀 방지 항목(직전 판도 통과). 모의 시험이라 실제 멱등·이중 과금 0 증명 아님.
