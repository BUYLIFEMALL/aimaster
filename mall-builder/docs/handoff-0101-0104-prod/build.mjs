// 운영 0101~0104 실행 자료 만들기(파일만, DB 접속 0) — 실행: node mall-builder/docs/handoff-0101-0104-prod/build.mjs
// 입력: steps.mjs(원문·지문·기록 이름), manifest.json(check-local.mjs --manifest가 격리 DB에서 뽑은 구조 기대 목록), snapshot.sql(구조 스냅샷 조회)
// 출력: 단계마다 precheck-*.sql(읽기)·apply-*.sql(한 트랜잭션 쓰기)·verify-*.sql(읽기). 원문 지문이 다르면 아무것도 쓰지 않고 멈춘다.
// 기대값: 구조는 manifest(고정 원문에서 나온 값)만, 자료는 운영 값을 미리 넣지 않는다 — 적용 파일이 같은 트랜잭션 안에서 적용 전후 지문을 비교한다.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS } from "./steps.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..");
const read = (p) => readFileSync(p, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const SNAP = read(join(HERE, "snapshot.sql")).replace(/^--.*\n/gm, "").trim();
const man = JSON.parse(read(join(HERE, "manifest.json")));
const SP = `set search_path to "$user", public, extensions;`;
const head = (title) => `-- ${title}\n-- 대상: 운영 Supabase 「AIMaster」 ref esgxyikcnnvmlhygjkth 의 SQL 편집기만(화면 위 프로젝트 이름·주소 ref를 먼저 눈으로 확인). Lab(rjjtjakljjxsgjelqgek)은 이미 0101~0104가 있어 아래 조건에서 멈춘다.\n-- 초안: Master 배정 + 주인님 승인 전에는 실행하지 않는다(B2B-20261118-02). 생성: build.mjs`;
const recCount = (n) => `(select count(*) from supabase_migrations.schema_migrations where name = ${q(n)})`;
const out = [];

for (const step of STEPS) {
  const n = `${step.id}-${step.name}`;
  const ms = man.steps.find((s) => s.id === step.id);
  if (!ms) throw new Error(`manifest에 ${n} 없음`);
  if (ms.changed.length || ms.removed.length) throw new Error(`${n}: 기존 정의를 바꾸거나 지우는 항목이 있음 — 이 생성기는 「추가만」 단계용`);
  const srcs = step.files.map((f) => {
    const s = read(join(SRC, "supabase", "migrations", f.file));
    const h = sha(s);
    if (!h.startsWith(f.sha256)) { console.error(`${f.file} 지문 다름: ${h} (고정 ${f.sha256}…)`); process.exit(1); }
    if (/^\s*(begin|commit|rollback)\s*;/im.test(s)) { console.error(`${f.file} 안에 트랜잭션 문`); process.exit(1); }
    return { ...f, s, h };
  });
  const added = ms.added;
  const addedKeys = `(values ${added.map(([k, key]) => `(${q(k)}, ${q(key)})`).join(",\n  ")}) e(k, key)`;
  const expected = `(values ${added.map(([k, key, val]) => `(${q(k)}, ${q(key)}, ${q(val)})`).join(",\n  ")}) e(k, key, val)`;
  const newTables = added.filter(([k]) => k === "rls").map(([, key]) => key);
  const presentCount = `(select count(*) from (${SNAP}) s join ${addedKeys} using (k, key))`;
  const extCheck = (x) => `(select count(*) from pg_extension where extname = ${q(x)})`;

  // ── precheck(읽기) ──
  const pre = `${head(`운영 ${step.name} 실행 전 확인(읽기 전용) — 「전체」가 OK일 때만 apply-${n}.sql`)}
-- 판정 줄 1~5, 기록 줄 6~8(판정 없음 — 실행 기록에 남김). 값이 비면(NULL) 「(없음)」으로 바꿔 불일치로 센다.
${SP}
with chk as (
  select 1 o, ${q(`선행 적용 기록 각 1줄(${step.needRecords.join(", ")})`)} 항목, ${q(step.needRecords.map(() => "1").join("/"))} 기대,
    concat_ws('/', ${step.needRecords.map((x) => `${recCount(x)}::text`).join(", ")}) 실제
  union all select 2, ${q(`이번·이후 적용 기록 없음(${[...step.records, ...step.laterRecords].join(", ")})`)}, '0',
    (${[...step.records, ...step.laterRecords].map(recCount).join(" + ")})::text
  union all select 3, ${q(`이번 단계가 만들 구조 ${added.length}개 중 이미 있는 것 0(부분 적용·Lab 혼동 차단)`)}, '0', ${presentCount}::text
  union all select 4, ${q(`필요한 확장(${step.needExtensions.join(", ") || "없음"})`)}, ${q(step.needExtensions.map(() => "1").join("/") || "-")},
    ${step.needExtensions.length ? `concat_ws('/', ${step.needExtensions.map((x) => `${extCheck(x)}::text`).join(", ")}) -- [http 확인]` : "'-'"}
  union all select 5, 'DB 시간대 UTC(적용 기록 version은 UTC)', 'UTC', current_setting('TimeZone')
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 6, '기록: lab_admin 스키마 있음(Lab이면 보통 true — 판정 아님, 3번이 실제 차단)', '-', (to_regnamespace('lab_admin') is not null)::text, '기록'
union all select 7, '기록: 쇼핑몰 표 수·전체 행 수(적용 전 기준, 적용 파일이 같은 트랜잭션에서 다시 비교)', '-',
  (select count(*) || ' 표 / ' || coalesce(sum(n_live_tup), 0) || ' 행(통계 추정)' from pg_stat_user_tables where schemaname = 'public' and relname like 'mall\\_builder\\_%'), '기록'
union all select 8, '기록: Postgres 판', '-', current_setting('server_version'), '기록'
union all select 9, '전체', '5/5', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 5 and (select count(*) filter (where 기대 = 실제) from j) = 5 then 'OK' else '확인 필요' end
order by 1;
`;

  // ── apply(한 트랜잭션) ──
  const body = srcs.map((f) => `-- ── 원문: supabase/migrations/${f.file} (커밋 ${f.commit}, LF sha256 ${f.h}) — 한 글자도 바꾸지 않음 ──\n${f.s}`).join("\n");
  const app = `${head(`운영 ${step.name} 적용(한 트랜잭션, repeatable read) — 시작 조건 → 기존 자료 지문 → 원문 → 지문 다시 비교 → 적용 기록`)}
-- ⚠ 하나라도 어긋나면 [멈춤] 오류로 전체가 취소되고 아무것도 바뀌지 않는다. 결과가 「Success」가 아니면 다시 실행하지 말고 먼저 읽기(precheck)로 기록·구조를 확인한다.
-- 기존 자료 지문: 적용 전에 있던 쇼핑몰 표마다 「적용 전 칸 목록」으로 행 수·md5를 남기고, 원문 뒤 같은 칸으로 다시 계산해 다르면 취소한다(운영 값을 미리 적지 않음).
begin isolation level repeatable read;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
${SP}
do $pre$ begin
${step.needRecords.map((x) => `  if ${recCount(x)} <> 1 then raise exception '[멈춤] 선행 적용 기록 ${x}가 정확히 1줄이 아닙니다.'; end if;`).join("\n")}
  if (${[...step.records, ...step.laterRecords].map(recCount).join(" + ")}) <> 0 then raise exception '[멈춤] 이번 또는 이후 단계 적용 기록이 이미 있습니다(Lab이거나 이미 적용됨).'; end if;
  if ${presentCount} <> 0 then raise exception '[멈춤] 이번 단계가 만들 구조가 이미 일부 있습니다(부분 적용·옛 정의). 사람이 확인하세요.'; end if;
${step.needExtensions.map((x) => `  if ${extCheck(x)} <> 1 then raise exception '[멈춤] ${x} 확장이 없습니다.'; end if; -- [http 확인]`).join("\n")}
end $pre$;
create temp table _mb_fp (t text primary key, cols text, n bigint, h text) on commit drop;
do $fp$ declare r record; c text; v_n bigint; v_h text; begin
  for r in select c2.relname from pg_class c2 join pg_namespace s on s.oid = c2.relnamespace where s.nspname = 'public' and c2.relkind = 'r' and c2.relname like 'mall\\_builder\\_%' loop
    select string_agg(quote_ident(a.attname), ',' order by a.attnum) into c from pg_attribute a where a.attrelid = format('public.%I', r.relname)::regclass and a.attnum > 0 and not a.attisdropped;
    execute format('select count(*), md5(coalesce(string_agg(x::text, chr(10) order by x::text), '''')) from (select %s from public.%I) x', c, r.relname) into v_n, v_h;
    insert into _mb_fp values (r.relname, c, v_n, v_h);
  end loop;
end $fp$;
${body}
-- ── 원문 끝 ──
do $fpc$ declare r record; v_n bigint; v_h text; begin
  for r in select * from _mb_fp loop
    execute format('select count(*), md5(coalesce(string_agg(x::text, chr(10) order by x::text), '''')) from (select %s from public.%I) x', r.cols, r.t) into v_n, v_h;
    if v_n is distinct from r.n or v_h is distinct from r.h then raise exception '[멈춤] 기존 자료가 바뀌었습니다: % (행 % → %)', r.t, r.n, v_n; end if;
  end loop;
end $fpc$;
-- 적용 기록: UTC 시각(초)을 version으로, 같은 초가 이미 있으면 1초씩 뒤로(기록 번호 충돌 방지)
do $rec$ declare v_t timestamp := clock_timestamp() at time zone 'utc'; v_name text; begin
  foreach v_name in array array[${step.records.map(q).join(", ")}] loop
    while exists (select 1 from supabase_migrations.schema_migrations where version = to_char(v_t, 'YYYYMMDDHH24MISS')) loop v_t := v_t + interval '1 second'; end loop;
    insert into supabase_migrations.schema_migrations (version, name) values (to_char(v_t, 'YYYYMMDDHH24MISS'), v_name);
    v_t := v_t + interval '1 second';
  end loop;
end $rec$;
commit;
`;

  // ── verify(읽기) ──
  const ver = `${head(`운영 ${step.name} 적용 확인(읽기 전용) — 「전체」 OK면 성공`)}
-- 구조 ${added.length}개를 고정 원문에서 나온 기대 목록(manifest.json, 격리 DB PG ${man.pg})과 그대로 대조한다(정규화 없음). 어긋나면 3번에 키를 보여 준다.
${SP}
with cur as (${SNAP}),
exp as (select * from ${expected}),
diff as (select e.k, e.key from exp e left join cur c using (k, key) where c.val is distinct from e.val),
chk as (
  select 1 o, ${q(`적용 기록: 이번 ${step.records.join(", ")} 각 1줄 · 선행 각 1줄 · 이후 0`)} 항목,
    ${q([...step.records.map(() => "1"), ...step.needRecords.map(() => "1"), "0"].join("/"))} 기대,
    concat_ws('/', ${[...step.records, ...step.needRecords].map((x) => `${recCount(x)}::text`).join(", ")}, (${step.laterRecords.length ? step.laterRecords.map(recCount).join(" + ") : "0"})::text) 실제
  union all select 2, ${q(`구조 ${added.length}개(칸·제약·인덱스·정책·권한·함수 본문·트리거) = 기대 목록`)}, '0', (select count(*) from diff)::text
  union all select 3, '어긋난 구조 키(최대 15개)', '없음', coalesce((select string_agg(k || ' ' || key, ' ; ') from (select * from diff order by k, key limit 15) d), '없음')
  union all select 4, ${q(`새 표 비어 있음(${newTables.join(", ") || "없음"})`)}, ${q(newTables.map(() => "0").join("/") || "-")},
    ${newTables.length ? `concat_ws('/', ${newTables.map((t) => `(select count(*) from public.${t})::text`).join(", ")})` : "'-'"}
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 5, '전체', '4/4', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 4 and (select count(*) filter (where 기대 = 실제) from j) = 4 then 'OK' else '확인 필요' end
order by 1;
`;
  for (const [name, body] of [[`precheck-${n}.sql`, pre], [`apply-${n}.sql`, app], [`verify-${n}.sql`, ver]]) {
    writeFileSync(join(HERE, name), body);
    out.push(`${name} ${sha(body)}`);
  }
  console.log(`${n}: 원문 ${srcs.map((f) => `${f.file} ${f.h.slice(0, 16)}`).join(", ")} · 구조 ${added.length}개 · 새 표 ${newTables.length}`);
}
console.log(out.join("\n"));
