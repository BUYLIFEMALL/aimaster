# 개발 플랜 — SOLAPI 발송 코드 공용 기준 코드 등록 (2026-10-23 Claude Code 윈도우)

> 주인님 선택: 「SOLAPI 공용 등록」. 지침: 루트 `CLAUDE.md` 공용 기준 코드 규칙 · `docs/SHARED_MODULES.md` · `docs/SHARED_MODULE_CHECKPOINTS.md`.
> 대상: ① 운영 AIMaster. **DB 변경 없음.** 회원 화면·동작 변화 없음(아래 2번 버그 수정 제외).

## 1. 조사 결과 (코드 대조)
| 파일 | 프로그램 | 상태 |
|---|---|---|
| `lib/solapi/client.ts`(SOLAPI SDK 감싼 발송: 문자·알림톡·친구톡·RCS·잔액) | `crm-google-form`·`booking-reminder`·`stepmail` | 3곳 글자까지 같음(100줄) |
| 〃 | `kakao_auto_poster`(src)·`trending-product-finder`·`real_estate_sales`(src) | 주석 문구만 다르고, RCS 발송 함수(`sendRcs`)만 없음 — 나머지 코드 같음 |
| `lib/actions/solapiAccount.ts`(계정 저장·확인·테스트 문자) | 6곳 | **프로그램마다 기능이 다름**(카카오: 채널 친구 주소·알림톡 템플릿·이메일 함께 보내기 / 부동산: 저장 방식·RCS 칸 처리) → 공용으로 묶지 않음 |
| 루트 `lib/sms/solapi.ts` | 메인 사이트(비밀번호 찾기 문자) | 운영자 발송용·다른 구조 → 대상 아님 |

- 6곳 모두 `solapi` 패키지 `^6.0.1`, 회원 본인 SOLAPI 계정(공용 표 `user_solapi_accounts`)을 씀 — 최상위 규칙 그대로.
- **버그 발견**: `booking-reminder`·`stepmail`의 `solapiAccount.ts`가 crm-google-form 코드를 그대로 복사해, 「테스트 문자 보내기」를 누르면 **「[구글폼 CRM] SOLAPI 계정 테스트 문자입니다.」**가 발송됨(다른 프로그램 이름).

## 2. 바꿀 것
1. **공용 기준 코드 `solapi-client` 등록**: 기준 `crm-google-form/lib/solapi/client.ts`(다른 사본들이 「crm-google-form과 같은 코드」라고 적어 둔 원본, 실제 발송에 쓰이는 RCS까지 포함). 사본 5곳을 `scripts/check-shared-modules.mjs`에 등록하고 `--sync` → 다른 3곳은 주석 정리 + `sendRcs` 추가(쓰지 않는 함수라 동작 변화 없음).
2. **테스트 문자 이름 바로잡기**: `booking-reminder` → 「[예약(취소)방지 리마인드 자동화]」, `stepmail` → 「[대량 메일발송 자동화(Step Mail)]」.
3. 등록부 갱신: `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md`.

## 3. 바꾸지 않는 것
- `solapiAccount.ts` 공용화(기능이 달라서), 메인 사이트 `lib/sms/solapi.ts`, 화면·DB·발송 동작.

## 4. 검수
- 6곳 `tsc --noEmit`, 테스트가 있는 곳 테스트(`stepmail` `tests/sms-dispatch.mjs` 등), 로컬 build, `check-shared-modules.mjs` 일치.
- 실제 문자 발송 시험은 하지 않음(유료·회원 본인 계정).

## 5. 버전·배포·비용
- 급하지 않은 공용 변경 + 작은 버그 → 지침대로 **미배포 대기**(각 프로그램 다음 배포 때 버전 +0.01). 비용 없음.
- 테스트 문자 이름 버그를 바로 고치려면 `booking-reminder`·`stepmail`만 배포(빌드 2회) — 승인 시에만.
