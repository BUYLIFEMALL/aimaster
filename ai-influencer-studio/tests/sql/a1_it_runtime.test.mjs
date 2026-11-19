// AIF-20261119-D2-IT 격리 통합 시험 (2026-11-19, CC-SNS-01, Master msg_2b1eb03a7178).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — docs/analysis-ai-influencer-20261118/W00_BASELINE.md에 적는다.
// 왜 만들었나: 지금까지 정리 실행자(src/lib/assets/retention.ts)는 가짜 DB 위에서만, SQL 함수는 psql로 직접만 시험했다(W00_BASELINE §14-AY).
//   둘이 주고받는 함수 이름·인자·응답이 실제로 맞는지는 확인된 적이 없다. 기존 생성 경로(generation.ts)와 사전 검사 함수의 연결도 같다.
// 하는 일
//   (1) 정리 실행자의 실제 코드를 격리 DB의 실제 SQL 함수에 붙여 회차를 돌린다 — 함수 이름·인자·결과, 중단과 실패 뒤 복구.
//   (2) 기존 생성 경로(handleGenerateImagePost, shadow 주입)를 실제 사전 검사·예약·확정 함수에 붙인다 — 허용·507, 장애 503에서 생성(유료 호출) 0.
// 실행: node --test tests/sql/a1_it_runtime.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 대상 SQL(무수정, 운영에 적용한 순서): 20261118120000_aif_assets_a1.sql · …130000_p2_missing.sql · …140000_p3_summary.sql · 20261119100000_aif_assets_grants_fix.sql
// 격리: 새 DB qa_aif_it_20261119만 만들고(이미 있으면 중단) 끝나면 그 DB만(oid 일치 확인) 지운다. 역할을 만들거나 바꾸지 않는다.
//       접속하는 DB는 둘이다: 이 시험 DB, 그리고 관리용 postgres DB(역할·DB 목록 조회와 create/drop database만). 다른 작업의 DB는 읽지도 쓰지도 않는다.
//       장애 시험 하나는 **없는 DB 이름**(qa_aif_it_no_such_db)으로 일부러 접속을 시도해 실패를 받는다(만들지 않는다).
//       실행 대상은 _fixtureGuard.mjs가 먼저 확인한다(로컬 도커 접속 지점 확정 → 컨테이너 지문·ID → 안쪽 소켓). 어긋나면 DB 명령 0으로 멈춘다.
//       aww-pg-test는 **다른 작업과 함께 쓰는** PostgreSQL 컨테이너다. 가드는 「승인된 그 컨테이너인가」를 보고, DB 분리는 고유 이름·기존 DB 거부·oid 대조가 맡는다(두 단계).
//       운영·공유 DB 접속 0. 실제 저장소·실제 공급자 호출 0.
// ★ 한계 — 이 통과가 뜻하지 않는 것
//   * 저장소(storage)는 대역이다: 올리기·지우기는 대역 표 storage.objects의 행을 넣고 지워 흉내 낸다. 실제 Supabase 저장소 호출은 없다.
//   * 회원·정책·중앙 사용량(profiles·member_storage_policy·member_storage_usage)과 측정 함수(member_storage_measure)는 대역이다.
//   * 함수 호출은 PostgREST를 거치지 않는다. 아래 pgRpc가 PostgREST의 규칙(이름 붙은 인자로 함수 찾기 · returns table은 행 배열 · 스칼라는 값 하나 ·
//     raise exception의 글은 error.message)을 **내가 옮겨 적은 것**이다. 옮긴 규칙이 실제와 다르면 여기서의 통과는 운영을 보증하지 않는다.
//   * 목록 조회 세 개(삭제 예약·ready)는 라우트의 조회 조건을 SQL로 옮겨 적었다 — 라우트 파일의 조회 문 자체를 실행한 것이 아니다.
//   * 공급자(유료 생성)는 가짜 함수다. 「유료 호출 0」은 그 가짜가 불린 횟수로 센다.
//   * 계약 대조는 소스에 **글자로 적힌** 호출(「"함수 이름", { 인자 }」 모양과 ...mine 펼침)만 본다. 실행 중에 조립되는 호출·실제 전달 값은 보지 않는다.
//   * 「오류」 사례의 일부는 DB가 낸 오류가 아니라 **응답 자리에 오류 객체를 넣은 것**이다(시험 이름에 「주입」이라고 적었다). 실제 statement timeout·커밋 뒤 응답 유실은 재현하지 않았다.
//   * 복구 시험의 시간은 「즉시」와 「2시간 뒤로 만든 것」 두 시점뿐이다. 1시간 경계의 앞뒤는 보지 않는다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { requireLocalFixtureTarget, EXPECTED } from "./_fixtureGuard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(HERE, "..", "..", "src");
const SRC = new URL("../../src/", import.meta.url).href;
const CONTAINER = EXPECTED.container;   // 글에 쓰는 이름일 뿐이다 — 명령은 가드가 확인한 ID로 간다
const DB = "qa_aif_it_20261119";
const BUCKET = "aif-assets";
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const MIG = join(HERE, "..", "..", "supabase", "migrations");
const MIGRATIONS = ["20261118120000_aif_assets_a1.sql", "20261118130000_aif_assets_p2_missing.sql", "20261118140000_aif_assets_p3_summary.sql", "20261119100000_aif_assets_grants_fix.sql"]
  .map((f) => readFileSync(join(MIG, f), "utf8"));
// 운영 DB에서 본 값(2026-11-19): postgres 소유 public 표의 기본 권한 = anon·authenticated·service_role 각각 전부. 기본 권한은 DB마다 저장된다(이 시험 DB 안에서만).
const PROD_LIKE_DEFAULTS = `alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;`;
// 중앙 측정 함수의 대역 — 운영의 서명(uid uuid)만 맞춘다(운영 카탈로그 조회로 확인한 이름). 본문은 이 시험용이다.
const MEASURE_STUB = `
create function public.member_storage_measure(uid uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.member_storage_usage(user_id, bytes, measured_at)
  select uid, coalesce(sum(coalesce(nullif(o.metadata->>'size', '')::bigint, 0)), 0), now()
  from storage.objects o where o.name like uid::text || '/%'
  on conflict (user_id) do update set bytes = excluded.bytes, measured_at = now();
  return 1;
end $$;
revoke all on function public.member_storage_measure(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_measure(uuid) to service_role;`;

