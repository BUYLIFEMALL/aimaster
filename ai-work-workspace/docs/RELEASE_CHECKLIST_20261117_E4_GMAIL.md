# E4 Gmail 릴리스 확인표 (WS-20261117-25, 2026-11-17 [역할: workspace])

> Master `msg_66c51e70c1d7` 지시로 쓴 **문서 전용** 정리입니다. 이번 작업에서 제품 코드·SQL·운영 DB·실제 구글·빌드·배포는 0입니다.
> 상태: **Gmail 기능 꺼짐(`GMAIL_ENABLED = false`, 코드 상수) · 0074/0075 운영 미적용 · 실제 구글 호출 0.** QA040(Mac 독립 검수) 진행 중이며 배선·서버·SQL은 동결 상태입니다.
> 근거 문서: [`PLAN_20261117_E4_GMAIL_F03_A2.md`](PLAN_20261117_E4_GMAIL_F03_A2.md) §5·§7·§8·§10.

## 1. 경로별 최종 커밋·지문 (기준 시각: 이 문서 커밋 직전, 모든 경로 미커밋 변경 0)

| 경로 | 마지막 커밋 | git blob(앞 12자) | 비고 |
|---|---|---|---|
| `src/server/gmailInbox.ts` | `3c820f2b6` | `58ac654392bc` | QA038 통신 오류 분류 → QA041 조건부 끊기(이전 `c250894f1`/`e35d3db602b9`) |
| `src/server/gmailHandlers.ts` | `3c820f2b6` | `7e4099a63521` | 명령 4개 → QA040 예외 고정 봉투(`6bd503b5e`) → QA041 끊기 `expectSub` 필수(이전 `d8e7e188c`/`9292e52c0efd`) |
| `src/server/runtime.ts` | `d8e7e188c` | `dc8b05e95b39` | 등록 2줄 |
| `src/app/inbox/gmailApi.ts` | `8069f60df` | `e65b9dee22df` | 화면 호출 묶음 → QA041 끊기에 `expectSub`(이전 `d8e7e188c`/`61787471394a`) |
| `src/app/inbox/GmailInboxPanel.tsx` | `8069f60df` | `5c4bb782d93d` | QA039 `a77ed2b57` → off 숨김 `1c46f1bd4` → 끊기 결과 모름 `16823b758` → QA041 확인한 계정 전달·문구 정정 |
| `src/app/inbox/InboxBoard.tsx` | `d8e7e188c` | `9e9b5a75535e` | `gmailOn`·`useMemo` |
| `src/app/inbox/page.tsx` | `d8e7e188c` | `d367e2b74454` | `gmailEnabled()` 전달 |
| `src/app/api/oauth/google-gmail/start/route.ts` | `6e6267120` | — | 꺼짐이면 `gmail_error=off`로 돌려보냄(13행) |
| `src/app/api/oauth/google-gmail/callback/route.ts` | `6e6267120` | — | 꺼짐이면 `gmail_error=off`(26행) |
| `tests/integration/gmailInbox.test.ts` | `3c820f2b6` | `b76cbfc80bbd` | |
| `tests/integration/gmailAddDb.test.ts` | `3c820f2b6` | `4030932cb3d0` | |
| `tests/integration/gmailHandlers.test.ts` | `3c820f2b6` | `5da737eae955` | |
| `tests/integration/gmailApiAdapter.test.ts` | `8069f60df` | `51221c784350` | |
| `tests/integration/gmailInboxPanelDom.test.ts` | `8069f60df` | `d69e9e8faa6c` | |
| 루트 `supabase/migrations/0074_gmail_catalog_one_account.sql` | `edef06d62` | sha256 `0fe7e7432b19d88d95b4ea4ac19350a0d44db30d365ddca4bf4cde4430dab230` | 운영 미적용 |
| 루트 `supabase/migrations/0075_gmail_inbox_claims.sql` | `4da9457c7` | sha256 `ed7c41c4f6862e8b5f8eef3090c58ef5774742dddfa237796bddbe7c4564e73b` | 운영 미적용 |

