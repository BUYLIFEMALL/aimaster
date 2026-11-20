# 검토 — 0077 마이그레이션 고정 후보·운영 복구·이력 확인 근거 (2026-11-20, 읽기 검토만)

- 담당: [역할: mall-builder] Claude(B2BBackend) `CC-B2B-BACK-01`, Sub PC 세션 `claude-sub-20261119-b2bbackend`
- 배정: Master `msg_39889695176f`(B2B-0077-MIGRATION-REVIEW) · `msg_4765942e99a5`(내장 BEGIN/COMMIT — ECOM `msg_42184b0135f2` Supabase 공식 KB 근거)
- **이 문서는 읽기 검토다.** 마이그레이션 파일 수정 0, Lab·운영 호출 0, Docker 실행 0. 아래 「제거 후보」는 제안이며 저장소에 파일로 만들지 않았다(지문은 메모리에서 계산한 값).
- 대조한 기존 인계서: [DESIGN_20261119_MALL_STORAGE_CENTRAL_USAGE.md](DESIGN_20261119_MALL_STORAGE_CENTRAL_USAGE.md) 7절(`055b38a7c`), [HANDOFF_20261120_MAINPC_0076_0077_S70.md](HANDOFF_20261120_MAINPC_0076_0077_S70.md)

## 1. 고정 후보 사실(커밋 `592b7484a`의 파일 그대로)
| 항목 | 값 |
|---|---|
| 파일 | `supabase/migrations/0077_storage_measure_mall_owner.sql`(저장소 루트 — AIMaster 메인 DB용, 쇼핑몰 마이그레이션 폴더 아님) |
| SHA-256 | `80c535f1976c7fbea9ee9655bf5e1517e56dd91598f456179dc0ff065de1f740` |
| 줄 수·줄바꿈 | 122줄, LF만(CR 0) |
| 최상위 문장 | 21행 `begin;` · DO 사전 점검(23~28) · `create or replace function public.member_storage_object_owner`(30~44) · revoke·grant(45·46) · `create or replace function public.member_storage_measure`(53~118) · revoke·grant(119·120) · 122행 `commit;` |
| 비트랜잭션 문장 | 없음(`CONCURRENTLY`·`VACUUM`·`ALTER SYSTEM` 0) → 바깥 트랜잭션 안에서 그대로 실행 가능 |
| 자료 쓰기 | 없음(함수 정의·권한만. 전체 측정 호출 없음 — 설계 7-3) |
| 0076 비교 | 0076 파일에는 최상위 `begin;`·`commit;`이 없다(0건) |

## 2. 내장 BEGIN/COMMIT이 무엇을 깨는가
- 24행 `begin`과 56행 `begin`은 DO·함수 본문(`$$` 안)의 PL/pgSQL 블록 시작이라 트랜잭션 제어문이 아니다. 문제는 **21행과 122행 둘뿐**이다.
- 실행 방식별 영향(Postgres 동작 + ECOM이 전달한 Supabase KB 근거):

| 실행 방식 | 0077 원본 그대로 | 결과 |
|---|---|---|
| SQL 편집기에 이 파일만 한 번 | 파일 자신의 `begin…commit`이 한 트랜잭션 | 함수·권한은 원자적. **이력 기록은 따로 넣어야 하고, 그 기록은 이 트랜잭션 밖** |
| 바깥 묶음(`begin; 사전 점검; 0077 원문; 이력 기록; commit;`) — 쇼핑몰 0100·0101~0104 운영 묶음과 같은 방식 | 21행 `begin` = 「이미 트랜잭션 중」 경고만, **122행 `commit`이 바깥 트랜잭션을 그 자리에서 끝냄** | 그 뒤의 이력 기록·사후 점검은 자동 커밋으로 하나씩 실행 → **이력과 함수 정의가 원자적이지 않음**, 마지막 `commit`은 「진행 중인 트랜잭션 없음」 경고 |
| 마이그레이션 실행 도구(CLI `db push`·연결 도구 `apply_migration` 류)가 파일을 감싸고 이력을 기록 | 내장 `commit`이 도구의 래퍼 트랜잭션을 끊음(KB 안내) | 도구가 기록하는 이력이 함수 반영과 따로 커밋되거나, 도구에 따라 오류·경고. 정확한 동작은 **실제로 쓸 도구로 격리 확인해야 함**(4절) |
- 결론: 바깥에서 감싸 이력과 함께 원자적으로 넣으려면 **내장 `begin;`·`commit;`을 뺀 본문**이 필요하다. 감싸지 않고 파일만 실행하면 원본도 원자적이지만 이력 기록이 분리된다.

