// 0104 실행 자료 로컬 리허설 — 실행: node mall-builder/docs/handoff-0104-lab/check-local.mjs (Docker aww-pg-test 필요)
// 0104 실행 자료 로컬 리허설(작성자) — qa_ 새 DB에 0001~0103만 적용 → precheck → apply.sql → verify → apply 재실행(멈춤 확인) → DB 삭제.
// 데이터 기준값은 Lab과 달라 어긋나는 것이 정상. 문법·구조 항목·멈춤 조건만 본다. 실제 토스·Lab 0.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB = "qa_rehearse0104", C = "aww-pg-test";
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const files = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0104").sort();
const bundle = files.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
const psqlArgs = ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-F", " | ", "-f", "-"];
const run = (sql) => spawnSync("docker", psqlArgs, { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
const step = (name, sql) => { const r = run(sql); console.log(`== ${name}: 종료 ${r.status}`); if (r.stdout.trim()) console.log(r.stdout.trim()); const e = r.stderr.split("\n").filter((l) => /ERROR|멈춤/.test(l)).join("\n"); if (e) console.log(e); return r; };

adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["0001~0103", bundle]]) { const r = run(p); if (r.status) { console.error(`[${n}] 실패`, r.stderr.split("\n").filter((l) => /ERROR/.test(l)).join("\n")); adm(`drop database if exists ${DB}`); process.exit(2); } }
// 로컬 컨테이너에 http 확장이 없으면 원본 apply는 「http 확장 없음」으로 멈춘다(멈춤 확인). 흐름 확인은 사본에서 그 한 줄만 뺀다(저장소 apply.sql은 그대로).
run(`create extension if not exists http;`);
const ext = run(`select count(*) from pg_extension where extname = 'http';`).stdout.trim();
if (ext !== "1") run(`create schema if not exists qa_fake; -- http 확장 없음`);
// Lab 모양 최소 기록: 적용 기록 표·몰 aimaster-b2b
run(`create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values ('20261116000001','mall_builder_0102_exchanges'),('20261116193438','mall_builder_0103_exchange_confirmed_window');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test') on conflict do nothing;
insert into public.mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','aimaster-b2b');`);
console.log("http 확장 있음:", ext);

step("precheck", read("docs/handoff-0104-lab/precheck.sql"));
const applyNoHttp = read("docs/handoff-0104-lab/apply.sql").replace(/^  if not exists \(select 1 from pg_extension where extname = 'http'\).*$/m,"  -- (리허설 사본: http 확인 줄 뺌)");
console.log("사본에서 http 줄 뺌:", applyNoHttp.includes("리허설 사본"));
step("apply 1차(사본)", applyNoHttp);
step("verify", read("docs/handoff-0104-lab/verify.sql"));
step("apply 2차(사본, 멈춰야 함)", applyNoHttp);
step("적용 기록 수", "select count(*) from supabase_migrations.schema_migrations where name like 'mall_builder_0104%';");
adm(`drop database if exists ${DB}`);
console.log("리허설 DB 삭제");
