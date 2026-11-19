// AIF 정책 조회 대조 시험 (2026-11-19, CC-SNS-01, Master msg_3bdadb79cff0).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — docs/analysis-ai-influencer-20261118/W00_BASELINE.md에 적는다.
// 왜 만들었나: D2-IT(a1_it_runtime)에서 「정책 행이 없는 회원이 무제한으로 허용된다」가 나왔다. 그때의 정책 함수는 대역이었다.
//   여기서는 **중앙 정책 함수 member_storage_policy의 실제 정의**(루트 supabase/migrations/0068_storage_posted_retention.sql에서 글자 그대로 잘라 옴)를 쓴다.
// 하는 일
//   (가) 실제 정의가 네 경우에 무엇을 돌려주는지: 프로필 없음 / 수동 열외(관리자·시험 계정) / free 요금제 행을 읽지 못함 / 유한한 정상 정책
//   (나) 지금의 AIF SQL·생성 경로가 그 네 경우에 무엇을 하는지(현재 동작의 기록)
//   (다) **수정 후보**(이 시험 DB 안에서만 적용 — 제품 SQL·운영에는 적용하지 않았다)를 얹었을 때의 회귀 기대.
//       후보는 정책을 **한 번만** 읽어 판정하고, 사전 검사와 예약(참고 사진·생성 결과 공통)이 그 같은 판정을 쓴다.
//       응답 계약: 한도를 모르면 503(확인 불가), 한도를 알고 모자라면 507(저장공간 부족). 명시 열외·구독·등급·관리자 지정은 지금과 같다.
// 실행: node --test tests/sql/a1_it_policy.test.mjs   (npm test에는 포함되지 않는다)
// 격리: 로컬 Docker 컨테이너 aww-pg-test에 새 DB qa_aif_policy_20261119만 만들고(이미 있으면 중단) 끝나면 그 DB만(oid 일치 확인) 지운다.
//       운영·공유 DB 접속 0. 중앙 함수 파일 수정 0. 실제 저장소·공급자 호출 0.
// ★ 한계
//   * 중앙 함수의 **정의**는 원문이지만, 그 함수가 읽는 표(profiles·storage_plans·subscriptions·pricing_plans·member_grades)는
//     함수가 쓰는 칸만 가진 대역 표다. 운영 표의 제약·기본값·트리거·실제 자료는 여기 없다.
//   * 운영에 적용된 함수가 저장소 0068의 글자와 같은지는 이 시험에서 확인하지 않았다(운영 조회 0).
//   * 함수 호출은 PostgREST를 거치지 않는다(a1_it_runtime과 같은 옮김 규칙). 저장소·공급자는 대역·가짜다.
//   * (다)의 수정 후보는 제안이다. 통과는 「이 후보가 이 네 경우를 가른다」는 뜻이지 채택·적용됐다는 뜻이 아니다.
//   * 후보의 SQL은 파일이다: tests/sql/candidates/aif_quota_state_candidate.sql(적용)·aif_quota_state_rollback.sql(원복). 어느 DB에도 적용된 적이 없고
//     이 시험 DB에서만 실행한다. supabase/migrations/ 밖에 둔 것은 적용 대상으로 읽히지 않게 하려는 것이다.
//   * 「정책을 한 번만 읽는다」는 후보 SQL의 구조(조회 문 하나)로 보장하고 정적으로 확인한다. 두 접속을 겹쳐 도중에 정책이 바뀌는 상황을 실제로 만들어 보지는 않았다.
//   * 「정책 행이 2개」는 중앙 정의로는 만들 수 없어, 그 시험에서만 2행을 돌려주는 대역 함수로 잠시 바꿨다가 원문으로 되돌린다.
//   * 생성 경로·올리기 경로의 권한 판정은 가짜다(회원 번호만 넣는다). 프로필 없는 요청이 실제 진입점까지 오는지는 이 시험의 범위가 아니다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { requireLocalFixtureTarget } from "./_fixtureGuard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = new URL("../../src/", import.meta.url).href;
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

