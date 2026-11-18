// W01-A1 격리 SQL 계약 시험 (2026-11-18, CC-SNS-01, Master msg_1fd1abd7c316).
// 실행: node --test tests/sql/a1_contract.test.mjs   (npm test에는 포함되지 않는다 — tests/*.test.mjs 밖)
// 조건: 로컬 Docker 컨테이너 aww-pg-test(postgres 17)가 떠 있어야 한다. 없으면 전체를 건너뛴다(설치·재시작하지 않음).
// 하는 일: 새 DB qa_aif_a1_20261118를 만들고(이미 있으면 중단) → a1_fixture.sql(대역) → migration 원문 적용 → 시험 → 만든 DB만(oid 일치 확인) 지운다.
// 다른 DB(aww·aww_dev·mb_* 등)에는 접속하지 않는다. 대역 위 통과는 실제 중앙 함수·실제 Supabase 통합 통과가 아니다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTAINER = "aww-pg-test";
const DB = "qa_aif_a1_20261118";
const FIXTURE = readFileSync(join(HERE, "a1_fixture.sql"), "utf8");
const MIGRATION = readFileSync(join(HERE, "..", "..", "supabase", "migrations", "20261118120000_aif_assets_a1.sql"), "utf8");
const MiB = 1024 * 1024;

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
/** 서비스 역할로 함수 호출(실제 API 서버와 같은 역할) */
const svc = (sql) => run(`set role service_role;\n${sql}`);
const svcOk = (sql) => { const r = svc(sql); assert.equal(r.ok, true, `service 호출 실패: ${r.err}`); return r.out; };
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

let userSeq = 0;
/** 새 회원 + 한도(null = 무제한) + 중앙 측정값(선택) */
function mkUser(quota, measured) {
  userSeq += 1;
  const id = `00000000-0000-4000-8000-${String(userSeq).padStart(12, "0")}`;
  q(`insert into public.profiles(id) values ('${id}');
     insert into public.qa_quota values ('${id}', ${quota === null ? "null" : quota});
     ${measured ? `insert into public.member_storage_usage(user_id, bytes, measured_at) values ('${id}', ${measured.bytes}, ${measured.at ?? "now()"});` : ""}`);
  return id;
}
const SHA = "a".repeat(64);
/** 예약 → "id|path" */
function reserve(user, bytes, kind = "generated", mime = "image/png", ext = "png") {
  return svc(`select asset_id || '|' || path from public.aif_asset_reserve('${user}', '${kind}', '${mime}', '${ext}', ${bytes}, '${SHA}');`);
}
function reserveOk(user, bytes) {
  const r = reserve(user, bytes);
  assert.equal(r.ok, true, r.err);
  const [id, path] = r.out.split("|");
  return { id, path };
}
/** 저장소 대역에 객체를 넣고 id를 돌려준다 */
function putObject(path, size, bucket = "aif-assets") {
  return q(`insert into storage.objects(bucket_id, name, metadata) values ('${bucket}', '${path}', ${size === undefined ? "null" : `'${JSON.stringify({ size })}'::jsonb`}) returning id;`);
}
const stateOf = (id) => q(`select state from public.aif_assets where id = '${id}';`);

const dockerUp = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], { encoding: "utf8" });
const AVAILABLE = dockerUp.status === 0 && dockerUp.stdout.trim() === "true";
let createdOid = null;

before(() => {
  if (!AVAILABLE) return;
  const exists = q(`select count(*) from pg_database where datname = '${DB}';`, "postgres");
  assert.equal(exists, "0", `${DB}가 이미 있습니다 — 다른 실행의 것일 수 있어 건드리지 않고 중단합니다.`);
  q(`create database ${DB};`, "postgres");
  createdOid = q(`select oid from pg_database where datname = '${DB}';`, "postgres");
  q(FIXTURE);
  q(MIGRATION);
});

after(() => {
  if (!AVAILABLE || !createdOid) return;
  const now = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (now.ok && now.out === createdOid) run(`drop database ${DB} with (force);`, "postgres");   // 내가 만든 DB(oid 일치)만
});

const t = (name, fn) => test(name, { skip: AVAILABLE ? false : "aww-pg-test 컨테이너 없음 — 건너뜀" }, fn);

