// QA 실행기 — 0103 교환비 카드 결제(M2-12b b3 단계1). qa_ 전용 새 DB에서만 토스 호출(mall_builder_private.toss_call)을 모의 함수로 바꿔 끼운다.
// 운영·Lab 함수는 건드리지 않음, 외부 호출 0, 실키 없음(모의 비밀 키 'test_sk_qa'). 항목마다 통과/실패, 실패 있으면 종료 코드 1.
// 사용: node mall-builder/scripts/qa/run-0103-feepay.mjs [--db qa_0103] [--no-guard]
//   --no-guard: 교환 지킴 트리거를 뺀 채 돌려 F5·F6(이중 수납·결제 뒤 변경)이 실패하는지 보는 빨강 확인용
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync, spawn } from "node:child_process";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const SRC = resolve(arg("--src", join(dirname(fileURLToPath(import.meta.url)), "..", "..")));
const DB = arg("--db", "qa_0103");
const NO_GUARD = process.argv.includes("--no-guard");
if (!/^qa_[a-z0-9_]{1,40}$/.test(DB)) { console.error("--db는 qa_로 시작"); process.exit(2); }
const C = "aww-pg-test";
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const files = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0104").sort();
if (!files.at(-1)?.startsWith("0103_")) { console.error("0103 마이그레이션이 없습니다:", SRC); process.exit(2); }
const bundle = files.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
// 토스 모의: qa_toss_mode(모드)·qa_toss_calls(호출 기록). 모드: done·fail4xx·err5xx·exception·wrong_amount·slow_done / GET: get_done·get_aborted
const mock = `create table public.qa_toss_mode (k text primary key, v text);
insert into public.qa_toss_mode values ('post','done'),('get','get_done');
create table public.qa_toss_calls (id serial, method text, path text, body jsonb, idem text, at timestamptz default clock_timestamp());
grant all on public.qa_toss_mode, public.qa_toss_calls to authenticated; grant usage on sequence public.qa_toss_calls_id_seq to authenticated;
create or replace function mall_builder_private.toss_call(p_secret text, p_method text, p_path text, p_body jsonb, p_idem text)
returns table (status integer, body jsonb) language plpgsql security definer set search_path = '' as $m$
declare m text;
begin
  insert into public.qa_toss_calls (method, path, body, idem) values (p_method, p_path, p_body, p_idem);
  if p_method = 'GET' then
    select v into m from public.qa_toss_mode where k = 'get';
    return query select 200, jsonb_build_object('status', case when m = 'get_aborted' then 'ABORTED' else 'DONE' end,
      'orderId', (select 'exfee-' || x.id from public.mall_builder_exchanges x join public.mall_builder_exchange_fee_payments p on p.exchange_id = x.id where '/v1/payments/' || p.payment_key = p_path limit 1),
      'totalAmount', (select p.amount from public.mall_builder_exchange_fee_payments p where '/v1/payments/' || p.payment_key = p_path limit 1), 'method', '카드');
    return;
  end if;
  select v into m from public.qa_toss_mode where k = 'post';
  if m = 'exception' then raise exception 'qa 연결 끊김'; end if;
  if m = 'slow_done' then perform pg_sleep(2); end if;
  if m = 'fail4xx' then return query select 400, '{"code":"REJECT_CARD_COMPANY","message":"카드사 거절"}'::jsonb; return; end if;
  if m = 'err5xx' then return query select 500, '{"code":"FAILED_INTERNAL","message":"토스 내부 오류"}'::jsonb; return; end if;
  return query select 200, jsonb_build_object('status', 'DONE', 'orderId', p_body ->> 'orderId', 'method', '카드',
    'totalAmount', case when m = 'wrong_amount' then (p_body ->> 'amount')::bigint + 1 else (p_body ->> 'amount')::bigint end,
    'approvedAt', '2026-11-17T10:00:00+09:00', 'receipt', jsonb_build_object('url', 'https://receipt.qa'));
end $m$;`;

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
const N = 20; // 주문 o1~o20, 각 티셔츠 V1 2개, 배송 완료 1일 전, 주인 U1
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
const confirm = (uid, ex, key, amt = 3000) => tryAs(uid, `select public.mall_builder_exchange_fee_card_confirm('${ex}', '${key}', ${amt});`);
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
const anon = val(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('mall_builder_exchange_fee_card_confirm','mall_builder_exchange_fee_card_recheck') and has_function_privilege('anon', p.oid, 'execute');`);
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

// F11 두 연결 동시 승인 → 토스 1번만(나중 연결은 잠금 대기 1초 넘겨 토스 부르기 전에 끝남)
ex = mkEx(15); mode("post", "slow_done"); c0 = calls();
const A = spawn("docker", psqlArgs, { stdio: ["pipe", "pipe", "pipe"] }); let aErr = ""; A.stderr.on("data", (d) => (aErr += d));
A.stdin.end(as(U1) + `select public.mall_builder_exchange_fee_card_confirm('${ex}', '${KEY(15)}', 3000);\n`);
await new Promise((res) => setTimeout(res, 600));
const rB = confirm(U1, ex, KEY(150));
await new Promise((res) => A.on("close", res));
mode("post", "done");
check("F11 동시 승인 2건 → 토스 호출 1번·결제 done 1건(나중 건은 토스 전에 끝남)",
  calls() === c0 + 1 && payCol(ex, "status") === "done" && !/ERROR/.test(aErr) && (!rB.ok || /확인하고 있습니다|already/.test(rB.out)),
  `호출 ${calls() - c0} 상태 ${payCol(ex, "status")} A ${aErr.slice(-120)} B ${rB.ok} ${rB.out} ${rB.err}`);

adm(`drop database if exists ${DB}`);
console.log(`합계 통과 ${pass} / 실패 ${fail}${NO_GUARD ? " (지킴 트리거 뺀 빨강 확인)" : ""}`);
process.exit(fail ? 1 : 0);
