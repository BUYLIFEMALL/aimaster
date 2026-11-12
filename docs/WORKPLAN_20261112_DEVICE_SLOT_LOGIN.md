# 작업 지시서: 같은 계정 「PC 1곳 + 모바일 1곳」 로그인 (2026-11-12 확정)

- 받는 사람: 사이트 메인 정책 담당(메인 사이트 루트 `app/`·운영 DB 정책) [역할: 미지정, 최근 메인 사이트 `claude-win-rea`]
- 보낸 사람: 음악 담당 `claude-win-20261024-music` [역할: music]
- 근거: 플랜 [`PLAN_20261112_DEVICE_SLOT_LOGIN.md`](PLAN_20261112_DEVICE_SLOT_LOGIN.md)(결정 4건 주인님 확정), 원인 조사 `free-music-studio/docs/IMPROVEMENTS.md` 2026-11-12 「2차 조사」
- 이 지시서가 [`REQUEST_20261112_MAINSITE_SCOPED_SIGNOUT.md`](REQUEST_20261112_MAINSITE_SCOPED_SIGNOUT.md)를 대신합니다(로그아웃 범위 부분 포함).
- 시작 전: `docs/ACTIVE_WORK.md`에 내 줄 추가, `git status --porcelain -- app components lib middleware.ts supabase scripts/pending-check.mjs`로 남의 미커밋 확인.

## 0. 확정된 규칙 (바꾸지 않음)

1. 같은 계정은 **PC 브라우저 1곳 + 모바일 브라우저 1곳**까지 동시에 접속합니다.
2. 같은 종류에서 새로 로그인하면 **그 종류의 예전 로그인만** 메인 사이트와 모든 하위 프로그램에서 끊습니다. 새 로그인은 남습니다.
3. 로그아웃 버튼·세션 만료 화면은 **그 브라우저만** 로그아웃합니다. 비밀번호 재설정만 지금처럼 모든 기기를 끊습니다.
4. **관리자·시험 계정은 예외**입니다(`profiles.concurrent_login_exempt = true`, 코드에 이메일 금지).
5. 서버가 대신 로그인하는 하위 프로그램은 다음 배포 때 브라우저 `user-agent`를 넘깁니다. 그 전까지 그 로그인은 `other`로 분류되어 제한하지 않습니다.
6. 접근 토큰 수명은 그대로 둡니다(예전 기기가 일부 프로그램에 최대 1시간 남음).
7. `scripts/pending-check.mjs`가 하위 프로그램의 누락을 알려 줍니다.
8. 확장 프로그램 연결 토큰과 서버 예약 작업은 건드리지 않습니다.

## 1. 기기 종류 판정 (DB와 코드가 같은 규칙)

| 종류 | 조건 |
|---|---|
| `other` | `user_agent`가 없거나 `Mozilla/`로 시작하지 않음(서버·데스크톱 앱·스크립트) |
| `mobile` | `Mobi`, `Android`, `iPhone`, `iPad` 중 하나가 들어 있음(태블릿 포함) |
| `pc` | 그 밖의 브라우저 |

## 2. 작업 순서와 통과 기준

| 단계 | 할 일 | 통과 기준 | 승인 |
|---|---|---|---|
| 1 | 운영 `auth.sessions` 읽기: 최근 7일 `user_agent` 앞 40자별 개수와 1절 분류 결과 | 메인 로그인은 `pc`/`mobile`, 서버 로그인 프로그램은 `other`로 나오는지 표로 기록 | 읽기만 |
| 2 | Lab DB(`rjjtjakljjxsgjelqgek`)에 3절 SQL 적용 → Lab 시험 계정으로 `user-agent`를 바꿔 로그인 4번(PC·PC·모바일·서버) | PC 두 번째 로그인 때 첫 PC 줄만 지워짐, 모바일·`other` 줄은 남음, 예외 표시를 켜면 아무것도 안 지워짐. **`auth.sessions` 삭제 권한 오류가 나면 멈추고 보고** | 비용 없음 |
| 3 | Lab에서 서버 로그인 + `global.headers["User-Agent"]` 전달 시험(4-4 코드) | 새 줄의 `user_agent`가 전달한 브라우저 값으로 찍힘. 안 찍히면 결정 1 「나」(메인 로그인으로 모으기)로 주인님께 다시 여쭘 | 비용 없음 |
| 4 | 메인 사이트 코드 수정(4절), `npx tsc --noEmit`, `npm run build` | 통과 | 로컬 무료 |
| 5 | `scripts/pending-check.mjs` 알림 2종(5절), `node --test`가 있으면 시험 추가 | 고치지 않은 프로그램에서 알림, 고친 메인 사이트에서는 안 뜸 | — |
| 6 | 운영 DB 마이그레이션(3절, 파일 `supabase/migrations/0065_device_slot_login.sql` — 번호는 그때 마지막 번호 다음) | 두 계정만 예외 `true`, 트리거 1개, 함수 2개 확인 | **주인님 승인** |
| 7 | 메인 사이트 배포(빌드 1회, 다른 빌드 없을 때) | Ready | **주인님 승인** |
| 8 | 실물 확인(6절) | 6절 전부 통과 | 주인님 휴대폰 필요 |
| 9 | 하위 프로그램 담당별 요청 한 줄(7절), 문서 갱신(8절) | — | — |

