// Lab 0103 실행 자료 로컬 검사 — qa_ 전용 새 DB에 0001~0101 + Lab과 같은 몰·시험 회원·리셀러를 만들고 0102 실행 자료로 지금 Lab 상태(EXQA-2 자동 확정)를 재현한 뒤
// precheck → apply → (재적용 [멈춤]) → verify → 실제 동작 → 0102 정리(b5c3613c) → 뒷정리 를 실제로 돌려 판정한다. 외부 접속 0.
// 실행: node mall-builder/docs/handoff-0103-lab/check-local.mjs [--db qa_lab0103]
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync, spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const MB = join(here, "..", "..");
const i = process.argv.indexOf("--db"); const DB = i > 0 ? process.argv[i + 1] : "qa_lab0103";
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
let r;

// ── 0103 실행 자료 검사 ──
const P2 = (f) => rd(join(here, "..", "handoff-0102-lab", f));
const strip = (s) => s.replace(/^begin;$/m, "").replace(/^commit;$/m, "");
// Lab 지금 상태 만들기: 0102 적용·시험 자료 → EXQA-2 자동 확정(장부 id Lab 실측값) → 자동 확정 예약 행
for (const f of ["apply.sql", "fixture.sql"]) { const x = psql(P2(f)); if (x.status) { console.error("0102 " + f, x.stderr.slice(-300)); process.exit(2); } }
psql(`update mall_builder_orders set status = 'confirmed' where id = 'e0102000-0000-4000-8000-000000000032';
begin;
update mall_builder_reseller_rewards set ledger_id = null where order_id = 'e0102000-0000-4000-8000-000000000032';
update mall_builder_reseller_ledger set id = '7203b416-e791-487c-8708-36e9503493e8' where order_id = 'e0102000-0000-4000-8000-000000000032';
update mall_builder_reseller_rewards set ledger_id = '7203b416-e791-487c-8708-36e9503493e8' where order_id = 'e0102000-0000-4000-8000-000000000032';
commit;
insert into mall_builder_store_schedulers (store_id, job_id, auto_confirm_days) values ('0489b458-d71b-4268-9b5f-94fd7da50382', 8791152, 3)
  on conflict (store_id) do update set job_id = excluded.job_id, auto_confirm_days = 3, paused = false;
update mall_builder_store_schedulers set paused = false where store_id = '0489b458-d71b-4268-9b5f-94fd7da50382';
insert into mall_builder_store_staff (store_id, user_id, role) values ('0489b458-d71b-4268-9b5f-94fd7da50382','${ADMIN}','owner') on conflict do nothing;
insert into mall_builder_store_scheduler_secrets (store_id, run_token_hash) values ('0489b458-d71b-4268-9b5f-94fd7da50382', encode(sha256('qa-token'::bytea), 'hex'))
  on conflict (store_id) do update set run_token_hash = excluded.run_token_hash;`);
