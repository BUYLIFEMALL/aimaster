// W01u 멈춘 건 읽기 전용 집계(복구 P3) SQL 격리 계약 시험 — 초안 (2026-11-18, CC-SNS-01, Master msg_5ffb8d03b1ee).
// ★ 이 파일은 작성만 했고 아직 한 번도 실행하지 않았다(격리 DB 생성 0). 실행은 격리 실행 배정 뒤에 한다.
// 대상: supabase/migrations/20261118140000_aif_assets_p3_summary.sql — 색인 1개·함수 aif_asset_stuck_summary.
// 실행(배정 뒤): node --test tests/sql/a1_summary.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 하는 일: 새 DB qa_aif_summary_20261118를 만들고(이미 있으면 중단) → a1_fixture.sql(대역, 무변경) → A1 원문 → P2 → P3 파일 순서로 적용 → 시험
//          → 만든 DB만(oid 일치 확인) 지운다. 다른 DB(aww·aww_dev·mb_* 등)에는 접속하지 않는다.
//          관리용 postgres DB에는 역할·DB 목록을 읽고 시험 DB를 만들고 지우기 위해서만 접속한다.
// ★ 한계
//   * profiles·storage.objects 등은 전부 대역(stub)이다. 이 위의 통과는 우리 SQL의 계약(범주 조건·구간 경계·한도·권한·읽기 전용) 확인일 뿐,
//     실제 Supabase의 함수 소유자 권한·실제 PostgREST 응답 모양·실제 규모의 실행 시간 통과가 아니다.
//   * 행은 상태 전이 함수를 거치지 않고 표에 **직접 심는다**(시각을 정확히 지정하려는 것). 그래서 이 시험은 「그 상태가 실제로 어떻게 생기는가」가 아니라
//     「그런 행이 있을 때 집계가 어떻게 세는가」만 본다. 설계상 함께 있을 수 없는 조합(예: 주차 표시 + claimed)도 범주 배타성을 보려고 일부러 심는다.
//   * 집계 함수는 storage.objects를 읽지 않는다. 이 시험도 저장소 대역에 행을 넣지 않는다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_summary_20261118";
const MIG = join(HERE, "..", "..", "supabase", "migrations");
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const A1 = readFileSync(join(MIG, "20261118120000_aif_assets_a1.sql"), "utf8");
const P2 = readFileSync(join(MIG, "20261118130000_aif_assets_p2_missing.sql"), "utf8");
const P3 = readFileSync(join(MIG, "20261118140000_aif_assets_p3_summary.sql"), "utf8");

