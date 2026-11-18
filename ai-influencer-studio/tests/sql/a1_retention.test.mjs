// W01-R1 보관 정리 SQL 격리 계약 시험 (2026-11-18, CC-SNS-01, Master msg_7418b7ac3cf6).
// 대상: migration 3차 수정분 — 상태 expired, usage_estimate의 expired 가산, aif_asset_expire, aif_asset_delete_verify, delete_mark 전이.
// 실행: node --test tests/sql/a1_retention.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 하는 일: 새 DB qa_aif_retention_20261118를 만들고(이미 있으면 중단) → a1_fixture.sql(대역) → migration 원문 적용 → 시험 → 만든 DB만(oid 일치 확인) 지운다.
// 다른 DB(aww·aww_dev·mb_* 등)에는 접속하지 않는다. 관리용 postgres DB에는 역할·DB 목록을 읽고 시험 DB를 만들고 지우기 위해서만 접속한다.
// ★ 한계: storage.objects·profiles·member_storage_policy·member_storage_usage는 전부 대역(stub)이다. 이 위의 통과는 우리 SQL의 계약(제약·권한·잠금·상태 전이)
//   확인일 뿐, 실제 Supabase 저장소·실제 중앙 정책 함수와의 통합 통과가 아니다. 실제 저장소 삭제(remove)는 어떤 경우에도 부르지 않는다 —
//   「객체가 지워졌다」는 대역 표에서 행을 지워 흉내 낸다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_retention_20261118";
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const MIGRATION = readFileSync(join(HERE, "..", "..", "supabase", "migrations", "20261118120000_aif_assets_a1.sql"), "utf8");

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

const SHA = "a".repeat(64);
let userSeq = 0;
/** 새 회원. quota null = 무제한, days null = 자동 삭제 없음 */
function mkUser({ quota = null, exempt = false, days = 30, unlimited = false, measured } = {}) {
  userSeq += 1;
  const id = `00000000-0000-4000-8000-${String(userSeq).padStart(12, "0")}`;
  q(`insert into public.profiles(id, retention_exempt) values ('${id}', ${exempt});
     insert into public.qa_quota(user_id, quota_bytes, retention_days, unlimited_retention) values ('${id}', ${quota === null ? "null" : quota}, ${days === null ? "null" : days}, ${unlimited});
     ${measured ? `insert into public.member_storage_usage(user_id, bytes, measured_at) values ('${id}', ${measured.bytes}, now());` : ""}`);
  return id;
}
/** ready 자산 한 건: 예약 → 대역 객체 → 확정 → 객체 생성 시각을 ageDays일 전으로 */
function mkReady(user, { bytes = 10, ageDays = 31 } = {}) {
  const [id, path] = svcOk(`select asset_id || '|' || path from public.aif_asset_reserve('${user}', 'generated', 'image/png', 'png', ${bytes}, '${SHA}');`).split("|");
  const oid = q(`insert into storage.objects(bucket_id, name, metadata) values ('aif-assets', '${path}', '${JSON.stringify({ size: bytes })}'::jsonb) returning id;`);
  assert.equal(svcOk(`select public.aif_asset_finalize('${id}', '${user}', '${oid}');`), "ready");
  q(`update storage.objects set created_at = now() - interval '${ageDays} days' where id = '${oid}';`);
  return { id, path, oid, user };
}
const expire = (a, token) => svcOk(`select public.aif_asset_expire('${a.id}', '${a.user}'${token ? `, '${token}'` : ""});`);
const claim = (a) => svcOk(`select public.aif_asset_claim_delete('${a.id}', '${a.user}', 'aif-assets', '${a.path}');`);
const mark = (a, token, state) => svcOk(`select public.aif_asset_delete_mark('${a.id}', '${a.user}', '${token}', '${state}');`);
const verify = (a, token) => svcOk(`select public.aif_asset_delete_verify('${a.id}', '${a.user}', '${token}');`);
const assetState = (a) => q(`select state || '|' || coalesce(expired_at::text, 'null') from public.aif_assets where id = '${a.id}';`);
const stateOnly = (a) => assetState(a).split("|")[0];
const delState = (a) => q(`select state from public.aif_asset_deletions where asset_id = '${a.id}';`);
/** 「저장소에서 지워졌다」를 대역 표에서 흉내 낸다(실제 저장소 호출 0) */
const dropObject = (a) => q(`delete from storage.objects where bucket_id = 'aif-assets' and name = '${a.path}';`);
const allowed = (user, bytes) => svcOk(`select allowed from public.aif_asset_precheck('${user}', ${bytes});`);
/** 만료 → 예약 → 같은 토큰 재확인 → deleting 까지 진행하고 토큰을 돌려준다 */
function toDeleting(a) {
  assert.equal(expire(a), "expired");
  const token = claim(a);
  assert.equal(expire(a, token), "expired");
  assert.equal(mark(a, token, "deleting"), "t");
  return token;
}

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
  // 실제 Supabase의 storage.objects.created_at은 NULL을 허용한다. 대역 파일은 그대로 두고 이 시험 DB 안에서만 맞춘다(NULL 반례용).
  q(`alter table storage.objects alter column created_at drop not null;`);
  q(MIGRATION);
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