**되돌리기**: `drop trigger trg_enforce_login_device_slot on auth.sessions;` 한 줄이면 예전처럼 됩니다. 메인 코드는 범위만 바뀌므로 그대로 둬도 안전합니다.

## 3. SQL 초안 (Lab에서 먼저, 운영은 승인 뒤)

```sql
-- 칸
alter table public.profiles add column if not exists concurrent_login_exempt boolean not null default false;
alter table public.user_sessions add column if not exists device_kind text;

-- 판정 함수 (1절과 같은 규칙)
create or replace function public.login_device_kind(ua text)
returns text language sql immutable set search_path = '' as $$
  select case
    when ua is null or ua !~ '^Mozilla/' then 'other'
    when ua ~ '(Mobi|Android|iPhone|iPad)' then 'mobile'
    else 'pc'
  end
$$;

-- 새 로그인 때 같은 종류의 예전 로그인 정리
create or replace function public.enforce_login_device_slot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind text := public.login_device_kind(new.user_agent);
  v_policy text;
begin
  if v_kind = 'other' then return new; end if;
  select value #>> '{}' into v_policy from public.site_settings where key = 'concurrent_login_policy';
  if coalesce(v_policy, 'force_logout') <> 'force_logout' then return new; end if;
  if exists (select 1 from public.profiles p where p.id = new.user_id and p.concurrent_login_exempt) then
    return new;
  end if;
  delete from auth.sessions s
   where s.user_id = new.user_id
     and s.id <> new.id
     and public.login_device_kind(s.user_agent) = v_kind;
  return new;
exception when others then
  -- 정리에 실패해도 로그인 자체는 막지 않는다
  raise warning 'enforce_login_device_slot skipped: %', sqlerrm;
  return new;
end
$$;

drop trigger if exists trg_enforce_login_device_slot on auth.sessions;
create trigger trg_enforce_login_device_slot
  after insert on auth.sessions
  for each row execute function public.enforce_login_device_slot();

-- 예전 접속 기록 채우기
update public.user_sessions set device_kind = public.login_device_kind(device_info) where device_kind is null;

-- 예외 계정 (운영에서만, 이메일은 SQL 실행 때만 쓰고 코드·문서에 남기지 않음)
-- update public.profiles set concurrent_login_exempt = true where id in (<관리자 uid>, <시험 계정 uid>);
```

- `auth.sessions`를 지우면 `auth.refresh_tokens`가 연쇄 삭제되어, 예전 기기는 다음 토큰 확인 때 `session_not_found`로 끊깁니다.
- 함수 실행 권한: `revoke execute on function public.enforce_login_device_slot() from public, anon, authenticated;`도 함께 넣습니다(트리거 전용).

## 4. 메인 사이트 코드

### 4-1. 새 파일 `lib/session/deviceKind.ts`
```ts
export type DeviceKind = "pc" | "mobile" | "other";
// DB public.login_device_kind 와 같은 규칙 — 한쪽을 바꾸면 다른 쪽도 바꾼다
export function deviceKind(ua: string | null | undefined): DeviceKind {
  if (!ua || !ua.startsWith("Mozilla/")) return "other";
  return /Mobi|Android|iPhone|iPad/.test(ua) ? "mobile" : "pc";
}
```

### 4-2. `app/api/session/create/route.ts`
- `kind = deviceKind(req.headers.get("user-agent"))`.
- `profiles.concurrent_login_exempt`가 `true`이면 다른 줄을 지우지 않고 새 줄만 넣습니다.
- 「5분 이내 활성 세션」 조회와 `force_logout` 삭제를 **`device_kind = kind`인 줄만** 대상으로 바꿉니다(`block_new`의 409도 같은 종류만). `kind`가 `other`이면 다른 줄을 지우지 않습니다.
- 새 줄에 `device_kind: kind`를 넣습니다.

