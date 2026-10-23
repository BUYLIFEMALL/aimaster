# 개발 플랜 — 비밀번호 찾기(본인 인증 후 재설정) · 2026-10-19

- 대상: ① AIMaster 운영 메인 사이트(루트 `app/`), DB ref `esgxyikcnnvmlhygjkth`
- 작성: Claude Code(윈도우) · 상태: **승인됨(2026-10-19 「이메일+문자 한 번에」) → 구현**

> **구현하면서 바뀐 점 (2026-10-19)**
> 1. **새 DB 테이블을 만들지 않았다.** 이 세션의 Supabase MCP가 Lab DB(`rjjtjak…`)에만 연결돼 운영 DB DDL을 적용할 수 없어서, 인증번호 해시·만료·시도 횟수·발송 기록을 서버 키로만 쓸 수 있는 `auth.users.app_metadata.password_reset`에 저장한다(인증 후 지움). `0039` 마이그레이션 없음.
> 2. **문자는 새 환경변수 없이 운영자가 이미 등록한 솔라피 계정으로 보낸다.** 주인님 지시("솔라피를 통해 연동, 이미 구현되어 있으니 확인") — 관리자 `buylifemall@gmail.com`의 `user_solapi_accounts` 행을 서버 키로 읽고, 다른 프로그램과 같은 공식 SDK(`solapi` 패키지 `SolapiMessageService`)로 발송한다. 예외 기록: `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8.
> 3. 실제 파일: `lib/auth/passwordReset.ts`, `lib/sms/solapi.ts`, `app/api/auth/password-reset/{email,sms,sms/verify}/route.ts`, `app/(auth)/{forgot-password,reset-password}/`, `app/(auth)/login/LoginForm.tsx`(링크·완료 안내).

## 1. 문제

- 로그인 화면(`app/(auth)/login/LoginForm.tsx`)에 「비밀번호 찾기」가 없다. 비밀번호를 잊은 회원은 스스로 복구할 방법이 없다.
- 지금 있는 비밀번호 변경(`app/api/user/password`, 설정 화면)은 **로그인한 상태에서만** 쓸 수 있다.

## 2. 조사 결과 (2026-10-19 확인)

| 항목 | 현재 상태 | 플랜에 미치는 영향 |
|---|---|---|
| 메일 발송 | 운영자 SMTP(`lib/email/client.ts`, 네이버 메일)가 이미 있다. 문의·스텝메일에서 쓰는 중 | 이메일 인증은 **추가 비용 없이** 이 SMTP로 보낸다 |
| Supabase 기본 메일 | 기본 발송기는 시간당 발송량이 아주 적고, 팀원 주소 외에는 보내지 않는다 | Supabase 기본 메일(`resetPasswordForEmail`)에 의존하지 않는다 |
| 문자(SMS) 발송 | 저장소에 연동된 문자 업체가 없다 | 새 업체(예: 솔라피) 계약·키·발신번호 등록이 필요하다 → **비용 발생, 사전 승인 대상** |
| 핸드폰 번호 | 가입 때 필수, `010-1234-5678` 형식. **중복을 막지 않는다** | 문자 인증은 「이메일 + 핸드폰」이 둘 다 맞을 때만 보낸다 |

## 3. 구현 방식

### 1단계 — 이메일 인증 (비용 없음, 먼저 진행)
1. 로그인 화면 비밀번호 칸 아래에 「비밀번호를 잊으셨나요?」 링크 → 새 화면 `/forgot-password`.
2. 회원이 가입 이메일을 입력 → 서버 `POST /api/auth/password-reset/email`:
   - 서버 키로 `auth.admin.generateLink({ type: "recovery" })`를 만들어 1회용 토큰(`hashed_token`)을 얻는다.
   - 운영자 SMTP로 「비밀번호 재설정」 메일 발송(링크: `https://www.buylife.xyz/reset-password?token_hash=…`, 유효 1시간).
   - 가입되지 않은 이메일이어도 **똑같이 "메일을 보냈습니다"로 답한다**(가입 여부 노출 방지).
3. 회원이 링크를 누르면 `/reset-password` 화면에서 `verifyOtp({ token_hash, type: "recovery" })`로 본인을 확인하고 새 비밀번호를 두 번 입력해 저장한다(`updateUser`, 기존 규칙인 6자 이상).
4. 저장이 끝나면 로그아웃시키고 로그인 화면으로 보내 「새 비밀번호로 로그인해주세요」를 안내한다.
5. 남용 방지: 같은 이메일·같은 IP에서 짧은 시간에 반복 요청하면 막는다(예: 이메일당 10분에 3회).