t("컴파일: 3차 수정 원문이 적용되고 함수 11개·expired 열·제약이 만들어진다", (ctx) => {
  ctx.diagnostic(`역할 사전 확인(이름:로그인:슈퍼유저:RLS우회) ${rolePreflight.replace(/\n/g, " ")} · 시험 DB ${DB} oid=${createdOid}`);
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%';`), "11");
  assert.equal(q(`select data_type || '|' || is_nullable from information_schema.columns where table_schema='public' and table_name='aif_assets' and column_name='expired_at';`), "timestamp with time zone|YES");
  assert.equal(q(`select count(*) from pg_constraint where conname = 'aif_assets_expired_shape';`), "1");
  assert.equal(q(`select pg_get_function_identity_arguments(p.oid) from pg_proc p where p.proname = 'aif_asset_expire';`), "p_asset uuid, p_user uuid, p_token uuid");
});

t("권한: 새 함수 2개는 security definer이고 service_role만 실행한다", () => {
  const rows = q(`select p.proname, has_function_privilege('authenticated', p.oid, 'execute'), has_function_privilege('anon', p.oid, 'execute'),
                         has_function_privilege('service_role', p.oid, 'execute'), p.prosecdef, p.proconfig::text
                  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('aif_asset_expire','aif_asset_delete_verify') order by 1;`).split("\n");
  assert.equal(rows.length, 2);
  for (const r of rows) {
    const [name, authd, anon, service, secdef, config] = r.split("|");
    assert.deepEqual([authd, anon, service, secdef], ["f", "f", "t", "t"], name);
    assert.ok(config.includes("search_path=") && !/search_path=[a-z$]/i.test(config), `${name} search_path 고정(빈 값): ${config}`);
  }
  const u = mkUser(); const a = mkReady(u);
  for (const role of ["authenticated", "anon"]) {
    const e = run(`set role ${role}; select public.aif_asset_expire('${a.id}', '${u}');`);
    assert.equal(e.ok, false); assert.match(e.err, /permission denied/);
    const v = run(`set role ${role}; select public.aif_asset_delete_verify('${a.id}', '${u}', gen_random_uuid());`);
    assert.equal(v.ok, false); assert.match(v.err, /permission denied/);
  }
  assert.equal(stateOnly(a), "ready", "거절된 호출은 아무것도 바꾸지 않는다");
});

t("RLS: 회원은 expired가 된 본인 자산을 더 보지 못하고, 삭제 예약 표는 읽지도 못한다", () => {
  const u = mkUser(); const a = mkReady(u);
  const asU = `set role authenticated; set request.jwt.claim.sub = '${u}';`;
  assert.equal(q(`${asU} select count(*) from public.aif_assets where id = '${a.id}';`), "1");
  assert.equal(expire(a), "expired");
  assert.equal(q(`${asU} select count(*) from public.aif_assets where id = '${a.id}';`), "0");
  const del = run(`${asU} select count(*) from public.aif_asset_deletions;`);
  assert.equal(del.ok, false); assert.match(del.err, /permission denied/);
  const upd = run(`${asU} update public.aif_assets set state = 'ready' where id = '${a.id}';`);
  assert.ok(!upd.ok || stateOnly(a) === "expired", "회원 쓰기 불가");
  assert.equal(stateOnly(a), "expired");
});

