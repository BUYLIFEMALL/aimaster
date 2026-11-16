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
const CONS = "00000000-0000-0000-0000-0000000000c5", OTHER = "00000000-0000-0000-0000-0000000000b9", OTHER_P = "00000000-0000-0000-0000-0000000000b8";
const RS = "f2b49b07-7682-431f-bada-a99c8bc27956", RS_USER = "00000000-0000-0000-0000-0000000000e5", RS_CUST = "00000000-0000-0000-0000-0000000000e6";
const NF = "00000000-0000-0000-0000-0000000000f9", NF_P = "00000000-0000-0000-0000-0000000000fa";
const labLike = `create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text, created_by text, idempotency_key text, rollback text[]);
insert into auth.users (id, email) values ('${ADMIN}','admin@x.test'),('${TEST}','test@x.test');
insert into public.profiles (id, email) values ('${ADMIN}','admin@x.test'),('${TEST}','test@x.test');
insert into mall_builder_stores (id, name, owner_id, slug) values ('0489b458-d71b-4268-9b5f-94fd7da50382','AIMaster B2B','${ADMIN}','aimaster-b2b');
insert into mall_builder_store_customers (store_id, user_id, name, phone) values ('0489b458-d71b-4268-9b5f-94fd7da50382','${TEST}','시험','010-0000-0000');
-- Lab과 같게: 시험 회원 = 승인된 사업자 회원(기본 사업자 등급), 비교용 소비자 회원 CONS, 다른 몰 OTHER(사업자 전용 판매 중 상품·옵션 2개)
update mall_builder_store_customers set approval_status = 'approved', member_status = 'approved',
  grade_id = (select g.id from mall_builder_customer_grades g where g.store_id = '0489b458-d71b-4268-9b5f-94fd7da50382' and g.is_business limit 1)
 where store_id = '0489b458-d71b-4268-9b5f-94fd7da50382' and user_id = '${TEST}';
insert into auth.users (id, email) values ('${CONS}','cons@x.test');
insert into public.profiles (id, email) values ('${CONS}','cons@x.test');
insert into mall_builder_store_customers (store_id, user_id, name, phone) values ('0489b458-d71b-4268-9b5f-94fd7da50382','${CONS}','소비자','010-0000-0001');
-- Lab과 같게: 시험 회원의 추천 리셀러(code OWNER1) — 주문 insert 때 orders_ref가 주문에 붙이고, 구매 확정 때 리워드·장부가 생김(2026-11-17 Lab 발견)
insert into auth.users (id, email) values ('${RS_USER}','rs@x.test'); insert into public.profiles (id, email) values ('${RS_USER}','rs@x.test');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('${RS_CUST}','0489b458-d71b-4268-9b5f-94fd7da50382','${RS_USER}','리셀러','010-0000-0002');
insert into mall_builder_resellers (id, store_id, customer_id, code, rate, active) values ('${RS}','0489b458-d71b-4268-9b5f-94fd7da50382','${RS_CUST}','OWNER1',5,true);
update mall_builder_store_customers set reseller_id = '${RS}' where store_id = '0489b458-d71b-4268-9b5f-94fd7da50382' and user_id = '${TEST}';
-- Lab처럼 보존해야 할 기존(시험 아닌) 주문: 같은 리셀러가 붙은 결제 완료 주문 + 대기 리워드(Lab: 20261115-C3T1 pending 2,300원)
insert into mall_builder_products (id, store_id, name, base_price, status) values ('${NF_P}','0489b458-d71b-4268-9b5f-94fd7da50382','기존 상품',46000,'on_sale');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit)
 select '${NF}','0489b458-d71b-4268-9b5f-94fd7da50382',17,'NF-17','${TEST}', c.id,'{"name":"x"}','x','pending_payment',46000,false,false
 from mall_builder_store_customers c where c.store_id = '0489b458-d71b-4268-9b5f-94fd7da50382' and c.user_id = '${TEST}';
insert into mall_builder_order_items (order_id, product_id, name_snapshot, unit_price, qty, line_total) values ('${NF}','${NF_P}','기존 상품',46000,1,46000);
update mall_builder_orders set status = 'paid' where id = '${NF}';
insert into mall_builder_stores (id, name, owner_id, slug) values ('${OTHER}','다른몰','${ADMIN}','other-mall');
insert into mall_builder_products (id, store_id, name, base_price, status, visibility) values ('${OTHER_P}','${OTHER}','다른몰 상품',1000,'on_sale','business_only');
insert into mall_builder_product_variants (product_id, store_id, key, "values", stock) values ('${OTHER_P}','${OTHER}','A','["A"]',1),('${OTHER_P}','${OTHER}','B','["B"]',1);
insert into supabase_migrations.schema_migrations (version, name) values ('20261117000000','mall_builder_0101_messaging');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values (gen_random_uuid(),'0489b458-d71b-4268-9b5f-94fd7da50382',18,'OLD-18','${TEST}','{"name":"x"}','x','delivered',1000,false,false);`;
const psql = (sql) => spawnSync("docker", ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-F", "|", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
let fail = 0; const ok = (n, c, g) => { if (!c) fail++; console.log(`${c ? "통과" : "실패"} ${n}${c ? "" : " — " + g}`); };
const H = (f) => rd(join(here, f));

adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["번들", bundle], ["Lab 흉내", labLike]]) { const r = psql(p); if (r.status) { console.error(n, r.stderr.slice(-400)); process.exit(2); } }