t("컴파일: 표 2개·함수 9개가 만들어진다", () => {
  assert.equal(q(`select count(*) from pg_tables where schemaname='public' and tablename in ('aif_assets','aif_asset_deletions');`), "2");
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%';`), "9");
});

t("권한: 함수 9개는 service_role만 실행, anon·authenticated·public 불가", () => {
  const rows = q(`select p.proname, has_function_privilege('authenticated', p.oid, 'execute'), has_function_privilege('anon', p.oid, 'execute'),
                         has_function_privilege('service_role', p.oid, 'execute'), p.prosecdef
                  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%' order by 1;`).split("\n");
  assert.equal(rows.length, 9);
  for (const r of rows) {
    const [name, authd, anon, service, secdef] = r.split("|");
    assert.deepEqual([authd, anon, service], ["f", "f", "t"], name);
    if (name !== "aif_asset_meta_size") assert.equal(secdef, "t", `${name} security definer`);
  }
  const u = mkUser(100 * MiB);
  const denied = run(`set role authenticated; select * from public.aif_asset_precheck('${u}', 10);`);
  assert.equal(denied.ok, false);
  assert.match(denied.err, /permission denied/);
});

t("RLS: 회원은 본인 ready만 보고, 쓰기는 못 한다", () => {
  const a = mkUser(null), b = mkUser(null);
  const ra = reserveOk(a, 10), rb = reserveOk(b, 10), ra2 = reserveOk(a, 10);
  for (const r of [ra, rb]) svcOk(`select public.aif_asset_finalize('${r.id}', '${r.path.slice(0, 36)}', '${putObject(r.path, 10)}');`);
  assert.equal(stateOf(ra.id), "ready");
  assert.equal(stateOf(ra2.id), "reserved");
  const asA = `set role authenticated; set request.jwt.claim.sub = '${a}';`;
  assert.equal(q(`${asA} select count(*) from public.aif_assets;`), "1", "본인 ready 1건만");
  assert.equal(q(`${asA} select id from public.aif_assets;`), ra.id);
  assert.equal(q(`set role anon; select 1;`), "1");
  assert.equal(run(`set role anon; select count(*) from public.aif_assets;`).ok, false, "anon은 표 접근 불가");
  assert.equal(run(`${asA} insert into public.aif_assets(id,user_id,kind,ext,mime,path,bytes) values (gen_random_uuid(),'${a}','generated','png','image/png','x',1);`).ok, false);
  assert.equal(run(`${asA} update public.aif_assets set state='failed';`).ok, false);
  assert.equal(run(`${asA} delete from public.aif_assets;`).ok, false);
  assert.equal(run(`${asA} select count(*) from public.aif_asset_deletions;`).ok, false, "삭제 예약표는 회원 조회 불가");
});

t("check 제약: 경로 모양·종류·형식·크기·mime↔ext·ready 모양", () => {
  const u = mkUser(null);
  const id = "11111111-2222-4333-8444-555555555555";
  const ins = (over) => {
    const v = { id, user_id: u, kind: "generated", ext: "png", mime: "image/png", path: `${u}/generated/${id}.png`, bytes: 10, state: "reserved", ...over };
    return run(`insert into public.aif_assets(id,user_id,kind,ext,mime,path,bytes,state) values ('${v.id}','${v.user_id}','${v.kind}','${v.ext}','${v.mime}','${v.path}',${v.bytes},'${v.state}');`);
  };
  assert.equal(ins({ path: `${u}/generated/other.png` }).ok, false, "경로 모양");
  assert.equal(ins({ path: `00000000-0000-4000-8000-999999999999/generated/${id}.png` }).ok, false, "다른 회원 경로");
  assert.equal(ins({ kind: "avatar", path: `${u}/avatar/${id}.png` }).ok, false, "종류");
  assert.equal(ins({ ext: "gif", path: `${u}/generated/${id}.gif` }).ok, false, "확장자");
  assert.equal(ins({ mime: "image/jpeg" }).ok, false, "mime↔ext 불일치");
  assert.equal(ins({ bytes: 0 }).ok, false, "0바이트");
  assert.equal(ins({ bytes: 20 * MiB + 1 }).ok, false, "생성 상한 초과");
  assert.equal(ins({ kind: "ref_face", path: `${u}/ref_face/${id}.png`, bytes: MiB + 1 }).ok, false, "참고 상한 초과");
  assert.equal(ins({ state: "ready" }).ok, false, "ready는 object_id·stored_at 필수");
  assert.equal(ins({ state: "missing" }).ok, false, "missing은 사유 필수");
  assert.equal(ins({}).ok, true, "정상 행");
  assert.equal(ins({ id: "11111111-2222-4333-8444-666666666666" }).ok, false, "path가 id와 맞지 않음");
  // 예약 함수 입력 거절
  assert.equal(reserve(u, 10, "generated", "image/png", "jpg").ok, false, "mime↔ext");
  assert.equal(reserve(u, 0).ok, false);
  assert.equal(svc(`select * from public.aif_asset_reserve('${u}','generated','image/png','png',10,'zz');`).ok, false, "sha 형식");
  assert.equal(svc(`select * from public.aif_asset_reserve('${u}','generated','image/png','png',10,null);`).ok, false, "sha NULL");
});