t("check 제약: expired는 expired_at·object_id가 있어야 하고, 모르는 상태는 거절", () => {
  const u = mkUser(); const a = mkReady(u);
  const noAt = run(`update public.aif_assets set state = 'expired' where id = '${a.id}';`);
  assert.equal(noAt.ok, false); assert.match(noAt.err, /aif_assets_expired_shape/);
  const noObj = run(`update public.aif_assets set state = 'expired', expired_at = now(), object_id = null where id = '${a.id}';`);
  assert.equal(noObj.ok, false); assert.match(noObj.err, /aif_assets_expired_shape|aif_assets_ready_shape/);
  const bogus = run(`update public.aif_assets set state = 'purged' where id = '${a.id}';`);
  assert.equal(bogus.ok, false); assert.match(bogus.err, /check constraint/);
  assert.equal(stateOnly(a), "ready");
});

t("기산: 객체 생성 시각 + 정책 기간. 경계·정책 값·늦은 확정", () => {
  const u30 = mkUser({ days: 30 });
  const young = mkReady(u30, { ageDays: 29 });
  const old = mkReady(u30, { ageDays: 31 });
  assert.equal(expire(young), "not_due");
  assert.equal(stateOnly(young), "ready");
  assert.equal(q(`select count(*) from public.aif_asset_deletions where asset_id = '${young.id}';`), "0", "대상이 아니면 예약 행을 만들지 않는다");
  assert.equal(expire(old), "expired");
  assert.match(assetState(old), /^expired\|\d{4}-/);
  assert.equal(delState(old), "cancelled", "만료와 같은 거래에서 삭제 대기 행(cancelled)이 생긴다");
  assert.equal(expire(old), "expired", "다시 불러도 같다(멱등)");
  assert.equal(q(`select count(*) from public.aif_asset_deletions where asset_id = '${old.id}';`), "1");

  const u7 = mkUser({ days: 7 });
  const seven = mkReady(u7, { ageDays: 8 });
  assert.equal(expire(seven), "expired", "기간은 정책 값이다(30이 아니다)");

  // 확정(stored_at)·행 생성(created_at)이 방금이어도 객체가 오래됐으면 대상 — 확정 지연이 보관을 늘리지 않는다
  const late = mkReady(u30, { ageDays: 45 });
  assert.equal(q(`select (stored_at > now() - interval '1 minute') and (created_at > now() - interval '1 minute') from public.aif_assets where id = '${late.id}';`), "t");
  assert.equal(expire(late), "expired");
  // 반대로 행·확정 시각이 아주 오래됐어도 객체가 새것이면 대상이 아니다
  const fresh = mkReady(u30, { ageDays: 1 });
  q(`update public.aif_assets set stored_at = now() - interval '400 days', created_at = now() - interval '400 days' where id = '${fresh.id}';`);
  assert.equal(expire(fresh), "not_due");
});

t("판정 불가(unknown): 객체 없음·다른 객체·생성 시각 NULL·이상한 정책 값 — 만료 0, 예약 행 0", () => {
  const u = mkUser();
  const noObj = mkReady(u); dropObject(noObj);
  const other = mkReady(u);
  q(`delete from storage.objects where id = '${other.oid}';
     insert into storage.objects(bucket_id, name, metadata, created_at) values ('aif-assets', '${other.path}', '{"size":10}'::jsonb, now() - interval '90 days');`);
  const noTime = mkReady(u); q(`update storage.objects set created_at = null where id = '${noTime.oid}';`);
  const u0 = mkUser({ days: 0 }); const zero = mkReady(u0, { ageDays: 400 });
  const uNeg = mkUser({ days: -5 }); const neg = mkReady(uNeg, { ageDays: 400 });
  for (const a of [noObj, other, noTime, zero, neg]) {
    assert.equal(expire(a), "unknown");
    assert.equal(stateOnly(a), "ready");
    assert.equal(q(`select count(*) from public.aif_asset_deletions where asset_id = '${a.id}';`), "0");
  }
  // 정책 행 자체가 없는 회원(대역 정책 함수가 0행) → unknown
  const uNoPolicy = mkUser(); const np = mkReady(uNoPolicy, { ageDays: 400 });
  q(`delete from public.qa_quota where user_id = '${uNoPolicy}';`);
  assert.equal(expire(np), "unknown");
  assert.equal(stateOnly(np), "ready");
});

