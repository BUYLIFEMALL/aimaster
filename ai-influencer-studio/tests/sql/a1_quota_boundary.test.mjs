// W01-V4 유한 한도 경계 격리 계약 시험 (2026-11-19, CC-SNS-01, Master msg_0b10f8b59272).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — docs/analysis-ai-influencer-20261118/W00_BASELINE.md에 적는다.
// 대상: 운영에 적용된 A1의 aif_asset_precheck·aif_asset_reserve(파일 무변경). 새 SQL 없음.
// 실행: node --test tests/sql/a1_quota_boundary.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 하는 일: 새 DB qa_aif_quota_20261119를 만들고(이미 있으면 중단) → a1_fixture.sql(대역, 무변경) → A1 → P2 → P3
//          → 한도가 있는 회원으로 「한도 직전·정확히 일치·1바이트 초과」를 사전 검사와 예약에서 본다 → 만든 DB만(oid 일치 확인) 지운다.
//          다른 DB에는 접속하지 않는다. 역할을 만들거나 속성을 바꾸지 않는다.
// 왜 추가했나: 기존 격리 시험은 예약의 「일치」(누적이 한도와 같을 때 허용)와 「초과」(거절)는 봤지만, 사전 검사의 「직전·일치」를 직접 단언한 곳이 없었다.
//             또 숫자가 100 같은 작은 값이었다 — 여기서는 운영 일반 회원의 실제 한도(500MB = 524,288,000바이트)와 실제 예상 크기를 쓴다.
// ★ 한계: 정책 함수(member_storage_policy)와 중앙 사용량 표는 대역이다. 「이 회원의 한도가 500MB로 계산된다」는 것은 여기서 보지 않는다 —
//   그것은 운영의 읽기 조회로 따로 확인한다. 대역 DB에서의 통과이지 운영에서의 실행이 아니다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_quota_20261119";
const MIG = join(HERE, "..", "..", "supabase", "migrations");
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const A1 = readFileSync(join(MIG, "20261118120000_aif_assets_a1.sql"), "utf8");
const P2 = readFileSync(join(MIG, "20261118130000_aif_assets_p2_missing.sql"), "utf8");
const P3 = readFileSync(join(MIG, "20261118140000_aif_assets_p3_summary.sql"), "utf8");

const psqlArgs = (db) => ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-At", "-f", "-"];
const SYNC_TIMEOUT_MS = 60_000;
function run(sql, db = DB) {
  const r = spawnSync("docker", psqlArgs(db), { input: sql, encoding: "utf8", timeout: SYNC_TIMEOUT_MS, killSignal: "SIGKILL" });
  if (r.error || r.status === null) return { ok: false, out: "", err: `docker 실행 실패: ${r.error ? r.error.message : `종료 코드 없음(신호 ${r.signal ?? "?"})`}` };
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) {
  const r = run(sql, db);
  assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`);
  return r.out;
}
const svc = (sql) => run(`set role service_role;\n${sql}`);
const svcOk = (sql) => { const r = svc(sql); assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 200)}`); return r.out; };

