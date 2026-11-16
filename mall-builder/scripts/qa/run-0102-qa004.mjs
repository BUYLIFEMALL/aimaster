// QA-20261117-004 증명 실행기 — 교환 0102 수정(배송 기준 시각·주문→교환 잠금·반품/취소 상호 배제·삭제 옵션)
// 무엇: 지정한 mall-builder 소스의 마이그레이션 0001~0102를 「QA 전용 새 DB」에 넣고(Supabase식 기본 권한 흉내), 0061 시나리오 위에서
//       A1~A15를 실행해 항목마다 통과/실패, 실패가 있으면 종료 코드 1. 두 연결 동시 경합(A13~A15)은 실제로 psql 두 개를 띄운다.
// 지키는 것: --db는 qa_로 시작하는 새 DB만(끝나고 지움), 외부 호출 0, 실키 없음, 운영·Lab DB 접속 없음.
// 사용(윈도우 Git Bash): 고치기 전 원문은 git archive로 빈 폴더에 풀어 --src로
//   node mall-builder/scripts/qa/run-0102-qa004.mjs --src <폴더>/mall-builder --db qa_qa004_red
//   node mall-builder/scripts/qa/run-0102-qa004.mjs --db qa_qa004_green      (--src 없으면 이 작업 폴더)
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync, spawn } from "node:child_process";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const SRC = resolve(arg("--src", join(dirname(fileURLToPath(import.meta.url)), "..", "..")));
const C = arg("--container", "aww-pg-test");
const DB = arg("--db", "qa_qa004");
if (!/^qa_[a-z0-9_]{1,40}$/.test(DB)) { console.error("--db 이름은 qa_ 로 시작해야 합니다(공유 DB 보호)."); process.exit(2); }
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");

const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const files = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0103").sort();
if (!files.at(-1)?.startsWith("0102_")) { console.error("소스 폴더에 0102 마이그레이션이 없습니다:", SRC); process.exit(2); }
const bundle = files.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "do $lab$ begin if to_regnamespace('lab_admin') is not null then perform lab_admin.register_program('mall-builder'); end if; end $lab$;"))
  .join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supaDefault = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";