// verify 판정식 빨강/초록: 12개 일치 + 1개 NULL — 예전 식(bool_and)은 OK로 잘못 통과, 새 식(coalesce + 줄 수 13·일치 13)은 확인 필요
const formula = `with chk as (select g o, '1' 기대, case when g = 13 then null else '1' end 실제 from generate_series(1, 13) g)
select (case when (select bool_and(기대 = 실제) from chk) then 'OK' else '확인 필요' end) || '|' ||
       (with j as (select 기대, coalesce(실제, '(없음)') 실제 from chk)
        select case when (select count(*) from j) = 13 and (select count(*) filter (where 기대 = 실제) from j) = 13 then 'OK' else '확인 필요' end);`;
let r = psql(formula);
ok("verify 판정식: 12 일치+1 NULL → 예전 식 OK(빨강)·새 식 확인 필요(초록)", r.stdout.trim() === "OK|확인 필요", r.stdout + r.stderr);

r = psql(H("precheck.sql"));
ok("precheck 10줄 모두 OK", (r.stdout.match(/\|OK$/gm) || []).length === 10 && !/멈춤/.test(r.stdout), r.stdout);
r = psql(H("apply.sql")); ok("apply 성공", r.status === 0, r.stderr.slice(-300));
r = psql(H("fixture.sql")); ok("fixture 성공", r.status === 0, r.stderr.slice(-300));
r = psql(H("verify.sql")); ok("verify 13/13 OK", /전체\|13\/13\|13\/13\|OK/.test(r.stdout), r.stdout);
// 일반 회원 권한으로 실제 읽기(SET ROLE authenticated + 회원 번호) — 같은 RLS 정책(variants_read = 직원 또는 product_visible)
const asRead = (uid, sql) => psql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${uid}', true); ${sql} commit;`).stdout.trim().split("\n").filter((l) => !/^(BEGIN|SET|COMMIT)$/.test(l) && l !== "" && !/^[0-9a-f-]{36}$/.test(l)).at(-1);
const cntSyn = "select count(*) from public.mall_builder_product_variants where product_id = 'e0102000-0000-4000-8000-000000000011';";
const cntOther = `select count(*) from public.mall_builder_product_variants where product_id = '${OTHER_P}';`;
ok("RLS: 시험 회원(승인 사업자)이 시험 상품 옵션 S/M/L 3줄 읽음", asRead(TEST, cntSyn) === "3", asRead(TEST, cntSyn));
ok("RLS: 시험 회원은 다른 몰 사업자 전용 옵션 0줄", asRead(TEST, cntOther) === "0", asRead(TEST, cntOther));
ok("RLS: 같은 몰 소비자 회원은 시험 상품 옵션 0줄(사업자 전용)", asRead(CONS, cntSyn) === "0", asRead(CONS, cntSyn));
ok("RLS: 로그인 역할+회원 번호 빈 값은 시험 상품 옵션 0줄", asRead("", cntSyn) === "0", asRead("", cntSyn));
// 진짜 비로그인 역할(anon) — JWT 없음(request.jwt.claim.sub 비움), 지금 역할이 anon인지 먼저 증명. 결과는 0줄 또는 권한 거부여야 함(QA msg_54e445ea53b0)
{
  const a = psql(`begin; set local role anon; select set_config('request.jwt.claim.sub', '', true); select set_config('request.jwt.claims', '', true);
select 'ROLE=' || current_user || '|UID=' || coalesce(auth.uid()::text, 'null');
select 'CNT=' || count(*) from public.mall_builder_product_variants where product_id = 'e0102000-0000-4000-8000-000000000011';
commit;`);
  const role = (a.stdout.match(/ROLE=([^|\n]+)\|UID=(\S+)/) || []);
  const cnt = (a.stdout.match(/CNT=(\d+)/) || [])[1];
  const denied = /permission denied/.test(a.stderr);
  console.log(`  anon 세부: 역할 ${role[1]} · auth.uid() ${role[2]} · 줄 ${cnt ?? "-"} · 권한 거부 ${denied}`);
  ok("RLS: 진짜 anon 역할(current_user=anon·auth.uid() null)은 시험 상품 옵션 0줄 또는 권한 거부",
    (role[1] === "anon" && role[2] === "null" && cnt === "0") || (denied && /ROLE=anon/.test(a.stdout)),
    `역할 ${role[1]} uid ${role[2]} 줄 ${cnt} 거부 ${denied} ${a.stderr.slice(-160)}`);
}
// verify가 NULL·빠진 줄을 실패로 잡는지(실제 상태): 시험 상품 하나를 지우면 10·13번 불일치 → 전체 확인 필요
r = psql(`begin; delete from mall_builder_products where id = 'e0102000-0000-4000-8000-000000000012'; ${H("verify.sql")} rollback;`);
ok("verify: 시험 상품이 빠지면 「전체」 확인 필요(빨강을 잡음)", /전체\|13\/13\|11\/13\|확인 필요/.test(r.stdout), r.stdout);
r = psql(H("apply.sql")); ok("두 번째 apply → [멈춤]·변화 없음", r.status !== 0 && /\[멈춤\]/.test(r.stderr), r.stderr.slice(-200));
r = psql(H("fixture.sql")); ok("두 번째 fixture → [멈춤]", r.status !== 0 && /\[멈춤\] 시험 자료가 이미/.test(r.stderr), r.stderr.slice(-200));
// 검수 흉내: 시험 회원이 교환 신청 → 되돌리기 전 교환 1건
r = psql(`select set_config('request.jwt.claim.sub','${TEST}', false); select public.mall_builder_request_exchange('e0102000-0000-4000-8000-000000000041', 1, 'e0102000-0000-4000-8000-000000000022', 'size');`);
ok("시험 회원 교환 신청 됨(교환비 3,000원 대기)", r.status === 0 && psql("select fee || '/' || fee_status from mall_builder_exchanges;").stdout.trim() === "3000/waiting", r.stderr.slice(-200));
r = psql(`select set_config('request.jwt.claim.sub','${TEST}', false); select public.mall_builder_request_exchange('e0102000-0000-4000-8000-000000000043', 1, 'e0102000-0000-4000-8000-000000000022', 'size');`);
ok("10일 지난 EXQA-2는 유저 신청 막힘", r.status !== 0 && /7일/.test(r.stderr), r.stderr.slice(-200));
// Lab 발견 재현: 시험 주문에 리셀러가 붙었는지, EXQA-2 구매 확정(자동 확정 흉내) 뒤 리워드·장부가 생기는지
const rsInfo = psql(`select count(*) from mall_builder_orders where id::text like 'e0102000%' and reseller_id = '${RS}';`).stdout.trim();
psql(`update mall_builder_orders set status = 'confirmed' where id = 'e0102000-0000-4000-8000-000000000032';`);
const led = () => psql(`select (select count(*) from mall_builder_reseller_ledger where reseller_id = '${RS}') || '/' || (select count(*) from mall_builder_reseller_rewards where reseller_id = '${RS}');`).stdout.trim();
const beforeRb = led();
ok("Lab 재현: 시험 주문 2건에 추천 리셀러가 붙고 EXQA-2 구매 확정 뒤 장부·리워드 생김", rsInfo === "2" && beforeRb !== "0/0", `리셀러 붙은 주문 ${rsInfo} · 장부/리워드 ${beforeRb}`);
// 빨강: 고치기 전 되돌리기(git HEAD~ 버전, 장부 줄 삭제 없음)는 장부를 order_id 빈 채 남김 — 트랜잭션 안에서 실행 뒤 되돌림(상태 보존)
const oldRb = execFileSync("git", ["-C", MB, "show", "41715a3dc:mall-builder/docs/handoff-0102-lab/rollback.sql"], { encoding: "utf8" }).replace(/\r\n/g, "\n").replace(/^begin;$/m, "").replace(/^commit;$/m, "");
r = psql(`begin;\n${oldRb}\nselect 'LEFT=' || (select count(*) from mall_builder_reseller_ledger where reseller_id = '${RS}' and order_id is null);\nrollback;`);
ok("빨강: 고치기 전 되돌리기(41715a3dc)는 리셀러 장부를 주문 번호 빈 채 남김", /LEFT=[1-9]/.test(r.stdout), r.stdout.slice(-200) + r.stderr.slice(-200));
// 반례: 기존 주문(NF)이 시험 장부 뒤에 확정돼 리셀러 장부가 이어지면(balance_after 연쇄) — 새 되돌리기는 [멈춤], 예전(084e5b667)은 지워서 잔액 흐름을 깸
{
  const newRb = H("rollback.sql").replace(/^begin;$/m, "").replace(/^commit;$/m, "");
  const prevRb = execFileSync("git", ["-C", MB, "show", "084e5b667:mall-builder/docs/handoff-0102-lab/rollback.sql"], { encoding: "utf8" }).replace(/\r\n/g, "\n").replace(/^begin;$/m, "").replace(/^commit;$/m, "");
  const later = `update mall_builder_orders set status = 'confirmed' where id = '${NF}';`;
  const rNew = psql(`begin;\n${later}\n${newRb}\nrollback;`);
  ok("반례 초록: 시험 장부 뒤에 기존 주문 장부가 생기면 새 되돌리기 [멈춤]·아무것도 안 바꿈", rNew.status !== 0 && /\[멈춤\] 시험 주문 리셀러 장부가/.test(rNew.stderr), rNew.stderr.slice(-200));
  const rOld = psql(`begin;\n${later}\n${prevRb}\nselect 'CHAIN=' || (select string_agg(amount || ':' || balance_after, ',' order by created_at) from mall_builder_reseller_ledger where reseller_id = '${RS}');\nrollback;`);
  ok("반례 빨강: 예전 되돌리기(084e5b667)는 시험 줄만 지워 남은 장부 잔액(balance_after)이 금액과 어긋남", rOld.status === 0 && /CHAIN=(\d+):(\d+)/.test(rOld.stdout) && (() => { const m = rOld.stdout.match(/CHAIN=(\d+):(\d+)/); return m[1] !== m[2]; })(), rOld.stdout.slice(-120) + rOld.stderr.slice(-120));
}
// 기준선(시험 아닌 리셀러 기록) — 되돌리기 전후 완전히 같아야 함
const keep = () => psql(`select (select string_agg(id || ':' || status || ':' || amount || ':' || coalesce(ledger_id::text, '-'), ',' order by id) from mall_builder_reseller_rewards where reseller_id = '${RS}' and order_id::text not like 'e0102000%')
  || '|' || (select count(*) from mall_builder_reseller_ledger where reseller_id = '${RS}' and order_id::text not like 'e0102000%')
  || '|' || (select status from mall_builder_orders where id = '${NF}');`).stdout.trim();
