// 운영 0101~0104 실행 자료 — 로컬 격리 DB 작성자 검증(운영·Lab·공유 DB 접속 0).
// 실행: node mall-builder/docs/handoff-0101-0104-prod/check-local.mjs --manifest   → manifest.json(구조 기대 목록) 생성
//       node mall-builder/docs/handoff-0101-0104-prod/check-local.mjs              → 리허설(precheck→apply→verify ×3 + 반례)
// Docker 컨테이너 aww-pg-test 안 새 DB qa_prod0101_0104만 만들고 끝에 지운다(aww·aww_dev·mb_* 등 기존 DB 손대지 않음).
// 로컬에는 http 확장이 없어 3단계 apply·precheck의 http 확장 개수 식만 사본에서 1로 바꾼다(저장소 파일은 그대로) — 원본 완전성은 build.mjs 지문.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { STEPS } from "./steps.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..");
const DB = "qa_prod0101_0104", C = "aww-pg-test";
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const base = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0101").sort();
const bundle = base.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
const SNAP = readFileSync(join(HERE, "snapshot.sql"), "utf8").replace(/\r\n/g, "\n").replace(/^--.*\n/gm, "");
const psql = ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-F", "\t", "-f", "-"];
const run = (sql) => spawnSync("docker", psql, { input: sql, encoding: "utf8", maxBuffer: 256 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
const errs = (r) => r.stderr.split("\n").filter((l) => /ERROR|멈춤/.test(l)).join("\n");
const fresh = () => {
  adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
  for (const [n, p] of [["stub", stub], ["기본권한", supa], ["0001~0100", bundle]]) {
    const r = run(p); if (r.status) { console.error(`[${n}] 실패`, errs(r)); adm(`drop database if exists ${DB}`); process.exit(2); }
  }
  const recs = base.map((f, i) => `('2026000000${String(i).padStart(4, "0")}', 'mall_builder_${f.replace(/\.sql$/, "")}')`).join(",");
  const r = run(`set search_path to "$user", public, extensions;
create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values ${recs};
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test') on conflict do nothing;
insert into public.mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','qa-mall');`);
  if (r.status) { console.error("[기본 자료] 실패", errs(r)); process.exit(2); }
};
const snapshot = () => {
  const r = run(`set search_path to "$user", public, extensions;\n${SNAP};`);
  if (r.status) { console.error("[스냅샷] 실패", errs(r)); process.exit(2); }
  const m = new Map();
  for (const line of r.stdout.split("\n").filter(Boolean)) { const [k, key, ...v] = line.split("\t"); m.set(`${k}\t${key}`, v.join("\t")); }
  return m;
};
const srcOf = (step) => step.files.map((f) => read(`supabase/migrations/${f.file}`)).join("\n");

if (process.argv.includes("--manifest")) {
  fresh();
  let before = snapshot();
  const out = { generated: new Date().toISOString(), pg: run("show server_version;").stdout.trim(), steps: [] };
  for (const step of STEPS) {
    const r = run(`set search_path to "$user", public, extensions;\n${srcOf(step)}`);
    if (r.status) { console.error(`[${step.name}] 원문 적용 실패`, errs(r)); process.exit(2); }
    const after = snapshot();
    const added = [], changed = [], removed = [];
    for (const [k, v] of after) { if (!before.has(k)) added.push([...k.split("\t"), v]); else if (before.get(k) !== v) changed.push([...k.split("\t"), before.get(k), v]); }
    for (const [k] of before) if (!after.has(k)) removed.push(k.split("\t"));
    out.steps.push({ id: step.id, name: step.name, added, changed, removed });
    console.log(`${step.name}: 추가 ${added.length} · 바뀜 ${changed.length} · 사라짐 ${removed.length}`);
    before = after;
  }
  writeFileSync(join(HERE, "manifest.json"), JSON.stringify(out, null, 1) + "\n");
  adm(`drop database if exists ${DB}`);
  console.log("manifest.json 작성, 격리 DB 삭제");
  process.exit(0);
}

// ── 리허설 ──
let pass = 0, fail = 0;
const check = (name, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "통과" : "실패"} ${name}${ok ? "" : ` — ${got}`}`); };
const f = (n) => readFileSync(join(HERE, n), "utf8").replace(/\r\n/g, "\n");
// 로컬에 http 확장이 없을 때만: 사본에서 http 확장 개수 식을 1로 바꾼다(저장소 파일은 그대로)
const noHttp = (s) => s.split("(select count(*) from pg_extension where extname = 'http')").join("(select 1::bigint /* 리허설 사본: http 확인 대신 */)");
// 결과 표에서 판정 칸이 「확인 필요」인 순서 번호
const bad = (out) => out.split("\n").map((l) => l.split("\t")).filter((c) => c.at(-1) === "확인 필요").map((c) => c[0]);
const total = (out) => (out.split("\n").map((l) => l.split("\t")).find((c) => c[1] === "전체") ?? []).at(-1);
const rec = (n) => run(`select count(*) from supabase_migrations.schema_migrations where name = '${n}';`).stdout.trim();
const hasHttp = () => run(`select count(*) from pg_extension where extname = 'http';`).stdout.trim() === "1";

fresh();
const httpLocal = hasHttp();
for (const step of STEPS) {
  const n = `${step.id}-${step.name}`;
  let pre = f(`precheck-${n}.sql`), app = f(`apply-${n}.sql`);
  if (!httpLocal) { pre = noHttp(pre); app = noHttp(app); }
  const p = run(pre);
  check(`precheck ${n}: 「전체」 OK`, p.status === 0 && total(p.stdout) === "OK", `[${bad(p.stdout)}] ${errs(p)}`);
  const a = run(app);
  check(`apply ${n}: 성공·기록 ${step.records.length}줄`, a.status === 0 && step.records.every((x) => rec(x) === "1"), errs(a));
  const v = run(f(`verify-${n}.sql`));
  check(`verify ${n}: 「전체」 OK`, v.status === 0 && total(v.stdout) === "OK", `[${bad(v.stdout)}] ${errs(v)}`);
  const a2 = run(app);
  check(`apply ${n} 재실행: [멈춤]·기록 그대로`, a2.status !== 0 && /멈춤/.test(a2.stderr) && step.records.every((x) => rec(x) === "1"), errs(a2));
}
// 반례 1: 적용 파일 안에서 기존 자료를 바꾸면 지문 비교가 막고 전체 취소(기록 0)
fresh();
{
  const injected = f("apply-1-0101.sql").replace("-- ── 원문 끝 ──", "update public.mall_builder_stores set name = name || '!';\n-- ── 원문 끝 ──");
  const r = run(injected);
  check("반례: 적용 중 기존 자료 변경 → [멈춤] 기존 자료가 바뀌었습니다·기록 0·자료 그대로",
    r.status !== 0 && /기존 자료가 바뀌었습니다/.test(r.stderr) && rec("mall_builder_0101_messaging") === "0"
      && run(`select name from public.mall_builder_stores where slug = 'qa-mall';`).stdout.trim() === "시험몰", errs(r));
}
// 반례 2: 일부만 적용된 DB(0101이 만들 칸 하나가 이미 있음) → precheck 확인 필요·apply [멈춤]
{
  const r = run(`begin;\nalter table public.mall_builder_store_notify_settings add column bulk_once integer;\n${f("precheck-1-0101.sql")}\nrollback;`);
  check("반례: 0101이 만들 칸이 이미 있음(부분 적용) → precheck 1 「전체」 확인 필요", total(r.stdout) === "확인 필요", `${total(r.stdout)} ${errs(r)}`);
  const a = run(`begin;\nalter table public.mall_builder_store_notify_settings add column bulk_once integer;\ncommit;\n${f("apply-1-0101.sql")}`);
  check("반례: 같은 상태에서 apply 1 → [멈춤]·기록 0", a.status !== 0 && /멈춤/.test(a.stderr) && rec("mall_builder_0101_messaging") === "0", errs(a));
  run(`alter table public.mall_builder_store_notify_settings drop column bulk_once;`);
}
// 반례 3: Lab처럼 이미 적용된 DB(0101 기록 있음)에서는 precheck·apply 모두 멈춤
{
  run(`insert into supabase_migrations.schema_migrations (version, name) values ('20991231000000', 'mall_builder_0101_messaging');`);
  const p = run(f("precheck-1-0101.sql")), a = run(f("apply-1-0101.sql"));
  check("반례: 이미 0101 기록이 있는 DB → precheck 확인 필요·apply [멈춤]", total(p.stdout) !== "OK" && a.status !== 0 && /멈춤/.test(a.stderr), `pre ${total(p.stdout)} / ${errs(a)}`);
}
// 반례 4: 적용 뒤 권한·트리거를 흔들면 verify가 막음
fresh();
for (const step of STEPS) { const n = `${step.id}-${step.name}`; run(httpLocal ? f(`apply-${n}.sql`) : noHttp(f(`apply-${n}.sql`))); }
for (const [name, sql, file] of [
  ["0101 새 표 회원 쓰기 권한 부여", "grant insert on public.mall_builder_campaigns to anon;", "verify-1-0101.sql"],
  ["0102 주문 지킴 트리거 꺼짐", "alter table public.mall_builder_orders disable trigger mall_builder_orders_exchange_guard;", "verify-2-0102-0103.sql"],
  ["0104 결제 키 칸 회원 읽기 부여", "grant select (payment_key) on public.mall_builder_exchange_fee_payments to authenticated;", "verify-3-0104.sql"],
]) {
  const r = run(`begin;\n${sql}\n${f(file)}\nrollback;`);
  check(`반례: ${name} → ${file} 「전체」 확인 필요`, r.status === 0 && total(r.stdout) === "확인 필요", `${total(r.stdout)} ${errs(r)}`);
}
adm(`drop database if exists ${DB}`);
console.log(`합계 통과 ${pass} / 실패 ${fail} (격리 DB 삭제, http 확장 로컬 ${httpLocal ? "있음" : "없음 → 사본에서 http 확장 개수 식만 1로 바꿈"})`);
process.exit(fail ? 1 : 0);
