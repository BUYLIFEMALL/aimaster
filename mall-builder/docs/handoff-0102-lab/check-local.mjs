// Lab 0102 실행 자료 로컬 검사 — qa_ 전용 새 DB에 0001~0101 + Lab과 같은 몰·시험 회원을 만들고
// precheck → apply → fixture → verify → (재적용·재자료 [멈춤]) → rollback → 되돌린 뒤 상태 를 실제로 돌려 판정한다. 외부 접속 0.
// 실행: node mall-builder/docs/handoff-0102-lab/check-local.mjs [--db qa_lab0102]
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const MB = join(here, "..", "..");
const i = process.argv.indexOf("--db"); const DB = i > 0 ? process.argv[i + 1] : "qa_lab0102";
if (!/^qa_[a-z0-9_]{1,40}$/.test(DB)) { console.error("--db는 qa_로 시작"); process.exit(2); }
const C = "aww-pg-test";
const rd = (p) => readFileSync(p, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const mig = readdirSync(join(MB, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0102").sort();
const bundle = mig.map((f) => rd(join(MB, "supabase", "migrations", f)).replace(LAB_LINE, "-- lab")).join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = rd(join(MB, "scripts", "check-prod-bundle-local.mjs")).match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
const ADMIN = "00000000-0000-0000-0000-0000000000a1", TEST = "6fbce7f8-b54e-462e-8e4b-4391b2603f65";
const labLike = `create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text, created_by text, idempotency_key text, rollback text[]);
insert into auth.users (id, email) values ('${ADMIN}','admin@x.test'),('${TEST}','test@x.test');
insert into public.profiles (id, email) values ('${ADMIN}','admin@x.test'),('${TEST}','test@x.test');
insert into mall_builder_stores (id, name, owner_id, slug) values ('0489b458-d71b-4268-9b5f-94fd7da50382','AIMaster B2B','${ADMIN}','aimaster-b2b');
insert into mall_builder_store_customers (store_id, user_id, name, phone) values ('0489b458-d71b-4268-9b5f-94fd7da50382','${TEST}','시험','010-0000-0000');
insert into supabase_migrations.schema_migrations (version, name) values ('20261117000000','mall_builder_0101_messaging');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values (gen_random_uuid(),'0489b458-d71b-4268-9b5f-94fd7da50382',18,'OLD-18','${TEST}','{"name":"x"}','x','delivered',1000,false,false);`;
const psql = (sql) => spawnSync("docker", ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-F", "|", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
let fail = 0; const ok = (n, c, g) => { if (!c) fail++; console.log(`${c ? "통과" : "실패"} ${n}${c ? "" : " — " + g}`); };
const H = (f) => rd(join(here, f));

adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["번들", bundle], ["Lab 흉내", labLike]]) { const r = psql(p); if (r.status) { console.error(n, r.stderr.slice(-400)); process.exit(2); } }

let r = psql(H("precheck.sql"));
ok("precheck 8줄 모두 OK", (r.stdout.match(/\|OK$/gm) || []).length === 8 && !/멈춤/.test(r.stdout), r.stdout);
r = psql(H("apply.sql")); ok("apply 성공", r.status === 0, r.stderr.slice(-300));
r = psql(H("fixture.sql")); ok("fixture 성공", r.status === 0, r.stderr.slice(-300));
r = psql(H("verify.sql")); ok("verify 13/13 OK", /전체\|13\/13\|13\/13\|OK/.test(r.stdout), r.stdout);
r = psql(H("apply.sql")); ok("두 번째 apply → [멈춤]·변화 없음", r.status !== 0 && /\[멈춤\]/.test(r.stderr), r.stderr.slice(-200));
r = psql(H("fixture.sql")); ok("두 번째 fixture → [멈춤]", r.status !== 0 && /\[멈춤\] 시험 자료가 이미/.test(r.stderr), r.stderr.slice(-200));
// 검수 흉내: 시험 회원이 교환 신청 → 되돌리기 전 교환 1건
r = psql(`select set_config('request.jwt.claim.sub','${TEST}', false); select public.mall_builder_request_exchange('e0102000-0000-4000-8000-000000000041', 1, 'e0102000-0000-4000-8000-000000000022', 'size');`);
ok("시험 회원 교환 신청 됨(교환비 3,000원 대기)", r.status === 0 && psql("select fee || '/' || fee_status from mall_builder_exchanges;").stdout.trim() === "3000/waiting", r.stderr.slice(-200));
r = psql(`select set_config('request.jwt.claim.sub','${TEST}', false); select public.mall_builder_request_exchange('e0102000-0000-4000-8000-000000000043', 1, 'e0102000-0000-4000-8000-000000000022', 'size');`);
ok("10일 지난 EXQA-2는 유저 신청 막힘", r.status !== 0 && /7일/.test(r.stderr), r.stderr.slice(-200));
r = psql(H("rollback.sql")); ok("rollback 성공", r.status === 0, r.stderr.slice(-300));
const left = psql(`select (to_regclass('public.mall_builder_exchanges') is null)::text || '/' ||
  (select count(*) from pg_proc where proname in ('mall_builder_request_exchange','mall_builder_exchange_step','mall_builder_exchange_fee','mall_builder_exchange_fee_paid','delivered_at','variant_label','exchange_event','exchange_stock','lock_exchange','exchange_order_delivered','orders_exchange_guard')) || '/' ||
  (select count(*) from pg_trigger where tgname = 'mall_builder_orders_exchange_guard') || '/' ||
  (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') || '/' ||
  (select count(*) from mall_builder_orders where id::text like 'e0102000%') || '/' ||
  (select count(*) from mall_builder_products where id::text like 'e0102000%') || '/' ||
  (select count(*) from mall_builder_orders where order_no = 'OLD-18');`).stdout.trim();
ok("되돌린 뒤: 표 없음·함수 0·트리거 0·기록 0·시험 주문 0·시험 상품 0·기존 주문 그대로", left === "true/0/0/0/0/0/1", left);
r = psql(H("precheck.sql")); ok("되돌린 뒤 precheck 다시 8/8(재적용 가능)", (r.stdout.match(/\|OK$/gm) || []).length === 8, r.stdout);
adm(`drop database if exists ${DB}`);
console.log(fail ? `실패 ${fail}` : "전체 통과"); process.exit(fail ? 1 : 0);