// ── 수정 후보(파일. 이 시험 DB 안에서만 실행) ──
// 뜻: 「한도를 안다(finite)」 「명시적으로 무제한이다(unlimited)」 「모른다(unknown)」를 가른다.
//   * 새 내부 함수 aif_asset_quota_snapshot이 정책을 **조회 문 하나로 한 번만** 읽어 사용량·한도·판정을 함께 돌려준다.
//   * 기존 aif_asset_usage_estimate는 지우지 않는다 — 같은 이름·인자·반환 칸의 감싸개가 된다. 사전 검사·예약도 이름·인자·반환 칸·권한이 그대로다.
//   * unlimited = 정책 행이 정확히 1개 · 한도가 비어 있음 · 출처가 'exempt'. 보관 무기한 칸은 쓰지 않는다.
//   * unknown — 사전 검사: allowed를 비워 돌려준다 → 호출부는 확인 불가(503). 예약: 'QUOTA_UNKNOWN' 오류 → 호출부는 저장 안 됨 확정·업로드 0(올리기 503).
//   * 호출부(TS) 변경 0.
const CAND_DIR = join(HERE, "candidates");
const CANDIDATE = readFileSync(join(CAND_DIR, "aif_quota_state_candidate.sql"), "utf8").replace(/\r\n/g, "\n");
const ROLLBACK = readFileSync(join(CAND_DIR, "aif_quota_state_rollback.sql"), "utf8").replace(/\r\n/g, "\n");
const sqlOnly = (t) => t.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
// 원복 파일에서 세 함수 정의만(사전 확인·helper 삭제 제외) — CRLF 시험 뒤 본문을 LF 원문으로 되돌릴 때만 쓴다
const ROLLBACK_BODIES_LF = (() => {
  const a = ROLLBACK.indexOf("create or replace function public.aif_asset_precheck("), b = ROLLBACK.indexOf("drop function public.aif_asset_quota_snapshot(uuid);");
  if (a < 0 || b < a) throw new Error("원복 파일에서 세 함수 정의 구간을 찾지 못했습니다");
  return ROLLBACK.slice(a, b);
})();
// 정적 확인용: 후보의 실행 문에서 중앙 정책을 읽는 곳은 한 군데뿐이어야 한다
const POLICY_READS_IN_CANDIDATE = sqlOnly(CANDIDATE).split("public.member_storage_policy(").length - 1;
const FNS = ["aif_asset_usage_estimate", "aif_asset_precheck", "aif_asset_reserve"];
/** 함수의 겉모양(인자·반환·성질·권한)과 본문 지문 — 적용 전후·원복 뒤를 견준다 */
const catalog = (names = FNS) => q(`select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') → ' || pg_get_function_result(p.oid) || ' | ' || p.provolatile::text || p.prosecdef::text || ' | ' || coalesce(p.proacl::text, '-') || ' | ' || coalesce(array_to_string(p.proconfig, ','), '-') || ' | 소유 ' || pg_get_userbyid(p.proowner) || ' | oid ' || p.oid
    || ' | 성질 strict=' || p.proisstrict::text || ' parallel=' || p.proparallel::text || ' leakproof=' || p.proleakproof::text || ' cost=' || p.procost::text || ' rows=' || p.prorows::text
    || ' lang=' || (select l.lanname from pg_language l where l.oid = p.prolang) || ' support=' || p.prosupport::text || ' ndefaults=' || p.pronargdefaults::text || ' retset=' || p.proretset::text || ' kind=' || p.prokind::text
    || ' | 실행 가능 ' || (select string_agg(r || '=' || has_function_privilege(r, p.oid, 'execute')::text, ',' order by r) from unnest(array['anon','authenticated','service_role','postgres','public']) r), E'\\n' order by p.proname)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (${names.map((x) => "'" + x + "'").join(",")});`);
const bodies = (names = FNS) => q(`select string_agg(p.proname || ':' || md5(p.prosrc), ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (${names.map((x) => "'" + x + "'").join(",")});`);
const snapshotExists = () => q(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'aif_asset_quota_snapshot';`);
let BEFORE = null;   // 후보 적용 전의 겉모양·본문 지문

const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
register(stub(`
const SRC = ${JSON.stringify(SRC)};
export async function resolve(s, c, n) {
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));
const G = await import("../../src/lib/assets/generation.ts");
const Up = await import("../../src/lib/assets/upload.ts");
const P = await import("../../src/lib/assets/paths.ts");