const psqlArgs = (db) => ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-At", "-f", "-"];
const SYNC_TIMEOUT_MS = 60_000;    // 한 번의 psql 호출이 이보다 길면 중단하고 실패로 본다(끝없이 기다리지 않는다)
const ASYNC_TIMEOUT_MS = 30_000;   // 2연결 시험의 비동기 호출(안에서 pg_sleep 최대 6초)
function run(sql, db = DB) {
  const r = spawnSync("docker", psqlArgs(db), { input: sql, encoding: "utf8", timeout: SYNC_TIMEOUT_MS, killSignal: "SIGKILL" });
  if (r.error || r.status === null) {
    return { ok: false, out: "", err: `docker 실행 실패: ${r.error ? r.error.message : `종료 코드 없음(신호 ${r.signal ?? "?"})`}` };
  }
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) {
  const r = run(sql, db);
  assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`);
  return r.out;
}
/** 비동기 psql 호출. 어떤 경우에도 한 번은 끝난다: 정상 종료·docker 실행 실패·입력 스트림 오류·시간 초과(강제 종료) 모두 결과를 돌려준다. */
function runAsync(sql) {
  return new Promise((resolve) => {
    let done = false, out = "", err = "", timer;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(result);
    };
    let p;
    try {
      p = spawn("docker", psqlArgs(DB));
    } catch (e) {
      finish({ ok: false, out: "", err: `docker 실행 실패: ${e.message}` });
      return;
    }
    timer = setTimeout(() => {
      try { p.kill("SIGKILL"); } catch { /* 이미 끝났으면 무시 */ }
      finish({ ok: false, out: out.trim(), err: `시간 초과(${ASYNC_TIMEOUT_MS}ms)로 중단했습니다. ${err.trim()}` });
    }, ASYNC_TIMEOUT_MS);
    p.on("error", (e) => finish({ ok: false, out: out.trim(), err: `docker 실행 실패: ${e.message}` }));
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.stdin.on("error", (e) => finish({ ok: false, out: out.trim(), err: `입력 전달 실패: ${e.message}` }));
    p.on("close", (code) => finish({ ok: code === 0, out: out.trim(), err: err.trim() }));
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
/** 그 연결이 pg_sleep을 실행 중(잠금을 쥔 채, 또는 문장 실행 도중)이 될 때까지 기다린다 */
const sleeping = (app) => waitRow(`select a.pid from pg_stat_activity a where a.datname = current_database() and a.application_name = '${app}' and a.query like '%pg_sleep%' and a.state = 'active' limit 1;`);
const stillSleeping = (app) => q(`select count(*) from pg_stat_activity a where a.datname = current_database() and a.application_name = '${app}' and a.query like '%pg_sleep%' and a.state = 'active';`);

// ───────────── 행 심기(SQL 문자열을 만들 뿐 실행하지 않는다 — 집계 호출과 같은 거래에서 실행해 now()를 맞춘다) ─────────────
const pad = (n) => String(n).padStart(12, "0");
const USER = (n) => `00000000-0000-4000-8000-${pad(n)}`;
const SHA = "a".repeat(64);
let seq = 0;
const nextId = (prefix) => { seq += 1; return `${prefix}-0000-4000-8000-${pad(seq)}`; };
const userSql = (u) => `insert into public.profiles(id) values ('${u}') on conflict do nothing;\n`;
/**
 * 자산 한 행. basis = 그 상태의 나이 기준 열에 넣을 SQL 식(문자열).
 *   reserved → created_at · unknown → unknown_since(NULL 가능) · expired → expired_at · missing → updated_at. 그 밖의 상태는 basis를 쓰지 않는다.
 */
function asset(state, { user = USER(1), basis = "now()", object } = {}) {
  const id = nextId("10000000");
  const path = `${user}/generated/${id}.png`;
  const withObject = object ?? (state === "ready" || state === "expired");
  const objectId = withObject ? `'${nextId("20000000")}'` : "null";
  const col = (when, expr, otherwise) => (state === when ? expr : otherwise);
  const sql = userSql(user) + `insert into public.aif_assets
      (id, user_id, kind, ext, mime, path, bytes, sha256, state, object_id, stored_at, expired_at, unknown_since, missing_reason, created_at, updated_at)
    values ('${id}', '${user}', 'generated', 'png', 'image/png', '${path}', 10, '${SHA}', '${state}', ${objectId},
            ${col("ready", "now()", "null")}, ${col("expired", basis, "null")}, ${col("unknown", basis, "null")},
            ${col("missing", "'object_absent'", "null")}, ${col("reserved", basis, "now()")}, ${col("missing", basis, "now()")});\n`;
  return { id, user, path, sql };
}
/** 삭제 예약 한 행. of = 자산(없으면 자산 행이 없는 고아 예약). updated·parked·claimed는 SQL 식(문자열) */
function deletion(state, { of, user = USER(1), attempts = 0, updated = "now()", parked = "null", claimed = "now()" } = {}) {
  const id = of ? of.id : nextId("10000000");
  const owner = of ? of.user : user;
  const path = of ? of.path : `${owner}/generated/${id}.png`;
  const token = nextId("30000000");
  const sql = `insert into public.aif_asset_deletions (asset_id, user_id, bucket, path, state, fencing_token, attempts, claimed_at, updated_at, parked_at)
    values ('${id}', '${owner}', 'aif-assets', '${path}', '${state}', '${token}', ${attempts}, ${claimed}, ${updated}, ${parked});\n`;
  return { id, user: owner, path, token, sql };
}
const reset = () => q(`truncate public.aif_asset_deletions, public.aif_assets, public.profiles cascade;`);
/**
 * 한 거래에서: 행을 심고(관리 권한) → 서비스 역할로 바꿔 집계를 부른다. 같은 거래이므로 심을 때의 now()와 집계의 as_of가 같다(경계 값을 정확히 볼 수 있다).
 * cap: 숫자·"null"·undefined(인자 생략 → 기본값).
 */
function summarize(setup = "", cap) {
  const arg = cap === undefined ? "" : String(cap);
  const out = q(`begin;\n${setup}\nset local role service_role;\nselect public.aif_asset_stuck_summary(${arg});\ncommit;`);
  return JSON.parse(out.split("\n").filter(Boolean).pop());
}
const ZERO = { lt_1h: 0, lt_1d: 0, lt_7d: 0, ge_7d: 0, no_basis: 0 };
const age = (over = {}) => ({ ...ZERO, ...over });
const sumAge = (a) => a.lt_1h + a.lt_1d + a.lt_7d + a.ge_7d + a.no_basis;
const ASSET_KEYS = ["expired_open", "missing", "reserved", "unknown_no_object_id", "unknown_with_object_id"];
const DELETION_KEYS = ["claimed", "delete_failed_gave_up", "delete_unknown", "deleting", "parked"];
const counts = (s) => ({
  assets: Object.fromEntries(ASSET_KEYS.map((k) => [k, s.assets[k].count])),
  deletions: Object.fromEntries(DELETION_KEYS.map((k) => [k, s.deletions[k].count])),
});
const NO_COUNTS = { assets: Object.fromEntries(ASSET_KEYS.map((k) => [k, 0])), deletions: Object.fromEntries(DELETION_KEYS.map((k) => [k, 0])) };

const dockerUp = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], { encoding: "utf8", timeout: 15_000, killSignal: "SIGKILL" });
// docker를 실행하지 못했거나 응답이 없으면 「컨테이너 없음」으로 보고 전체를 건너뛴다(DB를 만들지 않는다)
const AVAILABLE = !dockerUp.error && dockerUp.status === 0 && (dockerUp.stdout ?? "").trim() === "true";
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
  q(P3);
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
t("컴파일: A1 → P2 뒤에 P3 파일이 적용되고 함수 14개·색인 1개가 되며 기존 표·함수는 그대로다", (ctx) => {
  ctx.diagnostic(`역할 사전 확인(이름:로그인:슈퍼유저:RLS우회) ${rolePreflight.replace(/\n/g, " ")} · 시험 DB ${DB} oid=${createdOid}`);
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%';`), "14");
  assert.equal(q(`select pg_get_function_identity_arguments(p.oid) || ' -> ' || pg_get_function_result(p.oid) || ' | ' || p.provolatile || ' | ' || p.pronargdefaults
                  from pg_proc p where p.proname = 'aif_asset_stuck_summary';`), "p_cap integer -> jsonb | s | 1");
  const idx = q(`select indexdef from pg_indexes where schemaname='public' and indexname='aif_asset_deletions_parked_idx';`);
  assert.match(idx, /\(parked_at\)/);
  assert.match(idx, /WHERE \(parked_at IS NOT NULL\)/);
  // P3 파일은 열을 더하지 않는다(P2까지의 열 수 그대로)
  assert.equal(q(`select (select count(*) from information_schema.columns where table_schema='public' and table_name='aif_assets') || '|' ||
                         (select count(*) from information_schema.columns where table_schema='public' and table_name='aif_asset_deletions');`), "18|10");
  // 함수 본문에 쓰기·행 잠금·권고 잠금·저장소 표가 없다(정적 확인. 실제 무변경은 아래 「쓰기 0」 시험이 본다)
  const src = q(`select p.prosrc from pg_proc p where p.proname = 'aif_asset_stuck_summary';`).toLowerCase();
  for (const word of ["insert ", "update ", "delete from", "for update", "for share", "pg_advisory", "storage.objects", "truncate"]) {
    assert.equal(src.includes(word), false, `함수 본문에 ${word.trim()} 없음`);
  }
});

