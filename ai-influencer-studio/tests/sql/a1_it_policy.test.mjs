// AIF 정책 조회 대조 시험 (2026-11-19, CC-SNS-01, Master msg_3bdadb79cff0).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — docs/analysis-ai-influencer-20261118/W00_BASELINE.md에 적는다.
// 왜 만들었나: D2-IT(a1_it_runtime)에서 「정책 행이 없는 회원이 무제한으로 허용된다」가 나왔다. 그때의 정책 함수는 대역이었다.
//   여기서는 **중앙 정책 함수 member_storage_policy의 실제 정의**(루트 supabase/migrations/0068_storage_posted_retention.sql에서 글자 그대로 잘라 옴)를 쓴다.
// 하는 일
//   (가) 실제 정의가 네 경우에 무엇을 돌려주는지: 프로필 없음 / 수동 열외(관리자·시험 계정) / free 요금제 행을 읽지 못함 / 유한한 정상 정책
//   (나) 지금의 AIF SQL·생성 경로가 그 네 경우에 무엇을 하는지(현재 동작의 기록)
//   (다) **수정 후보**(이 시험 DB 안에서만 적용 — 제품 SQL·운영에는 적용하지 않았다)를 얹었을 때의 회귀 기대
// 실행: node --test tests/sql/a1_it_policy.test.mjs   (npm test에는 포함되지 않는다)
// 격리: 로컬 Docker 컨테이너 aww-pg-test에 새 DB qa_aif_policy_20261119만 만들고(이미 있으면 중단) 끝나면 그 DB만(oid 일치 확인) 지운다.
//       운영·공유 DB 접속 0. 중앙 함수 파일 수정 0. 실제 저장소·공급자 호출 0.
// ★ 한계
//   * 중앙 함수의 **정의**는 원문이지만, 그 함수가 읽는 표(profiles·storage_plans·subscriptions·pricing_plans·member_grades)는
//     함수가 쓰는 칸만 가진 대역 표다. 운영 표의 제약·기본값·트리거·실제 자료는 여기 없다.
//   * 운영에 적용된 함수가 저장소 0068의 글자와 같은지는 이 시험에서 확인하지 않았다(운영 조회 0).
//   * 함수 호출은 PostgREST를 거치지 않는다(a1_it_runtime과 같은 옮김 규칙). 저장소·공급자는 대역·가짜다.
//   * (다)의 수정 후보는 제안이다. 통과는 「이 후보가 이 네 경우를 가른다」는 뜻이지 채택·적용됐다는 뜻이 아니다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { requireLocalFixtureTarget } from "./_fixtureGuard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = new URL("../../src/", import.meta.url).href;
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_policy_20261119";
const BUCKET = "aif-assets";
const MIG = join(HERE, "..", "..", "supabase", "migrations");
const MIGRATIONS = ["20261118120000_aif_assets_a1.sql", "20261118130000_aif_assets_p2_missing.sql", "20261118140000_aif_assets_p3_summary.sql", "20261119100000_aif_assets_grants_fix.sql"]
  .map((f) => readFileSync(join(MIG, f), "utf8"));

// 중앙 정책 함수의 실제 정의 — 파일에서 글자 그대로 자른다(시작 줄 ~ 권한 부여 줄). 못 찾으면 시험을 시작하지 않는다.
const CENTRAL_FILE = join(HERE, "..", "..", "..", "supabase", "migrations", "0068_storage_posted_retention.sql");
const centralText = readFileSync(CENTRAL_FILE, "utf8").replace(/\r\n/g, "\n");
const START = "create function public.member_storage_policy(uid uuid)";
const END = "grant execute on function public.member_storage_policy(uuid) to service_role;";
const si = centralText.indexOf(START), ei = centralText.indexOf(END);
if (si < 0 || ei < si || centralText.indexOf(START, si + 1) >= 0) throw new Error("0068에서 member_storage_policy 정의를 하나로 찾지 못했습니다 — 시험을 시작하지 않습니다.");
const CENTRAL_POLICY = centralText.slice(si, ei + END.length);