t("대상 아님(skip): 없는 자산·다른 회원·reserved·unknown·failed, NULL 인자", () => {
  const u = mkUser(); const other = mkUser(); const a = mkReady(u, { ageDays: 400 });
  assert.equal(svcOk(`select public.aif_asset_expire(gen_random_uuid(), '${u}');`), "skip");
  assert.equal(svcOk(`select public.aif_asset_expire('${a.id}', '${other}');`), "skip", "다른 회원 이름으로는 건드리지 못한다");
  assert.equal(stateOnly(a), "ready");
  assert.equal(svcOk(`select public.aif_asset_expire(null, '${u}');`), "skip");
  assert.equal(svcOk(`select public.aif_asset_expire('${a.id}', null);`), "skip");
  const [rid] = svcOk(`select asset_id || '|' || path from public.aif_asset_reserve('${u}', 'generated', 'image/png', 'png', 10, '${SHA}');`).split("|");
  assert.equal(svcOk(`select public.aif_asset_expire('${rid}', '${u}');`), "skip", "reserved");
  svcOk(`select public.aif_asset_finalize('${rid}', '${u}', null);`);
  assert.equal(q(`select state from public.aif_assets where id = '${rid}';`), "unknown");
  assert.equal(svcOk(`select public.aif_asset_expire('${rid}', '${u}');`), "skip", "업로드 불명(unknown)은 보관 정리 대상이 아니다");
  assert.equal(q(`select state from public.aif_assets where id = '${rid}';`), "unknown");
});

t("동적 보호: 보호 회원·무기한·자동 삭제 없음은 대상이 아니고, expired 뒤 보호 대상이 되면 ready로 복원", () => {
  const prot = mkUser({ exempt: true }); const p = mkReady(prot, { ageDays: 400 });
  const unlim = mkUser({ unlimited: true }); const un = mkReady(unlim, { ageDays: 400 });
  const noDays = mkUser({ days: null }); const nd = mkReady(noDays, { ageDays: 400 });
  for (const a of [p, un, nd]) { assert.equal(expire(a), "not_due"); assert.equal(stateOnly(a), "ready"); }

  for (const change of [`update public.profiles set retention_exempt = true where id = `, `update public.qa_quota set unlimited_retention = true where user_id = `, `update public.qa_quota set retention_days = null where user_id = `, `update public.qa_quota set retention_days = 60 where user_id = `]) {
    const u = mkUser(); const a = mkReady(u, { ageDays: 31 });
    assert.equal(expire(a), "expired");
    q(`${change}'${u}';`);
    assert.equal(expire(a), "restored");
    assert.equal(assetState(a), "ready|null", "expired_at도 지운다");
    assert.equal(delState(a), "cancelled", "삭제 대기 행은 cancelled로 남는다(삭제 권한 아님)");
    const again = run(`set role service_role; select public.aif_asset_claim_delete('${a.id}', '${u}', 'aif-assets', '${a.path}');`);
    assert.equal(again.ok, false); assert.match(again.err, /ASSET_IN_USE/, "복원된 ready는 다시 삭제 예약할 수 없다");
    assert.equal(expire(a), "not_due");
  }
});

