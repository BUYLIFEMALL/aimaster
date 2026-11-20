# C-1 롤백 가드 실증 — 격리 일회성 fixture (RE-CRM-C1-GUARD A1)

- 담당: CC-REALTY-01 Claude(RealEstate), 2026-11-20. 배정 Master `msg_6bc749b8c6fe`. 설계 기준 `realty-client-desk/docs/PLAN_20261120_C1_LISTING_HANDOFF.md` §6-2(A9 `d9575a609`, A10 `e85a5a8db`).
- 범위: 운영·공유 DB·외부망·설정·배포·제품 편집 0. 기존 `aww-pg-test` 접촉 0(시작·끝 모두 Up 9 days).

## Fixture

| 항목 | 값 |
|---|---|
| 이미지 | 기존 로컬 `postgres:17-alpine` (`sha256:b0f9560a2de0…`), `--pull=never` |
| 이름·라벨 | `c1-guard-fixture-20261120114723`, `aimaster.task=RE-CRM-C1-GUARD` (실행 전 같은 이름·라벨 0건 확인) |
| 컨테이너 ID | `98d7792307b1bfde879a73bd9e2c8a658913e7f49218c8dcf0107eef798ae4d6` |
| 격리 | `--network none`, 포트 `{}`, Mounts `[]`, 데이터 경로는 `--tmpfs /var/lib/postgresql/data`(이미지가 선언한 볼륨을 메모리로 덮어 익명 볼륨·호스트 마운트 0), `--rm` |
| 연결 | 같은 컨테이너 ID에 `docker exec … psql` 두 개(쓰기 연결·가드 연결) 동시 |
| 표 | 운영과 같은 이름·제약: `public.realty_desk_listings(status … constraint realty_desk_listings_status_check check (status in ('광고 중','계약','내림','후보')))`, 시험마다 새로 만듦 |
| 가드 | PLAN §6-2 A10 형태: `begin; set local lock_timeout; set local statement_timeout='15s'; drop constraint; add constraint 3개 값; commit;` |

## 결과 (모두 PASS)

| # | 시험 | 기대 | 실제(종료코드·시간) |
|---|---|---|---|
| T1 | 쓰기 연결이 「후보」 insert 후 4초 잡고 **commit** → 1초 뒤 가드(lock_timeout 10s) | 가드는 쓰기 끝까지 기다림 → 후보 행이 생겨 add 실패 → drop까지 전체 롤백, 4개 값 유지 | 가드 exit 3, 대기 3269ms, `check constraint … is violated by some row`. 정의 4개 값 그대로, 행 광고 중 1·후보 1 |
| T2 | 같은 조건에서 쓰기 연결이 **rollback** | 가드는 기다린 뒤 커밋, 3개 값 | 가드 exit 0, 대기 3358ms, 정의 3개 값, 후보 0 |
| T3 | 가드가 drop/add 후 4초 잡은 채(커밋 전) 다른 연결이 「후보」 insert | insert는 잠금 대기 → 가드 커밋 뒤 거부 | insert exit 3, 대기 3284ms, `new row … violates check constraint`. 커밋 뒤 update(→후보) exit 3 거부, 일반 「광고 중」 insert exit 0 통과. 정의 3개 값, 후보 0 |
| T3b | 가드가 잠금을 쥔 동안 대기한 update(→후보) | 가드 커밋 뒤 거부 | update exit 3(같은 제약 위반), 후보 0 |
| T4 | 쓰기 연결이 6초 잡은 동안 가드(lock_timeout 2s) | 잠금 시간 초과로 실패, 정의 불변 | 가드 exit 3, 2638ms, `canceling statement due to lock timeout`. 정의 4개 값 그대로 |

## 정리 증거
- 정리 직전 대상 확인: `docker ps --filter id=<CID> --filter label=aimaster.task=RE-CRM-C1-GUARD` → `98d7792307b1 c1-guard-fixture-20261120114723` 하나만.
- `docker stop <CID>` exit 0(`--rm`로 자동 삭제). 이후 같은 ID 0개, 같은 라벨 0개. `aww-pg-test` Up 9 days(접촉 0).

## 한계
- PostgreSQL 17(로컬 이미지)과 단순화한 표(운영 칸 일부만)로 시험 — 운영 Supabase의 Postgres 버전·RLS·트리거·행 수는 다름. 잠금·CHECK 검사 동작은 Postgres 공통 동작이나 운영 실측은 아님(G1~G6 조건은 그대로 필요).
- Supabase 연결 풀러·서버 액션의 실제 요청 경로·화면 알림(E12)은 이 fixture에서 시험하지 않음.
- 1차 실행은 Git Bash 경로 변환으로 `docker run`이 거부되어(`invalid mount path: 'C'`, exit 125) 컨테이너 0개 생성·시험 0건 — 스크립트에 `MSYS_NO_PATHCONV=1`·생성 실패 시 중단을 넣고 한 번 실행한 것이 위 결과(시험 재시도 아님, 1차 기록 보존).