## 3. 제거 후보(제안 — 파일 미생성)
- 만드는 법: 원본에서 **21행 `begin;`과 122행 `commit;` 두 줄만 삭제**. 다른 글자 변화 0.
- 기대 지문: SHA-256 `99882af366b47f59029f4264834627320348132f190f599e6068e37301c84c8a`, 120줄, LF만.
- 본문 동치 확인(글자): `diff 원본 후보` 결과가 정확히 `21d20 < begin;` · `122d120 < commit;` 두 덩이뿐(확인함). 사용 예: `git show 592b7484a:<파일> | sed '21d;122d' | sha256sum` = 위 값.
- 본문 동치 확인(DB 결과 — 격리 DB에서, 4절): 원본을 적용한 DB와 후보를 래퍼 안에서 적용한 DB의 두 함수가 같아야 한다.
  - `md5(pg_get_functiondef(oid))`, `prosecdef`, `proconfig`(search_path=''), `proowner::regrole`, `proacl` — 두 함수 각각 일치
  - 기존 합성 시험 `supabase/tests/storage_measure_mall_owner.check.mjs`가 후보 적용 DB에서도 같은 통과 수
- 저장소 반영 방식(결정 필요): (A) 원본은 그대로 두고 운영 묶음 파일(`handoff-…/apply.sql`)에만 두 줄 뺀 본문을 넣는다 — 쇼핑몰 운영 묶음 관례와 같음, 고정 후보 `592b7484a` 불변(추천). (B) 저장소 0077 파일 자체에서 두 줄을 빼는 새 커밋 — 고정 커밋이 바뀌어 맥미니 수락 기준을 다시 잡아야 함.

## 4. 격리 검증 방법(실행은 메인 PC 격리 DB `127.0.0.1:55432` 또는 실제 도구가 있는 장비 — Sub PC 실행 0)
전제: 0076까지 적용된(0066 측정 정의) 격리 DB 복제 3개(D1·D2·D3).
1. **D1 기준값**: 원본 0077을 그대로 실행 → 두 함수의 1절 칼럼(md5 정의·보안·설정·소유자·ACL) 기록. 이것이 운영 사후 지문의 기준값.
2. **D2 후보 동치**: `begin; 0077 제거 후보; insert 이력 1행; commit;` → D1과 두 함수 값 일치 + 이력 1행 + 합성 시험 통과 수 일치.
3. **D3 원자성(실패 주입)**:
   - 3-a 후보: `begin; 후보; insert 이력; select 1/0; commit;` → 오류 뒤 두 함수가 **0066 정의 그대로**(`member_storage_object_owner` 없음), 이력 0행이어야 함(= 원자적).
   - 3-b 원본(증거용): 같은 묶음에 원본을 넣으면 122행에서 커밋되어 실패 주입 뒤에도 **함수는 0077로 바뀌고 이력은 0행** — 내장 COMMIT이 원자성을 깨는 것을 재현. 재현 뒤 D3는 버림.
4. **실제 도구 확인**: 운영에 쓸 도구(SQL 편집기 묶음 / CLI / 연결 도구 중 Master가 정한 것)로 D2·D3-a를 한 번 더 — 도구가 스스로 감싸는지, 이력을 어떤 `version`·`name`으로 넣는지, 실패 때 이력을 남기는지 기록. 이 결과로 운영 묶음의 이력 기록 줄(직접 insert 여부)을 확정.
5. 줄바꿈: 편집기 붙여 넣기 CRLF 사고(ERROR_LESSONS 2026-11-14) 대비, 적용 뒤 두 함수 `position(chr(13) in prosrc) = 0`.

## 5. 운영 사후 확인(읽기 전용 SQL 제안)
```sql
-- (1) 사후 지문: D1 기준값과 같아야 함
select p.oid::regprocedure as fn, md5(pg_get_functiondef(p.oid)) as def_md5, p.prosecdef, p.proconfig,
       p.proowner::regrole as owner, p.proacl, position(chr(13) in p.prosrc) as cr_pos
  from pg_proc p
 where p.oid in ('public.member_storage_measure(uuid)'::regprocedure, 'public.member_storage_object_owner(text,text)'::regprocedure);
-- (2) ACL: anon·authenticated 실행 불가, service_role 실행 가능
select f, has_function_privilege('anon', f, 'execute') as anon, has_function_privilege('authenticated', f, 'execute') as authed,
       has_function_privilege('service_role', f, 'execute') as service
  from unnest(array['public.member_storage_measure(uuid)', 'public.member_storage_object_owner(text,text)']) f;
-- 기대: anon false · authed false · service true (두 함수)
-- (3) 이력: 이 저장소 루트 마이그레이션이 운영 이력에 어떤 이름으로 남아 왔는지 먼저 확인(규칙을 추측하지 않음)
select version, name from supabase_migrations.schema_migrations
 where name ~ '(006[3-9]|007[0-7])' or name ~ 'member_storage|storage_expired|storage_measure' order by version;
-- 기대: 0076·0077 적용 묶음이 넣은 행이 각각 정확히 1행(이름 규칙은 위 조회의 기존 행과 같게)
```
- 적용 전에도 (1)·(2)·(3)을 한 번 실행해 「0066 정의·0077 이력 없음」을 기록한다(되돌리기 기준).