t("용량(같은 앱 순차): 한도 100에서 20씩 — 확정해도 6번째는 거절(측정 지연 반례 F01)", () => {
  const u = mkUser(100, { bytes: 0, at: "now() - interval '1 hour'" });
  for (let i = 0; i < 5; i++) {
    const r = reserveOk(u, 20);
    assert.equal(svcOk(`select public.aif_asset_finalize('${r.id}', '${u}', '${putObject(r.path, 20)}');`), "ready");
  }
  const sixth = reserve(u, 20);
  assert.equal(sixth.ok, false);
  assert.match(sixth.err, /STORAGE_LIMIT/);
  assert.equal(q(`select count(*) from public.aif_assets where user_id='${u}';`), "5");
  assert.equal(svcOk(`select allowed from public.aif_asset_precheck('${u}', 1);`), "f");
});

t("용량: 중앙 측정이 우리 ready를 이미 센 뒤(측정 시각이 10분 넘게 뒤)에는 이중 계산하지 않는다", () => {
  const u = mkUser(100);
  const r = reserveOk(u, 60);
  svcOk(`select public.aif_asset_finalize('${r.id}', '${u}', '${putObject(r.path, 60)}');`);
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "60");
  // 중앙 측정이 60을 세고, 측정 시각이 저장보다 11분 뒤라고 가정
  q(`insert into public.member_storage_usage(user_id, bytes, measured_at) values ('${u}', 60, now() + interval '11 minutes');`);
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "60");
  // 측정 시각이 저장 직후(10분 여유 안)면 보수적으로 이중 계산
  q(`update public.member_storage_usage set measured_at = now() where user_id='${u}';`);
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "120");
});

t("용량: unknown·reserved는 계속 계산, 무제한(null)은 통과, 한도 낮추면 새 예약만 거절", () => {
  const u = mkUser(100);
  const r = reserveOk(u, 50);
  assert.equal(svcOk(`select public.aif_asset_finalize('${r.id}', '${u}', null);`), "unknown");
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "50");
  assert.equal(reserve(u, 60).ok, false, "unknown 50 + 60 > 100");
  q(`update public.qa_quota set quota_bytes = 40 where user_id='${u}';`);
  assert.equal(reserve(u, 1).ok, false, "한도를 낮추면 새 예약 거절");
  assert.equal(stateOf(r.id), "unknown", "기존 행은 그대로");
  const free = mkUser(null);
  assert.equal(reserve(free, 20 * MiB).ok, true);
});

t("동시 예약(2연결 실측): 한도 100에 60+60 — 하나만 성공", async () => {
  const u = mkUser(100);
  const first = runAsync(`set role service_role; begin; select asset_id from public.aif_asset_reserve('${u}','generated','image/png','png',60,'${SHA}'); select pg_sleep(1.5); commit;`);
  await sleep(500);
  const t0 = Date.now();
  const second = await runAsync(`set role service_role; select asset_id from public.aif_asset_reserve('${u}','generated','image/png','png',60,'${SHA}');`);
  const waited = Date.now() - t0;
  const a = await first;
  assert.equal(a.ok, true, a.err);
  assert.equal(second.ok, false, "두 번째는 거절");
  assert.match(second.err, /STORAGE_LIMIT/);
  assert.ok(waited >= 600, `두 번째 연결이 첫 거래를 기다렸어야 함(실측 ${waited}ms)`);
  assert.equal(q(`select coalesce(sum(bytes),0) from public.aif_assets where user_id='${u}';`), "60");
});