t("claimed fence: 다른 토큰·토큰 없음은 busy, 같은 토큰만 진행. 1시간 넘은 claimed는 토큰 없는 호출만 취소하고 옛 토큰은 통하지 않는다", () => {
  const u = mkUser(); const a = mkReady(u);
  assert.equal(expire(a), "expired");
  const t1 = claim(a);
  assert.equal(delState(a), "claimed");
  assert.equal(expire(a), "busy", "토큰 없음 + 방금 잡힌 예약");
  assert.equal(svcOk(`select public.aif_asset_expire('${a.id}', '${u}', gen_random_uuid());`), "busy", "다른 토큰");
  assert.equal(delState(a), "claimed");
  assert.equal(expire(a, t1), "expired", "같은 토큰");
  assert.equal(delState(a), "claimed", "재확인은 예약 상태를 바꾸지 않는다");

  // 오래 멈춤: 다른 토큰으로는 여전히 취소하지 못한다
  q(`update public.aif_asset_deletions set updated_at = now() - interval '2 hours' where asset_id = '${a.id}';`);
  assert.equal(svcOk(`select public.aif_asset_expire('${a.id}', '${u}', gen_random_uuid());`), "busy");
  assert.equal(delState(a), "claimed");
  // 59분은 아직 아니다
  q(`update public.aif_asset_deletions set updated_at = now() - interval '59 minutes' where asset_id = '${a.id}';`);
  assert.equal(expire(a), "busy");
  // 토큰 없는 호출이 1시간 넘은 claimed를 취소한다
  q(`update public.aif_asset_deletions set updated_at = now() - interval '61 minutes' where asset_id = '${a.id}';`);
  assert.equal(expire(a), "expired");
  assert.equal(delState(a), "cancelled");
  // 옛 실행이 깨어나 옛 토큰으로 deleting에 들어가려 해도 실패(= 외부 삭제를 보내지 못한다)
  assert.equal(mark(a, t1, "deleting"), "f");
  assert.equal(delState(a), "cancelled");
  // 새 예약은 새 토큰
  const t2 = claim(a);
  assert.notEqual(t2, t1);
  assert.equal(mark(a, t1, "deleting"), "f", "옛 토큰은 새 예약에도 통하지 않는다");
  assert.equal(expire(a, t1), "busy");
  assert.equal(expire(a, t2), "expired");
  assert.equal(mark(a, t2, "deleting"), "t");
  assert.equal(q(`select attempts from public.aif_asset_deletions where asset_id = '${a.id}';`), "1");
});

t("삭제 직전 재확인에서 보호 대상이 됐으면: ready 복원 + 같은 거래에서 예약 cancelled → 그 토큰은 deleting에 들어갈 수 없다", () => {
  const u = mkUser(); const a = mkReady(u);
  assert.equal(expire(a), "expired");
  const token = claim(a);
  q(`update public.profiles set retention_exempt = true where id = '${u}';`);
  assert.equal(expire(a, token), "restored");
  assert.equal(assetState(a), "ready|null");
  assert.equal(delState(a), "cancelled");
  assert.equal(mark(a, token, "deleting"), "f");
  assert.equal(delState(a), "cancelled");
});

t("복원 금지: deleting·delete_unknown·deleted에서는 보호 대상이 돼도 locked — 자산은 expired 그대로", () => {
  const u = mkUser(); const a = mkReady(u);
  const token = toDeleting(a);
  q(`update public.profiles set retention_exempt = true where id = '${u}';`);
  for (const tok of [undefined, token]) { assert.equal(expire(a, tok), "locked"); assert.equal(stateOnly(a), "expired"); }
  assert.equal(verify(a, token), "unknown");
  assert.equal(delState(a), "delete_unknown");
  for (const tok of [undefined, token]) { assert.equal(expire(a, tok), "locked"); assert.equal(stateOnly(a), "expired"); }
  dropObject(a);
  assert.equal(verify(a, token), "deleted");
  for (const tok of [undefined, token]) { assert.equal(expire(a, tok), "locked"); assert.equal(stateOnly(a), "expired"); }
  const re = run(`set role service_role; select public.aif_asset_claim_delete('${a.id}', '${u}', 'aif-assets', '${a.path}');`);
  assert.equal(re.ok, false); assert.match(re.err, /DELETION_BUSY/, "끝난 삭제는 다시 예약되지 않는다");
});

