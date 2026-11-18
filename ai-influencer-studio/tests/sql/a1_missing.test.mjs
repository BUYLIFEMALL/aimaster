// W01r 객체 없는 ready → missing(복구 P2) SQL 격리 계약 시험 — 초안 (2026-11-18, CC-SNS-01, Master msg_a289fd0c172a).
// ★ 이 파일은 작성만 했고 아직 한 번도 실행하지 않았다(격리 DB 생성 0). 실행은 격리 실행 배정 뒤에 한다.
// 대상: supabase/migrations/20261118130000_aif_assets_p2_missing.sql — 열 2개·색인 2개·함수 aif_asset_missing_scan·aif_asset_mark_missing.
// 실행(배정 뒤): node --test tests/sql/a1_missing.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 하는 일: 새 DB qa_aif_missing_20261118를 만들고(이미 있으면 중단) → a1_fixture.sql(대역, 무변경) → A1 원문 → P2 파일 순서로 적용 → 시험
//          → 만든 DB만(oid 일치 확인) 지운다. 다른 DB(aww·aww_dev·mb_* 등)에는 접속하지 않는다.
//          관리용 postgres DB에는 역할·DB 목록을 읽고 시험 DB를 만들고 지우기 위해서만 접속한다.
// ★ 한계: storage.objects·profiles·member_storage_policy·member_storage_usage는 전부 대역(stub)이다. 이 위의 통과는 우리 SQL의 계약(제약·권한·잠금·상태 전이)
//   확인일 뿐, 실제 Supabase 저장소·실제 함수 소유자 권한·실제 실행 시간·중앙 정리와의 상호작용 통과가 아니다. 실제 저장소 호출은 어떤 경우에도 없다 —
//   「객체가 사라졌다·옮겨졌다·다른 객체가 있다」는 대역 표의 행을 지우거나 바꿔 흉내 낸다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_missing_20261118";
const MIG = join(HERE, "..", "..", "supabase", "migrations");
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const A1 = readFileSync(join(MIG, "20261118120000_aif_assets_a1.sql"), "utf8");
const P2 = readFileSync(join(MIG, "20261118130000_aif_assets_p2_missing.sql"), "utf8");

