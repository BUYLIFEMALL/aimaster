# WS-20261117-04 결과 — K2 경합 수정(`d89f5d2be`) 독립 재검토 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_4afcf115eefa` · 대상: Backend `CC-B2B-BACK-01` 커밋 `d89f5d2be`(`naverCollect.ts` +45/−18 중 저장 부분, `20261117100000_tap_collect_queue_atomic.sql`), 결과 `.ai/results/TAP-20261117-02-CC-B2B-BACK-01.md` 「수정 반환」 절
- 상태: **ready_review** · 보고 형식: 공통지침 v1.3 · 제품 수정 0 · 운영 DB 0 · build/deploy 0
- 판정: **WS-20261117-03 반례(K2·K3) 해소 확인.** 새 반례 없음(참고 1건).

## 1. 코드 대조

| 항목 | 근거 | 판정 |
|---|---|---|
| RPC 선점 조건 | `and t.product_id is null` 추가 — 이미 연결된 줄(옛 경로로 ready가 된 줄 포함)은 선점 안 함 | 타당 |
| 저장 3곳 쓰기 조건 | `guardedUpdate` 하나로: `.eq(id).eq(user_id).neq("status","registered").is("product_id", null).select("status")` → SQL `… and status <> 'registered' and product_id is null returning status`(status는 not null이라 `<>`가 null로 빠지는 일 없음) | 타당 |
| 처음 읽기 | `product_id`도 읽어, 상태가 registered이거나 연결이 있으면 쓰지 않고 `registered` 반환 | 타당 |
| 바뀐 줄 0일 때 | 현재 상태를 다시 읽어 그대로 반환(연결 있으면 `registered`, 없어졌으면 오류) — 「ready 저장 성공」 거짓 응답 없음 | 타당 |
| 사용 기록 | `saved.status === "ready"`일 때만. 0줄 경로가 `ready`를 돌려주는 경우는 「ready + 연결 없음」인데 그러면 조건에 맞아 실제로 쓰였을 것이므로 사실상 실제 저장 때만 기록 | 타당 |
| 섞인 줄 안내 | 마이그레이션이 「상태≠registered + 연결 있음」 줄을 바꾸지 않고 NOTICE만 — 데이터 변경 없음, 등록·저장 둘 다 그 줄을 건드리지 않음 | 타당 |

## 2. 격리 DB 검증 (최소 순서만, Backend 34검사 반복 안 함)
- 시작 전 `aww-pg-test` 다른 접속 0·`qa_%` DB 0. 전용 `qa_tap_ws_before`(마이그레이션 @`46920e765`)·`qa_tap_ws_after`(@`d89f5d2be`)만 만들고 끝나고 삭제(끝 상태 = 시작 상태). 실제 마이그레이션 4개(0001·source_key·대기열·원자성) + mall-builder 흉내 틀 + Supabase 기본 권한 + 빈 `user_api_keys`. 모든 단계 `set role authenticated` + 회원 JWT.
- 저장은 `naverCollect.ts`와 같은 조건의 SQL로 흉내(수정 전 = 조건 없음, 수정 후 = 위 조건).

| 단계 | 수정 전 | 수정 후 |
|---|---|---|
| K1 등록 | inserted 1 | inserted 1 |
| K2 늦은 정상 저장 | 바뀐 줄 1(덮어씀) | **0** |
| G1 다시 등록 | **inserted 1 → 상품 2건(빨강 재현)** | **skipped 1, 상품 1건** |
| K3 늦은 오류 저장 | 바뀐 줄 1 → `needs_review`+연결 | **0**, `registered` 유지 |
| G2 정상: 저장 ready → 등록 → 늦은 오류 저장 | 1 · inserted 1 · 덮어씀 1 | 1 · inserted 1 · **0** |
| G3 오류 저장 → 재수집 ready → 등록 | 1 · 1 · inserted 1 | 1 · 1 · inserted 1 |
| 끝 상품 수 | 4 | **3**(항목 3개당 1건) |

- **실제 동시 경합**(수정 후 DB, 연결 2개): A가 등록 함수를 부른 트랜잭션을 3초 유지 → 그 사이 B가 조건 있는 저장 시작(25.15초) → A 커밋(27.016초)까지 기다린 뒤 조건 재평가로 **바뀐 줄 0** → 줄은 `registered`·연결 있음·상품명 원래대로, 그 상품 1건.

## 3. 참고(반례 아님)
- 등록 뒤 회원이 상품을 지우면 `product_id`가 `on delete set null`로 비고 상태는 `registered`로 남음 → 저장은 처음 읽기에서 `registered` 반환, 등록 함수는 `ready`가 아니라 건너뜀 → 그 링크는 대기열 줄을 지우고 다시 넣어야 재등록 가능. 중복은 생기지 않는 안전한 쪽이라 지금 고칠 필요는 없고, 화면 안내 정도만 검토 가치.

## 4. 검증 / 미검수
- 실제 검증: 코드 대조, 격리 DB에서 수정 전·후 같은 순서(빨강→초록), 두 연결 실제 동시 경합.
- **미검수**: 서버 동작(`naverCollect.ts`)의 PostgREST `.neq/.is/.select` 경로를 실제로 호출하지 않음 — 같은 조건의 SQL로 재현한 동등성만 확인. 운영 DB 미적용 상태(적용 절차는 Backend 결과 그대로), 실수집·배포 0.
- 범위: 이번 판정은 K2 경합 수정 하나. 쇼핑제휴 2단계 전체 PASS와 구분.

## 5. 다음 단계
- Master 판정. 운영 적용 순서(대기열 표 → 중복·섞인 줄 읽기 확인 → 이 SQL → 코드 배포)는 Backend 결과 절차 따름.

## 비용
없음(빌드 0·AI 0·운영 DB 0·외부 호출 0).