t("delete_verify: 객체 없음만 deleted, 같은 객체는 unknown, 다른 객체는 mismatch — 둘 다 delete_unknown 유지", () => {
  const u = mkUser();
  // 같은 객체가 남아 있음(늦게 처리될 수 있는 삭제)
  const a = mkReady(u); const ta = toDeleting(a);
  assert.equal(verify(a, ta), "unknown");
  assert.equal(delState(a), "delete_unknown");
  assert.equal(verify(a, ta), "unknown", "다시 확인해도 같다");
  assert.equal(stateOnly(a), "expired");
  assert.equal(q(`select count(*) from storage.objects where id = '${a.oid}';`), "1", "확인은 객체를 지우지 않는다");
  // 늦게 사라진 뒤
  dropObject(a);
  assert.equal(verify(a, ta), "deleted");
  assert.equal(delState(a), "deleted");
  assert.equal(verify(a, ta), "deleted", "이미 deleted면 그대로");
  assert.equal(stateOnly(a), "expired", "자산 행은 expired로 남는다");

  // 같은 경로에 다른 id의 객체
  const b = mkReady(u); const tb = toDeleting(b);
  q(`delete from storage.objects where id = '${b.oid}';
     insert into storage.objects(bucket_id, name, metadata) values ('aif-assets', '${b.path}', '{"size":10}'::jsonb);`);
  assert.equal(verify(b, tb), "mismatch");
  assert.equal(delState(b), "delete_unknown");
  assert.equal(q(`select count(*) from storage.objects where bucket_id = 'aif-assets' and name = '${b.path}';`), "1");

  // deleting에서 곧바로 객체가 없으면 deleted
  const c = mkReady(u); const tc = toDeleting(c); dropObject(c);
  assert.equal(verify(c, tc), "deleted");
});

t("delete_verify: 토큰·회원·상태가 맞지 않거나 NULL이면 denied — 아무것도 바꾸지 않는다", () => {
  const u = mkUser(); const other = mkUser(); const a = mkReady(u);
  assert.equal(expire(a), "expired");
  assert.equal(svcOk(`select public.aif_asset_delete_verify('${a.id}', '${u}', gen_random_uuid());`), "denied", "cancelled 대기 행의 토큰은 아무도 모른다");
  const token = claim(a);
  assert.equal(verify(a, token), "denied", "claimed(외부 삭제 전)에서는 확인할 것이 없다");
  assert.equal(delState(a), "claimed");
  assert.equal(mark(a, token, "deleting"), "t");
  dropObject(a);   // 객체가 실제로 없어도, 권한 없는 호출은 deleted로 바꾸지 못한다
  assert.equal(svcOk(`select public.aif_asset_delete_verify('${a.id}', '${u}', gen_random_uuid());`), "denied");
  assert.equal(svcOk(`select public.aif_asset_delete_verify('${a.id}', '${other}', '${token}');`), "denied");
  assert.equal(svcOk(`select public.aif_asset_delete_verify(gen_random_uuid(), '${u}', '${token}');`), "denied");
  for (const args of [`null, '${u}', '${token}'`, `'${a.id}', null, '${token}'`, `'${a.id}', '${u}', null`]) {
    assert.equal(svcOk(`select public.aif_asset_delete_verify(${args});`), "denied");
  }
  assert.equal(delState(a), "deleting");
  assert.equal(verify(a, token), "deleted");
});

t("delete_mark 전이(3차 수정): 삭제 불명에서 「실패(재시도 가능)」로 갈 수 없다", () => {
  const u = mkUser(); const a = mkReady(u); const token = toDeleting(a);
  assert.equal(mark(a, token, "delete_unknown"), "t");
  assert.equal(mark(a, token, "delete_failed"), "f", "delete_unknown → delete_failed 없음");
  assert.equal(mark(a, token, "deleting"), "f");
  assert.equal(mark(a, token, "cancelled"), "f");
  assert.equal(delState(a), "delete_unknown");
  const re = run(`set role service_role; select public.aif_asset_claim_delete('${a.id}', '${u}', 'aif-assets', '${a.path}');`);
  assert.equal(re.ok, false); assert.match(re.err, /DELETION_BUSY/, "삭제 불명은 다시 예약(재삭제)되지 않는다");
  assert.equal(mark(a, token, "deleted"), "t");
  // deleting → delete_failed 는 남아 있다(외부 요청을 보내지 않은 것이 확정된 호출부용) — 그 뒤에는 새 토큰으로만 다시 잡힌다
  const b = mkReady(u); const tb = toDeleting(b);
  assert.equal(mark(b, tb, "delete_failed"), "t");
  assert.equal(expire(b), "expired");
  const tb2 = claim(b);
  assert.notEqual(tb2, tb);
});

