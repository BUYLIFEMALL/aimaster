// 0107 메이커 M3 1차 「제안 → 적용」 데이터 계층 — 로컬 격리 DB 검증(운영·Lab·공유 DB 접속 0, 외부망 0, 실제 열쇠 0).
// 실행: node mall-builder/scripts/check-0107-local.mjs
// 안전(0106 실행기와 같음): 로컬 Docker 엔진(npipe/unix)·컨테이너 aww-pg-test(postgres 이미지)일 때만, 시험 DB qa_m3_*는 없을 때만 만들고
//   OID·소유자·실행 표식을 기록해 그 DB만 지운다. 서명 열쇠는 합성 시험 값만(시나리오 안에서 만들고 DB와 함께 사라짐).
// 검증: 1) 0107 적용 전후 기존 저장소 정책 글자 그대로(R1), 새 버킷은 올리기 정책 하나뿐(R2), 버킷 조건 없는 고치기·지우기 정책 0(R3)
//       2) scenario-0107(A01~A23) 3) TS 서명 형식 ↔ SQL 원문·HMAC 같은 값(X1) 4) 두 세션 경합 L1 같은 제안 동시 슬롯 / L2 같은 슬롯 동시 확정
//       5) 0107 원문에 외부 호출(http) 0(E1).
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
const M107 = migs.find((f) => f.startsWith("0107"));
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
if (!M107) { console.error("0107 파일 없음"); process.exit(2); }
console.log(`안전: Docker ${ctx}(${host}), 컨테이너 ${C} ${cinfo.replace(/^true /, "실행 중 ")}, 실행 표식 ${RUN_ID.slice(0, 8)}`);

// 안전 ②③ 만든 DB만
function create(db) {
  if (!/^qa_m3_[a-z0-9_]+$/.test(db)) stop(`[멈춤] 시험 DB 이름 규칙 위반: ${db}`);
  if (adm(`select count(*) from pg_database where datname = '${db}'`) !== "0") stop(`[멈춤] ${db}가 이미 있습니다 — 남의 DB일 수 있어 지우지 않고 멈춥니다`);
  adm(`create database ${db}`); adm(`comment on database ${db} is 'check-0107-local ${RUN_ID}'`);
  made.set(db, adm(`select oid from pg_database where datname = '${db}'`));
}
function drop(db) {
  const oid = made.get(db); if (!oid) return;
  const row = adm(`select d.oid || '|' || pg_get_userbyid(d.datdba) || '|' || coalesce(shobj_description(d.oid, 'pg_database'), '') from pg_database d where d.datname = '${db}'`);
  if (row === `${oid}|postgres|check-0107-local ${RUN_ID}`) { adm(`drop database ${db}`); made.delete(db); }
  else console.error(`[주의] ${db}의 OID·소유자·표식이 달라 지우지 않았습니다(${row || "없음"})`);
}
const D = "qa_m3_0107";
const results = [];
const check = (k, ok, note = "") => { results.push([k, ok]); console.log(`${ok ? "통과" : "실패"} ${k}${note ? " — " + note : ""}`); };
const mig = (f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab").replace("create extension if not exists http with schema extensions;", "-- http 흉내");

create(D);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["저장소 흉내 보강", storageLikeSupabase], ["~0106", sp + migs.filter((f) => f < "0107").map(mig).join("\n")]]) {
  const r = run(D, p); if (r.status) stop(`[${n}] 실패 ${errs(r)}`);
}
{ const r = run(D, sp + `insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test') on conflict do nothing;
insert into public.mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','qa-mall');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner') on conflict do nothing;`);
  if (r.status) stop(`[기본 자료] 실패 ${errs(r)}`); }

// 1) 기존 버킷 정책 글자 그대로, 새 버킷은 올리기만
const polSnap = () => run(D, `select string_agg(policyname || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || coalesce(qual, '') || '|' || coalesce(with_check, ''), E'\\n' order by policyname)
  from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname not like 'mall_builder_applied%';`).stdout.trim();
