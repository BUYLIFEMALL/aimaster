// QA 실행기 — 0104(옛 0103) 교환비 카드 결제(M2-12b b3 단계1). qa_ 전용 새 DB에서만 토스 호출(mall_builder_private.toss_call)을 모의 함수로 바꿔 끼운다.
// 운영·Lab 함수는 건드리지 않음, 외부 호출 0, 실키 없음(모의 비밀 키 'test_sk_qa'). 항목마다 통과/실패, 실패 있으면 종료 코드 1.
// 사용: node mall-builder/scripts/qa/run-0104-feepay.mjs [--db qa_0104] [--no-guard]
//   --no-guard: 교환 지킴 트리거를 뺀 채 돌려 F5·F6(이중 수납·결제 뒤 변경)이 실패하는지 보는 빨강 확인용
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync, spawn } from "node:child_process";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const SRC = resolve(arg("--src", join(dirname(fileURLToPath(import.meta.url)), "..", "..")));
const DB = arg("--db", "qa_0104");
const NO_GUARD = process.argv.includes("--no-guard");
if (!/^qa_[a-z0-9_]{1,40}$/.test(DB)) { console.error("--db는 qa_로 시작"); process.exit(2); }
const C = "aww-pg-test";
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const files = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0105").sort();
if (!files.at(-1)?.startsWith("0104_")) { console.error("0104 마이그레이션이 없습니다:", SRC); process.exit(2); }
const bundle = files.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
// 토스 모의: qa_toss_mode(모드)·qa_toss_calls(호출 기록). 모드: done·fail4xx·err5xx·exception·wrong_amount·slow_done / GET: get_done·get_aborted
const mock = `create extension if not exists dblink;
-- 외부 효과 기록: 모의 토스 POST가 별도 연결(dblink)로 남김 → 부른 트랜잭션이 되돌려져도 남음(실제 토스에 요청이 나간 것과 같음)
create table public.qa_toss_ext (id serial, method text, path text, body jsonb, idem text, at timestamptz default clock_timestamp());
create table public.qa_toss_mode (k text primary key, v text);
insert into public.qa_toss_mode values ('post','done'),('get','get_done');
create table public.qa_toss_calls (id serial, method text, path text, body jsonb, idem text, at timestamptz default clock_timestamp());
grant all on public.qa_toss_mode, public.qa_toss_calls to authenticated; grant usage on sequence public.qa_toss_calls_id_seq to authenticated;
create or replace function mall_builder_private.toss_call(p_secret text, p_method text, p_path text, p_body jsonb, p_idem text)
returns table (status integer, body jsonb) language plpgsql security definer set search_path = '' as $m$
declare m text;
begin
  insert into public.qa_toss_calls (method, path, body, idem) values (p_method, p_path, p_body, p_idem);
  if p_method = 'POST' then
    perform public.dblink_exec('dbname=${DB} user=postgres', format('insert into public.qa_toss_ext (method, path, body, idem) values (%L, %L, %L::jsonb, %L)', p_method, p_path, p_body::text, p_idem));
  end if;
  if p_method = 'GET' then
    select v into m from public.qa_toss_mode where k = 'get';
    if m = 'get_404' then return query select 404, '{"code":"NOT_FOUND_PAYMENT","message":"결제 정보를 찾을 수 없습니다"}'::jsonb; return; end if;
    return query select 200, jsonb_build_object('status', case when m = 'get_aborted' then 'ABORTED' else 'DONE' end,
      'orderId', (select 'exfee-' || x.id from public.mall_builder_exchanges x join public.mall_builder_exchange_fee_payments p on p.exchange_id = x.id where '/v1/payments/' || p.payment_key = p_path limit 1),
      'totalAmount', (select p.amount from public.mall_builder_exchange_fee_payments p where '/v1/payments/' || p.payment_key = p_path limit 1), 'method', '카드');
    return;
  end if;
  select v into m from public.qa_toss_mode where k = 'post';
  if m = 'exception' then raise exception 'qa 연결 끊김'; end if;
  if m = 'slow_done' then perform pg_sleep(2); end if;
  if m = 'slow_long' then perform pg_sleep(6); end if;
  if m = 'done_bad_total' then return query select 200, jsonb_build_object('status', 'DONE', 'orderId', p_body ->> 'orderId', 'method', '카드', 'totalAmount', 'bad', 'approvedAt', '2026-11-17T10:00:00+09:00'); return; end if;
  if m = 'done_bad_date' then return query select 200, jsonb_build_object('status', 'DONE', 'orderId', p_body ->> 'orderId', 'method', '카드', 'totalAmount', (p_body ->> 'amount')::bigint, 'approvedAt', 'bad'); return; end if;
  if m = 'fail4xx' then return query select 400, '{"code":"REJECT_CARD_COMPANY","message":"카드사 거절"}'::jsonb; return; end if;
  if m = 'err5xx' then return query select 500, '{"code":"FAILED_INTERNAL","message":"토스 내부 오류"}'::jsonb; return; end if;
  return query select 200, jsonb_build_object('status', 'DONE', 'orderId', p_body ->> 'orderId', 'method', '카드',
    'totalAmount', case when m = 'wrong_amount' then (p_body ->> 'amount')::bigint + 1 else (p_body ->> 'amount')::bigint end,
    'approvedAt', '2026-11-17T10:00:00+09:00', 'receipt', jsonb_build_object('url', 'https://receipt.qa'));
end $m$;
-- 교환 반영(paid) 실패 주입: qa_fail_mark.on_ = true면 교환 fee_status → paid 갱신에서 오류(QA012 반례)
create table public.qa_fail_mark (on_ boolean); insert into public.qa_fail_mark values (false);
create or replace function public.qa_fail_mark_trg() returns trigger language plpgsql as $t$ begin
  if new.fee_status = 'paid' and old.fee_status is distinct from 'paid' and (select on_ from public.qa_fail_mark) then raise exception 'qa 교환 반영 실패 주입'; end if;
  return new; end $t$;
create trigger qa_fail_mark_trg before update on public.mall_builder_exchanges for each row execute function public.qa_fail_mark_trg();`;

