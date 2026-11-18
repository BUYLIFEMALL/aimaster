// 0105 주문서 현금영수증 자동 접수(S70) — 로컬 격리 DB 검증(운영·Lab·공유 DB 접속 0, 외부망·실제 볼타 호출 0).
// 실행: node mall-builder/scripts/check-0105-local.mjs
// Docker 컨테이너 aww-pg-test 안에 새 DB qa_s70_0105·qa_s70_0104만 만들고 끝에 지운다(다른 DB 손대지 않음).
// 1) 0001~0105 + scenario-0105(K1~K10) 2) 두 세션 순서 시험 L1(접수 먼저)·L2(입금 확인 먼저) 3) 0100 시나리오 회귀(0104까지 DB와 0105까지 DB 출력 동일).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn, spawnSync } from "node:child_process";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = "aww-pg-test";
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
const migs = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
const args = (db) => ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-f", "-"];
const run = (db, sql) => spawnSync("docker", args(db), { input: sql, encoding: "utf8", maxBuffer: 256 << 20 });
const runAsync = (db, sql) => new Promise((res) => {
  const t0 = Date.now(); const p = spawn("docker", args(db)); let out = "", err = "";
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
  p.on("close", (code) => res({ code, out, err, ms: Date.now() - t0 })); p.stdin.end(sql);
});
const errs = (r) => (r.stderr || r.err || "").split("\n").filter((l) => /ERROR/.test(l)).join("\n");
const sp = `set search_path to "$user", public, extensions;\n`;
const fresh = (db, upto) => {
  adm(`drop database if exists ${db}`); adm(`create database ${db}`);
  const bundle = migs.filter((f) => f <= upto).map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n")
    .replace("create extension if not exists http with schema extensions;", "-- http 흉내");
  for (const [n, p] of [["stub", stub], ["기본권한", supa], [`~${upto}`, sp + bundle]]) {
    const r = run(db, p); if (r.status) { console.error(`[${db} ${n}] 실패`, errs(r)); cleanup(); process.exit(2); }
  }
  const r = run(db, sp + `insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test') on conflict do nothing;
insert into public.mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','qa-mall');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner') on conflict do nothing;`);
  if (r.status) { console.error(`[${db} 기본 자료] 실패`, errs(r)); cleanup(); process.exit(2); }
};
const DBS = ["qa_s70_0105", "qa_s70_0104"];
const cleanup = () => { for (const d of DBS) adm(`drop database if exists ${d}`); };
const results = [];
const check = (k, ok, note = "") => { results.push([k, ok]); console.log(`${ok ? "통과" : "실패"} ${k}${note ? " — " + note : ""}`); };

// 1) 단일 세션 시나리오
const last = migs.filter((f) => f.startsWith("0105"))[0];
if (!last) { console.error("0105 파일 없음"); process.exit(2); }
fresh(DBS[0], last);
const sc = run(DBS[0], sp + read("scripts/scenario-0105-cash-receipt-checkout.sql"));
if (sc.status) { console.error("[시나리오] 실패", errs(sc)); cleanup(); process.exit(2); }
for (const line of sc.stdout.split("\n").filter((l) => /^K\d/.test(l))) { const [k, v] = line.split("\t"); check(k, v === "t"); }

// 2) 두 세션 순서(잠금 3초 유지, 1초 뒤 상대 세션 시작 → 상대는 잠금을 기다렸다 진행)
const as = (uid) => `select set_config('request.jwt.claim.sub','${uid}', false);\n`;
const BUYER = "00000000-0000-0000-0000-0000000000c9", OWNER = "00000000-0000-0000-0000-0000000000a1";
const E9 = "00000000-0000-0000-0000-0000000000e9", EA = "00000000-0000-0000-0000-0000000000ea";
const q = (sql) => run(DBS[0], sp + sql).stdout.trim();
const logCount = () => Number(q("select count(*) from public.fake_cr_log where path = '/v1/cashReceipts';"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
{ // L1 접수 먼저 → 입금 확인은 잠금 대기 뒤 트리거로 발급 요청
  const before = logCount();
  const a = runAsync(DBS[0], sp + as(BUYER) + `begin;\nselect public.mall_builder_cash_receipt_checkout('${E9}', 'PHONE', '01012345678');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const b = await runAsync(DBS[0], sp + as(OWNER) + `select public.mall_builder_change_order_status('${E9}', 'paid', '', '', '');`);
  const ra = await a;
  const st = q(`select cash_receipt ->> 'status' from mall_builder_orders where id = '${E9}';`);
  check("L1", ra.code === 0 && b.code === 0 && ra.out.includes('{"accepted": true}') && b.ms >= 1500 && logCount() === before + 1 && st !== "requested",
    `접수 응답 ${ra.out.includes('{"accepted": true}') ? "accepted" : "?"}, 입금 확인 대기 ${b.ms}ms, 발급 요청 +${logCount() - before}, 상태 ${st}`);
}
{ // L2 입금 확인 먼저 → 접수는 잠금 대기 뒤 not_eligible, 발급 0, 영수증 칸 그대로
  const before = logCount();
  const b = runAsync(DBS[0], sp + as(OWNER) + `begin;\nselect public.mall_builder_change_order_status('${EA}', 'paid', '', '', '');\nselect pg_sleep(3);\ncommit;`);
  await sleep(1000);
  const a = await runAsync(DBS[0], sp + as(BUYER) + `select public.mall_builder_cash_receipt_checkout('${EA}', 'PHONE', '01012345678');`);
  const rb = await b;
  const cr = q(`select coalesce(cash_receipt::text, 'null') from mall_builder_orders where id = '${EA}';`);
  check("L2", a.code === 0 && rb.code === 0 && a.out.includes('"not_eligible"') && a.ms >= 1500 && logCount() === before && cr === "null",
    `접수 응답 ${a.out.includes('"not_eligible"') ? "not_eligible" : "?"}, 접수 대기 ${a.ms}ms, 발급 요청 +${logCount() - before}, 영수증 칸 ${cr}`);
}

// 3) 0100 시나리오 회귀: 0104까지 DB와 0105까지 DB에서 출력(결과 줄·알림)이 같아야 함
const s100 = sp + read("scripts/scenario-0100-cash-receipts.sql");
const out = [];
for (const [db, upto] of [["qa_s70_0105", last], ["qa_s70_0104", migs.filter((f) => f < "0105").pop()]]) {
  fresh(db, upto);
  const r = run(db, s100);
  out.push({ code: r.status, text: (r.stdout + "\n" + r.stderr.replace(/psql:<stdin>:\d+: /g, "")).trim() });
}
check("R1", out[0].code === out[1].code && out[0].text === out[1].text && out[0].text.length > 0,
  `0100 시나리오 종료 코드 ${out[0].code}/${out[1].code}, 출력 ${out[0].text.split("\n").length}줄 ${out[0].text === out[1].text ? "동일" : "다름"}`);

cleanup();
const fail = results.filter(([, ok]) => !ok).length;
console.log(`합계 ${results.length - fail}/${results.length}${fail ? " — 실패 있음" : " 통과"}, 격리 DB 삭제`);
process.exit(fail ? 1 : 0);