t("용량: expired는 deleted로 확정되기 전까지 계속 계산한다(중앙 미측정 반례: 한도 100·오래된 60)", () => {
  const u = mkUser({ quota: 100, measured: { bytes: 0 } });   // 중앙 측정값 0(미측정·오래된 회차)
  const a = mkReady(u, { bytes: 60, ageDays: 40 });
  q(`update public.aif_assets set stored_at = now() - interval '40 days' where id = '${a.id}';`);   // 오래전에 확정된 ready
  assert.equal(expire(a), "expired");
  assert.equal(allowed(u, 60), "f", "expired 60이 계산에 남아 새 60을 막는다");
  const denied = run(`set role service_role; select * from public.aif_asset_reserve('${u}', 'generated', 'image/png', 'png', 60, '${SHA}');`);
  assert.equal(denied.ok, false); assert.match(denied.err, /STORAGE_LIMIT/);
  assert.equal(allowed(u, 40), "t");
  const token = claim(a);
  assert.equal(allowed(u, 60), "f", "claimed");
  assert.equal(expire(a, token), "expired");
  assert.equal(mark(a, token, "deleting"), "t");
  assert.equal(allowed(u, 60), "f", "deleting");
  assert.equal(verify(a, token), "unknown");
  assert.equal(allowed(u, 60), "f", "delete_unknown — 시간이 지나도 빼지 않는다");
  q(`update public.aif_asset_deletions set updated_at = now() - interval '90 days' where asset_id = '${a.id}'; update public.aif_assets set expired_at = now() - interval '90 days' where id = '${a.id}';`);
  assert.equal(allowed(u, 60), "f");
  dropObject(a);
  assert.equal(allowed(u, 60), "f", "객체가 없어도 확인(deleted) 전에는 빼지 않는다");
  assert.equal(verify(a, token), "deleted");
  assert.equal(allowed(u, 60), "t", "deleted 확정 뒤에만 빠진다");
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "0");

  // 복원되면 다시 ready 규칙(최근 확정분만 가산)으로 돌아간다 — expired로 남아 이중으로 막지 않는다
  const u2 = mkUser({ quota: 1000, measured: { bytes: 60 } });   // 중앙이 이미 60을 셌다(한도는 넉넉히 — 여기서는 합계만 본다)
  const b = mkReady(u2, { bytes: 60, ageDays: 40 });
  q(`update public.aif_assets set stored_at = now() - interval '40 days' where id = '${b.id}';`);
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u2}');`), "60");
  assert.equal(expire(b), "expired");
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u2}');`), "120", "중앙이 이미 세면 이중 계산(보수) — 허용한 동작");
  q(`update public.profiles set retention_exempt = true where id = '${u2}';`);
  assert.equal(expire(b), "restored");
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u2}');`), "60");
});

t("순환 조회: 확인한 cancelled·delete_failed·delete_unknown 행은 updated_at만 갱신되고 상태는 그대로", () => {
  const u = mkUser(); const a = mkReady(u);
  assert.equal(expire(a), "expired");
  q(`update public.aif_asset_deletions set updated_at = now() - interval '3 days' where asset_id = '${a.id}';`);
  assert.equal(expire(a), "expired");
  assert.equal(q(`select state || '|' || (updated_at > now() - interval '1 minute') from public.aif_asset_deletions where asset_id = '${a.id}';`), "cancelled|true");
  const token = claim(a); expire(a, token); mark(a, token, "deleting");
  assert.equal(verify(a, token), "unknown");
  q(`update public.aif_asset_deletions set updated_at = now() - interval '3 days' where asset_id = '${a.id}';`);
  assert.equal(verify(a, token), "unknown");
  assert.equal(q(`select state || '|' || (updated_at > now() - interval '1 minute') || '|' || attempts from public.aif_asset_deletions where asset_id = '${a.id}';`), "delete_unknown|true|1");
});