// 대역 표: 중앙 함수가 읽는 칸만. 그 밖(사용량·저장소·auth)은 a1_fixture.sql과 같은 모양.
const TABLES = `
create schema if not exists auth;
create schema if not exists storage;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table public.storage_plans (slug text primary key, name text not null, quota_bytes bigint not null, retention_days integer, posted_retention_days integer);
create table public.member_grades (id uuid primary key, slug text, storage_plan_slug text references public.storage_plans(slug));
create table public.profiles (
  id uuid primary key,
  retention_exempt boolean not null default false,
  retention_exempt_manual boolean not null default false,
  grade_id uuid references public.member_grades(id),
  storage_override_until timestamptz,
  storage_quota_override_bytes bigint,
  storage_retention_override_days integer,
  storage_retention_override_unlimited boolean not null default false
);
create table public.pricing_plans (id uuid primary key, storage_plan_slug text references public.storage_plans(slug));
create table public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null, pricing_plan_id uuid references public.pricing_plans(id), status text not null, expires_at timestamptz);
create table public.member_storage_usage (user_id uuid primary key references public.profiles(id) on delete cascade, bytes bigint not null default 0,
  file_count integer not null default 0, by_bucket jsonb not null default '{}'::jsonb, measured_at timestamptz not null default now());
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null, metadata jsonb, created_at timestamptz default now(), unique (bucket_id, name));
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
grant select on public.profiles to service_role;`;

// ── 수정 후보(이 시험 DB 안에서만) ──
// 뜻: 「한도를 안다(유한)」 「명시적으로 무제한이다」 「모른다」를 가른다. 모르면 사전 검사는 allowed를 비워 돌려준다
//     → 호출부(store.ts precheckGenerated)는 지금도 「참/거짓이 아닌 allowed」를 확인 불가로 읽어 503을 낸다(호출부 코드 변경 0).
//     명시적 무제한 = 정책 행이 정확히 1개이고, 한도가 비어 있고, 출처가 'exempt'(수동 열외)인 경우뿐.
//     근거: 중앙 정의에서 한도가 비는 길은 ① 수동 열외 ② free 요금제 행을 읽지 못함 두 가지다(요금제 표의 한도는 not null, 관리자 지정은 coalesce).
const CANDIDATE = `
create or replace function public.aif_asset_quota_state(p_user uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare n integer; v_quota bigint; v_source text;
begin
  select count(*), max(pol.quota_bytes), max(pol.source) into n, v_quota, v_source from public.member_storage_policy(p_user) pol;
  if n <> 1 then return 'unknown'; end if;
  if v_quota is not null then return 'finite'; end if;
  if v_source = 'exempt' then return 'unlimited'; end if;
  return 'unknown';
end $$;
revoke all on function public.aif_asset_quota_state(uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_quota_state(uuid) to service_role;
create or replace function public.aif_asset_precheck(p_user uuid, p_est_bytes bigint)
returns table (allowed boolean, used_bytes bigint, quota_bytes bigint)
language plpgsql security definer set search_path = '' as $$
declare r record; v_state text;
begin
  if p_est_bytes is null or p_est_bytes <= 0 then raise exception 'INVALID' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  v_state := public.aif_asset_quota_state(p_user);
  select * into r from public.aif_asset_usage_estimate(p_user);
  return query select case v_state when 'unlimited' then true when 'finite' then (r.used_bytes + p_est_bytes <= r.quota_bytes) else null end, r.used_bytes, r.quota_bytes;
end $$;`;

const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
register(stub(`
const SRC = ${JSON.stringify(SRC)};
export async function resolve(s, c, n) {
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));
const G = await import("../../src/lib/assets/generation.ts");
const P = await import("../../src/lib/assets/paths.ts");

const psqlArgs = (db) => ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-At", "-f", "-"];
function run(sql, db = DB) {
  const r = spawnSync("docker", psqlArgs(db), { input: sql, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) { const r = run(sql, db); assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`); return r.out; }