**함께 배포 조건(QA041)**: 서버 `3c820f2b6`과 화면 `8069f60df`는 반드시 같은 배포에 들어가야 합니다(서버는 끊기에 `expectSub`를 요구하고, 화면은 이 커밋부터 보냄). 위 표는 2026-11-17 QA041 커밋 뒤 다시 잰 값이며, 모든 경로 미커밋 변경 0입니다.

적용 직전에 `sha256sum supabase/migrations/0074_*.sql supabase/migrations/0075_*.sql`이 위 값과 같은지 먼저 확인합니다. 다르면 적용하지 않습니다.

## 2. 0074·0075 적용 순서와 안에서 하는 검사 (운영 적용은 승인 뒤)

순서: **0074 → 0075** (바로 앞 번호 0073까지 운영 적용 상태를 먼저 확인합니다).

**0074** (한 거래, `lock_timeout 5s`·`statement_timeout 60s`)
1. 사전 중복 검사: 회원 한 명에게 `google_gmail` 줄이 2개 이상이면 **멈춤**(지우지 않음).
2. 카탈로그: `google_gmail` 줄이 없으면 넣고, 있으면 기능 칸(kind·key_names·scope_sets·connect_program_url·is_active)이 다를 때 **멈춤**(덮어쓰지 않음).
3. 부분 고유 인덱스 `member_platform_accounts_gmail_one`: 없으면 만들고, 그 뒤 `relkind='i'`, 대상 표, 고유, `indisvalid`·`indisready`·`indislive`가 모두 참이고 정의 문자열이 기대와 같아야 함. 아니면 **멈춤**(지우거나 다시 만들지 않음).
4. 확인 쿼리 2개(카탈로그 1줄, 인덱스 정의 1줄).

**0075**
- 새 표 `public.gmail_inbox_claims`: RLS 켜짐·정책 0, `public`·`anon`·`authenticated` 권한 회수, `service_role`만 읽기·쓰기.
- 새 함수 `public.gmail_inbox_add(uuid, text, text, text, text)`: `security invoker`, `search_path = ''`, 실행 권한은 `service_role`만.
- 클레임은 받은 업무 줄과 함께 지워짐(`on delete cascade`).

적용 뒤 역할 정의 확인(읽기 전용 SQL): `has_table_privilege('anon'|'authenticated', 'public.gmail_inbox_claims', 'select')`가 false인지, `has_function_privilege('authenticated', 'public.gmail_inbox_add(uuid,text,text,text,text)', 'execute')`가 false인지, `service_role`은 true인지 봅니다.

## 3. Gmail이 꺼진 상태로 배포하면 0074·0075가 필요한가 — **필요 없음**

| 경로 | 꺼짐일 때 동작 | 근거 |
|---|---|---|
| 서버 명령 4개 | Gmail 전용 저장소·구글·OAuth를 부르기 전에 `{ ok:false, code:'off' }`. **공통 /api/rpc 전처리(권한 확인·AI 키 읽기·모델 목록 준비·회원 확인·끝난 뒤 작업)는 그대로 실행됨 — 「전체 요청 DB·외부 0」이 아님(QA040 정정)** | `gmailInbox.ts` `ensureOn()`(각 함수 첫 줄), 시험 `gmailHandlers.test.ts` 「꺼짐」 4개: Gmail 저장소·fetch·Supabase 관리 접근 0, 같은 시험에서 공통 전처리 실행 1회씩 확인 |
| OAuth 시작·콜백 | 바로 받은 업무 화면으로 돌려보냄(`gmail_error=off`) | 위 표의 두 route 파일 |
| 받은 업무 화면 | 패널 0·Gmail 호출 0(서버 `gmailEnabled()`가 false) | `page.tsx`, 시험 `gmailApiAdapter.test.ts` 「gmailOn 없음(기본)」 |
| 기존 받은 업무 기능 | 그대로(`workInboxDatabases`·`workInboxList` 호출 유지) | 같은 시험, 전체 61파일 792 통과 |