## 실행 로그(2차, 원문)
```
CREATE exit=0 NAME=c1-guard-fixture-20261120114723 CID=98d7792307b1bfde879a73bd9e2c8a658913e7f49218c8dcf0107eef798ae4d6
INSPECT name=/c1-guard-fixture-20261120114723 label=RE-CRM-C1-GUARD net=none ports={} mounts=[] tmpfs={"/var/lib/postgresql/data":""} image=sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24
/var/run/postgresql:5432 - accepting connections
READY exit=0

=== T1 진행 중 후보 insert가 commit → 가드는 기다린 뒤 후보 행 때문에 실패, drop까지 롤백 ===
NOTICE:  table "realty_desk_listings" does not exist, skipping
ERROR:  check constraint "realty_desk_listings_status_check" of relation "realty_desk_listings" is violated by some row
T1 writer exit=0
T1 guard exit=3 waited=3269ms
 CHECK ((status = ANY (ARRAY['광고 중'::text, '계약'::text, '내림'::text, '후보'::text])))

 광고 중 |     1
 후보    |     1


=== T2 진행 중 후보 insert가 rollback → 가드는 기다린 뒤 커밋(3개 값) ===
 pg_sleep 
----------
 
(1 row)

T2 writer exit=0
T2 guard exit=0 waited=3358ms
 CHECK ((status = ANY (ARRAY['광고 중'::text, '계약'::text, '내림'::text])))

 광고 중 |     1


=== T3 가드가 잠금을 쥔 동안 대기한 후보 insert·update → 가드 커밋 뒤 거부, 일반 insert는 통과 ===
ERROR:  new row for relation "realty_desk_listings" violates check constraint "realty_desk_listings_status_check"
DETAIL:  Failing row contains (2, 대기 후보 insert, 후보).
T3 guard exit=0
T3 waiting insert(후보) exit=3 waited=3284ms
ERROR:  new row for relation "realty_desk_listings" violates check constraint "realty_desk_listings_status_check"
DETAIL:  Failing row contains (1, 기존 광고 중 매물, 후보).
T3 update(→후보) exit=3
T3 normal insert exit=0
 CHECK ((status = ANY (ARRAY['광고 중'::text, '계약'::text, '내림'::text])))

 광고 중 |     2


=== T3b 대기 중 update(→후보)도 커밋 뒤 거부 ===
ERROR:  new row for relation "realty_desk_listings" violates check constraint "realty_desk_listings_status_check"
DETAIL:  Failing row contains (1, 기존 광고 중 매물, 후보).
T3b waiting update(→후보) exit=3
T3b guard exit=0
 광고 중 |     1


=== T4 lock_timeout: 긴 쓰기 트랜잭션 중 가드(2초 제한) → 시간 초과 실패, 정의 그대로(4개 값) ===
ERROR:  canceling statement due to lock timeout
T4 guard exit=3 waited=2638ms
T4 writer exit=0
 CHECK ((status = ANY (ARRAY['광고 중'::text, '계약'::text, '내림'::text, '후보'::text])))


=== 정리: 이 fixture만 ===
STOP target 98d7792307b1 c1-guard-fixture-20261120114723 aimaster.task=RE-CRM-C1-GUARD,desktop.docker.io/ports.scheme=v2
STOP exit=0
remaining containers with CID: 0
remaining containers with label: 0
untouched: aww-pg-test Up 9 days
```

## 1차 로그 머리(생성 실패)
```
docker: Error response from daemon: invalid mount path: 'C' mount path must be absolute

Run 'docker run --help' for more information
CREATE exit=125 NAME=c1-guard-fixture-20261120114606 CID=
```

