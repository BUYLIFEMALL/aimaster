// W01-A2S 참고 이미지(ref_*) 자산의 예약·확정 SQL 격리 계약 시험 (2026-11-19, CC-SNS-01, Master msg_589f2b895796).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — docs/analysis-ai-influencer-20261118/W00_BASELINE.md에 적는다.
// 왜 만들었나: 서버 경유 업로드(src/lib/assets/upload.ts, 계약 W00 §22)는 운영에 적용된 aif_asset_reserve·aif_asset_finalize를 ref_* kind로 부른다.
//   그런데 그 경로는 격리 DB에서 실행된 적이 없었다(기존 a1_contract는 표 제약 한 줄만 직접 insert로 확인). 이 파일이 그 공백을 메운다.
// 대상(무수정): 20261118120000_aif_assets_a1.sql · …130000_p2_missing.sql · …140000_p3_summary.sql · 20261119100000_aif_assets_grants_fix.sql
// 실행: node --test tests/sql/a1_reference_assets.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 하는 일: 새 DB qa_aif_reference_20261119를 만들고(이미 있으면 중단) → a1_fixture.sql(대역, 무변경) → 운영과 같은 표 기본 권한 재현
//          → 위 네 파일을 운영에 적용한 순서대로 → 시험 → 만든 DB만(oid 일치 확인) 지운다. 다른 DB에는 접속하지 않는다. 역할을 만들거나 바꾸지 않는다.
// ★ 한계: storage.objects·profiles·member_storage_policy·member_storage_usage는 대역(stub)이다. 「저장소에 파일이 올라갔다」는 대역 표에 행을 넣어 흉내 낸다 —
//   실제 저장소 업로드도, 실제 사진 바이트도 없다(크기는 숫자일 뿐이다). 이 위의 통과는 우리 SQL의 계약 확인이지 실제 Supabase에서의 통과가 아니다.
//   사진의 내용·형식 서명 확인은 SQL이 아니라 서버 코드(store.ts)의 일이라 여기서 보지 않는다 — SQL은 kind·MIME·확장자·크기의 조합만 거른다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_reference_20261119";
const MIG = join(HERE, "..", "..", "supabase", "migrations");
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const APPLIED = ["20261118120000_aif_assets_a1.sql", "20261118130000_aif_assets_p2_missing.sql", "20261118140000_aif_assets_p3_summary.sql", "20261119100000_aif_assets_grants_fix.sql"]
  .map((f) => readFileSync(join(MIG, f), "utf8"));
/** 운영 DB에서 관찰한 표 기본 권한(W00 §14-L)을 이 시험 DB에만 재현한다 */
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
/** 서버 코드가 부르는 것과 같은 역할로 호출한다 */
const svc = (sql) => run(`set role service_role;\n${sql}`);
const svcOk = (sql) => { const r = svc(sql); assert.equal(r.ok, true, `service 호출 실패: ${r.err}\n${sql.slice(0, 200)}`); return r.out; };

const MiB = 1024 * 1024;
const SHA = "a".repeat(64);
const KINDS = ["ref_face", "ref_place", "ref_product"];
let userSeq = 0;
/** 회원 한 명. quota = 한도 바이트(null이면 무제한) */
function mkUser(quota = null) {
  userSeq += 1;
  const id = `00000000-0000-4000-8000-${String(userSeq).padStart(12, "0")}`;
  q(`insert into public.profiles(id) values ('${id}');
     insert into public.qa_quota(user_id, quota_bytes, retention_days, unlimited_retention) values ('${id}', ${quota === null ? "null" : quota}, 30, false);`);
  return id;
}
const reserveSql = (user, { kind = "ref_face", mime = "image/png", ext = "png", bytes = 10, sha = SHA } = {}) =>
  `select asset_id || '|' || path from public.aif_asset_reserve('${user}', ${kind === null ? "null" : `'${kind}'`}, '${mime}', '${ext}', ${bytes}, ${sha === null ? "null" : `'${sha}'`});`;