function pg(sql) {
  return new Promise((resolve) => {
    const p = spawn("docker", psqlArgs(DB)); let out = "", err = "";
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
    p.stdin.end(sql);
  });
}
const lit = (v, type) => v === null ? `null::${type}` : typeof v === "number" ? `${v}::${type}` : `'${String(v).replace(/'/g, "''")}'::${type}`;
// 이 시험이 부르는 함수 네 개의 인자 형식·반환 모양(a1_it_runtime의 계약 대조가 카탈로그와 맞춰 본 것)
const SHAPES = {
  aif_asset_precheck: { types: { p_user: "uuid", p_est_bytes: "bigint" }, set: true },
  aif_asset_reserve: { types: { p_user: "uuid", p_kind: "text", p_mime: "text", p_ext: "text", p_bytes: "bigint", p_sha256: "text" }, set: true },
  aif_asset_finalize: { types: { p_asset: "uuid", p_user: "uuid", p_object_id: "uuid" }, set: false },
  aif_asset_reconcile: { types: { p_asset: "uuid", p_user: "uuid", p_expected_object_id: "uuid" }, set: false },
};
function makeRpc() {
  const calls = [];
  const rpc = async (fn, args) => {
    calls.push(fn.replace("aif_asset_", ""));
    const shape = SHAPES[fn];
    if (!shape) return { data: null, error: { message: `시험에 없는 함수 ${fn}` } };
    const call = `public.${fn}(${Object.keys(args).map((k) => `${k} => ${lit(args[k], shape.types[k])}`).join(", ")})`;
    const r = await pg(`set role service_role;\n${shape.set ? `select coalesce(json_agg(x), '[]'::json)::text from ${call} x;` : `select coalesce(to_json(${call})::text, 'null');`}`);
    if (!r.ok) return { data: null, error: { message: r.err.replace(/^[\s\S]*?ERROR:\s*/, "").split("\n")[0] } };
    return { data: JSON.parse(r.out), error: null };
  };
  rpc.calls = calls;
  return rpc;
}
const storage = () => ({
  upload: async (path, body, opts) => {
    const r = await pg(`insert into storage.objects(bucket_id, name, metadata) values ('${BUCKET}', ${lit(path, "text")}, ${lit(JSON.stringify({ size: body.length, mimetype: opts.contentType }), "jsonb")}) returning id;`);
    return r.ok ? { data: { id: r.out.split("\n")[0], path }, error: null } : { data: null, error: { message: r.err.split("\n")[0] } };
  },
});
const IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const EST_1K = P.estimatedGeneratedBytes("1K");
/** 기존 생성 경로를 shadow로 부른다. 공급자는 가짜 — 불린 횟수가 「유료 호출」 수다 */
async function generate(user) {
  let n = 0; const rpc = makeRpc();
  const r = await G.handleGenerateImagePost(
    new Request("http://local/api/generate-image", { method: "POST", body: JSON.stringify({ gender: "여성", quality: "1K" }), headers: { "content-type": "application/json" } }),
    { mode: "shadow", checkAccess: async () => ({ allowed: true, user: { id: user } }), getApiKey: async () => "FAKE_KEY", generate: async () => { n++; return IMAGE; }, getAssetDeps: () => ({ rpc, storage: storage() }) });
  return `${r.status}${r.body.code ? ":" + r.body.code : ""}|생성 ${n}|${rpc.calls.join("→")}`;
}
/** 중앙 정책 함수가 돌려주는 것: 행 수 | 한도 | 출처 | 보관 무기한 */
const policy = (u) => q(`set role service_role; select count(*) || '|' || coalesce(max(quota_bytes)::text, 'null') || '|' || coalesce(max(source), '-') || '|' || coalesce(bool_or(unlimited_retention)::text, '-') from public.member_storage_policy('${u}');`);
const precheck = (u) => q(`set role service_role; select coalesce(allowed::text, 'null') || '|' || coalesce(quota_bytes::text, 'null') from public.aif_asset_precheck('${u}', ${EST_1K});`);

