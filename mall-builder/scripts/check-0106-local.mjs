// 0106 메이커 M2 사진 제안 데이터 계층 — 로컬 격리 DB 검증(운영·Lab·공유 DB 접속 0, 외부망 0).
// 실행: node mall-builder/scripts/check-0106-local.mjs
// 안전(0105 실행기와 같음): 로컬 Docker 엔진(npipe/unix)·컨테이너 aww-pg-test(postgres 이미지)일 때만, 시험 DB qa_m2_*는 없을 때만 만들고
//   OID·소유자·실행 표식을 기록해 그 DB만 지운다.
// 저장소 흉내 보강: 실제 Supabase처럼 storage.objects에 회원·비로그인 표 권한(정책이 거름)과 (bucket_id, name) 고유.
// 검증: 1) 0106 적용 전후 기존 버킷(mall-builder-public·private) 정책 글자 그대로(R1) 2) scenario-0106(P01~P17)
//       3) 두 세션 경합 L1 확정↔포기 / L2 포기↔확정 / L3 확정 중 삭제 / L4 같은 결과 동시 예약 4) 0106 원문에 외부 호출(http) 0(E1).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = "aww-pg-test";
const RUN_ID = randomUUID();
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
const storageLikeSupabase = "grant select, insert, update, delete on storage.objects to anon, authenticated; grant select on storage.buckets to anon, authenticated; create unique index if not exists qa_objects_bucket_name on storage.objects (bucket_id, name);";
const migs = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
const M106 = migs.find((f) => f.startsWith("0106"));
const sh = (cmd, a) => execFileSync(cmd, a, { encoding: "utf8" }).trim();
const adm = (sql) => sh("docker", ["exec", C, "psql", "-X", "-U", "postgres", "-d", "postgres", "-q", "-At", "-c", sql]);
const args = (db) => ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-f", "-"];
const run = (db, sql) => spawnSync("docker", args(db), { input: sql, encoding: "utf8", maxBuffer: 256 << 20 });
const runAsync = (db, sql) => new Promise((res) => {
  const t0 = Date.now(); const p = spawn("docker", args(db)); let out = "", err = "";
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
  p.on("close", (code) => res({ code, out, err, ms: Date.now() - t0 })); p.stdin.end(sql);
});
const errs = (r) => (r.stderr || r.err || "").split("\n").filter((l) => /ERROR/.test(l)).join("\n");
const sp = `set search_path to "$user", public, extensions;\n`;
const made = new Map();
function cleanup() { for (const db of [...made.keys()]) drop(db); }
const stop = (msg) => { console.error(msg); cleanup(); process.exit(2); };

// 안전 ① 로컬 엔진·컨테이너
const ctx = sh("docker", ["context", "show"]);
const host = sh("docker", ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}", ctx]);
if (!/^(npipe|unix):\/\//.test(host)) { console.error(`[멈춤] Docker 연결 대상이 로컬 엔진이 아닙니다(${ctx}: ${host})`); process.exit(2); }
const cinfo = sh("docker", ["inspect", "-f", "{{.State.Running}} {{.Config.Image}}", C]);
if (!/^true postgres:/.test(cinfo)) { console.error(`[멈춤] 컨테이너 ${C} 상태·이미지가 예상과 다릅니다(${cinfo})`); process.exit(2); }
if (!M106) { console.error("0106 파일 없음"); process.exit(2); }
console.log(`안전: Docker ${ctx}(${host}), 컨테이너 ${C} ${cinfo.replace(/^true /, "실행 중 ")}, 실행 표식 ${RUN_ID.slice(0, 8)}`);

// 안전 ②③ 만든 DB만
function create(db) {
  if (!/^qa_m2_[a-z0-9_]+$/.test(db)) stop(`[멈춤] 시험 DB 이름 규칙 위반: ${db}`);
  if (adm(`select count(*) from pg_database where datname = '${db}'`) !== "0") stop(`[멈춤] ${db}가 이미 있습니다 — 남의 DB일 수 있어 지우지 않고 멈춥니다`);
  adm(`create database ${db}`); adm(`comment on database ${db} is 'check-0106-local ${RUN_ID}'`);
  made.set(db, adm(`select oid from pg_database where datname = '${db}'`));
}
function drop(db) {
  const oid = made.get(db); if (!oid) return;
  const row = adm(`select d.oid || '|' || pg_get_userbyid(d.datdba) || '|' || coalesce(shobj_description(d.oid, 'pg_database'), '') from pg_database d where d.datname = '${db}'`);
  if (row === `${oid}|postgres|check-0106-local ${RUN_ID}`) { adm(`drop database ${db}`); made.delete(db); }
  else console.error(`[주의] ${db}의 OID·소유자·표식이 달라 지우지 않았습니다(${row || "없음"})`);
}
const D = "qa_m2_0106";
const results = [];
const check = (k, ok, note = "") => { results.push([k, ok]); console.log(`${ok ? "통과" : "실패"} ${k}${note ? " — " + note : ""}`); };
const mig = (f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab").replace("create extension if not exists http with schema extensions;", "-- http 흉내");

create(D);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["저장소 흉내 보강", storageLikeSupabase], ["~0105", sp + migs.filter((f) => f < "0106").map(mig).join("\n")]]) {
  const r = run(D, p); if (r.status) stop(`[${n}] 실패 ${errs(r)}`);
}
{ const r = run(D, sp + `insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test') on conflict do nothing;
insert into public.mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','qa-mall');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner') on conflict do nothing;`);
  if (r.status) stop(`[기본 자료] 실패 ${errs(r)}`); }

