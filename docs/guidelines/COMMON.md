# 최상위 공통 원칙 요약

[분야별 색인](README.md) · 기존 원문을 보존한 요약입니다. 모든 작업 전에 읽습니다.

## 운영과 Lab을 먼저 구분합니다

| 구분 | AIMaster 운영 | AIMaster_dev Lab |
|---|---|---|
| 코드·서비스 | 루트 메인 앱과 `<프로그램>/`, `*.buylife.xyz` | `labs/<프로그램>/`, `dev-<이름>.vercel.app` |
| DB ref | `esgxyikcnnvmlhygjkth` | `rjjtjakljjxsgjelqgek` |
| 회원·운영 체계 | 메인 사이트 회원·권한·공동 DB | 프로그램마다 독립, 운영 회원 체계와 분리 |

작업 시작과 DB 보고에 대상을 명시합니다. Lab 작업자는 운영 코드·DB·Vercel·환경변수를 수정/삭제하지 않습니다. 운영을 읽고 참고하거나 Lab으로 복사하는 것은 가능하며, 운영 변경은 주인님의 명시적 요청 범위만 따릅니다. [Lab 상세 원문](../AIMASTER_DEV_LAB_GUIDELINES.md).

## 본인 계정·키와 데이터 보호

- 각 회원은 본인 API 키·외부 계정·OAuth 앱을 직접 등록해 사용합니다. 다른 회원·운영자 값으로 대신 처리하거나 키가 없을 때 폴백하지 않습니다.
- 키가 없으면 본인 키 등록 위치를 안내합니다. 키·비밀번호·토큰은 소스·문서·로그에 노출하지 않습니다.
- 회원 생성 데이터는 소유자 조건·RLS·회원별 저장 경로로 격리합니다. 다른 회원과 공유·복사·재사용하지 않으며 최초 생성 기준 30일 자동 삭제 원칙을 유지합니다. 계정·권한·결제·환경설정은 생성 콘텐츠와 구분합니다.
- 기존에 명시된 무료 공공 키 예외는 [본인 계정·API 원문 §8](../TOP_RULE_PERSONAL_ACCOUNT_API.md)과 루트 원문의 조건을 모두 확인합니다. 무료라는 이유로 예외를 넓히지 않으며 회원 명의의 연동·발행에는 적용하지 않습니다.

## 회원 권한과 공용 연동

- 로그인과 프로그램 사용 권한은 별개입니다. 화면뿐 아니라 쓰기 API·Server Action·OAuth 콜백도 해당 프로그램 권한을 확인합니다. 관리 클라이언트 사용 시에도 회원 소유자 조건을 명시합니다.
- 운영 회원의 키와 연결 정보는 공용 구조를 재사용합니다. `user_api_keys`, `member_platform_accounts`, `integration_catalog`, `lib/memberIntegrations.ts`를 확인하고 프로그램 전용 중복 등록 구조를 만들지 않습니다. 기존 연결의 전환 절차도 [회원 연동 원문](../MEMBER_INTEGRATIONS.md)을 따릅니다.
- FREE·프리미엄·VIP·핸드폰·정지·개별 권한의 판정은 공용 함수와 [관리자 정책](../ADMIN_POLICY_GUIDELINES.md)을 따릅니다. 요약을 보고 별도의 판정 순서를 구현하지 않습니다.
- 관리자·커밋/운영 기준 계정은 `buylifemall@gmail.com`, 일반 회원 시험은 `buylifemall@naver.com`입니다. 비밀번호는 주인님이 직접 입력합니다. CLI 로그인 보조 계정과 사이트 관리자/시험 회원을 혼동하지 않습니다.

## 함께 확인할 원문

[본인 계정·API](../TOP_RULE_PERSONAL_ACCOUNT_API.md) · [DB 연동 정책](../DATABASE_CONNECTION_POLICY.md) · [DB 연동 인수인계](../DATABASE_CONNECTION_HANDOFF.md) · [핸드폰 정책](../PHONE_REQUIRED_POLICY.md) · [등급·과금](../GRADE_AND_BILLING_POLICY.md)