### 2단계 — 핸드폰 문자 인증 (승인 후 진행)
1. `/forgot-password`에 「문자로 인증」 탭 추가: 가입 이메일 + 핸드폰 번호 입력.
2. 두 값이 같은 회원일 때만 6자리 인증번호 문자 발송(유효 5분, 5번 틀리면 무효, 다시 받기 60초 뒤).
3. 인증번호가 맞으면 서버가 1회용 재설정 토큰을 발급 → 1단계와 같은 `/reset-password` 화면에서 새 비밀번호 저장.
4. 새 DB 테이블 `password_reset_codes`(인증번호는 해시로만 저장, 만료·시도 횟수 기록, 일반 회원 접근 불가 RLS) — **DB 스키마 변경 = 사전 승인 대상**.
5. (선택) 같은 방식으로 「이메일(아이디) 찾기」: 이름 + 핸드폰 문자 인증 → 가입 이메일 일부 가림 표시(`bu****@gmail.com`).

## 4. 최상위 규칙과의 관계 (주인님 확인 필요)

- 최상위 규칙은 「회원 기능은 회원 본인 키·계정」이다. 그런데 비밀번호 찾기는 **회원이 로그인하기 전에** 쓰는 사이트 기본 기능이라 회원 본인 키를 쓸 수 없다.
- 이메일은 이미 운영자 SMTP를 쓰고 있으므로 같은 방식이다. **문자 발송은 운영자 비용이 드는 유료 서비스**이므로, 「사이트 회원 인증용 문자는 운영자 계정으로 보낸다」는 예외를 주인님이 확정해 주셔야 한다. 확정되면 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8에 기록한다.

## 5. 비용

| 구분 | 1단계(이메일) | 2단계(문자) |
|---|---|---|
| 개발·시험 | 없음(기존 SMTP, 시험 계정으로 몇 통) | 시험 문자 몇 건(건당 수십 원 이하, 업체 가격표 확인 후 확정) |
| 운영자 인프라 | 없음(네이버 SMTP 하루 발송 한도 안) | 문자 건당 요금 + 업체 가입·충전, 발신번호 사전 등록(통신 규정상 필수) |
| 회원 부담 | 없음 | 없음 |

## 6. 바뀌는 파일 (예정)

- 새로: `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`, `app/api/auth/password-reset/email/route.ts`
- 수정: `app/(auth)/login/LoginForm.tsx`(링크 한 줄), 메일 본문 템플릿(`lib/email/` 안)
- 2단계: `app/api/auth/password-reset/sms/route.ts`, `…/sms/verify/route.ts`, `lib/sms/client.ts`, `supabase/migrations/0039_password_reset_codes.sql`
- 디자인은 기존 로그인 화면(다크 + 골드, `GlassCard`/`GoldButton`)과 똑같이 맞춘다.

## 7. 검수

1. 로컬 `npx tsc --noEmit` + `npm run build`.
2. 크롬 실제 창에서 시험 계정 `buylifemall@naver.com`으로: 비밀번호 찾기 → 메일 수신 → 링크 → 새 비밀번호 저장 → 새 비밀번호로 로그인. **시험 후 원래 비밀번호로 되돌리는 일은 주인님이 직접**(비밀번호는 에이전트가 입력하지 않음).
3. 실패 상황: 없는 이메일, 만료된 링크, 이미 쓴 링크, 짧은 비밀번호, 반복 요청 차단.
4. 모바일 폭(375~390px) 화면 확인.

## 8. 배포·인수인계

- 메인 사이트 배포(루트 `.`) — 프로그램 버전(`programs.version`)은 해당 없음.
- 커밋·푸시·배포 후 `docs/HANDOFF.md` 맨 위, `docs/ERROR_LESSONS.md`(발견 사항 있을 때), `docs/PROGRAM_IDEA_BACKLOG.md`(아이디어 항목) 갱신.

## 9. 2차 추가 (2026-10-19, 주인님 승인 「진행해줘」)

- 이메일(아이디) 찾기 `/find-email`(이름+핸드폰 문자 인증, 이메일 일부 가림), 인증번호 남은 시간 표시(`CodeTimer`), 관리자 「메일·문자 연결 점검」(`/api/admin/messaging-health`, 실제 발송 없음). 비용 없음, DB 구조 변경 없음.
