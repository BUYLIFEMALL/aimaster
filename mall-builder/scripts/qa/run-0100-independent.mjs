// QA 독립 재검증 실행기 — v1.16 현금영수증(0100) + 되돌리기 1·2단계 (B2B-20261116-07, Master 판정 msg_e6467b5199a6)
// 무엇: 지정한 mall-builder 소스 폴더의 마이그레이션 0001~0100만 합쳐(0101 이후 제외) 기존 Docker 컨테이너 안의 「QA 전용 새 DB」에 넣고,
//       시나리오(0061 → 0100 C1~C10·P0~P7 → 되돌리기 1단계 → P8)와 되돌리기 2단계 4경우(가~라)를 돌려 기대값과 비교한다.
// 지키는 것: 공유 DB(mb_scn 등)·다른 DB를 지우거나 바꾸지 않음(--db로 정한 QA DB만 새로 만듦), 외부 호출 0(볼타는 시나리오 안 모의 함수), 실키 없음.
// 사용(윈도우 Git Bash 예):
//   mkdir <빈 폴더> && git archive 1aea8ec0f mall-builder | tar -x -C <빈 폴더>   ← v1.16 후보 소스를 공용 작업 폴더 밖에 풀기
//   node mall-builder/scripts/qa/run-0100-independent.mjs --src <빈 폴더>/mall-builder --db qa_b2b0100_ws
//   (--src를 빼면 이 실행기가 든 작업 폴더의 0001~0100을 쓴다. 옵션 --container 기본 aww-pg-test)
// 결과: 항목마다 「통과/실패」, 마지막 줄 「합계 통과 N / 실패 M」, 실패가 있으면 종료 코드 1.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const SRC = resolve(arg("--src", join(dirname(fileURLToPath(import.meta.url)), "..", "..")));
const C = arg("--container", "aww-pg-test");
const DB = arg("--db", "qa_b2b0100");
if (!/^qa_[a-z0-9_]{1,40}$/.test(DB)) { console.error("--db 이름은 qa_ 로 시작해야 합니다(공유 DB 보호)."); process.exit(2); }
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");

// 0001~0100만 합친 번들(scripts/build-prod-bundle.mjs와 같은 방식, Lab 전용 줄 처리 포함)
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const files = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0101").sort();
if (!files.at(-1)?.startsWith("0100_")) { console.error("소스 폴더에 0100 마이그레이션이 없습니다:", SRC); process.exit(2); }
const bundle = files.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "do $lab$ begin if to_regnamespace('lab_admin') is not null then perform lab_admin.register_program('mall-builder'); end if; end $lab$;"))
  .join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];

