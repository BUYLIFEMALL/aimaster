# WS-20261117-03 결과 — 네이버 수집 등록 원자성(TAP17-02 `46920e765`) 독립 검토 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_2e49c4fe2353` · 대상: Backend `CC-B2B-BACK-01` 결과 `.ai/results/TAP-20261117-02-CC-B2B-BACK-01.md`, 커밋 `46920e765`(새 SQL `20261117100000_tap_collect_queue_atomic.sql`·`src/lib/actions/naverCollect.ts`·`src/types/database.types.ts`)
- 상태: **ready_review** · 보고 형식: 공통지침 v1.3 · 제품 수정 0 · 실수집 0 · build/deploy 0 · 운영/공유 DB 0
- 범위 구분: 이 검토는 **등록 원자성 변경 하나**에 대한 것. 운영 마이그레이션은 아직 미적용(준비 상태) — 쇼핑제휴 2단계 전체 PASS가 아님.

## 1. 결론
- 등록 함수 자체(선점·트랜잭션·항목별 되돌림·동시 2요청)는 **타당**. Backend 17/17 범위는 반복하지 않음.
- **반례 1건(중간·새로 확인)**: 수집 결과 저장(`saveNaverCollectedAction`)이 상태 조건 없이 행을 덮어써, 등록된 행이 다시 `ready`가 되면 **상품이 2건** 생김. 격리 DB에서 실제 재현.
- RPC 직접 호출로 서버 주소 검사를 건너뛸 수 있으나 **기존 권한과 같음**(새 위험 아님).

## 2. 확인한 것(타당)

| 항목 | 근거 | 판정 |
|---|---|---|
| 트랜잭션·동시 등록 | `update … where status='ready' … returning`이 행 잠금 → 동시 두 번째는 잠금 해제 뒤 조건 재평가로 `not found`·skipped (READ COMMITTED 재검사). 항목마다 `begin … exception`은 서브트랜잭션이라 선점·상품 insert·`product_id` 기록이 함께 되돌아감 | 타당 |
| RLS·invoker | `security invoker`, `set search_path=''`·모든 이름 스키마 지정, `auth.uid()` 없으면 예외, `user_id = v_uid` 조건 + 대기열 RLS(owner all)·상품 RLS(insert own) 그대로. `revoke … from public, anon`·`grant … authenticated` | 타당 |
| 사전 중복 탐지 | 두 고유 인덱스 전에 기존 중복을 세어 있으면 `[멈춤]` 예외(지우거나 합치지 않음). 점검과 인덱스 생성 사이에 중복이 끼면 `create unique index`가 실패해 역시 멈춤(조용히 넘어가지 않음) | 타당 |
| 부분 실패 되돌림 | 항목 하나 실패 → `failed` 집계, 같은 호출의 다른 항목은 계속. 31개·로그인 없음·배열 아님은 호출 전체 오류. 잘못된 uuid도 예외 → failed | 타당(실패 사유가 기록되지 않는 점은 참고 3-3) |
| upsert 통계 | `onConflict: "user_id,affiliate_url", ignoreDuplicates: true` → `ON CONFLICT (user_id, affiliate_url) DO NOTHING`. 부분 인덱스가 아니라 대상 일치, DO NOTHING이라 RLS insert 정책만 필요, `.select("id")`는 실제 들어간 줄만 → `added`/`duplicated` 정확. 같은 요청 안 중복은 `parseNaverBrandLinks`가 이미 제거 | 타당(PostgREST 실호출은 미검수) |
| 서버 재검사 | 등록 전 `isNaverBrandAffiliateUrl`·`naverProductIdentity`(WS17-02 수정판 — https·계정·포트 거부)로 걸러 통과 항목만 `{id, final_url}` 전달, 함수는 `final_url`이 그 값과 같을 때만 선점 → 검사 뒤 값이 바뀌면 skipped | 타당 |
| delete와 등록 경합 | 삭제가 먼저면 등록 skipped. 등록 중 삭제는 잠금 대기 후 registered 행 삭제(회원 의도대로, 상품은 남고 근거만 사라짐 — 기존 30일 정리와 같은 결과) | 타당 |
| 타입 | `Functions.tap_register_collected` 추가, 반환 형식 일치 | 타당 |

## 3. 반례·참고