t("finalize: 객체 id 없음·다른 객체·크기 불일치·깨진 metadata는 unknown(ready 단정 0, failed 0)", () => {
  const u = mkUser(null);
  const r1 = reserveOk(u, 10);
  assert.equal(svcOk(`select public.aif_asset_finalize('${r1.id}', '${u}', null);`), "unknown");
  const r2 = reserveOk(u, 10);
  const other = putObject(`${u}/generated/00000000-0000-4000-8000-aaaaaaaaaaaa.png`, 10);
  assert.equal(svcOk(`select public.aif_asset_finalize('${r2.id}', '${u}', '${other}');`), "unknown", "다른 경로의 객체");
  const r3 = reserveOk(u, 10);
  assert.equal(svcOk(`select public.aif_asset_finalize('${r3.id}', '${u}', '${putObject(r3.path, 11)}');`), "unknown", "크기 불일치");
  for (const meta of [`'{"size":"abc"}'`, `'{"size":""}'`, `'{}'`, "null", `'{"size":"-5"}'`, `'{"size":"99999999999999999999"}'`, `'{"size":"10.5"}'`]) {
    const r = reserveOk(u, 10);
    const oid = q(`insert into storage.objects(bucket_id,name,metadata) values ('aif-assets','${r.path}', ${meta === "null" ? "null" : meta + "::jsonb"}) returning id;`);
    const res = svc(`select public.aif_asset_finalize('${r.id}', '${u}', '${oid}');`);
    assert.equal(res.ok, true, `예외 없이 처리: ${meta} ${res.err}`);
    assert.equal(res.out, "unknown", meta);
  }
  assert.equal(q(`select count(*) from public.aif_assets where user_id='${u}' and state='failed';`), "0");
  const wrongUser = mkUser(null);
  const r4 = reserveOk(u, 10);
  assert.equal(svcOk(`select public.aif_asset_finalize('${r4.id}', '${wrongUser}', '${putObject(r4.path, 10)}');`), "NOT_FOUND", "다른 회원으로는 확정 불가");
  assert.equal(stateOf(r4.id), "reserved");
  const o4 = q(`select id from storage.objects where name='${r4.path}';`);   // 대역 표는 service_role에 직접 조회 권한이 없어 관리자로 읽는다
  assert.equal(svcOk(`select public.aif_asset_finalize('${r4.id}', '${u}', '${o4}');`), "ready");
  assert.equal(svcOk(`select public.aif_asset_finalize('${r4.id}', '${u}', null);`), "ready", "이미 ready면 그대로");
});

t("reconcile: 기대 객체 id가 있어야만 ready, 없으면 path+size가 맞아도 unknown, failed로 바꾸지 않음", () => {
  const u = mkUser(null);
  const r1 = reserveOk(u, 10);
  const o1 = putObject(r1.path, 10);
  assert.equal(svcOk(`select public.aif_asset_reconcile('${r1.id}', '${u}');`), "unknown", "기대 id 없음 → 우회 금지");
  assert.equal(stateOf(r1.id), "unknown");
  assert.equal(svcOk(`select public.aif_asset_reconcile('${r1.id}', '${u}', '${o1}');`), "ready", "기대 id 전달 + 일치");
  const r2 = reserveOk(u, 10);
  assert.equal(svcOk(`select public.aif_asset_reconcile('${r2.id}', '${u}', '${o1}');`), "unknown", "기대 id가 다른 경로의 객체");
  assert.equal(svcOk(`select public.aif_asset_reconcile('${r2.id}', '${u}', '00000000-0000-4000-8000-bbbbbbbbbbbb');`), "unknown", "기록된 기대 id와 다른 값");
  for (let i = 0; i < 3; i++) assert.equal(svcOk(`select public.aif_asset_reconcile('${r2.id}', '${u}');`), "unknown", "반복해도 failed 아님");
  assert.equal(stateOf(r2.id), "unknown");
  assert.equal(svcOk(`select public.aif_asset_reconcile('${r2.id}', '${mkUser(null)}');`), "NOT_FOUND");
});

