# WS-20261116-11 결과 — B2B 0100 현금영수증 독립 SQL 검증 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_545e14f2d646` · Backend 자료 `msg_0710278dbe96`(CC-B2B-BACK-01)
- 상태: **ready_review** · 운영지침 v1.1 형식 · 제품 SQL·소스 수정 0
- 대상: `355193d75`(P1~P5) · `49d3eab46`(P6~P8, 1단계 정지판) · `d0aec875e`(2단계 한 묶음·트리거 먼저). 이 뒤 `1aea8ec0f`까지 0100·시나리오·되돌리기·0061·흉내 틀 파일 변경 0(`git diff` 빈 결과, 조상 관계 확인).

## 1. 완료 조건과 충족

| 완료 조건 | 결과 |
|---|---|
| 공유 DB 보호 | 시작 전 `aww-pg-test` 다른 접속 0, 실행 중 vitest 0. 공유 `aww`·`mb_dry/mb_reh/mb_scn` 미접촉. 전용 DB `qa_ws11_*` 7개와 Backend 실행기용 `qa_b2b0100_ws*` 3개만 만들고 모두 지움(끝 상태 = 시작 상태) |
| 실제 0100 소스 + 모의 볼타로 C1~C10·P1~P8 | 제 실행기(저장소 밖, 커밋 시점 파일을 `git show`로 꺼냄, 0001~0100 + 0061 시나리오)로 **37개 판정 전부 통과** |
| 되돌리기 1단계 | P8a cancelled·「자동 발급을 멈춘 상태」, P8b 새 발급 POST 0, 트리거 0, 유저 신청 권한 거둠, 「상태 다시 확인」은 남음 |
| 되돌리기 2단계 가~라 | 아래 3절 표 — 모두 기대대로 |
| anon/authenticated 실행 확인 | 아래 4절 — 실제 `set role`로 호출 |
| 테스트가 NOTICE만 출력하는지 | **예.** 아래 2절 — 원본 시나리오는 틀려도 종료 코드 0 |
| Backend 공유 실행기 | `588eaf71c` 그대로 실행, 42/42 통과·종료 0. 단 판정 누락 결함 발견(5절) |

## 2. 원본 시나리오는 assertion이 없음 (확인)

`scripts/scenario-0100-cash-receipts.sql`은 결과 줄과 「기대 …」 문구를 출력만 하고, `ON_ERROR_STOP`은 SQL 오류에만 작동한다. 고치기 전 소스에 같은 시나리오를 돌려도 **psql 종료 코드 0**:

| 시점(마이그레이션·되돌리기) | psql 종료 | 제 판정기(열 위치로 정확 비교, 37개) |
|---|---|---|
| `d0aec875e`(수정 후) | 0 | **실패 0 → 종료 0** |
| `355193d75`(1차만) | 0 | 실패 5: P6c·P6d·P7a·P8a·P8b → 종료 1 |
| `355193d75^`(수정 전) | 0 | 실패 13: P1b·P1c·P1d·P2·P3a·P3b·P4d·P5a·P6c·P6d·P7a·P8a·P8b → 종료 1 |

→ 「수정 전 빨강 / 수정 후 초록」이 실제로 성립함을 독립 확인. C1~C10은 세 시점 모두 같음(변경 없음 주장과 일치).
참고: 시나리오의 1단계 뒤 부분(`@@AFTER_ROLLBACK_STEP1` 아래)은 앞부분 세션의 로그인 사용자 설정값에 기대므로, psql을 따로 띄워 이어 돌리면 「로그인이 필요합니다」로 멈춘다(제 첫 실행에서 재현). 같은 세션으로 이어 붙여야 함 — Backend 실행기는 이어 붙이는 방식이라 문제없음.

## 3. 되돌리기 2단계 (함수 10개 기준: 공개 4 + 내부 6)

| 경우 | 결과 |
|---|---|
| 가. 영수증 기록 있음(1단계 뒤) | 「기록이 있어 완전 제거를 멈춥니다」·전후 `함수10/칸1/트리거0/주문10` 변화 0 |
| 나. 기록 없음, 1단계 없이 2단계 | 함수 0·칸 0·트리거 0 |
| 다. 1단계 → 2단계 | 함수 0·칸 0 |
| 라. 영수증 없는 주문 2건 + 2단계 | 함수 0·칸 0, 주문 K-1/K-2 상태·금액 그대로 |
| 옛판 2단계(`d0aec875e^`) 단독 | 트리거 의존으로 중간 실패 → 함수 6·칸·트리거 남음(커밋 설명의 「중간에 4개만 지워짐」 재현) |
| 1단계 뒤 0100 다시 실행(되살리기) | 트리거 2·authenticated 실행 권한 3개 복구·발급 함수 정지판 → 원래판 |

