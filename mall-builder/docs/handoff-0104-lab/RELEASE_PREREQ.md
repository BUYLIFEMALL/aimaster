# 교환비 카드 결제(0104 + 단계2 화면) Lab 배포 전 선행 조건·릴리스 묶음 목록

작성: CC-B2B-BACK-01 · 2026-11-17 · 지시: Master msg_91f292a7d5dd — **기술 조건 정리만. Lab 빌드·0104 적용은 이 문서로 승인되지 않는다(실행 0).**

> **초안(현재 릴리스 승인 아님, Master msg_f7fe7aee5704)**: 앱 커밋은 QA014 보완 뒤 최신 후속 SHA로 교체한다(아래 1절 앱 줄). 146개 변경·DB 대표 객체 표본만으로 전수 준비 완료를 판정하지 않는다. `card_enabled`는 주문 카드 결제와 공유하므로 교환비 시험·중단을 위해 임의로 끄지 않으며, 교환비 전용 스위치는 이번 보완에서 추가하지 않는다(필요 여부는 Master가 전체 묶음에서 결정).

## 1. 묶음(정확한 커밋)
| 구분 | 커밋 | 파일 | 지문 |
|---|---|---|---|
| DB | `37fdcabb4` | `mall-builder/supabase/migrations/0104_exchange_fee_payments.sql` | LF sha256 `739b35e9f20b45ba7c83309918da0cc099ca6a0b5715bf5514e755cb108662e6`(Mac 소스 검수 PASS로 고정) |
| 앱(초안, Lab 출처 재동결) | **`5b02c3399`**(2026-11-17 Master msg_d15a57aed21d) — 교환비 소스는 `c8d9e1d31`(QA014 보완, `1c9123d68` 포함)과 동일. `c8d9e1d31` 이후 Front 커밋 3개(`acb858a77`·`f7120d185`·`5b02c3399`, QA022 소스 PASS·미배포)로 바뀐 파일은 `src/app/globals.css`·`src/lib/theme.ts` 2개뿐, 교환비 파일·0104·package·next.config 변경 0 | 교환비: 새 `exchange-pay/[exchangeId]/page.tsx`·`success/page.tsx`·`fail/page.tsx` / 고침 `src/lib/exchanges.ts`·`exchanges-server.ts`·`exchange-actions.ts`·`src/app/exchange-panels.tsx`·`(shop)/orders/[id]/page.tsx`·`pay/pay-widget.tsx`(선택적 `mode="exchange"`) / 시험 `tests/exchanges.test.mjs`·`tests/exfee-widget.test.mjs` | 소스 PASS(Mac QA014 30/30 + DI 4) / 실제 화면(UI) 미검수 |
| 시험 근거 | 0104 실행기 `scripts/qa/run-0104-feepay.mjs`(62/62, 작성자 모의) · 작성자 전체 node 자동 시험 `node --test tests/` 486/486(교환 24·위젯 가짜 SDK 렌더 6 포함) · `tsc` 0 (c8d9e1d31 기준) · Mac QA014 독립 30/30 + 의존성 주입 경계 4 PASS | | |