// 소스의 확장자 없는 상대 import와 "@/…"를 .ts로 잇는다(패키지·tsconfig 변경 없이 실제 모듈을 불러오려는 것)
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
register(stub(`
const SRC = ${JSON.stringify(SRC)};
export async function resolve(s, c, n) {
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));
const R = await import("../../src/lib/assets/retention.ts");
const G = await import("../../src/lib/assets/generation.ts");
const P = await import("../../src/lib/assets/paths.ts");
const X = await import("../../src/lib/retentionExempt.ts");

// ── psql ──
// 모든 DB 명령은 가드가 확정한 접속 지점·확인한 컨테이너 ID·컨테이너 안 소켓에 고정된 호출로만 보낸다(직접 docker를 부르지 않는다)
const psqlArgs = (db) => TARGET.docker.psqlArgs(db);
function run(sql, db = DB) {
  const r = TARGET.docker.runSync(psqlArgs(db), { input: sql });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) {
  const r = run(sql, db);
  assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`);
  return r.out;
}
function pg(sql, db = DB) {
  return new Promise((resolve) => {
    const p = TARGET.docker.spawn(psqlArgs(db));
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
    p.stdin.end(sql);
  });
}
const svcOk = (sql) => { const r = run(`set role service_role;\n${sql}`); assert.equal(r.ok, true, `service 호출 실패: ${r.err}\n${sql.slice(0, 200)}`); return r.out; };

// ── PostgREST 규칙을 옮긴 함수 호출 ──
const sigCache = new Map();
async function signatures(fn, db) {
  const key = `${db}|${fn}`;
  if (sigCache.has(key)) return sigCache.get(key);
  const r = await pg(`select coalesce(json_agg(json_build_object(
      'ret', format_type(p.prorettype, null), 'retset', p.proretset, 'names', coalesce(p.proargnames, '{}'),
      'types', coalesce((select array_agg(format_type(u, null) order by o) from unnest(p.proargtypes) with ordinality x(u, o)), '{}'),
      'nargs', p.pronargs, 'ndef', p.pronargdefaults))::text, '[]')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '${fn.replace(/[^a-z0-9_]/g, "")}';`, db);
  if (!r.ok) throw new Error(r.err || "카탈로그 조회 실패");
  const list = JSON.parse(r.out).map((s) => ({ ...s, inNames: s.names.slice(0, s.nargs) }));
  sigCache.set(key, list);
  return list;
}
const lit = (v, type) => v === null ? `null::${type}` : typeof v === "number" || typeof v === "boolean" ? `${v}::${type}` : `'${String(v).replace(/'/g, "''")}'::${type}`;
/** PostgREST처럼: 준 인자 이름이 모두 함수의 입력 이름이고, 기본값 없는 입력을 빠짐없이 줬을 때만 그 함수를 찾는다 */
async function callFn(fn, args, { role = "service_role", db = DB } = {}) {
  let sigs;
  try { sigs = await signatures(fn, db); } catch (e) { return { data: null, error: { message: String(e.message).split("\n")[0] } }; }
  const given = Object.keys(args).filter((k) => args[k] !== undefined);   // JSON으로 보내면 undefined는 빠진다
  const m = sigs.find((s) => given.every((k) => s.inNames.includes(k)) && s.inNames.slice(0, s.nargs - s.ndef).every((k) => given.includes(k)));
  if (!m) return { data: null, error: { code: "PGRST202", message: `Could not find the function public.${fn}(${given.join(", ")}) in the schema cache` } };
  const call = `public.${fn}(${given.map((k) => `${k} => ${lit(args[k], m.types[m.inNames.indexOf(k)])}`).join(", ")})`;
  const sql = m.retset ? `select coalesce(json_agg(x), '[]'::json)::text from ${call} x;` : `select coalesce(to_json(${call})::text, 'null');`;
  const r = await pg(`set role ${role};\n${sql}`, db);
  if (!r.ok) return { data: null, error: { message: r.err.replace(/^[\s\S]*?ERROR:\s*/, "").split("\n")[0] } };
  try { return { data: JSON.parse(r.out), error: null }; } catch { return { data: null, error: { message: "응답을 읽지 못함" } }; }
}
/** 함수 호출 어댑터. intercept(fn, args, n)이 값을 돌려주면 그 값이 응답이 된다(undefined면 실제 DB로 간다) */
function makeRpc({ role = "service_role", db = DB, intercept } = {}) {
  const calls = [];
  const rpc = async (fn, args) => {
    calls.push({ fn, keys: Object.keys(args).filter((k) => args[k] !== undefined).sort().join(",") });
    if (intercept) { const r = intercept(fn, args, calls.length); if (r !== undefined) return r; }
    return callFn(fn, args, { role, db });
  };
  rpc.calls = calls;
  return rpc;
}
const never = () => new Promise(() => {});
async function rows(sql, { role = "service_role", db = DB } = {}) {
  const r = await pg(`set role ${role};\nselect coalesce(json_agg(t), '[]'::json)::text from (${sql}) t;`, db);
  if (!r.ok) return { data: null, error: { message: r.err.replace(/^[\s\S]*?ERROR:\s*/, "").split("\n")[0] } };
  return { data: JSON.parse(r.out), error: null };
}