**주의 — 꺼진 상태에서 0074만 먼저 적용하면 회원 화면이 바뀝니다.** 메인 사이트 `/api-settings`의 연동 목록(`components/settings/MemberIntegrations.tsx` 38~41행)이 `integration_catalog`에서 `kind='oauth_account'`·`is_active=true`인 줄을 모두 보여 줍니다. 그래서 「Gmail(받은 편지함 목록)」 항목과 `/inbox` 연결 링크가 나타나는데, 정작 그 화면의 패널은 숨겨져 있어 회원이 혼란을 겪습니다. 0074는 동결 상태라 `is_active`를 바꿀 수 없습니다.
→ 권장: **0074·0075는 Gmail을 켜는 배포와 같은 승인 묶음에서 적용**합니다. 0075만 따로 적용해도 화면에는 영향이 없지만(서버 키 전용 표·함수), 꺼진 동안에는 필요하지 않습니다.

## 4. 승인 묶음 분리

| 묶음 | 내용 | Gmail에 미치는 영향 |
|---|---|---|
| 기존 v1.58 후보(이미 미배포 대기) | E3 결재 묶음(`e297153b8`·`4ca85f4b2`·`310846f19`·`788c95778`·`c5b26d81c`·`81e816a26` 등, `docs/IMPROVEMENTS.md` 18행), 예약 표 생성 경합 수정 `d7895f6d4`(19행), 그리고 이번 **꺼진 Gmail 코드**(위 §1) | 꺼진 코드만 함께 나가므로 동작 0. DB 적용 0, 구글 0. 빌드 1회(묶음 전체 기준) |
| Gmail 실제 켜기(별도 승인) | 0074·0075 운영 적용 → 실계정 확인 → 스위치 `true` → 빌드·배포 | 이 묶음에서만 회원 화면·구글 호출이 생김 |

v1.58을 승인해도 Gmail 켜기는 승인되지 않습니다. 반대로 Gmail을 켜려면 v1.58(꺼진 코드 포함)이 먼저 배포돼 있어야 합니다.

## 5. 켜기 전 확인할 것 (실제 구글·실계정이 필요해 지금은 미확인)

1. **실제 PostgREST 오류 문구**: 0075 적용 뒤 운영 DB에서 `gmail_inbox_add`가 40001·22023을 낼 때 클라이언트가 받는 `code`·`status`가 시험 가정(`status > 0` + Postgres 코드)과 같은지 확인. 시험은 실제 `@supabase/postgrest-js` 2.117.3과 가짜 fetch로만 했습니다.
2. **실제 OAuth**: 시험 계정이 **본인 구글 앱**(운영자 앱 0)으로 연결. 동의 화면, 받은 권한이 `openid`·`email`·`gmail.metadata` 밖으로 넘지 않는지(넘으면 저장 거절), id_token 검증(`aud`·`azp`·`kid`). `gmail.metadata`는 구글의 「제한 권한」이라 회원 앱이 「테스트」 상태면 시험 사용자로 등록된 계정만 연결되고, 새로 받는 토큰(refresh token)은 7일 뒤 만료됩니다(안내 문구 확인).
3. **새 권한 동의**: `prompt=consent`, `include_granted_scopes`는 켜지 않습니다(캘린더 권한과 묶지 않음). 같은 구글 앱을 쓰는 캘린더 연결이 있는 회원은 「연결 끊기」 안내 문구(캘린더도 함께 끊길 수 있음)를 확인합니다.
4. **metadata 응답·`fields`**: `messages.list`(`fields=messages/id`)와 `messages.get`(`format=metadata`·`metadataHeaders=Subject,From,Date`·`fields=id,payload/headers`)이 실제로 본문 없이 머리글만 주는지 확인.
5. **Gmail 메시지 id와 화면 주소**: 저장 링크는 `https://mail.google.com/mail/u/0/#all/<id>`입니다. API 메시지 id가 이 주소에서 열리는지, 그리고 `u/0`(브라우저의 첫 구글 계정)이 연결 계정과 다를 때의 동작을 실계정으로 확인합니다. 지금은 **보장하지 않습니다**.
6. **보관 기간**: 받은 업무 1년은 **기존 관리자 지정 예외**(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8, 코드 `WORK_INBOX_RETENTION_DAYS = 365`)를 그대로 따릅니다. Gmail 줄은 제목·링크만 담고 본문·보낸 사람·이메일은 저장하지 않습니다. 정책을 넓히는 것이 아닙니다.

