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