// ── 대역 저장소 ──
function makeStorage({ removeMode = "delete", uploadMode = "insert" } = {}) {
  const log = { remove: [], upload: [] };
  return {
    log,
    /** 지우기: delete = 대역 표에서 실제로 지운다 / keep = 「성공」이라 답하지만 지우지 않는다 / error = 오류로 답하고 지우지 않는다 */
    remove: async (paths) => {
      log.remove.push(paths.slice());
      if (removeMode === "delete") {
        const r = await pg(`delete from storage.objects where bucket_id = '${BUCKET}' and name in (${paths.map((p) => lit(p, "text")).join(", ")});`);
        return r.ok ? { data: paths.map((name) => ({ name })), error: null } : { data: null, error: { message: r.err } };
      }
      return removeMode === "keep" ? { data: [], error: null } : { data: null, error: { message: "storage unavailable" } };
    },
    /** 올리기: insert = 대역 표에 객체 행을 넣고 그 id를 돌려준다(실제 응답의 id·path 모양) / error = 오류로 답한다 */
    upload: async (path, body, opts) => {
      log.upload.push({ path, bytes: body.length, upsert: opts.upsert });
      if (uploadMode !== "insert") return { data: null, error: { message: "upload failed" } };
      const r = await pg(`insert into storage.objects(bucket_id, name, metadata) values ('${BUCKET}', ${lit(path, "text")}, ${lit(JSON.stringify({ size: body.length, mimetype: opts.contentType }), "jsonb")}) returning id;`);
      return r.ok ? { data: { id: r.out.split("\n")[0], path }, error: null } : { data: null, error: { message: r.err.split("\n")[0] } };
    },
  };
}

// ── 정리 실행자의 의존성: 실제 라우트(src/app/api/aif/assets/cleanup/route.ts)의 조회 조건을 SQL로 옮긴 것 ──
const fakeAdmin = (role = "service_role") => ({
  from: (table) => ({ select: (cols) => ({ eq: (col, val) => rows(`select ${cols} from public.${table} where ${col} = ${val}`, { role }) }) }),
});
function makeDeps({ rpc = makeRpc(), storage = makeStorage(), limits, exemptRole = "service_role" } = {}) {
  const cols = "asset_id, user_id, bucket, path, state, fencing_token, attempts";
  return {
    deps: {
      loadExemptIds: () => X.loadRetentionExemptIdsStrict(fakeAdmin(exemptRole)),   // 실제 함수 — 가짜는 조회 한 줄뿐
      listVerifyPending: (n) => rows(`select ${cols} from public.aif_asset_deletions where state in ('deleting','delete_unknown') order by updated_at asc limit ${n}`),
      listDeletePending: (n) => rows(`select ${cols} from public.aif_asset_deletions where state in ('cancelled','delete_failed','claimed') and parked_at is null order by updated_at asc limit ${n}`),
      listReady: (n) => rows(`select a.id, a.user_id, a.state, a.bucket, a.path, json_build_object('retention_exempt', p.retention_exempt) as profiles
                              from public.aif_assets a join public.profiles p on p.id = a.user_id where a.state = 'ready' and p.retention_exempt = false order by a.created_at asc limit ${n}`),
      scanMissing: (scanLimit, limit) => rpc("aif_asset_missing_scan", { p_scan_limit: scanLimit, p_limit: limit }),
      rpc,
      remove: (paths) => storage.remove(paths),
      ...(limits ? { limits } : {}),
    },
    rpc, storage,
  };
}

// ── 자료 만들기 ──
const SHA = "a".repeat(64);
let userSeq = 0;
/** 새 회원. quota null = 무제한, days null = 자동 삭제 없음 */
function mkUser({ quota = null, exempt = false, days = 30, unlimited = false, measuredBytes, policy = true } = {}) {
  userSeq += 1;
  const id = `00000000-0000-4000-8000-${String(userSeq).padStart(12, "0")}`;
  q(`insert into public.profiles(id, retention_exempt) values ('${id}', ${exempt});
     ${policy ? `insert into public.qa_quota(user_id, quota_bytes, retention_days, unlimited_retention) values ('${id}', ${quota === null ? "null" : quota}, ${days === null ? "null" : days}, ${unlimited});` : ""}
     ${measuredBytes !== undefined ? `insert into public.member_storage_usage(user_id, bytes, measured_at) values ('${id}', ${measuredBytes}, now());` : ""}`);
  return id;
}
/** ready 자산 한 건: 실제 예약 함수 → 대역 객체 → 실제 확정 함수 → 객체 생성 시각을 ageDays일 전으로 */
function mkReady(user, { bytes = 10, ageDays = 31 } = {}) {
  const [id, path] = svcOk(`select asset_id || '|' || path from public.aif_asset_reserve('${user}', 'generated', 'image/png', 'png', ${bytes}, '${SHA}');`).split("|");
  const oid = q(`insert into storage.objects(bucket_id, name, metadata) values ('${BUCKET}', '${path}', '${JSON.stringify({ size: bytes })}'::jsonb) returning id;`);
  assert.equal(svcOk(`select public.aif_asset_finalize('${id}', '${user}', '${oid}');`), "ready");
  q(`update storage.objects set created_at = now() - interval '${ageDays} days' where id = '${oid}';`);
  return { id, path, oid, user };
}
const assetState = (a) => q(`select state from public.aif_assets where id = '${a.id}';`);
const delState = (a) => q(`select coalesce((select state from public.aif_asset_deletions where asset_id = '${a.id}'), '없음');`);
const objectExists = (a) => q(`select count(*) from storage.objects where bucket_id = '${BUCKET}' and name = '${a.path}';`) === "1";
const snapshot = () => q(`select coalesce((select string_agg(id || ':' || state, ',' order by id) from public.aif_assets), '') || '#' ||
  coalesce((select string_agg(asset_id || ':' || state || ':' || attempts, ',' order by asset_id) from public.aif_asset_deletions), '') || '#' || (select count(*) from storage.objects);`);