## 4. anon / authenticated 실제 실행 (Supabase 기본 권한 흉내 포함)

로컬 흉내 틀에는 Supabase의 「public 새 함수·표를 anon·authenticated에 기본 부여」 설정이 없어, `alter default privileges ... grant all ... to anon, authenticated, service_role`을 먼저 넣어 운영에 가깝게 만든 뒤 확인.

| 항목 | 결과 |
|---|---|
| anon: 공개 4·내부 4 함수 실행 권한 | 전부 없음. 실제 호출 → `permission denied` |
| authenticated: 공개 4 / 내부 4 | 있음 / 없음. 내부 발급 함수 직접 호출 → `permission denied` |
| authenticated 구매자 본인 「상태 다시 확인」 | 됨(issued), 남의 주문은 「주문을 찾을 수 없습니다」 |
| authenticated 구매자가 주문 `cash_receipt` 직접 UPDATE | 표 권한은 있으나 RLS로 0행(값 그대로) |
| 1단계 뒤 authenticated | 신청·운영사 조치·설정 저장 권한 없음(실제 호출 `permission denied`), 「상태 다시 확인」만 있음 |

## 5. Backend 공유 실행기 `588eaf71c` 확인

- 안전 검토 후 그대로 실행: `qa_` 이름만 허용·외부 호출 0·실키 0. `git archive 1aea8ec0f`로 저장소 밖 빈 폴더에 풀어 실행 → **통과 42 / 실패 0, 종료 0**(작성자 실측과 일치).
- 고치기 전 소스(`355193d75^`, 시나리오만 최신)로 돌리면 실패 9·종료 1 → 실패를 잡기는 함.
- **결함(판정 누락)**: `has()`가 결과 줄 전체에 문자열이 들어 있는지만 보는데, 그 줄 끝에 시나리오의 「기대 …」 문구가 함께 출력되므로 실제 값이 틀려도 통과한다. 중간 시점(`355193d75`)에서 재현: 실제 `P6c|cancelling`·`P6d|2`·`P8b|1`인데 셋 다 「통과」. 수정 전 시점에서도 P1c·P1d·P3a·P6c·P6d·P8b 6개를 놓침. 이번 대상 코드의 결론은 바뀌지 않음(제 엄격 판정 37/37). 해소안: 열 위치로 비교(`split('|')[i] === 값`)하거나 「기대」 열을 잘라낸 뒤 비교 — Backend 실행기 소유 파일이라 고치지 않음.

## 6. 검증 / 미검수

- 실제 검증(로컬 Docker PG 17.11): 위 1~5절.
- 미검수: 실제 Supabase(운영·Lab) DB, 실제 볼타 호출(모의만), 실제 Supabase 기본 권한·RLS 정책 원본(흉내로 대체), 0101 이후 마이그레이션과의 조합(지시대로 0100까지).
- 참고: 대상 커밋 3개와 `588eaf71c`의 `AIMaster-Session`이 이 세션 이름(`claude-win-20261025-workspace`)으로 찍혀 있으나, 이 세션 기록에는 해당 작업을 한 흔적이 없음(다른 세션이 같은 `--as`를 쓴 것으로 보임). 검증 독립성에는 영향 없음 — 이 세션은 이번에 처음 그 코드를 읽음.

## 7. 다음 단계
- Master 판정. Backend 실행기 열 비교 보강은 Backend 몫(필요하면 지시).
- 제 실행기·판정기(저장소 밖 임시 폴더 `run.mjs`·`check.mjs`)는 필요하면 결과 파일 경로로 넘길 수 있음.

## 비용
없음(빌드 0·AI 0·운영/Lab DB 0·실외부 호출 0·새 설치/이미지 받기 0).

## 8. 인수인계 부록 — 검사기 원문·실행 명령·기대 열 대응 (Master `msg_e27744e8d3b9` 지시, Backend B2B-09 보강 기준)