## 2. 선행 조건(Lab, 2026-11-17 읽기)
- **DB 선행 객체(0104가 쓰는 것) 있음**: 토스 호출 `mall_builder_private.toss_call(text,text,text,jsonb,text)`(0029), `http` 확장, 0102(교환 표·`exchange_event`·`lock_exchange`)·0103(`exchange_order_status_ok`) 적용 기록. 0104 표 없음(미적용). `dblink`는 모의 시험 전용이라 필요 없음.
- **환경변수: 새로 필요한 것 없음**(새 이름 0). 토스 비밀 키는 앱 환경변수가 아니라 DB `mall_builder_store_scheduler_secrets.toss_secret_key`(몰별, 0104 함수가 DB 안에서만 읽음). 결제창 공개 키는 `mall_builder_store_payment_settings.toss_client_key`·`card_enabled`(기존 주문 카드 결제와 같은 칸). Supabase URL·공개 키는 기존 그대로.
- **운영 키 접근 없음(교환비 카드 결제 대상 코드 한정)**: 이번 교환비 결제 코드(`exchange-pay/*`·`exchanges.ts`·`exchanges-server.ts`·`exchange-actions.ts`·`exchange-panels.tsx`·`pay-widget.tsx`)는 서버 키(`createAdminClient`·service role)를 쓰지 않고 로그인 세션 읽기·rpc만 쓴다. 앱 전체로는 운영 모드(`PLATFORM_AIMASTER`)일 때만 서버 키를 쓰는 경로가 따로 있다(7절). 토스 키는 회원 본인 몰 설정의 것만 DB가 쓴다.
- **⚠ 앱 빌드 범위가 넓다**: 지금 Lab 앱은 `dpl_3NsADKBJn6pX5CpnBuK4EhR8YoeZ`(2026-11-11 14:21 KST, CLI 배포라 소스 SHA 없음). 그 뒤 `mall-builder/src`·마이그레이션·설정에 커밋 **146개**가 쌓여 있어, Lab 빌드는 교환비 화면만이 아니라 그 전부를 함께 내보낸다(0099 반품·0100 현금영수증·0101 메시지·0102/0103 교환 화면 등). 빌드 전 그 범위의 담당·QA 상태를 Master가 묶음으로 확인해야 한다.
- **Lab DB 따라옴 확인**: 적용 기록 이름은 파일 번호와 1:1이 아니다(0029~0032·0036·0053~0058·0061~0063·0093·0095가 기록 이름엔 없음). 처음엔 대표 객체 표본만 봤고(그때 「빠진 것 0104뿐」은 표본 기준이었다), 그 뒤 7절에서 앱 코드가 부르는 이름 전체를 실제 객체로 대조했다 — **이름 수준(표·함수·실행 권한·버킷)은 전수 확인, 칸·함수 인자 모양은 미확인**. 전체 「준비 완료」 판정은 하지 않는다(7절 미확인·차단 조건 참고).

## 3. 순서
- **Lab 빌드에 운영 배포 스크립트 사용 금지(고정)**: `scripts/deploy-prod.mjs`는 연결 파일 대신 운영 프로젝트 `prj_TBwDVEc6vBveDSuv8pquHLEuBHDD`(mall-builder)로 배포하고, `scripts/prod-env-setup.mjs`는 운영 프로젝트에 `NEXT_PUBLIC_MALL_PLATFORM=aimaster`를 등록한다. Lab은 `mall-builder/.vercel/project.json`에 연결된 `dev-mall-builder`로만 빌드한다. 지금 안전하다거나 배포가 끝났다고 단정하지 않는다.
- **DB 실행 자료**: 0104 Lab 적용 실행 자료는 `docs/handoff-0104-lab/README.md`·`build.mjs`·`precheck.sql`·`apply.sql`·`verify.sql`·`check-local.mjs`(준비만, 적용 승인 아님). 0102 정리 파일은 0104 적용 뒤 그대로 쓰지 않는다(README 7절).
1. DB: 0104 Lab 적용(별도 실행 자료·승인 필요 — 0103 실행 자료와 같은 형식: precheck → apply 원문 그대로 → verify).
2. 앱: Lab 빌드·배포(별도 비용 승인).
- 반대 순서일 때(소스로 확인한 범위만): 앱이 먼저 나가면 0104 표가 없어 결제 기능이 숨겨진다(4절, 실제 배포 화면 미검수). DB가 먼저면 지금 Lab 앱(11-11 배포, CLI라 소스 SHA 없음)에는 교환비 결제 화면 소스가 없는 것으로 보이나 그 배포의 실제 동작은 확인하지 않았다. 권장은 DB → 앱.

