// W01z aif_assets 회원 역할 권한 정정 SQL 격리 계약 시험 (2026-11-19, CC-SNS-01, Master msg_ee7317b3640a).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — docs/analysis-ai-influencer-20261118/W00_BASELINE.md에 적는다.
// 대상: supabase/migrations/20261119100000_aif_assets_grants_fix.sql (문장 2개).
// 실행: node --test tests/sql/a1_grants.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 하는 일: 새 DB qa_aif_grants_20261119를 만들고(이미 있으면 중단) → a1_fixture.sql(대역, 무변경)
//          → **운영과 같은 public 기본 권한 재현** → A1 → P2 → P3 → (정정 전 상태 확인) → 정정 파일 → (정정 후 상태 확인)
//          → 만든 DB만(oid 일치 확인) 지운다. 다른 DB에는 접속하지 않는다. 역할을 만들거나 속성을 바꾸지 않는다.
// 왜 기본 권한을 재현하나: 2026-11-19 운영 DB에서 본 값 —
//   postgres 소유 public 표의 기본 권한 = anon·authenticated·service_role 각각 arwdDxtm.
//   지금까지의 격리 시험은 이 설정이 없는 대역에서 돌아 「authenticated에 전부가 남는」 문제를 잡지 못했다.
//   기본 권한(pg_default_acl)은 **DB마다** 저장되므로 이 시험 DB 안에서만 바뀐다(클러스터 전역 변경 아님).
// ★ 한계: 재현한 것은 「표」의 기본 권한 하나다. 운영의 다른 기본 권한(함수·시퀀스), 역할 구성, PostgREST를 거친 실제 접근은 재현하지 않는다.
//   대역 DB에서의 통과이지 운영 DB에서의 확인이 아니다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_grants_20261119";
const MIG = join(HERE, "..", "..", "supabase", "migrations");
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const A1 = readFileSync(join(MIG, "20261118120000_aif_assets_a1.sql"), "utf8");
const P2 = readFileSync(join(MIG, "20261118130000_aif_assets_p2_missing.sql"), "utf8");
const P3 = readFileSync(join(MIG, "20261118140000_aif_assets_p3_summary.sql"), "utf8");
const FIX = readFileSync(join(MIG, "20261119100000_aif_assets_grants_fix.sql"), "utf8");
/** 운영 DB에서 관찰한 표 기본 권한을 이 시험 DB에 재현한다(이 DB의 postgres 소유 public 표에만 적용) */
const PROD_LIKE_DEFAULTS = `alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;`;

const psqlArgs = (db) => ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-At", "-f", "-"];
const SYNC_TIMEOUT_MS = 60_000;
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

const PRIVS = ["select", "insert", "update", "delete", "truncate", "references", "trigger"];
/** 그 역할이 그 표에 실제로 가진 권한(직접·상속·PUBLIC을 모두 합친 유효 권한) 목록 */
const effective = (role, table) =>
  q(`select coalesce(string_agg(p, ',' order by ord), '') from unnest(array[${PRIVS.map((p) => `'${p}'`).join(",")}]) with ordinality as t(p, ord)
     where has_table_privilege('${role}', 'public.${table}', p);`);
/** 표의 권한 목록 원문(누구에게 무엇이 직접 부여됐는지) */
const acl = (table) => q(`select coalesce(c.relacl::text, 'null') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = '${table}';`);
const policies = () => q(`select coalesce(string_agg(tablename::text || '/' || policyname::text || '/' || cmd::text || '/' || roles::text || '/' || qual::text, ' ;; ' order by tablename, policyname), 'none')
                           from pg_policies where schemaname = 'public' and tablename in ('aif_assets', 'aif_asset_deletions');`);
const rls = () => q(`select string_agg(c.relname::text || '=' || c.relrowsecurity::text, ',' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                      where n.nspname = 'public' and c.relname in ('aif_assets', 'aif_asset_deletions');`);
const fnPrivs = () => q(`select count(*)::text || '|' || count(*) filter (where has_function_privilege('service_role', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute'))::text
                          from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'aif\\_asset\\_%';`);