### 4-3. 로그아웃 범위 (`scope: "local"`)
| 파일 | 위치 |
|---|---|
| `app/(auth)/login/LoginForm.tsx` | 36행(세션 만료), 79행(409) |
| `app/api/session/logout/route.ts` | 17행 |
| `components/layout/Header.tsx` | 66행 |
| `components/layout/Sidebar.tsx` | 72행 |
| `components/layout/AdminSidebar.tsx` | 31행 |
| `app/(dashboard)/settings/page.tsx` | 117행 |
| `components/dashboard/RelogAdminButton.tsx` | 15행 |
| `app/(auth)/reset-password/ResetPasswordForm.tsx` | **바꾸지 않음** |

로그인 성공 뒤 `signOut({ scope: "others" })`는 넣지 않습니다(트리거가 대신함).

### 4-4. 하위 프로그램용 기준 코드 (메인에는 넣지 않고 7절 요청에 붙임)
서버에서 로그인하는 프로그램의 `lib/supabase/server.ts`(또는 `src/lib/supabase/server.ts`) `createServerClient` 옵션에 추가합니다.
```ts
const ua = (await headers()).get("user-agent") ?? "";
// createServerClient(url, key, { cookies: {...}, global: { headers: { "User-Agent": ua } } })
```

## 5. `scripts/pending-check.mjs` 알림 2종

저장 공간 위젯 알림(27~33행, 104·116행)과 같은 방식으로 넣습니다.
1. `[공통] 범위 없는 signOut()` — 프로그램 폴더 `src`·`app`·`components`·`lib`에서 `signOut()`(괄호 안이 비어 있음)을 찾으면 알립니다. 비밀번호 재설정 파일(`reset-password`)은 뺍니다.
2. `[공통] 서버 로그인 기기 정보 미전달` — `signInWithPassword`가 서버 파일(`"use server"` 또는 `actions/`)에 있는데 그 프로그램 `supabase/server.ts`에 `User-Agent`가 없으면 알립니다.
- `--all`은 두 알림의 남은 프로그램 목록을 보여 줍니다. 안내 문서는 이 지시서 7절입니다.

## 6. 실물 확인 (운영, 시험 계정 예외를 잠시 끄고)

1. 시험 계정 `concurrent_login_exempt`를 `false`로 바꿉니다.
2. PC 브라우저 A(ego lite)에서 메인 로그인 → 메인 사이트·무료음악을 엽니다.
3. 주인님 휴대폰에서 같은 계정으로 로그인 → **A와 휴대폰 모두 2분 뒤에도 로그인 상태**.
4. PC 브라우저 B(크롬)에서 로그인 → A는 메인 사이트 60초 안·무료음악 새로 고침 때 로그인 화면, **B와 휴대폰은 남음**.
5. B에서 로그아웃 → B만 로그아웃, 휴대폰은 남음.
6. 운영 `auth.sessions`에서 그 계정 줄이 `pc` 0~1개, `mobile` 0~1개인지 대조합니다.
7. 시험 계정 예외를 다시 `true`로 켭니다. 관리자 계정은 처음부터 끝까지 `true`입니다.

## 7. 하위 프로그램 담당별 요청 (따로 배포하지 않음)

각 담당 프로그램 `docs/IMPROVEMENTS.md` 「미배포 대기」에 한 줄씩 남깁니다(남의 역할 파일은 고치지 않음).
> 「담당께」 다음 배포 때 함께: (1) 로그아웃 `signOut()` → `signOut({ scope: "local" })`(비밀번호 재설정 제외) (2) 서버 로그인이면 `supabase/server.ts`에 `User-Agent` 전달(`docs/WORKPLAN_20261112_DEVICE_SLOT_LOGIN.md` 4-4). `pending-check`가 알려 줍니다.

## 8. 끝나면 갱신할 문서

- 이 지시서와 플랜 8절 결과 칸
- `docs/ADMIN_POLICY_GUIDELINES.md`에 「동시 접속 = 같은 계정 PC 1 + 모바일 1, 관리자·시험 계정 예외」 추가
- `docs/ERROR_LESSONS.md`에 「범위 없는 `signOut()`은 모든 기기를 끊는다」 한 항목
- 루트 `docs/HANDOFF.md` 맨 위, 요청함 `report`
- `free-music-studio/docs/IMPROVEMENTS.md` 2차 조사 줄에 「해결: 커밋·배포」

## 9. 비용

| 항목 | 횟수 | 승인 |
|---|---|---|
| 메인 사이트 빌드 | 1회 | 실행 전 주인님 |
| 운영 DB 마이그레이션 | 1회(비용 없음) | 실행 전 주인님 |
| Lab DB 시험 | 비용 없음 | — |
| 하위 프로그램 | 추가 빌드 없음 | — |
| AI 호출 | 없음 | — |