## 6. 켰을 때 구글 호출 수와 비용

| 동작 | 구글 토큰 요청 | Gmail API GET | 구글 공개 키(JWKS) | DB |
|---|---|---|---|---|
| 상태 확인 | 0 | 0 | 0 | 연결 줄 읽기 |
| 목록 | 0~2: 저장된 토큰이 유효하면 0, 만료면 1, 그 뒤 Gmail이 401을 내면 이 목록 요청 전체에서 강제 갱신 1번만 | 1~22: 목록 1 + 메일 최대 20 + 401 뒤 같은 요청 다시 1 | 0 | 연결 읽기·확인 |
| 받은 업무 넣기 | 0~2(같은 규칙) | 1~2: id 확인 1 + 401 뒤 1 | 0 | `gmail_inbox_add` 1 |
| 연결 끊기 | 0 | 0 | 0 | 연결 줄 삭제(구글 권한 철회 호출 0) |
| 연결하기(OAuth 콜백) | 1(코드 교환) | 0 | 0~2: 캐시에 키가 있으면 0, 없으면 1, 모르는 `kid`면 강제 1번(60초 쿨다운) | 연결 줄 저장 |

- 위 숫자는 **코드 상한**이고 실계정으로 잰 값이 아닙니다. 401 이후 두 번째 401은 다시 시도하지 않고 재연결 안내로 멈춥니다.
- 화면은 주기적으로 확인하지 않습니다. 회원이 버튼을 누를 때만 위 호출이 일어납니다.
- 비용 **(Master `msg_15d3ec6f414b` 정정)**: 운영자 키·운영자 비용·AI 호출은 0입니다. Gmail API·구글 토큰 요청은 회원 본인 구글 앱(회원 프로젝트)에서 나가며, 지금 구글이 Gmail API에 따로 요금을 매기지 않고 사용량 한도로 관리한다는 **전제**에서 회원 비용도 0으로 봅니다. 이것은 **요금이 나가지 않는다는 보증이 아니고**, 실계정·회원 프로젝트 설정(결제 계정 연결 여부 등)으로 아직 확인하지 않았습니다.
- (원래 문장 보존) 「비용: Gmail API와 구글 토큰 요청은 회원 본인 구글 앱의 무료 할당량을 씁니다. … 생기는 호출은 위 표의 클릭 단위 상한뿐입니다.」 → 위 정정으로 대체.

## 6-1. 연결 끊기의 보장 범위 (QA041)

- 끊기는 화면이 확인한 **구글 계정(sub) 단위** 조건입니다. 지금 연결이 다른 계정이면 지우지 않고, 읽은 뒤 바뀌었으면(다른 계정 또는 같은 계정 토큰 재저장) 0행이라 지우지 않습니다.
- **연결 생성 세대를 보장하는 것은 아닙니다.** 회원이 다시 누를 때 같은 구글 계정으로 새로 연결돼 있으면 그 새 연결이 지워집니다(「이 Gmail 계정 연결 끊기」의 뜻). 조건으로 쓰는 토큰은 서버 안에서만 비교하며 응답·기록에 남기지 않습니다.