const U1 = "00000000-0000-4000-8000-000000000001";
const U2 = "00000000-0000-4000-8000-000000000002";
const A_READY = "10000000-0000-4000-8000-000000000001";
const A_RESERVED = "10000000-0000-4000-8000-000000000002";
const A_OTHER = "10000000-0000-4000-8000-000000000003";
const SHA = "a".repeat(64);
/** 회원 역할로, 그 회원의 로그인 주체를 흉내 내어 실행한다(대역 auth.uid()는 이 설정을 읽는다) */
const asMember = (uid, sql) => run(`set request.jwt.claim.sub = '${uid}'; set role authenticated;\n${sql}`);

const dockerUp = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], { encoding: "utf8", timeout: 15_000, killSignal: "SIGKILL" });
const AVAILABLE = !dockerUp.error && dockerUp.status === 0 && (dockerUp.stdout ?? "").trim() === "true";
let createdOid = null;
let dbCreated = false;
let rolePreflight = "";
let beforeFix = null;

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
  q(PROD_LIKE_DEFAULTS);
  q(A1);
  q(P2);
  q(P3);
  // 시험 행: 회원 1의 ready 한 건과 reserved 한 건, 회원 2의 ready 한 건(관리 권한으로 직접 심는다)
  q(`insert into public.profiles(id) values ('${U1}'), ('${U2}');
     insert into public.aif_assets (id, user_id, kind, ext, mime, path, bytes, sha256, state, object_id, stored_at) values
       ('${A_READY}', '${U1}', 'generated', 'png', 'image/png', '${U1}/generated/${A_READY}.png', 10, '${SHA}', 'ready', gen_random_uuid(), now()),
       ('${A_RESERVED}', '${U1}', 'generated', 'png', 'image/png', '${U1}/generated/${A_RESERVED}.png', 10, '${SHA}', 'reserved', null, null),
       ('${A_OTHER}', '${U2}', 'generated', 'png', 'image/png', '${U2}/generated/${A_OTHER}.png', 10, '${SHA}', 'ready', gen_random_uuid(), now());`);
  // 정정 전 상태를 남겨 둔다(아래 첫 시험이 본다) → 그 뒤 정정 파일을 적용한다
  beforeFix = {
    aclAssets: acl("aif_assets"), aclDeletions: acl("aif_asset_deletions"),
    authAssets: effective("authenticated", "aif_assets"), anonAssets: effective("anon", "aif_assets"), svcAssets: effective("service_role", "aif_assets"),
    authDeletions: effective("authenticated", "aif_asset_deletions"), anonDeletions: effective("anon", "aif_asset_deletions"), svcDeletions: effective("service_role", "aif_asset_deletions"),
    policies: policies(), rls: rls(), fnPrivs: fnPrivs(),
    truncateAsMember: run(`begin; set local role authenticated; truncate public.aif_assets; rollback;`),
  };
  q(FIX);
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
const ALL = PRIVS.join(",");

t("재현(정정 전): 운영과 같은 기본 권한에서는 A1만으로 aif_assets에 authenticated 권한이 전부 남는다", (ctx) => {
  ctx.diagnostic(`역할 사전 확인 ${rolePreflight.replace(/\n/g, " ")} · 시험 DB ${DB} oid=${createdOid} · 정정 전 aif_assets 권한 ${beforeFix.aclAssets}`);
  // 운영 DB에서 본 것과 같은 모양: authenticated=arwdDxtm
  assert.match(beforeFix.aclAssets, /authenticated=arwdDxtm\/postgres/);
  assert.equal(beforeFix.authAssets, ALL, "정정 전에는 회원 역할이 전부를 가진다(이것이 결함)");
  assert.equal(beforeFix.anonAssets, "", "anon은 A1이 이미 회수했다");
  assert.equal(beforeFix.svcAssets, ALL);
  // RLS가 막지 못하는 권한이 실제로 동작한다: 회원 역할로 truncate가 성공한다(되돌리는 거래 안에서 확인)
  assert.equal(beforeFix.truncateAsMember.ok, true, `정정 전에는 회원 역할의 truncate가 거절되지 않는다: ${beforeFix.truncateAsMember.err}`);
  // 예약 표는 A1이 두 역할 모두 회수해 처음부터 정상이다
  assert.deepEqual([beforeFix.authDeletions, beforeFix.anonDeletions, beforeFix.svcDeletions], ["", "", ALL]);
  assert.equal(q(`select count(*) from public.aif_assets;`), "3", "되돌린 거래라 행은 그대로다");
});

