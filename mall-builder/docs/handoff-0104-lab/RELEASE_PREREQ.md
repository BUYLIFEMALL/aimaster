# 교환비 카드 결제(0104 + 단계2 화면) Lab 배포 전 선행 조건·릴리스 묶음 목록

작성: CC-B2B-BACK-01 · 2026-11-17 · 지시: Master msg_91f292a7d5dd — **기술 조건 정리만. Lab 빌드·0104 적용은 이 문서로 승인되지 않는다(실행 0).**

> **초안(현재 릴리스 승인 아님, Master msg_f7fe7aee5704)**: 앱 커밋은 QA014 보완 뒤 최신 후속 SHA로 교체한다(아래 1절 앱 줄). 146개 변경·DB 대표 객체 표본만으로 전수 준비 완료를 판정하지 않는다. `card_enabled`는 주문 카드 결제와 공유하므로 교환비 시험·중단을 위해 임의로 끄지 않으며, 교환비 전용 스위치는 이번 보완에서 추가하지 않는다(필요 여부는 Master가 전체 묶음에서 결정).

## 1. 묶음(정확한 커밋)
| 구분 | 커밋 | 파일 | 지문 |
|---|---|---|---|
| DB | `37fdcabb4` | `mall-builder/supabase/migrations/0104_exchange_fee_payments.sql` | LF sha256 `739b35e9f20b45ba7c83309918da0cc099ca6a0b5715bf5514e755cb108662e6`(Mac 소스 검수 PASS로 고정) |
| 앱(초안) | `1c9123d68` → **QA014 보완 커밋으로 교체 예정**(보완은 `pay/pay-widget.tsx` 선택적 교환 모드·`tests/exfee-widget.test.mjs` 추가) | 새 `src/app/s/[store]/(shop)/orders/[id]/exchange-pay/[exchangeId]/page.tsx`·`success/page.tsx`·`fail/page.tsx` / 고침 `src/lib/exchanges.ts`·`src/lib/exchanges-server.ts`·`src/lib/exchange-actions.ts`·`src/app/exchange-panels.tsx`·`src/app/s/[store]/(shop)/orders/[id]/page.tsx`·`tests/exchanges.test.mjs` | — |
| 시험 근거 | 0104 실행기 `scripts/qa/run-0104-feepay.mjs`(62/62, 작성자 모의) · 화면 `node --test tests/` 477/477 · `tsc` 0 | | |

## 2. 선행 조건(Lab, 2026-11-17 읽기)
- **DB 선행 객체(0104가 쓰는 것) 있음**: 토스 호출 `mall_builder_private.toss_call(text,text,text,jsonb,text)`(0029), `http` 확장, 0102(교환 표·`exchange_event`·`lock_exchange`)·0103(`exchange_order_status_ok`) 적용 기록. 0104 표 없음(미적용). `dblink`는 모의 시험 전용이라 필요 없음.
- **환경변수: 새로 필요한 것 없음**(새 이름 0). 토스 비밀 키는 앱 환경변수가 아니라 DB `mall_builder_store_scheduler_secrets.toss_secret_key`(몰별, 0104 함수가 DB 안에서만 읽음). 결제창 공개 키는 `mall_builder_store_payment_settings.toss_client_key`·`card_enabled`(기존 주문 카드 결제와 같은 칸). Supabase URL·공개 키는 기존 그대로.
- **운영 키 접근 없음**: 앱 코드에 서버 키(`createAdminClient`·service role) 사용 0 — 모든 호출은 로그인 세션 rpc. 회원 본인 몰 설정의 키만 DB가 씀.
- **⚠ 앱 빌드 범위가 넓다**: 지금 Lab 앱은 `dpl_3NsADKBJn6pX5CpnBuK4EhR8YoeZ`(2026-11-11 14:21 KST, CLI 배포라 소스 SHA 없음). 그 뒤 `mall-builder/src`·마이그레이션·설정에 커밋 **146개**가 쌓여 있어, Lab 빌드는 교환비 화면만이 아니라 그 전부를 함께 내보낸다(0099 반품·0100 현금영수증·0101 메시지·0102/0103 교환 화면 등). 빌드 전 그 범위의 담당·QA 상태를 Master가 묶음으로 확인해야 한다.
- **Lab DB 따라옴 확인(표본)**: 적용 기록 이름은 파일 번호와 1:1이 아니다(0029~0032·0036·0053~0058·0061~0063·0093·0095가 기록 이름엔 없음 — 묶어서 다른 이름으로 적용된 흔적). 대표 객체로 표본 확인: `mall_builder_auto_progress`(0032)·재입고 표(0036)·공급사·공급·정산 표(0053~0056)·`mall_builder_category_grade_rates`·`price_rules`(0057)·`orders.resale_order_id`(0063)·`stores.custom_domain`(0093)·`mall_builder_sections`(0095) **모두 있음**. 빠진 것은 0104뿐. 전수 대조는 빌드 전 별도 확인 권장(앱이 부르는 rpc·표 이름 목록 ↔ Lab 객체).