t("abort_local: reserved만 failed(해제), unknown은 풀 수 없다", () => {
  const u = mkUser(100);
  const r1 = reserveOk(u, 60);
  assert.equal(svcOk(`select public.aif_asset_abort_local('${r1.id}', '${u}');`), "failed");
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "0", "해제됨");
  const r2 = reserveOk(u, 60);
  svcOk(`select public.aif_asset_finalize('${r2.id}', '${u}', null);`);
  assert.equal(svcOk(`select public.aif_asset_abort_local('${r2.id}', '${u}');`), "INVALID_STATE");
  assert.equal(svcOk(`select used_bytes from public.aif_asset_usage_estimate('${u}');`), "60", "unknown은 계속 계산");
});

t("claim_delete: 소유·경로·id 일치만, 쓰는 중이면 거절, 진행 중 예약은 재발급 불가", () => {
  const u = mkUser(null), v = mkUser(null);
  const r = reserveOk(u, 10);
  const claim = (asset, user, path, bucket = "aif-assets") => svc(`select public.aif_asset_claim_delete('${asset}', '${user}', '${bucket}', '${path}');`);
  assert.match(claim(r.id, u, r.path).err, /ASSET_IN_USE/, "reserved는 예약 불가");
  assert.match(claim(r.id, v, r.path).err, /ACCESS_DENIED/, "다른 회원이 남의 경로");
  assert.match(claim(r.id, v, r.path.replace(u, v)).err, /ACCESS_DENIED/, "다른 회원이 자기 경로로 남의 자산 id");
  assert.match(claim(r.id, u, r.path, "other-bucket").err, /ACCESS_DENIED/);
  assert.match(claim(r.id, u, `${u}/generated/00000000-0000-4000-8000-cccccccccccc.png`).err, /ACCESS_DENIED/, "경로 안 id 불일치");
  assert.match(claim(r.id, u, `${u}/generated/sub/${r.id}.png`).err, /ACCESS_DENIED/, "canonical 아님");
  svcOk(`select public.aif_asset_abort_local('${r.id}', '${u}');`);
  const tok = claim(r.id, u, r.path);
  assert.equal(tok.ok, true, tok.err);
  assert.match(claim(r.id, u, r.path).err, /DELETION_BUSY/, "claimed 중 재발급 불가");
  // 행 없는 고아 객체도 경로의 id로 예약
  const orphan = "00000000-0000-4000-8000-dddddddddddd";
  assert.equal(claim(orphan, u, `${u}/generated/${orphan}.png`).ok, true);
  assert.match(claim(orphan, v, `${v}/generated/${orphan}.png`).err, /ACCESS_DENIED/, "기존 예약 행의 소유·경로와 다름");
  assert.equal(q(`select user_id from public.aif_asset_deletions where asset_id='${orphan}';`), u, "예약 행은 바뀌지 않음");
});

t("finalize ↔ 삭제 예약 상호 배제(순차 + 2연결 실측)", async () => {
  const u = mkUser(null);
  const r = reserveOk(u, 10);
  const oid = putObject(r.path, 10);
  // 순차: 삭제 예약이 걸린 자산은 확정·대조 거절
  q(`insert into public.aif_asset_deletions(asset_id,user_id,bucket,path,state,fencing_token) values ('${r.id}','${u}','aif-assets','${r.path}','claimed',gen_random_uuid());`);
  assert.equal(svcOk(`select public.aif_asset_finalize('${r.id}', '${u}', '${oid}');`), "ASSET_DELETION_IN_PROGRESS");
  assert.equal(svcOk(`select public.aif_asset_reconcile('${r.id}', '${u}', '${oid}');`), "ASSET_DELETION_IN_PROGRESS");
  assert.equal(stateOf(r.id), "reserved");
  // 2연결: 확정 거래가 열려 있는 동안 들어온 삭제 예약은 기다렸다가 ASSET_IN_USE
  const r2 = reserveOk(u, 10);
  const o2 = putObject(r2.path, 10);
  const fin = runAsync(`set role service_role; begin; select public.aif_asset_finalize('${r2.id}', '${u}', '${o2}'); select pg_sleep(1.5); commit;`);
  await sleep(500);
  const t0 = Date.now();
  const claim = await runAsync(`set role service_role; select public.aif_asset_claim_delete('${r2.id}', '${u}', 'aif-assets', '${r2.path}');`);
  const waited = Date.now() - t0;
  assert.equal((await fin).out.split("\n")[0], "ready");
  assert.equal(claim.ok, false);
  assert.match(claim.err, /ASSET_IN_USE/);
  assert.ok(waited >= 600, `삭제 예약이 확정 거래를 기다렸어야 함(실측 ${waited}ms)`);
  assert.equal(q(`select count(*) from public.aif_asset_deletions where asset_id='${r2.id}';`), "0");
});