### 3-1. [반례·중간] 저장이 등록된 행을 되돌려 상품 중복
- 경로: `src/lib/actions/naverCollect.ts` `saveNaverCollectedAction` — 52줄에서 상태를 읽고 `registered`면 돌아가지만, 56~58줄(확장 오류 → `needs_review`)·61~63줄(검사 실패 → `needs_review`)·65~72줄(성공 → `ready`)의 `update`에는 **상태 조건이 없음**(`.eq("id").eq("user_id")`만). 등록 함수의 선점 조건에도 `product_id is null`이 없음.
- 순서: 저장이 상태를 읽음(아직 ready/needs_review) → 그사이 등록 함수가 registered·product_id 기록·커밋 → 저장의 update가 `ready`(또는 `needs_review`)로 덮음 → 다시 등록하면 새 상품.
- 재현(격리 DB `qa_tap_ws_race`, 실제 마이그레이션 0001·source_key·대기열·`46920e765` 적용, `set role authenticated`·회원 JWT):
  - K1 첫 등록 `inserted 1`, 상품 1
  - K2 저장 update를 그대로 실행(상태 조건 없음) → 대기열 `ready`·`product_id` 남음 → 다시 등록 `inserted 1` → **상품 2건, 대기열과 연결된 것 1건**(먼저 생긴 상품은 근거와 끊김)
  - K3 확장 오류 저장도 registered 행을 `needs_review`로 바꿈 → 화면의 「수집」 대상(`pending`·`needs_review`)에 다시 들어가 같은 흐름 반복 가능
- 성격: 같은 행에 대해 저장 요청의 「읽기~쓰기」 사이(수 ms)에 등록이 끝나야 함 → 보통은 여러 탭·오래된 목록에서만. 피해는 회원 본인 데이터 중복. **원자성 수정 전에도 있던 경합이지만, 수정 보고의 「상품은 1건만」 주장 범위에서 빠진 경로.**
- 완료조건(둘 다 권장):
  1. 등록 함수 선점 조건에 `and t.product_id is null` 추가 — 격리 DB에서 이 조건만 넣은 함수로 같은 반례 재실행 시 `skipped 1`·새 상품 0, 새 행의 정상 등록 `inserted 1` 확인함(G1·G2).
  2. 저장의 세 `update`에 `.neq("status", "registered")`(또는 `.is("product_id", null)`) 조건 추가 → 등록된 행의 상태·도착 주소·근거를 덮지 않음.
  - 시험: 「등록 → 저장 update → 재등록」에서 상품 1건·상태 registered 유지.

### 3-2. [참고·새 위험 아님] RPC 직접 호출로 서버 주소 검사 우회
- 회원은 대기열 RLS(owner all)로 `final_url`을 허용 밖 값(`https://evil.example/p`)으로 바꾸고 `tap_register_collected`를 직접 부르면 등록됨(K4 `inserted 1`). 함수 안에서는 주소 규칙을 다시 보지 않음.
- 비교: 같은 회원은 원래부터 `affiliate_products`에 아무 주소나 직접 insert 가능(0001 `insert_own`, K5 확인) → **새 권한 아님**. 서버 동작 경로(화면)는 `naverProductIdentity`로 걸러짐. 원한다면 함수 안에 `final_url ~ '^https://(brand|smartstore|shopping)\.naver\.com/…|^https://pkgtour\.naver\.com/…'` 같은 최소 검사를 둘 수 있으나 필수 아님.

### 3-3. [참고] 실패 사유 미기록
- `exception when others`가 사유를 버리고 `failed` 수만 돌려줌 → 운영에서 왜 실패했는지 알 수 없음. `error` 칸에 `sqlerrm` 앞부분을 남기거나(되돌림 뒤 별도 update) 응답에 사유 목록을 넣는 것 권장.

## 4. 운영 적용 관련(Backend 절차 대조)
- 적용 순서(대기열 표 `20261116240000` 먼저 → 중복 읽기 확인 0줄 → 이 SQL → 인덱스·함수·anon 권한 확인 → 코드 배포)는 타당. 코드가 함수에 의존하므로 **SQL 먼저**가 맞음.
- 3-1 보완을 넣는다면 같은 SQL 파일(미적용 상태)에서 함수 조건 한 줄 + 서버 동작 3곳 조건을 함께 고친 뒤 적용하는 것이 비용상 유리.

## 5. 검증 / 미검수
- 실제 검증: 정적 대조 전부. 격리 DB `qa_tap_ws_race` 하나만 만들고(시작 전 다른 접속 0·`qa_tap_` DB 0 확인, 공유 `aww`·`mb_*` 미접촉) 끝나고 삭제. 흉내 틀은 mall-builder 검사 스크립트의 것 + Supabase 기본 권한 + 빈 `user_api_keys` 표.
- Backend 17/17(동시 2등록·사전 점검·anon 거부 등)은 반복하지 않음.
- 미검수: 실제 PostgREST의 upsert·rpc 경로, 실제 동시 타이밍으로 3-1 재현(순서를 그대로 SQL로 재현함), 운영 DB.

## 6. 다음 단계
- Master 판정. 3-1 보완은 Backend(`CC-B2B-BACK-01`) 몫 — 대기열 SQL·`naverCollect.ts` 담당.

## 비용
없음(빌드 0·AI 0·운영 DB 0·외부 호출 0).