// 1) 기존 버킷 정책 글자 그대로
const polSnap = () => run(D, `select string_agg(policyname || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || coalesce(qual, '') || '|' || coalesce(with_check, ''), E'\\n' order by policyname)
  from pg_policies where schemaname = 'storage' and tablename = 'objects' and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'mall-builder-(public|private)';`).stdout.trim();
const before = polSnap();
{ const r = run(D, sp + mig(M106)); if (r.status) stop(`[0106] 적용 실패 ${errs(r)}`); }
const after = polSnap();
const polCount = run(D, `select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'mall-builder-(public|private)';`).stdout.trim();
check("R1", before.length > 0 && before === after, `기존 버킷 정책 ${polCount}개 적용 전후 ${before === after ? "글자 그대로" : "다름"}`);
const newPol = run(D, `select string_agg(policyname || ':' || cmd, ',' order by policyname) from pg_policies where schemaname = 'storage' and tablename = 'objects' and (coalesce(qual, '') || coalesce(with_check, '')) like '%mall-builder-proposals%';`).stdout.trim();
check("R2", newPol === "mall_builder_proposals_delete:DELETE,mall_builder_proposals_insert:INSERT,mall_builder_proposals_read:SELECT", `새 버킷 정책 ${newPol}(UPDATE 정책 없음)`);

// 2) 단일 세션 시나리오
const sc = run(D, sp + read("scripts/scenario-0106-photo-proposals.sql"));
if (sc.status) stop(`[시나리오] 실패 ${errs(sc)}`);
for (const line of sc.stdout.split("\n").filter((l) => /^P\d/.test(l))) { const [k, v] = line.split("\t"); check(k, v === "t"); }

