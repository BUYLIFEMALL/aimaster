# Lab 교환 직원 실제 세션 RPC 검증 — CC-B2B-BACK-01 (2026-11-17)

지시: Master msg_46a32b358b79. 범위: Lab ref `rjjtjakljjxsgjelqgek` · EXQA-2 주문 `e0102000-…032` / 품목 `…043`만, 직원 defect 교환비 0 대리 신청 1회 → 거절 1회.

## 실행 전 확인(읽기)
- ego 브라우저(운영자 세션) Lab 앱 `https://dev-mall-builder.vercel.app`: 로그인 쿠키 이름 `sb-rjjtjakljjxsgjelqgek-auth-token`, **페이지 번들이 실제로 쓰는 API 주소 `https://rjjtjakljjxsgjelqgek.supabase.co`**, 공개 키 종류 publishable, 토큰 발급처 Lab(`…/auth/v1`), 역할 `authenticated`, 계정 운영자. 키·토큰 값은 페이지 안에서만 쓰고 출력·기록 0, 끝나고 작업 공간 닫음·임시 스크립트 삭제.
- 실제 세션 rpc `mall_builder_staff_can(몰, 'orders')` = true · REST 교환 행 0(`*/0`).
- 기준값(SQL 읽기): 교환 0 · 주문 지문 `c56e3560d4f9b4d98c724cbfc93ed228` · 17/1 · 알림 44 · 장부 `7203b416…:500` · 리워드 `1552ca37…:pending:2300`·`53f55d95…:paid:500` · 시험 재고 S5·M5·L0·머그 10 · EXQA-2 confirmed·이력 2줄.
- 부수 효과 근거: 교환 이력은 상태 변화 없는 줄 → 알림 대기열 0025 즉시 빠짐, 0101은 「환불 완료」 메모만, 몰 알림 종류에 교환 없음 → 알림·외부 발송 없음 예상.

## 실행(실제 세션, PostgREST 경로, 각 1회·재시도 0)
| 순서 | 호출 | 응답 |
|---|---|---|
| 1 | `POST /rest/v1/rpc/mall_builder_request_exchange` 품목 043 · 1개 · M(…022) · defect · 메모 「Lab 직원 RPC 검증(대리 접수)」 | 200 · 교환 id `619ea2a7-d41c-4640-91e4-9c7fbe6bc2ff` |
| — | (읽기) 새 행 정확히 1: EXQA-2·043·S→M·defect·staff·requested·교환비 0·none·옵션 기반 true/true | 확인 |
| 2 | `POST /rest/v1/rpc/mall_builder_exchange_step` 위 id · rejected · 사유 「Lab 직원 RPC 검증 — 거절 경로 확인」 | 200 · `"rejected"` |

## 실행 뒤 대조(SQL 읽기)
| 항목 | 결과 |
|---|---|
| 교환 | 전체 1(새 행 정확히 1) · rejected/교환비 0/none/재고 반영 false/false/거절 사유 |
| 시험 재고 | S5·M5·L0·머그 10 그대로 |
| 기존 주문 | 17/1 · 지문 `c56e3560…` 그대로 |
| 알림 | 44 그대로(외부 발송 대기열 진입 0) |
| 리셀러 | 장부 500 · 리워드 대기 2,300·paid 500 그대로 |
| EXQA-2 | confirmed 그대로 · 이력 +2줄(`confirmed→confirmed staff 교환 접수 …`, `… 교환 거절 …`) |

## 판정
- 직원 예외(실제 배송 10일·구매 확정 주문 대리 접수)와 거절 경로가 **실제 JWT·PostgREST 경로**로 동작함. 0103 적용으로 confirmed 주문도 교환 가능.
- 유저 7일 판정·화면 PASS는 이번 범위 아님(화면은 Lab 미배포, 1절 정정 근거).
- 남은 영향: 시험 교환 1행(rejected)·EXQA-2 이력 2줄 — 0102 정리 스크립트(b5c3613c)가 시험 주문 교환·주문을 지우며 함께 정리(시험 아닌 교환 아님 → 멈춤 조건 해당 없음). 교환 이력 2줄로 EXQA-2는 이미 confirmed라 자동 확정 영향 없음.
- 하지 않은 것: EXQA-1·재고 입출고·입금 확인·결제·구매 확정·정리·운영·빌드·배포·새 로그인 요청 0.