/** 앞 시험의 자료가 다음 시험의 회차에 섞이지 않게 비운다(이 시험 DB 안에서만) */
const wipe = () => q(`delete from public.aif_asset_deletions; delete from public.aif_assets; delete from storage.objects; delete from public.member_storage_usage; delete from public.qa_quota; delete from public.profiles;`);
const fnsOf = (rpc) => rpc.calls.map((c) => c.fn.replace("aif_asset_", "").replace("member_storage_", ""));

// ── 준비·정리 ──
// 실행 대상 가드: 로컬 도커 접속 지점·postgres 17 컨테이너·PC 안 포트·서버 버전을 확인한다. 어긋나면 여기서 오류로 멈춘다(DB 명령 0).
const TARGET = requireLocalFixtureTarget();
const AVAILABLE = TARGET.available;
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
  q(`alter table storage.objects alter column created_at drop not null;`);   // 실제 Supabase와 같게(다른 격리 시험과 같은 조정)
  q(PROD_LIKE_DEFAULTS);
  // 대역 표 profiles는 위 기본 권한보다 먼저 만들어져 서비스 역할의 읽기 권한이 없다. 운영에서는 서비스 역할이 읽는다 — 이 시험 DB 안에서만 맞춘다.
  // (anon·authenticated에는 주지 않는다 — 「보호 회원 목록을 읽지 못함」 시험이 그 권한 오류를 쓴다. 운영의 실패 모양과 같다는 뜻은 아니다.)
  q(`grant select on public.profiles to service_role;`);
  for (const m of MIGRATIONS) q(m);
  q(MEASURE_STUB);
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
  if (!left.ok || left.out !== "0") throw new Error(`${DB} 삭제를 확인하지 못했습니다(잔존 가능): ${left.err || left.out}`);
});

const SKIP = AVAILABLE ? {} : { skip: TARGET.reason };

// ═════════ (1) 정리 실행자 ↔ 실제 SQL 함수 ═════════

test("(1) 계약 대조: 소스에 글자로 적힌 호출 모양들이 그 이름·그 인자로 DB에 있고, 실행자가 기대하는 형식으로 돌려준다", SKIP, async (ctx) => {
  ctx.diagnostic(`역할 사전 확인 ${rolePreflight.replace(/\n/g, " ")} · 시험 DB ${DB} oid=${createdOid}`);
  // 소스에서 「"함수 이름", { 인자… }」를 그대로 읽는다 — 소스가 바뀌면 이 대조도 따라 바뀐다
  const files = ["lib/assets/retention.ts", "lib/assets/store.ts", "app/api/aif/assets/cleanup/route.ts"];
  const MINE = ["p_asset", "p_user", "p_token"];
  const found = new Map();
  for (const f of files) {
    const text = readFileSync(join(SRC_DIR, f), "utf8");
    for (const m of text.matchAll(/"((?:aif_asset_|member_storage_)[a-z_]+)",\s*\{([^}]*)\}/g)) {
      const keys = m[2].split(",").map((s) => s.trim()).filter(Boolean).flatMap((s) => (s.startsWith("...mine") ? MINE : [s.split(":")[0].trim()]));
      const k = `${m[1]}(${[...new Set(keys)].sort().join(",")})`;
      if (!found.has(k)) found.set(k, { fn: m[1], keys: [...new Set(keys)], file: f });
    }
  }
  assert.ok(found.size >= 12, `소스에서 읽은 호출 모양이 너무 적다(${found.size}) — 읽는 규칙이 깨졌을 수 있다`);
  // 실행자가 응답을 읽는 방식에서 나온 기대 형식(retention.ts의 text·yes·isCanonicalUuid·isRow, store.ts의 singleRow·문자열 상태)
  const EXPECT = {
    aif_asset_expire: "text", aif_asset_delete_verify: "text", aif_asset_mark_missing: "text", aif_asset_finalize: "text", aif_asset_reconcile: "text",
    aif_asset_delete_mark: "boolean", aif_asset_claim_delete: "uuid", aif_asset_missing_scan: "jsonb",
    aif_asset_precheck: "table", aif_asset_reserve: "table",
  };
  const seen = [];
  for (const { fn, keys, file } of found.values()) {
    const sigs = await signatures(fn, DB);
    assert.equal(sigs.length, 1, `${fn}: 같은 이름의 함수가 ${sigs.length}개(1개여야 인자 이름으로 헷갈리지 않는다) — ${file}`);
    const s = sigs[0];
    for (const k of keys) assert.ok(s.inNames.includes(k), `${fn}: 소스가 보내는 인자 ${k}가 함수에 없다(함수 입력: ${s.inNames.join(",")}) — ${file}`);
    for (const k of s.inNames.slice(0, s.nargs - s.ndef)) assert.ok(keys.includes(k), `${fn}: 기본값 없는 입력 ${k}를 소스가 보내지 않는다(보낸 것: ${keys.join(",")}) — ${file}`);
    const kind = s.retset ? "table" : s.ret;
    if (EXPECT[fn]) assert.equal(kind, EXPECT[fn], `${fn}: 돌려주는 형식이 실행자의 기대와 다르다`);
    seen.push(`${fn}(${keys.join(",")})→${kind}`);
  }
  for (const fn of Object.keys(EXPECT)) assert.ok([...found.values()].some((v) => v.fn === fn), `${fn}: 소스에서 호출을 찾지 못했다`);
  ctx.diagnostic(`대조한 호출 ${seen.length}개: ${seen.sort().join(" · ")}`);
});

test("(1) 권한(표본 3개 함수): 만료 판정·사전 검사·훑기를 회원 역할(authenticated·anon)로 보내면 함수가 거절한다", SKIP, async () => {
  const u = mkUser();
  const a = mkReady(u);
  for (const role of ["authenticated", "anon"]) {
    for (const [fn, args] of [["aif_asset_expire", { p_asset: a.id, p_user: u }], ["aif_asset_precheck", { p_user: u, p_est_bytes: 1 }], ["aif_asset_missing_scan", { p_scan_limit: 10, p_limit: 10 }]]) {
      const r = await callFn(fn, args, { role });
      assert.ok(r.error && /permission denied/i.test(r.error.message), `${role} ${fn}: 거절돼야 한다(받은 것: ${JSON.stringify(r).slice(0, 120)})`);
    }
  }
  assert.equal(assetState(a), "ready");
  wipe();
});