// 교환 없는 다른 주문(소비자 회원 = 추천 리셀러 없음 → 장부 영향 0): 배송 완료 5일 전 → 다음 자동 확정 대상
const DLV = "00000000-0000-0000-0000-0000000000d7";
r = psql(`insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit)
  select '${DLV}','0489b458-d71b-4268-9b5f-94fd7da50382',800018,'DLV-18','${CONS}', c.id,'{"name":"x"}','x','pending_payment',46000,false,false
  from mall_builder_store_customers c where c.store_id = '0489b458-d71b-4268-9b5f-94fd7da50382' and c.user_id = '${CONS}';
insert into mall_builder_order_items (order_id, product_id, name_snapshot, unit_price, qty, line_total) values ('${DLV}','${NF_P}','기존 상품',46000,1,46000);
update mall_builder_orders set status = 'paid' where id = '${DLV}';
update mall_builder_orders set status = 'shipping' where id = '${DLV}';
update mall_builder_orders set status = 'delivered' where id = '${DLV}';
insert into mall_builder_order_events (order_id, from_status, to_status, actor_role, created_at) values ('${DLV}','shipping','delivered','system', now() - interval '5 days');
-- EXQA-1 실제 배송을 4일 전으로(7일 안·자동 확정 3일 지남) — 같은 자동 확정 회차에 들어가게
update mall_builder_order_events set created_at = now() - interval '4 days' where order_id = 'e0102000-0000-4000-8000-000000000031' and to_status = 'delivered';`);
if (r.status) { console.error("교환 없는 주문 준비", r.stderr.slice(-300)); process.exit(2); }
const autoRun = () => psql(`select public.mall_builder_auto_progress(encode(sha256('qa-token'::bytea), 'hex'));`);
const st = (id) => psql(`select status from mall_builder_orders where id = '${id}';`).stdout.trim();
const reqEx = (uid, item) => psql(`select set_config('request.jwt.claim.sub','${uid}', false); select public.mall_builder_request_exchange('${item}', 1, 'e0102000-0000-4000-8000-000000000022', 'size');`);
// 빨강(0103 전, 지금 Lab 0102): 교환 진행 중인 EXQA-1이 있으면 실제 자동 확정 함수 한 회차가 통째로 실패 → 교환 없는 DLV도 확정 안 됨(트랜잭션으로 감싸 되돌림)
{
  const rr = psql(`begin;
select set_config('request.jwt.claim.sub','${TEST}', true);
select public.mall_builder_request_exchange('e0102000-0000-4000-8000-000000000041', 1, 'e0102000-0000-4000-8000-000000000022', 'size');
-- 교환 이력(delivered→delivered)도 자동 확정 기준 시각을 새로 시작하게 하므로(0032는 from 상태를 안 봄) 교환 이력까지 4일 전으로 옮겨 같은 회차에 넣음
update mall_builder_order_events set created_at = now() - interval '4 days' where order_id = 'e0102000-0000-4000-8000-000000000031' and to_status = 'delivered';
select public.mall_builder_auto_progress(encode(sha256('qa-token'::bytea), 'hex'));
rollback;`);
  ok("빨강(0102 그대로): 교환 진행 중 주문이 있으면 실제 자동 확정 회차 전체 실패 → 교환 없는 주문도 확정 안 됨", rr.status !== 0 && /교환이 진행 중인 주문/.test(rr.stderr) && st(DLV) === "delivered", rr.stdout.slice(-200) + rr.stderr.slice(-160) + ` DLV ${st(DLV)} · EXQA-1 ${st("e0102000-0000-4000-8000-000000000031")} · 이력 ` + psql(`select string_agg(to_status || '@' || round(extract(epoch from now() - created_at) / 86400, 1), ',') from mall_builder_order_events where order_id = 'e0102000-0000-4000-8000-000000000031';`).stdout.trim());
}
// Lab 기준값(17/1·44)은 로컬 자료와 다르므로 로컬 값으로 바꿔 넣고 판정식을 검사한다(바꾸지 않으면 그 줄이 「확인 필요」가 되는지도 확인)
const loc = psql(`select (select count(*) filter (where s.slug = 'aimaster-b2b') || '/' || count(*) filter (where s.slug = 'card-test-resale') from mall_builder_orders o join mall_builder_stores s on s.id = o.store_id where o.id::text not like 'e0102000%')
  || '|' || (select count(*) from mall_builder_notifications);`).stdout.trim().split("|");
const S = (sql) => sql.split("'17/1'").join(`'${loc[0]}'`).split("'44'").join(`'${loc[1]}'`);
console.log(`  로컬 기준값: 시험 아닌 주문 ${loc[0]} · 알림 ${loc[1]}(Lab 17/1 · 44 대신)`);

r = psql(H("precheck.sql"));
ok("빨강: Lab 기준값 그대로면 로컬에서 9·10번 「확인 필요」(기준값을 실제로 대조함)", /\n?9\|[^\n]*\|확인 필요/.test(r.stdout) && /\n10\|[^\n]*\|확인 필요/.test(r.stdout), r.stdout);
r = psql(S(H("precheck.sql")));
ok("precheck 1~10 모두 OK", (r.stdout.match(/\|OK$/gm) || []).length === 10, r.stdout);
const md5Pre = (r.stdout.match(/^11\|[^|]*\|-\|([0-9a-f]{32})\|기록$/m) || [])[1];
r = psql(`begin; insert into mall_builder_exchanges (store_id, order_id, item_id, qty, reason, requested_by) values ('0489b458-d71b-4268-9b5f-94fd7da50382','e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000041',1,'size','staff'); ${S(H("precheck.sql"))} rollback;`);
ok("빨강: 진행 중 교환이 있으면 precheck 8번 「확인 필요」(자동 확정 회차 실패 위험 알림)", /\n8\|[^\n]*\|1\|확인 필요/.test(r.stdout), r.stdout);

