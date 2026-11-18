# 주인님 직접 지시 P3 3항목 결과 (2026-11-19, CC-B2B-FRONT-01)

- 지시: 주인님 채팅 「진행해」(갤러리 색 단추·원래 가격·S70). Master 확인 msg_5b03c9657475(1·2 순차 진행, S70은 읽기 대조 먼저). 빌드·배포·푸시·DB 0. Lab `7609748ad`·`77c50f27c`와 분리된 후속(미배포).

## 1. 템플릿 갤러리 색 단추 누름 영역 — 완료 `90248e5b1`
- 24px 원(+테두리 실측 26) → 단추 44×44(h-11 w-11), 보이는 원 28×28 안쪽 span. 키보드(roving tabindex·화살표·Home/End)·aria-checked·선택 테두리 그대로, focus-visible ring 추가.
- 검증(작성자 자체): gallery-keyboard 5/5, ego 3210 1280·390 실측 44×44, 카드당 2줄, 넘침 0, 원 밖 5px 클릭도 선택.

## 2. 줄 그은 원래 가격 대비 — 완료 `86e5ad1bf`
- `product-card.tsx:78`·`p/[id]/product-detail.tsx:196` `text-slate-400` → `text-slate-600`.
- 실측(실제 Tailwind 컴파일, 12색 × 밝게/어둡게 × 흰 카드/몰 바탕): 전 2.28~2.63 → 후 6.57~7.58. 후보 slate-500은 3.63~4.59로 미달이라 제외.

## 3. S70 현금영수증 칸 — 읽기 대조만(코드 0)
### 현재 제출 경로
- 주문서 `(shop)/order/order-form.tsx`(결제 수단 radio `pay_method` bank/credit/card, 승인 사업자만 「세금계산서 발행 요청」 `want_invoice`·`invoice_email`) → `order/actions.ts` `placeOrderAction` → RPC `mall_builder_place_order_v2` → 세금계산서는 주문 생성 **뒤** `mall_builder_request_tax_invoice` 별도 호출, 실패해도 주문은 남기고 `orders/[id]?done=1&error=세금계산서 요청 실패: …`로 이동(카드는 `/pay`로).
- 비회원 주문은 `guest-actions.ts` `mall_builder_place_guest_order`(별도).
### 기존 정책·검증(0100, `src/lib/cash-receipt*.ts`)
- RPC `mall_builder_cash_receipt_request(p_order_id, p_type, p_value, p_purpose)`: 로그인 본인 주문만, 몰 `settings.cash_receipt.enabled`, 카드·외상·세금계산서 요청 주문 불가, 상태 pending_payment~delivered, **이미 신청(실패·취소 제외)이면 오류 → 멱등(두 번 발급 없음)**. 무통장 입금 대기는 「신청함」만 기록, 입금 확인 때 발급. 상태가 이미 paid(0원 주문 등)면 그 자리에서 발급 함수 호출.
- 화면 검사 `parseCashReceiptForm`(종류 3가지·010 11자리·사업자 10자리), 주문 뒤 신청 칸 `src/app/cash-receipt-panels.tsx`(유저 주문 상세에 이미 있음 — 재신청 가능).
### 제안 경계(확정 뒤 코드)
- UI `order-form.tsx`: 무통장이고 몰 설정이 켜졌을 때만 「영수증: 안 받음 / 현금영수증 / 세금계산서(승인 사업자)」 하나만 고르게(둘 다 불가 정책과 맞춤), 현금영수증이면 종류 select(`CASH_RECEIPT_KINDS`) + 번호 칸.
- 서버 `order/actions.ts`: 주문 생성 성공 + 무통장 + 현금영수증 선택일 때만 `parseCashReceiptForm` → RPC 호출. 실패해도 주문은 그대로, 세금계산서와 같은 패턴으로 `orders/[id]?done=1&error=현금영수증 신청 실패: …` → 주문 상세의 기존 칸에서 다시 신청.
- `order/page.tsx`: `cashReceiptEnabled(store.settings)` 값을 폼에 전달.
- 범위 밖: 비회원 주문(RPC가 로그인 필요), 카드·외상.
### 위험·확인 필요
- 0원(쿠폰·포인트 전액) 무통장 주문은 생성 즉시 paid → 신청과 동시에 실제 발급(볼타) 호출. Lab 시험 시 실제 발급 키가 있으면 실제 API 쓰기가 되므로, 시험은 RPC 모의 또는 enabled 꺼진 몰로만.
- 소유: `order/*` 3파일은 상점 주문 흐름이라 Backend 확인 필요(S70은 「프론트 화면이라 부탁」이라 했음). 확인 요청 보냄.

