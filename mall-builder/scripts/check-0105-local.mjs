// 0105 주문서 현금영수증 자동 접수(S70) — 로컬 격리 DB 검증(운영·Lab·공유 DB 접속 0, 외부망·실제 볼타 호출 0).
// 실행: node mall-builder/scripts/check-0105-local.mjs
// 안전(Master msg_8dba92300cba): ① Docker 연결 대상이 이 PC의 로컬 엔진(npipe/unix)이고 컨테이너 aww-pg-test(postgres 이미지)가 떠 있을 때만 진행
//   ② 시험 DB는 qa_s70_* 이름이 「없을 때만」 새로 만들고(이미 있으면 멈춤 — 남의 DB를 지우지 않음), 만든 직후 OID·소유자·표식 주석을 기록
//   ③ 지울 때는 OID·소유자·표식이 그대로인 그 DB만 지움.
// 검증: 1) 0001~0105 + scenario-0105(K1~K10) 2) 두 세션 순서 L1(접수 먼저)·L2(입금 확인 먼저)
//       3) 볼타 흉내·외부망 0 근거(E1) 4) 0100 시나리오 회귀 R1 — 0104까지 DB와 0105까지 DB 각각에서 원래 방식대로(@@AFTER_ROLLBACK_STEP1에서 나눠
//          되돌리기 1단계를 먼저 실행) 돌리고, 양쪽 모두 종료 0 + 결과 줄 기대값 전부 일치 + 막힘 알림 7개·문제 알림 0개 + 양쪽 출력 동일.
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
const migs = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
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
const stop = (msg) => { console.error(msg); cleanup(); process.exit(2); };