test("(1) 정상 회차: 기간 지난 일반 회원 원본만 지운다 — 호출 순서와 DB의 최종 상태가 계약과 같다", SKIP, async (ctx) => {
  const general = mkUser({ days: 30 });
  const exempt = mkUser({ days: 30, exempt: true });
  const unlimited = mkUser({ days: 30, unlimited: true });
  const old = mkReady(general, { ageDays: 31, bytes: 1000 });
  const fresh = mkReady(general, { ageDays: 5 });
  const kept = mkReady(exempt, { ageDays: 400 });
  const forever = mkReady(unlimited, { ageDays: 400 });
  q(`select public.member_storage_measure('${general}');`);
  const usedBefore = Number(q(`select bytes from public.member_storage_usage where user_id = '${general}';`));

  const { deps, rpc, storage } = makeDeps();
  const r = await R.runRetentionCleanup(deps);
  ctx.diagnostic(`결과 ${JSON.stringify(r)}`);
  assert.equal(r.ok, true);
  assert.equal(r.stopCode, null);
  assert.equal(r.counts.deleted, 1, "지운 것은 1건");
  assert.equal(r.counts.removeCalls, 1, "저장소 지우기 호출은 1회");
  assert.deepEqual(storage.log.remove, [[old.path]], "지운 경로는 그 원본 하나");
  assert.equal(objectExists(old), false);
  assert.equal(delState(old), "deleted");
  assert.equal(assetState(old), "expired", "자산 행은 expired로 남는다(삭제 확정은 예약 표가 기록)");
  // 건드리지 않은 것
  assert.equal(assetState(fresh), "ready"); assert.equal(objectExists(fresh), true); assert.equal(delState(fresh), "없음");
  assert.equal(assetState(kept), "ready"); assert.equal(objectExists(kept), true);
  assert.equal(assetState(forever), "ready"); assert.equal(objectExists(forever), true);
  // 그 원본에 대한 호출 순서: 만료 판정 → 예약 → 같은 토큰 재확인 → deleting 표시 → (지우기) → 확인 → 측정
  const forOld = rpc.calls.filter((c, i) => i >= rpc.calls.findIndex((x) => x.fn === "aif_asset_claim_delete") - 1).map((c) => `${c.fn.replace("aif_asset_", "").replace("member_storage_", "")}[${c.keys}]`);
  assert.deepEqual(forOld.slice(0, 5), ["expire[p_asset,p_user]", "claim_delete[p_asset,p_bucket,p_path,p_user]", "expire[p_asset,p_token,p_user]", "delete_mark[p_asset,p_state,p_token,p_user]", "delete_verify[p_asset,p_token,p_user]"]);
  assert.ok(fnsOf(rpc).includes("measure"), "지운 뒤 측정을 부른다");
  assert.equal(r.counts.measureFailed, 0, "측정 함수가 그 이름·그 인자(uid)로 불린다");
  const usedAfter = Number(q(`select bytes from public.member_storage_usage where user_id = '${general}';`));
  assert.equal(usedBefore - usedAfter, 1000, "측정값이 지운 만큼 줄었다(대역 측정)");
  // 같은 회차를 다시 돌려도 더 지우지 않는다
  const again = makeDeps();
  const r2 = await R.runRetentionCleanup(again.deps);
  assert.equal(r2.counts.removeCalls, 0);
  assert.equal(r2.counts.deleted, 0);
  wipe();
});

test("(1) 지우기 응답을 믿지 않는다: 「성공」이라 답했는데 객체가 남아 있으면 불명으로 두고, 다음 회차는 다시 지우지 않고 확인만 한다", SKIP, async (ctx) => {
  const u = mkUser({ days: 30 });
  const a = mkReady(u, { ageDays: 40 });
  const first = makeDeps({ storage: makeStorage({ removeMode: "keep" }) });
  const r1 = await R.runRetentionCleanup(first.deps);
  ctx.diagnostic(`1회차 ${JSON.stringify(r1.counts)}`);
  assert.equal(r1.counts.removeCalls, 1);
  assert.equal(r1.counts.deleted, 0);
  assert.equal(r1.counts.deleteUnknown, 1);
  assert.equal(delState(a), "delete_unknown");
  assert.equal(objectExists(a), true);
  // 2회차: 객체가 아직 있다 → 확인만, 지우기 0
  const second = makeDeps();
  const r2 = await R.runRetentionCleanup(second.deps);
  assert.equal(r2.counts.removeCalls, 0, "불명 건을 다시 지우지 않는다");
  assert.equal(delState(a), "delete_unknown");
  assert.deepEqual([...new Set(fnsOf(second.rpc).filter((f) => f !== "missing_scan"))], ["delete_verify"], "그 건에 대해 부른 함수는 확인뿐");
  // 객체가 실제로 사라진 뒤(지연 삭제)의 3회차: 확인으로 deleted
  q(`delete from storage.objects where bucket_id = '${BUCKET}' and name = '${a.path}';`);
  const third = makeDeps();
  const r3 = await R.runRetentionCleanup(third.deps);
  assert.equal(r3.counts.removeCalls, 0);
  assert.equal(r3.counts.deleted, 1);
  assert.equal(delState(a), "deleted");
  wipe();
});