### S70 구체 가드안 (Master msg_c937016a8334, 코드 0 — Backend 합의 뒤 구현)
근거: `place_order_v2`는 `(order_id, order_no)`만 반환. 상태는 함수 안에서 0원 → `paid`(274), 외상 → `paid`(282), 카드·무통장 → `pending_payment`(289·293). 신청 RPC는 `pending_payment`가 아니면 그 자리에서 `cash_receipt_issue`(실제 발급)를 부름.
1. **즉시 발급 경로 차단(자동 접수 범위 = 무통장 입금 대기만)**
   - 화면: `t.total === 0`이면 현금영수증 선택지를 숨김(0원은 무통장으로 바뀌어 바로 결제 완료되는 기존 규칙과 같은 조건).
   - 서버(`placeOrderAction`): 주문 생성 뒤 `mall_builder_orders`에서 본인 주문 `status, is_card, is_credit, total` 1행을 다시 읽어 **`status === 'pending_payment' && !is_card && !is_credit && payMethod === 'bank'`일 때만** 신청 RPC 호출. 아니면 호출하지 않고 고정 안내(아래 3)로 주문 상세로 보냄 — 결제 완료 주문의 신청은 유저가 상세 칸에서 직접(기존 동작) 할 때만.
2. **주문 중복 없음·재시도는 기존 상세**: 신청은 주문 생성 **뒤** 같은 요청에서 1번만, 실패해도 주문을 되돌리거나 다시 만들지 않음. 폼 다시 보내기는 기존 `noResetSubmit`·결과 리다이렉트로 막힘. RPC가 「이미 신청」이면 오류(멱등). 재시도는 `orders/[id]`의 기존 `cash-receipt-panels.tsx` 칸.
3. **원문 비노출 고정 안내**: RPC 오류 `error.message`(휴대폰·사업자번호 검사 문구, 발급 공급자 원문 가능)를 URL·로그에 넣지 않음. 실패 시 `orders/[id]?done=1&error=` 에 **고정 문구** 「현금영수증 신청이 처리되지 않았습니다. 주문 상세 아래 현금영수증 칸에서 다시 신청해 주세요.」만. 서버 `console.*`에 번호·응답 원문 기록 0. 번호는 폼 → RPC 인자로만(쿼리스트링 0). 형식 오류는 주문 만들기 **전**에 `parseCashReceiptForm`으로 막고 폼에 고정 문구로 되돌림(주문 0건).
4. **세금계산서 상호 배제 서버 검사**: `placeOrderAction` 맨 앞에서 `want_invoice === "on"`과 현금영수증 선택이 함께 오면 주문 만들기 전에 거절(「세금계산서와 현금영수증은 하나만 고를 수 있습니다.」, 주문 0건). 화면은 택1 radio. DB도 세금계산서가 있으면 신청을 막음(2중).
5. **기존 입금 대기 흐름 기준**: 무통장 → `pending_payment` → RPC는 `status: requested`만 기록(실제 발급 0) → 운영사 입금 확인 때 기존 0100 흐름이 발급. 이 흐름 밖(카드·외상·0원·비회원)은 자동 접수 대상 아님.
- 수정 파일 예정(합의 뒤): `(shop)/order/order-form.tsx`·`order/actions.ts`·`order/page.tsx` + 순수 함수 시험(가드 조건·고정 문구, 실제 RPC·발급 호출 0, 모의만). DB 변경·실제 발급/결제·배포 0.