const reserve = (user, o) => svc(reserveSql(user, o));
function reserveOk(user, o) {
  const [id, path] = svcOk(reserveSql(user, o)).split("|");
  return { id, path, user };
}
/** 「저장소에 그 경로로 파일이 올라갔다」를 대역 표에서 흉내 낸다(실제 저장소 호출 0). size = 저장소가 기록한 크기 */
const putObject = (path, size) => q(`insert into storage.objects(bucket_id, name, metadata) values ('aif-assets', '${path}', '${JSON.stringify({ size })}'::jsonb) returning id;`);
const finalize = (a, objectId, user = a.user) => svcOk(`select public.aif_asset_finalize('${a.id}', '${user}', ${objectId ? `'${objectId}'` : "null"});`);
const row = (id) => q(`select kind || '|' || mime || '|' || ext || '|' || bytes || '|' || state || '|' || coalesce(object_id::text, 'null') || '|' || (stored_at is not null) || '|' || path from public.aif_assets where id = '${id}';`);
/** 두 표의 모든 행을 묶은 지문 — 「아무것도 바뀌지 않았다」를 볼 때 쓴다 */
const fingerprint = () => q(`select (select count(*) from public.aif_assets)::text || '|' || (select count(*) from public.aif_asset_deletions)::text || '|' ||
  md5(coalesce((select string_agg(a::text, ';' order by a.id) from public.aif_assets a), '')) || '|' || (select count(*) from storage.objects)::text;`);
const used = (user) => svcOk(`select used_bytes from public.aif_asset_usage_estimate('${user}');`);

const dockerUp = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], { encoding: "utf8", timeout: 15_000, killSignal: "SIGKILL" });
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
  q(PROD_LIKE_DEFAULTS);
  for (const sql of APPLIED) q(sql);
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

t("준비: 운영에 적용한 네 파일이 순서대로 적용되고 함수 14개가 서비스 전용이다", (ctx) => {
  ctx.diagnostic(`역할 사전 확인 ${rolePreflight.replace(/\n/g, " ")} · 시험 DB ${DB} oid=${createdOid}`);
  assert.equal(q(`select count(*)::text || '|' || count(*) filter (where has_function_privilege('service_role', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute'))::text
                  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'aif\\_asset\\_%';`), "14|14");
  assert.equal(fingerprint().split("|").slice(0, 2).join("|"), "0|0", "빈 상태에서 시작");
});

t("세 종류(ref_face·ref_place·ref_product): 예약 → 대역 객체 → 확정이 ready가 되고 경로·종류·객체 id가 기록된다", () => {
  const u = mkUser();
  for (const kind of KINDS) {
    const a = reserveOk(u, { kind, bytes: 1234 });
    assert.match(a.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, "자산 id는 DB가 만든다");
    assert.equal(a.path, `${u}/${kind}/${a.id}.png`, "경로는 회원/종류/자산.확장자");
    assert.equal(row(a.id), `${kind}|image/png|png|1234|reserved|null|false|${a.path}`);
    const oid = putObject(a.path, 1234);
    assert.equal(finalize(a, oid), "ready");
    assert.equal(row(a.id), `${kind}|image/png|png|1234|ready|${oid}|true|${a.path}`);
    assert.equal(finalize(a, oid), "ready", "다시 불러도 ready(멱등)");
  }
  assert.equal(q(`select string_agg(kind, ',' order by kind) from public.aif_assets where user_id = '${u}' and state = 'ready';`), "ref_face,ref_place,ref_product");
});

t("크기 경계: 정확히 1MiB는 예약·확정되고, 1MiB + 1바이트는 세 종류 모두 예약이 거절된다(행 0)", () => {
  const u = mkUser();
  for (const kind of KINDS) {
    const a = reserveOk(u, { kind, bytes: MiB });
    assert.equal(row(a.id).split("|")[3], String(MiB));
    assert.equal(finalize(a, putObject(a.path, MiB)), "ready");
  }
  const before = fingerprint();
  for (const kind of KINDS) {
    const r = reserve(u, { kind, bytes: MiB + 1 });
    assert.equal(r.ok, false, `${kind} 1MiB + 1은 거절`);
    assert.match(r.err, /aif_assets_bytes_by_kind/);
  }
  assert.equal(fingerprint(), before, "거절된 예약은 행·객체를 남기지 않는다");
  // 대조: 생성 원본(generated)은 같은 크기를 받는다 — 상한이 종류별이라는 뜻
  const g = reserveOk(u, { kind: "generated", bytes: MiB + 1 });
  assert.equal(row(g.id).split("|").slice(0, 5).join("|"), `generated|image/png|png|${MiB + 1}|reserved`);
  // 0·음수도 거절
  for (const bytes of [0, -1]) assert.match(reserve(u, { bytes }).err, /aif_assets_bytes_check|violates check constraint/);
});