const psqlArgs = ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-f", "-"];
const run = (sql) => spawnSync("docker", psqlArgs, { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
const val = (sql) => { const r = run(sql); if (r.status) throw new Error(r.stderr); return r.stdout.trim().split("\n").at(-1); };
const as = (uid) => `select set_config('request.jwt.claim.sub','${uid}', false);\n`;
const asRole = (uid, sql) => { const r = run(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${uid}', true);\n${sql}\ncommit;`); return { ok: r.status === 0, out: r.stdout, err: (r.stderr.match(/ERROR:\s+(.*)/) || [, ""])[1] }; };
const tryAs = (uid, sql) => { const r = run(as(uid) + sql); return { ok: r.status === 0, out: r.stdout.trim().split("\n").at(-1) ?? "", err: (r.stderr.match(/ERROR:\s+(.*)/) || [, ""])[1] }; };
let pass = 0, fail = 0;
const check = (id, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "통과" : "실패"} ${id}${ok ? "" : ` — 실제: ${got}`}`); };

adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["번들", bundle], ["0061", read("scripts/scenario-0061-resale-apply.sql")], ["토스 모의", mock]]) {
  const r = run(p); if (r.status) { console.error(`[${n}] 실패`, r.stderr.split("\n").filter((l) => /ERROR/.test(l)).join("\n")); process.exit(2); }
}
if (NO_GUARD) run("drop trigger mall_builder_exchanges_fee_card_guard on public.mall_builder_exchanges;");

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const STORE = "00000000-0000-0000-0000-00000000005a", OWNER = "00000000-0000-0000-0000-0000000000a1";
const U1 = id(0xf1), U2 = id(0xf2), S3 = id(0xf3), P = id(0xc1), V1 = id(0xd1), V2 = id(0xd2), POL = id(0xb1);
const N = 30; // 주문 o1~o20, 각 티셔츠 V1 2개, 배송 완료 1일 전, 주인 U1
const O = (n) => id(0xe00 + n), I = (n) => id(0x1000 + n);
{
  const fx = [
    `insert into auth.users (id, email) values ('${U1}','u1@x.test'),('${U2}','u2@x.test'),('${S3}','s3@x.test');`,
    `insert into public.profiles (id, email) values ('${U1}','u1@x.test'),('${U2}','u2@x.test'),('${S3}','s3@x.test');`,
    `insert into mall_builder_stores (id, name, owner_id, slug) values ('${id(0x5b)}','다른몰','${U2}','other-mall');`,
    `insert into mall_builder_store_staff (store_id, user_id, role, perms) values ('${id(0x5b)}','${S3}','staff','{"orders":true}');`,
    `insert into mall_builder_store_scheduler_secrets (store_id, toss_secret_key) values ('${STORE}','test_sk_qa') on conflict (store_id) do update set toss_secret_key = excluded.toss_secret_key;`,
    `insert into mall_builder_shipping_policies (id, store_id, name, type, exchange_fee) values ('${POL}','${STORE}','교환비','free',3000);`,
    `insert into mall_builder_products (id, store_id, name, base_price, stock_mode, stock) values ('${P}','${STORE}','티셔츠',10000,'product',0);`,
    `insert into mall_builder_product_variants (id, product_id, store_id, key, "values", stock) values ('${V1}','${P}','${STORE}','S','["S"]',50),('${V2}','${P}','${STORE}','M','["M"]',50);`,
  ];
  for (let n = 1; n <= N; n++) {
    fx.push(`insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values ('${O(n)}','${STORE}',${300 + n},'F-${n}','${U1}','{"name":"x"}','x','delivered',20000,false,false);`,
      `insert into mall_builder_order_items (id, order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id) values ('${I(n)}','${O(n)}','${P}','${V1}','티셔츠','S',10000,2,20000,'${POL}');`,
      `insert into mall_builder_order_events (order_id, from_status, to_status, actor_role, created_at) values ('${O(n)}','shipping','delivered','staff', now() - interval '1 day');`);
  }
  const r = run(fx.join("\n")); if (r.status) { console.error("[준비] 실패", r.stderr); process.exit(2); }
}
const mode = (k, v) => run(`update public.qa_toss_mode set v = '${v}' where k = '${k}';`);
const calls = () => Number(val("select count(*) from public.qa_toss_calls;"));
// 교환 만들기(유저 사이즈 사유 → 교환비 3,000 대기). 반환 = 교환 id
const mkEx = (n) => { const r = tryAs(U1, `select public.mall_builder_request_exchange('${I(n)}', 1, '${V2}', 'size');`); if (!r.ok) throw new Error(r.err); return r.out; };
const KEY = (n) => `qa_paykey_${String(n).padStart(4, "0")}`;
const prep = (uid, ex, key, amt = 3000) => tryAs(uid, `select public.mall_builder_exchange_fee_card_prepare('${ex}', '${key}', ${amt});`);
const conf = (uid, ex, key) => tryAs(uid, `select public.mall_builder_exchange_fee_card_confirm('${ex}', '${key}');`);
const confirm = (uid, ex, key, amt = 3000) => { const p = prep(uid, ex, key, amt); if (!p.ok || !/"prepared": true/.test(p.out)) return p; return conf(uid, ex, key); };
const ext = () => Number(val("select count(*) from public.qa_toss_ext;"));
const exCol = (ex, c) => val(`select ${c} from mall_builder_exchanges where id = '${ex}';`);
const payCol = (ex, c) => val(`select coalesce((select ${c}::text from mall_builder_exchange_fee_payments where exchange_id = '${ex}'), '(없음)');`);

// F1 정상 결제
let ex = mkEx(1), c0 = calls();
let r = confirm(U1, ex, KEY(1));
const notes1 = val(`select string_agg(note, ' | ') from mall_builder_order_events where order_id = '${O(1)}';`);
check("F1 정상 결제 → 결제 done·교환비 paid·이력 「카드 결제 완료」·이력에 결제 키 없음·토스 1회",
  r.ok && /"ok": true/.test(r.out) && payCol(ex, "status") === "done" && exCol(ex, "fee_status") === "paid" && /카드 결제 완료/.test(notes1) && !notes1.includes(KEY(1)) && calls() === c0 + 1,
  `${r.err} ${r.out} ${payCol(ex, "status")} ${exCol(ex, "fee_status")} ${notes1}`);
r = confirm(U1, ex, KEY(1));
check("F1b 같은 결제 다시 승인 → already·토스 추가 호출 0", r.ok && /already/.test(r.out) && calls() === c0 + 1, r.out + r.err);
// F2 금액 다름 / F3 남의 교환 / F15 몰 키 없음 — 토스 호출 0
ex = mkEx(2); c0 = calls();
const r2 = confirm(U1, ex, KEY(2), 2999), r3 = confirm(U2, ex, KEY(2));
run(`update mall_builder_store_scheduler_secrets set toss_secret_key = '' where store_id = '${STORE}';`);
const r15 = confirm(U1, ex, KEY(2));
run(`update mall_builder_store_scheduler_secrets set toss_secret_key = 'test_sk_qa' where store_id = '${STORE}';`);
check("F2·F3·F15 금액 다름·남의 교환·몰 키 없음 → 막힘·토스 호출 0·결제 기록 없음",
  !r2.ok && /교환비/.test(r2.err) && !r3.ok && /찾을 수 없습니다/.test(r3.err) && !r15.ok && /카드 결제 설정/.test(r15.err) && calls() === c0 && payCol(ex, "status") === "(없음)",
  `${r2.err} | ${r3.err} | ${r15.err} | 호출 ${calls() - c0}`);
// F4 무통장 먼저 확인 → 카드 승인 막힘·토스 0
ex = mkEx(3); tryAs(OWNER, `select public.mall_builder_exchange_fee_paid('${ex}');`); c0 = calls();
r = confirm(U1, ex, KEY(3));
check("F4 무통장 입금 확인 뒤 카드 승인 → 막힘·토스 0(이중 수납 방지)", !r.ok && /결제를 기다리는 교환비가 없습니다/.test(r.err) && calls() === c0, r.err);
// F5 카드 완료 뒤 무통장 확인 → 막힘 / F6 카드 완료 뒤 금액 변경·거절 → 막힘
ex = mkEx(4); confirm(U1, ex, KEY(4));
const r5 = tryAs(OWNER, `select public.mall_builder_exchange_fee_paid('${ex}');`);
check("F5 카드 결제 완료 뒤 무통장 입금 확인 → 막힘(이중 수납)", !r5.ok, r5.ok ? "통과됨" : r5.err);
ex = mkEx(5); mode("post", "err5xx"); confirm(U1, ex, KEY(5)); mode("post", "done");
const r6a = tryAs(OWNER, `select public.mall_builder_exchange_fee('${ex}', 0);`);
const r6b = tryAs(OWNER, `select public.mall_builder_exchange_step('${ex}', 'rejected', '', '', '취소');`);
const r6c = tryAs(OWNER, `select public.mall_builder_exchange_fee_paid('${ex}');`);
check("F6 카드 확인 중(unknown) 금액 변경·거절·무통장 확인 → 모두 막힘(거절은 관리자 문의 안내)",
  !r6a.ok && /바꿀 수 없습니다/.test(r6a.err) && !r6b.ok && /관리자/.test(r6b.err) && !r6c.ok && exCol(ex, "step") === "requested" && exCol(ex, "fee") === "3000",
  `${r6a.ok} ${r6a.err} | ${r6b.ok} ${r6b.err} | ${r6c.ok}`);
// F7 4xx 실패 → 다시 결제 됨
ex = mkEx(6); mode("post", "fail4xx"); r = confirm(U1, ex, KEY(6)); const st7 = payCol(ex, "status"); mode("post", "done");
const r7 = confirm(U1, ex, KEY(60));
check("F7 카드사 거절(4xx) → failed·교환비 대기 그대로, 새 결제로 다시 → done", st7 === "failed" && r.ok && /"ok": false/.test(r.out) && r7.ok && payCol(ex, "status") === "done" && exCol(ex, "fee_status") === "paid", `${st7} ${r.out} ${r7.err}`);
// F8 5xx → unknown, 다시 눌러도 토스 재호출 0, 직원 다시 확인 → done
ex = mkEx(7); mode("post", "err5xx"); confirm(U1, ex, KEY(7)); mode("post", "done"); c0 = calls();
const r8 = confirm(U1, ex, KEY(70));
const c8 = calls(); // 재승인 직후(다시 확인 GET 전)에 센다
const st8 = payCol(ex, "status");
const r8b = tryAs(OWNER, `select public.mall_builder_exchange_fee_card_recheck('${ex}');`);
check("F8 5xx → unknown, 다시 승인해도 토스 재호출 0(자동 재결제 없음), 직원 다시 확인(GET DONE) → done·paid",
  st8 === "unknown" && r8.ok && /확인하고 있습니다/.test(r8.out) && c8 === c0 && r8b.ok && payCol(ex, "status") === "done" && exCol(ex, "fee_status") === "paid",
  `${st8} ${r8.out} 재승인 호출 ${c8 - c0} ${r8b.err}`);
// F9 연결 끊김 → unknown, 다시 확인 ABORTED → failed, 그 뒤 무통장 확인 가능
ex = mkEx(8); mode("post", "exception"); confirm(U1, ex, KEY(8)); mode("post", "done"); const st9 = payCol(ex, "status");
mode("get", "get_aborted"); tryAs(OWNER, `select public.mall_builder_exchange_fee_card_recheck('${ex}');`); mode("get", "get_done");
const r9 = tryAs(OWNER, `select public.mall_builder_exchange_fee_paid('${ex}');`);
check("F9 연결 끊김 → unknown, 다시 확인 ABORTED → failed, 그 뒤 무통장 확인 됨", st9 === "unknown" && payCol(ex, "status") === "failed" && r9.ok && exCol(ex, "fee_status") === "paid", `${st9} ${payCol(ex, "status")} ${r9.err}`);
// F10 토스가 다른 금액으로 DONE → 완료 처리 안 함(unknown)
ex = mkEx(9); mode("post", "wrong_amount"); confirm(U1, ex, KEY(9)); mode("post", "done");
check("F10 토스 응답 금액이 교환비와 다르면 완료 처리 안 함(unknown·교환비 대기)", payCol(ex, "status") === "unknown" && exCol(ex, "fee_status") === "waiting", `${payCol(ex, "status")} ${exCol(ex, "fee_status")}`);
// F12 단계·주문 상태
ex = mkEx(10); tryAs(OWNER, `select public.mall_builder_exchange_fee('${ex}', 0); select public.mall_builder_exchange_step('${ex}', 'collected'); select public.mall_builder_exchange_step('${ex}', 'reshipped', 'CJ', '1');`);
tryAs(OWNER, `select public.mall_builder_exchange_fee('${ex}', 3000);`); // 재발송 뒤라 금액 변경도 막힘(0102)
const r12a = confirm(U1, ex, KEY(10));
const ex11 = mkEx(11); run(`alter table public.mall_builder_orders disable trigger mall_builder_orders_exchange_guard; update public.mall_builder_orders set status = 'returned' where id = '${O(11)}'; alter table public.mall_builder_orders enable trigger mall_builder_orders_exchange_guard;`);
const r12b = confirm(U1, ex11, KEY(11));
check("F12 재발송된 교환·배송 완료 아닌 주문 → 결제 막힘", !r12a.ok && !r12b.ok && /배송 완료/.test(r12b.err), `${r12a.ok} ${r12a.err} | ${r12b.err}`);
// F13 권한: anon 실행 0, 결제 키 칸 읽기 불가, 다른 칸은 주인만, 남은 0줄
const anon = val(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('mall_builder_exchange_fee_card_prepare','mall_builder_exchange_fee_card_confirm','mall_builder_exchange_fee_card_recheck') and has_function_privilege('anon', p.oid, 'execute');`);
const k1 = asRole(U1, "select payment_key from public.mall_builder_exchange_fee_payments limit 1;");
const own = asRole(U1, "select count(*) from public.mall_builder_exchange_fee_payments;");
const other = asRole(U2, "select count(*) from public.mall_builder_exchange_fee_payments;");
const direct = asRole(U1, `update public.mall_builder_exchange_fee_payments set status = 'done';`);
check("F13 anon 실행 0·결제 키 칸 읽기 거부·주인은 다른 칸 읽음·남은 0줄·직접 수정 거부",
  anon === "0" && !k1.ok && /permission denied/.test(k1.err) && own.ok && Number(own.out.trim().split("\n").filter((l) => /^\d+$/.test(l)).at(-1)) > 0 && other.ok && other.out.trim().split("\n").filter((l) => /^\d+$/.test(l)).at(-1) === "0" && !direct.ok,
  `anon ${anon} / 키 ${k1.ok} ${k1.err} / 주인 ${own.out} / 남 ${other.out} / 수정 ${direct.ok}`);
// F14 다시 확인 권한: 유저·다른 몰 직원 → 막힘
ex = mkEx(12); mode("post", "err5xx"); confirm(U1, ex, KEY(12)); mode("post", "done");
const r14a = tryAs(U1, `select public.mall_builder_exchange_fee_card_recheck('${ex}');`), r14b = tryAs(S3, `select public.mall_builder_exchange_fee_card_recheck('${ex}');`);
check("F14 다시 확인은 이 몰 주문 권한 직원만(유저·다른 몰 직원 막힘)", !r14a.ok && !r14b.ok && payCol(ex, "status") === "unknown", `${r14a.ok}/${r14b.ok}`);
// F16 회귀: 카드 결제 없는 교환 — 금액 변경·무통장 확인·거절 기존대로
ex = mkEx(13); const a16 = tryAs(OWNER, `select public.mall_builder_exchange_fee('${ex}', 5000);`), b16 = tryAs(OWNER, `select public.mall_builder_exchange_fee_paid('${ex}');`);
const ex16 = mkEx(14); const c16 = tryAs(OWNER, `select public.mall_builder_exchange_step('${ex16}', 'rejected', '', '', '확인 결과 정상');`);
check("F16 카드 결제 없는 교환은 금액 변경·무통장 확인·거절 기존대로", a16.ok && b16.ok && c16.ok && exCol(ex, "fee_status") === "paid" && exCol(ex16, "step") === "rejected", `${a16.err}|${b16.err}|${c16.err}`);

// F17 결제 기록이 「요청 중」으로 남음(서버 중단 흉내) → 무통장 확인·거절·금액 변경 모두 막힘
ex = mkEx(16);
run(`insert into mall_builder_exchange_fee_payments (exchange_id, store_id, order_id, toss_order_id, payment_key, amount, status) values ('${ex}','${STORE}','${O(16)}','exfee-${ex}','${KEY(16)}',3000,'requested');`);
const f17 = [tryAs(OWNER, `select public.mall_builder_exchange_fee_paid('${ex}');`), tryAs(OWNER, `select public.mall_builder_exchange_step('${ex}', 'rejected', '', '', '취소');`), tryAs(OWNER, `select public.mall_builder_exchange_fee('${ex}', 0);`)];
check("F17 카드 결제 요청 중(requested) → 무통장 확인·거절·금액 변경 모두 막힘", f17.every((x) => !x.ok) && exCol(ex, "fee_status") === "waiting" && exCol(ex, "step") === "requested", f17.map((x) => `${x.ok} ${x.err}`).join(" | "));
// F18 세션 설정값으로 우회 시도 → 여전히 막힘(지킴은 결제 기록·금액으로만 판단)
const f18 = tryAs(OWNER, `select set_config('mall_builder.exfee_card', 'on', false); select public.mall_builder_exchange_fee_paid('${ex}');`);
check("F18 세션 설정값(mall_builder.exfee_card=on)을 켜도 확인 중 결제가 있으면 무통장 확인 막힘", !f18.ok && exCol(ex, "fee_status") === "waiting", f18.ok ? "통과됨(우회)" : f18.err);

// F19~F21(QA012 반례): 토스는 DONE(돈 나감)인데 그 뒤 내부 처리에서 오류 — 기대: 오류로 끝나지 않고 결제 기록 unknown·결제 키 보존,
// 다시 승인해도 토스 승인 0, 직원 다시 확인(조회)으로 복구. 실측값을 함께 출력(지금 코드는 SQL 오류·결제 기록 0으로 사라지는지)
const keyKept = (ex, key) => val(`select count(*) from mall_builder_exchange_fee_payments where exchange_id = '${ex}' and payment_key = '${key}';`);
for (const [tag, n, setup, teardown] of [
  ["F19 응답 totalAmount 숫자 아님", 17, () => mode("post", "done_bad_total"), () => mode("post", "done")],
  ["F20 응답 approvedAt 시각 아님", 18, () => mode("post", "done_bad_date"), () => mode("post", "done")],
  ["F21 교환 반영(paid) 단계 오류 주입", 19, () => run("update public.qa_fail_mark set on_ = true;"), () => run("update public.qa_fail_mark set on_ = false;")],
]) {
  const exN = mkEx(n); setup(); const cA = calls();
  const first = confirm(U1, exN, KEY(n));
  const afterFirst = calls(), st = payCol(exN, "status"), kept = keyKept(exN, KEY(n));
  const again = confirm(U1, exN, KEY(n)); const againCalls = calls() - afterFirst;
  teardown();
  const rec = tryAs(OWNER, `select public.mall_builder_exchange_fee_card_recheck('${exN}');`);
  const fin = `${payCol(exN, "status")}/${exCol(exN, "fee_status")}`;
  console.log(`  ${tag} 실측: 첫 승인 ${first.ok ? "응답 " + first.out.slice(0, 80) : "SQL 오류 " + first.err.slice(0, 60)} · 토스 승인 ${afterFirst - cA}회 · 결제 기록 ${st} · 결제 키 보존 ${kept} · 재승인 토스 ${againCalls}회 · 다시 확인 ${rec.ok ? "됨" : "막힘 " + rec.err.slice(0, 50)} → ${fin}`);
  check(`${tag} → 오류 아닌 unknown·결제 키 보존·재승인 토스 0·다시 확인으로 done/paid 복구`,
    first.ok && st === "unknown" && kept === "1" && againCalls === 0 && rec.ok && fin === "done/paid", `위 실측 참고`);
}

// F11 두 연결 동시 승인 → 토스 1번만(나중 연결은 잠금 대기 1초 넘겨 토스 부르기 전에 끝남)
ex = mkEx(15); mode("post", "slow_done"); c0 = calls();
const A = spawn("docker", psqlArgs, { stdio: ["pipe", "pipe", "pipe"] }); let aErr = ""; A.stderr.on("data", (d) => (aErr += d));
A.stdin.end(as(U1) + `select public.mall_builder_exchange_fee_card_prepare('${ex}', '${KEY(15)}', 3000);\nselect public.mall_builder_exchange_fee_card_confirm('${ex}', '${KEY(15)}');\n`);
await new Promise((res) => setTimeout(res, 600));
const rB = confirm(U1, ex, KEY(150));
await new Promise((res) => A.on("close", res));
mode("post", "done");
check("F11 동시 승인 2건 → 토스 호출 1번·결제 done 1건(나중 건은 토스 전에 끝남)",
  calls() === c0 + 1 && payCol(ex, "status") === "done" && !/ERROR/.test(aErr) && (!rB.ok || /확인하고 있습니다|already/.test(rB.out)),
  `호출 ${calls() - c0} 상태 ${payCol(ex, "status")} A ${aErr.slice(-120)} B ${rB.ok} ${rB.out} ${rB.err}`);

// ── 두 단계(준비 → 승인) 영속성 P1~P11 — 외부 효과는 qa_toss_ext(트랜잭션 밖), qa_toss_calls는 DB 되돌림에 같이 되돌려지는 기록 ──
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const extFor = (key) => val(`select count(*) || '/' || count(distinct body::text) || '/' || count(distinct idem) || '/' || coalesce(min(idem), '-') || '/' || coalesce(min(body ->> 'orderId'), '-') || '/' || coalesce(min(body ->> 'amount'), '-') from public.qa_toss_ext where body ->> 'paymentKey' = '${key}';`);
mode("post", "done"); mode("get", "get_done");
// P1 준비만: 외부 호출 0, 키·금액·주문 번호·멱등키·처음 시각 고정, 상태 prepared
ex = mkEx(20); let e0 = ext();
r = prep(U1, ex, KEY(20));
const p1 = `${payCol(ex, "status")}/${payCol(ex, "amount")}/${payCol(ex, "toss_order_id") === "exfee-" + ex}/${payCol(ex, "idempotency_key") === "exfee-confirm-" + KEY(20)}/${payCol(ex, "prepared_at") !== "(없음)"}`;
check("P1 준비만 → prepared·금액 3000·토스 주문 번호·멱등키 고정·처음 시각 있음·외부 호출 0", r.ok && p1 === "prepared/3000/true/true/true" && ext() === e0, `${p1} ${r.err} 외부 ${ext() - e0}`);
// P2 같은 키로 다시 준비 → 시각·멱등키·수정 시각 그대로
const t1 = payCol(ex, "prepared_at"), u1 = payCol(ex, "updated_at"); pause(1200);
r = prep(U1, ex, KEY(20));
check("P2 같은 키로 다시 준비 → 그대로 성공·처음 시각·멱등키·수정 시각 안 바뀜·외부 0", r.ok && /"prepared": true/.test(r.out) && payCol(ex, "prepared_at") === t1 && payCol(ex, "updated_at") === u1 && ext() === e0, `${r.out} ${t1}→${payCol(ex, "prepared_at")}`);
// P3 다른 키로 준비 → 거절(앞 결제 확인 중)·기록 그대로
r = prep(U1, ex, KEY(200));
check("P3 준비 중 다른 키 → 「확인하고 있습니다」·결제 키 그대로", r.ok && /확인하고 있습니다/.test(r.out) && val(`select count(*) from mall_builder_exchange_fee_payments where exchange_id = '${ex}' and payment_key = '${KEY(20)}';`) === "1", r.out + r.err);
// P4 준비 중 지킴: 무통장 확인·거절·금액 변경 모두 막힘
const p4 = [tryAs(OWNER, `select public.mall_builder_exchange_fee_paid('${ex}');`), tryAs(OWNER, `select public.mall_builder_exchange_step('${ex}', 'rejected', '', '', '취소');`), tryAs(OWNER, `select public.mall_builder_exchange_fee('${ex}', 0);`)];
check("P4 준비(prepared) 중 무통장 확인·거절·금액 변경 → 모두 막힘", p4.every((x) => !x.ok) && exCol(ex, "fee_status") === "waiting", p4.map((x) => x.err).join(" | "));
// P5 승인 → 외부 1회·본문/멱등키 = 준비 때 값 → done·paid
r = conf(U1, ex, KEY(20));
check("P5 승인 → 외부 POST 1회(멱등키·주문 번호·금액 = 준비 고정값)·done·paid", r.ok && payCol(ex, "status") === "done" && exCol(ex, "fee_status") === "paid" && extFor(KEY(20)) === `1/1/1/exfee-confirm-${KEY(20)}/exfee-${ex}/3000`, `${r.out} ${extFor(KEY(20))}`);

// P6 강제 중단: 준비 커밋 → 승인이 토스 요청을 보낸 뒤 연결이 끊김(서버가 세션 종료) → 결제 기록은 prepared로 남음(requested 되돌려짐),
//    DB 안 호출 기록은 되돌려졌지만 외부 요청은 1회 나감 → 다시 승인 = 같은 멱등키·같은 본문으로 1회 더 → done
ex = mkEx(21); prep(U1, ex, KEY(21)); mode("post", "slow_long");
{
  const A = spawn("docker", psqlArgs, { stdio: ["pipe", "pipe", "pipe"] }); let aErr = ""; A.stderr.on("data", (d) => (aErr += d));
  A.stdin.end(as(U1) + `select public.mall_builder_exchange_fee_card_confirm('${ex}', '${KEY(21)}');\n`);
  for (let i = 0; i < 40 && val(`select count(*) from public.qa_toss_ext where body ->> 'paymentKey' = '${KEY(21)}';`) === "0"; i++) pause(150);
  const killed = val(`select count(pg_terminate_backend(pid)) from pg_stat_activity where pid <> pg_backend_pid() and query like '%card_confirm(''${ex}''%';`);
  await new Promise((res) => A.on("close", res));
  mode("post", "done");
  const afterAbort = `${payCol(ex, "status")}/${payCol(ex, "requested_at")}/${val(`select count(*) from public.qa_toss_calls where body ->> 'paymentKey' = '${KEY(21)}';`)}/${extFor(KEY(21)).split("/")[0]}`;
  check("P6a 승인 도중 강제 중단 → prepared 남음·requested 표시 되돌려짐·DB 안 호출 기록 0(되돌려짐)·외부 요청 1(나감)",
    killed === "1" && /terminat|connection/i.test(aErr) && afterAbort === "prepared/(없음)/0/1", `종료 ${killed} · ${afterAbort} · A ${aErr.slice(-120)}`);
  r = conf(U1, ex, KEY(21));
  check("P6b 다시 승인 → 같은 멱등키·같은 본문으로 1회 더(외부 2회, 본문·멱등키 1종) → done·paid",
    r.ok && payCol(ex, "status") === "done" && exCol(ex, "fee_status") === "paid" && extFor(KEY(21)) === `2/1/1/exfee-confirm-${KEY(21)}/exfee-${ex}/3000`, `${r.out} ${r.err} ${extFor(KEY(21))}`);
}
// P7 다른 작업자 중복 차단: A가 승인 중(토스 응답 대기, 잠금 보유) → B가 같은 키로 승인 → 잠금 대기 1초 넘어 멈춤·외부 요청 0 → A 끝난 뒤 B 다시 → already
ex = mkEx(22); prep(U1, ex, KEY(22)); mode("post", "slow_done");
{
  const A = spawn("docker", psqlArgs, { stdio: ["pipe", "pipe", "pipe"] }); let aErr = ""; A.stderr.on("data", (d) => (aErr += d));
  A.stdin.end(as(U1) + `select public.mall_builder_exchange_fee_card_confirm('${ex}', '${KEY(22)}');\n`);
  for (let i = 0; i < 40 && val(`select count(*) from public.qa_toss_ext where body ->> 'paymentKey' = '${KEY(22)}';`) === "0"; i++) pause(100);
  const rB = conf(U1, ex, KEY(22));
  await new Promise((res) => A.on("close", res));
  mode("post", "done");
  const rB2 = conf(U1, ex, KEY(22));
  check("P7 다른 작업자 동시 승인 → 뒤 요청은 잠금 대기 초과로 멈춤(외부 요청 0)·외부 1회·done·뒤에 다시 → already",
    !rB.ok && /lock/i.test(rB.err) && !/ERROR/.test(aErr) && extFor(KEY(22)).startsWith("1/") && payCol(ex, "status") === "done" && rB2.ok && /already/.test(rB2.out),
    `B ${rB.ok} ${rB.err} · 외부 ${extFor(KEY(22))} · B2 ${rB2.out}`);
}
// P8 30분 경계: 준비 31분 전 → 승인해도 외부 0·prepared 그대로(직원 확인 안내) → 다시 확인 GET DONE(주문 번호·금액 맞음) → done / 29분 전은 승인됨
ex = mkEx(23); prep(U1, ex, KEY(23)); run(`update mall_builder_exchange_fee_payments set prepared_at = now() - interval '31 minutes' where exchange_id = '${ex}';`);
e0 = ext(); r = conf(U1, ex, KEY(23));
const p8a = `${payCol(ex, "status")}/${ext() - e0}`;
const r8r = tryAs(OWNER, `select public.mall_builder_exchange_fee_card_recheck('${ex}');`);
const ex24 = mkEx(24); prep(U1, ex24, KEY(24)); run(`update mall_builder_exchange_fee_payments set prepared_at = now() - interval '29 minutes' where exchange_id = '${ex24}';`);
const r24 = conf(U1, ex24, KEY(24));
check("P8 처음 준비 31분 뒤 승인 → 외부 0·prepared 유지·「30분」 안내, 직원 다시 확인 GET → done / 29분은 정상 승인",
  r.ok && /"expired": true/.test(r.out) && p8a === "prepared/0" && r8r.ok && payCol(ex, "status") === "done" && r24.ok && payCol(ex24, "status") === "done",
  `${r.out} ${p8a} 확인 ${r8r.err} ${payCol(ex, "status")} / 29분 ${r24.out} ${payCol(ex24, "status")}`);
// P9 GET 404·조회 실패 → 상태 그대로(재결제 허용으로 풀지 않음): prepared·unknown 둘 다
ex = mkEx(25); prep(U1, ex, KEY(25)); const ex26 = mkEx(26); mode("post", "err5xx"); confirm(U1, ex26, KEY(26)); mode("post", "done");
mode("get", "get_404");
const r9a = tryAs(OWNER, `select public.mall_builder_exchange_fee_card_recheck('${ex}');`), r9b = tryAs(OWNER, `select public.mall_builder_exchange_fee_card_recheck('${ex26}');`);
mode("get", "get_done");
check("P9 다시 확인 GET 404 → 오류 안내·상태 그대로(prepared·unknown 유지, 해제 없음)",
  !r9a.ok && !r9b.ok && payCol(ex, "status") === "prepared" && payCol(ex26, "status") === "unknown" && exCol(ex, "fee_status") === "waiting", `${r9a.err} | ${r9b.err} | ${payCol(ex, "status")} ${payCol(ex26, "status")}`);
// P10 requested가 남은 경우(승인 표시 커밋 흉내) → 승인해도 외부 0
ex = mkEx(27); prep(U1, ex, KEY(27)); run(`update mall_builder_exchange_fee_payments set status = 'requested' where exchange_id = '${ex}';`);
e0 = ext(); r = conf(U1, ex, KEY(27));
check("P10 requested 상태 → 승인해도 외부 POST 0·「확인하고 있습니다」", r.ok && /확인하고 있습니다/.test(r.out) && ext() === e0 && payCol(ex, "status") === "requested", `${r.out} 외부 ${ext() - e0}`);
// P11 실패 뒤: 같은 키 다시 준비 → 막힘 / 새 키 → 새 처음 시각·새 멱등키로 교체
ex = mkEx(28); mode("post", "fail4xx"); confirm(U1, ex, KEY(28)); mode("post", "done");
const t28 = payCol(ex, "prepared_at"); pause(1100);
const r11a = prep(U1, ex, KEY(28)), r11b = prep(U1, ex, KEY(280));
check("P11 실패 뒤 같은 키 준비 막힘·새 키는 새 처음 시각·새 멱등키로 교체(prepared)",
  !r11a.ok && /실패한 결제/.test(r11a.err) && r11b.ok && payCol(ex, "status") === "prepared" && payCol(ex, "idempotency_key") === "exfee-confirm-" + KEY(280) && payCol(ex, "prepared_at") !== t28,
  `${r11a.err} | ${r11b.out} ${payCol(ex, "idempotency_key")}`);

// P6 빨강: 이전 한 단계 승인(커밋 0edda8666의 0104 card_confirm(uuid,text,bigint))을 이름만 바꿔 시험 DB에만 만들고 같은 강제 중단을 재현
// → 외부 요청은 나갔는데 결제 기록(결제 키)이 통째로 사라짐(직원 다시 확인 불가). 새 두 단계는 P6a처럼 prepared·키가 남음
{
  const oldSrc = execFileSync("git", ["-C", SRC, "show", "0edda8666:mall-builder/supabase/migrations/0104_exchange_fee_payments.sql"], { encoding: "utf8" }).replace(/\r\n/g, "\n");
  const a = oldSrc.indexOf("create or replace function public.mall_builder_exchange_fee_card_confirm(");
  const b = oldSrc.indexOf("\n$$;", a) + 4;
  const oldFn = oldSrc.slice(a, b).replace("public.mall_builder_exchange_fee_card_confirm(", "public.qa_old_card_confirm(");
  const mk = run(oldFn); if (mk.status) { console.error("이전 함수 만들기 실패", mk.stderr.slice(-300)); process.exit(2); }
  ex = mkEx(29); mode("post", "slow_long");
  const A = spawn("docker", psqlArgs, { stdio: ["pipe", "pipe", "pipe"] }); let aErr = ""; A.stderr.on("data", (d) => (aErr += d));
  A.stdin.end(as(U1) + `select public.qa_old_card_confirm('${ex}', '${KEY(29)}', 3000);\n`);
  for (let i = 0; i < 40 && val(`select count(*) from public.qa_toss_ext where body ->> 'paymentKey' = '${KEY(29)}';`) === "0"; i++) pause(150);
  const killed = val(`select count(pg_terminate_backend(pid)) from pg_stat_activity where pid <> pg_backend_pid() and query like '%qa_old_card_confirm(''${ex}''%';`);
  await new Promise((res) => A.on("close", res));
  mode("post", "done");
  const rows = val(`select count(*) from mall_builder_exchange_fee_payments where exchange_id = '${ex}';`);
  check("P6 빨강: 이전 한 단계 승인(0edda8666)은 같은 강제 중단에서 외부 요청 1회 나갔는데 결제 기록·결제 키 0(사라짐)",
    killed === "1" && extFor(KEY(29)).startsWith("1/") && rows === "0", `종료 ${killed} · 외부 ${extFor(KEY(29))} · 결제 기록 ${rows}`);
}

adm(`drop database if exists ${DB}`);
console.log(`합계 통과 ${pass} / 실패 ${fail}${NO_GUARD ? " (지킴 트리거 뺀 빨강 확인)" : ""}`);
process.exit(fail ? 1 : 0);