## 7. 되돌리기 주의

- **스위치가 코드 상수입니다**(`let GMAIL_ENABLED = false`, 환경변수 아님). 켠 뒤 끄려면 **다시 빌드·배포**해야 합니다(빌드 1회 = 비용).
- DB: 0075 표에 줄이 생긴 뒤에는 표·함수를 지우지 않습니다(받은 업무 중복 방지가 깨짐). 0074 카탈로그 줄은 지우지 말고 필요하면 `is_active=false`(별도 승인 SQL). 고유 인덱스는 남겨도 꺼진 코드에 영향이 없습니다.
- 회원의 `google_gmail` 연결 줄(토큰 포함)은 기능을 꺼도 남습니다. 지울 때는 회원 「연결 끊기」 또는 별도 승인 정리로만 합니다.
- 이미 저장됐을 수 있는 「결과 모름」 넣기는 되돌리지 않습니다. 회원이 받은 업무 목록에서 확인합니다.

## 8. 「원문 0」의 범위 (Master 읽기 반영)

- **응답**: Gmail 오류는 정해 둔 code와 고정 한국어 문구만 돌려줍니다. Gmail이 아닌 예외는 공용 `runRpc`가 500과 일반 문구로 돌려줍니다(시험으로 확인).
- **서버 기록**: 같은 500 예외를 `runRpc`가 `console.error('[api] <명령> failed', e)`로 남깁니다(`src/server/runtime.ts` 218행). 그래서 **서버 로그에는 원문이 남을 수 있고, 「원문 0」은 응답 기준이지 로그 기준이 아닙니다.** 실제 fixture 검토는 Master가 Mac에 요청했습니다. 이번 작업에서 제품 코드는 고치지 않았습니다.
- **QA040 처리(이 문서 다음 커밋)**: Mac이 실제 fixture로 같은 문제를 확인해(`store.getApp` 예외 원문이 `console.error` 두 번째 인자에 남음) `gmailHandlers.ts`만 고쳤습니다. 이제 Gmail 명령의 예상 밖 예외는 던지지 않고 고정 봉투(넣기·끊기 `unknown`, 읽기 `server`)로 바꾸며, 기록은 `[gmail] <명령> unexpected error` 고정 한 줄(원문·cause·stack 0)입니다. 공용 `runRpc`·logger는 바꾸지 않았습니다. 그래서 Gmail 명령에서는 응답과 기록 모두 원문 0이고, 다른 명령은 기존과 같습니다.

## 9. 사람(주인님) 승인이 필요한 것 — 최종 정리

| 순서 | 승인 대상 | 비용 |
|---|---|---|
| 1 | v1.58 배포(E3·예약 수정·꺼진 Gmail 코드 포함) | 빌드 1회 |
| 2 | 운영 DB 0074·0075 적용(§2 지문 확인 뒤, 0074 → 0075) | 없음 |
| 3 | 실제 구글 OAuth·Gmail 호출로 실계정 확인(시험 계정 본인 구글 앱, §5) | 없음(회원 앱 무료 할당량) |
| 4 | 스위치 `GMAIL_ENABLED = true` + 빌드·배포 | 빌드 1회 |
| 5 | 위 확인에서 수정이 생기면 그 추가 빌드 | 빌드 1회씩 |

2~4는 하나의 「Gmail 켜기」 승인으로 묶는 것을 권장합니다(§3 주의 때문에 0074만 먼저 적용하지 않음).


## 10. 최종 상태 정리 (꺼진 상태 소스 준비 완료, 2026-11-17 Master `msg_c64a15cf9531`)