const psqlArgs = ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-f", "-"];
const run = (sql) => spawnSync("docker", psqlArgs, { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
const as = (uid) => `select set_config('request.jwt.claim.sub','${uid}', false);\n`;
const val = (sql) => { const r = run(sql); if (r.status) throw new Error(r.stderr); return r.stdout.trim().split("\n").at(-1); };
/** 한 문장 실행 → { ok, err } (오류 문구 포함) */
const tryAs = (uid, sql) => { const r = run(as(uid) + sql); return { ok: r.status === 0, err: (r.stderr.match(/ERROR:\s+(.*)/) || [, ""])[1] }; };

let pass = 0, fail = 0;
const check = (id, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "통과" : "실패"} ${id}${ok ? "" : ` — 실제: ${got}`}`); };

// ── 준비 ──
adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
for (const [name, part] of [["stub", stub], ["기본권한", supaDefault], ["번들", bundle], ["0061", read("scripts/scenario-0061-resale-apply.sql")]]) {
  const r = run(part); if (r.status) { console.error(`[${name}] 실패`, r.stderr.split("\n").filter((l) => /ERROR/.test(l)).join("\n")); process.exit(2); }
}
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const STORE = "00000000-0000-0000-0000-00000000005a", OWNER = "00000000-0000-0000-0000-0000000000a1";
const U1 = id(0xf1), U9 = id(0xf9), S3 = id(0xf3);
const P = id(0xc1), MUG = id(0xc2), VS = id(0xd1), VM = id(0xd2), VL = id(0xd3), VX = id(0xd4), POL = id(0xb1);
// 주문 n: 배송 완료 이력 daysAgo일 전(null이면 이력 없음), 상품 줄 = 티셔츠 S 2개(id 0x1000+n)
const orders = { o1: [1, 10], o2: [2, null], o3: [3, 6], o4: [4, 2], o5: [5, 2], o6: [6, 2], o7: [7, 2], o8: [8, 2], o9: [9, 2], o10: [10, 2], o11: [11, 2], o12: [12, 2], o13: [13, 2], o14: [14, 2], o15: [15, 2] };
const O = (k) => id(0xe00 + orders[k][0]), ITEM = (k) => id(0x1000 + orders[k][0]);
const fixture = [
  `insert into auth.users (id, email) values ('${U1}','u1@x.test'),('${U9}','u9@x.test'),('${S3}','s3@x.test');`,
  `insert into public.profiles (id, email) values ('${U1}','u1@x.test'),('${U9}','u9@x.test'),('${S3}','s3@x.test');`,
  `insert into mall_builder_stores (id, name, owner_id, slug) values ('${id(0x5b)}','다른몰','${U9}','other-mall');`,
  `insert into mall_builder_store_staff (store_id, user_id, role, perms) values ('${id(0x5b)}','${S3}','staff','{"orders":true}');`,
  `insert into mall_builder_shipping_policies (id, store_id, name, type, exchange_fee) values ('${POL}','${STORE}','교환비','free',3000);`,
  `insert into mall_builder_products (id, store_id, name, base_price, stock_mode, stock) values ('${P}','${STORE}','티셔츠',10000,'product',0),('${MUG}','${STORE}','머그컵',8000,'none',0);`,
  `insert into mall_builder_product_variants (id, product_id, store_id, key, "values", stock) values ('${VS}','${P}','${STORE}','S','["S"]',10),('${VM}','${P}','${STORE}','M','["M"]',10),('${VL}','${P}','${STORE}','L','["L"]',0),('${VX}','${P}','${STORE}','XL','["XL"]',10);`,
  ...Object.keys(orders).map((k) => `insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values ('${O(k)}','${STORE}',${200 + orders[k][0]},'Q-${orders[k][0]}','${U1}','{"name":"받는분","phone":"010-1111-0001","zip":"1"}','유저1','delivered',20000,false,false);`),
  ...Object.keys(orders).map((k) => `insert into mall_builder_order_items (id, order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id) values ('${ITEM(k)}','${O(k)}','${P}','${VS}','티셔츠','S',10000,2,20000,'${POL}');`),
  ...Object.keys(orders).filter((k) => orders[k][1] !== null).map((k) => `insert into mall_builder_order_events (order_id, from_status, to_status, actor_role, created_at) values ('${O(k)}','shipping','delivered','staff', now() - interval '${orders[k][1]} days');`),
].join("\n");
{ const r = run(fixture); if (r.status) { console.error("[준비] 실패", r.stderr); process.exit(2); } }

const req = (k, to = VM, reason = "defect") => `select public.mall_builder_request_exchange('${ITEM(k)}', 1, '${to}', '${reason}');`;
const exOf = (k) => `(select x.id from mall_builder_exchanges x where x.item_id = '${ITEM(k)}' order by x.created_at desc limit 1)`;
const step = (k, s, c = "", t = "", note = "") => `select public.mall_builder_exchange_step(${exOf(k)}, '${s}', '${c}', '${t}', '${note}');`;
const ret = (k) => `select public.mall_builder_request_return('${O(k)}', 'defect', '', '{"bank_name":"국민","bank_account":"123456789","bank_holder":"유저1"}'::jsonb);`;
const stock = (v) => Number(val(`select stock from mall_builder_product_variants where id = '${v}';`));
const forceStatus = (k, s) => run(`do $$ begin if exists (select 1 from pg_trigger where tgname = 'mall_builder_orders_exchange_guard') then execute 'alter table public.mall_builder_orders disable trigger mall_builder_orders_exchange_guard'; end if; end $$;
update public.mall_builder_orders set status = '${s}' where id = '${O(k)}';
do $$ begin if exists (select 1 from pg_trigger where tgname = 'mall_builder_orders_exchange_guard') then execute 'alter table public.mall_builder_orders enable trigger mall_builder_orders_exchange_guard'; end if; end $$;`);

// A1 D0 실제 배송(10일 전) → 직원 대리 접수 → 거절(같은 상태 기록이 오늘 생김) → 유저 재신청은 막혀야 함
tryAs(OWNER, req("o1"));
tryAs(OWNER, step("o1", "rejected", "", "", "확인 결과 정상"));
let r = tryAs(U1, req("o1"));
check("A1 같은 상태(delivered→delivered) 교환 기록이 7일 기준을 갱신하지 못함", !r.ok && /7일/.test(r.err), r.ok ? "유저 재신청 통과됨" : r.err);
// A2 배송 이력 없음 → 유저 막힘(안전하게 실패)
r = tryAs(U1, req("o2"));
check("A2 배송 완료 이력 없는 주문은 유저 접수 막힘", !r.ok && /7일/.test(r.err), r.ok ? "통과됨" : r.err);
// A3 6일째 정상 접수
r = tryAs(U1, req("o3"));
check("A3 배송 완료 6일째 유저 접수 됨", r.ok, r.err);
// A4 교환 진행 중 → 반품 요청 막힘
tryAs(U1, req("o4"));
r = tryAs(U1, ret("o4"));
check("A4 진행 중 교환이 있으면 반품 요청 막힘", !r.ok && /교환이 진행 중/.test(r.err), r.ok ? "반품 요청 통과됨" : r.err);
// A5 반품 처리된 주문(트리거를 잠시 끄고 상태를 강제로 바꿈 = 다른 경로 흉내) → 재발송 막힘
tryAs(U1, req("o5"));
tryAs(OWNER, step("o5", "collected"));
forceStatus("o5", "returned");
const m5 = stock(VM);
r = tryAs(OWNER, step("o5", "reshipped", "CJ", "555"));
check("A5 주문이 배송 완료가 아니면(반품됨) 재발송 막힘·재고 그대로", !r.ok && /배송 완료 상태가 아니라/.test(r.err) && stock(VM) === m5, r.ok ? "재발송 통과됨" : r.err);
// A6 재고 +1·−1 한 번씩
tryAs(U1, req("o6", VX));
const s0 = stock(VS), x0 = stock(VX);
tryAs(OWNER, step("o6", "collected"));
const again = tryAs(OWNER, step("o6", "collected"));
tryAs(OWNER, step("o6", "reshipped", "CJ", "666"));
const again2 = tryAs(OWNER, step("o6", "reshipped", "CJ", "667"));
check("A6 회수 완료 S +1 한 번·재발송 XL −1 한 번(두 번째 호출 막힘)", !again.ok && !again2.ok && stock(VS) === s0 + 1 && stock(VX) === x0 - 1, `S ${s0}→${stock(VS)}, XL ${x0}→${stock(VX)}, 재호출 ${again.ok}/${again2.ok}`);
// A7 교환비 미납 → 재발송 막힘
tryAs(U1, req("o7", VM, "size"));
tryAs(OWNER, step("o7", "collected"));
r = tryAs(OWNER, step("o7", "reshipped", "CJ", "777"));
check("A7 교환비 미납이면 재발송 막힘", !r.ok && /결제가 확인되지 않아/.test(r.err), r.ok ? "통과됨" : r.err);
// A8 재고 부족(L 0개) → 재발송 막힘, 단계 그대로
tryAs(U1, req("o8", VL));
tryAs(OWNER, step("o8", "collected"));
r = tryAs(OWNER, step("o8", "reshipped", "CJ", "888"));
check("A8 바꿀 옵션 재고 부족이면 재발송 막힘·단계 collected 그대로", !r.ok && /재고가 부족/.test(r.err) && val(`select step from mall_builder_exchanges where id = ${exOf("o8")};`) === "collected", r.ok ? "통과됨" : r.err);
// A9 다른 몰 직원(주문 권한) → 단계·접수 모두 막힘
tryAs(U1, req("o9"));
const r9a = tryAs(S3, step("o9", "collecting", "CJ", "999")), r9b = tryAs(S3, req("o10"));
check("A9 다른 몰 직원은 교환 단계·대리 접수 모두 막힘", !r9a.ok && !r9b.ok, `${r9a.ok}/${r9b.ok}`);
// A10 비로그인 실행 권한 0
check("A10 비로그인(anon) 실행 가능 교환 함수 0개", val(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('mall_builder_request_exchange','mall_builder_exchange_step','mall_builder_exchange_fee','mall_builder_exchange_fee_paid') and has_function_privilege('anon', p.oid, 'execute');`) === "0", "");
// A11 바꿀 옵션 삭제 → 재발송 막힘, 원래 옵션(S) 재고 그대로
tryAs(U1, req("o11", VX));
tryAs(OWNER, step("o11", "collected"));
run(`update mall_builder_product_variants set key = 'XL-old' where id = '${VX}';`);
run(`delete from mall_builder_product_variants where id = '${VX}';`);
const s11 = stock(VS);
r = tryAs(OWNER, step("o11", "reshipped", "CJ", "1111"));
check("A11 바꿀 옵션이 삭제되면 재발송 막힘·원래 옵션 재고를 대신 빼지 않음", !r.ok && /삭제/.test(r.err) && stock(VS) === s11, r.ok ? `재발송 통과됨, S ${s11}→${stock(VS)}` : r.err);
// A12 회귀: 교환 없는 주문·거절된 교환·완료된 교환 → 정상 반품
const r12a = tryAs(U1, ret("o12"));
tryAs(U1, req("o13")); tryAs(OWNER, step("o13", "rejected", "", "", "정상"));
const r12b = tryAs(U1, ret("o13"));
tryAs(U1, req("o14")); tryAs(OWNER, step("o14", "collected")); tryAs(OWNER, step("o14", "reshipped", "CJ", "1414")); tryAs(OWNER, step("o14", "done"));
const r12c = tryAs(U1, ret("o14"));
check("A12 교환 없음·거절·완료 주문은 정상 반품 요청 됨", r12a.ok && r12b.ok && r12c.ok, `${r12a.err}|${r12b.err}|${r12c.err}`);