const FREE = 524288000;   // 0067: 일반 회원 500MB
const U = {
  none: "00000000-0000-4000-8000-0000000000a1",       // 프로필 없음
  exempt: "00000000-0000-4000-8000-0000000000a2",     // 수동 열외(관리자·시험 계정)
  plain: "00000000-0000-4000-8000-0000000000a3",      // 일반 회원(free)
  full: "00000000-0000-4000-8000-0000000000a4",       // 일반 회원, 한도까지 1K 한 장이 1바이트 모자람
  sub: "00000000-0000-4000-8000-0000000000a5",        // 저장 구독(라이트 1GB)
  admin: "00000000-0000-4000-8000-0000000000a6",      // 관리자 지정 한도
};
const withoutFree = async (fn) => {
  // free 요금제 행을 읽지 못하는 경우를 만든다: 행 이름을 잠시 바꿨다가 되돌린다(이 시험 DB 안에서만)
  q(`update public.storage_plans set slug = 'free_hidden' where slug = 'free';`);
  try { return await fn(); } finally { q(`update public.storage_plans set slug = 'free' where slug = 'free_hidden';`); }
};

// 실행 대상 가드: 로컬 도커 접속 지점·postgres 17 컨테이너·PC 안 포트·서버 버전을 확인한다. 어긋나면 여기서 오류로 멈춘다(DB 명령 0).
const TARGET = requireLocalFixtureTarget();
const AVAILABLE = TARGET.available;
let createdOid = null, dbCreated = false;

before(() => {
  if (!AVAILABLE) return;
  const roles = q(`select count(*) from pg_roles where rolname in ('anon','authenticated','service_role') and not rolcanlogin and not rolsuper;`, "postgres");
  assert.equal(roles, "3", "필요한 역할 3개가 예상 속성으로 있지 않습니다 — 역할을 만들지 않고 중단합니다.");
  assert.equal(q(`select count(*) from pg_database where datname = '${DB}';`, "postgres"), "0", `${DB}가 이미 있습니다 — 건드리지 않고 중단합니다.`);
  q(`create database ${DB};`, "postgres");
  dbCreated = true;
  const oid = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!oid.ok || !/^[0-9]+$/.test(oid.out)) throw new Error(`${DB}를 만들었지만 oid를 확인하지 못했습니다: ${oid.err || oid.out}`);
  createdOid = oid.out;
  q(TABLES);
  q(CENTRAL_POLICY);
  for (const m of MIGRATIONS) q(m);
  q(`insert into public.storage_plans(slug, name, quota_bytes, retention_days, posted_retention_days) values ('free', '일반', ${FREE}, 30, 30), ('lite', '라이트', 1073741824, 30, 90);
     insert into public.pricing_plans(id, storage_plan_slug) values ('00000000-0000-4000-8000-0000000000b1', 'lite');
     insert into public.profiles(id, retention_exempt, retention_exempt_manual) values ('${U.exempt}', true, true);
     insert into public.profiles(id) values ('${U.plain}'), ('${U.full}'), ('${U.sub}');
     insert into public.profiles(id, storage_quota_override_bytes) values ('${U.admin}', 2147483648);
     insert into public.subscriptions(user_id, pricing_plan_id, status, expires_at) values ('${U.sub}', '00000000-0000-4000-8000-0000000000b1', 'active', now() + interval '10 days');
     insert into public.member_storage_usage(user_id, bytes) values ('${U.full}', ${FREE - EST_1K + 1});`);
});

after(() => {
  if (!AVAILABLE || !dbCreated) return;
  if (!createdOid) throw new Error(`[수동 확인 필요] ${DB}를 이 실행이 만들었으나 oid를 확보하지 못해 자동 삭제하지 않았습니다.`);
  const now = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!now.ok) throw new Error(`정리 전 조회 실패 — ${DB}가 남아 있을 수 있습니다: ${now.err}`);
  if (now.out !== createdOid) throw new Error(`${DB}의 oid가 만든 것(${createdOid})과 다릅니다(${now.out || "없음"}) — 지우지 않았습니다.`);
  const drop = run(`drop database ${DB} with (force);`, "postgres");
  if (!drop.ok) throw new Error(`${DB} 삭제 실패(잔존): ${drop.err}`);
  const left = run(`select count(*) from pg_database where datname = '${DB}' or oid = ${createdOid};`, "postgres");
  if (!left.ok || left.out !== "0") throw new Error(`${DB} 삭제를 확인하지 못했습니다(잔존 가능): ${left.err || left.out}`);
});

const SKIP = AVAILABLE ? {} : { skip: TARGET.reason };