// 모든 DB 명령은 가드가 확정한 접속 지점·확인한 컨테이너 ID·컨테이너 안 소켓에 고정된 호출로만 보낸다(직접 docker를 부르지 않는다)
const psqlArgs = (db) => TARGET.docker.psqlArgs(db);
function run(sql, db = DB) {
  const r = TARGET.docker.runSync(psqlArgs(db), { input: sql });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) { const r = run(sql, db); assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`); return r.out; }
function pg(sql) {
  return new Promise((resolve) => {
    const p = TARGET.docker.spawn(psqlArgs(DB)); let out = "", err = "";
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
const storage = (log = { n: 0 }) => ({
  log,
  upload: async (path, body, opts) => {
    log.n++;
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
/** 참고 사진 올리기 경로(실제 처리기)를 shadow로 부른다 — 사전 검사 없이 예약으로 바로 가는 길 */
async function upload(user) {
  const rpc = makeRpc(); const st = storage();
  const r = await Up.handlePostAsset(
    new Request("http://local/api/aif/assets", { method: "POST", body: JSON.stringify({ kind: "ref_face", image: IMAGE }), headers: { "content-type": "application/json" } }),
    { mode: "shadow", checkAccess: async () => ({ allowed: true, user: { id: user } }), getAssetDeps: () => ({ rpc, storage: st }) });
  const body = r.body ?? {};
  return `${r.status}:${body.code ?? "저장 " + body.assetSaved}|올리기 ${st.log.n}|${rpc.calls.join("→")}`;
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
  brim: "00000000-0000-4000-8000-0000000000a7",       // 일반 회원, 남은 용량 10바이트(작은 참고 사진도 넘친다)
  grade: "00000000-0000-4000-8000-0000000000a8",      // 등급에 붙은 요금제(라이트 1GB)
  adminRet: "00000000-0000-4000-8000-0000000000a9",   // 관리자 지정이 보관 기간뿐(한도 지정 없음)
};
const GRADE = "00000000-0000-4000-8000-0000000000c1";
const TWO_ROW_STUB = `drop function public.member_storage_policy(uuid);
create function public.member_storage_policy(uid uuid)
returns table (quota_bytes bigint, retention_days integer, unlimited_retention boolean, source text, plan_slug text, plan_name text, plan_expires_at timestamptz, override_until timestamptz, posted_retention_days integer, posted_unlimited boolean)
language sql stable security definer set search_path = '' as $$
  select q, 30, false, 'free'::text, 'free'::text, 'x'::text, null::timestamptz, null::timestamptz, 30, false from (values (524288000::bigint), (1073741824::bigint)) v(q)
$$;
revoke all on function public.member_storage_policy(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_policy(uuid) to service_role;`;
const RESTORE_CENTRAL = `drop function public.member_storage_policy(uuid);\n${CENTRAL_POLICY}`;
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
     insert into public.profiles(id) values ('${U.plain}'), ('${U.full}'), ('${U.sub}'), ('${U.brim}');
     insert into public.member_grades(id, slug, storage_plan_slug) values ('${GRADE}', 'gold', 'lite');
     insert into public.profiles(id, grade_id) values ('${U.grade}', '${GRADE}');
     insert into public.profiles(id, storage_retention_override_days) values ('${U.adminRet}', 90);
     insert into public.member_storage_usage(user_id, bytes) values ('${U.brim}', ${FREE - 10});
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
  assert.equal(policy(U.grade), "1|1073741824|grade|false", "등급 요금제 → 1GB");
  assert.equal(policy(U.adminRet), `1|${FREE}|admin|false`, "관리자 지정이 보관 기간뿐 → 한도는 free 것, 출처는 admin");
  await withoutFree(async () => {
    assert.equal(policy(U.plain), "1|null|free|true", "free 행을 읽지 못하면 → 1행인데 한도가 비고, 출처는 free, 보관은 무기한으로 나온다");
    assert.equal(policy(U.sub), "1|1073741824|subscription|false", "구독이 있으면 구독 한도");
    assert.equal(policy(U.admin), "1|2147483648|admin|true", "관리자 지정 한도는 그대로 — 다만 보관 기간은 free 행에서 오므로 이 회원도 보관 무기한으로 나온다");
    assert.equal(policy(U.exempt), "1|null|exempt|true");
    assert.equal(policy(U.adminRet), "1|null|admin|false", "한도가 비는데 출처가 admin인 경우도 생긴다(보관 기간만 지정한 회원 + free 행 미조회)");
    assert.equal(policy(U.grade), "1|null|free|true", "등급 요금제 회원도 free 행을 읽지 못하면 한도가 빈다(중앙 정의의 비교가 빈 값과의 비교라 등급 한도를 채택하지 않는다)");
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

test("(나-2) 지금의 동작(기록): 참고 사진 올리기는 사전 검사 없이 예약으로 가며, 한도를 모르는 회원도 예약·저장된다", SKIP, async (ctx) => {
  const seen = {};
  seen["프로필 없음"] = await upload(U.none);
  seen["일반(여유)"] = await upload(U.plain);
  seen["일반(남은 10바이트)"] = await upload(U.brim);
  await withoutFree(async () => {
    seen["free 행 못 읽음"] = await upload(U.plain);
    const direct = run("set role service_role; select count(*) from public.aif_asset_reserve('" + U.plain + "', 'ref_face', 'image/png', 'png', 10, '" + "b".repeat(64) + "');");
    assert.equal(direct.ok, true);
    assert.equal(direct.out, "1", "예약 직접 호출: 행 1개가 만들어진다");
  });
  for (const [k, v] of Object.entries(seen)) ctx.diagnostic(`${k}: ${v}`);
  assert.equal(seen["프로필 없음"], "503:ASSET_UNAVAILABLE|올리기 0|reserve", "프로필 없음은 자산 표의 외래 키가 예약을 막는다");
  assert.equal(seen["일반(여유)"], "200:저장 true|올리기 1|reserve→finalize");
  assert.equal(seen["일반(남은 10바이트)"], "507:STORAGE_LIMIT|올리기 0|reserve");
  assert.equal(seen["free 행 못 읽음"], "200:저장 true|올리기 1|reserve→finalize", "한도를 모르는 채 저장된다");
  q(`delete from public.aif_asset_deletions; delete from public.aif_assets; delete from storage.objects;`);
});

test("(다) 수정 후보: 정책을 읽는 곳은 한 군데뿐이고, 판정은 정의의 모든 갈래를 가른다", SKIP, async (ctx) => {
  const exec = sqlOnly(CANDIDATE), back = sqlOnly(ROLLBACK);
  assert.equal(POLICY_READS_IN_CANDIDATE, 1, "후보 전체에서 중앙 정책을 읽는 조회 문은 하나(스냅샷 함수 안)");
  assert.equal(/unlimited_retention/.test(exec), false, "보관 무기한 칸으로 용량 무제한을 판정하지 않는다");
  assert.equal(/\bcascade\b/i.test(exec + back), false, "cascade를 쓰지 않는다");
  assert.equal(/\bdrop\b/i.test(exec), false, "적용 쪽에는 drop이 없다(기존 함수를 지우지 않는다)");
  assert.equal(exec.indexOf("do $$") < exec.indexOf("create or replace function"), true, "적용 전 확인이 첫 함수 정의보다 앞에 있다");
  assert.equal(back.indexOf("do $$") < back.indexOf("create or replace function"), true, "원복 전 확인이 첫 함수 정의보다 앞에 있다");
  assert.deepEqual(back.match(/^drop .*$/gim), ["drop function public.aif_asset_quota_snapshot(uuid);"], "원복 쪽의 drop은 새 함수 하나뿐");
  assert.equal(/\b(alter|create|drop)\s+(table|index|policy|type|schema|trigger|role|extension)\b|\btruncate\b|\bgrant\s+(?!execute on function)|\brevoke\s+(?!all on function)/i.test(exec + back), false, "표·색인·정책·역할을 건드리지 않는다(함수와 그 실행 권한만)");
  // 후보의 문장 종류: begin · 함수 4개 create or replace · 그 실행 권한 회수/부여 · commit
  assert.equal((exec.match(/^create or replace function public\.aif_asset_/gm) ?? []).length, 4);
  assert.equal((exec.match(/^(begin|commit);$/gm) ?? []).join(), "begin;,commit;", "한 트랜잭션으로 적용된다(부분 적용 없음)");
  assert.equal((back.match(/^(begin|commit);$/gm) ?? []).join(), "begin;,commit;");
  assert.equal(/member_storage_policy\s*\(\s*uid/.test(exec + back), false, "중앙 함수를 다시 정의하지 않는다");
  // 적용 전의 겉모양·본문을 적어 둔다
  assert.equal(snapshotExists(), "0");
  BEFORE = { catalog: catalog(), bodies: bodies() };
  // 기존 세 함수의 선언 속성과 실제 실행 가능 역할을 직접 단언한다(전후 비교만으로는 「처음부터 틀린 상태」를 못 잡는다)
  const lines = BEFORE.catalog.split("\n");
  assert.equal(lines.length, 3);
  for (const l of lines) {
    assert.match(l, /\| (s|v)true \| /, "security definer");
    assert.match(l, / \| search_path="" \| 소유 postgres \| /, "빈 search_path · 소유자");
    assert.match(l, /성질 strict=false parallel=u leakproof=false cost=100 rows=1000 lang=plpgsql support=- ndefaults=0 retset=true kind=f/, "선언 속성");
    assert.match(l, /실행 가능 anon=false,authenticated=false,postgres=true,public=false,service_role=true$/, "실제 실행 가능 역할: 서비스 역할(과 소유자)뿐");
  }
  assert.match(lines[0], /^aif_asset_precheck\(p_user uuid, p_est_bytes bigint\) → TABLE\(allowed boolean, used_bytes bigint, quota_bytes bigint\) \| vtrue/);
  assert.match(lines[1], /^aif_asset_reserve\(p_user uuid, p_kind text, p_mime text, p_ext text, p_bytes bigint, p_sha256 text\) → TABLE\(asset_id uuid, path text\) \| vtrue/);
  assert.match(lines[2], /^aif_asset_usage_estimate\(p_user uuid\) → TABLE\(used_bytes bigint, quota_bytes bigint, measured_at timestamp with time zone\) \| strue/);

  // ── 적용 전 가드 1: 같은 이름의 남의 함수가 있으면 덮어쓰지 않고 멈춘다. 원복도 그것을 지우지 않는다 ──
  const foreign = [
    ["같은 인자의 남의 함수", `create function public.aif_asset_quota_snapshot(p_user uuid) returns integer language sql as $f$ select 42 $f$;`, "public.aif_asset_quota_snapshot(uuid)"],
    ["인자가 다른 같은 이름", `create function public.aif_asset_quota_snapshot(p_name text) returns integer language sql as $f$ select 43 $f$;`, "public.aif_asset_quota_snapshot(text)"],
    ["남이 다른 설명을 붙인 함수", `create function public.aif_asset_quota_snapshot(p_user uuid) returns integer language sql as $f$ select 44 $f$; comment on function public.aif_asset_quota_snapshot(uuid) is 'someone else';`, "public.aif_asset_quota_snapshot(uuid)"],
  ];
  for (const [name, make, sig] of foreign) {
    q(make);
    const mine = q(`select md5(prosrc) || '|' || oid from pg_proc where oid = '${sig}'::regprocedure;`);
    const up = run(CANDIDATE);
    assert.equal(up.ok, false, name);
    assert.match(up.err, /AIF_QUOTA_CANDIDATE_CONFLICT/, name);
    const down = run(ROLLBACK);
    assert.equal(down.ok, false, name);
    assert.match(down.err, /AIF_QUOTA_ROLLBACK_REFUSED/, name);
    assert.equal(q(`select md5(prosrc) || '|' || oid from pg_proc where oid = '${sig}'::regprocedure;`), mine, `${name}: 남의 함수가 그대로다(덮어쓰지도 지우지도 않았다)`);
    assert.equal(bodies(), BEFORE.bodies, `${name}: 세 함수 무변경`);
    assert.equal(catalog(), BEFORE.catalog, name);
    q(`drop function ${sig};`);   // 시험이 만든 대역 함수만 치운다
  }
  assert.equal(snapshotExists(), "0");

  // ── 적용 전 가드 2: 바꿀 함수가 기대한 서명으로 없으면 멈춘다 ──
  q(`alter function public.aif_asset_precheck(uuid, bigint) rename to aif_asset_precheck_moved;`);
  try {
    const up = run(CANDIDATE);
    assert.equal(up.ok, false);
    assert.match(up.err, /AIF_QUOTA_CANDIDATE_PRECONDITION/);
    assert.equal(snapshotExists(), "0", "부분 적용 없음");
  } finally { q(`alter function public.aif_asset_precheck_moved(uuid, bigint) rename to aif_asset_precheck;`); }
  assert.equal(catalog(), BEFORE.catalog, "이름을 되돌린 뒤 겉모양이 같다");

  // ── 적용 끝 가드: 호출하는 함수의 소유자가 새 함수를 실행할 수 없으면 전부 취소한다 ──
  // 이 시험 DB 안에서만 사전 검사 함수의 소유자를 회원 역할로 잠시 바꾼다(역할 자체는 만들거나 바꾸지 않는다). 그 역할은 새 함수의 실행 권한이 없다.
  q(`alter function public.aif_asset_precheck(uuid, bigint) owner to authenticated;`);
  try {
    const up = run(CANDIDATE);
    assert.equal(up.ok, false);
    ctx.diagnostic("소유자 불일치 때의 오류: " + up.err.replace(/^[\s\S]*?ERROR:\s*/, "").split("\n")[0]);
    assert.match(up.err, /AIF_QUOTA_CANDIDATE_OWNER/, "적용 끝 확인이 소유자 불일치를 잡아 멈춘다");
    assert.equal(snapshotExists(), "0", "전부 취소 — 새 함수도 남지 않는다");
    assert.equal(bodies(), BEFORE.bodies, "세 함수 본문 무변경");
  } finally { q(`alter function public.aif_asset_precheck(uuid, bigint) owner to postgres;`); }
  assert.equal(catalog(), BEFORE.catalog, "소유자를 되돌린 뒤 겉모양(권한 글 포함)이 처음과 같다");

  q(CANDIDATE);
  assert.equal(q(`select obj_description('public.aif_asset_quota_snapshot(uuid)'::regprocedure, 'pg_proc');`), "AIF quota-state candidate v1 (aif_asset_quota_snapshot)", "표식이 붙었다");
  // 공식 함수 세 개의 이름·인자·반환 칸·성질·권한은 적용 전과 글자까지 같다. 본문만 달라졌다
  assert.equal(catalog(), BEFORE.catalog, "적용 뒤에도 서명·반환형·권한이 그대로다");
  assert.notEqual(bodies(), BEFORE.bodies);
  assert.equal(snapshotExists(), "1");
  assert.match(catalog(["aif_asset_quota_snapshot"]), /aif_asset_quota_snapshot\(p_user uuid\) → TABLE\(used_bytes bigint, quota_bytes bigint, measured_at timestamp with time zone, quota_state text\) \| strue \| \S*service_role=X/, "새 함수: 서비스 역할만 실행");
  assert.equal(/(anon|authenticated|=X\/)/.test(catalog(["aif_asset_quota_snapshot"]).split(" | ")[2].replace(/postgres=X\/postgres|service_role=X\/postgres/g, "")), false, "새 함수에 회원 역할·공개 실행 권한이 없다");
  assert.match(catalog(["aif_asset_quota_snapshot"]), /실행 가능 anon=false,authenticated=false,postgres=true,public=false,service_role=true/, "새 함수의 실제 실행 가능 역할");
  // 새 함수를 부르는 세 함수는 소유자 권한으로 돈다(security definer). 그 소유자들이 새 함수를 실행할 수 있어야 한다
  assert.equal(q(`select string_agg(distinct pg_get_userbyid(p.proowner) || '=' || has_function_privilege(p.proowner, 'public.aif_asset_quota_snapshot(uuid)'::regprocedure, 'execute')::text, ',')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('aif_asset_usage_estimate','aif_asset_precheck','aif_asset_reserve') and p.prosecdef;`), "postgres=true", "호출하는 세 함수의 소유자가 새 함수를 실행할 수 있다");
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('aif_asset_usage_estimate','aif_asset_precheck','aif_asset_reserve','aif_asset_quota_snapshot') and p.prosecdef and p.proconfig = array['search_path=""'];`), "4", "네 함수 모두 security definer + 빈 search_path");
  const state = (u) => q(`set role service_role; select quota_state || '|' || coalesce(quota_bytes::text, 'null') from public.aif_asset_quota_snapshot('${u}');`);
  // 감싸개가 된 기존 추정 함수는 같은 칸 세 개를 같은 값으로 돌려준다
  assert.equal(q(`set role service_role; select (select count(*) from information_schema.columns where false) || '|' || used_bytes || '|' || coalesce(quota_bytes::text, 'null') from public.aif_asset_usage_estimate('${U.plain}');`), `0|0|${FREE}`);
  assert.equal(state(U.none), "unknown|null", "0행");
  assert.equal(state(U.exempt), "unlimited|null", "한도 비어 있음 + 출처 exempt");
  assert.equal(state(U.plain), `finite|${FREE}`);
  assert.equal(state(U.sub), "finite|1073741824");
  assert.equal(state(U.grade), "finite|1073741824");
  assert.equal(state(U.admin), "finite|2147483648");
  assert.equal(state(U.adminRet), `finite|${FREE}`);
  await withoutFree(async () => {
    assert.equal(state(U.plain), "unknown|null", "한도 비어 있음 + 출처 free");
    assert.equal(state(U.adminRet), "unknown|null", "한도 비어 있음 + 출처 admin(exempt가 아닌 다른 출처)");
    assert.equal(state(U.grade), "unknown|null");
    assert.equal(state(U.exempt), "unlimited|null", "수동 열외는 free 행과 무관");
    assert.equal(state(U.sub), "finite|1073741824", "free 행을 읽지 못해도 구독 한도를 아는 회원");
    assert.equal(state(U.admin), "finite|2147483648", "free 행을 읽지 못해도 관리자 지정 한도를 아는 회원");
  });
  // 정책 행이 2개(중앙 정의로는 생기지 않는다 — 대역으로 잠시 바꿔 판정만 본다)
  q(TWO_ROW_STUB);
  try {
    assert.equal(state(U.plain), "unknown|null", "행이 2개면 어느 한도도 믿지 않는다");
    assert.equal(precheck(U.plain), "null|null");
    // 감싸개가 된 기존 추정 함수를 직접 부른다: 행은 1개, 칸은 원래의 3개, 한도는 비어 있다(여러 행 가운데 하나를 골라 주지 않는다)
    assert.equal(q(`set role service_role; select count(*) || '|' || coalesce(max(quota_bytes)::text, 'null') || '|' || (max(used_bytes) >= 0)::text from public.aif_asset_usage_estimate('${U.plain}');`), "1|null|true");
    const direct = run(`set role service_role; select count(*) from public.aif_asset_reserve('${U.plain}', 'ref_face', 'image/png', 'png', 10, '${"f".repeat(64)}');`);
    assert.match(direct.err, /QUOTA_UNKNOWN/, "행이 2개면 예약도 하지 않는다");
  } finally { q(RESTORE_CENTRAL); }
  // 감싸개의 정상 경우: 칸 이름·형이 원래와 같다
  assert.equal(q(`select pg_get_function_result('public.aif_asset_usage_estimate(uuid)'::regprocedure);`), "TABLE(used_bytes bigint, quota_bytes bigint, measured_at timestamp with time zone)");
  assert.equal(state(U.plain), `finite|${FREE}`, "원문으로 되돌린 뒤 정상");
  // 권한: 회원 역할은 네 함수 어느 것도 부르지 못한다
  for (const role of ["authenticated", "anon"]) {
    for (const call of [`public.aif_asset_quota_snapshot('${U.plain}')`, `public.aif_asset_usage_estimate('${U.plain}')`, `public.aif_asset_precheck('${U.plain}', 1)`, `public.aif_asset_reserve('${U.plain}', 'ref_face', 'image/png', 'png', 10, '${"e".repeat(64)}')`]) {
      assert.match(run(`set role ${role}; select * from ${call};`).err, /permission denied/, `${role} ${call.slice(7, 40)}`);
    }
  }
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('aif_asset_usage_estimate','aif_asset_precheck','aif_asset_reserve','aif_asset_quota_snapshot');`), "4", "같은 이름의 함수가 겹쳐 생기지 않았다");
  // 다시 적용해도 같은 상태다(create or replace)
  const once = bodies([...FNS, "aif_asset_quota_snapshot"]);
  q(CANDIDATE);
  assert.equal(bodies([...FNS, "aif_asset_quota_snapshot"]), once);
  assert.equal(catalog(), BEFORE.catalog);
});

test("(다) 생성 경로의 회귀 기대: 모르면 503·생성 0, 모자라면 507·생성 0, 열외·구독·등급·관리자 지정은 지금과 같다", SKIP, async (ctx) => {
  const seen = {};
  for (const [k, u] of [["프로필 없음", U.none], ["수동 열외", U.exempt], ["일반(여유)", U.plain], ["일반(1바이트 부족)", U.full], ["저장 구독", U.sub], ["등급 요금제", U.grade], ["관리자 지정 한도", U.admin], ["관리자 지정(보관 기간만)", U.adminRet]]) {
    seen[k] = [precheck(u), await generate(u)];
  }
  await withoutFree(async () => {
    for (const [k, u] of [["free 못 읽음·일반", U.plain], ["free 못 읽음·보관 기간만 지정", U.adminRet], ["free 못 읽음·구독", U.sub], ["free 못 읽음·관리자 지정 한도", U.admin], ["free 못 읽음·수동 열외", U.exempt]]) {
      seen[k] = [precheck(u), await generate(u)];
    }
  });
  for (const [k, v] of Object.entries(seen)) ctx.diagnostic(`${k}: 사전 검사 ${v[0]} · 경로 ${v[1]}`);
  const OK = /^200\|생성 1\|precheck→reserve→finalize$/;
  const UNKNOWN = "503:ASSET_PRECHECK_UNAVAILABLE|생성 0|precheck";
  // 바뀌는 곳(지금은 생성이 시작된다)
  for (const k of ["프로필 없음", "free 못 읽음·일반", "free 못 읽음·보관 기간만 지정"]) {
    assert.equal(seen[k][0], "null|null", k);
    assert.equal(seen[k][1], UNKNOWN, `바뀜: ${k} → 확인 불가 503·생성 0`);
  }
  // 그대로
  assert.equal(seen["수동 열외"][0], "true|null");
  for (const k of ["수동 열외", "일반(여유)", "저장 구독", "등급 요금제", "관리자 지정 한도", "관리자 지정(보관 기간만)", "free 못 읽음·구독", "free 못 읽음·관리자 지정 한도", "free 못 읽음·수동 열외"]) assert.match(seen[k][1], OK, `그대로: ${k}`);
  assert.equal(seen["일반(1바이트 부족)"][1], "507:STORAGE_LIMIT|생성 0|precheck", "그대로: 한도를 알고 모자라면 507");
  q(`delete from public.aif_asset_deletions; delete from public.aif_assets; delete from storage.objects;`);
});

test("(다) 예약도 같은 판정을 쓴다 — 참고 사진 올리기: 모르면 503·올리기 0, 모자라면 507·올리기 0, 아는 회원은 지금과 같다", SKIP, async (ctx) => {
  const seen = {};
  for (const [k, u] of [["프로필 없음", U.none], ["수동 열외", U.exempt], ["일반(여유)", U.plain], ["일반(남은 10바이트)", U.brim], ["저장 구독", U.sub], ["등급 요금제", U.grade], ["관리자 지정 한도", U.admin]]) seen[k] = await upload(u);
  let directUnknown = null, directOver = null;
  await withoutFree(async () => {
    for (const [k, u] of [["free 못 읽음·일반", U.plain], ["free 못 읽음·보관 기간만 지정", U.adminRet], ["free 못 읽음·구독", U.sub], ["free 못 읽음·수동 열외", U.exempt], ["free 못 읽음·관리자 지정 한도", U.admin], ["free 못 읽음·등급 요금제", U.grade]]) seen[k] = await upload(u);
    directUnknown = run("set role service_role; select count(*) from public.aif_asset_reserve('" + U.plain + "', 'generated', 'image/png', 'png', 10, '" + "c".repeat(64) + "');");
  });
  directOver = run("set role service_role; select count(*) from public.aif_asset_reserve('" + U.brim + "', 'generated', 'image/png', 'png', 11, '" + "d".repeat(64) + "');");
  for (const [k, v] of Object.entries(seen)) ctx.diagnostic(`${k}: ${v}`);
  const OK = "200:저장 true|올리기 1|reserve→finalize";
  const UNKNOWN = "503:ASSET_UNAVAILABLE|올리기 0|reserve";
  assert.equal(seen["프로필 없음"], UNKNOWN, "그대로 503(지금은 외래 키, 후보에서는 판정이 먼저 막는다)");
  for (const k of ["free 못 읽음·일반", "free 못 읽음·보관 기간만 지정", "free 못 읽음·등급 요금제"]) assert.equal(seen[k], UNKNOWN, `바뀜: ${k} → 503·올리기 0`);
  assert.equal(seen["free 못 읽음·관리자 지정 한도"], OK, "그대로: free 행을 읽지 못해도 관리자 지정 한도를 아는 회원은 올리기 성공");
  assert.equal(seen["일반(남은 10바이트)"], "507:STORAGE_LIMIT|올리기 0|reserve", "그대로: 한도를 알고 모자라면 507");
  for (const k of ["수동 열외", "일반(여유)", "저장 구독", "등급 요금제", "관리자 지정 한도", "free 못 읽음·구독", "free 못 읽음·수동 열외"]) assert.equal(seen[k], OK, `그대로: ${k}`);
  // 생성 결과 예약(kind generated)도 같은 함수다 — 오류 글로 두 경우가 갈린다
  assert.equal(directUnknown.ok, false);
  assert.match(directUnknown.err, /QUOTA_UNKNOWN/);
  assert.equal(/STORAGE_LIMIT/.test(directUnknown.err), false, "확인 불가는 저장공간 부족으로 읽히지 않는다");
  assert.equal(directOver.ok, false);
  assert.match(directOver.err, /STORAGE_LIMIT/);
  // 막힌 요청은 자산 행을 남기지 않는다
  assert.equal(q(`select count(*) from public.aif_assets where user_id in ('${U.none}', '${U.brim}', '${U.adminRet}');`), "0");
});

test("(다) 사전 검사를 통과한 뒤 정책이 unknown으로 바뀌면: 생성 결과는 그대로 돌려주고, 예약·올리기·자산 행은 없다", SKIP, async (ctx) => {
  // 유료 생성이 도는 동안(가짜 공급자 안에서) free 요금제 행을 읽지 못하게 만든다 — 사전 검사는 이미 통과한 뒤다
  let n = 0; const rpc = makeRpc(); const st = storage();
  let r;
  try {
    r = await G.handleGenerateImagePost(
      new Request("http://local/api/generate-image", { method: "POST", body: JSON.stringify({ gender: "여성", quality: "1K" }), headers: { "content-type": "application/json" } }),
      { mode: "shadow", checkAccess: async () => ({ allowed: true, user: { id: U.plain } }), getApiKey: async () => "FAKE_KEY",
        generate: async () => { n++; q(`update public.storage_plans set slug = 'free_hidden' where slug = 'free';`); return IMAGE; },
        getAssetDeps: () => ({ rpc, storage: st }) });
  } finally { q(`update public.storage_plans set slug = 'free' where slug = 'free_hidden';`); }
  ctx.diagnostic(`응답 ${JSON.stringify({ status: r.status, keys: Object.keys(r.body).sort(), assetSaved: r.body.assetSaved, assetCode: r.body.assetCode })} · 호출 ${rpc.calls.join("→")} · 올리기 ${st.log.n}`);
  assert.equal(r.status, 200, "직전 생성 응답 계약 유지: 200");
  assert.equal(r.body.success, true);
  assert.equal(r.body.imageUrl, IMAGE, "생성 결과는 그대로 돌려준다");
  assert.equal(n, 1, "생성은 1회 — 다시 생성하지 않는다");
  assert.equal(r.body.assetSaved, false, "저장 안 됨이 확정(불명이 아니다)");
  assert.equal(r.body.assetCode, "RESERVE_FAILED");
  assert.equal("assetId" in r.body, false, "자산 번호를 돌려주지 않는다");
  assert.deepEqual(rpc.calls, ["precheck", "reserve"], "예약에서 끝난다 — 확정·대조 호출 0");
  assert.equal(st.log.n, 0, "올리기 0");
  assert.equal(q(`select count(*) from public.aif_assets where user_id = '${U.plain}' and stored_at is null and state = 'reserved';`), "0", "예약 행이 남지 않았다");
  assert.equal(q(`select count(*) from storage.objects where name like '${U.plain}/generated/%' and created_at > now() - interval '5 seconds';`), "0");
});

test("(라) 원복: 세 함수의 본문이 적용 전과 글자까지 같아지고 새 함수가 사라진다. 원복 뒤 동작은 (나)의 지금 동작과 같다", SKIP, async (ctx) => {
  assert.ok(BEFORE, "적용 전 기록이 있어야 한다");
  q(ROLLBACK);
  assert.equal(bodies(), BEFORE.bodies, "본문 지문이 적용 전과 같다");
  assert.equal(catalog(), BEFORE.catalog, "서명·반환형·권한이 적용 전과 같다");
  assert.equal(snapshotExists(), "0", "새 함수가 없다");
  // 원복 뒤에는 다시 「한도를 모르는 회원도 허용」이다(지금의 동작으로 돌아왔다는 뜻 — 좋은 동작이라는 뜻이 아니다)
  assert.equal(precheck(U.none), "true|null");
  await withoutFree(async () => { assert.equal(precheck(U.plain), "true|null"); });
  assert.equal(precheck(U.full), `false|${FREE}`);
  // 원복을 두 번 하면 두 번째는 「이 후보의 함수가 없다」로 멈추고 아무것도 바꾸지 않는다(트랜잭션 전체 취소)
  const again = run(ROLLBACK);
  assert.equal(again.ok, false);
  assert.match(again.err, /AIF_QUOTA_ROLLBACK_REFUSED/);
  assert.equal(bodies(), BEFORE.bodies);
  assert.equal(catalog(), BEFORE.catalog);
  // 표식이 지워진 함수는 「이 후보의 것」으로 보지 않는다 — 원복이 지우지 않는다
  q(CANDIDATE);
  q(`comment on function public.aif_asset_quota_snapshot(uuid) is null;`);
  const unmarked = run(ROLLBACK);
  assert.equal(unmarked.ok, false);
  assert.match(unmarked.err, /AIF_QUOTA_ROLLBACK_REFUSED/);
  assert.equal(snapshotExists(), "1", "표식 없는 함수는 지우지 않았다");
  assert.equal(precheck(U.none), "null|null", "원복이 거절되면 세 함수도 후보 상태 그대로다(부분 원복 없음)");
  assert.match(run(CANDIDATE).err, /AIF_QUOTA_CANDIDATE_CONFLICT/, "표식이 없으면 재적용도 덮어쓰지 않는다");
  q(`comment on function public.aif_asset_quota_snapshot(uuid) is 'AIF quota-state candidate v1 (aif_asset_quota_snapshot)';`);
  q(ROLLBACK);
  assert.equal(bodies(), BEFORE.bodies);
  assert.equal(snapshotExists(), "0");
  // ── 원복 전 지문 확인: 「이 후보를 적용한 바로 그 상태」가 아니면 아무것도 바꾸지 않는다 ──
  const all4 = [...FNS, "aif_asset_quota_snapshot"];
  const refuses = (name) => {
    const state = bodies(all4) + "#" + catalog(all4);
    const r = run(ROLLBACK);
    assert.equal(r.ok, false, name);
    assert.match(r.err, /AIF_QUOTA_ROLLBACK_REFUSED/, name);
    assert.equal(bodies(all4) + "#" + catalog(all4), state, `${name}: 네 함수의 본문·겉모양·고유번호가 그대로다(덮어쓰지도 지우지도 다시 만들지도 않았다)`);
  };
  const defOf = (sig) => q(`select pg_get_functiondef('${sig}'::regprocedure);`);
  q(CANDIDATE);
  const applied = bodies(all4);
  // 가) 같은 표식이 붙어 있지만 본문이 다른 helper(표식을 복사한 변조)
  const snapDef = defOf("public.aif_asset_quota_snapshot(uuid)");
  q(snapDef.replace("when v_source = 'exempt' then 'unlimited'", "when v_source = 'exempt' or true then 'unlimited'"));
  assert.equal(q(`select obj_description('public.aif_asset_quota_snapshot(uuid)'::regprocedure, 'pg_proc');`), "AIF quota-state candidate v1 (aif_asset_quota_snapshot)", "표식은 그대로 붙어 있다");
  assert.notEqual(bodies(all4), applied);
  refuses("같은 표식의 변조된 helper");
  q(snapDef);
  assert.equal(bodies(all4), applied, "되돌린 뒤 후보 상태");
  // 나) 적용 뒤 다른 작업이 호출부 하나를 고쳤다(세 함수 각각)
  for (const sig of ["public.aif_asset_precheck(uuid, bigint)", "public.aif_asset_reserve(uuid, text, text, text, bigint, text)", "public.aif_asset_usage_estimate(uuid)"]) {
    const def = defOf(sig);
    q(def.replace(/\nbegin\n/, "\nbegin\n  -- changed by someone else after the candidate was applied\n"));
    assert.notEqual(bodies(all4), applied, sig);
    refuses(`적용 뒤 변경된 ${sig.slice(7, 30)}`);
    q(def);
    assert.equal(bodies(all4), applied);
  }
  // 다) 호출부 하나가 없다(이름이 바뀜 = 그 이름으로는 누락) — 원복이 다시 만들지 않는다
  q(`alter function public.aif_asset_reserve(uuid, text, text, text, bigint, text) rename to aif_asset_reserve_gone;`);
  try {
    const r = run(ROLLBACK);
    assert.equal(r.ok, false);
    assert.match(r.err, /AIF_QUOTA_ROLLBACK_REFUSED/);
    assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'aif_asset_reserve';`), "0", "없는 함수를 다시 만들지 않았다");
    assert.equal(snapshotExists(), "1");
  } finally { q(`alter function public.aif_asset_reserve_gone(uuid, text, text, text, bigint, text) rename to aif_asset_reserve;`); }
  assert.equal(bodies(all4), applied);
  // 라) 같은 이름의 함수가 하나 더 생겼다(인자가 다른 것)
  q(`create function public.aif_asset_precheck(p_user uuid) returns boolean language sql as $f$ select true $f$;`);
  try { refuses("겹친 이름의 사전 검사 함수"); } finally { q(`drop function public.aif_asset_precheck(uuid);`); }
  // 마) helper가 같은 이름으로 둘(인자가 다른 것 추가)
  q(`create function public.aif_asset_quota_snapshot(p_name text) returns integer language sql as $f$ select 1 $f$;`);
  try { refuses("겹친 이름의 helper"); } finally { q(`drop function public.aif_asset_quota_snapshot(text);`); }
  assert.equal(bodies(all4), applied);
  // 바) 정상 상태로 돌아오면 원복된다
  q(ROLLBACK);
  assert.equal(bodies(), BEFORE.bodies);
  assert.equal(catalog(), BEFORE.catalog);
  assert.equal(snapshotExists(), "0");
  // 사) 줄 끝이 CRLF인 파일로 적용해도(윈도우 체크아웃) 원복의 지문 확인이 통과한다 — 지문은 CR을 빼고 잰다
  q(CANDIDATE.replace(/\n/g, "\r\n"));
  assert.notEqual(bodies(all4), applied, "카탈로그의 본문 글자는 CR이 들어가 다르다");
  assert.equal(precheck(U.none), "null|null");
  q(ROLLBACK.replace(/\n/g, "\r\n"));
  assert.equal(snapshotExists(), "0");
  assert.equal(precheck(U.none), "true|null", "원문 동작으로 돌아왔다");
  assert.equal(catalog(), BEFORE.catalog);
  q(ROLLBACK_BODIES_LF);   // 다음 단언들이 본문 지문을 LF 기준으로 견주므로, 세 함수를 LF 원문으로 다시 놓는다(시험 DB 안에서만)
  assert.equal(bodies(), BEFORE.bodies);
  // 적용 → 원복 → 다시 적용도 된다
  q(CANDIDATE);
  assert.equal(snapshotExists(), "1");
  assert.equal(precheck(U.none), "null|null");
  q(ROLLBACK);
  assert.equal(bodies(), BEFORE.bodies);
  ctx.diagnostic("적용 → 원복 → 재적용 → 원복 뒤 본문·서명·권한이 적용 전과 같음");
});