// ── 두 연결 동시 경합: A가 주문을 잡은 채 2초 쉬는 동안 B가 들어옴 → B는 기다렸다가 A 결과를 보고 막혀야 함 ──
const race = async (aUid, aSql, bUid, bSql) => {
  const a = spawn("docker", psqlArgs, { stdio: ["pipe", "pipe", "pipe"] });
  let aErr = ""; a.stderr.on("data", (d) => (aErr += d));
  a.stdin.end(as(aUid) + "begin;\n" + aSql + "\nselect pg_sleep(2);\ncommit;\n");
  await new Promise((res) => setTimeout(res, 700));
  const t0 = Date.now(); const b = tryAs(bUid, bSql); const waited = Date.now() - t0;
  await new Promise((res) => a.on("close", res));
  return { aOk: !/ERROR/.test(aErr), aErr, b, waited };
};
// A13 반품 먼저(o15) → 교환 접수 막힘
let x = await race(U1, ret("o15"), U1, req("o15"));
check("A13 경합 반품 먼저: 교환 접수는 기다렸다가 막힘", x.aOk && !x.b.ok && /배송 완료된 주문만/.test(x.b.err) && x.waited >= 1000, `A ${x.aOk} ${x.aErr} / B ${x.b.ok} ${x.b.err} / 대기 ${x.waited}ms`);
// A14 교환 먼저(o10) → 반품 요청 막힘
x = await race(U1, req("o10"), U1, ret("o10"));
check("A14 경합 교환 먼저: 반품 요청은 기다렸다가 막힘", x.aOk && !x.b.ok && /교환이 진행 중/.test(x.b.err) && x.waited >= 1000, `A ${x.aOk} ${x.aErr} / B ${x.b.ok} ${x.b.err} / 대기 ${x.waited}ms`);
// A15 같은 상품 동시 접수(o12는 반품 요청 상태라 다른 주문 필요 → o3의 두 번째 줄 대신 새 줄)
run(`insert into mall_builder_order_items (id, order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id) values ('${id(0x2000)}','${O("o3")}','${P}','${VS}','티셔츠','S',10000,2,20000,'${POL}');`);
const reqLine = `select public.mall_builder_request_exchange('${id(0x2000)}', 1, '${VM}', 'defect');`;
x = await race(U1, reqLine, U1, reqLine);
check("A15 같은 상품 동시 접수: 하나만 됨", x.aOk && !x.b.ok && /이미 교환이 진행 중/.test(x.b.err) && val(`select count(*) from mall_builder_exchanges where item_id = '${id(0x2000)}';`) === "1", `A ${x.aOk} / B ${x.b.ok} ${x.b.err}`);