const before = polSnap();
{ const r = run(D, sp + mig(M107)); if (r.status) stop(`[0107] 적용 실패 ${errs(r)}`); }
const after = polSnap();
check("R1", before.length > 0 && before === after, `기존 저장소 정책 ${before.split("\n").length}개 적용 전후 ${before === after ? "글자 그대로" : "다름"}`);
const newPol = run(D, `select string_agg(policyname || ':' || cmd, ',' order by policyname) from pg_policies where schemaname = 'storage' and tablename = 'objects' and (coalesce(qual, '') || coalesce(with_check, '')) like '%mall-builder-applied%';`).stdout.trim();
check("R2", newPol === "mall_builder_applied_insert:INSERT", `새 버킷 정책 ${newPol}(읽기·고치기·지우기 정책 없음)`);
const loose = run(D, `select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd in ('UPDATE','DELETE','ALL') and (coalesce(qual, '') || coalesce(with_check, '')) not like '%bucket_id%';`).stdout.trim();
check("R3", loose === "0", `버킷 조건 없는 고치기·지우기 정책 ${loose}개(새 버킷까지 번지는 정책 없음)`);

// 2) 단일 세션 시나리오
const sc = run(D, sp + read("scripts/scenario-0107-photo-apply.sql"));
if (sc.status) stop(`[시나리오] 실패 ${errs(sc)}`);
for (const line of sc.stdout.split("\n").filter((l) => /^A\d/.test(l))) { const [k, v] = line.split("\t"); check(k, v === "t"); }

// 3) TS 서명 형식 ↔ SQL(같은 합성 열쇠 — 시나리오가 넣은 k1)
const { uploadPathMessage, applyFinalMessage, appliedPath, applyFinalSignature, appliedPublicUrl } = await import("../src/lib/applySignature.ts");
const q = (sql) => run(D, sp + sql).stdout.trim();
const KEY = q(`select encode(key, 'base64') from mall_builder_private.apply_signing_keys where kid = 'k1';`);
const F = { kid: "k1", storeId: "00000000-0000-0000-0000-00000000005a", productId: "00000000-0000-0000-0000-0000000000f1", proposalId: "00000000-0000-4000-8000-0000000000c1",
  applyId: "00000000-0000-4000-8000-0000000000d1", uid: "00000000-0000-0000-0000-0000000000b3", role: "operator", sha256: "ab".repeat(32) };
const FF = { ...F, size: 4000, exp: 1900000000, publicUrl: appliedPublicUrl("HTTPS://QA.Supabase.Test/", appliedPath(KEY, F)) };
const sqlUp = q(`select mall_builder_private.apply_upload_msg('k1', '${F.storeId}', '${F.productId}', '${F.proposalId}', '${F.applyId}', '${F.uid}', 'operator', '${F.sha256}');`);
const sqlFin = q(`select mall_builder_private.apply_final_msg('k1', '${F.storeId}', '${F.productId}', '${F.proposalId}', '${F.applyId}', '${F.uid}', 'operator', '${F.sha256}', 4000, 1900000000, '${FF.publicUrl}');`);
const sqlUpH = q(`select left(mall_builder_private.apply_hmac('k1', '${sqlUp}'), 32);`);
const sqlFinH = q(`select mall_builder_private.apply_hmac('k1', '${sqlFin}');`);
const path = appliedPath(KEY, F);
const urlOk = FF.publicUrl === `https://qa.supabase.test/storage/v1/object/public/mall-builder-applied/${path}`;
check("X1", KEY.length > 0 && sqlUp === uploadPathMessage(F) && sqlFin === applyFinalMessage(FF) && path.split(".")[3] === sqlUpH && applyFinalSignature(KEY, FF) === sqlFinH
  && path === `${F.storeId}/${F.applyId}.k1.${F.sha256}.${sqlUpH}.jpg` && urlOk, "원문 2종·HMAC 2종이 TS와 SQL에서 같음, 출처 정규화(소문자·끝 / 제거)");

