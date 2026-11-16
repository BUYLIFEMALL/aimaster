// 0104 실행 자료 로컬 리허설 — 실행: node mall-builder/docs/handoff-0104-lab/check-local.mjs (Docker aww-pg-test 필요, Lab·외부·키 0)
// qa_ 새 DB에 0001~0103만 적용 → precheck → apply(원본, 로컬 http 없음이면 멈춤 확인) → apply(http 확인 한 줄만 뺀 사본) → verify
// → 반례(시험 DB 트랜잭션 안에서 권한·칸·제약·트리거를 하나씩 흔들고 되돌림): 새 verify가 해당 구조 항목을 「확인 필요」로 막는지 확인
// → (있으면) 이전 verify(ee9c725ca 판)가 같은 반례에서 거짓 통과했는지 비교 → 재적용 멈춤 → DB 삭제.
// 구분: 사본 리허설은 흐름·문법·구조 확인이지 원본 apply.sql 그대로의 완전 실행 증거가 아니다(원본 완전성 = build.mjs 지문). verify 16~20(기존 자료)은 빈 DB라 여기서 미검증.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB = "qa_rehearse0104", C = "aww-pg-test";
const read = (p) => readFileSync(join(SRC, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const LAB_LINE = /^select lab_admin\.register_program\('mall-builder'\);\s*$/m;
const files = readdirSync(join(SRC, "supabase", "migrations")).filter((f) => f.endsWith(".sql") && f < "0104").sort();
const bundle = files.map((f) => read(`supabase/migrations/${f}`).replace(LAB_LINE, "-- lab")).join("\n").replace("create extension if not exists http with schema extensions;", "-- http 흉내");
const stub = read("scripts/check-prod-bundle-local.mjs").match(/const stub = `([\s\S]*?)`;/)[1];
const supa = "alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to anon, authenticated;";
const psqlArgs = ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-F", " | ", "-f", "-"];
const run = (sql) => spawnSync("docker", psqlArgs, { input: sql, encoding: "utf8", maxBuffer: 64 << 20 });
const adm = (c) => execFileSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", c]);
const errs = (r) => r.stderr.split("\n").filter((l) => /ERROR|멈춤/.test(l)).join("\n");
// verify 출력에서 구조 항목(1..last) 중 「확인 필요」 번호 목록
const failed = (out, last) => out.split("\n").map((l) => l.split(" | ")).filter((c) => +c[0] >= 1 && +c[0] <= last && c.at(-1) === "확인 필요").map((c) => +c[0]);
let pass = 0, fail = 0;
const check = (name, ok, got) => { ok ? pass++ : fail++; console.log(`${ok ? "통과" : "실패"} ${name}${ok ? "" : ` — ${got}`}`); };

adm(`drop database if exists ${DB}`); adm(`create database ${DB}`);
for (const [n, p] of [["stub", stub], ["기본권한", supa], ["0001~0103", bundle]]) { const r = run(p); if (r.status) { console.error(`[${n}] 실패`, errs(r)); adm(`drop database if exists ${DB}`); process.exit(2); } }
const hasHttp = run(`select count(*) from pg_extension where extname = 'http';`).stdout.trim() === "1";
run(`create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values ('20261116000001','mall_builder_0102_exchanges'),('20261116193438','mall_builder_0103_exchange_confirmed_window');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','o@x.test') on conflict do nothing;
insert into public.mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','aimaster-b2b');`);

const pre = run(read("docs/handoff-0104-lab/precheck.sql"));
check("precheck 실행(구조 1~10, http는 로컬에 따라)", pre.status === 0 && failed(pre.stdout, 10).every((n) => n === 9 && !hasHttp), failed(pre.stdout, 10).join(",") + errs(pre));
const original = read("docs/handoff-0104-lab/apply.sql");
if (!hasHttp) {
  const r = run(original);
  check("원본 apply: 로컬 http 없음 → [멈춤]·기록 0", r.status !== 0 && /http 확장이 없습니다/.test(r.stderr) && run(`select count(*) from supabase_migrations.schema_migrations where name like 'mall_builder_0104%';`).stdout.trim() === "0", errs(r));
}
const copy = hasHttp ? original : original.replace(/^  if not exists \(select 1 from pg_extension where extname = 'http'\).*$/m, "  -- (리허설 사본: http 확인 줄 뺌)");
const a1 = run(copy);
check(`apply 1차(${hasHttp ? "원본" : "사본"}) 성공`, a1.status === 0, errs(a1));

const verifyNew = read("docs/handoff-0104-lab/verify.sql");
const v = run(verifyNew);
check("새 verify 정상 적용: 구조 1~15 모두 OK(16~20 자료는 빈 DB라 제외)", v.status === 0 && failed(v.stdout, 15).length === 0, failed(v.stdout, 15).join(",") + errs(v));

let verifyOld = null;
try { verifyOld = execFileSync("git", ["-C", SRC, "show", "ee9c725ca:mall-builder/docs/handoff-0104-lab/verify.sql"], { encoding: "utf8" }).replace(/\r\n/g, "\n"); } catch { /* 이력 없으면 비교 생략 */ }

// 반례: [이름, 흔드는 SQL, 새 verify에서 실패해야 할 항목]
const T = "public.mall_builder_exchange_fee_payments", A = "public.mall_builder_exchange_fee_payment_attempts";
const cases = [
  ["회원 needs_review 읽기 회수", `revoke select (needs_review) on ${T} from authenticated;`, 9],
  ["회원 receipt_url 읽기 회수", `revoke select (receipt_url) on ${T} from authenticated;`, 9],
  ["비로그인 payment_key 칸 읽기 부여", `grant select (payment_key) on ${T} to anon;`, 10],
  ["회원 status 칸 쓰기 부여", `grant update (status) on ${T} to authenticated;`, 10],
  ["시도 이력 회원 INSERT 부여", `grant insert on ${A} to authenticated;`, 11],
  ["시도 이력 회원 UPDATE 부여", `grant update on ${A} to authenticated;`, 11],
  ["시도 이력 회원 칸 SELECT 부여", `grant select (status) on ${A} to authenticated;`, 11],
  ["시도 이력 PUBLIC DELETE 부여", `grant delete on ${A} to public;`, 11],
  ["needs_review 기본값 제거", `alter table ${T} alter column needs_review drop default;`, 4],
  ["needs_review NOT NULL 제거", `alter table ${T} alter column needs_review drop not null;`, 4],
  ["결제 상태 제약 제거", `alter table ${T} drop constraint mall_builder_exchange_fee_payments_status_check;`, 6],
  ["시도 이력 사유 제약 제거", `alter table ${A} drop constraint mall_builder_exchange_fee_payment_attempts_reason_check;`, 7],
  ["조건 없는 INSERT 정책 추가(조건식 NULL·쓰기 조건 true)", `create policy qa_extra_insert on ${T} for insert to authenticated with check (true);`, 8],
  ["결제 기록 읽기 정책 조건 바꿈", `drop policy mall_builder_exchange_fee_payments_read on ${T}; create policy mall_builder_exchange_fee_payments_read on ${T} for select to authenticated using (true);`, 8],
  ["지킴 트리거 꺼짐", `alter table public.mall_builder_exchanges disable trigger mall_builder_exchanges_fee_card_guard;`, 15],
  ["지킴 트리거 잘못 연결(AFTER·다른 함수)", `create function public.qa_dummy_trg() returns trigger language plpgsql as $$ begin return new; end $$; drop trigger mall_builder_exchanges_fee_card_guard on public.mall_builder_exchanges; create trigger mall_builder_exchanges_fee_card_guard after update on public.mall_builder_exchanges for each row execute function public.qa_dummy_trg();`, 15],
  ["내부 함수 회원 실행 부여", `grant execute on function mall_builder_private.exchange_fee_mark_card_paid(uuid, text, text) to authenticated;`, 14],
  ["공개 함수 search_path 바뀜", `alter function public.mall_builder_exchange_fee_card_confirm(uuid, text) set search_path = public;`, 12],
  ["공개 함수 비로그인 실행 부여", `grant execute on function public.mall_builder_exchange_fee_card_prepare(uuid, text, bigint) to anon;`, 13],
];
const rows = [];
for (const [name, sql, item] of cases) {
  const rn = run(`begin;\n${sql}\n${verifyNew}\nrollback;`);
  const fn = failed(rn.stdout, 15);
  check(`반례 막음: ${name} → 새 verify ${item}번 「확인 필요」`, rn.status === 0 && fn.includes(item), `실패 항목 [${fn}]${errs(rn)}`);
  let old = "-";
  if (verifyOld) { const ro = run(`begin;\n${sql}\n${verifyOld}\nrollback;`); const fo = failed(ro.stdout, 11); old = ro.status ? "오류" : fo.length ? `막음[${fo}]` : "거짓 통과"; }
  rows.push(`${name} | 새: [${fn}] | 이전: ${old}`);
}
console.log("— 반례 비교(새 verify 구조 1~15 / 이전 verify 구조 1~11) —\n" + rows.join("\n"));

const a2 = run(copy);
check("재적용 멈춤([멈춤] 0104 적용 기록이 이미 있습니다)·기록 1줄 유지", a2.status !== 0 && /0104 적용 기록이 이미 있습니다/.test(a2.stderr)
  && run(`select count(*) from supabase_migrations.schema_migrations where name like 'mall_builder_0104%';`).stdout.trim() === "1", errs(a2));
adm(`drop database if exists ${DB}`);
console.log(`합계 통과 ${pass} / 실패 ${fail} (리허설 DB 삭제)`);
process.exit(fail ? 1 : 0);