### Backend 회신(msg_28699d6f3615, CC-B2B-BACK-01) — 경계 합의
- `order-form.tsx`·`order/actions.ts`·`order/page.tsx` 프론트 수정 가능(Backend 미커밋·예정 수정 0, 0101~0104 묶음과 무관), DB 함수 변경 불필요.
- 0원 주문은 신청 시 즉시 `cash_receipt_issue`가 불리지만 1원 미만이면 볼타 미호출·`failed`(「발급할 금액이 없습니다」) — 외부 발급 0이나 유저 화면에 실패로 보여 **0원은 칸 숨김/호출 건너뜀 권장** → 가드안 1과 일치.
- 지킬 것: 로그인 세션 클라이언트로만 RPC(서비스 키 금지), 번호 로그·URL·오류 문구 0, 최종 검증은 DB, 세금계산서 동시 불가, `settings.cash_receipt.enabled` 꺼지면 칸 미노출, 실패해도 주문 유지·`?done=1&error=`, 비회원·카드·외상 제외. 실제 볼타 발급은 시험 키로만, 실제 결제 시험은 최종 완성 단계(2026-11-19 주인님).
- 차이 1개: Backend는 「DB 오류 문구만 노출 가능」, Master는 고정 안내 — **더 엄격한 고정 안내 채택**(DB 문구도 URL에 넣지 않음).

### S70 구현 (B2B-20261119-S70-FRONT, Master msg_dc044907421b, 0105 계약 `195f9ba43`) — ready_review
- 커밋 `50d3e6162`(5 files +164 −1). 점유 `9d1b8624e` → 해제 이 기록과 함께. 운영·Lab·SQL 적용·빌드·배포·푸시·실결제 0.
- SHA(작업폴더 = HEAD): `order/order-form.tsx` ab22968a4088 · `order/actions.ts` e9e2a29608c5 · `order/page.tsx` 0d6c2a9809d2 · 새 `order/cash-receipt-checkout.ts` 3b9af74e6302 · 새 `tests/cash-receipt-checkout.test.mjs` 5a9a21f470f6.
- 흐름: 주문 전 `readCheckoutCashReceipt`(무통장+선택일 때만, 세금계산서 동시·형식 오류는 고정 문구로 주문 0건) → `place_order_v2` → 세금계산서(기존) → 선택 시 세션 `rpc("mall_builder_cash_receipt_checkout")` 1회 → `checkoutCashReceiptNotice`: `accepted:true`만 성공, `not_eligible`·오류·빈 응답은 같은 고정 안내 「현금영수증 신청이 처리되지 않았습니다. 주문 상세 아래 현금영수증 칸에서 다시 신청해 주세요.」로 `orders/[id]?done=1&error=`. 주문은 그대로, 재시도 호출 0, 0100 신청 직접 호출 0, 앱 선조회 0(판정은 0105 행 잠금), `console` 0, 번호·원문 URL/로그 0.
- 화면: 장바구니 주문(`order/page.tsx`가 `cashReceiptEnabled(store.settings)` 전달)·무통장·결제 금액 1원 이상에서만 칸, 세금계산서와 체크 택1. 견적 주문(`quotes/[id]`)·비회원·카드·외상·주문 상세 수동 신청(0100) 불변.
- 시험(모의만): 새 6(판단 함수 3 + 소스 계약 2 + …) — `cash-receipt-checkout`+기존 `cash-receipt`·주문 시험 25/25, 수정 전 3파일로 계약 시험 fail 2, 전체 tsc 오류 0.
- 미검수: 실제 화면(주문서 칸 표시·택1 동작), Lab 0105 적용 뒤 실제 접수 흐름 — Mac/Backend 단계. 0105는 Lab·운영 미적용이라 지금 배포되면 RPC 없음 오류 → 고정 안내로 떨어짐(주문은 정상) — **배포는 0105 적용과 같은 묶음 필요**.

### S70 P2 수정(Mac msg_1896ea3cbaa4, Master msg_56ced92ca77d) — ready_review
- 커밋 `ee35d6eb1`(actions.ts·tests/cash-receipt-checkout.test.mjs). 0105 호출·응답 해석만 try/catch, 예외(reject·throw)도 같은 고정 안내로 생성된 주문 상세 done=1. redirect·주문 생성·세금계산서·결제 동작 불변, 호출 1회·재시도 0·예외 원문 버림.
- 실제 actions.ts를 가짜 next·supabase에 붙인 모의 시험: reject·throw·오류값·not_eligible 모두 주문 1회·접수 1회·리다이렉트 1번(`/s/shop/orders/ord-1?done=1&error=<고정 안내>`)·번호 없음, accepted는 `done=1`만. 수정 전 코드로 fail 1(reject가 원문 오류를 그대로 던짐) → 후 25/25, tsc 0.