## 3. 순서
1. DB: 0104 Lab 적용(별도 실행 자료·승인 필요 — 0103 실행 자료와 같은 형식: precheck → apply 원문 그대로 → verify).
2. 앱: Lab 빌드·배포(별도 비용 승인).
- 반대 순서도 깨지지 않음: 앱이 먼저 나가도 0104 표가 없으면 결제 기능이 숨겨진다(4절). DB가 먼저면 옛 앱엔 결제 화면이 없어 영향 0. 권장은 DB → 앱.

## 4. 0104 미적용일 때 결제 기능이 실제로 막히는 소스 경로
| 경로 | 줄 | 동작 |
|---|---|---|
| `src/lib/exchanges-server.ts` `getFeePayments` | 65 | 결제 기록 표 없음(`PGRST205`·`42P01`) → `missing`(그 밖 오류는 숨기지 않고 오류) |
| 같은 파일 `getExchangeData` | 50·52 | `payFeature = pay.state === "ok"` → false, `cardEnabled`도 false |
| `src/app/exchange-panels.tsx` 유저 | 108 | `{payFeature && <CustomerFeePay …/>}` → 카드 결제 링크·카드 상태 문구 렌더 0 |
| 같은 파일 직원 | 142·148 | `st = payFeature ? … : null` → 카드 상태·다시 확인 단추 0, `staffExchangeActions(…, null)`은 기존 무통장 흐름 그대로 |
| `exchange-pay/[exchangeId]/page.tsx` | 38 | 주소로 직접 들어와도 `pays.state !== "ok"` → 주문 상세로 redirect, **위젯 렌더 0** |
| `exchange-pay/[exchangeId]/success/page.tsx` | 31 | 준비 함수 없음 → rpc 오류 → `?pay=error`, 승인 호출 0(토스 POST 0) |

## 5. 되돌리기·기능 끄기
- **결제 기록 보존**: 0104를 DB에서 지우는 되돌리기는 하지 않는다(결제·시도 이력이 함께 사라짐). 문제가 생기면 앞으로 고치는 다음 번호로.
- **앱만 되돌리기**: 이전 Lab 배포로 되돌려도 DB 결제 기록·잠금(지킴 트리거)은 그대로 — 재발송·무통장 확인 잠금이 DB에서 계속 동작.
- **기능 끄기(새 결제만 막기, 참고 — 임의 실행 금지)**: 몰 `store_payment_settings.card_enabled = false` → `feePayState`의 `canPay` false(결제 링크·위젯 0). 단 **이 칸은 주문 카드 결제와 공유**라 주문 카드 결제도 함께 꺼진다. 이미 있는 결제 기록의 표시·직원 다시 확인은 계속 됨. 교환비만 따로 끄는 칸은 없음(필요하면 별도 결정).

## 6. 한계(분리)
0104 소스 Mac PASS / 작성자 모의 62 / 화면 477·tsc 0 / 준비·승인 별개 요청은 소스상 확인(실제 별개 트랜잭션은 배포 뒤) / 실제 토스 멱등·이중 과금·실패 뒤 고정 주문 번호 재사용 미시험 / 실제 화면 미배포·미검수.