## 6. 불일치 때 읽기 판단표
| 관찰 | 판단 | 다음 행동 |
|---|---|---|
| 적용 전 (3)에 0077 이력이 이미 있음 | 이미 적용됐거나 기록만 남은 상태 | 적용 중단, (1)로 정의가 D1과 같은지 확인해 Master 보고 |
| 적용 전 `member_storage_object_owner` 함수가 이미 있음 | 부분 적용 흔적 | 적용 중단, 정의 md5를 D1과 비교해 보고 |
| 적용 뒤 (1) md5가 D1과 다름 + cr_pos > 0 | 붙여 넣기 줄바꿈(CRLF) 혼입 | 기능은 같을 수 있으나 기준 불일치 — LF 본문으로 다시 정의(같은 트랜잭션 묶음) 여부 Master 결정 |
| 적용 뒤 (1) md5가 D1과 다름 + cr_pos = 0 | 다른 본문이 들어감(파일 불일치) | 즉시 Master 보고, 되돌리기(설계 7-4) 검토 |
| (2) anon 또는 authenticated true | 권한 누락(revoke 미실행) | revoke 두 줄만 재실행 승인 요청(정의 변경 없음) |
| (2) service_role false | grant 누락 → 매일 측정 예약 실패 | grant 두 줄 재실행 승인 요청 |
| 함수는 D1과 같은데 이력 0행 | 내장 COMMIT 또는 도구 래퍼 분리로 이력만 빠짐(2절) | 이력 1행만 추가 기록 승인 요청 — 함수 재실행 금지 |
| 이력은 1행인데 함수가 0066 정의 | 기록만 남고 반영 실패 | 이력 행 처리와 재적용을 Master 결정(자동 재시도 금지) |
| 이력 2행 이상 | 중복 기록 | 기록 정리 승인 요청, 함수는 손대지 않음 |

## 7. 기존 인계서와 대조 결과
| 기존 인계 | 이 검토 | 판정 |
|---|---|---|
| 7-1 무엇이 들어 있나 | 1절과 일치(함수 2개·권한·측정 호출 없음) | 일치 |
| 7-3 적용 전 확인(측정 활성 쿼리 0, UTC 19:10 피함, 표 없으면 실패) | 그대로 유효 | 일치 |
| 7-4 되돌리기(0066 정의·권한만 → 규칙 함수 삭제 → 재측정 별도) | 5절 적용 전 기록이 되돌리기 기준값이 됨 | 일치, 보강 |
| **트랜잭션·이력 기록** | 인계서에 없음. 원본은 내장 `begin/commit` 때문에 바깥 묶음·도구 래퍼와 원자적으로 섞이지 않음 | **누락 — 2·3·4절로 보강 필요** |
| **사후 지문·ACL** | 인계서에 정의 지문·ACL 확인 없음(0076 쪽에는 `proacl` 비교가 있음) | **누락 — 5절로 보강 필요** |
| 0077 파일 머리 주석의 되돌리기 순서 | 인계서 7-4가 이미 「운영은 7-4 순서」로 정리 | 일치(주석 수정 불필요) |
| [메인 PC 인계서](HANDOFF_20261120_MAINPC_0076_0077_S70.md) 1절 지문 `80c535f1976c7fbe` | 1절 전체 지문과 앞 16자 일치 | 일치 |

## 8. Master 결정 요청
1. 제거 후보 반영 방식: (A) 운영 묶음에만 두 줄 뺀 본문(추천, 고정 커밋 불변) / (B) 저장소 0077 파일 수정 새 커밋.
2. 운영 실행 도구 확정(SQL 편집기 묶음 / CLI / 연결 도구) — 4절 4번 격리 확인 대상.
3. 격리 검증(4절) 실행 담당(메인 PC 격리 DB 담당) 배정.
4. 기존 인계서 보강(7절 누락 2건)을 이 문서 참조로 갈음할지, 설계 문서 7절에 직접 추가할지(설계 문서는 내 경로라 추가 가능 — 지시 시).

비용: 없습니다.