// ── 안전 ① 로컬 엔진·컨테이너 확인
const ctx = sh("docker", ["context", "show"]);
const host = sh("docker", ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}", ctx]);
if (!/^(npipe|unix):\/\//.test(host)) { console.error(`[멈춤] Docker 연결 대상이 로컬 엔진이 아닙니다(${ctx}: ${host})`); process.exit(2); }
const cinfo = sh("docker", ["inspect", "-f", "{{.State.Running}} {{.Config.Image}}", C]);
if (!/^true postgres:/.test(cinfo)) { console.error(`[멈춤] 컨테이너 ${C} 상태·이미지가 예상과 다릅니다(${cinfo})`); process.exit(2); }
console.log(`안전: Docker ${ctx}(${host}), 컨테이너 ${C} ${cinfo.replace(/^true /, "실행 중 ")}, 실행 표식 ${RUN_ID.slice(0, 8)}`);

// ── 안전 ②③ 만든 DB만 기록·삭제
const made = new Map(); // 이름 → oid
const create = (db) => {
  if (!/^qa_s70_[a-z0-9_]+$/.test(db)) stop(`[멈춤] 시험 DB 이름 규칙 위반: ${db}`);
  if (adm(`select count(*) from pg_database where datname = '${db}'`) !== "0") stop(`[멈춤] ${db}가 이미 있습니다 — 남의 DB일 수 있어 지우지 않고 멈춥니다(직접 확인 뒤 정리)`);
  adm(`create database ${db}`);
  adm(`comment on database ${db} is 'check-0105-local ${RUN_ID}'`);
  made.set(db, adm(`select oid from pg_database where datname = '${db}'`));
};
const drop = (db) => {
  const oid = made.get(db); if (!oid) return;
  const row = adm(`select d.oid || '|' || pg_get_userbyid(d.datdba) || '|' || coalesce(shobj_description(d.oid, 'pg_database'), '') from pg_database d where d.datname = '${db}'`);
  if (row === `${oid}|postgres|check-0105-local ${RUN_ID}`) { adm(`drop database ${db}`); made.delete(db); }
  else console.error(`[주의] ${db}의 OID·소유자·표식이 만든 때와 달라 지우지 않았습니다(${row || "없음"})`);
};
function cleanup() { for (const db of [...made.keys()]) drop(db); }
const fresh = (db, upto) => {
  drop(db); create(db);
  const bundle = migs.filter((f) => f <= upto).map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n")
    .replace("create extension if not exists http with schema extensions;", "-- http 흉내");
  for (const [n, p] of [["stub", stub], ["기본권한", supa], [`~${upto}`, sp + bundle]]) {
    const r = run(db, p); if (r.status) stop(`[${db} ${n}] 실패 ${errs(r)}`);
  }
  const r = run(db, sp + `insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test') on conflict do nothing;
insert into public.mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','qa-mall');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner') on conflict do nothing;`);
  if (r.status) stop(`[${db} 기본 자료] 실패 ${errs(r)}`);
};
const results = [];
const check = (k, ok, note = "") => { results.push([k, ok]); console.log(`${ok ? "통과" : "실패"} ${k}${note ? " — " + note : ""}`); };
const D5 = "qa_s70_0105", D4 = "qa_s70_0104";

// 1) 단일 세션 시나리오
const last = migs.filter((f) => f.startsWith("0105"))[0];
if (!last) stop("0105 파일 없음");
fresh(D5, last);
const sc = run(D5, sp + read("scripts/scenario-0105-cash-receipt-checkout.sql"));
if (sc.status) stop(`[시나리오] 실패 ${errs(sc)}`);
for (const line of sc.stdout.split("\n").filter((l) => /^K\d/.test(l))) { const [k, v] = line.split("\t"); check(k, v === "t"); }

// 2) 두 세션 순서(잠금 3초 유지, 1초 뒤 상대 세션 시작 → 상대는 잠금을 기다렸다 진행)
const as = (uid) => `select set_config('request.jwt.claim.sub','${uid}', false);\n`;
const BUYER = "00000000-0000-0000-0000-0000000000c9", OWNER = "00000000-0000-0000-0000-0000000000a1";
const E9 = "00000000-0000-0000-0000-0000000000e9", EA = "00000000-0000-0000-0000-0000000000ea";
const q = (sql) => run(D5, sp + sql).stdout.trim();
const logCount = () => Number(q("select count(*) from public.fake_cr_log where path = '/v1/cashReceipts';"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
{ // L1 접수 먼저 → 입금 확인은 잠금 대기 뒤 트리거로 발급 요청
  const before = logCount();
  const a = runAsync(D5, sp + as(BUYER) + `begin;\nselect public.mall_builder_cash_receipt_checkout('${E9}', 'PHONE', '01012345678');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const b = await runAsync(D5, sp + as(OWNER) + `select public.mall_builder_change_order_status('${E9}', 'paid', '', '', '');`);
  const ra = await a;
  const st = q(`select cash_receipt ->> 'status' from mall_builder_orders where id = '${E9}';`);
  check("L1", ra.code === 0 && b.code === 0 && ra.out.includes('{"accepted": true}') && b.ms >= 1500 && logCount() === before + 1 && st !== "requested",
    `접수 응답 ${ra.out.includes('{"accepted": true}') ? "accepted" : "?"}, 입금 확인 대기 ${b.ms}ms, 발급 요청 +${logCount() - before}, 상태 ${st}`);
}
{ // L2 입금 확인 먼저 → 접수는 잠금 대기 뒤 not_eligible, 발급 0, 영수증 칸 그대로
  const before = logCount();
  const b = runAsync(D5, sp + as(OWNER) + `begin;\nselect public.mall_builder_change_order_status('${EA}', 'paid', '', '', '');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const a = await runAsync(D5, sp + as(BUYER) + `select public.mall_builder_cash_receipt_checkout('${EA}', 'PHONE', '01012345678');`);
  const rb = await b;
  const cr = q(`select coalesce(cash_receipt::text, 'null') from mall_builder_orders where id = '${EA}';`);
  check("L2", a.code === 0 && rb.code === 0 && a.out.includes('"not_eligible"') && a.ms >= 1500 && logCount() === before && cr === "null",
    `접수 응답 ${a.out.includes('"not_eligible"') ? "not_eligible" : "?"}, 접수 대기 ${a.ms}ms, 발급 요청 +${logCount() - before}, 영수증 칸 ${cr}`);
}

// 3) 볼타 흉내·외부망 0 근거: 발급 통로 함수가 흉내판(기록 표에만 씀)이고, http·pg_net 확장과 http 함수가 없음
const evidence = (db) => run(db, sp + `select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private' and p.proname = 'bolta_call' and p.prosrc like '%fake_cr_log%' and p.prosrc not like '%http%') || '|' ||
  (select count(*) from pg_extension where extname in ('http', 'pg_net')) || '|' ||
  (select count(*) from pg_proc where proname in ('http', 'http_get', 'http_post', 'http_request') and not (proname = 'http' and prosrc like '%row(0, null, null, null)%')) || '|' ||
  (select count(*) from pg_proc where proname = 'http' and prosrc like '%row(0, null, null, null)%') || '|' ||
  (select count(distinct path) from public.fake_cr_log);`).stdout.trim();
{ const [stubN, ext, httpFn, httpStub, paths] = evidence(D5).split("|");
  check("E1", stubN === "1" && ext === "0" && httpFn === "0" && httpStub === "1", `0105 DB: 볼타 통로 흉내판 ${stubN}개, http·pg_net 확장 ${ext}개, 흉내판 아닌 http 함수 ${httpFn}개(흉내 http 상태 0 반환판 ${httpStub}개), 흉내 기록 경로 ${paths}종`); }

// 3b) 되돌리기 경계(Master msg_216386e36b04): 0105가 있는 DB에서 rollback-0100-step1 → 로그인 회원 역할(authenticated)로 접수·신청 모두 막힘,
//     영수증 칸·볼타 기록 그대로 → 0100 다음 0105 순서로 되살리면 다시 접수(입금 대기라 발급 0). 0100만 있는 DB의 성공은 R1-0104가 확인.
{
  const EB = "00000000-0000-0000-0000-0000000000eb";
  const r0 = run(D5, sp + `insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit) values
 ('${EB}','00000000-0000-0000-0000-00000000005a',111,'CK-11','${BUYER}','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,false,false);
insert into mall_builder_order_items (order_id, name_snapshot, option_snapshot, unit_price, qty, line_total) values ('${EB}','시험 상품','',22000,1,22000);`);
  if (r0.status) stop(`[RB 준비] 실패 ${errs(r0)}`);
  const logBefore = logCount();
  const rb = run(D5, sp + read("scripts/rollback-0100-step1-stop-auto.sql"));
  const tryAs = (fn) => run(D5, sp + as(BUYER) + `set role authenticated;\nselect public.${fn}('${EB}', 'PHONE', '01012345678');`);
  const c1 = tryAs("mall_builder_cash_receipt_checkout"), q1 = tryAs("mall_builder_cash_receipt_request");
  const denied = (r) => r.status !== 0 && /permission denied/.test(r.stderr);
  const privs = q(`select has_function_privilege('authenticated', 'public.mall_builder_cash_receipt_checkout(uuid,text,text,text)', 'execute') || '|' || has_function_privilege('authenticated', 'public.mall_builder_cash_receipt_request(uuid,text,text,text)', 'execute');`);
  const crAfter = q(`select coalesce(cash_receipt::text, 'null') from mall_builder_orders where id = '${EB}';`);
  check("RB1", rb.status === 0 && denied(c1) && denied(q1) && privs === "false|false" && crAfter === "null" && logCount() === logBefore,
    `되돌리기 종료 ${rb.status}, 회원 접수 ${denied(c1) ? "권한 거부" : "막히지 않음"}, 회원 신청 ${denied(q1) ? "권한 거부" : "막히지 않음"}, 실행 권한 ${privs}, 영수증 칸 ${crAfter}, 볼타 기록 +${logCount() - logBefore}`);
  const m = (f) => sp + read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
  const re100 = run(D5, m(migs.find((f) => f.startsWith("0100")))), re105 = run(D5, m(last));
  const c2 = tryAs("mall_builder_cash_receipt_checkout");
  const st2 = q(`select (cash_receipt ->> 'status') || '|' || (cash_receipt ->> 'attempt') from mall_builder_orders where id = '${EB}';`);
  const trig = q(`select count(*) from pg_trigger where tgname in ('mall_builder_orders_cash_receipt_auto', 'mall_builder_orders_receipt_one_kind') and not tgisinternal;`);
  check("RB2", re100.status === 0 && re105.status === 0 && c2.status === 0 && c2.stdout.includes('{"accepted": true}') && st2 === "requested|0" && trig === "2" && logCount() === logBefore,
    `되살리기 0100 종료 ${re100.status}${re100.status ? " " + errs(re100) : ""} → 0105 종료 ${re105.status}, 회원 접수 ${c2.stdout.includes('{"accepted": true}') ? "accepted" : "실패 " + errs(c2)}, 영수증 ${st2}, 트리거 ${trig}개, 볼타 기록 +${logCount() - logBefore}`);
}

// 4) 0100 시나리오 회귀(원래 방식: 표식에서 나눠 되돌리기 1단계 먼저)
const s100 = read("scripts/scenario-0100-cash-receipts.sql");
const MARK = "-- @@AFTER_ROLLBACK_STEP1";
const [p1, p2] = [s100.slice(0, s100.indexOf(MARK)), s100.slice(s100.indexOf(MARK))];
if (!p1 || !p2.startsWith(MARK)) stop("0100 시나리오 나눔 표식 없음");
const rb1 = read("scripts/rollback-0100-step1-stop-auto.sql");
const EXPECT = { C0: "t", C3: "requested|0", C5: "issuing|33000", C6: "issued|AP123", C8a: "cancelling|3000", C8b: "issuing|3000|2", C9: "issuing|EXPENSE_PROOF",
  C10: "failed|", C10b: "9", P1a: "unknown", P1b: "cancelling|", P1c: "cancelled|1|", P1d: "1|1|", P2: "cancel_failed|", P2b: "0|1|", P3a: "cancelling|3000|", P3b: "issuing|3000|2|",
  P4a: "issuing", P4b: "issued", P4c: "cancelling|11000", P4d: "cancelled|1|", P5a: "issuing|t|", P5b: "issued|", P5c: "issued|0|", P6a: "cancel_failed|", P6b: "cancelling|", P6c: "cancelled|", P6d: "1|",
  P7b: "issued|", P8p: "cancelling|3000", P8a: "cancelled|", P8b: "0|" };
const BLOCKED = ["C1", "C2a", "C2b", "C2c", "C4", "C7", "P7a"];
const judge = (text) => {
  const lines = text.split("\n"); const bad = [];
  for (const [k, v] of Object.entries(EXPECT)) {
    const hit = lines.filter((l) => l.startsWith(k + "|"));
    if (!hit.length || !hit.every((l) => l.slice(k.length + 1).startsWith(v))) bad.push(`${k}(${hit[0] ?? "없음"})`);
  }
  for (const k of BLOCKED) if (!lines.some((l) => l.includes(`NOTICE:  ${k} 막힘:`))) bad.push(`${k} 막힘 없음`);
  if (lines.some((l) => l.includes("(문제)"))) bad.push("문제 알림 있음");
  if (lines.filter((l) => / 막힘:/.test(l)).length !== BLOCKED.length) bad.push("막힘 알림 수 다름");
  return bad;
};
const out = [];
for (const [db, upto] of [[D5, last], [D4, migs.filter((f) => f < "0105").pop()]]) {
  fresh(db, upto);
  const r1 = run(db, sp + p1), r2 = run(db, sp + rb1), r3 = run(db, sp + as(OWNER) + p2);
  const text = [r1, r3].map((r) => (r.stdout + "\n" + r.stderr.replace(/psql:<stdin>:\d+: /g, "")).trim()).join("\n");
  const codes = [r1.status, r2.status, r3.status];
  const ev = evidence(db).split("|");
  out.push({ db, codes, text, bad: judge(text), ev });
}
for (const o of out) check(`R1-${o.db.slice(-4)}`, o.codes.every((c) => c === 0) && o.bad.length === 0 && o.ev[0] === "1" && o.ev[1] === "0" && o.ev[2] === "0" && o.ev[3] === "1",
  `종료 코드 ${o.codes.join("/")}, 기대값 ${Object.keys(EXPECT).length}개·막힘 ${BLOCKED.length}개 ${o.bad.length ? "어긋남 " + o.bad.join(", ") : "모두 일치"}, 볼타 흉내 ${o.ev[0]}·확장 ${o.ev[1]}·흉내판 아닌 http 함수 ${o.ev[2]}`);
check("R1-same", out[0].text === out[1].text, `0104까지 DB와 0105까지 DB 출력 ${out[0].text.split("\n").length}줄 ${out[0].text === out[1].text ? "동일" : "다름"}`);
if (process.env.R1_DUMP) console.log(out[0].text);

cleanup();
const left = adm(`select count(*) from pg_database where datname like 'qa_s70_%'`);
const fail = results.filter(([, ok]) => !ok).length;
console.log(`합계 ${results.length - fail}/${results.length}${fail ? " — 실패 있음" : " 통과"}, 이번에 만든 시험 DB ${made.size === 0 ? "모두 삭제" : made.size + "개 남음"}(qa_s70_* 남은 수 ${left})`);
process.exit(fail ? 1 : 0);