t("권한: security definer·search_path 고정·service_role 전용 — 회원·비로그인 역할은 실행할 수 없다", () => {
  const [authd, anon, service, secdef, config] = q(`select has_function_privilege('authenticated', p.oid, 'execute'), has_function_privilege('anon', p.oid, 'execute'),
      has_function_privilege('service_role', p.oid, 'execute'), p.prosecdef, p.proconfig::text from pg_proc p where p.proname = 'aif_asset_stuck_summary';`).split("|");
  assert.deepEqual([authd, anon, service, secdef], ["f", "f", "t", "t"]);
  assert.ok(config.includes("search_path=") && !/search_path=[a-z$]/i.test(config), `search_path 고정(빈 값): ${config}`);
  for (const role of ["authenticated", "anon"]) {
    const r = run(`set role ${role}; select public.aif_asset_stuck_summary();`);
    assert.equal(r.ok, false, `${role}는 실행할 수 없어야 한다`);
    assert.match(r.err, /permission denied/);
  }
  // 회원 역할은 표를 직접 읽어도 멈춘 건을 볼 수 없다(A1의 RLS: 본인 ready만, 예약 표는 권한 없음) — 집계 밖의 우회로가 생기지 않았는지
  assert.equal(run(`set role authenticated; select count(*) from public.aif_asset_deletions;`).ok, false);
});