// 4) 두 세션 경합(잠금 3초 유지, 1초 뒤 상대 시작)
const S3 = "00000000-0000-0000-0000-0000000000b3", A1 = "00000000-0000-0000-0000-0000000000a1", P1 = "00000000-0000-0000-0000-0000000000f1";
const as = (uid) => `select set_config('request.jwt.claim.sub','${uid}', false);\nset role authenticated;\n`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prop = () => q(`select qa_prop('${P1}', 'operator', '${S3}');`).split("\n").pop();
{ // L1 같은 제안에 두 사람 동시 슬롯 → 뒤 요청은 기다린 뒤 busy, 살아 있는 슬롯 1개
  const pid = prop();
  const a = runAsync(D, sp + as(S3) + `begin;\nselect mall_builder_photo_apply_begin('${pid}');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const b = await runAsync(D, sp + as(A1) + `select mall_builder_photo_apply_begin('${pid}');`);
  await a;
  const live = q(`select count(*) from mall_builder_photo_apply_slots where proposal_id = '${pid}' and status = 'applying';`);
  check("L1", b.code === 0 && b.ms >= 1500 && b.out.includes('"busy"') && live === "1", `뒤 요청 대기 ${b.ms}ms, 응답 ${b.out.includes('"busy"') ? "busy" : "?"}, 살아 있는 슬롯 ${live}`);
}
{ // L2 같은 슬롯 동시 확정 → 뒤 요청은 기다린 뒤 done(멱등), 상품 첫 장은 한 번만 교체
  const pid = prop();
  const x = q(as(S3) + `select r ->> 'apply_id' from (select mall_builder_photo_apply_begin('${pid}') r) t;`).split("\n").pop();
  const sha = "cd".repeat(32), ex = Math.floor(Date.now() / 1000) + 300;
  const nm = q(`select qa_name('${x}', 'k1', '${sha}', '${S3}');`).split("\n").pop();
  q(as(S3) + `select qa_put('${nm}', 3000);`);
  const url = `https://qa.supabase.test/storage/v1/object/public/mall-builder-applied/${nm}`;
  const sig = q(`select qa_fsig('${x}', 'k1', '${sha}', 3000, ${ex}, '${S3}', '${url}');`).split("\n").pop();
  const call = `select mall_builder_photo_apply_commit('${x}', 'k1', '${sha}', 3000, ${ex}, '${sig}', '${url}');`;
  const a = runAsync(D, sp + as(S3) + `begin;\n${call}\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const b = await runAsync(D, sp + as(S3) + call);
  const ra = await a;
  const first = q(`select images -> 0 ->> 'path' from mall_builder_products where id = '${P1}';`);
  const second = q(`select coalesce(images -> 1 ->> 'path', '') from mall_builder_products where id = '${P1}';`);
  check("L2", ra.code === 0 && b.code === 0 && b.ms >= 1500 && ra.out.includes('"done"') && b.out.includes('"done"') && first === nm && second !== nm,
    `뒤 확정 대기 ${b.ms}ms, 두 응답 ${ra.out.includes('"done"') && b.out.includes('"done"') ? "done" : "?"}, 첫 장 교체 1회`);
}

// 5) 외부 호출 0
check("E1", !/extensions\.http|http_(get|post)|net\.http/.test(read(`supabase/migrations/${M107}`)), "0107 원문에 http·pg_net 호출 없음");

if (!process.env.KEEP) cleanup();
const left = adm(`select count(*) from pg_database where datname like 'qa_m3_%'`);
const fail = results.filter(([, ok]) => !ok).length;
console.log(`합계 ${results.length - fail}/${results.length}${fail ? " — 실패 있음" : " 통과"}, 이번에 만든 시험 DB ${made.size === 0 ? "모두 삭제" : made.size + "개 남음"}(qa_m3_* 남은 수 ${left})`);
process.exit(fail ? 1 : 0);