t("정정 후: authenticated는 aif_assets에 SELECT만 가진다 — 쓰기·비우기·참조·트리거 권한 0", () => {
  assert.equal(effective("authenticated", "aif_assets"), "select");
  const a = acl("aif_assets");
  assert.match(a, /authenticated=r\/postgres/);
  assert.doesNotMatch(a, /authenticated=[a-zA-Z]*[awdDxtm]/, "읽기 말고 다른 글자가 없다");
});

t("정정 후: anon 0, service_role과 소유자는 예전 그대로", () => {
  assert.equal(effective("anon", "aif_assets"), "");
  assert.equal(effective("service_role", "aif_assets"), beforeFix.svcAssets);
  assert.equal(effective("service_role", "aif_assets"), ALL);
  assert.match(acl("aif_assets"), /postgres=arwdDxtm\/postgres/);
  assert.match(acl("aif_assets"), /service_role=arwdDxtm\/postgres/);
  assert.doesNotMatch(acl("aif_assets"), /anon=/);
});

t("정정 후: 예약 표·정책·RLS·함수 권한은 한 글자도 바뀌지 않았다", () => {
  assert.equal(acl("aif_asset_deletions"), beforeFix.aclDeletions);
  assert.deepEqual([effective("authenticated", "aif_asset_deletions"), effective("anon", "aif_asset_deletions"), effective("service_role", "aif_asset_deletions")], ["", "", ALL]);
  assert.equal(policies(), beforeFix.policies);
  assert.match(policies(), /^aif_assets\/aif_assets_select_own_ready\/SELECT\/\{authenticated\}\//);
  assert.equal(policies().includes(" ;; "), false, "정책은 그 하나뿐");
  assert.equal(rls(), "aif_asset_deletions=true,aif_assets=true");
  assert.equal(rls(), beforeFix.rls);
  assert.equal(fnPrivs(), beforeFix.fnPrivs);
  assert.equal(fnPrivs(), "14|14", "함수 14개 모두 서비스 전용 그대로");
});

t("PUBLIC·상속·열 단위 경로로 남은 권한이 없다", () => {
  for (const table of ["aif_assets", "aif_asset_deletions"]) {
    // PUBLIC에 직접 부여된 것(권한 목록에서 받는 쪽이 비어 있는 항목)
    assert.equal(q(`select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a where n.nspname = 'public' and c.relname = '${table}' and a.grantee = 0;`), "0", `${table} PUBLIC 부여 0`);
    // 열 단위 권한
    assert.equal(q(`select count(*) from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = '${table}' and a.attacl is not null;`), "0", `${table} 열 단위 부여 0`);
  }
  // 직접 부여를 받은 역할의 집합(소유자 제외)
  assert.equal(q(`select string_agg(distinct pg_get_userbyid(a.grantee)::text, ',' order by pg_get_userbyid(a.grantee)::text) from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a
                   where n.nspname = 'public' and c.relname = 'aif_assets' and a.grantee <> c.relowner;`), "authenticated,service_role");
  // 상속: 회원·비로그인 역할이 다른 역할의 구성원이 아니다(다른 역할의 권한을 물려받지 않는다). 이 컨테이너의 역할 구성 기준이다.
  const member = q(`select coalesce(string_agg(pg_get_userbyid(m.member)::text || '<-' || pg_get_userbyid(m.roleid)::text, ','), 'none') from pg_auth_members m where pg_get_userbyid(m.member) in ('anon','authenticated');`, "postgres");
  assert.equal(member, "none", `anon·authenticated가 물려받는 역할: ${member}`);
  // 유효 권한(직접 + 상속 + PUBLIC)을 한 번 더: 열 단위까지 포함해도 읽기뿐이다
  assert.equal(q(`select has_any_column_privilege('authenticated', 'public.aif_assets', 'insert')::text || '|' || has_any_column_privilege('authenticated', 'public.aif_assets', 'update')::text
                   || '|' || has_any_column_privilege('anon', 'public.aif_assets', 'select')::text;`), "false|false|false");
});

t("실제 동작(회원 역할): 본인의 ready 행만 읽히고, 추가·수정·삭제·비우기는 권한 오류다", () => {
  let r = asMember(U1, `select string_agg(id::text, ',' order by id) from public.aif_assets;`);
  assert.equal(r.ok, true, r.err);
  assert.equal(r.out, A_READY, "본인 것 가운데 ready만(본인의 reserved·다른 회원의 ready는 보이지 않는다)");
  r = asMember(U2, `select string_agg(id::text, ',' order by id) from public.aif_assets;`);
  assert.equal(r.out, A_OTHER);
  const denied = [
    `insert into public.aif_assets (id, user_id, kind, ext, mime, path, bytes, sha256) values (gen_random_uuid(), '${U1}', 'generated', 'png', 'image/png', 'x', 1, '${SHA}');`,
    `update public.aif_assets set state = 'failed' where id = '${A_READY}';`,
    `delete from public.aif_assets where id = '${A_READY}';`,
    `truncate public.aif_assets;`,
  ];
  for (const sql of denied) {
    const d = asMember(U1, sql);
    assert.equal(d.ok, false, `거절돼야 한다: ${sql.slice(0, 40)}`);
    assert.match(d.err, /permission denied for table aif_assets/);
  }
  // 예약 표는 읽기도 안 된다
  assert.match(asMember(U1, `select count(*) from public.aif_asset_deletions;`).err, /permission denied/);
  // 아무것도 바뀌지 않았다
  assert.equal(q(`select count(*)::text || '|' || (select state from public.aif_assets where id = '${A_READY}') from public.aif_assets;`), "3|ready");
});

t("실제 동작(비로그인·서비스 역할): anon은 읽기도 거절, service_role은 예전처럼 읽고 쓴다", () => {
  assert.match(run(`set role anon; select count(*) from public.aif_assets;`).err, /permission denied/);
  // 서비스 역할: 되돌리는 거래 안에서 읽기·수정이 된다(RLS 우회 역할). 함수 호출도 그대로다.
  const out = q(`begin; set local role service_role; select count(*) from public.aif_assets; update public.aif_assets set updated_at = now() where id = '${A_READY}' returning 'updated';
                 select (public.aif_asset_stuck_summary() -> 'assets' -> 'reserved' ->> 'count'); rollback;`).split("\n").filter(Boolean);
  assert.deepEqual(out, ["3", "updated", "1"]);
});

t("재적용: 정정 파일을 다시 실행해도, 앞의 세 파일을 다시 실행해도 권한이 그대로다", () => {
  const snapshot = () => [acl("aif_assets"), acl("aif_asset_deletions"), effective("authenticated", "aif_assets"), policies(), fnPrivs()].join(" || ");
  const want = snapshot();
  q(FIX);
  assert.equal(snapshot(), want);
  // 앞의 파일들은 create table if not exists·create or replace라 다시 실행해도 표를 새로 만들지 않는다 → 기본 권한이 다시 붙지 않는다.
  // (A1의 「grant select … to authenticated」는 이미 가진 읽기 권한을 다시 줄 뿐이다.)
  q(A1); q(P2); q(P3);
  assert.equal(snapshot(), want);
  assert.equal(effective("authenticated", "aif_assets"), "select");
  assert.equal(q(`select count(*) from public.aif_assets;`), "3");
});