// A16(QA004 P2) 옵션 상품의 옵션을 「모두」 삭제 → 재발송 막힘·상품 본체 재고 그대로. 옵션 없는 정상 상품(머그컵)은 재발송 됨
{
  const P2 = id(0xc3), V2a = id(0xd5), V2b = id(0xd6), O16 = id(0xe16), I16 = id(0x1016), O17 = id(0xe17), I17 = id(0x1017);
  run(`insert into mall_builder_products (id, store_id, name, base_price, stock_mode, stock) values ('${P2}','${STORE}','양말',3000,'product',50);
insert into mall_builder_product_variants (id, product_id, store_id, key, "values", stock) values ('${V2a}','${P2}','${STORE}','흰색','["흰색"]',5),('${V2b}','${P2}','${STORE}','검정','["검정"]',5);
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values
 ('${O16}','${STORE}',316,'Q-16','${U1}','{"name":"받는분","phone":"010-1111-0001","zip":"1"}','유저1','delivered',6000,false,false),
 ('${O17}','${STORE}',317,'Q-17','${U1}','{"name":"받는분","phone":"010-1111-0001","zip":"1"}','유저1','delivered',8000,false,false);
insert into mall_builder_order_items (id, order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total) values
 ('${I16}','${O16}','${P2}','${V2a}','양말','흰색',3000,2,6000),('${I17}','${O17}','${MUG}',null,'머그컵','',8000,1,8000);
insert into mall_builder_order_events (order_id, from_status, to_status, actor_role, created_at) values ('${O16}','shipping','delivered','staff', now() - interval '1 day'),('${O17}','shipping','delivered','staff', now() - interval '1 day');`);
  tryAs(U1, `select public.mall_builder_request_exchange('${I16}', 1, '${V2b}', 'defect');`);
  tryAs(U1, `select public.mall_builder_request_exchange('${I17}', 1, null, 'defect');`);
  const ex16 = `(select id from mall_builder_exchanges where item_id = '${I16}')`, ex17 = `(select id from mall_builder_exchanges where item_id = '${I17}')`;
  tryAs(OWNER, `select public.mall_builder_exchange_step(${ex16}, 'collected');`);
  run(`delete from mall_builder_product_variants where product_id = '${P2}';`);
  const before = Number(val(`select stock from mall_builder_products where id = '${P2}';`));
  const r16 = tryAs(OWNER, `select public.mall_builder_exchange_step(${ex16}, 'reshipped', 'CJ', '1616');`);
  const after = Number(val(`select stock from mall_builder_products where id = '${P2}';`));
  check("A16 옵션을 모두 삭제한 옵션 상품 → 재발송 막힘·본체 재고 그대로", !r16.ok && after === before, r16.ok ? `재발송 통과됨, 본체 재고 ${before}→${after}` : r16.err);
  tryAs(OWNER, `select public.mall_builder_exchange_step(${ex17}, 'collected');`);
  const r17 = tryAs(OWNER, `select public.mall_builder_exchange_step(${ex17}, 'reshipped', 'CJ', '1717');`);
  check("A17 옵션 없는 정상 상품은 재발송 됨(일괄 차단 아님)", r17.ok, r17.err);
}

adm(`drop database if exists ${DB}`);
console.log(`합계 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