r = psql(H("apply.sql")); ok("apply 성공(한 트랜잭션, 원문 그대로)", r.status === 0, r.stderr.slice(-300));
r = psql(H("apply.sql")); ok("두 번째 apply → [멈춤]·변화 없음", r.status !== 0 && /\[멈춤\] 0103 적용 기록이 이미/.test(r.stderr), r.stderr.slice(-200));
r = psql(S(H("verify.sql")));
ok("verify 14/14 OK", /^15\|전체\|14\/14\|14\/14\|OK$/m.test(r.stdout), r.stdout);
const md5Post = (r.stdout.match(/^16\|[^|]*\|-\|([0-9a-f]{32})\|비교$/m) || [])[1];
ok("시험 아닌 주문 지문이 적용 전후 같음(precheck 11 = verify 16)", md5Pre && md5Pre === md5Post, `${md5Pre} / ${md5Post}`);
r = psql(`begin; grant execute on function mall_builder_private.exchange_order_status_ok(text) to authenticated; ${S(H("verify.sql"))} rollback;`);
ok("빨강: 도우미에 로그인 회원 실행 권한이 생기면 4번·「전체」 확인 필요", /^4\|[^\n]*\|true\/false\|확인 필요$/m.test(r.stdout) && /^15\|전체\|14\/14\|13\/14\|확인 필요$/m.test(r.stdout), r.stdout);

// 실제 동작(0103 뒤): 시험 회원이 EXQA-1(배송 2일) 교환 신청 → 그 상태에서 EXQA-1 구매 확정(자동 확정과 같은 상태 전이) 허용 → 리셀러 1,400원 장부(manifest)
r = reqEx(TEST, "e0102000-0000-4000-8000-000000000041");
ok("유저: delivered EXQA-1(실제 배송 4일) 교환 신청 됨", r.status === 0, r.stderr.slice(-200));
const clk = psql("select (select max(created_at) from mall_builder_order_events where order_id = 'e0102000-0000-4000-8000-000000000031' and to_status = 'delivered') > now() - interval '1 minute';").stdout.trim();
ok("발견 기록: 교환 이력이 자동 확정 기준 시각을 새로 시작함(0032가 delivered→delivered도 셈, 7일 기한은 실제 배송 기준이라 영향 없음)", clk === "t", clk);
psql("update mall_builder_order_events set created_at = now() - interval '4 days' where order_id = 'e0102000-0000-4000-8000-000000000031' and to_status = 'delivered';");
r = autoRun();
ok("실제 자동 확정 한 회차: 교환 진행 중 EXQA-1과 교환 없는 주문 둘 다 confirmed(회차 실패 없음)", r.status === 0 && st("e0102000-0000-4000-8000-000000000031") === "confirmed" && st(DLV) === "confirmed",
   r.stdout.slice(-120) + r.stderr.slice(-160) + ` EXQA-1 ${st("e0102000-0000-4000-8000-000000000031")} DLV ${st(DLV)}`);