## 결과 (받는 세션이 채움)
| 단계 | 결과 | 날짜·세션 |
|---|---|---|
| 1 운영 user_agent 분류 | 최근 14일: PC 38·모바일 13·서버 36(`node` 21·`Vercel Edge Functions` 15) → 메인 로그인은 pc/mobile, 서버 로그인은 other 확인 | 2026-11-12 [역할: policy] `claude-win-20261112-policy` |
| 2~3 Lab 시험 | **통과(2026-11-13 policy).** Lab 시험 전용 스키마 `policy_lab`(가짜 회원만 등록, 다른 Lab 회원 영향 없음)으로 두 가지 시험. (1) SQL로 로그인 줄 넣기 8단계 모두 기대대로: PC2 로그인 때 PC1과 그 갱신 토큰만 삭제, 휴대폰2 로그인 때 휴대폰1만 삭제, 서버(`node`) 줄 유지, 예외 계정은 삭제 없음, 판정 중 오류(회원 표 없음)에도 로그인 줄은 들어가고 삭제 없음, 회원 정보 없는 회원은 삭제 없음. (2) 실제 Lab 로그인 서버에 `@supabase/supabase-js` `global.headers["User-Agent"]`로 4번 로그인(PC 윈도우·기기 정보 없음·안드로이드·PC 맥): 예전 PC만 토큰 갱신 실패(`Refresh Token Not Found`), 나머지 3곳 갱신 성공. 전달한 기기 정보가 그대로 `auth.sessions.user_agent`에 찍히고, 전달 안 하면 `node`(other) → **결정 1 「가」 유효**. 시험 뒤 가짜 회원 2명·트리거·스키마 모두 삭제, Lab 회원 수 4명 그대로. | 2026-11-13 policy |
| 4~5 코드·점검 도구 | 4 완료(커밋, 푸시 안 함): 4-1~4-3 반영, 마이그레이션 `0069_device_slot_login.sql`. 지시서와 다른 점 — 예외 계정은 `retention_exempt=true`(같은 두 계정)에서 옮겨 이메일 없이 지정, 회원 정보가 없는 회원은 건너뜀, 세션 생성은 요청 머리글 우선·없으면 화면 기기 정보, 예전 줄은 `device_info`로 다시 판정. tsc 0·판정 시험 10/10·로컬 빌드 통과. 5 완료: `scripts/login-policy-check.mjs`(판정)·`scripts/pending-check.mjs`(폴더별 알림 2종, `--all` 남은 목록)·`scripts/login-policy-check.test.mjs` 2/2 통과. 고친 메인 사이트(`.`)는 알림 없음, 무료음악·쇼츠는 알림 확인. 2026-11-13 `--all` 기준 범위 없는 signOut() 94개, 서버 로그인 기기 정보 미전달 62/62개 | 2026-11-13 policy |
| 6~7 운영 적용·배포 | DB 적용 완료(2026-11-13 01:2x KST, 승인 뒤): 예외 계정 2개(`retention_exempt`와 같은 두 계정), 트리거 `trg_enforce_login_device_slot` 1개, 함수 3개, 기존 `user_sessions` 402줄 기기 종류 채움(pc 295·mobile 107). **메인 코드는 이미 배포돼 있었음**: 다른 세션 푸시로 `990ee16fb`가 함께 올라가 자동 빌드 Ready(`c9823d478`, 00:24 KST, DB보다 약 1시간 먼저) — 새 칸 없을 때 예전 방식으로 동작하게 만들어 둬서 오류 0(런타임 오류는 기존 `refresh_token_not_found` 2건뿐), 그 사이 접속 기록 2건 정상. 추가 빌드 없음(비용 0). 교훈: docs/ERROR_LESSONS.md 2026-11-13 | 2026-11-13 policy |
| 8 실물 확인 | **통과(2026-11-13 01:4x KST, 주인님 직접 확인 「잘되네」)**: 시험 계정 예외를 잠시 끄고 PC 브라우저 A·B와 주인님 휴대폰으로 진행. 운영 `auth.sessions` 대조 결과 시험 계정 줄 = 모바일 1개(안드로이드)만 — A는 B 로그인 때 끊김, B는 로그아웃으로 그 브라우저만 끊김, 휴대폰 유지, 예전 PC 세션 2개도 정리. 끝난 뒤 예외 다시 켬(예외 2개 = 관리자·시험 계정) | 2026-11-13 policy |
| 9 요청·문서 | | |