const QUOTA = 524_288_000;                 // 일반 회원 한도 500MB
const MiB = 1024 * 1024;
const EST_1K = 4 * MiB, EST_2K = 10 * MiB, EST_4K = 20 * MiB;   // src/lib/assets/paths.ts GENERATED_EST_BYTES와 같은 값
const SHA = "b".repeat(64);
let seq = 0;
/** 한도가 있는 새 회원. used = 중앙 측정이 이미 센 사용량(측정 시각은 지금) */
function mkUser(quota, used) {
  const id = `20000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
  q(`insert into public.profiles(id) values ('${id}');
     insert into public.qa_quota(user_id, quota_bytes) values ('${id}', ${quota === null ? "null" : quota});
     insert into public.member_storage_usage(user_id, bytes, measured_at) values ('${id}', ${used}, now());`);
  return id;
}
const precheck = (u, est) => svcOk(`select allowed::text || '|' || used_bytes || '|' || coalesce(quota_bytes::text, 'null') from public.aif_asset_precheck('${u}', ${est});`);
const reserve = (u, kind, bytes) => svc(`select asset_id from public.aif_asset_reserve('${u}', '${kind}', 'image/png', 'png', ${bytes}, '${SHA}');`);
const rows = (u) => q(`select count(*) from public.aif_assets where user_id = '${u}';`);

const dockerUp = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], { encoding: "utf8", timeout: 15_000, killSignal: "SIGKILL" });
const AVAILABLE = !dockerUp.error && dockerUp.status === 0 && (dockerUp.stdout ?? "").trim() === "true";
let createdOid = null;
let dbCreated = false;

before(() => {
  if (!AVAILABLE) return;
  const roles = q(`select rolname || ':' || rolcanlogin || ':' || rolsuper from pg_roles where rolname in ('anon','authenticated','service_role') order by 1;`, "postgres").split("\n").filter(Boolean);
  assert.equal(roles.length, 3, `필요한 역할 3개가 없습니다 — 역할을 만들지 않고 중단합니다.`);
  for (const r of roles) assert.deepEqual(r.split(":").slice(1), ["false", "false"], `${r} 속성이 예상과 다름`);
  assert.equal(q(`select count(*) from pg_database where datname = '${DB}';`, "postgres"), "0", `${DB}가 이미 있습니다 — 다른 실행의 것일 수 있어 건드리지 않고 중단합니다.`);
  q(`create database ${DB};`, "postgres");
  dbCreated = true;
  const oid = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!oid.ok || !/^[0-9]+$/.test(oid.out)) throw new Error(`${DB}를 만들었지만 oid를 확인하지 못했습니다: ${oid.err || oid.out}`);
  createdOid = oid.out;
  q(FIXTURE); q(A1); q(P2); q(P3);
});

after(() => {
  if (!AVAILABLE || !dbCreated) return;
  if (!createdOid) throw new Error(`[수동 확인 필요] ${DB}를 이 실행이 만들었으나 oid를 확보하지 못해 자동 삭제하지 않았습니다.`);
  const now = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!now.ok) throw new Error(`정리 전 조회 실패 — ${DB}가 남아 있을 수 있습니다: ${now.err}`);
  if (now.out !== createdOid) throw new Error(`${DB}의 oid가 만든 것(${createdOid})과 다릅니다(${now.out || "없음"}) — 지우지 않았습니다.`);
  const drop = run(`drop database ${DB} with (force);`, "postgres");
  if (!drop.ok) throw new Error(`${DB} 삭제 실패: ${drop.err}`);
  const gone = run(`select count(*) from pg_database where datname = '${DB}';`, "postgres");
  if (!gone.ok || gone.out !== "0") throw new Error(`${DB}가 지워지지 않았습니다: ${gone.err || gone.out}`);
});

const t = (name, fn) => test(name, { skip: AVAILABLE ? false : `Docker 컨테이너 ${CONTAINER} 없음 — 건너뜀` }, fn);

t("사전 검사 — 화질별 예상 크기(4·10·20MiB)마다: 한도 직전은 허용, 정확히 일치도 허용, 1바이트 초과는 거절", () => {
  for (const est of [EST_1K, EST_2K, EST_4K]) {
    const below = mkUser(QUOTA, QUOTA - est - 1);
    const equal = mkUser(QUOTA, QUOTA - est);
    const over = mkUser(QUOTA, QUOTA - est + 1);
    assert.equal(precheck(below, est), `true|${QUOTA - est - 1}|${QUOTA}`, `직전(${est})`);
    assert.equal(precheck(equal, est), `true|${QUOTA - est}|${QUOTA}`, `일치(${est})`);
    assert.equal(precheck(over, est), `false|${QUOTA - est + 1}|${QUOTA}`, `초과(${est})`);
  }
  // 비어 있는 회원·가득 찬 회원·이미 넘친 회원
  assert.equal(precheck(mkUser(QUOTA, 0), EST_4K).split("|")[0], "true");
  assert.equal(precheck(mkUser(QUOTA, QUOTA), 1).split("|")[0], "false");
  assert.equal(precheck(mkUser(QUOTA, QUOTA + 5 * MiB), 1).split("|")[0], "false");
  // 사전 검사는 아무것도 만들지 않는다
  assert.equal(q(`select count(*) from public.aif_assets;`), "0");
});

t("예약 — 생성 원본과 참고 이미지 모두: 한도 직전·일치는 예약되고, 1바이트 초과는 STORAGE_LIMIT로 거절된다(행이 생기지 않는다)", () => {
  for (const [kind, bytes] of [["generated", 3_000_000], ["generated", 20 * MiB], ["ref_face", MiB], ["ref_place", 88_401], ["ref_product", 1]]) {
    const below = mkUser(QUOTA, QUOTA - bytes - 1);
    const equal = mkUser(QUOTA, QUOTA - bytes);
    const over = mkUser(QUOTA, QUOTA - bytes + 1);
    assert.equal(reserve(below, kind, bytes).ok, true, `직전 ${kind} ${bytes}`);
    assert.equal(reserve(equal, kind, bytes).ok, true, `일치 ${kind} ${bytes}`);
    const denied = reserve(over, kind, bytes);
    assert.equal(denied.ok, false, `초과 ${kind} ${bytes}`);
    assert.match(denied.err, /STORAGE_LIMIT/);
    assert.deepEqual([rows(below), rows(equal), rows(over)], ["1", "1", "0"]);
  }
});

t("예약한 만큼은 바로 다음 판정에 들어간다: 한도에 정확히 닿게 예약한 뒤에는 1바이트도 더 받지 않고, 사전 검사도 거절한다", () => {
  const u = mkUser(QUOTA, QUOTA - 2 * MiB);
  assert.equal(reserve(u, "ref_face", MiB).ok, true);
  assert.equal(precheck(u, MiB), `true|${QUOTA - MiB}|${QUOTA}`, "남은 1MiB에 정확히 일치");
  assert.equal(reserve(u, "ref_place", MiB).ok, true);
  assert.equal(precheck(u, 1), `false|${QUOTA}|${QUOTA}`);
  const denied = reserve(u, "ref_product", 1);
  assert.equal(denied.ok, false);
  assert.match(denied.err, /STORAGE_LIMIT/);
  assert.equal(rows(u), "2");
});

t("한도가 없는 회원(무제한)은 같은 사용량에서도 허용된다 — 유한 한도 회원과 판정이 갈린다", () => {
  const finite = mkUser(QUOTA, QUOTA);
  const unlimited = mkUser(null, QUOTA);
  assert.equal(precheck(finite, EST_1K), `false|${QUOTA}|${QUOTA}`);
  assert.equal(precheck(unlimited, EST_1K), `true|${QUOTA}|null`);
  assert.equal(reserve(finite, "generated", 1).ok, false);
  assert.equal(reserve(unlimited, "generated", 20 * MiB).ok, true);
});

t("회원 역할은 판정 함수를 직접 부르지 못한다(서비스 역할 전용) — 한도 판정은 서버를 거쳐야만 한다", () => {
  const u = mkUser(QUOTA, 0);
  for (const role of ["authenticated", "anon"]) {
    const a = run(`set role ${role}; select * from public.aif_asset_precheck('${u}', 1);`);
    const b = run(`set role ${role}; select * from public.aif_asset_reserve('${u}', 'generated', 'image/png', 'png', 1, '${SHA}');`);
    assert.deepEqual([a.ok, b.ok], [false, false], role);
    assert.match(a.err + b.err, /permission denied/);
  }
});