// 3) 두 세션 경합(잠금 3초 유지, 1초 뒤 상대 시작)
const S = "00000000-0000-0000-0000-00000000005a", P1 = "00000000-0000-0000-0000-0000000000f1", JOB = "00000000-0000-4000-8000-000000000999";
const S3 = "00000000-0000-0000-0000-0000000000b3", A1 = "00000000-0000-0000-0000-0000000000a1";
const as = (uid) => `select set_config('request.jwt.claim.sub','${uid}', false);\nset role authenticated;\n`;
const q = (sql) => run(D, sp + sql).stdout.trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reserveUploaded = (result) => {
  const out = q(as(S3) + `select (r ->> 'id') || '|' || (r ->> 'path') from (select mall_builder_photo_proposal_begin('${S}', '${P1}', '${JOB}', '${result}', 'c2', '2026-11-19T00:00:00Z', 'hx') r) x;`);
  const [id, path] = out.split("\n").pop().split("|");
  q(as(S3) + `select qa_put('${path}', 4000);`);
  return { id, path };
};
const status = (id) => q(`select status from mall_builder_photo_proposals where id = '${id}';`);
const objCount = (path) => Number(q(`select count(*) from storage.objects where bucket_id = 'mall-builder-proposals' and name = '${path}';`));
{ // L1 확정이 먼저 잠금 → 포기는 기다린 뒤 committed 거절, 파일 남음
  const k = reserveUploaded("00000000-0000-4000-8000-000000000101");
  const a = runAsync(D, sp + as(S3) + `begin;\nselect mall_builder_photo_proposal_commit('${k.id}');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const b = await runAsync(D, sp + as(S3) + `select mall_builder_photo_proposal_abandon('${k.id}');`);
  const ra = await a;
  check("L1", ra.code === 0 && b.code === 0 && b.ms >= 1500 && b.out.includes('"committed"') && status(k.id) === "proposed" && objCount(k.path) === 1,
    `포기 대기 ${b.ms}ms, 포기 응답 ${b.out.includes('"committed"') ? "committed" : "?"}, 상태 ${status(k.id)}, 파일 ${objCount(k.path)}`);
}
{ // L2 포기가 먼저 잠금 → 확정은 기다린 뒤 gone, 그 뒤 파일 지우기 가능
  const k = reserveUploaded("00000000-0000-4000-8000-000000000102");
  const b = runAsync(D, sp + as(S3) + `begin;\nselect mall_builder_photo_proposal_abandon('${k.id}');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const a = await runAsync(D, sp + as(S3) + `select mall_builder_photo_proposal_commit('${k.id}');`);
  await b;
  const del = q(as(S3) + `select qa_del('${k.path}');`).split("\n").pop();
  check("L2", a.code === 0 && a.ms >= 1500 && a.out.includes('"gone"') && status(k.id) === "abandoned" && del === "1" && objCount(k.path) === 0,
    `확정 대기 ${a.ms}ms, 확정 응답 ${a.out.includes('"gone"') ? "gone" : "?"}, 상태 ${status(k.id)}, 지운 파일 ${del}`);
}
{ // L3 확정 트랜잭션 진행 중 다른 세션 삭제 → 커밋된 상태(reserved)라 삭제 0, 끝난 뒤 proposed·파일 남음
  const k = reserveUploaded("00000000-0000-4000-8000-000000000103");
  const a = runAsync(D, sp + as(S3) + `begin;\nselect mall_builder_photo_proposal_commit('${k.id}');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const b = await runAsync(D, sp + as(S3) + `select qa_del('${k.path}');`);
  await a;
  const del = b.out.trim().split("\n").pop();
  const del2 = q(as(S3) + `select qa_del('${k.path}');`).split("\n").pop();
  check("L3", b.code === 0 && del === "0" && del2 === "0" && status(k.id) === "proposed" && objCount(k.path) === 1,
    `확정 중 삭제 ${del}행, 확정 뒤 삭제 ${del2}행, 상태 ${status(k.id)}, 파일 ${objCount(k.path)}`);
}
{ // L4 같은 결과 번호 동시 예약(다른 사람) → 뒤 요청은 기다린 뒤 busy, 살아 있는 행 1개
  const R = "00000000-0000-4000-8000-000000000104";
  const a = runAsync(D, sp + as(S3) + `begin;\nselect mall_builder_photo_proposal_begin('${S}', '${P1}', '${JOB}', '${R}', 'c2', '2026-11-19T00:00:00Z', 'hx');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const b = await runAsync(D, sp + as(A1) + `select mall_builder_photo_proposal_begin('${S}', '${P1}', '${JOB}', '${R}', 'c2', '2026-11-19T00:00:00Z', 'hx');`);
  await a;
  const live = q(`select count(*) from mall_builder_photo_proposals where result_id = '${R}' and status in ('reserved','proposed','applied');`);
  check("L4", b.code === 0 && b.ms >= 1500 && b.out.includes('"busy"') && live === "1", `뒤 요청 대기 ${b.ms}ms, 응답 ${b.out.includes('"busy"') ? "busy" : "?"}, 살아 있는 행 ${live}`);
}

// 4) 외부 호출 0
check("E1", !/extensions\.http|http_(get|post)|net\.http/.test(read(`supabase/migrations/${M106}`)), "0106 원문에 http·pg_net 호출 없음");

if (!process.env.KEEP) cleanup(); // KEEP=1: 원인 조사용으로 시험 DB를 남김(다음 실행은 같은 이름이 있어 멈추므로 표식 확인 뒤 직접 정리)
const left = adm(`select count(*) from pg_database where datname like 'qa_m2_%'`);
const fail = results.filter(([, ok]) => !ok).length;
console.log(`합계 ${results.length - fail}/${results.length}${fail ? " — 실패 있음" : " 통과"}, 이번에 만든 시험 DB ${made.size === 0 ? "모두 삭제" : made.size + "개 남음"}(qa_m2_* 남은 수 ${left})`);
process.exit(fail ? 1 : 0);