| 구분 | 상태 |
|---|---|
| 소스 | 위 §1 표가 최종. 미커밋 변경 0. Master 지시로 동결(반례가 오면 우선 수정) |
| SQL | 0074·0075 지문 위 §1 그대로, **운영 미적용** |
| 기능 | `GMAIL_ENABLED = false`, 미배포 |
| 시험 범위 | 격리 실행만: 가짜 저장소·가짜 구글 fetch, 격리 DB(`qa_*`, 시험 뒤 삭제), 실제 `/api/rpc` 처리기+runtime, 실제 `@supabase/postgrest-js`+가짜 fetch, jsdom 화면. Gmail 7파일 282·tsc 0 |
| 검수 | QA036·QA038·QA039·QA040·QA041 지정 범위 PASS(Mac), Master 수락. 실제 PostgREST 작성자·실제 모듈 모의·브라우저는 미검수 |
| 미검수(새 승인 필요) | 실계정 OAuth·Gmail 응답, 운영 PostgREST 실제 오류 문구·삭제 건수 머리글, 메시지 id↔화면 주소, 실제 브라우저 화면, 운영 0074·0075 적용, 스위치 켜기·빌드 — §5·§9 그대로 |


## 11. 활성 실행 준비 (WS27, 2026-11-18 주인님 채팅 「Gmail 켜기 진행할테니 필요한 것 정리해서 보고해」 → Master `msg_99c304d7619d`)

> 아직 실행 0: 스위치 커밋·운영 SQL·빌드·실제 Gmail 호출 모두 하지 않음. 역할 — Workspace: 체크리스트 준비 / 메인 Master: 운영 SQL·배포 단일 실행 / Mac: 독립 검수·브라우저 / 주인님: 본인 GCP 설정·OAuth 동의.

### 11-1. 현재 기준
- 운영: `ai-work-workspace` **v1.57**(예약 링크 활성, `3faafa33a`), 운영 DB ref `esgxyikcnnvmlhygjkth`.
- 다음 묶음(미배포): E3 결재(`e297153b8`·`4ca85f4b2`·`310846f19`·`788c95778`·`c5b26d81c`·`81e816a26`·`b8860ba8c`·`e668caf32`) · WS23 `d7895f6d4` · 요일 칩 `a41a1e31e` · Gmail 소스(§1 표, 서버 `3c820f2b6`+화면 `8069f60df` 함께).
- SQL 지문: 0074 `0fe7e7432b19d88d95b4ea4ac19350a0d44db30d365ddca4bf4cde4430dab230`, 0075 `ed7c41c4f6862e8b5f8eef3090c58ef5774742dddfa237796bddbe7c4564e73b`.

### 11-2. 주인님 GCP 설정 (시험 계정 `buylifemall@naver.com`의 본인 구글 앱 = 캘린더 연결과 같은 `google_client_id` 앱)
1. 「Gmail API」 사용 설정.
2. OAuth 동의 화면 범위에 `https://www.googleapis.com/auth/gmail.metadata` 추가(구글 「제한 권한」 — 앱이 테스트 상태면 등록한 시험 사용자만 연결, 새 토큰은 7일 뒤 만료될 수 있음).
3. 테스트 상태면 연결할 Gmail 계정을 시험 사용자로 추가.
4. 승인된 리디렉션 URI에 `https://ai-work-workspace.buylife.xyz/api/oauth/google-gmail/callback` 추가(캘린더 주소는 그대로 둠).
- **같은 앱을 캘린더와 함께 쓸 때(숨기지 않음)**: Gmail 연결은 `openid`·`email`·`gmail.metadata`만 요청하고 `include_granted_scopes`를 켜지 않음. 그래도 구글이 토큰 응답에 캘린더 등 다른 권한을 함께 돌려주면 **저장 거절**(`gmailInbox.ts` 309행, 검사 약화 0) → 실검증 때 이 경우가 나오면 연결 실패로 기록하고 Master 판정. 구글 계정 「타사 연결」에서 이 앱을 철회하면 **캘린더 연결도 함께 끊김**. 워크스페이스의 「Gmail 연결 끊기」는 로컬 줄만 지우고 구글 철회 호출 0(캘린더 영향 0).
- 완료 신호: **2026-11-18 주인님 「다 등록되어 있어」·「GCP 설정 완료」 → Master 회수(`msg_239718a44416`), 요청 `f438b74a` 완료.** 미확인(실검증 때 확인, 값 원문 보고 0): 프로젝트 클라이언트 ID가 시험 계정 등록 ID와 같은지(같다/다르다만), 테스트 사용자 실제 목록. 남은 것: 승인 `d612f13a`(공개 방식·정상 빌드 1회/복구 1회) 답변과 Master 판정 — 스위치·운영 SQL 미착수.