test("(가) 중앙 정책 함수의 실제 정의가 돌려주는 것 — 한도가 비는 길은 수동 열외와 「free 행을 읽지 못함」 두 가지다", SKIP, async (ctx) => {
  ctx.diagnostic(`시험 DB ${DB} oid=${createdOid} · 중앙 정의 ${CENTRAL_POLICY.length}자(0068에서 그대로)`);
  assert.equal(policy(U.none), "0|null|-|-", "프로필 없음 → 0행");
  assert.equal(policy(U.exempt), "1|null|exempt|true", "수동 열외 → 1행, 한도 비어 있음, 출처 exempt");
  assert.equal(policy(U.plain), `1|${FREE}|free|false`, "일반 회원 → 500MB");
  assert.equal(policy(U.sub), "1|1073741824|subscription|false", "저장 구독 → 1GB");
  assert.equal(policy(U.admin), "1|2147483648|admin|false", "관리자 지정 → 지정 한도");
  await withoutFree(async () => {
    assert.equal(policy(U.plain), "1|null|free|true", "free 행을 읽지 못하면 → 1행인데 한도가 비고, 출처는 free, 보관은 무기한으로 나온다");
    assert.equal(policy(U.sub), "1|1073741824|subscription|false", "구독이 있으면 구독 한도");
    assert.equal(policy(U.admin), "1|2147483648|admin|true", "관리자 지정 한도는 그대로 — 다만 보관 기간은 free 행에서 오므로 이 회원도 보관 무기한으로 나온다");
    assert.equal(policy(U.exempt), "1|null|exempt|true");
  });
});

test("(나) 지금의 동작(기록): 한도를 모르는 두 경우가 「무제한」과 똑같이 허용돼 유료 생성이 시작된다", SKIP, async (ctx) => {
  const seen = {};
  seen["프로필 없음"] = [precheck(U.none), await generate(U.none)];
  seen["수동 열외"] = [precheck(U.exempt), await generate(U.exempt)];
  seen["일반(여유)"] = [precheck(U.plain), await generate(U.plain)];
  seen["일반(1바이트 부족)"] = [precheck(U.full), await generate(U.full)];
  await withoutFree(async () => { seen["free 행 못 읽음"] = [precheck(U.plain), await generate(U.plain)]; });
  for (const [k, v] of Object.entries(seen)) ctx.diagnostic(`${k}: 사전 검사 ${v[0]} · 경로 ${v[1]}`);
  // 지금 코드의 사실을 그대로 고정한다(이 단언이 깨지면 누군가 동작을 바꾼 것이다)
  assert.equal(seen["프로필 없음"][0], "true|null");
  assert.match(seen["프로필 없음"][1], /^200\|생성 1\|precheck→reserve/, "프로필이 없는데도 생성이 시작된다");
  assert.equal(seen["free 행 못 읽음"][0], "true|null");
  assert.match(seen["free 행 못 읽음"][1], /^200\|생성 1\|/, "한도를 읽지 못했는데도 생성이 시작된다");
  assert.match(seen["수동 열외"][1], /^200\|생성 1\|precheck→reserve→finalize$/);
  assert.match(seen["일반(여유)"][1], /^200\|생성 1\|precheck→reserve→finalize$/);
  assert.equal(seen["일반(1바이트 부족)"][1], "507:STORAGE_LIMIT|생성 0|precheck");
  q(`delete from public.aif_asset_deletions; delete from public.aif_assets; delete from storage.objects;`);
});