test("(1) 실패 뒤 복구 — deleting 표시 응답에 오류를 주입한 회차(DB에는 닿지 않음): 지우기 0·예약 유지, 바로 다음 회차는 건드리지 않고, 2시간 뒤로 만든 회차는 이어서 끝낸다", SKIP, async (ctx) => {
  const u = mkUser({ days: 30 });
  const a = mkReady(u, { ageDays: 40 });
  const broken = makeRpc({ intercept: (fn, args) => (fn === "aif_asset_delete_mark" && args.p_state === "deleting" ? { data: null, error: { message: "connection reset" } } : undefined) });
  const first = makeDeps({ rpc: broken });
  const r1 = await R.runRetentionCleanup(first.deps);
  ctx.diagnostic(`1회차 ${JSON.stringify(r1.counts)}`);
  assert.equal(r1.counts.removeCalls, 0, "deleting이 확인되지 않으면 지우지 않는다");
  assert.equal(r1.counts.markFailed, 1);
  assert.equal(objectExists(a), true);
  assert.equal(delState(a), "claimed", "가로챈 호출은 DB에 닿지 않았으므로 예약은 claimed로 남는다");
  // 바로 다음 회차: 방금 쥔 예약이라 건드리지 않는다
  const soon = makeDeps();
  const r2 = await R.runRetentionCleanup(soon.deps);
  assert.equal(r2.counts.removeCalls, 0);
  assert.equal(delState(a), "claimed");
  assert.equal(objectExists(a), true);
  // 1시간이 지난 것으로 만든 뒤: 이어서 끝낸다
  q(`update public.aif_asset_deletions set updated_at = now() - interval '2 hours' where asset_id = '${a.id}';`);
  const later = makeDeps();
  const r3 = await R.runRetentionCleanup(later.deps);
  ctx.diagnostic(`1시간 뒤 회차 ${JSON.stringify(r3.counts)}`);
  assert.equal(r3.counts.removeCalls, 1);
  assert.equal(r3.counts.deleted, 1);
  assert.equal(delState(a), "deleted");
  assert.equal(objectExists(a), false);
  wipe();
});

test("(1) 중단 뒤 복구 — 삭제 확인 요청을 막아 응답이 오지 않는 회차(요청은 DB에 닿지 않음): 대기를 그만두고 멈추며, 다음 회차가 그 건을 다시 지우지 않고 확인만으로 끝낸다", SKIP, async (ctx) => {
  const u = mkUser({ days: 30 });
  const a = mkReady(u, { ageDays: 40 });
  const b = mkReady(u, { ageDays: 41 });
  const hang = makeRpc({ intercept: (fn) => (fn === "aif_asset_delete_verify" ? never() : undefined) });
  const first = makeDeps({ rpc: hang, limits: { ioTimeoutMs: 4000, timeBudgetMs: 60000, roundDeadlineMs: 120000 } });
  const r1 = await R.runRetentionCleanup(first.deps);
  ctx.diagnostic(`멈춘 회차 ${JSON.stringify({ stopCode: r1.stopCode, counts: r1.counts })}`);
  assert.equal(r1.stopCode, "IO_TIMEOUT");
  assert.equal(r1.counts.removeCalls, 1, "응답이 오지 않은 뒤에는 다음 원본의 삭제를 시작하지 않는다");
  assert.equal(r1.counts.deleted, 0);
  // 회차 집계와 DB 상태는 다른 관측값이다: 집계 deleteUnknown은 「이 회차에 삭제 결과를 확인하지 못한 건수」, DB의 예약 상태는 deleting으로 남는다
  assert.equal(r1.counts.deleteUnknown, 1, "회차 집계: 확인하지 못한 1건");
  assert.equal(r1.counts.timeouts, 1);
  assert.equal(first.storage.log.remove.length, 1);
  const sentPath = first.storage.log.remove[0][0];
  const [sent, other] = sentPath === a.path ? [a, b] : [b, a];
  assert.equal(delState(sent), "deleting", "DB 상태: 지우기를 보낸 건의 예약은 deleting(delete_unknown이 아니다)");
  assert.equal(delState(other), "없음", "다른 건은 손대지 않았다");
  // 다음 회차(정상): 확인만으로 deleted, 그리고 남은 원본을 이어서 지운다
  const next = makeDeps();
  const r2 = await R.runRetentionCleanup(next.deps);
  ctx.diagnostic(`다음 회차 ${JSON.stringify(r2.counts)}`);
  assert.equal(r2.counts.deleted, 2);
  assert.equal(r2.counts.removeCalls, 1, "새 지우기는 한 건뿐");
  assert.deepEqual(next.storage.log.remove, [[other.path]], "다음 회차가 지운 경로는 남아 있던 다른 원본뿐 — deleting으로 남았던 건의 경로는 다시 보내지 않는다");
  assert.deepEqual([delState(a), delState(b)], ["deleted", "deleted"]);
  wipe();
});

test("(1) 묶음 D: 저장소에 객체가 없는 ready 행은 missing이 된다 — 보호 회원 것도, 지우기 호출 없이", SKIP, async (ctx) => {
  const general = mkUser({ days: 30 });
  const exempt = mkUser({ days: 30, exempt: true });
  const gone = mkReady(general, { ageDays: 3 });
  const goneExempt = mkReady(exempt, { ageDays: 3 });
  const present = mkReady(general, { ageDays: 3 });
  q(`delete from storage.objects where name in ('${gone.path}', '${goneExempt.path}');`);
  const { deps, storage } = makeDeps();
  const r = await R.runRetentionCleanup(deps);
  ctx.diagnostic(`결과 ${JSON.stringify(r.counts)}`);
  assert.equal(r.counts.missingScanFailed, 0, "훑기 응답을 실행자가 받아들였다(건수 관계가 맞다)");
  assert.equal(r.counts.markedMissing, 2);
  assert.equal(r.counts.removeCalls, 0);
  assert.deepEqual(storage.log.remove, []);
  assert.deepEqual([assetState(gone), assetState(goneExempt), assetState(present)], ["missing", "missing", "ready"]);
  wipe();
});

