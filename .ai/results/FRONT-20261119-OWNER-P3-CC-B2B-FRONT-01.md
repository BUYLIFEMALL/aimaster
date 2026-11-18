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