const psqlArgs = (db) => ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-At", "-f", "-"];
function run(sql, db = DB) {
  const r = spawnSync("docker", psqlArgs(db), { input: sql, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) {
  const r = run(sql, db);
  assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`);
  return r.out;
}
const svc = (sql) => run(`set role service_role;\n${sql}`);
const svcOk = (sql) => { const r = svc(sql); assert.equal(r.ok, true, `service 호출 실패: ${r.err}\n${sql.slice(0, 200)}`); return r.out; };
function runAsync(sql) {
  return new Promise((resolve) => {
    const p = spawn("docker", psqlArgs(DB));
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
    p.stdin.end(sql);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitRow(sql, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const out = q(sql);
    if (out) return { row: out.split("\n")[0], ms: Date.now() - t0 };
    await sleep(100);
  }
  throw new Error(`대기 시간 초과: ${sql.slice(0, 120)}`);
}
const lockHolder = (app) => waitRow(`select a.pid from pg_stat_activity a join pg_locks l on l.pid = a.pid
  where a.datname = current_database() and a.application_name = '${app}' and l.locktype = 'advisory' and l.granted limit 1;`);
const lockWaiter = (app) => waitRow(`select a.pid || '|' || a.wait_event_type || '|' || a.wait_event || '|' || array_to_string(pg_blocking_pids(a.pid), ',')
  from pg_stat_activity a where a.datname = current_database() and a.application_name = '${app}' and a.wait_event_type = 'Lock' limit 1;`);
/** 그 연결이 유휴 거래 상태(잠금을 쥔 채 pg_sleep 중)가 될 때까지 기다린다 */
const sleeping = (app) => waitRow(`select a.pid from pg_stat_activity a where a.datname = current_database() and a.application_name = '${app}' and a.query like '%pg_sleep%' and a.state = 'active' limit 1;`);

const SHA = "a".repeat(64);
let userSeq = 0;
function mkUser({ exempt = false, days = 30 } = {}) {
  userSeq += 1;
  const id = `00000000-0000-4000-8000-${String(userSeq).padStart(12, "0")}`;
  q(`insert into public.profiles(id, retention_exempt) values ('${id}', ${exempt});
     insert into public.qa_quota(user_id, quota_bytes, retention_days, unlimited_retention) values ('${id}', null, ${days === null ? "null" : days}, false);`);
  return id;
}
/** ready 자산 한 건: 예약 → 대역 객체 → 확정. ageDays = 객체가 만들어진 지 며칠 */
function mkReady(user, { bytes = 10, ageDays = 1 } = {}) {
  const [id, path] = svcOk(`select asset_id || '|' || path from public.aif_asset_reserve('${user}', 'generated', 'image/png', 'png', ${bytes}, '${SHA}');`).split("|");
  const oid = q(`insert into storage.objects(bucket_id, name, metadata) values ('aif-assets', '${path}', '${JSON.stringify({ size: bytes })}'::jsonb) returning id;`);
  assert.equal(svcOk(`select public.aif_asset_finalize('${id}', '${user}', '${oid}');`), "ready");
  q(`update storage.objects set created_at = now() - interval '${ageDays} days' where id = '${oid}';`);
  return { id, path, oid, user };
}
const markMissing = (a, user = a.user) => svcOk(`select public.aif_asset_mark_missing('${a.id}', '${user}');`);
const scan = (scanLimit, limit) => JSON.parse(svcOk(`select public.aif_asset_missing_scan(${scanLimit}, ${limit});`));
const expire = (a, token) => svcOk(`select public.aif_asset_expire('${a.id}', '${a.user}'${token ? `, '${token}'` : ""});`);
const claim = (a) => svcOk(`select public.aif_asset_claim_delete('${a.id}', '${a.user}', 'aif-assets', '${a.path}');`);
const mark = (a, token, state) => svcOk(`select public.aif_asset_delete_mark('${a.id}', '${a.user}', '${token}', '${state}');`);
const assetRow = (a) => q(`select state || '|' || coalesce(missing_reason, 'null') || '|' || (object_checked_at is not null) from public.aif_assets where id = '${a.id}';`);
const stateOnly = (a) => assetRow(a).split("|")[0];
const checkedAt = (a) => q(`select coalesce(object_checked_at::text, 'null') from public.aif_assets where id = '${a.id}';`);
const delRow = (a) => q(`select state || '|' || fencing_token || '|' || attempts || '|' || (parked_at is not null) from public.aif_asset_deletions where asset_id = '${a.id}';`);
/** 「객체가 저장소에서 사라졌다」를 대역 표에서 흉내 낸다(실제 저장소 호출 0) */
const dropObject = (a) => q(`delete from storage.objects where id = '${a.oid}';`);
/** 정리 실행자의 「이어 하기」 목록 조회와 같은 조건(DB 쪽 필터)으로 그 자산의 예약이 읽히는가 */
const inResumeList = (a) => q(`select count(*) from public.aif_asset_deletions where state in ('cancelled','delete_failed','claimed') and parked_at is null and asset_id = '${a.id}';`);
/** 복원으로 비활성 예약(cancelled)이 남은 ready 자산을 만든다: 만료 → 보호 대상이 됨 → 복원 */
function mkRestoredWithCancelled() {
  const u = mkUser(); const a = mkReady(u, { ageDays: 31 });
  assert.equal(expire(a), "expired");
  q(`update public.profiles set retention_exempt = true where id = '${u}';`);
  assert.equal(expire(a), "restored");
  assert.equal(delRow(a).split("|")[0], "cancelled");
  return a;
}
/** 시험 사이의 간섭을 없애려고, 앞 시험이 남긴 ready 행을 모두 「방금 확인함」으로 밀어 둔다 */
const settleAll = () => q(`update public.aif_assets set object_checked_at = now() + interval '1 day' where state = 'ready';`);

const dockerUp = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], { encoding: "utf8" });
const AVAILABLE = dockerUp.status === 0 && dockerUp.stdout.trim() === "true";
let createdOid = null;
let dbCreated = false;
let rolePreflight = "";

before(() => {
  if (!AVAILABLE) return;
  rolePreflight = q(`select rolname || ':' || rolcanlogin || ':' || rolsuper || ':' || rolbypassrls from pg_roles where rolname in ('anon','authenticated','service_role') order by 1;`, "postgres");
  const roles = rolePreflight.split("\n").filter(Boolean);
  assert.equal(roles.length, 3, `필요한 역할 3개가 없습니다(있는 것: ${rolePreflight}) — 역할을 만들지 않고 중단합니다.`);
  for (const r of roles) {
    const [name, login, sup] = r.split(":");
    assert.deepEqual([login, sup], ["false", "false"], `${name} 속성이 예상과 다름`);
  }
  const exists = q(`select count(*) from pg_database where datname = '${DB}';`, "postgres");
  assert.equal(exists, "0", `${DB}가 이미 있습니다 — 다른 실행의 것일 수 있어 건드리지 않고 중단합니다.`);
  q(`create database ${DB};`, "postgres");
  dbCreated = true;
  const oid = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!oid.ok || !/^[0-9]+$/.test(oid.out)) throw new Error(`${DB}를 만들었지만 oid를 확인하지 못했습니다: ${oid.err || oid.out}`);
  createdOid = oid.out;
  q(FIXTURE);
  q(A1);
  q(P2);
});

after(() => {
  if (!AVAILABLE || !dbCreated) return;
  if (!createdOid) {
    throw new Error(`[수동 확인 필요] ${DB}를 이 실행이 만들었으나 oid를 확보하지 못해 자동 삭제하지 않았습니다. 컨테이너 ${CONTAINER}에서 DB 존재 여부를 직접 확인해 주세요.`);
  }
  const now = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!now.ok) throw new Error(`정리 전 조회 실패 — ${DB}가 남아 있을 수 있습니다: ${now.err}`);
  if (now.out !== createdOid) throw new Error(`${DB}의 oid가 만든 것(${createdOid})과 다릅니다(${now.out || "없음"}) — 지우지 않았습니다.`);
  const drop = run(`drop database ${DB} with (force);`, "postgres");
  if (!drop.ok) throw new Error(`${DB} 삭제 실패(잔존): ${drop.err}`);
  const left = run(`select count(*) from pg_database where datname = '${DB}' or oid = ${createdOid};`, "postgres");
  if (!left.ok || left.out !== "0") throw new Error(`${DB} 삭제 뒤에도 남아 있습니다: ${left.out} ${left.err}`);
});

const t = (name, fn) => test(name, { skip: AVAILABLE ? false : "aww-pg-test 컨테이너 없음 — 건너뜀" }, fn);

// ───────────── 스키마·권한 ─────────────
t("컴파일: A1 원문 뒤에 P2 파일이 적용되고 열 2개·색인 2개·함수 13개가 된다", (ctx) => {
  ctx.diagnostic(`역할 사전 확인(이름:로그인:슈퍼유저:RLS우회) ${rolePreflight.replace(/\n/g, " ")} · 시험 DB ${DB} oid=${createdOid}`);
  assert.equal(q(`select data_type || '|' || is_nullable from information_schema.columns where table_schema='public' and table_name='aif_assets' and column_name='object_checked_at';`), "timestamp with time zone|YES");
  assert.equal(q(`select data_type || '|' || is_nullable from information_schema.columns where table_schema='public' and table_name='aif_asset_deletions' and column_name='parked_at';`), "timestamp with time zone|YES");
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%';`), "13");
  assert.equal(q(`select pg_get_function_identity_arguments(p.oid) || ' -> ' || pg_get_function_result(p.oid) from pg_proc p where p.proname = 'aif_asset_missing_scan';`), "p_scan_limit integer, p_limit integer -> jsonb");
  assert.equal(q(`select pg_get_function_identity_arguments(p.oid) || ' -> ' || pg_get_function_result(p.oid) from pg_proc p where p.proname = 'aif_asset_mark_missing';`), "p_asset uuid, p_user uuid -> text");
  // 기존 함수 본문은 A1 원문 그대로여야 한다(P2 파일은 추가만)
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('aif_asset_expire','aif_asset_claim_delete','aif_asset_delete_mark','aif_asset_delete_verify') and p.prosrc like '%parked_at%';`), "0");
});

t("색인: 훑기 정렬과 같은 순서(NULLS FIRST·id)의 ready 부분 색인, 예약 목록용 부분 색인", () => {
  const assetIdx = q(`select indexdef from pg_indexes where schemaname='public' and indexname='aif_assets_ready_checked_idx';`);
  assert.match(assetIdx, /\(object_checked_at NULLS FIRST, id\)/);
  assert.match(assetIdx, /WHERE \(state = 'ready'::text\)/);
  const delIdx = q(`select indexdef from pg_indexes where schemaname='public' and indexname='aif_asset_deletions_unparked_idx';`);
  assert.match(delIdx, /\(state, updated_at\)/);
  assert.match(delIdx, /WHERE \(parked_at IS NULL\)/);
  // 계획 확인: 순차 읽기를 끄면 그 색인으로 정렬 없이 읽힌다(색인의 순서가 정렬과 실제로 맞는다는 뜻). 대역의 작은 표에서의 확인이며 실제 규모의 성능 증거는 아니다.
  const plan = q(`set enable_seqscan = off; set enable_bitmapscan = off;
    explain (costs off) select a.id from public.aif_assets a where a.state = 'ready' order by a.object_checked_at asc nulls first, a.id asc limit 10;`);
  assert.match(plan, /aif_assets_ready_checked_idx/);
  assert.doesNotMatch(plan, /Sort/);
  // 반대로 NULLS FIRST를 빼면(기본 NULLS LAST) 이 색인만으로는 정렬이 맞지 않아 Sort가 필요하다
  const other = q(`set enable_seqscan = off; set enable_bitmapscan = off;
    explain (costs off) select a.id from public.aif_assets a where a.state = 'ready' order by a.object_checked_at asc, a.id asc limit 10;`);
  assert.match(other, /Sort/);
});

t("권한: 새 함수 2개는 security definer·search_path 고정·service_role 전용", () => {
  const rows = q(`select p.proname, has_function_privilege('authenticated', p.oid, 'execute'), has_function_privilege('anon', p.oid, 'execute'),
                         has_function_privilege('service_role', p.oid, 'execute'), p.prosecdef, p.proconfig::text
                  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('aif_asset_missing_scan','aif_asset_mark_missing') order by 1;`).split("\n");
  assert.equal(rows.length, 2);
  for (const r of rows) {
    const [name, authd, anon, service, secdef, config] = r.split("|");
    assert.deepEqual([authd, anon, service, secdef], ["f", "f", "t", "t"], name);
    assert.ok(config.includes("search_path=") && !/search_path=[a-z$]/i.test(config), `${name} search_path 고정(빈 값): ${config}`);
  }
  const u = mkUser(); const a = mkReady(u); dropObject(a);
  for (const role of ["authenticated", "anon"]) {
    const m = run(`set role ${role}; select public.aif_asset_mark_missing('${a.id}', '${u}');`);
    assert.equal(m.ok, false); assert.match(m.err, /permission denied/);
    const s = run(`set role ${role}; select public.aif_asset_missing_scan(10, 10);`);
    assert.equal(s.ok, false); assert.match(s.err, /permission denied/);
  }
  assert.equal(assetRow(a), "ready|null|false", "거절된 호출은 아무것도 바꾸지 않는다(확인 시각 포함)");
  // 회원은 새 열을 통해서도 쓰지 못한다
  const asU = `set role authenticated; set request.jwt.claim.sub = '${u}';`;
  const upd = run(`${asU} update public.aif_assets set state = 'missing', missing_reason = 'object_absent' where id = '${a.id}';`);
  assert.ok(!upd.ok || stateOnly(a) === "ready");
  assert.equal(stateOnly(a), "ready");
});

// ───────────── 판정 함수 ─────────────
t("mark_missing: 객체가 id로도 경로로도 없을 때만 missing(사유 object_absent), 멱등", () => {
  const u = mkUser(); const a = mkReady(u);
  assert.equal(markMissing(a), "present");
  assert.equal(assetRow(a), "ready|null|true", "ready로 남기면 확인 시각만 기록");
  dropObject(a);
  assert.equal(markMissing(a), "missing");
  assert.equal(assetRow(a), "missing|object_absent|true");
  assert.equal(q(`select object_id = '${a.oid}' from public.aif_assets where id = '${a.id}';`), "t", "기대 객체 id는 기록으로 남긴다");
  assert.equal(markMissing(a), "missing", "다시 불러도 같다");
  assert.equal(assetRow(a), "missing|object_absent|true");
});

t("mark_missing — 저장소 두 기준: 경로에 다른 객체, 그 id가 다른 자리에 있으면 other_object(무변경)", () => {
  const u = mkUser();
  // (가) 그 id는 없는데 같은 경로에 다른 id의 객체가 있다
  const a = mkReady(u); dropObject(a);
  q(`insert into storage.objects(bucket_id, name, metadata) values ('aif-assets', '${a.path}', '{"size":10}'::jsonb);`);
  assert.equal(markMissing(a), "other_object");
  assert.equal(assetRow(a), "ready|null|true");
  // (나) 그 id의 객체가 다른 이름으로 옮겨져 있다(경로에는 아무것도 없다)
  const b = mkReady(u);
  q(`update storage.objects set name = '${b.path}.moved' where id = '${b.oid}';`);
  assert.equal(markMissing(b), "other_object");
  assert.equal(stateOnly(b), "ready");
  // (다) 그 id의 객체가 다른 버킷에 있다
  const c = mkReady(u);
  q(`update storage.objects set bucket_id = 'other-bucket' where id = '${c.oid}';`);
  assert.equal(markMissing(c), "other_object");
  assert.equal(stateOnly(c), "ready");
  // (라) 그 id도 다른 자리에 있고 경로에도 다른 객체가 있다
  const d = mkReady(u);
  q(`update storage.objects set name = '${d.path}.moved' where id = '${d.oid}';
     insert into storage.objects(bucket_id, name, metadata) values ('aif-assets', '${d.path}', '{"size":10}'::jsonb);`);
  assert.equal(markMissing(d), "other_object");
  assert.equal(stateOnly(d), "ready");
  assert.equal(q(`select count(*) from storage.objects where name like '${u}/%' or name like '${u}/%.moved';`), "4", "저장소 대역의 객체는 하나도 지워지거나 바뀌지 않았다");
});

t("mark_missing — 대상 아님(skip): 없는 자산·다른 회원·NULL·reserved·unknown·failed·expired", () => {
  const u = mkUser(); const other = mkUser(); const a = mkReady(u); dropObject(a);
  assert.equal(svcOk(`select public.aif_asset_mark_missing(gen_random_uuid(), '${u}');`), "skip");
  assert.equal(markMissing(a, other), "skip", "다른 회원 이름으로는 건드리지 못한다");
  assert.equal(svcOk(`select public.aif_asset_mark_missing(null, '${u}');`), "skip");
  assert.equal(svcOk(`select public.aif_asset_mark_missing('${a.id}', null);`), "skip");
  assert.equal(assetRow(a), "ready|null|false");
  const [rid] = svcOk(`select asset_id || '|' || path from public.aif_asset_reserve('${u}', 'generated', 'image/png', 'png', 10, '${SHA}');`).split("|");
  assert.equal(svcOk(`select public.aif_asset_mark_missing('${rid}', '${u}');`), "skip", "reserved — 객체가 없어도 늦은 쓰기가 있을 수 있다");
  svcOk(`select public.aif_asset_finalize('${rid}', '${u}', null);`);
  assert.equal(svcOk(`select public.aif_asset_mark_missing('${rid}', '${u}');`), "skip", "업로드 불명(unknown)");
  assert.equal(q(`select state from public.aif_assets where id = '${rid}';`), "unknown");
  const [fid] = svcOk(`select asset_id || '|' || path from public.aif_asset_reserve('${u}', 'generated', 'image/png', 'png', 10, '${SHA}');`).split("|");
  svcOk(`select public.aif_asset_abort_local('${fid}', '${u}');`);
  assert.equal(svcOk(`select public.aif_asset_mark_missing('${fid}', '${u}');`), "skip", "failed");
  const e = mkReady(u, { ageDays: 31 }); assert.equal(expire(e), "expired"); dropObject(e);
  assert.equal(markMissing(e), "skip", "expired는 이 함수의 대상이 아니다");
  assert.equal(stateOnly(e), "expired");
});

t("mark_missing — 삭제 예약: 없음·cancelled·delete_failed는 허용, claimed·deleting·delete_unknown·deleted는 busy(무변경)", () => {
  for (const state of ["claimed", "deleting", "delete_unknown", "deleted"]) {
    const a = mkRestoredWithCancelled(); dropObject(a);
    q(`update public.aif_asset_deletions set state = '${state}' where asset_id = '${a.id}';`);   // 설계상 ready와 함께 있을 수 없는 조합을 억지로 만든다
    assert.equal(markMissing(a), "busy", state);
    assert.equal(assetRow(a), "ready|null|true", "자산 무변경, 확인 시각만");
    assert.equal(delRow(a).split("|")[0], state);
    assert.equal(delRow(a).split("|")[3], "false", "활성 예약에는 parked_at을 기록하지 않는다");
  }
  // 예약 행의 소유·경로가 자산과 다르면 busy
  const b = mkRestoredWithCancelled(); dropObject(b);
  q(`alter table public.aif_asset_deletions drop constraint if exists aif_asset_deletions_bucket_path_unique;
     update public.aif_asset_deletions set path = user_id::text || '/generated/' || gen_random_uuid()::text || '.png' where asset_id = '${b.id}';`);
  assert.equal(markMissing(b), "busy");
  assert.equal(stateOnly(b), "ready");
});

t("예약 보존: missing이 되면 비활성 예약에 parked_at만 기록 — 상태·토큰·시도 횟수 그대로, 「이어 하기」 목록에서 빠진다", () => {
  // cancelled 예약
  const a = mkRestoredWithCancelled(); dropObject(a);
  const before = delRow(a).split("|");
  assert.equal(inResumeList(a), "1");
  assert.equal(markMissing(a), "missing");
  const after = delRow(a).split("|");
  assert.deepEqual(after.slice(0, 3), before.slice(0, 3), "state·fencing_token·attempts 보존");
  assert.equal(after[3], "true", "parked_at 기록");
  assert.equal(q(`select count(*) from public.aif_asset_deletions where asset_id = '${a.id}';`), "1", "예약 행을 지우지 않는다");
  assert.equal(inResumeList(a), "0", "DB 쪽 조건(parked_at is null)에서 제외된다");
  // delete_failed 예약(시도 횟수가 있는 경우)
  const u = mkUser(); const b = mkReady(u, { ageDays: 31 });
  assert.equal(expire(b), "expired");
  const token = claim(b); assert.equal(expire(b, token), "expired"); assert.equal(mark(b, token, "deleting"), "t"); assert.equal(mark(b, token, "delete_failed"), "t");
  q(`update public.profiles set retention_exempt = true where id = '${u}';`);
  assert.equal(expire(b), "restored");
  dropObject(b);
  assert.equal(markMissing(b), "missing");
  assert.equal(delRow(b), `delete_failed|${token}|1|true`);
  assert.equal(inResumeList(b), "0");
  // 예약이 없는 자산은 예약 행이 생기지 않는다
  const c = mkReady(u); dropObject(c);
  assert.equal(markMissing(c), "missing");
  assert.equal(q(`select count(*) from public.aif_asset_deletions where asset_id = '${c.id}';`), "0");
});

t("삭제 흐름과의 격리: missing 자산은 expire가 skip — 예약·deleting으로 들어가는 길이 없다", () => {
  const a = mkRestoredWithCancelled(); dropObject(a);
  assert.equal(markMissing(a), "missing");
  const delBefore = delRow(a);
  assert.equal(expire(a), "skip");
  assert.equal(svcOk(`select public.aif_asset_expire('${a.id}', '${a.user}', '${delBefore.split("|")[1]}');`), "skip", "예약 토큰을 줘도 같다");
  assert.equal(assetRow(a), "missing|object_absent|true");
  assert.equal(delRow(a), delBefore, "예약 행 무변경(updated_at 순환도 하지 않으므로 parked_at으로 목록에서 빼는 것이다)");
  // 보호가 풀려 기간이 지난 회원이어도 같다
  q(`update public.profiles set retention_exempt = false where id = '${a.user}';`);
  assert.equal(expire(a), "skip");
  // finalize·reconcile도 되살리지 않는다
  assert.equal(svcOk(`select public.aif_asset_finalize('${a.id}', '${a.user}', '${a.oid}');`), "INVALID_STATE");
  assert.equal(svcOk(`select public.aif_asset_reconcile('${a.id}', '${a.user}');`), "missing");
  assert.equal(stateOnly(a), "missing");
});

t("용량: missing은 추가분에 들지 않는다(최근 확정된 ready였다면 그만큼 줄어든다)", () => {
  const u = mkUser();
  q(`update public.qa_quota set quota_bytes = 100 where user_id = '${u}';`);
  const a = mkReady(u, { bytes: 60 });
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "60");
  dropObject(a);
  assert.equal(markMissing(a), "missing");
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "0");
  assert.equal(svcOk(`select allowed from public.aif_asset_precheck('${u}', 100);`), "t");
});

t("롤백: storage.objects를 읽지 못하면 예외 — 「0행」으로 오인해 missing으로 바꾸지 않는다", () => {
  const u = mkUser(); const a = mkReady(u); dropObject(a);
  // 저장소 표를 읽을 수 없는 상황을 대역에서 흉내 낸다: 한 거래 안에서 표 이름을 바꾼 뒤 호출 → 예외 → 거래 전체 롤백(이름도 원래대로)
  const r = run(`begin; alter table storage.objects rename to objects_unavailable; set local role service_role; select public.aif_asset_mark_missing('${a.id}', '${u}'); commit;`);
  assert.equal(r.ok, false);
  assert.match(r.err, /storage\.objects|does not exist/);
  assert.equal(q(`select to_regclass('storage.objects') is not null;`), "t", "롤백으로 표 이름이 원래대로다");
  assert.equal(assetRow(a), "ready|null|false", "자산·확인 시각 무변경");
  const s = run(`begin; alter table storage.objects rename to objects_unavailable; set local role service_role; select public.aif_asset_missing_scan(10, 10); commit;`);
  assert.equal(s.ok, false);
  assert.equal(assetRow(a), "ready|null|false", "훑기도 같은 조건에서 아무것도 바꾸지 않는다");
  assert.equal(markMissing(a), "missing", "읽을 수 있게 된 뒤에는 정상 판정");
});

// ───────────── 훑기 함수 ─────────────
t("scan — 인자: NULL·1 미만은 예외, 큰 값은 줄인다(창 5000·반환 500·반환 ≤ 창)", () => {
  for (const args of ["null, 10", "10, null", "0, 10", "10, 0", "-1, 10"]) {
    const r = svc(`select public.aif_asset_missing_scan(${args});`);
    assert.equal(r.ok, false, args);
    assert.match(r.err, /INVALID/);
  }
  settleAll();
  assert.deepEqual([scan(999999, 999999).scan_limit, scan(999999, 999999).limit], [5000, 500]);
  assert.deepEqual([scan(7, 999).scan_limit, scan(7, 999).limit], [7, 7], "반환 상한은 창 상한을 넘지 않는다");
  assert.deepEqual([scan(50, 3).scan_limit, scan(50, 3).limit], [50, 3]);
});

t("scan — 한 회차 상한: 읽은 행 ≤ 창, 반환 ≤ 반환 상한. 조회 결과(candidates)와 변경한 행(touched)은 별개다", () => {
  settleAll();
  const u = mkUser();
  const present = [1, 2, 3].map(() => mkReady(u));
  const absent = [1, 2, 3, 4].map(() => { const a = mkReady(u); dropObject(a); return a; });
  const other = mkReady(u); q(`update storage.objects set name = '${other.path}.moved' where id = '${other.oid}';`);
  const mine = [...present, ...absent, other].map((a) => a.id);
  // 새로 만든 8행은 object_checked_at이 NULL이라 맨 앞에 온다. 창 8·반환 2
  const r = scan(8, 2);
  assert.deepEqual([r.scanned, r.present, r.absent, r.other_object, r.touched], [8, 3, 4, 1, 4]);
  assert.equal(r.candidates.length, 2, "absent 4개 중 반환 상한 2개만");
  for (const c of r.candidates) { assert.ok(absent.some((a) => a.id === c.asset_id)); assert.equal(c.user_id, u); assert.deepEqual(Object.keys(c).sort(), ["asset_id", "user_id"]); }
  assert.ok(!r.candidates.some((c) => c.asset_id === other.id), "other_object 행은 돌려주지 않는다(건수만)");
  // 변경한 행: present 3 + other 1만 확인 시각이 생겼고, absent 4는 그대로 NULL
  for (const a of [...present, other]) assert.notEqual(checkedAt(a), "null");
  for (const a of absent) assert.equal(checkedAt(a), "null", "후보는 갱신하지 않는다(반환되지 않은 것 포함)");
  assert.equal(q(`select count(*) from public.aif_assets where id in (${mine.map((i) => `'${i}'`).join(",")}) and state <> 'ready';`), "0", "훑기는 상태를 바꾸지 않는다");
  assert.equal(q(`select count(distinct object_checked_at) from public.aif_assets where id in (${[...present, other].map((a) => `'${a.id}'`).join(",")});`), "1", "한 호출이 갱신한 시각은 모두 같다");
  // 창이 3이면 읽은 행도 3 이하
  const small = scan(3, 3);
  assert.ok(small.scanned <= 3);
  assert.ok(small.candidates.length <= 3);
});

t("scan — absent 포화와 회전: 반환되지 않은 후보는 다음 회차에 다시 앞에서 읽히고, 판정된 것은 빠진다", () => {
  settleAll();
  const u = mkUser();
  const absent = [1, 2, 3, 4, 5].map(() => { const a = mkReady(u); dropObject(a); return a; });
  const ids = absent.map((a) => a.id).sort();   // 확인 시각이 모두 NULL이므로 id 오름차순으로 읽힌다(안정 정렬)
  const r1 = scan(5, 2);
  assert.deepEqual(r1.candidates.map((c) => c.asset_id), ids.slice(0, 2));
  const r1b = scan(5, 2);
  assert.deepEqual(r1b.candidates.map((c) => c.asset_id), ids.slice(0, 2), "판정을 부르지 않으면 같은 후보가 다시 온다(상태 변화 0)");
  for (const c of r1.candidates) assert.equal(svcOk(`select public.aif_asset_mark_missing('${c.asset_id}', '${c.user_id}');`), "missing");
  const r2 = scan(5, 2);
  assert.deepEqual(r2.candidates.map((c) => c.asset_id), ids.slice(2, 4), "missing이 된 것은 ready가 아니라 더 읽히지 않는다");
  assert.equal(r2.absent, 3);
  for (const c of r2.candidates) svcOk(`select public.aif_asset_mark_missing('${c.asset_id}', '${c.user_id}');`);
  const r3 = scan(5, 2);
  assert.deepEqual(r3.candidates.map((c) => c.asset_id), ids.slice(4));
});

t("scan — 회전: 확인된 행은 뒤로 가 연속 회차에서 다른 행이 읽힌다(여러 회차에 걸쳐 전부 한 번씩)", () => {
  q(`update public.aif_assets set state = 'failed' where state = 'ready';`);   // 이 시험만의 ready 집합을 만들기 위해 앞 시험의 ready를 비운다(시험 DB 한정)
  const u = mkUser();
  const all = [1, 2, 3, 4, 5, 6, 7].map(() => mkReady(u));
  const seen = new Set();
  const order = [];
  for (let round = 0; round < 4; round++) {
    const before = new Map(all.map((a) => [a.id, checkedAt(a)]));
    const r = scan(2, 2);
    assert.ok(r.scanned <= 2);
    const touchedNow = all.filter((a) => checkedAt(a) !== before.get(a.id)).map((a) => a.id);
    assert.equal(touchedNow.length, r.touched);
    for (const id of touchedNow) { assert.ok(!seen.has(id), "한 바퀴가 끝나기 전에는 같은 행을 다시 읽지 않는다"); seen.add(id); order.push(id); }
  }
  assert.equal(seen.size, 7, "7행을 창 2로 4회차에 모두 한 번씩");
  assert.deepEqual(order, all.map((a) => a.id).sort(), "처음에는 확인 시각이 모두 NULL이라 id 순서");
  // 다음 회차는 가장 먼저 확인했던 행부터 다시
  const before = new Map(all.map((a) => [a.id, checkedAt(a)]));
  scan(2, 2);
  const again = all.filter((a) => checkedAt(a) !== before.get(a.id)).map((a) => a.id).sort();
  assert.deepEqual(again, order.slice(0, 2).sort());
});

t("scan — 대상: 모든 회원의 ready만(보호 회원 포함). 다른 상태·other_object는 후보가 아니다", () => {
  q(`update public.aif_assets set state = 'failed' where state = 'ready';`);
  const general = mkUser(); const protectedUser = mkUser({ exempt: true });
  const g = mkReady(general); dropObject(g);
  const p = mkReady(protectedUser, { ageDays: 400 }); dropObject(p);   // 중앙 정리가 지운 보관 연장 회원의 파일을 흉내 낸다
  const e = mkReady(general, { ageDays: 31 }); assert.equal(expire(e), "expired"); dropObject(e);
  const [rid] = svcOk(`select asset_id || '|' || path from public.aif_asset_reserve('${general}', 'generated', 'image/png', 'png', 10, '${SHA}');`).split("|");
  const r = scan(100, 100);
  assert.deepEqual(r.candidates.map((c) => c.asset_id).sort(), [g.id, p.id].sort(), "보호 회원의 유령 행도 후보다");
  assert.equal(r.scanned, 2, "expired·reserved는 읽지 않는다");
  assert.ok(!r.candidates.some((c) => c.asset_id === rid || c.asset_id === e.id));
  assert.equal(markMissing(p), "missing", "판정도 보호 여부를 보지 않는다");
});

// ───────────── 동시성(2연결 실측) ─────────────
t("2연결 실측: 다른 연결이 행을 잠그고 있으면 훑기는 기다리지 않고 건너뛴다 — 건너뛴 행은 그 회차에 확인되지 않는다", async (ctx) => {
  q(`update public.aif_assets set state = 'failed' where state = 'ready';`);
  const u = mkUser();
  const rows = [1, 2, 3, 4].map(() => mkReady(u));
  const ids = rows.map((a) => a.id).sort();
  const locked = ids.slice(0, 2);
  const holder = runAsync(`set application_name = 'aif_m1'; begin; select id from public.aif_assets where id in ('${locked.join("','")}') for update; select pg_sleep(3); commit;`);
  const h = await sleeping("aif_m1");   // 장벽: 첫 연결이 행 잠금을 쥔 채 잠든 것을 확인한 뒤에만 훑기 시작
  const t0 = Date.now();
  const r = scan(4, 4);
  const took = Date.now() - t0;
  ctx.diagnostic(`행 잠금 보유 pid=${h.row} · 훑기 소요 ${took}ms · scanned=${r.scanned}`);
  assert.ok(took < 2500, "잠금이 풀리기를 기다리지 않았다");
  assert.equal(r.scanned, 2, "잠긴 2행은 건너뛰고 나머지 2행만 읽었다");
  for (const a of rows) assert.equal(checkedAt(a) === "null", locked.includes(a.id), "건너뛴 행은 확인 시각이 없다");
  const done = await holder;
  assert.equal(done.ok, true, done.err);
  assert.equal(scan(4, 4).scanned, 4, "잠금이 풀린 뒤에는 다시 읽힌다(확인 시각이 NULL인 2행이 앞)");
});

t("2연결 실측: mark_missing은 같은 자산의 expire와 회원 → 자산 잠금에서 서로 기다린다(교착 없음)", async (ctx) => {
  const u = mkUser(); const a = mkReady(u, { ageDays: 31 }); dropObject(a);
  // 객체가 없으므로 expire는 unknown(무변경)을 돌려주지만 그동안 권고 잠금을 쥔다
  const first = runAsync(`set application_name = 'aif_m2'; set role service_role; begin; select public.aif_asset_expire('${a.id}', '${u}'); select pg_sleep(3); commit;`);
  const holder = await lockHolder("aif_m2");
  const secondP = runAsync(`set application_name = 'aif_m3'; set role service_role; select public.aif_asset_mark_missing('${a.id}', '${u}');`);
  const waiter = await lockWaiter("aif_m3");
  const [wpid, wtype, wevent, blockers] = waiter.row.split("|");
  ctx.diagnostic(`잠금 보유 pid=${holder.row} · 대기 pid=${wpid} ${wtype}/${wevent} · 막은 pid=${blockers}`);
  assert.equal(wtype, "Lock");
  assert.equal(wevent, "advisory");
  assert.ok(blockers.split(",").includes(holder.row), "판정을 막은 것이 expire 연결이다");
  const [r1, r2] = await Promise.all([first, secondP]);
  assert.equal(r1.ok, true, r1.err);
  assert.match(r1.out, /^unknown/);
  assert.equal(r2.ok, true, r2.err);
  assert.equal(r2.out, "missing");
});

t("2연결 실측: 같은 후보에 판정이 동시에 두 번 불리면 차례로 실행돼 둘 다 missing(전이는 한 번)", async () => {
  const u = mkUser(); const a = mkReady(u); dropObject(a);
  const first = runAsync(`set application_name = 'aif_m4'; set role service_role; begin; select public.aif_asset_mark_missing('${a.id}', '${u}'); select pg_sleep(2); commit;`);
  await lockHolder("aif_m4");
  const second = runAsync(`set application_name = 'aif_m5'; set role service_role; select public.aif_asset_mark_missing('${a.id}', '${u}');`);
  await lockWaiter("aif_m5");
  const [r1, r2] = await Promise.all([first, second]);
  assert.match(r1.out, /^missing/);
  assert.equal(r2.out, "missing");
  assert.equal(assetRow(a), "missing|object_absent|true");
});

// ───────────── 재적용 ─────────────
t("재적용: P2 파일을 다시 실행해도 성공하고 열·색인·함수 수·권한·데이터가 그대로", () => {
  const before = q(`select (select count(*) from public.aif_assets) || '|' || (select count(*) from public.aif_asset_deletions) || '|' || (select count(*) from public.aif_assets where state = 'missing') || '|' || (select count(*) from public.aif_asset_deletions where parked_at is not null);`);
  q(P2);
  q(A1);   // A1 원문을 다시 실행해도(create table if not exists·create or replace) 새 열과 데이터가 유지되는지
  q(P2);
  assert.equal(q(`select (select count(*) from public.aif_assets) || '|' || (select count(*) from public.aif_asset_deletions) || '|' || (select count(*) from public.aif_assets where state = 'missing') || '|' || (select count(*) from public.aif_asset_deletions where parked_at is not null);`), before);
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%'
                    and has_function_privilege('service_role', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute');`), "13");
  assert.equal(q(`select count(*) from pg_indexes where schemaname='public' and indexname in ('aif_assets_ready_checked_idx','aif_asset_deletions_unparked_idx');`), "2");
});