// ───────────── 모양 ─────────────
t("빈 표: 열 개 범주가 모두 0·capped false·구간 0이고, 축을 넘는 합계 키는 없다", () => {
  reset();
  const s = summarize();
  assert.deepEqual(Object.keys(s).sort(), ["as_of", "assets", "cap", "deletions", "version"]);
  assert.deepEqual([s.version, s.cap], [1, 2000], "인자를 생략하면 기본값 2000");
  assert.deepEqual(Object.keys(s.assets).sort(), ASSET_KEYS);
  assert.deepEqual(Object.keys(s.deletions).sort(), DELETION_KEYS);
  for (const k of ASSET_KEYS) assert.deepEqual(s.assets[k], { count: 0, capped: false, age: ZERO }, k);
  for (const k of DELETION_KEYS.filter((k) => k !== "delete_unknown")) assert.deepEqual(s.deletions[k], { count: 0, capped: false, age: ZERO }, k);
  assert.deepEqual(s.deletions.delete_unknown, { count: 0, capped: false, since_expired: ZERO, last_checked: ZERO });
});

t("기준시각: as_of는 그 거래의 now() 하나다", () => {
  reset();
  // 비교는 DB 안에서 한다(문자열 시각을 시험 쪽에서 해석하지 않는다)
  assert.equal(q(`begin; set local role service_role; select (public.aif_asset_stuck_summary() ->> 'as_of')::timestamptz = now(); commit;`), "t");
  // 거래가 다르면 기준시각도 다르다(고정값이 아니다)
  const first = summarize().as_of; const second = summarize().as_of;
  assert.notEqual(first, second);
});

// ───────────── 범주 ─────────────
t("범주별 정확 건수: 열 개 범주에 한 건씩, 세지 않는 행은 어디에도 잡히지 않는다", () => {
  reset();
  const parts = [];
  const add = (x) => { parts.push(x.sql); return x; };
  // 자산 축 다섯
  add(asset("reserved"));
  add(asset("unknown", { object: true }));
  add(asset("unknown", { object: false }));
  const exp = add(asset("expired"));
  add(asset("missing"));
  // 예약 축 다섯
  add(deletion("claimed", { of: exp }));                       // 같은 자산이 자산 축 expired_open에도 잡힌다(정상)
  add(deletion("deleting"));
  add(deletion("delete_unknown"));
  add(deletion("delete_failed", { attempts: 5 }));
  add(deletion("cancelled", { parked: "now()" }));
  // 세지 않는 것
  add(asset("ready"));
  add(asset("failed"));
  const done = add(asset("expired"));
  add(deletion("deleted", { of: done }));                      // 삭제가 확정된 expired는 expired_open에서 빠진다
  add(deletion("cancelled"));                                  // 주차되지 않은 cancelled
  add(deletion("delete_failed", { attempts: 4 }));             // 시도 5회 미만
  add(deletion("deleted"));                                    // 고아 deleted
  const s = summarize(parts.join(""));
  assert.deepEqual(counts(s), {
    assets: { expired_open: 1, missing: 1, reserved: 1, unknown_no_object_id: 1, unknown_with_object_id: 1 },
    deletions: { claimed: 1, delete_failed_gave_up: 1, delete_unknown: 1, deleting: 1, parked: 1 },
  });
  for (const k of ASSET_KEYS) { assert.equal(s.assets[k].capped, false); assert.equal(sumAge(s.assets[k].age), s.assets[k].count, k); }
  for (const k of DELETION_KEYS.filter((k) => k !== "delete_unknown")) assert.equal(sumAge(s.deletions[k].age), s.deletions[k].count, k);
  assert.equal(sumAge(s.deletions.delete_unknown.since_expired), 1);
  assert.equal(sumAge(s.deletions.delete_unknown.last_checked), 1);
});