## 4. 0104 미적용일 때 결제 기능이 막히는 소스 경로(c8d9e1d31 기준, 소스·자동 시험으로 확인 — 실제 배포 화면 미검수)
| 경로 | 줄 | 동작 |
|---|---|---|
| `src/lib/exchanges-server.ts` `getFeePayments` | 92 | 결제 기록 표 없음(`PGRST205`·`42P01`) → `missing`(그 밖 오류는 숨기지 않고 오류) |
| 같은 파일 `getExchangeData` | 52·54 | `payFeature = pay.state === "ok"` → false, `cardEnabled`도 false |
| `src/app/exchange-panels.tsx` 유저 | 108 | `{payFeature && <CustomerFeePay …/>}` → 카드 결제 링크·카드 상태 문구 렌더 0 |
| 같은 파일 직원 | 142·148 | `st = payFeature ? … : null` → 카드 상태·다시 확인 단추 0, 기존 무통장 흐름 그대로 |
| `exchange-pay/[exchangeId]/page.tsx` | 38 | 주소로 직접 들어와도 `pays.state !== "ok"` → 주문 상세로 redirect, 위젯 렌더 0 |
| `src/lib/exchanges.ts` `exfeeSuccessTarget`(성공 주소가 부름) | 365·367·369 | 회원·몰·주인·교환 소속 확인 실패면 null(404) → 형식 오류면 rpc 0 → 준비 함수가 없으면 rpc 오류로 `?pay=error`, 승인 rpc 0 |

## 5. 되돌리기·기능 끄기
- **결제 기록 보존**: 0104를 DB에서 지우는 되돌리기는 하지 않는다(결제·시도 이력이 함께 사라짐). 문제가 생기면 앞으로 고치는 다음 번호로.
- **앱만 되돌리기**: 이전 Lab 배포로 되돌려도 DB 결제 기록·잠금(지킴 트리거)은 그대로 — 재발송·무통장 확인 잠금이 DB에서 계속 동작.
- **`card_enabled = false`는 완전한 결제 중단 스위치가 아니다(실행 권고 아님, 임의 변경 0)**: 소스상 새 결제 링크·결제 화면 진입(`feePayState.canPay`)만 막는다. 이미 열린 결제 위젯에서 진행한 결제, 성공 주소 콜백, DB 준비·승인 함수는 이 값만으로 막히지 않을 수 있다(DB 함수가 이 칸을 다시 보는지는 이 문서에서 단정하지 않음). 이 칸은 주문 카드 결제와 공유하고, 교환비 전용 스위치는 없으며 이번에 추가하지 않는다 — 중단 수단이 필요한지는 Master가 전체 묶음에서 결정.

## 6. 한계(분리)
0104 소스 Mac PASS / 작성자 모의 62 / 작성자 전체 node 자동 시험 486·tsc 0(c8d9e1d31) / Mac QA014 독립 30/30 + 의존성 주입 경계 4 PASS / 성공·실패 주소 권한은 가짜 의존성 실행 시험으로 확인, 실제 DB·RLS 위 동작은 배포 뒤 / 위젯 교환 모드는 가짜 SDK 렌더 시험, 실제 토스 결제창·실제 브라우저 미검수 / 준비·승인이 실제 별개 HTTP 요청·별개 트랜잭션으로 커밋되는지는 배포 뒤 / 실제 토스 멱등·이중 과금·실패 뒤 고정 주문 번호(exfee-<교환 id>) 재사용 미시험 / 실제 화면 미배포·미검수.


## 7. 새 앱 전체가 부르는 DB 의존성 대조(Lab 읽기, 2026-11-17)

전제: 지금 Lab 앱 배포 뒤 쌓인 mall-builder 변경 146개가 새 빌드에 모두 들어간다. 방법: 소스 c8d9e1d31의 `src/` 전체에서 `.from("…")`·`.rpc("…")`·`"mall_builder_…"` 글자를 모아(이름 268개, 표 76·함수 197) Lab DB에 실제 객체가 있는지 읽기로 대조. 회원·키·개인 원문 조회 0, Lab 스키마 메타데이터만.