- 판정: Master가 WS-11 done, 현재 0100·되돌리기 1/2 P1 해결 기술 판정 수락. 원시 시나리오 종료 0 문제와 공유 실행기 거짓 통과는 분리되어 Backend B2B-09로 배정됨.
- 원래 위치: 저장소 밖 임시 폴더 `C:\Users\ADMINI~1\AppData\Local\Temp\claude\79d92c8f8cffe9a2\dea6e4f6-37c0-4be8-ad50-8746e0f1c517\scratchpad\ws11\` (`run.mjs`·`check.mjs`·`pre.sql`·`mid.sql`·`post.sql`·`count.sql`·`orders.sql`). 임시 폴더는 지워질 수 있으므로 **아래 원문이 기준**.
- 실키 확인: 위 파일 전부에서 `key|secret|token|password|sk-|eyJ` 검색 → 코드 이름 `Object.keys` 1건뿐, 실키·비밀값 0. (시나리오 자체의 `bolta_api_key = 'test_key'`는 제품 시나리오의 가짜 값이며 제 파일에는 없음.)
- qa_ DB는 이미 모두 지웠고 다시 만들지 않음(재실행 안 함).

### 8-1. 실행 명령 (Git Bash, 실행기 폴더에서)
```bash
# 수정 후 시점 + 기본 권한 흉내 + 역할 검사(되돌리기 1단계 전·후)
PRE_FILE=pre.sql MID_FILE=mid.sql POST_FILE=post.sql node run.mjs qa_ws11_after d0aec875e d0aec875e d0aec875e
node check.mjs out-qa_ws11_after.txt          # 실패 0 → 종료 0
# 빨강 확인: 마이그레이션·되돌리기는 옛 시점, 시나리오는 최신
node run.mjs qa_ws11_red0 355193d75^ d0aec875e 355193d75^ && node check.mjs out-qa_ws11_red0.txt   # 실패 13 → 종료 1
node run.mjs qa_ws11_red1 355193d75  d0aec875e 355193d75  && node check.mjs out-qa_ws11_red1.txt   # 실패 5  → 종료 1
# 되돌리기 2단계용 빈 DB(0061까지만)
PRE_FILE=pre.sql node run.mjs qa_ws11_rb2b d0aec875e d0aec875e d0aec875e bare
# 끝나면 제 DB만 삭제
for d in $(docker exec aww-pg-test psql -U postgres -tAc "select datname from pg_database where datname like 'qa\_ws11\_%'"); do docker exec aww-pg-test psql -U postgres -qc "drop database $d"; done
```
주의: 시나리오의 `@@AFTER_ROLLBACK_STEP1` 뒤 부분은 앞부분 세션의 `request.jwt.claim.sub`·임시 표에 기대므로 **한 psql 세션으로 이어 붙여** 실행해야 함(따로 띄우면 「로그인이 필요합니다」).

### 8-2. 기대 열 대응표 (`|` 로 나눈 결과 열, 0번 = 라벨 다음 첫 칸. 마지막 「기대 …」 열은 비교에서 제외)
| 라벨 | 열0 | 열1 | 열2 | 비고 |
|---|---|---|---|---|
| C0 | t | | | |
| C3 | requested | 0 | | 볼타 호출 수 |
| C5 | issuing | 33000 | 수신자 JSON에 `"010-1234-5678"`·`INCOME_DEDUCTION` | 열3 금액 JSON `supplyAmount 30000`·`vatAmount 3000` |
| C6 | issued | AP123 | | |
| C8a | cancelling | 3000 | | |
| C8b | issuing | 3000 | 2 | |
| C8c | 금액 JSON `supplyAmount 2727`·`vatAmount 273` | | | |
| C9 | issuing | EXPENSE_PROOF | 1234567890 | |
| C10 | failed | | | |
| P1a | unknown | | | |
| P1b | cancelling | | | |
| P1c | cancelled | 1 | | |
| P1d | 1 | 1 | | posts·cancels |
| P2 | cancel_failed | | | |
| P2b | 0 | 1 | | cancels·posts |
| P3a | cancelling | 3000 | | |
| P3b | issuing | 3000 | 2 | |
| P4c | cancelling | 11000 | | |
| P4d | cancelled | 1 | | |
| P5a | issuing | t | | |
| P5b | issued | | | |
| P5c | issued | 0 | | 새 호출 수 |
| P6a | cancel_failed | | | |
| P6b | cancelling | | | |
| P6c | cancelled | | | |
| P6d | 1 | | | 취소 요청 번호 수 |
| P7b | issued | | | |
| P8p | cancelling | 3000 | | |
| P8a | cancelled | | | 열1 안내에 「자동 발급을 멈춘」 |
| P8b | 0 | | | 새 발급 POST 수 |
| NOTICE | C1·C2a·C2b·C2c·C4·C7·P7a 모두 「막힘:」으로 시작 | | | 「통과됨(문제)」면 실패 |

### 8-3. `check.mjs` 원문
```js
// WS-20261116-11 독립 판정기: run.mjs 출력에서 결과 줄을 기대값과 대조, 하나라도 다르면 종료 코드 1
import { readFileSync } from "node:fs";
const txt = readFileSync(process.argv[2], "utf8");
const rows = {};
for (const l of txt.split("\n")) { const m = l.match(/^([CP][0-9]+[a-z]?)\|(.*)$/); if (m && !rows[m[1]]) rows[m[1]] = m[2].split("|"); }
const notice = (k) => (txt.match(new RegExp(`NOTICE:  ${k} (\\S+)`)) || [])[1];
const E = {
  C0: ["t"], C3: ["requested", "0"],
  C5: (r) => r[0] === "issuing" && r[1] === "33000" && r[2].includes('"010-1234-5678"') && r[2].includes("INCOME_DEDUCTION") && r[3].includes('"supplyAmount": 30000') && r[3].includes('"vatAmount": 3000'),
  C6: ["issued", "AP123"], C8a: ["cancelling", "3000"], C8b: ["issuing", "3000", "2"],
  C8c: (r) => r[0].includes('"supplyAmount": 2727') && r[0].includes('"vatAmount": 273'),
  C9: ["issuing", "EXPENSE_PROOF", "1234567890"], C10: (r) => r[0] === "failed",
  P1a: ["unknown"], P1b: ["cancelling"], P1c: ["cancelled", "1"], P1d: ["1", "1"],
  P2: ["cancel_failed"], P2b: ["0", "1"], P3a: ["cancelling", "3000"], P3b: ["issuing", "3000", "2"],
  P4c: ["cancelling", "11000"], P4d: ["cancelled", "1"], P5a: ["issuing", "t"], P5b: ["issued"], P5c: ["issued", "0"],
  P6a: ["cancel_failed"], P6b: ["cancelling"], P6c: ["cancelled"], P6d: ["1"], P7b: ["issued"],
  P8p: ["cancelling", "3000"], P8a: ["cancelled"], P8b: ["0"],
};
const N = { C1: "막힘:", C2a: "막힘:", C2b: "막힘:", C2c: "막힘:", C4: "막힘:", C7: "막힘:", P7a: "막힘:" };
const fails = [];
for (const [k, exp] of Object.entries(E)) {
  const r = rows[k];
  const ok = r && (typeof exp === "function" ? exp(r) : exp.every((v, i) => r[i] === v));
  if (!ok) fails.push(`${k} 실제=${r ? r.join("|").slice(0, 60) : "(줄 없음)"} 기대=${typeof exp === "function" ? "(조건)" : exp.join("|")}`);
}
for (const [k, exp] of Object.entries(N)) if (notice(k) !== exp) fails.push(`${k} 실제 NOTICE=${notice(k) ?? "(없음)"} 기대=막힘`);
const total = Object.keys(E).length + Object.keys(N).length;
console.log(`${process.argv[2]}: 판정 ${total}개 중 실패 ${fails.length}개`);
for (const f of fails) console.log("  ✖ " + f);
process.exitCode = fails.length ? 1 : 0;
```

### 8-4. `run.mjs` 원문
```js
// WS-20261116-11 독립 검증 실행기(저장소 밖). 사용: node run.mjs <db이름> <마이그레이션 커밋> <시나리오 커밋> <되돌리기 커밋> [mode]
// mode: scenario(기본) | bare(0061까지만) — 공유 aww DB는 건드리지 않고 지정한 전용 DB만 만들고 지운다.
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import * as fs2 from "node:fs";