ok("교환 없는 주문 확정은 리셀러 장부 영향 0(소비자 회원)", psql(`select count(*) from mall_builder_reseller_ledger where order_id = '${DLV}';`).stdout.trim() === "0", "");
r = psql(`select set_config('request.jwt.claim.sub','${TEST}', false); select public.mall_builder_request_exchange('e0102000-0000-4000-8000-000000000042', 1, null, 'defect');`);
ok("유저: 구매 확정된 EXQA-1(실제 배송 4일)의 다른 줄(머그컵, 옵션 없음) 교환 신청 됨 — 구매 확정 뒤에도 7일 안이면 가능", r.status === 0 && st("e0102000-0000-4000-8000-000000000031") === "confirmed", r.stderr.slice(-200));
r = reqEx(ADMIN, "e0102000-0000-4000-8000-000000000043");
ok("직원 예외: 7일 지난 confirmed EXQA-2(실제 배송 10일)도 직원 대리 신청 됨", r.status === 0, r.stderr.slice(-200));
// 7일 이후 기존 교환: EXQA-1 실제 배송을 10일 전으로 옮겨도 이미 접수한 교환은 진행 단계(회수 시작) 계속
psql(`update mall_builder_order_events set created_at = now() - interval '10 days' where order_id = 'e0102000-0000-4000-8000-000000000031' and to_status = 'delivered';`);
r = psql(`select set_config('request.jwt.claim.sub','${ADMIN}', false); select public.mall_builder_exchange_step((select id from mall_builder_exchanges where item_id = 'e0102000-0000-4000-8000-000000000041'), 'collecting', 'CJ', '123', '');`);
ok("7일 지난 뒤 이미 접수한 교환은 직원이 다음 단계(회수 시작) 진행", r.status === 0 && psql(`select step from mall_builder_exchanges where item_id = 'e0102000-0000-4000-8000-000000000041';`).stdout.trim() === "collecting", r.stderr.slice(-200));
r = reqEx(TEST, "e0102000-0000-4000-8000-000000000043");
ok("유저: 7일 지난 EXQA-2는 여전히 막힘", r.status !== 0 && /7일/.test(r.stderr), r.stderr.slice(-160));
r = psql(`update mall_builder_orders set status = 'returned' where id = 'e0102000-0000-4000-8000-000000000031';`);
ok("교환 진행 중 주문을 교환 가능 상태 밖(반품)으로는 여전히 막음", r.status !== 0 && /교환이 진행 중인 주문/.test(r.stderr), r.stderr.slice(-160));
r = psql(S(H("verify.sql")).replace("'0', (select count(*) from public.mall_builder_exchanges)", "'3', (select count(*) from public.mall_builder_exchanges)"));
ok("EXQA-1 확정 뒤 verify 13번(리셀러 장부 EXQA-2 500 + EXQA-1 1,400 manifest)·10번 OK", /^13\|[^\n]*\|true\|OK$/m.test(r.stdout) && /^10\|[^\n]*\|2\|OK$/m.test(r.stdout) && /^15\|전체\|14\/14\|14\/14\|OK$/m.test(r.stdout), r.stdout);

// 정리 폐쇄 고리: 뒷정리를 먼저 부르면 [멈춤] → 0102 정리(b5c3613c) 성공 → 뒷정리 성공 → 0102 precheck 다시 10/10
r = psql(H("teardown-after-0102-rollback.sql"));
ok("0102 정리 전 뒷정리 → [멈춤]·변화 없음", r.status !== 0 && /\[멈춤\] 0102가 아직 남아/.test(r.stderr) && psql(`select to_regprocedure('mall_builder_private.exchange_order_status_ok(text)') is not null;`).stdout.trim() === "t", r.stderr.slice(-160));
r = psql(P2("rollback.sql")); ok("0103 적용·두 주문 확정 뒤에도 0102 정리(b5c3613c) 성공", r.status === 0, r.stderr.slice(-300));
r = psql(H("teardown-after-0102-rollback.sql")); ok("뒷정리 성공", r.status === 0, r.stderr.slice(-200));
const left = psql(`select (to_regprocedure('mall_builder_private.exchange_order_status_ok(text)') is null)::text || '/' ||
  (select count(*) from supabase_migrations.schema_migrations where name in ('mall_builder_0102_exchanges','mall_builder_0103_exchange_confirmed_window')) || '/' ||
  (select count(*) from mall_builder_reseller_ledger where order_id::text like 'e0102000%' or order_id is null) || '/' ||
  (select count(*) from mall_builder_orders where id::text like 'e0102000%');`).stdout.trim();
ok("정리 뒤: 도우미 없음·0102/0103 기록 0·시험 장부 0·시험 주문 0", left === "true/0/0/0", left);
r = psql(P2("precheck.sql"));
ok("정리 뒤 0102 precheck 다시 10/10(처음 상태)", (r.stdout.match(/\|OK$/gm) || []).length === 10, r.stdout);

if (!process.env.KEEP_DB) adm(`drop database if exists ${DB}`);
console.log(fail ? `실패 ${fail}` : "전체 통과");
process.exit(fail ? 1 : 0);