t("delete_mark: NULL·잘못된 토큰·다른 회원 거절, 전이 행렬, 바뀐 행이 있을 때만 true", () => {
  const u = mkUser(null), v = mkUser(null);
  const id = "00000000-0000-4000-8000-eeeeeeeeeeee";
  const path = `${u}/generated/${id}.png`;
  const tok = svcOk(`select public.aif_asset_claim_delete('${id}', '${u}', 'aif-assets', '${path}');`);
  const mark = (asset, user, token, state) => svcOk(`select public.aif_asset_delete_mark(${asset}, ${user}, ${token}, ${state});`);
  const A = `'${id}'`, U = `'${u}'`, T = `'${tok}'`;
  const st = () => q(`select state || '|' || attempts from public.aif_asset_deletions where asset_id='${id}';`);
  assert.equal(mark(A, U, "null", "'deleting'"), "f", "토큰 NULL(F05)");
  assert.equal(mark("null", U, T, "'deleting'"), "f");
  assert.equal(mark(A, "null", T, "'deleting'"), "f");
  assert.equal(mark(A, U, T, "null"), "f");
  assert.equal(mark(A, U, "'00000000-0000-4000-8000-ffffffffffff'", "'deleting'"), "f", "잘못된 토큰");
  assert.equal(mark(A, `'${v}'`, T, "'deleting'"), "f", "다른 회원");
  assert.equal(mark(A, U, T, "'deleted'"), "f", "claimed→deleted는 행렬 밖");
  assert.equal(st(), "claimed|0", "거절은 아무것도 바꾸지 않음");
  assert.equal(svc(`select public.aif_asset_delete_mark(${A}, ${U}, ${T}, 'bogus');`).ok, false, "모르는 상태는 예외");
  assert.equal(mark(A, U, T, "'deleting'"), "t");
  assert.equal(st(), "deleting|1");
  assert.equal(mark(A, U, T, "'cancelled'"), "f", "deleting→cancelled 없음");
  assert.equal(mark(A, U, T, "'delete_unknown'"), "t");
  assert.equal(mark(A, U, T, "'deleting'"), "f", "delete_unknown→deleting 없음");
  assert.equal(mark(A, U, T, "'deleted'"), "t");
  for (const s of ["deleting", "delete_failed", "delete_unknown", "cancelled", "deleted"]) assert.equal(mark(A, U, T, `'${s}'`), "f", `deleted→${s} 되살림 없음`);
  assert.equal(st(), "deleted|1");
});

t("재적용: migration을 다시 실행해도 성공하고 권한·정책·데이터가 그대로", () => {
  const before = q(`select count(*) from public.aif_assets;`);
  const again = run(MIGRATION);
  assert.equal(again.ok, true, again.err);
  assert.equal(q(`select count(*) from public.aif_assets;`), before);
  assert.equal(q(`select count(*) from pg_policies where schemaname='public' and tablename='aif_assets';`), "1");
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%'
                  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'));`), "0");
  assert.equal(q(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'aif\\_asset\\_%' and has_function_privilege('service_role', p.oid, 'execute');`), "9");
  assert.equal(q(`select has_table_privilege('authenticated','public.aif_asset_deletions','select') or has_table_privilege('anon','public.aif_assets','select');`), "f");
});