const [db, migC, scnC, rbC, mode = "scenario"] = process.argv.slice(2);
if (!/^qa_ws11_[a-z0-9_]+$/.test(db)) throw new Error("전용 DB 이름은 qa_ws11_ 로 시작해야 합니다");
const C = "aww-pg-test";
const repo = "D:/AIMaster";
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
const show = (c, p) => git("show", `${c}:${p}`).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
const psql = (sql, { allowFail = false, dbn = db } = {}) => {
  const r = spawnSync("docker", ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", dbn, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-F", "|", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0 && !allowFail) throw new Error(`psql 실패(${r.status}):\n${r.stderr.slice(-3000)}`);
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const admin = (cmd) => execFileSync("docker", ["exec", C, "psql", "-X", "-U", "postgres", "-tAc", cmd], { encoding: "utf8" });

// 흉내 틀: scripts/check-prod-bundle-local.mjs 의 stub 을 그 커밋에서 그대로 꺼내 씀
const checker = show(migC, "mall-builder/scripts/check-prod-bundle-local.mjs");
const stub = checker.slice(checker.indexOf("const stub = `") + 14, checker.indexOf("`;", checker.indexOf("const stub = `")));
const files = git("ls-tree", "--name-only", `${migC}`, "mall-builder/supabase/migrations/").trim().split("\n").filter((f) => f.endsWith(".sql")).sort();
const LAB = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
let bundle = "begin;\n" + files.map((f) => {
  let s = show(migC, f).replace(LAB, "-- lab line skipped");
  s = s.replace("create extension if not exists http with schema extensions;", "-- http stub");
  return `-- ===== ${f}\n${s}\n`;
}).join("") + "commit;\n";

const fresh = admin(`select count(*) from pg_stat_activity where datname='${db}'`).trim();
if (fresh !== "0") throw new Error(`${db} 사용 중`);
admin(`drop database if exists ${db}`);
admin(`create database ${db}`);
const preSql = process.env.PRE_FILE ? fs2.readFileSync(process.env.PRE_FILE, "utf8") : "";
psql(stub + "\n" + preSql);
psql(bundle);
const log = [`# migrations@${migC} (${files.length}: ${files[0].split("/").pop()}..${files.at(-1).split("/").pop()}) scenario@${scnC} rollback@${rbC}`];
const s61 = psql(show(scnC, "mall-builder/scripts/scenario-0061-resale-apply.sql"));
log.push("## 0061 ok");
if (mode === "scenario") {
  const scn = show(scnC, "mall-builder/scripts/scenario-0100-cash-receipts.sql");
  const mark = scn.indexOf("-- @@AFTER_ROLLBACK_STEP1");
  const [p1, p2] = mark >= 0 ? [scn.slice(0, mark), "\\set ON_ERROR_STOP 1\n" + scn.slice(mark)] : [scn, ""];
  // 한 psql 세션에서 이어 실행(앞부분의 로그인 사용자 설정값·임시 표를 뒷부분이 씀)
  const rb1 = p2 ? show(rbC, "mall-builder/scripts/rollback-0100-step1-stop-auto.sql") : "";
  const mid = process.env.MID_FILE ? "\n" + readFileSync(process.env.MID_FILE, "utf8") : "";
  const post = process.env.POST_FILE ? "\n" + readFileSync(process.env.POST_FILE, "utf8") : "";
  const all = p1 + mid + (p2 ? "\nselect '@@STEP1_BEGIN';\n" + rb1 + "\nselect '@@STEP1_END';\n" + p2 : "") + post;
  const a = psql(all, { allowFail: true });
  log.push("## RUN exit=" + a.code, a.out, "## stderr", a.err);
}
writeFileSync(`out-${db}.txt`, log.join("\n"));
console.log(log.join("\n"));
```

### 8-5. `pre.sql`
```sql
-- Supabase 기본 권한 흉내: postgres가 public에 만드는 표·함수·시퀀스는 anon·authenticated·service_role에 기본 부여
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
```

### 8-5. `mid.sql`
```sql
select '@@ROLES_BEFORE_STEP1';
select 'R1', r, f, has_function_privilege(r, f, 'execute') from unnest(array['anon','authenticated']) r, unnest(array['public.mall_builder_cash_receipt_settings_save(uuid,boolean)','public.mall_builder_cash_receipt_request(uuid,text,text,text)','public.mall_builder_cash_receipt_recheck(uuid)','public.mall_builder_cash_receipt_staff(uuid,text)','mall_builder_private.cash_receipt_issue(uuid,bigint)','mall_builder_private.cash_receipt_cancel(uuid,bigint)','mall_builder_private.cash_receipt_target(uuid)','mall_builder_private.cash_receipt_amount(uuid)']) f order by 2,3;
select 'R1t', r, has_table_privilege(r, 'public.mall_builder_orders', 'update') from unnest(array['anon','authenticated']) r;
set role anon;
do $$ begin perform public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e5'); raise notice 'R2 anon 통과됨(문제)'; exception when insufficient_privilege then raise notice 'R2 anon 권한으로 막힘: %', sqlerrm; when others then raise notice 'R2 anon 다른 이유로 막힘: %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000e5','PHONE','01012345678'); raise notice 'R2b anon 통과됨(문제)'; exception when insufficient_privilege then raise notice 'R2b anon 권한으로 막힘: %', sqlerrm; when others then raise notice 'R2b anon 다른 이유로 막힘: %', sqlerrm; end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
set role authenticated;
create temp table r3n as select 0 n;
select 'R3', public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e5') ->> 'status';
do $$ begin perform mall_builder_private.cash_receipt_issue('00000000-0000-0000-0000-0000000000e5', 1); raise notice 'R4 내부 발급 함수 통과됨(문제)'; exception when others then raise notice 'R4 내부 발급 함수 막힘: %', sqlerrm; end $$;
do $$ declare n int; begin update public.mall_builder_orders set cash_receipt = jsonb_set(cash_receipt,'{status}','"issued"') where id='00000000-0000-0000-0000-0000000000e1'; get diagnostics n = row_count; raise notice 'R5 유저 직접 수정 행 수 %', n; exception when others then raise notice 'R5 유저 직접 수정 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000ca', false);
do $$ begin perform public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e5'); raise notice 'R6 남의 주문 통과됨(문제)'; exception when others then raise notice 'R6 남의 주문 막힘: %', sqlerrm; end $$;
reset role;
select 'R5chk', cash_receipt ->> 'status' from public.mall_builder_orders where id='00000000-0000-0000-0000-0000000000e1';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
```

### 8-5. `post.sql`
```sql
select '@@ROLES_AFTER_STEP1';
select 'S1', r, f, has_function_privilege(r, f, 'execute') from unnest(array['anon','authenticated']) r, unnest(array['public.mall_builder_cash_receipt_settings_save(uuid,boolean)','public.mall_builder_cash_receipt_request(uuid,text,text,text)','public.mall_builder_cash_receipt_recheck(uuid)','public.mall_builder_cash_receipt_staff(uuid,text)','mall_builder_private.cash_receipt_issue(uuid,bigint)','mall_builder_private.cash_receipt_cancel(uuid,bigint)','mall_builder_private.cash_receipt_target(uuid)','mall_builder_private.cash_receipt_amount(uuid)']) f order by 2,3;
select 'S2 triggers', count(*) from pg_trigger where tgname in ('mall_builder_orders_cash_receipt_auto','mall_builder_orders_receipt_one_kind');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
set role authenticated;
do $$ begin perform public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000e6','PHONE','01012345678'); raise notice 'S3 1단계 뒤 유저 신청 통과됨(문제)'; exception when others then raise notice 'S3 1단계 뒤 유저 신청 막힘: %', sqlerrm; end $$;
select 'S4', public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e5') ->> 'status';
reset role;
select 'S5 posts total', count(*) from public.fake_cr_log where path = '/v1/cashReceipts';
```

### 8-5. `count.sql`
```sql
select 'CNT', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname like 'mall\_builder\_cash\_receipt%') or (n.nspname='mall_builder_private' and (p.proname like 'cash\_receipt%' or p.proname in ('orders_cash_receipt_auto','orders_receipt_one_kind')))) fns,
 (select count(*) from information_schema.columns where table_name='mall_builder_orders' and column_name='cash_receipt') col,
 (select count(*) from pg_trigger where tgname in ('mall_builder_orders_cash_receipt_auto','mall_builder_orders_receipt_one_kind')) trg,
 (select count(*) from public.mall_builder_orders) orders;
```

### 8-5. `orders.sql`
```sql
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c9','b@x.test');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000005a',91,'K-1','00000000-0000-0000-0000-0000000000c9','{"zip":"1"}','x','paid',33000,false,false),
 ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-00000000005a',92,'K-2','00000000-0000-0000-0000-0000000000c9','{"zip":"1"}','x','delivered',11000,true,false);
```

### 8-6. 세션 이름 구분 기록
- 대상 커밋 `355193d75`·`49d3eab46`·`d0aec875e`·`588eaf71c`의 `AIMaster-Session: claude-win-20261025-workspace`는 2026-11-12 쇼핑몰 담당 인계 때 같은 세션 이름이 B2B(mall-builder) 역할에도 쓰인 데서 온 것. 구분 별칭: **이 결과의 작성자 = Workspace 역할 `CC-WORKSPACE-01`**, 대상 코드 작성자 = B2B 역할(`CC-B2B-BACK-01` 계열). 이 독립 검증은 Workspace 역할이 그 코드를 **처음 열람**해 수행한 것으로 이력 보존. `.ai/TEAM.md` 별칭 등록은 Master 전용이라 손대지 않음.