t("나이 구간 경계: 정확히 1시간·24시간·168시간은 위 구간에 들고, 미래·NULL은 no_basis다", () => {
  reset();
  const at = ["now()", "now() - interval '59 minutes 59 seconds'",                 // lt_1h 2건(0, 1시간 직전)
    "now() - interval '1 hour'", "now() - interval '23 hours 59 minutes 59 seconds'", // lt_1d 2건(정확히 1시간, 24시간 직전)
    "now() - interval '24 hours'", "now() - interval '167 hours 59 minutes 59 seconds'", // lt_7d 2건
    "now() - interval '168 hours'", "now() - interval '400 days'",                 // ge_7d 2건
    "now() + interval '1 second'", "null"];                                        // no_basis 2건(미래, 비어 있음)
  const s = summarize(at.map((b) => asset("unknown", { object: false, basis: b }).sql).join(""));
  assert.deepEqual(s.assets.unknown_no_object_id, { count: 10, capped: false, age: { lt_1h: 2, lt_1d: 2, lt_7d: 2, ge_7d: 2, no_basis: 2 } });
  assert.equal(s.assets.unknown_with_object_id.count, 0, "object_id가 없는 unknown은 다른 범주에 섞이지 않는다");
});

t("범주마다 정해진 열을 나이 기준으로 쓴다(다른 시각 열에 끌려가지 않는다)", () => {
  reset();
  const old = "now() - interval '200 hours'";
  const parts = [
    asset("reserved", { basis: old }).sql,          // created_at
    asset("unknown", { object: true, basis: old }).sql,   // unknown_since (created_at·updated_at은 방금)
    asset("expired", { basis: old }).sql,           // expired_at
    asset("missing", { basis: old }).sql,           // updated_at (created_at은 방금)
    deletion("claimed", { updated: old }).sql,      // updated_at (claimed_at은 방금)
    deletion("deleting", { updated: old }).sql,
    deletion("delete_failed", { attempts: 9, updated: old }).sql,
    deletion("cancelled", { parked: old }).sql,     // parked_at (updated_at은 방금)
  ];
  const s = summarize(parts.join(""));
  const want = age({ ge_7d: 1 });
  assert.deepEqual([s.assets.reserved.age, s.assets.unknown_with_object_id.age, s.assets.expired_open.age, s.assets.missing.age], [want, want, want, want]);
  assert.deepEqual([s.deletions.claimed.age, s.deletions.deleting.age, s.deletions.delete_failed_gave_up.age, s.deletions.parked.age], [want, want, want, want]);
});

t("delete_unknown의 나이 두 벌: since_expired는 자산의 만료 시각, last_checked는 예약의 확인 시각 — 고아 예약은 since_expired가 no_basis", () => {
  reset();
  const a = asset("expired", { basis: "now() - interval '30 hours'" });
  const parts = [
    a.sql,
    deletion("delete_unknown", { of: a, updated: "now() - interval '10 minutes'", claimed: "now() - interval '900 hours'" }).sql,
    deletion("delete_unknown", { updated: "now() - interval '2 hours'" }).sql,      // 자산 행이 없는 예약
  ];
  const s = summarize(parts.join(""));
  assert.deepEqual(s.deletions.delete_unknown, {
    count: 2, capped: false,
    since_expired: age({ lt_7d: 1, no_basis: 1 }),     // 30시간 전에 만료 · 자산 없음
    last_checked: age({ lt_1h: 1, lt_1d: 1 }),         // 10분 전 확인 · 2시간 전 확인. 예약을 처음 만든 시각(900시간 전)은 쓰지 않는다
  });
  assert.equal("age" in s.deletions.delete_unknown, false);
});

t("두 축은 따로 센다: 한 자산이 양쪽에 한 번씩 잡히고, 두 축의 건수 사이에 정해진 대소 관계는 없다", () => {
  reset();
  const a = asset("expired");
  let s = summarize(a.sql + deletion("delete_unknown", { of: a }).sql);
  assert.deepEqual(counts(s), { assets: { ...NO_COUNTS.assets, expired_open: 1 }, deletions: { ...NO_COUNTS.deletions, delete_unknown: 1 } });
  // 주차된 예약만 있고 missing 자산은 없는 경우(고아 예약에 주차 표시)와 그 반대 — 집계는 둘을 연결하지 않는다
  reset();
  s = summarize(deletion("cancelled", { parked: "now()" }).sql);
  assert.deepEqual([s.deletions.parked.count, s.assets.missing.count], [1, 0]);
  reset();
  s = summarize(asset("missing").sql + asset("missing").sql);
  assert.deepEqual([s.deletions.parked.count, s.assets.missing.count], [0, 2]);
});