t("형식 조합: HEIC·HEIF는 확장자 heic로만, 나머지도 정해진 MIME·확장자 조합만 예약된다", () => {
  const u = mkUser();
  const ok = [["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"], ["image/heic", "heic"], ["image/heif", "heic"]];
  for (const [mime, ext] of ok) {
    const a = reserveOk(u, { kind: "ref_face", mime, ext, bytes: 100 });
    assert.equal(a.path, `${u}/ref_face/${a.id}.${ext}`);
    assert.equal(row(a.id).split("|").slice(1, 3).join("|"), `${mime}|${ext}`);
    assert.equal(finalize(a, putObject(a.path, 100)), "ready", `${mime} 확정`);
  }
  const before = fingerprint();
  const bad = [["image/heic", "jpg"], ["image/heif", "png"], ["image/png", "heic"], ["image/jpeg", "heic"], ["image/jpeg", "png"], ["image/png", "jpg"], ["image/webp", "png"],
    ["image/jpeg", "jpeg"], ["image/heic", "heif"], ["image/gif", "gif"], ["image/svg+xml", "svg"], ["image/avif", "avif"], ["text/plain", "png"]];
  for (const [mime, ext] of bad) {
    const r = reserve(u, { kind: "ref_face", mime, ext, bytes: 100 });
    assert.equal(r.ok, false, `${mime}/${ext}는 거절`);
    assert.match(r.err, /violates check constraint/, `${mime}/${ext}`);
  }
  assert.equal(fingerprint(), before, "거절된 조합은 행을 남기지 않는다");
});

t("예약 거절: 모르는 종류·종류 없음·해시 이상·없는 회원 → 행·사용량 변화 없음", () => {
  const u = mkUser();
  reserveOk(u, { kind: "ref_face", bytes: 500 });
  const before = fingerprint();
  const usedBefore = used(u);
  const cases = [
    [{ kind: "ref_other" }, /violates check constraint/],
    [{ kind: "REF_FACE" }, /violates check constraint/],
    [{ kind: "" }, /violates check constraint/],
    [{ kind: null }, /null value|violates/],
    [{ sha: null }, /INVALID/],
    [{ sha: "A".repeat(64) }, /INVALID/],
    [{ sha: "a".repeat(63) }, /INVALID/],
  ];
  for (const [o, re] of cases) {
    const r = reserve(u, { bytes: 10, ...o });
    assert.equal(r.ok, false, JSON.stringify(o));
    assert.match(r.err, re, JSON.stringify(o));
  }
  // 없는 회원(프로필 없음): 외래 키로 거절
  const ghost = "99999999-9999-4999-8999-999999999999";
  assert.match(reserve(ghost, { kind: "ref_face" }).err, /violates foreign key constraint/);
  assert.equal(fingerprint(), before);
  assert.equal(used(u), usedBefore, "거절된 예약은 사용량에 잡히지 않는다");
});

t("용량: 참고 이미지 예약도 회원 한도에 잡히고, 넘으면 STORAGE_LIMIT로 거절되며 행이 생기지 않는다", () => {
  const u = mkUser(MiB + MiB / 2);   // 한도 1.5MiB
  assert.equal(used(u), "0");
  const a = reserveOk(u, { kind: "ref_face", bytes: MiB });
  assert.equal(used(u), String(MiB), "reserved도 사용량에 든다");
  const before = fingerprint();
  const r = reserve(u, { kind: "ref_place", bytes: MiB });
  assert.equal(r.ok, false);
  assert.match(r.err, /STORAGE_LIMIT/);
  assert.equal(fingerprint(), before, "한도 초과 예약은 행을 남기지 않는다");
  // 남은 0.5MiB 안의 예약은 된다(정확히 한도까지)
  const b = reserveOk(u, { kind: "ref_product", bytes: MiB / 2 });
  assert.equal(used(u), String(MiB + MiB / 2));
  assert.match(reserve(u, { kind: "ref_place", bytes: 1 }).err, /STORAGE_LIMIT/, "한도가 찼으면 1바이트도 거절");
  // 다른 회원의 한도와는 무관하다
  const other = mkUser(MiB);
  reserveOk(other, { kind: "ref_face", bytes: MiB });
  assert.equal(finalize(a, putObject(a.path, MiB)), "ready");
  assert.equal(finalize(b, putObject(b.path, MiB / 2)), "ready");
});