test("(1) 보호 회원 목록을 읽지 못하면 회차 전체를 시작하지 않는다 — DB가 그대로다", SKIP, async () => {
  const u = mkUser({ days: 30 });
  mkReady(u, { ageDays: 40 });
  const before = snapshot();
  const { deps, rpc, storage } = makeDeps({ exemptRole: "anon" });   // 회원 역할로는 목록을 읽지 못한다(권한 오류)
  const r = await R.runRetentionCleanup(deps);
  assert.deepEqual({ ok: r.ok, aborted: r.aborted, code: r.code }, { ok: false, aborted: true, code: "EXEMPT_UNAVAILABLE" });
  assert.equal(rpc.calls.length, 0);
  assert.deepEqual(storage.log.remove, []);
  assert.equal(snapshot(), before);
  wipe();
});

test("(1) 요청 처리기: shadow에서는 인증 뒤 실제 회차를 돌려 건수를 돌려주고, off에서는 의존성을 만들지도 않는다", SKIP, async () => {
  const u = mkUser({ days: 30 });
  const a = mkReady(u, { ageDays: 40 });
  const secret = "FAKE_CRON_SECRET_FOR_IT_ONLY_0123456789";
  let made = 0;
  const off = await R.handleCleanupRequest({ mode: "off", secret, authorization: `Bearer ${secret}`, getDeps: () => { made++; return makeDeps().deps; } });
  assert.deepEqual([off.status, off.body, made], [200, { ok: true, skipped: true }, 0]);
  assert.equal(assetState(a), "ready");
  const denied = await R.handleCleanupRequest({ mode: "shadow", secret, authorization: "Bearer wrong", getDeps: () => { made++; return makeDeps().deps; } });
  assert.deepEqual([denied.status, made], [401, 0]);
  const on = await R.handleCleanupRequest({ mode: "shadow", secret, authorization: `Bearer ${secret}`, getDeps: () => { made++; return makeDeps().deps; } });
  assert.equal(on.status, 200);
  assert.equal(on.body.ok, true);
  assert.equal(on.body.counts.deleted, 1);
  assert.equal(made, 1);
  assert.equal(delState(a), "deleted");
  assert.equal(/[0-9a-f]{8}-[0-9a-f]{4}-/.test(JSON.stringify(on.body)), false, "응답에 자산·회원 id가 없다");
  wipe();
});