t("예약 축 안의 배타성: 주차 표시가 있으면 state와 무관하게 parked에만 잡힌다", () => {
  reset();
  const parts = [
    deletion("claimed", { parked: "now()" }).sql,
    deletion("deleting", { parked: "now()" }).sql,
    deletion("delete_unknown", { parked: "now()" }).sql,
    deletion("delete_failed", { attempts: 7, parked: "now()" }).sql,
    deletion("deleted", { parked: "now()" }).sql,
  ];
  const s = summarize(parts.join(""));
  assert.deepEqual(counts(s).deletions, { ...NO_COUNTS.deletions, parked: 5 });
});

// ───────────── 한도 ─────────────
t("한도: 넘은 범주만 count = cap·capped true·구간 null이고 다른 범주는 그대로다", () => {
  reset();
  const parts = [asset("reserved").sql, asset("reserved").sql, asset("reserved").sql,   // 3건 > 한도 2
    asset("missing").sql, asset("missing").sql,                                          // 정확히 2건 = 한도(넘지 않음)
    deletion("delete_unknown").sql, deletion("delete_unknown").sql, deletion("delete_unknown").sql];
  const s = summarize(parts.join(""), 2);
  assert.equal(s.cap, 2);
  assert.deepEqual(s.assets.reserved, { count: 2, capped: true, age: null });
  assert.deepEqual(s.assets.missing, { count: 2, capped: false, age: age({ lt_1h: 2 }) });
  assert.deepEqual(s.deletions.delete_unknown, { count: 2, capped: true, since_expired: null, last_checked: null });
  assert.deepEqual(s.deletions.claimed, { count: 0, capped: false, age: ZERO });
});

t("한도 인자는 예외 없이 1~10000으로 조여진다(NULL·생략은 2000)", () => {
  reset();
  assert.deepEqual([0, -5, 1, 10000, 10001, 2147483647, "null", undefined].map((c) => summarize("", c).cap), [1, 1, 1, 10000, 10000, 10000, 2000, 2000]);
  // 한도 1: 한 건은 넘지 않고, 두 건이면 넘는다
  let s = summarize(asset("reserved").sql, 1);
  assert.deepEqual(s.assets.reserved, { count: 1, capped: false, age: age({ lt_1h: 1 }) });
  s = summarize(asset("reserved").sql, 0);
  assert.deepEqual(s.assets.reserved, { count: 1, capped: true, age: null });
});

// ───────────── 읽기 전용·동시성 ─────────────
t("쓰기 0: 호출 전후 두 표의 모든 행(시스템 열 xmin 포함)이 같다", () => {
  reset();
  const a = asset("expired");
  q([asset("reserved").sql, asset("unknown").sql, a.sql, asset("missing").sql, asset("ready").sql,
     deletion("delete_unknown", { of: a }).sql, deletion("claimed").sql, deletion("cancelled", { parked: "now()" }).sql].join(""));
  const snap = () => q(`select md5(coalesce((select string_agg(x.xmin::text || x::text, '|' order by x.id) from public.aif_assets x), '')) || ':' ||
                               md5(coalesce((select string_agg(d.xmin::text || d::text, '|' order by d.asset_id) from public.aif_asset_deletions d), ''));`);
  const before = snap();
  for (const cap of [undefined, 1, 10000]) summarize("", cap);
  assert.equal(snap(), before);
});

t("2연결: 다른 거래가 권고 잠금·행 잠금을 쥐고 있어도 기다리지 않고, 그 거래의 미커밋 변경은 보이지 않는다", async () => {
  reset();
  const a = asset("reserved");
  q(a.sql);
  // 정리 실행자·업로드 함수가 잡는 것과 같은 권고 잠금(회원 → 자산) + 그 행의 for update + 미커밋 상태 변경
  const holder = runAsync(`set application_name = 'aif_s1'; begin;
    select pg_advisory_xact_lock(hashtext('aif_user:${a.user}')); select pg_advisory_xact_lock(hashtext('aif_asset:${a.id}'));
    select 1 from public.aif_assets where id = '${a.id}' for update;
    update public.aif_assets set state = 'failed', updated_at = now() where id = '${a.id}';
    select pg_sleep(6); rollback;`);
  await sleeping("aif_s1");
  const t0 = Date.now();
  const s = summarize();
  const ms = Date.now() - t0;
  assert.equal(stillSleeping("aif_s1"), "1", "집계가 돌아온 시점에 상대 거래는 아직 잠금을 쥐고 있다");
  assert.ok(ms < 4000, `기다리지 않고 돌아왔다(${ms}ms)`);
  assert.equal(s.assets.reserved.count, 1, "미커밋 변경(failed)은 보이지 않는다");
  const r = await holder;
  assert.equal(r.ok, true, r.err);
});

