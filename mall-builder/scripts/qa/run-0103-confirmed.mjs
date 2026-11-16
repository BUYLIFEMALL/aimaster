// QA 실행기 — 0103 교환 가능 상태에 구매 확정 포함(자동 확정과 교환 7일 충돌, Master msg_abc5861bd197).
// qa_ 전용 새 DB에 마이그레이션을 넣고, 자동 구매 확정은 0032 public.mall_builder_auto_progress 원형 그대로(확정 기준 3일·토큰 해시) 실행한다.
// 외부 호출 0, 실키 없음, 운영·Lab 접속 없음. 항목마다 통과/실패, 실패 있으면 종료 코드 1.
// 사용: node mall-builder/scripts/qa/run-0103-confirmed.mjs [--db qa_0103c]           ← 0001~0103(초록 기대)
//       node mall-builder/scripts/qa/run-0103-confirmed.mjs --red [--db qa_0103r]     ← 0001~0102만(지금 Lab 상태, 빨강 실측)
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const RED = process.argv.includes("--red");
const SRC = resolve(arg("--src", join(dirname(fileURLToPath(import.meta.url)), "..", "..")));
const DB = arg("--db", RED ? "qa_0103r" : "qa_0103c");
if (!/^qa_[a-z0-9_]{1,40}$/.test(DB)) { console.error("--db는 qa_로 시작"); process.exit(2); }
const C = "aww-pg-test";
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const upto = RED ? "0103" : "0104"; // 빨강 = 0102까지, 초록 = 0103까지(0104 카드 결제는 넣지 않음 — 0103 단독 적용 증명)
const files = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < upto).sort();
const last = files.at(-1) ?? "";
if (RED ? !last.startsWith("0102_") : !last.startsWith("0103_")) { console.error("마이그레이션 범위가 예상과 다릅니다:", last); process.exit(2); }
const bundle = files.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
const psqlArgs = ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-f", "-"];
const run = (sql) => spawnSync("docker", psqlArgs, { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
const val = (sql) => { const r = run(sql); if (r.status) throw new Error(r.stderr); return r.stdout.trim().split("\n").at(-1); };
const tryAs = (uid, sql) => { const r = run(`select set_config('request.jwt.claim.sub','${uid}', false);\n` + sql); return { ok: r.status === 0, out: r.stdout.trim().split("\n").at(-1) ?? "", err: (r.stderr.match(/ERROR:\s+(.*)/) || [, ""])[1] }; };
let pass = 0, fail = 0;
const check = (id, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "통과" : "실패"} ${id}${ok ? "" : ` — 실제: ${got}`}`); };

adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["번들", bundle], ["0061", read("scripts/scenario-0061-resale-apply.sql")]]) {
  const r = run(p); if (r.status) { console.error(`[${n}] 실패`, r.stderr.split("\n").filter((l) => /ERROR/.test(l)).join("\n")); process.exit(2); }
}
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const STORE = "00000000-0000-0000-0000-00000000005a", OWNER = "00000000-0000-0000-0000-0000000000a1";
const U1 = id(0xf1), P = id(0xc1), V1 = id(0xd1), V2 = id(0xd2), POL = id(0xb1);
// 주문 n: 실제 배송 전이 daysAgo일 전(shipping→delivered), 주인 U1, 티셔츠 S 2개
const plan = { c1: [1, 4], c2: [2, 8], c3: [3, 10], c4: [4, 2], c5: [5, 5], c6: [6, 1], c7: [7, 1] };
const O = (k) => id(0xe00 + plan[k][0]), I = (k) => id(0x1000 + plan[k][0]);
{
  const fx = [
    `insert into auth.users (id, email) values ('${U1}','u1@x.test'); insert into public.profiles (id, email) values ('${U1}','u1@x.test');`,
    `insert into mall_builder_shipping_policies (id, store_id, name, type, exchange_fee) values ('${POL}','${STORE}','교환비','free',3000);`,
    `insert into mall_builder_products (id, store_id, name, base_price, stock_mode, stock) values ('${P}','${STORE}','티셔츠',10000,'product',0);`,
    `insert into mall_builder_product_variants (id, product_id, store_id, key, "values", stock) values ('${V1}','${P}','${STORE}','S','["S"]',50),('${V2}','${P}','${STORE}','M','["M"]',50);`,
    // 자동 확정 설정(0032 원형이 읽는 그대로): 확정 3일, 토큰 해시
    `insert into mall_builder_store_schedulers (store_id, auto_confirm_days) values ('${STORE}', 3) on conflict (store_id) do update set auto_confirm_days = 3, paused = false;`,
    `insert into mall_builder_store_scheduler_secrets (store_id, run_token_hash) values ('${STORE}', encode(sha256('qa-token'::bytea), 'hex')) on conflict (store_id) do update set run_token_hash = excluded.run_token_hash;`,
  ];
  for (const k of Object.keys(plan)) {
    fx.push(`insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values ('${O(k)}','${STORE}',${500 + plan[k][0]},'C-${plan[k][0]}','${U1}','{"name":"x"}','x','delivered',20000,false,false);`,
      `insert into mall_builder_order_items (id, order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id) values ('${I(k)}','${O(k)}','${P}','${V1}','티셔츠','S',10000,2,20000,'${POL}');`,
      `insert into mall_builder_order_events (order_id, from_status, to_status, actor_role, created_at) values ('${O(k)}','shipping','delivered','system', now() - interval '${plan[k][1]} days');`);
  }
  const r = run(fx.join("\n")); if (r.status) { console.error("[준비] 실패", r.stderr); process.exit(2); }
}
const autoRun = () => run(`select public.mall_builder_auto_progress(encode(sha256('qa-token'::bytea), 'hex'));`);
const st = (k) => val(`select status from mall_builder_orders where id = '${O(k)}';`);
const req = (uid, k, reason = "size") => tryAs(uid, `select public.mall_builder_request_exchange('${I(k)}', 1, '${V2}', '${reason}');`);
const exOf = (k) => `(select x.id from mall_builder_exchanges x where x.item_id = '${I(k)}' order by x.created_at desc limit 1)`;
const step = (k, s, c = "", t = "") => tryAs(OWNER, `select public.mall_builder_exchange_step(${exOf(k)}, '${s}', '${c}', '${t}', '');`);

// 1단계: c4는 배송 2일 — 유저 교환 접수 → 회수 중(자동 확정 대상이 되기 전, 지금 상태 delivered)
const r4 = req(U1, "c4"); const r4b = step("c4", "collecting", "CJ", "4");
check("준비 c4(배송 2일) 유저 교환 접수·회수 중", r4.ok && r4b.ok, `${r4.err} | ${r4b.err}`);
// c4 배송 시각을 4일 전으로 옮겨 이번 자동 확정 회차에 포함(진행 중 교환이 있는 주문 + 교환 없는 c1·c2·c3·c5가 같은 회차)
run(`update mall_builder_order_events set created_at = now() - interval '4 days' where order_id = '${O("c4")}' and to_status = 'delivered';`);
const a = autoRun();
const after = ["c1", "c2", "c3", "c4", "c5", "c6"].map((k) => `${k}=${st(k)}`).join(" ");
console.log(`  자동 확정 1회 실측: ${a.status === 0 ? "성공 " + a.stdout.trim().split("\n").at(-1) : "오류 " + (a.stderr.match(/ERROR:\s+(.*)/) || [, ""])[1]} · ${after}`);
check("C1 진행 중 교환 주문이 섞인 자동 확정 회차가 오류 없이 끝나고 c1·c2·c3·c4·c5 모두 confirmed(c6 배송 1일은 delivered)",
  a.status === 0 && after === "c1=confirmed c2=confirmed c3=confirmed c4=confirmed c5=confirmed c6=delivered", after);
// 구매 확정 뒤 유저 7일 판정(실제 배송 시각 기준)
const r1 = req(U1, "c1"), r2 = req(U1, "c2"), r3s = req(OWNER, "c3", "defect");
check("C2 배송 4일·구매 확정 주문 → 유저 교환 신청 됨", r1.ok, r1.err);
check("C3 배송 8일·구매 확정 → 유저 막힘(7일), 배송 10일·구매 확정 → 직원 대리 됨", !r2.ok && /7일/.test(r2.err) && r3s.ok, `${r2.ok} ${r2.err} | ${r3s.err}`);
// 구매 확정된 c4의 교환 계속: 입고 → 교환비(사이즈 사유 3,000원) 미납 재발송 막힘 → 입금 확인 → 재발송 → 완료
const s1 = step("c4", "collected"), s2 = step("c4", "reshipped", "CJ", "44");
const s3 = tryAs(OWNER, `select public.mall_builder_exchange_fee_paid(${exOf("c4")});`), s4 = step("c4", "reshipped", "CJ", "44"), s5 = step("c4", "done");
check("C4 구매 확정 뒤에도 교환 진행: 입고·미납 재발송 막힘·입금 확인·재발송·완료",
  s1.ok && !s2.ok && /결제가 확인되지 않아/.test(s2.err) && s3.ok && s4.ok && s5.ok && val(`select step from mall_builder_exchanges where id = ${exOf("c4")};`) === "done",
  `${s1.err}|${s2.ok} ${s2.err}|${s3.err}|${s4.err}|${s5.err}`);
// 경합: 진행 중 교환이 있는 delivered 주문(c6)의 반품 요청·상태 이탈은 여전히 막힘, 교환 가능 상태 사이(delivered→confirmed)는 허용
req(U1, "c6");
const rr = tryAs(U1, `select public.mall_builder_request_return('${O("c6")}', 'defect', '', '{"bank_name":"국민","bank_account":"123456789","bank_holder":"유저1"}'::jsonb);`);
const rc = run(`update mall_builder_orders set status = 'cancelled' where id = '${O("c6")}';`);
const rcf = run(`update mall_builder_orders set status = 'confirmed' where id = '${O("c6")}';`);
check("C5 진행 중 교환: 반품 요청·취소 이탈 막힘, delivered→confirmed는 허용",
  !rr.ok && /교환이 진행 중/.test(rr.err) && rc.status !== 0 && rcf.status === 0 && st("c6") === "confirmed", `${rr.ok} ${rr.err} | 취소 ${rc.status} | 확정 ${rcf.status} ${st("c6")}`);
// 구매 확정 상태에서 이탈(confirmed→cancelled)도 진행 중 교환이 있으면 막힘
const rcc = run(`update mall_builder_orders set status = 'cancelled' where id = '${O("c6")}';`);
check("C6 진행 중 교환이 있는 구매 확정 주문의 이탈(confirmed→cancelled) 막힘", rcc.status !== 0, `종료 ${rcc.status}`);
// 회귀: 교환 없는 주문 자동 확정 정상(c7 배송 1일 → 4일로 옮겨 다음 회차)
run(`update mall_builder_order_events set created_at = now() - interval '4 days' where order_id = '${O("c7")}' and to_status = 'delivered';`);
const a2 = autoRun();
check("C7 회귀: 교환 없는 주문 다음 회차 자동 확정 정상", a2.status === 0 && st("c7") === "confirmed", `${a2.status} ${st("c7")}`);
check("C8 비로그인(anon) 실행 가능 교환 신청 함수 0", val(`select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'mall_builder_request_exchange' and has_function_privilege('anon', p.oid, 'execute');`) === "0", "");

adm(`drop database if exists ${DB}`);
console.log(`합계 통과 ${pass} / 실패 ${fail}${RED ? " (0102까지만 — 지금 Lab 상태 빨강 실측)" : ""}`);
process.exit(fail ? 1 : 0);