| 항목 | 결과 | 분류 |
|---|---|---|
| 표·뷰 이름(`mall_builder_*`) | 0104 표 `mall_builder_exchange_fee_payments` 하나 빼고 모두 있음 | 확인(이름 수준) |
| 함수(rpc) 197개 | 194개 있음, 194개 모두 `authenticated` 실행 권한 있음. 없는 3개 = 0104 `exchange_fee_card_prepare`·`_confirm`·`_recheck` | 확인(이름·실행 권한) / 0104는 차단 아님(4절 숨김) |
| 저장소 버킷 | `mall-builder-public`·`mall-builder-private` 둘 다 있음 | 확인 |
| 0104 객체 4개 | 없음 — 0104 적용 전에는 교환비 카드 결제만 숨겨짐(4절) | 기능 숨김(0104 적용 별도 승인) |
| 메인 사이트 표 6개(`profiles`·`programs`·`subscriptions`·`usage_logs`·`user_api_keys`·`user_program_access`) | Lab DB에 없음. 소스상 모두 `PLATFORM_AIMASTER`(`NEXT_PUBLIC_MALL_PLATFORM=aimaster`)일 때만 읽음 — 운영 관문 `platform-gate.ts`, 몰 만들기 `platform-admin.ts`, AI 키 `ai-client.ts`·설정 화면 | **차단 조건: Lab 프로젝트에 이 스위치가 꺼져 있어야 함 — 이번에 Vercel 환경변수 목록 조회가 프로젝트 404로 실패해 미확인**(값을 바꾸지 않음, 빌드 전 이름만 확인 필요) |
| 운영 모드 설정(2026-11-17) | 이 세션 Vercel 연결은 팀 프로젝트 3개만 보여 `dev-mall-builder` 404(도구 범위 한계). **Master가 직접 확인(msg_0646188a17a7)**: 프로젝트 `prj_V9bEfq2ZQDwl7qO3ZdMQVW0Sg0ZP`·팀 `team_orq6xPe9P3c1uMQdKlJsQ6k9`·이름 `dev-mall-builder`·운영 배포 `dpl_3NsADKBJn6pX5CpnBuK4EhR8YoeZ` 일치, 환경변수 3개·숨김 0, **`NEXT_PUBLIC_MALL_PLATFORM` 키 없음**. 이 세션 소스·파일 검사(msg_059ac8eead6e): 판정식은 정확히 `aimaster`일 때만 true(`src/lib/platform.ts` 4행·`src/lib/supabase/env.ts` 2행), `mall-builder/.env.local`에 이 키 없음·다른 `.env*` 없음, `next.config.ts`·빌드 명령(`next build`)에 주입 없음, 셸 환경에 없음 → 미설정이면 false | 다음 Lab CLI 빌드에서 false로 **예상**. `NEXT_PUBLIC_*`는 빌드 때 굳는 값이라 지금 미등록만으로 안전·배포 완료를 단정하지 않음 — **빌드 직전 같은 검사를 다시 하고**, 빌드 뒤 실제 화면(로그인이 Lab 자체 `/login`으로 가는지)으로 확인 |
| 핵심 함수 인자 이름(교환·결제·0099~0103, 23개) | 앱 소스의 `rpc("…", { p_… })` 인자 이름을 Lab 함수 정의와 대조: 20개는 같은 이름 정의 1개씩, 앱 인자가 모두 정의에 있고 기본값 없는 인자는 앱이 모두 넘김 → 호출 가능. 없는 3개 = 0104(예상) | 확인(인자 이름 수준, 인자 타입·반환 모양·실호출은 미확인) |
| 표 칸(column) 이름 | 0102·0103 교환 칸은 그때 verify로 확인, 그 밖 146개 변경이 쓰는 칸은 대조하지 않음 | 미확인 |
| 함수 인자 이름·모양(위 23개 밖) | 나머지 174개는 이름·실행 권한만 대조, 인자 이름·타입은 대조하지 않음 | 미확인 |
| 표 보안 규칙(RLS)·정책 내용 | 대조하지 않음 | 미확인 |
| 서버 키 사용 | 앱의 `createAdminClient`는 위 운영 스위치 경로에서만, 몰 데이터는 로그인 세션 | 확인(소스) |

정리: 이름 수준에서 새 앱이 부르는 몰 DB 객체는 0104 4개 말고 모두 Lab에 있다. **빌드 전 남은 확인**은 첫째 Lab 프로젝트의 `NEXT_PUBLIC_MALL_PLATFORM` 꺼짐(이 세션 도구로는 못 읽음 — 차단 조건 유지), 둘째 칸 이름과 핵심 23개 밖 함수의 인자 대조, 셋째 0104 적용 여부 결정이다. 전체 「준비 완료」라고 단정하지 않는다.