t("한 스냅샷: 호출한 문장이 시작된 뒤에 커밋된 행은 그 호출의 건수에 들지 않는다", async () => {
  reset();
  // 문장이 먼저 시작되고(스냅샷 확정) 안쪽 pg_sleep이 끝난 뒤에야 집계가 평가된다. 그 사이에 다른 연결이 행을 커밋한다.
  const pending = runAsync(`set application_name = 'aif_s2'; set role service_role;
    select s.z, public.aif_asset_stuck_summary() from (select pg_sleep(4) as z offset 0) s;`);
  await sleeping("aif_s2");
  q(asset("reserved").sql + asset("missing").sql);
  const r = await pending;
  assert.equal(r.ok, true, r.err);
  const during = JSON.parse(r.out.slice(r.out.indexOf("{")));
  assert.deepEqual([during.assets.reserved.count, during.assets.missing.count], [0, 0], "문장 시작 시점의 스냅샷");
  const afterwards = summarize();
  assert.deepEqual([afterwards.assets.reserved.count, afterwards.assets.missing.count], [1, 1]);
});

// ───────────── 비노출 ─────────────
t("식별자 미노출: 반환값에 회원 id·자산 id·객체 id·토큰·경로·버킷이 없고 키는 정해진 것뿐이다", () => {
  reset();
  const a = asset("expired"); const b = asset("unknown", { object: true }); const c = asset("missing");
  const d1 = deletion("delete_unknown", { of: a }); const d2 = deletion("cancelled", { of: c, parked: "now()" }); const d3 = deletion("delete_failed", { attempts: 6 });
  const s = summarize([a, b, c, d1, d2, d3].map((x) => x.sql).join(""));
  const text = JSON.stringify(s);
  assert.doesNotMatch(text, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, "UUID 모양 없음");
  for (const secret of [a.user, a.id, b.id, c.id, d1.token, d2.token, d3.token, a.path, "aif-assets", "generated/", ".png", SHA]) {
    assert.equal(text.includes(secret), false, "심은 값이 반환에 없다");
  }
  // 값은 숫자·불리언·null·기준시각 문자열 하나뿐이다
  const leaves = [];
  const walk = (v, key) => { if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k); else leaves.push([key, v]); };
  walk(s, "");
  for (const [key, v] of leaves) {
    if (key === "as_of") assert.equal(typeof v, "string");
    else assert.ok(typeof v === "number" || typeof v === "boolean" || v === null, `${key}: ${typeof v}`);
  }
  const AGE = Object.keys(ZERO).sort();
  for (const k of ASSET_KEYS) { assert.deepEqual(Object.keys(s.assets[k]).sort(), ["age", "capped", "count"]); assert.deepEqual(Object.keys(s.assets[k].age).sort(), AGE); }
  assert.deepEqual(Object.keys(s.deletions.delete_unknown).sort(), ["capped", "count", "last_checked", "since_expired"]);
  assert.equal(s.deletions.delete_failed_gave_up.count, 1, "시도 횟수는 조건에만 쓰이고 값으로 나오지 않는다");
});

// ───────────── 재적용 ─────────────
t("재적용: P3 파일을 다시 실행해도 성공하고 함수 수·권한·색인·데이터·결과가 그대로다", () => {
  reset();
  const a = asset("expired");
  q(a.sql + deletion("delete_unknown", { of: a }).sql + asset("missing").sql + deletion("cancelled", { parked: "now()" }).sql);
  const before = counts(summarize());
  q(P3);
  q(A1);
  q(P2);
  q(P3);
  assert.deepEqual(counts(summarize()), before);
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%'
                    and has_function_privilege('service_role', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute');`), "14");
  assert.equal(q(`select count(*) from pg_indexes where schemaname='public' and indexname = 'aif_asset_deletions_parked_idx';`), "1");
});