// ═════════ (2) 기존 생성 경로 ↔ 실제 사전 검사·저장 함수 ═════════

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const IMAGE = "data:image/png;base64," + PNG_B64;
const EST_1K = P.estimatedGeneratedBytes("1K");
const post = (body) => new Request("http://local/api/generate-image", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
/** 기존 생성 경로를 shadow로 부른다. 공급자(유료 생성)는 가짜 — 불린 횟수를 센다 */
async function generate(user, { rpc = makeRpc(), storage = makeStorage(), quality = "1K", timeouts, depsThrows = false } = {}) {
  const n = { generate: 0, deps: 0 };
  const r = await G.handleGenerateImagePost(post({ gender: "여성", quality }), {
    mode: "shadow",
    checkAccess: async () => ({ allowed: true, user: { id: user } }),
    getApiKey: async () => "FAKE_KEY",
    generate: async () => { n.generate++; return IMAGE; },
    getAssetDeps: () => { n.deps++; if (depsThrows) throw new Error("no client"); return { rpc, storage }; },
    ...(timeouts ? { timeouts } : {}),
  });
  return { status: r.status, body: r.body, n, rpc, storage };
}
const assetRows = (user) => q(`select coalesce(string_agg(state, ',' order by created_at), '') from public.aif_assets where user_id = '${user}';`);

test("(2) 허용: 무제한 회원 — 사전 검사 → 생성 1회 → 실제 예약·확정으로 저장, 응답은 기존 모양 + 저장 결과", SKIP, async (ctx) => {
  const u = mkUser({ quota: null });
  const r = await generate(u);
  ctx.diagnostic(`응답 ${JSON.stringify({ status: r.status, keys: Object.keys(r.body).sort(), assetSaved: r.body.assetSaved })} · 호출 ${fnsOf(r.rpc).join(" → ")}`);
  assert.equal(r.status, 200);
  assert.equal(r.n.generate, 1);
  assert.equal(r.body.success, true);
  assert.equal(r.body.imageUrl, IMAGE, "기존 응답의 이미지가 그대로다");
  assert.equal(r.body.assetSaved, true);
  assert.ok(P.isCanonicalUuid(r.body.assetId));
  assert.deepEqual(fnsOf(r.rpc), ["precheck", "reserve", "finalize"], "사전 검사 → 예약 → 확정");
  assert.equal(r.rpc.calls[0].keys, "p_est_bytes,p_user");
  assert.equal(assetRows(u), "ready");
  assert.equal(r.storage.log.upload.length, 1);
  assert.equal(r.storage.log.upload[0].upsert, false);
  wipe();
});

test("(2) 507 경계: 한도 있는 회원 — 남은 용량이 예상 크기와 정확히 같으면 허용, 1바이트 모자라면 생성하지 않는다", SKIP, async (ctx) => {
  const used = 100 * 1024 * 1024;
  const exact = mkUser({ quota: used + EST_1K, measuredBytes: used });
  const short = mkUser({ quota: used + EST_1K - 1, measuredBytes: used });
  const ok = await generate(exact);
  assert.equal(ok.status, 200, "정확히 맞으면 허용");
  assert.equal(ok.n.generate, 1);
  const no = await generate(short);
  ctx.diagnostic(`1바이트 모자람 → ${JSON.stringify({ status: no.status, code: no.body.code, error: no.body.error })} · 호출 ${fnsOf(no.rpc).join(" → ")}`);
  assert.equal(no.status, 507);
  assert.equal(no.body.code, "STORAGE_LIMIT");
  assert.equal(typeof no.body.error, "string");
  assert.equal(no.n.generate, 0, "유료 생성 0");
  assert.deepEqual(fnsOf(no.rpc), ["precheck"], "사전 검사에서 끝난다 — 예약·저장 호출 0");
  assert.equal(assetRows(short), "", "자산 행 0");
  assert.equal(no.storage.log.upload.length, 0);
  assert.equal("imageUrl" in no.body, false);
  wipe();
});

test("(2) 507 뒤 복귀: 한도를 늘리면 같은 회원이 다시 생성된다. 화질이 크면 같은 회원도 막힌다(4K 예상 크기)", SKIP, async () => {
  const used = 10 * 1024 * 1024;
  const u = mkUser({ quota: used + EST_1K, measuredBytes: used });
  const big = await generate(u, { quality: "4K" });
  assert.deepEqual([big.status, big.n.generate], [507, 0], "1K는 들어가지만 4K 예상 크기는 넘는다");
  const small = await generate(u, { quality: "1K" });
  assert.deepEqual([small.status, small.n.generate], [200, 1]);
  // 방금 저장한 원본이 미측정분으로 잡혀 이제 1K도 막힌다(중앙 측정이 아직 그 원본을 모른다)
  const full = await generate(u, { quality: "1K" });
  assert.deepEqual([full.status, full.n.generate], [507, 0], "저장한 원본이 바로 사용량에 잡힌다");
  q(`update public.qa_quota set quota_bytes = quota_bytes + ${EST_1K} where user_id = '${u}';`);
  const back = await generate(u, { quality: "1K" });
  assert.deepEqual([back.status, back.n.generate], [200, 1], "한도를 늘리면 복귀");
  wipe();
});

test("(2) 장애 503: 사전 검사를 확인할 수 없으면 어느 경우에도 생성하지 않는다 — 그리고 장애가 걷히면 복귀한다", SKIP, async (ctx) => {
  const u = mkUser({ quota: null });
  const cases = [
    ["DB에 닿지 않음(없는 DB)", { rpc: makeRpc({ db: "qa_aif_it_no_such_db" }) }],
    ["권한 없는 역할로 호출", { rpc: makeRpc({ role: "authenticated" }) }],
    ["오류 응답 주입(DB가 낸 오류 아님)", { rpc: makeRpc({ intercept: (fn) => (fn === "aif_asset_precheck" ? { data: null, error: { message: "canceling statement due to statement timeout" } } : undefined) }) }],
    ["응답 없음 주입(요청은 DB에 닿지 않음, 상한 0.5초)", { rpc: makeRpc({ intercept: (fn) => (fn === "aif_asset_precheck" ? never() : undefined) }), timeouts: { precheckMs: 500 } }],
    ["응답 주입: 행 2개", { rpc: makeRpc({ intercept: (fn) => (fn === "aif_asset_precheck" ? { data: [{ allowed: true }, { allowed: true }], error: null } : undefined) }) }],
    ["응답 주입: 글자 'true'", { rpc: makeRpc({ intercept: (fn) => (fn === "aif_asset_precheck" ? { data: [{ allowed: "true" }], error: null } : undefined) }) }],
    ["의존성을 만들지 못함", { depsThrows: true }],
  ];
  const seen = [];
  for (const [name, opt] of cases) {
    const r = await generate(u, opt);
    seen.push(`${name}=${r.status}`);
    assert.equal(r.status, 503, name);
    assert.equal(r.body.code, "ASSET_PRECHECK_UNAVAILABLE", name);
    assert.equal(r.n.generate, 0, `${name}: 유료 생성 0`);
    assert.equal(r.storage.log.upload.length, 0, name);
    assert.equal("imageUrl" in r.body, false, name);
  }
  ctx.diagnostic(seen.join(" · "));
  assert.equal(assetRows(u), "", "장애 동안 자산 행 0");
  const back = await generate(u);
  assert.deepEqual([back.status, back.n.generate, back.body.assetSaved], [200, 1, true], "장애가 걷히면 그대로 생성·저장된다");
  wipe();
});

test("(2) 정책 행이 없는 회원: 실제 함수가 돌려주는 대로 — 결과를 기록한다(생성하면 1회, 막으면 0회)", SKIP, async (ctx) => {
  const u = mkUser({ policy: false });
  const direct = await callFn("aif_asset_precheck", { p_user: u, p_est_bytes: EST_1K });
  const r = await generate(u);
  ctx.diagnostic(`정책 행 없음 → 함수 응답 ${JSON.stringify(direct)} · 경로 ${JSON.stringify({ status: r.status, code: r.body.code, generate: r.n.generate })}`);
  assert.ok([200, 503, 507].includes(r.status));
  assert.equal(r.n.generate, r.status === 200 ? 1 : 0, "막힌 경우 유료 생성 0");
  wipe();
});

test("(2) 저장이 실패해도 생성 결과는 그대로다: 올리기 오류(대역) → 200·이미지 유지·assetSaved unknown·UPLOAD_UNKNOWN, 생성 1회·올리기 1회·지우기 0, 행은 정확히 unknown 하나", SKIP, async (ctx) => {
  const u = mkUser({ quota: null });
  const r = await generate(u, { storage: makeStorage({ uploadMode: "error" }) });
  ctx.diagnostic(`응답 ${JSON.stringify({ status: r.status, assetSaved: r.body.assetSaved, assetCode: r.body.assetCode })} · 호출 ${fnsOf(r.rpc).join(" → ")} · 행 ${assetRows(u)}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.imageUrl, IMAGE);
  assert.equal(r.n.generate, 1, "다시 생성하지 않는다");
  assert.equal(r.body.assetSaved, "unknown");
  assert.equal(r.body.assetCode, "UPLOAD_UNKNOWN");
  assert.equal(r.storage.log.upload.length, 1, "다시 올리지 않는다");
  assert.equal(r.storage.log.remove.length, 0, "실패했다고 지우지 않는다");
  assert.equal(assetRows(u), "unknown", "자산 행은 정확히 1개이고 상태는 unknown");
  assert.equal(q("select count(*) from storage.objects;"), "0", "대역 저장소에 객체 0");
  assert.deepEqual(fnsOf(r.rpc), ["precheck", "reserve", "reconcile"], "객체 id를 얻지 못하면 확정 대신 대조 1회");
  wipe();
});