t("2연결 실측: 만료 판정이 잠금을 쥔 동안 같은 자산의 삭제 예약은 실제로 그 연결에 막혔다가 이어서 성공한다", async (ctx) => {
  const u = mkUser(); const a = mkReady(u);
  const first = runAsync(`set application_name = 'aif_x1'; set role service_role; begin; select public.aif_asset_expire('${a.id}', '${u}'); select pg_sleep(3); commit;`);
  const holder = await lockHolder("aif_x1");   // 장벽: 첫 거래가 권고 잠금을 잡은 것을 확인한 뒤에만 둘째 시작
  const secondP = runAsync(`set application_name = 'aif_x2'; set role service_role; select public.aif_asset_claim_delete('${a.id}', '${u}', 'aif-assets', '${a.path}');`);
  const waiter = await lockWaiter("aif_x2");
  const [wpid, wtype, wevent, blockers] = waiter.row.split("|");
  ctx.diagnostic(`잠금 보유 pid=${holder.row} · 대기 pid=${wpid} ${wtype}/${wevent} · 막은 pid=${blockers}`);
  assert.equal(wtype, "Lock");
  assert.equal(wevent, "advisory");
  assert.ok(blockers.split(",").includes(holder.row), "둘째를 막은 것이 첫째 연결이다");
  const [r1, r2] = await Promise.all([first, secondP]);
  assert.equal(r1.ok, true, r1.err);
  assert.match(r1.out, /^expired/);
  assert.equal(r2.ok, true, r2.err);
  assert.match(r2.out, /^[0-9a-f-]{36}$/, "만료가 커밋된 뒤에야 예약이 성공한다(ready였다면 ASSET_IN_USE였을 것)");
  assert.equal(delState(a), "claimed");
});

t("2연결 실측: 삭제 확인(delete_verify)과 만료 판정이 같은 잠금 순서(회원 → 자산)로 서로 기다린다(교착 없음)", async (ctx) => {
  const u = mkUser(); const a = mkReady(u); const token = toDeleting(a);
  const first = runAsync(`set application_name = 'aif_y1'; set role service_role; begin; select public.aif_asset_delete_verify('${a.id}', '${u}', '${token}'); select pg_sleep(3); commit;`);
  const holder = await lockHolder("aif_y1");
  const secondP = runAsync(`set application_name = 'aif_y2'; set role service_role; select public.aif_asset_expire('${a.id}', '${u}');`);
  const waiter = await lockWaiter("aif_y2");
  const [wpid, wtype, wevent, blockers] = waiter.row.split("|");
  ctx.diagnostic(`잠금 보유 pid=${holder.row} · 대기 pid=${wpid} ${wtype}/${wevent} · 막은 pid=${blockers}`);
  assert.ok(blockers.split(",").includes(holder.row));
  const [r1, r2] = await Promise.all([first, secondP]);
  assert.equal(r1.ok, true, r1.err);
  assert.match(r1.out, /^unknown/);
  assert.equal(r2.ok, true, r2.err);
  assert.equal(r2.out, "locked");
});

t("재적용: 3차 수정 원문을 다시 실행해도 성공하고 권한·데이터·함수 수가 그대로", () => {
  const u = mkUser(); const a = mkReady(u);
  assert.equal(expire(a), "expired");
  const before = q(`select count(*) || '|' || (select count(*) from public.aif_asset_deletions) from public.aif_assets;`);
  q(MIGRATION);
  assert.equal(q(`select count(*) || '|' || (select count(*) from public.aif_asset_deletions) from public.aif_assets;`), before);
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%'
                    and has_function_privilege('service_role', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute');`), "11");
  assert.equal(stateOnly(a), "expired");
  assert.equal(expire(a), "expired");
});