## 스크립트
```bash
#!/usr/bin/env bash
# C-1 가드 실증(RE-CRM-C1-GUARD A1, Master msg_6bc749b8c6fe) — 일회성 격리 컨테이너 전용. 운영·공유 DB 접촉 0.
set -u
export MSYS_NO_PATHCONV=1
NAME="c1-guard-fixture-$(date +%Y%m%d%H%M%S)"
LABEL="aimaster.task=RE-CRM-C1-GUARD"
CID=$(docker run -d --rm --pull=never --network none --label "$LABEL" --name "$NAME" \
  --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine)
echo "CREATE exit=$? NAME=$NAME CID=$CID"; [ -n "$CID" ] || { echo "생성 실패 — 중단"; exit 2; }
# 정확한 대상 확인: ID·이름·라벨·네트워크·포트·마운트
docker inspect "$CID" --format 'INSPECT name={{.Name}} label={{index .Config.Labels "aimaster.task"}} net={{.HostConfig.NetworkMode}} ports={{json .NetworkSettings.Ports}} mounts={{json .Mounts}} tmpfs={{json .HostConfig.Tmpfs}} image={{.Image}}'
for i in $(seq 1 30); do docker exec "$CID" pg_isready -U postgres -q && break; sleep 1; done
docker exec "$CID" pg_isready -U postgres; echo "READY exit=$?"

PSQL() { docker exec -i -e PGCLIENTENCODING=UTF8 "$CID" psql -U postgres -X -q -v ON_ERROR_STOP=1 "$@"; }
DEF="select pg_get_constraintdef(oid) as def from pg_constraint where conname='realty_desk_listings_status_check';"
RESET="drop table if exists public.realty_desk_listings;
create table public.realty_desk_listings (id serial primary key, title text not null,
  status text not null default '광고 중' constraint realty_desk_listings_status_check check (status in ('광고 중', '계약', '내림', '후보')));
insert into public.realty_desk_listings (title) values ('기존 광고 중 매물');"
GUARD() { # $1=lock_timeout  $2=추가 대기(초, 커밋 전 잠금 유지)
  printf "begin;\nset local lock_timeout = '%s';\nset local statement_timeout = '15s';\nalter table public.realty_desk_listings drop constraint if exists realty_desk_listings_status_check;\nalter table public.realty_desk_listings add constraint realty_desk_listings_status_check check (status in ('광고 중', '계약', '내림'));\nselect pg_sleep(%s);\ncommit;\n" "$1" "$2"
}
ts() { echo $(( $(date +%s%N) / 1000000 )); }

echo; echo "=== T1 진행 중 후보 insert가 commit → 가드는 기다린 뒤 후보 행 때문에 실패, drop까지 롤백 ==="
echo "$RESET" | PSQL
( printf "begin;\ninsert into public.realty_desk_listings (title, status) values ('진행 중 후보', '후보');\nselect pg_sleep(4);\ncommit;\n" | PSQL >/dev/null; echo "T1 writer exit=$?" ) &
sleep 1; S=$(ts)
GUARD 10s 0 | PSQL; echo "T1 guard exit=$? waited=$(( $(ts) - S ))ms"
wait
echo "$DEF" | PSQL -t; echo "select status, count(*) from public.realty_desk_listings group by status order by 1;" | PSQL -t

echo; echo "=== T2 진행 중 후보 insert가 rollback → 가드는 기다린 뒤 커밋(3개 값) ==="
echo "$RESET" | PSQL
( printf "begin;\ninsert into public.realty_desk_listings (title, status) values ('취소될 후보', '후보');\nselect pg_sleep(4);\nrollback;\n" | PSQL >/dev/null; echo "T2 writer exit=$?" ) &
sleep 1; S=$(ts)
GUARD 10s 0 | PSQL; echo "T2 guard exit=$? waited=$(( $(ts) - S ))ms"
wait
echo "$DEF" | PSQL -t; echo "select status, count(*) from public.realty_desk_listings group by status order by 1;" | PSQL -t

echo; echo "=== T3 가드가 잠금을 쥔 동안 대기한 후보 insert·update → 가드 커밋 뒤 거부, 일반 insert는 통과 ==="
echo "$RESET" | PSQL
( GUARD 10s 4 | PSQL >/dev/null; echo "T3 guard exit=$?" ) &
sleep 1; S=$(ts)
echo "insert into public.realty_desk_listings (title, status) values ('대기 후보 insert', '후보');" | PSQL; echo "T3 waiting insert(후보) exit=$? waited=$(( $(ts) - S ))ms"
wait
echo "update public.realty_desk_listings set status = '후보' where title = '기존 광고 중 매물';" | PSQL; echo "T3 update(→후보) exit=$?"
echo "insert into public.realty_desk_listings (title) values ('일반 광고 중 insert');" | PSQL; echo "T3 normal insert exit=$?"
echo "$DEF" | PSQL -t; echo "select status, count(*) from public.realty_desk_listings group by status order by 1;" | PSQL -t

echo; echo "=== T3b 대기 중 update(→후보)도 커밋 뒤 거부 ==="
echo "$RESET" | PSQL
( GUARD 10s 4 | PSQL >/dev/null; echo "T3b guard exit=$?" ) &
sleep 1
echo "update public.realty_desk_listings set status = '후보' where title = '기존 광고 중 매물';" | PSQL; echo "T3b waiting update(→후보) exit=$?"
wait
echo "select status, count(*) from public.realty_desk_listings group by status order by 1;" | PSQL -t

echo; echo "=== T4 lock_timeout: 긴 쓰기 트랜잭션 중 가드(2초 제한) → 시간 초과 실패, 정의 그대로(4개 값) ==="
echo "$RESET" | PSQL
( printf "begin;\ninsert into public.realty_desk_listings (title) values ('긴 쓰기');\nselect pg_sleep(6);\ncommit;\n" | PSQL >/dev/null; echo "T4 writer exit=$?" ) &
sleep 1; S=$(ts)
GUARD 2s 0 | PSQL; echo "T4 guard exit=$? waited=$(( $(ts) - S ))ms"
wait
echo "$DEF" | PSQL -t

echo; echo "=== 정리: 이 fixture만 ==="
docker ps --filter "id=$CID" --filter "label=$LABEL" --format "STOP target {{.ID}} {{.Names}} {{.Labels}}"
docker stop "$CID" >/dev/null; echo "STOP exit=$?"
sleep 2
docker ps -a --filter "id=$CID" --format "{{.ID}}" | wc -l | sed 's/^/remaining containers with CID: /'
docker ps -a --filter "label=$LABEL" --format "{{.ID}}" | wc -l | sed 's/^/remaining containers with label: /'
docker ps --filter "name=aww-pg-test" --format "untouched: {{.Names}} {{.Status}}"
```