test("(다) 수정 후보를 얹은 뒤의 회귀 기대: 모르면 503·생성 0, 명시 무제한과 유한 정책은 지금과 같다", SKIP, async (ctx) => {
  q(CANDIDATE);
  const state = (u) => q(`set role service_role; select public.aif_asset_quota_state('${u}');`);
  assert.deepEqual([state(U.none), state(U.exempt), state(U.plain), state(U.sub), state(U.admin)], ["unknown", "unlimited", "finite", "finite", "finite"]);
  // 회원 역할은 새 함수도 부르지 못한다
  assert.match(run(`set role authenticated; select public.aif_asset_quota_state('${U.plain}');`).err, /permission denied/);
  const seen = {};
  seen["프로필 없음"] = [precheck(U.none), await generate(U.none)];
  seen["수동 열외"] = [precheck(U.exempt), await generate(U.exempt)];
  seen["일반(여유)"] = [precheck(U.plain), await generate(U.plain)];
  seen["일반(1바이트 부족)"] = [precheck(U.full), await generate(U.full)];
  seen["저장 구독"] = [precheck(U.sub), await generate(U.sub)];
  seen["관리자 지정"] = [precheck(U.admin), await generate(U.admin)];
  await withoutFree(async () => {
    assert.equal(state(U.plain), "unknown");
    seen["free 행 못 읽음"] = [precheck(U.plain), await generate(U.plain)];
    seen["free 행 못 읽음·구독 회원"] = [precheck(U.sub), await generate(U.sub)];
    seen["free 행 못 읽음·수동 열외"] = [precheck(U.exempt), await generate(U.exempt)];
  });
  for (const [k, v] of Object.entries(seen)) ctx.diagnostic(`${k}: 사전 검사 ${v[0]} · 경로 ${v[1]}`);
  const OK = /^200\|생성 1\|precheck→reserve→finalize$/;
  const UNKNOWN = "503:ASSET_PRECHECK_UNAVAILABLE|생성 0|precheck";
  assert.equal(seen["프로필 없음"][0], "null|null");
  assert.equal(seen["프로필 없음"][1], UNKNOWN, "바뀌는 곳 1: 프로필 없음 → 확인 불가");
  assert.equal(seen["free 행 못 읽음"][0], "null|null");
  assert.equal(seen["free 행 못 읽음"][1], UNKNOWN, "바뀌는 곳 2: 한도를 읽지 못함 → 확인 불가");
  assert.equal(seen["수동 열외"][0], "true|null");
  assert.match(seen["수동 열외"][1], OK, "그대로: 명시 무제한");
  assert.match(seen["free 행 못 읽음·수동 열외"][1], OK, "그대로: 수동 열외는 free 행과 무관");
  assert.match(seen["일반(여유)"][1], OK, "그대로: 유한 정책 허용");
  assert.equal(seen["일반(1바이트 부족)"][1], "507:STORAGE_LIMIT|생성 0|precheck", "그대로: 유한 정책 부족");
  assert.match(seen["저장 구독"][1], OK);
  assert.match(seen["관리자 지정"][1], OK);
  assert.match(seen["free 행 못 읽음·구독 회원"][1], OK, "그대로: 구독 한도를 아는 회원");
});

test("(다-한계) 후보가 닫지 않는 곳: 예약 함수(aif_asset_reserve)는 사전 검사 없이도 불리며 지금 규칙 그대로다", SKIP, async (ctx) => {
  // 참고 사진 올리기는 사전 검사 없이 예약으로 바로 간다. 후보는 사전 검사만 바꿨으므로 여기는 여전히 열린다 — 기록만 한다.
  const r = run(`set role service_role; select count(*) from public.aif_asset_reserve('${U.none}', 'ref_face', 'image/png', 'png', 10, '${"a".repeat(64)}');`);
  ctx.diagnostic(`프로필 없는 회원의 예약 직접 호출 → ${r.ok ? "행 " + r.out : "오류 " + r.err.replace(/^[\s\S]*?ERROR:\s*/, "").split("\n")[0]}`);
  // 프로필 없음은 자산 표의 외래 키가 막는다(예약 실패). 즉 지금 코드에서 이 경우는 「유료 생성은 시작되고 저장만 실패」다.
  assert.equal(r.ok, false);
  assert.match(r.err, /aif_assets_user_id_fkey/);
  // free 행을 읽지 못하는 경우는 프로필이 있으므로 예약도 통과한다 — 후보(사전 검사만 바꿈)가 닫지 않는 길
  await withoutFree(async () => {
    const open = run("set role service_role; select count(*) from public.aif_asset_reserve('" + U.plain + "', 'ref_face', 'image/png', 'png', 10, '" + "b".repeat(64) + "');");
    ctx.diagnostic("free 행을 읽지 못할 때 일반 회원의 예약 직접 호출 → " + (open.ok ? "예약됨(행 " + open.out + ")" : "오류"));
    assert.equal(open.ok, true, "한도를 모르는 채 예약이 된다(참고 사진 올리기 길)");
  });
});