const psql = (db, input, opts = {}) => spawnSync("docker", ["exec", "-i", C, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", ...(opts.quiet ? ["-q"] : []), "-f", "-"], { input, encoding: "utf8", maxBuffer: 64 << 20 });
const q = (sql) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-d", DB, "-At", "-c", sql], { encoding: "utf8" }).trim();
const fresh = () => {
  execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", `drop database if exists ${DB}`]);
  execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", `create database ${DB}`]);
  for (const part of [stub, bundle]) { const r = psql(DB, part, { quiet: true }); if (r.status !== 0) { console.error(r.stderr.split("\n").filter((l) => /ERROR/.test(l)).join("\n")); process.exit(2); } }
};

let pass = 0, fail = 0;
const check = (id, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "통과" : "실패"} ${id}${ok ? "" : ` — 실제: ${got}`}`); };

// ── A. 시나리오 0061 → 0100(앞) → 되돌리기 1단계 → 0100(뒤, P8) ──
console.log(`소스 ${SRC} · 마이그레이션 ${files.length}개(마지막 ${files.at(-1)}) · 컨테이너 ${C} · QA DB ${DB}`);
fresh();
const [before, after] = read("scripts/scenario-0100-cash-receipts.sql").split("-- @@AFTER_ROLLBACK_STEP1");
const A = psql(DB, [read("scripts/scenario-0061-resale-apply.sql"), before, "-- 되돌리기 1단계", read("scripts/rollback-0100-step1-stop-auto.sql"), "--" + after].join("\n"));
check("A 시나리오 종료 코드 0", A.status === 0, A.status + " " + (A.stderr.match(/ERROR:.*/) || [""])[0]);
const notices = A.stderr;
const rows = A.stdout.split("\n").map((l) => l.replace(/\s+/g, " ").trim()); // 칸 사이 공백을 한 칸으로
const row = (id) => rows.find((l) => l.startsWith(id + " |")) ?? "(없음)";
const has = (id, ...parts) => { const r = row(id); check(id, parts.every((p) => r.includes(p)), r); };
const blocked = (id, msg) => { const m = notices.match(new RegExp(`NOTICE:  ${id} (막힘[^\\n]*|통과됨[^\\n]*)`)); check(id + " 막힘", Boolean(m && m[1].startsWith("막힘") && m[1].includes(msg)), m ? m[1] : "(알림 없음)"); };
blocked("C1", "신청을 받지 않습니다");
blocked("C2a", "카드 매출전표");
blocked("C2b", "휴대폰 번호");
blocked("C2c", "주문을 찾을 수 없습니다");
blocked("C4", "세금계산서를 함께 요청할 수 없습니다");
blocked("C7", "주문을 찾을 수 없습니다");
blocked("P7a", "주문을 찾을 수 없습니다"); // 주문 권한 없는 직원의 상태 다시 확인
has("C3", "requested", "| 0");
has("C5", "issuing", "33000", "INCOME_DEDUCTION", '"vatAmount": 3000');
has("C6", "issued", "AP123");
has("C8a", "cancelling", "3000");
has("C8b", "issuing", "3000", "| 2");
has("C8c", '"vatAmount": 273', '"supplyAmount": 2727');
has("C9", "issuing", "EXPENSE_PROOF");
has("C10", "failed", "사업자등록번호");
has("P1a", "unknown");
has("P1b", "cancelling", "ik-mbcr-");
has("P1c", "cancelled", "| 1");
has("P1d", "1 |", "1");
has("P2", "cancel_failed", "볼타 발급 번호를 몰라");
has("P2b", "0 |", "1");
has("P3a", "cancelling", "3000");
has("P3b", "issuing", "3000", "| 2");
has("P4b", "issued");
has("P4c", "cancelling", "11000");
has("P4d", "cancelled", "| 1");
has("P5a", "issuing", "| t");
has("P5b", "issued");
has("P5c", "issued", "0");
has("P6a", "cancel_failed");
has("P6b", "cancelling");
has("P6c", "cancelled");
has("P6d", "1");
has("P7b", "issued");
has("P8a", "cancelled", "자동 발급을 멈춘 상태");
has("P8b", "0");

// ── B. 되돌리기 2단계 4경우 ──
const step2 = read("scripts/rollback-0100-step2-remove.sql");
const state = () => q("select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname like 'mall_builder_cash_receipt%') or (n.nspname='mall_builder_private' and p.proname in ('cash_receipt_amount','cash_receipt_issue','cash_receipt_cancel','cash_receipt_target','orders_cash_receipt_auto','orders_receipt_one_kind'))) || '/' || (select count(*) from information_schema.columns where table_name='mall_builder_orders' and column_name='cash_receipt') || '/' || (select count(*) from mall_builder_orders) || '/' || (select coalesce(sum(total),0) from mall_builder_orders)");
const s0061 = read("scripts/scenario-0061-resale-apply.sql");
// 가: 기록 있음(A 시나리오와 같은 상태) → 멈추고 변화 0
fresh(); psql(DB, [s0061, before].join("\n"), { quiet: true });
let pre = state(); let r = psql(DB, step2, { quiet: true });
check("B가 기록 있으면 멈춤(종료 코드≠0·안내)", r.status !== 0 && r.stderr.includes("기록이 있어 완전 제거를 멈춥니다"), r.status + " " + (r.stderr.match(/ERROR:.*/) || [""])[0]);
check("B가 변화 0", state() === pre, `${pre} → ${state()}`);
// 나: 기록 없음, 2단계만(1단계 안 함) → 함수·칸 0
fresh(); psql(DB, s0061, { quiet: true });
r = psql(DB, step2, { quiet: true });
check("B나 2단계만 → 함수 0·칸 0", r.status === 0 && state().startsWith("0/0/"), r.status + " " + state());
// 다: 1단계 → 2단계
fresh(); psql(DB, s0061, { quiet: true }); psql(DB, read("scripts/rollback-0100-step1-stop-auto.sql"), { quiet: true });
r = psql(DB, step2, { quiet: true });
check("B다 1단계→2단계 → 함수 0·칸 0", r.status === 0 && state().startsWith("0/0/"), r.status + " " + state());
// 라: 영수증 없는 주문 3건 → 주문·합계 보존
fresh(); psql(DB, s0061, { quiet: true });
psql(DB, `delete from mall_builder_order_items; delete from mall_builder_orders;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000005a',81,'RB-1','00000000-0000-0000-0000-0000000000a1','{"zip":"1"}','a','pending_payment',11000,false,false),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-00000000005a',82,'RB-2','00000000-0000-0000-0000-0000000000a1','{"zip":"1"}','a','pending_payment',22000,false,false),
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-00000000005a',83,'RB-3','00000000-0000-0000-0000-0000000000a1','{"zip":"1"}','a','pending_payment',33000,false,false);`, { quiet: true });
pre = state(); r = psql(DB, step2, { quiet: true });
const post = state();
check("B라 영수증 없는 주문 보존(3건·66,000)", r.status === 0 && pre.endsWith("/3/66000") && post === "0/0/3/66000", `${pre} → ${post} (종료 ${r.status})`);

execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", `drop database if exists ${DB}`]);
console.log(`합계 통과 ${pass} / 실패 ${fail} (QA DB ${DB}는 끝나고 지움)`);
process.exit(fail ? 1 : 0);