const keepBefore = keep();
r = psql(H("rollback.sql")); ok("rollback 성공", r.status === 0, r.stderr.slice(-300));
ok("되돌린 뒤 시험 리셀러 장부·리워드 0", led() === (() => { const k = psql(`select (select count(*) from mall_builder_reseller_ledger where reseller_id = '${RS}') || '/' || (select count(*) from mall_builder_reseller_rewards where reseller_id = '${RS}');`).stdout.trim(); return k; })() && psql(`select count(*) from mall_builder_reseller_ledger where order_id::text like 'e0102000%' or (reseller_id = '${RS}' and order_id is null);`).stdout.trim() === "0", led());
ok("되돌린 뒤 기존(시험 아닌) 리셀러 리워드·장부·주문 상태 완전히 같음(대기 리워드 보존)", keep() === keepBefore && /pending/.test(keepBefore), `${keepBefore} → ${keep()}`);
const left = psql(`select (to_regclass('public.mall_builder_exchanges') is null)::text || '/' ||
  (select count(*) from pg_proc where proname in ('mall_builder_request_exchange','mall_builder_exchange_step','mall_builder_exchange_fee','mall_builder_exchange_fee_paid','delivered_at','variant_label','exchange_event','exchange_stock','lock_exchange','exchange_order_delivered','orders_exchange_guard')) || '/' ||
  (select count(*) from pg_trigger where tgname = 'mall_builder_orders_exchange_guard') || '/' ||
  (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') || '/' ||
  (select count(*) from mall_builder_orders where id::text like 'e0102000%') || '/' ||
  (select count(*) from mall_builder_products where id::text like 'e0102000%') || '/' ||
  (select count(*) from mall_builder_orders where order_no = 'OLD-18');`).stdout.trim();
ok("되돌린 뒤: 표 없음·함수 0·트리거 0·기록 0·시험 주문 0·시험 상품 0·기존 주문 그대로", left === "true/0/0/0/0/0/1", left);
r = psql(H("precheck.sql")); ok("되돌린 뒤 precheck 다시 10/10(재적용 가능)", (r.stdout.match(/\|OK$/gm) || []).length === 10, r.stdout);
adm(`drop database if exists ${DB}`);
console.log(fail ? `실패 ${fail}` : "전체 통과"); process.exit(fail ? 1 : 0);