t("확정 실패: 다른 회원·없는 자산은 무변경, 크기·경로가 다른 객체나 id 없음은 ready가 되지 않는다", () => {
  const u = mkUser(); const other = mkUser();
  const a = reserveOk(u, { kind: "ref_place", bytes: 300 });
  const oid = putObject(a.path, 300);
  let before = fingerprint();
  assert.equal(finalize(a, oid, other), "NOT_FOUND", "다른 회원 이름으로는 확정되지 않는다");
  assert.equal(svcOk(`select public.aif_asset_finalize('99999999-9999-4999-8999-999999999999', '${u}', '${oid}');`), "NOT_FOUND");
  assert.equal(fingerprint(), before, "거절된 확정은 아무것도 바꾸지 않는다");
  assert.equal(finalize(a, oid), "ready");
  // 크기가 다른 객체
  const b = reserveOk(u, { kind: "ref_product", bytes: 300 });
  assert.equal(finalize(b, putObject(b.path, 299)), "unknown");
  assert.equal(row(b.id).split("|")[4], "unknown", "ready가 아니다");
  // 다른 경로의 객체(다른 자산의 파일)를 내 자산의 것으로 확정할 수 없다
  const c = reserveOk(u, { kind: "ref_face", bytes: 300 });
  assert.equal(finalize(c, oid), "unknown");
  assert.equal(row(c.id).split("|")[4], "unknown");
  // 객체 id를 모른다(업로드 응답 유실)
  const d = reserveOk(u, { kind: "ref_face", bytes: 300 });
  assert.equal(finalize(d, null), "unknown");
  assert.equal(row(d.id).split("|").slice(4, 6).join("|"), "unknown|null");
  // 불명인 예약은 사용량에 계속 잡힌다(시간으로 풀리지 않는다)
  assert.equal(Number(used(u)) >= 900, true);
});

t("저장소 요청 전 중단: reserved인 참고 자산만 failed로 풀리고, ready·unknown은 풀리지 않는다", () => {
  const u = mkUser();
  const a = reserveOk(u, { kind: "ref_face", bytes: 700 });
  assert.equal(used(u), "700");
  assert.equal(svcOk(`select public.aif_asset_abort_local('${a.id}', '${u}');`), "failed");
  assert.equal(row(a.id).split("|")[4], "failed");
  assert.equal(used(u), "0", "failed는 사용량에서 빠진다");
  const b = reserveOk(u, { kind: "ref_place", bytes: 700 });
  assert.equal(finalize(b, putObject(b.path, 700)), "ready");
  assert.equal(svcOk(`select public.aif_asset_abort_local('${b.id}', '${u}');`), "INVALID_STATE");
  const c = reserveOk(u, { kind: "ref_product", bytes: 700 });
  assert.equal(finalize(c, null), "unknown");
  assert.equal(svcOk(`select public.aif_asset_abort_local('${c.id}', '${u}');`), "INVALID_STATE");
  assert.deepEqual([row(b.id).split("|")[4], row(c.id).split("|")[4]], ["ready", "unknown"]);
});

t("회원 역할: 본인의 ready 참고 자산만 읽히고 예약 함수는 부를 수 없다", () => {
  const u = mkUser(); const other = mkUser();
  const mine = reserveOk(u, { kind: "ref_face", bytes: 50 });
  assert.equal(finalize(mine, putObject(mine.path, 50)), "ready");
  const pending = reserveOk(u, { kind: "ref_place", bytes: 50 });
  const theirs = reserveOk(other, { kind: "ref_face", bytes: 50 });
  assert.equal(finalize(theirs, putObject(theirs.path, 50)), "ready");
  const asMember = (uid, sql) => run(`set request.jwt.claim.sub = '${uid}'; set role authenticated;\n${sql}`);
  const seen = asMember(u, `select string_agg(id::text, ',' order by id) from public.aif_assets;`);
  assert.equal(seen.ok, true, seen.err);
  assert.equal(seen.out, mine.id, "본인 것 가운데 ready만");
  assert.equal(seen.out.includes(pending.id) || seen.out.includes(theirs.id), false);
  assert.match(asMember(u, reserveSql(u, { kind: "ref_face" })).err, /permission denied for function aif_asset_reserve/);
  assert.match(asMember(u, `select public.aif_asset_finalize('${pending.id}', '${u}', gen_random_uuid());`).err, /permission denied for function aif_asset_finalize/);
  assert.match(asMember(u, `insert into public.aif_assets (id, user_id, kind, ext, mime, path, bytes) values (gen_random_uuid(), '${u}', 'ref_face', 'png', 'image/png', 'x', 1);`).err, /permission denied for table aif_assets/);
});