### 11-3. 실행 단계와 멈춤·되돌리기 조건 (메인 Master 단일 실행)
| 단계 | 내용 | 멈춤 조건 | 되돌리기 |
|---|---|---|---|
| 1 | 0074·0075 지문 확인 → 0074 적용 | 지문 다름 / 0074 안 검사(중복 줄·카탈로그 기능 칸·인덱스 유효성) 예외 | 거래째 되돌려짐. 카탈로그 줄이 생겼다면 메인 연동 목록에 Gmail이 보임 → 같은 날 2~4단계까지 가거나 `is_active=false`(별도 승인 SQL) |
| 2 | 0075 적용 → §2 역할 확인 SQL | 예외 / 역할 확인 불일치 | 표·함수는 줄이 생기기 전이면 지워도 됨(별도 승인), 생긴 뒤엔 유지 |
| 3 | 스위치 `GMAIL_ENABLED = true` 커밋(Workspace, 시험의 OFF 경로는 시험 안에서 명시적으로 끔) + v1.58 묶음 빌드 1회 | 시험·tsc 실패 / 빌드 실패 | 커밋 되돌림, 빌드 전이면 비용 0 |
| 4 | 시험 계정 실검증(Mac 브라우저 + 주인님 OAuth 동의) | 아래 실패 항목 하나라도 | 스위치 끄기 커밋 + **재빌드 1회(추가 승인 범위)** |

- 실검증 호출 범위(정상): 연결 1회(토큰 교환 1·공개 키 0~2), 목록 1~2회(Gmail GET 최대 22씩), 넣기 1~2건(GET 최대 2씩), 같은 메일 다시 넣기 1회(existing 확인), 끊기 1회. 그 밖 반복 호출 0.
- 실패 항목: 동의 화면에 요청 밖 권한 / 저장 거절(권한 섞임) / 목록에 본문·미리보기 노출 / 넣기 결과 이상 / 중복 2줄 / Gmail 링크가 다른 계정·다른 메일로 열림(§5-5) / 끊기 뒤 연결 남음.
- 빌드 승인 범위 분리: **정상 배포 1회**(v1.58과 공유) / **실패 복구 재빌드 1회**(위 4단계 실패 때만, 별도 승인).

### 11-4. 공개 방식 비교 (Master 판정 대기 — 코드 확대 0)
| 안 | 내용 | 장점 | 단점 |
|---|---|---|---|
| 전원 공개(지금 소스) | 스위치를 켜면 모든 회원 받은 업무 화면에 패널 | 추가 코드·검수 0, 빌드 1회 | 실검증과 공개가 동시 — 실패 시 재빌드 전까지 회원에게 실패 화면이 보일 수 있음 |
| 시험 회원 한정 게이트 | 서버 스위치 + 「허용 회원 목록(시험 계정)」일 때만 켜짐(페이지 `gmailEnabled()`·명령·OAuth 경로 모두 같은 판정), 실검증 통과 뒤 목록 해제 = 전체 공개 | 실검증 실패가 회원에게 안 보임 | 코드 추가(서버 판정 1곳·page·OAuth 2경로·명령 4개)·새 QA 1회, 전체 공개 때 빌드 1회 더 |
